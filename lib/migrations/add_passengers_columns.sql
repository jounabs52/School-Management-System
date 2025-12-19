-- =====================================================
-- ADD MISSING COLUMNS TO PASSENGERS TABLE
-- This migration adds columns for fare, discount, payment, and due date
-- =====================================================

-- Add station_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'passengers' AND column_name = 'station_id'
    ) THEN
        ALTER TABLE passengers ADD COLUMN station_id UUID REFERENCES stations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add base_fare column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'passengers' AND column_name = 'base_fare'
    ) THEN
        ALTER TABLE passengers ADD COLUMN base_fare DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Add discount_percent column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'passengers' AND column_name = 'discount_percent'
    ) THEN
        ALTER TABLE passengers ADD COLUMN discount_percent INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add final_fare column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'passengers' AND column_name = 'final_fare'
    ) THEN
        ALTER TABLE passengers ADD COLUMN final_fare DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Add payment_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'passengers' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE passengers ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid'));
    END IF;
END $$;

-- Add due_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'passengers' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE passengers ADD COLUMN due_date DATE;
    END IF;
END $$;

-- Create index for station_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_passengers_station_id ON passengers(station_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Passengers table columns added successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Added columns:';
    RAISE NOTICE '  ✓ station_id (UUID, references stations)';
    RAISE NOTICE '  ✓ base_fare (DECIMAL)';
    RAISE NOTICE '  ✓ discount_percent (INTEGER)';
    RAISE NOTICE '  ✓ final_fare (DECIMAL)';
    RAISE NOTICE '  ✓ payment_status (VARCHAR - pending/paid)';
    RAISE NOTICE '  ✓ due_date (DATE)';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to use!';
END $$;
