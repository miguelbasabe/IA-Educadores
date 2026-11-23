-- Base de datos para Práctica IA.
-- Ejecuta este archivo completo en Supabase > SQL Editor.

create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null check (char_length(trim(task)) > 0),
  note text not null check (char_length(trim(note)) > 0),
  evidence text,
  is_final_delivery boolean not null default false,
  practice_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists practices_user_date_idx
  on public.practices (user_id, practice_date desc);

-- Estas dos tablas dejan preparada la app si más adelante quieres registrar
-- hábitos con una marca simple por día, además de las prácticas detalladas.
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (habit_id, checked_on)
);

alter table public.practices enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;

-- Cada persona puede leer, crear, cambiar y borrar únicamente sus propios datos.
drop policy if exists "Usuarios gestionan sus propias prácticas" on public.practices;
create policy "Usuarios gestionan sus propias prácticas"
on public.practices for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios gestionan sus propios hábitos" on public.habits;
create policy "Usuarios gestionan sus propios hábitos"
on public.habits for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Una marca de hábito debe pertenecer a un hábito de la misma persona.
drop policy if exists "Usuarios gestionan sus propias marcas" on public.habit_checkins;
drop policy if exists "Solo usar hábitos propios al marcar" on public.habit_checkins;
create policy "Usuarios ven sus propias marcas"
on public.habit_checkins for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (select 1 from public.habits where habits.id = habit_checkins.habit_id and habits.user_id = (select auth.uid()))
);

create policy "Usuarios crean marcas en hábitos propios"
on public.habit_checkins for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.habits where habits.id = habit_checkins.habit_id and habits.user_id = (select auth.uid()))
);

create policy "Usuarios cambian marcas propias"
on public.habit_checkins for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.habits where habits.id = habit_checkins.habit_id and habits.user_id = (select auth.uid()))
);

create policy "Usuarios borran marcas propias"
on public.habit_checkins for delete
to authenticated
using ((select auth.uid()) = user_id);
