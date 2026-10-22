// redeem-code — ativa um código assinado na conta logada: SC1 (vitalício) ou SA1 (administrador). Cada nº só pode ser usado uma vez.
import { json, preflight, readJson } from "../_shared/http.ts";
import { adminClient, getProfile, grantAdmin, grantLifetime, requireUser } from "../_shared/supabase.ts";
import { sha256Hex, verifyCode } from "../_shared/codes.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);
    const body = await readJson(req);
    const admin = adminClient();
    const profile = await getProfile(admin, user.id);
    if (!profile) return json({ error: "no_profile" }, 400);

    const v = await verifyCode(body.code);
    if (!v.ok) {
      // quem já tem tudo não precisa de código: responde "already" mesmo com código ruim, como antes
      if (profile.lifetime && v.reason === "format") return json({ ok: true, already: true });
      return json({ error: v.reason }, 400);
    }
    const code = v.value;
    const isAdminCode = code.kind === "admin";
    if (isAdminCode && profile.is_admin) return json({ ok: true, already: true, admin: true });
    if (!isAdminCode && profile.lifetime) return json({ ok: true, already: true });
    const myEmail = profile.email.trim().toLowerCase();
    if (code.email && code.email !== myEmail) return json({ error: "other_email", email: code.email }, 400);

    // nºs de código de administrador ficam num espaço próprio (A0001), sem bater com os vitalícios
    const serialKey = (isAdminCode ? "A" : "") + code.serial;
    const { data: used } = await admin.from("redeemed_codes").select("serial,user_id").eq("serial", serialKey).maybeSingle();
    if (used && used.user_id !== user.id) return json({ error: "used" }, 409);
    if (!used) {
      const { error } = await admin.from("redeemed_codes").insert({
        serial: serialKey, code_hash: await sha256Hex(code.code), user_id: user.id, email_bound: code.email || null, issued: code.issued,
      });
      if (error) {
        // corrida: outro pedido gravou o mesmo nº antes
        if (String(error.code) === "23505") return json({ error: "used" }, 409);
        throw error;
      }
    }
    if (isAdminCode) await grantAdmin(admin, user.id, "code:" + serialKey);
    else await grantLifetime(admin, user.id, "code:" + code.serial);
    return json({ ok: true, serial: code.serial, admin: isAdminCode });
  } catch (e) {
    console.error("redeem-code", e);
    return json({ error: "server_error", message: String((e as Error)?.message ?? e) }, 500);
  }
});
