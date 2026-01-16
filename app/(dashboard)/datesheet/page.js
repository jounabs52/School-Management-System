'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, Pencil, Trash2, Clock, FileText, AlertCircle, Download, Plus, CheckCircle, XCircle, Briefcase } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { generateDatesheetPDF } from '@/lib/pdfGenerator'
import {
  convertImageToBase64,
  addPDFHeader,
  addPDFFooter,
  addPDFWatermark,
  PDF_COLORS,
  PDF_FONTS
} from '@/lib/pdfUtils'
import PDFPreviewModal from '@/components/PDFPreviewModal'

export default function DatesheetPage() {
  const router = useRouter()
  const [datesheets, setDatesheets] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [session, setSession] = useState(null)
  const [schoolInfo, setSchoolInfo] = useState(null)
  const [toasts, setToasts] = useState([])

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

  // Section State (now using tabs like HR)
  const [activeTab, setActiveTab] = useState('datesheets')

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditExamModal, setShowEditExamModal] = useState(false)
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false)
  const [createModalSection, setCreateModalSection] = useState('basic') // 'basic' or 'subjects'
  const [editModalSection, setEditModalSection] = useState('basic') // 'basic' or 'subjects' for edit modal

  // Form States
  const [selectedClasses, setSelectedClasses] = useState([])
  const [datesheetTitle, setDatesheetTitle] = useState('') // Changed from examName
  const [examStartDate, setExamStartDate] = useState('')
  const [defaultStartTime, setDefaultStartTime] = useState('11:00')
  const [defaultEndTime, setDefaultEndTime] = useState('12:30')
  const [interval, setInterval] = useState(2)
  const [saturdayOff, setSaturdayOff] = useState(true)
  const [sundayOff, setSundayOff] = useState(true)
  const [examCenter, setExamCenter] = useState('')

  // New Create Datesheet Form States (for new UI)
  const [selectedClassForDatesheet, setSelectedClassForDatesheet] = useState('')
  const [addedSubjects, setAddedSubjects] = useState([]) // Array of {subject_id, subject_name, date, start_time, end_time}
  const [currentSubject, setCurrentSubject] = useState('') // Currently selected subject in dropdown
  const [currentSubjectDate, setCurrentSubjectDate] = useState('')
  const [currentSubjectStartTime, setCurrentSubjectStartTime] = useState('09:00')
  const [currentSubjectEndTime, setCurrentSubjectEndTime] = useState('11:00')
  const [editingSubjectIndex, setEditingSubjectIndex] = useState(null) // Index of subject being edited (null if adding new)

  // Removed: examType, examEndDate (not in datesheets table)

  // Schedule States
  const [currentDatesheet, setCurrentDatesheet] = useState(null) // Changed from currentExam
  const [schedules, setSchedules] = useState([])
  const [scheduleDates, setScheduleDates] = useState([])

  // Edit Schedule States
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [editSubject, setEditSubject] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editRoomNumber, setEditRoomNumber] = useState('')
  const [classSubjects, setClassSubjects] = useState([]) // Subjects for the selected class
  const [classSubjectsMap, setClassSubjectsMap] = useState({}) // Map of classId -> array of subject IDs
  // Removed: editTotalMarks, editPassingMarks (not in datesheet_schedules)

  // Calendar View States
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'calendar'
  const [activeClassTab, setActiveClassTab] = useState(null) // Currently active class ID for calendar view
  const [draggedSchedule, setDraggedSchedule] = useState(null) // Schedule being dragged
  const [dropTargetDate, setDropTargetDate] = useState(null) // Date column being hovered during drag
  const [isDragging, setIsDragging] = useState(false) // Global drag state for styling
  const [calendarDateRange, setCalendarDateRange] = useState([]) // Full date range for calendar

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

  // Reports State
  const [selectedExamForReport, setSelectedExamForReport] = useState('')
  const [showReportConfigModal, setShowReportConfigModal] = useState(false)
  const [showGeneratedSlipsModal, setShowGeneratedSlipsModal] = useState(false)
  const [reportType, setReportType] = useState('') // 'datesheet', 'rollno', 'admit-card'
  const [reportConfig, setReportConfig] = useState({
    selectedDatesheet: null,
    selectedClass: 'all',
    genderFilter: 'all',
    showRoomNumber: true,
    showExamTime: true,
    showPrincipalSignature: true,
    selectedStudent: 'all', // New: for individual student selection
  })
  const [generatedSlips, setGeneratedSlips] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)

  // Slip Filter State
  const [slipDatesheetFilter, setSlipDatesheetFilter] = useState('')
  const [slipClassFilter, setSlipClassFilter] = useState('')
  const [fetchedSlips, setFetchedSlips] = useState([])

  // Datesheet PDF generation state
  const [showDatesheetClassModal, setShowDatesheetClassModal] = useState(false)

  // Toast notification function (matching HR design)
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

  // Apply blur effect to sidebar and disable background scrolling when modals are open
  useEffect(() => {
    const anyModalOpen = showCreateModal || showEditExamModal || showEditScheduleModal || showReportConfigModal || showGeneratedSlipsModal || showDatesheetClassModal || confirmDialog.show

    if (anyModalOpen) {
      // Disable body scrolling
      document.body.style.overflow = 'hidden'

      // Blur only the sidebar
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = 'blur(4px)'
        sidebar.style.pointerEvents = 'none'
      }
    } else {
      // Remove blur and enable interactions
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
  }, [showCreateModal, showEditExamModal, showEditScheduleModal, showReportConfigModal, showGeneratedSlipsModal, showDatesheetClassModal, confirmDialog.show])

  // Close student dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isStudentDropdownOpen && !event.target.closest('.student-dropdown-container')) {
        setIsStudentDropdownOpen(false)
        setStudentSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isStudentDropdownOpen])

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm })
  }

  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm()
    }
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

  const handleCancel = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

  // Get current user from cookie
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
        console.log('User loaded:', user) // Debug log
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  // Fetch current session from database
  useEffect(() => {
    const fetchCurrentSession = async () => {
      if (!currentUser?.school_id) return

      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .eq('is_current', true)
          .single()

        if (error) {
          console.error('Error fetching session:', error)
          // If no current session, try to get the most recent one
          const { data: recentSession, error: recentError } = await supabase
            .from('sessions')
            .select('*')
            .eq('school_id', currentUser.school_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (recentError) {
            showToast('No academic session found. Please create one first.', 'error')
            return
          }
          setSession(recentSession)
          console.log('Recent session loaded:', recentSession) // Debug log
        } else {
          setSession(data)
          console.log('Current session loaded:', data) // Debug log
        }
      } catch (error) {
        console.error('Error fetching session:', error)
        showToast('Error loading session', 'error')
      }
    }

    fetchCurrentSession()
  }, [currentUser])

  // Fetch school info with logo
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!currentUser?.school_id) return

      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        if (error) throw error

        // Convert logo URL to base64 if it exists
        let logoBase64 = data.logo_url
        if (data.logo_url && (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://'))) {
          console.log('🔄 Converting logo URL to base64...')
          logoBase64 = await convertImageToBase64(data.logo_url)
          console.log('✅ Logo converted to base64:', logoBase64 ? 'Success' : 'Failed')
        }

        // Map to expected format for PDF
        const schoolData = {
          school_name: data.name,
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          logo: logoBase64,
          tagline: data.tagline,
          principal_name: data.principal_name,
          established_date: data.established_date
        }

        setSchoolInfo(schoolData)
        console.log('🏫 School info loaded with logo')
      } catch (error) {
        console.error('Error fetching school info:', error)
      }
    }

    fetchSchoolInfo()
  }, [currentUser])

  // Generate complete date range for calendar view (including empty days)
  const generateCalendarDateRange = useCallback(() => {
    if (!schedules || schedules.length === 0) return []

    const examDates = schedules.map(s => s.exam_date).filter(Boolean).sort()
    if (examDates.length === 0) return []

    const startDate = new Date(examDates[0])
    const endDate = new Date(examDates[examDates.length - 1])
    const dateRange = []
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      dateRange.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return dateRange
  }, [schedules])

  // Define all fetch functions with useCallback
  const fetchDatesheets = useCallback(async () => {
    if (!currentUser?.school_id || !session?.name) {
      console.log('⚠️ fetchDatesheets skipped - missing data:', {
        school_id: currentUser?.school_id,
        session_name: session?.name
      })
      return
    }

    console.log('📥 Fetching datesheets with:', {
      school_id: currentUser.school_id,
      session: session.name
    })

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('datesheets')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('session', session.name)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('✅ Fetched datesheets:', data)
      console.log(`Found ${data?.length || 0} datesheets`)
      setDatesheets(data || [])
    } catch (error) {
      console.error('❌ Error fetching datesheets:', error)
      showToast('Error fetching datesheets', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.school_id, session?.name])

  const fetchClasses = useCallback(async () => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('order_number')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }, [currentUser?.school_id])

  const fetchSubjects = useCallback(async () => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('subject_name')

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }, [currentUser?.school_id])

  const fetchSubjectsForClass = useCallback(async (classId) => {
    if (!currentUser?.school_id || !classId) {
      setClassSubjects([])
      return
    }

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
        .eq('class_id', classId)

      if (error) throw error

      // Extract subjects from the nested structure
      const subjectsData = data?.map(item => item.subjects).filter(Boolean) || []
      setClassSubjects(subjectsData)
    } catch (error) {
      console.error('Error fetching class subjects:', error)
      setClassSubjects([])
    }
  }, [currentUser?.school_id])

  const fetchStudents = useCallback(async () => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('roll_number')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }, [currentUser?.school_id])

  // Fetch data when user and session are available
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchDatesheets()
      fetchClasses()
      fetchSubjects()
      fetchStudents()
    }
  }, [fetchDatesheets, fetchClasses, fetchSubjects, fetchStudents, currentUser?.school_id])

  // Fetch subjects when class is selected in create modal
  useEffect(() => {
    if (selectedClassForDatesheet) {
      fetchSubjectsForClass(selectedClassForDatesheet)
    } else {
      setClassSubjects([])
    }
  }, [selectedClassForDatesheet, fetchSubjectsForClass])

  // Update calendar date range when switching to calendar view
  useEffect(() => {
    if (viewMode === 'calendar') {
      const dateRange = generateCalendarDateRange()
      setCalendarDateRange(dateRange)

      // Set first selected class as active tab if not set
      if (!activeClassTab && selectedClasses.length > 0) {
        setActiveClassTab(selectedClasses[0])
      }
    }
  }, [viewMode, schedules, selectedClasses, activeClassTab, generateCalendarDateRange])

  // Fetch slips by datesheet and class filters
  const fetchSlipsByFilters = useCallback(async (datesheetId, classId = null) => {
    if (!datesheetId) {
      setFetchedSlips([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('roll_no_slips')
        .select(`
          *,
          students (
            first_name,
            last_name,
            roll_number,
            admission_number,
            current_class_id
          )
        `)
        .eq('datesheet_id', datesheetId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filter by class on the client side if classId is provided
      let filteredData = data
      if (classId) {
        filteredData = data.filter(slip => slip.students?.current_class_id === classId)
      }

      // Get class names from the classes state
      const formattedSlips = filteredData.map(slip => {
        const classInfo = classes.find(c => c.id === slip.students?.current_class_id)
        const studentName = slip.students?.first_name && slip.students?.last_name
          ? `${slip.students.first_name} ${slip.students.last_name}`
          : slip.students?.first_name || 'N/A'

        return {
          id: slip.id,
          student_name: studentName,
          roll_number: slip.students?.roll_number || 'N/A',
          class_name: classInfo?.class_name || 'N/A',
          slip_number: slip.slip_number,
          datesheet_id: slip.datesheet_id,
          student_id: slip.student_id,
          class_id: slip.class_id || slip.students?.current_class_id, // Include class_id from slip or student
          slip_type: slip.slip_type || 'roll_no_slip',
          students: slip.students // Include full student data for PDF generation
        }
      })

      setFetchedSlips(formattedSlips)
    } catch (error) {
      console.error('Error fetching slips:', error)
      showToast('Failed to load slips', 'error')
      setFetchedSlips([])
    }
  }, [classes])

  // Auto-select first datesheet when on reports tab and none selected
  useEffect(() => {
    if (activeTab === 'reports' && !selectedExamForReport && datesheets.length > 0) {
      setSelectedExamForReport(datesheets[0].id)
    }
  }, [activeTab, selectedExamForReport, datesheets])

  // Fetch slips when filters change
  useEffect(() => {
    if (selectedExamForReport) {
      fetchSlipsByFilters(selectedExamForReport, slipClassFilter || null)
    } else {
      setFetchedSlips([])
    }
  }, [selectedExamForReport, slipClassFilter, fetchSlipsByFilters])

  const fetchSchedules = async (datesheetId, classIds = []) => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('datesheet_schedules')
        .select(`
          *,
          classes (class_name),
          subjects (subject_name)
        `)
        .eq('datesheet_id', datesheetId)
        .order('exam_date')
        .order('start_time')

      if (error) throw error
      setSchedules(data || [])

      // Extract unique dates
      const dates = [...new Set(data?.map(s => s.exam_date) || [])]

      // Calculate max subjects across all selected classes to limit columns
      if (classIds.length > 0) {
        let maxSubjects = 0
        const newClassSubjectsMap = {}

        // Fetch subject count for each class
        for (const classId of classIds) {
          const { data: classSubjectsData } = await supabase
            .from('class_subjects')
            .select('subject_id', { count: 'exact' })
            .eq('school_id', currentUser.school_id)
            .eq('class_id', classId)

          // Store the subject IDs for this class
          const subjectIds = classSubjectsData?.map(cs => cs.subject_id) || []
          newClassSubjectsMap[classId] = subjectIds

          if (classSubjectsData && classSubjectsData.length > maxSubjects) {
            maxSubjects = classSubjectsData.length
          }
        }

        // Update the class-subjects map
        setClassSubjectsMap(newClassSubjectsMap)

        // Limit dates to max subjects count, or show all if maxSubjects is 0
        if (maxSubjects > 0 && dates.length > maxSubjects) {
          setScheduleDates(dates.slice(0, maxSubjects))
        } else {
          setScheduleDates(dates)
        }
      } else {
        setScheduleDates(dates)
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
      showToast('Error fetching schedules', 'error')
    }
  }

  const toggleClassSelection = (classId) => {
    setSelectedClasses(prev => {
      if (prev.includes(classId)) {
        return prev.filter(id => id !== classId)
      } else {
        return [...prev, classId]
      }
    })
  }

  const removeClassChip = (classId) => {
    setSelectedClasses(prev => prev.filter(id => id !== classId))
  }

  const generateScheduleDates = (startDate, endDate, interval, satOff, sunOff) => {
    const dates = []
    let currentDate = new Date(startDate)
    const end = new Date(endDate)

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay()

      // Skip Saturday (6) if saturdayOff is true
      if (satOff && dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Skip Sunday (0) if sundayOff is true
      if (sunOff && dayOfWeek === 0) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + interval)
    }

    return dates
  }

  // Helper function to add or update a subject
  const handleAddSubject = () => {
    // Validation
    if (!currentSubject) {
      showToast('Please select a subject', 'warning')
      return
    }
    if (!currentSubjectDate) {
      showToast('Please select a date for the subject', 'warning')
      return
    }
    if (!currentSubjectStartTime || !currentSubjectEndTime) {
      showToast('Please enter start and end time', 'warning')
      return
    }

    // Get subject name
    const subject = subjects.find(s => s.id === currentSubject)
    if (!subject) {
      showToast('Subject not found', 'error')
      return
    }

    const subjectData = {
      subject_id: currentSubject,
      subject_name: subject.subject_name,
      date: currentSubjectDate,
      start_time: currentSubjectStartTime,
      end_time: currentSubjectEndTime
    }

    if (editingSubjectIndex !== null) {
      // Update existing subject
      const updatedSubjects = [...addedSubjects]
      updatedSubjects[editingSubjectIndex] = subjectData
      setAddedSubjects(updatedSubjects)
      showToast('Subject updated successfully', 'success')
    } else {
      // Add new subject
      setAddedSubjects([...addedSubjects, subjectData])
      showToast('Subject added successfully', 'success')
    }

    // Reset form fields
    setCurrentSubject('')
    setCurrentSubjectDate('')
    setCurrentSubjectStartTime('09:00')
    setCurrentSubjectEndTime('11:00')
    setEditingSubjectIndex(null)
  }

  // Helper function to start editing a subject
  const handleEditSubject = (index) => {
    const subject = addedSubjects[index]
    setCurrentSubject(subject.subject_id)
    setCurrentSubjectDate(subject.date)
    setCurrentSubjectStartTime(subject.start_time)
    setCurrentSubjectEndTime(subject.end_time)
    setEditingSubjectIndex(index)
  }

  // Helper function to cancel editing
  const handleCancelEdit = () => {
    setCurrentSubject('')
    setCurrentSubjectDate('')
    setCurrentSubjectStartTime('09:00')
    setCurrentSubjectEndTime('11:00')
    setEditingSubjectIndex(null)
  }

  // Helper function to remove a subject
  const handleRemoveSubject = (index) => {
    const newAddedSubjects = addedSubjects.filter((_, i) => i !== index)
    setAddedSubjects(newAddedSubjects)
    // If we were editing this subject, cancel the edit
    if (editingSubjectIndex === index) {
      handleCancelEdit()
    } else if (editingSubjectIndex > index) {
      // Adjust the editing index if we removed a subject before it
      setEditingSubjectIndex(editingSubjectIndex - 1)
    }
    showToast('Subject removed', 'info')
  }

  const handleCreateDatesheet = async () => {
    // Detailed validation with specific error messages
    if (!currentUser?.school_id) {
      console.error('Current user or school_id not found:', currentUser)
      showToast('User not logged in or school not found', 'error')
      return
    }

    if (!session?.name) {
      console.error('Session not loaded:', session)
      showToast('Academic session not found. Please ensure a session is created and marked as current.', 'error')
      return
    }

    if (!selectedClassForDatesheet) {
      showToast('Please select a class', 'warning')
      return
    }

    if (!datesheetTitle) {
      showToast('Please enter datesheet title', 'warning')
      return
    }

    if (addedSubjects.length === 0) {
      showToast('Please add at least one subject', 'warning')
      return
    }

    console.log('📝 Creating datesheet with:', {
      school_id: currentUser.school_id,
      session: session.name,
      datesheetTitle,
      class: selectedClassForDatesheet,
      subjects: addedSubjects.length
    })

    setLoading(true)
    try {
      // Create datesheet
      const datesheetData = {
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        session: session.name, // String, not UUID
        title: datesheetTitle,
        start_date: addedSubjects[0]?.date || new Date().toISOString().split('T')[0], // Use first subject's date as start date
        default_start_time: '09:00',
        default_end_time: '11:00',
        interval_days: 1,
        saturday_off: false,
        sunday_off: false,
        exam_center: examCenter,
        class_ids: [selectedClassForDatesheet], // Single class
        created_by: currentUser.id
      }

      console.log('📤 Inserting datesheet:', datesheetData)

      const { data: datesheet, error: datesheetError } = await supabase
        .from('datesheets')
        .insert(datesheetData)
        .select()
        .single()

      if (datesheetError) {
        console.error('❌ Datesheet creation error:', datesheetError)
        throw datesheetError
      }

      console.log('✅ Datesheet created successfully:', datesheet)

      // Create schedule records from added subjects
      const scheduleRecords = addedSubjects.map(subject => ({
        user_id: currentUser.id,
        datesheet_id: datesheet.id,
        school_id: currentUser.school_id,
        class_id: selectedClassForDatesheet,
        subject_id: subject.subject_id,
        exam_date: subject.date,
        start_time: subject.start_time,
        end_time: subject.end_time,
        room_number: examCenter,
        created_by: currentUser.id
      }))

      console.log(`📋 Creating ${scheduleRecords.length} schedule records`)

      if (scheduleRecords.length > 0) {
        const { error: scheduleError } = await supabase
          .from('datesheet_schedules')
          .insert(scheduleRecords)

        if (scheduleError) {
          console.error('❌ Schedule insert error:', scheduleError)
          throw scheduleError
        }
        console.log('✅ All schedules created successfully')
      }

      showToast('Datesheet created successfully', 'success')
      setShowCreateModal(false)
      resetForm()

      console.log('🔄 Refreshing datesheet list...')
      await fetchDatesheets()
    } catch (error) {
      console.error('❌ Error creating datesheet:', error)
      showToast(`Failed to create datesheet: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDatesheet = async (id) => {
    showConfirmDialog(
      'Delete Datesheet',
      'Are you sure you want to delete this datesheet? This will also delete all associated schedules.',
      async () => {
        console.log('🗑️ Deleting datesheet:', id)
        try {
          // Delete datesheet (CASCADE will handle schedules automatically)
          const { error, data } = await supabase
            .from('datesheets')
            .delete()
            .eq('id', id)
            .select()

          if (error) {
            console.error('❌ Delete error:', error)
            throw error
          }

          console.log('✅ Datesheet deleted successfully:', data)
          showToast('Datesheet deleted successfully', 'success')

          console.log('🔄 Refreshing datesheet list...')
          await fetchDatesheets()
        } catch (error) {
          console.error('❌ Error deleting datesheet:', error)
          showToast(`Failed to delete datesheet: ${error.message}`, 'error')
        }
      }
    )
  }

  const handleOpenSchedule = async (datesheet) => {
    setCurrentDatesheet(datesheet)

    // Get all classes that have schedules for this datesheet
    const { data: datesheetSchedules } = await supabase
      .from('datesheet_schedules')
      .select('class_id')
      .eq('datesheet_id', datesheet.id)

    const classIds = [...new Set(datesheetSchedules?.map(s => s.class_id) || [])]
    setSelectedClasses(classIds)

    await fetchSchedules(datesheet.id, classIds)
    setActiveTab('schedule')
  }

  const handleOpenEditDatesheet = async (datesheet) => {
    setCurrentDatesheet(datesheet)
    setDatesheetTitle(datesheet.title)
    setExamStartDate(datesheet.start_date)
    setDefaultStartTime(datesheet.default_start_time || '11:00')
    setDefaultEndTime(datesheet.default_end_time || '12:30')
    setInterval(datesheet.interval_days || 2)
    setSaturdayOff(datesheet.saturday_off !== false)
    setSundayOff(datesheet.sunday_off !== false)
    setExamCenter(datesheet.exam_center || '')

    // Set the class for the datesheet (assuming single class from class_ids array)
    const classId = datesheet.class_ids && datesheet.class_ids.length > 0 ? datesheet.class_ids[0] : ''
    setSelectedClassForDatesheet(classId)

    // Fetch subjects for this class
    if (classId) {
      await fetchSubjectsForClass(classId)
    }

    // Fetch existing subjects from datesheet_schedules
    try {
      const { data: scheduleData, error } = await supabase
        .from('datesheet_schedules')
        .select(`
          *,
          subjects (
            id,
            subject_name
          )
        `)
        .eq('datesheet_id', datesheet.id)
        .order('exam_date')

      if (error) throw error

      // Transform schedule data to addedSubjects format
      const existingSubjects = scheduleData
        .filter(schedule => schedule.subject_id) // Only include schedules with subjects
        .map(schedule => ({
          subject_id: schedule.subject_id,
          subject_name: schedule.subjects?.subject_name || '',
          date: schedule.exam_date,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }))

      setAddedSubjects(existingSubjects)
    } catch (error) {
      console.error('Error fetching datesheet subjects:', error)
      setAddedSubjects([])
    }

    setEditModalSection('basic') // Reset to basic section
    setShowEditExamModal(true)
  }

  const handleUpdateDatesheet = async () => {
    if (!currentDatesheet) return

    // Validation
    if (!selectedClassForDatesheet) {
      showToast('Please select a class', 'warning')
      return
    }

    if (!datesheetTitle) {
      showToast('Please enter datesheet title', 'warning')
      return
    }

    if (addedSubjects.length === 0) {
      showToast('Please add at least one subject', 'warning')
      return
    }

    setLoading(true)
    try {
      // Update datesheet basic data
      const { error: datesheetError } = await supabase
        .from('datesheets')
        .update({
          title: datesheetTitle,
          start_date: addedSubjects[0]?.date || examStartDate,
          default_start_time: '09:00',
          default_end_time: '11:00',
          interval_days: 1,
          saturday_off: false,
          sunday_off: false,
          exam_center: examCenter,
          class_ids: [selectedClassForDatesheet]
        })
        .eq('id', currentDatesheet.id)

      if (datesheetError) throw datesheetError

      // Delete existing schedule records for this datesheet
      const { error: deleteError } = await supabase
        .from('datesheet_schedules')
        .delete()
        .eq('datesheet_id', currentDatesheet.id)

      if (deleteError) throw deleteError

      // Create new schedule records from added subjects
      const scheduleRecords = addedSubjects.map(subject => ({
        datesheet_id: currentDatesheet.id,
        school_id: currentUser.school_id,
        class_id: selectedClassForDatesheet,
        subject_id: subject.subject_id,
        exam_date: subject.date,
        start_time: subject.start_time,
        end_time: subject.end_time,
        room_number: examCenter,
        user_id: currentUser.id,  // Fixed: changed from created_by to user_id
        created_by: currentUser.id
      }))

      if (scheduleRecords.length > 0) {
        const { error: scheduleError } = await supabase
          .from('datesheet_schedules')
          .insert(scheduleRecords)

        if (scheduleError) throw scheduleError
      }

      showToast('Datesheet updated successfully', 'success')
      setShowEditExamModal(false)
      resetForm()
      fetchDatesheets()
    } catch (error) {
      console.error('Error updating datesheet:', error)
      showToast('Failed to update datesheet', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSchedule = async (schedule) => {
    setEditingSchedule(schedule)
    setEditSubject(schedule.subject_id || '')
    setEditDate(schedule.exam_date)
    setEditStartTime(schedule.start_time)
    setEditEndTime(schedule.end_time)
    setEditRoomNumber(schedule.room_number || '')
    // Removed: total_marks, passing_marks

    // Fetch subjects for this class
    await fetchSubjectsForClass(schedule.class_id)

    setShowEditScheduleModal(true)
  }

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return

    try {
      const { error } = await supabase
        .from('datesheet_schedules')
        .update({
          subject_id: editSubject || null,
          exam_date: editDate || null,
          start_time: editStartTime,
          end_time: editEndTime,
          room_number: editRoomNumber
          // Removed: total_marks, passing_marks
        })
        .eq('id', editingSchedule.id)

      if (error) throw error

      showToast('Schedule updated successfully', 'success')
      setShowEditScheduleModal(false)
      fetchSchedules(currentDatesheet.id, selectedClasses)
    } catch (error) {
      console.error('Error updating schedule:', error)
      showToast('Failed to update schedule', 'error')
    }
  }

  const handleDeleteSchedule = async (scheduleId) => {
    showConfirmDialog(
      'Delete Schedule',
      'Are you sure you want to delete this schedule entry?',
      async () => {
        try {
          const { error } = await supabase
            .from('datesheet_schedules')
            .update({ subject_id: null })
            .eq('id', scheduleId)

          if (error) throw error

          showToast('Schedule cleared successfully', 'success')
          fetchSchedules(currentDatesheet.id, selectedClasses)
        } catch (error) {
          console.error('Error deleting schedule:', error)
          showToast('Failed to delete schedule', 'error')
        }
      }
    )
  }

  // Move schedule to a new date (for calendar drag-and-drop)
  const handleMoveToDate = async (schedule, newDate) => {
    try {
      const originalSchedules = [...schedules]
      setSchedules(prevSchedules =>
        prevSchedules.map(s =>
          s.id === schedule.id ? { ...s, exam_date: newDate } : s
        )
      )

      const { error } = await supabase
        .from('datesheet_schedules')
        .update({ exam_date: newDate })
        .eq('id', schedule.id)

      if (error) throw error

      showToast('Subject moved successfully', 'success')
      await fetchSchedules(currentDatesheet.id, selectedClasses)
    } catch (error) {
      setSchedules(originalSchedules)
      console.error('Error moving schedule:', error)
      showToast('Failed to move subject', 'error')
      throw error
    }
  }

  // Swap dates between two schedules (for calendar drag-and-drop)
  const handleSwapDates = async (schedule1, schedule2) => {
    try {
      const originalSchedules = [...schedules]
      setSchedules(prevSchedules =>
        prevSchedules.map(s => {
          if (s.id === schedule1.id) return { ...s, exam_date: schedule2.exam_date }
          if (s.id === schedule2.id) return { ...s, exam_date: schedule1.exam_date }
          return s
        })
      )

      const [update1, update2] = await Promise.all([
        supabase.from('datesheet_schedules').update({ exam_date: schedule2.exam_date }).eq('id', schedule1.id),
        supabase.from('datesheet_schedules').update({ exam_date: schedule1.exam_date }).eq('id', schedule2.id)
      ])

      if (update1.error) throw update1.error
      if (update2.error) throw update2.error

      showToast('Subjects swapped successfully', 'success')
      await fetchSchedules(currentDatesheet.id, selectedClasses)
    } catch (error) {
      setSchedules(originalSchedules)
      console.error('Error swapping schedules:', error)
      showToast('Failed to swap subjects', 'error')
      throw error
    }
  }

  const handleDeleteClassFromSchedule = async (classId) => {
    const className = getClassName(classId)
    showConfirmDialog(
      'Delete Class Schedule',
      `Are you sure you want to delete all schedule entries for ${className}?`,
      async () => {
        try {
          const { error } = await supabase
            .from('datesheet_schedules')
            .delete()
            .eq('datesheet_id', currentDatesheet.id)
            .eq('class_id', classId)

          if (error) throw error

          // Remove the class from selectedClasses
          const updatedClasses = selectedClasses.filter(id => id !== classId)
          setSelectedClasses(updatedClasses)

          showToast('Class schedule deleted successfully', 'success')

          // Refresh schedules if there are still classes selected
          if (updatedClasses.length > 0) {
            fetchSchedules(currentDatesheet.id, updatedClasses)
          } else {
            setSchedules([])
          }
        } catch (error) {
          console.error('Error deleting class schedule:', error)
          showToast('Failed to delete class schedule', 'error')
        }
      }
    )
  }

  const handleDownloadClassDatesheet = async (classId) => {
    try {
      const className = getClassName(classId)

      // Get schedules for this class only that have subjects
      const classSchedules = schedules.filter(s => s.class_id === classId && s.subject_id)

      if (classSchedules.length === 0) {
        showToast('No schedule found for this class', 'error')
        return
      }

      // Get unique dates where exams are scheduled for this class
      const examDates = [...new Set(classSchedules.map(s => s.exam_date))].sort()

      // Create PDF
      const doc = new jsPDF('landscape')

      // Add professional header with logo
      const headerOptions = {
        subtitle: currentDatesheet.title || 'Date Sheet',
        session: currentDatesheet.session,
        info: `Class: ${className}`,
        ...(currentDatesheet.exam_center && { examCenter: currentDatesheet.exam_center })
      }
      let yPosition = addPDFHeader(doc, schoolInfo, 'EXAMINATION DATE SHEET', headerOptions)

      // Add watermark
      if (schoolInfo) {
        addPDFWatermark(doc, schoolInfo)
      }

      yPosition += 5

      // Prepare table data
      const tableData = []
      const headers = ['Sr.', 'Date', 'Day', 'Subject', 'Time']

      examDates.forEach((date, index) => {
        const schedule = classSchedules.find(s => s.exam_date === date)
        if (schedule) {
          const dateObj = new Date(date)
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
          const formattedDate = dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })

          tableData.push([
            index + 1,
            formattedDate,
            dayName,
            getSubjectName(schedule.subject_id),
            `${schedule.start_time || ''} - ${schedule.end_time || ''}`
          ])
        }
      })

      // Add table
      autoTable(doc, {
        startY: yPosition,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: PDF_COLORS.headerBg,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: 3,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { cellWidth: 50 },
          3: { cellWidth: 80, halign: 'left' },
          4: { cellWidth: 70 }
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        }
      })

      // Add professional footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        addPDFFooter(doc, i, pageCount)
      }

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      const filename = `${currentDatesheet.title}_${className}_Datesheet.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(filename)
      setShowPdfPreview(true)
      showToast('Datesheet generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to download datesheet', 'error')
    }
  }

  const handleDownloadAllDatesheets = async () => {
    try {
      if (selectedClasses.length === 0) {
        showToast('No classes to download', 'error')
        return
      }

      // Create PDF
      const doc = new jsPDF('landscape')
      let isFirstPage = true

      // Loop through each class and add to the same PDF
      for (const classId of selectedClasses) {
        const className = getClassName(classId)

        // Get schedules for this class only that have subjects
        const classSchedules = schedules.filter(s => s.class_id === classId && s.subject_id)

        if (classSchedules.length === 0) {
          continue // Skip classes with no schedule
        }

        // Get unique dates where exams are scheduled for this class
        const examDates = [...new Set(classSchedules.map(s => s.exam_date))].sort()

        // Add new page for each class (except the first one)
        if (!isFirstPage) {
          doc.addPage('landscape')
        }
        isFirstPage = false

        // Add professional header with logo
        const headerOptions = {
          subtitle: currentDatesheet.title || 'Date Sheet',
          session: currentDatesheet.session,
          info: `Class: ${className}`,
          ...(currentDatesheet.exam_center && { examCenter: currentDatesheet.exam_center })
        }
        let yPosition = addPDFHeader(doc, schoolInfo, 'EXAMINATION DATE SHEET', headerOptions)

        // Add watermark
        if (schoolInfo) {
          addPDFWatermark(doc, schoolInfo)
        }

        yPosition += 5

        // Prepare table data
        const tableData = []
        const headers = ['Sr.', 'Date', 'Day', 'Subject', 'Time']

        examDates.forEach((date, index) => {
          const schedule = classSchedules.find(s => s.exam_date === date)
          if (schedule) {
            const dateObj = new Date(date)
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
            const formattedDate = dateObj.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })

            tableData.push([
              index + 1,
              formattedDate,
              dayName,
              getSubjectName(schedule.subject_id),
              `${schedule.start_time || ''} - ${schedule.end_time || ''}`
            ])
          }
        })

        // Add table
        autoTable(doc, {
          startY: yPosition,
          head: [headers],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: PDF_COLORS.headerBg,
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 10,
            cellPadding: 3,
            halign: 'center'
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 50, fontStyle: 'bold' },
            2: { cellWidth: 50 },
            3: { cellWidth: 80, halign: 'left' },
            4: { cellWidth: 70 }
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248]
          }
        })
      }

      // Add professional footer to all pages
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        addPDFFooter(doc, i, pageCount)
      }

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      const filename = `${currentDatesheet.title}_All_Classes_Datesheet.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(filename)
      setShowPdfPreview(true)
      showToast(`Datesheet for ${selectedClasses.length} classes generated. Preview opened.`, 'success')
    } catch (error) {
      console.error('Error downloading all datesheets:', error)
      showToast('Failed to download all datesheets', 'error')
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
  }

  const resetForm = () => {
    setSelectedClasses([])
    setDatesheetTitle('')
    setExamStartDate('')
    setDefaultStartTime('11:00')
    setDefaultEndTime('12:30')
    setInterval(2)
    setSaturdayOff(true)
    setSundayOff(true)
    setExamCenter('')
    setCurrentDatesheet(null)
    // Reset new form fields
    setSelectedClassForDatesheet('')
    setAddedSubjects([])
    setCurrentSubject('')
    setCurrentSubjectDate('')
    setCurrentSubjectStartTime('09:00')
    setCurrentSubjectEndTime('11:00')
    setEditingSubjectIndex(null) // Reset editing index
    setCreateModalSection('basic') // Reset to basic section
  }

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId)
    return cls?.class_name || 'N/A'
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId)
    return subject?.subject_name || ''
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return timeString
    }
  }

  // Check if a class has any unscheduled subjects
  const hasUnscheduledSubjects = (classId) => {
    if (!classId) return false

    // Get all subject IDs for this class from the classSubjectsMap
    const totalClassSubjects = classSubjectsMap[classId] || []

    // Get all scheduled subject IDs for this class
    const scheduledSubjectIds = schedules
      .filter(s => s.class_id === classId && s.subject_id)
      .map(s => s.subject_id)

    // Check if there are subjects not yet scheduled
    const unscheduledSubjects = totalClassSubjects.filter(
      subjectId => !scheduledSubjectIds.includes(subjectId)
    )

    return unscheduledSubjects.length > 0
  }

  const filteredDatesheets = datesheets.filter(datesheet =>
    datesheet.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getScheduleForClassAndDate = (classId, date) => {
    return schedules.find(s => s.class_id === classId && s.exam_date === date)
  }

  // Drag-and-Drop Event Handlers for Calendar View
  const handleDragStart = (e, schedule) => {
    setDraggedSchedule(schedule)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', schedule.id)
  }

  const handleDragOver = (e, targetDate) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetDate(targetDate)
  }

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setDropTargetDate(null)
  }

  const handleDrop = async (e, targetDate) => {
    e.preventDefault()
    setDropTargetDate(null)
    setIsDragging(false)

    if (!draggedSchedule || draggedSchedule.exam_date === targetDate) {
      setDraggedSchedule(null)
      return
    }

    try {
      const targetSchedule = schedules.find(
        s => s.class_id === draggedSchedule.class_id && s.exam_date === targetDate
      )

      if (targetSchedule && targetSchedule.subject_id) {
        await handleSwapDates(draggedSchedule, targetSchedule)
      } else {
        await handleMoveToDate(draggedSchedule, targetDate)
      }
    } catch (error) {
      console.error('Error during drop:', error)
      showToast('Failed to update schedule', 'error')
    } finally {
      setDraggedSchedule(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedSchedule(null)
    setDropTargetDate(null)
    setIsDragging(false)
  }

  // Generate PDF for Roll No Slip or Admit Card
  const generateRollNoSlipPDF = async (slip) => {
    try {
      // If student data is missing, fetch it from database
      let studentData = slip.students
      
      if (!studentData && slip.student_id) {
        console.log('📋 Student data not in slip, fetching from database...')
        const { data: fetchedStudent, error: studentError } = await supabase
          .from('students')
          .select('id, first_name, last_name, father_name, admission_number, roll_number, photo_url, current_class_id')
          .eq('id', slip.student_id)
          .single()
        
        if (studentError || !fetchedStudent) {
          console.error('Error fetching student:', studentError)
          showToast('Student information not found in database', 'error')
          return
        }
        
        studentData = fetchedStudent
        console.log('✅ Student data fetched:', studentData)
      }
      
      if (!studentData) {
        showToast('Student information not available', 'error')
        return
      }

      // Get the datesheet details
      const datesheet = datesheets.find(d => d.id === slip.datesheet_id)
      if (!datesheet) {
        showToast('Datesheet not found', 'error')
        return
      }

      console.log('📋 Fetching schedules for datesheet:', slip.datesheet_id)
      console.log('📋 Slip class_id:', slip.class_id)
      console.log('📋 Student class_id:', studentData.current_class_id)
      console.log('📋 Datesheet class_ids:', datesheet.class_ids)

      // Get exam schedules for this student's class
      // Priority: use slip's class_id > student's current_class_id (NO fallback to avoid wrong subjects)
      let examSchedules = []
      let classIdToUse = slip.class_id || studentData.current_class_id

      // Validate that we have a class_id
      if (!classIdToUse) {
        console.error('❌ No class_id found in slip or student data')
        showToast('Cannot determine class for this slip', 'error')
        return
      }

      // Log validation info (convert to strings for proper UUID comparison)
      if (datesheet.class_ids && Array.isArray(datesheet.class_ids)) {
        const classIdStr = String(classIdToUse)
        const datesheetClassIds = datesheet.class_ids.map(id => String(id))

        if (!datesheetClassIds.includes(classIdStr)) {
          console.warn('⚠️ Class ID not in datesheet classes, but using it anyway for correct subject filtering')
          console.warn('   Using class_id:', classIdStr)
          console.warn('   Datesheet has:', datesheetClassIds)
        }
      }

      const { data: schedules, error } = await supabase
        .from('datesheet_schedules')
        .select(`
          *,
          subjects (subject_name)
        `)
        .eq('datesheet_id', slip.datesheet_id)
        .eq('class_id', classIdToUse)
        .not('subject_id', 'is', null)
        .order('exam_date')

      if (error) {
        console.error('❌ Error fetching schedules:', error)
        showToast('Error fetching exam schedule', 'error')
        return
      }

      examSchedules = schedules || []
      console.log('✅ Fetched exam schedules:', examSchedules)
      console.log(`📋 Found ${examSchedules.length} schedules`)

      if (examSchedules.length === 0) {
        console.warn('⚠️ No schedules found for class:', classIdToUse)
        showToast('No exam schedules found for this class', 'warning')
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Add professional header with logo
      const studentName = studentData.first_name && studentData.last_name
        ? `${studentData.first_name} ${studentData.last_name}`
        : studentData.first_name || 'N/A'
      const className = getClassName(studentData.current_class_id)

      const headerOptions = {
        subtitle: datesheet.title.toUpperCase(),
        session: datesheet.session
      }
      let yPosition = addPDFHeader(doc, schoolInfo, 'EXAM ENTRANCE SLIP', headerOptions)

      // Add watermark
      if (schoolInfo) {
        addPDFWatermark(doc, schoolInfo)
      }

      yPosition += 5

      // Student Details Box
      const leftMargin = 20
      const boxTop = yPosition

      // Student Info
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...PDF_COLORS.textDark)
      doc.text("Student's Name", leftMargin, boxTop)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(studentName, leftMargin + 50, boxTop)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Father's Name", leftMargin, boxTop + 7)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(studentData.father_name || 'N/A', leftMargin + 50, boxTop + 7)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Class", leftMargin, boxTop + 14)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(className, leftMargin + 50, boxTop + 14)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Admit", leftMargin + 90, boxTop + 14)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(studentData.admission_number?.toString() || 'N/A', leftMargin + 110, boxTop + 14)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Session", leftMargin, boxTop + 21)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(datesheet.session || 'N/A', leftMargin + 50, boxTop + 21)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Roll #", leftMargin + 90, boxTop + 21)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(studentData.roll_number?.toString() || 'N/A', leftMargin + 110, boxTop + 21)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Exam Center", leftMargin, boxTop + 28)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(datesheet.exam_center || 'N/A', leftMargin + 50, boxTop + 28)

      // Exam Schedule Table
      const tableTop = boxTop + 40
      const tableData = examSchedules?.map((schedule, index) => [
        (index + 1).toString(),
        schedule.subjects?.subject_name || 'N/A',
        new Date(schedule.exam_date).toLocaleDateString('en-US', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        schedule.start_time || 'N/A',
        schedule.end_time || 'N/A',
        schedule.room_number || 'N/A'
      ]) || []

      autoTable(doc, {
        startY: tableTop,
        head: [['#', 'Subject', 'Exam Date', 'Start Time', 'End Time', 'Room No']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: PDF_COLORS.headerBg,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 40, halign: 'left' },
          2: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' }
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        }
      })

      // Add professional footer
      addPDFFooter(doc, 1, 1)

      // Save PDF
      const fileStudentName = studentData.first_name && studentData.last_name
        ? `${studentData.first_name}_${studentData.last_name}`
        : studentData.first_name || 'unknown'
      const fileName = `${slip.slip_type}_${fileStudentName}_${studentData.roll_number}.pdf`

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('PDF generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast(`Error generating PDF: ${error.message}`, 'error')
    }
  }

  // Fetch generated slips for a datesheet
  const fetchGeneratedSlips = async (datesheetId, slipType) => {
    if (!currentUser?.school_id || !datesheetId) return

    try {
      // First fetch the slips
      const { data: slipsData, error: slipsError } = await supabase
        .from('roll_no_slips')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('datesheet_id', datesheetId)
        .eq('slip_type', slipType)
        .order('created_at', { ascending: false })

      if (slipsError) {
        console.error('Error fetching slips:', slipsError)
        throw slipsError
      }

      if (!slipsData || slipsData.length === 0) {
        setGeneratedSlips([])
        return
      }

      console.log('📄 Fetched slips:', slipsData)

      // Get unique student IDs
      const studentIds = [...new Set(slipsData.map(slip => slip.student_id).filter(Boolean))]
      console.log('👥 Student IDs:', studentIds)

      if (studentIds.length === 0) {
        console.warn('No student IDs found in slips')
        setGeneratedSlips(slipsData.map(slip => ({ ...slip, students: null })))
        return
      }

      // Fetch student details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, father_name, admission_number, roll_number, photo_url, current_class_id')
        .in('id', studentIds)

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        // Continue without student data
        setGeneratedSlips(slipsData.map(slip => ({ ...slip, students: null })))
        return
      }

      console.log('✅ Fetched students:', studentsData)

      // Combine slips with student data
      const slipsWithStudents = slipsData.map(slip => {
        const studentData = studentsData?.find(s => s.id === slip.student_id)
        if (!studentData) {
          console.warn(`No student found for slip ${slip.id}, student_id: ${slip.student_id}`)
        }
        return {
          ...slip,
          students: studentData || null
        }
      })

      console.log('📋 Final slips with students:', slipsWithStudents)
      setGeneratedSlips(slipsWithStudents)
    } catch (error) {
      console.error('Error fetching generated slips:', error)
      showToast(`Error fetching slips: ${error.message}`, 'error')
    }
  }

  // Report handlers
  const handleViewGeneratedSlips = async (type) => {
    if (!selectedExamForReport) {
      showToast('Please select an exam first', 'warning')
      return
    }

    const slipType = type === 'admit-card' ? 'admit_card' : 'roll_no_slip'
    await fetchGeneratedSlips(selectedExamForReport, slipType)
    setReportType(type)
    setShowGeneratedSlipsModal(true)
  }

  const handleOpenReportConfig = (type) => {
    // Pre-select datesheet and class if available
    const examId = selectedExamForReport || null
    const classFilter = slipClassFilter || 'all'

    setReportConfig(prev => ({
      ...prev,
      selectedDatesheet: examId,
      selectedClass: classFilter
    }))

    setReportType(type)

    // Filter students based on selected class
    if (classFilter && classFilter !== 'all') {
      const classStudents = students.filter(s => s.current_class_id === classFilter)
      setFilteredStudents(classStudents)
    } else {
      setFilteredStudents(students)
    }

    setShowReportConfigModal(true)
  }

  const handleViewSlip = async (slip) => {
    try {
      // Ensure the slip object has student_id and datesheet_id
      const slipWithIds = {
        ...slip,
        student_id: slip.student_id,
        datesheet_id: slip.datesheet_id,
        slip_type: slip.slip_type || 'roll_no_slip',
        students: null // Will be fetched by generateRollNoSlipPDF if needed
      }
      
      // Generate PDF for the single slip
      await generateRollNoSlipPDF(slipWithIds)
    } catch (error) {
      console.error('Error viewing slip:', error)
      showToast('Error viewing slip', 'error')
    }
  }

  const handleGenerateReport = async () => {
    if (!reportConfig.selectedDatesheet || (typeof reportConfig.selectedDatesheet === 'string' && reportConfig.selectedDatesheet.trim() === '') || !currentUser?.school_id || !currentUser?.id) {
      showToast('Please select a datesheet first', 'error')
      return
    }

    try {
      // Get the selected datesheet details
      const selectedDatesheet = datesheets.find(d => d.id === reportConfig.selectedDatesheet)
      if (!selectedDatesheet) {
        showToast('Selected datesheet not found', 'error')
        return
      }

      let data, error

      // Save to appropriate table based on report type
      if (reportType === 'datesheet') {
        // Save to datesheet_reports table
        const result = await supabase
          .from('datesheet_reports')
          .insert({
            school_id: currentUser.school_id,
            datesheet_id: reportConfig.selectedDatesheet,
            report_name: `${selectedDatesheet.title} - Date Sheet`,
            report_type: 'datesheet',
            class_id: reportConfig.selectedClass !== 'all' ? reportConfig.selectedClass : null,
            gender_filter: null,
            file_url: `/reports/datesheet/${reportConfig.selectedDatesheet}`,
            configuration: reportConfig,
            generated_by: currentUser.id,
            status: 'generated'
          })
          .select()

        data = result.data
        error = result.error
      } else if (reportType === 'rollno' || reportType === 'admit-card') {
        // For roll no slips and admit cards, we need to create entries for each student
        let studentsToProcess = []

        // Check if specific student is selected
        if (reportConfig.selectedStudent && reportConfig.selectedStudent !== 'all') {
          const selectedStudent = students.find(s => s.id === reportConfig.selectedStudent)
          if (selectedStudent) {
            studentsToProcess = [selectedStudent]
          }
        } else {
          // Get all students based on class filter
          studentsToProcess = reportConfig.selectedClass !== 'all'
            ? students.filter(s => s.current_class_id === reportConfig.selectedClass)
            : students
        }

        if (studentsToProcess.length === 0) {
          showToast('No students found with the selected filters', 'warning')
          return
        }

        // Create roll no slips for all students
        const slips = studentsToProcess.map(student => ({
          school_id: currentUser.school_id,
          datesheet_id: reportConfig.selectedDatesheet,
          student_id: student.id,
          class_id: student.current_class_id, // Store the class_id for later use
          slip_number: `${selectedDatesheet.title}-${student.admission_number}`,
          slip_type: reportType === 'admit-card' ? 'admit_card' : 'roll_no_slip',
          gender: student.gender,
          file_url: `/reports/${reportType}/${reportConfig.selectedDatesheet}/${student.id}`,
          generated_by: currentUser.id,
          configuration: reportConfig,
          status: 'generated'
        }))

        const result = await supabase
          .from('roll_no_slips')
          .insert(slips)
          .select()

        data = result.data
        error = result.error

        if (!error) {
          showToast(`${reportType} generated for ${studentsToProcess.length} students and saved successfully`, 'success')
          // Refresh the slips
          await fetchSlipsByFilters(reportConfig.selectedDatesheet, slipClassFilter || null)
        }
      }

      if (error) throw error

      console.log('✅ Report saved to database:', data)
      if (reportType === 'datesheet') {
        showToast(`${reportType} report generated and saved successfully`, 'success')
      }
      setShowReportConfigModal(false)
    } catch (error) {
      console.error('❌ Error saving report:', error)
      showToast(`Failed to save report: ${error.message}`, 'error')
    }
  }

  const handleGenerateAllClassSlips = async () => {
    if (!reportConfig.selectedDatesheet || (typeof reportConfig.selectedDatesheet === 'string' && reportConfig.selectedDatesheet.trim() === '') || !currentUser?.school_id || !currentUser?.id) {
      showToast('Please select a datesheet first', 'error')
      return
    }

    if (!reportConfig.selectedClass || reportConfig.selectedClass === 'all') {
      showToast('Please select a specific class to generate all slips', 'warning')
      return
    }

    try {
      setLoading(true)

      // Get the selected datesheet details
      const selectedDatesheet = datesheets.find(d => d.id === reportConfig.selectedDatesheet)
      if (!selectedDatesheet) {
        showToast('Selected datesheet not found', 'error')
        return
      }

      // Get all students in the selected class
      const classStudents = students.filter(s => s.current_class_id === reportConfig.selectedClass)

      if (classStudents.length === 0) {
        showToast('No students found in the selected class', 'warning')
        return
      }

      // Check which students already have slips for this datesheet
      const slipType = reportType === 'admit-card' ? 'admit_card' : 'roll_no_slip'
      const { data: existingSlips, error: fetchError } = await supabase
        .from('roll_no_slips')
        .select('student_id')
        .eq('school_id', currentUser.school_id)
        .eq('datesheet_id', reportConfig.selectedDatesheet)
        .eq('slip_type', slipType)

      if (fetchError) throw fetchError

      // Get IDs of students who already have slips
      const existingStudentIds = new Set(existingSlips?.map(slip => slip.student_id) || [])

      // Filter out students who already have slips
      const studentsNeedingSlips = classStudents.filter(student => !existingStudentIds.has(student.id))

      if (studentsNeedingSlips.length === 0) {
        showToast('All students in this class already have slips for this datesheet', 'info')
        setShowReportConfigModal(false)
        return
      }

      // Create roll no slips only for students who don't have them
      const slips = studentsNeedingSlips.map(student => ({
        school_id: currentUser.school_id,
        datesheet_id: reportConfig.selectedDatesheet,
        student_id: student.id,
        slip_number: `${selectedDatesheet.title}-${student.admission_number}`,
        slip_type: slipType,
        gender: student.gender,
        file_url: `/reports/${reportType}/${reportConfig.selectedDatesheet}/${student.id}`,
        generated_by: currentUser.id,
        configuration: reportConfig,
        status: 'generated'
      }))

      const { data, error } = await supabase
        .from('roll_no_slips')
        .insert(slips)
        .select()

      if (error) throw error

      const skippedCount = classStudents.length - studentsNeedingSlips.length
      const message = skippedCount > 0
        ? `Generated ${studentsNeedingSlips.length} new slips (${skippedCount} students already had slips)`
        : `Successfully generated slips for all ${studentsNeedingSlips.length} students in the class`

      showToast(message, 'success')

      // Refresh the slips
      await fetchSlipsByFilters(reportConfig.selectedDatesheet, slipClassFilter || null)

      setShowReportConfigModal(false)
    } catch (error) {
      console.error('❌ Error generating all class slips:', error)
      showToast(`Failed to generate all class slips: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async (datesheet) => {
    try {
      setLoading(true)

      // Fetch schedules for this datesheet
      const { data: schedules, error } = await supabase
        .from('datesheet_schedules')
        .select('*')
        .eq('datesheet_id', datesheet.id)
        .order('exam_date')
        .order('start_time')

      if (error) throw error

      if (!schedules || schedules.length === 0) {
        showToast('No schedules found for this datesheet', 'warning')
        return
      }

      // Generate PDF with preview
      const doc = new jsPDF('landscape')

      // Add professional header with logo
      const headerOptions = {
        subtitle: datesheet.title,
        session: datesheet.session
      }
      let yPosition = addPDFHeader(doc, schoolInfo, 'EXAMINATION DATE SHEET', headerOptions)

      // Add watermark
      if (schoolInfo) {
        addPDFWatermark(doc, schoolInfo)
      }

      yPosition += 5

      // Group schedules by class
      const uniqueClassIds = [...new Set(schedules.map(s => s.class_id))]

      uniqueClassIds.forEach((classId, index) => {
        const className = classes.find(c => c.id === classId)?.class_name || 'Unknown Class'
        const classSchedules = schedules.filter(s => s.class_id === classId && s.subject_id)

        if (classSchedules.length === 0) return

        // Add class header
        doc.setFontSize(13)
        doc.setFont(PDF_FONTS.primary, 'bold')
        doc.setTextColor(...PDF_COLORS.primary)
        doc.text(`Class: ${className}`, 14, yPosition)
        yPosition += 7

        // Prepare table data
        const tableData = classSchedules.map((schedule, idx) => {
          const subjectName = subjects.find(s => s.id === schedule.subject_id)?.subject_name || 'N/A'
          const examDate = new Date(schedule.exam_date).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            weekday: 'short'
          })
          const startTime = formatTime(schedule.start_time)
          const endTime = formatTime(schedule.end_time)

          return [
            idx + 1,
            subjectName,
            examDate,
            `${startTime} - ${endTime}`,
            schedule.room_number || '-'
          ]
        })

        // Add table
        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Subject', 'Exam Date & Day', 'Time', 'Room']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: PDF_COLORS.headerBg,
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: {
            fontSize: 10,
            cellPadding: 3,
            halign: 'center'
          },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 100, halign: 'left' },
            2: { cellWidth: 60, fontStyle: 'bold' },
            3: { cellWidth: 50 },
            4: { cellWidth: 40 }
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248]
          }
        })

        yPosition = doc.lastAutoTable.finalY + 10

        // Check if we need a new page
        if (yPosition > 170 && index < uniqueClassIds.length - 1) {
          doc.addPage('landscape')

          // Add header on new page
          yPosition = addPDFHeader(doc, schoolInfo, 'EXAMINATION DATE SHEET', headerOptions)
          if (schoolInfo) {
            addPDFWatermark(doc, schoolInfo)
          }
          yPosition += 5
        }
      })

      // Add professional footer to all pages
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        addPDFFooter(doc, i, pageCount)
      }

      // Generate PDF blob for preview
      const fileName = `${datesheet.title.replace(/\s+/g, '_')}_${datesheet.session}.pdf`
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('PDF generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast(`Failed to generate PDF: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Generate Single Class Datesheet PDF
  const generateSingleClassDatesheetPDF = async (classId) => {
    if (!selectedExamForReport || !classId) {
      showToast('Please select both datesheet and class', 'warning')
      return
    }

    try {
      const datesheet = datesheets.find(d => d.id === selectedExamForReport)
      if (!datesheet) {
        showToast('Datesheet not found', 'error')
        return
      }

      console.log('📊 Generating single class PDF with:', {
        datesheet_id: selectedExamForReport,
        class_id: classId,
        datesheet_title: datesheet.title
      })

      // Fetch schedules for this class
      const { data: classSchedules, error } = await supabase
        .from('datesheet_schedules')
        .select(`
          *,
          subjects (subject_name, subject_code)
        `)
        .eq('datesheet_id', selectedExamForReport)
        .eq('class_id', classId)
        .not('subject_id', 'is', null)
        .order('exam_date')

      if (error) {
        console.error('❌ Error fetching schedules:', error)
        throw error
      }

      console.log('✅ Fetched schedules:', classSchedules)
      console.log(`📋 Found ${classSchedules?.length || 0} schedules for this class`)

      if (!classSchedules || classSchedules.length === 0) {
        showToast('No exam schedules found for this class. Please add subjects to the datesheet first.', 'warning')
        return
      }

      const doc = new jsPDF()

      // Add professional header with logo
      const headerOptions = {
        subtitle: datesheet.title.toUpperCase(),
        session: datesheet.session,
        info: `Class: ${getClassName(classId)}`,
        ...(datesheet.exam_center && { examCenter: datesheet.exam_center })
      }
      let yPosition = addPDFHeader(doc, schoolInfo, 'DATE SHEET SCHEDULE', headerOptions)

      // Add watermark
      if (schoolInfo) {
        addPDFWatermark(doc, schoolInfo)
      }

      yPosition += 5

      // Schedule Table
      const tableTop = yPosition
      const tableData = classSchedules?.map((schedule, index) => {
        const date = new Date(schedule.exam_date)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        const formattedDate = `${dayNames[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')}-${monthNames[date.getMonth()]}-${date.getFullYear()}`

        return [
          (index + 1).toString(),
          schedule.subjects?.subject_name || 'N/A',
          formattedDate,
          schedule.start_time || 'N/A',
          schedule.end_time || 'N/A',
          schedule.room_number || 'N/A'
        ]
      }) || []

      autoTable(doc, {
        startY: tableTop,
        head: [['#', 'Subject', 'Exam Date', 'Start Time', 'End Time', 'Room No']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: PDF_COLORS.headerBg,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 50, halign: 'left' },
          2: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' }
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        }
      })

      // Add professional footer
      addPDFFooter(doc, 1, 1)

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      const fileName = `${getClassName(classId)}_${datesheet.title}_Datesheet.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('Single class datesheet generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating single class datesheet:', error)
      showToast(`Error generating datesheet: ${error.message}`, 'error')
    }
  }

  // Generate All Classes Datesheet PDF
  const generateAllClassesDatesheetPDF = async () => {
    if (!selectedExamForReport) {
      showToast('Please select a datesheet', 'warning')
      return
    }

    try {
      const datesheet = datesheets.find(d => d.id === selectedExamForReport)
      if (!datesheet) {
        showToast('Datesheet not found', 'error')
        return
      }

      console.log('📊 Generating all classes PDF with:', {
        datesheet_id: selectedExamForReport,
        datesheet_title: datesheet.title,
        class_ids: datesheet.class_ids
      })

      // Fetch all schedules for this datesheet
      const { data: allSchedules, error } = await supabase
        .from('datesheet_schedules')
        .select(`
          *,
          subjects (subject_name, subject_code)
        `)
        .eq('datesheet_id', selectedExamForReport)
        .order('exam_date')

      if (error) {
        console.error('❌ Error fetching schedules:', error)
        throw error
      }

      console.log('✅ Fetched all schedules:', allSchedules)
      console.log(`📋 Found ${allSchedules?.length || 0} total schedules`)

      if (!allSchedules || allSchedules.length === 0) {
        showToast('No exam schedules found. Please add subjects to the datesheet first.', 'warning')
        return
      }

      // Get unique dates
      const uniqueDates = [...new Set(allSchedules.map(s => s.exam_date))].sort()

      // Get classes that have schedules
      const classesInDatesheet = datesheet.class_ids || []
      const filteredClasses = classes.filter(c => classesInDatesheet.includes(c.id))

      const doc = new jsPDF('landscape')

      // Add professional header with logo
      const headerOptions = {
        subtitle: datesheet.title.toUpperCase(),
        session: datesheet.session,
        info: 'All Classes Examination Schedule'
      }
      let yPosition = addPDFHeader(doc, schoolInfo, 'EXAMINATION DATE SHEET', headerOptions)

      // Add watermark
      if (schoolInfo) {
        addPDFWatermark(doc, schoolInfo)
      }

      yPosition += 5

      // Build table data
      const tableHead = [
        ['#', 'Class Name', ...uniqueDates.map(date => {
          const d = new Date(date)
          return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`
        })]
      ]

      const tableBody = filteredClasses.map((cls, index) => {
        const row = [
          (index + 1).toString(),
          cls.class_name
        ]

        uniqueDates.forEach(date => {
          const schedule = allSchedules.find(s => s.class_id === cls.id && s.exam_date === date)
          if (schedule && schedule.subjects) {
            row.push(schedule.subjects.subject_name)
          } else {
            row.push('-')
          }
        })

        return row
      })

      const tableTop = yPosition

      autoTable(doc, {
        startY: tableTop,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: PDF_COLORS.headerBg,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 2,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 30, halign: 'left', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        }
      })

      // Add professional footer
      addPDFFooter(doc, 1, 1)

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      const fileName = `All_Classes_${datesheet.title}_Datesheet.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('All classes datesheet generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating all classes datesheet:', error)
      showToast(`Error generating datesheet: ${error.message}`, 'error')
    }
  }

  const handleSingleClassDatesheet = () => {
    if (!selectedExamForReport) {
      showToast('Please select a datesheet first', 'warning')
      return
    }
    setShowDatesheetClassModal(true)
  }

  const handleAllClassesDatesheet = () => {
    generateAllClassesDatesheetPDF()
  }

  const handleGenerateSingleClassPDF = () => {
    if (!selectedClassForDatesheet) {
      showToast('Please select a class', 'warning')
      return
    }
    generateSingleClassDatesheetPDF(selectedClassForDatesheet)
    setShowDatesheetClassModal(false)
    setSelectedClassForDatesheet('')
  }

  return (
    <div className="p-1">
      {/* Tabs */}
      {activeTab !== 'schedule' && (
        <div className="flex gap-2 mb-2">
          {['datesheets', 'reports'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize rounded-lg ${
                activeTab === tab
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab === 'datesheets' ? 'Datesheets Management' : 'Slips'}
            </button>
          ))}
        </div>
      )}

      {/* DATESHEETS TAB */}
      {activeTab === 'datesheets' && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search datesheets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 pr-10 w-80 text-sm"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Create New Datesheet
            </button>
          </div>

          {session && !session.name && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 mb-2">
              <div className="flex">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <div className="ml-2">
                  <p className="text-xs text-yellow-700">
                    <strong>No Active Session:</strong> Please create an academic session and mark it as current before creating datesheets.
                  </p>
                </div>
              </div>
            </div>
          )}

          {session && session.name && (
            <div className="mb-2 text-xs text-gray-600">
              There are <span className="font-semibold text-red-600">{filteredDatesheets.length}</span> records for session
              <span className="font-semibold"> {session.name}</span>
            </div>
          )}

          {!currentUser || loading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
              Loading datesheets...
            </div>
          ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
              <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Datesheet Title</th>
              <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Classes</th>
              <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Start Date</th>
              <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Exam Center</th>
              <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Options</th>
            </tr>
          </thead>
          <tbody>
            {filteredDatesheets.length > 0 ? (
              filteredDatesheets.map((datesheet, index) => (
                <tr key={datesheet.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                  <td className="px-3 py-2.5 border border-gray-200">{index + 1}</td>
                  <td className="px-3 py-2.5 font-medium border border-gray-200">{datesheet.title}</td>
                  <td className="px-3 py-2.5 border border-gray-200">
                    {datesheet.class_ids && datesheet.class_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {datesheet.class_ids.map(classId => {
                          const classInfo = classes.find(c => c.id === classId)
                          return classInfo ? (
                            <span key={classId} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                              {classInfo.class_name}
                            </span>
                          ) : null
                        })}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2.5 border border-gray-200">{datesheet.start_date || '-'}</td>
                  <td className="px-3 py-2.5 border border-gray-200">{datesheet.exam_center || '-'}</td>
                  <td className="px-3 py-2.5 border border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenSchedule(datesheet)}
                        className="bg-blue-900 text-white px-4 py-1 rounded text-sm hover:bg-blue-800 flex items-center gap-1"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule
                      </button>
                      <button
                        onClick={() => handleGeneratePDF(datesheet)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Download PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditDatesheet(datesheet)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDatesheet(datesheet.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-3 py-4 text-center text-gray-500 text-sm">
                  {loading ? 'Loading...' : 'No datesheets found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
          )}
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => { setShowCreateModal(false); resetForm(); }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">Create New Datesheet</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-300">
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateModalSection('basic')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    createModalSection === 'basic'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Basic Class Data
                  </div>
                </button>
                <button
                  onClick={() => setCreateModalSection('subjects')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    createModalSection === 'subjects'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Subjects ({addedSubjects.length})
                  </div>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* SECTION 1: Basic Class Data */}
              {createModalSection === 'basic' && (
                <div className="space-y-4">
                  {/* Class Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClassForDatesheet}
                      onChange={(e) => setSelectedClassForDatesheet(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Datesheet Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Datesheet Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mid term exam"
                      value={datesheetTitle}
                      onChange={(e) => setDatesheetTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Center/Room No */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Center / Room No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 101"
                      value={examCenter}
                      onChange={(e) => setExamCenter(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: Subjects Section */}
              {createModalSection === 'subjects' && (
                <div className="space-y-4">
                  {/* Subject Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={currentSubject}
                      onChange={(e) => setCurrentSubject(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!selectedClassForDatesheet}
                    >
                      <option value="">
                        {selectedClassForDatesheet ? 'Select a subject' : 'Please select a class first'}
                      </option>
                      {classSubjects
                        .filter(subject => {
                          // Get already added subject IDs (excluding the one being edited)
                          const addedSubjectIds = addedSubjects
                            .filter((_, index) => index !== editingSubjectIndex)
                            .map(s => s.subject_id)
                          // Show only subjects that haven't been added yet
                          return !addedSubjectIds.includes(subject.id)
                        })
                        .map(subject => (
                          <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Show fields when subject is selected */}
                  {currentSubject && (
                    <div className="space-y-4 bg-white p-4 rounded-lg border border-blue-200">
                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={currentSubjectDate}
                          onChange={(e) => setCurrentSubjectDate(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Start Time */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={currentSubjectStartTime}
                            onChange={(e) => setCurrentSubjectStartTime(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {/* End Time */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={currentSubjectEndTime}
                            onChange={(e) => setCurrentSubjectEndTime(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Add/Update Button */}
                      <div className="flex gap-2">
                        {editingSubjectIndex !== null && (
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={handleAddSubject}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                        >
                          <Plus className="w-4 h-4" />
                          {editingSubjectIndex !== null ? 'Update Subject' : 'Add Subject'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Display Added Subjects */}
                  {addedSubjects.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Added Subjects ({addedSubjects.length})
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {addedSubjects.map((subject, index) => (
                          <div
                            key={index}
                            className="bg-blue-50 border border-blue-300 rounded-lg p-3 flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-blue-900">{subject.subject_name}</span>
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="text-sm text-gray-700 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                  <span>{new Date(subject.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                                  <span>{subject.start_time} - {subject.end_time}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleEditSubject(index)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100 transition"
                                title="Edit subject"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveSubject(index)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition"
                                title="Remove subject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleCreateDatesheet}
                disabled={loading || addedSubjects.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Save Datesheet'} <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* SCHEDULE SECTION */}
      {activeTab === 'schedule' && currentDatesheet && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setActiveTab('datesheets')}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Datesheets
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800">
                Update Date Sheet Schedule - {currentDatesheet.title}
              </h2>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-2 py-2 font-semibold text-xs">Sr.</th>
                  <th className="border border-blue-800 px-2 py-2 font-semibold text-xs">Class Name</th>
                  {scheduleDates.map(date => (
                    <th key={date} className="border border-blue-800 px-1.5 py-2 font-semibold text-xs min-w-[110px]">
                      {new Date(date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedClasses?.map((classId, index) => (
                  <tr key={classId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                    <td className="border border-gray-200 px-2 py-1.5 text-center text-xs">{index + 1}</td>
                    <td className="border border-gray-200 px-2 py-1.5 font-medium text-xs">
                      {getClassName(classId)}
                    </td>
                    {scheduleDates.map(date => {
                      const schedule = getScheduleForClassAndDate(classId, date)
                      const isDropTarget = dropTargetDate === date && draggedSchedule?.class_id === classId
                      return (
                        <td
                          key={date}
                          className={`border border-gray-200 px-1 py-1.5 min-h-[70px] transition-all ${
                            isDropTarget ? 'bg-blue-100 border-blue-500' : ''
                          }`}
                          onDragOver={(e) => {
                            if (draggedSchedule?.class_id === classId) {
                              handleDragOver(e, date)
                            }
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => {
                            if (draggedSchedule?.class_id === classId) {
                              handleDrop(e, date)
                            }
                          }}
                        >
                          {schedule?.subject_id ? (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, schedule)}
                              onDragEnd={handleDragEnd}
                              className={`flex flex-col gap-0.5 bg-blue-50 border border-blue-300 rounded p-1.5 cursor-move hover:shadow-md transition ${
                                draggedSchedule?.id === schedule.id ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="font-semibold text-blue-800 text-xs leading-tight">
                                {getSubjectName(schedule.subject_id)}
                              </div>
                              <div className="flex items-center gap-0.5 text-[10px] text-gray-600">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{schedule.start_time} - {schedule.end_time}</span>
                              </div>
                              {schedule.room_number && (
                                <div className="text-[10px] text-gray-600">
                                  Room: {schedule.room_number}
                                </div>
                              )}
                              <div className="flex gap-0.5 mt-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditSchedule(schedule)
                                  }}
                                  className="text-blue-600 hover:text-blue-800 p-0.5"
                                  title="Edit schedule"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={`min-h-[60px] flex items-center justify-center text-[10px] text-gray-400 rounded border-2 border-dashed ${
                              isDropTarget ? 'border-blue-500' : 'border-gray-300'
                            }`}>
                              {isDropTarget ? 'Drop here' : (
                                schedule && hasUnscheduledSubjects(classId) && (
                                  <button
                                    onClick={() => handleEditSchedule(schedule)}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    + Add Subject
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Datesheet Modal */}
      {showEditExamModal && currentDatesheet && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => { setShowEditExamModal(false); resetForm(); }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">Update Datesheet</h2>
              <button onClick={() => { setShowEditExamModal(false); resetForm(); }} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-300">
              <div className="flex gap-2">
                <button
                  onClick={() => setEditModalSection('basic')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    editModalSection === 'basic'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Basic Class Data
                  </div>
                </button>
                <button
                  onClick={() => setEditModalSection('subjects')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    editModalSection === 'subjects'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Subjects ({addedSubjects.length})
                  </div>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* SECTION 1: Basic Class Data */}
              {editModalSection === 'basic' && (
                <div className="space-y-4">
                  {/* Class Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClassForDatesheet}
                      onChange={(e) => setSelectedClassForDatesheet(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Datesheet Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Datesheet Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mid term exam"
                      value={datesheetTitle}
                      onChange={(e) => setDatesheetTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Center/Room No */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Center / Room No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 101"
                      value={examCenter}
                      onChange={(e) => setExamCenter(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: Subjects Section */}
              {editModalSection === 'subjects' && (
                <div className="space-y-4">
                  {/* Subject Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={currentSubject}
                      onChange={(e) => setCurrentSubject(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!selectedClassForDatesheet}
                    >
                      <option value="">
                        {selectedClassForDatesheet ? 'Select a subject' : 'Please select a class first'}
                      </option>
                      {classSubjects
                        .filter(subject => {
                          // Get already added subject IDs (excluding the one being edited)
                          const addedSubjectIds = addedSubjects
                            .filter((_, index) => index !== editingSubjectIndex)
                            .map(s => s.subject_id)
                          // Show only subjects that haven't been added yet
                          return !addedSubjectIds.includes(subject.id)
                        })
                        .map(subject => (
                          <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Show fields when subject is selected */}
                  {currentSubject && (
                    <div className="space-y-4 bg-white p-4 rounded-lg border border-blue-200">
                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={currentSubjectDate}
                          onChange={(e) => setCurrentSubjectDate(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Start Time */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={currentSubjectStartTime}
                            onChange={(e) => setCurrentSubjectStartTime(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {/* End Time */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={currentSubjectEndTime}
                            onChange={(e) => setCurrentSubjectEndTime(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Add/Update Button */}
                      <div className="flex gap-2">
                        {editingSubjectIndex !== null && (
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={handleAddSubject}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                        >
                          <Plus className="w-4 h-4" />
                          {editingSubjectIndex !== null ? 'Update Subject' : 'Add Subject'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Display Added Subjects */}
                  {addedSubjects.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Added Subjects ({addedSubjects.length})
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {addedSubjects.map((subject, index) => (
                          <div
                            key={index}
                            className="bg-blue-50 border border-blue-300 rounded-lg p-3 flex items-start justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-blue-900">{subject.subject_name}</span>
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="text-sm text-gray-700 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                  <span>{new Date(subject.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                                  <span>{subject.start_time} - {subject.end_time}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleEditSubject(index)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100 transition"
                                title="Edit subject"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveSubject(index)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition"
                                title="Remove subject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowEditExamModal(false); resetForm(); }}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleUpdateDatesheet}
                disabled={loading || addedSubjects.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Updating...' : 'Update Datesheet'} <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Schedule Modal */}
      {showEditScheduleModal && editingSchedule && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowEditScheduleModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-semibold">Edit Schedule</h2>
                <p className="text-sm text-blue-100">
                  Class: {getClassName(editingSchedule.class_id)}
                </p>
              </div>
              <button onClick={() => setShowEditScheduleModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Subject</option>
                  {classSubjects.length > 0 ? (
                    (() => {
                      // Get all subject IDs already scheduled for this class
                      const scheduledSubjectIds = schedules
                        .filter(s => s.class_id === editingSchedule.class_id && s.subject_id && s.id !== editingSchedule.id)
                        .map(s => s.subject_id)

                      // Filter out subjects that are already scheduled
                      const availableSubjects = classSubjects.filter(subject =>
                        !scheduledSubjectIds.includes(subject.id)
                      )

                      if (availableSubjects.length === 0) {
                        return <option value="" disabled>All subjects already scheduled</option>
                      }

                      return availableSubjects.map(subject => (
                        <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                      ))
                    })()
                  ) : (
                    <option value="" disabled>No subjects assigned to this class</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                <input
                  type="text"
                  value={editRoomNumber}
                  onChange={(e) => setEditRoomNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Room 101"
                />
              </div>
            </div>

            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowEditScheduleModal(false)}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSchedule}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : 'Save'} <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg shadow-md p-2">
          {/* Header with Generate New Slips Button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Reports & Slips</h2>
            <button
              onClick={() => handleOpenReportConfig('rollno')}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Generate New Slips
            </button>
          </div>

          {/* Class Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Class (Optional)</label>
            <select
              value={slipClassFilter}
              onChange={(e) => setSlipClassFilter(e.target.value)}
              className="w-full md:w-1/2 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.class_name}</option>
              ))}
            </select>
          </div>

          {/* Slips Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Sr.</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Student Name</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Roll Number</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Class</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Slip Number</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fetchedSlips.length > 0 ? (
                  fetchedSlips.map((slip, index) => (
                    <tr key={slip.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                      <td className="border border-gray-200 px-3 py-2.5">{index + 1}</td>
                      <td className="border border-gray-200 px-3 py-2.5 font-medium">{slip.student_name}</td>
                      <td className="border border-gray-200 px-3 py-2.5">{slip.roll_number}</td>
                      <td className="border border-gray-200 px-3 py-2.5">{slip.class_name}</td>
                      <td className="border border-gray-200 px-3 py-2.5">{slip.slip_number}</td>
                      <td className="border border-gray-200 px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleViewSlip(slip)}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="border border-gray-200 px-3 py-8 text-center text-gray-500">
                      {selectedExamForReport ? (slipClassFilter ? 'No slips found for this class' : 'No slips generated yet. Click "Generate New Slips" to create slips.') : 'Please select a datesheet from the Schedule tab first'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generated Slips Modal */}
      {showGeneratedSlipsModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowGeneratedSlipsModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                <h3 className="text-lg font-bold">
                  Generated {reportType === 'admit-card' ? 'Admit Cards' : 'Roll No Slips'}
                </h3>
                <button onClick={() => setShowGeneratedSlipsModal(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {generatedSlips.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-blue-900 text-white">
                          <th className="border border-blue-800 px-4 py-2.5 text-left font-semibold">Sr.</th>
                          <th className="border border-blue-800 px-4 py-2.5 text-left font-semibold">Student Name</th>
                          <th className="border border-blue-800 px-4 py-2.5 text-left font-semibold">Father Name</th>
                          <th className="border border-blue-800 px-4 py-2.5 text-left font-semibold">Roll No</th>
                          <th className="border border-blue-800 px-4 py-2.5 text-left font-semibold">Slip Number</th>
                          <th className="border border-blue-800 px-4 py-2.5 text-left font-semibold">Generated On</th>
                          <th className="border border-blue-800 px-4 py-2.5 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedSlips.map((slip, index) => (
                          <tr key={slip.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                            <td className="border border-gray-200 px-4 py-2.5">{index + 1}</td>
                            <td className="border border-gray-200 px-4 py-2.5">
                              {slip.students?.first_name && slip.students?.last_name
                                ? `${slip.students.first_name} ${slip.students.last_name}`
                                : slip.students?.first_name || 'N/A'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2.5">{slip.students?.father_name || 'N/A'}</td>
                            <td className="border border-gray-200 px-4 py-2.5">{slip.students?.roll_number || 'N/A'}</td>
                            <td className="border border-gray-200 px-4 py-2.5">{slip.slip_number}</td>
                            <td className="border border-gray-200 px-4 py-2.5">
                              {new Date(slip.created_at).toLocaleDateString()}
                            </td>
                            <td className="border border-gray-200 px-4 py-2.5 text-center">
                              <button
                                onClick={() => generateRollNoSlipPDF(slip)}
                                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex items-center gap-1 mx-auto"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                                PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No slips generated yet</p>
                    <p className="text-gray-400 text-sm mt-2">Click "Generate New" to create slips</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  onClick={() => setShowGeneratedSlipsModal(false)}
                  className="px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Report Configuration Modal (matching payroll design) */}
      {showReportConfigModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowReportConfigModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">
                Generate {reportType === 'datesheet' ? 'Date Sheet' : reportType === 'rollno' ? 'Roll No Slips' : 'Admit Cards'}
              </h2>
              <button onClick={() => setShowReportConfigModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
                <div className="space-y-4">
                  {/* Datesheet Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Datesheet <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reportConfig.selectedDatesheet}
                      onChange={(e) => {
                        // Reset class selection when datesheet changes
                        setReportConfig({
                          ...reportConfig,
                          selectedDatesheet: e.target.value,
                          selectedClass: 'all' // Reset to "All Classes"
                        })
                        setFilteredStudents(students) // Reset student filter
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select a datesheet</option>
                      {datesheets.map(datesheet => (
                        <option key={datesheet.id} value={datesheet.id}>{datesheet.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Class Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                    <select
                      value={reportConfig.selectedClass}
                      onChange={(e) => {
                        const newConfig = { ...reportConfig, selectedClass: e.target.value }
                        setReportConfig(newConfig)
                        // Filter students when class changes
                        if (e.target.value !== 'all') {
                          const classStudents = students.filter(s => s.current_class_id === e.target.value)
                          setFilteredStudents(classStudents)
                        } else {
                          setFilteredStudents(students)
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      disabled={!reportConfig.selectedDatesheet}
                    >
                      <option value="all">All Classes</option>
                      {(() => {
                        // Filter classes based on selected datesheet
                        if (reportConfig.selectedDatesheet) {
                          const selectedDatesheet = datesheets.find(d => d.id === reportConfig.selectedDatesheet)
                          if (selectedDatesheet && selectedDatesheet.class_ids && Array.isArray(selectedDatesheet.class_ids)) {
                            return classes
                              .filter(cls => selectedDatesheet.class_ids.includes(cls.id))
                              .map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                              ))
                          }
                        }
                        // If no datesheet selected, show all classes
                        return classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                        ))
                      })()}
                    </select>
                  </div>

                  {/* Student Selection with Search */}
                  {(reportType === 'rollno' || reportType === 'admit-card') && (
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>

                      {/* Custom Searchable Dropdown */}
                      <div className="relative student-dropdown-container">
                        <div
                          onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 transition"
                        >
                          <span className={reportConfig.selectedStudent === 'all' || !reportConfig.selectedStudent ? 'text-gray-500' : 'text-gray-900'}>
                            {(() => {
                              if (reportConfig.selectedStudent === 'all') return 'All Students'
                              const student = filteredStudents.find(s => s.id === reportConfig.selectedStudent)
                              if (student) {
                                const displayName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unnamed'
                                return `${displayName} - Roll: ${student.roll_number}`
                              }
                              return 'Select a student'
                            })()}
                          </span>
                          <svg className={`w-4 h-4 transition-transform ${isStudentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Dropdown Menu */}
                        {isStudentDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                            {/* Search Input */}
                            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                              <input
                                type="text"
                                placeholder="Search by name or roll number..."
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {/* Options List */}
                            <div className="overflow-y-auto max-h-64">
                              <div
                                onClick={() => {
                                  setReportConfig({ ...reportConfig, selectedStudent: 'all' })
                                  setIsStudentDropdownOpen(false)
                                  setStudentSearchQuery('')
                                }}
                                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                                  reportConfig.selectedStudent === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-900'
                                }`}
                              >
                                All Students
                              </div>
                              {filteredStudents
                                .filter(student => {
                                  if (!studentSearchQuery) return true
                                  const searchLower = studentSearchQuery.toLowerCase()
                                  const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim()
                                  return (
                                    fullName.toLowerCase().includes(searchLower) ||
                                    student.roll_number?.toString().includes(searchLower) ||
                                    student.admission_number?.toString().includes(searchLower)
                                  )
                                })
                                .map(student => {
                                  const displayName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unnamed'
                                  return (
                                    <div
                                      key={student.id}
                                      onClick={() => {
                                        setReportConfig({ ...reportConfig, selectedStudent: student.id })
                                        setIsStudentDropdownOpen(false)
                                        setStudentSearchQuery('')
                                      }}
                                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                                        reportConfig.selectedStudent === student.id ? 'bg-blue-100 text-blue-700' : 'text-gray-900'
                                      }`}
                                    >
                                      <div className="font-medium">{displayName}</div>
                                      <div className="text-xs text-gray-500">Roll: {student.roll_number} • Adm: {student.admission_number}</div>
                                    </div>
                                  )
                                })}
                              {filteredStudents.filter(student => {
                                if (!studentSearchQuery) return true
                                const searchLower = studentSearchQuery.toLowerCase()
                                const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim()
                                return (
                                  fullName.toLowerCase().includes(searchLower) ||
                                  student.roll_number?.toString().includes(searchLower) ||
                                  student.admission_number?.toString().includes(searchLower)
                                )
                              }).length === 0 && studentSearchQuery && (
                                <div className="px-3 py-2 text-gray-500 text-sm">No students found</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {filteredStudents.length} students available
                      </p>
                    </div>
                  )}

                  {/* Display Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Display Options</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reportConfig.showRoomNumber}
                          onChange={(e) => setReportConfig({ ...reportConfig, showRoomNumber: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Show Room Number</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reportConfig.showExamTime}
                          onChange={(e) => setReportConfig({ ...reportConfig, showExamTime: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Show Exam Time</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reportConfig.showPrincipalSignature}
                          onChange={(e) => setReportConfig({ ...reportConfig, showPrincipalSignature: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Show Principal Signature</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowReportConfigModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              {(reportType === 'rollno' || reportType === 'admit-card') && reportConfig.selectedClass && reportConfig.selectedClass !== 'all' && (
                <button
                  onClick={handleGenerateAllClassSlips}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition disabled:bg-gray-400"
                >
                  {loading ? 'Generating...' : 'Generate All Class Slips'}
                </button>
              )}
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Generating...' : 'Generate Report'} <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Class Selection Modal for Datesheet */}
      {showDatesheetClassModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowDatesheetClassModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">Select Class</h2>
              <button onClick={() => setShowDatesheetClassModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select a Class</label>
                <select
                  value={selectedClassForDatesheet}
                  onChange={(e) => setSelectedClassForDatesheet(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select a class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowDatesheetClassModal(false)}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSingleClassPDF}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Generating...' : 'Generate PDF'} <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center" onClick={handleCancel}>
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold">{confirmDialog.title}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700">{confirmDialog.message}</p>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-3 min-w-[320px] max-w-md px-4 py-3 rounded-lg shadow-lg bg-green-600 text-white transform transition-all duration-300"
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 text-red-400" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-yellow-400" />}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
        isOpen={showPdfPreview}
        onClose={handleClosePdfPreview}
      />
    </div>
  )
}