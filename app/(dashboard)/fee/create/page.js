'use client'

import { useState, useEffect } from 'react'
<<<<<<< HEAD
import { Plus, Search, X, Eye, Edit2, Trash2, RefreshCw, Printer, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={20} />}
      {type === 'error' && <X size={20} />}
      {type === 'warning' && <X size={20} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  )
}
=======
import { Plus, Search, X, Eye, Edit2, Trash2, RefreshCw, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9

export default function FeeCreatePage() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
<<<<<<< HEAD
  const [classSections, setClassSections] = useState([])
  const [classStudents, setClassStudents] = useState([])
  const [feeHeads, setFeeHeads] = useState([])
  const [classFeeStructures, setClassFeeStructures] = useState([])
=======
  const [classSections, setClassSections] = useState([]) // Sections for selected class
  const [classStudents, setClassStudents] = useState([]) // Students for selected class
  const [feeHeads, setFeeHeads] = useState([])
  const [classFeeStructures, setClassFeeStructures] = useState([]) // Fee policies for selected class
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
  const [schoolName, setSchoolName] = useState('SMART SCHOOL PRO')
  const rowsPerPage = 10

  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const [instantChallanForm, setInstantChallanForm] = useState({
    target: 'Single Student',
    category: 'Monthly Fee',
=======
  const rowsPerPage = 10

  // Form states for different categories
  const [instantChallanForm, setInstantChallanForm] = useState({
    target: 'Single Student',
    category: 'Monthly Fee', // Changed default to 'Monthly Fee' so it's always included
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
    classId: '',
    sectionId: '',
    studentId: '',
    loadedStudent: null,
<<<<<<< HEAD
    selectedFeeStructureId: '',
    selectedOtherFees: [],
    customAmount: '',
    classFee: 0,
    classDiscount: 0
=======
    selectedFeeStructureId: '', // For Other Fee dropdown
    selectedOtherFees: [], // Array of selected other fees {id, name, amount}
    customAmount: '', // For Monthly Fee standard fee
    classFee: 0, // Class fee amount
    classDiscount: 0 // Class-level discount
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
  useEffect(() => {
    if (showChallanModal || viewChallan || deleteConfirmModal) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showChallanModal, viewChallan, deleteConfirmModal])

  useEffect(() => {
    fetchInitialData()
    fetchSchoolName()
  }, [])

  const fetchSchoolName = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('schools')
        .select('school_name')
        .eq('id', user.school_id)
        .single()

      if (!error && data) {
        setSchoolName(data.school_name)
      }
    } catch (error) {
      console.error('Error fetching school name:', error)
    }
  }

=======
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
    fetchCreatedChallans()
  }, [])

>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

<<<<<<< HEAD
      // Fetch challans immediately in parallel with other data
      const [classesResult, sectionsResult, feeTypesResult, studentsResult, challansResult] = await Promise.all([
=======
      // Fetch all data in parallel for faster loading
      const [classesResult, sectionsResult, feeTypesResult, studentsResult] = await Promise.all([
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        supabase
          .from('classes')
          .select('id, class_name')
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .order('order_number', { ascending: true }),

        supabase
          .from('sections')
          .select('id, section_name')
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .order('section_name', { ascending: true }),

        supabase
          .from('fee_types')
          .select('id, fee_name, fee_code')
          .eq('school_id', user.school_id)
          .eq('status', 'active'),

        supabase
          .from('students')
          .select(`
            id,
            admission_number,
            first_name,
            last_name,
            father_name,
            current_class_id,
<<<<<<< HEAD
            current_section_id
          `)
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .order('admission_number', { ascending: true }),

        // Fetch challans immediately - simplified query
        supabase
          .from('fee_challans')
          .select(`
            id,
            challan_number,
            issue_date,
            due_date,
            total_amount,
            status,
            student_id,
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
=======
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
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      ])

      if (classesResult.error) throw classesResult.error
      setClasses(classesResult.data || [])

      if (sectionsResult.error) throw sectionsResult.error
      setSections(sectionsResult.data || [])

      if (feeTypesResult.error) throw feeTypesResult.error
      setFeeHeads(feeTypesResult.data || [])

      if (studentsResult.error) throw studentsResult.error
      setStudents(studentsResult.data || [])

<<<<<<< HEAD
      // Process challans data with class/section lookup from already loaded data
      if (!challansResult.error && challansResult.data) {
        const enrichedData = challansResult.data.map((challan) => {
          const classInfo = classesResult.data?.find(c => c.id === challan.students?.current_class_id)
          const sectionInfo = sectionsResult.data?.find(s => s.id === challan.students?.current_section_id)
          
          return {
            ...challan,
            students: {
              ...challan.students,
              classes: { class_name: classInfo?.class_name || 'N/A' },
              sections: { section_name: sectionInfo?.section_name || 'N/A' }
            }
          }
        })
        
        setCreatedChallans(enrichedData)
      }

=======
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
  // Load sections when class is selected
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Get current session
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .single()

<<<<<<< HEAD
=======
      // Fetch class fee and discount
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Fetch sections for this class
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Fetch students for this class
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Fetch fee structures for this class (for Other Fee dropdown)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Update form with class fee and discount
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      setInstantChallanForm(prev => ({
        ...prev,
        classFee: classFee,
        classDiscount: classDiscount
      }))
    } catch (error) {
      console.error('Error loading class data:', error)
    }
  }

<<<<<<< HEAD
=======
  // Filter students by section
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Fetch students for this class and section
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
  // Handle student selection
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
  const handleStudentChange = (studentId) => {
    const student = classStudents.find(s => s.id === studentId)
    setInstantChallanForm({
      ...instantChallanForm,
      studentId,
      loadedStudent: student || null
    })
  }

<<<<<<< HEAD
=======
  // Fetch created challans
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
          student_id,
=======
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
        // Enrich with class and section names from already loaded data
        const enrichedData = data.map((challan) => {
          const classInfo = classes.find(c => c.id === challan.students?.current_class_id)
          const sectionInfo = sections.find(s => s.id === challan.students?.current_section_id)
          
=======
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

>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
          return {
            ...challan,
            students: {
              ...challan.students,
<<<<<<< HEAD
              classes: { class_name: classInfo?.class_name || 'N/A' },
              sections: { section_name: sectionInfo?.section_name || 'N/A' }
            }
          }
        })
        
=======
              classes: { class_name: className },
              sections: { section_name: sectionName }
            }
          }
        }))

>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        setCreatedChallans(enrichedData)
      } else if (error) {
        console.error('Error fetching challans:', error)
      }
    } catch (error) {
      console.error('Error fetching challans:', error)
    }
  }

<<<<<<< HEAD
=======
  // Load challans on mount
  useEffect(() => {
    if (!loading) {
      fetchCreatedChallans()
    }
  }, [loading])

>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
  const handleCreateInstantChallan = async () => {
    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
<<<<<<< HEAD
        showToast('User not found', 'error')
=======
        alert('User not found')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        setSubmitting(false)
        return
      }

<<<<<<< HEAD
=======
      // If editing, update the existing challan
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
        showToast('Challan updated successfully!', 'success')
=======
        alert('Challan updated successfully!')
        // Refresh challans list immediately
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
      if (instantChallanForm.target === 'Single Student') {
        if (!instantChallanForm.studentId) {
          showToast('Please select a student', 'warning')
=======
      // Validation based on target
      if (instantChallanForm.target === 'Single Student') {
        if (!instantChallanForm.studentId) {
          alert('Please select a student')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
          setSubmitting(false)
          return
        }
      } else {
        if (!instantChallanForm.classId) {
<<<<<<< HEAD
          showToast('Please select a class', 'warning')
=======
          alert('Please select a class')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
          setSubmitting(false)
          return
        }
      }

<<<<<<< HEAD
      if (instantChallanForm.category !== 'Monthly Fee' && instantChallanForm.selectedOtherFees.length === 0) {
        showToast('Please select Monthly Fee or at least one Other Fee', 'warning')
=======
      // Validate that at least one fee type is selected (Monthly Fee or Other Fee)
      if (instantChallanForm.category !== 'Monthly Fee' && instantChallanForm.selectedOtherFees.length === 0) {
        alert('Please select Monthly Fee or at least one Other Fee')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        setSubmitting(false)
        return
      }

<<<<<<< HEAD
=======
      // Get current session
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .single()

      if (sessionError || !sessionData) {
<<<<<<< HEAD
        showToast('No active session found', 'error')
=======
        alert('No active session found')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        setSubmitting(false)
        return
      }

      let createdCount = 0
      const dueDate = new Date()
<<<<<<< HEAD
      dueDate.setDate(dueDate.getDate() + 30)

=======
      dueDate.setDate(dueDate.getDate() + 30) // 30 days from now

      // Determine which students to create challans for
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      let studentsToProcess = []
      if (instantChallanForm.target === 'Single Student') {
        studentsToProcess = [{ id: instantChallanForm.studentId }]
      } else {
<<<<<<< HEAD
=======
        // Class-Wise: Get all students in class (and section if selected)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
      for (const student of studentsToProcess) {
        const challanNumber = `CH-${Date.now()}-${student.admission_number || Math.random().toString(36).substring(2, 9).toUpperCase()}`

=======
      // Create challan for each student
      for (const student of studentsToProcess) {
        const challanNumber = `CH-${Date.now()}-${student.admission_number || Math.random().toString(36).substring(2, 9).toUpperCase()}`

        // Check if this is the first challan for this student
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        const { data: existingChallans } = await supabase
          .from('fee_challans')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('student_id', student.id)
          .limit(1)

        const isFirstChallan = !existingChallans || existingChallans.length === 0

<<<<<<< HEAD
=======
        // Get student's fee information
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        const { data: studentData } = await supabase
          .from('students')
          .select('base_fee, discount_amount, final_fee, current_class_id')
          .eq('id', student.id)
          .single()

<<<<<<< HEAD
        let totalAmount = 0
        let feeItems = []

=======
        // Calculate total amount and fee items
        let totalAmount = 0
        let feeItems = []

        // Add Monthly Fee if checked
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        if (instantChallanForm.category === 'Monthly Fee') {
          if (studentData && instantChallanForm.classFee) {
            const classFee = instantChallanForm.classFee
            const classDiscount = instantChallanForm.classDiscount || 0
            const studentDiscount = parseFloat(studentData.discount_amount) || 0
            const monthlyFeeAmount = classFee - classDiscount - studentDiscount

            totalAmount += monthlyFeeAmount

<<<<<<< HEAD
=======
            // Add monthly fee as a challan item
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
            feeItems.push({
              school_id: user.school_id,
              fee_type_id: null,
              description: 'Monthly Fee',
              amount: monthlyFeeAmount
            })
          }
        }

<<<<<<< HEAD
=======
        // Add Other Fees if any are selected
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
        // Insert challan
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
        // Insert all fee items (monthly/other fee + admission fee if first challan)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
      showToast(`Successfully created ${createdCount} challan(s)!`, 'success')

      setShowChallanModal(false)
      
=======
      alert(`Successfully created ${createdCount} challan(s)!`)

      // Refresh challans list immediately
      await fetchCreatedChallans()

      // Close modal and reset form
      setShowChallanModal(false)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD

      await fetchCreatedChallans()
    } catch (error) {
      console.error('Error creating instant challan:', error)
      showToast('Failed to create challan: ' + error.message, 'error')
=======
    } catch (error) {
      console.error('Error creating instant challan:', error)
      alert('Failed to create challan: ' + error.message)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
    } finally {
      setSubmitting(false)
    }
  }

<<<<<<< HEAD
  const handleEditChallan = async (challan) => {
=======
  // Handle Edit Challan
  const handleEditChallan = (challan) => {
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
    setEditingChallan(challan)
    setShowChallanModal(true)
    setSelectedCategory('instant')

<<<<<<< HEAD
=======
    // Pre-populate the form with challan data
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
    setInstantChallanForm({
      target: 'Single Student',
      category: 'Other Fee',
      classId: challan.students?.current_class_id || '',
      sectionId: challan.students?.current_section_id || '',
      studentId: challan.students?.id || '',
<<<<<<< HEAD
      loadedStudent: challan.students,
      selectedFeeStructureId: '',
      selectedOtherFees: [],
      customAmount: '',
      classFee: 0,
      classDiscount: 0
    })

    if (challan.students?.current_class_id) {
      await handleClassChange(challan.students.current_class_id)
      
      try {
        const user = getUserFromCookie()
        if (!user) return

        const { data: challanItems, error } = await supabase
          .from('fee_challan_items')
          .select(`
            *,
            fee_types:fee_type_id (
              fee_name
            )
          `)
          .eq('challan_id', challan.id)

        if (!error && challanItems) {
          const hasMonthlyFee = challanItems.some(item => 
            item.description === 'Monthly Fee' || item.fee_type_id === null
          )
          
          const otherFees = challanItems
            .filter(item => item.description !== 'Monthly Fee' && item.fee_type_id !== null)
            .map(item => ({
              id: item.id,
              name: item.fee_types?.fee_name || item.description || 'Other Fee',
              amount: parseFloat(item.amount),
              fee_type_id: item.fee_type_id
            }))

          setInstantChallanForm(prev => ({
            ...prev,
            category: hasMonthlyFee ? 'Monthly Fee' : 'Other Fee',
            selectedOtherFees: otherFees
          }))
        }
      } catch (error) {
        console.error('Error fetching challan items:', error)
      }
    }
  }

=======
      loadedStudent: challan.students
    })

    // Load class sections and students
    if (challan.students?.current_class_id) {
      handleClassChange(challan.students.current_class_id)
    }
  }

  // Handle Delete Challan
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
      setCreatedChallans(prevChallans =>
        prevChallans.filter(challan => challan.id !== deleteConfirmModal)
      )

      setDeleteConfirmModal(null)
      showToast('Challan deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting challan:', error)
      showToast('Failed to delete challan', 'error')
=======
      setDeleteConfirmModal(null)
      fetchCreatedChallans()
    } catch (error) {
      console.error('Error deleting challan:', error)
      alert('Failed to delete challan')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      setDeleteConfirmModal(null)
    }
  }

<<<<<<< HEAD
=======
  // Handle View Challan
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
  const handleViewChallan = (challan) => {
    setViewChallan(challan)
  }

<<<<<<< HEAD
  const handleStatusToggle = async (challanId, currentStatus) => {
=======
  // Handle Status Toggle
  const handleStatusToggle = async (challanId, currentStatus) => {
    // Cycle through statuses: pending -> paid -> overdue -> pending
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
    const statusCycle = {
      'pending': 'paid',
      'paid': 'overdue',
      'overdue': 'pending'
    }
    const newStatus = statusCycle[currentStatus] || 'pending'

    try {
      const { error } = await supabase
        .from('fee_challans')
<<<<<<< HEAD
        .update({ status: newStatus, updated_at: new Date().toISOString() })
=======
        .update({ status: newStatus })
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        .eq('id', challanId)

      if (error) throw error

<<<<<<< HEAD
      setCreatedChallans(prevChallans =>
        prevChallans.map(challan =>
          challan.id === challanId
            ? { ...challan, status: newStatus }
            : challan
        )
      )

      showToast(`Status updated to ${newStatus.toUpperCase()}`, 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
=======
      fetchCreatedChallans()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
    }
  }

  const handleAddArrear = async () => {
    if (!bulkEntriesForm.narration || !bulkEntriesForm.amount || !bulkEntriesForm.feeHead) {
<<<<<<< HEAD
      showToast('Please fill in all required fields', 'warning')
=======
      alert('Please fill in all required fields')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      return
    }

    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
<<<<<<< HEAD
        showToast('User not found', 'error')
        return
      }

=======
        alert('User not found')
        return
      }

      // Get current session
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .single()

      if (sessionError || !sessionData) {
<<<<<<< HEAD
        showToast('No active session found', 'error')
        return
      }

=======
        alert('No active session found')
        return
      }

      // Build query for students based on filters
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      let query = supabase
        .from('fee_challans')
        .select('id, student_id, students(current_class_id, current_section_id)')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionData.id)
        .eq('status', 'pending')

<<<<<<< HEAD
=======
      // Apply class filter
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      if (bulkEntriesForm.class) {
        query = query.eq('students.current_class_id', bulkEntriesForm.class)
      }

<<<<<<< HEAD
=======
      // Apply section filter
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      if (bulkEntriesForm.section) {
        query = query.eq('students.current_section_id', bulkEntriesForm.section)
      }

      const { data: challans, error: challansError } = await query

      if (challansError) throw challansError

      if (!challans || challans.length === 0) {
<<<<<<< HEAD
        showToast('No pending challans found for the selected criteria', 'warning')
        return
      }

=======
        alert('No pending challans found for the selected criteria')
        return
      }

      // Add arrear to each challan
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Update total amount for each challan
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
      showToast(`Arrear added successfully to ${challans.length} challan(s)!`, 'success')

=======
      alert(`Arrear added successfully to ${challans.length} challan(s)!`)

      // Reset form
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      setBulkEntriesForm({
        ...bulkEntriesForm,
        narration: '',
        amount: '',
        feeHead: ''
      })
    } catch (error) {
      console.error('Error adding arrear:', error)
<<<<<<< HEAD
      showToast('Failed to add arrear: ' + error.message, 'error')
=======
      alert('Failed to add arrear: ' + error.message)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateMonthlyChallan = async () => {
    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
<<<<<<< HEAD
        showToast('User not found', 'error')
=======
        alert('User not found')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        return
      }

      if (!monthlyChallanForm.class) {
<<<<<<< HEAD
        showToast('Please select a class', 'warning')
        return
      }

=======
        alert('Please select a class')
        return
      }

      // Get current session
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .single()

      if (sessionError || !sessionData) {
<<<<<<< HEAD
        showToast('No active session found', 'error')
        return
      }

=======
        alert('No active session found')
        return
      }

      // Get students based on class and section filters
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
        showToast('No students found for the selected class/section', 'warning')
        return
      }

=======
        alert('No students found for the selected class/section')
        return
      }

      // Get fee structure for the class
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      const { data: feeStructures, error: feeError } = await supabase
        .from('fee_structures')
        .select('fee_type_id, amount, fee_types(id, fee_name)')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionData.id)
        .eq('class_id', monthlyChallanForm.class)
        .eq('status', 'active')

      if (feeError) throw feeError

      let createdCount = 0

<<<<<<< HEAD
      for (const student of studentsData) {
        const challanNumber = `CH-${monthlyChallanForm.feeMonth.substring(0, 3).toUpperCase()}-${monthlyChallanForm.feeYear}-${student.admission_number}`

=======
      // Create challan for each student
      for (const student of studentsData) {
        // Generate challan number
        const challanNumber = `CH-${monthlyChallanForm.feeMonth.substring(0, 3).toUpperCase()}-${monthlyChallanForm.feeYear}-${student.admission_number}`

        // Check if challan already exists
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
        // Calculate total amount (use final_fee if set, otherwise sum fee structures)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        let totalAmount = student.final_fee || 0
        if (!totalAmount && feeStructures && feeStructures.length > 0) {
          totalAmount = feeStructures.reduce((sum, fs) => sum + parseFloat(fs.amount), 0)
        }

<<<<<<< HEAD
=======
        // Apply concession if checked
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        if (monthlyChallanForm.applyConcession && student.discount_amount) {
          totalAmount -= parseFloat(student.discount_amount)
        }

<<<<<<< HEAD
=======
        // Insert challan
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
        // Insert challan items from fee structure
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
      showToast(`Successfully created ${createdCount} monthly fee challan(s)!`, 'success')
=======
      alert(`Successfully created ${createdCount} monthly fee challan(s)!`)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
      showToast('Failed to create monthly challans: ' + error.message, 'error')
=======
      alert('Failed to create monthly challans: ' + error.message)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
  // Filter challans by class
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
  const filteredChallans = createdChallans.filter(challan => {
    if (!selectedClass) return true
    return challan.students?.current_class_id === selectedClass
  })

<<<<<<< HEAD
=======
  // Pagination
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex)

<<<<<<< HEAD
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 4
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 2) {
        for (let i = 1; i <= maxVisiblePages; i++) pages.push(i)
      } else if (currentPage >= totalPages - 1) {
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        for (let i = currentPage - 1; i <= currentPage + 2; i++) {
          if (i >= 1 && i <= totalPages) pages.push(i)
        }
      }
    }
    return pages
  }

=======
  // Reset to page 1 when filter changes
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedClass])

<<<<<<< HEAD
  const handlePrintChallan = async (challan) => {
    try {
=======
  // Print challan
  const handlePrintChallan = async (challan) => {
    try {
      // Fetch challan items
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      const { data: items } = await supabase
        .from('fee_challan_items')
        .select('description, amount')
        .eq('challan_id', challan.id)

<<<<<<< HEAD
      const student = challan.students
      const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
      const className = student?.classes?.class_name || 'N/A'

      const doc = new jsPDF('portrait', 'mm', 'a4')

      doc.setFillColor(30, 58, 138)
      doc.rect(0, 0, 210, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(schoolName, 105, 15, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Fee Challan', 105, 25, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      
      let yPos = 45

      doc.setFont('helvetica', 'bold')
      doc.text('Challan Number:', 15, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(challan.challan_number, 55, yPos)

      doc.setFont('helvetica', 'bold')
      doc.text('Status:', 130, yPos)
      doc.setFont('helvetica', 'normal')
      const statusColor = challan.status === 'paid' ? [34, 197, 94] : challan.status === 'overdue' ? [239, 68, 68] : [234, 179, 8]
      doc.setTextColor(...statusColor)
      doc.text(challan.status.toUpperCase(), 150, yPos)
      doc.setTextColor(0, 0, 0)

      yPos += 15

      doc.setFillColor(243, 244, 246)
      doc.rect(10, yPos - 5, 190, 35, 'F')
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Student Information', 15, yPos + 2)
      
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Name:', 15, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(studentName || 'N/A', 45, yPos)

      doc.setFont('helvetica', 'bold')
      doc.text('Father Name:', 110, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(student?.father_name || 'N/A', 145, yPos)

      yPos += 8
      doc.setFont('helvetica', 'bold')
      doc.text('Class:', 15, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(className, 45, yPos)

      doc.setFont('helvetica', 'bold')
      doc.text('Admission No:', 110, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(student?.admission_number || 'N/A', 145, yPos)

      yPos += 20

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Fee Details', 15, yPos)
      
      yPos += 5

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Issue Date:', 15, yPos + 5)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(challan.issue_date).toLocaleDateString(), 45, yPos + 5)

      doc.setFont('helvetica', 'bold')
      doc.text('Due Date:', 110, yPos + 5)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(challan.due_date).toLocaleDateString(), 140, yPos + 5)

      yPos += 15

      if (items && items.length > 0) {
        const tableData = items.map((item, index) => [
          (index + 1).toString(),
          item.description,
          `Rs. ${parseFloat(item.amount).toLocaleString()}`
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Sr.', 'Description', 'Amount']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 10,
            cellPadding: 4
          },
          columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 120 },
            2: { cellWidth: 40, halign: 'right' }
          },
          margin: { left: 15, right: 15 }
        })

        yPos = doc.lastAutoTable.finalY + 10
      }

      doc.setFillColor(30, 58, 138)
      doc.rect(100, yPos, 95, 15, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Total Amount:', 105, yPos + 10)
      doc.text(`Rs. ${parseFloat(challan.total_amount).toLocaleString()}`, 190, yPos + 10, { align: 'right' })

      doc.setTextColor(128, 128, 128)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' })

      doc.save(`Challan_${challan.challan_number}.pdf`)
      showToast('PDF downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to generate PDF', 'error')
=======
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
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
    }
  }

  return (
<<<<<<< HEAD
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Fee Challan</h1>
          <p className="text-gray-600">Select students and create fee challans</p>
        </div>
        <button
          onClick={handleCreateChallan}
          className="bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={20} />
=======
    <div className="p-2 bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="mb-1.5 flex flex-row items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-800 leading-tight">Create Fee Challan</h1>
          <p className="text-xs text-gray-600 leading-tight">Select students and create fee challans</p>
        </div>
        <button
          onClick={handleCreateChallan}
          className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-1.5 text-xs whitespace-nowrap"
        >
          <Plus size={16} />
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
          Create Challan
        </button>
      </div>

<<<<<<< HEAD
      {/* Filter Section - Matching fee/challans page */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="md:w-48">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <p className="text-gray-600">
            Total: <span className="font-bold text-blue-600">{filteredChallans.length}</span>
          </p>
          <p className="text-gray-600">
            Pending: <span className="font-bold text-yellow-600">{filteredChallans.filter(c => c.status === 'pending').length}</span>
          </p>
          <p className="text-gray-600">
            Paid: <span className="font-bold text-green-600">{filteredChallans.filter(c => c.status === 'paid').length}</span>
          </p>
          <p className="text-gray-600">
            Overdue: <span className="font-bold text-red-600">{filteredChallans.filter(c => c.status === 'overdue').length}</span>
          </p>
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Sr.</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Student Name</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Father Name</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Class</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Due Date</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Total Fees</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Status</th>
                <th className="px-4 py-4 text-center font-semibold text-sm border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading skeleton rows
                [...Array(5)].map((_, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} animate-pulse`}>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="flex gap-3 justify-center">
                        {[...Array(5)].map((_, j) => (
                          <div key={j} className="h-8 w-8 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
=======
      {/* Filter by Class */}
      <div className="mb-1.5">
        <label className="block text-xs font-medium text-gray-700 mb-0.5">Filter by Class</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full md:w-56 px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
      <div className="bg-white rounded-lg shadow overflow-hidden mb-2">
        <div className="overflow-visible">
          <table className="w-full table-fixed">
            <thead className="bg-blue-900 text-white sticky top-0 z-10">
              <tr>
                <th className="w-12 px-2 py-2 text-left font-semibold text-xs">Sr.</th>
                <th className="w-32 px-2 py-2 text-left font-semibold text-xs">Student Name</th>
                <th className="w-32 px-2 py-2 text-left font-semibold text-xs">Father Name</th>
                <th className="w-40 px-2 py-2 text-left font-semibold text-xs">Class</th>
                <th className="w-24 px-2 py-2 text-left font-semibold text-xs">Due Date</th>
                <th className="w-24 px-2 py-2 text-left font-semibold text-xs">Total Fees</th>
                <th className="w-24 px-2 py-2 text-left font-semibold text-xs">Status</th>
                <th className="w-32 px-2 py-2 text-left font-semibold text-xs">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-2 py-8 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-2 py-8 text-center text-sm text-gray-500">
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
                    {createdChallans.length === 0 ? 'No challans created yet. Click "Create Challan" to get started.' : 'No challans found for the selected class.'}
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan, index) => (
<<<<<<< HEAD
                  <tr key={challan.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                    <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">{startIndex + index + 1}</td>
                    <td className="px-4 py-4 text-blue-600 font-medium text-sm border border-gray-200">
                      {challan.students?.first_name} {challan.students?.last_name}
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">
                      {challan.students?.father_name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">
                      {challan.students?.classes?.class_name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">
                      {new Date(challan.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-gray-900 font-bold text-sm border border-gray-200">
                      Rs. {challan.total_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${
=======
                  <tr key={challan.id} className="hover:bg-gray-50 transition">
                    <td className="px-2 py-2 text-gray-700 text-xs">{startIndex + index + 1}</td>
                    <td className="px-2 py-2 text-gray-900 font-medium text-xs truncate">
                      {challan.students?.first_name} {challan.students?.last_name}
                    </td>
                    <td className="px-2 py-2 text-gray-700 text-xs truncate">
                      {challan.students?.father_name || 'N/A'}
                    </td>
                    <td className="px-2 py-2 text-gray-700 text-xs truncate">
                      {challan.students?.classes?.class_name || 'N/A'}
                    </td>
                    <td className="px-2 py-2 text-gray-700 text-xs">
                      {new Date(challan.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')}
                    </td>
                    <td className="px-2 py-2 text-gray-900 font-medium text-xs">
                      Rs. {challan.total_amount.toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium inline-block ${
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
                        challan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        challan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
<<<<<<< HEAD
                        {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 border border-gray-200">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleViewChallan(challan)}
                          className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                          title="View Challan"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditChallan(challan)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Challan"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteChallan(challan.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Challan"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(challan.id, challan.status)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Toggle Status"
                        >
                          <RefreshCw size={18} />
                        </button>
                        <button
                          onClick={() => handlePrintChallan(challan)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="Print Challan"
                        >
                          <Printer size={18} />
=======
                        {challan.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-0.5 items-center justify-start">
                        <button
                          onClick={() => handleViewChallan(challan)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-all"
                          title="View Challan"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleEditChallan(challan)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-all"
                          title="Edit Challan"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteChallan(challan.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-all"
                          title="Delete Challan"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(challan.id, challan.status)}
                          className={`p-1 rounded transition-all ${
                            challan.status === 'paid' ? 'text-green-600 hover:text-green-800 hover:bg-green-50' :
                            challan.status === 'overdue' ? 'text-red-600 hover:text-red-800 hover:bg-red-50' :
                            'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50'
                          }`}
                          title="Toggle Status"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => handlePrintChallan(challan)}
                          className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1 rounded transition-all"
                          title="Print Challan"
                        >
                          <Printer size={14} />
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

<<<<<<< HEAD
        {!loading && filteredChallans.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length} challans
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === 1
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
              >
                Previous
              </button>
              
              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof page === 'number' && goToPage(page)}
                  className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition ${
                    page === currentPage
                      ? 'bg-blue-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === totalPages
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
=======
        {/* Pagination Controls */}
        {filteredChallans.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-xs text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length} entries
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 rounded text-xs font-medium transition ${
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
                className="px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

<<<<<<< HEAD
      {showChallanModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
=======
      {/* Create Challan Modal */}
      {showChallanModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
            onClick={() => {
              setShowChallanModal(false)
              setEditingChallan(null)
            }}
          />
<<<<<<< HEAD
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            {/* Blue Header */}
            <div className="bg-[#2B5AA8] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{editingChallan ? 'Edit Fee Challan' : 'Create Fee Challan'}</h3>
                <p className="text-blue-100 text-sm mt-0.5">{editingChallan ? 'Update challan details' : 'Fill in the details below'}</p>
              </div>
              <button
                onClick={() => {
                  setShowChallanModal(false)
                  setEditingChallan(null)
                }}
                className="text-white hover:bg-white/20 p-1.5 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1 text-xs">Target</label>
                    <select
                      value={instantChallanForm.target}
                      onChange={(e) => setInstantChallanForm({ ...instantChallanForm, target: e.target.value, classId: '', sectionId: '', studentId: '', loadedStudent: null })}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Single Student">Single Student</option>
                      <option value="Class-Wise">Class-Wise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1 text-xs">Class <span className="text-red-500">*</span></label>
                    <select
                      value={instantChallanForm.classId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {instantChallanForm.classId && classSections.length > 0 && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-1 text-xs">Section</label>
                    <select
                      value={instantChallanForm.sectionId}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">All Sections</option>
                      {classSections.map(section => (
                        <option key={section.id} value={section.id}>{section.section_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {instantChallanForm.target === 'Single Student' && instantChallanForm.classId && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-1 text-xs">Student <span className="text-red-500">*</span></label>
                    <select
                      value={instantChallanForm.studentId}
                      onChange={(e) => handleStudentChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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

                {instantChallanForm.loadedStudent && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <h4 className="font-semibold text-gray-800 mb-1 text-xs">Selected Student</h4>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <p><span className="font-medium">Name:</span> {instantChallanForm.loadedStudent.first_name} {instantChallanForm.loadedStudent.last_name}</p>
                      <p><span className="font-medium">Father:</span> {instantChallanForm.loadedStudent.father_name}</p>
                      <p><span className="font-medium">Admission:</span> {instantChallanForm.loadedStudent.admission_number}</p>
                    </div>
                  </div>
                )}

                {instantChallanForm.studentId && instantChallanForm.loadedStudent && (
                  <div className={`rounded p-2 border ${instantChallanForm.category === 'Monthly Fee' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 text-xs">Monthly Fee</h4>
                      <label className={`flex items-center space-x-1 cursor-pointer px-2 py-1 rounded transition-all text-xs ${instantChallanForm.category === 'Monthly Fee' ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'}`}>
                        <input
                          type="checkbox"
                          checked={instantChallanForm.category === 'Monthly Fee'}
                          onChange={(e) => setInstantChallanForm({
                            ...instantChallanForm,
                            category: e.target.checked ? 'Monthly Fee' : 'Other Fee'
                          })}
                          className="w-3 h-3 text-green-600 focus:ring-1 focus:ring-green-500 rounded"
                        />
                        <span className="text-xs font-bold">
                          {instantChallanForm.category === 'Monthly Fee' ? '✓ Included' : 'Include'}
                        </span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium text-gray-700">Class Fee:</span>
                          <p className="text-sm font-bold text-gray-900">Rs. {instantChallanForm.classFee.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Class Discount:</span>
                          <p className="text-sm font-bold text-red-600">- Rs. {instantChallanForm.classDiscount.toLocaleString()}</p>
                        </div>
                      </div>
                      {instantChallanForm.loadedStudent.discount_amount > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded p-1">
                          <span className="text-xs font-medium text-orange-700">Student Discount:</span>
                          <p className="text-xs font-bold text-orange-600">- Rs. {parseFloat(instantChallanForm.loadedStudent.discount_amount || 0).toLocaleString()}</p>
                        </div>
                      )}
                      <div className="pt-1 border-t border-green-300">
                        <span className="font-medium text-gray-700 text-xs">Standard Fee:</span>
                        <p className="text-base font-bold text-green-700">Rs. {(instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent.discount_amount || 0)).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {instantChallanForm.classId && classFeeStructures.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <h4 className="font-semibold text-gray-800 mb-2 text-xs">Other Fee</h4>
                    <label className="block text-gray-700 font-medium mb-1 text-xs">Select Fee Types</label>
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
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">+ Add Fee Type</option>
                      {classFeeStructures.map(fee => (
                        <option key={fee.id} value={fee.id}>
                          {fee.fee_types?.fee_name || 'N/A'} - Rs. {parseFloat(fee.amount).toLocaleString()}
                        </option>
                      ))}
                    </select>

                    {instantChallanForm.selectedOtherFees.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-gray-700">Selected Fees:</p>
                        {instantChallanForm.selectedOtherFees.map((fee, index) => (
                          <div key={fee.id} className="flex items-center justify-between bg-white border border-yellow-300 rounded p-2">
                            <div>
                              <p className="font-medium text-gray-800 text-xs">{fee.name}</p>
                              <p className="text-xs text-yellow-700 font-bold">Rs. {fee.amount.toLocaleString()}</p>
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
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-all"
                              title="Remove"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="bg-white border border-yellow-400 rounded p-2">
                          <p className="text-xs font-medium text-gray-700">Total Other Fees:</p>
                          <p className="text-base font-bold text-yellow-700">
                            Rs. {instantChallanForm.selectedOtherFees.reduce((sum, fee) => sum + fee.amount, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {((instantChallanForm.target === 'Class-Wise' && instantChallanForm.classId) ||
                  (instantChallanForm.target === 'Single Student' && instantChallanForm.studentId)) &&
                 (instantChallanForm.category === 'Monthly Fee' || instantChallanForm.selectedOtherFees.length > 0) && (
                  <div className="bg-blue-50 border border-blue-400 rounded p-2 mt-2">
                    <h4 className="font-bold text-gray-800 mb-2 text-sm">Challan Summary</h4>
                    <div className="space-y-1">
                      {instantChallanForm.category === 'Monthly Fee' && instantChallanForm.loadedStudent && (
                        <div className="flex justify-between items-center bg-white rounded p-1.5 border border-green-300">
                          <span className="font-medium text-gray-700 text-xs">Monthly Fee (After Discounts)</span>
                          <span className="font-bold text-green-700 text-xs">Rs. {(instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent.discount_amount || 0)).toLocaleString()}</span>
                        </div>
                      )}
                      {instantChallanForm.selectedOtherFees.map((fee) => (
                        <div key={fee.id} className="flex justify-between items-center bg-white rounded p-1.5 border border-yellow-300">
                          <span className="font-medium text-gray-700 text-xs">{fee.name}</span>
                          <span className="font-bold text-yellow-700 text-xs">Rs. {fee.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center bg-blue-600 text-white rounded p-2 mt-2">
                        <span className="font-bold text-sm">Grand Total</span>
                        <span className="font-bold text-base">
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

=======
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[9999] flex flex-col border-l border-gray-200">
            <div className="bg-blue-900 text-white px-3 py-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold leading-tight">{editingChallan ? 'Edit Fee Challan' : 'Create Fee Challan'}</h3>
                  <p className="text-blue-200 text-xs leading-tight">{editingChallan ? 'Update challan information' : 'Select category to proceed'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowChallanModal(false)
                    setEditingChallan(null)
                  }}
                  className="text-white hover:bg-white/10 p-1 rounded-full transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
              {/* Create Instant Fee Challan Form */}
              {(
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-xs">Target</label>
                      <select
                        value={instantChallanForm.target}
                        onChange={(e) => setInstantChallanForm({ ...instantChallanForm, target: e.target.value, classId: '', sectionId: '', studentId: '', loadedStudent: null })}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Single Student">Single Student</option>
                        <option value="Class-Wise">Class-Wise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-1 text-xs">Class <span className="text-red-500">*</span></label>
                      <select
                        value={instantChallanForm.classId}
                        onChange={(e) => handleClassChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                      <label className="block text-gray-700 font-medium mb-1 text-xs">Section</label>
                      <select
                        value={instantChallanForm.sectionId}
                        onChange={(e) => handleSectionChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                      <label className="block text-gray-700 font-medium mb-1 text-xs">Student <span className="text-red-500">*</span></label>
                      <select
                        value={instantChallanForm.studentId}
                        onChange={(e) => handleStudentChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <h4 className="font-semibold text-gray-800 mb-1 text-xs">Selected Student</h4>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <p><span className="font-medium">Name:</span> {instantChallanForm.loadedStudent.first_name} {instantChallanForm.loadedStudent.last_name}</p>
                        <p><span className="font-medium">Father:</span> {instantChallanForm.loadedStudent.father_name}</p>
                        <p><span className="font-medium">Admission:</span> {instantChallanForm.loadedStudent.admission_number}</p>
                      </div>
                    </div>
                  )}

                  {/* Monthly Fee Field - Show when student is selected */}
                  {instantChallanForm.studentId && instantChallanForm.loadedStudent && (
                    <div className={`rounded p-2 border ${instantChallanForm.category === 'Monthly Fee' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800 text-xs">Monthly Fee</h4>
                        <label className={`flex items-center space-x-1 cursor-pointer px-2 py-1 rounded transition-all text-xs ${instantChallanForm.category === 'Monthly Fee' ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'}`}>
                          <input
                            type="checkbox"
                            checked={instantChallanForm.category === 'Monthly Fee'}
                            onChange={(e) => setInstantChallanForm({
                              ...instantChallanForm,
                              category: e.target.checked ? 'Monthly Fee' : 'Other Fee'
                            })}
                            className="w-3 h-3 text-green-600 focus:ring-1 focus:ring-green-500 rounded"
                          />
                          <span className="text-xs font-bold">
                            {instantChallanForm.category === 'Monthly Fee' ? '✓ Included' : 'Include'}
                          </span>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium text-gray-700">Class Fee:</span>
                            <p className="text-sm font-bold text-gray-900">Rs. {instantChallanForm.classFee.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Class Discount:</span>
                            <p className="text-sm font-bold text-red-600">- Rs. {instantChallanForm.classDiscount.toLocaleString()}</p>
                          </div>
                        </div>
                        {instantChallanForm.loadedStudent.discount_amount > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded p-1">
                            <span className="text-xs font-medium text-orange-700">Student Discount:</span>
                            <p className="text-xs font-bold text-orange-600">- Rs. {parseFloat(instantChallanForm.loadedStudent.discount_amount || 0).toLocaleString()}</p>
                          </div>
                        )}
                        <div className="pt-1 border-t border-green-300">
                          <span className="font-medium text-gray-700 text-xs">Standard Fee:</span>
                          <p className="text-base font-bold text-green-700">Rs. {(instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent.discount_amount || 0)).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Fee Field - Show dropdown when class is selected */}
                  {instantChallanForm.classId && classFeeStructures.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <h4 className="font-semibold text-gray-800 mb-2 text-xs">Other Fee</h4>
                      <label className="block text-gray-700 font-medium mb-1 text-xs">Select Fee Types</label>
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
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-gray-700">Selected Fees:</p>
                          {instantChallanForm.selectedOtherFees.map((fee, index) => (
                            <div key={fee.id} className="flex items-center justify-between bg-white border border-yellow-300 rounded p-2">
                              <div>
                                <p className="font-medium text-gray-800 text-xs">{fee.name}</p>
                                <p className="text-xs text-yellow-700 font-bold">Rs. {fee.amount.toLocaleString()}</p>
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
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-all"
                                title="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <div className="bg-white border border-yellow-400 rounded p-2">
                            <p className="text-xs font-medium text-gray-700">Total Other Fees:</p>
                            <p className="text-base font-bold text-yellow-700">
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
                    <div className="bg-blue-50 border border-blue-400 rounded p-2 mt-2">
                      <h4 className="font-bold text-gray-800 mb-2 text-sm">Challan Summary</h4>
                      <div className="space-y-1">
                        {instantChallanForm.category === 'Monthly Fee' && instantChallanForm.loadedStudent && (
                          <div className="flex justify-between items-center bg-white rounded p-1.5 border border-green-300">
                            <span className="font-medium text-gray-700 text-xs">Monthly Fee (After Discounts)</span>
                            <span className="font-bold text-green-700 text-xs">Rs. {(instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent.discount_amount || 0)).toLocaleString()}</span>
                          </div>
                        )}
                        {instantChallanForm.selectedOtherFees.map((fee) => (
                          <div key={fee.id} className="flex justify-between items-center bg-white rounded p-1.5 border border-yellow-300">
                            <span className="font-medium text-gray-700 text-xs">{fee.name}</span>
                            <span className="font-bold text-yellow-700 text-xs">Rs. {fee.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center bg-blue-600 text-white rounded p-2 mt-2">
                          <span className="font-bold text-sm">Grand Total</span>
                          <span className="font-bold text-base">
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
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
                  {((instantChallanForm.target === 'Class-Wise' && instantChallanForm.classId) ||
                    (instantChallanForm.target === 'Single Student' && instantChallanForm.studentId)) &&
                   (instantChallanForm.category === 'Monthly Fee' || instantChallanForm.selectedOtherFees.length > 0) && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleCreateInstantChallan}
                        disabled={submitting}
<<<<<<< HEAD
                        className="bg-[#DC2626] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#B91C1C] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={18} />
                        {submitting ? (editingChallan ? 'Updating...' : 'Creating...') : (editingChallan ? 'Update Challan' : 'Save Challan')}
                      </button>
                    </div>
                  )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex gap-3 justify-end">
=======
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      >
                        {submitting ? (editingChallan ? 'Updating...' : 'Creating...') : (editingChallan ? 'Update Challan' : 'Create Challan')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-3 py-2 bg-white">
              <div className="flex gap-2 justify-end">
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
                <button
                  onClick={() => {
                    setShowChallanModal(false)
                    setEditingChallan(null)
                  }}
<<<<<<< HEAD
                  className="px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
                >
                  Cancel
=======
                  className="px-4 py-1.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-xs"
                >
                  Close
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
                </button>
              </div>
            </div>
          </div>
        </>
      )}

<<<<<<< HEAD
      {viewChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setViewChallan(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white shadow-2xl z-[10000] rounded-xl overflow-hidden">
            {/* Header - Blue Style with Print Icon */}
            <div className="bg-[#2B5AA8] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Student Information</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintChallan(viewChallan)}
                  className="text-white hover:bg-white/20 p-2 rounded transition"
                  title="Print"
                >
                  <Printer size={20} />
                </button>
                <button
                  onClick={() => setViewChallan(null)}
                  className="text-white hover:bg-white/20 p-1.5 rounded transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content - Clean Section Layout */}
            <div className="p-6 bg-white max-h-[70vh] overflow-y-auto">
              {/* Academic Information */}
              <div className="mb-6">
                <h4 className="text-base font-bold text-gray-900 mb-4">Academic Information</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Class</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewChallan.students?.classes?.class_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Section</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewChallan.students?.sections?.section_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Admission Date</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(viewChallan.issue_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Father Information */}
              <div className="mb-6 pt-6 border-t border-gray-200">
                <h4 className="text-base font-bold text-gray-900 mb-4">Father Information</h4>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Father Name</p>
                  <p className="text-base font-medium text-gray-900">
                    {viewChallan.students?.father_name || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Fee Information */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-base font-bold text-gray-900 mb-4">Fee Information</h4>
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewChallan.students?.base_fee || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Discount</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewChallan.students?.discount_amount || '0'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Final Fee</p>
                  <p className="text-base font-medium text-gray-900">
                    {viewChallan.students?.final_fee || viewChallan.total_amount || '0'}
                  </p>
                </div>
              </div>
            </div>

=======
      {/* View Challan Modal */}
      {viewChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
            onClick={() => setViewChallan(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white shadow-2xl z-[9999] rounded-lg border border-gray-200">
            <div className="bg-blue-900 text-white px-3 py-2 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold leading-tight">Challan Details</h3>
                  <p className="text-blue-200 text-xs leading-tight">View challan information</p>
                </div>
                <button
                  onClick={() => setViewChallan(null)}
                  className="text-white hover:bg-white/10 p-1 rounded-full transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50">
              <div className="bg-white rounded p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Challan Number</p>
                    <p className="text-sm font-semibold text-gray-900">{viewChallan.challan_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Status</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      viewChallan.status === 'paid' ? 'bg-green-100 text-green-800' :
                      viewChallan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {viewChallan.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-2 mt-2">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2">Student Information</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-600">Name</p>
                      <p className="text-xs font-medium text-gray-900">
                        {viewChallan.students?.first_name} {viewChallan.students?.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Father Name</p>
                      <p className="text-xs font-medium text-gray-900">
                        {viewChallan.students?.father_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Class</p>
                      <p className="text-xs font-medium text-gray-900">
                        {viewChallan.students?.classes?.class_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Admission Number</p>
                      <p className="text-xs font-medium text-gray-900">
                        {viewChallan.students?.admission_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-2 mt-2">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2">Fee Details</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-600">Issue Date</p>
                      <p className="text-xs font-medium text-gray-900">
                        {new Date(viewChallan.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Due Date</p>
                      <p className="text-xs font-medium text-gray-900">
                        {new Date(viewChallan.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-600">Total Amount</p>
                      <p className="text-lg font-bold text-blue-600">
                        Rs. {viewChallan.total_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-3 py-2 bg-white rounded-b-lg">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition text-xs"
                >
                  Print
                </button>
                <button
                  onClick={() => setViewChallan(null)}
                  className="px-4 py-1.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
          </div>
        </>
      )}

<<<<<<< HEAD
      {deleteConfirmModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setDeleteConfirmModal(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-2xl z-[10000] rounded-lg overflow-hidden">
            {/* Red Header */}
            <div className="bg-[#DC2626] px-6 py-3.5">
              <h3 className="text-xl font-bold text-white">Confirm Delete</h3>
            </div>

            {/* Content */}
            <div className="p-6 bg-white">
              <p className="text-gray-700 text-sm leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-[#DC2626]">this challan</span>? This action cannot be undone.
=======
      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] transition-opacity animate-fade-in"
            onClick={() => setDeleteConfirmModal(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-2xl z-[10001] rounded-lg animate-fade-in">
            {/* Header */}
            <div className="bg-red-600 px-3 py-2 rounded-t-lg">
              <h3 className="text-base font-bold text-white leading-tight">Delete Fee Challan</h3>
            </div>

            {/* Content */}
            <div className="p-3 bg-white">
              <p className="text-gray-700 text-xs leading-relaxed">
                Are you sure you want to delete this fee challan? This action cannot be undone.
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
              </p>
            </div>

            {/* Footer */}
<<<<<<< HEAD
            <div className="px-6 py-4 bg-white flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
=======
            <div className="border-t border-gray-200 px-3 py-2 bg-white rounded-b-lg flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-1.5 text-gray-700 font-medium hover:bg-gray-100 rounded transition-all border border-gray-300 text-xs"
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
<<<<<<< HEAD
                className="px-8 py-2.5 bg-[#DC2626] text-white font-medium hover:bg-[#B91C1C] rounded-lg transition flex items-center gap-2"
              >
                <Trash2 size={18} />
                Delete
=======
                className="px-4 py-1.5 bg-red-600 text-white font-medium hover:bg-red-700 rounded transition-all text-xs"
              >
                Confirm
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
<<<<<<< HEAD
}
=======
}
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
