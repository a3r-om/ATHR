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
    if k is null or k !~ '^(visit|view|add|checkout|order)(:(direct|google|instagram|tiktok|whatsapp|snapchat|facebook|x|other))?$' then
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
