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
  pos           text,                     -- categoría: n, v, adj, adv, phr, expr
  note          text not null default '', -- matiz que distingue el significado
  word_date     date not null,
  missed_count  integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Si la tabla ya existía de antes, esto añade las columnas de categoría y matiz.
-- Una palabra puede tener varias filas con el mismo inglés: una por significado.
alter table public.words add column if not exists pos text;
alter table public.words add column if not exists note text not null default '';

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

-- Verbos B2 y C1: resultado de cada día del plan -------------------------------------
-- key es el número de día ('1'…'56') o 'acumulativo' para el repaso de todo.
-- En el plan C1 llevan el prefijo 'c1-' ('c1-1'…'c1-56', 'c1-acumulativo').
create table if not exists public.verb_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key         text not null,
  score       integer not null,
  total       integer not null,
  done_at     timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.verb_results enable row level security;

create policy "verb_results: select own" on public.verb_results
  for select using (auth.uid() = user_id);
create policy "verb_results: insert own" on public.verb_results
  for insert with check (auth.uid() = user_id);
create policy "verb_results: update own" on public.verb_results
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Verbos B2 y C1: fallos y última vez que salió cada verbo ---------------------------
-- verb es el infinitivo en inglés, que es único entre las dos listas de verbos.
create table if not exists public.verb_stats (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  verb          text not null,
  missed_count  integer not null default 0,
  last_seen     timestamptz,
  unique (user_id, verb)
);

alter table public.verb_stats enable row level security;

create policy "verb_stats: select own" on public.verb_stats
  for select using (auth.uid() = user_id);
create policy "verb_stats: insert own" on public.verb_stats
  for insert with check (auth.uid() = user_id);
create policy "verb_stats: update own" on public.verb_stats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Repaso de gramática B1: respuestas y notas de cada bloque ---------------------------
-- block es el id del bloque ('presentes', 'pasados'…). answers guarda lo escrito o
-- elegido en cada ejercicio ('tanda.ítem' o 'tanda.ítem.hueco' -> texto) y scores la
-- nota de cada tanda corregida (índice de tanda -> [aciertos, total]).
create table if not exists public.grammar_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  block       text not null,
  answers     jsonb not null default '{}'::jsonb,
  scores      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (user_id, block)
);

alter table public.grammar_progress enable row level security;

create policy "grammar_progress: select own" on public.grammar_progress
  for select using (auth.uid() = user_id);
create policy "grammar_progress: insert own" on public.grammar_progress
  for insert with check (auth.uid() = user_id);
create policy "grammar_progress: update own" on public.grammar_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
