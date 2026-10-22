// admin-grant — o Arthur (is_admin) libera ou revoga o vitalício de um aluno pelo e-mail (Pix conferido no extrato, cortesia etc.).
import { json, preflight, readJson } from "../_shared/http.ts";
import { adminClient, getProfile, grantLifetime, requireUser } from "../_shared/supabase.ts";
import { normEmail } from "../_shared/codes.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);
    const admin = adminClient();
    const me = await getProfile(admin, user.id);
    if (!me || !me.is_admin) return json({ error: "forbidden" }, 403);

    const body = await readJson(req);
    const email = normEmail(body.email);
    const action = String(body.action ?? "grant");
    if (!email) return json({ error: "email_required" }, 400);
    const { data: target } = await admin.from("profiles").select("id,email,lifetime").ilike("email", email).maybeSingle();
    if (!target) return json({ error: "not_found" }, 404);

    if (action === "revoke") {
      const { error } = await admin.from("profiles").update({ lifetime: false, lifetime_since: null, lifetime_source: null }).eq("id", target.id);
      if (error) throw error;
      return json({ ok: true, email: target.email, lifetime: false });
    }
    if (action === "free") {
      const n = Math.max(0, Math.min(99, Math.floor(Number(body.free_left ?? 3))));
      const { error } = await admin.from("profiles").update({ free_left: n }).eq("id", target.id);
      if (error) throw error;
      return json({ ok: true, email: target.email, free_left: n });
    }
    await grantLifetime(admin, target.id, "admin:" + me.email);
    return json({ ok: true, email: target.email, lifetime: true });
  } catch (e) {
    console.error("admin-grant", e);
    return json({ error: "server_error", message: String((e as Error)?.message ?? e) }, 500);
  }
});
