-- الإصدار 23: قسمان جديدان (كتب التلوين، تعلّم الحروف)، وإيقاف الهدية والتغليف والإهداء — بدون حذف أي بيانات
begin;
update public.categories set name='قصص ثلاثية الأبعاد', name_en='3D stories', slug='قصص-ثلاثية-الأبعاد', description='أربع مغامرات بأسلوب ثلاثي الأبعاد: الفضاء والبحر والديناصورات وعُمان، طفلك بطلها باسمه.', description_en='Four 3D adventures: space, sea, dinosaurs and Oman, with your child as the hero.' where id='3fc55021-5e52-5f98-ba2f-f972bd706bd1';
insert into public.categories (id,name,name_en,slug,image_url,sort_order,description,description_en) values
('b1c0a0de-0c10-4a7e-9a11-c0107ab00001','كتب التلوين','Coloring books','كتب-التلوين','images/categories/coloring-book.jpg',1,'كتاب تلوين باسم طفلك: حروف اسمه ورسومات ممتعة جاهزة للطباعة.','A coloring book with your child''s name.'),
('b1c0a0de-0c10-4a7e-9a11-c0107ab00002','تعلّم الحروف','Learn letters','تعلّم-الحروف','images/categories/abc.jpg',2,'يكتب الطفل اسمه ويتعلّم الحروف من اسمه وحروف الهجاء كاملة.','Your child writes their name and learns the letters.');
insert into public.products (id,name,name_en,slug,price,old_price,category_id,image_url,thumb_url,is_available,is_visible,is_best_seller,is_new_arrival,description,description_en,sort_order,created_at,story) values
('b1c0a0de-0c10-4a7e-9a11-c0107ab10001','كتاب تلوين باسم طفلك','Coloring book with your child''s name','كتاب-تلوين-باسم-طفلك',1.5,null,'b1c0a0de-0c10-4a7e-9a11-c0107ab00001','images/p/st-coloring-0.jpg',null,true,true,true,true,'كتاب تلوين احترافي مصنوع باسم طفلك: حروف اسمه كبيرة بخطوط عريضة يلوّنها، ثم رسومات من مغامرات الفضاء والبحر والديناصورات وعُمان، وماندالا وأشكال هندسية، وشهادة «فنان صغير» باسمه.
• اسم طفلك بحروف كبيرة مزخرفة تلوّنها صفحةً صفحة
• رسومات الفضاء والأعماق والديناصورات ومغامرة عُمان
• ماندالا وأشكال هندسية وصفحة «ارسم بنفسك»
• شهادة «فنان صغير» باسمه
• تشوف الكتاب كاملاً باسم طفلك قبل ما تطلب
• PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,5,'2026-10-29T09:00:00.000Z','coloring'),
('b1c0a0de-0c10-4a7e-9a11-c0107ab10002','تعلّم الحروف باسم طفلك','Learn letters with your child''s name','تعلّم-الحروف-باسم-طفلك',1.5,null,'b1c0a0de-0c10-4a7e-9a11-c0107ab00002','images/p/st-abc-0.jpg',null,true,true,true,true,'كتاب يتعلّم فيه طفلك الحروف من اسمه: يكتب اسمه فنرسم له صفحة لكل حرف، ويتتبّع الحروف بنقاط، ويبحث عنها بين الأشكال، ويلوّنها، ثم يتعرّف على حروف الهجاء كاملة بكلمة وصورة لكل حرف.
• صفحة لكل حرف من اسمه بأشكاله في أول الكلمة ووسطها وآخرها
• تتبّع الحروف وبحث عن الحرف وتلوين
• لوحتان بحروف الهجاء الثمانية والعشرين مع كلمة وصورة
• شهادة «تعلّمت حروفي» باسمه
• تشوف الكتاب كاملاً باسم طفلك قبل ما تطلب
• PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,6,'2026-10-29T09:00:00.000Z','abc');
insert into public.product_media (id,product_id,media_type,media_url,sort_order) values
('f263e2f6-d4c2-4bbe-94fb-b34d970eb6ef','b1c0a0de-0c10-4a7e-9a11-c0107ab10001','image','images/p/st-coloring-1.jpg',1),
('b3c55005-d24e-4288-b760-8f4906b966f3','b1c0a0de-0c10-4a7e-9a11-c0107ab10001','image','images/p/st-coloring-2.jpg',2),
('bbffd98b-37d8-44b9-b73d-dcc7f098e73b','b1c0a0de-0c10-4a7e-9a11-c0107ab10001','image','images/p/st-coloring-3.jpg',3),
('1546e701-dfd1-4e0d-bc07-fbe5b5d7bf33','b1c0a0de-0c10-4a7e-9a11-c0107ab10001','image','images/p/st-coloring-4.jpg',4),
('42f675bb-c24f-48d6-aecb-abbd976c2ce9','b1c0a0de-0c10-4a7e-9a11-c0107ab10001','image','images/p/st-coloring-5.jpg',5),
('90d819be-2e1d-42c0-890d-f3fa0685930c','b1c0a0de-0c10-4a7e-9a11-c0107ab10002','image','images/p/st-abc-1.jpg',1),
('af97e80f-0d94-4706-befc-f91fc330a733','b1c0a0de-0c10-4a7e-9a11-c0107ab10002','image','images/p/st-abc-2.jpg',2),
('0d689f4f-316f-449c-ac6c-e71be3f86d27','b1c0a0de-0c10-4a7e-9a11-c0107ab10002','image','images/p/st-abc-3.jpg',3),
('bda0c19c-c582-4d35-9ae2-35849fceb105','b1c0a0de-0c10-4a7e-9a11-c0107ab10002','image','images/p/st-abc-4.jpg',4),
('e9b9fbf7-b589-44e4-8155-72d31c336a09','b1c0a0de-0c10-4a7e-9a11-c0107ab10002','image','images/p/st-abc-5.jpg',5);
update public.products set description = regexp_replace(regexp_replace(description, E'\n• صورة طفلك على الغلاف، وإهداء منك[^\n]*', ''), E'\n• هدايا مع القصة[^\n]*', '') where story in ('astro','sea','dino','oman');
update public.store_settings set config = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(config,'{sales,gift_enabled}','false'),'{sales,gift_banner}','false'),'{sales,gift_button}','false'),'{stories,wrap_enabled}','false'),'{stories,ded_enabled}','false'),'{stories,pro_stories}','["astro","sea","dino","oman"]') where id=1;
commit;

-- نصوص الشريط والرئيسية والأسئلة الشائعة
update public.store_settings set config = jsonb_set(jsonb_set(jsonb_set(jsonb_set(config,'{texts,announce_text}','"👀 شوف الكتاب باسم طفلك قبل الطلب  ·  📱 يصلك PDF على واتساب"'::jsonb),'{texts,hero_title}','"قصص وكتب أطفال باسم طفلك"'::jsonb),'{texts,hero_text}','"قصص ثلاثية الأبعاد يكون طفلك بطلها، وكتب تلوين، وكتاب يتعلّم منه الحروف باسمه. تشوفها كاملة باسم طفلك قبل ما تطلب، وتصلك PDF على واتساب."'::jsonb),'{contact,faq}','[{"q": "ما الفرق بين القصة الجاهزة والقصة المؤلفة خصيصاً؟", "a": "الجاهزة: قصة مرسومة نكتب فيها اسم طفلك وعمره وهواياته ورسالة تختارها، وصورته على الغلاف إذا رفعتها، وتصلك خلال ساعات. المؤلفة خصيصاً: نرسم طفلك بوجهه من صورته في كل صفحة، ونكتب القصة حول أسرته وأصدقائه والعادة اللي تبيها، وتصلك خلال 48 ساعة."}, {"q": "كيف تصلني القصة؟", "a": "بعد تأكيد الدفع نرسل لك القصة PDF على واتساب. وإذا اخترت النسخة المطبوعة، نطبعها بغلاف مقوّى ونوصلها لبيتك داخل عُمان خلال 3 إلى 5 أيام."}, {"q": "هل أقدر أشوف الكتاب قبل ما أطلب؟", "a": "نعم. اكتب اسم طفلك في صفحة أي كتاب وتصفّحه كاملاً باسمه قبل الدفع، وتتأكد من الإملاء."}, {"q": "هل صورة طفلي آمنة؟", "a": "ترفع الصورة في مخزن خاص لا يراه أحد غيرنا، ونستخدمها لقصة طفلك فقط، ونحذفها بعد تسليم القصة."}, {"q": "وش لو ما عجبتني القصة؟", "a": "نعدّلها لك مجاناً، وإذا ما زالت ما عجبتك نرجّع لك المبلغ كاملاً."}, {"q": "هل تساعد القصة في تعديل سلوك طفلي؟", "a": "نعم، تختار قيمة مثل الصدق والشجاعة، أو عادة يومية مثل تنظيف الأسنان والنوم بدري وترتيب الألعاب، ونكتبها في القصة وفي شهادة البطل. وفي القصة المؤلفة خصيصاً تدور القصة كلها حولها."}, {"q": "كم صفحة في القصة والكتب؟", "a": "القصة: غلاف باسم طفلك و10 صفحات وصفحة النهاية، وشهادة بطل القصة. كتاب التلوين وكتاب الحروف: صفحة لكل حرف من اسمه مع أنشطة وتلوين وشهادة، وعددها يتغيّر بعدد حروف الاسم."}, {"q": "لأي عمر تناسب؟", "a": "من 3 إلى 8 سنوات. الجمل قصيرة وسهلة يقرأها الطفل بنفسه أو تقرؤونها له."}, {"q": "كيف أدفع؟", "a": "تحويل بنكي، ونرسل لك بيانات الحساب على واتساب مع تأكيد طلبك."}]'::jsonb) where id=1;
