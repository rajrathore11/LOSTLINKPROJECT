-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create a table for public profiles (synced with Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  phone text,
  email text
);

-- Set up Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

-- Drop existing policies if they exist before recreating (safe for re-running)
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create a profile entry when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate trigger safely
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create table for items (Lost & Found reports)
create table if not exists public.items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('lost', 'found')) not null,
  title text not null,
  description text not null,
  category text not null,
  location text not null,
  date_lost_found timestamp with time zone not null,
  image_url text,
  status text check (status in ('active', 'matched', 'resolved')) default 'active' not null,
  description_embedding vector(768), -- Google Gemini text-embedding-004 returns 768 dimensions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for items
alter table public.items enable row level security;

-- Drop existing item policies before recreating
drop policy if exists "Items are viewable by everyone." on public.items;
drop policy if exists "Authenticated users can create items." on public.items;
drop policy if exists "Users can update their own items." on public.items;
drop policy if exists "Users can delete their own items." on public.items;

create policy "Items are viewable by everyone." on public.items
  for select using (true);

create policy "Authenticated users can create items." on public.items
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update their own items." on public.items
  for update using (auth.uid() = user_id);

create policy "Users can delete their own items." on public.items
  for delete using (auth.uid() = user_id);

-- Create table for claimed matches
create table if not exists public.claims (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete cascade not null,
  claimed_by uuid references public.profiles(id) on delete cascade not null,
  message text,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (item_id, claimed_by)
);

-- Set up RLS for claims
alter table public.claims enable row level security;

-- Drop existing claim policies before recreating
drop policy if exists "Users can view claims made on their items or claims they created." on public.claims;
drop policy if exists "Authenticated users can create a claim." on public.claims;
drop policy if exists "Users can update status of claims on their items." on public.claims;

create policy "Users can view claims made on their items or claims they created." on public.claims
  for select using (
    auth.uid() = claimed_by or 
    auth.uid() = (select user_id from public.items where id = item_id)
  );

create policy "Authenticated users can create a claim." on public.claims
  for insert with check (auth.role() = 'authenticated' and auth.uid() = claimed_by);

create policy "Users can update status of claims on their items." on public.claims
  for update using (
    auth.uid() = (select user_id from public.items where id = item_id)
  );

-- ---------------------------------------------------------------------------
-- Semantic match query
--
-- IMPORTANT: rows created while the embedding provider was broken contain
-- 768 zeros. Cosine similarity against a zero vector is NaN, which made every
-- result show "similarity": "NaN". The guard below skips those rows, and the
-- vector_norm check keeps the arithmetic NaN-free.
-- ---------------------------------------------------------------------------
create or replace function match_items (
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count int default 20,
  filter_type text default null,
  filter_category text default null
)
returns table (
  id uuid,
  user_id uuid,
  type text,
  title text,
  description text,
  category text,
  location text,
  date_lost_found timestamp with time zone,
  image_url text,
  status text,
  created_at timestamp with time zone,
  similarity float
)
language sql
stable
as $$
  select
    i.id,
    i.user_id,
    i.type,
    i.title,
    i.description,
    i.category,
    i.location,
    i.date_lost_found,
    i.image_url,
    i.status,
    i.created_at,
    (1 - (i.description_embedding <=> query_embedding))::float as similarity
  from items i
  where
    i.status = 'active'
    and i.description_embedding is not null
    -- skip all-zero embeddings (broken legacy rows) instead of returning NaN
    and vector_norm(i.description_embedding) > 0
    and (filter_type is null or i.type = filter_type)
    and (filter_category is null or i.category = filter_category)
    and (1 - (i.description_embedding <=> query_embedding)) > match_threshold
  order by i.description_embedding <=> query_embedding
  limit match_count;
$$;

-- Helper to repair legacy rows: run once after fixing your embedding provider,
-- or simply re-save the affected listings from the app.
-- select id, title from items where description_embedding is null
--   or vector_norm(description_embedding) = 0;

-- ---------------------------------------------------------------------------
-- Optional: extra columns used by the upgraded UI (safe to run on an old DB)
-- ---------------------------------------------------------------------------
alter table public.items add column if not exists pickup_code text;
alter table public.items add column if not exists resolved_at timestamp with time zone;
alter table public.claims add column if not exists proof_answer text;

create index if not exists items_status_type_idx on public.items (status, type);
create index if not exists items_created_at_idx on public.items (created_at desc);
