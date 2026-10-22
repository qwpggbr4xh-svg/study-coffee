// mp-webhook — o Mercado Pago avisa aqui quando um pagamento muda.
// Nunca confia no aviso: reconsulta o pagamento na API antes de liberar o vitalício. Sem JWT (config.toml).
import { json, readJson } from "../_shared/http.ts";
import { adminClient, grantLifetime } from "../_shared/supabase.ts";
import { mapStatus, mpGetPayment, mpSignatureOk, mpToken, pixAmount } from "../_shared/mp.ts";

function paymentIdFrom(url: URL, body: Record<string, unknown>): string {
  const data = (body.data as Record<string, unknown> | undefined) ?? {};
  const type = String(body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const id = String(data.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (type && type !== "payment") return "";
  return id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  const url = new URL(req.url);
  const body = req.method === "POST" ? await readJson(req) : {};
  const paymentId = paymentIdFrom(url, body);
  if (!paymentId) return json({ ok: true, ignored: true });
  if (!mpToken()) return json({ ok: true, ignored: "no_token" });
  if (!(await mpSignatureOk(req, url.searchParams.get("data.id") ?? paymentId))) {
    console.warn("mp-webhook: assinatura inválida para", paymentId);
    return json({ error: "bad_signature" }, 401);
  }
  try {
    const mp = await mpGetPayment(paymentId);
    const status = mapStatus(mp);
    const admin = adminClient();
    const { data: row } = await admin.from("payments").select("*").eq("provider_id", mp.id).maybeSingle();
    let userId = row?.user_id as string | undefined;
    if (row) {
      if (row.status !== status) {
        await admin.from("payments").update({ status, raw: mp.raw, updated_at: new Date().toISOString() }).eq("id", row.id);
      }
    } else if (mp.external_reference) {
      // cobrança que não ficou gravada (falha entre criar e salvar): registra agora pelo external_reference
      const { data: prof } = await admin.from("profiles").select("id").eq("id", mp.external_reference).maybeSingle();
      if (prof) {
        userId = prof.id;
        await admin.from("payments").insert({
          user_id: prof.id, provider: "mercadopago", provider_id: mp.id, status, amount: pixAmount(),
          qr_code: mp.qr_code, qr_code_base64: mp.qr_code_base64, ticket_url: mp.ticket_url,
          expires_at: mp.date_of_expiration, raw: mp.raw,
        });
      }
    }
    if (status === "approved" && userId) await grantLifetime(admin, userId, "pix");
    return json({ ok: true, status });
  } catch (e) {
    console.error("mp-webhook", e);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return json({ error: "retry", message: String((e as Error)?.message ?? e) }, 500);
  }
});
