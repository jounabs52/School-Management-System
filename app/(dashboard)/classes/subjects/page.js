'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Edit2, Trash2, X, BookOpen, ChevronDown, CheckCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import PermissionGuard from '@/components/PermissionGuard'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardGrid, CardInfoGrid } from '@/components/DataCard'

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
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-5 py-3 rounded-full shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}
    style={{
      animation: 'slideIn 0.3s ease-out'
    }}>
      {type === 'success' && <CheckCircle size={20} strokeWidth={2.5} />}
      {type === 'error' && <X size={20} strokeWidth={2.5} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-80 transition-opacity">
        <X size={18} strokeWidth={2.5} />
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

function SubjectsContent() {
  // Debug: Check Supabase initialization
  useEffect(() => {
    console.log('📋 SubjectsPage mounted')
    console.log('🔌 Supabase client:', supabase ? 'Initialized' : 'NOT INITIALIZED')
    const testUser = getUserFromCookie()
    console.log('👤 User from storage:', testUser)
    console.log('🔑 User properties:', testUser ? Object.keys(testUser) : 'No user')
    console.log('🏫 School ID check:', {
      'user.school_id': testUser?.school_id,
      'user.schoolId': testUser?.schoolId,
      'user.school': testUser?.school,
      'Full user': JSON.stringify(testUser, null, 2)
    })
  }, [])

  const [currentUser, setCurrentUser] = useState(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showEditSidebar, setShowEditSidebar] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [formData, setFormData] = useState({
    classId: '',
    subjects: [{ subjectName: '', subjectCode: '' }]
  })
  const [copyFromClassId, setCopyFromClassId] = useState('')
  const [copying, setCopying] = useState(false)
  const [editFormData, setEditFormData] = useState({
    classId: '',
    subjects: []
  })
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)
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

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showSidebar || showEditSidebar || showDeleteModal) {
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
  }, [showSidebar, showEditSidebar, showDeleteModal])

  // Load user first
  useEffect(() => {
    const { id, school_id } = getLoggedInUser()
    if (id && school_id) {
      setCurrentUser({ id, school_id })
    }
  }, [])

  // Fetch classes and subjects when user is available
  useEffect(() => {
    if (currentUser?.id && currentUser?.school_id) {
      fetchClasses()
      fetchSubjects()
    }
  }, [currentUser])

  // Real-time subscription for class_subjects
  useEffect(() => {
    const { id: userId, school_id: schoolId } = getLoggedInUser()
    if (!userId || !schoolId || !supabase) return

    console.log('🔴 Setting up real-time subscription for class_subjects')

    const channel = supabase
      .channel('class-subjects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_subjects',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log('🔴 Real-time event received:', payload.eventType, payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchSubjects()
          } else if (payload.eventType === 'DELETE') {
            setSubjects(prev => prev.filter(s => s.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      console.log('🔴 Unsubscribing from class_subjects real-time')
      supabase.removeChannel(channel)
    }
  }, [])

  // Real-time subscription for subjects table
  useEffect(() => {
    const { id: userId, school_id: schoolId } = getLoggedInUser()
    if (!userId || !schoolId || !supabase) return

    console.log('🔴 Setting up real-time subscription for subjects')

    const channel = supabase
      .channel('subjects-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subjects',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log('🔴 Subject update event received:', payload)
          // Refetch all subjects to get updated names/codes
          fetchSubjects()
        }
      )
      .subscribe()

    return () => {
      console.log('🔴 Unsubscribing from subjects real-time')
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true)

      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        setClasses([])
        setLoadingClasses(false)
        return
      }

      if (!currentUser) {
        setClasses([])
        setLoadingClasses(false)
        return
      }
      const { id: userId, school_id: schoolId } = currentUser

      console.log('✅ Fetching classes for school_id:', schoolId)

      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, incharge, exam_marking_system, standard_fee, order_number, status')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) {
        console.error('Error fetching classes:', error)
        setClasses([])
      } else {
        console.log('Fetched classes:', data)

        if (!data || data.length === 0) {
          console.warn('No classes found in database for school_id:', schoolId)
          setClasses([])
        } else {
          const transformedClasses = data.map(cls => ({
            id: cls.id,
            name: cls.class_name,
            incharge: cls.incharge,
            examMarkingSystem: cls.exam_marking_system,
            standardFee: cls.standard_fee,
            orderNumber: cls.order_number,
            status: cls.status
          }))
          setClasses(transformedClasses)
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      setClasses([])
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSubjects = async () => {
    try {
      setLoading(true)

      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        setLoading(false)
        return
      }

      if (!currentUser) {
        setLoading(false)
        return
      }
      const { id: userId, school_id: schoolId } = currentUser

      console.log('✅ Fetching subjects for school_id:', schoolId)

      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          id,
          is_compulsory,
          class_id,
          subject_id,
          classes:class_id (id, class_name, standard_fee),
          subjects:subject_id (id, subject_name, subject_code)
        `)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .order('id', { ascending: true })

      if (error) {
        console.error('Error fetching subjects:', error)
        console.error('Error details:', error)
        setSubjects([])
      } else {
        console.log('✅ Fetched subjects:', data)
        const transformedData = data.map((item, index) => ({
          id: item.id,
          sr: index + 1,
          classId: item.classes?.id || '',
          className: item.classes?.class_name || '',
          standardFee: parseFloat(item.classes?.standard_fee) || 0,
          subjectId: item.subjects?.id || '',
          subjectName: item.subjects?.subject_name || '',
          subjectCode: item.subjects?.subject_code || '',
          teacher: '-',
          isCompulsory: item.is_compulsory
        }))
        console.log('✅ Transformed subjects data:', transformedData)
        setSubjects(transformedData)
      }
    } catch (error) {
      console.error('❌ Error fetching subjects:', error)
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.subjectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.className?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = !selectedClass || subject.className === selectedClass
    return matchesSearch && matchesClass
  })

  const exportToCSV = () => {
    if (groupedSubjectsArray.length === 0) {
      showToast('No data to export', 'error')
      return
    }

    try {
      // Sort by standard_fee (low to high) for export
      const sortedGroups = [...groupedSubjectsArray].sort((a, b) => {
        const feeA = parseFloat(a.standardFee) || 0
        const feeB = parseFloat(b.standardFee) || 0
        return feeA - feeB
      })

      const exportData = sortedGroups.map((classGroup, index) => {
        // Format subjects as comma-separated list
        const subjectsList = classGroup.subjects
          .map(sub => sub.subjectName)
          .join(', ')

        return {
          'Sr.': index + 1,
          'Class Name': classGroup.className || 'N/A',
          'Subjects': subjectsList || 'N/A'
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },   // Sr.
        { wch: 20 },  // Class Name
        { wch: 60 }   // Subjects (wider for comma-separated list)
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Subjects')

      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `subjects-${date}.xlsx`)

      showToast('Excel file exported successfully!', 'success')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      showToast('Failed to export Excel file', 'error')
    }
  }

  // Group subjects by class
  const groupedSubjects = filteredSubjects.reduce((acc, subject) => {
    const classKey = `${subject.classId}_${subject.className}`
    if (!acc[classKey]) {
      acc[classKey] = {
        classId: subject.classId,
        className: subject.className,
        standardFee: subject.standardFee || 0,
        subjects: []
      }
    }
    acc[classKey].subjects.push({
      id: subject.id,
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode
    })
    return acc
  }, {})

  // Sort by standard_fee (low to high)
  const groupedSubjectsArray = Object.values(groupedSubjects).sort((a, b) => {
    const feeA = parseFloat(a.standardFee) || 0
    const feeB = parseFloat(b.standardFee) || 0
    return feeA - feeB
  })

  // Pagination logic
  const totalPages = Math.ceil(groupedSubjectsArray.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedSubjects = groupedSubjectsArray.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedClass])

  const handleSave = async () => {
    console.log('🚀 ========== SAVE SUBJECTS STARTED ==========')
    
    try {
      // Validation
      if (!formData.classId) {
        console.log('❌ Validation failed: No class selected')
        showToast('Please select a class', 'error')
        return
      }

      const validSubjects = formData.subjects.filter(s => s.subjectName.trim())
      if (validSubjects.length === 0) {
        console.log('❌ Validation failed: No valid subjects')
        showToast('Please enter at least one subject name', 'error')
        return
      }

      console.log('✅ Validation passed')
      console.log('📝 Valid subjects to save:', validSubjects)
      console.log('🎓 Selected class ID:', formData.classId)

      // Get logged-in user
      console.log('🔍 Getting logged-in user information...')
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('❌ No user found')
        showToast('Error: User not logged in', 'error')
        return
      }

      console.log('✅ User ID retrieved:', userId)
      console.log('✅ School ID retrieved:', schoolId)

      const subjectsToProcess = [...validSubjects]
      const classId = formData.classId
      const selectedClass = classes.find(c => c.id === classId)
      const className = selectedClass?.name || ''
      const standardFee = selectedClass?.standardFee || 0

      console.log('📊 Processing data:', {
        schoolId,
        userId,
        classId,
        className,
        standardFee,
        subjectsCount: subjectsToProcess.length
      })

      const newSubjectsData = []
      let hasErrors = false
      let successCount = 0

      // Process each subject
      for (let i = 0; i < subjectsToProcess.length; i++) {
        const subject = subjectsToProcess[i]
        console.log(`\n🔄 Processing subject ${i + 1}/${subjectsToProcess.length}: "${subject.subjectName}"`)
        
        let subjectId = null

        // Step 1: Check if subject already exists
        console.log('  ├─ Step 1: Checking if subject exists...')
        
        const { data: existingSubject, error: checkError } = await supabase
          .from('subjects')
          .select('id, subject_name, subject_code')
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .eq('subject_name', subject.subjectName)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('  ├─ ❌ Error checking existing subject:', checkError)
          showToast(`Error checking subject: ${subject.subjectName}`, 'error')
          hasErrors = true
          continue
        }

        if (existingSubject) {
          subjectId = existingSubject.id
          console.log('  ├─ ✅ Subject already exists with ID:', subjectId)
          console.log('  ├─ Existing subject details:', existingSubject)
        } else {
          // Step 2: Create new subject
          console.log('  ├─ Step 2: Creating new subject...')
          
          const subjectData = {
            user_id: userId,
            school_id: schoolId,
            subject_name: subject.subjectName,
            subject_code: subject.subjectCode?.trim() || null,
            created_by: userId
          }
          console.log('  ├─ Subject data to insert:', subjectData)

          const { data: newSubject, error: subjectError } = await supabase
            .from('subjects')
            .insert(subjectData)
            .select('id')
            .single()

          if (subjectError) {
            console.error('  ├─ ❌ Error creating subject:', subjectError)
            console.error('  ├─ Error code:', subjectError.code)
            console.error('  ├─ Error message:', subjectError.message)
            
            // If it's a conflict error (409 or 23505), try to fetch the existing record
            if (subjectError.code === '23505' || subjectError.message?.includes('duplicate') || subjectError.message?.includes('unique')) {
              console.log('  ├─ ⚠️ Conflict detected, fetching existing subject...')
              const { data: retryExisting, error: retryError } = await supabase
                .from('subjects')
                .select('id')
                .eq('user_id', userId)
                .eq('school_id', schoolId)
                .eq('subject_name', subject.subjectName)
                .maybeSingle()
              
              if (retryError) {
                console.error('  ├─ ❌ Error fetching existing subject:', retryError)
                showToast(`Failed to handle subject: ${subject.subjectName}`, 'error')
                hasErrors = true
                continue
              }
              
              if (retryExisting) {
                subjectId = retryExisting.id
                console.log('  ├─ ✅ Found existing subject with ID:', subjectId)
              } else {
                showToast(`Subject "${subject.subjectName}" exists but couldn't be retrieved`, 'error')
                hasErrors = true
                continue
              }
            } else {
              showToast(`Failed to create subject: ${subject.subjectName}`, 'error')
              hasErrors = true
              continue
            }
          } else {
            subjectId = newSubject.id
            console.log('  ├─ ✅ New subject created with ID:', subjectId)
          }
        }

        // At this point, we should have a valid subjectId
        if (!subjectId) {
          console.error('  ├─ ❌ No subject ID available')
          showToast(`Failed to process subject: ${subject.subjectName}`, 'error')
          hasErrors = true
          continue
        }

        // Step 3: Check if class-subject relationship already exists
        console.log('  ├─ Step 3: Checking class-subject relationship...')
        const { data: existingRelation, error: relationCheckError } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
          .maybeSingle()

        if (relationCheckError && relationCheckError.code !== 'PGRST116') {
          console.error('  ├─ ❌ Error checking relation:', relationCheckError)
          showToast(`Error checking relation for: ${subject.subjectName}`, 'error')
          hasErrors = true
          continue
        }

        if (existingRelation) {
          console.log('  ├─ ⚠️ Relationship already exists, skipping...')
          showToast(`Subject "${subject.subjectName}" is already assigned to ${className}`, 'error')
          hasErrors = true
          continue
        }

        // Step 4: Create class-subject relationship
        console.log('  ├─ Step 4: Creating class-subject relationship...')
        const relationData = {
          user_id: userId,
          school_id: schoolId,
          class_id: classId,
          subject_id: subjectId,
          is_compulsory: true,
          created_by: userId
        }
        console.log('  ├─ Relationship data to insert:', relationData)

        const { data: newRelation, error: classSubjectError } = await supabase
          .from('class_subjects')
          .insert(relationData)
          .select('id')
          .single()

        if (classSubjectError) {
          console.error('  ├─ ❌ Error creating relationship:', classSubjectError)
          console.error('  ├─ Error code:', classSubjectError.code)
          console.error('  ├─ Error message:', classSubjectError.message)
          
          if (classSubjectError.code === '23505' || classSubjectError.message?.includes('duplicate')) {
            showToast(`Subject "${subject.subjectName}" is already assigned to ${className}`, 'error')
          } else {
            showToast(`Failed to assign subject: ${subject.subjectName}`, 'error')
          }
          hasErrors = true
          continue
        }

        console.log('  └─ ✅ SUCCESS! Relationship created with ID:', newRelation.id)
        successCount++

        // Add to results array
        newSubjectsData.push({
          id: newRelation.id,
          classId: classId,
          className: className,
          standardFee: standardFee,
          subjectId: subjectId,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode || ''
        })
      }

      console.log('\n📊 ========== PROCESSING COMPLETE ==========')
      console.log('✅ Successfully processed:', successCount)
      console.log('❌ Failed:', subjectsToProcess.length - successCount)
      console.log('📝 New subjects data:', newSubjectsData)

      // Close sidebar and reset form AFTER all operations complete
      console.log('🚪 Closing sidebar and resetting form...')
      setShowSidebar(false)
      setFormData({ classId: '', subjects: [{ subjectName: '', subjectCode: '' }] })

      // Update subjects state in real-time
      if (newSubjectsData.length > 0) {
        console.log('🔄 Updating UI with new subjects...')
        setSubjects(prev => [...prev, ...newSubjectsData.map((item, idx) => ({
          id: item.id,
          sr: prev.length + idx + 1,
          classId: item.classId,
          className: item.className,
          standardFee: item.standardFee || 0,
          subjectId: item.subjectId,
          subjectName: item.subjectName,
          subjectCode: item.subjectCode,
          teacher: '-',
          isCompulsory: true
        }))])

        if (hasErrors) {
          showToast(`${newSubjectsData.length} subject(s) added successfully!`, 'success')
        } else {
          showToast('Subjects added successfully!', 'success')
        }
      } else {
        if (hasErrors) {
          showToast('Failed to add subjects. Please check the console for details.', 'error')
        } else {
          showToast('No new subjects were added', 'error')
        }
      }

      console.log('✅ ========== SAVE COMPLETE ==========\n')

    } catch (error) {
      console.error('❌ ========== UNEXPECTED ERROR ==========')
      console.error('Error:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      console.error('========================================\n')
      showToast('An unexpected error occurred while saving', 'error')
    }
  }

  const addSubjectField = () => {
    setFormData({
      ...formData,
      subjects: [...formData.subjects, { subjectName: '', subjectCode: '' }]
    })
  }

  const removeSubjectField = (index) => {
    if (formData.subjects.length > 1) {
      const newSubjects = formData.subjects.filter((_, i) => i !== index)
      setFormData({ ...formData, subjects: newSubjects })
    }
  }

  const updateSubjectField = (index, field, value) => {
    const newSubjects = [...formData.subjects]
    newSubjects[index][field] = value
    setFormData({ ...formData, subjects: newSubjects })
  }

  const handleCopyFromClass = async () => {
    if (!copyFromClassId) {
      showToast('Please select a class to copy from', 'error')
      return
    }

    if (!formData.classId) {
      showToast('Please select a target class first', 'error')
      return
    }

    if (copyFromClassId === formData.classId) {
      showToast('Cannot copy from the same class', 'error')
      return
    }

    setCopying(true)
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
        return
      }

      // Fetch subjects from the selected class using class_subjects table
      const { data: subjectsData, error } = await supabase
        .from('class_subjects')
        .select(`
          subjects:subject_id (subject_name, subject_code)
        `)
        .eq('class_id', copyFromClassId)
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('Error fetching subjects:', error)
        showToast('Error fetching subjects from selected class', 'error')
        return
      }

      if (!subjectsData || subjectsData.length === 0) {
        showToast('No subjects found in the selected class', 'error')
        return
      }

      // Map the fetched subjects to form data format
      const copiedSubjects = subjectsData
        .filter(item => item.subjects) // Filter out null subjects
        .map(item => ({
          subjectName: item.subjects.subject_name,
          subjectCode: item.subjects.subject_code || ''
        }))

      if (copiedSubjects.length === 0) {
        showToast('No subjects found in the selected class', 'error')
        return
      }

      setFormData({
        ...formData,
        subjects: copiedSubjects
      })

      const className = classes.find(c => c.id === copyFromClassId)?.name || 'selected class'
      showToast(`Successfully copied ${copiedSubjects.length} subjects from ${className}`, 'success')
      setCopyFromClassId('')
    } catch (error) {
      console.error('Error copying subjects:', error)
      showToast('Error copying subjects', 'error')
    } finally {
      setCopying(false)
    }
  }

  const addEditSubjectField = () => {
    setEditFormData({
      ...editFormData,
      subjects: [...editFormData.subjects, { subjectName: '', subjectCode: '' }]
    })
  }

  const removeEditSubjectField = (index) => {
    if (editFormData.subjects.length > 1) {
      const newSubjects = editFormData.subjects.filter((_, i) => i !== index)
      setEditFormData({ ...editFormData, subjects: newSubjects })
    }
  }

  const updateEditSubjectField = (index, field, value) => {
    const newSubjects = [...editFormData.subjects]
    newSubjects[index][field] = value
    setEditFormData({ ...editFormData, subjects: newSubjects })
  }

  const handleUpdate = async () => {
    console.log('🚀 ========== UPDATE SUBJECTS STARTED ==========')

    try {
      // Validation
      if (!editFormData.classId) {
        console.log('❌ Validation failed: No class selected')
        showToast('Please select a class', 'error')
        return
      }

      const validSubjects = editFormData.subjects.filter(s => s.subjectName.trim())
      if (validSubjects.length === 0) {
        console.log('❌ Validation failed: No valid subjects')
        showToast('Please enter at least one subject name', 'error')
        return
      }

      console.log('✅ Validation passed')
      console.log('📝 Valid subjects to update:', validSubjects)

      // Get logged-in user
      console.log('🔍 Getting logged-in user information...')
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('❌ No user found')
        showToast('Error: User not logged in', 'error')
        return
      }

      console.log('✅ User ID retrieved:', userId)
      console.log('✅ School ID retrieved:', schoolId)

      const subjectsToDelete = selectedSubject.subjects
        .filter(s => !editFormData.subjects.find(es => es.id === s.id))
      const subjectsToProcess = [...validSubjects]
      const classId = editFormData.classId
      const selectedClass = classes.find(c => c.id === classId)
      const className = selectedClass?.name || selectedSubject.className
      const standardFee = selectedClass?.standardFee || selectedSubject.standardFee || 0

      console.log('📊 Processing data:', {
        schoolId,
        userId,
        classId,
        className,
        standardFee,
        subjectsToDelete: subjectsToDelete.length,
        subjectsToProcess: subjectsToProcess.length
      })

      // Process deletions
      console.log('\n🗑️  Processing deletions...')
      const deletedIds = []
      let deletionErrors = 0

      for (const subject of subjectsToDelete) {
        console.log(`  ├─ Deleting: "${subject.subjectName}"`)
        const { error } = await supabase
          .from('class_subjects')
          .delete()
          .eq('id', subject.id)

        if (error) {
          console.error(`  ├─ ❌ Error deleting subject:`, error)
          deletionErrors++
        } else {
          console.log(`  ├─ ✅ Deleted successfully`)
          deletedIds.push(subject.id)
        }
      }

      console.log(`✅ Deletions complete: ${deletedIds.length} deleted, ${deletionErrors} errors`)

      // Process updates and additions
      const newSubjectsData = []
      let updateErrors = 0
      let updateSuccess = 0

      for (let i = 0; i < subjectsToProcess.length; i++) {
        const subject = subjectsToProcess[i]
        console.log(`\n🔄 Processing subject ${i + 1}/${subjectsToProcess.length}: "${subject.subjectName}"`)

        if (subject.id && subject.subjectId) {
          // Update existing subject
          console.log('  ├─ Mode: UPDATE existing subject')
          console.log('  ├─ Subject ID:', subject.subjectId)

          const { error: updateError } = await supabase
            .from('subjects')
            .update({
              subject_name: subject.subjectName,
              subject_code: subject.subjectCode?.trim() || null
            })
            .eq('id', subject.subjectId)

          if (updateError) {
            console.error('  ├─ ❌ Error updating subject:', updateError)
            showToast(`Failed to update subject: ${subject.subjectName}`, 'error')
            updateErrors++
          } else {
            console.log('  └─ ✅ Updated successfully')
            updateSuccess++
          }
        } else {
          // Create new subject
          console.log('  ├─ Mode: CREATE new subject')
          let subjectId = null

          // Check if subject exists
          console.log('  ├─ Step 1: Checking if subject exists...')
          const { data: existingSubject, error: checkError } = await supabase
            .from('subjects')
            .select('id')
            .eq('school_id', schoolId)
            .eq('subject_name', subject.subjectName)
            .maybeSingle()

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('  ├─ ❌ Error checking existing subject:', checkError)
            showToast(`Error checking subject: ${subject.subjectName}`, 'error')
            updateErrors++
            continue
          }

          if (existingSubject) {
            subjectId = existingSubject.id
            console.log('  ├─ ✅ Subject already exists with ID:', subjectId)
          } else {
            // Create new subject
            console.log('  ├─ Step 2: Creating new subject...')
            const { data: newSubject, error: subjectError } = await supabase
              .from('subjects')
              .insert({
                school_id: schoolId,
                subject_name: subject.subjectName,
                subject_code: subject.subjectCode?.trim() || null,
                created_by: userId
              })
              .select('id')
              .single()

            if (subjectError) {
              console.error('  ├─ ❌ Error creating subject:', subjectError)
              showToast(`Failed to create subject: ${subject.subjectName}`, 'error')
              updateErrors++
              continue
            }

            subjectId = newSubject.id
            console.log('  ├─ ✅ New subject created with ID:', subjectId)
          }

          // Create class-subject relationship
          console.log('  ├─ Step 3: Checking class-subject relationship...')
          const { data: existingRelation, error: relationCheckError } = await supabase
            .from('class_subjects')
            .select('id')
            .eq('school_id', schoolId)
            .eq('class_id', classId)
            .eq('subject_id', subjectId)
            .maybeSingle()

          if (relationCheckError && relationCheckError.code !== 'PGRST116') {
            console.error('  ├─ ❌ Error checking relation:', relationCheckError)
            showToast(`Error checking relation for: ${subject.subjectName}`, 'error')
            updateErrors++
            continue
          }

          if (existingRelation) {
            console.log('  ├─ ⚠️ Relationship already exists')
            updateSuccess++
          } else {
            console.log('  ├─ Step 4: Creating class-subject relationship...')
            const { data, error: classSubjectError } = await supabase
              .from('class_subjects')
              .insert({
                school_id: schoolId,
                class_id: classId,
                subject_id: subjectId,
                is_compulsory: true,
                created_by: userId
              })
              .select('id')
              .single()

            if (classSubjectError) {
              console.error('  ├─ ❌ Error creating relationship:', classSubjectError)
              showToast(`Failed to assign subject: ${subject.subjectName}`, 'error')
              updateErrors++
              continue
            }

            console.log('  └─ ✅ Relationship created with ID:', data.id)
            updateSuccess++

            newSubjectsData.push({
              id: data.id,
              classId: classId,
              className: classes.find(c => c.id === classId)?.name || className,
              standardFee: standardFee,
              subjectId: subjectId,
              subjectName: subject.subjectName,
              subjectCode: subject.subjectCode
            })
          }
        }
      }

      console.log('\n📊 ========== PROCESSING COMPLETE ==========')
      console.log('✅ Successfully updated/added:', updateSuccess)
      console.log('❌ Failed:', updateErrors)
      console.log('🗑️  Deleted:', deletedIds.length)

      // Only close sidebar and update UI if there were no errors OR if some operations succeeded
      if (updateErrors === 0 || updateSuccess > 0 || deletedIds.length > 0) {
        console.log('🚪 Closing sidebar and resetting form...')
        setShowEditSidebar(false)
        setSelectedSubject(null)
        setEditFormData({ classId: '', subjects: [] })

        // Update subjects state in real-time
        console.log('🔄 Updating UI...')
        setSubjects(prev => {
          // Remove deleted subjects
          let updated = prev.filter(s => !deletedIds.includes(s.id))

          // Update existing subjects
          updated = updated.map(s => {
            const editedSubject = validSubjects.find(es => es.id === s.id)
            if (editedSubject) {
              return {
                ...s,
                subjectName: editedSubject.subjectName,
                subjectCode: editedSubject.subjectCode
              }
            }
            return s
          })

          // Add new subjects
          if (newSubjectsData.length > 0) {
            updated = [...updated, ...newSubjectsData.map((item, idx) => ({
              id: item.id,
              sr: updated.length + idx + 1,
              classId: item.classId,
              className: item.className,
              standardFee: item.standardFee || 0,
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              subjectCode: item.subjectCode,
              teacher: '-',
              isCompulsory: true
            }))]
          }

          return updated
        })

        if (updateErrors > 0) {
          showToast(`Partially updated: ${updateSuccess} succeeded, ${updateErrors} failed`, 'error')
        } else {
          showToast('Subjects updated successfully!', 'success')
        }
      } else {
        console.error('❌ All operations failed, keeping sidebar open')
        showToast('Failed to update subjects. Please try again.', 'error')
      }

      console.log('✅ ========== UPDATE COMPLETE ==========\n')

    } catch (error) {
      console.error('❌ ========== UNEXPECTED ERROR ==========')
      console.error('Error:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      console.error('========================================\n')
      showToast('An unexpected error occurred while updating', 'error')
    }
  }

  const confirmDelete = async () => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const deletedIds = []
      const deletedClassName = selectedSubject.className

      for (const subject of selectedSubject.subjects) {
        const { error } = await supabase
          .from('class_subjects')
          .delete()
          .eq('id', subject.id)
          .eq('user_id', userId)
          .eq('school_id', schoolId)

        if (error) {
          console.error('Error deleting subject:', error)
          showToast(`Failed to delete subject: ${subject.subjectName}`, 'error')
        } else {
          deletedIds.push(subject.id)
        }
      }

      setShowDeleteModal(false)
      setSelectedSubject(null)

      // Update subjects state in real-time
      setSubjects(prev => prev.filter(s => !deletedIds.includes(s.id)))

      showToast(`Subjects from "${deletedClassName}" deleted successfully!`, 'success')
    } catch (error) {
      console.error('Error deleting subjects:', error)
      showToast('An error occurred while deleting', 'error')
    }
  }

  return (
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
      {/* Top Button */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => setShowSidebar(true)}
          className="bg-[#DC2626] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:bg-red-700 transition flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} className="sm:w-5 sm:h-5" />
          Add Subject
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-2 sm:p-4 lg:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-base lg:text-xl font-bold text-gray-800">Search Subjects</h2>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium"
          >
            <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">Export to Excel</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          {/* Class Filter */}
          <div className="w-full sm:w-48">
            <label className="block text-gray-600 text-xs sm:text-sm mb-1.5 sm:mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1">
            <label className="block text-gray-600 text-xs sm:text-sm mb-1.5 sm:mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} className="sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search by subject name or code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <ResponsiveTableWrapper
        tableView={
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left font-semibold border border-blue-800 w-12 sm:w-16">Sr.</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left font-semibold border border-blue-800 w-24 sm:w-32">Class Name</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left font-semibold border border-blue-800">Subjects</th>
                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center font-semibold border border-blue-800 w-20 sm:w-24">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-2 sm:px-4 py-6 sm:py-8 text-center text-gray-500">
                    Loading subjects...
                  </td>
                </tr>
              ) : groupedSubjectsArray.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-2 sm:px-4 py-6 sm:py-8 text-center text-gray-500">
                    No subjects found
                  </td>
                </tr>
              ) : (
                paginatedSubjects.map((classGroup, index) => (
                  <tr
                    key={classGroup.classId}
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition`}
                  >
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 border border-gray-200 text-blue-600 align-top w-12 sm:w-16">{startIndex + index + 1}</td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 border border-gray-200 font-medium align-top w-24 sm:w-32">{classGroup.className}</td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 border border-gray-200">
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {classGroup.subjects.map((subject) => (
                          <div key={subject.id} className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                            <BookOpen size={12} className="text-blue-600 sm:w-3.5 sm:h-3.5" />
                            <span className="font-medium text-xs sm:text-sm">{subject.subjectName}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2.5 sm:py-3 border border-gray-200 align-top w-20 sm:w-24">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                          onClick={() => {
                            setSelectedSubject({
                              classId: classGroup.classId,
                              className: classGroup.className,
                              subjects: classGroup.subjects
                            })
                            setEditFormData({
                              classId: classGroup.classId,
                              subjects: classGroup.subjects.map(s => ({
                                id: s.id,
                                subjectId: s.subjectId,
                                subjectName: s.subjectName,
                                subjectCode: s.subjectCode
                              }))
                            })
                            setShowEditSidebar(true)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Subjects"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSubject({
                              classId: classGroup.classId,
                              className: classGroup.className,
                              subjects: classGroup.subjects
                            })
                            setShowDeleteModal(true)
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Subjects"
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
        }
        cardView={
          <CardGrid>
            {paginatedSubjects.map((classGroup, index) => (
              <DataCard key={classGroup.classId}>
                <CardHeader
                  srNumber={startIndex + index + 1}
                  photo={classGroup.className.charAt(0)}
                  name={classGroup.className}
                  subtitle={`${classGroup.subjects.length} subject${classGroup.subjects.length !== 1 ? 's' : ''}`}
                />
                <CardInfoGrid>
                  <div className="col-span-2">
                    <div className="text-[10px] text-gray-500 mb-1">Subjects:</div>
                    <div className="flex flex-wrap gap-1">
                      {classGroup.subjects.map((subject) => (
                        <div key={subject.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200">
                          <BookOpen className="w-2.5 h-2.5 text-blue-600" />
                          <span className="text-[10px] font-medium">{subject.subjectName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardInfoGrid>
                <CardActions>
                  <button
                    onClick={() => {
                      setSelectedSubject({
                        classId: classGroup.classId,
                        className: classGroup.className,
                        subjects: classGroup.subjects
                      })
                      setEditFormData({
                        classId: classGroup.classId,
                        subjects: classGroup.subjects.map(s => ({
                          id: s.id,
                          subjectId: s.subjectId,
                          subjectName: s.subjectName,
                          subjectCode: s.subjectCode
                        }))
                      })
                      setShowEditSidebar(true)
                    }}
                    className="p-1 text-teal-600 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSubject({
                        classId: classGroup.classId,
                        className: classGroup.className,
                        subjects: classGroup.subjects
                      })
                      setShowDeleteModal(true)
                    }}
                    className="p-1 text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </CardActions>
              </DataCard>
            ))}
          </CardGrid>
        }
        loading={loading}
        empty={paginatedSubjects.length === 0}
        emptyMessage="No subjects found"
      />

      {/* Pagination Controls */}
        {groupedSubjectsArray.length > 0 && (
          <div className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 bg-gray-50">
            <div className="text-xs sm:text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, groupedSubjectsArray.length)} of {groupedSubjectsArray.length} classes
            </div>
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm transition ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#1E3A8A] text-white hover:bg-blue-900'
                }`}
              >
                Previous
              </button>
              <div className="flex items-center gap-1 sm:gap-2">
                {(() => {
                  const maxVisiblePages = 4
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1)
                  }

                  const pages = []
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i)
                  }

                  return pages.map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium text-sm transition ${
                        currentPage === page
                          ? 'bg-[#1E3A8A] text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))
                })()}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm transition ${
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

      {/* Add Subject Sidebar */}
      {showSidebar && (
        <ModalOverlay onClose={() => setShowSidebar(false)}>
          <div className="fixed top-0 right-0 h-full w-full sm:max-w-md lg:max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base sm:text-xl font-bold">Add New Subject</h3>
                  <p className="text-blue-200 text-xs sm:text-sm mt-1">Fill in the details below</p>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-white hover:bg-white/10 p-1.5 sm:p-2 rounded-full transition"
                >
                  <X size={18} className="sm:w-[22px] sm:h-[22px]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
              <div className="space-y-4 sm:space-y-6">
                {/* Class Selection and Copy from Class - Side by Side */}
                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">
                    {/* Class Selection - Smaller Width */}
                    <div className="w-full sm:flex-shrink-0 sm:w-64">
                      <label className="block text-gray-800 font-semibold mb-2 text-sm uppercase tracking-wide">
                        Class <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.classId}
                          onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 appearance-none text-sm"
                          disabled={loadingClasses}
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      </div>
                      {loadingClasses && (
                        <p className="text-xs text-gray-500 mt-2">Loading...</p>
                      )}
                      {!loadingClasses && classes.length === 0 && (
                        <p className="text-xs text-red-500 mt-2">⚠️ No classes found!</p>
                      )}
                      {!loadingClasses && classes.length > 0 && (
                        <p className="text-xs text-green-600 mt-2">✓ {classes.length} classes</p>
                      )}
                    </div>

                    {/* Copy from Class - Optional, shown when class is selected */}
                    {formData.classId && (
                      <div className="w-full sm:flex-1">
                        <label className="block text-gray-800 font-semibold mb-2 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                          <BookOpen size={14} className="text-blue-600 sm:w-4 sm:h-4" />
                          Copy from Class <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <div className="relative flex-1">
                            <select
                              value={copyFromClassId}
                              onChange={(e) => setCopyFromClassId(e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all hover:border-gray-400 appearance-none text-sm"
                              disabled={loadingClasses}
                            >
                              <option value="">-- Select to copy subjects</option>
                              {classes.filter(cls => cls.id !== formData.classId).map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                  {cls.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyFromClass}
                            disabled={!copyFromClassId || copying}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
                          >
                            {copying ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Copying...
                              </>
                            ) : (
                              <>
                                <Plus size={16} />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        {copyFromClassId && (
                          <p className="text-xs text-blue-600 mt-2">
                            ✨ Click "Copy" to load subjects from {classes.find(c => c.id === copyFromClassId)?.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-gray-800 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                      Subjects <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addSubjectField}
                      className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold flex items-center gap-1"
                    >
                      <Plus size={14} className="sm:w-4 sm:h-4" />
                      Add More
                    </button>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {formData.subjects.map((subject, index) => (
                      <div key={index} className="relative p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-gray-600">Subject {index + 1}</span>
                          {formData.subjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSubjectField(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <input
                            type="text"
                            value={subject.subjectName}
                            onChange={(e) => updateSubjectField(index, 'subjectName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                            placeholder="Subject name (e.g., Mathematics)"
                          />

                          <input
                            type="text"
                            value={subject.subjectCode}
                            onChange={(e) => updateSubjectField(index, 'subjectCode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                            placeholder="Subject code (e.g., MTH-01)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 sm:px-6 py-4 sm:py-5 bg-white">
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowSidebar(false)}
                  className="flex-1 px-3 sm:px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg hover:shadow-xl text-sm"
                >
                  <Plus size={14} className="sm:w-4 sm:h-4" />
                  Save Subjects
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Edit Subject Sidebar */}
      {showEditSidebar && (
        <ModalOverlay onClose={() => setShowEditSidebar(false)}>
          <div className="fixed top-0 right-0 h-full w-full sm:max-w-md lg:max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base sm:text-xl font-bold">Edit Subjects</h3>
                  <p className="text-blue-200 text-xs sm:text-sm mt-1">Update subject details</p>
                </div>
                <button
                  onClick={() => setShowEditSidebar(false)}
                  className="text-white hover:bg-white/10 p-1.5 sm:p-2 rounded-full transition"
                >
                  <X size={18} className="sm:w-[22px] sm:h-[22px]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-wide">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={editFormData.classId}
                      onChange={(e) => setEditFormData({ ...editFormData, classId: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 appearance-none text-sm"
                      disabled={loadingClasses}
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-gray-800 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                      Subjects <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addEditSubjectField}
                      className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold flex items-center gap-1"
                    >
                      <Plus size={14} className="sm:w-4 sm:h-4" />
                      Add More
                    </button>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {editFormData.subjects.map((subject, index) => (
                      <div key={index} className="relative p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-gray-600">Subject {index + 1}</span>
                          {editFormData.subjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditSubjectField(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <input
                            type="text"
                            value={subject.subjectName}
                            onChange={(e) => updateEditSubjectField(index, 'subjectName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                            placeholder="Subject name (e.g., Mathematics)"
                          />

                          <input
                            type="text"
                            value={subject.subjectCode}
                            onChange={(e) => updateEditSubjectField(index, 'subjectCode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                            placeholder="Subject code (e.g., MTH-01)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 sm:px-6 py-4 sm:py-5 bg-white">
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowEditSidebar(false)}
                  className="flex-1 px-3 sm:px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg hover:shadow-xl text-sm"
                >
                  <Edit2 size={14} className="sm:w-4 sm:h-4" />
                  Update Subjects
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSubject && (
        <ModalOverlay onClose={() => setShowDeleteModal(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95%] sm:max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
                <h3 className="text-base sm:text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-gray-700 mb-3 sm:mb-4 text-sm">
                  Are you sure you want to delete all subjects from <span className="font-bold">{selectedSubject.className}</span>?
                </p>
                <div className="mb-4 sm:mb-6 p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs sm:text-sm font-semibold text-red-800 mb-2">Subjects to be deleted:</p>
                  <ul className="text-xs sm:text-sm text-red-700 space-y-1">
                    {selectedSubject.subjects.map((subject) => (
                      <li key={subject.id}>• {subject.subjectName} {subject.subjectCode && `(${subject.subjectCode})`}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-2 sm:mt-3">This action cannot be undone.</p>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-3 sm:px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                  >
                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                    Delete All
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

export default function SubjectsPage() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const user = getUserFromCookie()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="classes_subjects_view"
      pageName="Subjects"
    >
      <SubjectsContent />
    </PermissionGuard>
  )
}