

-- =====================================================
-- الإصدار 19: خيارات القصص (مثل FairyWrap)
-- هوايات الطفل ورسالة القصة، والنوع المميّز (بوجه الطفل من صورته) والنسخة المطبوعة.
-- أسعار الإضافات من config.stories (pro_price، print_price)، والمطبوعة تحتاج طريقة توصيل.
-- =====================================================
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
    v_custom   jsonb;
    v_cname    text;
    v_unit     numeric;
    v_tier     text;
    v_fmt      text;
    v_likes    jsonb;
    has_print  boolean := false;
    scfg       jsonb;
begin
    -- المدير يدخل طلبات يدوية وملصوقة بمبالغ يحددها بنفسه
    if public.is_admin() then
        return new;
    end if;

    select coalesce(config, '{}'::jsonb) into cfg from public.store_settings where id = 1;
    max_qty    := coalesce(nullif(cfg #>> '{order,max_qty}', '')::int, 10);
    def_weight := coalesce(nullif(cfg #>> '{order,default_weight_g}', '')::int, 400);
    scfg       := coalesce(cfg -> 'stories', '{}'::jsonb);

    new.client_total := new.total;

    -- 1) الأصناف: الاسم والسعر من جدول المنتجات، والكمية بين 1 والحد الأعلى
    for it in select v from jsonb_array_elements(new.items) as e(v) loop
        begin
            pid := (it ->> 'id')::uuid;
        exception when others then
            raise exception 'athr: منتج غير صالح في الطلب' using errcode = '22023';
        end;
        qty := least(greatest(coalesce(nullif(it ->> 'qty', '')::numeric, 1)::int, 1), max_qty);

        select pr.id, pr.name, pr.price, pr.color_id, pr.weight_g, pr.stock, pr.is_available, pr.story
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

        -- القصة الشخصية: بيانات الطفل لازمة، وتُنظَّف هنا قبل الحفظ
        v_custom := null;
        v_unit := p.price;
        if p.story is not null then
            qty := 1;
            v_cname := left(btrim(regexp_replace(translate(regexp_replace(coalesce(it #>> '{custom,name}', ''), '[[:cntrl:]]', '', 'g'), '<>{}[]|\/"`', ''), '\s+', ' ', 'g')), 22);
            if char_length(replace(v_cname, ' ', '')) < 2 then
                raise exception 'athr: story|%', p.name using errcode = '22023';
            end if;
            -- النوع (عادية / مميّزة بوجه الطفل) والصيغة (PDF / مطبوعة) وأسعارهم من إعدادات القصص
            v_tier := case when it #>> '{custom,tier}' = 'pro' then 'pro' else 'std' end;
            v_fmt  := case when it #>> '{custom,fmt}' = 'print' then 'print' else 'pdf' end;
            if v_tier = 'pro' then
                if coalesce((scfg ->> 'pro_enabled')::boolean, true) is not true
                   or not (coalesce(scfg -> 'pro_stories', '["space"]'::jsonb) ? p.story) then
                    raise exception 'athr: story_tier|%', p.name using errcode = '22023';
                end if;
                v_unit := v_unit + greatest(coalesce(nullif(scfg ->> 'pro_price', '')::numeric, 5), 0);
            end if;
            if v_fmt = 'print' then
                if coalesce((scfg ->> 'print_enabled')::boolean, true) is not true then
                    raise exception 'athr: story_print|%', p.name using errcode = '22023';
                end if;
                v_unit := v_unit + greatest(coalesce(nullif(scfg ->> 'print_price', '')::numeric, 6), 0);
                has_print := true;
            end if;
            select coalesce(jsonb_agg(x), '[]'::jsonb) into v_likes
              from (select distinct x from jsonb_array_elements_text(
                        case when jsonb_typeof(it #> '{custom,likes}') = 'array' then it #> '{custom,likes}' else '[]'::jsonb end) as e(x)
                     where x ~ '^[a-z]{2,12}$' limit 2) q;
            v_custom := jsonb_build_object(
                'name', v_cname,
                'g', case when it #>> '{custom,g}' = 'f' then 'f' else 'm' end,
                'age', case when coalesce(it #>> '{custom,age}', '') ~ '^[0-9]{1,2}$' and (it #>> '{custom,age}')::int between 1 and 12 then (it #>> '{custom,age}')::int end,
                'photo', v_tier = 'pro' or coalesce(it #>> '{custom,photo}', '') = 'true',
                'likes', v_likes,
                'lesson', case when coalesce(it #>> '{custom,lesson}', '') ~ '^[a-z]{2,12}$' then it #>> '{custom,lesson}' else '' end,
                'tier', v_tier,
                'fmt', v_fmt
            );
            if v_tier = 'pro' then
                v_custom := v_custom || jsonb_build_object(
                    'note', left(btrim(regexp_replace(translate(coalesce(it #>> '{custom,note}', ''), '<>', ''), '[[:cntrl:]]', ' ', 'g')), 200),
                    'family', left(btrim(regexp_replace(translate(coalesce(it #>> '{custom,family}', ''), '<>', ''), '[[:cntrl:]]', ' ', 'g')), 120),
                    'friend', left(btrim(regexp_replace(translate(coalesce(it #>> '{custom,friend}', ''), '<>', ''), '[[:cntrl:]]', ' ', 'g')), 60),
                    'hijab', case when it #>> '{custom,g}' = 'f' then coalesce(it #>> '{custom,hijab}', 'true') <> 'false' end
                );
            end if;
        end if;

        qtys   := qtys   || jsonb_build_object(pid::text, qty);
        prices := prices || jsonb_build_object(pid::text, v_unit);
        v_subtotal := v_subtotal + v_unit * qty;
        weight_g   := weight_g + coalesce(nullif(p.weight_g, 0), def_weight) * qty;

        clean := clean || jsonb_build_array(jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'color', (select c.v ->> 'name' from jsonb_array_elements(coalesce(cfg -> 'colors', '[]')) as c(v)
                       where c.v ->> 'id' = p.color_id limit 1),
            'label', p.name || coalesce(' (' || (select c.v ->> 'name' from jsonb_array_elements(coalesce(cfg -> 'colors', '[]')) as c(v)
                       where c.v ->> 'id' = p.color_id limit 1) || ')', ''),
            'qty', qty,
            'price', v_unit,
            'total', v_unit * qty
        ) || case when v_custom is not null then jsonb_build_object('custom', v_custom) else '{}'::jsonb end);
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
    new.delivery_type := case when m ->> 'type' in ('office', 'digital') then m ->> 'type' else 'home' end;
    -- القصة المطبوعة تحتاج طريقة توصيل (مو ملفات على واتساب)
    if has_print and new.delivery_type = 'digital' then
        raise exception 'athr: print_delivery' using errcode = '22023';
    end if;

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
