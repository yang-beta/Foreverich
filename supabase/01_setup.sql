-- ============================================================
-- 洸限 CMS / Supabase Setup
-- Step 1: Tables + RLS + P1 seed
-- ============================================================

-- ------------------------------------------------------------
-- A. CMS 管理員名單
-- ------------------------------------------------------------
create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.cms_admins enable row level security;

drop policy if exists "admin can read own membership"
on public.cms_admins;

create policy "admin can read own membership"
on public.cms_admins
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

-- ------------------------------------------------------------
-- B. 私有 CMS 資料：草稿 + 已發布紀錄
-- 訪客完全不能 SELECT。
-- ------------------------------------------------------------
create table if not exists public.cms_content (
  content_key text primary key,
  page_key text not null,
  label text not null,
  content_type text not null default 'text',
  draft_value text,
  published_value text,
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists cms_content_page_key_idx
on public.cms_content(page_key);

alter table public.cms_content enable row level security;

drop policy if exists "cms admins select content"
on public.cms_content;

drop policy if exists "cms admins insert content"
on public.cms_content;

drop policy if exists "cms admins update content"
on public.cms_content;

drop policy if exists "cms admins delete content"
on public.cms_content;

create policy "cms admins select content"
on public.cms_content
for select
to authenticated
using (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
);

create policy "cms admins insert content"
on public.cms_content
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
);

create policy "cms admins update content"
on public.cms_content
for update
to authenticated
using (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
);

create policy "cms admins delete content"
on public.cms_content
for delete
to authenticated
using (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
);

-- ------------------------------------------------------------
-- C. 公開已發布內容
-- 訪客只讀這張表，不可能讀到 draft_value。
-- ------------------------------------------------------------
create table if not exists public.site_content_public (
  content_key text primary key,
  page_key text not null,
  value text not null,
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists site_content_public_page_key_idx
on public.site_content_public(page_key);

alter table public.site_content_public enable row level security;

drop policy if exists "public can read published content"
on public.site_content_public;

drop policy if exists "cms admins insert published content"
on public.site_content_public;

drop policy if exists "cms admins update published content"
on public.site_content_public;

drop policy if exists "cms admins delete published content"
on public.site_content_public;

create policy "public can read published content"
on public.site_content_public
for select
to anon, authenticated
using (true);

create policy "cms admins insert published content"
on public.site_content_public
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
);

create policy "cms admins update published content"
on public.site_content_public
for update
to authenticated
using (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
);

create policy "cms admins delete published content"
on public.site_content_public
for delete
to authenticated
using (
  exists (
    select 1
    from public.cms_admins
    where user_id = (select auth.uid())
  )
);

-- ------------------------------------------------------------
-- D. 權限 grants
-- RLS 是主要安全層；grant 讓 Data API 能執行相應命令。
-- ------------------------------------------------------------
grant select on public.cms_admins to authenticated;

grant select, insert, update, delete
on public.cms_content
to authenticated;

grant select
on public.site_content_public
to anon, authenticated;

grant insert, update, delete
on public.site_content_public
to authenticated;

-- ------------------------------------------------------------
-- E. P1 初始 CMS 資料
-- ------------------------------------------------------------
insert into public.cms_content
(
  content_key,
  page_key,
  label,
  content_type,
  draft_value,
  published_value,
  display_order
)
values
  (
    'p1.question_01_part_01',
    'p1',
    '第一組｜第一句',
    'text',
    '你的生命中，有沒有一個人 ――',
    '你的生命中，有沒有一個人 ――',
    10
  ),
  (
    'p1.question_01_part_02',
    'p1',
    '第一組｜第二句',
    'text',
    '讓你，成就了今天的自己？',
    '讓你，成就了今天的自己？',
    20
  ),
  (
    'p1.question_02_part_01',
    'p1',
    '第二組｜第一句',
    'text',
    '某一段回憶，每當想起 ――',
    '某一段回憶，每當想起 ――',
    30
  ),
  (
    'p1.question_02_part_02',
    'p1',
    '第二組｜第二句',
    'text',
    '都會，默默地露出微笑？',
    '都會，默默地露出微笑？',
    40
  ),
  (
    'p1.question_03_part_01',
    'p1',
    '第三組｜第一句',
    'text',
    '有沒有一份陪伴，即使過了很久 ――',
    '有沒有一份陪伴，即使過了很久 ――',
    50
  ),
  (
    'p1.question_03_part_02',
    'p1',
    '第三組｜第二句',
    'text',
    '依然，溫暖著你？',
    '依然，溫暖著你？',
    60
  )
on conflict (content_key)
do update set
  page_key = excluded.page_key,
  label = excluded.label,
  content_type = excluded.content_type,
  display_order = excluded.display_order;

insert into public.site_content_public
(
  content_key,
  page_key,
  value,
  display_order
)
select
  content_key,
  page_key,
  published_value,
  display_order
from public.cms_content
where page_key = 'p1'
on conflict (content_key)
do update set
  page_key = excluded.page_key,
  value = excluded.value,
  display_order = excluded.display_order;
