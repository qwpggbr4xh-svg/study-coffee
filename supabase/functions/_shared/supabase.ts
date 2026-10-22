// Clientes do Supabase dentro das funções: um com a chave de serviço (banco) e um com o token do aluno (quem está chamando).
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.117.2";

export type Admin = SupabaseClient;

export function adminClient(): Admin {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function requireUser(req: Request): Promise<User | null> {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  goal: string;
  free_left: number;
  lifetime: boolean;
  lifetime_since: string | null;
  lifetime_source: string | null;
  is_admin: boolean;
  pay_ref: string;
}

export async function getProfile(admin: Admin, userId: string): Promise<Profile | null> {
  const { data, error } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

/** Libera o acesso vitalício. Idempotente: quem já tem, continua como está. */
export async function grantLifetime(admin: Admin, userId: string, source: string): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({ lifetime: true, lifetime_since: new Date().toISOString(), lifetime_source: source })
    .eq("id", userId)
    .eq("lifetime", false);
  if (error) throw error;
}
