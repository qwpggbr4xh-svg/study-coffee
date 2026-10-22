-- Mais vestibulares: banca Vunesp, particulares de Goiás, FGV/Insper e ENEM.

alter table public.profiles drop constraint if exists profiles_goal_check;
alter table public.profiles add constraint profiles_goal_check
  check (goal in ('fuvest','unicamp','unesp','vunesp','goias','fgv','enem','todas'));

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal text := coalesce(new.raw_user_meta_data->>'goal', 'fuvest');
  v_name text := left(coalesce(new.raw_user_meta_data->>'name', ''), 20);
begin
  if v_goal not in ('fuvest','unicamp','unesp','vunesp','goias','fgv','enem','todas') then v_goal := 'fuvest'; end if;
  insert into public.profiles (id, email, name, goal)
  values (new.id, coalesce(new.email, ''), v_name, v_goal)
  on conflict (id) do nothing;
  return new;
end;
$$;
