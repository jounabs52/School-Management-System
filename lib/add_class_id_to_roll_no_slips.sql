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
