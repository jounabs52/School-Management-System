-- Create contact_groups table
-- This table stores different contact groups (e.g., Parents, Vendors, etc.)
CREATE TABLE IF NOT EXISTS public.contact_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT contact_groups_school_id_group_name_key UNIQUE (school_id, group_name)
);

-- Create indexes for contact_groups
CREATE INDEX IF NOT EXISTS idx_contact_groups_school_id ON public.contact_groups USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON public.contact_groups USING btree (user_id);

-- Add comments to contact_groups columns
COMMENT ON TABLE public.contact_groups IS 'Stores contact groups for organizing contacts';
COMMENT ON COLUMN public.contact_groups.school_id IS 'Reference to the school';
COMMENT ON COLUMN public.contact_groups.user_id IS 'User who manages this group';
COMMENT ON COLUMN public.contact_groups.group_name IS 'Name of the contact group';

-- Create contacts table
-- This table stores individual contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  group_id uuid REFERENCES public.contact_groups(id) ON DELETE SET NULL,
  company text,
  mobile text NOT NULL,
  whatsapp text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_school_id ON public.contacts USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_group_id ON public.contacts USING btree (group_id);
CREATE INDEX IF NOT EXISTS idx_contacts_mobile ON public.contacts USING btree (mobile);

-- Add comments to contacts columns
COMMENT ON TABLE public.contacts IS 'Stores contact information for frontdesk management';
COMMENT ON COLUMN public.contacts.school_id IS 'Reference to the school';
COMMENT ON COLUMN public.contacts.user_id IS 'User who manages this contact';
COMMENT ON COLUMN public.contacts.name IS 'Contact name';
COMMENT ON COLUMN public.contacts.group_id IS 'Reference to the contact group';
COMMENT ON COLUMN public.contacts.company IS 'Company name';
COMMENT ON COLUMN public.contacts.mobile IS 'Mobile phone number';
COMMENT ON COLUMN public.contacts.whatsapp IS 'WhatsApp number';

-- Enable Row Level Security (RLS)
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.contact_groups;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.contact_groups;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.contact_groups;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.contact_groups;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.contacts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.contacts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.contacts;

-- Create RLS policies for contact_groups (SIMPLIFIED - Allow all authenticated users)
CREATE POLICY "Enable read access for authenticated users"
  ON public.contact_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.contact_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON public.contact_groups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON public.contact_groups FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for contacts (SIMPLIFIED - Allow all authenticated users)
CREATE POLICY "Enable read access for authenticated users"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (true);
