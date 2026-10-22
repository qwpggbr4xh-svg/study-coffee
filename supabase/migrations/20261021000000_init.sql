-- Study Coffee — banco inicial
-- Tabelas: profiles (uma por conta), payments (cobranças Pix), redeemed_codes (códigos vitalícios usados), entries (entradas na mesa).

-- ---------- utilidades ----------
-- identificador curto do Pix manual (SC + 6 letras/números sem ambiguidade); único pelo índice abaixo
create or replace function public.gen_pay_ref()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := 'SC';
  i int;
begin
  for i in 1..6 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  goal text not null default 'fuvest' check (goal in ('fuvest','unicamp','unesp','todas')),
  free_left integer not null default 3 check (free_left >= 0),
  lifetime boolean not null default false,
  lifetime_since timestamptz,
  lifetime_source text,
  is_admin boolean not null default false,
  pay_ref text not null default public.gen_pay_ref(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_pay_ref_idx on public.profiles (pay_ref);
create index profiles_email_idx on public.profiles (lower(email));

-- cria o profile quando a conta nasce em auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal text := coalesce(new.raw_user_meta_data->>'goal', 'fuvest');
  v_name text := left(coalesce(new.raw_user_meta_data->>'name', ''), 20);
begin
  if v_goal not in ('fuvest','unicamp','unesp','todas') then v_goal := 'fuvest'; end if;
  insert into public.profiles (id, email, name, goal)
  values (new.id, coalesce(new.email, ''), v_name, v_goal)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- mantém o e-mail do profile igual ao da conta
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, ''), updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_change();

-- o aluno só pode mudar apelido e vestibular; o resto é do servidor
create or replace function public.protect_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin') then
    new.id := old.id;
    new.email := old.email;
    new.free_left := old.free_left;
    new.lifetime := old.lifetime;
    new.lifetime_since := old.lifetime_since;
    new.lifetime_source := old.lifetime_source;
    new.is_admin := old.is_admin;
    new.pay_ref := old.pay_ref;
    new.created_at := old.created_at;
    new.name := left(new.name, 20);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_protect
  before update on public.profiles
  for each row execute procedure public.protect_profile();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

alter table public.profiles enable row level security;
create policy "profiles: ler o próprio (admin lê todos)"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());
create policy "profiles: editar o próprio"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- payments ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_id text unique,
  status text not null default 'pending' check (status in ('pending','approved','cancelled','expired','rejected')),
  amount numeric(10,2) not null,
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  expires_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;
create policy "payments: ler os próprios (admin lê todos)"
  on public.payments for select
  using (auth.uid() = user_id or public.is_admin());

-- ---------- redeemed_codes ----------
create table public.redeemed_codes (
  serial text primary key,
  code_hash text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email_bound text,
  issued text,
  redeemed_at timestamptz not null default now()
);
alter table public.redeemed_codes enable row level security;
create policy "redeemed_codes: admin lê"
  on public.redeemed_codes for select
  using (public.is_admin());

-- ---------- entries ----------
create table public.entries (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  room text not null,
  created_at timestamptz not null default now()
);
create index entries_user_idx on public.entries (user_id, created_at desc);
alter table public.entries enable row level security;
create policy "entries: ler as próprias (admin lê todas)"
  on public.entries for select
  using (auth.uid() = user_id or public.is_admin());

-- ---------- entrar na mesa (gasta 1 acesso grátis, ou nada se vitalício) ----------
create or replace function public.enter_room(p_room text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles%rowtype;
  v_room text := left(coalesce(p_room, 'mesa-aberta'), 48);
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if p.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_profile');
  end if;
  if p.lifetime then
    insert into public.entries (user_id, room) values (p.id, v_room);
    return jsonb_build_object('ok', true, 'lifetime', true, 'free_left', p.free_left);
  end if;
  if p.free_left <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_access', 'lifetime', false, 'free_left', 0);
  end if;
  update public.profiles set free_left = free_left - 1 where id = p.id returning free_left into p.free_left;
  insert into public.entries (user_id, room) values (p.id, v_room);
  return jsonb_build_object('ok', true, 'lifetime', false, 'free_left', p.free_left);
end;
$$;
revoke all on function public.enter_room(text) from public;
grant execute on function public.enter_room(text) to authenticated;

-- ---------- tempo real: o site ouve mudanças no próprio profile e nos próprios pagamentos ----------
alter table public.profiles replica identity full;
alter table public.payments replica identity full;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.payments;
