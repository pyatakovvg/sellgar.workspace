-- EXPERIMENT ONLY. Not a migration or approved physical schema.
-- PostgreSQL 16; execute only in a disposable, empty database.
-- KNOWN GAP: mutable property unit. Full archive lifecycle remains open.
-- See known-gaps.sql.
-- Scope: product management service only.
CREATE SCHEMA catalog;
CREATE TABLE catalog.unit(code text PRIMARY KEY, name text NOT NULL, symbol text NOT NULL);
CREATE TABLE catalog.brand(code text PRIMARY KEY, name text NOT NULL);
CREATE TABLE catalog.image(uuid uuid PRIMARY KEY);
CREATE TABLE catalog.property(
 code text PRIMARY KEY, name text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('text','integer','decimal','boolean','date','options')),
 multiple boolean NOT NULL DEFAULT false,
 unit_code text REFERENCES catalog.unit(code) ON DELETE RESTRICT,
 UNIQUE(code,kind,multiple), UNIQUE(code,kind)
);
-- Composite option key is a PROPOSED scope of uniqueness, not an accepted rule.
CREATE TABLE catalog.property_option(
 property_code text NOT NULL REFERENCES catalog.property(code) ON DELETE RESTRICT,
 code text NOT NULL, name text NOT NULL,
 property_kind text NOT NULL DEFAULT 'options' CHECK(property_kind='options'),
 PRIMARY KEY(property_code,code),
 FOREIGN KEY(property_code,property_kind) REFERENCES catalog.property(code,kind) ON DELETE RESTRICT
);
CREATE TABLE catalog.option_extra(
 property_code text NOT NULL, option_code text NOT NULL, code text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('TEXT','COLOR','IMAGE')),
 value_text text, value_color text, image_uuid uuid REFERENCES catalog.image(uuid) ON DELETE RESTRICT,
 PRIMARY KEY(property_code,option_code,code),
 FOREIGN KEY(property_code,option_code) REFERENCES catalog.property_option(property_code,code) ON DELETE CASCADE,
 CHECK(num_nonnulls(value_text,value_color,image_uuid)=1),
 CHECK((kind='TEXT' AND value_text IS NOT NULL) OR
       (kind='COLOR' AND value_color IS NOT NULL AND value_color ~ '^#[0-9A-Fa-f]{6}$') OR
       (kind='IMAGE' AND image_uuid IS NOT NULL))
);
-- UUID is an experimental technical key for the type; it has no business code.
CREATE TABLE catalog.product_type(id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE catalog.type_product_property(
 type_id uuid NOT NULL REFERENCES catalog.product_type(id) ON DELETE RESTRICT,
 property_code text NOT NULL REFERENCES catalog.property(code) ON DELETE RESTRICT,
 PRIMARY KEY(type_id,property_code)
);
CREATE TABLE catalog.type_variant_property(
 type_id uuid NOT NULL REFERENCES catalog.product_type(id) ON DELETE RESTRICT,
 property_code text NOT NULL REFERENCES catalog.property(code) ON DELETE RESTRICT,
 PRIMARY KEY(type_id,property_code)
);
CREATE TABLE catalog.product(
 code text PRIMARY KEY, type_id uuid NOT NULL REFERENCES catalog.product_type(id) ON DELETE RESTRICT,
 name text NOT NULL, description text, brand_code text REFERENCES catalog.brand(code) ON DELETE RESTRICT,
 archived_at timestamptz, -- Experimental archive marker; full lifecycle not chosen.
 UNIQUE(code,type_id)
);
CREATE TABLE catalog.variant(
 code text PRIMARY KEY, product_code text NOT NULL, type_id uuid NOT NULL, name text NOT NULL,
 archived_at timestamptz, -- Archiving preserves the existing variant identity.
 FOREIGN KEY(product_code,type_id) REFERENCES catalog.product(code,type_id) ON DELETE RESTRICT,
 UNIQUE(code,type_id), UNIQUE(product_code,code)
);
CREATE TABLE catalog.variant_image(
 variant_code text NOT NULL REFERENCES catalog.variant(code) ON DELETE RESTRICT,
 image_uuid uuid NOT NULL REFERENCES catalog.image(uuid) ON DELETE RESTRICT,
 PRIMARY KEY(variant_code,image_uuid)
);

CREATE TABLE catalog.product_property(
 product_code text NOT NULL, type_id uuid NOT NULL, property_code text NOT NULL,
 kind text NOT NULL, multiple boolean NOT NULL,
 PRIMARY KEY(product_code,property_code),
 UNIQUE(product_code,property_code,kind,multiple),
 FOREIGN KEY(product_code,type_id) REFERENCES catalog.product(code,type_id) ON DELETE RESTRICT,
 FOREIGN KEY(type_id,property_code) REFERENCES catalog.type_product_property(type_id,property_code) ON DELETE CASCADE,
 FOREIGN KEY(property_code,kind,multiple) REFERENCES catalog.property(code,kind,multiple) ON DELETE RESTRICT
);
CREATE TABLE catalog.product_property_value(
 product_code text NOT NULL, property_code text NOT NULL, code text NOT NULL,
 kind text NOT NULL, multiple boolean NOT NULL,
 value_text text, value_integer bigint, value_decimal numeric, value_boolean boolean,
 value_date date, value_option_code text,
 PRIMARY KEY(product_code,property_code,code),
 FOREIGN KEY(product_code,property_code,kind,multiple)
   REFERENCES catalog.product_property(product_code,property_code,kind,multiple) ON DELETE CASCADE,
 FOREIGN KEY(property_code,value_option_code)
   REFERENCES catalog.property_option(property_code,code) ON DELETE RESTRICT,
 CHECK(num_nonnulls(value_text,value_integer,value_decimal,value_boolean,value_date,value_option_code)=1),
 CHECK((kind='text' AND value_text IS NOT NULL) OR
       (kind='integer' AND value_integer IS NOT NULL) OR
       (kind='decimal' AND value_decimal IS NOT NULL) OR
       (kind='boolean' AND value_boolean IS NOT NULL) OR
       (kind='date' AND value_date IS NOT NULL) OR
       (kind='options' AND value_option_code IS NOT NULL))
);
CREATE UNIQUE INDEX product_single_value ON catalog.product_property_value(product_code,property_code) WHERE NOT multiple;
CREATE UNIQUE INDEX product_option_once ON catalog.product_property_value(product_code,property_code,value_option_code) WHERE value_option_code IS NOT NULL;
CREATE INDEX product_integer_search ON catalog.product_property_value(property_code,value_integer,product_code) WHERE value_integer IS NOT NULL;
CREATE INDEX product_decimal_search ON catalog.product_property_value(property_code,value_decimal,product_code) WHERE value_decimal IS NOT NULL;
CREATE INDEX product_option_search ON catalog.product_property_value(property_code,value_option_code,product_code) WHERE value_option_code IS NOT NULL;
CREATE INDEX product_field_cascade ON catalog.product_property(type_id,property_code);

CREATE TABLE catalog.variant_property(
 variant_code text NOT NULL, type_id uuid NOT NULL, property_code text NOT NULL,
 kind text NOT NULL, multiple boolean NOT NULL,
 PRIMARY KEY(variant_code,property_code),
 UNIQUE(variant_code,property_code,kind,multiple),
 FOREIGN KEY(variant_code,type_id) REFERENCES catalog.variant(code,type_id) ON DELETE RESTRICT,
 FOREIGN KEY(type_id,property_code) REFERENCES catalog.type_variant_property(type_id,property_code) ON DELETE CASCADE,
 FOREIGN KEY(property_code,kind,multiple) REFERENCES catalog.property(code,kind,multiple) ON DELETE RESTRICT
);
CREATE TABLE catalog.variant_property_value(
 variant_code text NOT NULL, property_code text NOT NULL, code text NOT NULL,
 kind text NOT NULL, multiple boolean NOT NULL,
 value_text text, value_integer bigint, value_decimal numeric, value_boolean boolean,
 value_date date, value_option_code text,
 PRIMARY KEY(variant_code,property_code,code),
 FOREIGN KEY(variant_code,property_code,kind,multiple)
   REFERENCES catalog.variant_property(variant_code,property_code,kind,multiple) ON DELETE CASCADE,
 FOREIGN KEY(property_code,value_option_code)
   REFERENCES catalog.property_option(property_code,code) ON DELETE RESTRICT,
 CHECK(num_nonnulls(value_text,value_integer,value_decimal,value_boolean,value_date,value_option_code)=1),
 CHECK((kind='text' AND value_text IS NOT NULL) OR
       (kind='integer' AND value_integer IS NOT NULL) OR
       (kind='decimal' AND value_decimal IS NOT NULL) OR
       (kind='boolean' AND value_boolean IS NOT NULL) OR
       (kind='date' AND value_date IS NOT NULL) OR
       (kind='options' AND value_option_code IS NOT NULL))
);
CREATE UNIQUE INDEX variant_single_value ON catalog.variant_property_value(variant_code,property_code) WHERE NOT multiple;
CREATE UNIQUE INDEX variant_option_once ON catalog.variant_property_value(variant_code,property_code,value_option_code) WHERE value_option_code IS NOT NULL;
CREATE INDEX variant_integer_search ON catalog.variant_property_value(property_code,value_integer,variant_code) WHERE value_integer IS NOT NULL;
CREATE INDEX variant_decimal_search ON catalog.variant_property_value(property_code,value_decimal,variant_code) WHERE value_decimal IS NOT NULL;
CREATE INDEX variant_option_search ON catalog.variant_property_value(property_code,value_option_code,variant_code) WHERE value_option_code IS NOT NULL;
CREATE INDEX variant_field_cascade ON catalog.variant_property(type_id,property_code);

-- At least one variant: a proposed deferred constraint, not a plain FK.
CREATE FUNCTION catalog.check_product_has_variant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_code text;
BEGIN
 IF TG_TABLE_NAME='product' THEN owner_code := NEW.code;
 ELSE owner_code := OLD.product_code;
 END IF;
 IF EXISTS(SELECT 1 FROM catalog.product WHERE code=owner_code)
 AND NOT EXISTS(SELECT 1 FROM catalog.variant WHERE product_code=owner_code) THEN
   RAISE EXCEPTION 'Product % requires a variant', owner_code USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER product_has_variant AFTER INSERT OR UPDATE ON catalog.product
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION catalog.check_product_has_variant();
-- No physical deletion, even when a product/variant has no dependent rows.
CREATE FUNCTION catalog.reject_entity_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION '% must be archived, never deleted', TG_TABLE_NAME USING ERRCODE='23514';
END $$;
CREATE TRIGGER product_no_delete BEFORE DELETE ON catalog.product
 FOR EACH ROW EXECUTE FUNCTION catalog.reject_entity_delete();
CREATE TRIGGER variant_no_delete BEFORE DELETE ON catalog.variant
 FOR EACH ROW EXECUTE FUNCTION catalog.reject_entity_delete();
CREATE TRIGGER product_no_truncate BEFORE TRUNCATE ON catalog.product
 FOR EACH STATEMENT EXECUTE FUNCTION catalog.reject_entity_delete();
CREATE TRIGGER variant_no_truncate BEFORE TRUNCATE ON catalog.variant
 FOR EACH STATEMENT EXECUTE FUNCTION catalog.reject_entity_delete();
-- This experiment does not model moving variants between products.
CREATE FUNCTION catalog.reject_variant_move() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.product_code,NEW.type_id) IS DISTINCT FROM (OLD.product_code,OLD.type_id) THEN
  RAISE EXCEPTION 'Moving a variant is outside this experiment' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER variant_no_move BEFORE UPDATE ON catalog.variant
 FOR EACH ROW EXECUTE FUNCTION catalog.reject_variant_move();
