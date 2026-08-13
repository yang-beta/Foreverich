-- ============================================================
-- Step 3: 安裝後檢查
-- ============================================================

select
  content_key,
  page_key,
  label,
  draft_value,
  published_value,
  display_order
from public.cms_content
order by display_order;

select
  content_key,
  page_key,
  value,
  display_order
from public.site_content_public
order by display_order;

select * from public.cms_admins;
