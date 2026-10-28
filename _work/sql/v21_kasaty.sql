-- =====================================================
-- الإصدار 21: صفحة القصة مثل Kasaty
-- 1) مخزن خاص لصور الأطفال: الزائر يرفع فقط (صورة JPEG باسم عشوائي)، والقراءة والحذف لصاحب المتجر فقط
-- 2) الطلب يحفظ: مسار الصورة (إذا كانت مرفوعة فعلاً)، تغليف الهدية للمطبوعة، والإهداء ومن أرسله
-- 3) قائمة الصور القديمة للتنظيف من اللوحة (بدون طلب بعد 14 يوماً، أو طلبها أقدم من 45 يوماً)
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('story-photos', 'story-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
   set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- حد بسيط ضد الإغراق: 120 صورة في الساعة للمتجر كله
create or replace function public.huroof_photo_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select (select count(*) from storage.objects o
             where o.bucket_id = 'story-photos' and o.created_at > now() - interval '1 hour') < 120
$$;
revoke all on function public.huroof_photo_ok() from public;
grant execute on function public.huroof_photo_ok() to anon, authenticated;

drop policy if exists "huroof visitors upload child photo" on storage.objects;
create policy "huroof visitors upload child photo" on storage.objects
    for insert to anon, authenticated
    with check (
        bucket_id = 'story-photos'
        and name ~ '^[0-9]{8}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$'
        and public.huroof_photo_ok()
    );

drop policy if exists "huroof admin read child photos" on storage.objects;
create policy "huroof admin read child photos" on storage.objects
    for select to authenticated
    using (bucket_id = 'story-photos' and public.is_admin());

drop policy if exists "huroof admin delete child photos" on storage.objects;
create policy "huroof admin delete child photos" on storage.objects
    for delete to authenticated
    using (bucket_id = 'story-photos' and public.is_admin());

-- صور للتنظيف (يحذفها المدير من اللوحة عبر Storage API)
create or replace function public.huroof_photos_to_clean()
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not public.is_admin() then
        raise exception 'not allowed' using errcode = '42501';
    end if;
    return query
    select o.name
      from storage.objects o
     where o.bucket_id = 'story-photos'
       and (
            (o.created_at < now() - interval '14 days'
             and not exists (select 1 from public.orders r, jsonb_array_elements(r.items) it
                              where it #>> '{custom,photo_path}' = o.name))
         or (exists (select 1 from public.orders r, jsonb_array_elements(r.items) it
                      where it #>> '{custom,photo_path}' = o.name)
             and not exists (select 1 from public.orders r, jsonb_array_elements(r.items) it
                              where it #>> '{custom,photo_path}' = o.name
                                and coalesce(r.ordered_at, r.created_at) > now() - interval '45 days'))
       )
     limit 200;
end;
$$;
revoke all on function public.huroof_photos_to_clean() from public, anon;
grant execute on function public.huroof_photos_to_clean() to authenticated;

-- حساب الطلب: نضيف حقول القصة الجديدة بعد تنظيفها
do $patch$
declare
    d text;
    n text;
    anchor text := $a$'fmt', v_fmt
            );$a$;
begin
    d := pg_get_functiondef('private.athr_recompute_order'::regproc);
    if position('photo_path' in d) > 0 then
        raise notice 'athr_recompute_order already has v21 fields';
        return;
    end if;
    if position(anchor in d) = 0 then
        raise exception 'v21: anchor not found in athr_recompute_order';
    end if;
    n := replace(d, anchor, $b$'fmt', v_fmt
            )
            -- الصورة: نحفظ مسارها فقط إذا رُفعت فعلاً إلى المخزن الخاص
            || case when coalesce(it #>> '{custom,photo_path}', '') ~ '^[0-9]{8}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$'
                         and exists (select 1 from storage.objects so
                                      where so.bucket_id = 'story-photos' and so.name = it #>> '{custom,photo_path}')
                    then jsonb_build_object('photo_path', it #>> '{custom,photo_path}', 'photo', true)
                    else '{}'::jsonb end
            -- تغليف الهدية مجاني للمطبوعة فقط
            || case when v_fmt = 'print' and coalesce(it #>> '{custom,wrap}', '') = 'true'
                    then jsonb_build_object('wrap', true) else '{}'::jsonb end
            -- الإهداء: نص جاهز أو يكتبه الأهل (220 حرف)، ومن أرسله (40 حرف)
            || case when coalesce(it #>> '{custom,ded_t}', '') ~ '^(d[1-9]|own)$'
                         and char_length(btrim(coalesce(it #>> '{custom,ded}', ''))) >= 2
                    then jsonb_build_object(
                        'ded_t', it #>> '{custom,ded_t}',
                        'ded', left(btrim(regexp_replace(translate(coalesce(it #>> '{custom,ded}', ''), '<>', ''), '[[:cntrl:]]', ' ', 'g')), 220),
                        'ded_from', left(btrim(regexp_replace(translate(coalesce(it #>> '{custom,ded_from}', ''), '<>', ''), '[[:cntrl:]]', ' ', 'g')), 40))
                    else '{}'::jsonb end;$b$);
    execute n;
end;
$patch$;
