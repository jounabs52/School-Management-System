create table public.admission_inquiries (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  session_id uuid null,
  class_id uuid null,
  inquiry_no character varying(50) not null,
  name character varying(200) not null,
  phone character varying(20) not null,
  email character varying(200) null,
  address text null,
  gender character varying(20) null,
  date_of_birth date null,
  father_name character varying(255) null,
  father_mobile character varying(20) null,
  father_cnic character varying(50) null,
  father_qualification character varying(100) null,
  father_profession character varying(100) null,
  mother_name character varying(255) null,
  mother_mobile character varying(20) null,
  mother_cnic character varying(50) null,
  mother_qualification character varying(100) null,
  mother_profession character varying(100) null,
  blood_group character varying(10) null,
  region character varying(100) null,
  current_address text null,
  previous_school character varying(255) null,
  inquiry_source character varying(100) null,
  date date not null default CURRENT_DATE,
  follow_up_date date null,
  note text null,
  reference character varying(200) null,
  status character varying(50) null default 'pending'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint admission_inquiries_pkey primary key (id),
  constraint admission_inquiries_school_id_inquiry_no_key unique (school_id, inquiry_no),
  constraint admission_inquiries_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint admission_inquiries_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint admission_inquiries_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint admission_inquiries_session_id_fkey foreign KEY (session_id) references sessions (id) on delete set null,
  constraint admission_inquiries_class_id_fkey foreign KEY (class_id) references classes (id) on delete set null,
  constraint admission_inquiries_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint admission_inquiries_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'contacted'::character varying,
            'visited'::character varying,
            'admitted'::character varying,
            'rejected'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_admission_inquiries_school_id on public.admission_inquiries using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_admission_inquiries_inquiry_no on public.admission_inquiries using btree (inquiry_no) TABLESPACE pg_default;

create index IF not exists idx_admission_inquiries_phone on public.admission_inquiries using btree (phone) TABLESPACE pg_default;

create index IF not exists idx_admission_inquiries_date on public.admission_inquiries using btree (date) TABLESPACE pg_default;

create index IF not exists idx_admission_inquiries_status on public.admission_inquiries using btree (status) TABLESPACE pg_default;

create index IF not exists idx_admission_inquiries_class_id on public.admission_inquiries using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_admission_inquiries_session_id on public.admission_inquiries using btree (session_id) TABLESPACE pg_default;

create index IF not exists idx_admission_inquiries_user_id on public.admission_inquiries using btree (user_id) TABLESPACE pg_default;

create trigger update_admission_inquiries_updated_at BEFORE
update on admission_inquiries for EACH row
execute FUNCTION update_updated_at_column ();
create table public.audit_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid null,
  user_id uuid null,
  action character varying(50) not null,
  table_name character varying(100) not null,
  record_id uuid null,
  old_values jsonb null,
  new_values jsonb null,
  ip_address inet null,
  timestamp timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  constraint audit_logs_pkey primary key (id),
  constraint audit_logs_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint audit_logs_user_id_fkey foreign KEY (user_id) references users (id) on delete set null,
  constraint audit_logs_action_check check (
    (
      (action)::text = any (
        (
          array[
            'create'::character varying,
            'update'::character varying,
            'delete'::character varying,
            'login'::character varying,
            'logout'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_audit_logs_school_user on public.audit_logs using btree (school_id, user_id, "timestamp") TABLESPACE pg_default;

create index IF not exists idx_audit_logs_table on public.audit_logs using btree (school_id, table_name, record_id) TABLESPACE pg_default;
create table public.audit_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid null,
  user_id uuid null,
  action character varying(50) not null,
  table_name character varying(100) not null,
  record_id uuid null,
  old_values jsonb null,
  new_values jsonb null,
  ip_address inet null,
  timestamp timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  constraint audit_logs_pkey primary key (id),
  constraint audit_logs_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint audit_logs_user_id_fkey foreign KEY (user_id) references users (id) on delete set null,
  constraint audit_logs_action_check check (
    (
      (action)::text = any (
        (
          array[
            'create'::character varying,
            'update'::character varying,
            'delete'::character varying,
            'login'::character varying,
            'logout'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_audit_logs_school_user on public.audit_logs using btree (school_id, user_id, "timestamp") TABLESPACE pg_default;

create index IF not exists idx_audit_logs_table on public.audit_logs using btree (school_id, table_name, record_id) TABLESPACE pg_default;
create table public.books (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  book_title character varying(255) not null,
  isbn character varying(50) null,
  author character varying(255) null,
  publisher character varying(255) null,
  edition character varying(50) null,
  publication_year integer null,
  category character varying(100) null,
  book_number character varying(50) null,
  rack_number character varying(50) null,
  price numeric(10, 2) null,
  total_copies integer null default 1,
  available_copies integer null default 1,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint books_pkey primary key (id),
  constraint books_school_id_book_number_key unique (school_id, book_number),
  constraint books_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint books_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint books_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint books_status_check check (
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

create index IF not exists idx_books_school_id on public.books using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_books_user_id on public.books using btree (user_id) TABLESPACE pg_default;
create table public.class_subjects (
  id uuid not null default extensions.uuid_generate_v4 (),
  class_id uuid not null,
  school_id uuid not null,
  subject_id uuid not null,
  is_compulsory boolean null default true,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint class_subjects_pkey primary key (id),
  constraint class_subjects_school_id_class_id_subject_id_key unique (school_id, class_id, subject_id),
  constraint class_subjects_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint class_subjects_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint class_subjects_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint class_subjects_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete CASCADE,
  constraint class_subjects_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_class_subjects_user_id on public.class_subjects using btree (user_id) TABLESPACE pg_default;
create table public.classes (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  class_name character varying(50) not null,
  order_number integer null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  class_incharge_id uuid null,
  marking_system text null,
  incharge character varying(100) null,
  exam_marking_system character varying(50) null,
  fee_plan character varying(20) null default 'monthly'::character varying,
  standard_fee numeric(10, 2) null default 0,
  user_id uuid not null,
  constraint classes_pkey primary key (id),
  constraint classes_school_id_class_name_key unique (school_id, class_name),
  constraint classes_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint classes_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint classes_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint classes_class_incharge_id_fkey foreign KEY (class_incharge_id) references staff (id) on delete set null,
  constraint classes_fee_plan_check check (
    (
      (fee_plan)::text = any (
        (
          array[
            'monthly'::character varying,
            'quarterly'::character varying,
            'semi-annual'::character varying,
            'annual'::character varying,
            'one-time'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint classes_status_check check (
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

create index IF not exists idx_classes_school_id on public.classes using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_classes_user_id on public.classes using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_classes BEFORE INSERT on classes for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_classes_updated_at BEFORE
update on classes for EACH row
execute FUNCTION update_updated_at_column ();
create table public.contact_groups (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  group_name character varying(100) not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint contact_groups_pkey primary key (id),
  constraint contact_groups_school_id_group_name_key unique (school_id, group_name),
  constraint contact_groups_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint contact_groups_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint contact_groups_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_contact_groups_school_id on public.contact_groups using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_contact_groups_user_id on public.contact_groups using btree (user_id) TABLESPACE pg_default;

create trigger update_contact_groups_updated_at BEFORE
update on contact_groups for EACH row
execute FUNCTION update_updated_at_column ();
create table public.contact_groups (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  group_name character varying(100) not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint contact_groups_pkey primary key (id),
  constraint contact_groups_school_id_group_name_key unique (school_id, group_name),
  constraint contact_groups_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint contact_groups_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint contact_groups_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_contact_groups_school_id on public.contact_groups using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_contact_groups_user_id on public.contact_groups using btree (user_id) TABLESPACE pg_default;

create trigger update_contact_groups_updated_at BEFORE
update on contact_groups for EACH row
execute FUNCTION update_updated_at_column ();
create table public.datesheet_configurations (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  config_name character varying(255) not null,
  config_type character varying(50) not null,
  configuration jsonb not null,
  is_default boolean null default false,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint datesheet_configurations_pkey primary key (id),
  constraint datesheet_configurations_school_id_config_name_config_type_key unique (school_id, config_name, config_type),
  constraint datesheet_configurations_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint datesheet_configurations_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint datesheet_configurations_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint datesheet_configurations_config_type_check check (
    (
      (config_type)::text = any (
        (
          array[
            'print_settings'::character varying,
            'slip_template'::character varying,
            'report_template'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_datesheet_configurations_school on public.datesheet_configurations using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_datesheet_configurations_user_id on public.datesheet_configurations using btree (user_id) TABLESPACE pg_default;

create trigger update_datesheet_configurations_updated_at BEFORE
update on datesheet_configurations for EACH row
execute FUNCTION update_updated_at_column ();
create table public.datesheet_configurations (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  config_name character varying(255) not null,
  config_type character varying(50) not null,
  configuration jsonb not null,
  is_default boolean null default false,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint datesheet_configurations_pkey primary key (id),
  constraint datesheet_configurations_school_id_config_name_config_type_key unique (school_id, config_name, config_type),
  constraint datesheet_configurations_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint datesheet_configurations_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint datesheet_configurations_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint datesheet_configurations_config_type_check check (
    (
      (config_type)::text = any (
        (
          array[
            'print_settings'::character varying,
            'slip_template'::character varying,
            'report_template'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_datesheet_configurations_school on public.datesheet_configurations using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_datesheet_configurations_user_id on public.datesheet_configurations using btree (user_id) TABLESPACE pg_default;

create trigger update_datesheet_configurations_updated_at BEFORE
update on datesheet_configurations for EACH row
execute FUNCTION update_updated_at_column ();
create table public.datesheet_configurations (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  config_name character varying(255) not null,
  config_type character varying(50) not null,
  configuration jsonb not null,
  is_default boolean null default false,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint datesheet_configurations_pkey primary key (id),
  constraint datesheet_configurations_school_id_config_name_config_type_key unique (school_id, config_name, config_type),
  constraint datesheet_configurations_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint datesheet_configurations_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint datesheet_configurations_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint datesheet_configurations_config_type_check check (
    (
      (config_type)::text = any (
        (
          array[
            'print_settings'::character varying,
            'slip_template'::character varying,
            'report_template'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_datesheet_configurations_school on public.datesheet_configurations using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_datesheet_configurations_user_id on public.datesheet_configurations using btree (user_id) TABLESPACE pg_default;

create trigger update_datesheet_configurations_updated_at BEFORE
update on datesheet_configurations for EACH row
execute FUNCTION update_updated_at_column ();
create table public.datesheets (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  session character varying(50) not null,
  created_by uuid null,
  title character varying(255) not null,
  start_date date not null,
  default_start_time time without time zone null default '11:00:00'::time without time zone,
  default_end_time time without time zone null default '12:30:00'::time without time zone,
  interval_days integer null default 2,
  saturday_off boolean null default true,
  sunday_off boolean null default true,
  exam_center character varying(255) null,
  class_ids uuid[] null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint datesheets_pkey primary key (id),
  constraint datesheets_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint datesheets_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint datesheets_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_datesheets_school_session on public.datesheets using btree (school_id, session) TABLESPACE pg_default;

create index IF not exists idx_datesheets_user_id on public.datesheets using btree (user_id) TABLESPACE pg_default;
create table public.departments (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  department_name character varying(100) not null,
  description text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint departments_pkey primary key (id),
  constraint departments_school_id_department_name_key unique (school_id, department_name),
  constraint departments_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint departments_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint departments_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_departments_school_id on public.departments using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_departments_user_id on public.departments using btree (user_id) TABLESPACE pg_default;

create trigger update_departments_updated_at BEFORE
update on departments for EACH row
execute FUNCTION update_updated_at_column ();
create table public.exam_marks (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  exam_id uuid not null,
  student_id uuid not null,
  class_id uuid not null,
  section_id uuid null,
  subject_id uuid not null,
  theory_marks numeric(5, 2) null,
  practical_marks numeric(5, 2) null,
  total_marks numeric(5, 2) not null,
  obtained_marks numeric(5, 2) not null,
  grade character varying(10) null,
  remarks text null,
  entered_by uuid null,
  entry_date date null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint exam_marks_pkey primary key (id),
  constraint exam_marks_school_id_exam_id_student_id_subject_id_key unique (school_id, exam_id, student_id, subject_id),
  constraint exam_marks_exam_id_fkey foreign KEY (exam_id) references exams (id) on delete CASCADE,
  constraint exam_marks_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint exam_marks_section_id_fkey foreign KEY (section_id) references sections (id) on delete CASCADE,
  constraint exam_marks_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint exam_marks_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete CASCADE,
  constraint exam_marks_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint exam_marks_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint exam_marks_entered_by_fkey foreign KEY (entered_by) references users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_school_exam on public.exam_marks using btree (school_id, exam_id, student_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_exam_id on public.exam_marks using btree (exam_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_student_id on public.exam_marks using btree (student_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_subject_id on public.exam_marks using btree (subject_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_class_id on public.exam_marks using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_section_id on public.exam_marks using btree (section_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_school_id on public.exam_marks using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_exam_student on public.exam_marks using btree (exam_id, student_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_exam_subject on public.exam_marks using btree (exam_id, subject_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_user_id on public.exam_marks using btree (user_id) TABLESPACE pg_default;
create table public.exam_marks (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  exam_id uuid not null,
  student_id uuid not null,
  class_id uuid not null,
  section_id uuid null,
  subject_id uuid not null,
  theory_marks numeric(5, 2) null,
  practical_marks numeric(5, 2) null,
  total_marks numeric(5, 2) not null,
  obtained_marks numeric(5, 2) not null,
  grade character varying(10) null,
  remarks text null,
  entered_by uuid null,
  entry_date date null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint exam_marks_pkey primary key (id),
  constraint exam_marks_school_id_exam_id_student_id_subject_id_key unique (school_id, exam_id, student_id, subject_id),
  constraint exam_marks_exam_id_fkey foreign KEY (exam_id) references exams (id) on delete CASCADE,
  constraint exam_marks_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint exam_marks_section_id_fkey foreign KEY (section_id) references sections (id) on delete CASCADE,
  constraint exam_marks_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint exam_marks_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete CASCADE,
  constraint exam_marks_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint exam_marks_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint exam_marks_entered_by_fkey foreign KEY (entered_by) references users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_school_exam on public.exam_marks using btree (school_id, exam_id, student_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_exam_id on public.exam_marks using btree (exam_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_student_id on public.exam_marks using btree (student_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_subject_id on public.exam_marks using btree (subject_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_class_id on public.exam_marks using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_section_id on public.exam_marks using btree (section_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_school_id on public.exam_marks using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_exam_student on public.exam_marks using btree (exam_id, student_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_exam_subject on public.exam_marks using btree (exam_id, subject_id) TABLESPACE pg_default;

create index IF not exists idx_exam_marks_user_id on public.exam_marks using btree (user_id) TABLESPACE pg_default;
create table public.exams (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  session_id uuid not null,
  created_by uuid null,
  exam_name character varying(100) not null,
  exam_type character varying(50) null,
  start_date date not null,
  end_date date not null,
  result_declaration_date date null,
  status character varying(20) null default 'scheduled'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  exam_date date null,
  result_date date null,
  class_id uuid null,
  section_id uuid null,
  total_marks numeric(10, 2) null,
  details text null,
  user_id uuid not null,
  constraint exams_pkey primary key (id),
  constraint exams_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint exams_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint exams_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint exams_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint exams_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint exams_section_id_fkey foreign KEY (section_id) references sections (id) on delete set null,
  constraint exams_exam_type_check check (
    (
      (exam_type)::text = any (
        (
          array[
            'term'::character varying,
            'unit'::character varying,
            'final'::character varying,
            'assessment'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint exams_status_check check (
    (
      (status)::text = any (
        (
          array[
            'scheduled'::character varying,
            'ongoing'::character varying,
            'completed'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_exams_school_session on public.exams using btree (school_id, session_id) TABLESPACE pg_default;

create index IF not exists idx_exams_class_id on public.exams using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_exams_section_id on public.exams using btree (section_id) TABLESPACE pg_default;

create index IF not exists idx_exams_session_id on public.exams using btree (session_id) TABLESPACE pg_default;

create index IF not exists idx_exams_school_id on public.exams using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_exams_status on public.exams using btree (status) TABLESPACE pg_default;

create index IF not exists idx_exams_start_date on public.exams using btree (start_date) TABLESPACE pg_default;

create index IF not exists idx_exams_user_id on public.exams using btree (user_id) TABLESPACE pg_default;
create table public.exams (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  session_id uuid not null,
  created_by uuid null,
  exam_name character varying(100) not null,
  exam_type character varying(50) null,
  start_date date not null,
  end_date date not null,
  result_declaration_date date null,
  status character varying(20) null default 'scheduled'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  exam_date date null,
  result_date date null,
  class_id uuid null,
  section_id uuid null,
  total_marks numeric(10, 2) null,
  details text null,
  user_id uuid not null,
  constraint exams_pkey primary key (id),
  constraint exams_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint exams_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint exams_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint exams_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint exams_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint exams_section_id_fkey foreign KEY (section_id) references sections (id) on delete set null,
  constraint exams_exam_type_check check (
    (
      (exam_type)::text = any (
        (
          array[
            'term'::character varying,
            'unit'::character varying,
            'final'::character varying,
            'assessment'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint exams_status_check check (
    (
      (status)::text = any (
        (
          array[
            'scheduled'::character varying,
            'ongoing'::character varying,
            'completed'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_exams_school_session on public.exams using btree (school_id, session_id) TABLESPACE pg_default;

create index IF not exists idx_exams_class_id on public.exams using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_exams_section_id on public.exams using btree (section_id) TABLESPACE pg_default;

create index IF not exists idx_exams_session_id on public.exams using btree (session_id) TABLESPACE pg_default;

create index IF not exists idx_exams_school_id on public.exams using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_exams_status on public.exams using btree (status) TABLESPACE pg_default;

create index IF not exists idx_exams_start_date on public.exams using btree (start_date) TABLESPACE pg_default;

create index IF not exists idx_exams_user_id on public.exams using btree (user_id) TABLESPACE pg_default;
create table public.exams (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  session_id uuid not null,
  created_by uuid null,
  exam_name character varying(100) not null,
  exam_type character varying(50) null,
  start_date date not null,
  end_date date not null,
  result_declaration_date date null,
  status character varying(20) null default 'scheduled'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  exam_date date null,
  result_date date null,
  class_id uuid null,
  section_id uuid null,
  total_marks numeric(10, 2) null,
  details text null,
  user_id uuid not null,
  constraint exams_pkey primary key (id),
  constraint exams_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint exams_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint exams_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint exams_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint exams_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint exams_section_id_fkey foreign KEY (section_id) references sections (id) on delete set null,
  constraint exams_exam_type_check check (
    (
      (exam_type)::text = any (
        (
          array[
            'term'::character varying,
            'unit'::character varying,
            'final'::character varying,
            'assessment'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint exams_status_check check (
    (
      (status)::text = any (
        (
          array[
            'scheduled'::character varying,
            'ongoing'::character varying,
            'completed'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_exams_school_session on public.exams using btree (school_id, session_id) TABLESPACE pg_default;

create index IF not exists idx_exams_class_id on public.exams using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_exams_section_id on public.exams using btree (section_id) TABLESPACE pg_default;

create index IF not exists idx_exams_session_id on public.exams using btree (session_id) TABLESPACE pg_default;

create index IF not exists idx_exams_school_id on public.exams using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_exams_status on public.exams using btree (status) TABLESPACE pg_default;

create index IF not exists idx_exams_start_date on public.exams using btree (start_date) TABLESPACE pg_default;

create index IF not exists idx_exams_user_id on public.exams using btree (user_id) TABLESPACE pg_default;
create table public.fee_challan_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  challan_id uuid not null,
  fee_type_id uuid not null,
  description text null,
  amount numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  constraint fee_challan_items_pkey primary key (id),
  constraint fee_challan_items_challan_id_fkey foreign KEY (challan_id) references fee_challans (id) on delete CASCADE,
  constraint fee_challan_items_fee_type_id_fkey foreign KEY (fee_type_id) references fee_types (id) on delete CASCADE,
  constraint fee_challan_items_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE
) TABLESPACE pg_default;
create table public.fee_challans (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  session_id uuid not null,
  student_id uuid not null,
  challan_number character varying(100) not null,
  issue_date date not null default CURRENT_DATE,
  due_date date not null,
  total_amount numeric(10, 2) not null,
  status character varying(20) null default 'pending'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint fee_challans_pkey primary key (id),
  constraint fee_challans_school_id_challan_number_key unique (school_id, challan_number),
  constraint fee_challans_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint fee_challans_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint fee_challans_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint fee_challans_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint fee_challans_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint fee_challans_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'paid'::character varying,
            'overdue'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_fee_challans_user_id on public.fee_challans using btree (user_id) TABLESPACE pg_default;
create table public.fee_concessions (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  student_id uuid not null,
  session_id uuid not null,
  fee_type_id uuid null,
  concession_type character varying(20) null,
  concession_value numeric(10, 2) not null,
  reason text null,
  approved_by uuid null,
  from_date date not null,
  to_date date null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint fee_concessions_pkey primary key (id),
  constraint fee_concessions_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint fee_concessions_fee_type_id_fkey foreign KEY (fee_type_id) references fee_types (id) on delete CASCADE,
  constraint fee_concessions_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint fee_concessions_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint fee_concessions_approved_by_fkey foreign KEY (approved_by) references users (id) on delete set null,
  constraint fee_concessions_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint fee_concessions_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint fee_concessions_concession_type_check check (
    (
      (concession_type)::text = any (
        (
          array[
            'percentage'::character varying,
            'fixed'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint fee_concessions_status_check check (
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

create index IF not exists idx_fee_concessions_school_student on public.fee_concessions using btree (school_id, student_id, status) TABLESPACE pg_default;

create index IF not exists idx_fee_concessions_user_id on public.fee_concessions using btree (user_id) TABLESPACE pg_default;
create table public.fee_enrollments (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  student_id uuid not null,
  session_id uuid not null,
  class_id uuid not null,
  fee_plan character varying(20) not null,
  monthly_fee numeric(10, 2) not null,
  discount_type character varying(20) null,
  discount_value numeric(10, 2) null default 0,
  discount_amount numeric(10, 2) null default 0,
  final_monthly_fee numeric(10, 2) not null,
  start_month integer not null,
  start_year integer not null,
  end_month integer null,
  end_year integer null,
  total_installments integer not null,
  total_annual_fee numeric(10, 2) not null,
  status character varying(20) null default 'active'::character varying,
  enrolled_by uuid null,
  enrolled_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint fee_enrollments_pkey primary key (id),
  constraint fee_enrollments_school_id_student_id_session_id_key unique (school_id, student_id, session_id),
  constraint fee_enrollments_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint fee_enrollments_enrolled_by_fkey foreign KEY (enrolled_by) references users (id) on delete set null,
  constraint fee_enrollments_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint fee_enrollments_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint fee_enrollments_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint fee_enrollments_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'completed'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint fee_enrollments_fee_plan_check check (
    (
      (fee_plan)::text = any (
        (
          array[
            'monthly'::character varying,
            'quarterly'::character varying,
            'semi-annual'::character varying,
            'annual'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint fee_enrollments_start_month_check check (
    (
      (start_month >= 1)
      and (start_month <= 12)
    )
  ),
  constraint fee_enrollments_discount_type_check check (
    (
      (discount_type)::text = any (
        (
          array[
            'percentage'::character varying,
            'fixed'::character varying,
            'none'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_fee_enrollments_student on public.fee_enrollments using btree (student_id, session_id) TABLESPACE pg_default;

create index IF not exists idx_fee_enrollments_status on public.fee_enrollments using btree (status) TABLESPACE pg_default;
create table public.fee_installment_payments (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  installment_id uuid not null,
  payment_id uuid not null,
  amount_allocated numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  constraint fee_installment_payments_pkey primary key (id),
  constraint fee_installment_payments_installment_id_payment_id_key unique (installment_id, payment_id),
  constraint fee_installment_payments_installment_id_fkey foreign KEY (installment_id) references fee_installments (id) on delete CASCADE,
  constraint fee_installment_payments_payment_id_fkey foreign KEY (payment_id) references fee_payments (id) on delete CASCADE,
  constraint fee_installment_payments_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_installment_payments_installment on public.fee_installment_payments using btree (installment_id) TABLESPACE pg_default;

create index IF not exists idx_installment_payments_payment on public.fee_installment_payments using btree (payment_id) TABLESPACE pg_default;
create table public.fee_installments (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  student_id uuid not null,
  session_id uuid not null,
  class_id uuid not null,
  installment_number integer not null,
  period_type character varying(20) not null,
  period_label character varying(100) not null,
  fee_month integer null,
  fee_year integer not null,
  months_covered text[] null,
  base_amount numeric(10, 2) not null,
  discount_amount numeric(10, 2) null default 0,
  late_fee numeric(10, 2) null default 0,
  total_amount numeric(10, 2) not null,
  paid_amount numeric(10, 2) null default 0,
  balance_amount numeric(10, 2) not null,
  due_date date not null,
  paid_date date null,
  status character varying(20) null default 'pending'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint fee_installments_pkey primary key (id),
  constraint fee_installments_school_id_student_id_session_id_installmen_key unique (
    school_id,
    student_id,
    session_id,
    installment_number
  ),
  constraint fee_installments_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint fee_installments_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint fee_installments_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint fee_installments_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint fee_installments_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint fee_installments_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint fee_installments_period_type_check check (
    (
      (period_type)::text = any (
        (
          array[
            'monthly'::character varying,
            'quarterly'::character varying,
            'semi-annual'::character varying,
            'annual'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint fee_installments_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'paid'::character varying,
            'partial'::character varying,
            'overdue'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_fee_installments_student on public.fee_installments using btree (student_id, session_id) TABLESPACE pg_default;

create index IF not exists idx_fee_installments_status on public.fee_installments using btree (status) TABLESPACE pg_default;

create index IF not exists idx_fee_installments_due_date on public.fee_installments using btree (due_date) TABLESPACE pg_default;

create index IF not exists idx_fee_installments_school_session on public.fee_installments using btree (school_id, session_id) TABLESPACE pg_default;

create index IF not exists idx_fee_installments_user_id on public.fee_installments using btree (user_id) TABLESPACE pg_default;

create trigger trigger_update_installment_status BEFORE INSERT
or
update OF paid_amount,
total_amount,
late_fee,
due_date on fee_installments for EACH row
execute FUNCTION update_installment_status ();
create table public.fee_payment_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  fee_payment_id uuid not null,
  student_fee_period_id uuid not null,
  amount_paid numeric(10, 2) not null,
  fee_type_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint fee_payment_items_pkey primary key (id),
  constraint fee_payment_items_fee_type_id_fkey foreign KEY (fee_type_id) references fee_types (id) on delete CASCADE,
  constraint fee_payment_items_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_fee_payment_items_school on public.fee_payment_items using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_fee_payment_items_payment on public.fee_payment_items using btree (fee_payment_id) TABLESPACE pg_default;

create index IF not exists idx_fee_payment_items_period on public.fee_payment_items using btree (student_fee_period_id) TABLESPACE pg_default;
create table public.fee_payments (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  challan_id uuid not null,
  student_id uuid not null,
  payment_date date not null default CURRENT_DATE,
  amount_paid numeric(10, 2) not null,
  payment_method character varying(50) null,
  transaction_id character varying(255) null,
  cheque_number character varying(100) null,
  bank_name character varying(255) null,
  received_by uuid null,
  receipt_number character varying(100) null,
  remarks text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  installment_ids uuid[] null,
  months_paid text[] null,
  is_advance boolean null default false,
  constraint fee_payments_pkey primary key (id),
  constraint fee_payments_school_id_receipt_number_key unique (school_id, receipt_number),
  constraint fee_payments_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint fee_payments_received_by_fkey foreign KEY (received_by) references users (id) on delete set null,
  constraint fee_payments_challan_id_fkey foreign KEY (challan_id) references fee_challans (id) on delete CASCADE,
  constraint fee_payments_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint fee_payments_payment_method_check check (
    (
      (payment_method)::text = any (
        (
          array[
            'cash'::character varying,
            'cheque'::character varying,
            'online'::character varying,
            'card'::character varying,
            'bank_transfer'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
create table public.fee_structures (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  session_id uuid not null,
  class_id uuid not null,
  fee_type_id uuid not null,
  amount numeric(10, 2) not null,
  due_date date null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint fee_structures_pkey primary key (id),
  constraint fee_structures_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint fee_structures_fee_type_id_fkey foreign KEY (fee_type_id) references fee_types (id) on delete CASCADE,
  constraint fee_structures_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint fee_structures_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint fee_structures_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint fee_structures_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint fee_structures_status_check check (
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

create index IF not exists idx_fee_structures_user_id on public.fee_structures using btree (user_id) TABLESPACE pg_default;
create table public.fee_structures (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  session_id uuid not null,
  class_id uuid not null,
  fee_type_id uuid not null,
  amount numeric(10, 2) not null,
  due_date date null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint fee_structures_pkey primary key (id),
  constraint fee_structures_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint fee_structures_fee_type_id_fkey foreign KEY (fee_type_id) references fee_types (id) on delete CASCADE,
  constraint fee_structures_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint fee_structures_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint fee_structures_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint fee_structures_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint fee_structures_status_check check (
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

create index IF not exists idx_fee_structures_user_id on public.fee_structures using btree (user_id) TABLESPACE pg_default;
create table public.file_uploads (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid null,
  uploaded_by uuid null,
  file_name character varying(255) not null,
  file_type character varying(50) null,
  file_size bigint null,
  file_path text not null,
  upload_date date null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  constraint file_uploads_pkey primary key (id),
  constraint file_uploads_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint file_uploads_uploaded_by_fkey foreign KEY (uploaded_by) references users (id) on delete set null
) TABLESPACE pg_default;
create table public.file_uploads (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid null,
  uploaded_by uuid null,
  file_name character varying(255) not null,
  file_type character varying(50) null,
  file_size bigint null,
  file_path text not null,
  upload_date date null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  constraint file_uploads_pkey primary key (id),
  constraint file_uploads_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint file_uploads_uploaded_by_fkey foreign KEY (uploaded_by) references users (id) on delete set null
) TABLESPACE pg_default;
create table public.grade_scales (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  grade_name character varying(10) not null,
  min_percentage numeric(5, 2) not null,
  max_percentage numeric(5, 2) not null,
  grade_point numeric(3, 2) null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint grade_scales_pkey primary key (id),
  constraint grade_scales_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint grade_scales_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint grade_scales_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_grade_scales_user_id on public.grade_scales using btree (user_id) TABLESPACE pg_default;
create table public.grade_scales (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  grade_name character varying(10) not null,
  min_percentage numeric(5, 2) not null,
  max_percentage numeric(5, 2) not null,
  grade_point numeric(3, 2) null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint grade_scales_pkey primary key (id),
  constraint grade_scales_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint grade_scales_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint grade_scales_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_grade_scales_user_id on public.grade_scales using btree (user_id) TABLESPACE pg_default;
create table public.grade_scales (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  grade_name character varying(10) not null,
  min_percentage numeric(5, 2) not null,
  max_percentage numeric(5, 2) not null,
  grade_point numeric(3, 2) null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint grade_scales_pkey primary key (id),
  constraint grade_scales_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint grade_scales_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint grade_scales_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_grade_scales_user_id on public.grade_scales using btree (user_id) TABLESPACE pg_default;
create table public.job_interviews (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  application_id uuid not null,
  interview_date date not null,
  interview_time time without time zone not null,
  interview_type character varying(50) null,
  interviewer_id uuid null,
  location character varying(255) null,
  notes text null,
  status character varying(20) null default 'scheduled'::character varying,
  result character varying(20) null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint job_interviews_pkey primary key (id),
  constraint job_interviews_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint job_interviews_interviewer_id_fkey foreign KEY (interviewer_id) references users (id) on delete set null,
  constraint job_interviews_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint job_interviews_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint job_interviews_application_id_fkey foreign KEY (application_id) references job_applications (id) on delete CASCADE,
  constraint job_interviews_status_check check (
    (
      (status)::text = any (
        (
          array[
            'scheduled'::character varying,
            'completed'::character varying,
            'cancelled'::character varying,
            'rescheduled'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint job_interviews_interview_type_check check (
    (
      (interview_type)::text = any (
        (
          array[
            'phone'::character varying,
            'video'::character varying,
            'in-person'::character varying,
            'panel'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint job_interviews_result_check check (
    (
      (result)::text = any (
        (
          array[
            'pass'::character varying,
            'fail'::character varying,
            'pending'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_job_interviews_school_app on public.job_interviews using btree (school_id, application_id) TABLESPACE pg_default;

create index IF not exists idx_job_interviews_school_id on public.job_interviews using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_job_interviews_application_id on public.job_interviews using btree (application_id) TABLESPACE pg_default;

create index IF not exists idx_job_interviews_status on public.job_interviews using btree (status) TABLESPACE pg_default;

create index IF not exists idx_job_interviews_user_id on public.job_interviews using btree (user_id) TABLESPACE pg_default;

create trigger update_job_interviews_updated_at BEFORE
update on job_interviews for EACH row
execute FUNCTION update_updated_at_column ();
create table public.jobs (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  department_id uuid null,
  title character varying(255) not null,
  description text null,
  salary numeric(12, 2) null,
  deadline date null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint jobs_pkey primary key (id),
  constraint jobs_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint jobs_department_id_fkey foreign KEY (department_id) references departments (id) on delete set null,
  constraint jobs_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint jobs_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint jobs_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'closed'::character varying,
            'on-hold'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_jobs_school_id on public.jobs using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_jobs_department_id on public.jobs using btree (department_id) TABLESPACE pg_default;

create index IF not exists idx_jobs_created_at on public.jobs using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_jobs_user_id on public.jobs using btree (user_id) TABLESPACE pg_default;

create trigger update_jobs_updated_at BEFORE
update on jobs for EACH row
execute FUNCTION update_updated_at_column ();
create table public.leave_applications (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  applicant_type character varying(20) not null,
  applicant_id uuid not null,
  leave_type character varying(50) null,
  from_date date not null,
  to_date date not null,
  total_days integer not null,
  reason text not null,
  application_date date not null default CURRENT_DATE,
  status character varying(20) null default 'pending'::character varying,
  approved_by uuid null,
  approval_date date null,
  remarks text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint leave_applications_pkey primary key (id),
  constraint leave_applications_approved_by_fkey foreign KEY (approved_by) references users (id) on delete set null,
  constraint leave_applications_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint leave_applications_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint leave_applications_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint leave_applications_applicant_type_check check (
    (
      (applicant_type)::text = any (
        (
          array[
            'staff'::character varying,
            'student'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint leave_applications_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'approved'::character varying,
            'rejected'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint leave_applications_leave_type_check check (
    (
      (leave_type)::text = any (
        (
          array[
            'sick'::character varying,
            'casual'::character varying,
            'annual'::character varying,
            'maternity'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_leave_applications_user_id on public.leave_applications using btree (user_id) TABLESPACE pg_default;
create table public.library_members (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  member_type character varying(20) not null,
  member_id uuid not null,
  membership_number character varying(50) not null,
  membership_date date not null default CURRENT_DATE,
  expiry_date date null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint library_members_pkey primary key (id),
  constraint library_members_school_id_membership_number_key unique (school_id, membership_number),
  constraint library_members_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint library_members_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint library_members_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint library_members_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'suspended'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint library_members_member_type_check check (
    (
      (member_type)::text = any (
        (
          array[
            'student'::character varying,
            'staff'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_library_members_school on public.library_members using btree (school_id, member_type, member_id) TABLESPACE pg_default;

create index IF not exists idx_library_members_user_id on public.library_members using btree (user_id) TABLESPACE pg_default;
create table public.passengers (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  type character varying(20) not null,
  student_id uuid null,
  staff_id uuid null,
  route_id uuid not null,
  vehicle_id uuid null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  station_id uuid null,
  base_fare integer null default 0,
  discount_percent integer null default 0,
  final_fare integer null default 0,
  payment_status character varying(20) null default 'pending'::character varying,
  due_date date null,
  user_id uuid not null,
  constraint passengers_pkey primary key (id),
  constraint passengers_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint passengers_vehicle_id_fkey foreign KEY (vehicle_id) references vehicles (id) on delete set null,
  constraint passengers_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint passengers_station_id_fkey foreign KEY (station_id) references stations (id),
  constraint passengers_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint passengers_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint passengers_route_id_fkey foreign KEY (route_id) references routes (id) on delete CASCADE,
  constraint passengers_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint passengers_payment_status_check check (
    (
      (payment_status)::text = any (
        (
          array[
            'pending'::character varying,
            'paid'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint passengers_type_check check (
    (
      (type)::text = any (
        (
          array[
            'STUDENT'::character varying,
            'STAFF'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint passengers_status_check check (
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
  ),
  constraint check_passenger_type check (
    (
      (
        ((type)::text = 'STUDENT'::text)
        and (student_id is not null)
        and (staff_id is null)
      )
      or (
        ((type)::text = 'STAFF'::text)
        and (staff_id is not null)
        and (student_id is null)
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_passengers_station_id on public.passengers using btree (station_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_payment_status on public.passengers using btree (school_id, payment_status) TABLESPACE pg_default;

create index IF not exists idx_passengers_school_id on public.passengers using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_student_id on public.passengers using btree (student_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_staff_id on public.passengers using btree (staff_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_route_id on public.passengers using btree (route_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_user_id on public.passengers using btree (user_id) TABLESPACE pg_default;

create trigger update_passengers_updated_at BEFORE
update on passengers for EACH row
execute FUNCTION update_updated_at_column ();
create table public.passengers (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  type character varying(20) not null,
  student_id uuid null,
  staff_id uuid null,
  route_id uuid not null,
  vehicle_id uuid null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  station_id uuid null,
  base_fare integer null default 0,
  discount_percent integer null default 0,
  final_fare integer null default 0,
  payment_status character varying(20) null default 'pending'::character varying,
  due_date date null,
  user_id uuid not null,
  constraint passengers_pkey primary key (id),
  constraint passengers_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint passengers_vehicle_id_fkey foreign KEY (vehicle_id) references vehicles (id) on delete set null,
  constraint passengers_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint passengers_station_id_fkey foreign KEY (station_id) references stations (id),
  constraint passengers_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint passengers_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint passengers_route_id_fkey foreign KEY (route_id) references routes (id) on delete CASCADE,
  constraint passengers_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint passengers_payment_status_check check (
    (
      (payment_status)::text = any (
        (
          array[
            'pending'::character varying,
            'paid'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint passengers_type_check check (
    (
      (type)::text = any (
        (
          array[
            'STUDENT'::character varying,
            'STAFF'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint passengers_status_check check (
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
  ),
  constraint check_passenger_type check (
    (
      (
        ((type)::text = 'STUDENT'::text)
        and (student_id is not null)
        and (staff_id is null)
      )
      or (
        ((type)::text = 'STAFF'::text)
        and (staff_id is not null)
        and (student_id is null)
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_passengers_station_id on public.passengers using btree (station_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_payment_status on public.passengers using btree (school_id, payment_status) TABLESPACE pg_default;

create index IF not exists idx_passengers_school_id on public.passengers using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_student_id on public.passengers using btree (student_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_staff_id on public.passengers using btree (staff_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_route_id on public.passengers using btree (route_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_user_id on public.passengers using btree (user_id) TABLESPACE pg_default;

create trigger update_passengers_updated_at BEFORE
update on passengers for EACH row
execute FUNCTION update_updated_at_column ();
create table public.report_cards (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  exam_result_id uuid not null,
  student_id uuid not null,
  file_url text not null,
  generated_date date null default CURRENT_DATE,
  generated_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint report_cards_pkey primary key (id),
  constraint report_cards_generated_by_fkey foreign KEY (generated_by) references users (id) on delete set null,
  constraint report_cards_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint report_cards_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE
) TABLESPACE pg_default;
create table public.report_templates (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  report_name character varying(255) not null,
  report_category character varying(50) null,
  description text null,
  template_file text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint report_templates_pkey primary key (id),
  constraint report_templates_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint report_templates_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint report_templates_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint report_templates_report_category_check check (
    (
      (report_category)::text = any (
        (
          array[
            'student'::character varying,
            'staff'::character varying,
            'fee'::character varying,
            'exam'::character varying,
            'attendance'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_report_templates_school_id on public.report_templates using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_report_templates_user_id on public.report_templates using btree (user_id) TABLESPACE pg_default;
create table public.report_templates (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  report_name character varying(255) not null,
  report_category character varying(50) null,
  description text null,
  template_file text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint report_templates_pkey primary key (id),
  constraint report_templates_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint report_templates_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint report_templates_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint report_templates_report_category_check check (
    (
      (report_category)::text = any (
        (
          array[
            'student'::character varying,
            'staff'::character varying,
            'fee'::character varying,
            'exam'::character varying,
            'attendance'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_report_templates_school_id on public.report_templates using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_report_templates_user_id on public.report_templates using btree (user_id) TABLESPACE pg_default;
create table public.route_stops (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  route_id uuid not null,
  stop_name character varying(255) not null,
  stop_address text null,
  stop_order integer not null,
  arrival_time time without time zone null,
  departure_time time without time zone null,
  pickup_fee numeric(10, 2) null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint route_stops_pkey primary key (id),
  constraint route_stops_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint route_stops_route_id_fkey foreign KEY (route_id) references transport_routes (id) on delete CASCADE,
  constraint route_stops_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint route_stops_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_route_stops_user_id on public.route_stops using btree (user_id) TABLESPACE pg_default;
create table public.route_stops (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  route_id uuid not null,
  stop_name character varying(255) not null,
  stop_address text null,
  stop_order integer not null,
  arrival_time time without time zone null,
  departure_time time without time zone null,
  pickup_fee numeric(10, 2) null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint route_stops_pkey primary key (id),
  constraint route_stops_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint route_stops_route_id_fkey foreign KEY (route_id) references transport_routes (id) on delete CASCADE,
  constraint route_stops_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint route_stops_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_route_stops_user_id on public.route_stops using btree (user_id) TABLESPACE pg_default;
create table public.salary_payments (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  staff_id uuid not null,
  payment_month integer not null,
  payment_year integer not null,
  basic_salary numeric(12, 2) not null,
  total_allowances numeric(12, 2) null default 0,
  total_deductions numeric(12, 2) null default 0,
  gross_salary numeric(12, 2) not null,
  net_salary numeric(12, 2) not null,
  payment_date date not null,
  payment_method character varying(50) null,
  transaction_id character varying(255) null,
  paid_by uuid null,
  status character varying(20) null default 'pending'::character varying,
  remarks text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint salary_payments_pkey primary key (id),
  constraint salary_payments_school_id_staff_id_payment_month_payment_ye_key unique (school_id, staff_id, payment_month, payment_year),
  constraint salary_payments_paid_by_fkey foreign KEY (paid_by) references users (id) on delete set null,
  constraint salary_payments_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint salary_payments_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint salary_payments_payment_method_check check (
    (
      (payment_method)::text = any (
        (
          array[
            'cash'::character varying,
            'cheque'::character varying,
            'bank_transfer'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint salary_payments_payment_month_check check (
    (
      (payment_month >= 1)
      and (payment_month <= 12)
    )
  ),
  constraint salary_payments_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'paid'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
create table public.salary_payments (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  staff_id uuid not null,
  payment_month integer not null,
  payment_year integer not null,
  basic_salary numeric(12, 2) not null,
  total_allowances numeric(12, 2) null default 0,
  total_deductions numeric(12, 2) null default 0,
  gross_salary numeric(12, 2) not null,
  net_salary numeric(12, 2) not null,
  payment_date date not null,
  payment_method character varying(50) null,
  transaction_id character varying(255) null,
  paid_by uuid null,
  status character varying(20) null default 'pending'::character varying,
  remarks text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint salary_payments_pkey primary key (id),
  constraint salary_payments_school_id_staff_id_payment_month_payment_ye_key unique (school_id, staff_id, payment_month, payment_year),
  constraint salary_payments_paid_by_fkey foreign KEY (paid_by) references users (id) on delete set null,
  constraint salary_payments_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint salary_payments_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint salary_payments_payment_method_check check (
    (
      (payment_method)::text = any (
        (
          array[
            'cash'::character varying,
            'cheque'::character varying,
            'bank_transfer'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint salary_payments_payment_month_check check (
    (
      (payment_month >= 1)
      and (payment_month <= 12)
    )
  ),
  constraint salary_payments_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'paid'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
create table public.salary_structures (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  staff_id uuid not null,
  basic_salary numeric(12, 2) not null,
  house_allowance numeric(12, 2) null default 0,
  medical_allowance numeric(12, 2) null default 0,
  transport_allowance numeric(12, 2) null default 0,
  other_allowances numeric(12, 2) null default 0,
  provident_fund numeric(12, 2) null default 0,
  tax_deduction numeric(12, 2) null default 0,
  other_deductions numeric(12, 2) null default 0,
  gross_salary numeric(12, 2) not null,
  net_salary numeric(12, 2) not null,
  effective_from date not null,
  effective_to date null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint salary_structures_pkey primary key (id),
  constraint salary_structures_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint salary_structures_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint salary_structures_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint salary_structures_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint salary_structures_status_check check (
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

create index IF not exists idx_salary_structures_user_id on public.salary_structures using btree (user_id) TABLESPACE pg_default;
create table public.salary_structures (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  staff_id uuid not null,
  basic_salary numeric(12, 2) not null,
  house_allowance numeric(12, 2) null default 0,
  medical_allowance numeric(12, 2) null default 0,
  transport_allowance numeric(12, 2) null default 0,
  other_allowances numeric(12, 2) null default 0,
  provident_fund numeric(12, 2) null default 0,
  tax_deduction numeric(12, 2) null default 0,
  other_deductions numeric(12, 2) null default 0,
  gross_salary numeric(12, 2) not null,
  net_salary numeric(12, 2) not null,
  effective_from date not null,
  effective_to date null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint salary_structures_pkey primary key (id),
  constraint salary_structures_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint salary_structures_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint salary_structures_staff_id_fkey foreign KEY (staff_id) references staff (id) on delete CASCADE,
  constraint salary_structures_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint salary_structures_status_check check (
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

create index IF not exists idx_salary_structures_user_id on public.salary_structures using btree (user_id) TABLESPACE pg_default;
create table public.schools (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(255) not null,
  code character varying(50) not null,
  address text null,
  phone character varying(20) null,
  email character varying(255) null,
  logo_url text null,
  established_date date null,
  principal_name character varying(255) null,
  website character varying(255) null,
  status character varying(20) null default 'active'::character varying,
  subscription_plan character varying(50) null default 'basic'::character varying,
  subscription_status character varying(20) null default 'active'::character varying,
  subscription_expires_at timestamp with time zone null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint schools_pkey primary key (id),
  constraint schools_code_key unique (code),
  constraint schools_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'suspended'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create trigger update_schools_updated_at BEFORE
update on schools for EACH row
execute FUNCTION update_updated_at_column ();
create table public.sections (
  id uuid not null default extensions.uuid_generate_v4 (),
  class_id uuid not null,
  school_id uuid not null,
  section_name character varying(10) not null,
  class_teacher_id uuid null,
  room_number character varying(50) null,
  capacity integer null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint sections_pkey primary key (id),
  constraint sections_school_id_class_id_section_name_key unique (school_id, class_id, section_name),
  constraint sections_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint sections_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint sections_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint sections_class_teacher_id_fkey foreign KEY (class_teacher_id) references staff (id) on delete set null,
  constraint sections_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint sections_status_check check (
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

create index IF not exists idx_sections_school_class on public.sections using btree (school_id, class_id) TABLESPACE pg_default;

create index IF not exists idx_sections_user_id on public.sections using btree (user_id) TABLESPACE pg_default;
create table public.sessions (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  name character varying(50) not null,
  start_date date not null,
  end_date date not null,
  is_current boolean null default false,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint sessions_pkey primary key (id),
  constraint sessions_school_id_name_key unique (school_id, name),
  constraint sessions_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint sessions_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint sessions_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint sessions_status_check check (
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

create index IF not exists idx_sessions_school_current on public.sessions using btree (school_id, is_current) TABLESPACE pg_default;

create index IF not exists idx_sessions_user_id on public.sessions using btree (user_id) TABLESPACE pg_default;

create trigger update_sessions_updated_at BEFORE
update on sessions for EACH row
execute FUNCTION update_updated_at_column ();
create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  employee_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  phone character varying(20) null,
  email character varying(255) null,
  alternate_phone character varying(20) null,
  address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  joining_date date not null,
  designation character varying(100) null,
  department character varying(100) null,
  qualification character varying(255) null,
  experience_years integer null,
  employment_type character varying(20) null,
  marital_status character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  leaving_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  computer_no character varying(50) null,
  user_id uuid not null,
  constraint staff_pkey primary key (id),
  constraint staff_school_id_employee_number_key unique (school_id, employee_number),
  constraint staff_school_id_computer_no_key unique (school_id, computer_no),
  constraint staff_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint staff_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'resigned'::character varying,
            'terminated'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_employment_type_check check (
    (
      (employment_type)::text = any (
        (
          array[
            'permanent'::character varying,
            'contract'::character varying,
            'temporary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_school_id on public.staff using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_number on public.staff using btree (school_id, employee_number) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_staff_user_id on public.staff using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_staff BEFORE INSERT on staff for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();
create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  employee_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  phone character varying(20) null,
  email character varying(255) null,
  alternate_phone character varying(20) null,
  address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  joining_date date not null,
  designation character varying(100) null,
  department character varying(100) null,
  qualification character varying(255) null,
  experience_years integer null,
  employment_type character varying(20) null,
  marital_status character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  leaving_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  computer_no character varying(50) null,
  user_id uuid not null,
  constraint staff_pkey primary key (id),
  constraint staff_school_id_employee_number_key unique (school_id, employee_number),
  constraint staff_school_id_computer_no_key unique (school_id, computer_no),
  constraint staff_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint staff_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'resigned'::character varying,
            'terminated'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_employment_type_check check (
    (
      (employment_type)::text = any (
        (
          array[
            'permanent'::character varying,
            'contract'::character varying,
            'temporary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_school_id on public.staff using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_number on public.staff using btree (school_id, employee_number) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_staff_user_id on public.staff using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_staff BEFORE INSERT on staff for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();
create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  employee_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  phone character varying(20) null,
  email character varying(255) null,
  alternate_phone character varying(20) null,
  address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  joining_date date not null,
  designation character varying(100) null,
  department character varying(100) null,
  qualification character varying(255) null,
  experience_years integer null,
  employment_type character varying(20) null,
  marital_status character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  leaving_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  computer_no character varying(50) null,
  user_id uuid not null,
  constraint staff_pkey primary key (id),
  constraint staff_school_id_employee_number_key unique (school_id, employee_number),
  constraint staff_school_id_computer_no_key unique (school_id, computer_no),
  constraint staff_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint staff_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'resigned'::character varying,
            'terminated'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_employment_type_check check (
    (
      (employment_type)::text = any (
        (
          array[
            'permanent'::character varying,
            'contract'::character varying,
            'temporary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_school_id on public.staff using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_number on public.staff using btree (school_id, employee_number) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_staff_user_id on public.staff using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_staff BEFORE INSERT on staff for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();
create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  employee_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  phone character varying(20) null,
  email character varying(255) null,
  alternate_phone character varying(20) null,
  address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  joining_date date not null,
  designation character varying(100) null,
  department character varying(100) null,
  qualification character varying(255) null,
  experience_years integer null,
  employment_type character varying(20) null,
  marital_status character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  leaving_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  computer_no character varying(50) null,
  user_id uuid not null,
  constraint staff_pkey primary key (id),
  constraint staff_school_id_employee_number_key unique (school_id, employee_number),
  constraint staff_school_id_computer_no_key unique (school_id, computer_no),
  constraint staff_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint staff_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'resigned'::character varying,
            'terminated'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_employment_type_check check (
    (
      (employment_type)::text = any (
        (
          array[
            'permanent'::character varying,
            'contract'::character varying,
            'temporary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_school_id on public.staff using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_number on public.staff using btree (school_id, employee_number) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_staff_user_id on public.staff using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_staff BEFORE INSERT on staff for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();
create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  employee_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  phone character varying(20) null,
  email character varying(255) null,
  alternate_phone character varying(20) null,
  address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  joining_date date not null,
  designation character varying(100) null,
  department character varying(100) null,
  qualification character varying(255) null,
  experience_years integer null,
  employment_type character varying(20) null,
  marital_status character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  leaving_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  computer_no character varying(50) null,
  user_id uuid not null,
  constraint staff_pkey primary key (id),
  constraint staff_school_id_employee_number_key unique (school_id, employee_number),
  constraint staff_school_id_computer_no_key unique (school_id, computer_no),
  constraint staff_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint staff_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'resigned'::character varying,
            'terminated'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_employment_type_check check (
    (
      (employment_type)::text = any (
        (
          array[
            'permanent'::character varying,
            'contract'::character varying,
            'temporary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_school_id on public.staff using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_number on public.staff using btree (school_id, employee_number) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_staff_user_id on public.staff using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_staff BEFORE INSERT on staff for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();
create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  employee_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  phone character varying(20) null,
  email character varying(255) null,
  alternate_phone character varying(20) null,
  address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  joining_date date not null,
  designation character varying(100) null,
  department character varying(100) null,
  qualification character varying(255) null,
  experience_years integer null,
  employment_type character varying(20) null,
  marital_status character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  leaving_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  computer_no character varying(50) null,
  user_id uuid not null,
  constraint staff_pkey primary key (id),
  constraint staff_school_id_employee_number_key unique (school_id, employee_number),
  constraint staff_school_id_computer_no_key unique (school_id, computer_no),
  constraint staff_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint staff_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'resigned'::character varying,
            'terminated'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_employment_type_check check (
    (
      (employment_type)::text = any (
        (
          array[
            'permanent'::character varying,
            'contract'::character varying,
            'temporary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_school_id on public.staff using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_number on public.staff using btree (school_id, employee_number) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_staff_user_id on public.staff using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_staff BEFORE INSERT on staff for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();
create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  employee_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  phone character varying(20) null,
  email character varying(255) null,
  alternate_phone character varying(20) null,
  address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  joining_date date not null,
  designation character varying(100) null,
  department character varying(100) null,
  qualification character varying(255) null,
  experience_years integer null,
  employment_type character varying(20) null,
  marital_status character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  leaving_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  computer_no character varying(50) null,
  user_id uuid not null,
  constraint staff_pkey primary key (id),
  constraint staff_school_id_employee_number_key unique (school_id, employee_number),
  constraint staff_school_id_computer_no_key unique (school_id, computer_no),
  constraint staff_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint staff_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'resigned'::character varying,
            'terminated'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_employment_type_check check (
    (
      (employment_type)::text = any (
        (
          array[
            'permanent'::character varying,
            'contract'::character varying,
            'temporary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_school_id on public.staff using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_number on public.staff using btree (school_id, employee_number) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_staff_user_id on public.staff using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_staff BEFORE INSERT on staff for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();
create table public.staff (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  employee_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  phone character varying(20) null,
  email character varying(255) null,
  alternate_phone character varying(20) null,
  address text null,
  city character varying(100) null,
  state character varying(100) null,
  postal_code character varying(20) null,
  joining_date date not null,
  designation character varying(100) null,
  department character varying(100) null,
  qualification character varying(255) null,
  experience_years integer null,
  employment_type character varying(20) null,
  marital_status character varying(20) null,
  emergency_contact_name character varying(255) null,
  emergency_contact_phone character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  leaving_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  computer_no character varying(50) null,
  user_id uuid not null,
  constraint staff_pkey primary key (id),
  constraint staff_school_id_employee_number_key unique (school_id, employee_number),
  constraint staff_school_id_computer_no_key unique (school_id, computer_no),
  constraint staff_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint staff_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint staff_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint staff_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'resigned'::character varying,
            'terminated'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_employment_type_check check (
    (
      (employment_type)::text = any (
        (
          array[
            'permanent'::character varying,
            'contract'::character varying,
            'temporary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_school_id on public.staff using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_number on public.staff using btree (school_id, employee_number) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_staff_user_id on public.staff using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_staff BEFORE INSERT on staff for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_staff_updated_at BEFORE
update on staff for EACH row
execute FUNCTION update_updated_at_column ();
create table public.student_attendance (
  id uuid not null default extensions.uuid_generate_v4 (),
  student_id uuid not null,
  school_id uuid not null,
  class_id uuid not null,
  section_id uuid null,
  attendance_date date not null,
  status character varying(20) not null,
  remarks text null,
  marked_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint student_attendance_pkey primary key (id),
  constraint student_attendance_school_id_student_id_attendance_date_key unique (school_id, student_id, attendance_date),
  constraint student_attendance_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint student_attendance_marked_by_fkey foreign KEY (marked_by) references users (id) on delete set null,
  constraint student_attendance_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint student_attendance_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint student_attendance_status_check check (
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

create index IF not exists idx_student_attendance_school_date on public.student_attendance using btree (school_id, student_id, attendance_date) TABLESPACE pg_default;

create index IF not exists idx_student_attendance_class on public.student_attendance using btree (school_id, class_id, section_id, attendance_date) TABLESPACE pg_default;

create index IF not exists idx_student_attendance_user_id on public.student_attendance using btree (user_id) TABLESPACE pg_default;
create table public.student_certificates (
  id uuid not null default extensions.uuid_generate_v4 (),
  student_id uuid not null,
  school_id uuid not null,
  certificate_type character varying(50) not null,
  issue_date date not null default CURRENT_DATE,
  issued_by uuid null,
  certificate_number character varying(100) null,
  file_url text null,
  remarks text null,
  created_at timestamp with time zone null default now(),
  constraint student_certificates_pkey primary key (id),
  constraint student_certificates_school_id_certificate_number_key unique (school_id, certificate_number),
  constraint student_certificates_issued_by_fkey foreign KEY (issued_by) references users (id) on delete set null,
  constraint student_certificates_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint student_certificates_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint student_certificates_certificate_type_check check (
    (
      (certificate_type)::text = any (
        (
          array[
            'bonafide'::character varying,
            'transfer'::character varying,
            'character'::character varying,
            'leaving'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
create table public.student_certificates (
  id uuid not null default extensions.uuid_generate_v4 (),
  student_id uuid not null,
  school_id uuid not null,
  certificate_type character varying(50) not null,
  issue_date date not null default CURRENT_DATE,
  issued_by uuid null,
  certificate_number character varying(100) null,
  file_url text null,
  remarks text null,
  created_at timestamp with time zone null default now(),
  constraint student_certificates_pkey primary key (id),
  constraint student_certificates_school_id_certificate_number_key unique (school_id, certificate_number),
  constraint student_certificates_issued_by_fkey foreign KEY (issued_by) references users (id) on delete set null,
  constraint student_certificates_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint student_certificates_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint student_certificates_certificate_type_check check (
    (
      (certificate_type)::text = any (
        (
          array[
            'bonafide'::character varying,
            'transfer'::character varying,
            'character'::character varying,
            'leaving'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
create table public.student_documents (
  id uuid not null default extensions.uuid_generate_v4 (),
  student_id uuid not null,
  school_id uuid not null,
  uploaded_by uuid null,
  document_type character varying(50) not null,
  document_name character varying(255) not null,
  file_url text not null,
  uploaded_date date null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  constraint student_documents_pkey primary key (id),
  constraint student_documents_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint student_documents_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint student_documents_uploaded_by_fkey foreign KEY (uploaded_by) references users (id) on delete set null,
  constraint student_documents_document_type_check check (
    (
      (document_type)::text = any (
        (
          array[
            'birth_certificate'::character varying,
            'previous_school'::character varying,
            'id_proof'::character varying,
            'photo'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
create table public.student_documents (
  id uuid not null default extensions.uuid_generate_v4 (),
  student_id uuid not null,
  school_id uuid not null,
  uploaded_by uuid null,
  document_type character varying(50) not null,
  document_name character varying(255) not null,
  file_url text not null,
  uploaded_date date null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  constraint student_documents_pkey primary key (id),
  constraint student_documents_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint student_documents_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint student_documents_uploaded_by_fkey foreign KEY (uploaded_by) references users (id) on delete set null,
  constraint student_documents_document_type_check check (
    (
      (document_type)::text = any (
        (
          array[
            'birth_certificate'::character varying,
            'previous_school'::character varying,
            'id_proof'::character varying,
            'photo'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;
create table public.students (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  admission_number character varying(50) not null,
  first_name character varying(100) not null,
  last_name character varying(100) null,
  father_name character varying(255) null,
  mother_name character varying(255) null,
  date_of_birth date null,
  gender character varying(20) null,
  blood_group character varying(10) null,
  religion character varying(50) null,
  caste character varying(50) null,
  nationality character varying(50) null default 'Pakistan'::character varying,
  photo_url text null,
  admission_date date not null,
  current_class_id uuid null,
  current_section_id uuid null,
  roll_number character varying(20) null,
  house character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  base_fee numeric(10, 2) null default 0,
  discount_note text null,
  final_fee numeric(10, 2) null default 0,
  discount_amount numeric(10, 2) null default 0,
  whatsapp_number character varying(20) null,
  discount_type character varying(20) null default 'fixed'::character varying,
  discount_value numeric(10, 2) null default 0,
  fee_plan character varying(20) null default 'monthly'::character varying,
  starting_month integer null default 1,
  user_id uuid not null,
  constraint students_pkey primary key (id),
  constraint students_school_id_admission_number_key unique (school_id, admission_number),
  constraint students_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint students_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint students_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint students_fee_plan_check check (
    (
      (fee_plan)::text = any (
        (
          array[
            'monthly'::character varying,
            'quarterly'::character varying,
            'semi-annual'::character varying,
            'annual'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint students_discount_type_check check (
    (
      (discount_type)::text = any (
        (
          array[
            'fixed'::character varying,
            'percentage'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint students_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'alumni'::character varying,
            'transferred'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint students_starting_month_check check (
    (
      (starting_month >= 1)
      and (starting_month <= 12)
    )
  ),
  constraint students_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint students_house_check check (
    (
      (house)::text = any (
        (
          array[
            'red'::character varying,
            'blue'::character varying,
            'green'::character varying,
            'yellow'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_students_school_id on public.students using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_students_admission_number on public.students using btree (school_id, admission_number) TABLESPACE pg_default;

create index IF not exists idx_students_class_section on public.students using btree (school_id, current_class_id, current_section_id) TABLESPACE pg_default;

create index IF not exists idx_students_status on public.students using btree (school_id, status) TABLESPACE pg_default;

create index IF not exists idx_students_user_id on public.students using btree (user_id) TABLESPACE pg_default;

create trigger trigger_set_user_id_students BEFORE INSERT on students for EACH row
execute FUNCTION set_user_id_on_insert ();

create trigger update_students_updated_at BEFORE
update on students for EACH row
execute FUNCTION update_updated_at_column ();
create table public.subject_teachers (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  class_id uuid not null,
  section_id uuid null,
  subject_id uuid not null,
  teacher_id uuid not null,
  session_id uuid not null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint subject_teachers_pkey primary key (id),
  constraint subject_teachers_school_id_class_id_section_id_subject_id_s_key unique (
    school_id,
    class_id,
    section_id,
    subject_id,
    session_id
  ),
  constraint subject_teachers_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint subject_teachers_section_id_fkey foreign KEY (section_id) references sections (id) on delete CASCADE,
  constraint subject_teachers_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint subject_teachers_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete CASCADE,
  constraint subject_teachers_teacher_id_fkey foreign KEY (teacher_id) references staff (id) on delete CASCADE,
  constraint subject_teachers_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint subject_teachers_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint subject_teachers_created_by_fkey foreign KEY (created_by) references users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_subject_teachers_user_id on public.subject_teachers using btree (user_id) TABLESPACE pg_default;
create table public.subjects (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  subject_name character varying(100) not null,
  subject_code character varying(50) null,
  subject_type character varying(20) null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint subjects_pkey primary key (id),
  constraint subjects_school_id_subject_code_key unique (school_id, subject_code),
  constraint subjects_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint subjects_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint subjects_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint subjects_status_check check (
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
  ),
  constraint subjects_subject_type_check check (
    (
      (subject_type)::text = any (
        (
          array[
            'theory'::character varying,
            'practical'::character varying,
            'both'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_subjects_school_id on public.subjects using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_subjects_user_id on public.subjects using btree (user_id) TABLESPACE pg_default;
create table public.test_marks (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  test_id uuid not null,
  student_id uuid not null,
  subject_id uuid not null,
  obtained_marks numeric(10, 2) null,
  is_absent boolean null default false,
  entered_by uuid null,
  entry_date date null default CURRENT_DATE,
  remarks text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint test_marks_pkey primary key (id),
  constraint test_marks_test_id_student_id_subject_id_key unique (test_id, student_id, subject_id),
  constraint test_marks_entered_by_fkey foreign KEY (entered_by) references users (id) on delete set null,
  constraint test_marks_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete CASCADE,
  constraint test_marks_test_id_fkey foreign KEY (test_id) references tests (id) on delete CASCADE,
  constraint test_marks_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint test_marks_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_test_marks_test_id on public.test_marks using btree (test_id) TABLESPACE pg_default;

create index IF not exists idx_test_marks_student_id on public.test_marks using btree (student_id) TABLESPACE pg_default;

create index IF not exists idx_test_marks_school_id on public.test_marks using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_test_marks_subject_id on public.test_marks using btree (subject_id) TABLESPACE pg_default;

create index IF not exists idx_test_marks_test_student on public.test_marks using btree (test_id, student_id) TABLESPACE pg_default;

create index IF not exists idx_test_marks_test_subject on public.test_marks using btree (test_id, subject_id) TABLESPACE pg_default;

create trigger update_test_marks_updated_at BEFORE
update on test_marks for EACH row
execute FUNCTION update_updated_at_column ();
create table public.test_subjects (
  id uuid not null default extensions.uuid_generate_v4 (),
  test_id uuid not null,
  subject_id uuid not null,
  school_id uuid not null,
  created_at timestamp with time zone null default now(),
  total_marks numeric(10, 2) null default 0,
  constraint test_subjects_pkey primary key (id),
  constraint test_subjects_test_id_subject_id_key unique (test_id, subject_id),
  constraint test_subjects_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint test_subjects_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete CASCADE,
  constraint test_subjects_test_id_fkey foreign KEY (test_id) references tests (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_test_subjects_test_id on public.test_subjects using btree (test_id) TABLESPACE pg_default;

create index IF not exists idx_test_subjects_subject_id on public.test_subjects using btree (subject_id) TABLESPACE pg_default;

create index IF not exists idx_test_subjects_school_id on public.test_subjects using btree (school_id) TABLESPACE pg_default;
create table public.tests (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  test_name character varying(255) not null,
  test_date date not null,
  result_date date null,
  class_id uuid not null,
  section_id uuid null,
  total_marks numeric(10, 2) not null,
  details text null,
  status character varying(20) null default 'opened'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint tests_pkey primary key (id),
  constraint tests_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint tests_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint tests_section_id_fkey foreign KEY (section_id) references sections (id) on delete CASCADE,
  constraint tests_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint tests_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint tests_status_check check (
    (
      (status)::text = any (
        (
          array[
            'opened'::character varying,
            'closed'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_tests_school_id on public.tests using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_tests_class_id on public.tests using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_tests_test_date on public.tests using btree (test_date) TABLESPACE pg_default;

create index IF not exists idx_tests_status on public.tests using btree (status) TABLESPACE pg_default;

create index IF not exists idx_tests_section_id on public.tests using btree (section_id) TABLESPACE pg_default;

create index IF not exists idx_tests_user_id on public.tests using btree (user_id) TABLESPACE pg_default;

create trigger update_tests_updated_at BEFORE
update on tests for EACH row
execute FUNCTION update_updated_at_column ();
create table public.timetable (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  class_id uuid not null,
  section_id uuid null,
  session_id uuid not null,
  day_of_week character varying(20) not null,
  period_number integer not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  subject_id uuid null,
  teacher_id uuid null,
  room_number character varying(50) null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint timetable_pkey primary key (id),
  constraint timetable_school_id_class_id_section_id_session_id_day_of_w_key unique (
    school_id,
    class_id,
    section_id,
    session_id,
    day_of_week,
    period_number
  ),
  constraint timetable_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint timetable_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint timetable_class_id_fkey foreign KEY (class_id) references classes (id) on delete CASCADE,
  constraint timetable_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint timetable_section_id_fkey foreign KEY (section_id) references sections (id) on delete CASCADE,
  constraint timetable_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint timetable_subject_id_fkey foreign KEY (subject_id) references subjects (id) on delete set null,
  constraint timetable_teacher_id_fkey foreign KEY (teacher_id) references staff (id) on delete set null,
  constraint timetable_day_of_week_check check (
    (
      (day_of_week)::text = any (
        (
          array[
            'Monday'::character varying,
            'Tuesday'::character varying,
            'Wednesday'::character varying,
            'Thursday'::character varying,
            'Friday'::character varying,
            'Saturday'::character varying,
            'Sunday'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_timetable_school on public.timetable using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_timetable_class on public.timetable using btree (class_id) TABLESPACE pg_default;

create index IF not exists idx_timetable_section on public.timetable using btree (section_id) TABLESPACE pg_default;

create index IF not exists idx_timetable_session on public.timetable using btree (session_id) TABLESPACE pg_default;

create index IF not exists idx_timetable_day on public.timetable using btree (day_of_week) TABLESPACE pg_default;

create index IF not exists idx_timetable_teacher on public.timetable using btree (teacher_id) TABLESPACE pg_default;

create index IF not exists idx_timetable_user_id on public.timetable using btree (user_id) TABLESPACE pg_default;
create table public.transport_discounts (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  passenger_type character varying(50) not null,
  discount_percent integer null default 0,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  status character varying(20) null default 'active'::character varying,
  constraint transport_discounts_pkey primary key (id),
  constraint transport_discounts_school_id_passenger_type_key unique (school_id, passenger_type),
  constraint transport_discounts_school_id_fkey foreign KEY (school_id) references schools (id)
) TABLESPACE pg_default;
create table public.transport_passengers (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  student_id uuid not null,
  session_id uuid not null,
  route_id uuid not null,
  pickup_stop_id uuid null,
  drop_stop_id uuid null,
  start_date date not null,
  end_date date null,
  status character varying(20) null default 'active'::character varying,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint transport_passengers_pkey primary key (id),
  constraint transport_passengers_drop_stop_id_fkey foreign KEY (drop_stop_id) references route_stops (id) on delete set null,
  constraint transport_passengers_pickup_stop_id_fkey foreign KEY (pickup_stop_id) references route_stops (id) on delete set null,
  constraint transport_passengers_route_id_fkey foreign KEY (route_id) references transport_routes (id) on delete CASCADE,
  constraint transport_passengers_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint transport_passengers_session_id_fkey foreign KEY (session_id) references sessions (id) on delete CASCADE,
  constraint transport_passengers_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint transport_passengers_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint transport_passengers_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE,
  constraint transport_passengers_status_check check (
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

create index IF not exists idx_transport_passengers_school on public.transport_passengers using btree (school_id, student_id) TABLESPACE pg_default;

create index IF not exists idx_transport_passengers_user_id on public.transport_passengers using btree (user_id) TABLESPACE pg_default;
create table public.transport_routes (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  route_name character varying(255) not null,
  route_number character varying(50) null,
  vehicle_id uuid null,
  start_location text null,
  end_location text null,
  total_distance numeric(8, 2) null,
  estimated_time integer null,
  monthly_fee numeric(10, 2) null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint transport_routes_pkey primary key (id),
  constraint transport_routes_school_id_route_number_key unique (school_id, route_number),
  constraint transport_routes_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint transport_routes_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint transport_routes_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint transport_routes_vehicle_id_fkey foreign KEY (vehicle_id) references vehicles (id) on delete set null,
  constraint transport_routes_status_check check (
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

create index IF not exists idx_transport_routes_school_id on public.transport_routes using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_transport_routes_user_id on public.transport_routes using btree (user_id) TABLESPACE pg_default;
create table public.users (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  username character varying(100) not null,
  email character varying(255) not null,
  password character varying(255) not null,
  role character varying(50) not null default 'teacher'::character varying,
  staff_id uuid null,
  status character varying(20) null default 'active'::character varying,
  last_login timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_school_id_email_key unique (school_id, email),
  constraint users_school_id_username_key unique (school_id, username),
  constraint users_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint users_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'suspended'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_school_id on public.users using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_users_email on public.users using btree (email) TABLESPACE pg_default;

create index IF not exists idx_users_staff_id on public.users using btree (staff_id) TABLESPACE pg_default;

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();
create table public.vehicle_maintenance (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  vehicle_id uuid not null,
  maintenance_date date not null,
  maintenance_type character varying(50) null,
  description text null,
  cost numeric(10, 2) null,
  vendor_name character varying(255) null,
  next_maintenance_date date null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint vehicle_maintenance_pkey primary key (id),
  constraint vehicle_maintenance_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint vehicle_maintenance_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint vehicle_maintenance_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint vehicle_maintenance_vehicle_id_fkey foreign KEY (vehicle_id) references vehicles (id) on delete CASCADE,
  constraint vehicle_maintenance_maintenance_type_check check (
    (
      (maintenance_type)::text = any (
        (
          array[
            'regular'::character varying,
            'repair'::character varying,
            'inspection'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_vehicle_maintenance_user_id on public.vehicle_maintenance using btree (user_id) TABLESPACE pg_default;
create table public.vehicle_maintenance (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  vehicle_id uuid not null,
  maintenance_date date not null,
  maintenance_type character varying(50) null,
  description text null,
  cost numeric(10, 2) null,
  vendor_name character varying(255) null,
  next_maintenance_date date null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint vehicle_maintenance_pkey primary key (id),
  constraint vehicle_maintenance_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint vehicle_maintenance_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint vehicle_maintenance_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint vehicle_maintenance_vehicle_id_fkey foreign KEY (vehicle_id) references vehicles (id) on delete CASCADE,
  constraint vehicle_maintenance_maintenance_type_check check (
    (
      (maintenance_type)::text = any (
        (
          array[
            'regular'::character varying,
            'repair'::character varying,
            'inspection'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_vehicle_maintenance_user_id on public.vehicle_maintenance using btree (user_id) TABLESPACE pg_default;
create table public.visitors (
  id uuid not null default extensions.uuid_generate_v4 (),
  school_id uuid not null,
  created_by uuid null,
  visitor_name character varying(255) not null,
  visitor_mobile character varying(20) not null,
  destination character varying(200) not null,
  time_in time without time zone not null,
  time_out time without time zone null,
  visit_details text null,
  visit_date date not null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null,
  constraint visitors_pkey primary key (id),
  constraint visitors_created_by_fkey foreign KEY (created_by) references users (id) on delete set null,
  constraint visitors_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE,
  constraint visitors_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_visitors_school_id on public.visitors using btree (school_id) TABLESPACE pg_default;

create index IF not exists idx_visitors_visit_date on public.visitors using btree (visit_date) TABLESPACE pg_default;

create index IF not exists idx_visitors_mobile on public.visitors using btree (visitor_mobile) TABLESPACE pg_default;

create index IF not exists idx_visitors_user_id on public.visitors using btree (user_id) TABLESPACE pg_default;

create trigger update_visitors_updated_at BEFORE
update on visitors for EACH row
execute FUNCTION update_updated_at_column ();








-- Create active sessions for each school (multi-user system)


-- Step 1: Check current users and schools
SELECT
    u.id as user_id,
    u.email,
    u.school_id,
    s.name as school_name
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
ORDER BY u.created_at;


-- Step 2: Check existing sessions
SELECT
    sess.id,
    sess.name as session_name,
    sess.start_date,
    sess.end_date,
    sess.status,
    sess.is_current,
    sess.school_id,
    sess.user_id,
    s.name as school_name
FROM sessions sess
LEFT JOIN schools s ON sess.school_id = s.id
ORDER BY sess.created_at DESC;


-- Step 3: Create an active session for EACH school that doesn't have one
INSERT INTO sessions (school_id, user_id, name, start_date, end_date, status, is_current, created_by, created_at)
SELECT
    u.school_id,
    u.id as user_id,
    '2025-2026' as name,
    '2025-11-28'::date as start_date,
    '2026-06-29'::date as end_date,
    'active' as status,
    true as is_current,
    u.id as created_by,
    NOW() as created_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.school_id = u.school_id
    AND s.status = 'active'
)
GROUP BY u.school_id, u.id;


-- Step 4: Verify - Each school should have an active session
SELECT
    s.name as school_name,
    s.id as school_id,
    u.email as user_email,
    sess.id as session_id,
    sess.name as session_name,
    sess.start_date,
    sess.end_date,
    sess.status,
    sess.is_current,
    CASE
        WHEN sess.id IS NULL THEN '❌ No active session'
        ELSE '✅ Has active session'
    END as session_status
FROM schools s
LEFT JOIN users u ON s.id = u.school_id
LEFT JOIN sessions sess ON s.id = sess.school_id AND sess.status = 'active'
ORDER BY s.name;



