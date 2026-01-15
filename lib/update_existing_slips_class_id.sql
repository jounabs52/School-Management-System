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
