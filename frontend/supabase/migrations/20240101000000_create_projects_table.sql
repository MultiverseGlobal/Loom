create table public.projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  platform text not null, -- 'loveable', 'figma', 'komposo'
  source_url text,
  status text default 'ready'::text, -- 'processing', 'ready', 'failed'
  user_id uuid references auth.users(id) not null
);

-- Set up Row Level Security (RLS)
alter table public.projects enable row level security;

create policy "Users can view their own projects"
  on public.projects for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own projects"
  on public.projects for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own projects"
  on public.projects for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own projects"
  on public.projects for delete
  using ( auth.uid() = user_id );
