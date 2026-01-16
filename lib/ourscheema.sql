
-- ============================================================================
-- COMPLETE SCHOOL MANAGEMENT SYSTEM DATABASE SCHEMA
-- Version: 1.0 | All 57 Tables | Properly Dependency-Ordered
-- ============================================================================
-- 
-- INSTALLATION: Run this entire script in order
-- Database: PostgreSQL 12+ / Supabase
-- Total Tables: 57
-- Estimated Execution Time: 2-5 minutes
--
-- ============================================================================

-- ============================================================================

-- STEP 1: CREATE HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.status = 'paid';
        NEW.balance_amount = 0;
    ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
        NEW.status = 'partial';
        NEW.balance_amount = NEW.total_amount - NEW.paid_amount;
    ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount = 0 THEN
        NEW.status = 'overdue';
        NEW.balance_amount = NEW.total_amount;
    ELSE
        NEW.status = 'pending';
        NEW.balance_amount = NEW.total_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- LEVEL 1: BASE TABLE (No Dependencies)
-- ============================================================================

-- Table 1: SCHOOLS
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name character varying(255) NOT NULL,
  code character varying(50) NOT NULL,
  address text NULL,
  phone character varying(20) NULL,
  email character varying(255) NULL,
  logo_url text NULL,
  established_date date NULL,
  principal_name character varying(255) NULL,
  website character varying(255) NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  subscription_plan character varying(50) NULL DEFAULT 'basic'::character varying,
  subscription_status character varying(20) NULL DEFAULT 'active'::character varying,
  subscription_expires_at timestamp with time zone NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT schools_pkey PRIMARY KEY (id),
  CONSTRAINT schools_code_key UNIQUE (code),
  CONSTRAINT schools_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying]::text[])
  )
);

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LEVEL 2: USERS (Depends: schools)
-- ============================================================================

-- Table 2: USERS
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  username character varying(100) NOT NULL,
  email character varying(255) NOT NULL,
  password character varying(255) NOT NULL,
  role character varying(50) NOT NULL DEFAULT 'teacher'::character varying,
  staff_id uuid NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  last_login timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_school_id_email_key UNIQUE (school_id, email),
  CONSTRAINT users_school_id_username_key UNIQUE (school_id, username),
  CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT users_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying]::text[])
  )
);

CREATE INDEX idx_users_school_id ON public.users USING btree (school_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_staff_id ON public.users USING btree (staff_id);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LEVEL 3: CORE REFERENCE TABLES (Depend on: schools, users)
-- ============================================================================

-- Table 3: SESSIONS
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  name character varying(50) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean NULL DEFAULT false,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_school_id_name_key UNIQUE (school_id, name),
  CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT sessions_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT sessions_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_sessions_school_current ON public.sessions USING btree (school_id, is_current);
CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 4: DEPARTMENTS
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  department_name character varying(100) NOT NULL,
  description text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_school_id_department_name_key UNIQUE (school_id, department_name),
  CONSTRAINT departments_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT departments_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT departments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_departments_school_id ON public.departments USING btree (school_id);
CREATE INDEX idx_departments_user_id ON public.departments USING btree (user_id);

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 5: SUBJECTS
CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  subject_name character varying(100) NOT NULL,
  subject_code character varying(50) NULL,
  subject_type character varying(20) NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT subjects_pkey PRIMARY KEY (id),
  CONSTRAINT subjects_school_id_subject_code_key UNIQUE (school_id, subject_code),
  CONSTRAINT subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT subjects_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT subjects_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  ),
  CONSTRAINT subjects_subject_type_check CHECK (
    (subject_type)::text = ANY (ARRAY['theory'::character varying, 'practical'::character varying, 'both'::character varying]::text[])
  )
);

CREATE INDEX idx_subjects_school_id ON public.subjects USING btree (school_id);
CREATE INDEX idx_subjects_user_id ON public.subjects USING btree (user_id);

-- Table 6: FEE_TYPES
CREATE TABLE public.fee_types (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  fee_name character varying(100) NOT NULL,
  fee_code character varying(50) NULL,
  description text NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT fee_types_pkey PRIMARY KEY (id),
  CONSTRAINT fee_types_school_id_fee_code_key UNIQUE (school_id, fee_code),
  CONSTRAINT fee_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fee_types_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fee_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fee_types_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_fee_types_user_id ON public.fee_types USING btree (user_id);

-- Table 7: GRADE_SCALES
CREATE TABLE public.grade_scales (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  grade_name character varying(10) NOT NULL,
  min_percentage numeric(5, 2) NOT NULL,
  max_percentage numeric(5, 2) NOT NULL,
  grade_point numeric(3, 2) NULL,
  description text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT grade_scales_pkey PRIMARY KEY (id),
  CONSTRAINT grade_scales_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT grade_scales_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT grade_scales_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_grade_scales_user_id ON public.grade_scales USING btree (user_id);

-- Table 8: CONTACT_GROUPS
CREATE TABLE public.contact_groups (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  group_name character varying(100) NOT NULL,
  description text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT contact_groups_pkey PRIMARY KEY (id),
  CONSTRAINT contact_groups_school_id_group_name_key UNIQUE (school_id, group_name),
  CONSTRAINT contact_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT contact_groups_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT contact_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_contact_groups_school_id ON public.contact_groups USING btree (school_id);
CREATE INDEX idx_contact_groups_user_id ON public.contact_groups USING btree (user_id);

CREATE TRIGGER update_contact_groups_updated_at BEFORE UPDATE ON contact_groups 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 9: AUDIT_LOGS
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NULL,
  user_id uuid NULL,
  action character varying(50) NOT NULL,
  table_name character varying(100) NOT NULL,
  record_id uuid NULL,
  old_values jsonb NULL,
  new_values jsonb NULL,
  ip_address inet NULL,
  timestamp timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_action_check CHECK (
    (action)::text = ANY (ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying, 'login'::character varying, 'logout'::character varying]::text[])
  )
);

CREATE INDEX idx_audit_logs_school_user ON public.audit_logs USING btree (school_id, user_id, "timestamp");
CREATE INDEX idx_audit_logs_table ON public.audit_logs USING btree (school_id, table_name, record_id);

-- Table 10: FILE_UPLOADS
CREATE TABLE public.file_uploads (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NULL,
  uploaded_by uuid NULL,
  file_name character varying(255) NOT NULL,
  file_type character varying(50) NULL,
  file_size bigint NULL,
  file_path text NOT NULL,
  upload_date date NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT file_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT file_uploads_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT file_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table 11: REPORT_TEMPLATES
CREATE TABLE public.report_templates (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  report_name character varying(255) NOT NULL,
  report_category character varying(50) NULL,
  description text NULL,
  template_file text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT report_templates_pkey PRIMARY KEY (id),
  CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT report_templates_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT report_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT report_templates_report_category_check CHECK (
    (report_category)::text = ANY (ARRAY['student'::character varying, 'staff'::character varying, 'fee'::character varying, 'exam'::character varying, 'attendance'::character varying, 'other'::character varying]::text[])
  )
);

CREATE INDEX idx_report_templates_school_id ON public.report_templates USING btree (school_id);
CREATE INDEX idx_report_templates_user_id ON public.report_templates USING btree (user_id);

-- Table 12: DATESHEET_CONFIGURATIONS
CREATE TABLE public.datesheet_configurations (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  config_name character varying(255) NOT NULL,
  config_type character varying(50) NOT NULL,
  configuration jsonb NOT NULL,
  is_default boolean NULL DEFAULT false,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT datesheet_configurations_pkey PRIMARY KEY (id),
  CONSTRAINT datesheet_configurations_school_id_config_name_config_type_key UNIQUE (school_id, config_name, config_type),
  CONSTRAINT datesheet_configurations_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT datesheet_configurations_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT datesheet_configurations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT datesheet_configurations_config_type_check CHECK (
    (config_type)::text = ANY (ARRAY['print_settings'::character varying, 'slip_template'::character varying, 'report_template'::character varying]::text[])
  )
);

CREATE INDEX idx_datesheet_configurations_school ON public.datesheet_configurations USING btree (school_id);
CREATE INDEX idx_datesheet_configurations_user_id ON public.datesheet_configurations USING btree (user_id);

CREATE TRIGGER update_datesheet_configurations_updated_at BEFORE UPDATE ON datesheet_configurations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 13: VISITORS
CREATE TABLE public.visitors (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  visitor_name character varying(255) NOT NULL,
  visitor_mobile character varying(20) NOT NULL,
  destination character varying(200) NOT NULL,
  time_in time without time zone NOT NULL,
  time_out time without time zone NULL,
  visit_details text NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT visitors_pkey PRIMARY KEY (id),
  CONSTRAINT visitors_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT visitors_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT visitors_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_visitors_school_id ON public.visitors USING btree (school_id);
CREATE INDEX idx_visitors_visit_date ON public.visitors USING btree (visit_date);
CREATE INDEX idx_visitors_mobile ON public.visitors USING btree (visitor_mobile);
CREATE INDEX idx_visitors_user_id ON public.visitors USING btree (user_id);

CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON visitors 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LEVEL 4: STAFF (Depends on: schools, users)
-- ============================================================================

-- Table 14: STAFF
CREATE TABLE public.staff (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  employee_number character varying(50) NOT NULL,
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NULL,
  father_name character varying(255) NULL,
  date_of_birth date NULL,
  gender character varying(20) NULL,
  blood_group character varying(10) NULL,
  religion character varying(50) NULL,
  nationality character varying(50) NULL DEFAULT 'Pakistan'::character varying,
  photo_url text NULL,
  phone character varying(20) NULL,
  email character varying(255) NULL,
  alternate_phone character varying(20) NULL,
  address text NULL,
  city character varying(100) NULL,
  state character varying(100) NULL,
  postal_code character varying(20) NULL,
  joining_date date NOT NULL,
  designation character varying(100) NULL,
  department character varying(100) NULL,
  qualification character varying(255) NULL,
  experience_years integer NULL,
  employment_type character varying(20) NULL,
  marital_status character varying(20) NULL,
  emergency_contact_name character varying(255) NULL,
  emergency_contact_phone character varying(20) NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  leaving_date date NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  computer_no character varying(50) NULL,
  user_id uuid NOT NULL,
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_school_id_employee_number_key UNIQUE (school_id, employee_number),
  CONSTRAINT staff_school_id_computer_no_key UNIQUE (school_id, computer_no),
  CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT staff_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT staff_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT staff_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'resigned'::character varying, 'terminated'::character varying]::text[])
  ),
  CONSTRAINT staff_gender_check CHECK (
    (gender)::text = ANY (ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying]::text[])
  ),
  CONSTRAINT staff_employment_type_check CHECK (
    (employment_type)::text = ANY (ARRAY['permanent'::character varying, 'contract'::character varying, 'temporary'::character varying]::text[])
  )
);

CREATE INDEX idx_staff_school_id ON public.staff USING btree (school_id);
CREATE INDEX idx_staff_employee_number ON public.staff USING btree (school_id, employee_number);
CREATE INDEX idx_staff_status ON public.staff USING btree (school_id, status);
CREATE INDEX idx_staff_user_id ON public.staff USING btree (user_id);

CREATE TRIGGER trigger_set_user_id_staff BEFORE INSERT ON staff 
FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 15: SALARY_STRUCTURES
CREATE TABLE public.salary_structures (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  basic_salary numeric(12, 2) NOT NULL,
  house_allowance numeric(12, 2) NULL DEFAULT 0,
  medical_allowance numeric(12, 2) NULL DEFAULT 0,
  transport_allowance numeric(12, 2) NULL DEFAULT 0,
  other_allowances numeric(12, 2) NULL DEFAULT 0,
  provident_fund numeric(12, 2) NULL DEFAULT 0,
  tax_deduction numeric(12, 2) NULL DEFAULT 0,
  other_deductions numeric(12, 2) NULL DEFAULT 0,
  gross_salary numeric(12, 2) NOT NULL,
  net_salary numeric(12, 2) NOT NULL,
  effective_from date NOT NULL,
  effective_to date NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT salary_structures_pkey PRIMARY KEY (id),
  CONSTRAINT salary_structures_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT salary_structures_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT salary_structures_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT salary_structures_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT salary_structures_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_salary_structures_user_id ON public.salary_structures USING btree (user_id);

-- Table 16: SALARY_PAYMENTS
CREATE TABLE public.salary_payments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  payment_month integer NOT NULL,
  payment_year integer NOT NULL,
  basic_salary numeric(12, 2) NOT NULL,
  total_allowances numeric(12, 2) NULL DEFAULT 0,
  total_deductions numeric(12, 2) NULL DEFAULT 0,
  gross_salary numeric(12, 2) NOT NULL,
  net_salary numeric(12, 2) NOT NULL,
  payment_date date NOT NULL,
  payment_method character varying(50) NULL,
  transaction_id character varying(255) NULL,
  paid_by uuid NULL,
  status character varying(20) NULL DEFAULT 'pending'::character varying,
  remarks text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT salary_payments_pkey PRIMARY KEY (id),
  CONSTRAINT salary_payments_school_id_staff_id_payment_month_payment_ye_key UNIQUE (school_id, staff_id, payment_month, payment_year),
  CONSTRAINT salary_payments_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT salary_payments_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT salary_payments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT salary_payments_payment_method_check CHECK (
    (payment_method)::text = ANY (ARRAY['cash'::character varying, 'cheque'::character varying, 'bank_transfer'::character varying]::text[])
  ),
  CONSTRAINT salary_payments_payment_month_check CHECK (
    (payment_month >= 1) AND (payment_month <= 12)
  ),
  CONSTRAINT salary_payments_status_check CHECK (
    (status)::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'cancelled'::character varying]::text[])
  )
);

-- Table 17: JOBS
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  department_id uuid NULL,
  title character varying(255) NOT NULL,
  description text NULL,
  salary numeric(12, 2) NULL,
  deadline date NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT jobs_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT jobs_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT jobs_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'closed'::character varying, 'on-hold'::character varying]::text[])
  )
);

CREATE INDEX idx_jobs_school_id ON public.jobs USING btree (school_id);
CREATE INDEX idx_jobs_department_id ON public.jobs USING btree (department_id);
CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at DESC);
CREATE INDEX idx_jobs_user_id ON public.jobs USING btree (user_id);

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LEVEL 5: CLASSES & SECTIONS (Depends on: schools, users, staff)
-- ============================================================================

-- Table 18: CLASSES
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  class_name character varying(50) NOT NULL,
  order_number integer NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  class_incharge_id uuid NULL,
  marking_system text NULL,
  incharge character varying(100) NULL,
  exam_marking_system character varying(50) NULL,
  fee_plan character varying(20) NULL DEFAULT 'monthly'::character varying,
  standard_fee numeric(10, 2) NULL DEFAULT 0,
  user_id uuid NOT NULL,
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_school_id_class_name_key UNIQUE (school_id, class_name),
  CONSTRAINT classes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT classes_class_incharge_id_fkey FOREIGN KEY (class_incharge_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT classes_fee_plan_check CHECK (
    (fee_plan)::text = ANY (ARRAY['monthly'::character varying, 'quarterly'::character varying, 'semi-annual'::character varying, 'annual'::character varying, 'one-time'::character varying]::text[])
  ),
  CONSTRAINT classes_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_classes_school_id ON public.classes USING btree (school_id);
CREATE INDEX idx_classes_user_id ON public.classes USING btree (user_id);

CREATE TRIGGER trigger_set_user_id_classes BEFORE INSERT ON classes 
FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 19: SECTIONS
CREATE TABLE public.sections (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  class_id uuid NOT NULL,
  school_id uuid NOT NULL,
  section_name character varying(10) NOT NULL,
  class_teacher_id uuid NULL,
  room_number character varying(50) NULL,
  capacity integer NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT sections_pkey PRIMARY KEY (id),
  CONSTRAINT sections_school_id_class_id_section_name_key UNIQUE (school_id, class_id, section_name),
  CONSTRAINT sections_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT sections_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT sections_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT sections_class_teacher_id_fkey FOREIGN KEY (class_teacher_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT sections_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT sections_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_sections_school_class ON public.sections USING btree (school_id, class_id);
CREATE INDEX idx_sections_user_id ON public.sections USING btree (user_id);

-- Table 20: CLASS_SUBJECTS
CREATE TABLE public.class_subjects (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  class_id uuid NOT NULL,
  school_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  is_compulsory boolean NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT class_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT class_subjects_school_id_class_id_subject_id_key UNIQUE (school_id, class_id, subject_id),
  CONSTRAINT class_subjects_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT class_subjects_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT class_subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT class_subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_class_subjects_user_id ON public.class_subjects USING btree (user_id);

-- Table 21: SUBJECT_TEACHERS
CREATE TABLE public.subject_teachers (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  section_id uuid NULL,
  subject_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  session_id uuid NOT NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT subject_teachers_pkey PRIMARY KEY (id),
  CONSTRAINT subject_teachers_school_id_class_id_section_id_subject_id_s_key UNIQUE (school_id, class_id, section_id, subject_id, session_id),
  CONSTRAINT subject_teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT subject_teachers_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT subject_teachers_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT subject_teachers_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT subject_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT subject_teachers_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT subject_teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT subject_teachers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_subject_teachers_user_id ON public.subject_teachers USING btree (user_id);

-- Table 22: TIMETABLE
CREATE TABLE public.timetable (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  section_id uuid NULL,
  session_id uuid NOT NULL,
  day_of_week character varying(20) NOT NULL,
  period_number integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  subject_id uuid NULL,
  teacher_id uuid NULL,
  room_number character varying(50) NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT timetable_pkey PRIMARY KEY (id),
  CONSTRAINT timetable_school_id_class_id_section_id_session_id_day_of_w_key UNIQUE (school_id, class_id, section_id, session_id, day_of_week, period_number),
  CONSTRAINT timetable_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT timetable_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT timetable_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT timetable_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT timetable_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT timetable_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT timetable_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  CONSTRAINT timetable_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT timetable_day_of_week_check CHECK (
    (day_of_week)::text = ANY (ARRAY['Monday'::character varying, 'Tuesday'::character varying, 'Wednesday'::character varying, 'Thursday'::character varying, 'Friday'::character varying, 'Saturday'::character varying, 'Sunday'::character varying]::text[])
  )
);

CREATE INDEX idx_timetable_school ON public.timetable USING btree (school_id);
CREATE INDEX idx_timetable_class ON public.timetable USING btree (class_id);
CREATE INDEX idx_timetable_section ON public.timetable USING btree (section_id);
CREATE INDEX idx_timetable_session ON public.timetable USING btree (session_id);
CREATE INDEX idx_timetable_day ON public.timetable USING btree (day_of_week);
CREATE INDEX idx_timetable_teacher ON public.timetable USING btree (teacher_id);
CREATE INDEX idx_timetable_user_id ON public.timetable USING btree (user_id);

-- ============================================================================
-- LEVEL 6: STUDENTS (Depends on: schools, users, classes, sections)
-- ============================================================================

-- Table 23: STUDENTS
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  admission_number character varying(50) NOT NULL,
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NULL,
  father_name character varying(255) NULL,
  mother_name character varying(255) NULL,
  date_of_birth date NULL,
  gender character varying(20) NULL,
  blood_group character varying(10) NULL,
  religion character varying(50) NULL,
  caste character varying(50) NULL,
  nationality character varying(50) NULL DEFAULT 'Pakistan'::character varying,
  photo_url text NULL,
  admission_date date NOT NULL,
  current_class_id uuid NULL,
  current_section_id uuid NULL,
  roll_number character varying(20) NULL,
  house character varying(20) NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  base_fee numeric(10, 2) NULL DEFAULT 0,
  discount_note text NULL,
  final_fee numeric(10, 2) NULL DEFAULT 0,
  discount_amount numeric(10, 2) NULL DEFAULT 0,
  whatsapp_number character varying(20) NULL,
  discount_type character varying(20) NULL DEFAULT 'fixed'::character varying,
  discount_value numeric(10, 2) NULL DEFAULT 0,
  fee_plan character varying(20) NULL DEFAULT 'monthly'::character varying,
  starting_month integer NULL DEFAULT 1,
  user_id uuid NOT NULL,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_school_id_admission_number_key UNIQUE (school_id, admission_number),
  CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT students_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT students_fee_plan_check CHECK (
    (fee_plan)::text = ANY (ARRAY['monthly'::character varying, 'quarterly'::character varying, 'semi-annual'::character varying, 'annual'::character varying]::text[])
  ),
  CONSTRAINT students_discount_type_check CHECK (
    (discount_type)::text = ANY (ARRAY['fixed'::character varying, 'percentage'::character varying]::text[])
  ),
  CONSTRAINT students_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'alumni'::character varying, 'transferred'::character varying]::text[])
  ),
  CONSTRAINT students_starting_month_check CHECK (
    (starting_month >= 1) AND (starting_month <= 12)
  ),
  CONSTRAINT students_gender_check CHECK (
    (gender)::text = ANY (ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying]::text[])
  ),
  CONSTRAINT students_house_check CHECK (
    (house)::text = ANY (ARRAY['red'::character varying, 'blue'::character varying, 'green'::character varying, 'yellow'::character varying]::text[])
  )
);

CREATE INDEX idx_students_school_id ON public.students USING btree (school_id);
CREATE INDEX idx_students_admission_number ON public.students USING btree (school_id, admission_number);
CREATE INDEX idx_students_class_section ON public.students USING btree (school_id, current_class_id, current_section_id);
CREATE INDEX idx_students_status ON public.students USING btree (school_id, status);
CREATE INDEX idx_students_user_id ON public.students USING btree (user_id);

CREATE TRIGGER trigger_set_user_id_students BEFORE INSERT ON students 
FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 24: ADMISSION_INQUIRIES
CREATE TABLE public.admission_inquiries (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  session_id uuid NULL,
  class_id uuid NULL,
  inquiry_no character varying(50) NOT NULL,
  name character varying(200) NOT NULL,
  phone character varying(20) NOT NULL,
  email character varying(200) NULL,
  address text NULL,
  gender character varying(20) NULL,
  date_of_birth date NULL,
  father_name character varying(255) NULL,
  father_mobile character varying(20) NULL,
  father_cnic character varying(50) NULL,
  father_qualification character varying(100) NULL,
  father_profession character varying(100) NULL,
  mother_name character varying(255) NULL,
  mother_mobile character varying(20) NULL,
  mother_cnic character varying(50) NULL,
  mother_qualification character varying(100) NULL,
  mother_profession character varying(100) NULL,
  blood_group character varying(10) NULL,
  region character varying(100) NULL,
  current_address text NULL,
  previous_school character varying(255) NULL,
  inquiry_source character varying(100) NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  follow_up_date date NULL,
  note text NULL,
  reference character varying(200) NULL,
  status character varying(50) NULL DEFAULT 'pending'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT admission_inquiries_pkey PRIMARY KEY (id),
  CONSTRAINT admission_inquiries_school_id_inquiry_no_key UNIQUE (school_id, inquiry_no),
  CONSTRAINT admission_inquiries_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT admission_inquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT admission_inquiries_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT admission_inquiries_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  CONSTRAINT admission_inquiries_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  CONSTRAINT admission_inquiries_gender_check CHECK (
    (gender)::text = ANY (ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying]::text[])
  ),
  CONSTRAINT admission_inquiries_status_check CHECK (
    (status)::text = ANY (ARRAY['pending'::character varying, 'contacted'::character varying, 'visited'::character varying, 'admitted'::character varying, 'rejected'::character varying]::text[])
  )
);

CREATE INDEX idx_admission_inquiries_school_id ON public.admission_inquiries USING btree (school_id);
CREATE INDEX idx_admission_inquiries_inquiry_no ON public.admission_inquiries USING btree (inquiry_no);
CREATE INDEX idx_admission_inquiries_phone ON public.admission_inquiries USING btree (phone);
CREATE INDEX idx_admission_inquiries_date ON public.admission_inquiries USING btree (date);
CREATE INDEX idx_admission_inquiries_status ON public.admission_inquiries USING btree (status);
CREATE INDEX idx_admission_inquiries_class_id ON public.admission_inquiries USING btree (class_id);
CREATE INDEX idx_admission_inquiries_session_id ON public.admission_inquiries USING btree (session_id);
CREATE INDEX idx_admission_inquiries_user_id ON public.admission_inquiries USING btree (user_id);

CREATE TRIGGER update_admission_inquiries_updated_at BEFORE UPDATE ON admission_inquiries 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 25: STUDENT_ATTENDANCE
CREATE TABLE public.student_attendance (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL,
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  section_id uuid NULL,
  attendance_date date NOT NULL,
  status character varying(20) NOT NULL,
  remarks text NULL,
  marked_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT student_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT student_attendance_school_id_student_id_attendance_date_key UNIQUE (school_id, student_id, attendance_date),
  CONSTRAINT student_attendance_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT student_attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT student_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT student_attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT student_attendance_status_check CHECK (
    (status)::text = ANY (ARRAY['present'::character varying, 'absent'::character varying, 'half-day'::character varying, 'late'::character varying, 'on-leave'::character varying]::text[])
  )
);

CREATE INDEX idx_student_attendance_school_date ON public.student_attendance USING btree (school_id, student_id, attendance_date);
CREATE INDEX idx_student_attendance_class ON public.student_attendance USING btree (school_id, class_id, section_id, attendance_date);
CREATE INDEX idx_student_attendance_user_id ON public.student_attendance USING btree (user_id);

-- Table 26: STUDENT_DOCUMENTS
CREATE TABLE public.student_documents (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL,
  school_id uuid NOT NULL,
  uploaded_by uuid NULL,
  document_type character varying(50) NOT NULL,
  document_name character varying(255) NOT NULL,
  file_url text NOT NULL,
  uploaded_date date NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT student_documents_pkey PRIMARY KEY (id),
  CONSTRAINT student_documents_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT student_documents_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT student_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT student_documents_document_type_check CHECK (
    (document_type)::text = ANY (ARRAY['birth_certificate'::character varying, 'previous_school'::character varying, 'id_proof'::character varying, 'photo'::character varying]::text[])
  )
);

-- Table 27: STUDENT_CERTIFICATES
CREATE TABLE public.student_certificates (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL,
  school_id uuid NOT NULL,
  certificate_type character varying(50) NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  issued_by uuid NULL,
  certificate_number character varying(100) NULL,
  file_url text NULL,
  remarks text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT student_certificates_pkey PRIMARY KEY (id),
  CONSTRAINT student_certificates_school_id_certificate_number_key UNIQUE (school_id, certificate_number),
  CONSTRAINT student_certificates_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT student_certificates_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT student_certificates_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT student_certificates_certificate_type_check CHECK (
    (certificate_type)::text = ANY (ARRAY['bonafide'::character varying, 'transfer'::character varying, 'character'::character varying, 'leaving'::character varying]::text[])
  )
);

-- Table 28: LEAVE_APPLICATIONS
CREATE TABLE public.leave_applications (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  applicant_type character varying(20) NOT NULL,
  applicant_id uuid NOT NULL,
  leave_type character varying(50) NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  total_days integer NOT NULL,
  reason text NOT NULL,
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  status character varying(20) NULL DEFAULT 'pending'::character varying,
  approved_by uuid NULL,
  approval_date date NULL,
  remarks text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT leave_applications_pkey PRIMARY KEY (id),
  CONSTRAINT leave_applications_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT leave_applications_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT leave_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT leave_applications_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT leave_applications_applicant_type_check CHECK (
    (applicant_type)::text = ANY (ARRAY['staff'::character varying, 'student'::character varying]::text[])
  ),
  CONSTRAINT leave_applications_status_check CHECK (
    (status)::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])
  ),
  CONSTRAINT leave_applications_leave_type_check CHECK (
    (leave_type)::text = ANY (ARRAY['sick'::character varying, 'casual'::character varying, 'annual'::character varying, 'maternity'::character varying, 'other'::character varying]::text[])
  )
);

CREATE INDEX idx_leave_applications_user_id ON public.leave_applications USING btree (user_id);

-- ============================================================================
-- LEVEL 7: TRANSPORT (Depends on: schools, users, staff, students)
-- ============================================================================

-- Table 29: ROUTES
CREATE TABLE public.routes (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  route_name character varying(255) NOT NULL,
  fare numeric(10, 2) NULL DEFAULT 0,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT routes_pkey PRIMARY KEY (id),
  CONSTRAINT routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT routes_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT routes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT routes_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_routes_school_id ON public.routes USING btree (school_id);
CREATE INDEX idx_routes_user_id ON public.routes USING btree (user_id);

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 30: VEHICLES
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  vehicle_number character varying(50) NULL,
  vehicle_type character varying(20) NULL,
  model character varying(100) NULL,
  manufacture_year integer NULL,
  capacity integer NULL,
  driver_id uuid NULL,
  conductor_id uuid NULL,
  insurance_expiry date NULL,
  fitness_certificate_expiry date NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  registration_number character varying(50) NULL,
  seating_capacity integer NULL,
  driver_name character varying(255) NULL,
  driver_mobile character varying(20) NULL,
  route_id uuid NULL,
  user_id uuid NOT NULL,
  CONSTRAINT vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT vehicles_school_id_registration_number_key UNIQUE (school_id, registration_number),
  CONSTRAINT vehicles_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT vehicles_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
  CONSTRAINT vehicles_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT vehicles_conductor_id_fkey FOREIGN KEY (conductor_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT vehicles_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT vehicles_vehicle_type_check CHECK (
    (vehicle_type)::text = ANY (ARRAY['bus'::character varying, 'van'::character varying, 'car'::character varying]::text[])
  ),
  CONSTRAINT vehicles_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying]::text[])
  )
);

CREATE INDEX idx_vehicles_school_id ON public.vehicles USING btree (school_id);
CREATE INDEX idx_vehicles_route_id ON public.vehicles USING btree (route_id);
CREATE INDEX idx_vehicles_user_id ON public.vehicles USING btree (user_id);

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 31: STATIONS
CREATE TABLE public.stations (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  route_id uuid NOT NULL,
  station_name character varying(255) NOT NULL,
  station_order integer NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  fare integer NULL DEFAULT 0,
  user_id uuid NOT NULL,
  CONSTRAINT stations_pkey PRIMARY KEY (id),
  CONSTRAINT stations_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT stations_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT stations_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT stations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT stations_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_stations_route_order ON public.stations USING btree (route_id, station_order);
CREATE INDEX idx_stations_route_id ON public.stations USING btree (route_id);
CREATE INDEX idx_stations_school_id ON public.stations USING btree (school_id);
CREATE INDEX idx_stations_user_id ON public.stations USING btree (user_id);

CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 32: PASSENGERS
CREATE TABLE public.passengers (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  type character varying(20) NOT NULL,
  student_id uuid NULL,
  staff_id uuid NULL,
  route_id uuid NOT NULL,
  vehicle_id uuid NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  station_id uuid NULL,
  base_fare integer NULL DEFAULT 0,
  discount_percent integer NULL DEFAULT 0,
  final_fare integer NULL DEFAULT 0,
  payment_status character varying(20) NULL DEFAULT 'pending'::character varying,
  due_date date NULL,
  user_id uuid NOT NULL,
  CONSTRAINT passengers_pkey PRIMARY KEY (id),
  CONSTRAINT passengers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT passengers_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT passengers_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT passengers_station_id_fkey FOREIGN KEY (station_id) REFERENCES stations(id),
  CONSTRAINT passengers_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT passengers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT passengers_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT passengers_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT passengers_payment_status_check CHECK (
    (payment_status)::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying]::text[])
  ),
  CONSTRAINT passengers_type_check CHECK (
    (type)::text = ANY (ARRAY['STUDENT'::character varying, 'STAFF'::character varying]::text[])
  ),
  CONSTRAINT passengers_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  ),
  CONSTRAINT check_passenger_type CHECK (
    (((type)::text = 'STUDENT'::text) AND (student_id IS NOT NULL) AND (staff_id IS NULL)) OR
    (((type)::text = 'STAFF'::text) AND (staff_id IS NOT NULL) AND (student_id IS NULL))
  )
);

CREATE INDEX idx_passengers_station_id ON public.passengers USING btree (station_id);
CREATE INDEX idx_passengers_payment_status ON public.passengers USING btree (school_id, payment_status);
CREATE INDEX idx_passengers_school_id ON public.passengers USING btree (school_id);
CREATE INDEX idx_passengers_student_id ON public.passengers USING btree (student_id);
CREATE INDEX idx_passengers_staff_id ON public.passengers USING btree (staff_id);
CREATE INDEX idx_passengers_route_id ON public.passengers USING btree (route_id);
CREATE INDEX idx_passengers_user_id ON public.passengers USING btree (user_id);

CREATE TRIGGER update_passengers_updated_at BEFORE UPDATE ON passengers 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 33: TRANSPORT_DISCOUNTS
CREATE TABLE public.transport_discounts (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  passenger_type character varying(50) NOT NULL,
  discount_percent integer NULL DEFAULT 0,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  status character varying(20) NULL DEFAULT 'active'::character varying,
  CONSTRAINT transport_discounts_pkey PRIMARY KEY (id),
  CONSTRAINT transport_discounts_school_id_passenger_type_key UNIQUE (school_id, passenger_type),
  CONSTRAINT transport_discounts_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Table 34: TRANSPORT_ROUTES
CREATE TABLE public.transport_routes (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  route_name character varying(255) NOT NULL,
  route_number character varying(50) NULL,
  vehicle_id uuid NULL,
  start_location text NULL,
  end_location text NULL,
  total_distance numeric(8, 2) NULL,
  estimated_time integer NULL,
  monthly_fee numeric(10, 2) NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT transport_routes_pkey PRIMARY KEY (id),
  CONSTRAINT transport_routes_school_id_route_number_key UNIQUE (school_id, route_number),
  CONSTRAINT transport_routes_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT transport_routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT transport_routes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT transport_routes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT transport_routes_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_transport_routes_school_id ON public.transport_routes USING btree (school_id);
CREATE INDEX idx_transport_routes_user_id ON public.transport_routes USING btree (user_id);

-- Table 35: ROUTE_STOPS
CREATE TABLE public.route_stops (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  route_id uuid NOT NULL,
  stop_name character varying(255) NOT NULL,
  stop_address text NULL,
  stop_order integer NOT NULL,
  arrival_time time without time zone NULL,
  departure_time time without time zone NULL,
  pickup_fee numeric(10, 2) NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT route_stops_pkey PRIMARY KEY (id),
  CONSTRAINT route_stops_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT route_stops_route_id_fkey FOREIGN KEY (route_id) REFERENCES transport_routes(id) ON DELETE CASCADE,
  CONSTRAINT route_stops_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT route_stops_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_route_stops_user_id ON public.route_stops USING btree (user_id);

-- Table 36: TRANSPORT_PASSENGERS
CREATE TABLE public.transport_passengers (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  session_id uuid NOT NULL,
  route_id uuid NOT NULL,
  pickup_stop_id uuid NULL,
  drop_stop_id uuid NULL,
  start_date date NOT NULL,
  end_date date NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT transport_passengers_pkey PRIMARY KEY (id),
  CONSTRAINT transport_passengers_drop_stop_id_fkey FOREIGN KEY (drop_stop_id) REFERENCES route_stops(id) ON DELETE SET NULL,
  CONSTRAINT transport_passengers_pickup_stop_id_fkey FOREIGN KEY (pickup_stop_id) REFERENCES route_stops(id) ON DELETE SET NULL,
  CONSTRAINT transport_passengers_route_id_fkey FOREIGN KEY (route_id) REFERENCES transport_routes(id) ON DELETE CASCADE,
  CONSTRAINT transport_passengers_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT transport_passengers_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT transport_passengers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT transport_passengers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT transport_passengers_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT transport_passengers_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_transport_passengers_school ON public.transport_passengers USING btree (school_id, student_id);
CREATE INDEX idx_transport_passengers_user_id ON public.transport_passengers USING btree (user_id);

-- Table 37: VEHICLE_MAINTENANCE
CREATE TABLE public.vehicle_maintenance (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  maintenance_date date NOT NULL,
  maintenance_type character varying(50) NULL,
  description text NULL,
  cost numeric(10, 2) NULL,
  vendor_name character varying(255) NULL,
  next_maintenance_date date NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT vehicle_maintenance_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_maintenance_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT vehicle_maintenance_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT vehicle_maintenance_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT vehicle_maintenance_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  CONSTRAINT vehicle_maintenance_maintenance_type_check CHECK (
    (maintenance_type)::text = ANY (ARRAY['regular'::character varying, 'repair'::character varying, 'inspection'::character varying, 'other'::character varying]::text[])
  )
);

CREATE INDEX idx_vehicle_maintenance_user_id ON public.vehicle_maintenance USING btree (user_id);

-- ============================================================================
-- LEVEL 8: EXAMS & ASSESSMENTS (Depends on: schools, users, sessions, classes, subjects, students)
-- ============================================================================

-- Table 38: EXAMS
CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  session_id uuid NOT NULL,
  created_by uuid NULL,
  exam_name character varying(100) NOT NULL,
  exam_type character varying(50) NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  result_declaration_date date NULL,
  status character varying(20) NULL DEFAULT 'scheduled'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  exam_date date NULL,
  result_date date NULL,
  class_id uuid NULL,
  section_id uuid NULL,
  total_marks numeric(10, 2) NULL,
  details text NULL,
  user_id uuid NOT NULL,
  CONSTRAINT exams_pkey PRIMARY KEY (id),
  CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT exams_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT exams_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT exams_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT exams_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
  CONSTRAINT exams_exam_type_check CHECK (
    (exam_type)::text = ANY (ARRAY['term'::character varying, 'unit'::character varying, 'final'::character varying, 'assessment'::character varying]::text[])
  ),
  CONSTRAINT exams_status_check CHECK (
    (status)::text = ANY (ARRAY['scheduled'::character varying, 'ongoing'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])
  )
);

CREATE INDEX idx_exams_school_session ON public.exams USING btree (school_id, session_id);
CREATE INDEX idx_exams_class_id ON public.exams USING btree (class_id);
CREATE INDEX idx_exams_section_id ON public.exams USING btree (section_id);
CREATE INDEX idx_exams_session_id ON public.exams USING btree (session_id);
CREATE INDEX idx_exams_school_id ON public.exams USING btree (school_id);
CREATE INDEX idx_exams_status ON public.exams USING btree (status);
CREATE INDEX idx_exams_start_date ON public.exams USING btree (start_date);
CREATE INDEX idx_exams_user_id ON public.exams USING btree (user_id);

-- Table 39: EXAM_MARKS
CREATE TABLE public.exam_marks (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  exam_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  section_id uuid NULL,
  subject_id uuid NOT NULL,
  theory_marks numeric(5, 2) NULL,
  practical_marks numeric(5, 2) NULL,
  total_marks numeric(5, 2) NOT NULL,
  obtained_marks numeric(5, 2) NOT NULL,
  grade character varying(10) NULL,
  remarks text NULL,
  entered_by uuid NULL,
  entry_date date NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT exam_marks_pkey PRIMARY KEY (id),
  CONSTRAINT exam_marks_school_id_exam_id_student_id_subject_id_key UNIQUE (school_id, exam_id, student_id, subject_id),
  CONSTRAINT exam_marks_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  CONSTRAINT exam_marks_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT exam_marks_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT exam_marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT exam_marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT exam_marks_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT exam_marks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT exam_marks_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_exam_marks_school_exam ON public.exam_marks USING btree (school_id, exam_id, student_id);
CREATE INDEX idx_exam_marks_exam_id ON public.exam_marks USING btree (exam_id);
CREATE INDEX idx_exam_marks_student_id ON public.exam_marks USING btree (student_id);
CREATE INDEX idx_exam_marks_subject_id ON public.exam_marks USING btree (subject_id);
CREATE INDEX idx_exam_marks_class_id ON public.exam_marks USING btree (class_id);
CREATE INDEX idx_exam_marks_section_id ON public.exam_marks USING btree (section_id);
CREATE INDEX idx_exam_marks_school_id ON public.exam_marks USING btree (school_id);
CREATE INDEX idx_exam_marks_exam_student ON public.exam_marks USING btree (exam_id, student_id);
CREATE INDEX idx_exam_marks_exam_subject ON public.exam_marks USING btree (exam_id, subject_id);
CREATE INDEX idx_exam_marks_user_id ON public.exam_marks USING btree (user_id);

-- Table 40: TESTS
CREATE TABLE public.tests (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  test_name character varying(255) NOT NULL,
  test_date date NOT NULL,
  result_date date NULL,
  class_id uuid NOT NULL,
  section_id uuid NULL,
  total_marks numeric(10, 2) NOT NULL,
  details text NULL,
  status character varying(20) NULL DEFAULT 'opened'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT tests_pkey PRIMARY KEY (id),
  CONSTRAINT tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT tests_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT tests_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT tests_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT tests_status_check CHECK (
    (status)::text = ANY (ARRAY['opened'::character varying, 'closed'::character varying, 'cancelled'::character varying]::text[])
  )
);

CREATE INDEX idx_tests_school_id ON public.tests USING btree (school_id);
CREATE INDEX idx_tests_class_id ON public.tests USING btree (class_id);
CREATE INDEX idx_tests_test_date ON public.tests USING btree (test_date);
CREATE INDEX idx_tests_status ON public.tests USING btree (status);
CREATE INDEX idx_tests_section_id ON public.tests USING btree (section_id);
CREATE INDEX idx_tests_user_id ON public.tests USING btree (user_id);

CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 41: TEST_SUBJECTS
CREATE TABLE public.test_subjects (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  test_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  school_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  total_marks numeric(10, 2) NULL DEFAULT 0,
  CONSTRAINT test_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT test_subjects_test_id_subject_id_key UNIQUE (test_id, subject_id),
  CONSTRAINT test_subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT test_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT test_subjects_test_id_fkey FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

CREATE INDEX idx_test_subjects_test_id ON public.test_subjects USING btree (test_id);
CREATE INDEX idx_test_subjects_subject_id ON public.test_subjects USING btree (subject_id);
CREATE INDEX idx_test_subjects_school_id ON public.test_subjects USING btree (school_id);

-- Table 42: TEST_MARKS
CREATE TABLE public.test_marks (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  test_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  obtained_marks numeric(10, 2) NULL,
  is_absent boolean NULL DEFAULT false,
  entered_by uuid NULL,
  entry_date date NULL DEFAULT CURRENT_DATE,
  remarks text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT test_marks_pkey PRIMARY KEY (id),
  CONSTRAINT test_marks_test_id_student_id_subject_id_key UNIQUE (test_id, student_id, subject_id),
  CONSTRAINT test_marks_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT test_marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT test_marks_test_id_fkey FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  CONSTRAINT test_marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT test_marks_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_test_marks_test_id ON public.test_marks USING btree (test_id);
CREATE INDEX idx_test_marks_student_id ON public.test_marks USING btree (student_id);
CREATE INDEX idx_test_marks_school_id ON public.test_marks USING btree (school_id);
CREATE INDEX idx_test_marks_subject_id ON public.test_marks USING btree (subject_id);
CREATE INDEX idx_test_marks_test_student ON public.test_marks USING btree (test_id, student_id);
CREATE INDEX idx_test_marks_test_subject ON public.test_marks USING btree (test_id, subject_id);

CREATE TRIGGER update_test_marks_updated_at BEFORE UPDATE ON test_marks 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 43: DATESHEETS
CREATE TABLE public.datesheets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  session character varying(50) NOT NULL,
  created_by uuid NULL,
  title character varying(255) NOT NULL,
  start_date date NOT NULL,
  default_start_time time without time zone NULL DEFAULT '11:00:00'::time without time zone,
  default_end_time time without time zone NULL DEFAULT '12:30:00'::time without time zone,
  interval_days integer NULL DEFAULT 2,
  saturday_off boolean NULL DEFAULT true,
  sunday_off boolean NULL DEFAULT true,
  exam_center character varying(255) NULL,
  class_ids uuid[] NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT datesheets_pkey PRIMARY KEY (id),
  CONSTRAINT datesheets_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT datesheets_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT datesheets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_datesheets_school_session ON public.datesheets USING btree (school_id, session);
CREATE INDEX idx_datesheets_user_id ON public.datesheets USING btree (user_id);

-- Table 44: REPORT_CARDS
CREATE TABLE public.report_cards (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  exam_result_id uuid NOT NULL,
  student_id uuid NOT NULL,
  file_url text NOT NULL,
  generated_date date NULL DEFAULT CURRENT_DATE,
  generated_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT report_cards_pkey PRIMARY KEY (id),
  CONSTRAINT report_cards_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT report_cards_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT report_cards_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ============================================================================
-- LEVEL 9: FEE MANAGEMENT (Depends on: schools, users, sessions, classes, students, fee_types)
-- ============================================================================

-- Table 45: FEE_STRUCTURES
CREATE TABLE public.fee_structures (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  session_id uuid NOT NULL,
  class_id uuid NOT NULL,
  fee_type_id uuid NOT NULL,
  amount numeric(10, 2) NOT NULL,
  due_date date NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT fee_structures_pkey PRIMARY KEY (id),
  CONSTRAINT fee_structures_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fee_structures_fee_type_id_fkey FOREIGN KEY (fee_type_id) REFERENCES fee_types(id) ON DELETE CASCADE,
  CONSTRAINT fee_structures_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fee_structures_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fee_structures_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fee_structures_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fee_structures_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_fee_structures_user_id ON public.fee_structures USING btree (user_id);

-- Table 46: FEE_ENROLLMENTS
CREATE TABLE public.fee_enrollments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  session_id uuid NOT NULL,
  class_id uuid NOT NULL,
  fee_plan character varying(20) NOT NULL,
  monthly_fee numeric(10, 2) NOT NULL,
  discount_type character varying(20) NULL,
  discount_value numeric(10, 2) NULL DEFAULT 0,
  discount_amount numeric(10, 2) NULL DEFAULT 0,
  final_monthly_fee numeric(10, 2) NOT NULL,
  start_month integer NOT NULL,
  start_year integer NOT NULL,
  end_month integer NULL,
  end_year integer NULL,
  total_installments integer NOT NULL,
  total_annual_fee numeric(10, 2) NOT NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  enrolled_by uuid NULL,
  enrolled_at timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT fee_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT fee_enrollments_school_id_student_id_session_id_key UNIQUE (school_id, student_id, session_id),
  CONSTRAINT fee_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fee_enrollments_enrolled_by_fkey FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fee_enrollments_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fee_enrollments_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fee_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fee_enrollments_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'completed'::character varying]::text[])
  ),
  CONSTRAINT fee_enrollments_fee_plan_check CHECK (
    (fee_plan)::text = ANY (ARRAY['monthly'::character varying, 'quarterly'::character varying, 'semi-annual'::character varying, 'annual'::character varying]::text[])
  ),
  CONSTRAINT fee_enrollments_start_month_check CHECK (
    (start_month >= 1) AND (start_month <= 12)
  ),
  CONSTRAINT fee_enrollments_discount_type_check CHECK (
    (discount_type)::text = ANY (ARRAY['percentage'::character varying, 'fixed'::character varying, 'none'::character varying]::text[])
  )
);

CREATE INDEX idx_fee_enrollments_student ON public.fee_enrollments USING btree (student_id, session_id);
CREATE INDEX idx_fee_enrollments_status ON public.fee_enrollments USING btree (status);

-- Table 47: FEE_INSTALLMENTS
CREATE TABLE public.fee_installments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  session_id uuid NOT NULL,
  class_id uuid NOT NULL,
  installment_number integer NOT NULL,
  period_type character varying(20) NOT NULL,
  period_label character varying(100) NOT NULL,
  fee_month integer NULL,
  fee_year integer NOT NULL,
  months_covered text[] NULL,
  base_amount numeric(10, 2) NOT NULL,
  discount_amount numeric(10, 2) NULL DEFAULT 0,
  late_fee numeric(10, 2) NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL,
  paid_amount numeric(10, 2) NULL DEFAULT 0,
  balance_amount numeric(10, 2) NOT NULL,
  due_date date NOT NULL,
  paid_date date NULL,
  status character varying(20) NULL DEFAULT 'pending'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT fee_installments_pkey PRIMARY KEY (id),
  CONSTRAINT fee_installments_school_id_student_id_session_id_installmen_key UNIQUE (school_id, student_id, session_id, installment_number),
  CONSTRAINT fee_installments_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fee_installments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fee_installments_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fee_installments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fee_installments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fee_installments_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fee_installments_period_type_check CHECK (
    (period_type)::text = ANY (ARRAY['monthly'::character varying, 'quarterly'::character varying, 'semi-annual'::character varying, 'annual'::character varying]::text[])
  ),
  CONSTRAINT fee_installments_status_check CHECK (
    (status)::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'partial'::character varying, 'overdue'::character varying, 'cancelled'::character varying]::text[])
  )
);

CREATE INDEX idx_fee_installments_student ON public.fee_installments USING btree (student_id, session_id);
CREATE INDEX idx_fee_installments_status ON public.fee_installments USING btree (status);
CREATE INDEX idx_fee_installments_due_date ON public.fee_installments USING btree (due_date);
CREATE INDEX idx_fee_installments_school_session ON public.fee_installments USING btree (school_id, session_id);
CREATE INDEX idx_fee_installments_user_id ON public.fee_installments USING btree (user_id);

CREATE TRIGGER trigger_update_installment_status BEFORE INSERT OR UPDATE OF paid_amount, total_amount, late_fee, due_date ON fee_installments 
FOR EACH ROW EXECUTE FUNCTION update_installment_status();

-- Table 48: FEE_CHALLANS
CREATE TABLE public.fee_challans (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  session_id uuid NOT NULL,
  student_id uuid NOT NULL,
  challan_number character varying(100) NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  total_amount numeric(10, 2) NOT NULL,
  status character varying(20) NULL DEFAULT 'pending'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT fee_challans_pkey PRIMARY KEY (id),
  CONSTRAINT fee_challans_school_id_challan_number_key UNIQUE (school_id, challan_number),
  CONSTRAINT fee_challans_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fee_challans_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fee_challans_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fee_challans_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fee_challans_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fee_challans_status_check CHECK (
    (status)::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying]::text[])
  )
);

CREATE INDEX idx_fee_challans_user_id ON public.fee_challans USING btree (user_id);

-- Table 49: FEE_CHALLAN_ITEMS
CREATE TABLE public.fee_challan_items (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  challan_id uuid NOT NULL,
  fee_type_id uuid NOT NULL,
  description text NULL,
  amount numeric(10, 2) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT fee_challan_items_pkey PRIMARY KEY (id),
  CONSTRAINT fee_challan_items_challan_id_fkey FOREIGN KEY (challan_id) REFERENCES fee_challans(id) ON DELETE CASCADE,
  CONSTRAINT fee_challan_items_fee_type_id_fkey FOREIGN KEY (fee_type_id) REFERENCES fee_types(id) ON DELETE CASCADE,
  CONSTRAINT fee_challan_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Table 50: FEE_PAYMENTS
CREATE TABLE public.fee_payments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  challan_id uuid NOT NULL,
  student_id uuid NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_paid numeric(10, 2) NOT NULL,
  payment_method character varying(50) NULL,
  transaction_id character varying(255) NULL,
  cheque_number character varying(100) NULL,
  bank_name character varying(255) NULL,
  received_by uuid NULL,
  receipt_number character varying(100) NULL,
  remarks text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  installment_ids uuid[] NULL,
  months_paid text[] NULL,
  is_advance boolean NULL DEFAULT false,
  CONSTRAINT fee_payments_pkey PRIMARY KEY (id),
  CONSTRAINT fee_payments_school_id_receipt_number_key UNIQUE (school_id, receipt_number),
  CONSTRAINT fee_payments_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fee_payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fee_payments_challan_id_fkey FOREIGN KEY (challan_id) REFERENCES fee_challans(id) ON DELETE CASCADE,
  CONSTRAINT fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fee_payments_payment_method_check CHECK (
    (payment_method)::text = ANY (ARRAY['cash'::character varying, 'cheque'::character varying, 'online'::character varying, 'card'::character varying, 'bank_transfer'::character varying]::text[])
  )
);

-- Table 51: FEE_INSTALLMENT_PAYMENTS
CREATE TABLE public.fee_installment_payments (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  installment_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  amount_allocated numeric(10, 2) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT fee_installment_payments_pkey PRIMARY KEY (id),
  CONSTRAINT fee_installment_payments_installment_id_payment_id_key UNIQUE (installment_id, payment_id),
  CONSTRAINT fee_installment_payments_installment_id_fkey FOREIGN KEY (installment_id) REFERENCES fee_installments(id) ON DELETE CASCADE,
  CONSTRAINT fee_installment_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES fee_payments(id) ON DELETE CASCADE,
  CONSTRAINT fee_installment_payments_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_installment_payments_installment ON public.fee_installment_payments USING btree (installment_id);
CREATE INDEX idx_installment_payments_payment ON public.fee_installment_payments USING btree (payment_id);

-- Table 52: FEE_PAYMENT_ITEMS
CREATE TABLE public.fee_payment_items (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  fee_payment_id uuid NOT NULL,
  student_fee_period_id uuid NOT NULL,
  amount_paid numeric(10, 2) NOT NULL,
  fee_type_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT fee_payment_items_pkey PRIMARY KEY (id),
  CONSTRAINT fee_payment_items_fee_type_id_fkey FOREIGN KEY (fee_type_id) REFERENCES fee_types(id) ON DELETE CASCADE,
  CONSTRAINT fee_payment_items_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_fee_payment_items_school ON public.fee_payment_items USING btree (school_id);
CREATE INDEX idx_fee_payment_items_payment ON public.fee_payment_items USING btree (fee_payment_id);
CREATE INDEX idx_fee_payment_items_period ON public.fee_payment_items USING btree (student_fee_period_id);

-- Table 53: FEE_CONCESSIONS
CREATE TABLE public.fee_concessions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  session_id uuid NOT NULL,
  fee_type_id uuid NULL,
  concession_type character varying(20) NULL,
  concession_value numeric(10, 2) NOT NULL,
  reason text NULL,
  approved_by uuid NULL,
  from_date date NOT NULL,
  to_date date NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT fee_concessions_pkey PRIMARY KEY (id),
  CONSTRAINT fee_concessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fee_concessions_fee_type_id_fkey FOREIGN KEY (fee_type_id) REFERENCES fee_types(id) ON DELETE CASCADE,
  CONSTRAINT fee_concessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fee_concessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fee_concessions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fee_concessions_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fee_concessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fee_concessions_concession_type_check CHECK (
    (concession_type)::text = ANY (ARRAY['percentage'::character varying, 'fixed'::character varying]::text[])
  ),
  CONSTRAINT fee_concessions_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_fee_concessions_school_student ON public.fee_concessions USING btree (school_id, student_id, status);
CREATE INDEX idx_fee_concessions_user_id ON public.fee_concessions USING btree (user_id);

-- ============================================================================
-- LEVEL 10: LIBRARY (Depends on: schools, users, staff, students)
-- ============================================================================

-- Table 54: BOOKS
CREATE TABLE public.books (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  created_by uuid NULL,
  book_title character varying(255) NOT NULL,
  isbn character varying(50) NULL,
  author character varying(255) NULL,
  publisher character varying(255) NULL,
  edition character varying(50) NULL,
  publication_year integer NULL,
  category character varying(100) NULL,
  book_number character varying(50) NULL,
  rack_number character varying(50) NULL,
  price numeric(10, 2) NULL,
  total_copies integer NULL DEFAULT 1,
  available_copies integer NULL DEFAULT 1,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT books_pkey PRIMARY KEY (id),
  CONSTRAINT books_school_id_book_number_key UNIQUE (school_id, book_number),
  CONSTRAINT books_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT books_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT books_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT books_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])
  )
);

CREATE INDEX idx_books_school_id ON public.books USING btree (school_id);
CREATE INDEX idx_books_user_id ON public.books USING btree (user_id);

-- Table 55: LIBRARY_MEMBERS
CREATE TABLE public.library_members (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  member_type character varying(20) NOT NULL,
  member_id uuid NOT NULL,
  membership_number character varying(50) NOT NULL,
  membership_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NULL,
  status character varying(20) NULL DEFAULT 'active'::character varying,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT library_members_pkey PRIMARY KEY (id),
  CONSTRAINT library_members_school_id_membership_number_key UNIQUE (school_id, membership_number),
  CONSTRAINT library_members_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT library_members_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT library_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT library_members_status_check CHECK (
    (status)::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying]::text[])
  ),
  CONSTRAINT library_members_member_type_check CHECK (
    (member_type)::text = ANY (ARRAY['student'::character varying, 'staff'::character varying]::text[])
  )
);

CREATE INDEX idx_library_members_school ON public.library_members USING btree (school_id, member_type, member_id);
CREATE INDEX idx_library_members_user_id ON public.library_members USING btree (user_id);

-- ============================================================================
-- LEVEL 11: HR/RECRUITMENT (Depends on: jobs)
-- ============================================================================

-- Table 56: JOB_APPLICATIONS
CREATE TABLE public.job_applications (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  job_id uuid NOT NULL,
  applicant_name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(20) NULL,
  qualification character varying(255) NULL,
  experience_years integer NULL,
  resume_url text NULL,
  cover_letter text NULL,
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  status character varying(20) NULL DEFAULT 'pending'::character varying,
  reviewed_by uuid NULL,
  review_date date NULL,
  remarks text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT job_applications_pkey PRIMARY KEY (id),
  CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT job_applications_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT job_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT job_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT job_applications_status_check CHECK (
    (status)::text = ANY (ARRAY['pending'::character varying, 'shortlisted'::character varying, 'rejected'::character varying, 'hired'::character varying]::text[])
  )
);

CREATE INDEX idx_job_applications_school_job ON public.job_applications USING btree (school_id, job_id);
CREATE INDEX idx_job_applications_status ON public.job_applications USING btree (status);
CREATE INDEX idx_job_applications_user_id ON public.job_applications USING btree (user_id);

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 57: JOB_INTERVIEWS
CREATE TABLE public.job_interviews (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL,
  application_id uuid NOT NULL,
  interview_date date NOT NULL,
  interview_time time without time zone NOT NULL,
  interview_type character varying(50) NULL,
  interviewer_id uuid NULL,
  location character varying(255) NULL,
  notes text NULL,
  status character varying(20) NULL DEFAULT 'scheduled'::character varying,
  result character varying(20) NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT job_interviews_pkey PRIMARY KEY (id),
  CONSTRAINT job_interviews_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT job_interviews_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT job_interviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT job_interviews_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT job_interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE,
  CONSTRAINT job_interviews_status_check CHECK (
    (status)::text = ANY (ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'rescheduled'::character varying]::text[])
  ),
  CONSTRAINT job_interviews_interview_type_check CHECK (
    (interview_type)::text = ANY (ARRAY['phone'::character varying, 'video'::character varying, 'in-person'::character varying, 'panel'::character varying]::text[])
  ),
  CONSTRAINT job_interviews_result_check CHECK (
    (result)::text = ANY (ARRAY['pass'::character varying, 'fail'::character varying, 'pending'::character varying]::text[])
  )
);

CREATE INDEX idx_job_interviews_school_app ON public.job_interviews USING btree (school_id, application_id);
CREATE INDEX idx_job_interviews_school_id ON public.job_interviews USING btree (school_id);
CREATE INDEX idx_job_interviews_application_id ON public.job_interviews USING btree (application_id);
CREATE INDEX idx_job_interviews_status ON public.job_interviews USING btree (status);
CREATE INDEX idx_job_interviews_user_id ON public.job_interviews USING btree (user_id);

CREATE TRIGGER update_job_interviews_updated_at BEFORE UPDATE ON job_interviews 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SCHEMA CREATION COMPLETE - ALL 57 TABLES
-- ============================================================================

-- Verify successful creation
SELECT 
    'Schema creation completed successfully!' as status,
    COUNT(*) as total_tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name NOT LIKE 'pg_%';

-- Display all created tables
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;






-- Drop the existing periods table
DROP TABLE IF EXISTS public.periods CASCADE;

-- Recreate with duration_minutes as nullable or computed
CREATE TABLE public.periods (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  period_number integer NOT NULL,
  period_name varchar(100),
  period_type varchar(50) DEFAULT 'regular',
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NULL,  -- CHANGED TO NULLABLE
  day_of_week varchar(20) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  is_break boolean DEFAULT false,
  status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, class_id, day_of_week, period_number)
);

-- Create a trigger to auto-calculate duration_minutes
CREATE OR REPLACE FUNCTION calculate_period_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_duration 
BEFORE INSERT OR UPDATE ON periods 
FOR EACH ROW EXECUTE FUNCTION calculate_period_duration();

CREATE INDEX idx_periods_school ON periods(school_id);
CREATE INDEX idx_periods_class ON periods(class_id);
CREATE INDEX idx_periods_day ON periods(day_of_week);
CREATE INDEX idx_periods_user_id ON periods(user_id);
CREATE INDEX idx_periods_type ON periods(period_type);

CREATE TRIGGER update_periods_updated_at BEFORE UPDATE ON periods 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




create table public.student_id_cards (
  id uuid not null default extensions.uuid_generate_v4 (),
  student_id uuid not null,
  school_id uuid not null,
  session_id uuid not null,
  card_number character varying(50) not null,
  issue_date date not null default CURRENT_DATE,
  expiry_date date null,
  status character varying(20) null default 'active'::character varying,
  barcode character varying(100) null,
  issued_by uuid null,

  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint student_id_cards_pkey primary key (id),
  constraint student_id_cards_school_id_card_number_key unique (school_id, card_number),
  constraint student_id_cards_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint student_id_cards_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint student_id_cards_issued_by_fkey foreign KEY (issued_by) references users (id) on delete set null,
  constraint student_id_cards_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint student_id_cards_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'expired'::character varying,
            'lost'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;




create table public.staff_attendance (
  id uuid not null default extensions.uuid_generate_v4 (),
  staff_id uuid not null,
  school_id uuid not null,
  attendance_date date not null,
  check_in_time time without time zone null,
  check_out_time time without time zone null,
  status character varying(20) not null,
  remarks text null,
  marked_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint staff_attendance_pkey primary key (id),
  constraint staff_attendance_school_id_staff_id_attendance_date_key unique (school_id, staff_id, attendance_date),
  constraint staff_attendance_marked_by_fkey foreign KEY (marked_by) references users (id) on delete set null,
  constraint staff_attendance_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_attendance_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint staff_attendance_status_check check (
    (
      (status)::text = any (
        (
          array[
            'present'::character varying,
            'absent'::character varying,
            'half-day'::character varying,
            'late'::character varying,
            'on-leave'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_attendance_school_date on public.staff_attendance using btree (school_id, staff_id, attendance_date) TABLESPACE pg_default;

create table public.staff_certificates (
  id uuid not null default extensions.uuid_generate_v4 (),
  staff_id uuid not null,
  school_id uuid not null,
  certificate_type character varying(100) not null,
  issue_date date not null default CURRENT_DATE,
  issued_by character varying(255) null,
  certificate_number character varying(100) null,
  file_url text null,
  remarks text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint staff_certificates_pkey primary key (id),
  constraint staff_certificates_school_id_certificate_number_key unique (school_id, certificate_number),
  constraint staff_certificates_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_certificates_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_certificates_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint staff_certificates_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_staff_certificates_user_id on public.staff_certificates using btree (user_id) TABLESPACE pg_default;

create table public.staff_id_cards (
  id uuid not null default extensions.uuid_generate_v4 (),
  staff_id uuid not null,
  school_id uuid not null,
  card_number character varying(50) not null,
  issue_date date not null default CURRENT_DATE,
  expiry_date date null,
  status character varying(20) null default 'active'::character varying,
  barcode character varying(100) null,
  issued_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint staff_id_cards_pkey primary key (id),
  constraint staff_id_cards_school_id_card_number_key unique (school_id, card_number),
  constraint staff_id_cards_issued_by_fkey foreign KEY (issued_by) references users (id) on delete set null,
  constraint staff_id_cards_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_id_cards_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint staff_id_cards_status_check check (
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint student_id_cards_pkey primary key (id),
  constraint student_id_cards_school_id_card_number_key unique (school_id, card_number),
  constraint student_id_cards_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint student_id_cards_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint student_id_cards_issued_by_fkey foreign KEY (issued_by) references users (id) on delete set null,
  constraint student_id_cards_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint student_id_cards_status_check check (
>>>>>>> 0bff88ac9f59af5f44b259d5fb867eb5dfab8b61
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'expired'::character varying,
            'lost'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;



create table public.datesheet_schedules (
  id uuid not null default extensions.uuid_generate_v4 (),
  datesheet_id uuid not null,
  school_id uuid not null,
  created_by uuid null,
  class_id uuid not null,
  subject_id uuid null,
  exam_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  room_number character varying(100) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint datesheet_schedules_pkey primary key (id),
  constraint datesheet_schedules_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint datesheet_schedules_datesheet_id_fkey foreign KEY (datesheet_id) references datesheets (id) on delete CASCADE,
  constraint datesheet_schedules_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint datesheet_schedules_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint datesheet_schedules_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete set null,
  constraint datesheet_schedules_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_datesheet_schedules_datesheet_id on public.datesheet_schedules using btree (datesheet_id) TABLESPACE pg_default;

create index IF not exists idx_datesheet_schedules_school_id on public.datesheet_schedules using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_datesheet_schedules_class_id on public.datesheet_schedules using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_datesheet_schedules_user_id on public.datesheet_schedules using btree (user_id) TABLESPACE pg_default;

create table public.roll_no_slips (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  datesheet_id uuid not null,
  student_id uuid not null,
  generated_by uuid null,
  slip_number character varying(100) not null,
  slip_type character varying(50) not null,
  gender character varying(20) null,
  file_url text null,
  configuration jsonb null,
  status character varying(20) null default 'generated'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  class_id uuid null,
  constraint roll_no_slips_pkey primary key (id),
  constraint roll_no_slips_school_id_datesheet_id_student_id_slip_type_key unique (school_id, datesheet_id, student_id, slip_type),
  constraint roll_no_slips_datesheet_id_fkey foreign KEY (datesheet_id) references datesheets (id) on delete CASCADE,
  constraint roll_no_slips_generated_by_fkey foreign KEY (generated_by) references users (id) on delete set null,
  constraint roll_no_slips_class_id_fkey foreign KEY (class_id) references classes (id) on delete set null,
  constraint roll_no_slips_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint roll_no_slips_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_roll_no_slips_class_id on public.roll_no_slips using btree (class_id) TABLESPACE pg_default;

create table public.expense_categories (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  category_name character varying(100) not null,
  description text null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint expense_categories_pkey primary key (id),
  constraint expense_categories_school_id_category_name_key unique (school_id, category_name),
  constraint expense_categories_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint expense_categories_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint expense_categories_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint expense_categories_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_expense_categories_user_id on public.expense_categories using btree (user_id) TABLESPACE pg_default;

create table public.expenses (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  expense_category_id uuid not null,
  expense_date date not null,
  amount numeric(12, 2) not null,
  payment_method character varying(50) null,
  invoice_number character varying(100) null,
  vendor_name character varying(255) null,
  description text null,
  paid_by uuid null,
  approved_by uuid null,
  receipt_url text null,
  status character varying(20) null default 'pending'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint expenses_pkey primary key (id),
  constraint expenses_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint expenses_expense_category_id_fkey foreign KEY (expense_category_id) references expense_categories (id) on delete CASCADE,
  constraint expenses_paid_by_fkey foreign KEY (paid_by) references users (id) on delete set null,
  constraint expenses_approved_by_fkey foreign KEY (approved_by) references users (id) on delete set null,
  constraint expenses_payment_method_check check (
    (
      (payment_method)::text = any (
        (
          array[
            'cash'::character varying,
            'cheque'::character varying,
            'online'::character varying,
            'bank_transfer'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint expenses_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'approved'::character varying,
            'paid'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;



CREATE TABLE public.book_issues (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

    school_id UUID NOT NULL,
    book_id UUID NOT NULL,

    borrower_type VARCHAR(20) NOT NULL,
    borrower_id UUID NOT NULL,

    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,

    fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    fine_paid BOOLEAN NOT NULL DEFAULT FALSE,

    issued_by UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'issued',

    remarks TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Foreign Keys
    CONSTRAINT book_issues_school_id_fkey
        FOREIGN KEY (school_id)
        REFERENCES public.schools (id)
        ON DELETE CASCADE,

    CONSTRAINT book_issues_book_id_fkey
        FOREIGN KEY (book_id)
        REFERENCES public.books (id)
        ON DELETE CASCADE,

    CONSTRAINT book_issues_issued_by_fkey
        FOREIGN KEY (issued_by)
        REFERENCES public.users (id)
        ON DELETE SET NULL,

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



    -- Checks
    CONSTRAINT book_issues_borrower_type_check
        CHECK (borrower_type IN ('student', 'staff')),

    CONSTRAINT book_issues_status_check
        CHECK (status IN ('issued', 'returned', 'overdue', 'lost'))
);

