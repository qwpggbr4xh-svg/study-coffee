-- Ranking de tempo de foco por mesa, checklist pessoal e personagem.
-- Só acrescenta: nada do que já está no ar muda.

-- ---------- tempo de foco ----------
create table public.focus_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  room text not null,
  seconds integer not null check (seconds between 30 and 900),
  day date not null,
  created_at timestamptz not null default now()
);
create index focus_log_room_day_idx on public.focus_log (room, day);
create index focus_log_user_idx on public.focus_log (user_id, created_at desc);
alter table public.focus_log enable row level security;
create policy "focus_log: ler o próprio (admin lê todos)"
  on public.focus_log for select
  using (auth.uid() = user_id or private.is_admin());

-- o site registra o foco em fatias de até 15 min; o servidor não deixa registrar mais tempo do que passou
create or replace function public.log_focus(p_room text, p_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room text := left(coalesce(p_room, 'mesa-aberta'), 48);
  v_sec integer := coalesce(p_seconds, 0);
  v_last timestamptz;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_day_total integer;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'no_user'); end if;
  if v_sec < 30 or v_sec > 900 then return jsonb_build_object('ok', false, 'reason', 'bad_seconds'); end if;
  select max(created_at) into v_last from public.focus_log where user_id = v_uid;
  if v_last is not null and extract(epoch from (now() - v_last)) + 60 < v_sec then
    return jsonb_build_object('ok', false, 'reason', 'too_soon');
  end if;
  select coalesce(sum(seconds), 0) into v_day_total from public.focus_log where user_id = v_uid and day = v_today;
  if v_day_total + v_sec > 16 * 3600 then return jsonb_build_object('ok', false, 'reason', 'day_cap'); end if;
  insert into public.focus_log (user_id, room, seconds, day) values (v_uid, v_room, v_sec, v_today);
  return jsonb_build_object('ok', true, 'day_total', v_day_total + v_sec);
end;
$$;
revoke all on function public.log_focus(text, integer) from public, anon;
grant execute on function public.log_focus(text, integer) to authenticated;

-- ranking da mesa: 'day', 'week' (segunda a domingo) ou 'month', no fuso de São Paulo
create or replace function public.room_ranking(p_room text, p_period text)
returns table (user_id uuid, name text, goal text, seconds bigint, is_me boolean)
language sql
security definer
set search_path = public
stable
as $$
  with bounds as (
    select case
      when p_period = 'day' then (now() at time zone 'America/Sao_Paulo')::date
      when p_period = 'week' then (date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date
      else (date_trunc('month', now() at time zone 'America/Sao_Paulo'))::date
    end as since
  )
  select f.user_id, p.name, p.goal, sum(f.seconds)::bigint as seconds, coalesce(f.user_id = auth.uid(), false) as is_me
  from public.focus_log f
  join public.profiles p on p.id = f.user_id
  cross join bounds b
  where f.room = left(coalesce(p_room, 'mesa-aberta'), 48) and f.day >= b.since
  group by f.user_id, p.name, p.goal
  order by seconds desc, p.name asc
  limit 20;
$$;
revoke all on function public.room_ranking(text, text) from public;
grant execute on function public.room_ranking(text, text) to anon, authenticated;

-- ---------- checklist pessoal ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (length(text) between 1 and 120),
  done boolean not null default false,
  is_focus boolean not null default false,
  due date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_idx on public.tasks (user_id, position, created_at);
alter table public.tasks enable row level security;
create policy "tasks: as próprias"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public;
grant execute on function private.touch_updated_at() to anon, authenticated, service_role;
create trigger tasks_touch before update on public.tasks for each row execute procedure private.touch_updated_at();

-- ---------- personagem ----------
alter table public.profiles add column avatar jsonb;
alter table public.profiles add constraint profiles_avatar_size check (avatar is null or octet_length(avatar::text) <= 600);
