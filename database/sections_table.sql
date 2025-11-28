-- Create sections table for managing class sections
-- This table stores different sections within each class (e.g., Section A, Section B, Green Section, etc.)

CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL,
    capacity INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique section names within each class
    UNIQUE(class_id, section_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sections_class_id ON sections(class_id);
CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sections_updated_at_trigger
    BEFORE UPDATE ON sections
    FOR EACH ROW
    EXECUTE FUNCTION update_sections_updated_at();

-- Insert some sample sections for existing classes (you can modify these based on your needs)
-- Note: Replace the class IDs with actual IDs from your classes table

-- Example: Insert sections for a class (uncomment and update class_id as needed)
-- INSERT INTO sections (class_id, section_name, capacity) VALUES
-- ('your-class-id-here', 'Section A', 30),
-- ('your-class-id-here', 'Section B', 30),
-- ('your-class-id-here', 'Green', 25),
-- ('your-class-id-here', 'Blue', 25);

COMMENT ON TABLE sections IS 'Stores class sections for organizing students within classes';
COMMENT ON COLUMN sections.class_id IS 'Reference to the parent class';
COMMENT ON COLUMN sections.section_name IS 'Name of the section (e.g., A, B, Green, Blue)';
COMMENT ON COLUMN sections.capacity IS 'Maximum number of students allowed in this section';
COMMENT ON COLUMN sections.status IS 'Section status: active or inactive';
