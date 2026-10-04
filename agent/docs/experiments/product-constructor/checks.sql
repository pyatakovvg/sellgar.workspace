-- Run after schema.sql in the same disposable database.
CREATE TABLE public.experiment_result(name text PRIMARY KEY, passed boolean NOT NULL);
CREATE FUNCTION public.assert_true(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF;
 INSERT INTO public.experiment_result VALUES(label,true);
END $$;
CREATE FUNCTION public.expect_error(label text, statement text, expected_state text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual_state text;
BEGIN
 BEGIN
  EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS actual_state=RETURNED_SQLSTATE;
 END;
 PERFORM public.assert_true(label, actual_state=expected_state);
END $$;
BEGIN;
INSERT INTO catalog.unit VALUES('cm','Сантиметр','см');
INSERT INTO catalog.brand VALUES('brand-a','Производитель А');
INSERT INTO catalog.product_type VALUES
 ('00000000-0000-0000-0000-000000000001','Шампунь'),
 ('00000000-0000-0000-0000-000000000002','Майка'),
 ('00000000-0000-0000-0000-000000000003','Штаны'),
 ('00000000-0000-0000-0000-000000000004','Телевизор');
INSERT INTO catalog.property(code,name,kind,multiple,unit_code) VALUES
 ('ph','pH','decimal',false,NULL), ('material','Материал','options',true,NULL),
 ('color','Цвет','options',false,NULL), ('length_cm','Длина','integer',false,'cm'),
 ('smart','Smart TV','boolean',false,NULL), ('description','Текст','text',false,NULL),
 ('release_date','Дата выпуска','date',false,NULL);
INSERT INTO catalog.property_option(property_code,code,name) VALUES
 ('material','cotton','Хлопок'),('material','elastane','Эластан'),
 ('color','blue','Синий'),('color','green','Зеленый');
INSERT INTO catalog.type_product_property VALUES
 ('00000000-0000-0000-0000-000000000001','ph'),
 ('00000000-0000-0000-0000-000000000002','material'),
 ('00000000-0000-0000-0000-000000000003','length_cm'),
 ('00000000-0000-0000-0000-000000000004','smart');
INSERT INTO catalog.type_variant_property VALUES
 ('00000000-0000-0000-0000-000000000002','color');
INSERT INTO catalog.product VALUES
 ('shampoo-a','00000000-0000-0000-0000-000000000001','Шампунь А',NULL,'brand-a'),
 ('shampoo-b','00000000-0000-0000-0000-000000000001','Шампунь Б',NULL,'brand-a'),
 ('shampoo-c','00000000-0000-0000-0000-000000000001','Шампунь В',NULL,'brand-a'),
 ('shirt','00000000-0000-0000-0000-000000000002','Майка',NULL,'brand-a'),
 ('pants','00000000-0000-0000-0000-000000000003','Штаны',NULL,'brand-a'),
 ('tv','00000000-0000-0000-0000-000000000004','Телевизор',NULL,'brand-a');
INSERT INTO catalog.variant VALUES
 ('shampoo-a-mint','shampoo-a','00000000-0000-0000-0000-000000000001','Мята'),
 ('shampoo-b-rose','shampoo-b','00000000-0000-0000-0000-000000000001','Роза'),
 ('shampoo-c-base','shampoo-c','00000000-0000-0000-0000-000000000001','Обычный'),
 ('shirt-blue','shirt','00000000-0000-0000-0000-000000000002','Синяя'),
 ('shirt-green','shirt','00000000-0000-0000-0000-000000000002','Зеленая'),
 ('pants-black','pants','00000000-0000-0000-0000-000000000003','Черные'),
 ('pants-white','pants','00000000-0000-0000-0000-000000000003','Белые'),
 ('tv-base','tv','00000000-0000-0000-0000-000000000004','Стандартный');
INSERT INTO catalog.product_property
 SELECT p.code,p.type_id,f.property_code,d.kind,d.multiple
 FROM catalog.product p JOIN catalog.type_product_property f ON f.type_id=p.type_id
 JOIN catalog.property d ON d.code=f.property_code;
INSERT INTO catalog.variant_property
 SELECT v.code,v.type_id,f.property_code,d.kind,d.multiple
 FROM catalog.variant v JOIN catalog.type_variant_property f ON f.type_id=v.type_id
 JOIN catalog.property d ON d.code=f.property_code;
INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_decimal)
 VALUES('shampoo-a','ph','main','decimal',false,5.5),('shampoo-b','ph','main','decimal',false,6.0),('shampoo-c','ph','main','decimal',false,7.0);
INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_option_code)
 VALUES('shirt','material','cotton','options',true,'cotton'),('shirt','material','elastane','options',true,'elastane');
INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_integer)
 VALUES('pants','length_cm','main','integer',false,0);
INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_boolean)
 VALUES('tv','smart','main','boolean',false,false);
INSERT INTO catalog.variant_property_value(variant_code,property_code,code,kind,multiple,value_option_code)
 VALUES('shirt-blue','color','main','options',false,'blue'),('shirt-green','color','main','options',false,'green');
COMMIT;
SELECT public.assert_true('different values of three products', (SELECT count(DISTINCT value_decimal)=3 FROM catalog.product_property_value WHERE property_code='ph'));
SELECT public.assert_true('numeric range search', (SELECT array_agg(product_code ORDER BY product_code)=ARRAY['shampoo-a','shampoo-b'] FROM catalog.product_property_value WHERE property_code='ph' AND value_decimal BETWEEN 5 AND 6));
SELECT public.assert_true('multiselect two values', (SELECT count(*)=2 FROM catalog.product_property_value WHERE product_code='shirt'));
SELECT public.assert_true('zero and false retained', (SELECT count(*)=2 FROM catalog.product_property_value WHERE value_integer=0 OR value_boolean=false));
SELECT public.expect_error('reject foreign type field','INSERT INTO catalog.product_property VALUES(''shirt'',''00000000-0000-0000-0000-000000000001'',''ph'',''decimal'',false)','23503');
SELECT public.expect_error('reject field not in type','INSERT INTO catalog.product_property VALUES(''shirt'',''00000000-0000-0000-0000-000000000002'',''ph'',''decimal'',false)','23503');
SELECT public.expect_error('reject mismatched variant type','INSERT INTO catalog.variant VALUES(''bad'',''shirt'',''00000000-0000-0000-0000-000000000001'',''Bad'')','23503');
SELECT public.expect_error('reject wrong option property','INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_option_code) VALUES(''shirt'',''material'',''bad'',''options'',true,''blue'')','23503');
SELECT public.expect_error('reject wrong typed column','UPDATE catalog.product_property_value SET value_decimal=NULL,value_text=''5.5'' WHERE product_code=''shampoo-a''','23514');
SELECT public.expect_error('reject two nonnull columns','UPDATE catalog.product_property_value SET value_text=''extra'' WHERE product_code=''shampoo-a''','23514');
SELECT public.expect_error('reject null-only value','UPDATE catalog.product_property_value SET value_decimal=NULL WHERE product_code=''shampoo-a''','23514');
SELECT public.expect_error('reject second singleton','INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_decimal) VALUES(''shampoo-a'',''ph'',''second'',''decimal'',false,4.5)','23505');
SELECT public.expect_error('reject multiplicity spoof','INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_decimal) VALUES(''shampoo-a'',''ph'',''second'',''decimal'',true,4.5)','23503');
SELECT public.expect_error('reject duplicate option choice','INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_option_code) VALUES(''shirt'',''material'',''repeat'',''options'',true,''cotton'')','23505');
SELECT public.expect_error('reject used definition deletion','DELETE FROM catalog.property WHERE code=''ph''','23503');
SELECT public.expect_error('reject used option deletion','DELETE FROM catalog.property_option WHERE property_code=''material'' AND code=''cotton''','23503');
SELECT public.expect_error('reject option on numeric property','INSERT INTO catalog.property_option(property_code,code,name) VALUES(''ph'',''x'',''X'')','23503');
SELECT public.expect_error('reject used property kind change','UPDATE catalog.property SET kind=''text'' WHERE code=''ph''','23503');

SET CONSTRAINTS ALL IMMEDIATE;
-- Explicit immediate checks inside subtransactions exercise deferred triggers without ending the test run.
DO $$ BEGIN
 BEGIN
  INSERT INTO catalog.product VALUES('no-variant','00000000-0000-0000-0000-000000000001','Invalid',NULL,NULL);
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'Expected violation';
 EXCEPTION WHEN check_violation THEN
  INSERT INTO public.experiment_result VALUES('reject product without variant',true);
 END;
END $$;
SELECT public.expect_error('reject any variant deletion','DELETE FROM catalog.variant WHERE code=''shirt-blue''','23514');
SELECT public.expect_error('reject last variant deletion','DELETE FROM catalog.variant WHERE code=''tv-base''','23514');
SELECT public.expect_error('reject product deletion','DELETE FROM catalog.product WHERE code=''shirt''','23514');
SELECT public.expect_error('reject variant truncate','TRUNCATE catalog.variant CASCADE','23514');
SELECT public.expect_error('reject product truncate','TRUNCATE catalog.product CASCADE','23514');
-- Archiving is an update. No child status propagation or restore policy is assumed.
UPDATE catalog.variant SET archived_at=now() WHERE code='shirt-blue';
SELECT public.assert_true('archive variant preserves identity and values',
 EXISTS(SELECT 1 FROM catalog.variant WHERE code='shirt-blue' AND archived_at IS NOT NULL) AND
 EXISTS(SELECT 1 FROM catalog.variant_property_value WHERE variant_code='shirt-blue'));
UPDATE catalog.product SET archived_at=now() WHERE code='shampoo-a';
SELECT public.assert_true('archive product preserves variant and values',
 EXISTS(SELECT 1 FROM catalog.product WHERE code='shampoo-a' AND archived_at IS NOT NULL) AND
 EXISTS(SELECT 1 FROM catalog.variant WHERE product_code='shampoo-a') AND
 EXISTS(SELECT 1 FROM catalog.product_property_value WHERE product_code='shampoo-a'));
-- A new type field is visible in the effective structure without fabricating values.
INSERT INTO catalog.type_product_property VALUES('00000000-0000-0000-0000-000000000001','description');
SELECT public.assert_true('new field reaches existing products without values',
 (SELECT count(*)=3 FROM catalog.product p JOIN catalog.type_product_property f ON f.type_id=p.type_id
 LEFT JOIN catalog.product_property a ON a.product_code=p.code AND a.property_code=f.property_code
 WHERE f.property_code='description' AND a.product_code IS NULL));

-- Same property in another type must survive.
INSERT INTO catalog.type_product_property VALUES('00000000-0000-0000-0000-000000000004','ph');
INSERT INTO catalog.product_property VALUES('tv','00000000-0000-0000-0000-000000000004','ph','decimal',false);
INSERT INTO catalog.product_property_value(product_code,property_code,code,kind,multiple,value_decimal) VALUES('tv','ph','main','decimal',false,9);
DELETE FROM catalog.type_product_property WHERE type_id='00000000-0000-0000-0000-000000000001' AND property_code='ph';
SELECT public.assert_true('cascade deletes all affected assignments',(SELECT count(*)=0 FROM catalog.product_property WHERE product_code LIKE 'shampoo-%' AND property_code='ph'));
SELECT public.assert_true('cascade deletes all affected values',(SELECT count(*)=0 FROM catalog.product_property_value WHERE product_code LIKE 'shampoo-%' AND property_code='ph'));
SELECT public.assert_true('other type retains same property',(SELECT value_decimal=9 FROM catalog.product_property_value WHERE product_code='tv' AND property_code='ph'));
SELECT public.assert_true('definition and products survive',EXISTS(SELECT 1 FROM catalog.property WHERE code='ph') AND (SELECT count(*)=3 FROM catalog.product WHERE code LIKE 'shampoo-%'));
SELECT public.assert_true('deleted field no longer matches numeric search',NOT EXISTS(SELECT 1 FROM catalog.product_property_value WHERE property_code='ph' AND value_decimal BETWEEN 5 AND 6));
INSERT INTO catalog.type_product_property VALUES('00000000-0000-0000-0000-000000000001','ph');
SELECT public.assert_true('readd restores no values',NOT EXISTS(SELECT 1 FROM catalog.product_property_value WHERE product_code LIKE 'shampoo-%' AND property_code='ph'));
DELETE FROM catalog.type_variant_property WHERE type_id='00000000-0000-0000-0000-000000000002' AND property_code='color';
SELECT public.assert_true('variant field cascade deletes assignments and values',NOT EXISTS(SELECT 1 FROM catalog.variant_property WHERE property_code='color') AND NOT EXISTS(SELECT 1 FROM catalog.variant_property_value WHERE property_code='color'));
SELECT count(*) AS passed_checks, bool_and(passed) AS all_passed FROM public.experiment_result;
