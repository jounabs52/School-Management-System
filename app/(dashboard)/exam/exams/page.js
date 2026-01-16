'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Plus, Search, Save, AlertCircle, CheckCircle, Edit, Trash2, FileText } from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'

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

function ExamsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [exams, setExams] = useState([])
  const [allDatesheets, setAllDatesheets] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const [activeTab, setActiveTab] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentExamId, setCurrentExamId] = useState(null)

  // Form States
  const [selectedDatesheet, setSelectedDatesheet] = useState('')
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [resultDate, setResultDate] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [totalMarks, setTotalMarks] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [subjectMarks, setSubjectMarks] = useState({}) // Store total marks per subject
  const [details, setDetails] = useState('')
  const [currentSession, setCurrentSession] = useState(null)

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmButtonColor: 'red' // 'red' for delete, 'blue' for others
  })

  // Filter States
  const [filterExam, setFilterExam] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClasses, setFilterClasses] = useState([])
  const [filterSections, setFilterSections] = useState([])
  const [filterSubjects, setFilterSubjects] = useState([])

  const showToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showConfirmDialog = (title, message, onConfirm, confirmButtonColor = 'red') => {
    setConfirmDialog({ show: true, title, message, onConfirm, confirmButtonColor })
  }

  const hideConfirmDialog = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, confirmButtonColor: 'red' })
  }

  // Apply blur effect to sidebar and disable background scrolling when modal is open
  useEffect(() => {
    const anyModalOpen = showModal || confirmDialog.show

    if (anyModalOpen) {
      document.body.style.overflow = 'hidden'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = 'blur(4px)'
        sidebar.style.pointerEvents = 'none'
      }
    } else {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }

    return () => {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }
  }, [showModal, confirmDialog.show])

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
    }

    const userData = getCookie('user-data')
    if (userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData))
        setCurrentUser(user)
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchExams()
      fetchAllDatesheets()
      fetchAllClasses()
      fetchAllSections()
      fetchAllSubjects()
      fetchCurrentSession()
    }
  }, [currentUser])

  useEffect(() => {
    if (selectedDatesheet && currentUser?.school_id && !editMode) {
      fetchDatesheetDetails()
      fetchClassesForSelectedDatesheet()
    } else if (!selectedDatesheet) {
      setClasses([])
      setSelectedClass('')
    }
  }, [selectedDatesheet])

  useEffect(() => {
    if (selectedClass && currentUser?.school_id) {
      fetchSections()
      fetchSubjectsForClass()
    } else {
      setSections([])
      setSubjects([])
    }
  }, [selectedClass])

  // Filter effects
  useEffect(() => {
    if (filterExam && currentUser?.school_id) {
      fetchFilterClassesForExam()
    } else {
      setFilterClasses([])
      setFilterClass('')
    }
  }, [filterExam])

  useEffect(() => {
    if (filterClass && currentUser?.school_id) {
      fetchFilterSections()
      fetchFilterSubjects()
    } else {
      setFilterSections([])
      setFilterSubjects([])
      setFilterSection('')
    }
  }, [filterClass])

  const fetchExams = async () => {
    try {
      let query = supabase
        .from('exams')
        .select(`
          *,
          classes (
            id,
            class_name
          ),
          sections (
            id,
            section_name
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filterClass) {
        query = query.eq('class_id', filterClass)
      }
      if (filterSection) {
        query = query.eq('section_id', filterSection)
      }

      const { data, error } = await query

      if (error) throw error

      // Fetch schedules for each exam to get subjects
      const examsWithSubjects = await Promise.all(
        (data || []).map(async (exam) => {
          const { data: schedules } = await supabase
            .from('exam_schedules')
            .select('subject_id, subjects(subject_name)')
            .eq('exam_id', exam.id)

          return {
            ...exam,
            subjects: schedules?.map(s => s.subjects?.subject_name).filter(Boolean).join(', ') || 'N/A'
          }
        })
      )

      setExams(examsWithSubjects)
    } catch (error) {
      console.error('Error fetching exams:', error)
    }
  }

  const fetchCurrentSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('is_current', true)
        .single()

      if (error) {
        console.warn('No current session found:', error)
        setCurrentSession(null)
      } else {
        setCurrentSession(data)
      }
    } catch (error) {
      console.error('Error fetching session:', error)
      setCurrentSession(null)
    }
  }

  const fetchAllDatesheets = async () => {
    try {
      const { data, error } = await supabase
        .from('datesheets')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllDatesheets(data || [])
    } catch (error) {
      console.error('Error fetching datesheets:', error)
    }
  }

  const fetchDatesheetDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('datesheets')
        .select('*')
        .eq('id', selectedDatesheet)
        .single()

      if (error) throw error

      // Pre-fill form with datesheet data
      if (data) {
        setExamName(data.title || data.exam_name || '')
        setExamDate(data.start_date || data.exam_date || '')
        setResultDate(data.result_date || '')
        setTotalMarks(data.total_marks?.toString() || '')
        setDetails(data.details || '')
      }
    } catch (error) {
      console.error('Error fetching datesheet details:', error)
    }
  }

  const fetchClassesForSelectedDatesheet = async () => {
    try {
      // Get distinct class IDs from datesheet_schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('datesheet_schedules')
        .select('class_id')
        .eq('datesheet_id', selectedDatesheet)

      if (schedulesError) throw schedulesError

      const classIds = [...new Set(schedules?.map(s => s.class_id) || [])]

      if (classIds.length === 0) {
        setClasses([])
        return
      }

      // Fetch the actual class details
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('class_name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes for datesheet:', error)
      setClasses([])
    }
  }

  const fetchAllClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('class_name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('section_name')

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Error fetching sections:', error)
    }
  }

  const fetchAllSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('section_name')

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Error fetching sections:', error)
    }
  }

  const fetchSubjectsForClass = async () => {
    try {
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          subject_id,
          subjects (
            id,
            subject_name,
            subject_code
          )
        `)
        .eq('school_id', currentUser.school_id)
        .eq('class_id', selectedClass)

      if (error) throw error
      setSubjects(data?.map(cs => cs.subjects).filter(Boolean) || [])
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const fetchAllSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('subject_name')

      if (error) throw error
      setAllSubjects(data || [])
    } catch (error) {
      console.error('Error fetching all subjects:', error)
    }
  }

  // Filter fetch functions
  const fetchFilterClassesForExam = async () => {
    try {
      // Get the exam details to find its class
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('class_id')
        .eq('id', filterExam)
        .single()

      if (examError) throw examError

      if (examData?.class_id) {
        // Fetch the class details
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('id', examData.class_id)
          .eq('school_id', currentUser.school_id)
          .eq('status', 'active')

        if (error) throw error
        setFilterClasses(data || [])

        // Auto-select the class if only one
        if (data?.length === 1) {
          setFilterClass(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching filter classes:', error)
      setFilterClasses([])
    }
  }

  const fetchFilterSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('class_id', filterClass)
        .eq('status', 'active')
        .order('section_name')

      if (error) throw error
      setFilterSections(data || [])
    } catch (error) {
      console.error('Error fetching filter sections:', error)
      setFilterSections([])
    }
  }

  const fetchFilterSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          subject_id,
          subjects (
            id,
            subject_name,
            subject_code
          )
        `)
        .eq('school_id', currentUser.school_id)
        .eq('class_id', filterClass)

      if (error) throw error
      setFilterSubjects(data?.map(cs => cs.subjects).filter(Boolean) || [])
    } catch (error) {
      console.error('Error fetching filter subjects:', error)
      setFilterSubjects([])
    }
  }

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        // Remove subject and its marks
        setSubjectMarks(prevMarks => {
          const newMarks = { ...prevMarks }
          delete newMarks[subjectId]
          return newMarks
        })
        return prev.filter(id => id !== subjectId)
      } else {
        // Add subject with empty marks
        setSubjectMarks(prevMarks => ({
          ...prevMarks,
          [subjectId]: ''
        }))
        return [...prev, subjectId]
      }
    })
  }

  const handleSubjectMarksChange = (subjectId, marks) => {
    setSubjectMarks(prev => ({
      ...prev,
      [subjectId]: marks
    }))
  }

  const handleSubmit = async () => {
    // Validate all required fields
    if (!examName || !examDate || !selectedClass || selectedSubjects.length === 0) {
      showToast('Please fill all required fields', 'error')
      return
    }

    // Validate that all selected subjects have marks
    const missingMarks = selectedSubjects.some(subjectId => !subjectMarks[subjectId] || subjectMarks[subjectId] === '')
    if (missingMarks) {
      showToast('Please enter total marks for all selected subjects', 'error')
      return
    }

    if (!currentSession || !currentSession.id) {
      showToast('No active session found. Please set up an academic session first.', 'error')
      return
    }

    setLoading(true)
    try {
      let examId

      // Calculate total marks as sum of all subject marks
      const calculatedTotalMarks = selectedSubjects.reduce((sum, subjectId) => {
        return sum + parseFloat(subjectMarks[subjectId] || 0)
      }, 0)

      if (editMode && currentExamId) {
        // Update existing exam
        const newExamData = {
          school_id: currentUser.school_id,
          user_id: currentUser.id,
          session_id: currentSession.id,
          exam_name: examName,
          start_date: examDate,
          end_date: examDate,
          result_declaration_date: resultDate || null,
          class_id: selectedClass,
          section_id: selectedSection || null,
          total_marks: calculatedTotalMarks,
          details: details || null,
          status: 'scheduled',
          created_by: currentUser.id
        }

        const { error } = await supabase
          .from('exams')
          .update(newExamData)
          .eq('id', currentExamId)
          .eq('school_id', currentUser.school_id)

        if (error) throw error

        // Delete old schedules
        await supabase
          .from('exam_schedules')
          .delete()
          .eq('exam_id', currentExamId)
          .eq('school_id', currentUser.school_id)

        examId = currentExamId
      } else {
        // Always create new exam in exams table (whether from datesheet or not)
        const newExamData = {
          school_id: currentUser.school_id,
          user_id: currentUser.id,
          session_id: currentSession.id,
          exam_name: examName,
          start_date: examDate,
          end_date: examDate,
          result_declaration_date: resultDate || null,
          class_id: selectedClass,
          section_id: selectedSection || null,
          total_marks: calculatedTotalMarks,
          details: details || null,
          status: 'scheduled',
          created_by: currentUser.id
        }

        const { data, error } = await supabase
          .from('exams')
          .insert(newExamData)
          .select()
          .single()

        if (error) throw error
        examId = data.id
      }

      // Always insert into exam_schedules with subject-specific marks
      const schedules = selectedSubjects.map(subjectId => ({
        school_id: currentUser.school_id,
        user_id: currentUser.id,
        exam_id: examId,
        class_id: selectedClass,
        subject_id: subjectId,
        exam_date: examDate,
        start_time: '09:00',
        end_time: '12:00',
        total_marks: parseFloat(subjectMarks[subjectId]),
        passing_marks: parseFloat(subjectMarks[subjectId]) * 0.4,
        created_by: currentUser.id
      }))

      const { error: scheduleError } = await supabase
        .from('exam_schedules')
        .insert(schedules)

      if (scheduleError) {
        console.error('Schedule error:', scheduleError)
        throw scheduleError
      }

      // Only show success after both operations complete
      showToast(editMode ? 'Exam updated successfully' : 'Exam created successfully', 'success')

      fetchExams()
      resetForm()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving exam:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      showToast(`Failed to save exam: ${error.message || 'Unknown error'}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEditExam = async (exam) => {
    setEditMode(true)
    setCurrentExamId(exam.id)
    setExamName(exam.exam_name)
    setExamDate(exam.start_date)
    setResultDate(exam.result_declaration_date || '')
    setSelectedClass(exam.class_id)
    setSelectedSection(exam.section_id || '')
    setTotalMarks(exam.total_marks?.toString() || '')
    setDetails(exam.details || '')

    // Fetch schedules to get selected subjects and their marks
    try {
      const { data, error } = await supabase
        .from('exam_schedules')
        .select('subject_id, total_marks')
        .eq('exam_id', exam.id)

      if (error) throw error

      const subjects = data?.map(s => s.subject_id) || []
      const marks = {}
      data?.forEach(s => {
        marks[s.subject_id] = s.total_marks?.toString() || ''
      })

      setSelectedSubjects(subjects)
      setSubjectMarks(marks)
    } catch (error) {
      console.error('Error fetching exam schedules:', error)
    }

    setShowModal(true)
  }

  const handleDeleteExam = async (examId) => {
    showConfirmDialog(
      'Delete Exam',
      'Are you sure you want to delete this exam? This will also delete all associated schedules and marks.',
      async () => {
        hideConfirmDialog()
        setLoading(true)
        try {
          // Delete schedules first
          await supabase
            .from('exam_schedules')
            .delete()
            .eq('exam_id', examId)
            .eq('school_id', currentUser.school_id)

          // Delete marks
          await supabase
            .from('exam_marks')
            .delete()
            .eq('exam_id', examId)
            .eq('school_id', currentUser.school_id)

          // Delete exam
          const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', examId)
            .eq('school_id', currentUser.school_id)

          if (error) throw error

          showToast('Exam deleted successfully', 'success')
          fetchExams()
        } catch (error) {
          console.error('Error deleting exam:', error)
          showToast('Failed to delete exam', 'error')
        } finally {
          setLoading(false)
        }
      },
      'red'
    )
  }

  const handleStatusChange = async (examId, newStatus) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('exams')
        .update({ status: newStatus })
        .eq('id', examId)
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      showToast(`Exam status changed to ${newStatus}`, 'success')
      fetchExams()
    } catch (error) {
      console.error('Error updating exam status:', error)
      showToast('Failed to update exam status', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedDatesheet('')
    setExamName('')
    setExamDate('')
    setResultDate('')
    setSelectedClass('')
    setSelectedSection('')
    setTotalMarks('')
    setDetails('')
    setSelectedSubjects([])
    setSubjectMarks({})
    setEditMode(false)
    setCurrentExamId(null)
  }

  const filteredExams = exams.filter(exam => {
    const matchesSearch = searchQuery === '' ||
      exam.exam_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.classes?.class_name?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  return (
    <div className="p-1">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg bg-green-600 text-white"
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            <span className="text-sm">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add New Exam
            </button>
          </div>
        </div>

        {activeTab === 'list' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <select
                value={filterExam}
                onChange={(e) => setFilterExam(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Select Exam</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.id}>{exam.exam_name}</option>
                ))}
              </select>

              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                disabled={!filterExam}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="">Select Class</option>
                {filterClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                ))}
              </select>

              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                disabled={!filterClass}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="">All Sections</option>
                {filterSections.map(section => (
                  <option key={section.id} value={section.id}>{section.section_name}</option>
                ))}
              </select>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm w-full"
                />
                <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                  Search
                </button>
              </div>
            </div>

            {/* Subjects list for selected class */}
            {filterClass && filterSubjects.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Subjects for Selected Class:</h3>
                <div className="flex flex-wrap gap-2">
                  {filterSubjects.map(subject => (
                    <span
                      key={subject.id}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {subject.subject_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Exam Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Class</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Section</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Subjects</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Exam Date</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Result Date</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Status</th>
                      <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-3 py-6 text-center text-gray-500 border border-gray-200">
                          No exams found
                        </td>
                      </tr>
                    ) : (
                      filteredExams.map((exam, index) => (
                        <tr key={exam.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                          <td className="px-3 py-2.5 border border-gray-200">{index + 1}</td>
                          <td className="px-3 py-2.5 border border-gray-200 font-medium">{exam.exam_name}</td>
                          <td className="px-3 py-2.5 border border-gray-200">{exam.classes?.class_name || 'N/A'}</td>
                          <td className="px-3 py-2.5 border border-gray-200">{exam.sections?.section_name || 'All'}</td>
                          <td className="px-3 py-2.5 border border-gray-200 max-w-xs truncate">{exam.subjects}</td>
                          <td className="px-3 py-2.5 border border-gray-200">
                            {exam.start_date
                              ? new Date(exam.start_date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'
                            }
                          </td>
                          <td className="px-3 py-2.5 border border-gray-200">
                            {exam.result_declaration_date
                              ? new Date(exam.result_declaration_date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'
                            }
                          </td>
                          <td className="px-3 py-2.5 border border-gray-200">
                            <select
                              value={exam.status}
                              onChange={(e) => handleStatusChange(exam.id, e.target.value)}
                              disabled={loading}
                              className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${
                                exam.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                exam.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                                exam.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                exam.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="ongoing">Ongoing</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5 border border-gray-200">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditExam(exam)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExam(exam.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editMode ? 'Edit Exam' : 'Add New Exam'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!editMode && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Select Datesheet <span className="text-xs text-gray-600">(Optional - auto-fills form)</span>
                  </label>
                  <select
                    value={selectedDatesheet}
                    onChange={(e) => setSelectedDatesheet(e.target.value)}
                    className="w-full border border-blue-300 rounded px-3 py-2 bg-white"
                  >
                    <option value="">Create New Exam / Select Datesheet</option>
                    {allDatesheets.map(datesheet => (
                      <option key={datesheet.id} value={datesheet.id}>
                        {datesheet.title || datesheet.exam_name || 'Untitled'} - {(datesheet.start_date || datesheet.exam_date) ? new Date(datesheet.start_date || datesheet.exam_date).toLocaleDateString('en-GB') : 'No date'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    Select an existing datesheet to auto-fill exam details and filter classes
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="e.g., First Term Final"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Result Date
                  </label>
                  <input
                    type="date"
                    value={resultDate}
                    onChange={(e) => setResultDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Choose Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    disabled={!selectedClass}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All Sections</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>{section.section_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subjects & Enter Total Marks <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded p-4 max-h-96 overflow-y-auto">
                  {subjects.length === 0 ? (
                    <p className="text-gray-500 text-sm">Please select a class first</p>
                  ) : (
                    <div className="space-y-3">
                      {subjects.map(subject => (
                        <div key={subject.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(subject.id)}
                            onChange={() => handleSubjectToggle(subject.id)}
                            className="w-4 h-4 text-blue-600 flex-shrink-0"
                          />
                          <span className="text-sm font-medium flex-1">{subject.subject_name}</span>
                          {selectedSubjects.includes(subject.id) && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600">Total Marks:</label>
                              <input
                                type="number"
                                value={subjectMarks[subject.id] || ''}
                                onChange={(e) => handleSubjectMarksChange(subject.id, e.target.value)}
                                placeholder="100"
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                                min="1"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedSubjects.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Total Marks: {selectedSubjects.reduce((sum, subjectId) => sum + (parseFloat(subjectMarks[subjectId]) || 0), 0)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Details / Instructions
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Add any additional details or instructions..."
                  rows="3"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Saving...' : (editMode ? 'Update Exam' : 'Create Exam')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={hideConfirmDialog} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-md overflow-hidden">
            <div className={`px-6 py-4 ${
              confirmDialog.confirmButtonColor === 'red'
                ? 'bg-gradient-to-r from-red-600 to-red-700'
                : 'bg-gradient-to-r from-blue-900 to-blue-800'
            }`}>
              <h3 className="text-lg font-bold text-white">{confirmDialog.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">{confirmDialog.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={hideConfirmDialog}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className={`px-4 py-2 text-white rounded-lg transition ${
                    confirmDialog.confirmButtonColor === 'red'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-900 hover:bg-blue-800'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function ExamsPageWithPermission() {
  return (
    <PermissionGuard permissionKey="examination_exams_view" pageName="Exams">
      <ExamsPage />
    </PermissionGuard>
  )
}
