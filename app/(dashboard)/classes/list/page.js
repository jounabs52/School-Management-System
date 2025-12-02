'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, X, Eye, Trash2, Users, FileText, TrendingUp, RefreshCw, ArrowLeft, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import toast from 'react-hot-toast'

export default function ClassListPage() {
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFeeIncrementModal, setShowFeeIncrementModal] = useState(false)
  const [showStudentEditModal, setShowStudentEditModal] = useState(false)
  const [showStudentDeleteModal, setShowStudentDeleteModal] = useState(false)
  const [showFeePolicyEditModal, setShowFeePolicyEditModal] = useState(false)
  const [showFeePolicyDeleteModal, setShowFeePolicyDeleteModal] = useState(false)
  const [showFeePolicyDrawer, setShowFeePolicyDrawer] = useState(false)

  // Lock/unlock body scroll when modals open/close
  useEffect(() => {
    const isAnyModalOpen = showModal || showEditModal || showDeleteModal ||
                          showFeeIncrementModal || showStudentEditModal || showStudentDeleteModal ||
                          showFeePolicyEditModal || showFeePolicyDeleteModal || showFeePolicyDrawer

    if (isAnyModalOpen) {
      // Get current scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

      // Prevent body scroll and add padding to prevent layout shift
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      // Restore body scroll and remove padding
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showModal, showEditModal, showDeleteModal, showFeeIncrementModal, showStudentEditModal, showStudentDeleteModal, showFeePolicyEditModal, showFeePolicyDeleteModal, showFeePolicyDrawer])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [viewMode, setViewMode] = useState(false)
  const [activeTab, setActiveTab] = useState('students')
  const [selectedClass, setSelectedClass] = useState(null)
  const [classToDelete, setClassToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [sections, setSections] = useState([])
  const [classSections, setClassSections] = useState([])
  const [selectedSection, setSelectedSection] = useState('')
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentFormData, setStudentFormData] = useState({
    name: '',
    father: '',
    section: '',
    rollNo: '',
    fee: '',
    discount: ''
  })
  const [feeIncrementData, setFeeIncrementData] = useState({
    mode: '',
    type: '',
    amount: ''
  })
  const [formData, setFormData] = useState({
    incharge: '',
    className: '',
    classFee: '',
    markingSystem: ''
  })
  const [feePolicyFormData, setFeePolicyFormData] = useState({
    classId: '',
    feeHead: '',
    title: '',
    amount: ''
  })
  const [feePolicies, setFeePolicies] = useState([])
  const [loadingFeePolicies, setLoadingFeePolicies] = useState(false)
  const [selectedFeePolicy, setSelectedFeePolicy] = useState(null)

  // Fetch sections for a class
  const fetchClassSections = async (classId) => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        return
      }

      const { data, error } = await supabase
        .from('sections')
        .select('id, section_name')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (error) {
        console.error('Error fetching sections:', error)
        setClassSections([])
      } else {
        setClassSections(data || [])
      }
    } catch (error) {
      console.error('Error fetching sections:', error)
      setClassSections([])
    }
  }

  // Fetch students for selected class
  const fetchStudents = async (classId) => {
    try {
      setLoadingStudents(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoadingStudents(false)
        return
      }

      // First, fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('current_class_id', classId)
        .eq('status', 'active')
        .order('roll_number', { ascending: true })

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        setStudents([])
        setSections([])
        setLoadingStudents(false)
        return
      }

      console.log('✅ Fetched', studentsData?.length || 0, 'students for class:', classId)

      // Then fetch sections separately and join manually
      const sectionIds = [...new Set(studentsData.map(s => s.current_section_id).filter(Boolean))]

      let sectionsData = []
      if (sectionIds.length > 0) {
        const { data: sectionsResult, error: sectionsError } = await supabase
          .from('sections')
          .select('id, section_name')
          .in('id', sectionIds)

        if (!sectionsError) {
          sectionsData = sectionsResult || []
        }
      }

      // Create a map of section id to section name
      const sectionMap = {}
      sectionsData.forEach(section => {
        sectionMap[section.id] = section.section_name
      })

      // Add section info to students
      const studentsWithSections = studentsData.map(student => ({
        ...student,
        sections: student.current_section_id ? {
          section_name: sectionMap[student.current_section_id] || null
        } : null
      }))

      setStudents(studentsWithSections)

      // Extract unique section names for filter
      const uniqueSections = [...new Set(Object.values(sectionMap))]
      setSections(uniqueSections)

    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
      setSections([])
    } finally {
      setLoadingStudents(false)
    }
  }

  // Fetch fee policies for a class
  const fetchFeePolicies = async (classId) => {
    try {
      setLoadingFeePolicies(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoadingFeePolicies(false)
        return
      }

      // Get current session
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('is_current', true)
        .single()

      if (!sessionData) {
        setFeePolicies([])
        setLoadingFeePolicies(false)
        return
      }

      // Fetch fee structures for this class first
      const { data: feeStructures, error: structuresError } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionData.id)
        .eq('class_id', classId)
        .eq('status', 'active')

      if (structuresError) {
        console.error('Error fetching fee structures:', structuresError)
        setFeePolicies([])
        setLoadingFeePolicies(false)
        return
      }

      // If no structures found, return empty
      if (!feeStructures || feeStructures.length === 0) {
        setFeePolicies([])
        setLoadingFeePolicies(false)
        return
      }

      // Get the fee type IDs from structures
      const feeTypeIds = feeStructures.map(s => s.fee_type_id)

      // Fetch only the fee types that have structures for this class
      const { data: feeTypes, error: feeTypesError } = await supabase
        .from('fee_types')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .in('id', feeTypeIds)
        .order('created_at', { ascending: false })

      if (feeTypesError) {
        console.error('Error fetching fee types:', feeTypesError)
        setFeePolicies([])
        setLoadingFeePolicies(false)
        return
      }

      // Merge fee types with their amounts
      const feePoliciesWithAmounts = (feeTypes || []).map(feeType => {
        const structure = feeStructures.find(s => s.fee_type_id === feeType.id)
        return {
          ...feeType,
          amount: structure?.amount || 0,
          structure_id: structure?.id
        }
      })

      setFeePolicies(feePoliciesWithAmounts)
    } catch (error) {
      console.error('Error fetching fee policies:', error)
      setFeePolicies([])
    } finally {
      setLoadingFeePolicies(false)
    }
  }

  // Save fee policy
  const handleSaveFeePolicy = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        toast.error('Unauthorized', { duration: 3000 })
        return
      }

      console.log('Form Data:', feePolicyFormData)
      console.log('Selected Class:', selectedClass)

      if (!feePolicyFormData.feeHead || !feePolicyFormData.title || !feePolicyFormData.amount) {
        toast.error('Please fill all required fields', { duration: 3000 })
        return
      }

      // First, create or get the fee type
      // Create a unique fee_code by combining fee_name and timestamp
      const uniqueFeeCode = `${feePolicyFormData.feeHead.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`

      const { data: feeTypeData, error: feeTypeError } = await supabase
        .from('fee_types')
        .insert([{
          school_id: user.school_id,
          created_by: user.id,
          fee_name: feePolicyFormData.feeHead,
          fee_code: uniqueFeeCode,
          description: feePolicyFormData.title,
          status: 'active'
        }])
        .select()
        .single()

      if (feeTypeError) {
        console.error('Error creating fee policy:', feeTypeError)
        toast.error('Failed to create fee policy: ' + feeTypeError.message, { duration: 3000 })
        return
      }

      console.log('Fee Type Created:', feeTypeData)

      // Then create fee structure with amount for the selected class
      const classIdToUse = feePolicyFormData.classId || selectedClass?.id
      console.log('Class ID to use:', classIdToUse)

      if (classIdToUse) {
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('is_current', true)
          .single()

        console.log('Session Data:', sessionData)
        console.log('Session Error:', sessionError)

        if (sessionData) {
          const { data: structureData, error: structureError } = await supabase
            .from('fee_structures')
            .insert([{
              school_id: user.school_id,
              session_id: sessionData.id,
              class_id: classIdToUse,
              fee_type_id: feeTypeData.id,
              amount: parseFloat(feePolicyFormData.amount) || 0,
              status: 'active',
              created_by: user.id
            }])
            .select()

          console.log('Structure Data:', structureData)
          console.log('Structure Error:', structureError)

          if (structureError) {
            console.error('Error creating fee structure:', structureError)
            toast.error('Fee type created but failed to add amount: ' + structureError.message, { duration: 3000 })
          }
        } else {
          toast.error('No active session found. Please create a session first.', { duration: 3000 })
        }
      }

      setFeePolicyFormData({ classId: '', feeHead: '', title: '', amount: '' })
      setShowFeePolicyDrawer(false)
      fetchFeePolicies(selectedClass.id)
      toast.success('Fee policy created successfully', { duration: 3000 })
    } catch (error) {
      console.error('Error saving fee policy:', error)
      toast.error('Error saving fee policy', { duration: 3000 })
    }
  }

  // Edit fee policy
  const handleEditFeePolicy = (policy) => {
    setSelectedFeePolicy(policy)
    setFeePolicyFormData({
      classId: selectedClass?.id || '',
      feeHead: policy.fee_name,
      title: policy.description,
      amount: policy.amount || ''
    })
    setShowFeePolicyDrawer(true)
  }

  // Update fee policy
  const handleUpdateFeePolicy = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        toast.error('Unauthorized', { duration: 3000 })
        return
      }

      // Update fee type
      const { error: feeTypeError } = await supabase
        .from('fee_types')
        .update({
          fee_name: feePolicyFormData.feeHead,
          fee_code: feePolicyFormData.title.toLowerCase().replace(/\s+/g, '_'),
          description: feePolicyFormData.title,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFeePolicy.id)
        .eq('school_id', user.school_id)

      if (feeTypeError) {
        console.error('Error updating fee policy:', feeTypeError)
        toast.error('Failed to update fee policy', { duration: 3000 })
        return
      }

      // Update or insert fee structure amount if provided
      if (feePolicyFormData.amount && feePolicyFormData.classId) {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('is_current', true)
          .single()

        if (sessionData) {
          // Check if structure exists
          if (selectedFeePolicy.structure_id) {
            // Update existing structure
            await supabase
              .from('fee_structures')
              .update({
                amount: parseFloat(feePolicyFormData.amount) || 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', selectedFeePolicy.structure_id)
          } else {
            // Create new structure
            await supabase
              .from('fee_structures')
              .insert([{
                school_id: user.school_id,
                session_id: sessionData.id,
                class_id: feePolicyFormData.classId,
                fee_type_id: selectedFeePolicy.id,
                amount: parseFloat(feePolicyFormData.amount) || 0,
                status: 'active',
                created_by: user.id
              }])
          }
        }
      }

      setShowFeePolicyDrawer(false)
      setSelectedFeePolicy(null)
      setFeePolicyFormData({ classId: '', feeHead: '', title: '', amount: '' })
      fetchFeePolicies(selectedClass.id)
      toast.success('Fee policy updated successfully', { duration: 3000 })
    } catch (error) {
      console.error('Error updating fee policy:', error)
      toast.error('An error occurred while updating', { duration: 3000 })
    }
  }

  // Delete fee policy
  const handleDeleteFeePolicy = (policy) => {
    setSelectedFeePolicy(policy)
    setShowFeePolicyDeleteModal(true)
  }

  // Confirm delete fee policy
  const confirmDeleteFeePolicy = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        toast.error('Unauthorized', { duration: 3000 })
        return
      }

      const { error } = await supabase
        .from('fee_types')
        .update({ status: 'inactive' })
        .eq('id', selectedFeePolicy.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting fee policy:', error)
        toast.error('Failed to delete fee policy', { duration: 3000 })
        return
      }

      setShowFeePolicyDeleteModal(false)
      setSelectedFeePolicy(null)
      fetchFeePolicies(selectedClass.id)
      toast.success('Fee policy deleted successfully', { duration: 3000 })
    } catch (error) {
      console.error('Error deleting fee policy:', error)
      toast.error('An error occurred while deleting', { duration: 3000 })
    }
  }

  // Fetch staff and classes data
  useEffect(() => {
    fetchStaff()
    fetchClasses()
  }, [])

  const fetchStaff = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        return
      }

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .eq('department', 'TEACHING')
        .order('first_name', { ascending: true })

      if (error) {
        console.error('Error fetching staff:', error)
      } else {
        setStaffList(data || [])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      // Get classes with student count and total discount
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, class_name, standard_fee, incharge, exam_marking_system')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) {
        console.error('Error fetching classes:', error)
        setClasses([])
      } else {
        // For each class, get student count and total discount
        const classesWithStats = await Promise.all(
          (classes || []).map(async (cls) => {
            // Get total students
            const { count: totalStudents } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', user.school_id)
              .eq('current_class_id', cls.id)
              .eq('status', 'active')

            // Get total discount
            const { data: discountData } = await supabase
              .from('students')
              .select('discount_amount')
              .eq('school_id', user.school_id)
              .eq('current_class_id', cls.id)
              .eq('status', 'active')

            const totalDiscount = (discountData || []).reduce(
              (sum, student) => sum + (parseFloat(student.discount_amount) || 0),
              0
            )

            return {
              ...cls,
              total_students: totalStudents || 0,
              total_discount: totalDiscount
            }
          })
        )

        setClasses(classesWithStats)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClassFilter = !classFilter || cls.class_name === classFilter
    return matchesSearch && matchesClassFilter
  })

  const handleSave = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .insert([{
          school_id: user.school_id,
          created_by: user.id,
          class_name: formData.className,
          standard_fee: parseFloat(formData.classFee) || 0,
          incharge: formData.incharge,
          exam_marking_system: formData.markingSystem,
          status: 'active'
        }])
        .select()

      if (error) {
        console.error('Error creating class:', error)
        alert('Failed to create class: ' + error.message)
      } else {
        setShowModal(false)
        setFormData({ incharge: '', className: '', classFee: '', markingSystem: '' })
        fetchClasses() // Refresh the list
      }
    } catch (error) {
      console.error('Error saving class:', error)
      alert('Error saving class')
    }
  }

  const handleEdit = (cls) => {
    setSelectedClass(cls)
    setFormData({
      incharge: cls.incharge || '',
      className: cls.class_name,
      classFee: cls.standard_fee || '',
      markingSystem: cls.exam_marking_system || ''
    })
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .update({
          class_name: formData.className,
          standard_fee: parseFloat(formData.classFee) || 0,
          incharge: formData.incharge,
          exam_marking_system: formData.markingSystem,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedClass.id)
        .eq('school_id', user.school_id)
        .select()

      if (error) {
        console.error('Error updating class:', error)
        alert('Failed to update class: ' + error.message)
      } else {
        setShowEditModal(false)
        setFormData({ incharge: '', className: '', classFee: '', markingSystem: '' })
        setSelectedClass(null)
        fetchClasses() // Refresh the list
      }
    } catch (error) {
      console.error('Error updating class:', error)
      alert('Error updating class')
    }
  }

  const handleView = (cls) => {
    setSelectedClass(cls)
    setActiveTab('students')
    setViewMode(true)
    setSelectedSection('')
    setStudentSearchTerm('')
    fetchClassSections(cls.id)
    fetchStudents(cls.id)
    fetchFeePolicies(cls.id)
  }

  const handleDelete = (cls) => {
    setClassToDelete(cls)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      const { error } = await supabase
        .from('classes')
        .update({ status: 'inactive' })
        .eq('id', classToDelete.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting class:', error)
        alert('Failed to delete class: ' + error.message)
      } else {
        setShowDeleteModal(false)
        setClassToDelete(null)
        fetchClasses() // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Error deleting class')
    }
  }

  const handleFeeIncrement = () => {
    setShowFeeIncrementModal(true)
  }

  const applyFeeIncrement = () => {
    console.log('Fee Increment Data:', feeIncrementData)
    setShowFeeIncrementModal(false)
    setFeeIncrementData({ mode: '', type: '', amount: '' })
  }

  const handleGoBack = () => {
    setViewMode(false)
    setSelectedClass(null)
    setStudents([])
    setSections([])
    setClassSections([])
    setSelectedSection('')
    setStudentSearchTerm('')
  }

  // Filter students based on section and search term
  const filteredStudents = students.filter(student => {
    const studentSectionName = student.sections?.section_name
    const matchesSection = !selectedSection || studentSectionName === selectedSection
    const matchesSearch =
      student.first_name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.father_name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.roll_number?.toString().includes(studentSearchTerm)
    return matchesSection && matchesSearch
  })

  const handleStudentEdit = (student) => {
    setSelectedStudent(student)
    setStudentFormData({
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      father: student.father_name || '',
      section: student.current_section_id || '',
      rollNo: student.roll_number || '',
      fee: student.base_fee || student.fee_amount || '',
      discount: student.discount_amount || ''
    })
    setShowStudentEditModal(true)
  }

  const handleStudentUpdate = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      // Split name into first and last
      const nameParts = studentFormData.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const { error } = await supabase
        .from('students')
        .update({
          first_name: firstName,
          last_name: lastName,
          father_name: studentFormData.father,
          current_section_id: studentFormData.section || null,
          roll_number: studentFormData.rollNo,
          base_fee: parseFloat(studentFormData.fee) || 0,
          discount_amount: parseFloat(studentFormData.discount) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStudent.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error updating student:', error)
        alert('Failed to update student')
        return
      }

      // Refresh students list
      await fetchStudents(selectedClass.id)
      setShowStudentEditModal(false)
      setSelectedStudent(null)
      setStudentFormData({ name: '', father: '', section: '', rollNo: '', fee: '', discount: '' })
    } catch (error) {
      console.error('Error updating student:', error)
      alert('An error occurred while updating')
    }
  }

  const handleStudentDelete = (student) => {
    setSelectedStudent(student)
    setShowStudentDeleteModal(true)
  }

  const confirmStudentDelete = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      // Soft delete by setting status to inactive
      const { error } = await supabase
        .from('students')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStudent.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting student:', error)
        alert('Failed to delete student')
        return
      }

      // Refresh students list
      await fetchStudents(selectedClass.id)
      setShowStudentDeleteModal(false)
      setSelectedStudent(null)
    } catch (error) {
      console.error('Error deleting student:', error)
      alert('An error occurred while deleting')
    }
  }

  // If in view mode, show the class details page
  if (viewMode && selectedClass) {
    return (
      <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
              activeTab === 'students'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Users size={16} />
            Class Students
          </button>
          <button
            onClick={() => setActiveTab('feePolicy')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
              activeTab === 'feePolicy'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FileText size={16} />
            Admission Fee Policy
          </button>
          <button
            onClick={() => setActiveTab('feeIncrement')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
              activeTab === 'feeIncrement'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <TrendingUp size={16} />
            Fee Increment
          </button>
          <button
            onClick={handleGoBack}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>

        {/* Tab Content */}
        {/* Class Students Tab */}
        {activeTab === 'students' && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Students enrolled in the <span className="text-blue-600">{selectedClass.class_name}</span> session <span className="font-bold">2024-2025</span>
              </h2>

              <div className="flex flex-col md:flex-row gap-4">
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white md:w-48"
                >
                  <option value="">All Sections</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name or roll number"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2">
                  <Search size={18} />
                  Search
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Father Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Section</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Roll No</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fee</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Discount</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStudents ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          Loading students...
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          No students found
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, index) => {
                        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim()
                        const studentFee = parseFloat(student.base_fee || student.fee_amount) || 0
                        const classFee = parseFloat(selectedClass?.standard_fee) || 0
                        const feeAmount = studentFee > 0 ? studentFee : classFee
                        const discount = parseFloat(student.discount_amount) || 0
                        const sectionName = student.sections?.section_name || '-'

                        return (
                          <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 border border-gray-200 text-blue-600">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 border border-gray-200">
                              <span className="text-blue-600 font-medium">{studentName}</span>
                            </td>
                            <td className="px-4 py-3 border border-gray-200">{student.father_name || '-'}</td>
                            <td className="px-4 py-3 border border-gray-200">{sectionName}</td>
                            <td className="px-4 py-3 border border-gray-200 text-blue-600">{student.roll_number || '-'}</td>
                            <td className="px-4 py-3 border border-gray-200 text-blue-600">
                              {feeAmount > 0 ? feeAmount.toLocaleString() : 'Free'}
                            </td>
                            <td className="px-4 py-3 border border-gray-200">
                              {discount > 0 ? discount.toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3 border border-gray-200">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStudentEdit(student)}
                                  className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleStudentDelete(student)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Admission Fee Policy Tab */}
        {activeTab === 'feePolicy' && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">
                  Admission fee policy for the class <span className="text-blue-600">{selectedClass.class_name}</span>
                </h2>
                <button
                  onClick={() => {
                    setSelectedFeePolicy(null)
                    setFeePolicyFormData({ classId: selectedClass?.id || '', feeHead: '', title: '', amount: '' })
                    setShowFeePolicyDrawer(true)
                  }}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Fee Policy
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fee Head</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Title</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingFeePolicies ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          Loading fee policies...
                        </td>
                      </tr>
                    ) : feePolicies.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          No fee policies found
                        </td>
                      </tr>
                    ) : (
                      feePolicies.map((fee, index) => (
                        <tr key={fee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 border border-gray-200">{index + 1}</td>
                          <td className="px-4 py-3 border border-gray-200">{fee.fee_name}</td>
                          <td className="px-4 py-3 border border-gray-200">{fee.description || '-'}</td>
                          <td className="px-4 py-3 border border-gray-200">
                            {fee.amount > 0 ? fee.amount.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 border border-gray-200">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditFeePolicy(fee)}
                                className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteFeePolicy(fee)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Fee Increment Tab */}
        {activeTab === 'feeIncrement' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Fee Increment for <span className="text-blue-600">{selectedClass.class_name}</span>
            </h2>
            <p className="text-gray-600 mb-6">Click the button below to apply fee increment to all students in this class.</p>
            <button
              onClick={handleFeeIncrement}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2"
            >
              <TrendingUp size={18} />
              Apply Fee Increment
            </button>
          </div>
        )}

        {/* Fee Increment Modal - in view mode */}
        {showFeeIncrementModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowFeeIncrementModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Fee Increment</h3>
                    <button
                      onClick={() => setShowFeeIncrementModal(false)}
                      className="text-white hover:bg-white/10 p-1 rounded-full transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Mode</label>
                    <select
                      value={feeIncrementData.mode}
                      onChange={(e) => setFeeIncrementData({ ...feeIncrementData, mode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Mode</option>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Type</label>
                    <select
                      value={feeIncrementData.type}
                      onChange={(e) => setFeeIncrementData({ ...feeIncrementData, type: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Type</option>
                      <option value="increase">Increase</option>
                      <option value="decrease">Decrease</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Enter Increment Amount</label>
                    <input
                      type="text"
                      placeholder="Enter amount..."
                      value={feeIncrementData.amount}
                      onChange={(e) => setFeeIncrementData({ ...feeIncrementData, amount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowFeeIncrementModal(false)}
                      className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                    >
                      Close
                    </button>
                    <button
                      onClick={applyFeeIncrement}
                      className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Student Edit Sidebar */}
        {showStudentEditModal && selectedStudent && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowStudentEditModal(false)}
            />
            <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">Edit Student</h3>
                    <p className="text-blue-200 text-sm mt-1">Update student details</p>
                  </div>
                  <button
                    onClick={() => setShowStudentEditModal(false)}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentFormData.name}
                      onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Father Name
                    </label>
                    <input
                      type="text"
                      value={studentFormData.father}
                      onChange={(e) => setStudentFormData({ ...studentFormData, father: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Section
                    </label>
                    <select
                      value={studentFormData.section}
                      onChange={(e) => setStudentFormData({ ...studentFormData, section: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    >
                      <option value="">Select Section</option>
                      {classSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.section_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Roll No
                    </label>
                    <input
                      type="text"
                      value={studentFormData.rollNo}
                      onChange={(e) => setStudentFormData({ ...studentFormData, rollNo: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Fee
                    </label>
                    <input
                      type="text"
                      value={studentFormData.fee}
                      onChange={(e) => setStudentFormData({ ...studentFormData, fee: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Discount
                    </label>
                    <input
                      type="text"
                      value={studentFormData.discount}
                      onChange={(e) => setStudentFormData({ ...studentFormData, discount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 px-6 py-5 bg-white">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStudentEditModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStudentUpdate}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <Edit2 size={18} />
                    Update Student
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Student Delete Confirmation Modal */}
        {showStudentDeleteModal && selectedStudent && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowStudentDeleteModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-bold">Confirm Delete</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to delete student <span className="font-bold text-red-600">{selectedStudent.name}</span>? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowStudentDeleteModal(false)}
                      className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmStudentDelete}
                      className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fee Policy Drawer - Slide in from Right */}
        {showFeePolicyDrawer && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => {
                setShowFeePolicyDrawer(false)
                setSelectedFeePolicy(null)
                setFeePolicyFormData({ classId: '', feeHead: '', title: '', amount: '' })
              }}
            />
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 animate-slide-in-right">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedFeePolicy ? 'Edit Fee Policy' : 'Add Fee Policy'}
                    </h3>
                    <p className="text-blue-200 text-sm mt-1">
                      {selectedFeePolicy ? 'Update fee policy details' : 'Create new fee policy'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowFeePolicyDrawer(false)
                      setSelectedFeePolicy(null)
                      setFeePolicyFormData({ classId: '', feeHead: '', title: '', amount: '' })
                    }}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Fee Head <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Admission Fee, Registration Fee"
                      value={feePolicyFormData.feeHead}
                      onChange={(e) => setFeePolicyFormData({ ...feePolicyFormData, feeHead: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Fee description or title"
                      value={feePolicyFormData.title}
                      onChange={(e) => setFeePolicyFormData({ ...feePolicyFormData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                      <input
                        type="text"
                        placeholder="0"
                        value={feePolicyFormData.amount}
                        onChange={(e) => setFeePolicyFormData({ ...feePolicyFormData, amount: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 px-6 py-5 bg-white">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFeePolicyDrawer(false)
                      setSelectedFeePolicy(null)
                      setFeePolicyFormData({ classId: '', feeHead: '', title: '', amount: '' })
                    }}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={selectedFeePolicy ? handleUpdateFeePolicy : handleSaveFeePolicy}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    {selectedFeePolicy ? (
                      <>
                        <Edit2 size={18} />
                        Update Policy
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Save Policy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fee Policy Delete Confirmation Modal */}
        {showFeePolicyDeleteModal && selectedFeePolicy && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowFeePolicyDeleteModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-bold">Confirm Delete</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to delete fee policy <span className="font-bold text-red-600">{selectedFeePolicy.fee_name}</span>? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFeePolicyDeleteModal(false)}
                      className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteFeePolicy}
                      className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // Main class list view
  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Top Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          Add New Class
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Search Classes</h2>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Class Filter */}
          <div className="md:w-48">
            <label className="block text-gray-600 text-sm mb-2">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.class_name}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1">
            <label className="block text-gray-600 text-sm mb-2 invisible">Search</label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2">
                <Search size={20} />
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Standard Fee</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Students</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Total Fee</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Discount</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Budget</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    Loading classes...
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, index) => {
                  const totalStudents = cls.total_students || 0
                  const standardFee = parseFloat(cls.standard_fee) || 0
                  const totalFee = standardFee * totalStudents
                  const discount = parseFloat(cls.total_discount) || 0
                  const budget = totalFee - discount

                  return (
                    <tr
                      key={cls.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-4 py-3 border border-gray-200">{index + 1}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                          {cls.class_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {standardFee.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">{totalStudents}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        {totalFee.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {discount > 0 ? discount.toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {budget.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(cls)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(cls)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(cls)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Class Sidebar */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Create New Class</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the details below</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Incharge
                  </label>
                  <select
                    value={formData.incharge}
                    onChange={(e) => setFormData({ ...formData, incharge: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Incharge</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={`${staff.first_name} ${staff.last_name || ''}`.trim()}>
                        {staff.first_name} {staff.last_name || ''} - {staff.designation || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grade 5, Nursery A"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.classFee}
                      onChange={(e) => setFormData({ ...formData, classFee: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Exam Marking System
                  </label>
                  <select
                    value={formData.markingSystem}
                    onChange={(e) => setFormData({ ...formData, markingSystem: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Marking System</option>
                    <option value="percentage">Percentage</option>
                    <option value="grade">Grade</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Plus size={18} />
                  Save Class
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Class Sidebar */}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowEditModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Class</h3>
                  <p className="text-blue-200 text-sm mt-1">Update class details</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Incharge
                  </label>
                  <select
                    value={formData.incharge}
                    onChange={(e) => setFormData({ ...formData, incharge: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Incharge</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={`${staff.first_name} ${staff.last_name || ''}`.trim()}>
                        {staff.first_name} {staff.last_name || ''} - {staff.designation || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grade 5, Nursery A"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.classFee}
                      onChange={(e) => setFormData({ ...formData, classFee: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Exam Marking System
                  </label>
                  <select
                    value={formData.markingSystem}
                    onChange={(e) => setFormData({ ...formData, markingSystem: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Marking System</option>
                    <option value="percentage">Percentage</option>
                    <option value="grade">Grade</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Edit2 size={18} />
                  Update Class
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && classToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <span className="font-bold text-red-600">{classToDelete.class_name}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fee Increment Modal */}
      {showFeeIncrementModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowFeeIncrementModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Fee Increment</h3>
                  <button
                    onClick={() => setShowFeeIncrementModal(false)}
                    className="text-white hover:bg-white/10 p-1 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Mode</label>
                  <select
                    value={feeIncrementData.mode}
                    onChange={(e) => setFeeIncrementData({ ...feeIncrementData, mode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Mode</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Type</label>
                  <select
                    value={feeIncrementData.type}
                    onChange={(e) => setFeeIncrementData({ ...feeIncrementData, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Type</option>
                    <option value="increase">Increase</option>
                    <option value="decrease">Decrease</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Enter Increment Amount</label>
                  <input
                    type="text"
                    placeholder="Enter amount..."
                    value={feeIncrementData.amount}
                    onChange={(e) => setFeeIncrementData({ ...feeIncrementData, amount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowFeeIncrementModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={applyFeeIncrement}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
