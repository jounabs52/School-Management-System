'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, X, Eye, Edit2, Trash2, RefreshCw, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function FeeCreatePage() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [classSections, setClassSections] = useState([]) // Sections for selected class
  const [classStudents, setClassStudents] = useState([]) // Students for selected class
  const [feeHeads, setFeeHeads] = useState([])
  const [classFeeStructures, setClassFeeStructures] = useState([]) // Fee policies for selected class
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [showChallanModal, setShowChallanModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdChallans, setCreatedChallans] = useState([])
  const [viewChallan, setViewChallan] = useState(null)
  const [editingChallan, setEditingChallan] = useState(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 20

  // Form states for different categories
  const [instantChallanForm, setInstantChallanForm] = useState({
    target: 'Single Student',
    category: 'Monthly Fee', // Changed default to 'Monthly Fee' so it's always included
    classId: '',
    sectionId: '',
    studentId: '',
    loadedStudent: null,
    selectedFeeStructureId: '', // For Other Fee dropdown
    selectedOtherFees: [], // Array of selected other fees {id, name, amount}
    customAmount: '', // For Monthly Fee standard fee
    classFee: 0, // Class fee amount
    classDiscount: 0 // Class-level discount
  })

  const [bulkEntriesForm, setBulkEntriesForm] = useState({
    class: '',
    section: '',
    feeMonth: 'December',
    feeYear: '2025',
    feeHead: '',
    narration: '',
    amount: ''
  })

  const [monthlyChallanForm, setMonthlyChallanForm] = useState({
    class: '',
    section: '',
    feeMonth: 'December',
    feeYear: '2025',
    dueDate: '03-Dec-2025',
    applyConcession: false
  })

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (showChallanModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showChallanModal])

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('order_number', { ascending: true })

      if (classesError) throw classesError
      setClasses(classesData || [])

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_name')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (sectionsError) throw sectionsError
      setSections(sectionsData || [])

      // Fetch fee types (fee heads)
      const { data: feeTypesData, error: feeTypesError } = await supabase
        .from('fee_types')
        .select('id, fee_name, fee_code')
        .eq('school_id', user.school_id)
        .eq('status', 'active')

      if (feeTypesError) throw feeTypesError
      setFeeHeads(feeTypesData || [])

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          father_name,
          current_class_id,
          current_section_id,
          classes:current_class_id (
            id,
            class_name
          ),
          sections:current_section_id (
            id,
            section_name
          )
        `)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('admission_number', { ascending: true })

      if (studentsError) throw studentsError
      setStudents(studentsData || [])

      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSelectStudent = (student) => {
    if (selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents(selectedStudents.filter(s => s.id !== student.id))
    } else {
      setSelectedStudents([...selectedStudents, student])
    }
  }

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents([...filteredStudents])
    }
  }

  const handleCreateChallan = () => {
    setShowChallanModal(true)
    setSelectedCategory('instant')
    setEditingChallan(null)
  }

  // Load sections when class is selected
  const handleClassChange = async (classId) => {
    setInstantChallanForm({
      ...instantChallanForm,
      classId,
      sectionId: '',
      studentId: '',
      loadedStudent: null,
      selectedFeeStructureId: '',
      selectedOtherFees: [],
      customAmount: '',
      classFee: 0,
      classDiscount: 0
    })

    if (!classId) {
      setClassSections([])
      setClassStudents([])
      setClassFeeStructures([])
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) return

      // Get current session
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .single()

      // Fetch class fee and discount
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (classError) {
        console.error('❌ Error fetching class:', classError)
      }

      const classFee = parseFloat(classData?.standard_fee || 0)
      const classDiscount = parseFloat(classData?.discount || 0)

      // Fetch sections for this class
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_name')
        .eq('school_id', user.school_id)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (!sectionsError) {
        setClassSections(sectionsData || [])
      }

      // Fetch students for this class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          father_name,
          base_fee,
          discount_amount
        `)
        .eq('school_id', user.school_id)
        .eq('current_class_id', classId)
        .eq('status', 'active')
        .order('admission_number', { ascending: true })

      if (!studentsError) {
        setClassStudents(studentsData || [])
      }

      // Fetch fee structures for this class (for Other Fee dropdown)
      if (sessionData) {
        const { data: feeStructuresData, error: feeStructuresError } = await supabase
          .from('fee_structures')
          .select(`
            id,
            amount,
            fee_type_id,
            fee_types(fee_name)
          `)
          .eq('school_id', user.school_id)
          .eq('session_id', sessionData.id)
          .eq('class_id', classId)
          .eq('status', 'active')

        if (!feeStructuresError) {
          setClassFeeStructures(feeStructuresData || [])
        }
      }

      // Update form with class fee and discount
      setInstantChallanForm(prev => ({
        ...prev,
        classFee: classFee,
        classDiscount: classDiscount
      }))
    } catch (error) {
      console.error('Error loading class data:', error)
    }
  }

  // Filter students by section
  const handleSectionChange = async (sectionId) => {
    setInstantChallanForm({
      ...instantChallanForm,
      sectionId,
      studentId: '',
      loadedStudent: null
    })

    if (!sectionId || !instantChallanForm.classId) {
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) return

      // Fetch students for this class and section
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          father_name
        `)
        .eq('school_id', user.school_id)
        .eq('current_class_id', instantChallanForm.classId)
        .eq('current_section_id', sectionId)
        .eq('status', 'active')
        .order('admission_number', { ascending: true })

      if (!studentsError) {
        setClassStudents(studentsData || [])
      }
    } catch (error) {
      console.error('Error loading section students:', error)
    }
  }

  // Handle student selection
  const handleStudentChange = (studentId) => {
    const student = classStudents.find(s => s.id === studentId)
    setInstantChallanForm({
      ...instantChallanForm,
      studentId,
      loadedStudent: student || null
    })
  }

  // Fetch created challans
  const fetchCreatedChallans = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_challans')
        .select(`
          id,
          challan_number,
          issue_date,
          due_date,
          total_amount,
          status,
          students (
            id,
            admission_number,
            first_name,
            last_name,
            father_name,
            current_class_id,
            current_section_id,
            base_fee,
            discount_amount,
            final_fee
          )
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        // Fetch class and section names separately
        const enrichedData = await Promise.all(data.map(async (challan) => {
          let className = 'N/A'
          let sectionName = 'N/A'

          if (challan.students?.current_class_id) {
            const { data: classData } = await supabase
              .from('classes')
              .select('class_name')
              .eq('id', challan.students.current_class_id)
              .single()

            if (classData) className = classData.class_name
          }

          if (challan.students?.current_section_id) {
            const { data: sectionData } = await supabase
              .from('sections')
              .select('section_name')
              .eq('id', challan.students.current_section_id)
              .single()

            if (sectionData) sectionName = sectionData.section_name
          }

          return {
            ...challan,
            students: {
              ...challan.students,
              classes: { class_name: className },
              sections: { section_name: sectionName }
            }
          }
        }))

        setCreatedChallans(enrichedData)
      } else if (error) {
        console.error('Error fetching challans:', error)
      }
    } catch (error) {
      console.error('Error fetching challans:', error)
    }
  }

  // Load challans on mount
  useEffect(() => {
    if (!loading) {
      fetchCreatedChallans()
    }
  }, [loading])

  const handleCreateInstantChallan = async () => {
    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
        alert('User not found')
        setSubmitting(false)
        return
      }

      // If editing, update the existing challan
      if (editingChallan) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)

        const { error: updateError } = await supabase
          .from('fee_challans')
          .update({
            student_id: instantChallanForm.studentId,
            due_date: dueDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', editingChallan.id)

        if (updateError) throw updateError

        alert('Challan updated successfully!')
        // Refresh challans list immediately
        await fetchCreatedChallans()

        setShowChallanModal(false)
        setEditingChallan(null)
        setInstantChallanForm({
          target: 'Single Student',
          category: 'Monthly Fee',
          classId: '',
          sectionId: '',
          studentId: '',
          loadedStudent: null,
          selectedFeeStructureId: '',
          selectedOtherFees: [],
          customAmount: '',
          classFee: 0,
          classDiscount: 0
        })
        setSubmitting(false)
        return
      }

      // Validation based on target
      if (instantChallanForm.target === 'Single Student') {
        if (!instantChallanForm.studentId) {
          alert('Please select a student')
          setSubmitting(false)
          return
        }
      } else {
        if (!instantChallanForm.classId) {
          alert('Please select a class')
          setSubmitting(false)
          return
        }
      }

      // Validate that at least one fee type is selected (Monthly Fee or Other Fee)
      if (instantChallanForm.category !== 'Monthly Fee' && instantChallanForm.selectedOtherFees.length === 0) {
        alert('Please select Monthly Fee or at least one Other Fee')
        setSubmitting(false)
        return
      }

      // Get current session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .single()

      if (sessionError || !sessionData) {
        alert('No active session found')
        setSubmitting(false)
        return
      }

      let createdCount = 0
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30) // 30 days from now

      // Determine which students to create challans for
      let studentsToProcess = []
      if (instantChallanForm.target === 'Single Student') {
        studentsToProcess = [{ id: instantChallanForm.studentId }]
      } else {
        // Class-Wise: Get all students in class (and section if selected)
        let query = supabase
          .from('students')
          .select('id, admission_number')
          .eq('school_id', user.school_id)
          .eq('current_class_id', instantChallanForm.classId)
          .eq('status', 'active')

        if (instantChallanForm.sectionId) {
          query = query.eq('current_section_id', instantChallanForm.sectionId)
        }

        const { data: classStudentsData, error: studentsError } = await query
        if (studentsError) throw studentsError
        studentsToProcess = classStudentsData || []
      }

      // Create challan for each student
      for (const student of studentsToProcess) {
        const challanNumber = `CH-${Date.now()}-${student.admission_number || Math.random().toString(36).substring(2, 9).toUpperCase()}`

        // Check if this is the first challan for this student
        const { data: existingChallans } = await supabase
          .from('fee_challans')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('student_id', student.id)
          .limit(1)

        const isFirstChallan = !existingChallans || existingChallans.length === 0

        // Get student's fee information
        const { data: studentData } = await supabase
          .from('students')
          .select('base_fee, discount_amount, final_fee, current_class_id')
          .eq('id', student.id)
          .single()

        // Calculate total amount and fee items
        let totalAmount = 0
        let feeItems = []

        // Add Monthly Fee if checked
        if (instantChallanForm.category === 'Monthly Fee') {
          if (studentData && instantChallanForm.classFee) {
            const classFee = instantChallanForm.classFee
            const classDiscount = instantChallanForm.classDiscount || 0
            const studentDiscount = parseFloat(studentData.discount_amount) || 0
            const monthlyFeeAmount = classFee - classDiscount - studentDiscount

            totalAmount += monthlyFeeAmount

            // Add monthly fee as a challan item
            feeItems.push({
              school_id: user.school_id,
              fee_type_id: null,
              description: 'Monthly Fee',
              amount: monthlyFeeAmount
            })
          }
        }

        // Add Other Fees if any are selected
        if (instantChallanForm.selectedOtherFees.length > 0) {
          for (const fee of instantChallanForm.selectedOtherFees) {
            totalAmount += fee.amount
            feeItems.push({
              school_id: user.school_id,
              fee_type_id: fee.fee_type_id,
              description: fee.name,
              amount: fee.amount
            })
          }
        }

        // Insert challan
        const { data: challan, error: challanError } = await supabase
          .from('fee_challans')
          .insert([{
            school_id: user.school_id,
            session_id: sessionData.id,
            student_id: student.id,
            challan_number: challanNumber,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            total_amount: totalAmount,
            status: 'pending',
            created_by: user.id
          }])
          .select()
          .single()

        if (challanError) {
          console.error('Error creating challan:', challanError)
          continue
        }

        // Insert all fee items (monthly/other fee + admission fee if first challan)
        if (feeItems.length > 0) {
          const challanItemsToInsert = feeItems.map(item => ({
            ...item,
            challan_id: challan.id
          }))

          await supabase
            .from('fee_challan_items')
            .insert(challanItemsToInsert)
        }

        createdCount++
      }

      alert(`Successfully created ${createdCount} challan(s)!`)

      // Refresh challans list immediately
      await fetchCreatedChallans()

      // Close modal and reset form
      setShowChallanModal(false)
      setInstantChallanForm({
        target: 'Single Student',
        category: 'Monthly Fee',
        classId: '',
        sectionId: '',
        studentId: '',
        loadedStudent: null,
        selectedFeeStructureId: '',
        selectedOtherFees: [],
        customAmount: '',
        classFee: 0,
        classDiscount: 0
      })
    } catch (error) {
      console.error('Error creating instant challan:', error)
      alert('Failed to create challan: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Edit Challan
  const handleEditChallan = (challan) => {
    setEditingChallan(challan)
    setShowChallanModal(true)
    setSelectedCategory('instant')

    // Pre-populate the form with challan data
    setInstantChallanForm({
      target: 'Single Student',
      category: 'Other Fee',
      classId: challan.students?.current_class_id || '',
      sectionId: challan.students?.current_section_id || '',
      studentId: challan.students?.id || '',
      loadedStudent: challan.students
    })

    // Load class sections and students
    if (challan.students?.current_class_id) {
      handleClassChange(challan.students.current_class_id)
    }
  }

  // Handle Delete Challan
  const handleDeleteChallan = (challanId) => {
    setDeleteConfirmModal(challanId)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmModal) return

    try {
      const { error } = await supabase
        .from('fee_challans')
        .delete()
        .eq('id', deleteConfirmModal)

      if (error) throw error

      setDeleteConfirmModal(null)
      fetchCreatedChallans()
    } catch (error) {
      console.error('Error deleting challan:', error)
      alert('Failed to delete challan')
      setDeleteConfirmModal(null)
    }
  }

  // Handle View Challan
  const handleViewChallan = (challan) => {
    setViewChallan(challan)
  }

  // Handle Status Toggle
  const handleStatusToggle = async (challanId, currentStatus) => {
    // Cycle through statuses: pending -> paid -> overdue -> pending
    const statusCycle = {
      'pending': 'paid',
      'paid': 'overdue',
      'overdue': 'pending'
    }
    const newStatus = statusCycle[currentStatus] || 'pending'

    try {
      const { error } = await supabase
        .from('fee_challans')
        .update({ status: newStatus })
        .eq('id', challanId)

      if (error) throw error

      fetchCreatedChallans()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const handleAddArrear = async () => {
    if (!bulkEntriesForm.narration || !bulkEntriesForm.amount || !bulkEntriesForm.feeHead) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
        alert('User not found')
        return
      }

      // Get current session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .single()

      if (sessionError || !sessionData) {
        alert('No active session found')
        return
      }

      // Build query for students based on filters
      let query = supabase
        .from('fee_challans')
        .select('id, student_id, students(current_class_id, current_section_id)')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionData.id)
        .eq('status', 'pending')

      // Apply class filter
      if (bulkEntriesForm.class) {
        query = query.eq('students.current_class_id', bulkEntriesForm.class)
      }

      // Apply section filter
      if (bulkEntriesForm.section) {
        query = query.eq('students.current_section_id', bulkEntriesForm.section)
      }

      const { data: challans, error: challansError } = await query

      if (challansError) throw challansError

      if (!challans || challans.length === 0) {
        alert('No pending challans found for the selected criteria')
        return
      }

      // Add arrear to each challan
      const arrearItems = challans.map(challan => ({
        school_id: user.school_id,
        challan_id: challan.id,
        fee_type_id: bulkEntriesForm.feeHead,
        description: bulkEntriesForm.narration,
        amount: parseFloat(bulkEntriesForm.amount)
      }))

      const { error: itemsError } = await supabase
        .from('fee_challan_items')
        .insert(arrearItems)

      if (itemsError) throw itemsError

      // Update total amount for each challan
      for (const challan of challans) {
        const { data: items } = await supabase
          .from('fee_challan_items')
          .select('amount')
          .eq('challan_id', challan.id)

        const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0)

        await supabase
          .from('fee_challans')
          .update({ total_amount: total })
          .eq('id', challan.id)
      }

      alert(`Arrear added successfully to ${challans.length} challan(s)!`)

      // Reset form
      setBulkEntriesForm({
        ...bulkEntriesForm,
        narration: '',
        amount: '',
        feeHead: ''
      })
    } catch (error) {
      console.error('Error adding arrear:', error)
      alert('Failed to add arrear: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateMonthlyChallan = async () => {
    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
        alert('User not found')
        return
      }

      if (!monthlyChallanForm.class) {
        alert('Please select a class')
        return
      }

      // Get current session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .single()

      if (sessionError || !sessionData) {
        alert('No active session found')
        return
      }

      // Get students based on class and section filters
      let query = supabase
        .from('students')
        .select('id, admission_number, first_name, last_name, base_fee, discount_amount, final_fee')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .eq('current_class_id', monthlyChallanForm.class)

      if (monthlyChallanForm.section) {
        query = query.eq('current_section_id', monthlyChallanForm.section)
      }

      const { data: studentsData, error: studentsError } = await query

      if (studentsError) throw studentsError

      if (!studentsData || studentsData.length === 0) {
        alert('No students found for the selected class/section')
        return
      }

      // Get fee structure for the class
      const { data: feeStructures, error: feeError } = await supabase
        .from('fee_structures')
        .select('fee_type_id, amount, fee_types(id, fee_name)')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionData.id)
        .eq('class_id', monthlyChallanForm.class)
        .eq('status', 'active')

      if (feeError) throw feeError

      let createdCount = 0

      // Create challan for each student
      for (const student of studentsData) {
        // Generate challan number
        const challanNumber = `CH-${monthlyChallanForm.feeMonth.substring(0, 3).toUpperCase()}-${monthlyChallanForm.feeYear}-${student.admission_number}`

        // Check if challan already exists
        const { data: existingChallan } = await supabase
          .from('fee_challans')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('challan_number', challanNumber)
          .single()

        if (existingChallan) {
          console.log(`Challan already exists for student ${student.admission_number}`)
          continue
        }

        // Calculate total amount (use final_fee if set, otherwise sum fee structures)
        let totalAmount = student.final_fee || 0
        if (!totalAmount && feeStructures && feeStructures.length > 0) {
          totalAmount = feeStructures.reduce((sum, fs) => sum + parseFloat(fs.amount), 0)
        }

        // Apply concession if checked
        if (monthlyChallanForm.applyConcession && student.discount_amount) {
          totalAmount -= parseFloat(student.discount_amount)
        }

        // Insert challan
        const { data: challan, error: challanError } = await supabase
          .from('fee_challans')
          .insert([{
            school_id: user.school_id,
            session_id: sessionData.id,
            student_id: student.id,
            challan_number: challanNumber,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: monthlyChallanForm.dueDate,
            total_amount: totalAmount,
            status: 'pending',
            created_by: user.id
          }])
          .select()
          .single()

        if (challanError) {
          console.error(`Error creating challan for student ${student.admission_number}:`, challanError)
          continue
        }

        // Insert challan items from fee structure
        if (feeStructures && feeStructures.length > 0) {
          const challanItems = feeStructures.map(fs => ({
            school_id: user.school_id,
            challan_id: challan.id,
            fee_type_id: fs.fee_type_id,
            description: fs.fee_types?.fee_name || 'Monthly Fee',
            amount: parseFloat(fs.amount)
          }))

          const { error: itemsError } = await supabase
            .from('fee_challan_items')
            .insert(challanItems)

          if (itemsError) {
            console.error('Error inserting challan items:', itemsError)
          }
        }

        createdCount++
      }

      alert(`Successfully created ${createdCount} monthly fee challan(s)!`)
      setShowChallanModal(false)
      setMonthlyChallanForm({
        class: '',
        section: '',
        feeMonth: 'December',
        feeYear: '2025',
        dueDate: '03-Dec-2025',
        applyConcession: false
      })
    } catch (error) {
      console.error('Error creating monthly challans:', error)
      alert('Failed to create monthly challans: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${student.first_name} ${student.last_name || ''}`.toLowerCase()

    const matchesSearch =
      fullName.includes(searchLower) ||
      student.admission_number.toLowerCase().includes(searchLower)

    const matchesClass = !selectedClass || student.current_class_id === selectedClass

    return matchesSearch && matchesClass
  })

  // Filter challans by class
  const filteredChallans = createdChallans.filter(challan => {
    if (!selectedClass) return true
    return challan.students?.current_class_id === selectedClass
  })

  // Pagination
  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex)

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedClass])

  // Print challan
  const handlePrintChallan = async (challan) => {
    try {
      // Fetch challan items
      const { data: items } = await supabase
        .from('fee_challan_items')
        .select('description, amount')
        .eq('challan_id', challan.id)

      // Create print content
      const printWindow = window.open('', '_blank')
      const studentName = `${challan.students?.first_name || ''} ${challan.students?.last_name || ''}`
      const className = challan.students?.classes?.class_name || 'N/A'

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fee Challan - ${challan.challan_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin-bottom: 20px; }
            .details-row { display: flex; justify-content: space-between; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1e3a8a; color: white; }
            .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fee Challan</h1>
            <p>Challan Number: ${challan.challan_number}</p>
          </div>
          <div class="details">
            <div class="details-row"><strong>Student Name:</strong> <span>${studentName}</span></div>
            <div class="details-row"><strong>Father Name:</strong> <span>${challan.students?.father_name || 'N/A'}</span></div>
            <div class="details-row"><strong>Class:</strong> <span>${className}</span></div>
            <div class="details-row"><strong>Admission Number:</strong> <span>${challan.students?.admission_number || 'N/A'}</span></div>
            <div class="details-row"><strong>Issue Date:</strong> <span>${new Date(challan.issue_date).toLocaleDateString()}</span></div>
            <div class="details-row"><strong>Due Date:</strong> <span>${new Date(challan.due_date).toLocaleDateString()}</span></div>
            <div class="details-row"><strong>Status:</strong> <span>${challan.status.toUpperCase()}</span></div>
          </div>
          ${items && items.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Description</th>
                  <th>Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.description}</td>
                    <td>${item.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          <div class="total">Total Amount: Rs. ${challan.total_amount.toLocaleString()}</div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    } catch (error) {
      console.error('Error printing challan:', error)
      alert('Failed to print challan')
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Fee Challan</h1>
          <p className="text-gray-600">Select students and create fee challans</p>
        </div>
        <button
          onClick={handleCreateChallan}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={20} />
          Create Challan
        </button>
      </div>

      {/* Filter by Class */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Class</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.class_name}
            </option>
          ))}
        </select>
      </div>

      {/* Created Challans Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-3 py-4 text-left font-semibold whitespace-nowrap text-sm">Sr.</th>
                <th className="px-3 py-4 text-left font-semibold whitespace-nowrap text-sm">Student Name</th>
                <th className="px-3 py-4 text-left font-semibold whitespace-nowrap text-sm">Father Name</th>
                <th className="px-3 py-4 text-left font-semibold whitespace-nowrap text-sm">Class</th>
                <th className="px-3 py-4 text-left font-semibold whitespace-nowrap text-sm">Due Date</th>
                <th className="px-3 py-4 text-left font-semibold whitespace-nowrap text-sm">Total Fees</th>
                <th className="px-3 py-4 text-left font-semibold whitespace-nowrap text-sm">Status</th>
                <th className="px-3 py-4 text-left font-semibold whitespace-nowrap text-sm">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-12 text-center text-gray-500">
                    {createdChallans.length === 0 ? 'No challans created yet. Click "Create Challan" to get started.' : 'No challans found for the selected class.'}
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan, index) => (
                  <tr key={challan.id} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-sm">{startIndex + index + 1}</td>
                    <td className="px-3 py-3 text-gray-900 font-semibold whitespace-nowrap text-sm">
                      {challan.students?.first_name} {challan.students?.last_name}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-sm">
                      {challan.students?.father_name || 'N/A'}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-sm">
                      {challan.students?.classes?.class_name || 'N/A'}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-sm">
                      {new Date(challan.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-gray-900 font-semibold whitespace-nowrap text-sm">
                      Rs. {challan.total_amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${
                        challan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        challan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {challan.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => handleViewChallan(challan)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                          title="View Challan"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEditChallan(challan)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1.5 rounded-lg transition-all"
                          title="Edit Challan"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteChallan(challan.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                          title="Delete Challan"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(challan.id, challan.status)}
                          className={`p-1.5 rounded-lg transition-all ${
                            challan.status === 'paid' ? 'text-green-600 hover:text-green-800 hover:bg-green-50' :
                            challan.status === 'overdue' ? 'text-red-600 hover:text-red-800 hover:bg-red-50' :
                            'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50'
                          }`}
                          title="Toggle Status"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handlePrintChallan(challan)}
                          className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1.5 rounded-lg transition-all"
                          title="Print Challan"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredChallans.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Challan Modal */}
      {showChallanModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
            onClick={() => {
              setShowChallanModal(false)
              setEditingChallan(null)
            }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[9999] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{editingChallan ? 'Edit Fee Challan' : 'Create Fee Challan'}</h3>
                  <p className="text-blue-200 text-sm mt-1">{editingChallan ? 'Update challan information' : 'Select category to proceed'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowChallanModal(false)
                    setEditingChallan(null)
                  }}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Create Instant Fee Challan Form */}
              {(
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Target</label>
                      <select
                        value={instantChallanForm.target}
                        onChange={(e) => setInstantChallanForm({ ...instantChallanForm, target: e.target.value, classId: '', sectionId: '', studentId: '', loadedStudent: null })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Single Student">Single Student</option>
                        <option value="Class-Wise">Class-Wise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Class <span className="text-red-500">*</span></label>
                      <select
                        value={instantChallanForm.classId}
                        onChange={(e) => handleClassChange(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Show section field only if class has sections */}
                  {instantChallanForm.classId && classSections.length > 0 && (
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Section</label>
                      <select
                        value={instantChallanForm.sectionId}
                        onChange={(e) => handleSectionChange(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">All Sections</option>
                        {classSections.map(section => (
                          <option key={section.id} value={section.id}>{section.section_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Show student dropdown only for Single Student target */}
                  {instantChallanForm.target === 'Single Student' && instantChallanForm.classId && (
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Student <span className="text-red-500">*</span></label>
                      <select
                        value={instantChallanForm.studentId}
                        onChange={(e) => handleStudentChange(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Student</option>
                        {classStudents.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.admission_number} - {student.first_name} {student.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Show student details if loaded */}
                  {instantChallanForm.loadedStudent && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Selected Student</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="font-medium">Name:</span> {instantChallanForm.loadedStudent.first_name} {instantChallanForm.loadedStudent.last_name}</p>
                        <p><span className="font-medium">Father:</span> {instantChallanForm.loadedStudent.father_name}</p>
                        <p><span className="font-medium">Admission:</span> {instantChallanForm.loadedStudent.admission_number}</p>
                      </div>
                    </div>
                  )}

                  {/* Monthly Fee Field - Show when student is selected */}
                  {instantChallanForm.studentId && instantChallanForm.loadedStudent && (
                    <div className={`rounded-lg p-4 border-2 ${instantChallanForm.category === 'Monthly Fee' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">Monthly Fee</h4>
                        <label className={`flex items-center space-x-2 cursor-pointer px-3 py-2 rounded-lg transition-all ${instantChallanForm.category === 'Monthly Fee' ? 'bg-green-600 text-white' : 'bg-white border-2 border-green-600 text-green-600 hover:bg-green-50'}`}>
                          <input
                            type="checkbox"
                            checked={instantChallanForm.category === 'Monthly Fee'}
                            onChange={(e) => setInstantChallanForm({
                              ...instantChallanForm,
                              category: e.target.checked ? 'Monthly Fee' : 'Other Fee'
                            })}
                            className="w-5 h-5 text-green-600 focus:ring-2 focus:ring-green-500 rounded"
                          />
                          <span className="text-sm font-bold">
                            {instantChallanForm.category === 'Monthly Fee' ? '✓ Monthly Fee Included' : 'Click to Include Monthly Fee'}
                          </span>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Class Fee:</span>
                            <p className="text-lg font-bold text-gray-900">Rs. {instantChallanForm.classFee.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Class Discount:</span>
                            <p className="text-lg font-bold text-red-600">- Rs. {instantChallanForm.classDiscount.toLocaleString()}</p>
                          </div>
                        </div>
                        {instantChallanForm.loadedStudent.discount_amount > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded p-2">
                            <span className="text-sm font-medium text-orange-700">Additional Student Discount:</span>
                            <p className="text-md font-bold text-orange-600">- Rs. {parseFloat(instantChallanForm.loadedStudent.discount_amount || 0).toLocaleString()}</p>
                          </div>
                        )}
                        <div className="pt-2 border-t border-green-300">
                          <span className="font-medium text-gray-700">Standard Fee (Class Fee - Discounts):</span>
                          <p className="text-2xl font-bold text-green-700">Rs. {(instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent.discount_amount || 0)).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Fee Field - Show dropdown when class is selected */}
                  {instantChallanForm.classId && classFeeStructures.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Other Fee</h4>
                      <label className="block text-gray-700 font-medium mb-2">Select Fee Types</label>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const selectedFee = classFeeStructures.find(f => f.id === e.target.value)
                            if (selectedFee && !instantChallanForm.selectedOtherFees.find(f => f.id === selectedFee.id)) {
                              setInstantChallanForm({
                                ...instantChallanForm,
                                selectedOtherFees: [...instantChallanForm.selectedOtherFees, {
                                  id: selectedFee.id,
                                  name: selectedFee.fee_types?.fee_name || 'Other Fee',
                                  amount: parseFloat(selectedFee.amount),
                                  fee_type_id: selectedFee.fee_type_id
                                }]
                              })
                            }
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">+ Add Fee Type</option>
                        {classFeeStructures.map(fee => (
                          <option key={fee.id} value={fee.id}>
                            {fee.fee_types?.fee_name || 'N/A'} - Rs. {parseFloat(fee.amount).toLocaleString()}
                          </option>
                        ))}
                      </select>

                      {/* Display selected other fees */}
                      {instantChallanForm.selectedOtherFees.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Selected Fees:</p>
                          {instantChallanForm.selectedOtherFees.map((fee, index) => (
                            <div key={fee.id} className="flex items-center justify-between bg-white border border-yellow-300 rounded-lg p-3">
                              <div>
                                <p className="font-medium text-gray-800">{fee.name}</p>
                                <p className="text-sm text-yellow-700 font-bold">Rs. {fee.amount.toLocaleString()}</p>
                              </div>
                              <button
                                onClick={() => {
                                  const newFees = instantChallanForm.selectedOtherFees.filter(f => f.id !== fee.id)
                                  setInstantChallanForm({
                                    ...instantChallanForm,
                                    selectedOtherFees: newFees,
                                    category: newFees.length > 0 ? 'Other Fee' : instantChallanForm.category
                                  })
                                }}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all"
                                title="Remove"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ))}
                          <div className="bg-white border-2 border-yellow-400 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-700">Total Other Fees:</p>
                            <p className="text-2xl font-bold text-yellow-700">
                              Rs. {instantChallanForm.selectedOtherFees.reduce((sum, fee) => sum + fee.amount, 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total Summary - Show what will be included in the challan */}
                  {((instantChallanForm.target === 'Class-Wise' && instantChallanForm.classId) ||
                    (instantChallanForm.target === 'Single Student' && instantChallanForm.studentId)) &&
                   (instantChallanForm.category === 'Monthly Fee' || instantChallanForm.selectedOtherFees.length > 0) && (
                    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mt-4">
                      <h4 className="font-bold text-gray-800 mb-3 text-lg">Challan Summary</h4>
                      <div className="space-y-2">
                        {instantChallanForm.category === 'Monthly Fee' && instantChallanForm.loadedStudent && (
                          <div className="flex justify-between items-center bg-white rounded p-2 border border-green-300">
                            <span className="font-medium text-gray-700">Monthly Fee (After Discounts)</span>
                            <span className="font-bold text-green-700">Rs. {(instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent.discount_amount || 0)).toLocaleString()}</span>
                          </div>
                        )}
                        {instantChallanForm.selectedOtherFees.map((fee) => (
                          <div key={fee.id} className="flex justify-between items-center bg-white rounded p-2 border border-yellow-300">
                            <span className="font-medium text-gray-700">{fee.name}</span>
                            <span className="font-bold text-yellow-700">Rs. {fee.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center bg-blue-600 text-white rounded p-3 mt-3">
                          <span className="font-bold text-lg">Grand Total</span>
                          <span className="font-bold text-2xl">
                            Rs. {(
                              (instantChallanForm.category === 'Monthly Fee' && instantChallanForm.loadedStudent
                                ? instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent.discount_amount || 0)
                                : 0) +
                              instantChallanForm.selectedOtherFees.reduce((sum, fee) => sum + fee.amount, 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show Create button for Class-Wise OR when student is selected for Single Student */}
                  {((instantChallanForm.target === 'Class-Wise' && instantChallanForm.classId) ||
                    (instantChallanForm.target === 'Single Student' && instantChallanForm.studentId)) &&
                   (instantChallanForm.category === 'Monthly Fee' || instantChallanForm.selectedOtherFees.length > 0) && (
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={handleCreateInstantChallan}
                        disabled={submitting}
                        className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? (editingChallan ? 'Updating...' : 'Creating...') : (editingChallan ? 'Update Challan' : 'Create Challan')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowChallanModal(false)
                    setEditingChallan(null)
                  }}
                  className="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Challan Modal */}
      {viewChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
            onClick={() => setViewChallan(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white shadow-2xl z-[9999] rounded-xl border border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Challan Details</h3>
                  <p className="text-blue-200 text-sm mt-1">View challan information</p>
                </div>
                <button
                  onClick={() => setViewChallan(null)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-gray-50">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Challan Number</p>
                    <p className="text-lg font-semibold text-gray-900">{viewChallan.challan_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      viewChallan.status === 'paid' ? 'bg-green-100 text-green-800' :
                      viewChallan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {viewChallan.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Student Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-md font-medium text-gray-900">
                        {viewChallan.students?.first_name} {viewChallan.students?.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Father Name</p>
                      <p className="text-md font-medium text-gray-900">
                        {viewChallan.students?.father_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Class</p>
                      <p className="text-md font-medium text-gray-900">
                        {viewChallan.students?.classes?.class_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Admission Number</p>
                      <p className="text-md font-medium text-gray-900">
                        {viewChallan.students?.admission_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Fee Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Issue Date</p>
                      <p className="text-md font-medium text-gray-900">
                        {new Date(viewChallan.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Due Date</p>
                      <p className="text-md font-medium text-gray-900">
                        {new Date(viewChallan.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-blue-600">
                        Rs. {viewChallan.total_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-3 bg-white rounded-b-xl">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition"
                >
                  Print
                </button>
                <button
                  onClick={() => setViewChallan(null)}
                  className="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] transition-opacity animate-fade-in"
            onClick={() => setDeleteConfirmModal(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-2xl z-[10001] rounded-lg animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold text-white">Delete Fee Challan</h3>
            </div>

            {/* Content */}
            <div className="p-6 bg-white">
              <p className="text-gray-700 text-base leading-relaxed">
                Are you sure you want to delete this fee challan? This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white rounded-b-lg flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-md transition-all border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-md transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
