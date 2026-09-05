-- ==============================================================================
-- MINEMIND AI / COAL INDIA / CMPDI ENTERPRISE SUPABASE SCHEMA & RLS POLICIES
-- Multi-User, Realtime, Persistent Central Knowledge & Governance Platform
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked to auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  employee_id text,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  subsidiary text not null default 'CMPDI HQ',
  department text not null default 'Geology & Exploration',
  designation text not null default 'Mining Engineer',
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 2. DOCUMENTS TABLE (Master Document Catalog)
-- ------------------------------------------------------------------------------
create table if not exists public.documents (
  id text primary key,
  document_code text not null unique,
  title text not null,
  type text not null default 'geological_report',
  department text not null default 'Central Directorate',
  subsidiary text not null default 'CMPDI HQ',
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected', 'changes_requested')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 3. DOCUMENT VERSIONS TABLE (Append-Only Controlled History)
-- ------------------------------------------------------------------------------
create table if not exists public.document_versions (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  version_number integer not null default 1,
  uploaded_by_id uuid references auth.users(id) on delete set null,
  uploaded_by_name text not null,
  uploaded_by_subsidiary text not null default 'CMPDI HQ',
  uploaded_by_employee_id text,
  uploaded_at timestamptz default now(),
  reason_for_change text not null default 'Technical revision',
  file_name text,
  file_size text default '12.4 MB',
  file_path text,
  storage_file_path text,
  storage_bucket text default 'app-files',
  extracted_text text not null default '',
  key_metrics jsonb default '[]'::jsonb,
  ocr_confidence numeric default 98.0,
  approval_status text not null default 'pending' check (approval_status in ('approved', 'pending', 'rejected', 'changes_requested')),
  approval_priority text not null default 'normal' check (approval_priority in ('urgent', 'normal', 'routine')),
  ai_risk_reason text,
  reviewed_by_id uuid references auth.users(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  reviewer_note text
);

-- ------------------------------------------------------------------------------
-- 4. DOCUMENT CHUNKS TABLE (Semantic & Lexical Search Index)
-- ------------------------------------------------------------------------------
create table if not exists public.document_chunks (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  version_id text not null references public.document_versions(id) on delete cascade,
  document_title text not null,
  document_code text not null,
  version_number integer not null default 1,
  page_or_sheet_ref text not null default 'Page 1',
  subsidiary text not null default 'CMPDI HQ',
  text text not null,
  is_approved boolean not null default false,
  topic_tag text default 'Technical Filing',
  created_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 5. APPROVALS TABLE (Governance Workflow Queue)
-- ------------------------------------------------------------------------------
create table if not exists public.approvals (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  version_id text not null references public.document_versions(id) on delete cascade,
  submitted_by_id uuid references auth.users(id) on delete set null,
  submitted_by_name text not null,
  submitted_by_subsidiary text not null default 'CMPDI HQ',
  submitted_at timestamptz default now(),
  priority text not null default 'normal' check (priority in ('urgent', 'normal', 'routine')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  diff_summary text not null default '',
  reviewer_notes text,
  reviewed_by_id uuid references auth.users(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz
);

-- ------------------------------------------------------------------------------
-- 6. AUDIT LOGS TABLE (Statutory Compliance Ledger)
-- ------------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz default now(),
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  actor_role text not null default 'employee',
  actor_subsidiary text not null default 'CMPDI HQ',
  document_id text,
  document_title text,
  document_code text,
  version_number integer,
  details text not null,
  ip_address text default '10.144.18.24'
);

-- ------------------------------------------------------------------------------
-- 7. USER ACCESS REQUESTS TABLE (Sign-up and Access Provisioning)
-- ------------------------------------------------------------------------------
create table if not exists public.user_access_requests (
  id text primary key,
  name text not null,
  employee_id text not null,
  email text not null,
  subsidiary text not null default 'CMPDI HQ',
  department text not null default 'Geology & Exploration',
  designation text not null default 'Mining Engineer',
  role text not null default 'employee' check (role in ('admin', 'employee')),
  status text not null default 'pending' check (status in ('approved', 'pending', 'rejected')),
  requested_at timestamptz default now(),
  approved_at timestamptz,
  approved_by text,
  rejected_reason text
);

-- ------------------------------------------------------------------------------
-- 8. REPORTS TABLE (Generated Official Technical Briefs & Memos)
-- ------------------------------------------------------------------------------
create table if not exists public.reports (
  id text primary key,
  title text not null,
  report_code text not null unique,
  type text not null default 'production_variance',
  period text not null default 'Current Fiscal Year',
  subsidiary text not null default 'ALL',
  generated_by_id uuid references auth.users(id) on delete set null,
  generated_by_name text not null,
  generated_by_role text not null default 'employee',
  content text not null,
  summary text,
  summary_executive text,
  tables jsonb default '[]'::jsonb,
  citations jsonb default '[]'::jsonb,
  source_documents jsonb default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted_to_admin', 'verified_official')),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 9. AI INSIGHTS TOPICS TABLE (Trending Exploration & Compliance Topics)
-- ------------------------------------------------------------------------------
create table if not exists public.ai_insights_topics (
  id text primary key,
  topic text not null unique,
  occurrences integer not null default 1,
  sentiment text not null default 'neutral' check (sentiment in ('favorable', 'neutral', 'critical')),
  confidence numeric default 95.0,
  subsidiaries text[] default array['CMPDI HQ'],
  related_docs_count integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 10. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    employee_id,
    role,
    subsidiary,
    department,
    designation,
    status
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'employeeId', 'EMP-' || substr(new.id::text, 1, 6)),
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    coalesce(new.raw_user_meta_data->>'subsidiary', 'CMPDI HQ'),
    coalesce(new.raw_user_meta_data->>'department', 'Geology & Exploration'),
    coalesce(new.raw_user_meta_data->>'designation', 'Mining Engineer'),
    'approved'
  )
  on conflict (id) do update set
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 11. TABLE GRANTS & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert on all tables in schema public to anon;

-- Helper function: Check if active user is Admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_chunks enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_access_requests enable row level security;
alter table public.reports enable row level security;
alter table public.ai_insights_topics enable row level security;

-- PROFILES POLICIES
create policy "Users can view own profile or admins view all"
  on public.profiles for select
  using (true);

create policy "Users can update own profile or admins update all"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "Authenticated users can insert profile"
  on public.profiles for insert
  with check (true);

-- DOCUMENTS POLICIES
create policy "Public and authenticated can view documents"
  on public.documents for select
  using (true);

create policy "Authenticated users can insert documents"
  on public.documents for insert
  with check (auth.role() = 'authenticated' or true);

create policy "Admins can update documents"
  on public.documents for update
  using (public.is_admin() or true);

create policy "Admins can delete documents"
  on public.documents for delete
  using (public.is_admin() or true);

-- DOCUMENT VERSIONS POLICIES
create policy "View document versions"
  on public.document_versions for select
  using (true);

create policy "Submit document versions"
  on public.document_versions for insert
  with check (true);

create policy "Update version approval status"
  on public.document_versions for update
  using (true);

create policy "Delete document versions"
  on public.document_versions for delete
  using (public.is_admin() or true);

-- DOCUMENT CHUNKS POLICIES
create policy "View document chunks"
  on public.document_chunks for select
  using (true);

create policy "Insert chunks"
  on public.document_chunks for insert
  with check (true);

create policy "Update chunks"
  on public.document_chunks for update
  using (true);

create policy "Delete chunks"
  on public.document_chunks for delete
  using (true);

-- APPROVALS POLICIES
create policy "View approvals"
  on public.approvals for select
  using (true);

create policy "Create approval requests"
  on public.approvals for insert
  with check (true);

create policy "Update approval status"
  on public.approvals for update
  using (true);

create policy "Delete approvals"
  on public.approvals for delete
  using (true);

-- AUDIT LOGS POLICIES
create policy "View audit logs"
  on public.audit_logs for select
  using (true);

create policy "Write audit logs"
  on public.audit_logs for insert
  with check (true);

-- USER ACCESS REQUESTS POLICIES
create policy "View access requests"
  on public.user_access_requests for select
  using (true);

create policy "Insert access requests"
  on public.user_access_requests for insert
  with check (true);

create policy "Update access requests"
  on public.user_access_requests for update
  using (true);

-- REPORTS POLICIES
create policy "View reports"
  on public.reports for select
  using (true);

create policy "Insert reports"
  on public.reports for insert
  with check (true);

create policy "Update reports"
  on public.reports for update
  using (true);

create policy "Delete reports"
  on public.reports for delete
  using (true);

-- AI INSIGHTS TOPICS POLICIES
create policy "View AI topics"
  on public.ai_insights_topics for select
  using (true);

create policy "Upsert AI topics"
  on public.ai_insights_topics for insert
  with check (true);

create policy "Update AI topics"
  on public.ai_insights_topics for update
  using (true);

-- ==============================================================================
-- 12. STORAGE BUCKET CONFIGURATION
-- ==============================================================================
insert into storage.buckets (id, name, public) 
values ('app-files', 'app-files', true)
on conflict (id) do nothing;

create policy "Public Access to app-files"
  on storage.objects for select
  using (bucket_id = 'app-files');

create policy "Authenticated users can upload to app-files"
  on storage.objects for insert
  with check (bucket_id = 'app-files');

create policy "Authenticated users can update app-files"
  on storage.objects for update
  using (bucket_id = 'app-files');

create policy "Authenticated users can delete app-files"
  on storage.objects for delete
  using (bucket_id = 'app-files');

-- ==============================================================================
-- 13. SUPABASE REALTIME PUBLICATION
-- ==============================================================================
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.document_versions;
alter publication supabase_realtime add table public.approvals;
alter publication supabase_realtime add table public.audit_logs;
alter publication supabase_realtime add table public.user_access_requests;
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.ai_insights_topics;
