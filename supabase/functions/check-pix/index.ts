// check-pix — o site chama de tempos em tempos enquanto a tela do Pix está aberta.
// Reconsulta o Mercado Pago; se aprovou, libera o vitalício (mesmo que o webhook ainda não tenha chegado).
import { json, preflight, readJson } from "../_shared/http.ts";
import { adminClient, grantLifetime, requireUser } from "../_shared/supabase.ts";
import { mapStatus, mpGetPayment, mpToken } from "../_shared/mp.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);
    const body = await readJson(req);
    const admin = adminClient();

    const { data: profile } = await admin.from("profiles").select("lifetime").eq("id", user.id).maybeSingle();
    if (profile?.lifetime) return json({ status: "approved", lifetime: true });
    if (!mpToken()) return json({ status: "fallback" });

    let q = admin.from("payments").select("*").eq("user_id", user.id);
    q = body.payment_id ? q.eq("id", String(body.payment_id)) : q.eq("status", "pending");
    const { data: row } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!row || !row.provider_id) return json({ status: "none" });
    if (row.status !== "pending") return json({ status: row.status, lifetime: row.status === "approved" });

    const mp = await mpGetPayment(String(row.provider_id));
    const status = mapStatus(mp);
    if (status !== row.status) {
      await admin.from("payments").update({ status, raw: mp.raw, updated_at: new Date().toISOString() }).eq("id", row.id);
    }
    if (status === "approved") await grantLifetime(admin, user.id, "pix");
    return json({ status, lifetime: status === "approved" });
  } catch (e) {
    console.error("check-pix", e);
    return json({ error: "mp_error", message: String((e as Error)?.message ?? e) }, 502);
  }
});
