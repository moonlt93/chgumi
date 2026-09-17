begin;

create table if not exists public.life_states (
  user_id uuid primary key,
  revision bigint not null check (revision > 0),
  state jsonb not null check (
    jsonb_typeof(state) = 'object'
    and state @> '{"version": 1}'::jsonb
    and (state->>'coins')::numeric >= 0
  ),
  updated_at timestamptz not null default now()
);

alter table public.life_states enable row level security;
revoke all on public.life_states from anon, authenticated;
grant select, insert, update, delete on public.life_states to service_role;

-- A stale revision never overwrites another server's committed changes.
create or replace function public.save_life_state(
  p_user_id uuid,
  p_revision bigint,
  p_state jsonb
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected integer;
begin
  if p_revision = 0 then
    insert into public.life_states (user_id, revision, state)
    values (p_user_id, 1, p_state)
    on conflict (user_id) do nothing;
  else
    update public.life_states
    set state = p_state, revision = revision + 1, updated_at = now()
    where user_id = p_user_id and revision = p_revision;
  end if;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.save_life_state(uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.save_life_state(uuid, bigint, jsonb) to service_role;

commit;
