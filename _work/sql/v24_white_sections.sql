update products set is_visible=true where story is null and category_id in ('3041931d-879b-507d-a2d4-738bcf47c429','34c5e974-ceb6-53ae-bb1e-69f9c1b1efcd','aa77bcfe-be93-5dea-a57a-750879195d56');
update store_settings set config = jsonb_set(jsonb_set(jsonb_set(config,'{theme,bg}','"#FFFFFF"'),'{theme,text}','"#2B1B4F"'),'{theme,hero}','"#FFFFFF"') where id=1;
