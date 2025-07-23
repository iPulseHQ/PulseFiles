-- Create the shared_files table
create table public.shared_files (
    id text primary key,
    file_name text not null,
    file_url text not null,
    file_size bigint not null,
    email text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Add RLS (Row Level Security) policies
alter table public.shared_files enable row level security;

-- Allow anyone to insert new file records
create policy "Anyone can insert file records" on public.shared_files
    for insert with check (true);

-- Allow anyone to select file records by ID (needed for download page)
create policy "Anyone can select file records by ID" on public.shared_files
    for select using (true);

-- Create an index for faster lookups by ID
create index shared_files_id_idx on public.shared_files (id);

-- Create an index for faster lookups by created_at (for cleanup)
create index shared_files_created_at_idx on public.shared_files (created_at);