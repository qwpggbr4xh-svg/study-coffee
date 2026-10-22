// Mercado Pago — cobrança Pix via API de pagamentos.
// Precisa do segredo MP_ACCESS_TOKEN (token de produção da aplicação). Sem ele, o site cai no Pix manual.

const MP_API = "https://api.mercadopago.com";

export function mpToken(): string {
  return (Deno.env.get("MP_ACCESS_TOKEN") ?? "").trim();
}

export function pixAmount(): number {
  const n = Number(String(Deno.env.get("PIX_AMOUNT") ?? "10").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 10;
}

/** Data no formato que o Mercado Pago aceita: 2026-10-22T01:30:00.000-03:00 */
export function mpDate(d: Date, offsetMinutes = -180): string {
  const local = new Date(d.getTime() + offsetMinutes * 60_000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}T${p(local.getUTCHours())}:${p(local.getUTCMinutes())}:${p(local.getUTCSeconds())}.${p(local.getUTCMilliseconds(), 3)}${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`;
}

export interface MpPayment {
  id: string;
  status: string;
  status_detail: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  date_of_expiration: string | null;
  external_reference: string;
  raw: Record<string, unknown>;
}

function pick(raw: Record<string, unknown>): MpPayment {
  const poi = (raw.point_of_interaction as Record<string, unknown> | undefined) ?? {};
  const td = (poi.transaction_data as Record<string, unknown> | undefined) ?? {};
  return {
    id: String(raw.id ?? ""),
    status: String(raw.status ?? ""),
    status_detail: String(raw.status_detail ?? ""),
    qr_code: String(td.qr_code ?? ""),
    qr_code_base64: String(td.qr_code_base64 ?? ""),
    ticket_url: String(td.ticket_url ?? ""),
    date_of_expiration: raw.date_of_expiration ? String(raw.date_of_expiration) : null,
    external_reference: String(raw.external_reference ?? ""),
    raw,
  };
}

async function mpFetch(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(MP_API + path, { ...init, signal: ctrl.signal, headers: { "Authorization": `Bearer ${mpToken()}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw_text: text }; }
    if (!res.ok) {
      const msg = String(body.message ?? body.error ?? text ?? res.statusText);
      throw new Error(`Mercado Pago ${res.status}: ${msg}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export interface CreatePixOpts {
  amount: number;
  email: string;
  name: string;
  userId: string;
  notificationUrl: string;
  expiresAt: Date;
  idempotencyKey: string;
}

export async function mpCreatePix(o: CreatePixOpts): Promise<MpPayment> {
  const first = (o.name || "Aluno").trim().split(/\s+/)[0].slice(0, 30) || "Aluno";
  const body = {
    transaction_amount: o.amount,
    description: "Study Coffee — acesso vitalício",
    payment_method_id: "pix",
    payer: { email: o.email, first_name: first },
    notification_url: o.notificationUrl,
    external_reference: o.userId,
    date_of_expiration: mpDate(o.expiresAt),
  };
  const raw = await mpFetch("/v1/payments", { method: "POST", body: JSON.stringify(body), headers: { "X-Idempotency-Key": o.idempotencyKey } });
  return pick(raw);
}

export async function mpGetPayment(id: string): Promise<MpPayment> {
  const raw = await mpFetch(`/v1/payments/${encodeURIComponent(id)}`, { method: "GET" });
  return pick(raw);
}

/** Status do nosso banco a partir do status do Mercado Pago. */
export function mapStatus(mp: MpPayment): "pending" | "approved" | "cancelled" | "expired" | "rejected" {
  switch (mp.status) {
    case "approved": return "approved";
    case "cancelled": return mp.status_detail === "expired" ? "expired" : "cancelled";
    case "rejected": return "rejected";
    default: return "pending";
  }
}

/** Confere a assinatura do webhook quando MP_WEBHOOK_SECRET estiver configurado (opcional; o pagamento é reconsultado na API de qualquer jeito). */
export async function mpSignatureOk(req: Request, dataId: string): Promise<boolean> {
  const secret = (Deno.env.get("MP_WEBHOOK_SECRET") ?? "").trim();
  if (!secret) return true;
  const sig = req.headers.get("x-signature") ?? "";
  const reqId = req.headers.get("x-request-id") ?? "";
  let ts = "", v1 = "";
  for (const part of sig.split(",")) {
    const [k, ...rest] = part.split("=");
    const v = rest.join("=").trim();
    if (k.trim() === "ts") ts = v;
    if (k.trim() === "v1") v1 = v;
  }
  if (!ts || !v1) return false;
  const id = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1.toLowerCase();
}
