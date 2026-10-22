-- Move as funções auxiliares para um schema fora da API (recomendação do linter do Supabase).
-- Só enter_room continua chamável pelo site, e apenas por quem está logado.
-- As policies, os triggers e o default de pay_ref apontam para as funções pelo OID, então continuam valendo após a mudança de schema.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role, supabase_auth_admin;

alter function public.gen_pay_ref() set schema private;
alter function public.is_admin() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.handle_user_email_change() set schema private;
alter function public.protect_profile() set schema private;

revoke all on function private.gen_pay_ref() from public, anon, authenticated;
grant execute on function private.gen_pay_ref() to service_role, supabase_auth_admin;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

revoke all on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin, service_role;

revoke all on function private.handle_user_email_change() from public, anon, authenticated;
grant execute on function private.handle_user_email_change() to supabase_auth_admin, service_role;

revoke all on function private.protect_profile() from public;
grant execute on function private.protect_profile() to anon, authenticated, service_role, supabase_auth_admin;

revoke execute on function public.enter_room(text) from anon;
