-- =====================================================
-- ADD FEE ITEMS TO EXISTING CHALLANS
-- =====================================================
-- This script adds fee breakdown items to existing challans that don't have any items

-- First, check which challans are missing fee items
SELECT
  fc.id,
  fc.challan_number,
  fc.total_amount,
  COUNT(fci.id) as item_count
FROM fee_challans fc
LEFT JOIN fee_challan_items fci ON fc.id = fci.challan_id
GROUP BY fc.id, fc.challan_number, fc.total_amount
HAVING COUNT(fci.id) = 0;

-- =====================================================
-- OPTION 1: Add a simple breakdown for challans without items
-- =====================================================
-- This adds a breakdown: 70% Tuition, 15% Exam, 8% Library, 7% Sports

-- First, make sure you have fee_types created. Run this to create them if needed:
INSERT INTO fee_types (school_id, fee_name, fee_code, description, category, status, created_at, updated_at)
SELECT
  school_id,
  'Tuition Fee',
  'TUITION',
  'Monthly tuition fee',
  'regular',
  'active',
  NOW(),
  NOW()
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_types WHERE fee_name = 'Tuition Fee' AND school_id = schools.id
);

INSERT INTO fee_types (school_id, fee_name, fee_code, description, category, status, created_at, updated_at)
SELECT
  school_id,
  'Examination Fee',
  'EXAM',
  'Examination fee',
  'regular',
  'active',
  NOW(),
  NOW()
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_types WHERE fee_name = 'Examination Fee' AND school_id = schools.id
);

INSERT INTO fee_types (school_id, fee_name, fee_code, description, category, status, created_at, updated_at)
SELECT
  school_id,
  'Library Fee',
  'LIBRARY',
  'Library fee',
  'regular',
  'active',
  NOW(),
  NOW()
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_types WHERE fee_name = 'Library Fee' AND school_id = schools.id
);

INSERT INTO fee_types (school_id, fee_name, fee_code, description, category, status, created_at, updated_at)
SELECT
  school_id,
  'Sports Fee',
  'SPORTS',
  'Sports and activities fee',
  'regular',
  'active',
  NOW(),
  NOW()
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_types WHERE fee_name = 'Sports Fee' AND school_id = schools.id
);

-- Now add fee items to challans without any items
-- Replace YOUR_SCHOOL_ID with your actual school_id from the schools table
DO $$
DECLARE
  challan_record RECORD;
  tuition_fee_type_id UUID;
  exam_fee_type_id UUID;
  library_fee_type_id UUID;
  sports_fee_type_id UUID;
  school_id_val UUID;
BEGIN
  -- Get the school_id (update this to match your school)
  SELECT id INTO school_id_val FROM schools LIMIT 1;

  -- Get fee type IDs
  SELECT id INTO tuition_fee_type_id FROM fee_types WHERE fee_name = 'Tuition Fee' AND school_id = school_id_val LIMIT 1;
  SELECT id INTO exam_fee_type_id FROM fee_types WHERE fee_name = 'Examination Fee' AND school_id = school_id_val LIMIT 1;
  SELECT id INTO library_fee_type_id FROM fee_types WHERE fee_name = 'Library Fee' AND school_id = school_id_val LIMIT 1;
  SELECT id INTO sports_fee_type_id FROM fee_types WHERE fee_name = 'Sports Fee' AND school_id = school_id_val LIMIT 1;

  -- Loop through challans without items
  FOR challan_record IN
    SELECT fc.id, fc.school_id, fc.total_amount
    FROM fee_challans fc
    LEFT JOIN fee_challan_items fci ON fc.id = fci.challan_id
    WHERE fc.school_id = school_id_val
    GROUP BY fc.id, fc.school_id, fc.total_amount
    HAVING COUNT(fci.id) = 0
  LOOP
    -- Insert fee items for this challan
    INSERT INTO fee_challan_items (school_id, challan_id, fee_type_id, description, amount, created_at, updated_at)
    VALUES
      (challan_record.school_id, challan_record.id, tuition_fee_type_id, 'Tuition Fee', FLOOR(challan_record.total_amount * 0.70), NOW(), NOW()),
      (challan_record.school_id, challan_record.id, exam_fee_type_id, 'Examination Fee', FLOOR(challan_record.total_amount * 0.15), NOW(), NOW()),
      (challan_record.school_id, challan_record.id, library_fee_type_id, 'Library Fee', FLOOR(challan_record.total_amount * 0.08), NOW(), NOW()),
      (challan_record.school_id, challan_record.id, sports_fee_type_id, 'Sports Fee', FLOOR(challan_record.total_amount * 0.07), NOW(), NOW());

    RAISE NOTICE 'Added fee items for challan ID: %', challan_record.id;
  END LOOP;
END $$;

-- Verify the results
SELECT
  fc.challan_number,
  fc.total_amount,
  ft.fee_name,
  fci.amount
FROM fee_challans fc
JOIN fee_challan_items fci ON fc.id = fci.challan_id
JOIN fee_types ft ON fci.fee_type_id = ft.id
ORDER BY fc.challan_number, ft.fee_name;
