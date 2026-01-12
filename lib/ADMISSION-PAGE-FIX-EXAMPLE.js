// ============================================
// EXAMPLE FIX for app/(dashboard)/students/admission/page.js
// ============================================
// This shows the key changes you need to make
// ============================================

// 1. At the top of the file (around line 6), ADD this import:
import { getCurrentUserId, getCurrentSchoolId } from '@/lib/supabaseClient'

// 2. In fetchStudents function (around line 260), ADD user filter:
const fetchStudents = async () => {
  setLoading(true)
  try {
    const userId = getCurrentUserId()  // ✅ ADD
    const schoolId = getCurrentSchoolId()  // ✅ ADD

    if (!userId) {
      showToast('Please login again', 'error')
      return
    }

    let query = supabase
      .from('students')
      .select(`
        *,
        classes(name),
        sections(name)
      `)
      .eq('user_id', userId)  // ✅ ADD THIS LINE
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    // ... rest of the function stays the same
  }
}

// 3. In handleSaveStudent function (around line 704), ADD user_id to all inserts:
const handleSaveStudent = async () => {
  setSaving(true)
  setError(null)
  setSuccess(null)

  try {
    const userId = getCurrentUserId()  // ✅ ADD
    const schoolId = getCurrentSchoolId()  // ✅ ADD

    if (!userId) {
      throw new Error('User not logged in. Please login again.')
    }

    // ... existing code for name parsing, image upload, etc.

    // INSERT STUDENTS (around line 821)
    if (!isEditMode) {
      const { data: insertedStudent, error: insertError } = await supabase
        .from('students')
        .insert([{
          user_id: userId,  // ✅ ADD THIS LINE
          school_id: schoolId,
          admission_number: formData.admissionNo,
          first_name: firstName,
          last_name: lastName,
          father_name: formData.fatherName,
          photo_url: photoUrl,
          mother_name: formData.motherName || null,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender,
          blood_group: formData.bloodGroup || null,
          religion: formData.religion || null,
          caste: formData.casteRace || null,
          nationality: formData.nationality || 'Pakistan',
          admission_date: formData.admissionDate,
          current_class_id: formData.class || null,
          current_section_id: formData.section || null,
          roll_number: formData.rollNumber || null,
          house: formData.house || null,
          whatsapp_number: formData.whatsappNumber || null,
          base_fee: parseFloat(formData.baseFee) || 0,
          discount_type: formData.discountType || 'fixed',
          discount_value: parseFloat(formData.discount) || 0,
          discount_amount: calculateDiscount(formData.baseFee, formData.discount, formData.discountType),
          discount_note: formData.discountNote || null,
          final_fee: (parseFloat(formData.baseFee) || 0) - calculateDiscount(formData.baseFee, formData.discount, formData.discountType),
          fee_plan: safeFeePlan,
          starting_month: parseInt(formData.startingMonth) || new Date().getMonth() + 1,
          status: 'active'
        }])
        .select()

      if (insertError) throw insertError

      // INSERT CONTACTS (around line 900-914)
      const contacts = [
        {
          user_id: userId,  // ✅ ADD THIS
          student_id: insertedStudent.id,
          school_id: schoolId,
          contact_type: 'Father',
          name: formData.fatherName,
          mobile: formData.fatherMobile || null,
          email: formData.fatherEmail || null,
          cnic: formData.fatherCnic || null,
          occupation: formData.fatherOccupation || null,
          annual_income: formData.fatherIncome ? parseFloat(formData.fatherIncome) : null,
          address: formData.address || null,
          is_primary: true
        },
        {
          user_id: userId,  // ✅ ADD THIS
          student_id: insertedStudent.id,
          school_id: schoolId,
          contact_type: 'Mother',
          name: formData.motherName || null,
          mobile: formData.motherMobile || null,
          email: formData.motherEmail || null,
          cnic: formData.motherCnic || null,
          occupation: formData.motherOccupation || null,
          address: formData.address || null,
          is_primary: false
        }
      ].filter(c => c.name)

      if (contacts.length > 0) {
        await supabase.from('student_contacts').insert(contacts)
      }

      // INSERT FEE CHALLAN (around line 942-972)
      if (formData.baseFee && formData.feePlan && formData.startingMonth) {
        const feeSchedule = generateFeeSchedule(
          formData.feePlan,
          parseInt(formData.startingMonth),
          formData.baseFee,
          formData.discount,
          formData.discountType
        )

        const { data: sessionData } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', schoolId)
          .eq('user_id', userId)  // ✅ ADD THIS
          .eq('is_current', true)
          .single()

        const sessionId = sessionData?.id || null
        const totalYearlyAmount = feeSchedule.reduce((sum, item) => sum + item.amount, 0)
        const actualDiscount = calculateDiscount(formData.baseFee, formData.discount, formData.discountType)

        const challanNumber = `CH-${insertedStudent.admission_number}-${new Date().getFullYear()}`
        const challanToInsert = {
          user_id: userId,  // ✅ ADD THIS
          school_id: schoolId,
          student_id: insertedStudent.id,
          session_id: sessionId,
          challan_number: challanNumber,
          fee_plan: formData.feePlan,
          base_amount: parseFloat(formData.baseFee),
          discount_type: formData.discountType || 'fixed',
          discount_value: parseFloat(formData.discount) || 0,
          discount_amount: actualDiscount,
          total_amount: totalYearlyAmount,
          remaining_amount: totalYearlyAmount,
          status: 'unpaid',
          fee_schedule: feeSchedule,
          due_date: new Date(new Date().getFullYear(), parseInt(formData.startingMonth) - 1, 15).toISOString().split('T')[0],
          issued_date: new Date().toISOString().split('T')[0]
        }

        await supabase
          .from('fee_challans')
          .insert([challanToInsert])
      }

      showToast('Student created successfully with fee schedule!', 'success')
    }

    setShowRegisterSidebar(false)
    resetForm()
    setImageFile(null)
    setImagePreview(null)
  } catch (err) {
    showToast(err.message || 'Failed to save student', 'error')
    console.error('Save error:', err)
  } finally {
    setSaving(false)
  }
}

// 4. In handleImportStudents function (around line 1971), ADD user_id:
const handleImportStudents = async () => {
  // ... existing validation code ...

  const userId = getCurrentUserId()  // ✅ ADD
  const schoolId = getCurrentSchoolId()  // ✅ ADD

  if (!userId) {
    throw new Error('User not logged in')
  }

  // When creating studentsToInsert array:
  const studentsToInsert = validStudents.map(student => ({
    user_id: userId,  // ✅ ADD THIS
    school_id: schoolId,
    admission_number: student['Admission No'] || `ADM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    // ... rest of fields
  }))

  // ... rest of import logic
}

// ============================================
// SUMMARY OF CHANGES:
// ============================================
// 1. Import getCurrentUserId and getCurrentSchoolId
// 2. Add user_id to ALL .insert() calls
// 3. Add .eq('user_id', userId) to ALL .select() calls
// 4. Check if userId exists before any operation
// ============================================
