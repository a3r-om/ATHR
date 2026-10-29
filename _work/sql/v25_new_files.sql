update public.products set is_visible=false where story is null and category_id in ('3041931d-879b-507d-a2d4-738bcf47c429','aa77bcfe-be93-5dea-a57a-750879195d56','34c5e974-ceb6-53ae-bb1e-69f9c1b1efcd') and id not in (select id from public.products where image_url like 'images/p/ws-%');
update public.categories set name='تعليمي للأطفال', name_en='Kids learning', slug='تعليمي-للأطفال', description='تلوين وتعليم بسيط وألعاب ذكاء بتصميم كرتوني ملوّن، جاهزة للطباعة.', description_en='Coloring, simple learning and brain games, printable.' where id='3041931d-879b-507d-a2d4-738bcf47c429';
update public.categories set name='طلاب الصفوف 1 إلى 4', name_en='Grades 1 to 4', slug='طلاب-الصفوف-1-إلى-4', description='كرّاسات أنشطة ملوّنة لكل صف: رياضيات وعربي وإنجليزي وعلوم مع الحلول.', description_en='Colorful activity workbooks for every grade, with answers.' where id='aa77bcfe-be93-5dea-a57a-750879195d56';
insert into public.products (id,name,name_en,slug,price,old_price,category_id,image_url,thumb_url,is_available,is_visible,is_best_seller,is_new_arrival,description,description_en,sort_order,created_at) values
('1227c213-56ba-5663-a141-14382c4bf71a','أرقام وأعداد من 1 إلى 10','Numbers 1 to 10','أرقام-وأعداد-من-1-إلى-10',1.0,null,'3041931d-879b-507d-a2d4-738bcf47c429','images/p/ws-k1-0.jpg',null,true,true,true,true,'كتاب أنشطة ملوّن لتعلّم الأرقام: عدّ الصور، تتبّع الأرقام بالخط المنقّط، لوّن بالعدد، وصِل الرقم بالصورة، مع شهادة تقدير.
• 9 صفحات بتصميم كرتوني ملوّن
• تتبّع الأرقام من 1 إلى 10
• ألعاب عدّ ومقارنة وأرقام ناقصة
• للأطفال من 3 إلى 6 سنوات
• ملف PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,20,'2026-10-29T12:00:00.000Z'),
('1ec51cf9-3ce4-5824-a724-bae68c21852a','أشكال وألوان','Shapes and colors','أشكال-وألوان',1.0,null,'3041931d-879b-507d-a2d4-738bcf47c429','images/p/ws-k2-0.jpg',null,true,true,false,true,'كتاب أنشطة لتعلّم الأشكال والألوان: 8 أشكال، تلوين حسب الاسم، صِل الشيء بشكله، الشكل المختلف، أكمل النمط، وأين ظلّي؟
• 9 صفحات بتصميم كرتوني ملوّن
• ألعاب ذكاء وملاحظة
• للأطفال من 3 إلى 6 سنوات
• ملف PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,21,'2026-10-29T12:00:00.000Z'),
('1029265f-9c07-5281-8d65-7de33d8f6b1d','حيوانات للتلوين','Animals coloring book','حيوانات-للتلوين',1.0,null,'3041931d-879b-507d-a2d4-738bcf47c429','images/p/ws-k3-0.jpg',null,true,true,false,true,'ثمانية حيوانات محبوبة برسومات كبيرة بخطوط عريضة واضحة تناسب الأطفال: الأسد والفيل والباندا والسلحفاة والدلفين والزرافة والأرنب والفراشة.
• 10 صفحات مع شهادة تقدير
• معلومة طريفة عن كل حيوان
• للأطفال من 3 إلى 8 سنوات
• ملف PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,22,'2026-10-29T12:00:00.000Z'),
('d8c407e9-237b-5af4-a0f4-af0bcec8b287','متاهات وتوصيل النقاط','Mazes and dot-to-dot','متاهات-وتوصيل-النقاط',1.0,null,'3041931d-879b-507d-a2d4-738bcf47c429','images/p/ws-k4-0.jpg',null,true,true,true,true,'ثلاث متاهات بمستويات متدرّجة وثلاث لوحات لتوصيل النقاط (نجمة وقلب وبيت) لتنمية التركيز واليد والعين.
• 8 صفحات مع شهادة تقدير
• متاهة الأرنب والنحلة والصاروخ
• للأطفال من 4 إلى 8 سنوات
• ملف PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,23,'2026-10-29T12:00:00.000Z'),
('aa64248d-f859-5fe8-aa9b-9857d16fa77b','كرّاس أنشطة الصف الأول','Grade 1 activity workbook','كرّاس-أنشطة-الصف-الأول',2.0,null,'aa77bcfe-be93-5dea-a57a-750879195d56','images/p/ws-g1-0.jpg',null,true,true,false,true,'كرّاس أنشطة ملوّن للصف الأول فيه أوراق عمل في الرياضيات واللغة العربية والإنجليزية والعلوم، مع ورقة الإجابات وشهادة تقدير.
• جمع وطرح حتى 10 بالصور، مقارنة الأعداد، الحرف الأول، ترتيب الحروف، الحروف الإنجليزية، وحيّ أم غير حيّ.
• 11 صفحة بتصميم كرتوني ملوّن مع صفحة الحلول
• مهارات عامة تناسب هذه المرحلة
• ملف PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,24,'2026-10-29T12:00:00.000Z'),
('918c1eb8-3550-53fa-ac89-c3b1e388bded','كرّاس أنشطة الصف الثاني','Grade 2 activity workbook','كرّاس-أنشطة-الصف-الثاني',2.0,null,'aa77bcfe-be93-5dea-a57a-750879195d56','images/p/ws-g2-0.jpg',null,true,true,true,true,'كرّاس أنشطة ملوّن للصف الثاني فيه أوراق عمل في الرياضيات واللغة العربية والإنجليزية والعلوم، مع ورقة الإجابات وشهادة تقدير.
• جمع وطرح حتى 100، العدّ بالقفز، قراءة الساعة، إكمال الكلمة، الكلمات الإنجليزية، وأين يعيش الحيوان.
• 11 صفحة بتصميم كرتوني ملوّن مع صفحة الحلول
• مهارات عامة تناسب هذه المرحلة
• ملف PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,25,'2026-10-29T12:00:00.000Z'),
('3356f036-7a0e-5fb2-91aa-87a1df9bf5a0','كرّاس أنشطة الصف الثالث','Grade 3 activity workbook','كرّاس-أنشطة-الصف-الثالث',2.0,null,'aa77bcfe-be93-5dea-a57a-750879195d56','images/p/ws-g3-0.jpg',null,true,true,true,true,'كرّاس أنشطة ملوّن للصف الثالث فيه أوراق عمل في الرياضيات واللغة العربية والإنجليزية والعلوم، مع ورقة الإجابات وشهادة تقدير.
• جداول الضرب والقسمة، المصفوفات، الكسور، المفرد والجمع، الأضداد، وحالات المادة.
• 11 صفحة بتصميم كرتوني ملوّن مع صفحة الحلول
• مهارات عامة تناسب هذه المرحلة
• ملف PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,26,'2026-10-29T12:00:00.000Z'),
('a66b2e6a-2b9f-5658-9655-4b0d255fc518','كرّاس أنشطة الصف الرابع','Grade 4 activity workbook','كرّاس-أنشطة-الصف-الرابع',2.0,null,'aa77bcfe-be93-5dea-a57a-750879195d56','images/p/ws-g4-0.jpg',null,true,true,false,true,'كرّاس أنشطة ملوّن للصف الرابع فيه أوراق عمل في الرياضيات واللغة العربية والإنجليزية والعلوم، مع ورقة الإجابات وشهادة تقدير.
• ضرب وقسمة وجمع وطرح بأعداد أكبر، مسائل كلامية، المحيط والمساحة، اسم أم فعل، أكمل الجملة، وصح أم خطأ في العلوم.
• 11 صفحة بتصميم كرتوني ملوّن مع صفحة الحلول
• مهارات عامة تناسب هذه المرحلة
• ملف PDF مقاس A4 جاهز للطباعة، يصلك على واتساب',null,27,'2026-10-29T12:00:00.000Z');
insert into public.product_media (id,product_id,media_type,media_url,sort_order) values
('feaf980b-b794-5996-8864-2f783c323d2f','1227c213-56ba-5663-a141-14382c4bf71a','image','images/p/ws-k1-1.jpg',1),
('1a37ca05-6017-5670-adb1-3acfdb783f96','1227c213-56ba-5663-a141-14382c4bf71a','image','images/p/ws-k1-2.jpg',2),
('a18f4d8e-e9b5-57c2-9369-014222414ee8','1227c213-56ba-5663-a141-14382c4bf71a','image','images/p/ws-k1-3.jpg',3),
('997e8d79-aa6c-5483-9883-96a977dfb466','1227c213-56ba-5663-a141-14382c4bf71a','image','images/p/ws-k1-4.jpg',4),
('28c81185-ebe2-5dd4-be73-c89011816e6e','1227c213-56ba-5663-a141-14382c4bf71a','image','images/p/ws-k1-5.jpg',5),
('df2ddca4-6940-5982-8aa0-13b6c8c5b7e2','1ec51cf9-3ce4-5824-a724-bae68c21852a','image','images/p/ws-k2-1.jpg',1),
('056b092c-2204-5185-b13d-d9742f40a178','1ec51cf9-3ce4-5824-a724-bae68c21852a','image','images/p/ws-k2-2.jpg',2),
('8611d713-46a7-5ab0-bb27-4cba63071096','1ec51cf9-3ce4-5824-a724-bae68c21852a','image','images/p/ws-k2-3.jpg',3),
('e1ab2393-e539-5123-b327-d361021b9099','1ec51cf9-3ce4-5824-a724-bae68c21852a','image','images/p/ws-k2-4.jpg',4),
('d01a3a8f-ad80-5c7b-bc35-a79518c916c1','1ec51cf9-3ce4-5824-a724-bae68c21852a','image','images/p/ws-k2-5.jpg',5),
('4b9b1b57-6793-5def-bc1f-011329bb4b98','1029265f-9c07-5281-8d65-7de33d8f6b1d','image','images/p/ws-k3-1.jpg',1),
('4d0178f0-0356-5366-b575-53832ecea294','1029265f-9c07-5281-8d65-7de33d8f6b1d','image','images/p/ws-k3-2.jpg',2),
('28fe7829-9585-5d19-a792-966b44d39b23','1029265f-9c07-5281-8d65-7de33d8f6b1d','image','images/p/ws-k3-3.jpg',3),
('1c80077a-2ca3-56cd-9b51-6c96f1875579','1029265f-9c07-5281-8d65-7de33d8f6b1d','image','images/p/ws-k3-4.jpg',4),
('321118cb-7dc9-5428-bcc5-8b3f1c68b825','1029265f-9c07-5281-8d65-7de33d8f6b1d','image','images/p/ws-k3-5.jpg',5),
('8ae3bd84-66e9-53e0-acc0-7d00c1b676a7','d8c407e9-237b-5af4-a0f4-af0bcec8b287','image','images/p/ws-k4-1.jpg',1),
('ccff2307-dcda-5ac0-a019-bbc5b2d1e862','d8c407e9-237b-5af4-a0f4-af0bcec8b287','image','images/p/ws-k4-2.jpg',2),
('657f462c-51b1-5c2f-8709-5f606cec3cac','d8c407e9-237b-5af4-a0f4-af0bcec8b287','image','images/p/ws-k4-3.jpg',3),
('1e49d51e-4118-55f8-9d8c-3f106504697d','d8c407e9-237b-5af4-a0f4-af0bcec8b287','image','images/p/ws-k4-4.jpg',4),
('bcd18b19-93b5-54d2-a350-97aeb474ebd1','d8c407e9-237b-5af4-a0f4-af0bcec8b287','image','images/p/ws-k4-5.jpg',5),
('c606e312-c4c9-513b-9268-5e1462dcc0e4','aa64248d-f859-5fe8-aa9b-9857d16fa77b','image','images/p/ws-g1-1.jpg',1),
('a1e61330-41e4-527b-b1f5-e21f329d2bf9','aa64248d-f859-5fe8-aa9b-9857d16fa77b','image','images/p/ws-g1-2.jpg',2),
('3f81b887-f4b8-5f3e-8ee2-51a6e579712d','aa64248d-f859-5fe8-aa9b-9857d16fa77b','image','images/p/ws-g1-3.jpg',3),
('86a7743f-9835-53e1-8caf-a16d3ef7ce8e','aa64248d-f859-5fe8-aa9b-9857d16fa77b','image','images/p/ws-g1-4.jpg',4),
('fe3bad50-3abd-5f18-84c1-1861bc6e2c6a','aa64248d-f859-5fe8-aa9b-9857d16fa77b','image','images/p/ws-g1-5.jpg',5),
('f4e646e4-bd67-55fc-9b2f-3cb659d32686','918c1eb8-3550-53fa-ac89-c3b1e388bded','image','images/p/ws-g2-1.jpg',1),
('692d09b6-559b-5f76-88f0-8434b8d79840','918c1eb8-3550-53fa-ac89-c3b1e388bded','image','images/p/ws-g2-2.jpg',2),
('c4f9d4c7-a856-580d-bbc1-e758f123572d','918c1eb8-3550-53fa-ac89-c3b1e388bded','image','images/p/ws-g2-3.jpg',3),
('add22a2f-4e41-50fc-9a6f-aba3dc61fb20','918c1eb8-3550-53fa-ac89-c3b1e388bded','image','images/p/ws-g2-4.jpg',4),
('fa831b85-9548-5a0a-ac34-cc49f6eb69d2','918c1eb8-3550-53fa-ac89-c3b1e388bded','image','images/p/ws-g2-5.jpg',5),
('e2eae36a-d970-52ce-9e68-12d3ea409833','3356f036-7a0e-5fb2-91aa-87a1df9bf5a0','image','images/p/ws-g3-1.jpg',1),
('1a034947-118a-5074-9e37-9796bc65ab46','3356f036-7a0e-5fb2-91aa-87a1df9bf5a0','image','images/p/ws-g3-2.jpg',2),
('ce24e75e-4475-543d-993e-af6241da520f','3356f036-7a0e-5fb2-91aa-87a1df9bf5a0','image','images/p/ws-g3-3.jpg',3),
('1a64799f-3140-53a8-a26d-015b01729c19','3356f036-7a0e-5fb2-91aa-87a1df9bf5a0','image','images/p/ws-g3-4.jpg',4),
('d22a4aa3-7e18-548b-b17e-cac91df144f8','3356f036-7a0e-5fb2-91aa-87a1df9bf5a0','image','images/p/ws-g3-5.jpg',5),
('8c4e06f2-e853-52c2-9742-cf03d31333c0','a66b2e6a-2b9f-5658-9655-4b0d255fc518','image','images/p/ws-g4-1.jpg',1),
('1871f27a-62b7-5784-87e3-cbf43e63bcb2','a66b2e6a-2b9f-5658-9655-4b0d255fc518','image','images/p/ws-g4-2.jpg',2),
('0414d59e-550b-5ba8-a9cb-90e10fd286fc','a66b2e6a-2b9f-5658-9655-4b0d255fc518','image','images/p/ws-g4-3.jpg',3),
('430ee6cf-8000-58ff-b349-33661b2cf37c','a66b2e6a-2b9f-5658-9655-4b0d255fc518','image','images/p/ws-g4-4.jpg',4),
('09654a80-27ba-560b-979d-01a670aabfbf','a66b2e6a-2b9f-5658-9655-4b0d255fc518','image','images/p/ws-g4-5.jpg',5);
