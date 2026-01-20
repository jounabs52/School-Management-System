-- Update existing roll_no_slips to add class_id from their students
-- This fixes old slips that were created before class_id was being stored

UPDATE roll_no_slips
SET class_id = students.current_class_id
FROM students
WHERE roll_no_slips.student_id = students.id
  AND roll_no_slips.class_id IS NULL;

-- Verify the update
SELECT
  COUNT(*) as total_slips,
  COUNT(class_id) as slips_with_class_id,
  COUNT(*) - COUNT(class_id) as slips_without_class_id
FROM roll_no_slips;


-- Fix job_applications status check constraint to match the application code
-- Simplified to only 3 statuses: pending, scheduled, rejected

-- STEP 1: First, update all existing records with old status values to new ones
-- This must be done BEFORE dropping the constraint
UPDATE job_applications SET status = 'pending'
WHERE status IN ('shortlisted', 'short-listed', 'qualified', 'schedule', 'hired', 'pending');

UPDATE job_applications SET status = 'rejected'
WHERE status NOT IN ('pending', 'scheduled', 'rejected');

-- STEP 2: Now drop the existing constraint
ALTER TABLE job_applications
DROP CONSTRAINT IF EXISTS job_applications_status_check;

-- STEP 3: Add the new constraint with the simplified status values
ALTER TABLE job_applications
ADD CONSTRAINT job_applications_status_check
CHECK (
  status IN (
    'pending',
    'scheduled',
    'rejected'
  )
);

-- STEP 4: Add comment
COMMENT ON COLUMN job_applications.status IS 'Application status: pending (awaiting review), scheduled (interview scheduled), rejected (not moving forward)';



-- Create exam_schedules table
-- This table stores individual subject schedules for exams

CREATE TABLE IF NOT EXISTS public.exam_schedules (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  exam_id uuid NOT NULL,
  class_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  exam_date date NOT NULL,
  start_time time without time zone NULL,
  end_time time without time zone NULL,
  total_marks numeric(10, 2) NOT NULL DEFAULT 100,
  passing_marks numeric(10, 2) NULL DEFAULT 40,
  room_number character varying(50) NULL,
  invigilator_id uuid NULL,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT exam_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT exam_schedules_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
  CONSTRAINT exam_schedules_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE,
  CONSTRAINT exam_schedules_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT exam_schedules_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE,
  CONSTRAINT exam_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT exam_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT exam_schedules_invigilator_id_fkey FOREIGN KEY (invigilator_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_schedules_school_id ON public.exam_schedules USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_id ON public.exam_schedules USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_class_id ON public.exam_schedules USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_subject_id ON public.exam_schedules USING btree (subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_user_id ON public.exam_schedules USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_date ON public.exam_schedules USING btree (exam_date);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_school_exam ON public.exam_schedules USING btree (school_id, exam_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_exam_schedules_updated_at
BEFORE UPDATE ON public.exam_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create datesheet_schedules table
-- This table stores individual subject schedules for datesheets

CREATE TABLE IF NOT EXISTS public.datesheet_schedules (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  datesheet_id uuid NOT NULL,
  class_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  exam_date date NOT NULL,
  start_time time without time zone NULL,
  end_time time without time zone NULL,
  total_marks numeric(10, 2) NULL DEFAULT 100,
  passing_marks numeric(10, 2) NULL DEFAULT 40,
  room_number character varying(50) NULL,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT datesheet_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT datesheet_schedules_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
  CONSTRAINT datesheet_schedules_datesheet_id_fkey FOREIGN KEY (datesheet_id) REFERENCES public.datesheets(id) ON DELETE CASCADE,
  CONSTRAINT datesheet_schedules_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT datesheet_schedules_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE,
  CONSTRAINT datesheet_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT datesheet_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_datesheet_schedules_school_id ON public.datesheet_schedules USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_datesheet_schedules_datesheet_id ON public.datesheet_schedules USING btree (datesheet_id);
CREATE INDEX IF NOT EXISTS idx_datesheet_schedules_class_id ON public.datesheet_schedules USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_datesheet_schedules_subject_id ON public.datesheet_schedules USING btree (subject_id);
CREATE INDEX IF NOT EXISTS idx_datesheet_schedules_user_id ON public.datesheet_schedules USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_datesheet_schedules_exam_date ON public.datesheet_schedules USING btree (exam_date);
CREATE INDEX IF NOT EXISTS idx_datesheet_schedules_school_datesheet ON public.datesheet_schedules USING btree (school_id, datesheet_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_datesheet_schedules_updated_at
BEFORE UPDATE ON public.datesheet_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.datesheet_schedules IS 'Stores individual subject schedules for datesheets including date, time, and marks allocation';
COMMENT ON COLUMN public.datesheet_schedules.school_id IS 'Reference to the school';
COMMENT ON COLUMN public.datesheet_schedules.datesheet_id IS 'Reference to the parent datesheet';
COMMENT ON COLUMN public.datesheet_schedules.class_id IS 'Reference to the class';
COMMENT ON COLUMN public.datesheet_schedules.subject_id IS 'Reference to the subject';
COMMENT ON COLUMN public.datesheet_schedules.exam_date IS 'Date of the exam for this subject';
COMMENT ON COLUMN public.datesheet_schedules.start_time IS 'Start time of the exam';
COMMENT ON COLUMN public.datesheet_schedules.end_time IS 'End time of the exam';
COMMENT ON COLUMN public.datesheet_schedules.total_marks IS 'Total marks for this subject';
COMMENT ON COLUMN public.datesheet_schedules.passing_marks IS 'Minimum marks required to pass';
COMMENT ON COLUMN public.datesheet_schedules.user_id IS 'User who manages this schedule';


-- Add user_id column to test_subjects table
-- This column is required for tracking which user manages each test subject entry

-- Step 1: Add the column as nullable first
ALTER TABLE public.test_subjects
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Step 2: Update existing rows with a default user_id from the school's first user
-- This query finds the first user for each school and updates the test_subjects
UPDATE public.test_subjects ts
SET user_id = (
  SELECT u.id
  FROM public.users u
  WHERE u.school_id = ts.school_id
  LIMIT 1
)
WHERE ts.user_id IS NULL;

-- Step 3: Now make the column NOT NULL and add foreign key constraint
ALTER TABLE public.test_subjects
ALTER COLUMN user_id SET NOT NULL;

-- Drop the constraint if it exists, then add it
ALTER TABLE public.test_subjects
DROP CONSTRAINT IF EXISTS test_subjects_user_id_fkey;

ALTER TABLE public.test_subjects
ADD CONSTRAINT test_subjects_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_test_subjects_user_id ON public.test_subjects USING btree (user_id);

-- Step 5: Add comment to describe the column
COMMENT ON COLUMN public.test_subjects.user_id IS 'User who manages this test subject entry';


-- Add user_id column to test_marks table
-- This column is required for tracking which user manages each test mark entry

-- Step 1: Add the column as nullable first
ALTER TABLE public.test_marks
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Step 2: Update existing rows with a default user_id from the school's first user
-- This query finds the first user for each school and updates the test_marks
UPDATE public.test_marks tm
SET user_id = (
  SELECT u.id
  FROM public.users u
  WHERE u.school_id = tm.school_id
  LIMIT 1
)
WHERE tm.user_id IS NULL;

-- Step 3: Now make the column NOT NULL and add foreign key constraint
ALTER TABLE public.test_marks
ALTER COLUMN user_id SET NOT NULL;

-- Drop the constraint if it exists, then add it
ALTER TABLE public.test_marks
DROP CONSTRAINT IF EXISTS test_marks_user_id_fkey;

ALTER TABLE public.test_marks
ADD CONSTRAINT test_marks_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_test_marks_user_id ON public.test_marks USING btree (user_id);

-- Step 5: Add comment to describe the column
COMMENT ON COLUMN public.test_marks.user_id IS 'User who manages this test mark entry';



-- Add class_id column to roll_no_slips table
-- This allows us to store which class a slip was generated for

-- Add the class_id column
ALTER TABLE roll_no_slips
ADD COLUMN IF NOT EXISTS class_id UUID;

-- Add foreign key constraint to classes table
ALTER TABLE roll_no_slips
ADD CONSTRAINT roll_no_slips_class_id_fkey
FOREIGN KEY (class_id)
REFERENCES classes(id)
ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roll_no_slips_class_id
ON roll_no_slips(class_id);

-- Add comment
COMMENT ON COLUMN roll_no_slips.class_id IS 'The class this slip was generated for (stored at generation time)';


-- Add all missing columns to job_applications table
-- Note: applicant_name already exists in the database

-- Add cnic_number column
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS cnic_number TEXT;

-- Add father_name column
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS father_name TEXT;

-- Add email column
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add mobile_number column
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Add subjects column (for department/subject preference)
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS subjects TEXT;

-- Add experience_level column
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- Add photo_url column
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add status column if it doesn't exist
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add application_date column if it doesn't exist
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_by column (foreign key to users table)
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add comments to describe the columns
COMMENT ON COLUMN job_applications.applicant_name IS 'Full name of the job applicant';
COMMENT ON COLUMN job_applications.cnic_number IS 'National ID card number of the applicant';
COMMENT ON COLUMN job_applications.father_name IS 'Father name of the applicant';
COMMENT ON COLUMN job_applications.email IS 'Email address of the applicant';
COMMENT ON COLUMN job_applications.mobile_number IS 'Mobile phone number of the applicant';
COMMENT ON COLUMN job_applications.subjects IS 'Subject/Department preference';
COMMENT ON COLUMN job_applications.experience_level IS 'Experience level (fresher, 1-2 years, 3-5 years, 5+ years)';
COMMENT ON COLUMN job_applications.photo_url IS 'URL or base64 data for applicant photo';
COMMENT ON COLUMN job_applications.status IS 'Application status: pending (awaiting review), scheduled (interview scheduled), rejected (not moving forward)';
COMMENT ON COLUMN job_applications.application_date IS 'Date when the application was submitted';
COMMENT ON COLUMN job_applications.created_by IS 'User ID of the person who created this application record';





-- Add user_id column to book_issues table
-- This column is required for tracking which user manages each book issue entry

-- Step 1: Add the column as nullable first
ALTER TABLE public.book_issues
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Step 2: Update existing rows with a default user_id from the school's first user
-- This query finds the first user for each school and updates the book_issues
UPDATE public.book_issues bi
SET user_id = (
  SELECT u.id
  FROM public.users u
  WHERE u.school_id = bi.school_id
  LIMIT 1
)
WHERE bi.user_id IS NULL;

-- Step 3: Now make the column NOT NULL and add foreign key constraint
ALTER TABLE public.book_issues
ALTER COLUMN user_id SET NOT NULL;

-- Drop the constraint if it exists, then add it
ALTER TABLE public.book_issues
DROP CONSTRAINT IF EXISTS book_issues_user_id_fkey;

ALTER TABLE public.book_issues
ADD CONSTRAINT book_issues_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_book_issues_user_id ON public.book_issues USING btree (user_id);

-- Step 5: Add comment to describe the column
COMMENT ON COLUMN public.book_issues.user_id IS 'User who manages this book issue entry';


-- Add user_id column to staff_attendance table
-- This column is required for tracking which user manages each staff attendance entry

-- Step 1: Add the column as nullable first
ALTER TABLE public.staff_attendance
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Step 2: Update existing rows with a default user_id from the school's first user
-- This query finds the first user for each school and updates the staff_attendance
UPDATE public.staff_attendance sa
SET user_id = (
  SELECT u.id
  FROM public.users u
  WHERE u.school_id = sa.school_id
  LIMIT 1
)
WHERE sa.user_id IS NULL;

-- Step 3: Now make the column NOT NULL and add foreign key constraint
ALTER TABLE public.staff_attendance
ALTER COLUMN user_id SET NOT NULL;

-- Drop the constraint if it exists, then add it
ALTER TABLE public.staff_attendance
DROP CONSTRAINT IF EXISTS staff_attendance_user_id_fkey;

ALTER TABLE public.staff_attendance
ADD CONSTRAINT staff_attendance_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_attendance_user_id ON public.staff_attendance USING btree (user_id);

-- Step 5: Add comment to describe the column
COMMENT ON COLUMN public.staff_attendance.user_id IS 'User who manages this staff attendance entry';


-- Add user_id column to expenses table
-- This column is required for tracking which user manages each expense entry

-- Step 1: Add the column as nullable first
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Step 2: Update existing rows with a default user_id from the school's first user
-- This query finds the first user for each school and updates the expenses
UPDATE public.expenses e
SET user_id = (
  SELECT u.id
  FROM public.users u
  WHERE u.school_id = e.school_id
  LIMIT 1
)
WHERE e.user_id IS NULL;

-- Step 3: Now make the column NOT NULL and add foreign key constraint
ALTER TABLE public.expenses
ALTER COLUMN user_id SET NOT NULL;

-- Drop the constraint if it exists, then add it
ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses USING btree (user_id);

-- Step 5: Add comment to describe the column
COMMENT ON COLUMN public.expenses.user_id IS 'User who manages this expense entry';


-- Enable RLS and create policies for transport_passengers table
-- This table was missing RLS policies which prevented queries from returning data

-- Enable Row Level Security (RLS)
ALTER TABLE public.transport_passengers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.transport_passengers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.transport_passengers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.transport_passengers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.transport_passengers;

-- Create RLS policies for transport_passengers (Allow all authenticated users)
CREATE POLICY "Enable read access for authenticated users"
  ON public.transport_passengers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.transport_passengers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON public.transport_passengers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON public.transport_passengers FOR DELETE
  TO authenticated
  USING (true);


-- Add amount_paid and dues columns to salary_payments table for partial payment tracking
-- This allows tracking partial salary payments and outstanding dues

-- Step 1: Add the columns as nullable first
ALTER TABLE public.salary_payments
ADD COLUMN IF NOT EXISTS amount_paid numeric(12, 2);

ALTER TABLE public.salary_payments
ADD COLUMN IF NOT EXISTS dues numeric(12, 2);

-- Step 2: Update existing records - for paid status, set amount_paid = net_salary and dues = 0
UPDATE public.salary_payments
SET amount_paid = net_salary,
    dues = 0
WHERE status = 'paid' AND amount_paid IS NULL;

-- Step 3: Update existing records - for pending status, set amount_paid = 0 and dues = net_salary
UPDATE public.salary_payments
SET amount_paid = 0,
    dues = net_salary
WHERE status = 'pending' AND amount_paid IS NULL;

-- Step 4: Make the columns NOT NULL with default values
ALTER TABLE public.salary_payments
ALTER COLUMN amount_paid SET DEFAULT 0,
ALTER COLUMN amount_paid SET NOT NULL;

ALTER TABLE public.salary_payments
ALTER COLUMN dues SET DEFAULT 0,
ALTER COLUMN dues SET NOT NULL;

-- Step 5: Drop the old status check constraint
ALTER TABLE public.salary_payments
DROP CONSTRAINT IF EXISTS salary_payments_status_check;

-- Step 6: Add updated status check constraint to include 'partial'
ALTER TABLE public.salary_payments
ADD CONSTRAINT salary_payments_status_check CHECK (
  (status)::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'partial'::character varying, 'cancelled'::character varying]::text[])
);

-- Step 7: Add comments to describe the columns
COMMENT ON COLUMN public.salary_payments.amount_paid IS 'Amount paid to staff member (for partial payments tracking)';
COMMENT ON COLUMN public.salary_payments.dues IS 'Outstanding dues remaining to be paid';


-- Make user_id column nullable in staff table
-- This allows staff members to exist without login credentials
-- user_id should only be set when a staff member is given system access

ALTER TABLE public.staff
ALTER COLUMN user_id DROP NOT NULL;

-- Drop the trigger that auto-sets user_id to the current user
-- This was causing all staff added by the same admin to have the same user_id
DROP TRIGGER IF EXISTS trigger_set_user_id_staff ON public.staff;

-- Add comment to clarify the purpose of user_id
COMMENT ON COLUMN public.staff.user_id IS 'Auth user ID - only set when staff member has login credentials. NULL for staff without system access.';

-- Fix staff_permissions table to allow NULL user_id (if table exists)
-- Staff without login credentials won't have permissions records
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'staff_permissions'
    ) THEN
        -- Make user_id nullable in staff_permissions
        ALTER TABLE public.staff_permissions ALTER COLUMN user_id DROP NOT NULL;

        -- Drop any triggers that auto-create staff_permissions on staff insert
        EXECUTE (
            SELECT string_agg(format('DROP TRIGGER IF EXISTS %I ON public.staff;', tgname), ' ')
            FROM pg_trigger
            WHERE tgrelid = 'public.staff'::regclass
            AND tgname LIKE '%permission%'
        );

        RAISE NOTICE 'staff_permissions table updated - user_id is now nullable';
    ELSE
        RAISE NOTICE 'staff_permissions table does not exist - skipping';
    END IF;
END $$;


-- Rename paid_by to user_id in salary_payments table
-- This provides consistency with other tables in the system

DO $$
BEGIN
    -- Check if paid_by column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'salary_payments'
        AND column_name = 'paid_by'
    ) THEN
        -- Rename paid_by to user_id
        ALTER TABLE public.salary_payments RENAME COLUMN paid_by TO user_id;

        RAISE NOTICE 'salary_payments.paid_by renamed to user_id';
    ELSE
        RAISE NOTICE 'Column paid_by does not exist in salary_payments - skipping';
    END IF;
END $$;

COMMENT ON COLUMN public.salary_payments.user_id IS 'User ID of the admin who processed the payment';


-- Update salary_slips foreign key to CASCADE on delete
-- This ensures that when a salary payment is deleted, its slips are also deleted

DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'salary_slips'
    ) THEN
        -- Drop existing foreign key constraint
        ALTER TABLE public.salary_slips
        DROP CONSTRAINT IF EXISTS salary_slips_payment_id_fkey;

        -- Add new foreign key constraint with CASCADE delete
        ALTER TABLE public.salary_slips
        ADD CONSTRAINT salary_slips_payment_id_fkey
        FOREIGN KEY (payment_id)
        REFERENCES public.salary_payments(id)
        ON DELETE CASCADE;

        RAISE NOTICE 'salary_slips foreign key updated to CASCADE on delete';
    ELSE
        RAISE NOTICE 'salary_slips table does not exist - skipping';
    END IF;
END $$;


-- ====================================================================
-- COMPREHENSIVE FIX FOR DELETE PAYMENT ISSUES
-- ====================================================================

-- Step 1: Drop ALL existing RLS policies on salary_payments
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'salary_payments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.salary_payments', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 2: Drop ALL existing RLS policies on salary_slips
DO $$
DECLARE
    pol record;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'salary_slips'
    ) THEN
        FOR pol IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'salary_slips'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.salary_slips', pol.policyname);
            RAISE NOTICE 'Dropped policy: %', pol.policyname;
        END LOOP;
    END IF;
END $$;

-- Step 3: Disable RLS completely on both tables
ALTER TABLE public.salary_payments DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'salary_slips'
    ) THEN
        EXECUTE 'ALTER TABLE public.salary_slips DISABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'RLS disabled on salary_slips';
    END IF;
END $$;

-- Step 4: Force update foreign key to CASCADE delete (more aggressive approach)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'salary_slips'
    ) THEN
        -- Drop ALL foreign key constraints on payment_id
        EXECUTE (
            SELECT string_agg(
                format('ALTER TABLE public.salary_slips DROP CONSTRAINT IF EXISTS %I', constraint_name),
                '; '
            )
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
            AND table_name = 'salary_slips'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%payment_id%'
        );

        -- Re-add foreign key with CASCADE delete
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'salary_slips'
            AND column_name = 'payment_id'
        ) THEN
            ALTER TABLE public.salary_slips
            ADD CONSTRAINT salary_slips_payment_id_fkey
            FOREIGN KEY (payment_id)
            REFERENCES public.salary_payments(id)
            ON DELETE CASCADE;

            RAISE NOTICE 'Foreign key re-created with CASCADE delete';
        END IF;
    END IF;
END $$;

-- Step 5: Grant DELETE permissions explicitly
GRANT DELETE ON public.salary_payments TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'salary_slips'
    ) THEN
        EXECUTE 'GRANT DELETE ON public.salary_slips TO postgres, anon, authenticated, service_role';
        RAISE NOTICE 'DELETE permissions granted on salary_slips';
    END IF;
END $$;

-- Verification queries (uncomment to check status)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('salary_payments', 'salary_slips');
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('salary_payments', 'salary_slips');


