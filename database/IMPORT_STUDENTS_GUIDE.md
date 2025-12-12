# Student Import Guide

## Overview
The Import Students feature allows you to bulk import multiple students into the system using CSV or Excel files.

## Prerequisites

### 1. Database Setup
Before using the import feature, you need to create the sections table:

```bash
# Run the sections table SQL script in your Supabase SQL Editor
# File: database/sections_table.sql
```

### 2. Create Sections for Your Classes
After creating the sections table, add sections for your classes:

```sql
-- Example: Add sections for a specific class
-- First, get your class ID:
SELECT id, class_name FROM classes;

-- Then insert sections for that class:
INSERT INTO sections (class_id, section_name, capacity) VALUES
('your-class-id-here', 'Section A', 30),
('your-class-id-here', 'Section B', 30),
('your-class-id-here', 'Green Section', 25);
```

## How to Import Students

### Step 1: Prepare Your CSV File

#### Mandatory Columns:
- **Admission Number** (can also be: admission_number, admissionno)
- **Student Name** (can also be: studentname, name)
- **Father Name** (can also be: fathername)

#### Optional Columns:
- Mother Name (mothername)
- Date of Birth (dob, dateofbirth)
- Gender (default: male)
- Father Mobile (fathermobile, mobile)
- Mother Mobile (mothermobile)
- Blood Group (bloodgroup)
- Religion
- Address (current address)
- Fee (base fee, basefee)
- Discount

#### Example CSV Format:
```csv
admission number,student name,father name,mother name,gender,dob,father mobile,mother mobile,blood group,religion,address,fee,discount
001,Ahmed Ali,Muhammad Ali,Fatima Ali,male,2015-05-10,03001234567,03009876543,B+,Islam,House 123,5000,0
002,Sara Khan,Imran Khan,Ayesha Khan,female,2016-03-15,03011234567,03019876543,A+,Islam,House 456,5000,500
```

### Step 2: Use the Import Feature

1. **Navigate to Import Students Tab**
   - Click on "Import Students" button in the admission page

2. **Select Class** (Required)
   - Click on the Class search field
   - Type to search for your class or select from the dropdown
   - The selected class will be displayed below the field

3. **Select Category** (Required)
   - Choose from:
     - Active Student (currently enrolled)
     - Old Student (previously enrolled)
     - Orphan Student

4. **Select Section** (Optional)
   - This field appears only after selecting a class
   - Click on the Section search field
   - Type to search or select from available sections
   - You can skip this if sections are not created yet

5. **Upload CSV/Excel File** (Required)
   - Click "Choose File" or drag and drop
   - Supported formats: .csv, .xlsx, .xls
   - The file name and size will be displayed after selection

6. **Import Students**
   - Review your selections
   - Click "Import Students" button
   - Wait for the import to complete
   - Success message will show the number of imported students

### Step 3: Verify Import

After import:
- Navigate to "Admission Register" tab
- Your imported students should appear in the list
- You can search, view, edit, or delete them as needed

## Important Notes

### Validation Rules:
- All students must have: Admission Number, Student Name, Father Name
- If any row is missing mandatory fields, the entire import will fail with an error message
- Optional fields can be left empty
- Gender defaults to "male" if not specified
- Nationality defaults to "Pakistan"

### Category Behavior:
- **Active Student**: Sets status to "active" (visible in main list)
- **Old Student**: Sets status to "inactive"
- **Orphan Student**: Sets status based on category

### File Processing:
- The system automatically detects column names (case-insensitive)
- Multiple column name formats are supported
- Empty cells in optional columns are allowed
- Date format should be: YYYY-MM-DD (e.g., 2015-05-10)

### Contact Information:
- If Father Mobile is provided, a father contact entry is created
- If Mother Mobile is provided, a mother contact entry is created
- Address is saved with both father and mother contacts

## Troubleshooting

### Common Errors:

**Error: "No valid student data found in file"**
- Check if your CSV has at least 2 rows (header + data)
- Ensure rows are not empty

**Error: "Missing admission number" / "Missing student name" / "Missing father name"**
- Check the specific row mentioned in the error
- Ensure all mandatory fields are filled

**Error: "Please select a class"**
- Make sure you've selected a class before clicking Import

**Error: "Please select a file to import"**
- Choose a CSV or Excel file before importing

**Error: "Failed to load classes"**
- Check your database connection
- Ensure classes table has active classes

## Sample Template

Use the provided template file: `database/student_import_template.csv`

This template includes example data showing the correct format for all fields.

## Tips for Success

1. **Test with Small Files First**: Start with 2-3 students to verify the format
2. **Check Column Names**: Make sure header row matches supported column names
3. **Backup Your Data**: Before bulk import, backup your database
4. **Review After Import**: Always check the imported data in the Admission Register
5. **Use Consistent Formats**: Keep date formats and phone numbers consistent

## Support

If you encounter any issues:
1. Check the error message for specific row numbers
2. Verify your CSV format matches the template
3. Ensure all mandatory fields are present
4. Check database connectivity
