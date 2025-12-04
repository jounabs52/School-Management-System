-- =====================================================
-- CHECK AND FIX CHALLAN ITEMS
-- =====================================================

-- Step 1: Check which challans are missing fee items
SELECT
  fc.id,
  fc.challan_number,
  fc.total_amount,
  fc.student_id,
  s.first_name || ' ' || s.last_name as student_name,
  COUNT(fci.id) as item_count
FROM fee_challans fc
LEFT JOIN fee_challan_items fci ON fc.id = fci.challan_id
LEFT JOIN students s ON fc.student_id = s.id
GROUP BY fc.id, fc.challan_number, fc.total_amount, fc.student_id, s.first_name, s.last_name
ORDER BY fc.created_at DESC;

-- Step 2: Check existing fee types
SELECT id, fee_name, fee_code, school_id
FROM fee_types
ORDER BY fee_name;

-- Step 3: For the challan with total 8000, add the proper breakdown
-- You need to replace these UUIDs with actual IDs from your database

-- First, let's create the fee types if they don't exist:

-- Monthly Fee
INSERT INTO fee_types (school_id, fee_name, fee_code, description, category, status, created_at, updated_at)
SELECT
  school_id,
  'Monthly Fee',
  'MONTHLY',
  'Monthly tuition fee',
  'regular',
  'active',
  NOW(),
  NOW()
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_types WHERE fee_name = 'Monthly Fee' AND school_id = schools.id
)
LIMIT 1;

-- Musjid Fund
INSERT INTO fee_types (school_id, fee_name, fee_code, description, category, status, created_at, updated_at)
SELECT
  school_id,
  'Musjid Fund',
  'MUSJID',
  'Mosque fund contribution',
  'other',
  'active',
  NOW(),
  NOW()
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_types WHERE fee_name = 'Musjid Fund' AND school_id = schools.id
)
LIMIT 1;

-- Admission Fees
INSERT INTO fee_types (school_id, fee_name, fee_code, description, category, status, created_at, updated_at)
SELECT
  school_id,
  'Admission fees',
  'ADMISSION',
  'One-time admission fee',
  'admission',
  'active',
  NOW(),
  NOW()
FROM schools
WHERE NOT EXISTS (
  SELECT 1 FROM fee_types WHERE fee_name = 'Admission fees' AND school_id = schools.id
)
LIMIT 1;

-- Step 4: Now add the items to challans without items
DO $$
DECLARE
  challan_record RECORD;
  monthly_fee_type_id UUID;
  musjid_fund_type_id UUID;
  admission_fee_type_id UUID;
  school_id_val UUID;
BEGIN
  -- Get the school_id
  SELECT id INTO school_id_val FROM schools LIMIT 1;

  -- Get fee type IDs
  SELECT id INTO monthly_fee_type_id FROM fee_types WHERE fee_name = 'Monthly Fee' AND school_id = school_id_val LIMIT 1;
  SELECT id INTO musjid_fund_type_id FROM fee_types WHERE fee_name = 'Musjid Fund' AND school_id = school_id_val LIMIT 1;
  SELECT id INTO admission_fee_type_id FROM fee_types WHERE fee_name = 'Admission fees' AND school_id = school_id_val LIMIT 1;

  RAISE NOTICE 'Fee Type IDs - Monthly: %, Musjid: %, Admission: %', monthly_fee_type_id, musjid_fund_type_id, admission_fee_type_id;

  -- Loop through challans without items
  FOR challan_record IN
    SELECT fc.id, fc.school_id, fc.total_amount
    FROM fee_challans fc
    LEFT JOIN fee_challan_items fci ON fc.id = fci.challan_id
    WHERE fc.school_id = school_id_val
    GROUP BY fc.id, fc.school_id, fc.total_amount
    HAVING COUNT(fci.id) = 0
  LOOP
    RAISE NOTICE 'Processing challan ID: % with total: %', challan_record.id, challan_record.total_amount;

    -- Check if total is 8000 (3000 + 2000 + 3000)
    IF challan_record.total_amount >= 7000 AND challan_record.total_amount <= 9000 THEN
      -- Add the proper breakdown for challans with total around 8000
      INSERT INTO fee_challan_items (school_id, challan_id, fee_type_id, description, amount, created_at, updated_at)
      VALUES
        (challan_record.school_id, challan_record.id, monthly_fee_type_id, 'Monthly Fee', 3000, NOW(), NOW()),
        (challan_record.school_id, challan_record.id, musjid_fund_type_id, 'Musjid Fund', 2000, NOW(), NOW()),
        (challan_record.school_id, challan_record.id, admission_fee_type_id, 'Admission fees', 3000, NOW(), NOW());

      RAISE NOTICE 'Added 3 fee items (Monthly: 3000, Musjid: 2000, Admission: 3000) for challan ID: %', challan_record.id;
    ELSE
      -- For other amounts, add Monthly Fee only
      INSERT INTO fee_challan_items (school_id, challan_id, fee_type_id, description, amount, created_at, updated_at)
      VALUES
        (challan_record.school_id, challan_record.id, monthly_fee_type_id, 'Monthly Fee', challan_record.total_amount, NOW(), NOW());

      RAISE NOTICE 'Added single Monthly Fee item for challan ID: % with amount: %', challan_record.id, challan_record.total_amount;
    END IF;
  END LOOP;
END $$;

-- Step 5: Verify the results
SELECT
  fc.challan_number,
  fc.total_amount as challan_total,
  ft.fee_name,
  fci.description,
  fci.amount,
  s.first_name || ' ' || s.last_name as student_name
FROM fee_challans fc
JOIN fee_challan_items fci ON fc.id = fci.challan_id
JOIN fee_types ft ON fci.fee_type_id = ft.id
JOIN students s ON fc.student_id = s.id
ORDER BY fc.challan_number, ft.fee_name;

-- Step 6: Verify totals match
SELECT
  fc.challan_number,
  fc.total_amount as challan_total,
  SUM(fci.amount) as items_total,
  CASE
    WHEN fc.total_amount = SUM(fci.amount) THEN '✓ Match'
    ELSE '✗ Mismatch'
  END as status
FROM fee_challans fc
LEFT JOIN fee_challan_items fci ON fc.id = fci.challan_id
GROUP BY fc.id, fc.challan_number, fc.total_amount
ORDER BY fc.challan_number;
