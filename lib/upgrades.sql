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


