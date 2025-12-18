# Table Usage Verification Report

## ✅ CORRECT Table Usage

### Test Files (Using Correct Tables)

#### 1. app/(dashboard)/exam/test/page.js
**Status:** ✅ CORRECT

**Tables Used:**
- `tests` - Main test information ✅
- `test_subjects` - Test-subject junction (per-subject marks) ✅
- `classes` - Class information ✅
- `sections` - Section information ✅
- `subjects` - Subject information ✅
- `class_subjects` - Class-subject relationships ✅

**Data Flow:**
```
CREATE TEST:
tests (aggregate) → test_subjects (per-subject)
```

---

#### 2. app/(dashboard)/exam/test/marks/page.js
**Status:** ✅ CORRECT

**Tables Used:**
- `tests` - Get test information ✅
- `test_subjects` - Get per-subject total marks ✅
- `test_marks` - Store student marks ✅
- `students` - Student information ✅
- `classes` - Class information ✅
- `sections` - Section information ✅

**Data Flow:**
```
ENTER MARKS:
tests → test_subjects (get total_marks) → test_marks (save obtained_marks)
```

---

### Exam Files (Partial Issues)

#### 3. app/(dashboard)/exam/marks/page.js
**Status:** ✅ CORRECT

**Tables Used:**
- `exams` - Main exam information ✅
- `exam_schedules` - Get per-subject total marks ✅
- `exam_marks` - Store student marks ✅
- `students` - Student information ✅
- `classes` - Class information ✅
- `sections` - Section information ✅

**Data Flow:**
```
ENTER MARKS:
exams → exam_schedules (get total_marks) → exam_marks (save obtained_marks)
```

---

## 🔴 CRITICAL ISSUE: Wrong Tables Used

#### 4. app/(dashboard)/exam/exams/page.js
**Status:** ❌ USING WRONG TABLES

**Tables Currently Used:**
- ❌ `datesheets` - Should be `exams`
- ❌ `datesheet_schedules` - Should be `exam_schedules`
- ✅ `classes` - Correct
- ✅ `sections` - Correct
- ✅ `subjects` - Correct
- ✅ `exam_schedules` - Used in some places (inconsistent!)
- ✅ `exams` - Used in some places (inconsistent!)

**Problem:**
The file is **inconsistently** using both:
1. Old naming: `datesheets`, `datesheet_schedules`
2. Correct naming: `exams`, `exam_schedules`

**Lines with Wrong Tables:**
- Line 250: `.from('datesheets')` ❌ Should be `.from('exams')`
- Line 265: `.from('datesheets')` ❌ Should be `.from('exams')`
- Line 289: `.from('datesheet_schedules')` ❌ Should be `.from('exam_schedules')`

**Lines with Correct Tables:**
- Line 178: `.from('exams')` ✅ Correct
- Line 209: `.from('exam_schedules')` ✅ Correct
- Line 411: `.from('exams')` ✅ Correct
- Line 564: `.from('exam_schedules')` ✅ Correct

---

## Summary Table

| File | Correct Tables | Wrong Tables | Status |
|------|----------------|--------------|--------|
| **test/page.js** | tests, test_subjects | None | ✅ CORRECT |
| **test/marks/page.js** | tests, test_marks, test_subjects | None | ✅ CORRECT |
| **marks/page.js** (exams) | exams, exam_marks, exam_schedules | None | ✅ CORRECT |
| **exams/page.js** | exams, exam_schedules (partial) | datesheets, datesheet_schedules | ❌ MIXED/INCORRECT |

---

## Database Schema Reference

### Test Module Tables:
```
tests - Main test table
├── id, school_id, test_name, test_date
├── class_id, section_id
├── total_marks (aggregate)
└── status

test_subjects - Junction table (per-subject)
├── id, test_id, subject_id
├── total_marks (per-subject) ✅
└── school_id

test_marks - Student marks
├── id, test_id, student_id, subject_id
├── obtained_marks, is_absent
└── school_id
```

### Exam Module Tables:
```
exams - Main exam table (NOT datesheets!)
├── id, school_id, session_id, exam_name
├── start_date, end_date
├── class_id, section_id, total_marks (aggregate)
└── status

exam_schedules - Junction table (per-subject) (NOT datesheet_schedules!)
├── id, exam_id, class_id, subject_id
├── exam_date, start_time, end_time
├── total_marks (per-subject) ✅
├── passing_marks, room_number
└── school_id

exam_marks - Student marks
├── id, exam_id, student_id, subject_id
├── class_id, section_id
├── total_marks, obtained_marks
└── school_id
```

---

## Required Fixes

### Fix app/(dashboard)/exam/exams/page.js

**Replace all instances:**

1. **Line 250** - `fetchAllDatesheets` function:
   ```javascript
   // WRONG:
   .from('datesheets')

   // CORRECT:
   .from('exams')
   ```

2. **Line 265** - `fetchDatesheetDetails` function:
   ```javascript
   // WRONG:
   .from('datesheets')

   // CORRECT:
   .from('exams')
   ```

3. **Line 289** - `fetchClassesForSelectedDatesheet` function:
   ```javascript
   // WRONG:
   .from('datesheet_schedules')

   // CORRECT:
   .from('exam_schedules')
   ```

4. **State Variables** - Also need to rename:
   ```javascript
   // WRONG:
   const [selectedDatesheet, setSelectedDatesheet] = useState('')
   const [allDatesheets, setAllDatesheets] = useState([])

   // CORRECT (for consistency):
   const [selectedExam, setSelectedExam] = useState('')
   const [allExams, setAllExams] = useState([])
   ```

---

## Impact Assessment

### Current Impact:
- ❌ Exam creation page may fail if `datesheets` table doesn't exist
- ❌ Data might be saved to wrong tables
- ❌ Inconsistent data access (some queries work, some fail)
- ❌ Frontend and backend table mismatch

### After Fix:
- ✅ All exam operations will use correct tables
- ✅ Consistent with exam marks entry page
- ✅ Database schema alignment
- ✅ Proper data flow: exams → exam_schedules → exam_marks

---

## Correct Module Structure

### Tests Module:
```
TEST CREATION (test/page.js)
└── tests + test_subjects

TEST MARKS ENTRY (test/marks/page.js)
└── tests + test_subjects → test_marks
```

### Exams Module:
```
EXAM CREATION (exams/page.js) ⚠️ NEEDS FIX
└── exams + exam_schedules

EXAM MARKS ENTRY (marks/page.js) ✅ CORRECT
└── exams + exam_schedules → exam_marks
```

---

## Verification Checklist

- [x] Test page uses correct tables ✅
- [x] Test marks page uses correct tables ✅
- [x] Exam marks page uses correct tables ✅
- [ ] Exam creation page uses correct tables ❌ **NEEDS FIX**

---

## Note on "test_schedules"

**User mentioned "test_schedules"** but this table **doesn't exist**.

The correct table names are:
- ✅ `test_subjects` (for tests)
- ✅ `exam_schedules` (for exams)

There is **NO** `test_schedules` table in the database schema.
