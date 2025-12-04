-- =====================================================
-- FIX RLS POLICIES FOR FEE_CHALLANS TABLE
-- =====================================================
-- This script will enable proper access to fee_challans and related tables

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their school's challans" ON fee_challans;
DROP POLICY IF EXISTS "Users can insert their school's challans" ON fee_challans;
DROP POLICY IF EXISTS "Users can update their school's challans" ON fee_challans;
DROP POLICY IF EXISTS "Users can delete their school's challans" ON fee_challans;

-- Disable RLS temporarily (for testing - you can re-enable later)
ALTER TABLE fee_challans DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_challan_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE sections DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled, use these policies instead:
-- (Comment out the DISABLE commands above and uncomment below)

/*
-- Enable RLS
ALTER TABLE fee_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_challan_items ENABLE ROW LEVEL SECURITY;

-- Create policies for fee_challans
CREATE POLICY "Enable read access for all users" ON fee_challans
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON fee_challans
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON fee_challans
    FOR UPDATE
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON fee_challans
    FOR DELETE
    USING (true);

-- Create policies for fee_challan_items
CREATE POLICY "Enable read access for all users" ON fee_challan_items
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON fee_challan_items
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON fee_challan_items
    FOR UPDATE
    USING (true);
*/

-- Grant permissions
GRANT ALL ON fee_challans TO anon, authenticated;
GRANT ALL ON fee_challan_items TO anon, authenticated;
GRANT ALL ON students TO anon, authenticated;
GRANT ALL ON classes TO anon, authenticated;
GRANT ALL ON sections TO anon, authenticated;
GRANT ALL ON fee_types TO anon, authenticated;

-- Verify the changes
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('fee_challans', 'fee_challan_items', 'students', 'classes', 'sections');
