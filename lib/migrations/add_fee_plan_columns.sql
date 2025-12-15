-- =====================================================
-- FEE PLAN & DISCOUNT MIGRATION
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD COLUMNS TO CLASSES TABLE
-- =====================================================
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS fee_plan VARCHAR(20) DEFAULT 'monthly'
    CHECK (fee_plan IN ('monthly', 'quarterly', 'semi-annual', 'annual'));

-- =====================================================
-- 2. ADD COLUMNS TO STUDENTS TABLE
-- =====================================================
ALTER TABLE students
ADD COLUMN IF NOT EXISTS fee_plan VARCHAR(20) DEFAULT 'monthly'
    CHECK (fee_plan IN ('monthly', 'quarterly', 'semi-annual', 'annual'));

ALTER TABLE students
ADD COLUMN IF NOT EXISTS starting_month INTEGER DEFAULT 1
    CHECK (starting_month >= 1 AND starting_month <= 12);

ALTER TABLE students
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed'
    CHECK (discount_type IN ('fixed', 'percentage'));

ALTER TABLE students
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;

-- =====================================================
-- 3. ADD COLUMNS TO FEE_CHALLANS TABLE
-- =====================================================
ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS fee_month VARCHAR(50);

ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS fee_year VARCHAR(10);

ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS fee_plan VARCHAR(20)
    CHECK (fee_plan IN ('monthly', 'quarterly', 'semi-annual', 'annual'));

ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS period_label VARCHAR(100);

ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS fee_schedule JSONB;

ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS base_fee NUMERIC(10,2) DEFAULT 0;

ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE fee_challans
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed';

-- =====================================================
-- 4. CREATE INDEXES FOR NEW COLUMNS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_classes_fee_plan ON classes(fee_plan);
CREATE INDEX IF NOT EXISTS idx_students_fee_plan ON students(fee_plan);
CREATE INDEX IF NOT EXISTS idx_students_starting_month ON students(starting_month);
CREATE INDEX IF NOT EXISTS idx_fee_challans_fee_month ON fee_challans(fee_month);
CREATE INDEX IF NOT EXISTS idx_fee_challans_fee_year ON fee_challans(fee_year);
CREATE INDEX IF NOT EXISTS idx_fee_challans_fee_plan ON fee_challans(fee_plan);

-- =====================================================
-- 5. UPDATE EXISTING RECORDS WITH DEFAULTS
-- =====================================================

-- Set default fee_plan for existing classes
UPDATE classes
SET fee_plan = 'monthly'
WHERE fee_plan IS NULL;

-- Set default values for existing students
UPDATE students
SET
    fee_plan = 'monthly',
    starting_month = 1,
    discount_type = 'fixed',
    discount_value = COALESCE(discount_amount, 0)
WHERE fee_plan IS NULL;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fee Plan Migration Completed Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Added to CLASSES table:';
    RAISE NOTICE '  - fee_plan (monthly/quarterly/semi-annual/annual)';
    RAISE NOTICE '';
    RAISE NOTICE 'Added to STUDENTS table:';
    RAISE NOTICE '  - fee_plan (inherited from class)';
    RAISE NOTICE '  - starting_month (1-12)';
    RAISE NOTICE '  - discount_type (fixed/percentage)';
    RAISE NOTICE '  - discount_value (raw discount input)';
    RAISE NOTICE '';
    RAISE NOTICE 'Added to FEE_CHALLANS table:';
    RAISE NOTICE '  - fee_month (e.g., January)';
    RAISE NOTICE '  - fee_year (e.g., 2025)';
    RAISE NOTICE '  - paid_amount (amount already paid)';
    RAISE NOTICE '  - fee_plan (payment frequency)';
    RAISE NOTICE '  - period_label (e.g., Jan-Mar 2025)';
    RAISE NOTICE '';
    RAISE NOTICE 'All existing records updated with defaults.';
    RAISE NOTICE '========================================';
END $$;
