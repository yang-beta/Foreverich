-- ============================================================
-- Step 2: 將 Auth User 加入 CMS 管理員
-- ============================================================
--
-- 先到 Supabase Dashboard：
-- Authentication > Users
-- 找到你自己的 User UUID。
--
-- 將下方 REPLACE_WITH_YOUR_AUTH_USER_UUID 換成真正 UUID。
--

insert into public.cms_admins (user_id)
values ('REPLACE_WITH_YOUR_AUTH_USER_UUID'::uuid)
on conflict (user_id) do nothing;

-- 檢查
select * from public.cms_admins;
