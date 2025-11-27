-- =====================================================
-- SMART SCHOOL PRO - SAAS MULTI-TENANT SCHEMA
-- =====================================================
-- Updated schema with proper user_id and school_id columns
-- for data isolation in SaaS environment
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CORE MANAGEMENT TABLES
-- =====================================================

-- Schools Table (Root tenant table)
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    established_date DATE,
    principal_name VARCHAR(255),
    website VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    subscription_plan VARCHAR(50) DEFAULT 'basic', -- NEW: For SaaS billing
    subscription_status VARCHAR(20) DEFAULT 'active', -- NEW: active/expired/trial
    subscription_expires_at TIMESTAMPTZ, -- NEW: Subscription expiry
    created_by UUID, -- NEW: User who created this school
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table (Updated with school_id for multi-tenancy)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- ADDED
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'teacher',
    staff_id UUID,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, username), -- UPDATED: Username unique per school
    UNIQUE(school_id, email) -- UPDATED: Email unique per school
);

-- Sessions (Academic Years)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- =====================================================
-- 2. FRONT DESK MODULE
-- =====================================================

-- Visitors Table
CREATE TABLE visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    visitor_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    purpose TEXT,
    person_to_meet VARCHAR(255),
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(100),
    in_time TIMESTAMPTZ NOT NULL,
    out_time TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'in' CHECK (status IN ('in', 'out')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admission Inquiries Table
CREATE TABLE admission_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    inquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    student_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    class_applied_for VARCHAR(50),
    previous_school VARCHAR(255),
    inquiry_source VARCHAR(50) CHECK (inquiry_source IN ('walk-in', 'phone', 'online', 'reference')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED: Changed from staff_id to user_id
    follow_up_date DATE,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'visited', 'admitted', 'rejected')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- People Directory Table
CREATE TABLE people_directory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    person_type VARCHAR(20) NOT NULL CHECK (person_type IN ('student', 'staff', 'parent')),
    person_id UUID NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    photo_url TEXT,
    designation VARCHAR(100),
    class_section VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. STUDENTS MODULE
-- =====================================================

-- Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    admission_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(10),
    religion VARCHAR(50),
    caste VARCHAR(50),
    nationality VARCHAR(50) DEFAULT 'Pakistan',
    photo_url TEXT,
    admission_date DATE NOT NULL,
    current_class_id UUID,
    current_section_id UUID,
    roll_number VARCHAR(20),
    house VARCHAR(20) CHECK (house IN ('red', 'blue', 'green', 'yellow')),
   ALTER TABLE students
    ADD COLUMN base_fee NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN discount_note TEXT,
    ADD COLUMN final_fee NUMERIC(10,2) DEFAULT 0;

    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'alumni', 'transferred')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, admission_number) -- UPDATED: Unique per school
);

-- Student Contacts Table
CREATE TABLE student_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('father', 'mother', 'guardian')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    occupation VARCHAR(100),
    annual_income DECIMAL(15, 2),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Documents Table
CREATE TABLE student_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('birth_certificate', 'previous_school', 'id_proof', 'photo')),
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Admissions History Table
CREATE TABLE student_admissions_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL,
    section_id UUID,
    admission_date DATE NOT NULL,
    leaving_date DATE,
    reason_for_leaving TEXT,
    transfer_certificate_issued BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Certificates Table
CREATE TABLE student_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('bonafide', 'transfer', 'character', 'leaving')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED: user_id instead of staff_id
    certificate_number VARCHAR(100),
    file_url TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, certificate_number) -- UPDATED: Unique per school
);

-- Student ID Cards Table
CREATE TABLE student_id_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    card_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'lost')),
    barcode VARCHAR(100),
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, card_number) -- UPDATED: Unique per school
);

-- =====================================================
-- 4. HR / STAFF MODULE
-- =====================================================

-- Staff Table
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    employee_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    father_name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(10),
    religion VARCHAR(50),
    nationality VARCHAR(50) DEFAULT 'Pakistan',
    photo_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    alternate_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    joining_date DATE NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    qualification VARCHAR(255),
    experience_years INTEGER,
    employment_type VARCHAR(20) CHECK (employment_type IN ('permanent', 'contract', 'temporary')),
    marital_status VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned', 'terminated')),
    leaving_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, employee_number) -- UPDATED: Unique per school
);

-- Staff Documents Table
CREATE TABLE staff_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('resume', 'degree', 'certificate', 'id_proof')),
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Certificates Table
CREATE TABLE staff_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('experience', 'relieving', 'appreciation')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issued_by VARCHAR(255),
    certificate_number VARCHAR(100),
    file_url TEXT,
    remarks TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, certificate_number) -- UPDATED: Unique per school
);

-- Staff ID Cards Table
CREATE TABLE staff_id_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    card_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'lost')),
    barcode VARCHAR(100),
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, card_number) -- UPDATED: Unique per school
);

-- =====================================================
-- 5. ATTENDANCE MODULE
-- =====================================================

-- Staff Attendance Table
CREATE TABLE staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half-day', 'late', 'on-leave')),
    remarks TEXT,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, staff_id, attendance_date) -- UPDATED: Unique per school
);

-- Student Attendance Table
CREATE TABLE student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    class_id UUID NOT NULL,
    section_id UUID,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half-day', 'late', 'on-leave')),
    remarks TEXT,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, student_id, attendance_date) -- UPDATED: Unique per school
);

-- Leave Applications Table
CREATE TABLE leave_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    applicant_type VARCHAR(20) NOT NULL CHECK (applicant_type IN ('staff', 'student')),
    applicant_id UUID NOT NULL,
    leave_type VARCHAR(50) CHECK (leave_type IN ('sick', 'casual', 'annual', 'maternity', 'other')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    approval_date DATE,
    remarks TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holidays Table
CREATE TABLE holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    holiday_name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(50) CHECK (holiday_type IN ('national', 'religious', 'optional')),
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. CLASSES MODULE
-- =====================================================

-- Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    class_name VARCHAR(50) NOT NULL,
    class_numeric INTEGER NOT NULL,
    standard_fee NUMERIC(10,2) DEFAULT 0,  -- NEW COLUMN
    order_number INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_name)
);

-- Sections Table
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    section_name VARCHAR(10) NOT NULL,
    class_teacher_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    room_number VARCHAR(50),
    capacity INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_id, section_name) -- UPDATED: Unique per school
);

-- Subjects Table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    subject_name VARCHAR(100) NOT NULL,
    subject_code VARCHAR(50),
    subject_type VARCHAR(20) CHECK (subject_type IN ('theory', 'practical', 'both')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, subject_code)
);

-- Class Subjects Table (Junction Table)
CREATE TABLE class_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    is_compulsory BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_id, subject_id) -- UPDATED: Unique per school
);

-- Subject Teachers Table
CREATE TABLE subject_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_id, section_id, subject_id, session_id) -- UPDATED: Unique per school
);

-- =====================================================
-- 7. TIMETABLE MODULE
-- =====================================================

-- Periods Table
CREATE TABLE periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    period_number INTEGER NOT NULL,
    period_name VARCHAR(100),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    period_type VARCHAR(20) DEFAULT 'regular' CHECK (period_type IN ('regular', 'break', 'lunch')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, period_number)
);

-- Timetable Table
CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    room_number VARCHAR(50),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_id, section_id, session_id, day_of_week, period_number) -- UPDATED: Unique per school
);

-- =====================================================
-- 8. EXAMINATION MODULE
-- =====================================================

-- Exams Table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    exam_name VARCHAR(100) NOT NULL,
    exam_type VARCHAR(50) CHECK (exam_type IN ('term', 'unit', 'final', 'assessment')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    result_declaration_date DATE,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam Schedules (Date Sheet) Table
CREATE TABLE exam_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    total_marks DECIMAL(5, 2) NOT NULL,
    passing_marks DECIMAL(5, 2) NOT NULL,
    instructions TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, exam_id, class_id, subject_id) -- UPDATED: Unique per school
);

-- Exam Marks Table
CREATE TABLE exam_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    theory_marks DECIMAL(5, 2),
    practical_marks DECIMAL(5, 2),
    total_marks DECIMAL(5, 2) NOT NULL,
    obtained_marks DECIMAL(5, 2) NOT NULL,
    grade VARCHAR(10),
    remarks TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    entry_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, exam_id, student_id, subject_id) -- UPDATED: Unique per school
);

-- Grade Scales Table
CREATE TABLE grade_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    grade_name VARCHAR(10) NOT NULL,
    min_percentage DECIMAL(5, 2) NOT NULL,
    max_percentage DECIMAL(5, 2) NOT NULL,
    grade_point DECIMAL(3, 2),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam Results Table
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    total_marks DECIMAL(8, 2) NOT NULL,
    obtained_marks DECIMAL(8, 2) NOT NULL,
    percentage DECIMAL(5, 2),
    grade VARCHAR(10),
    rank INTEGER,
    remarks TEXT,
    status VARCHAR(20) CHECK (status IN ('pass', 'fail')),
    published_date DATE,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, exam_id, student_id) -- UPDATED: Unique per school
);

-- Report Cards Table
CREATE TABLE report_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    exam_result_id UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    generated_date DATE DEFAULT CURRENT_DATE,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. FEE MODULE
-- =====================================================

-- Fee Types Table
CREATE TABLE fee_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    fee_name VARCHAR(100) NOT NULL,
    fee_code VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, fee_code)
);

-- Fee Structures Table
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    fee_type_id UUID NOT NULL REFERENCES fee_types(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee Challans Table
CREATE TABLE fee_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    challan_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, challan_number) -- UPDATED: Unique per school
);

-- Fee Challan Items Table
CREATE TABLE fee_challan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    challan_id UUID NOT NULL REFERENCES fee_challans(id) ON DELETE CASCADE,
    fee_type_id UUID NOT NULL REFERENCES fee_types(id) ON DELETE CASCADE,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee Payments Table
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    challan_id UUID NOT NULL REFERENCES fee_challans(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'cheque', 'online', 'card', 'bank_transfer')),
    transaction_id VARCHAR(255),
    cheque_number VARCHAR(100),
    bank_name VARCHAR(255),
    received_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    receipt_number VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, receipt_number) -- UPDATED: Unique per school
);

-- Fee Concessions Table
CREATE TABLE fee_concessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    fee_type_id UUID REFERENCES fee_types(id) ON DELETE CASCADE,
    concession_type VARCHAR(20) CHECK (concession_type IN ('percentage', 'fixed')),
    concession_value DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    from_date DATE NOT NULL,
    to_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. PAYROLL MODULE
-- =====================================================

-- Salary Structures Table
CREATE TABLE salary_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    basic_salary DECIMAL(12, 2) NOT NULL,
    house_allowance DECIMAL(12, 2) DEFAULT 0,
    medical_allowance DECIMAL(12, 2) DEFAULT 0,
    transport_allowance DECIMAL(12, 2) DEFAULT 0,
    other_allowances DECIMAL(12, 2) DEFAULT 0,
    provident_fund DECIMAL(12, 2) DEFAULT 0,
    tax_deduction DECIMAL(12, 2) DEFAULT 0,
    other_deductions DECIMAL(12, 2) DEFAULT 0,
    gross_salary DECIMAL(12, 2) NOT NULL,
    net_salary DECIMAL(12, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Payments Table
CREATE TABLE salary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    payment_month INTEGER NOT NULL CHECK (payment_month BETWEEN 1 AND 12),
    payment_year INTEGER NOT NULL,
    basic_salary DECIMAL(12, 2) NOT NULL,
    total_allowances DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) DEFAULT 0,
    gross_salary DECIMAL(12, 2) NOT NULL,
    net_salary DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'cheque', 'bank_transfer')),
    transaction_id VARCHAR(255),
    paid_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, staff_id, payment_month, payment_year) -- UPDATED: Unique per school
);

-- Salary Slips Table
CREATE TABLE salary_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    salary_payment_id UUID NOT NULL REFERENCES salary_payments(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    slip_number VARCHAR(100) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    generated_date DATE DEFAULT CURRENT_DATE,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, slip_number) -- UPDATED: Unique per school
);

-- Expense Categories Table
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, category_name)
);

-- Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    expense_category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'cheque', 'online', 'bank_transfer')),
    invoice_number VARCHAR(100),
    vendor_name VARCHAR(255),
    description TEXT,
    paid_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. TRANSPORT MODULE
-- =====================================================

-- Vehicles Table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    vehicle_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('bus', 'van', 'car')),
    model VARCHAR(100),
    manufacture_year INTEGER,
    capacity INTEGER,
    driver_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    conductor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    insurance_expiry DATE,
    fitness_certificate_expiry DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, vehicle_number) -- UPDATED: Unique per school
);

-- Transport Routes Table
CREATE TABLE transport_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    route_name VARCHAR(255) NOT NULL,
    route_number VARCHAR(50),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    start_location TEXT,
    end_location TEXT,
    total_distance DECIMAL(8, 2),
    estimated_time INTEGER,
    monthly_fee DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, route_number)
);

-- Route Stops Table
CREATE TABLE route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(255) NOT NULL,
    stop_address TEXT,
    stop_order INTEGER NOT NULL,
    arrival_time TIME,
    departure_time TIME,
    pickup_fee DECIMAL(10, 2),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport Passengers Table
CREATE TABLE transport_passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
    pickup_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,
    drop_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle Maintenance Table
CREATE TABLE vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('regular', 'repair', 'inspection', 'other')),
    description TEXT,
    cost DECIMAL(10, 2),
    vendor_name VARCHAR(255),
    next_maintenance_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. LIBRARY MODULE
-- =====================================================

-- Books Table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    book_title VARCHAR(255) NOT NULL,
    isbn VARCHAR(50),
    author VARCHAR(255),
    publisher VARCHAR(255),
    edition VARCHAR(50),
    publication_year INTEGER,
    category VARCHAR(100),
    book_number VARCHAR(50),
    rack_number VARCHAR(50),
    price DECIMAL(10, 2),
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, book_number) -- UPDATED: Unique per school
);

-- Library Members Table
CREATE TABLE library_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('student', 'staff')),
    member_id UUID NOT NULL,
    membership_number VARCHAR(50) NOT NULL,
    membership_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, membership_number) -- UPDATED: Unique per school
);

-- Book Issues Table
CREATE TABLE book_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    borrower_type VARCHAR(20) NOT NULL CHECK (borrower_type IN ('student', 'staff')),
    borrower_id UUID NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount DECIMAL(10, 2) DEFAULT 0,
    fine_paid BOOLEAN DEFAULT false,
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. REPORTS MODULE
-- =====================================================

-- Report Templates Table
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    report_name VARCHAR(255) NOT NULL,
    report_category VARCHAR(50) CHECK (report_category IN ('student', 'staff', 'fee', 'exam', 'attendance', 'other')),
    description TEXT,
    template_file TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Reports Table
CREATE TABLE generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    report_template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- UPDATED
    report_parameters JSONB,
    file_url TEXT NOT NULL,
    generation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 14. SETTINGS MODULE
-- =====================================================

-- School Settings Table
CREATE TABLE school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) CHECK (setting_type IN ('text', 'number', 'boolean', 'json')),
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NEW
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, setting_key)
);

-- =====================================================
-- 15. AUDIT & SUPPORT TABLES
-- =====================================================

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout')),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Uploads Table
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NEW
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    file_path TEXT NOT NULL,
    upload_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Core Tables
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_staff_id ON users(staff_id);
CREATE INDEX idx_sessions_school_current ON sessions(school_id, is_current);

-- Students
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_admission_number ON students(school_id, admission_number);
CREATE INDEX idx_students_class_section ON students(school_id, current_class_id, current_section_id);
CREATE INDEX idx_students_status ON students(school_id, status);
CREATE INDEX idx_student_contacts_student ON student_contacts(student_id);
CREATE INDEX idx_student_contacts_school ON student_contacts(school_id);

-- Staff
CREATE INDEX idx_staff_school_id ON staff(school_id);
CREATE INDEX idx_staff_employee_number ON staff(school_id, employee_number);
CREATE INDEX idx_staff_status ON staff(school_id, status);

-- Attendance
CREATE INDEX idx_staff_attendance_school_date ON staff_attendance(school_id, staff_id, attendance_date);
CREATE INDEX idx_student_attendance_school_date ON student_attendance(school_id, student_id, attendance_date);
CREATE INDEX idx_student_attendance_class ON student_attendance(school_id, class_id, section_id, attendance_date);

-- Classes
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_sections_school_class ON sections(school_id, class_id);
CREATE INDEX idx_subjects_school_id ON subjects(school_id);

-- Fee Management
CREATE INDEX idx_fee_challans_school_student ON fee_challans(school_id, student_id, status);
CREATE INDEX idx_fee_payments_school_student ON fee_payments(school_id, student_id, payment_date);
CREATE INDEX idx_fee_concessions_school_student ON fee_concessions(school_id, student_id, status);

-- Exams
CREATE INDEX idx_exams_school_session ON exams(school_id, session_id);
CREATE INDEX idx_exam_marks_school_exam ON exam_marks(school_id, exam_id, student_id);
CREATE INDEX idx_exam_results_school_exam ON exam_results(school_id, exam_id);

-- Transport
CREATE INDEX idx_vehicles_school_id ON vehicles(school_id);
CREATE INDEX idx_transport_routes_school_id ON transport_routes(school_id);
CREATE INDEX idx_transport_passengers_school ON transport_passengers(school_id, student_id);

-- Library
CREATE INDEX idx_books_school_id ON books(school_id);
CREATE INDEX idx_book_issues_school_borrower ON book_issues(school_id, borrower_type, borrower_id, status);
CREATE INDEX idx_library_members_school ON library_members(school_id, member_type, member_id);

-- Audit
CREATE INDEX idx_audit_logs_school_user ON audit_logs(school_id, user_id, timestamp);
CREATE INDEX idx_audit_logs_table ON audit_logs(school_id, table_name, record_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update available_copies when book is issued/returned
CREATE OR REPLACE FUNCTION update_book_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'issued' THEN
        UPDATE books SET available_copies = available_copies - 1
        WHERE id = NEW.book_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'issued' AND NEW.status = 'returned' THEN
        UPDATE books SET available_copies = available_copies + 1
        WHERE id = NEW.book_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_book_availability
AFTER INSERT OR UPDATE ON book_issues
FOR EACH ROW EXECUTE FUNCTION update_book_availability();

-- =====================================================
-- VIEWS FOR COMMON QUERIES (School-Scoped)
-- =====================================================

-- View for active students with class details
CREATE VIEW v_active_students AS
SELECT 
    s.school_id,
    s.id,
    s.admission_number,
    s.first_name || ' ' || COALESCE(s.last_name, '') AS full_name,
    s.father_name,
    s.date_of_birth,
    s.gender,
    c.class_name,
    sec.section_name,
    s.roll_number,
    s.photo_url,
    s.status
FROM students s
LEFT JOIN classes c ON s.current_class_id = c.id
LEFT JOIN sections sec ON s.current_section_id = sec.id
WHERE s.status = 'active';

-- View for active staff
CREATE VIEW v_active_staff AS
SELECT 
    st.school_id,
    st.id,
    st.employee_number,
    st.first_name || ' ' || COALESCE(st.last_name, '') AS full_name,
    st.designation,
    st.department,
    st.phone,
    st.email,
    st.joining_date,
    st.employment_type,
    st.status
FROM staff st
WHERE st.status = 'active';

-- View for pending fee challans
CREATE VIEW v_pending_fee_challans AS
SELECT 
    fc.school_id,
    fc.id,
    fc.challan_number,
    s.admission_number,
    s.first_name || ' ' || COALESCE(s.last_name, '') AS student_name,
    c.class_name,
    sec.section_name,
    fc.issue_date,
    fc.due_date,
    fc.total_amount,
    fc.status
FROM fee_challans fc
JOIN students s ON fc.student_id = s.id
LEFT JOIN classes c ON s.current_class_id = c.id
LEFT JOIN sections sec ON s.current_section_id = sec.id
WHERE fc.status IN ('pending', 'overdue');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
-- Multi-tenant SaaS schema created successfully!
-- Key Changes:
-- 1. Added school_id to ALL tables for data isolation
-- 2. Added created_by/uploaded_by/generated_by for user tracking
-- 3. Updated UNIQUE constraints to be school-scoped
-- 4. Added subscription fields to schools table
-- 5. Made username/email unique per school (not globally)
-- 6. Added comprehensive indexes for school_id filtering
-- 7. Updated all views to include school_id
-- 
-- Remember to implement:
-- 1. Row Level Security (RLS) policies based on school_id
-- 2. Authentication with school_id in JWT tokens
-- 3. API middleware to filter by school_id
-- 4. Subscription management and access control
-- =====================================================