-- Migration: add_notification_prefs
-- Adds push subscription storage and per-user notification preference columns.

-- ── Push subscription store ────────────────────────────────────────────────────
-- WHY: Storing subscriptions server-side (vs. only in IndexedDB) means the
-- daily-reminder Edge Function can send pushes to users who haven't visited
-- recently — IndexedDB is only accessible when the browser is open.
create table if not exists notification_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  endpoint    text        not null,
  p256dh      text        not null,
  auth        text        not null,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

-- WHY: Unique on (user_id, endpoint) so re-subscribing from the same browser
-- upserts cleanly rather than creating duplicate rows.
create unique index if not exists uq_notification_subscriptions_user_endpoint
  on notification_subscriptions(user_id, endpoint);

create index if not exists idx_notification_subscriptions_user_id
  on notification_subscriptions(user_id);

create or replace trigger trg_notification_subscriptions_updated_at
  before update on notification_subscriptions
  for each row execute function set_updated_at();

-- ── Per-user notification preferences ─────────────────────────────────────────
-- WHY: Stored on the profiles table (not a separate table) because there is
-- exactly one preferences row per user and joining would be wasteful.
alter table profiles
  add column if not exists push_notifications_enabled boolean not null default false,
  add column if not exists email_reminders_enabled    boolean not null default false,
  -- WHY: reminder_time stores the user's local preferred reminder time as
  -- HH:MM (e.g. "20:00"). The Edge Function converts to UTC per user timezone.
  -- Stored as text rather than time to avoid timezone ambiguity at the DB layer.
  add column if not exists reminder_time              text    not null default '20:00';
