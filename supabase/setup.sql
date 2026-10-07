-- =====================================================
-- ATHR STORE — إعداد قاعدة البيانات (يُشغَّل مرة واحدة)
-- الجداول + الصلاحيات + مخزن الصور
-- آمن لإعادة التشغيل: لا يحذف أي بيانات موجودة.
-- =====================================================

create extension if not exists pgcrypto;

-- ---------- المدراء ----------
create table if not exists public.admin_users (
    id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.admin_users where id = auth.uid());
$$;

-- ---------- الأقسام ----------
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    image_url text,
    created_at timestamptz not null default now()
);

-- ---------- المنتجات ----------
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    price numeric(10,3) not null check (price >= 0),
    old_price numeric(10,3) check (old_price is null or old_price >= 0),
    category_id uuid references public.categories(id) on delete set null,
    image_url text,
    is_best_seller boolean not null default false,
    is_new_arrival boolean not null default false,
    is_available boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_created_idx on public.products(created_at desc);

-- ---------- صور وفيديو المنتج ----------
create table if not exists public.product_media (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    media_type text not null check (media_type in ('image', 'video')),
    media_url text not null,
    sort_order int not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists product_media_product_idx on public.product_media(product_id);

-- ---------- إعدادات المتجر (صف واحد) ----------
create table if not exists public.store_settings (
    id int primary key default 1 check (id = 1),
    whatsapp_message text,
    site_content jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.store_settings
    add column if not exists site_content jsonb not null default '{}'::jsonb;

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists store_settings_touch on public.store_settings;
create trigger store_settings_touch
    before update on public.store_settings
    for each row execute function public.touch_updated_at();

-- =====================================================
-- الصلاحيات (Row Level Security)
-- الزوار: قراءة فقط. المدير: إضافة وتعديل وحذف.
-- =====================================================

alter table public.admin_users    enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_media  enable row level security;
alter table public.store_settings enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_media, public.store_settings to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_media to authenticated;
grant update on public.store_settings to authenticated;
grant select on public.admin_users to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admin reads own row" on public.admin_users;
create policy "admin reads own row" on public.admin_users
    for select to authenticated using (id = auth.uid());

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
    for select using (true);

drop policy if exists "admin write categories" on public.categories;
create policy "admin write categories" on public.categories
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products
    for select using (true);

drop policy if exists "admin write products" on public.products;
create policy "admin write products" on public.products
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read product media" on public.product_media;
create policy "public read product media" on public.product_media
    for select using (true);

drop policy if exists "admin write product media" on public.product_media;
create policy "admin write product media" on public.product_media
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read settings" on public.store_settings;
create policy "public read settings" on public.store_settings
    for select using (true);

drop policy if exists "admin update settings" on public.store_settings;
create policy "admin update settings" on public.store_settings
    for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================
-- مخزن الصور (عام للقراءة، الرفع والحذف للمدير فقط)
-- =====================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "athr admin read images" on storage.objects;
create policy "athr admin read images" on storage.objects
    for select to authenticated
    using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "athr admin upload images" on storage.objects;
create policy "athr admin upload images" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "athr admin update images" on storage.objects;
create policy "athr admin update images" on storage.objects
    for update to authenticated
    using (bucket_id = 'product-images' and public.is_admin())
    with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "athr admin delete images" on storage.objects;
create policy "athr admin delete images" on storage.objects
    for delete to authenticated
    using (bucket_id = 'product-images' and public.is_admin());

-- =====================================================
-- المدير: ضع إيميل المالك مكان OWNER_EMAIL@example.com، ويصبح مديرًا تلقائيًا بعد تأكيد الإيميل
-- (حساب يُنشأ من Authentication ← Users ← Add user مع Auto Confirm).
-- =====================================================

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create schema if not exists private;

create or replace function private.grant_store_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if lower(new.email) = 'OWNER_EMAIL@example.com' and new.email_confirmed_at is not null then
        insert into public.admin_users (id) values (new.id) on conflict (id) do nothing;
    end if;
    return new;
end;
$$;

revoke execute on function private.grant_store_admin() from public, anon, authenticated;

drop trigger if exists athr_grant_store_admin on auth.users;
create trigger athr_grant_store_admin
    after insert on auth.users
    for each row execute function private.grant_store_admin();

drop trigger if exists athr_grant_store_admin_on_confirm on auth.users;
create trigger athr_grant_store_admin_on_confirm
    after update of email_confirmed_at on auth.users
    for each row execute function private.grant_store_admin();

insert into public.admin_users (id)
select id from auth.users
where lower(email) = 'OWNER_EMAIL@example.com' and email_confirmed_at is not null
on conflict (id) do nothing;
