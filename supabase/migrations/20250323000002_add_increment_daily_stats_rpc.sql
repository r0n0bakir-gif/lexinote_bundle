-- Migration: add_increment_daily_stats_rpc
-- WHY: The existing TypeScript code in app/api/reviews/route.ts uses a
-- SELECT → INSERT/UPDATE pattern which has a TOCTOU race condition:
-- two concurrent review submissions for the same user on the same day
-- both read reviews_done=5, both compute reviews_done+1=6, and both
-- write 6 — losing one increment. This RPC uses INSERT ... ON CONFLICT
-- DO UPDATE which is a single atomic SQL statement, eliminating the race.
--
-- Additionally, minutes_studied was never populated anywhere in the app.
-- This RPC accepts it as a parameter so the API can now increment it
-- correctly as the study component tracks time-per-card.

create or replace function increment_daily_stats(
  p_user_id         uuid,
  p_date            date,
  p_cards_reviewed  int,
  p_minutes_studied int
)
returns void
language plpgsql
as $$
begin
  -- WHY: ON CONFLICT DO UPDATE on the composite unique index
  -- (user_id, stat_date) makes this a single atomic upsert.
  -- No SELECT first, no race between INSERT and UPDATE.
  insert into daily_stats (
    user_id,
    stat_date,
    words_added,
    reviews_done,
    minutes_studied,
    streak_day
  )
  values (
    p_user_id,
    p_date,
    0,
    p_cards_reviewed,
    p_minutes_studied,
    true
  )
  on conflict (user_id, stat_date)
  do update set
    reviews_done    = daily_stats.reviews_done    + excluded.reviews_done,
    minutes_studied = daily_stats.minutes_studied + excluded.minutes_studied,
    -- WHY: streak_day is set unconditionally to true on any review activity.
    -- The dashboard computes streak length by counting consecutive streak_day=true
    -- rows, so this flag just marks "user was active today."
    streak_day      = true;
end;
$$;
