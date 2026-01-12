/**
 * AUTO-FIX TEMPLATE
 *
 * Use this template to quickly fix any remaining page
 * Time per page: 3-5 minutes
 */

// ============================================
// STEP 1: Copy this helper function
// Add it right after the `const supabase = createClient(...)` line
// ============================================

const getLoggedInUser = () => {
  if (typeof window === 'undefined') return { id: null, school_id: null }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return { id: user?.id, school_id: user?.school_id }
  } catch {
    return { id: null, school_id: null }
  }
}

// ============================================
// STEP 2: Find all functions that use supabase queries
// Use Ctrl+F to search for: .from(
// ============================================

// For EACH function found, add this line at the start:
const { id: userId, school_id: schoolId } = getLoggedInUser()

// ============================================
// STEP 3: Update SELECT queries
// ============================================

// BEFORE:
const { data } = await supabase
  .from('students')
  .select('*')
  .eq('status', 'active')

// AFTER:
const { id: userId, school_id: schoolId } = getLoggedInUser()
const { data } = await supabase
  .from('students')
  .select('*')
  .eq('user_id', userId)          // ✅ ADD
  .eq('school_id', schoolId)      // ✅ ADD
  .eq('status', 'active')

// ============================================
// STEP 4: Update INSERT queries
// ============================================

// BEFORE:
await supabase.from('students').insert([{
  school_id: schoolId,
  name: 'John',
  // ... other fields
}])

// AFTER:
const { id: userId, school_id: schoolId } = getLoggedInUser()
await supabase.from('students').insert([{
  user_id: userId,                // ✅ ADD THIS LINE
  school_id: schoolId,
  name: 'John',
  // ... other fields
}])

// ============================================
// STEP 5: Update UPDATE queries
// ============================================

// BEFORE:
await supabase
  .from('students')
  .update({ name: 'Updated' })
  .eq('id', studentId)

// AFTER:
const { id: userId, school_id: schoolId } = getLoggedInUser()
await supabase
  .from('students')
  .update({ name: 'Updated' })
  .eq('id', studentId)
  .eq('user_id', userId)          // ✅ ADD
  .eq('school_id', schoolId)      // ✅ ADD

// ============================================
// STEP 6: Update DELETE queries
// ============================================

// BEFORE:
await supabase
  .from('students')
  .delete()
  .eq('id', studentId)

// AFTER:
const { id: userId, school_id: schoolId } = getLoggedInUser()
await supabase
  .from('students')
  .delete()
  .eq('id', studentId)
  .eq('user_id', userId)          // ✅ ADD
  .eq('school_id', schoolId)      // ✅ ADD

// ============================================
// SPECIAL CASE: Schools table
// ============================================

// Schools table doesn't have user_id, only filter by school_id

// BEFORE:
await supabase
  .from('schools')
  .select('*')
  .limit(1)
  .single()

// AFTER:
const { id: userId, school_id: schoolId } = getLoggedInUser()
await supabase
  .from('schools')
  .select('*')
  .eq('id', schoolId)             // ✅ Filter by user's school
  .single()

// ============================================
// TESTING CHECKLIST
// ============================================

/*
After fixing a page:

1. Save the file
2. Restart your Next.js dev server (Ctrl+C, then npm run dev)
3. Login as User 1
4. Open the fixed page
5. Note what data you see (e.g., "I see 5 students")
6. Logout
7. Login as User 2
8. Open the same page
9. Verify you see DIFFERENT data (e.g., "I see 2 different students")
10. Try creating/updating/deleting - should work without errors

✅ If you see different data = SUCCESS!
❌ If you see same data = Need to check the fix
*/

// ============================================
// COMMON MISTAKES TO AVOID
// ============================================

/*
❌ DON'T: Forget to add userId/schoolId at function start
❌ DON'T: Skip .eq('user_id', userId) on queries
❌ DON'T: Mix up const/let for userId and schoolId
❌ DON'T: Filter schools table by user_id (it doesn't have that column)
❌ DON'T: Forget to add user_id to INSERT statements

✅ DO: Add helper function once at top
✅ DO: Get userId/schoolId in EVERY function
✅ DO: Add filters to EVERY query
✅ DO: Test with 2 different users
✅ DO: Check browser console for errors
*/

// ============================================
// QUICK REFERENCE: Tables & Filters
// ============================================

/*
These tables HAVE user_id (add both filters):
- students: .eq('user_id', userId).eq('school_id', schoolId)
- staff: .eq('user_id', userId).eq('school_id', schoolId)
- classes: .eq('user_id', userId).eq('school_id', schoolId)
- sections: .eq('user_id', userId).eq('school_id', schoolId)
- subjects: .eq('user_id', userId).eq('school_id', schoolId)
- fee_challans: .eq('user_id', userId).eq('school_id', schoolId)
- exams: .eq('user_id', userId).eq('school_id', schoolId)
- etc... (most tables)

These tables DON'T have user_id (only school filter):
- schools: .eq('id', schoolId)
- users: .eq('id', userId) OR .eq('school_id', schoolId)
*/

