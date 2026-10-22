// Emulador mínimo de PostgREST + Auth + Mercado Pago para testar as funções sem rede.
// Estrito: coluna desconhecida em filtro ou corpo derruba o teste (pega erro de digitação cedo).

type Row = Record<string, unknown>;

export const SCHEMA: Record<string, string[]> = {
  profiles: ["id", "email", "name", "goal", "free_left", "lifetime", "lifetime_since", "lifetime_source", "is_admin", "pay_ref", "created_at", "updated_at"],
  payments: ["id", "user_id", "provider", "provider_id", "status", "amount", "qr_code", "qr_code_base64", "ticket_url", "expires_at", "raw", "created_at", "updated_at"],
  redeemed_codes: ["serial", "code_hash", "user_id", "email_bound", "issued", "redeemed_at"],
  entries: ["id", "user_id", "room", "created_at"],
};

export class FakeBackend {
  tables: Record<string, Row[]> = { profiles: [], payments: [], redeemed_codes: [], entries: [] };
  users: Record<string, { id: string; email: string }> = {};
  mpPayments: Record<string, Row> = {};
  mpCalls: { method: string; path: string; body?: Row }[] = [];
  nextMpId = 1000;
  mpCreateStatus = "pending";
  supabaseUrl = "https://fake.supabase.co";

  token(userId: string): string { return "tok-" + userId; }

  addUser(id: string, email: string, extra: Row = {}) {
    this.users[id] = { id, email };
    this.tables.profiles.push({
      id, email, name: "Aluno", goal: "fuvest", free_left: 3, lifetime: false, lifetime_since: null, lifetime_source: null,
      is_admin: false, pay_ref: "SCTEST" + id.slice(0, 2).toUpperCase(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...extra,
    });
  }

  install() {
    const self = this;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const req = new Request(input, init);
      const url = new URL(req.url);
      if (url.origin === self.supabaseUrl) return await self.supabase(req, url);
      if (url.origin === "https://api.mercadopago.com") return await self.mercadoPago(req, url);
      throw new Error("fetch inesperado: " + req.url);
    }) as typeof fetch;
  }

  private async supabase(req: Request, url: URL): Promise<Response> {
    if (url.pathname === "/auth/v1/user") {
      const auth = req.headers.get("Authorization") ?? "";
      const id = auth.replace(/^Bearer tok-/, "");
      const u = self_users(this, id);
      if (!u) return new Response(JSON.stringify({ message: "invalid token" }), { status: 401 });
      return new Response(JSON.stringify({ id: u.id, email: u.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    const m = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
    if (!m) return new Response("not found " + url.pathname, { status: 404 });
    const table = m[1];
    const cols = SCHEMA[table];
    if (!cols) throw new Error("tabela desconhecida: " + table);
    const rows = this.tables[table];
    const filters: { col: string; op: string; val: string }[] = [];
    let order: { col: string; asc: boolean } | null = null;
    let limit = Infinity;
    for (const [k, v] of url.searchParams) {
      if (k === "select") { for (const c of v.split(",")) { if (c !== "*" && !cols.includes(c.trim())) throw new Error(`select de coluna desconhecida ${table}.${c}`); } continue; }
      if (k === "order") { const [c, dir] = v.split("."); if (!cols.includes(c)) throw new Error(`order por coluna desconhecida ${table}.${c}`); order = { col: c, asc: dir !== "desc" }; continue; }
      if (k === "limit") { limit = Number(v); continue; }
      if (k === "offset" || k === "on_conflict" || k === "columns") continue;
      if (!cols.includes(k)) throw new Error(`filtro por coluna desconhecida ${table}.${k}`);
      const dot = v.indexOf(".");
      filters.push({ col: k, op: v.slice(0, dot), val: v.slice(dot + 1) });
    }
    const match = (r: Row) => filters.every((f) => {
      const a = r[f.col];
      switch (f.op) {
        case "eq": return String(a) === f.val;
        case "neq": return String(a) !== f.val;
        case "gt": return String(a) > f.val;
        case "gte": return String(a) >= f.val;
        case "lt": return String(a) < f.val;
        case "ilike": return String(a).toLowerCase() === f.val.toLowerCase().replace(/%/g, "");
        case "is": return f.val === "null" ? a === null || a === undefined : String(a) === f.val;
        default: throw new Error("operador não emulado: " + f.op);
      }
    });
    const accept = req.headers.get("Accept") ?? "";
    const wantObject = accept.includes("vnd.pgrst.object");
    const reply = (data: Row[], status = 200) => {
      if (wantObject) {
        if (data.length !== 1) return new Response(JSON.stringify({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `${data.length} rows` }), { status: 406, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(data[0]), { status, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    };
    if (req.method === "GET") {
      let out = rows.filter(match);
      if (order) { const o = order; out = out.slice().sort((a, b) => (String(a[o.col]) < String(b[o.col]) ? -1 : 1) * (o.asc ? 1 : -1)); }
      if (Number.isFinite(limit)) out = out.slice(0, limit);
      return reply(out);
    }
    if (req.method === "POST") {
      const body = await req.json();
      const list: Row[] = Array.isArray(body) ? body : [body];
      const inserted: Row[] = [];
      for (const b of list) {
        for (const k of Object.keys(b)) if (!cols.includes(k)) throw new Error(`insert em coluna desconhecida ${table}.${k}`);
        const row: Row = { ...b };
        if (table === "payments" && !row.id) row.id = crypto.randomUUID();
        if (table === "entries" && !row.id) row.id = rows.length + 1;
        if (cols.includes("created_at") && !row.created_at) row.created_at = new Date().toISOString();
        if (cols.includes("updated_at") && !row.updated_at) row.updated_at = row.created_at;
        if (table === "redeemed_codes" && rows.some((r) => r.serial === row.serial)) {
          return new Response(JSON.stringify({ code: "23505", message: "duplicate key value violates unique constraint" }), { status: 409, headers: { "Content-Type": "application/json" } });
        }
        if (table === "payments" && row.provider_id && rows.some((r) => r.provider_id === row.provider_id)) {
          return new Response(JSON.stringify({ code: "23505", message: "duplicate key value violates unique constraint" }), { status: 409, headers: { "Content-Type": "application/json" } });
        }
        rows.push(row); inserted.push(row);
      }
      return reply(inserted, 201);
    }
    if (req.method === "PATCH") {
      const body = await req.json();
      for (const k of Object.keys(body)) if (!cols.includes(k)) throw new Error(`update em coluna desconhecida ${table}.${k}`);
      const changed: Row[] = [];
      for (const r of rows) if (match(r)) { Object.assign(r, body); changed.push(r); }
      return reply(changed);
    }
    return new Response("método não emulado", { status: 405 });
  }

  private async mercadoPago(req: Request, url: URL): Promise<Response> {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth !== "Bearer MP-TEST-TOKEN") return new Response(JSON.stringify({ message: "invalid_token" }), { status: 401 });
    if (req.method === "POST" && url.pathname === "/v1/payments") {
      const body = await req.json();
      if (!req.headers.get("X-Idempotency-Key")) return new Response(JSON.stringify({ message: "idempotency key required" }), { status: 400 });
      this.mpCalls.push({ method: "POST", path: url.pathname, body });
      const id = String(this.nextMpId++);
      const p: Row = {
        id: Number(id), status: this.mpCreateStatus, status_detail: this.mpCreateStatus === "approved" ? "accredited" : "pending_waiting_transfer",
        external_reference: body.external_reference, date_of_expiration: body.date_of_expiration, transaction_amount: body.transaction_amount,
        point_of_interaction: { transaction_data: { qr_code: "00020101021226PIXFAKE" + id, qr_code_base64: "iVBORw0KGgoFAKE", ticket_url: "https://www.mercadopago.com.br/payments/" + id + "/ticket" } },
      };
      this.mpPayments[id] = p;
      return new Response(JSON.stringify(p), { status: 201, headers: { "Content-Type": "application/json" } });
    }
    const g = url.pathname.match(/^\/v1\/payments\/(\w+)$/);
    if (req.method === "GET" && g) {
      this.mpCalls.push({ method: "GET", path: url.pathname });
      const p = this.mpPayments[g[1]];
      if (!p) return new Response(JSON.stringify({ message: "Payment not found" }), { status: 404 });
      return new Response(JSON.stringify(p), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("not found", { status: 404 });
  }

  approve(mpId: string) {
    const p = this.mpPayments[mpId];
    if (!p) throw new Error("mp payment inexistente " + mpId);
    p.status = "approved"; p.status_detail = "accredited";
  }
}

function self_users(b: FakeBackend, id: string) { return b.users[id] ?? null; }

export async function loadHandler(modulePath: string): Promise<(req: Request) => Promise<Response>> {
  let captured: ((req: Request) => Promise<Response>) | null = null;
  const original = Deno.serve;
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (h: unknown) => { captured = h as (req: Request) => Promise<Response>; return { finished: Promise.resolve(), shutdown: () => Promise.resolve(), ref() {}, unref() {}, addr: {} }; };
  try {
    await import(modulePath + "?t=" + Math.random());
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).serve = original;
  }
  if (!captured) throw new Error("Deno.serve não foi chamado por " + modulePath);
  return captured;
}
