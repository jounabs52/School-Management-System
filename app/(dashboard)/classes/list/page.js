'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Edit2, X, Eye, Trash2, ArrowLeft, CheckCircle, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie, getSchoolId } from '@/lib/clientAuth'

// Modal Overlay Component - Uses Portal to render at document body level
const ModalOverlay = ({ children, onClose }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[99998]"
        style={{
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
        onClick={onClose}
      />
      {children}
    </>,
    document.body
  )
}

// Toast Component - Matches screenshot design with pill/rounded shape
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}
    style={{
      animation: 'slideIn 0.3s ease-out'
    }}>
      {type === 'success' && <CheckCircle size={16} strokeWidth={2.5} />}
      {type === 'error' && <X size={16} strokeWidth={2.5} />}
      <span className="font-medium text-xs">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-80 transition-opacity">
        <X size={14} strokeWidth={2.5} />
      </button>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

// Helper to get logged-in user
const getLoggedInUser = () => {
  if (typeof window === 'undefined') return { id: null, school_id: null }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return { id: user?.id, school_id: user?.school_id }
  } catch {
    return { id: null, school_id: null }
  }
}

export default function ClassListPage() {
  // Debug: Check Supabase initialization
  useEffect(() => {
    console.log('📋 ClassListPage mounted')
    console.log('🔌 Supabase client:', supabase ? 'Initialized' : 'NOT INITIALIZED')
    const user = getUserFromCookie()
    const schoolId = getSchoolId(user)
    console.log('👤 User from storage:', user)
    console.log('🔑 User properties:', user ? Object.keys(user) : 'No user')
    console.log('🏫 School ID resolved:', schoolId || 'NOT FOUND')
    console.log('🏫 School ID check:', {
      'user.school_id': user?.school_id,
      'user.schoolId': user?.schoolId,
      'user.school': user?.school,
      'getSchoolId() result': schoolId,
      'Full user': JSON.stringify(user, null, 2)
    })
  }, [])

  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStudentEditModal, setShowStudentEditModal] = useState(false)
  const [showStudentDeleteModal, setShowStudentDeleteModal] = useState(false)

  // Lock/unlock body scroll when modals open/close
  useEffect(() => {
    const isAnyModalOpen = showModal || showEditModal || showDeleteModal ||
                          showStudentEditModal || showStudentDeleteModal

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
  }, [showModal, showEditModal, showDeleteModal, showStudentEditModal, showStudentDeleteModal])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [viewMode, setViewMode] = useState(false)
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
  const [formData, setFormData] = useState({
    incharge: '',
    className: '',
    classFee: '',
    markingSystem: '',
    feePlan: 'monthly'
  })
  const [inchargeSearchTerm, setInchargeSearchTerm] = useState('')
  const [showInchargeDropdown, setShowInchargeDropdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(10)

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  // Fetch sections for a class
  const fetchClassSections = async (classId) => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('No user found')
        return
      }

      const { data, error } = await supabase
        .from('sections')
        .select('id, section_name')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('No user found')
        setLoadingStudents(false)
        return
      }

      // First, fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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
          .eq('user_id', userId)
          .eq('school_id', schoolId)
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


  // Fetch staff and classes data
  useEffect(() => {
    fetchStaff()
    fetchClasses()
  }, [])

  // Real-time subscription for classes
  useEffect(() => {
    const { id: userId, school_id: schoolId } = getLoggedInUser()
    if (!userId || !schoolId || !supabase) return

    console.log('🔴 Setting up real-time subscription for classes')

    const channel = supabase
      .channel('classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log('🔴 Real-time event received:', payload.eventType, payload)

          if (payload.eventType === 'INSERT') {
            fetchClasses()
          } else if (payload.eventType === 'UPDATE') {
            fetchClasses()
          } else if (payload.eventType === 'DELETE') {
            setClasses(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      console.log('🔴 Unsubscribing from classes real-time')
      supabase.removeChannel(channel)
    }
  }, [])

  // Real-time subscription for students (to update counts)
  useEffect(() => {
    const { id: userId, school_id: schoolId } = getLoggedInUser()
    if (!userId || !schoolId || !supabase) return

    console.log('🔴 Setting up real-time subscription for students')

    const channel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log('🔴 Student real-time event received:', payload.eventType)
          // Refetch classes to update student counts and discounts
          fetchClasses()
        }
      )
      .subscribe()

    return () => {
      console.log('🔴 Unsubscribing from students real-time')
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchStaff = async () => {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        return
      }

      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('❌ No user found')
        return
      }

      console.log('✅ Fetching staff for school_id:', schoolId)

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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

      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        setLoading(false)
        return
      }

      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('❌ No user found')
        setLoading(false)
        return
      }

      console.log('✅ Fetched school_id:', schoolId)

      // Get classes with student count and total discount
      const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('standard_fee', { ascending: true, nullsFirst: true })
        .order('class_name', { ascending: true })

      if (error) {
        console.error('❌ Error fetching classes:', error)
        console.error('Error details:', error)
        setClasses([])
        setLoading(false)
        return
      }

      if (!classes || classes.length === 0) {
        console.log('⚠️ No classes found')
        setClasses([])
        setLoading(false)
        return
      }

      console.log('✅ Fetched classes:', classes)
      console.log('Number of classes:', classes?.length || 0)

        // Fetch all students in one query for all classes
        const classIds = classes.map(cls => cls.id)
        const { data: allStudents } = await supabase
          .from('students')
          .select('current_class_id, discount_amount')
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .in('current_class_id', classIds)
          .eq('status', 'active')

        // Calculate stats for each class
        const classStats = {}
        classIds.forEach(id => {
          classStats[id] = { count: 0, discount: 0 }
        })

        if (allStudents) {
          allStudents.forEach(student => {
            const classId = student.current_class_id
            if (classStats[classId]) {
              classStats[classId].count++
              classStats[classId].discount += parseFloat(student.discount_amount) || 0
            }
          })
        }

        // Map stats to classes
        const classesWithStats = classes.map(cls => ({
          ...cls,
          total_students: classStats[cls.id]?.count || 0,
          total_discount: classStats[cls.id]?.discount || 0,
          fee_plan: cls.fee_plan || 'monthly'
        }))

        console.log('✅ Classes with stats:', classesWithStats)
        setClasses(classesWithStats)

    } catch (error) {
      console.error('❌ Error in fetchClasses:', error)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClassFilter = !classFilter || cls.class_name === classFilter
    return matchesSearch && matchesClassFilter
  }).sort((a, b) => {
    // Sort by standard_fee (low to high)
    const feeA = parseFloat(a.standard_fee) || 0
    const feeB = parseFloat(b.standard_fee) || 0
    return feeA - feeB
  })

  const exportToCSV = () => {
    if (classes.length === 0) {
      showToast('No data to export', 'error')
      return
    }

    // Export ALL classes (not just filtered ones) sorted by fee
    const sortedClasses = [...classes].sort((a, b) => {
      const feeA = parseFloat(a.standard_fee) || 0
      const feeB = parseFloat(b.standard_fee) || 0
      return feeA - feeB
    })

    const csvData = sortedClasses.map((cls, index) => ({
      'Sr.': index + 1,
      'Class Name': cls.class_name || 'N/A',
      'Standard Fee': cls.standard_fee || 0,
      'Fee Plan': cls.fee_plan || 'Monthly',
      'Students': cls.total_students || 0,
      'Total Fee': cls.total_fee || 0,
      'Discount': cls.total_discount || 0,
      'Budget': cls.budget || 0
    }))

    const headers = Object.keys(csvData[0])
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    a.download = `classes-list-${date}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    showToast('Excel exported successfully!', 'success')
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredClasses.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedClasses = filteredClasses.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, classFilter])

  const handleSave = async () => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
        return
      }

      // Prepare the class data
      const classData = {
        user_id: userId,
        school_id: schoolId,
        created_by: userId,
        class_name: formData.className,
        incharge: formData.incharge,
        exam_marking_system: formData.markingSystem,
        status: 'active'
      }

      // Note: standard_fee and fee_plan columns must exist in database
      // Run migrations/add_fee_plan_column.sql if you see errors
      if (formData.classFee) {
        classData.standard_fee = parseFloat(formData.classFee) || 0
      }
      if (formData.feePlan) {
        classData.fee_plan = formData.feePlan
      }

      const { data, error } = await supabase
        .from('classes')
        .insert([classData])
        .select()

      if (error) {
        console.error('Error creating class:', error)

        // Check for duplicate class name error
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint') || error.code === '23505') {
          showToast(`Class "${formData.className}" already exists!`, 'error')
          return
        }

        // If the error is about standard_fee column, try without it
        if (error.message.includes('standard_fee')) {
          delete classData.standard_fee
          const { data: retryData, error: retryError } = await supabase
            .from('classes')
            .insert([classData])
            .select()

          if (retryError) {
            // Check for duplicate in retry attempt
            if (retryError.message.includes('duplicate key') || retryError.message.includes('unique constraint') || retryError.code === '23505') {
              showToast(`Class "${formData.className}" already exists!`, 'error')
              return
            }
            showToast('Failed to create class: ' + retryError.message, 'error')
            return
          }

          if (!retryData || !Array.isArray(retryData) || retryData.length === 0) {
            showToast('Failed to create class: No data returned', 'error')
            return
          }

          showToast('Class created successfully! (Note: Fee will be set to 0)', 'success')
          setShowModal(false)
          setFormData({ incharge: '', className: '', classFee: '', markingSystem: '', feePlan: 'monthly' })
          setInchargeSearchTerm('')
          setShowInchargeDropdown(false)

          const newClass = retryData[0]
          const { count: totalStudents } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('school_id', schoolId)
            .eq('current_class_id', newClass.id)
            .eq('status', 'active')

          setClasses(prev => [...prev, { ...newClass, total_students: totalStudents || 0, total_discount: 0 }])
        } else {
          showToast('Failed to create class: ' + error.message, 'error')
        }
      } else {
        if (!data || !Array.isArray(data) || data.length === 0) {
          showToast('Failed to create class: No data returned', 'error')
          return
        }

        setShowModal(false)
        setFormData({ incharge: '', className: '', classFee: '', markingSystem: '', feePlan: 'monthly' })
        setInchargeSearchTerm('')
        setShowInchargeDropdown(false)
        showToast('Class created successfully!', 'success')

        // Update classes state without reloading
        const newClass = data[0]
        const { count: totalStudents } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .eq('current_class_id', newClass.id)
          .eq('status', 'active')

        setClasses(prev => [...prev, { ...newClass, total_students: totalStudents || 0, total_discount: 0 }])
      }
    } catch (error) {
      console.error('Error saving class:', error)
      showToast('Error saving class', 'error')
    }
  }

  const handleEdit = (cls) => {
    setSelectedClass(cls)
    setFormData({
      incharge: cls.incharge || '',
      className: cls.class_name,
      classFee: cls.standard_fee || '',
      markingSystem: cls.exam_marking_system || '',
      feePlan: cls.fee_plan || 'monthly'
    })
    setInchargeSearchTerm(cls.incharge || '')
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
        return
      }

      // Prepare update data
      // Note: standard_fee and fee_plan columns must exist in database
      // Run migrations/add_fee_plan_column.sql if you see errors
      const updateData = {
        class_name: formData.className,
        incharge: formData.incharge,
        exam_marking_system: formData.markingSystem,
        updated_at: new Date().toISOString()
      }

      if (formData.classFee !== undefined && formData.classFee !== '') {
        updateData.standard_fee = parseFloat(formData.classFee) || 0
      }
      if (formData.feePlan) {
        updateData.fee_plan = formData.feePlan
      }

      const { data, error } = await supabase
        .from('classes')
        .update(updateData)
        .eq('id', selectedClass.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .select()

      if (error) {
        console.error('Error updating class:', error)
        showToast('Failed to update class: ' + error.message, 'error')
      } else {
        if (!data || !Array.isArray(data) || data.length === 0) {
          showToast('Failed to update class: No data returned', 'error')
          return
        }

        setShowEditModal(false)
        setFormData({ incharge: '', className: '', classFee: '', markingSystem: '', feePlan: 'monthly' })
        setInchargeSearchTerm('')
        setShowInchargeDropdown(false)
        setSelectedClass(null)
        showToast('Class updated successfully!', 'success')

        // Update classes state without reloading
        setClasses(prev => prev.map(cls =>
          cls.id === selectedClass.id
            ? { ...cls, ...data[0] }
            : cls
        ))
      }
    } catch (error) {
      console.error('Error updating class:', error)
      showToast('Error updating class', 'error')
    }
  }

  const handleView = (cls) => {
    setSelectedClass(cls)
    setViewMode(true)
    setSelectedSection('')
    setStudentSearchTerm('')
    fetchClassSections(cls.id)
    fetchStudents(cls.id)
  }

  const handleDelete = (cls) => {
    setClassToDelete(cls)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
        return
      }

      // Permanently delete from database (not soft delete)
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classToDelete.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('Error deleting class:', error)
        showToast('Failed to delete class: ' + error.message, 'error')
      } else {
        setShowDeleteModal(false)
        const deletedClassName = classToDelete.class_name
        const deletedId = classToDelete.id
        setClassToDelete(null)
        showToast(`Class "${deletedClassName}" permanently deleted!`, 'success')

        // Update classes state without reloading
        setClasses(prev => prev.filter(cls => cls.id !== deletedId))
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      showToast('Error deleting class', 'error')
    }
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
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
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
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('Error updating student:', error)
        showToast('Failed to update student', 'error')
        return
      }

      // Refresh students list
      await fetchStudents(selectedClass.id)
      setShowStudentEditModal(false)
      setSelectedStudent(null)
      setStudentFormData({ name: '', father: '', section: '', rollNo: '', fee: '', discount: '' })
      showToast('Student updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating student:', error)
      showToast('An error occurred while updating', 'error')
    }
  }

  const handleStudentDelete = (student) => {
    setSelectedStudent(student)
    setShowStudentDeleteModal(true)
  }

  const confirmStudentDelete = async () => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
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
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('Error deleting student:', error)
        showToast('Failed to delete student', 'error')
        return
      }

      // Refresh students list
      await fetchStudents(selectedClass.id)
      setShowStudentDeleteModal(false)
      setSelectedStudent(null)
      showToast('Student deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting student:', error)
      showToast('An error occurred while deleting', 'error')
    }
  }

  // If in view mode, show the class details page
  if (viewMode && selectedClass) {
    return (
      <div className="p-2 lg:p-4 bg-gray-50 min-h-screen">
        {/* Toast Notification */}
        {toast.show && (
          <Toast message={toast.message} type={toast.type} onClose={hideToast} />
        )}
        {/* Top Bar with Go Back Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Class: <span className="text-blue-600">{selectedClass.class_name}</span>
          </h2>
          <button
            onClick={handleGoBack}
            className="px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5 bg-red-600 text-white hover:bg-red-700 transition"
          >
            <ArrowLeft size={14} />
            Go Back
          </button>
        </div>

        {/* Class Students Section */}
        <div>
            <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
              <h2 className="text-base font-bold text-gray-800 mb-3">
                Students enrolled in the <span className="text-blue-600">{selectedClass.class_name}</span> session <span className="font-bold">2024-2025</span>
              </h2>

              <div className="flex flex-col md:flex-row gap-3">
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white md:w-40"
                >
                  <option value="">All Sections</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by name or roll number"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Student Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Father Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Section</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Roll No</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Fee</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Discount</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStudents ? (
                      <tr>
                        <td colSpan="8" className="px-3 py-6 text-center text-gray-500">
                          Loading students...
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-3 py-6 text-center text-gray-500">
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
                            <td className="px-3 py-2.5 border border-gray-200 text-blue-600">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200">
                              <span className="text-blue-600 font-medium">{studentName}</span>
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200">{student.father_name || '-'}</td>
                            <td className="px-3 py-2.5 border border-gray-200">{sectionName}</td>
                            <td className="px-3 py-2.5 border border-gray-200 text-blue-600">{student.roll_number || '-'}</td>
                            <td className="px-3 py-2.5 border border-gray-200 text-blue-600">
                              {feeAmount > 0 ? feeAmount.toLocaleString() : 'Free'}
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200">
                              {discount > 0 ? discount.toLocaleString() : '-'}
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleStudentEdit(student)}
                                  className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleStudentDelete(student)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <Trash2 size={16} />
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


        {/* Student Edit Sidebar */}
        {showStudentEditModal && selectedStudent && (
          <ModalOverlay onClose={() => setShowStudentEditModal(false)}>
            <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold">Edit Student</h3>
                    <p className="text-blue-200 text-xs mt-0.5">Update student details</p>
                  </div>
                  <button
                    onClick={() => setShowStudentEditModal(false)}
                    className="text-white hover:bg-white/10 p-1.5 rounded-full transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentFormData.name}
                      onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Father Name
                    </label>
                    <input
                      type="text"
                      value={studentFormData.father}
                      onChange={(e) => setStudentFormData({ ...studentFormData, father: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Section
                    </label>
                    <select
                      value={studentFormData.section}
                      onChange={(e) => setStudentFormData({ ...studentFormData, section: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    >
                      <option value="">Select Section</option>
                      {classSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.section_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Roll No
                    </label>
                    <input
                      type="text"
                      value={studentFormData.rollNo}
                      onChange={(e) => setStudentFormData({ ...studentFormData, rollNo: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Fee
                    </label>
                    <input
                      type="text"
                      value={studentFormData.fee}
                      onChange={(e) => setStudentFormData({ ...studentFormData, fee: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Discount
                    </label>
                    <input
                      type="text"
                      value={studentFormData.discount}
                      onChange={(e) => setStudentFormData({ ...studentFormData, discount: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 px-4 py-3 bg-white">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStudentEditModal(false)}
                    className="flex-1 px-3 py-2 text-gray-700 font-medium text-sm hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStudentUpdate}
                    className="flex-1 px-3 py-2 bg-red-600 text-white font-medium text-sm rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={14} />
                    Update
                  </button>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}

        {/* Student Delete Confirmation Modal */}
        {showStudentDeleteModal && selectedStudent && (
          <ModalOverlay onClose={() => setShowStudentDeleteModal(false)}>
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-t-xl">
                  <h3 className="text-base font-bold">Confirm Delete</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 text-sm mb-4">
                    Are you sure you want to delete student <span className="font-bold text-red-600">{`${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim()}</span>? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowStudentDeleteModal(false)}
                      className="flex-1 px-3 py-2 text-gray-700 font-medium text-sm hover:bg-gray-100 rounded-lg transition border border-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmStudentDelete}
                      className="flex-1 px-3 py-2 bg-red-600 text-white font-medium text-sm rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}

      </div>
    )
  }

  // Main class list view
  return (
    <div className="p-2 lg:p-4 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
      {/* Top Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-700 transition flex items-center gap-1.5 shadow-lg"
        >
          <Plus size={16} />
          Add New Class
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-bold text-gray-800">Search Classes</h2>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Download size={18} />
            Export to Excel
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          {/* Class Filter */}
          <div className="md:w-40">
            <label className="block text-gray-600 text-xs mb-1.5">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
            <label className="block text-gray-600 text-xs mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Class Name</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Standard Fee</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Fee Plan</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Students</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Total Fee</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Discount</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Budget</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-3 py-6 text-center text-gray-500">
                    Loading classes...
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-3 py-6 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((cls, index) => {
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
                      <td className="px-3 py-2.5 border border-gray-200">{startIndex + index + 1}</td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                          {cls.class_name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {standardFee.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          cls.fee_plan === 'quarterly' ? 'bg-purple-100 text-purple-800' :
                          cls.fee_plan === 'semi-annual' ? 'bg-orange-100 text-orange-800' :
                          cls.fee_plan === 'annual' ? 'bg-green-100 text-green-800' :
                          cls.fee_plan === 'one-time' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {cls.fee_plan === 'quarterly' ? 'Quarterly' :
                           cls.fee_plan === 'semi-annual' ? 'Semi-Annual' :
                           cls.fee_plan === 'annual' ? 'Annual' :
                           cls.fee_plan === 'one-time' ? 'One-Time' : 'Monthly'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">{totalStudents}</td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {totalFee.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {discount > 0 ? discount.toLocaleString() : ''}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {budget.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(cls)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(cls)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(cls)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
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

        {/* Pagination Controls */}
        {filteredClasses.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-xs text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredClasses.length)} of {filteredClasses.length} classes
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#1E3A8A] text-white hover:bg-blue-900'
                }`}
              >
                Previous
              </button>
              <div className="flex items-center gap-1.5">
                {(() => {
                  const pages = []
                  const maxVisiblePages = 4
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                  // Adjust startPage if we're near the end
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1)
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`w-8 h-8 rounded-lg font-medium text-sm transition ${
                          currentPage === i
                            ? 'bg-[#1E3A8A] text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {i}
                      </button>
                    )
                  }
                  return pages
                })()}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#1E3A8A] text-white hover:bg-blue-900'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Class Sidebar */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold">Create New Class</h3>
                  <p className="text-blue-200 text-xs mt-0.5">Fill in the details below</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/10 p-1.5 rounded-full transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Incharge
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search incharge..."
                      value={inchargeSearchTerm}
                      onChange={(e) => {
                        setInchargeSearchTerm(e.target.value)
                        setShowInchargeDropdown(true)
                      }}
                      onFocus={() => {
                        setShowInchargeDropdown(true)
                        if (formData.incharge && !inchargeSearchTerm) {
                          setInchargeSearchTerm('')
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowInchargeDropdown(false), 200)
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                    {showInchargeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {staffList
                          .filter(staff => {
                            if (!inchargeSearchTerm) return true
                            const fullName = `${staff.first_name} ${staff.last_name || ''}`.trim().toLowerCase()
                            return fullName.includes(inchargeSearchTerm.toLowerCase())
                          })
                          .map((staff) => (
                            <div
                              key={staff.id}
                              onClick={() => {
                                const fullName = `${staff.first_name} ${staff.last_name || ''}`.trim()
                                setFormData({ ...formData, incharge: fullName })
                                setInchargeSearchTerm(fullName)
                                setShowInchargeDropdown(false)
                              }}
                              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                            >
                              {staff.first_name} {staff.last_name || ''} - {staff.designation || 'Staff'}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grade 5, Nursery A"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Fee Plan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.feePlan}
                    onChange={(e) => setFormData({ ...formData, feePlan: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (3 months)</option>
                    <option value="semi-annual">Semi-Annual (6 months)</option>
                    <option value="annual">Annual (12 months)</option>
                    <option value="one-time">One-Time Fee</option>
                  </select>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Class Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">Rs.</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.classFee}
                      onChange={(e) => setFormData({ ...formData, classFee: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Exam Marking System
                  </label>
                  <select
                    value={formData.markingSystem}
                    onChange={(e) => setFormData({ ...formData, markingSystem: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Marking System</option>
                    <option value="marks">Marks</option>
                    <option value="percentage">Percentage</option>
                    <option value="grade">Grade</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-3 bg-white">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-3 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-3 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5 text-sm"
                >
                  <Plus size={14} />
                  Save Class
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Edit Class Sidebar */}
      {showEditModal && (
        <ModalOverlay onClose={() => setShowEditModal(false)}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold">Edit Class</h3>
                  <p className="text-blue-200 text-xs mt-0.5">Update class details</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white hover:bg-white/10 p-1.5 rounded-full transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Incharge
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search incharge..."
                      value={inchargeSearchTerm}
                      onChange={(e) => {
                        setInchargeSearchTerm(e.target.value)
                        setShowInchargeDropdown(true)
                      }}
                      onFocus={() => {
                        setShowInchargeDropdown(true)
                        if (formData.incharge && !inchargeSearchTerm) {
                          setInchargeSearchTerm('')
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowInchargeDropdown(false), 200)
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                    {showInchargeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {staffList
                          .filter(staff => {
                            if (!inchargeSearchTerm) return true
                            const fullName = `${staff.first_name} ${staff.last_name || ''}`.trim().toLowerCase()
                            return fullName.includes(inchargeSearchTerm.toLowerCase())
                          })
                          .map((staff) => (
                            <div
                              key={staff.id}
                              onClick={() => {
                                const fullName = `${staff.first_name} ${staff.last_name || ''}`.trim()
                                setFormData({ ...formData, incharge: fullName })
                                setInchargeSearchTerm(fullName)
                                setShowInchargeDropdown(false)
                              }}
                              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                            >
                              {staff.first_name} {staff.last_name || ''} - {staff.designation || 'Staff'}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grade 5, Nursery A"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Fee Plan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.feePlan}
                    onChange={(e) => setFormData({ ...formData, feePlan: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (3 months)</option>
                    <option value="semi-annual">Semi-Annual (6 months)</option>
                    <option value="annual">Annual (12 months)</option>
                    <option value="one-time">One-Time Fee</option>
                  </select>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Class Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">Rs.</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.classFee}
                      onChange={(e) => setFormData({ ...formData, classFee: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Exam Marking System
                  </label>
                  <select
                    value={formData.markingSystem}
                    onChange={(e) => setFormData({ ...formData, markingSystem: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Marking System</option>
                    <option value="marks">Marks</option>
                    <option value="percentage">Percentage</option>
                    <option value="grade">Grade</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-3 bg-white">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-3 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-3 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5 text-sm"
                >
                  <Edit2 size={14} />
                  Update
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && classToDelete && (
        <ModalOverlay onClose={() => setShowDeleteModal(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-t-xl">
                <h3 className="text-base font-bold">Confirm Delete</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-700 text-sm mb-4">
                  Are you sure you want to delete <span className="font-bold text-red-600">{classToDelete.class_name}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-3 py-2 text-gray-700 font-medium text-sm hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-3 py-2 bg-red-600 text-white font-medium text-sm rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

    </div>
  )
}