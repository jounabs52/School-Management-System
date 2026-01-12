/**
 * BATCH FIX HELPER - Copy this code to add to any page
 *
 * This provides a consistent pattern for multi-user filtering
 */

// ========================================
// STEP 1: Add this helper function at the top of each page (after imports, before export)
// ========================================

const getLoggedInUser = () => {
  if (typeof window === 'undefined') return { id: null, school_id: null }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return { id: user?.id, school_id: user?.school_id }
  } catch {
    return { id: null, school_id: null }
  }
}

// ========================================
// STEP 2: At the start of EVERY fetch function, add:
// ========================================

const { id: userId, school_id: schoolId } = getLoggedInUser()

// Then add to every .from() query:
// .eq('user_id', userId)
// .eq('school_id', schoolId)

// ========================================
// EXAMPLES:
// ========================================

// EXAMPLE 1: Fetch with filter
async function fetchStudents() {
  const { id: userId, school_id: schoolId } = getLoggedInUser()

  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', userId)        // ✅ ADD
    .eq('school_id', schoolId)    // ✅ ADD
    .eq('status', 'active')
}

// EXAMPLE 2: Insert with user_id
async function createStudent(studentData) {
  const { id: userId, school_id: schoolId } = getLoggedInUser()

  const { data } = await supabase
    .from('students')
    .insert([{
      user_id: userId,            // ✅ ADD
      school_id: schoolId,        // ✅ ADD
      ...studentData
    }])
}

// EXAMPLE 3: Update with filter
async function updateStudent(id, updates) {
  const { id: userId, school_id: schoolId } = getLoggedInUser()

  const { data } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)        // ✅ ADD
    .eq('school_id', schoolId)    // ✅ ADD
}

// EXAMPLE 4: Delete with filter
async function deleteStudent(id) {
  const { id: userId, school_id: schoolId } = getLoggedInUser()

  const { data } = await supabase
    .from('students')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)        // ✅ ADD
    .eq('school_id', schoolId)    // ✅ ADD
}

// ========================================
// QUICK CHECKLIST FOR EACH PAGE:
// ========================================

/*
✅ 1. Add getLoggedInUser() helper function
✅ 2. In EVERY function that queries database:
    - Add: const { id: userId, school_id: schoolId } = getLoggedInUser()
✅ 3. Find ALL .from('table_name') calls
✅ 4. Add .eq('user_id', userId).eq('school_id', schoolId) after .from()
✅ 5. For INSERT, add user_id: userId to the data object
✅ 6. For UPDATE/DELETE, add .eq('user_id', userId).eq('school_id', schoolId)
✅ 7. Test with 2 different users
*/

// ========================================
// TABLES THAT NEED FIXING (Common ones):
// ========================================

/*
- students
- staff
- classes
- sections
- subjects
- fee_challans
- fee_collections
- exams
- exam_marks
- student_attendance
- staff_attendance
- library_books
- transport_routes
- transport_passengers
- payroll (all tables)
- datesheet
- timetable
*/

module.exports = { getLoggedInUser }
