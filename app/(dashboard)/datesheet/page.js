'use client'

import { useState, useEffect } from 'react'
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

  // Section State (now using tabs like HR)
  const [activeTab, setActiveTab] = useState('datesheets')

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditExamModal, setShowEditExamModal] = useState(false)
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false)

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

  // Datesheet PDF generation state
  const [showDatesheetClassModal, setShowDatesheetClassModal] = useState(false)
  const [selectedClassForDatesheet, setSelectedClassForDatesheet] = useState('')

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

  // Fetch data
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchDatesheets()
      fetchClasses()
      fetchSubjects()
      fetchStudents()
    }
  }, [currentUser, session])

  const fetchDatesheets = async () => {
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
  }

  const fetchClasses = async () => {
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
  }

  const fetchSubjects = async () => {
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
  }

  const fetchSubjectsForClass = async (classId) => {
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
  }

  const fetchStudents = async () => {
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
  }

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

    if (selectedClasses.length === 0) {
      showToast('Please select at least one class', 'warning')
      return
    }

    if (!datesheetTitle || !examStartDate) {
      showToast('Please fill all required fields', 'warning')
      return
    }

    console.log('📝 Creating datesheet with:', {
      school_id: currentUser.school_id,
      session: session.name,
      datesheetTitle,
      examStartDate,
      selectedClasses: selectedClasses.length
    })

    setLoading(true)
    try {
      // Create datesheet
      const datesheetData = {
        school_id: currentUser.school_id,
        session: session.name, // String, not UUID
        title: datesheetTitle,
        start_date: examStartDate,
        default_start_time: defaultStartTime,
        default_end_time: defaultEndTime,
        interval_days: interval,
        saturday_off: saturdayOff,
        sunday_off: sundayOff,
        exam_center: examCenter,
        class_ids: selectedClasses, // Array
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

      // Generate schedule dates (we need an estimated end date for initial schedule creation)
      // Let's assume 30 days as default duration if user doesn't specify
      const estimatedEndDate = new Date(examStartDate)
      estimatedEndDate.setDate(estimatedEndDate.getDate() + 30)

      const dates = generateScheduleDates(examStartDate, estimatedEndDate.toISOString().split('T')[0], interval, saturdayOff, sundayOff)
      console.log(`📅 Generated ${dates.length} schedule dates`)

      // Fetch subjects for each class and auto-assign to dates
      const scheduleRecords = []

      for (const classId of selectedClasses) {
        // Get subjects for this class
        const { data: classSubjectsData, error: subjectsError } = await supabase
          .from('class_subjects')
          .select('subject_id')
          .eq('school_id', currentUser.school_id)
          .eq('class_id', classId)
          .order('created_at')

        if (subjectsError) {
          console.error('Error fetching class subjects:', subjectsError)
          continue
        }

        const classSubjectIds = classSubjectsData?.map(cs => cs.subject_id) || []
        console.log(`📚 Class ${classId} has ${classSubjectIds.length} subjects`)

        // Assign subjects to dates (don't cycle - leave extra dates empty)
        dates.forEach((date, index) => {
          // Only assign subject if we have enough subjects, otherwise leave empty
          const subjectId = index < classSubjectIds.length
            ? classSubjectIds[index]
            : null

          scheduleRecords.push({
            datesheet_id: datesheet.id,
            school_id: currentUser.school_id,
            class_id: classId,
            subject_id: subjectId, // Auto-assigned subject or null for empty dates
            exam_date: date.toISOString().split('T')[0],
            start_time: defaultStartTime,
            end_time: defaultEndTime,
            room_number: examCenter,
            created_by: currentUser.id
          })
        })
      }

      console.log(`📋 Creating ${scheduleRecords.length} schedule records for ${selectedClasses.length} classes`)

      if (scheduleRecords.length > 0) {
        // Insert schedules in batches to avoid timeout
        const batchSize = 50
        for (let i = 0; i < scheduleRecords.length; i += batchSize) {
          const batch = scheduleRecords.slice(i, i + batchSize)
          console.log(`📤 Inserting batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(scheduleRecords.length / batchSize)} (${batch.length} records)`)

          const { error: scheduleError } = await supabase
            .from('datesheet_schedules')
            .insert(batch)

          if (scheduleError) {
            console.error('❌ Schedule insert error:', scheduleError)
            throw scheduleError
          }
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

  const handleOpenEditDatesheet = (datesheet) => {
    setCurrentDatesheet(datesheet)
    setDatesheetTitle(datesheet.title)
    setExamStartDate(datesheet.start_date)
    setDefaultStartTime(datesheet.default_start_time || '11:00')
    setDefaultEndTime(datesheet.default_end_time || '12:30')
    setInterval(datesheet.interval_days || 2)
    setSaturdayOff(datesheet.saturday_off !== false)
    setSundayOff(datesheet.sunday_off !== false)
    setExamCenter(datesheet.exam_center || '')
    setShowEditExamModal(true)
  }

  const handleUpdateDatesheet = async () => {
    if (!currentDatesheet) return

    try {
      const { error } = await supabase
        .from('datesheets')
        .update({
          title: datesheetTitle,
          start_date: examStartDate,
          default_start_time: defaultStartTime,
          default_end_time: defaultEndTime,
          interval_days: interval,
          saturday_off: saturdayOff,
          sunday_off: sundayOff,
          exam_center: examCenter
        })
        .eq('id', currentDatesheet.id)

      if (error) throw error

      showToast('Datesheet updated successfully', 'success')
      setShowEditExamModal(false)
      resetForm()
      fetchDatesheets()
    } catch (error) {
      console.error('Error updating datesheet:', error)
      showToast('Failed to update datesheet', 'error')
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

      // Save PDF
      doc.save(`${currentDatesheet.title}_${className}_Datesheet.pdf`)
      showToast('Datesheet downloaded successfully', 'success')
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

      // Save single PDF with all classes
      doc.save(`${currentDatesheet.title}_All_Classes_Datesheet.pdf`)
      showToast(`Downloaded datesheet for ${selectedClasses.length} classes`, 'success')
    } catch (error) {
      console.error('Error downloading all datesheets:', error)
      showToast('Failed to download all datesheets', 'error')
    }
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
  }

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId)
    return cls?.class_name || 'N/A'
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId)
    return subject?.subject_name || ''
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

  // Generate PDF for Roll No Slip or Admit Card
  const generateRollNoSlipPDF = async (slip) => {
    try {
      if (!slip.students) {
        showToast('Student information not available', 'error')
        return
      }

      // Get the datesheet details
      const datesheet = datesheets.find(d => d.id === slip.datesheet_id)
      if (!datesheet) {
        showToast('Datesheet not found', 'error')
        return
      }

      // Get exam schedules for this student's class
      const { data: examSchedules, error } = await supabase
        .from('datesheet_schedules')
        .select(`
          *,
          subjects (subject_name)
        `)
        .eq('datesheet_id', slip.datesheet_id)
        .eq('class_id', slip.students.current_class_id)
        .not('subject_id', 'is', null)
        .order('exam_date')

      if (error) {
        console.error('Error fetching schedules:', error)
        showToast('Error fetching exam schedule', 'error')
        return
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Add professional header with logo
      const studentName = slip.students.first_name && slip.students.last_name
        ? `${slip.students.first_name} ${slip.students.last_name}`
        : slip.students.first_name || 'N/A'
      const className = getClassName(slip.students.current_class_id)

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
      doc.text(slip.students.father_name || 'N/A', leftMargin + 50, boxTop + 7)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Class", leftMargin, boxTop + 14)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(className, leftMargin + 50, boxTop + 14)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Admit", leftMargin + 90, boxTop + 14)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(slip.students.admission_number?.toString() || 'N/A', leftMargin + 110, boxTop + 14)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Session", leftMargin, boxTop + 21)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(datesheet.session || 'N/A', leftMargin + 50, boxTop + 21)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text("Roll #", leftMargin + 90, boxTop + 21)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(slip.students.roll_number?.toString() || 'N/A', leftMargin + 110, boxTop + 21)

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
      const fileStudentName = slip.students.first_name && slip.students.last_name
        ? `${slip.students.first_name}_${slip.students.last_name}`
        : slip.students.first_name || 'unknown'
      const fileName = `${slip.slip_type}_${fileStudentName}_${slip.students.roll_number}.pdf`
      doc.save(fileName)

      showToast('PDF generated successfully', 'success')
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
    if (!selectedExamForReport) {
      showToast('Please select an exam first', 'warning')
      return
    }
    setReportType(type)

    // Filter students based on selected class
    if (reportConfig.selectedClass !== 'all') {
      const classStudents = students.filter(s => s.current_class_id === reportConfig.selectedClass)
      setFilteredStudents(classStudents)
    } else {
      setFilteredStudents(students)
    }

    setShowReportConfigModal(true)
  }

  const handleGenerateReport = async () => {
    if (!selectedExamForReport || !currentUser?.school_id || !currentUser?.id) {
      showToast('Missing required information', 'error')
      return
    }

    try {
      // Get the selected datesheet details
      const selectedDatesheet = datesheets.find(d => d.id === selectedExamForReport)
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
            datesheet_id: selectedExamForReport, // Changed from exam_id
            report_name: `${selectedDatesheet.title} - Date Sheet`,
            report_type: 'datesheet',
            class_id: reportConfig.selectedClass !== 'all' ? reportConfig.selectedClass : null,
            gender_filter: reportConfig.genderFilter || null,
            file_url: `/reports/datesheet/${selectedExamForReport}`,
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

        // Filter by gender if specified
        const filteredStudents = reportConfig.genderFilter && reportConfig.genderFilter !== 'all'
          ? studentsToProcess.filter(s => s.gender?.toLowerCase() === reportConfig.genderFilter)
          : studentsToProcess

        if (filteredStudents.length === 0) {
          showToast('No students found with the selected filters', 'warning')
          return
        }

        // Create roll no slips for all students
        const slips = filteredStudents.map(student => ({
          school_id: currentUser.school_id,
          datesheet_id: selectedExamForReport, // Changed from exam_id
          student_id: student.id,
          slip_number: `${selectedDatesheet.title}-${student.admission_number}`,
          slip_type: reportType === 'admit-card' ? 'admit_card' : 'roll_no_slip',
          gender: student.gender,
          file_url: `/reports/${reportType}/${selectedExamForReport}/${student.id}`,
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
          showToast(`${reportType} generated for ${filteredStudents.length} students and saved successfully`, 'success')
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

      // Generate PDF with school data
      generateDatesheetPDF(
        datesheet,
        schedules,
        classes,
        subjects,
        schoolInfo
      )

      showToast('PDF generated successfully', 'success')
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

      // Save PDF
      const fileName = `${getClassName(classId)}_${datesheet.title}_Datesheet.pdf`
      doc.save(fileName)

      showToast('Single class datesheet generated successfully', 'success')
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

      // Save PDF
      const fileName = `All_Classes_${datesheet.title}_Datesheet.pdf`
      doc.save(fileName)

      showToast('All classes datesheet generated successfully', 'success')
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

          {!session && (
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

          <div className="mb-2 text-xs text-gray-600">
            There are <span className="font-semibold text-red-600">{filteredDatesheets.length}</span> records for session
            <span className="font-semibold"> {session?.name || 'Loading...'}</span>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
              <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Datesheet Title</th>
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
                <td colSpan="5" className="px-3 py-4 text-center text-gray-500 text-sm">
                  {loading ? 'Loading...' : 'No datesheets found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => { setShowCreateModal(false); resetForm(); }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">Create New Datesheet</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class <span className="text-gray-500">(Leave blank for all classes)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedClasses.map(classId => {
                    const cls = classes.find(c => c.id === classId)
                    return (
                      <div key={classId} className="bg-gray-600 text-white px-3 py-1 rounded flex items-center gap-2">
                        {cls?.class_name}
                        <button onClick={() => removeClassChip(classId)} className="hover:text-gray-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {classes.filter(c => !selectedClasses.includes(c.id)).map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => toggleClassSelection(cls.id)}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-sm"
                    >
                      {cls.class_name}
                    </button>
                  ))}
                </div>
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
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Exam Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={examStartDate}
                    onChange={(e) => setExamStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                {/* Exam Center */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Center / Room</label>
                  <input
                    type="text"
                    placeholder="Room number or location"
                    value={examCenter}
                    onChange={(e) => setExamCenter(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Default Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Start Time</label>
                  <input
                    type="time"
                    value={defaultStartTime}
                    onChange={(e) => setDefaultStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                {/* Default End Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default End Time</label>
                  <input
                    type="time"
                    value={defaultEndTime}
                    onChange={(e) => setDefaultEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                {/* Interval */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interval</label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value={1}>Every Day</option>
                    <option value={2}>Every 2nd Day</option>
                    <option value={3}>Every 3rd Day</option>
                    <option value={4}>Every 4th Day</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Saturday Off */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Saturday Off</label>
                  <select
                    value={saturdayOff ? 'yes' : 'no'}
                    onChange={(e) => setSaturdayOff(e.target.value === 'yes')}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Sunday Off */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sunday Off</label>
                  <select
                    value={sundayOff ? 'yes' : 'no'}
                    onChange={(e) => setSundayOff(e.target.value === 'yes')}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
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
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Creating...' : 'Save'} <span className="text-xl">→</span>
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
            <button
              onClick={handleDownloadAllDatesheets}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Download className="w-4 h-4" />
              Download All Classes
            </button>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-3 py-2.5 font-semibold">Sr.</th>
                  <th className="border border-blue-800 px-3 py-2.5 font-semibold">Class Name</th>
                  {scheduleDates.map(date => (
                    <th key={date} className="border border-blue-800 px-3 py-2.5 font-semibold min-w-[150px]">
                      {new Date(date).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </th>
                  ))}
                  <th className="border border-blue-800 px-3 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedClasses?.map((classId, index) => (
                  <tr key={classId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                    <td className="border border-gray-200 px-3 py-2.5 text-center">{index + 1}</td>
                    <td className="border border-gray-200 px-3 py-2.5 font-medium">
                      {getClassName(classId)}
                    </td>
                    {scheduleDates.map(date => {
                      const schedule = getScheduleForClassAndDate(classId, date)
                      return (
                        <td key={date} className="border border-gray-200 px-2 py-2.5">
                          {schedule?.subject_id ? (
                            <div className="flex flex-col gap-1">
                              <div className="font-medium text-blue-600">
                                {getSubjectName(schedule.subject_id)}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditSchedule(schedule)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(schedule.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            schedule && hasUnscheduledSubjects(classId) && (
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="text-blue-500 hover:text-blue-700 text-xs"
                              >
                                + Add Subject
                              </button>
                            )
                          )}
                        </td>
                      )
                    })}
                    <td className="border border-gray-200 px-3 py-2.5 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleDownloadClassDatesheet(classId)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Download Datesheet"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClassFromSchedule(classId)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete Class"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowEditExamModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">Update Date Sheet ({currentDatesheet.title})</h2>
              <button onClick={() => setShowEditExamModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Datesheet Title</label>
                <input
                  type="text"
                  value={datesheetTitle}
                  onChange={(e) => setDatesheetTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={examStartDate}
                    onChange={(e) => setExamStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Center</label>
                  <input
                    type="text"
                    value={examCenter}
                    onChange={(e) => setExamCenter(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={defaultStartTime}
                    onChange={(e) => setDefaultStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={defaultEndTime}
                    onChange={(e) => setDefaultEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interval</label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value={1}>Every Day</option>
                    <option value={2}>Every 2nd Day</option>
                    <option value={3}>Every 3rd Day</option>
                    <option value={4}>Every 4th Day</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowEditExamModal(false)}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleUpdateDatesheet}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:bg-gray-400"
              >
                {loading ? 'Updating...' : 'Save'} <span className="text-xl">→</span>
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
          {/* Datesheet Selection */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Datesheet</label>
            <select
              value={selectedExamForReport}
              onChange={(e) => setSelectedExamForReport(e.target.value)}
              className="w-full md:w-1/2 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Select a datesheet</option>
              {datesheets.map(datesheet => (
                <option key={datesheet.id} value={datesheet.id}>{datesheet.title}</option>
              ))}
            </select>
            {datesheets.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No datesheets found for current session</p>
            )}
          </div>

          {/* Reports Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Sr.</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Report Type</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-200">
                  <td colSpan="3" className="border border-gray-200 px-3 py-1 font-semibold text-gray-700">
                    Roll No Slips
                  </td>
                </tr>
                <tr className="bg-white hover:bg-blue-50 transition">
                  <td className="border border-gray-200 px-3 py-2.5">1</td>
                  <td className="border border-gray-200 px-3 py-2.5 font-medium">Roll No Slips</td>
                  <td className="border border-gray-200 px-3 py-2.5 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleViewGeneratedSlips('rollno')}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-medium transition-colors"
                      >
                        View Generated
                      </button>
                      <button
                        onClick={() => handleOpenReportConfig('rollno')}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-medium transition-colors"
                      >
                        Generate New
                      </button>
                    </div>
                  </td>
                </tr>
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
                    >
                      <option value="all">All Classes</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Student Selection with Search */}
                  {(reportType === 'rollno' || reportType === 'admit-card') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
                      {/* Search Input */}
                      <input
                        type="text"
                        placeholder="Search student by name or roll number..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                      />
                      {/* Student Dropdown */}
                      <select
                        value={reportConfig.selectedStudent}
                        onChange={(e) => setReportConfig({ ...reportConfig, selectedStudent: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        
                      >
                        <option value="all">All Students</option>
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
                              <option key={student.id} value={student.id}>
                                {displayName} - Roll: {student.roll_number} - Adm: {student.admission_number}
                              </option>
                            )
                          })}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {filteredStudents.length} students found
                        {studentSearchQuery && ` (filtered by: "${studentSearchQuery}")`}
                      </p>
                    </div>
                  )}

                  {/* Gender Filter */}
                  {(reportType === 'rollno' || reportType === 'admit-card') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender Filter</label>
                      <select
                        value={reportConfig.genderFilter}
                        onChange={(e) => setReportConfig({ ...reportConfig, genderFilter: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="all">All Students</option>
                        <option value="male">Boys Only</option>
                        <option value="female">Girls Only</option>
                      </select>
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
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Cancel
              </button>
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
    </div>
  )
}