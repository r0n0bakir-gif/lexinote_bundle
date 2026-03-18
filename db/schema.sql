create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create table if not exists profiles (
  id uuid primary key,
  email text unique,
  display_name text,
  avatar_url text,
  preferred_language text default 'de',
  theme text default 'cozy',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists idx_decks_user_id on decks(user_id);

create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  deck_id uuid references decks(id) on delete set null,
  german_word text not null,
  normalized_word text not null,
  translation text,
  source text not null default 'manual' check (source in ('manual','linguee','pons','verbformen','clipboard')),
  source_url text,
  part_of_speech text not null default 'other' check (part_of_speech in ('noun','verb','adjective','adverb','phrase','other')),
  gender text check (gender in ('der','die','das') or gender is null),
  article text,
  cefr_level text,
  example_sentence text,
  example_translation text,
  synonyms jsonb not null default '[]'::jsonb,
  antonyms jsonb not null default '[]'::jsonb,
  notes text,
  is_learned boolean not null default false,
  study_status text not null default 'new' check (study_status in ('new','learning','review','learned')),
  srs_interval_days integer not null default 0,
  srs_ease_factor numeric(4,2) not null default 2.50,
  srs_repetitions integer not null default 0,
  due_at timestamptz not null default timezone('utc', now()),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists idx_words_user_id on words(user_id);
create index if not exists idx_words_due_at on words(due_at);
create unique index if not exists uq_words_user_deck_normalized on words (user_id, coalesce(deck_id,'00000000-0000-0000-0000-000000000000'::uuid), normalized_word);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create unique index if not exists uq_tags_user_name on tags(user_id, lower(name));

create table if not exists word_tags (
  word_id uuid not null references words(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (word_id, tag_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  rating text not null check (rating in ('again','hard','good','easy')),
  previous_interval_days integer not null default 0,
  next_interval_days integer not null default 0,
  reviewed_at timestamptz not null default timezone('utc', now())
);

create table if not exists daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  stat_date date not null,
  words_added integer not null default 0,
  reviews_done integer not null default 0,
  minutes_studied integer not null default 0,
  streak_day boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create unique index if not exists uq_daily_stats_user_date on daily_stats(user_id, stat_date);

create or replace trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create or replace trigger trg_decks_updated_at before update on decks for each row execute function set_updated_at();
create or replace trigger trg_words_updated_at before update on words for each row execute function set_updated_at();
create or replace trigger trg_tags_updated_at before update on tags for each row execute function set_updated_at();
create or replace trigger trg_daily_stats_updated_at before update on daily_stats for each row execute function set_updated_at();
