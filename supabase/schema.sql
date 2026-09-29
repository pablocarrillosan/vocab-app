-- Pega esto en el SQL Editor de tu proyecto de Supabase (o ejecútalo con la
-- CLI: supabase db push). Crea las dos tablas de la app y las políticas de
-- seguridad por fila para que cada persona solo vea y edite sus propias
-- palabras y resultados.

create extension if not exists pgcrypto;

-- Palabras apuntadas por el usuario ------------------------------------------------
create table if not exists public.words (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  en            text not null,
  es            text not null,
  ex            text not null default '',
  word_date     date not null,
  missed_count  integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists words_user_date_idx on public.words (user_id, word_date);

alter table public.words enable row level security;

create policy "words: select own" on public.words
  for select using (auth.uid() = user_id);
create policy "words: insert own" on public.words
  for insert with check (auth.uid() = user_id);
create policy "words: update own" on public.words
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "words: delete own" on public.words
  for delete using (auth.uid() = user_id);

-- Resultado del examen de cada semana ----------------------------------------------
create table if not exists public.exam_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start  date not null,
  score       integer not null,
  total       integer not null,
  done_at     timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.exam_results enable row level security;

create policy "exam_results: select own" on public.exam_results
  for select using (auth.uid() = user_id);
create policy "exam_results: insert own" on public.exam_results
  for insert with check (auth.uid() = user_id);
create policy "exam_results: update own" on public.exam_results
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
