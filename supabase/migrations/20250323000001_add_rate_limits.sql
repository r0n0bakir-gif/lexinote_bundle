-- Migration: add_rate_limits
-- WHY: Table-based rate limiting using Postgres is sufficient for 20 calls/hour
-- limits. We avoid introducing Redis/Upstash as an extra infrastructure dependency
-- — Supabase Postgres is already the single source of truth for this app.

create table if not exists api_rate_limits (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references profiles(id) on delete cascade,
  endpoint     text        not null,
  call_count   integer     not null default 0,
  window_start timestamptz not null default timezone('utc', now()),
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);

-- WHY: Unique index on (user_id, endpoint) lets us use ON CONFLICT DO UPDATE
-- in the RPC below for an efficient upsert, and guarantees one row per user
-- per endpoint (no duplicate windows accumulating over time).
create unique index if not exists uq_rate_limits_user_endpoint
  on api_rate_limits(user_id, endpoint);

create index if not exists idx_rate_limits_user_id
  on api_rate_limits(user_id);

create or replace trigger trg_rate_limits_updated_at
  before update on api_rate_limits
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: check_and_increment_rate_limit
-- WHY: The check + increment must be atomic to prevent TOCTOU race conditions
-- where two concurrent requests both pass the limit check before either
-- increments the counter. FOR UPDATE row-level locking inside a function
-- serialises concurrent calls for the same (user_id, endpoint) pair.
-- Returns a single row: (allowed BOOLEAN, call_count INT, window_start TIMESTAMPTZ).
-- ---------------------------------------------------------------------------
create or replace function check_and_increment_rate_limit(
  p_user_id        uuid,
  p_endpoint       text,
  p_limit          int,
  p_window_seconds int
)
returns table(allowed boolean, call_count int, window_start timestamptz)
language plpgsql
as $$
declare
  v_row    api_rate_limits%rowtype;
  v_now    timestamptz := timezone('utc', now());
begin
  -- Lock the row for this (user, endpoint) pair so concurrent requests queue
  -- here rather than racing past the count check.
  select * into v_row
    from api_rate_limits
   where api_rate_limits.user_id  = p_user_id
     and api_rate_limits.endpoint = p_endpoint
  for update;

  if not found then
    -- First ever call for this user+endpoint: insert with count = 1.
    insert into api_rate_limits (user_id, endpoint, call_count, window_start)
    values (p_user_id, p_endpoint, 1, v_now)
    returning api_rate_limits.* into v_row;

    return query select true, v_row.call_count, v_row.window_start;
    return;
  end if;

  -- Check if the current window has expired.
  if v_now - v_row.window_start > make_interval(secs => p_window_seconds) then
    -- Window expired: reset to a fresh window with count = 1.
    update api_rate_limits
       set call_count   = 1,
           window_start = v_now
     where api_rate_limits.user_id  = p_user_id
       and api_rate_limits.endpoint = p_endpoint
    returning api_rate_limits.* into v_row;

    return query select true, v_row.call_count, v_row.window_start;
    return;
  end if;

  -- Active window: enforce the limit.
  if v_row.call_count >= p_limit then
    -- WHY: Do NOT increment on rejection — count stays at the limit so the
    -- next request in the same window also gets rejected cleanly.
    return query select false, v_row.call_count, v_row.window_start;
    return;
  end if;

  -- Under limit: increment and allow.
  update api_rate_limits
     set call_count = call_count + 1
   where api_rate_limits.user_id  = p_user_id
     and api_rate_limits.endpoint = p_endpoint
  returning api_rate_limits.* into v_row;

  return query select true, v_row.call_count, v_row.window_start;
end;
$$;
