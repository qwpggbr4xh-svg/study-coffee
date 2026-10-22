// create-pix — gera (ou reaproveita) a cobrança Pix do aluno logado.
// Sem MP_ACCESS_TOKEN responde {fallback:true} e o site mostra o Pix manual com identificador.
import { json, preflight } from "../_shared/http.ts";
import { adminClient, getProfile, grantLifetime, requireUser } from "../_shared/supabase.ts";
import { mapStatus, mpCreatePix, mpToken, pixAmount } from "../_shared/mp.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);
    const admin = adminClient();
    const profile = await getProfile(admin, user.id);
    if (!profile) return json({ error: "no_profile" }, 400);
    const amount = pixAmount();
    if (profile.lifetime) return json({ status: "lifetime", amount });
    if (!mpToken()) return json({ fallback: true, pay_ref: profile.pay_ref, amount, email: profile.email });

    const nowIso = new Date().toISOString();
    const { data: pending } = await admin
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pending) {
      return json({
        payment_id: pending.id, provider_id: pending.provider_id, status: "pending", amount: Number(pending.amount),
        qr_code: pending.qr_code, qr_code_base64: pending.qr_code_base64, ticket_url: pending.ticket_url, expires_at: pending.expires_at,
      });
    }

    const expiresAt = new Date(Date.now() + 30 * 60_000);
    const mp = await mpCreatePix({
      amount,
      email: profile.email,
      name: profile.name,
      userId: user.id,
      notificationUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
      expiresAt,
      idempotencyKey: crypto.randomUUID(),
    });
    const status = mapStatus(mp);
    const { data: row, error } = await admin
      .from("payments")
      .insert({
        user_id: user.id, provider: "mercadopago", provider_id: mp.id, status, amount,
        qr_code: mp.qr_code, qr_code_base64: mp.qr_code_base64, ticket_url: mp.ticket_url,
        expires_at: expiresAt.toISOString(), raw: mp.raw,
      })
      .select()
      .single();
    if (error) throw error;
    if (status === "approved") await grantLifetime(admin, user.id, "pix");
    return json({
      payment_id: row.id, provider_id: mp.id, status, amount,
      qr_code: mp.qr_code, qr_code_base64: mp.qr_code_base64, ticket_url: mp.ticket_url, expires_at: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("create-pix", e);
    return json({ error: "mp_error", message: String((e as Error)?.message ?? e) }, 502);
  }
});
