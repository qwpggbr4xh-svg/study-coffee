// Códigos assinados: <tipo>.<payload base64url>.<assinatura ECDSA P-256 base64url>
// Tipos: SC1 = acesso vitalício; SA1 = administrador (também libera o vitalício).
// O payload é "<tipo>|<nº>|<e-mail ou vazio>|<AAAAMMDD>". A chave privada fica só no painel do Arthur.

export type CodeKind = "lifetime" | "admin";
export const KIND_BY_PREFIX: Record<string, CodeKind> = { SC1: "lifetime", SA1: "admin" };

export interface VerifiedCode {
  code: string;
  kind: CodeKind;
  serial: string;
  email: string;
  issued: string;
}

const DEFAULT_PUB_KEYS: JsonWebKey[] = [
  { kty: "EC", crv: "P-256", x: "wZP3rcZVMH26sQJS_dEQCTg8-oLo8BVTTvfIdWrXB5g", y: "wNq09BwByphGdwCaraIxqL948BpyfdzM_mmyhs7WY14" },
];

export function pubKeys(): JsonWebKey[] {
  const extra = Deno.env.get("SC_PUBKEYS_JSON");
  if (!extra) return DEFAULT_PUB_KEYS;
  try {
    const parsed = JSON.parse(extra);
    if (Array.isArray(parsed) && parsed.length) return parsed as JsonWebKey[];
  } catch { /* ignora e usa a padrão */ }
  return DEFAULT_PUB_KEYS;
}

function b64uToBytes(v: string): Uint8Array {
  let s = String(v || "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const normEmail = (v: unknown): string => String(v ?? "").replace(/\s+/g, "").toLowerCase().slice(0, 120);

interface Parsed extends VerifiedCode {
  payloadBytes: Uint8Array;
  sig: Uint8Array;
}

export function parseCode(raw: unknown): Parsed | null {
  const code = String(raw ?? "").replace(/\s+/g, "");
  const m = code.split(".");
  if (m.length !== 3 || !KIND_BY_PREFIX[m[0]]) return null;
  let payloadBytes: Uint8Array, sig: Uint8Array;
  try {
    payloadBytes = b64uToBytes(m[1]);
    sig = b64uToBytes(m[2]);
  } catch {
    return null;
  }
  if (sig.length !== 64) return null;
  const payload = new TextDecoder().decode(payloadBytes);
  const p = payload.split("|");
  if (p.length !== 4 || p[0] !== m[0]) return null;
  if (!/^\d{4,6}$/.test(p[1]) || !/^\d{8}$/.test(p[3])) return null;
  return { code, payloadBytes, sig, kind: KIND_BY_PREFIX[m[0]], serial: p[1], email: normEmail(p[2]), issued: p[3] };
}

export async function verifyCode(raw: unknown, keys: JsonWebKey[] = pubKeys()): Promise<{ ok: true; value: VerifiedCode } | { ok: false; reason: "format" | "invalid" }> {
  const parsed = parseCode(raw);
  if (!parsed) return { ok: false, reason: "format" };
  for (const jwk of keys) {
    try {
      const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, parsed.sig as BufferSource, parsed.payloadBytes as BufferSource);
      if (ok) return { ok: true, value: { code: parsed.code, kind: parsed.kind, serial: parsed.serial, email: parsed.email, issued: parsed.issued } };
    } catch { /* tenta a próxima chave */ }
  }
  return { ok: false, reason: "invalid" };
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
