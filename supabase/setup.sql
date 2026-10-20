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

-- =====================================================
-- الإصدار 2: المتجر الذكي (حقول المنتجات، إعدادات المتجر، دفتر الطلبيات)
-- =====================================================

alter table public.products
    add column if not exists description text,
    add column if not exists color_id text,
    add column if not exists is_visible boolean not null default true,
    add column if not exists sort_order int not null default 0,
    add column if not exists video_url text;

alter table public.categories add column if not exists sort_order int not null default 0;
alter table public.store_settings add column if not exists config jsonb not null default '{}'::jsonb;

drop policy if exists "visitors see visible products only" on public.products;
create policy "visitors see visible products only" on public.products
    as restrictive for select to anon using (is_visible);
drop policy if exists "signed-in see visible products unless admin" on public.products;
create policy "signed-in see visible products unless admin" on public.products
    as restrictive for select to authenticated using (is_visible or (select public.is_admin()));

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    order_no text not null unique check (order_no ~ '^[A-Z]{1,4}-[0-9A-Z]{3,10}$'),
    created_at timestamptz not null default now(),
    ordered_at timestamptz not null default now(),
    source text not null default 'web' check (source in ('web', 'paste', 'manual')),
    customer_name text check (char_length(customer_name) <= 120),
    phone text check (char_length(phone) <= 30),
    governorate text check (char_length(governorate) <= 60),
    wilaya text check (char_length(wilaya) <= 60),
    address text check (char_length(address) <= 400),
    office text check (char_length(office) <= 120),
    notes text check (char_length(notes) <= 1000),
    delivery_name text check (char_length(delivery_name) <= 120),
    delivery_type text check (delivery_type in ('home', 'office')),
    delivery_price numeric(10,3) not null default 0 check (delivery_price >= 0),
    payment_name text check (char_length(payment_name) <= 120),
    payment_type text check (payment_type in ('cod', 'bank', 'online', 'other')),
    items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 100),
    items_text text check (char_length(items_text) <= 4000),
    subtotal numeric(10,3) not null default 0 check (subtotal >= 0),
    discount numeric(10,3) not null default 0 check (discount >= 0),
    total numeric(10,3) not null default 0 check (total >= 0),
    status text not null default 'new' check (status in ('new', 'delivered')),
    hidden boolean not null default false,
    admin_note text check (char_length(admin_note) <= 2000)
);
create index if not exists orders_ordered_idx on public.orders(ordered_at desc);
alter table public.orders enable row level security;
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;

drop policy if exists "visitors place web orders" on public.orders;
create policy "visitors place web orders" on public.orders
    for insert to anon, authenticated
    with check (
        source = 'web' and status = 'new' and hidden = false and admin_note is null
        and jsonb_array_length(items) between 1 and 100
        and char_length(coalesce(customer_name, '')) between 3 and 120
        and char_length(coalesce(phone, '')) between 8 and 30
    );
drop policy if exists "admin adds orders" on public.orders;
create policy "admin adds orders" on public.orders for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin reads orders" on public.orders;
create policy "admin reads orders" on public.orders for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin updates orders" on public.orders;
create policy "admin updates orders" on public.orders for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin deletes orders" on public.orders;
create policy "admin deletes orders" on public.orders for delete to authenticated using ((select public.is_admin()));

-- =====================================================
-- الإصدار 3: دول الخليج (وزن المنتج لحساب الشحن بالكيلو، ودولة الطلب)
-- =====================================================
alter table public.products
    add column if not exists weight_g int check (weight_g is null or (weight_g between 1 and 50000));
alter table public.orders
    add column if not exists country text not null default 'OM' check (country ~ '^[A-Z]{2}$');

-- =====================================================
-- الإصدار 4: حماية إجمالي الطلبات من التلاعب
-- قبل حفظ طلب من المتجر يُعاد حساب الأسعار والخصم والتوصيل والإجمالي
-- من جدول المنتجات وإعدادات المتجر (نفس منطق ATHR.computeCart و ATHR.shippingFor
-- في js/defaults.js؛ أي تغيير هناك يجب أن يُنقل إلى هنا).
-- طلبات المدير (لصق / يدوي) لا تمر عليه.
-- =====================================================
create schema if not exists private;

-- ما أرسله المتصفح يُحفظ للمقارنة فقط (يظهر لو أحد حاول التلاعب)
alter table public.orders
    add column if not exists client_total numeric(10,3);

create or replace function private.athr_recompute_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg        jsonb;
    max_qty    int;
    def_weight int;
    it         jsonb;
    pid        uuid;
    qty        int;
    p          record;
    clean      jsonb := '[]'::jsonb;
    qtys       jsonb := '{}'::jsonb;   -- product_id -> الكمية
    prices     jsonb := '{}'::jsonb;   -- product_id -> السعر
    remaining  jsonb;
    v_subtotal numeric := 0;
    v_discount numeric := 0;
    v_after    numeric;
    weight_g   numeric := 0;
    b          jsonb;
    pairs      int;
    pct        numeric;
    free_min   numeric;
    free_list  jsonb;
    is_free    boolean;
    m          jsonb;
    pay        jsonb;
    ship       numeric := 0;
    v_label    text;
    v_count    int := 0;
    v_tpct     numeric;
    v_volume   numeric;
begin
    -- المدير يدخل طلبات يدوية وملصوقة بمبالغ يحددها بنفسه
    if public.is_admin() then
        return new;
    end if;

    select coalesce(config, '{}'::jsonb) into cfg from public.store_settings where id = 1;
    max_qty    := coalesce(nullif(cfg #>> '{order,max_qty}', '')::int, 10);
    def_weight := coalesce(nullif(cfg #>> '{order,default_weight_g}', '')::int, 400);

    new.client_total := new.total;

    -- 1) الأصناف: الاسم والسعر من جدول المنتجات، والكمية بين 1 والحد الأعلى
    for it in select v from jsonb_array_elements(new.items) as e(v) loop
        begin
            pid := (it ->> 'id')::uuid;
        exception when others then
            raise exception 'athr: منتج غير صالح في الطلب' using errcode = '22023';
        end;
        qty := least(greatest(coalesce(nullif(it ->> 'qty', '')::numeric, 1)::int, 1), max_qty);

        select pr.id, pr.name, pr.price, pr.color_id, pr.weight_g
          into p
          from public.products pr
         where pr.id = pid and pr.is_visible;
        if not found then
            raise exception 'athr: المنتج غير موجود' using errcode = '22023';
        end if;
        if qtys ? pid::text then
            raise exception 'athr: منتج مكرر في الطلب' using errcode = '22023';
        end if;

        qtys   := qtys   || jsonb_build_object(pid::text, qty);
        prices := prices || jsonb_build_object(pid::text, p.price);
        v_subtotal := v_subtotal + p.price * qty;
        weight_g   := weight_g + coalesce(nullif(p.weight_g, 0), def_weight) * qty;

        clean := clean || jsonb_build_array(jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'color', (select c.v ->> 'name' from jsonb_array_elements(coalesce(cfg -> 'colors', '[]')) as c(v)
                       where c.v ->> 'id' = p.color_id limit 1),
            'label', p.name || coalesce(' (' || (select c.v ->> 'name' from jsonb_array_elements(coalesce(cfg -> 'colors', '[]')) as c(v)
                       where c.v ->> 'id' = p.color_id limit 1) || ')', ''),
            'qty', qty,
            'price', p.price,
            'total', p.price * qty
        ));
    end loop;

    -- 2) خصم الباقات: نفس ترتيب الإعدادات، وكل قطعة تدخل في باقة واحدة فقط
    remaining := qtys;
    for b in select v from jsonb_array_elements(coalesce(cfg #> '{sales,bundles}', '[]')) as e(v) loop
        continue when coalesce((b ->> 'enabled')::boolean, false) is not true
                   or coalesce(b ->> 'a', '') = '' or coalesce(b ->> 'b', '') = ''
                   or b ->> 'a' = b ->> 'b';
        continue when not exists (select 1 from public.products where id::text = b ->> 'a' and is_visible)
                   or not exists (select 1 from public.products where id::text = b ->> 'b' and is_visible);
        pairs := least(coalesce((remaining ->> (b ->> 'a'))::int, 0), coalesce((remaining ->> (b ->> 'b'))::int, 0));
        continue when pairs <= 0;
        pct := least(greatest(coalesce(nullif(b ->> 'pct', '')::numeric, 0), 0), 90);
        v_discount := v_discount + pairs * (prices ->> (b ->> 'b'))::numeric * pct / 100;
        remaining := remaining
            || jsonb_build_object(b ->> 'a', (remaining ->> (b ->> 'a'))::int - pairs)
            || jsonb_build_object(b ->> 'b', (remaining ->> (b ->> 'b'))::int - pairs);
    end loop;
    v_discount := round(v_discount, 3);
    v_label := case when v_discount > 0 then 'خصم الباقة' end;

    -- 2ب) خصم الكمية (قطعتين 5%، 3 فأكثر 10%...): لا يجتمع مع خصم الباقات، ويُطبَّق الأفضل للزبون
    if coalesce((cfg #>> '{sales,volume,enabled}')::boolean, false) then
        select coalesce(sum(value::int), 0) into v_count from jsonb_each_text(qtys);
        select t.tpct into v_tpct
          from (select case when (x.v ->> 'min') ~ '^[0-9]+(\.[0-9]+)?$' then round((x.v ->> 'min')::numeric) end as tmin,
                       case when (x.v ->> 'pct') ~ '^[0-9]+(\.[0-9]+)?$' then (x.v ->> 'pct')::numeric end as tpct
                  from jsonb_array_elements(coalesce(cfg #> '{sales,volume,tiers}', '[]')) as x(v)) t
         where t.tmin is not null and t.tpct is not null
           and t.tmin >= 2 and t.tpct > 0 and t.tpct <= 90 and v_count >= t.tmin
         order by t.tmin desc
         limit 1;
        if v_tpct is not null then
            v_volume := round(v_subtotal * v_tpct / 100, 3);
            if v_volume > v_discount then
                v_discount := v_volume;
                v_label := 'خصم الكمية ' || case when v_tpct = trunc(v_tpct) then trunc(v_tpct)::bigint::text else v_tpct::text end || '%';
            end if;
        end if;
    end if;
    v_after := greatest(0, v_subtotal - v_discount);

    -- 3) طريقة التوصيل: يجب أن تكون مفعّلة ومتاحة لدولة الطلب
    select d.v into m
      from jsonb_array_elements(coalesce(cfg #> '{order,delivery}', '[]')) as d(v)
     where coalesce((d.v ->> 'enabled')::boolean, false)
       and d.v ->> 'name' = new.delivery_name
       and (jsonb_array_length(coalesce(d.v -> 'countries', '[]')) = 0 or d.v -> 'countries' ? new.country)
     limit 1;
    if m is null then
        raise exception 'athr: طريقة التوصيل غير متاحة' using errcode = '22023';
    end if;
    new.delivery_type := case when m ->> 'type' = 'office' then 'office' else 'home' end;

    -- 4) التوصيل المجاني
    free_min  := coalesce(nullif(cfg #>> '{order,free_min}', '')::numeric, 0);
    free_list := coalesce(cfg #> '{order,free_countries}', '[]');
    is_free := coalesce((cfg #>> '{order,free_enabled}')::boolean, false)
               and free_min > 0
               and (jsonb_array_length(free_list) = 0 or free_list ? new.country)
               and v_after >= free_min;

    -- 5) سعر التوصيل: ثابت أو لكل كيلو (يُقرَّب لأعلى، والحد الأدنى كيلو)
    if not is_free then
        if m ->> 'pricing' = 'per_kg' then
            ship := greatest(1, ceil(weight_g / 1000.0)) * coalesce(nullif(m ->> 'price', '')::numeric, 0);
        else
            ship := coalesce(nullif(m ->> 'price', '')::numeric, 0);
        end if;
    end if;

    -- 6) طريقة الدفع: يجب أن تكون مفعّلة ومتاحة لدولة الطلب
    select x.v into pay
      from jsonb_array_elements(coalesce(cfg #> '{order,payments}', '[]')) as x(v)
     where coalesce((x.v ->> 'enabled')::boolean, false)
       and x.v ->> 'name' = new.payment_name
       and (jsonb_array_length(coalesce(x.v -> 'countries', '[]')) = 0 or x.v -> 'countries' ? new.country)
     limit 1;
    if pay is null then
        raise exception 'athr: طريقة الدفع غير متاحة' using errcode = '22023';
    end if;
    new.payment_type := case when pay ->> 'type' in ('cod', 'bank', 'online', 'other') then pay ->> 'type' else 'other' end;

    -- 7) المبالغ النهائية من الخادم تحل محل ما أرسله المتصفح
    new.items          := clean;
    new.subtotal       := round(v_subtotal, 3);
    new.discount       := v_discount;
    new.discount_label := v_label;
    new.delivery_price := round(ship, 3);
    new.total          := round(v_after + ship, 3);
    new.ordered_at     := now();
    return new;
end;
$$;

revoke execute on function private.athr_recompute_order() from public, anon, authenticated;

drop trigger if exists athr_recompute_order on public.orders;
create trigger athr_recompute_order
    before insert on public.orders
    for each row execute function private.athr_recompute_order();

-- =====================================================
-- الإصدار 5: صفحة لكل منتج في جوجل، تقييمات العملاء، وقياس المبيعات
-- =====================================================

-- رابط ثابت لكل منتج (صفحة /p/<slug>/) وصورة مصغّرة اختيارية
alter table public.products
    add column if not exists slug text,
    add column if not exists thumb_url text;
create unique index if not exists products_slug_key on public.products (slug) where slug is not null;

-- وصف القسم (يظهر في صفحته وفي جوجل)
alter table public.categories
    add column if not exists description text check (description is null or char_length(description) <= 600);

-- مصدر الزيارة، الهدية، واسم الخصم في كل طلب
alter table public.orders
    add column if not exists channel text check (channel is null or channel ~ '^[a-z_]{1,20}$'),
    add column if not exists gift boolean not null default false,
    add column if not exists gift_message text check (gift_message is null or char_length(gift_message) <= 300),
    add column if not exists discount_label text check (discount_label is null or char_length(discount_label) <= 80);

-- تقييمات العملاء: تظهر في المتجر بعد موافقتك فقط
create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    product_id uuid references public.products(id) on delete set null,
    order_no text check (order_no is null or order_no ~ '^[A-Z]{1,4}-[0-9A-Z]{3,10}$'),
    name text not null check (char_length(name) between 2 and 60),
    rating int not null check (rating between 1 and 5),
    text text not null check (char_length(text) between 3 and 1000),
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);
create index if not exists reviews_product_idx on public.reviews (product_id);
alter table public.reviews enable row level security;
grant select, insert on public.reviews to anon, authenticated;
grant update, delete on public.reviews to authenticated;

drop policy if exists "visitors read approved reviews" on public.reviews;
create policy "visitors read approved reviews" on public.reviews
    for select to anon, authenticated using (status = 'approved' or (select public.is_admin()));
drop policy if exists "visitors send reviews for approval" on public.reviews;
create policy "visitors send reviews for approval" on public.reviews
    for insert to anon, authenticated with check (status = 'pending');
drop policy if exists "admin updates reviews" on public.reviews;
create policy "admin updates reviews" on public.reviews
    for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin deletes reviews" on public.reviews;
create policy "admin deletes reviews" on public.reviews
    for delete to authenticated using ((select public.is_admin()));

-- عدّادات رحلة الزبون (زيارة، مشاهدة منتج، إضافة للسلة، إتمام، طلب) بدون أي بيانات شخصية
create table if not exists public.stats_daily (
    day date not null,
    key text not null,
    n int not null default 0,
    primary key (day, key)
);
alter table public.stats_daily enable row level security;
grant select on public.stats_daily to authenticated;
drop policy if exists "admin reads stats" on public.stats_daily;
create policy "admin reads stats" on public.stats_daily
    for select to authenticated using ((select public.is_admin()));

create or replace function public.track(k text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if k is null or k !~ '^(visit|view|add|checkout|order)(:(direct|google|instagram|tiktok|whatsapp|snapchat|facebook|x|offer|app|other))?$' then
        return;
    end if;
    insert into public.stats_daily (day, key, n)
    values ((now() at time zone 'Asia/Muscat')::date, k, 1)
    on conflict (day, key) do update set n = public.stats_daily.n + 1;
end;
$$;
revoke execute on function public.track(text) from public;
grant execute on function public.track(text) to anon, authenticated;

-- =====================================================
-- الإصدار 6: المتجر بالعربي والإنجليزي (أسماء وأوصاف بالإنجليزي)
-- =====================================================
alter table public.products
    add column if not exists name_en text check (name_en is null or char_length(name_en) <= 160),
    add column if not exists description_en text check (description_en is null or char_length(description_en) <= 2000);

alter table public.categories
    add column if not exists name_en text check (name_en is null or char_length(name_en) <= 120),
    add column if not exists description_en text check (description_en is null or char_length(description_en) <= 600);

-- =====================================================
-- الإصدار 7: الهدية لشخص آخر، وتصميم الصور بالذكاء الاصطناعي
-- =====================================================

-- طلب هدية: اسم ورقم المُهدى إليه، وهل نخفي السعر عنه
alter table public.orders
    add column if not exists gift_name text check (gift_name is null or char_length(gift_name) <= 120),
    add column if not exists gift_phone text check (gift_phone is null or char_length(gift_phone) <= 30),
    add column if not exists gift_hide_price boolean not null default false;

-- مفاتيح خدمات الذكاء الاصطناعي: جدول خاص لا يصل له الزوار ولا المتصفح
create table if not exists private.app_secrets (
    name text primary key check (name ~ '^[a-z_]{2,40}$'),
    value text not null check (char_length(value) between 8 and 400),
    updated_at timestamptz not null default now()
);
alter table private.app_secrets enable row level security;
revoke all on private.app_secrets from public, anon, authenticated;

-- المدير يحفظ المفتاح أو يحذفه، ولا يستطيع قراءته بعد الحفظ
create or replace function public.set_ai_key(provider text, key text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
    if not public.is_admin() then
        raise exception 'not allowed' using errcode = '42501';
    end if;
    if provider is null or provider not in ('gemini', 'openai') then
        raise exception 'unknown provider' using errcode = '22023';
    end if;
    if key is null or btrim(key) = '' then
        delete from private.app_secrets where name = provider || '_key';
        return;
    end if;
    if char_length(btrim(key)) not between 20 and 300 or btrim(key) ~ '\s' then
        raise exception 'invalid key' using errcode = '22023';
    end if;
    insert into private.app_secrets (name, value) values (provider || '_key', btrim(key))
    on conflict (name) do update set value = excluded.value, updated_at = now();
end;
$$;
revoke execute on function public.set_ai_key(text, text) from public, anon;
grant execute on function public.set_ai_key(text, text) to authenticated;

-- حالة المفاتيح بدون كشفها (آخر 4 أحرف فقط)
create or replace function public.ai_key_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
    out jsonb := '{}'::jsonb;
    r record;
begin
    if not public.is_admin() then
        raise exception 'not allowed' using errcode = '42501';
    end if;
    for r in select name, value, updated_at from private.app_secrets where name in ('gemini_key', 'openai_key') loop
        out := out || jsonb_build_object(replace(r.name, '_key', ''), jsonb_build_object('last4', right(r.value, 4), 'updated_at', r.updated_at));
    end loop;
    return out;
end;
$$;
revoke execute on function public.ai_key_status() from public, anon;
grant execute on function public.ai_key_status() to authenticated;

-- قراءة المفتاح: لدالة السيرفر ai-image فقط (بالمفتاح السري)، ولا يصل للمتصفح أبداً
create or replace function public.ai_secret(p text)
returns text
language sql
stable
security definer
set search_path = public, private
as $$
    select value from private.app_secrets where name = p || '_key' and p in ('gemini', 'openai');
$$;
revoke execute on function public.ai_secret(text) from public, anon, authenticated;
grant execute on function public.ai_secret(text) to service_role;

-- دالة السيرفر: supabase/functions/ai-image (تُنشر بدون verify_jwt لأنها تتحقق من المدير بنفسها)

-- =====================================================
-- الإصدار 8: مناسبة الهدية (لبطاقة الإهداء الرقمية)
-- =====================================================
alter table public.orders
    add column if not exists gift_occasion text check (gift_occasion is null or gift_occasion ~ '^[a-z_]{2,20}$');

-- =====================================================
-- الإصدار 9: العملاء (لإرسال العروض) — يُحفظ كل زبون تلقائياً مع طلبه
-- =====================================================
alter table public.orders
    add column if not exists marketing_ok boolean not null default true;

create table if not exists public.customers (
    phone text primary key check (phone ~ '^[0-9]{8,15}$'),
    name text check (name is null or char_length(name) <= 120),
    country text not null default 'OM' check (country ~ '^[A-Z]{2}$'),
    marketing boolean not null default true,
    orders_count int not null default 0,
    total_spent numeric(12,3) not null default 0,
    first_order_at timestamptz,
    last_order_at timestamptz,
    last_offer_at timestamptz,
    note text check (note is null or char_length(note) <= 500),
    created_at timestamptz not null default now()
);
alter table public.customers enable row level security;
revoke all on public.customers from anon;
grant select, update, delete on public.customers to authenticated;
drop policy if exists "admin reads customers" on public.customers;
create policy "admin reads customers" on public.customers for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin updates customers" on public.customers;
create policy "admin updates customers" on public.customers for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin deletes customers" on public.customers;
create policy "admin deletes customers" on public.customers for delete to authenticated using ((select public.is_admin()));

create or replace function private.athr_phone_intl(p text, c text)
returns text
language sql
immutable
as $$
    select case
        when p is null or regexp_replace(p, '\D', '', 'g') = '' then null
        when coalesce(c, 'OM') = 'OM' and regexp_replace(p, '\D', '', 'g') ~ '^[0-9]{8}$' then '968' || regexp_replace(p, '\D', '', 'g')
        else regexp_replace(p, '\D', '', 'g')
    end
$$;

create or replace function private.athr_track_customer()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
    ph text := private.athr_phone_intl(new.phone, new.country);
begin
    if ph is null or ph !~ '^[0-9]{8,15}$' then
        return new;
    end if;
    insert into public.customers as c (phone, name, country, marketing, orders_count, total_spent, first_order_at, last_order_at)
    values (ph, nullif(btrim(coalesce(new.customer_name, '')), ''), coalesce(new.country, 'OM'), coalesce(new.marketing_ok, true), 1, coalesce(new.total, 0), new.ordered_at, new.ordered_at)
    on conflict (phone) do update set
        name = coalesce(excluded.name, c.name),
        country = excluded.country,
        marketing = case when new.source = 'web' then excluded.marketing else c.marketing end,
        orders_count = c.orders_count + 1,
        total_spent = c.total_spent + excluded.total_spent,
        first_order_at = least(c.first_order_at, excluded.first_order_at),
        last_order_at = greatest(c.last_order_at, excluded.last_order_at);
    return new;
end;
$$;
revoke execute on function private.athr_track_customer() from public, anon, authenticated;

drop trigger if exists athr_track_customer on public.orders;
create trigger athr_track_customer
    after insert on public.orders
    for each row execute function private.athr_track_customer();

-- =====================================================
-- الإصدار 10: إلغاء تصميم الصور بالذكاء الاصطناعي
-- =====================================================
-- الميزة أُلغيت: لا أحد يستطيع حفظ مفتاح أو قراءة حالته، ودالة ai-image صارت متوقفة (410)
revoke execute on function public.set_ai_key(text, text) from public, anon, authenticated;
revoke execute on function public.ai_key_status() from public, anon, authenticated;

-- =====================================================
-- الإصدار 11: الهدية لولد أو لبنت (يحدد ألوان بطاقة الإهداء)
-- =====================================================
alter table public.orders
    add column if not exists gift_for text check (gift_for is null or gift_for in ('boy', 'girl'));

-- =====================================================
-- الإصدار 12: العروض الخاصة عبر واتساب (?ref=offer) تُحسب كمصدر مستقل
-- =====================================================
create or replace function public.track(k text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if k is null or k !~ '^(visit|view|add|checkout|order)(:(direct|google|instagram|tiktok|whatsapp|snapchat|facebook|x|offer|other))?$' then
        return;
    end if;
    insert into public.stats_daily (day, key, n)
    values ((now() at time zone 'Asia/Muscat')::date, k, 1)
    on conflict (day, key) do update set n = public.stats_daily.n + 1;
end;
$$;
revoke execute on function public.track(text) from public;
grant execute on function public.track(text) to anon, authenticated;

-- =====================================================
-- الإصدار 13: أكواد الخصم للمؤثرين، المفضلة، و«أخبرني عند التوفر»
-- =====================================================

-- 1) أكواد الخصم: لا يقرأها الزوار مباشرة، فقط عبر دالة التحقق
create table if not exists public.coupons (
    code text primary key check (code ~ '^[A-Z0-9_-]{3,20}$'),
    owner text check (owner is null or char_length(owner) <= 80),
    kind text not null default 'pct' check (kind in ('pct', 'fixed', 'ship')),
    value numeric(10,3) not null default 0 check (value >= 0 and (kind <> 'pct' or value <= 90)),
    min_total numeric(10,3) not null default 0 check (min_total >= 0),
    ends_at timestamptz,
    max_uses int check (max_uses is null or max_uses > 0),
    enabled boolean not null default true,
    created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
revoke all on public.coupons from anon;
grant select, insert, update, delete on public.coupons to authenticated;
create policy "admin manages coupons" on public.coupons
    for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.orders
    add column if not exists coupon text check (coupon is null or coupon ~ '^[A-Z0-9_-]{3,20}$'),
    add column if not exists coupon_discount numeric(10,3) not null default 0 check (coupon_discount >= 0);
create index if not exists orders_coupon_idx on public.orders(coupon) where coupon is not null;

-- الكود الصالح الآن (مفعّل، غير منتهي، ولم يتجاوز حد الاستخدام)
create or replace function private.athr_coupon(c text)
returns public.coupons
language sql
stable
security definer
set search_path = public
as $$
    select k.* from public.coupons k
     where k.code = upper(trim(coalesce(c, '')))
       and k.enabled
       and (k.ends_at is null or k.ends_at > now())
       and (k.max_uses is null or (select count(*) from public.orders o where o.coupon = k.code and not o.hidden) < k.max_uses)
     limit 1;
$$;
revoke execute on function private.athr_coupon(text) from public, anon, authenticated;

-- للزائر: هل الكود صالح؟ (يرجع النوع والقيمة والحد الأدنى فقط)
create or replace function public.check_coupon(c text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    k public.coupons;
begin
    if c is null or upper(trim(c)) !~ '^[A-Z0-9_-]{3,20}$' then
        return null;
    end if;
    k := private.athr_coupon(c);
    if k.code is null then
        return null;
    end if;
    return jsonb_build_object('code', k.code, 'kind', k.kind, 'value', k.value, 'min_total', k.min_total);
end;
$$;
revoke execute on function public.check_coupon(text) from public;
grant execute on function public.check_coupon(text) to anon, authenticated;

-- 2) المفضلة: عدّاد لكل منتج فقط (بدون أي بيانات عن الزائر)
create table if not exists public.product_stats (
    product_id uuid primary key references public.products(id) on delete cascade,
    favs int not null default 0 check (favs >= 0)
);
alter table public.product_stats enable row level security;
revoke all on public.product_stats from anon;
grant select on public.product_stats to authenticated;
create policy "admin reads product stats" on public.product_stats
    for select to authenticated using ((select public.is_admin()));

create or replace function public.fav(p uuid, d int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if d is null or d not in (1, -1) or not exists (select 1 from public.products where id = p and is_visible) then
        return;
    end if;
    insert into public.product_stats (product_id, favs) values (p, greatest(d, 0))
    on conflict (product_id) do update set favs = greatest(0, public.product_stats.favs + d);
end;
$$;
revoke execute on function public.fav(uuid, int) from public;
grant execute on function public.fav(uuid, int) to anon, authenticated;

-- 3) «أخبرني عند التوفر»: الاسم والرقم لكل منتج نافد
create table if not exists public.restock_requests (
    product_id uuid not null references public.products(id) on delete cascade,
    phone text not null check (phone ~ '^[0-9]{8,15}$'),
    name text check (name is null or char_length(name) <= 80),
    country text not null default 'OM' check (country ~ '^[A-Z]{2}$'),
    created_at timestamptz not null default now(),
    notified_at timestamptz,
    primary key (product_id, phone)
);
alter table public.restock_requests enable row level security;
revoke all on public.restock_requests from anon;
grant select, update, delete on public.restock_requests to authenticated;
create policy "admin reads restock" on public.restock_requests
    for select to authenticated using ((select public.is_admin()));
create policy "admin updates restock" on public.restock_requests
    for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes restock" on public.restock_requests
    for delete to authenticated using ((select public.is_admin()));

create or replace function public.request_restock(p uuid, n text, ph text, c text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    digits text := regexp_replace(coalesce(ph, ''), '[^0-9]', '', 'g');
begin
    if not exists (select 1 from public.products where id = p and is_visible) then
        raise exception 'athr: المنتج غير موجود' using errcode = '22023';
    end if;
    if digits !~ '^[0-9]{8,15}$' then
        raise exception 'athr: رقم غير صالح' using errcode = '22023';
    end if;
    insert into public.restock_requests (product_id, phone, name, country)
    values (p, digits, nullif(left(trim(coalesce(n, '')), 80), ''), case when coalesce(c, '') ~ '^[A-Z]{2}$' then c else 'OM' end)
    on conflict (product_id, phone) do update
        set name = coalesce(excluded.name, public.restock_requests.name), created_at = now(), notified_at = null;
end;
$$;
revoke execute on function public.request_restock(uuid, text, text, text) from public;
grant execute on function public.request_restock(uuid, text, text, text) to anon, authenticated;

-- حساب الطلب على الخادم مع كود الخصم (يحل محل نسخة الإصدار 4)
create or replace function private.athr_recompute_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg        jsonb;
    max_qty    int;
    def_weight int;
    it         jsonb;
    pid        uuid;
    qty        int;
    p          record;
    clean      jsonb := '[]'::jsonb;
    qtys       jsonb := '{}'::jsonb;   -- product_id -> الكمية
    prices     jsonb := '{}'::jsonb;   -- product_id -> السعر
    remaining  jsonb;
    v_subtotal numeric := 0;
    v_discount numeric := 0;
    v_after    numeric;
    weight_g   numeric := 0;
    b          jsonb;
    pairs      int;
    pct        numeric;
    free_min   numeric;
    free_list  jsonb;
    is_free    boolean;
    m          jsonb;
    pay        jsonb;
    ship       numeric := 0;
    v_label    text;
    v_count    int := 0;
    v_tpct     numeric;
    v_volume   numeric;
    k          public.coupons;
    v_coupon   numeric := 0;
begin
    -- المدير يدخل طلبات يدوية وملصوقة بمبالغ يحددها بنفسه
    if public.is_admin() then
        return new;
    end if;

    select coalesce(config, '{}'::jsonb) into cfg from public.store_settings where id = 1;
    max_qty    := coalesce(nullif(cfg #>> '{order,max_qty}', '')::int, 10);
    def_weight := coalesce(nullif(cfg #>> '{order,default_weight_g}', '')::int, 400);

    new.client_total := new.total;

    -- 1) الأصناف: الاسم والسعر من جدول المنتجات، والكمية بين 1 والحد الأعلى
    for it in select v from jsonb_array_elements(new.items) as e(v) loop
        begin
            pid := (it ->> 'id')::uuid;
        exception when others then
            raise exception 'athr: منتج غير صالح في الطلب' using errcode = '22023';
        end;
        qty := least(greatest(coalesce(nullif(it ->> 'qty', '')::numeric, 1)::int, 1), max_qty);

        select pr.id, pr.name, pr.price, pr.color_id, pr.weight_g
          into p
          from public.products pr
         where pr.id = pid and pr.is_visible;
        if not found then
            raise exception 'athr: المنتج غير موجود' using errcode = '22023';
        end if;
        if qtys ? pid::text then
            raise exception 'athr: منتج مكرر في الطلب' using errcode = '22023';
        end if;

        qtys   := qtys   || jsonb_build_object(pid::text, qty);
        prices := prices || jsonb_build_object(pid::text, p.price);
        v_subtotal := v_subtotal + p.price * qty;
        weight_g   := weight_g + coalesce(nullif(p.weight_g, 0), def_weight) * qty;

        clean := clean || jsonb_build_array(jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'color', (select c.v ->> 'name' from jsonb_array_elements(coalesce(cfg -> 'colors', '[]')) as c(v)
                       where c.v ->> 'id' = p.color_id limit 1),
            'label', p.name || coalesce(' (' || (select c.v ->> 'name' from jsonb_array_elements(coalesce(cfg -> 'colors', '[]')) as c(v)
                       where c.v ->> 'id' = p.color_id limit 1) || ')', ''),
            'qty', qty,
            'price', p.price,
            'total', p.price * qty
        ));
    end loop;

    -- 2) خصم الباقات: نفس ترتيب الإعدادات، وكل قطعة تدخل في باقة واحدة فقط
    remaining := qtys;
    for b in select v from jsonb_array_elements(coalesce(cfg #> '{sales,bundles}', '[]')) as e(v) loop
        continue when coalesce((b ->> 'enabled')::boolean, false) is not true
                   or coalesce(b ->> 'a', '') = '' or coalesce(b ->> 'b', '') = ''
                   or b ->> 'a' = b ->> 'b';
        continue when not exists (select 1 from public.products where id::text = b ->> 'a' and is_visible)
                   or not exists (select 1 from public.products where id::text = b ->> 'b' and is_visible);
        pairs := least(coalesce((remaining ->> (b ->> 'a'))::int, 0), coalesce((remaining ->> (b ->> 'b'))::int, 0));
        continue when pairs <= 0;
        pct := least(greatest(coalesce(nullif(b ->> 'pct', '')::numeric, 0), 0), 90);
        v_discount := v_discount + pairs * (prices ->> (b ->> 'b'))::numeric * pct / 100;
        remaining := remaining
            || jsonb_build_object(b ->> 'a', (remaining ->> (b ->> 'a'))::int - pairs)
            || jsonb_build_object(b ->> 'b', (remaining ->> (b ->> 'b'))::int - pairs);
    end loop;
    v_discount := round(v_discount, 3);
    v_label := case when v_discount > 0 then 'خصم الباقة' end;

    -- 2ب) خصم الكمية (قطعتين 5%، 3 فأكثر 10%...): لا يجتمع مع خصم الباقات، ويُطبَّق الأفضل للزبون
    if coalesce((cfg #>> '{sales,volume,enabled}')::boolean, false) then
        select coalesce(sum(value::int), 0) into v_count from jsonb_each_text(qtys);
        select t.tpct into v_tpct
          from (select case when (x.v ->> 'min') ~ '^[0-9]+(\.[0-9]+)?$' then round((x.v ->> 'min')::numeric) end as tmin,
                       case when (x.v ->> 'pct') ~ '^[0-9]+(\.[0-9]+)?$' then (x.v ->> 'pct')::numeric end as tpct
                  from jsonb_array_elements(coalesce(cfg #> '{sales,volume,tiers}', '[]')) as x(v)) t
         where t.tmin is not null and t.tpct is not null
           and t.tmin >= 2 and t.tpct > 0 and t.tpct <= 90 and v_count >= t.tmin
         order by t.tmin desc
         limit 1;
        if v_tpct is not null then
            v_volume := round(v_subtotal * v_tpct / 100, 3);
            if v_volume > v_discount then
                v_discount := v_volume;
                v_label := 'خصم الكمية ' || case when v_tpct = trunc(v_tpct) then trunc(v_tpct)::bigint::text else v_tpct::text end || '%';
            end if;
        end if;
    end if;
    v_after := greatest(0, v_subtotal - v_discount);

    -- 3) طريقة التوصيل: يجب أن تكون مفعّلة ومتاحة لدولة الطلب
    select d.v into m
      from jsonb_array_elements(coalesce(cfg #> '{order,delivery}', '[]')) as d(v)
     where coalesce((d.v ->> 'enabled')::boolean, false)
       and d.v ->> 'name' = new.delivery_name
       and (jsonb_array_length(coalesce(d.v -> 'countries', '[]')) = 0 or d.v -> 'countries' ? new.country)
     limit 1;
    if m is null then
        raise exception 'athr: طريقة التوصيل غير متاحة' using errcode = '22023';
    end if;
    new.delivery_type := case when m ->> 'type' = 'office' then 'office' else 'home' end;

    -- 4) التوصيل المجاني
    free_min  := coalesce(nullif(cfg #>> '{order,free_min}', '')::numeric, 0);
    free_list := coalesce(cfg #> '{order,free_countries}', '[]');
    is_free := coalesce((cfg #>> '{order,free_enabled}')::boolean, false)
               and free_min > 0
               and (jsonb_array_length(free_list) = 0 or free_list ? new.country)
               and v_after >= free_min;

    -- 5) سعر التوصيل: ثابت أو لكل كيلو (يُقرَّب لأعلى، والحد الأدنى كيلو)
    if not is_free then
        if m ->> 'pricing' = 'per_kg' then
            ship := greatest(1, ceil(weight_g / 1000.0)) * coalesce(nullif(m ->> 'price', '')::numeric, 0);
        else
            ship := coalesce(nullif(m ->> 'price', '')::numeric, 0);
        end if;
    end if;

    -- 6) طريقة الدفع: يجب أن تكون مفعّلة ومتاحة لدولة الطلب
    select x.v into pay
      from jsonb_array_elements(coalesce(cfg #> '{order,payments}', '[]')) as x(v)
     where coalesce((x.v ->> 'enabled')::boolean, false)
       and x.v ->> 'name' = new.payment_name
       and (jsonb_array_length(coalesce(x.v -> 'countries', '[]')) = 0 or x.v -> 'countries' ? new.country)
     limit 1;
    if pay is null then
        raise exception 'athr: طريقة الدفع غير متاحة' using errcode = '22023';
    end if;
    new.payment_type := case when pay ->> 'type' in ('cod', 'bank', 'online', 'other') then pay ->> 'type' else 'other' end;

    -- 7) كود الخصم (للمؤثرين): يُحسب بعد خصومات المتجر. الكود غير الصالح يُحذف
    if new.coupon is not null then
        k := private.athr_coupon(new.coupon);
        if k.code is null then
            new.coupon := null;
        else
            new.coupon := k.code;
            if v_after >= k.min_total then
                if k.kind = 'pct' then
                    v_coupon := round(v_after * least(k.value, 90) / 100, 3);
                elsif k.kind = 'fixed' then
                    v_coupon := least(k.value, v_after);
                elsif k.kind = 'ship' then
                    ship := 0;
                end if;
            end if;
        end if;
    end if;

    -- 8) المبالغ النهائية من الخادم تحل محل ما أرسله المتصفح
    new.items           := clean;
    new.subtotal        := round(v_subtotal, 3);
    new.discount        := v_discount;
    new.discount_label  := v_label;
    new.coupon_discount := v_coupon;
    new.delivery_price  := round(ship, 3);
    new.total           := round(v_after - v_coupon + ship, 3);
    new.ordered_at     := now();
    return new;
end;
$$;


-- =====================================================
-- الإصدار 14: المخزون بالكميات، نقاط الولاء، أكواد مربوطة برقم العميل، والذكاء الاصطناعي للنصوص
-- =====================================================

-- 1) المخزون: كمية لكل منتج (فارغ = بدون حد). تنقص تلقائياً مع كل طلب
alter table public.products
    add column if not exists stock int check (stock is null or stock >= 0);

-- 2) كود مربوط برقم عميل واحد (مكافآت نقاط الولاء)
alter table public.coupons
    add column if not exists phone text check (phone is null or phone ~ '^[0-9]{8,15}$');

-- 3) النقاط التي استبدلها كل عميل (النقاط المكتسبة تُحسب من طلباته المسلّمة)
alter table public.customers
    add column if not exists points_used int not null default 0 check (points_used >= 0);

-- للزائر: هل الكود صالح؟ (بدون كشف رقم صاحب الكود)
create or replace function public.check_coupon(c text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    k public.coupons;
begin
    if c is null or upper(trim(c)) !~ '^[A-Z0-9_-]{3,20}$' then
        return null;
    end if;
    k := private.athr_coupon(c);
    if k.code is null then
        return null;
    end if;
    return jsonb_build_object('code', k.code, 'kind', k.kind, 'value', k.value, 'min_total', k.min_total, 'phone_bound', k.phone is not null);
end;
$$;
revoke execute on function public.check_coupon(text) from public;
grant execute on function public.check_coupon(text) to anon, authenticated;

-- 4) الذكاء الاصطناعي لكتابة النصوص: المدير يحفظ المفتاح (ولا يقرأه)، ودالة الخادم ai-text فقط تقرأه
create or replace function public.ai_key_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
    out jsonb := '{}'::jsonb;
    r record;
begin
    if not public.is_admin() then
        raise exception 'not allowed' using errcode = '42501';
    end if;
    for r in select name, value, updated_at from private.app_secrets
              where name in ('gemini_key', 'openai_key') and value not like 'removed-%' loop
        out := out || jsonb_build_object(replace(r.name, '_key', ''), jsonb_build_object('last4', right(r.value, 4), 'updated_at', r.updated_at));
    end loop;
    return out;
end;
$$;
revoke execute on function public.ai_key_status() from public, anon;
grant execute on function public.ai_key_status() to authenticated;
revoke execute on function public.set_ai_key(text, text) from public, anon;
grant execute on function public.set_ai_key(text, text) to authenticated;

create or replace function public.ai_secret(p text)
returns text
language sql
stable
security definer
set search_path = public, private
as $$
    select value from private.app_secrets
     where name = p || '_key' and p in ('gemini', 'openai') and value not like 'removed-%';
$$;
revoke execute on function public.ai_secret(text) from public, anon, authenticated;
grant execute on function public.ai_secret(text) to service_role;

-- 5) إعادة حساب الطلب في الخادم: + المخزون + كود العميل
create or replace function private.athr_recompute_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg        jsonb;
    max_qty    int;
    def_weight int;
    it         jsonb;
    pid        uuid;
    qty        int;
    p          record;
    clean      jsonb := '[]'::jsonb;
    qtys       jsonb := '{}'::jsonb;   -- product_id -> الكمية
    prices     jsonb := '{}'::jsonb;   -- product_id -> السعر
    remaining  jsonb;
    v_subtotal numeric := 0;
    v_discount numeric := 0;
    v_after    numeric;
    weight_g   numeric := 0;
    b          jsonb;
    pairs      int;
    pct        numeric;
    free_min   numeric;
    free_list  jsonb;
    is_free    boolean;
    m          jsonb;
    pay        jsonb;
    ship       numeric := 0;
    v_label    text;
    v_count    int := 0;
    v_tpct     numeric;
    v_volume   numeric;
    k          public.coupons;
    v_coupon   numeric := 0;
    sk         record;
begin
    -- المدير يدخل طلبات يدوية وملصوقة بمبالغ يحددها بنفسه
    if public.is_admin() then
        return new;
    end if;

    select coalesce(config, '{}'::jsonb) into cfg from public.store_settings where id = 1;
    max_qty    := coalesce(nullif(cfg #>> '{order,max_qty}', '')::int, 10);
    def_weight := coalesce(nullif(cfg #>> '{order,default_weight_g}', '')::int, 400);

    new.client_total := new.total;

    -- 1) الأصناف: الاسم والسعر من جدول المنتجات، والكمية بين 1 والحد الأعلى
    for it in select v from jsonb_array_elements(new.items) as e(v) loop
        begin
            pid := (it ->> 'id')::uuid;
        exception when others then
            raise exception 'athr: منتج غير صالح في الطلب' using errcode = '22023';
        end;
        qty := least(greatest(coalesce(nullif(it ->> 'qty', '')::numeric, 1)::int, 1), max_qty);

        select pr.id, pr.name, pr.price, pr.color_id, pr.weight_g, pr.stock, pr.is_available
          into p
          from public.products pr
         where pr.id = pid and pr.is_visible
           for update;
        if not found then
            raise exception 'athr: المنتج غير موجود' using errcode = '22023';
        end if;
        -- المخزون: لا يُطلب منتج نافد، ولا أكثر من الكمية المتوفرة
        if p.is_available is not true or (p.stock is not null and p.stock <= 0) then
            raise exception 'athr: stock|%|0', p.name using errcode = '22023';
        end if;
        if p.stock is not null and qty > p.stock then
            raise exception 'athr: stock|%|%', p.name, p.stock using errcode = '22023';
        end if;
        if qtys ? pid::text then
            raise exception 'athr: منتج مكرر في الطلب' using errcode = '22023';
        end if;

        qtys   := qtys   || jsonb_build_object(pid::text, qty);
        prices := prices || jsonb_build_object(pid::text, p.price);
        v_subtotal := v_subtotal + p.price * qty;
        weight_g   := weight_g + coalesce(nullif(p.weight_g, 0), def_weight) * qty;

        clean := clean || jsonb_build_array(jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'color', (select c.v ->> 'name' from jsonb_array_elements(coalesce(cfg -> 'colors', '[]')) as c(v)
                       where c.v ->> 'id' = p.color_id limit 1),
            'label', p.name || coalesce(' (' || (select c.v ->> 'name' from jsonb_array_elements(coalesce(cfg -> 'colors', '[]')) as c(v)
                       where c.v ->> 'id' = p.color_id limit 1) || ')', ''),
            'qty', qty,
            'price', p.price,
            'total', p.price * qty
        ));
    end loop;

    -- 2) خصم الباقات: نفس ترتيب الإعدادات، وكل قطعة تدخل في باقة واحدة فقط
    remaining := qtys;
    for b in select v from jsonb_array_elements(coalesce(cfg #> '{sales,bundles}', '[]')) as e(v) loop
        continue when coalesce((b ->> 'enabled')::boolean, false) is not true
                   or coalesce(b ->> 'a', '') = '' or coalesce(b ->> 'b', '') = ''
                   or b ->> 'a' = b ->> 'b';
        continue when not exists (select 1 from public.products where id::text = b ->> 'a' and is_visible)
                   or not exists (select 1 from public.products where id::text = b ->> 'b' and is_visible);
        pairs := least(coalesce((remaining ->> (b ->> 'a'))::int, 0), coalesce((remaining ->> (b ->> 'b'))::int, 0));
        continue when pairs <= 0;
        pct := least(greatest(coalesce(nullif(b ->> 'pct', '')::numeric, 0), 0), 90);
        v_discount := v_discount + pairs * (prices ->> (b ->> 'b'))::numeric * pct / 100;
        remaining := remaining
            || jsonb_build_object(b ->> 'a', (remaining ->> (b ->> 'a'))::int - pairs)
            || jsonb_build_object(b ->> 'b', (remaining ->> (b ->> 'b'))::int - pairs);
    end loop;
    v_discount := round(v_discount, 3);
    v_label := case when v_discount > 0 then 'خصم الباقة' end;

    -- 2ب) خصم الكمية (قطعتين 5%، 3 فأكثر 10%...): لا يجتمع مع خصم الباقات، ويُطبَّق الأفضل للزبون
    if coalesce((cfg #>> '{sales,volume,enabled}')::boolean, false) then
        select coalesce(sum(value::int), 0) into v_count from jsonb_each_text(qtys);
        select t.tpct into v_tpct
          from (select case when (x.v ->> 'min') ~ '^[0-9]+(\.[0-9]+)?$' then round((x.v ->> 'min')::numeric) end as tmin,
                       case when (x.v ->> 'pct') ~ '^[0-9]+(\.[0-9]+)?$' then (x.v ->> 'pct')::numeric end as tpct
                  from jsonb_array_elements(coalesce(cfg #> '{sales,volume,tiers}', '[]')) as x(v)) t
         where t.tmin is not null and t.tpct is not null
           and t.tmin >= 2 and t.tpct > 0 and t.tpct <= 90 and v_count >= t.tmin
         order by t.tmin desc
         limit 1;
        if v_tpct is not null then
            v_volume := round(v_subtotal * v_tpct / 100, 3);
            if v_volume > v_discount then
                v_discount := v_volume;
                v_label := 'خصم الكمية ' || case when v_tpct = trunc(v_tpct) then trunc(v_tpct)::bigint::text else v_tpct::text end || '%';
            end if;
        end if;
    end if;
    v_after := greatest(0, v_subtotal - v_discount);

    -- 3) طريقة التوصيل: يجب أن تكون مفعّلة ومتاحة لدولة الطلب
    select d.v into m
      from jsonb_array_elements(coalesce(cfg #> '{order,delivery}', '[]')) as d(v)
     where coalesce((d.v ->> 'enabled')::boolean, false)
       and d.v ->> 'name' = new.delivery_name
       and (jsonb_array_length(coalesce(d.v -> 'countries', '[]')) = 0 or d.v -> 'countries' ? new.country)
     limit 1;
    if m is null then
        raise exception 'athr: طريقة التوصيل غير متاحة' using errcode = '22023';
    end if;
    new.delivery_type := case when m ->> 'type' = 'office' then 'office' else 'home' end;

    -- 4) التوصيل المجاني
    free_min  := coalesce(nullif(cfg #>> '{order,free_min}', '')::numeric, 0);
    free_list := coalesce(cfg #> '{order,free_countries}', '[]');
    is_free := coalesce((cfg #>> '{order,free_enabled}')::boolean, false)
               and free_min > 0
               and (jsonb_array_length(free_list) = 0 or free_list ? new.country)
               and v_after >= free_min;

    -- 5) سعر التوصيل: ثابت أو لكل كيلو (يُقرَّب لأعلى، والحد الأدنى كيلو)
    if not is_free then
        if m ->> 'pricing' = 'per_kg' then
            ship := greatest(1, ceil(weight_g / 1000.0)) * coalesce(nullif(m ->> 'price', '')::numeric, 0);
        else
            ship := coalesce(nullif(m ->> 'price', '')::numeric, 0);
        end if;
    end if;

    -- 6) طريقة الدفع: يجب أن تكون مفعّلة ومتاحة لدولة الطلب
    select x.v into pay
      from jsonb_array_elements(coalesce(cfg #> '{order,payments}', '[]')) as x(v)
     where coalesce((x.v ->> 'enabled')::boolean, false)
       and x.v ->> 'name' = new.payment_name
       and (jsonb_array_length(coalesce(x.v -> 'countries', '[]')) = 0 or x.v -> 'countries' ? new.country)
     limit 1;
    if pay is null then
        raise exception 'athr: طريقة الدفع غير متاحة' using errcode = '22023';
    end if;
    new.payment_type := case when pay ->> 'type' in ('cod', 'bank', 'online', 'other') then pay ->> 'type' else 'other' end;

    -- 7) كود الخصم (للمؤثرين): يُحسب بعد خصومات المتجر. الكود غير الصالح يُحذف
    if new.coupon is not null then
        k := private.athr_coupon(new.coupon);
        -- كود المكافأة مربوط برقم صاحبه فقط
        if k.code is null or (k.phone is not null and k.phone is distinct from private.athr_phone_intl(new.phone, new.country)) then
            new.coupon := null;
        else
            new.coupon := k.code;
            if v_after >= k.min_total then
                if k.kind = 'pct' then
                    v_coupon := round(v_after * least(k.value, 90) / 100, 3);
                elsif k.kind = 'fixed' then
                    v_coupon := least(k.value, v_after);
                elsif k.kind = 'ship' then
                    ship := 0;
                end if;
            end if;
        end if;
    end if;

    -- 8) خصم الكميات من المخزون، والمنتج يصير «نفد» عند الصفر
    for sk in select key, value::int as q from jsonb_each_text(qtys) loop
        update public.products
           set stock = stock - sk.q,
               is_available = (stock - sk.q) > 0
         where id = sk.key::uuid and stock is not null;
    end loop;

    -- 9) المبالغ النهائية من الخادم تحل محل ما أرسله المتصفح
    new.items           := clean;
    new.subtotal        := round(v_subtotal, 3);
    new.discount        := v_discount;
    new.discount_label  := v_label;
    new.coupon_discount := v_coupon;
    new.delivery_price  := round(ship, 3);
    new.total           := round(v_after - v_coupon + ship, 3);
    new.ordered_at     := now();
    return new;
end;
$$;


-- =====================================================
-- الإصدار 15: الزبون يكتب اسم المناسبة بنفسه (مثل: عيد الأم، ترقية)
-- =====================================================
alter table public.orders
    add column if not exists gift_occasion_text text check (gift_occasion_text is null or char_length(gift_occasion_text) <= 40);
-- =====================================================
-- الإصدار 16: صفحة «نقاطي» — الزبون يشوف نقاط الولاء برقمه ورقم أحد طلباته
-- =====================================================
create or replace function private.athr_cust_key(p text, c text)
returns text language sql immutable set search_path = public as $$
    select case
        when coalesce(nullif(c, ''), 'OM') = 'OM' and length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) = 8
            then '968' || regexp_replace(coalesce(p, ''), '\D', '', 'g')
        else regexp_replace(coalesce(p, ''), '\D', '', 'g')
    end;
$$;

create or replace function public.loyalty_status(ph text, ono text)
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
    ly jsonb;
    per numeric;
    need int;
    val numeric;
    k text;
    spent numeric;
    pend numeric;
    earned int;
    used int;
    bal int;
    nm text;
    cp jsonb;
begin
    -- نفس القيم الافتراضية في المتجر إذا لم تُحفظ الإعدادات بعد
    select coalesce(config->'sales'->'loyalty', '{}'::jsonb) into ly from public.store_settings limit 1;
    ly := coalesce(ly, '{}'::jsonb);
    per := coalesce((ly->>'per_omr')::numeric, 1);
    if coalesce((ly->>'enabled')::boolean, true) = false or per <= 0 then
        return jsonb_build_object('enabled', false);
    end if;
    need := greatest(1, coalesce((ly->>'reward_points')::int, 50));
    val := greatest(0.5, coalesce((ly->>'reward_value')::numeric, 2));

    k := regexp_replace(coalesce(ph, ''), '\D', '', 'g');
    if length(k) = 8 then k := '968' || k; end if;
    if length(k) < 8 or length(k) > 15 or coalesce(trim(ono), '') !~* '^[A-Z]{1,4}-[0-9A-Z]{3,10}$' then
        return jsonb_build_object('enabled', true, 'ok', false);
    end if;

    -- رقم الطلب لازم يكون لنفس الرقم (حتى لا يشوف أحد نقاط غيره)
    if not exists (
        select 1 from public.orders o
        where upper(o.order_no) = upper(trim(ono)) and not coalesce(o.hidden, false)
          and private.athr_cust_key(o.phone, o.country) = k
    ) then
        return jsonb_build_object('enabled', true, 'ok', false);
    end if;

    select coalesce(sum(greatest(0, coalesce(o.total, 0) - coalesce(o.delivery_price, 0))) filter (where o.status = 'delivered'), 0),
           coalesce(sum(greatest(0, coalesce(o.total, 0) - coalesce(o.delivery_price, 0))) filter (where o.status <> 'delivered'), 0)
      into spent, pend
      from public.orders o
     where not coalesce(o.hidden, false) and private.athr_cust_key(o.phone, o.country) = k;

    earned := floor(spent * per + 1e-9)::int;
    select coalesce(points_used, 0), name into used, nm from public.customers where phone = k;
    bal := greatest(0, earned - coalesce(used, 0));

    select jsonb_build_object('code', c.code, 'value', c.value, 'ends_at', c.ends_at)
      into cp
      from public.coupons c
     where c.phone = k and c.code like 'VIP%' and (private.athr_coupon(c.code)).code is not null
     order by c.created_at desc
     limit 1;

    return jsonb_build_object(
        'enabled', true, 'ok', true,
        'name', split_part(trim(coalesce(nm, '')), ' ', 1),
        'points', bal,
        'pending', floor(pend * per + 1e-9)::int,
        'need', need,
        'value', val,
        'per_omr', per,
        'coupon', cp
    );
end;
$$;

revoke all on function public.loyalty_status(text, text) from public;
grant execute on function public.loyalty_status(text, text) to anon, authenticated;
revoke all on function private.athr_cust_key(text, text) from public;

-- =====================================================
-- الإصدار 17: الإثبات الاجتماعي من بيانات حقيقية فقط
-- 1) social_proof(): لكل منتج ظاهر: عدد العملاء الذين طلبوه، وقت آخر طلب، وعدد مرات إضافته للمفضلة،
--    وآخر الطلبات (المنتج + الولاية + الوقت، بدون اسم أو رقم) لإشعار «أحد العملاء من … طلب …».
--    و g: عدد العملاء لكل تصميم (القسم + الاسم) حتى لا يُحسب من طلب لونين مرتين.
--    الطلبات المخفية من دفتر الطلبات لا تُحسب. الحد الأدنى لإظهار الأرقام يطبّقه المتجر بعد تجميع ألوان التصميم الواحد.
-- 2) شارة «مشتري موثّق»: تُحسب تلقائياً عند إرسال التقييم إذا كان رقم الطلب يحتوي هذا المنتج (لا يقدر الزائر يكتبها بنفسه).
-- 3) رقم الطلب في التقييمات لم يعد يُقرأ من خارج اللوحة.
-- =====================================================
alter table public.reviews add column if not exists verified boolean not null default false;

create or replace function private.athr_review_verify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.verified := new.order_no is not null and new.product_id is not null and exists (
        select 1 from public.orders o
        where upper(o.order_no) = upper(new.order_no) and not coalesce(o.hidden, false)
          and exists (select 1 from jsonb_array_elements(o.items) e where e ->> 'id' = new.product_id::text)
    );
    return new;
end;
$$;
revoke all on function private.athr_review_verify() from public;
drop trigger if exists athr_review_verify on public.reviews;
create trigger athr_review_verify before insert or update of order_no, product_id on public.reviews
    for each row execute function private.athr_review_verify();

revoke select on public.reviews from anon;
grant select (id, created_at, product_id, name, rating, text, status, verified) on public.reviews to anon;

create or replace function public.social_proof()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    c jsonb := coalesce((select config -> 'proof' from public.store_settings where id = 1), '{}'::jsonb);
    d_age int := least(30, greatest(1, coalesce(floor(nullif(c ->> 'recent_days', '')::numeric)::int, 7)));
    show_n boolean := coalesce((c ->> 'counts')::boolean, true);
    show_last boolean := coalesce((c ->> 'last')::boolean, true);
    show_f boolean := coalesce((c ->> 'favs')::boolean, true);
    show_pop boolean := coalesce((c ->> 'popup')::boolean, true);
    show_total boolean := coalesce((c ->> 'total')::boolean, true);
    per jsonb;
    grp jsonb := '{}'::jsonb;
    recent jsonb := '[]'::jsonb;
    total int;
begin
    with it as (
        select coalesce(private.athr_cust_key(o.phone, o.country), o.order_no) as who, o.ordered_at, e ->> 'id' as pid
        from public.orders o cross join lateral jsonb_array_elements(o.items) e
        where not coalesce(o.hidden, false) and e ? 'id'
    ), agg as (
        select pid, count(distinct who)::int as n, max(ordered_at) as last from it group by pid
    )
    select coalesce(jsonb_object_agg(p.id::text, jsonb_strip_nulls(jsonb_build_object(
            'n', case when show_n then a.n end,
            'last', case when show_last and a.last > now() - make_interval(days => d_age) then a.last end,
            'f', case when show_f and s.favs > 0 then s.favs end))), '{}'::jsonb)
      into per
      from public.products p
      left join agg a on a.pid = p.id::text
      left join public.product_stats s on s.product_id = p.id
     where p.is_visible and (a.n is not null or s.favs > 0);

    -- عدد العملاء لكل تصميم (كل ألوانه معاً، العميل الواحد يُحسب مرة واحدة)
    if show_n then
        with it as (
            select coalesce(private.athr_cust_key(o.phone, o.country), o.order_no) as who, e ->> 'id' as pid
            from public.orders o cross join lateral jsonb_array_elements(o.items) e
            where not coalesce(o.hidden, false) and e ? 'id'
        )
        select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) into grp
          from (
            select coalesce(p.category_id::text, '') || '|' || btrim(p.name) as k, count(distinct it.who)::int as n
              from it join public.products p on p.id::text = it.pid and p.is_visible
             group by 1
          ) z;
    end if;

    if show_pop then
        select coalesce(jsonb_agg(q.x order by q.t desc), '[]'::jsonb) into recent
          from (
            select * from (
                select distinct on (o.id) o.ordered_at as t, jsonb_build_object(
                    'p', e ->> 'id',
                    'w', coalesce(nullif(o.wilaya, ''), nullif(o.governorate, '')),
                    'c', o.country,
                    't', o.ordered_at) as x
                  from public.orders o
                  cross join lateral jsonb_array_elements(o.items) e
                  join public.products p on p.id::text = e ->> 'id' and p.is_visible
                 where not coalesce(o.hidden, false) and o.ordered_at > now() - make_interval(days => d_age)
                 order by o.id, e ->> 'id'
            ) z order by z.t desc limit 10
          ) q;
    end if;

    if show_total then
        select count(distinct coalesce(private.athr_cust_key(phone, country), order_no))::int into total
          from public.orders where not coalesce(hidden, false);
    end if;

    return jsonb_build_object('p', per, 'g', grp, 'recent', recent, 'total', total, 'at', now());
end;
$$;
revoke all on function public.social_proof() from public;
grant execute on function public.social_proof() to anon, authenticated;

-- =====================================================
-- v18 — حماية إضافية + نسخ احتياطي يومي داخل قاعدة البيانات
-- (يُطبَّق بموافقة صاحب المتجر؛ لوحة التحكم تكتشف وجود backup_list وتعرض النسخ تلقائياً)
-- =====================================================

-- ---------- 1) تضييق صلاحيات الزائر (anon) — طبقة حماية ثانية فوق RLS ----------
revoke all on public.admin_users from anon;
revoke insert, update, delete on public.categories, public.products, public.product_media, public.store_settings from anon;
revoke select, update, delete on public.orders from anon;
revoke update, delete on public.reviews from anon;
revoke select, update, delete on public.events from anon;
revoke all on public.stats_daily from anon;
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- دالة داخلية بدون search_path ثابت
alter function private.athr_phone_intl(text, text) set search_path = public;
revoke execute on function private.athr_phone_intl(text, text) from public, anon, authenticated;

-- حدود رفع الصور والفيديو (للأدمن فقط أصلاً)
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','video/mp4','video/quicktime','video/webm']
 where id = 'product-images';


-- ---------- منع إغراق المتجر بطلبات أو تقييمات وهمية ----------
create or replace function private.athr_limit_orders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    same_phone int;
    last_hour int;
begin
    if public.is_admin() or coalesce(new.source, 'web') <> 'web' then return new; end if;
    select count(*) into same_phone from public.orders
     where source = 'web' and phone = new.phone and created_at > now() - interval '30 minutes';
    if same_phone >= 5 then
        raise exception 'too many orders from this number, try later' using errcode = '54000';
    end if;
    select count(*) into last_hour from public.orders where source = 'web' and created_at > now() - interval '1 hour';
    if last_hour >= 150 then
        raise exception 'too many orders right now, try later' using errcode = '54000';
    end if;
    return new;
end;
$$;
revoke execute on function private.athr_limit_orders() from public, anon, authenticated;
drop trigger if exists athr_a_limit_orders on public.orders;
create trigger athr_a_limit_orders before insert on public.orders for each row execute function private.athr_limit_orders();

create or replace function private.athr_limit_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    same_order int;
    last_hour int;
begin
    if public.is_admin() then return new; end if;
    new.name := left(coalesce(new.name, ''), 60);
    new.text := left(coalesce(new.text, ''), 1500);
    select count(*) into same_order from public.reviews
     where order_no is not distinct from new.order_no and new.order_no is not null and created_at > now() - interval '1 day';
    select count(*) into last_hour from public.reviews where status = 'pending' and created_at > now() - interval '1 hour';
    if same_order >= 10 or last_hour >= 40 then
        raise exception 'too many reviews, try later' using errcode = '54000';
    end if;
    return new;
end;
$$;
revoke execute on function private.athr_limit_reviews() from public, anon, authenticated;
drop trigger if exists athr_a_limit_reviews on public.reviews;
create trigger athr_a_limit_reviews before insert on public.reviews for each row execute function private.athr_limit_reviews();

-- ---------- 2) النسخ الاحتياطي ----------
create table if not exists private.backups (
    id bigint generated always as identity primary key,
    taken_at timestamptz not null default now(),
    kind text not null check (kind in ('auto', 'manual', 'pre-restore')),
    label text,
    counts jsonb not null default '{}'::jsonb,
    bytes int not null default 0,
    data jsonb not null
);
alter table private.backups enable row level security;
revoke all on private.backups from public, anon, authenticated;

-- كل بيانات المتجر في ملف واحد (بدون الأسرار ولا سجل الزيارات الخام)
create or replace function private.backup_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    t text;
    tables text[] := array['categories', 'products', 'product_media', 'store_settings', 'coupons',
                           'orders', 'customers', 'reviews', 'restock_requests', 'product_stats', 'stats_daily', 'admin_users'];
    out jsonb := '{}'::jsonb;
    rows jsonb;
begin
    foreach t in array tables loop
        execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into rows;
        out := out || jsonb_build_object(t, rows);
    end loop;
    return jsonb_build_object('app', 'athr', 'version', 1, 'taken_at', now(), 'tables', out);
end;
$$;
revoke execute on function private.backup_data() from public, anon, authenticated;

create or replace function private.backup_take(k text, lbl text default null)
returns bigint
language plpgsql
security definer
set search_path = public, private
as $$
declare
    d jsonb := private.backup_data();
    c jsonb := '{}'::jsonb;
    t text;
    new_id bigint;
begin
    for t in select jsonb_object_keys(d->'tables') loop
        c := c || jsonb_build_object(t, jsonb_array_length(d->'tables'->t));
    end loop;
    insert into private.backups (kind, label, counts, bytes, data)
    values (k, nullif(left(trim(coalesce(lbl, '')), 80), ''), c, octet_length(d::text), d)
    returning id into new_id;
    -- نحتفظ بآخر 30 تلقائية و20 يدوية و10 قبل الاسترجاع
    delete from private.backups b
     where b.id in (
        select id from (
            select id, row_number() over (partition by kind order by taken_at desc) as rn, kind
              from private.backups
        ) z
        where (z.kind = 'auto' and z.rn > 30) or (z.kind = 'manual' and z.rn > 20) or (z.kind = 'pre-restore' and z.rn > 10)
     );
    return new_id;
end;
$$;
revoke execute on function private.backup_take(text, text) from public, anon, authenticated;

-- ---------- 3) دوال لوحة التحكم (للأدمن فقط) ----------
create or replace function public.backup_list()
returns table (id bigint, taken_at timestamptz, kind text, label text, counts jsonb, bytes int)
language plpgsql
security definer
set search_path = public, private
as $$
begin
    if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
    return query select b.id, b.taken_at, b.kind, b.label, b.counts, b.bytes from private.backups b order by b.taken_at desc limit 80;
end;
$$;

create or replace function public.backup_now(label text default null)
returns bigint
language plpgsql
security definer
set search_path = public, private
as $$
declare
    recent int;
begin
    if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
    select count(*) into recent from private.backups where kind = 'manual' and taken_at > now() - interval '1 minute';
    if recent >= 3 then raise exception 'too many backups, wait a minute' using errcode = '54000'; end if;
    return private.backup_take('manual', label);
end;
$$;

create or replace function public.backup_get(backup_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
    d jsonb;
begin
    if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
    select data into d from private.backups where id = backup_id;
    if d is null then raise exception 'backup not found' using errcode = 'P0002'; end if;
    return d;
end;
$$;

-- إرجاع نسخة:
--  scope = 'catalog' : المنتجات والأقسام والصور والإعدادات والكوبونات ترجع مثل ما كانت (اللي انضاف بعدها ينحذف)
--  scope = 'all'     : نفس السابق + إرجاع الطلبات والعملاء والتقييمات المحذوفة (بدون حذف أي شي جديد)
-- قبل أي إرجاع نأخذ نسخة «قبل الاسترجاع» حتى نقدر نتراجع
create or replace function public.backup_restore(backup_id bigint, scope text default 'catalog')
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
    d jsonb;
    pre bigint;
    t text;
    cols text;
    upd text;
    pk text;
    n int;
    result jsonb := '{}'::jsonb;
    catalog text[] := array['categories', 'products', 'product_media', 'store_settings', 'coupons', 'product_stats'];
    keys jsonb := '{"categories":"id","products":"id","product_media":"id","store_settings":"id","coupons":"code","product_stats":"product_id","orders":"id","customers":"phone","reviews":"id","restock_requests":"product_id, phone","stats_daily":"day, key"}';
begin
    if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
    if scope not in ('catalog', 'all') then raise exception 'bad scope'; end if;
    select data into d from private.backups where id = backup_id;
    if d is null or d->>'app' <> 'athr' then raise exception 'backup not found' using errcode = 'P0002'; end if;

    pre := private.backup_take('pre-restore', 'قبل استرجاع نسخة ' || backup_id);

    -- حذف ما انضاف بعد النسخة (من الأبناء إلى الآباء)
    delete from public.product_media m where not exists (select 1 from jsonb_array_elements(d->'tables'->'product_media') e where (e->>'id')::uuid = m.id);
    delete from public.products p where not exists (select 1 from jsonb_array_elements(d->'tables'->'products') e where (e->>'id')::uuid = p.id);
    delete from public.categories c where not exists (select 1 from jsonb_array_elements(d->'tables'->'categories') e where (e->>'id')::uuid = c.id);
    delete from public.coupons k where not exists (select 1 from jsonb_array_elements(d->'tables'->'coupons') e where e->>'code' = k.code);

    -- إرجاع الصفوف كما كانت (من الآباء إلى الأبناء)
    foreach t in array catalog loop
        select string_agg(quote_ident(column_name), ', ' order by ordinal_position),
               string_agg(format('%1$I = excluded.%1$I', column_name), ', ' order by ordinal_position)
          into cols, upd
          from information_schema.columns
         where table_schema = 'public' and table_name = t and is_generated = 'NEVER';
        pk := keys->>t;
        execute format('insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I, $1) on conflict (%3$s) do update set %4$s',
                       t, cols, pk, upd)
          using coalesce(d->'tables'->t, '[]'::jsonb);
        get diagnostics n = row_count;
        result := result || jsonb_build_object(t, n);
    end loop;

    if scope = 'all' then
        -- بدون إعادة حساب الأسعار وعدّادات العملاء للطلبات المسترجعة
        alter table public.orders disable trigger athr_recompute_order;
        alter table public.orders disable trigger athr_track_customer;
        alter table public.orders disable trigger athr_a_limit_orders;
        alter table public.reviews disable trigger athr_a_limit_reviews;
        foreach t in array array['customers', 'orders', 'reviews', 'restock_requests', 'stats_daily'] loop
            select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
              into cols
              from information_schema.columns
             where table_schema = 'public' and table_name = t and is_generated = 'NEVER';
            execute format('insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I, $1) x %4$s on conflict (%3$s) do nothing',
                           t, cols, keys->>t,
                           case when t in ('reviews', 'restock_requests') then 'where x.product_id is null or exists (select 1 from public.products p where p.id = x.product_id)' else '' end)
              using coalesce(d->'tables'->t, '[]'::jsonb);
            get diagnostics n = row_count;
            result := result || jsonb_build_object(t, n);
        end loop;
        alter table public.orders enable trigger athr_recompute_order;
        alter table public.orders enable trigger athr_track_customer;
        alter table public.orders enable trigger athr_a_limit_orders;
        alter table public.reviews enable trigger athr_a_limit_reviews;
    end if;

    return jsonb_build_object('restored', backup_id, 'scope', scope, 'undo', pre, 'rows', result);
end;
$$;

revoke execute on function public.backup_list() from public, anon;
revoke execute on function public.backup_now(text) from public, anon;
revoke execute on function public.backup_get(bigint) from public, anon;
revoke execute on function public.backup_restore(bigint, text) from public, anon;
grant execute on function public.backup_list() to authenticated;
grant execute on function public.backup_now(text) to authenticated;
grant execute on function public.backup_get(bigint) to authenticated;
grant execute on function public.backup_restore(bigint, text) to authenticated;

-- ---------- 4) جدولة يومية: 3 الفجر بتوقيت مسقط (23:00 UTC) ----------
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
select cron.unschedule(jobid) from cron.job where jobname = 'athr-daily-backup';
select cron.schedule('athr-daily-backup', '0 23 * * *', $$select private.backup_take('auto', null)$$);

-- أول نسخة الحين
select private.backup_take('manual', 'أول نسخة بعد تفعيل النسخ الاحتياطي');

-- =====================================================
-- v20: مخزن خاص لبيانات المدير (المصاريف)
-- بدون سياسات وصول: ما يقرأه ولا يكتبه إلا دالة الخادم admin-data بالمفتاح السري بعد التحقق من is_admin
-- =====================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('athr-private', 'athr-private', false, 1048576, array['application/json'])
on conflict (id) do nothing;
