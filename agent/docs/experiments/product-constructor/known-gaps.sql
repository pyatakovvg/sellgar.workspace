-- Run after checks.sql. These assertions demonstrate LIMITATIONS, not correctness.
-- Each experiment rolls back its data changes.
BEGIN;
INSERT INTO catalog.unit VALUES('m','Метр','м');
UPDATE catalog.property SET unit_code='m' WHERE code='length_cm';
SELECT public.assert_true('GAP unit can change with stored values',
 (SELECT unit_code='m' FROM catalog.property WHERE code='length_cm') AND
 EXISTS(SELECT 1 FROM catalog.product_property_value WHERE property_code='length_cm'));
ROLLBACK;

-- The earlier concurrent physical-delete example is withdrawn:
-- DELETE and TRUNCATE of Product/Variant are now rejected.
-- A minimum number of NON-archived variants is not an accepted rule yet.
