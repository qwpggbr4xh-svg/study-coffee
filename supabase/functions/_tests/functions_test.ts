// deno test --allow-env --allow-read --allow-net=registry.npmjs.org supabase/functions/_tests/
import { assert, assertEquals } from "./assert.ts";
import { FakeBackend, loadHandler } from "./fake_backend.ts";

const CODE1 = "SC1.U0MxfDAwMDF8fDIwMjYxMDIx.EffDPqiTYxTQCFRR5znfaErI28aEYUEq7MuhqpyY2AE6XXV2lr77NqETI9aL3ABOxIniEODnJZyhK5QbAWXYtg";

function env(vars: Record<string, string | null>) {
  for (const [k, v] of Object.entries(vars)) { if (v === null) Deno.env.delete(k); else Deno.env.set(k, v); }
}
function setup(): FakeBackend {
  const b = new FakeBackend();
  b.install();
  env({ SUPABASE_URL: b.supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: "service-key", SUPABASE_ANON_KEY: "anon-key", MP_ACCESS_TOKEN: null, PIX_AMOUNT: null, MP_WEBHOOK_SECRET: null });
  b.addUser("u1", "aluna@exemplo.com");
  b.addUser("u2", "outro@exemplo.com");
  b.addUser("adm", "arthur@exemplo.com", { is_admin: true });
  return b;
}
function call(h: (r: Request) => Promise<Response>, path: string, opts: { user?: string; body?: unknown; method?: string; headers?: Record<string, string>; query?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers ?? {}) };
  if (opts.user) headers["Authorization"] = "Bearer tok-" + opts.user;
  return h(new Request("https://fake.supabase.co/functions/v1/" + path + (opts.query ?? ""), { method: opts.method ?? "POST", headers, body: opts.method === "GET" ? undefined : JSON.stringify(opts.body ?? {}) }));
}
const profile = (b: FakeBackend, id: string) => b.tables.profiles.find((r) => r.id === id)!;

Deno.test("create-pix: sem token cai no Pix manual com identificador", async () => {
  const b = setup();
  const h = await loadHandler("../create-pix/index.ts");
  const r = await call(h, "create-pix", { user: "u1" });
  const j = await r.json();
  assertEquals(r.status, 200);
  assertEquals(j.fallback, true);
  assertEquals(j.pay_ref, profile(b, "u1").pay_ref);
  assertEquals(j.amount, 10);
  const r2 = await call(h, "create-pix", {});
  assertEquals(r2.status, 401);
});

Deno.test("create-pix: cria cobrança no Mercado Pago, grava e reaproveita a pendente", async () => {
  const b = setup();
  env({ MP_ACCESS_TOKEN: "MP-TEST-TOKEN", PIX_AMOUNT: "10" });
  const h = await loadHandler("../create-pix/index.ts");
  const r = await call(h, "create-pix", { user: "u1" });
  const j = await r.json();
  assertEquals(r.status, 200, JSON.stringify(j));
  assertEquals(j.status, "pending");
  assert(j.qr_code.startsWith("00020101021226PIXFAKE"));
  assert(j.qr_code_base64.length > 0);
  assertEquals(b.tables.payments.length, 1);
  assertEquals(b.tables.payments[0].user_id, "u1");
  assertEquals(b.tables.payments[0].provider_id, "1000");
  const sent = b.mpCalls[0].body!;
  assertEquals(sent.transaction_amount, 10);
  assertEquals(sent.payment_method_id, "pix");
  assertEquals((sent.payer as Record<string, unknown>).email, "aluna@exemplo.com");
  assertEquals(sent.external_reference, "u1");
  assertEquals(sent.notification_url, "https://fake.supabase.co/functions/v1/mp-webhook");
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-03:00$/.test(String(sent.date_of_expiration)), String(sent.date_of_expiration));
  // segunda chamada reaproveita (sem novo POST no MP)
  const r2 = await call(h, "create-pix", { user: "u1" });
  const j2 = await r2.json();
  assertEquals(j2.provider_id, "1000");
  assertEquals(b.mpCalls.filter((c) => c.method === "POST").length, 1);
  // quem já tem vitalício não gera cobrança
  profile(b, "u2").lifetime = true;
  const r3 = await call(h, "create-pix", { user: "u2" });
  assertEquals((await r3.json()).status, "lifetime");
});

Deno.test("check-pix: ao aprovar no MP, marca o pagamento e libera o vitalício", async () => {
  const b = setup();
  env({ MP_ACCESS_TOKEN: "MP-TEST-TOKEN" });
  const create = await loadHandler("../create-pix/index.ts");
  const check = await loadHandler("../check-pix/index.ts");
  await call(create, "create-pix", { user: "u1" });
  let j = await (await call(check, "check-pix", { user: "u1" })).json();
  assertEquals(j.status, "pending");
  assertEquals(profile(b, "u1").lifetime, false);
  b.approve("1000");
  j = await (await call(check, "check-pix", { user: "u1", body: { payment_id: b.tables.payments[0].id } })).json();
  assertEquals(j.status, "approved");
  assertEquals(j.lifetime, true);
  assertEquals(profile(b, "u1").lifetime, true);
  assertEquals(profile(b, "u1").lifetime_source, "pix");
  assertEquals(b.tables.payments[0].status, "approved");
  // já vitalício: responde direto sem consultar o MP
  const calls = b.mpCalls.length;
  j = await (await call(check, "check-pix", { user: "u1" })).json();
  assertEquals(j.status, "approved");
  assertEquals(b.mpCalls.length, calls);
});

Deno.test("mp-webhook: reconsulta o MP e libera; ignora avisos sem id; registra cobrança perdida pelo external_reference", async () => {
  const b = setup();
  env({ MP_ACCESS_TOKEN: "MP-TEST-TOKEN" });
  const create = await loadHandler("../create-pix/index.ts");
  const hook = await loadHandler("../mp-webhook/index.ts");
  await call(create, "create-pix", { user: "u1" });
  // aviso com pagamento ainda pendente
  let r = await call(hook, "mp-webhook", { body: { action: "payment.updated", type: "payment", data: { id: "1000" } } });
  assertEquals(r.status, 200);
  assertEquals(profile(b, "u1").lifetime, false);
  // aprovou
  b.approve("1000");
  r = await call(hook, "mp-webhook", { body: { action: "payment.updated", type: "payment", data: { id: "1000" } } });
  assertEquals((await r.json()).status, "approved");
  assertEquals(profile(b, "u1").lifetime, true);
  assertEquals(b.tables.payments[0].status, "approved");
  // aviso de outro tipo é ignorado
  r = await call(hook, "mp-webhook", { body: { type: "merchant_order", data: { id: "999" } } });
  assertEquals((await r.json()).ignored, true);
  // formato antigo (query string)
  b.mpPayments["2000"] = { id: 2000, status: "approved", status_detail: "accredited", external_reference: "u2", point_of_interaction: { transaction_data: { qr_code: "x", qr_code_base64: "y", ticket_url: "z" } } };
  r = await call(hook, "mp-webhook", { method: "GET", query: "?topic=payment&id=2000" });
  assertEquals(r.status, 200);
  assertEquals(profile(b, "u2").lifetime, true);
  assertEquals(b.tables.payments.find((p) => p.provider_id === "2000")!.user_id, "u2");
  // pagamento desconhecido no MP: responde 500 para o MP tentar de novo
  r = await call(hook, "mp-webhook", { body: { type: "payment", data: { id: "3000" } } });
  assertEquals(r.status, 500);
});

Deno.test("mp-webhook: assinatura conferida quando há segredo", async () => {
  const b = setup();
  env({ MP_ACCESS_TOKEN: "MP-TEST-TOKEN", MP_WEBHOOK_SECRET: "segredo" });
  const hook = await loadHandler("../mp-webhook/index.ts");
  b.mpPayments["1"] = { id: 1, status: "approved", status_detail: "accredited", external_reference: "u1", point_of_interaction: { transaction_data: {} } };
  const ts = "1704908010", reqId = "req-1";
  const manifest = `id:1;request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("segredo"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)))).map((x) => x.toString(16).padStart(2, "0")).join("");
  let r = await call(hook, "mp-webhook", { query: "?data.id=1&type=payment", body: { type: "payment", data: { id: "1" } }, headers: { "x-signature": `ts=${ts},v1=deadbeef`, "x-request-id": reqId } });
  assertEquals(r.status, 401);
  assertEquals(profile(b, "u1").lifetime, false);
  r = await call(hook, "mp-webhook", { query: "?data.id=1&type=payment", body: { type: "payment", data: { id: "1" } }, headers: { "x-signature": `ts=${ts},v1=${mac}`, "x-request-id": reqId } });
  assertEquals(r.status, 200);
  assertEquals(profile(b, "u1").lifetime, true);
});

Deno.test("redeem-code: código 0001 ativa uma vez; segunda conta é recusada; adulterado e outro e-mail também", async () => {
  const b = setup();
  const h = await loadHandler("../redeem-code/index.ts");
  let j = await (await call(h, "redeem-code", { user: "u1", body: { code: " " + CODE1.slice(0, 30) + "\n" + CODE1.slice(30) } })).json();
  assertEquals(j.ok, true, JSON.stringify(j));
  assertEquals(j.serial, "0001");
  assertEquals(profile(b, "u1").lifetime, true);
  assertEquals(profile(b, "u1").lifetime_source, "code:0001");
  assertEquals(b.tables.redeemed_codes.length, 1);
  // mesma conta de novo: já tem vitalício
  j = await (await call(h, "redeem-code", { user: "u1", body: { code: CODE1 } })).json();
  assertEquals(j.already, true);
  // outra conta com o mesmo código: usado
  const r = await call(h, "redeem-code", { user: "u2", body: { code: CODE1 } });
  assertEquals(r.status, 409);
  assertEquals((await r.json()).error, "used");
  assertEquals(profile(b, "u2").lifetime, false);
  // adulterado
  let r2 = await call(h, "redeem-code", { user: "u2", body: { code: CODE1.slice(0, -2) + "AA" } });
  assertEquals((await r2.json()).error, "invalid");
  r2 = await call(h, "redeem-code", { user: "u2", body: { code: "abc" } });
  assertEquals((await r2.json()).error, "format");
});

Deno.test("redeem-code: código vinculado a e-mail só vale nessa conta", async () => {
  const b = setup();
  const h = await loadHandler("../redeem-code/index.ts");
  // assina um código para outro@exemplo.com com a chave de teste (mesma do painel) carregada do JSON de chaves
  const keys = JSON.parse(await Deno.readTextFile(new URL("./test_keys.json", import.meta.url)));
  const payload = new TextEncoder().encode("SC1|0002|outro@exemplo.com|20261021");
  const priv = await crypto.subtle.importKey("jwk", keys.privJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, payload));
  const b64u = (x: Uint8Array) => btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const code = "SC1." + b64u(payload) + "." + b64u(sig);
  let r = await call(h, "redeem-code", { user: "u1", body: { code } });
  assertEquals(r.status, 400);
  assertEquals((await r.json()).error, "other_email");
  r = await call(h, "redeem-code", { user: "u2", body: { code } });
  assertEquals((await r.json()).ok, true);
  assertEquals(profile(b, "u2").lifetime, true);
});

Deno.test("admin-grant: só admin libera, revoga e repõe acessos grátis", async () => {
  const b = setup();
  const h = await loadHandler("../admin-grant/index.ts");
  let r = await call(h, "admin-grant", { user: "u1", body: { email: "outro@exemplo.com" } });
  assertEquals(r.status, 403);
  r = await call(h, "admin-grant", { user: "adm", body: { email: "Outro@Exemplo.com" } });
  assertEquals((await r.json()).lifetime, true);
  assertEquals(profile(b, "u2").lifetime, true);
  assertEquals(profile(b, "u2").lifetime_source, "admin:arthur@exemplo.com");
  r = await call(h, "admin-grant", { user: "adm", body: { email: "outro@exemplo.com", action: "revoke" } });
  assertEquals((await r.json()).lifetime, false);
  assertEquals(profile(b, "u2").lifetime, false);
  r = await call(h, "admin-grant", { user: "adm", body: { email: "outro@exemplo.com", action: "free", free_left: 5 } });
  assertEquals((await r.json()).free_left, 5);
  r = await call(h, "admin-grant", { user: "adm", body: { email: "ninguem@exemplo.com" } });
  assertEquals(r.status, 404);
});
