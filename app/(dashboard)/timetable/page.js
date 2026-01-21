'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Clock, CalendarDays, Plus, Edit2, Trash2, X, Search, Users, Printer, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import { getPdfSettings, hexToRgb, getMarginValues, getCellPadding, getLineWidth, getLogoSize, getAutoTableStyles } from '@/lib/pdfSettings'
import { convertImageToBase64 } from '@/lib/pdfUtils'
import PermissionGuard from '@/components/PermissionGuard'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[10001] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={16} />}
      {type === 'error' && <X size={16} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={16} />
      </button>
    </div>
  )
}

function TimetableContent() {
  const [activeTab, setActiveTab] = useState('timetable')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [periods, setPeriods] = useState([])
  const [timetable, setTimetable] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [showBulkPeriodModal, setShowBulkPeriodModal] = useState(false)
  const [showTimingModal, setShowTimingModal] = useState(false)
  const [showTimetableModal, setShowTimetableModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState(null)
  const [editingTimetable, setEditingTimetable] = useState(null)
  const [timetableLoaded, setTimetableLoaded] = useState(false)
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('')
  const [showTeacherMode, setShowTeacherMode] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [allClassesTimetables, setAllClassesTimetables] = useState([])
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false)
  const [autoGenerateForm, setAutoGenerateForm] = useState({
    class_id: '',
    day_of_week: 'Monday'
  })
  const [numberOfPeriods, setNumberOfPeriods] = useState(6)

  // Pagination state for Periods tab
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  // Delete confirmation modal state
  const [showDeletePeriodModal, setShowDeletePeriodModal] = useState(false)
  const [periodToDelete, setPeriodToDelete] = useState(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [showDeleteTimetableModal, setShowDeleteTimetableModal] = useState(false)
  const [timetableToDelete, setTimetableToDelete] = useState(null)
  const [schoolData, setSchoolData] = useState({ name: '', logo_url: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const [periodForm, setPeriodForm] = useState({
    class_id: '',
    day_of_week: '',
    period_number: '',
    period_name: '',
    start_time: '',
    end_time: '',
    period_type: 'regular'
  })

  const [bulkPeriodForm, setBulkPeriodForm] = useState({
    class_ids: [],
    day_of_weeks: [],
    start_time: '',
    period_duration: '',
    period_gap: '',
    break_period: '',
    break_duration: ''
  })

  const [timingForm, setTimingForm] = useState({
    start_time: '',
    period_duration: '',
    period_gap: '',
    break_duration: ''
  })

  const [timetableForm, setTimetableForm] = useState({
    day_of_week: 'Monday',
    period_number: '',
    entry_type: 'regular', // 'regular' or 'break'
    subject_id: '',
    teacher_id: '',
    room_number: ''
  })

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const periodTypes = [
    { value: 'regular', label: 'PERIOD' },
    { value: 'break', label: 'BREAK' },
    { value: 'lunch', label: 'LUNCH' }
  ]

  // Convert 24-hour time to 12-hour AM/PM format
  const formatTime = (time24) => {
    if (!time24) return ''
    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Format period type for display
  const formatPeriodType = (type) => {
    const typeMap = {
      'regular': 'PERIOD',
      'break': 'BREAK',
      'lunch': 'LUNCH'
    }
    return typeMap[type] || type.toUpperCase()
  }

  // Fetch user on component mount
  useEffect(() => {
    const initializeUser = () => {
      try {
        const userData = getUserFromCookie()
        console.log('🔍 User initialization:', {
          hasUserData: !!userData,
          userId: userData?.id,
          schoolId: userData?.school_id,
          role: userData?.role,
          username: userData?.username
        })

        if (userData) {
          if (!userData.school_id) {
            console.error('❌ User has no school_id!', userData)
            showToast('Error: User account is not associated with a school. Please contact support.', 'error')
            setLoadingClasses(false)
            return
          }
          setUser(userData)
        } else {
          console.error('❌ No user found in localStorage or cookies')
          console.log('📋 localStorage contents:', localStorage.getItem('user'))
          console.log('🍪 document.cookie:', document.cookie)
          setLoadingClasses(false)
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error)
        setLoadingClasses(false)
      }
    }
    initializeUser()
  }, [])

  // Fetch initial data when user is available - optimized with parallel loading
  useEffect(() => {
    if (user && user.school_id) {
      // Fetch all data in parallel for faster loading
      Promise.all([
        fetchClasses(),
        fetchSessions(),
        fetchPeriods(),
        fetchTeachers(),
        fetchSchoolData()
      ]).catch(error => {
        console.error('Error loading initial data:', error)
      })
    } else if (user) {
      setLoadingClasses(false)
    }
  }, [user])

  // Real-time subscription for periods
  useEffect(() => {
    if (!user || !user.school_id || !supabase) return

    const periodsSubscription = supabase
      .channel('periods_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'periods',
          filter: `school_id=eq.${user.school_id}`
        },
        (payload) => {
          console.log('🔔 Real-time update received:', payload)
          // Refresh periods without showing loader
          fetchPeriods(false)
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      periodsSubscription.unsubscribe()
    }
  }, [user])

  // Fetch sections when class is selected
  useEffect(() => {
    if (selectedClass && user && user.school_id) {
      fetchSections(selectedClass)
      fetchClassSubjects(selectedClass)
    }
  }, [selectedClass])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedClassFilter])

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = showPeriodModal || showBulkPeriodModal || showTimingModal ||
                           showTimetableModal || showDeletePeriodModal || showDeleteAllModal ||
                           showDeleteTimetableModal || showAutoGenerateModal

    if (isAnyModalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    // Cleanup function to restore scroll on component unmount
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showPeriodModal, showBulkPeriodModal, showTimingModal, showTimetableModal,
      showDeletePeriodModal, showDeleteAllModal, showDeleteTimetableModal, showAutoGenerateModal])

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true)
      console.log('📚 fetchClasses called')

      if (!user || !user.school_id) {
        console.error('❌ Cannot fetch classes - missing user or school_id:', {
          hasUser: !!user,
          userId: user?.id,
          school_id: user?.school_id
        })
        setLoadingClasses(false)
        return
      }

      console.log('✅ Fetching classes for school:', user.school_id)

      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, status, school_id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) {
        console.error('❌ Error fetching classes:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        setClasses([])
      } else {
        console.log('✅ Classes fetched successfully:', data)
        console.log('📊 Number of classes:', data?.length || 0)
        if (data && data.length > 0) {
          console.log('📋 Class names:', data.map(c => c.class_name).join(', '))
        } else {
          console.warn('⚠️ No classes found for school_id:', user.school_id)
          // Debug: Check all classes without school_id filter
          const { data: allClasses } = await supabase
            .from('classes')
            .select('id, class_name, school_id, status')
            .eq('status', 'active')
            .limit(10)
          console.log('🔍 Sample of all active classes in DB:', allClasses)
        }
        setClasses(data || [])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      setClasses([])
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSections = async (classId) => {
    try {
      if (!user || !user.school_id) return

      const { data, error } = await supabase
        .from('sections')
        .select('id, section_name, room_number, status')
        .eq('school_id', user.school_id)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (error) {
        console.error('Error fetching sections:', error)
        setSections([])
      } else {
        setSections(data || [])
      }
    } catch (error) {
      console.error('Error fetching sections:', error)
      setSections([])
    }
  }

  const fetchSessions = async () => {
    try {
      if (!user || !user.school_id) return

      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date, is_current, status')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
      } else {
        const current = data?.find(s => s.is_current)
        if (current) {
          setCurrentSession(current)
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  const fetchPeriods = useCallback(async (showLoader = true) => {
    try {
      if (!user || !user.school_id) return

      if (showLoader) {
        setLoading(true)
      }

      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('school_id', user.school_id)
        .order('period_number', { ascending: true })

      if (error) {
        console.error('Error fetching periods:', error)
        setPeriods([])
      } else {
        setPeriods(data || [])
      }

      if (showLoader) {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching periods:', error)
      setPeriods([])
      if (showLoader) {
        setLoading(false)
      }
    }
  }, [user])

  const fetchClassSubjects = async (classId) => {
    try {
      if (!user || !user.school_id) return

      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          id,
          subjects:subject_id (id, subject_name, subject_code)
        `)
        .eq('school_id', user.school_id)
        .eq('class_id', classId)

      if (error) {
        console.error('Error fetching subjects:', error)
        setSubjects([])
      } else {
        const subjectsList = data?.map(item => item.subjects).filter(Boolean) || []
        setSubjects(subjectsList)
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setSubjects([])
    }
  }

  const fetchSchoolData = async () => {
    try {
      if (!user || !user.school_id) {
        console.log('❌ Cannot fetch school data - no user or school_id')
        return
      }

      console.log('🔄 Fetching school data for school_id:', user.school_id)

      const { data, error } = await supabase
        .from('schools')
        .select('name, logo_url')
        .eq('id', user.school_id)
        .single()

      if (error) {
        console.error('❌ Error fetching school data:', error)
      } else if (data) {
        console.log('✅ School data fetched successfully:', { name: data.name, hasLogo: !!data.logo_url })
        setSchoolData({ name: data.name || '', logo_url: data.logo_url || '' })
      } else {
        console.log('⚠️ No school data found')
      }
    } catch (error) {
      console.error('❌ Error fetching school data:', error)
    }
  }

  const fetchTeachers = async () => {
    try {
      if (!user || !user.school_id) return

      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, designation')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('first_name', { ascending: true })

      if (error) {
        console.error('Error fetching teachers:', error)
        setTeachers([])
      } else {
        setTeachers(data || [])
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
      setTeachers([])
    }
  }

  const fetchTimetable = async () => {
    try {
      setLoading(true)
      if (!user || !user.school_id || !selectedClass) {
        console.warn('Missing required data for timetable fetch')
        setLoading(false)
        return
      }

      // If no current session, create a dummy session or use null
      const sessionId = currentSession?.id || null

      const query = supabase
        .from('timetable')
        .select(`
          *,
          subjects:subject_id (subject_name, subject_code),
          staff:teacher_id (first_name, last_name)
        `)
        .eq('school_id', user.school_id)
        .eq('class_id', selectedClass)

      // Only filter by session if we have one
      if (sessionId) {
        query.eq('session_id', sessionId)
      }

      query.order('day_of_week').order('period_number')

      if (selectedSection) {
        query.eq('section_id', selectedSection)
      } else {
        query.is('section_id', null)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching timetable:', error)
        setTimetable([])
      } else {
        console.log('Timetable data fetched:', data)
        setTimetable(data || [])

        // Update number of periods based on max period in timetable
        if (data && data.length > 0) {
          const maxPeriod = Math.max(...data.map(t => t.period_number))
          setNumberOfPeriods(Math.max(6, maxPeriod)) // Minimum 6 periods
        }
      }
    } catch (error) {
      console.error('Error fetching timetable:', error)
      setTimetable([])
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = async () => {
    if (!selectedClass) {
      showToast('Please select a class first', 'error')
      return
    }
    if (activeTab === 'timetable') {
      setTimetableLoaded(true)
      if (selectedClass === 'all') {
        // Load all classes' timetables
        const allTimetablesData = await fetchAllClassesTimetables()
        setAllClassesTimetables(allTimetablesData)
      } else {
        // Load single class timetable
        fetchTimetable()
      }
    }
  }

  // Fetch all timetables for all classes
  const fetchAllClassesTimetables = async () => {
    try {
      setLoading(true)
      if (!user || !user.school_id) {
        console.warn('Missing required data for timetable fetch')
        setLoading(false)
        return []
      }

      const sessionId = currentSession?.id || null

      // Fetch all timetables in parallel for better performance
      const timetablePromises = classes.map(async (cls) => {
        const query = supabase
          .from('timetable')
          .select(`
            *,
            subjects:subject_id (subject_name, subject_code),
            staff:teacher_id (first_name, last_name)
          `)
          .eq('school_id', user.school_id)
          .eq('class_id', cls.id)

        if (sessionId) {
          query.eq('session_id', sessionId)
        }

        query.order('day_of_week').order('period_number')
        query.is('section_id', null)

        const { data, error } = await query

        if (error) {
          console.error('Error fetching timetable for class:', cls.class_name, error)
          return null
        }

        return {
          class_id: cls.id,
          class_name: cls.class_name,
          timetable: data || []
        }
      })

      // Wait for all queries to complete
      const results = await Promise.all(timetablePromises)

      // Filter out null results (errors)
      const allTimetables = results.filter(result => result !== null)

      setLoading(false)
      return allTimetables
    } catch (error) {
      console.error('Error fetching all timetables:', error)
      setLoading(false)
      return []
    }
  }

  const handleSavePeriod = async () => {
    try {
      if (!periodForm.period_number || !periodForm.start_time || !periodForm.end_time) {
        showToast('Please fill all required fields (Period Number, Start Time, End Time)', 'error')
        return
      }

      if (!user || !user.school_id) {
        showToast('User authentication error', 'error')
        return
      }

      const periodData = {
        user_id: user.id,
        school_id: user.school_id,
        class_id: periodForm.class_id || null,
        day_of_week: periodForm.day_of_week || null,
        period_number: parseInt(periodForm.period_number),
        period_name: periodForm.period_name || `Period ${periodForm.period_number}`,
        start_time: periodForm.start_time,
        end_time: periodForm.end_time,
        period_type: periodForm.period_type || 'regular',
        created_by: user.id
      }

      console.log('Attempting to save period with data:', periodData)

      if (editingPeriod) {
        const { data, error } = await supabase
          .from('periods')
          .update(periodData)
          .eq('id', editingPeriod.id)
          .eq('school_id', user.school_id)
          .select()

        if (error) {
          console.error('Error updating period:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          showToast(`Failed to update period: ${error.message || JSON.stringify(error)}`, 'error')
          return
        }
        console.log('Period updated successfully:', data)

        // Update local state immediately
        if (data && data.length > 0) {
          setPeriods(prev => prev.map(p => p.id === editingPeriod.id ? data[0] : p))
        }

        showToast('Period updated successfully!', 'success')
      } else {
        const { data, error } = await supabase
          .from('periods')
          .insert(periodData)
          .select()

        if (error) {
          console.error('Error creating period:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          console.error('Error code:', error.code)
          console.error('Error hint:', error.hint)
          showToast(`Failed to create period: ${error.message || 'Unknown error. Check console for details.'}`, 'error')
          return
        }
        console.log('Period created successfully:', data)

        // Add new period to local state immediately
        if (data && data.length > 0) {
          setPeriods(prev => [...prev, data[0]])
        }

        showToast('Period created successfully!', 'success')
      }

      await fetchPeriods(false)
      setShowPeriodModal(false)
      setPeriodForm({
        class_id: '',
        day_of_week: '',
        period_number: '',
        period_name: '',
        start_time: '',
        end_time: '',
        period_type: 'regular'
      })
      setEditingPeriod(null)
    } catch (error) {
      console.error('Error saving period:', error)
      showToast('An error occurred while saving', 'error')
    }
  }

  const handleDeletePeriod = async (periodId) => {
    try {
      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('id', periodId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting period:', error)
        showToast('Failed to delete period', 'error')
        return
      }

      // Update local state immediately
      setPeriods(prevPeriods => prevPeriods.filter(p => p.id !== periodId))
      showToast('Period deleted successfully!', 'success')
      setShowDeletePeriodModal(false)
      setPeriodToDelete(null)
    } catch (error) {
      console.error('Error deleting period:', error)
      showToast('An error occurred while deleting', 'error')
    }
  }

  const handleSaveBulkPeriods = async () => {
    try {
      if (!bulkPeriodForm.class_ids.length || !bulkPeriodForm.day_of_weeks.length) {
        showToast('Please select at least one class and one day', 'error')
        return
      }

      if (!bulkPeriodForm.start_time || !bulkPeriodForm.period_duration || !bulkPeriodForm.period_gap) {
        showToast('Please fill all required fields (Start Time, Period Duration, Period Gap)', 'error')
        return
      }

      if (!user || !user.school_id) {
        showToast('User authentication error', 'error')
        return
      }

      const periodDuration = parseInt(bulkPeriodForm.period_duration)
      const periodGap = parseInt(bulkPeriodForm.period_gap)

      // Helper function to add minutes to time
      const addMinutes = (time, minutes) => {
        const [hours, mins] = time.split(':').map(Number)
        const totalMins = hours * 60 + mins + minutes
        const newHours = Math.floor(totalMins / 60) % 24
        const newMins = totalMins % 60
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
      }

      const periodsToCreate = []

      // Create periods for each class-day combination
      for (const classId of bulkPeriodForm.class_ids) {
        for (const dayOfWeek of bulkPeriodForm.day_of_weeks) {
          let currentTime = bulkPeriodForm.start_time

          // Create 8 periods with gaps
          for (let i = 1; i <= 8; i++) {
            const startTime = currentTime
            const endTime = addMinutes(currentTime, periodDuration)

            periodsToCreate.push({
              user_id: user.id,
              school_id: user.school_id,
              class_id: classId,
              day_of_week: dayOfWeek,
              period_number: i,
              period_name: `Period ${i}`,
              start_time: startTime,
              end_time: endTime,
              period_type: 'regular',
              created_by: user.id
            })

            // Add gap for next period
            currentTime = addMinutes(endTime, periodGap)
          }
        }
      }

      const { error } = await supabase
        .from('periods')
        .insert(periodsToCreate)

      if (error) {
        console.error('Error creating bulk periods:', error)
        showToast('Failed to create periods: ' + error.message, 'error')
        return
      }

      await fetchPeriods()
      setShowBulkPeriodModal(false)
      setBulkPeriodForm({
        class_ids: [],
        day_of_weeks: [],
        start_time: '',
        period_duration: '',
        period_gap: '',
        break_period: '',
        break_duration: ''
      })
      showToast(`Bulk periods created successfully! Created ${periodsToCreate.length} periods.`, 'success')
    } catch (error) {
      console.error('Error saving bulk periods:', error)
      showToast('An error occurred while saving', 'error')
    }
  }

  const handleChangeTimings = async () => {
    try {
      console.log('🔄 handleChangeTimings called')

      if (!timingForm.start_time || !timingForm.period_duration) {
        console.log('❌ Missing required fields')
        showToast('Please fill required fields (Start Time and Period Duration)', 'error')
        return
      }

      if (!user || !user.school_id) {
        console.log('❌ User authentication error')
        showToast('User authentication error', 'error')
        return
      }

      if (!periods || periods.length === 0) {
        console.log('❌ No periods found')
        showToast('No periods found to update. Please create periods first.', 'error')
        return
      }

      console.log('✅ Validation passed, updating periods...')

      const periodDuration = parseInt(timingForm.period_duration)
      const periodGap = parseInt(timingForm.period_gap) || 0
      let currentTime = timingForm.start_time

      // Helper function to add minutes to time
      const addMinutes = (time, minutes) => {
        const [hours, mins] = time.split(':').map(Number)
        const totalMins = hours * 60 + mins + minutes
        const newHours = Math.floor(totalMins / 60) % 24
        const newMins = totalMins % 60
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
      }

      // Prepare all updates in parallel for speed
      const updatePromises = []
      let updatedCount = 0

      for (const period of periods) {
        if (period.period_type !== 'break' && period.period_type !== 'lunch') {
          const startTime = currentTime
          const endTime = addMinutes(currentTime, periodDuration)

          // Add update promise to array (don't await yet)
          updatePromises.push(
            supabase
              .from('periods')
              .update({
                start_time: startTime,
                end_time: endTime
              })
              .eq('id', period.id)
              .eq('school_id', user.school_id)
          )

          updatedCount++
          currentTime = addMinutes(endTime, periodGap)
        }
      }

      // Execute all updates in parallel for maximum speed
      console.log(`🚀 Updating ${updatedCount} periods in parallel...`)
      const results = await Promise.all(updatePromises)

      // Check for any errors
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        console.error('❌ Some periods failed to update:', errors)
        showToast(`Failed to update ${errors.length} period(s)`, 'error')
        return
      }

      console.log(`✅ Successfully updated ${updatedCount} periods in parallel!`)

      if (updatedCount === 0) {
        showToast('No regular periods found to update', 'error')
        return
      }

      // Refresh periods data (without showing loader for faster UI)
      await fetchPeriods(false)

      // Close modal
      setShowTimingModal(false)

      // Reset form
      setTimingForm({
        start_time: '',
        period_duration: '',
        period_gap: '',
        break_duration: ''
      })

      // Show success message
      console.log('🎉 Showing success toast')
      showToast(`Successfully updated ${updatedCount} period(s)!`, 'success')

    } catch (error) {
      console.error('❌ Error updating timings:', error)
      showToast('An error occurred while updating: ' + error.message, 'error')
    }
  }

  const handleDeleteAllPeriods = async () => {
    try {
      if (!user || !user.school_id) {
        showToast('User authentication error', 'error')
        return
      }

      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting all periods:', error)
        showToast('Failed to delete all periods', 'error')
        return
      }

      // Update local state immediately
      setPeriods([])
      showToast('All periods deleted successfully!', 'success')
      setShowDeleteAllModal(false)
    } catch (error) {
      console.error('Error deleting all periods:', error)
      showToast('An error occurred while deleting', 'error')
    }
  }

  const handleAutoGenerateTimetable = async () => {
    try {
      if (!autoGenerateForm.class_id || !autoGenerateForm.day_of_week) {
        showToast('Please select Class and Day', 'error')
        return
      }

      if (!user || !user.school_id) {
        showToast('Authentication error. Please login again.', 'error')
        return
      }

      if (!currentSession) {
        showToast('No active session found. Please create and activate a session first.', 'error')
        return
      }

      // Fetch subjects for the selected class
      const { data: classSubjectsData, error: subjectsError } = await supabase
        .from('class_subjects')
        .select(`
          id,
          subjects:subject_id (id, subject_name, subject_code),
          staff:teacher_id (id, first_name, last_name)
        `)
        .eq('school_id', user.school_id)
        .eq('class_id', autoGenerateForm.class_id)

      if (subjectsError) {
        console.error('Error fetching class subjects:', subjectsError)
        showToast('Failed to fetch class subjects', 'error')
        return
      }

      if (!classSubjectsData || classSubjectsData.length === 0) {
        showToast('No subjects found for this class. Please add subjects first.', 'error')
        return
      }

      console.log('Class subjects:', classSubjectsData)

      // Get periods for the selected class and day
      const availablePeriods = periods.filter(p => {
        if (p.period_type === 'break' || p.period_type === 'lunch') return false
        return (
          (p.class_id === autoGenerateForm.class_id && p.day_of_week === autoGenerateForm.day_of_week) ||
          (p.class_id === autoGenerateForm.class_id && !p.day_of_week) ||
          (!p.class_id && p.day_of_week === autoGenerateForm.day_of_week) ||
          (!p.class_id && !p.day_of_week)
        )
      }).sort((a, b) => a.period_number - b.period_number)

      if (availablePeriods.length === 0) {
        showToast('No periods found. Please create periods first.', 'error')
        return
      }

      console.log('Available periods:', availablePeriods)

      // Check if timetable already exists for this day
      const { data: existingTimetable } = await supabase
        .from('timetable')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('class_id', autoGenerateForm.class_id)
        .eq('session_id', currentSession.id)
        .eq('day_of_week', autoGenerateForm.day_of_week)

      if (existingTimetable && existingTimetable.length > 0) {
        // Delete existing timetable for this day (user already warned in the modal)
        await supabase
          .from('timetable')
          .delete()
          .eq('school_id', user.school_id)
          .eq('class_id', autoGenerateForm.class_id)
          .eq('session_id', currentSession.id)
          .eq('day_of_week', autoGenerateForm.day_of_week)
      }

      // Create timetable entries - assign subjects to periods
      const timetableEntries = []
      const numberOfPeriods = Math.min(availablePeriods.length, classSubjectsData.length)

      for (let i = 0; i < numberOfPeriods; i++) {
        const period = availablePeriods[i]
        const subjectData = classSubjectsData[i % classSubjectsData.length] // Cycle through subjects if more periods than subjects

        timetableEntries.push({
          user_id: user.id,
          school_id: user.school_id,
          class_id: autoGenerateForm.class_id,
          section_id: null,
          session_id: currentSession.id,
          day_of_week: autoGenerateForm.day_of_week,
          period_number: period.period_number,
          start_time: period.start_time,
          end_time: period.end_time,
          subject_id: subjectData.subjects?.id || null,
          teacher_id: subjectData.staff?.id || null,
          room_number: null,
          created_by: user.id
        })
      }

      console.log('Timetable entries to create:', timetableEntries)

      // Insert timetable entries
      const { error: insertError } = await supabase
        .from('timetable')
        .insert(timetableEntries)

      if (insertError) {
        console.error('Error creating timetable:', insertError)
        showToast('Failed to generate timetable: ' + insertError.message, 'error')
        return
      }

      showToast(`Timetable generated successfully for ${autoGenerateForm.day_of_week}! Created ${timetableEntries.length} entries.`, 'success')
      setShowAutoGenerateModal(false)
      setAutoGenerateForm({
        class_id: '',
        day_of_week: 'Monday'
      })

      // Reload timetable if viewing this class
      if (selectedClass === autoGenerateForm.class_id) {
        await fetchTimetable()
      }
    } catch (error) {
      console.error('Error auto-generating timetable:', error)
      showToast('An error occurred while generating timetable', 'error')
    }
  }

  const handleSaveTimetable = async () => {
    try {
      if (!timetableForm.day_of_week || !timetableForm.period_number) {
        showToast('Please select Day and Period', 'error')
        return
      }

      // Only validate subject and teacher for regular periods, not breaks
      if (timetableForm.entry_type === 'regular') {
        if (!timetableForm.subject_id) {
          showToast('Please select a Subject', 'error')
          return
        }

        if (!timetableForm.teacher_id) {
          showToast('Please select a Teacher', 'error')
          return
        }
      }

      if (!user || !user.school_id) {
        showToast('Authentication error. Please login again.', 'error')
        return
      }

      if (!selectedClass) {
        showToast('Please select a class first', 'error')
        return
      }

      if (!currentSession) {
        showToast('No active session found. Please create and activate a session first.', 'error')
        return
      }

      // Find the most specific period match:
      // 1. Try class + day specific period
      // 2. Try class specific period (any day)
      // 3. Try day specific period (any class)
      // 4. Try global period (no class, no day)
      const periodNumber = parseInt(timetableForm.period_number)
      const period = periods.find(p =>
        p.period_number === periodNumber &&
        p.class_id === selectedClass &&
        p.day_of_week === timetableForm.day_of_week
      ) || periods.find(p =>
        p.period_number === periodNumber &&
        p.class_id === selectedClass &&
        !p.day_of_week
      ) || periods.find(p =>
        p.period_number === periodNumber &&
        !p.class_id &&
        p.day_of_week === timetableForm.day_of_week
      ) || periods.find(p =>
        p.period_number === periodNumber &&
        !p.class_id &&
        !p.day_of_week
      )

      if (!period) {
        showToast('Period timing not found. Please create period timings first.', 'error')
        return
      }

      const timetableData = {
        user_id: user.id,
        school_id: user.school_id,
        class_id: selectedClass,
        section_id: selectedSection || null,
        session_id: currentSession.id,
        day_of_week: timetableForm.day_of_week,
        period_number: parseInt(timetableForm.period_number),
        start_time: period.start_time,
        end_time: period.end_time,
        subject_id: timetableForm.entry_type === 'break' ? null : (timetableForm.subject_id || null),
        teacher_id: timetableForm.entry_type === 'break' ? null : (timetableForm.teacher_id || null),
        room_number: timetableForm.entry_type === 'break' ? null : (timetableForm.room_number || null),
        created_by: user.id
      }

      if (editingTimetable) {
        const { error } = await supabase
          .from('timetable')
          .update(timetableData)
          .eq('id', editingTimetable.id)
          .eq('school_id', user.school_id)

        if (error) {
          console.error('Error updating timetable:', error)
          showToast('Failed to update timetable', 'error')
          return
        }
        showToast('Timetable updated successfully!', 'success')
      } else {
        const { error } = await supabase
          .from('timetable')
          .insert(timetableData)

        if (error) {
          console.error('Error creating timetable:', error)
          showToast('Failed to create timetable entry', 'error')
          return
        }
        showToast('Timetable entry created successfully!', 'success')
      }

      await fetchTimetable()
      setShowTimetableModal(false)
      setTimetableForm({
        day_of_week: 'Monday',
        period_number: '',
        entry_type: 'regular',
        subject_id: '',
        teacher_id: '',
        room_number: ''
      })
      setEditingTimetable(null)
    } catch (error) {
      console.error('Error saving timetable:', error)
      showToast('An error occurred while saving', 'error')
    }
  }

  const handleDeleteTimetable = async (timetableId) => {
    try {
      const { error } = await supabase
        .from('timetable')
        .delete()
        .eq('id', timetableId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting timetable:', error)
        showToast('Failed to delete timetable entry', 'error')
        return
      }

      // Update local state immediately
      setTimetable(prevTimetable => prevTimetable.filter(t => t.id !== timetableId))
      showToast('Timetable entry deleted successfully!', 'success')
      setShowDeleteTimetableModal(false)
      setTimetableToDelete(null)
    } catch (error) {
      console.error('Error deleting timetable:', error)
      showToast('An error occurred while deleting', 'error')
    }
  }

  const getTimetableCell = (day, periodNum) => {
    return timetable.find(t => t.day_of_week === day && t.period_number === periodNum)
  }

  // Get period timing for a specific period number and day
  const getPeriodTime = (periodNumber, day) => {
    // Try to find the most specific period match
    const period = periods.find(p =>
      p.period_number === periodNumber &&
      p.class_id === selectedClass &&
      p.day_of_week === day
    ) || periods.find(p =>
      p.period_number === periodNumber &&
      p.class_id === selectedClass &&
      !p.day_of_week
    ) || periods.find(p =>
      p.period_number === periodNumber &&
      !p.class_id &&
      p.day_of_week === day
    ) || periods.find(p =>
      p.period_number === periodNumber &&
      !p.class_id &&
      !p.day_of_week
    )

    if (period) {
      return `${formatTime(period.start_time)} - ${formatTime(period.end_time)}`
    }
    return ''
  }

  // Print all classes timetables to PDF
  const handlePrintAllTimetables = async () => {
    try {
      console.log('Starting Print All PDF generation...')

      if (classes.length === 0) {
        showToast('No classes available', 'error')
        return
      }

      // Fetch all timetables
      const allTimetablesData = await fetchAllClassesTimetables()

      if (allTimetablesData.length === 0) {
        showToast('No timetables found', 'error')
        return
      }

      // Get PDF settings for this school
      const pdfSettings = getPdfSettings(user.school_id)
      console.log('PDF Settings loaded for school:', user.school_id, pdfSettings)

      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF(
        pdfSettings.orientation === 'landscape' ? 'l' : 'p',
        'mm',
        pdfSettings.pageSize.toLowerCase()
      )
      console.log('jsPDF initialized for all classes')

      const sessionName = currentSession?.name || 'Current Session'
      let isFirstPage = true

      // Loop through all classes
      for (const classData of allTimetablesData) {
        // Add new page for each class except the first
        if (!isFirstPage) {
          doc.addPage()
        }
        isFirstPage = false

        const className = classData.class_name
        const classTimetable = classData.timetable

        console.log('Generating PDF for class:', className)

        // Fixed header height to match working code layout
        const headerHeight = 35 // Fixed at 35mm like the working code

        // Add decorative header background
        if (pdfSettings.includeHeader) {
          const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor)
          doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2])
          doc.rect(0, 0, doc.internal.pageSize.getWidth(), headerHeight, 'F')
        }

        // Add school logo if available
        console.log('🔍 Logo check:', {
          includeLogo: pdfSettings.includeLogo,
          logoUrl: schoolData.logo_url,
          schoolData: schoolData
        })
        if (pdfSettings.includeLogo && schoolData.logo_url) {
          console.log('✅ Logo conditions met, attempting to load logo')
          try {
            const logoImg = new Image()
            logoImg.crossOrigin = 'anonymous'

            const logoBase64 = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                console.warn('Logo load timeout, trying fetch method')
                reject(new Error('Logo load timeout'))
              }, 8000)

              logoImg.onload = () => {
                clearTimeout(timeout)
                try {
                  const canvas = document.createElement('canvas')
                  canvas.width = logoImg.width
                  canvas.height = logoImg.height
                  const ctx = canvas.getContext('2d')

                  // Apply logo style from settings
                  if (pdfSettings.logoStyle === 'circle') {
                    ctx.beginPath()
                    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2)
                    ctx.closePath()
                    ctx.clip()
                  } else if (pdfSettings.logoStyle === 'rounded') {
                    const radius = Math.min(canvas.width, canvas.height) * 0.1
                    ctx.beginPath()
                    ctx.moveTo(radius, 0)
                    ctx.lineTo(canvas.width - radius, 0)
                    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
                    ctx.lineTo(canvas.width, canvas.height - radius)
                    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
                    ctx.lineTo(radius, canvas.height)
                    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
                    ctx.lineTo(0, radius)
                    ctx.quadraticCurveTo(0, 0, radius, 0)
                    ctx.closePath()
                    ctx.clip()
                  }

                  ctx.drawImage(logoImg, 0, 0)
                  resolve(canvas.toDataURL('image/png'))
                } catch (err) {
                  console.error('Canvas error:', err)
                  reject(err)
                }
              }

              logoImg.onerror = (err) => {
                clearTimeout(timeout)
                console.error('Logo load error:', err)
                reject(new Error('Failed to load logo'))
              }

              logoImg.src = schoolData.logo_url
            })

            if (logoBase64) {
              // Add logo to PDF
              const logoSizeObj = getLogoSize(pdfSettings.logoSize)
              const currentLogoSize = logoSizeObj.width // Use width property
              const logoX = pdfSettings.logoPosition === 'left' ? 10 :
                           pdfSettings.logoPosition === 'right' ? doc.internal.pageSize.getWidth() - currentLogoSize - 10 :
                           (doc.internal.pageSize.getWidth() - currentLogoSize) / 2
              const logoY = (headerHeight - currentLogoSize) / 2

              const format = logoBase64.includes('data:image/png') ? 'PNG' : 'JPEG'
              doc.addImage(logoBase64, format, logoX, logoY, currentLogoSize, currentLogoSize)

              // Add border based on logo style from PDF settings
              const borderRgb = pdfSettings.logoBorderColor ? hexToRgb(pdfSettings.logoBorderColor) : [255, 255, 255]
              if (pdfSettings.logoStyle === 'circle') {
                doc.setDrawColor(...borderRgb)
                doc.setLineWidth(0.5)
                doc.circle(logoX + currentLogoSize/2, logoY + currentLogoSize/2, currentLogoSize/2, 'S')
              } else if (pdfSettings.logoStyle === 'rounded') {
                doc.setDrawColor(...borderRgb)
                doc.setLineWidth(0.5)
                doc.roundedRect(logoX, logoY, currentLogoSize, currentLogoSize, 3, 3, 'S')
              }
            }
          } catch (error) {
            console.warn('Error adding logo, trying fallback method:', error)
            try {
              // Fallback: try using convertImageToBase64
              const logoBase64 = await convertImageToBase64(schoolData.logo_url)
              if (logoBase64) {
                const logoSizeObj = getLogoSize(pdfSettings.logoSize)
                const currentLogoSize = logoSizeObj.width // Use width property
                const logoX = pdfSettings.logoPosition === 'left' ? 10 :
                             pdfSettings.logoPosition === 'right' ? doc.internal.pageSize.getWidth() - currentLogoSize - 10 :
                             (doc.internal.pageSize.getWidth() - currentLogoSize) / 2
                const logoY = (headerHeight - currentLogoSize) / 2
                doc.addImage(logoBase64, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
              }
            } catch (fallbackError) {
              console.error('Fallback logo loading also failed:', fallbackError)
            }
          }
        }

        // Add school name and title
        if (pdfSettings.includeHeader) {
          // Set font if specified
          if (pdfSettings.fontFamily) {
            try {
              doc.setFont(pdfSettings.fontFamily.toLowerCase())
            } catch (e) {
              console.warn('Font not available:', pdfSettings.fontFamily)
            }
          }

          const pageWidth = doc.internal.pageSize.getWidth()
          const isPortrait = pdfSettings.orientation === 'portrait'

          // Calculate text positions based on header height
          const titleY = headerHeight * 0.25
          const subtitleY = headerHeight * 0.40
          const classY = headerHeight * 0.55
          const sessionY = headerHeight * 0.70
          const dateY = headerHeight - 5

          doc.setFontSize(isPortrait ? 18 : 22)
          doc.setTextColor(255, 255, 255)
          doc.setFont(undefined, 'bold')
          const headerTitle = pdfSettings.headerText || schoolData.name || 'SCHOOL TIMETABLE'
          doc.text(headerTitle, pageWidth / 2, titleY, { align: 'center' })

          // Add "TIMETABLE" subtitle if school name is present
          if (schoolData.name) {
            doc.setFontSize(isPortrait ? 13 : 16)
            doc.text('TIMETABLE', pageWidth / 2, subtitleY, { align: 'center' })
          }

          doc.setFontSize(isPortrait ? 11 : 14)
          doc.setFont(undefined, 'bold')
          doc.text(`${className}`, pageWidth / 2, schoolData.name ? classY : titleY + 10, { align: 'center' })

          // Add section text if enabled in settings
          if (pdfSettings.includeSectionText) {
            doc.setFontSize(parseInt(pdfSettings.sectionTextSize))
            doc.setFont(undefined, 'normal')
            doc.text(`Academic Session: ${sessionName}`, pageWidth / 2, schoolData.name ? sessionY : classY + 8, { align: 'center' })
          }

          // Add generation date in header (adjust position for portrait)
          if (pdfSettings.includeGeneratedDate) {
            doc.setFontSize(isPortrait ? 7 : 9)
            const dateStr = new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })

            if (isPortrait) {
              // For portrait, place date on left side to avoid overlap
              doc.text(`Generated: ${dateStr}`, 10, dateY, { align: 'left' })
            } else {
              doc.text(`Generated: ${dateStr}`, pageWidth - 10, dateY, { align: 'right' })
            }
          }
        }

        // Prepare table data
        const tableData = []

        // Helper function to get timetable cell
        const getTimetableCellForClass = (day, periodNum) => {
          return classTimetable.find(t => t.day_of_week === day && t.period_number === periodNum)
        }

        // Helper function to get period time
        const getPeriodTimeForClass = (periodNumber, day) => {
          const period = periods.find(p =>
            p.period_number === periodNumber &&
            p.class_id === classData.class_id &&
            p.day_of_week === day
          ) || periods.find(p =>
            p.period_number === periodNumber &&
            p.class_id === classData.class_id &&
            !p.day_of_week
          ) || periods.find(p =>
            p.period_number === periodNumber &&
            !p.class_id &&
            p.day_of_week === day
          ) || periods.find(p =>
            p.period_number === periodNumber &&
            !p.class_id &&
            !p.day_of_week
          )

          if (period) {
            return `${formatTime(period.start_time)} - ${formatTime(period.end_time)}`
          }
          return ''
        }

        // Determine max period number for this class
        const maxPeriodForClass = classTimetable.length > 0
          ? Math.max(...classTimetable.map(t => t.period_number), numberOfPeriods)
          : numberOfPeriods

        // Create rows for each period
        for (let periodNumber = 1; periodNumber <= maxPeriodForClass; periodNumber++) {
          const periodTime = getPeriodTimeForClass(periodNumber, daysOfWeek[0]) || 'Time not set'
          const row = [`PERIOD ${periodNumber}\n${periodTime}`]

          daysOfWeek.forEach((day) => {
            const cell = getTimetableCellForClass(day, periodNumber)

            if (cell) {
              // Check if it's a break (no subject and no teacher)
              if (!cell.subject_id && !cell.teacher_id) {
                row.push('BREAK')
              } else {
                const subjectName = cell.subjects?.subject_name || 'Subject'
                const teacherName = cell.staff ? `${cell.staff.first_name} ${cell.staff.last_name}` : ''
                const roomNumber = cell.room_number ? `Room: ${cell.room_number}` : ''

                const cellContent = [subjectName, teacherName, roomNumber].filter(Boolean).join('\n')
                row.push(cellContent || '-')
              }
            } else {
              row.push('-')
            }
          })

          tableData.push(row)
        }

        // Reset text color for table
        const textColor = hexToRgb(pdfSettings.textColor)
        doc.setTextColor(textColor[0], textColor[1], textColor[2])

        const pageHeight = doc.internal.pageSize.getHeight()
        const pageWidth = doc.internal.pageSize.getWidth()
        const margins = getMarginValues(pdfSettings.margin)
        const footerSpace = pdfSettings.includeFooter ? 18 : 8 // Space for footer
        const tableStartY = headerHeight + 10 // Start 10mm after header ends (35mm + 10mm = 45mm)

        // Get autoTable styles from settings FIRST
        const autoTableStyles = getAutoTableStyles(pdfSettings)
        const headerColor = hexToRgb(pdfSettings.tableHeaderColor)

        // Calculate dynamic header height based on content
        const tableHeaderHeight = 7 // Compact header
        const availableHeight = pageHeight - tableStartY - footerSpace - tableHeaderHeight - 2 // -2mm for safety margin

        // Calculate row height to fit all periods on one page
        const calculatedRowHeight = availableHeight / tableData.length
        const rowHeight = calculatedRowHeight // Use exact calculated height, no minimum

        // Dynamically adjust font size and padding based on row height
        const dynamicFontSize = Math.min(parseInt(pdfSettings.fontSize), Math.max(4, rowHeight * 0.3))
        const dynamicPadding = Math.min(autoTableStyles.styles.cellPadding, Math.max(0.3, rowHeight * 0.12))

        // Calculate column widths to fit page width
        const availableWidth = pageWidth - margins.left - margins.right
        const periodColumnWidth = 35 // Fixed width for period column
        const dayColumnWidth = (availableWidth - periodColumnWidth) / 6 // Divide remaining space equally among 6 days

        console.log(`📊 Table calc: ${tableData.length} periods, page: ${pageHeight}mm, header: ${headerHeight}mm (FIXED), table start: ${tableStartY}mm (header + 10mm gap), available: ${availableHeight}mm, row: ${rowHeight.toFixed(2)}mm, font: ${dynamicFontSize.toFixed(1)}pt, padding: ${dynamicPadding.toFixed(1)}mm`)

        // Create the table
        autoTable(doc, {
          head: [['PERIOD', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']],
          body: tableData,
          startY: tableStartY, // Start after header with 10mm gap
          theme: autoTableStyles.theme,
          tableWidth: 'wrap', // Use available width
          styles: {
            ...autoTableStyles.styles,
            cellHeight: rowHeight, // Force exact row height
            fontSize: dynamicFontSize, // Dynamically scaled based on row height
            cellPadding: dynamicPadding, // Dynamically scaled based on row height
            overflow: 'linebreak',
            valign: 'middle',
            minCellHeight: rowHeight // Ensure minimum height
          },
          headStyles: {
            ...autoTableStyles.headStyles,
            cellHeight: tableHeaderHeight, // Match calculated header height
            cellPadding: 1,
            fontSize: dynamicFontSize > 6 ? parseInt(pdfSettings.fontSize) - 1 : 6,
            minCellHeight: tableHeaderHeight
          },
          columnStyles: {
            0: {
              fillColor: headerColor,
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              cellWidth: periodColumnWidth,
              fontSize: dynamicFontSize,
              halign: 'center'
            },
            1: { cellWidth: dayColumnWidth },
            2: { cellWidth: dayColumnWidth },
            3: { cellWidth: dayColumnWidth },
            4: { cellWidth: dayColumnWidth },
            5: { cellWidth: dayColumnWidth },
            6: { cellWidth: dayColumnWidth }
          },
          alternateRowStyles: autoTableStyles.alternateRowStyles,
          margin: { top: 0, left: margins.left, right: margins.right, bottom: footerSpace } // Use footer space as bottom margin
        })
      }

      // Add professional footer to all pages
      if (pdfSettings.includeFooter) {
        const pageCount = doc.internal.getNumberOfPages()
        const footerColor = hexToRgb(pdfSettings.headerBackgroundColor)

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)

          doc.setDrawColor(footerColor[0], footerColor[1], footerColor[2])
          doc.setLineWidth(0.5)
          doc.line(10, doc.internal.pageSize.getHeight() - 15, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 15)

          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.setFont(undefined, 'normal')

          const leftFooterText = pdfSettings.footerText || 'All Classes Timetable'
          doc.text(
            leftFooterText,
            10,
            doc.internal.pageSize.getHeight() - 8
          )

          if (pdfSettings.includeDate) {
            doc.text(
              `Generated on ${new Date().toLocaleDateString()}`,
              doc.internal.pageSize.getWidth() / 2,
              doc.internal.pageSize.getHeight() - 8,
              { align: 'center' }
            )
          }

          if (pdfSettings.includePageNumbers) {
            doc.text(
              `Page ${i} of ${pageCount}`,
              doc.internal.pageSize.getWidth() - 10,
              doc.internal.pageSize.getHeight() - 8,
              { align: 'right' }
            )
          }
        }
      }

      // Download PDF directly without preview
      const filename = `All_Timetables_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)

      console.log('All Classes PDF downloaded:', filename)
      showToast('PDF downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error generating All Classes PDF:', error)
      console.error('Error details:', error.message, error.stack)
      showToast(`Failed to generate PDF: ${error.message}`, 'error')
    }
  }

  // Print timetable to PDF
  const handlePrintTimetable = async () => {
    try {
      console.log('Starting PDF generation...')

      if (!selectedClass) {
        showToast('Please select a class first', 'error')
        return
      }

      // Get PDF settings for this school
      const pdfSettings = getPdfSettings(user.school_id)
      console.log('PDF Settings loaded for school:', user.school_id, pdfSettings)

      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF(
        pdfSettings.orientation === 'landscape' ? 'l' : 'p',
        'mm',
        pdfSettings.pageSize.toLowerCase()
      )
      console.log('jsPDF initialized')

      // Get selected class name
      const selectedClassName = classes.find(c => c.id === selectedClass)?.class_name || 'Class'
      const selectedSectionName = selectedSection ?
        sections.find(s => s.id === selectedSection)?.section_name :
        'All Sections'

      console.log('Class:', selectedClassName, 'Section:', selectedSectionName)

      // Get current session info
      const sessionName = currentSession?.name || 'Current Session'

      console.log('📊 School Data:', schoolData)
      console.log('📷 Logo URL:', schoolData.logo_url)
      console.log('🏫 School Name:', schoolData.name)
      console.log('🔍 PDF Settings:', {
        includeLogo: pdfSettings.includeLogo,
        logoPosition: pdfSettings.logoPosition,
        logoSize: pdfSettings.logoSize,
        logoStyle: pdfSettings.logoStyle
      })

      // Fixed header height to match working code layout
      const headerHeight = 35 // Fixed at 35mm like the working code

      console.log(`📐 Header dimensions: headerHeight=${headerHeight}mm (FIXED), pageWidth=${doc.internal.pageSize.getWidth()}mm`)

      // Add decorative header background
      if (pdfSettings.includeHeader) {
        const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor)
        doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2])
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), headerHeight, 'F')
        console.log(`✅ Header background drawn: width=${doc.internal.pageSize.getWidth()}mm, height=${headerHeight}mm, color=RGB(${headerBgColor.join(',')})`)
      }

      // Add school logo if available
      if (pdfSettings.includeLogo && schoolData.logo_url) {
        console.log('🖼️ Attempting to add logo to PDF...')
        try {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'

          const logoBase64 = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn('Logo load timeout, trying fetch method')
              reject(new Error('Logo load timeout'))
            }, 8000)

            logoImg.onload = () => {
              clearTimeout(timeout)
              try {
                const canvas = document.createElement('canvas')
                canvas.width = logoImg.width
                canvas.height = logoImg.height
                const ctx = canvas.getContext('2d')

                // Apply logo style from settings
                if (pdfSettings.logoStyle === 'circle') {
                  ctx.beginPath()
                  ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2)
                  ctx.closePath()
                  ctx.clip()
                } else if (pdfSettings.logoStyle === 'rounded') {
                  const radius = Math.min(canvas.width, canvas.height) * 0.1
                  ctx.beginPath()
                  ctx.moveTo(radius, 0)
                  ctx.lineTo(canvas.width - radius, 0)
                  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
                  ctx.lineTo(canvas.width, canvas.height - radius)
                  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
                  ctx.lineTo(radius, canvas.height)
                  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
                  ctx.lineTo(0, radius)
                  ctx.quadraticCurveTo(0, 0, radius, 0)
                  ctx.closePath()
                  ctx.clip()
                }

                ctx.drawImage(logoImg, 0, 0)
                resolve(canvas.toDataURL('image/png'))
              } catch (err) {
                console.error('Canvas error:', err)
                reject(err)
              }
            }

            logoImg.onerror = (err) => {
              clearTimeout(timeout)
              console.error('Logo load error:', err)
              reject(new Error('Failed to load logo'))
            }

            logoImg.src = schoolData.logo_url
          })

          console.log('📷 Logo converted to base64:', logoBase64 ? 'Success' : 'Failed')

          if (logoBase64) {
            // Add logo to PDF
            const logoSizeObj = getLogoSize(pdfSettings.logoSize)
            const currentLogoSize = logoSizeObj.width // Use width property
            const logoX = pdfSettings.logoPosition === 'left' ? 10 :
                         pdfSettings.logoPosition === 'right' ? doc.internal.pageSize.getWidth() - currentLogoSize - 10 :
                         (doc.internal.pageSize.getWidth() - currentLogoSize) / 2
            const logoY = (headerHeight - currentLogoSize) / 2

            console.log('📐 Logo dimensions:', { currentLogoSize, logoX, logoY })

            const format = logoBase64.includes('data:image/png') ? 'PNG' : 'JPEG'
            doc.addImage(logoBase64, format, logoX, logoY, currentLogoSize, currentLogoSize)

            // Add border based on logo style from PDF settings
            const borderRgb = pdfSettings.logoBorderColor ? hexToRgb(pdfSettings.logoBorderColor) : [255, 255, 255]
            if (pdfSettings.logoStyle === 'circle') {
              doc.setDrawColor(...borderRgb)
              doc.setLineWidth(0.5)
              doc.circle(logoX + currentLogoSize/2, logoY + currentLogoSize/2, currentLogoSize/2, 'S')
            } else if (pdfSettings.logoStyle === 'rounded') {
              doc.setDrawColor(...borderRgb)
              doc.setLineWidth(0.5)
              doc.roundedRect(logoX, logoY, currentLogoSize, currentLogoSize, 3, 3, 'S')
            }

            console.log('✅ Logo added to PDF')
          }
        } catch (error) {
          console.warn('Error adding logo, trying fallback method:', error)
          try {
            // Fallback: try using convertImageToBase64
            const logoBase64 = await convertImageToBase64(schoolData.logo_url)
            if (logoBase64) {
              const logoSizeObj = getLogoSize(pdfSettings.logoSize)
              const currentLogoSize = logoSizeObj.width // Use width property
              const logoX = pdfSettings.logoPosition === 'left' ? 10 :
                           pdfSettings.logoPosition === 'right' ? doc.internal.pageSize.getWidth() - currentLogoSize - 10 :
                           (doc.internal.pageSize.getWidth() - currentLogoSize) / 2
              const logoY = (headerHeight - currentLogoSize) / 2
              doc.addImage(logoBase64, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
              console.log('✅ Logo added to PDF using fallback method')
            }
          } catch (fallbackError) {
            console.error('Fallback logo loading also failed:', fallbackError)
          }
        }
      }

      // Add school name and title
      if (pdfSettings.includeHeader) {
        // Set font if specified
        if (pdfSettings.fontFamily) {
          try {
            doc.setFont(pdfSettings.fontFamily.toLowerCase())
          } catch (e) {
            console.warn('Font not available:', pdfSettings.fontFamily)
          }
        }

        const pageWidth = doc.internal.pageSize.getWidth()
        const isPortrait = pdfSettings.orientation === 'portrait'

        // Calculate text positions based on header height
        const titleY = headerHeight * 0.25
        const subtitleY = headerHeight * 0.40
        const classY = headerHeight * 0.55
        const sessionY = headerHeight * 0.70
        const session2Y = headerHeight * 0.85
        const dateY = headerHeight - 5

        doc.setFontSize(isPortrait ? 18 : 22)
        doc.setTextColor(255, 255, 255)
        doc.setFont(undefined, 'bold')
        const headerTitle = pdfSettings.headerText || schoolData.name || 'SCHOOL TIMETABLE'
        doc.text(headerTitle, pageWidth / 2, titleY, { align: 'center' })

        // Add "TIMETABLE" subtitle if school name is present
        if (schoolData.name) {
          doc.setFontSize(isPortrait ? 13 : 16)
          doc.text('TIMETABLE', pageWidth / 2, subtitleY, { align: 'center' })
        }

        // Add session and class info
        doc.setFontSize(isPortrait ? 11 : 14)
        doc.setFont(undefined, 'bold')
        doc.text(`${selectedClassName}`, pageWidth / 2, schoolData.name ? classY : titleY + 10, { align: 'center' })

        // Add section text if enabled in settings
        if (pdfSettings.includeSectionText) {
          doc.setFontSize(parseInt(pdfSettings.sectionTextSize))
          doc.setFont(undefined, 'normal')

          // For portrait, split the session info into two lines to avoid overlap
          if (isPortrait) {
            doc.text(`Section: ${selectedSectionName}`, pageWidth / 2, schoolData.name ? sessionY : classY + 8, { align: 'center' })
            doc.text(`Academic Session: ${sessionName}`, pageWidth / 2, schoolData.name ? session2Y : sessionY + 5, { align: 'center' })
          } else {
            doc.text(`Section: ${selectedSectionName} | Academic Session: ${sessionName}`, pageWidth / 2, schoolData.name ? sessionY : classY + 8, { align: 'center' })
          }
        }

        // Add generation date in header (adjust position for portrait)
        if (pdfSettings.includeGeneratedDate) {
          doc.setFontSize(isPortrait ? 7 : 9)
          const dateStr = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })

          if (isPortrait) {
            // For portrait, place date on left side to avoid overlap
            doc.text(`Generated: ${dateStr}`, 10, dateY, { align: 'left' })
          } else {
            doc.text(`Generated: ${dateStr}`, pageWidth - 10, dateY, { align: 'right' })
          }
        }
      }

      console.log('Header added')

      // Prepare table data
      const tableData = []

      // Create rows for each period
      for (let periodNumber = 1; periodNumber <= numberOfPeriods; periodNumber++) {
        const periodTime = getPeriodTime(periodNumber, daysOfWeek[0]) || 'Time not set'
        const row = [`PERIOD ${periodNumber}\n${periodTime}`]

        daysOfWeek.forEach((day) => {
          const cell = getTimetableCell(day, periodNumber)
          // Filter by teacher if selected
          const shouldShowCell = !selectedTeacherFilter || (cell && cell.teacher_id === selectedTeacherFilter)

          if (cell && shouldShowCell) {
            // Check if it's a break (no subject and no teacher)
            if (!cell.subject_id && !cell.teacher_id) {
              row.push('BREAK')
            } else {
              const subjectName = cell.subjects?.subject_name || 'Subject'
              const teacherName = cell.staff ? `${cell.staff.first_name} ${cell.staff.last_name}` : ''
              const roomNumber = cell.room_number ? `Room: ${cell.room_number}` : ''

              const cellContent = [subjectName, teacherName, roomNumber].filter(Boolean).join('\n')
              row.push(cellContent || '-')
            }
          } else {
            row.push('-')
          }
        })

        tableData.push(row)
      }

      console.log('Table data prepared, rows:', tableData.length)

      // Reset text color for table
      const textColor = hexToRgb(pdfSettings.textColor)
      doc.setTextColor(textColor[0], textColor[1], textColor[2])

      // Fixed table positioning to match working code layout
      const pageHeight = doc.internal.pageSize.getHeight()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margins = getMarginValues(pdfSettings.margin)
      const footerSpace = pdfSettings.includeFooter ? 18 : 8 // Space for footer
      const tableStartY = headerHeight + 10 // Start 10mm after header ends (35mm + 10mm = 45mm)

      // Get autoTable styles from settings FIRST
      const autoTableStyles = getAutoTableStyles(pdfSettings)
      const headerColor = hexToRgb(pdfSettings.tableHeaderColor)

      // Calculate dynamic header height based on content
      const tableHeaderHeight = 7 // Compact header
      const availableHeight = pageHeight - tableStartY - footerSpace - tableHeaderHeight - 2 // -2mm for safety margin

      // Calculate row height to fit all periods on one page
      const calculatedRowHeight = availableHeight / tableData.length
      const rowHeight = calculatedRowHeight // Use exact calculated height, no minimum

      // Dynamically adjust font size and padding based on row height
      const dynamicFontSize = Math.min(parseInt(pdfSettings.fontSize), Math.max(4, rowHeight * 0.3))
      const dynamicPadding = Math.min(autoTableStyles.styles.cellPadding, Math.max(0.3, rowHeight * 0.12))

      console.log(`📊 TABLE POSITIONING:`)
      console.log(`   Page height: ${pageHeight}mm`)
      console.log(`   Header height: ${headerHeight}mm (FIXED at 35mm)`)
      console.log(`   Table will start at Y: ${tableStartY}mm (header + 10mm gap)`)
      console.log(`   ${tableData.length} periods, ${availableHeight}mm available, ${rowHeight.toFixed(2)}mm per row`)
      console.log(`   Dynamic font: ${dynamicFontSize.toFixed(1)}pt, padding: ${dynamicPadding.toFixed(1)}mm`)
      console.log(`   Margins:`, margins)

      console.log(`🎨 About to draw table at startY=${tableStartY}mm`)

      // Calculate column widths to fit page width
      const availableWidth = pageWidth - margins.left - margins.right
      const periodColumnWidth = 35 // Fixed width for period column
      const dayColumnWidth = (availableWidth - periodColumnWidth) / 6 // Divide remaining space equally among 6 days

      // Create the table using autoTable - optimized to fit on one page
      autoTable(doc, {
        head: [['PERIOD', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']],
        body: tableData,
        startY: tableStartY, // Start after header with 10mm gap
        theme: autoTableStyles.theme,
        tableWidth: 'wrap', // Use available width
        styles: {
          ...autoTableStyles.styles,
          cellHeight: rowHeight, // Force exact row height
          fontSize: dynamicFontSize, // Dynamically scaled based on row height
          cellPadding: dynamicPadding, // Dynamically scaled based on row height
          overflow: 'linebreak',
          valign: 'middle',
          minCellHeight: rowHeight // Ensure minimum height
        },
        headStyles: {
          ...autoTableStyles.headStyles,
          cellHeight: tableHeaderHeight, // Match calculated header height
          cellPadding: 1,
          fontSize: dynamicFontSize > 6 ? parseInt(pdfSettings.fontSize) - 1 : 6,
          minCellHeight: tableHeaderHeight
        },
        columnStyles: {
          0: {
            fillColor: headerColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            cellWidth: periodColumnWidth,
            fontSize: dynamicFontSize,
            halign: 'center'
          },
          1: { cellWidth: dayColumnWidth },
          2: { cellWidth: dayColumnWidth },
          3: { cellWidth: dayColumnWidth },
          4: { cellWidth: dayColumnWidth },
          5: { cellWidth: dayColumnWidth },
          6: { cellWidth: dayColumnWidth }
        },
        alternateRowStyles: autoTableStyles.alternateRowStyles,
        margin: { top: 0, left: margins.left, right: margins.right, bottom: footerSpace }, // Use footer space as bottom margin
        didDrawCell: function(data) {
          // Add subtle borders
          if (data.row.section === 'body' && data.column.index > 0) {
            doc.setDrawColor(220, 220, 220)
          }
        },
        didDrawPage: function(data) {
          // Ensure table doesn't overflow to more than 2 pages
          if (data.pageNumber > 2) {
            console.warn('Table exceeds 2 pages, consider reducing content')
          }
        }
      })

      console.log('autoTable completed')

      // Add professional footer
      if (pdfSettings.includeFooter) {
        const pageCount = doc.internal.getNumberOfPages()
        const footerColor = hexToRgb(pdfSettings.headerBackgroundColor)

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)

          // Footer line
          doc.setDrawColor(footerColor[0], footerColor[1], footerColor[2])
          doc.setLineWidth(0.5)
          doc.line(10, doc.internal.pageSize.getHeight() - 15, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 15)

          // Footer text
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.setFont(undefined, 'normal')

          // Left side - Document info
          const leftFooterText = pdfSettings.footerText || `Timetable - ${selectedClassName}`
          doc.text(
            leftFooterText,
            10,
            doc.internal.pageSize.getHeight() - 8
          )

          // Center - Generation date
          if (pdfSettings.includeDate) {
            doc.text(
              `Generated on ${new Date().toLocaleDateString()}`,
              doc.internal.pageSize.getWidth() / 2,
              doc.internal.pageSize.getHeight() - 8,
              { align: 'center' }
            )
          }

          // Right side - Page number
          if (pdfSettings.includePageNumbers) {
            doc.text(
              `Page ${i} of ${pageCount}`,
              doc.internal.pageSize.getWidth() - 10,
              doc.internal.pageSize.getHeight() - 8,
              { align: 'right' }
            )
          }
        }
      }

      console.log('Footer added')

      // Download PDF directly without preview
      const filename = `Timetable_${selectedClassName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)

      console.log('PDF downloaded:', filename)
      showToast('PDF downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      console.error('Error details:', error.message, error.stack)
      showToast(`Failed to generate PDF: ${error.message}`, 'error')
    }
  }


  const filteredPeriods = periods.filter(period => {
    const matchesSearch = period.period_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         period.start_time?.includes(searchTerm) ||
                         period.end_time?.includes(searchTerm)
    const matchesClass = selectedClassFilter === '' || String(period.class_id) === selectedClassFilter
    return matchesSearch && matchesClass
  })

  // Pagination calculations for Periods tab
  const totalPages = Math.ceil(filteredPeriods.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedPeriods = filteredPeriods.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Generate page numbers to display (max 4 visible)
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 4

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 2) {
        // Near start: show first 4
        for (let i = 1; i <= maxVisiblePages; i++) pages.push(i)
      } else if (currentPage >= totalPages - 1) {
        // Near end: show last 4
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        // Middle: show current and surrounding (4 total)
        for (let i = currentPage - 1; i <= currentPage + 2; i++) {
          if (i >= 1 && i <= totalPages) pages.push(i)
        }
      }
    }
    return pages
  }

  return (
    <div className="p-2 lg:p-4 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setActiveTab('timetable')
            setShowPeriodModal(false)
            setShowBulkPeriodModal(false)
            setShowTimingModal(false)
            setShowDeleteConfirm(false)
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm ${
            activeTab === 'timetable'
              ? 'bg-[#DC2626] text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Clock size={16} />
          Timetable
        </button>
        <button
          onClick={() => {
            setActiveTab('periods')
            setShowPeriodModal(false)
            setShowBulkPeriodModal(false)
            setShowTimingModal(false)
            setShowDeleteConfirm(false)
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm ${
            activeTab === 'periods'
              ? 'bg-[#DC2626] text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <CalendarDays size={16} />
          Periods
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'timetable' ? (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ width: '200px' }}>
                <label className="block text-gray-700 text-xs mb-1 font-medium">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    console.log('Class selected:', e.target.value)
                    setSelectedClass(e.target.value)
                    setSelectedSection('')
                    setTimetable([])
                    setTimetableLoaded(false)
                  }}
                  disabled={loadingClasses}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                >
                  <option value="">{loadingClasses ? 'Loading classes...' : 'Select Class'}</option>
                  <option value="all">All Classes</option>
                  {!loadingClasses && classes.length === 0 && <option disabled>No classes available</option>}
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && selectedClass !== 'all' && sections.length > 0 && (
                <div style={{ width: '200px' }}>
                  <label className="block text-gray-700 text-xs mb-1 font-medium">Section (Optional)</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value)
                      setTimetable([])
                      setTimetableLoaded(false)
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">All Sections</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleLoad}
                disabled={!selectedClass}
                className="bg-[#DC2626] text-white px-6 py-2 rounded-md font-medium hover:bg-red-700 transition flex items-center gap-2 shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap mt-5"
              >
                Load
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {!timetableLoaded ? (
            <div className="text-center py-8">
              <Clock size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-700 mb-1">
                {!selectedClass ? 'Select a Class' : 'Click Load to View Timetable'}
              </h3>
              <p className="text-gray-500 text-sm">
                {!selectedClass
                  ? 'Please select a class and click Load to view the timetable'
                  : 'Click the Load button to display the timetable'}
              </p>
            </div>
          ) : (
            <>
              {/* Filter and Action Buttons Row */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {selectedClass !== 'all' && (
                  <div style={{ width: '200px' }}>
                    <select
                      value={selectedTeacherFilter}
                      onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">All Teachers</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.first_name} {teacher.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedClass === 'all' && <div></div>}

                <div className="flex gap-2">
                  {selectedClass === 'all' ? (
                    <button
                      onClick={handlePrintAllTimetables}
                      className="bg-[#7C3AED] text-white px-3 py-2 rounded-md font-medium hover:bg-purple-700 transition flex items-center gap-1.5 text-xs whitespace-nowrap"
                    >
                      <Printer size={14} />
                      Print All
                    </button>
                  ) : (
                    <button
                      onClick={handlePrintTimetable}
                      className="bg-[#8B5CF6] text-white px-3 py-2 rounded-md font-medium hover:bg-purple-600 transition flex items-center gap-1.5 text-xs whitespace-nowrap"
                    >
                      <Printer size={14} />
                      Print
                    </button>
                  )}
                  {selectedClass !== 'all' && (
                    <>
                      <button
                        onClick={() => {
                          setEditingTimetable(null)
                          setTimetableForm({
                            day_of_week: 'Monday',
                            period_number: '',
                            entry_type: 'regular',
                            subject_id: '',
                            teacher_id: '',
                            room_number: ''
                          })
                          setShowTimetableModal(true)
                        }}
                        className="bg-[#10B981] text-white px-3 py-2 rounded-md font-medium hover:bg-green-600 transition flex items-center gap-1.5 text-xs whitespace-nowrap"
                      >
                        <Plus size={14} />
                        Assign Period
                      </button>
                      <button
                        onClick={() => setShowTeacherMode(!showTeacherMode)}
                        className={`${showTeacherMode ? 'bg-[#0891B2]' : 'bg-[#06B6D4]'} text-white px-3 py-2 rounded-md font-medium hover:bg-cyan-600 transition flex items-center gap-1.5 text-xs whitespace-nowrap`}
                      >
                        <Users size={14} />
                        {showTeacherMode ? 'Hide' : 'Show'} Teacher
                      </button>
                      <button
                        onClick={() => setDeleteMode(!deleteMode)}
                        className={`${deleteMode ? 'bg-[#D97706]' : 'bg-[#F59E0B]'} text-white px-3 py-2 rounded-md font-medium hover:bg-yellow-500 transition flex items-center gap-1.5 text-xs whitespace-nowrap`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Delete
                      </button>
                      <button
                        className="bg-[#6B7280] text-white px-3 py-2 rounded-md font-medium hover:bg-gray-600 transition flex items-center gap-1.5 text-xs whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        Copy
                      </button>
                      <button
                        className="bg-[#EF4444] text-white px-3 py-2 rounded-md font-medium hover:bg-red-600 transition flex items-center gap-1.5 text-xs whitespace-nowrap"
                      >
                        <Trash2 size={14} />
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Timetable Display */}
              {selectedClass === 'all' ? (
                // Display all classes timetables
                <div className="space-y-6">
                  {allClassesTimetables.map((classData) => (
                    <div key={classData.class_id} className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-[#1E3A8A] text-white px-3 py-2">
                        <h3 className="text-sm font-bold">{classData.class_name}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr>
                              <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">PERIOD</th>
                              <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">MONDAY</th>
                              <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">TUESDAY</th>
                              <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">WEDNESDAY</th>
                              <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">THURSDAY</th>
                              <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">FRIDAY</th>
                              <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">SATURDAY</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((periodNumber) => {
                              const getPeriodTimeForClass = (periodNum, day) => {
                                const period = periods.find(p =>
                                  p.period_number === periodNum &&
                                  p.class_id === classData.class_id &&
                                  p.day_of_week === day
                                ) || periods.find(p =>
                                  p.period_number === periodNum &&
                                  p.class_id === classData.class_id &&
                                  !p.day_of_week
                                ) || periods.find(p =>
                                  p.period_number === periodNum &&
                                  !p.class_id &&
                                  p.day_of_week === day
                                ) || periods.find(p =>
                                  p.period_number === periodNum &&
                                  !p.class_id &&
                                  !p.day_of_week
                                )
                                if (period) {
                                  return `${formatTime(period.start_time)} - ${formatTime(period.end_time)}`
                                }
                                return 'Time not set'
                              }

                              return (
                                <tr key={periodNumber} className="border-t border-gray-200">
                                  <td className="px-2 py-1.5 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs w-28">
                                    <div className="uppercase whitespace-nowrap">PERIOD {periodNumber}</div>
                                    <div className="text-[9px] font-normal mt-0.5 leading-tight">
                                      {getPeriodTimeForClass(periodNumber, daysOfWeek[0])}
                                    </div>
                                  </td>
                                  {daysOfWeek.map((day) => {
                                    const cell = classData.timetable.find(t => t.day_of_week === day && t.period_number === periodNumber)
                                    return (
                                      <td key={day} className="px-1.5 py-1.5 border border-gray-300 bg-white h-10">
                                        {cell ? (
                                          !cell.subject_id && !cell.teacher_id ? (
                                            // Break/Lunch Period
                                            <div className="h-full flex items-center justify-center">
                                              <div className="font-semibold text-amber-600 text-[10px]">BREAK</div>
                                            </div>
                                          ) : (
                                            <div className="relative h-full">
                                              <div className="font-semibold text-gray-800 text-[10px] mb-0.5">{cell.subjects?.subject_name || 'Subject'}</div>
                                              {cell.staff && <div className="text-gray-600 text-[9px] leading-tight">{cell.staff.first_name} {cell.staff.last_name}</div>}
                                              {cell.room_number && <div className="text-gray-500 text-[9px] leading-tight mt-0.5">Room: {cell.room_number}</div>}
                                            </div>
                                          )
                                        ) : (
                                          <div className="h-full flex items-center justify-center text-gray-300">-</div>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Display single class timetable
                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                  <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">PERIOD</th>
                      <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">MONDAY</th>
                      <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">TUESDAY</th>
                      <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">WEDNESDAY</th>
                      <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">THURSDAY</th>
                      <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">FRIDAY</th>
                      <th className="px-2 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs uppercase tracking-wide">SATURDAY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map((periodNumber) => (
                      <tr key={periodNumber} className="border-t border-gray-200">
                        <td className="px-2 py-1.5 text-center font-bold bg-[#1E3A8A] text-white border border-white text-xs w-28">
                          <div className="uppercase whitespace-nowrap">PERIOD {periodNumber}</div>
                          <div className="text-[9px] font-normal mt-0.5 leading-tight">
                            {getPeriodTime(periodNumber, daysOfWeek[0]) || 'Time not set'}
                          </div>
                        </td>
                        {daysOfWeek.map((day) => {
                          const cell = getTimetableCell(day, periodNumber)
                          // Filter by teacher if selected
                          const shouldShowCell = !selectedTeacherFilter || (cell && cell.teacher_id === selectedTeacherFilter)

                          return (
                            <td key={day} className="px-1.5 py-1.5 border border-gray-300 bg-white relative group h-10">
                              {cell && shouldShowCell ? (
                                <div className="relative h-full">
                                  {!cell.subject_id && !cell.teacher_id ? (
                                    // Break/Lunch Period - No subject or teacher
                                    <div className="font-semibold text-amber-600 text-[10px] text-center flex items-center justify-center h-full">
                                      BREAK
                                    </div>
                                  ) : (
                                    // Normal Mode - Display subject and conditionally teacher
                                    <>
                                      <div className="font-semibold text-gray-800 text-[10px] mb-0.5">{cell.subjects?.subject_name || 'Subject'}</div>
                                      {showTeacherMode && cell.staff && (
                                        <div className="text-gray-600 text-[9px] leading-tight">
                                          {cell.staff.first_name} {cell.staff.last_name}
                                        </div>
                                      )}
                                      {cell.room_number && <div className="text-gray-500 text-[9px] leading-tight mt-0.5">Room: {cell.room_number}</div>}
                                    </>
                                  )}

                                  {/* Edit and Delete buttons */}
                                  <div className={`absolute top-0 right-0 ${deleteMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity flex gap-0.5`}>
                                    <button
                                      onClick={() => {
                                        setEditingTimetable(cell)
                                        setTimetableForm({
                                          day_of_week: cell.day_of_week,
                                          period_number: cell.period_number.toString(),
                                          entry_type: (cell.subject_id && cell.teacher_id) ? 'regular' : 'break',
                                          subject_id: cell.subject_id || '',
                                          teacher_id: cell.teacher_id || '',
                                          room_number: cell.room_number || ''
                                        })
                                        setShowTimetableModal(true)
                                      }}
                                      className="bg-blue-500 text-white p-0.5 rounded hover:bg-blue-600"
                                      title="Edit"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    {deleteMode && (
                                      <button
                                        onClick={() => {
                                          setTimetableToDelete(cell)
                                          setShowDeleteTimetableModal(true)
                                        }}
                                        className="bg-red-500 text-white p-0.5 rounded hover:bg-red-600"
                                        title="Delete"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingTimetable(null)
                                    setTimetableForm({
                                      day_of_week: day,
                                      period_number: periodNumber.toString(),
                                      entry_type: 'regular',
                                      subject_id: '',
                                      teacher_id: '',
                                      room_number: ''
                                    })
                                    setShowTimetableModal(true)
                                  }}
                                  className="h-full flex items-center justify-center text-gray-300 cursor-pointer hover:bg-gray-50 hover:text-blue-500 transition rounded"
                                  title="Click to add entry"
                                >
                                  <Plus size={14} />
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
              )}

              {/* Add/Remove Period Buttons Below Table */}
              {selectedClass !== 'all' && (
                <div className="flex justify-end gap-2 mt-3">
                  {numberOfPeriods > 1 && (
                    <button
                      onClick={() => {
                        setNumberOfPeriods(prev => Math.max(1, prev - 1))
                      }}
                      className="bg-[#EF4444] text-white px-3 py-2 rounded-md font-medium hover:bg-red-600 transition flex items-center gap-1.5 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                      Remove Period Row
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setNumberOfPeriods(prev => prev + 1)
                    }}
                    className="bg-[#10B981] text-white px-3 py-2 rounded-md font-medium hover:bg-green-600 transition flex items-center gap-1.5 text-sm"
                  >
                    <Plus size={14} />
                    Add Period Row
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : activeTab === 'periods' ? (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Periods</h2>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => {
                  setEditingPeriod(null)
                  setPeriodForm({
                    class_id: '',
                    day_of_week: '',
                    period_number: '',
                    period_name: '',
                    start_time: '',
                    end_time: '',
                    period_type: 'regular'
                  })
                  setShowPeriodModal(true)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
                  showPeriodModal
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#F3F4F6] text-gray-700 hover:bg-[#DC2626] hover:text-white'
                }`}
              >
                <Plus size={16} />
                Add Single Period
              </button>
              <button
                onClick={() => setShowBulkPeriodModal(true)}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
                  showBulkPeriodModal
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#F3F4F6] text-gray-700 hover:bg-[#DC2626] hover:text-white'
                }`}
              >
                <Plus size={16} />
                Add Bulk Periods
              </button>
              <button
                onClick={() => setShowTimingModal(true)}
                className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                  showTimingModal
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#F3F4F6] text-gray-700 hover:bg-[#DC2626] hover:text-white'
                }`}
              >
                Change Timing
              </button>
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
                  showDeleteAllModal
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#F3F4F6] text-gray-700 hover:bg-[#DC2626] hover:text-white'
                }`}
              >
                <Trash2 size={16} />
                Delete Periods
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              There are <span className="text-red-600 font-semibold">{filteredPeriods.length}</span> periods registered in the system.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#1B3C6D] text-white">
                  <th className="px-3 py-2.5 text-left font-semibold border border-[#1B3C6D]">Sr.</th>
                  <th className="px-3 py-2.5 text-left font-semibold border border-[#1B3C6D]">Class</th>
                  <th className="px-3 py-2.5 text-left font-semibold border border-[#1B3C6D]">Day</th>
                  <th className="px-3 py-2.5 text-left font-semibold border border-[#1B3C6D]">Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold border border-[#1B3C6D]">Start Time</th>
                  <th className="px-3 py-2.5 text-left font-semibold border border-[#1B3C6D]">End Time</th>
                  <th className="px-3 py-2.5 text-left font-semibold border border-[#1B3C6D]">Type</th>
                  <th className="px-3 py-2.5 text-center font-semibold border border-[#1B3C6D]">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeriods.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-6 text-center text-gray-500">
                      No periods found
                    </td>
                  </tr>
                ) : (
                  paginatedPeriods.map((period, index) => (
                    <tr key={period.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2.5 border border-gray-200">{startIndex + index + 1}</td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {period.class_id ? classes.find(c => c.id === period.class_id)?.class_name || '-' : 'All Classes'}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">{period.day_of_week || 'ALL DAYS'}</td>
                      <td className="px-3 py-2.5 border border-gray-200">{period.period_name}</td>
                      <td className="px-3 py-2.5 border border-gray-200">{formatTime(period.start_time)}</td>
                      <td className="px-3 py-2.5 border border-gray-200">{formatTime(period.end_time)}</td>
                      <td className="px-3 py-2.5 border border-gray-200">{formatPeriodType(period.period_type)}</td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingPeriod(period)
                              setPeriodForm({
                                class_id: period.class_id || '',
                                day_of_week: period.day_of_week || '',
                                period_number: period.period_number,
                                period_name: period.period_name,
                                start_time: period.start_time,
                                end_time: period.end_time,
                                period_type: period.period_type
                              })
                              setShowPeriodModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setPeriodToDelete(period)
                              setShowDeletePeriodModal(true)
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredPeriods.length > 0 && (
            <div className="px-3 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between mt-3">
              <div className="text-xs text-gray-500">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPeriods.length)} of {filteredPeriods.length} periods
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
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
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    currentPage === totalPages
                      ? 'bg-blue-300 text-white cursor-not-allowed'
                      : 'bg-blue-900 text-white hover:bg-blue-800'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Add Period Modal */}
      {showPeriodModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowPeriodModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{editingPeriod ? 'Update Period' : 'Add Period'}</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the details below</p>
                </div>
                <button onClick={() => setShowPeriodModal(false)} className="text-white hover:bg-white/10 p-2 rounded-full transition">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Class</label>
                  <select
                    value={periodForm.class_id}
                    onChange={(e) => setPeriodForm({ ...periodForm, class_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Class (Optional)</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Select Day <span className="text-red-500">*</span></label>
                  <select
                    value={periodForm.day_of_week}
                    onChange={(e) => setPeriodForm({ ...periodForm, day_of_week: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Day</option>
                    {daysOfWeek.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Period <span className="text-red-500">*</span></label>
                  <select
                    value={periodForm.period_number}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Period</option>
                    {[1,2,3,4,5,6,7,8].map((num) => (
                      <option key={num} value={num}>Period {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Name (Optional)</label>
                  <input
                    type="text"
                    value={periodForm.period_name}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Leave empty to auto-generate"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Type <span className="text-red-500">*</span></label>
                  <select
                    value={periodForm.period_type}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {periodTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Start Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={periodForm.start_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">End Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={periodForm.end_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-white border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPeriodModal(false)}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePeriod}
                  className="px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                >
                  <Plus size={20} />
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Period Modal */}
      {showBulkPeriodModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowBulkPeriodModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Add Period via policy</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the details below</p>
                </div>
                <button onClick={() => setShowBulkPeriodModal(false)} className="text-white hover:bg-white/10 p-2 rounded-full transition">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <p className="text-sm text-gray-600 mb-4">
                This will create 8 periods automatically with the specified timing and gap between periods for selected classes and days.
              </p>

              {/* Class Selection */}
              <div className="col-span-2">
                <label className="block text-gray-700 font-semibold mb-2">Class <span className="text-red-500">*</span></label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50">
                  {classes.length === 0 ? (
                    <p className="text-gray-500 text-xs">No classes available</p>
                  ) : (
                    classes.map((cls) => (
                      <label key={cls.id} className="flex items-center gap-2 py-0.5 hover:bg-gray-100 px-2 rounded cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={bulkPeriodForm.class_ids.includes(cls.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkPeriodForm({ ...bulkPeriodForm, class_ids: [...bulkPeriodForm.class_ids, cls.id] })
                            } else {
                              setBulkPeriodForm({ ...bulkPeriodForm, class_ids: bulkPeriodForm.class_ids.filter(id => id !== cls.id) })
                            }
                          }}
                          className="w-3.5 h-3.5 text-blue-600"
                        />
                        <span className="text-gray-700">{cls.class_name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{bulkPeriodForm.class_ids.length} class(es) selected</p>
              </div>

              {/* Day Selection */}
              <div className="col-span-2">
                <label className="block text-gray-700 font-semibold mb-2">Select Day <span className="text-red-500">*</span></label>
                <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-1">
                    {daysOfWeek.map((day) => (
                      <label key={day} className="flex items-center gap-2 py-0.5 hover:bg-gray-100 px-2 rounded cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={bulkPeriodForm.day_of_weeks.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkPeriodForm({ ...bulkPeriodForm, day_of_weeks: [...bulkPeriodForm.day_of_weeks, day] })
                            } else {
                              setBulkPeriodForm({ ...bulkPeriodForm, day_of_weeks: bulkPeriodForm.day_of_weeks.filter(d => d !== day) })
                            }
                          }}
                          className="w-3.5 h-3.5 text-blue-600"
                        />
                        <span className="text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{bulkPeriodForm.day_of_weeks.length} day(s) selected</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Start Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={bulkPeriodForm.start_time}
                    onChange={(e) => setBulkPeriodForm({ ...bulkPeriodForm, start_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter time"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Period Duration(in minutes) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={bulkPeriodForm.period_duration}
                    onChange={(e) => setBulkPeriodForm({ ...bulkPeriodForm, period_duration: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter Duration"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Period Gap(in minutes) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={bulkPeriodForm.period_gap}
                    onChange={(e) => setBulkPeriodForm({ ...bulkPeriodForm, period_gap: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter Gap"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Break Period</label>
                  <select
                    value={bulkPeriodForm.break_period}
                    onChange={(e) => setBulkPeriodForm({ ...bulkPeriodForm, break_period: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Period</option>
                    {periods.filter(p => p.period_type === 'break' || p.period_type === 'lunch').map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.period_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 bg-white border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkPeriodModal(false)}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBulkPeriods}
                  className="px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                  <Plus size={20} />
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Change Timing Modal */}
      {showTimingModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowTimingModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Change Period Timing</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the details below</p>
                </div>
                <button onClick={() => setShowTimingModal(false)} className="text-white hover:bg-white/10 p-2 rounded-full transition">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Start Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={timingForm.start_time}
                    onChange={(e) => setTimingForm({ ...timingForm, start_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter time"
                  />
                  {timingForm.start_time && (
                    <p className="text-sm text-gray-600 mt-1">
                      {formatTime(timingForm.start_time)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Period Duration(in minutes) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={timingForm.period_duration}
                    onChange={(e) => setTimingForm({ ...timingForm, period_duration: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter Duration"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Period Gap(in minutes)</label>
                  <input
                    type="number"
                    value={timingForm.period_gap}
                    onChange={(e) => setTimingForm({ ...timingForm, period_gap: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter Gap"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Break Time(in minutes)</label>
                  <input
                    type="number"
                    value={timingForm.break_duration}
                    onChange={(e) => setTimingForm({ ...timingForm, break_duration: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter Break Duration"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-white border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowTimingModal(false)}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeTimings}
                  className="px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                  <Plus size={20} />
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowDeleteConfirm(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <span className="text-red-600 font-bold">All Periods</span>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAllPeriods}
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

      {/* Timetable Entry Modal */}
      {showTimetableModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowTimetableModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{editingTimetable ? 'Update Timetable Entry' : 'Add Timetable Entry'}</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the details below</p>
                </div>
                <button onClick={() => setShowTimetableModal(false)} className="text-white hover:bg-white/10 p-2 rounded-full transition">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Day <span className="text-red-500">*</span></label>
                  <select
                    value={timetableForm.day_of_week}
                    onChange={(e) => setTimetableForm({ ...timetableForm, day_of_week: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {daysOfWeek.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Period <span className="text-red-500">*</span></label>
                  <select
                    value={timetableForm.period_number}
                    onChange={(e) => setTimetableForm({ ...timetableForm, period_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Period</option>
                    {(() => {
                      // Filter periods to show the most relevant ones for this class and day
                      const relevantPeriods = periods.filter(p => {
                        if (p.period_type === 'break' || p.period_type === 'lunch') return false
                        // Show periods that match: class+day, class only, day only, or global
                        return (
                          (p.class_id === selectedClass && p.day_of_week === timetableForm.day_of_week) ||
                          (p.class_id === selectedClass && !p.day_of_week) ||
                          (!p.class_id && p.day_of_week === timetableForm.day_of_week) ||
                          (!p.class_id && !p.day_of_week)
                        )
                      })

                      // Debug logging
                      console.log('🔍 Period Selection Debug:', {
                        totalPeriods: periods.length,
                        selectedClass,
                        selectedDay: timetableForm.day_of_week,
                        relevantPeriods: relevantPeriods.length,
                        allPeriods: periods.map(p => ({
                          id: p.id,
                          number: p.period_number,
                          class_id: p.class_id,
                          day: p.day_of_week,
                          type: p.period_type
                        }))
                      })

                      // Get unique period numbers and sort
                      const uniquePeriods = Array.from(
                        new Map(relevantPeriods.map(p => [p.period_number, p])).values()
                      ).sort((a, b) => a.period_number - b.period_number)

                      if (uniquePeriods.length === 0) {
                        return <option value="" disabled>No periods available - Please create periods first</option>
                      }

                      return uniquePeriods.map((period) => (
                        <option key={period.id} value={period.period_number}>
                          Period {period.period_number} ({formatTime(period.start_time)} - {formatTime(period.end_time)})
                        </option>
                      ))
                    })()}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-gray-700 font-semibold mb-2">Type <span className="text-red-500">*</span></label>
                  <select
                    value={timetableForm.entry_type}
                    onChange={(e) => setTimetableForm({ ...timetableForm, entry_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="regular">Regular Period</option>
                    <option value="break">Break / Lunch</option>
                  </select>
                </div>

                {timetableForm.entry_type === 'regular' && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-gray-700 font-semibold mb-2">Subject <span className="text-red-500">*</span></label>
                      <select
                        value={timetableForm.subject_id}
                        onChange={(e) => setTimetableForm({ ...timetableForm, subject_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.subject_name} ({subject.subject_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-gray-700 font-semibold mb-2">Teacher <span className="text-red-500">*</span></label>
                      <select
                        value={timetableForm.teacher_id}
                        onChange={(e) => setTimetableForm({ ...timetableForm, teacher_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Teacher</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name} {teacher.designation ? `(${teacher.designation})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-gray-700 font-semibold mb-2">Room Number</label>
                      <input
                        type="text"
                        value={timetableForm.room_number}
                        onChange={(e) => setTimetableForm({ ...timetableForm, room_number: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Enter room number"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowTimetableModal(false)}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTimetable}
                  className="px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                >
                  <Plus size={20} />
                  {editingTimetable ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Auto Generate Timetable Modal */}
      {showAutoGenerateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowAutoGenerateModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-[10000] w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Auto Generate Timetable</h3>
                  <p className="text-emerald-100 text-sm mt-1">Generate full day timetable automatically</p>
                </div>
                <button onClick={() => setShowAutoGenerateModal(false)} className="text-white hover:bg-white/10 p-2 rounded-full transition">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> This will automatically assign all subjects from the selected class to the available periods for the selected day, using the teachers already assigned to those subjects.
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Class <span className="text-red-500">*</span></label>
                <select
                  value={autoGenerateForm.class_id}
                  onChange={(e) => setAutoGenerateForm({ ...autoGenerateForm, class_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Day <span className="text-red-500">*</span></label>
                <select
                  value={autoGenerateForm.day_of_week}
                  onChange={(e) => setAutoGenerateForm({ ...autoGenerateForm, day_of_week: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> If timetable already exists for this day, it will be replaced with the new auto-generated one.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAutoGenerateModal(false)}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAutoGenerateTimetable}
                  className="px-6 py-3 bg-[#059669] text-white font-semibold rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Timetable
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Period Confirmation Modal */}
      {showDeletePeriodModal && periodToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowDeletePeriodModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <strong>{periodToDelete.period_name}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeletePeriodModal(false)
                      setPeriodToDelete(null)
                    }}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePeriod(periodToDelete.id)}
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

      {/* Delete All Periods Confirmation Modal */}
      {showDeleteAllModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowDeleteAllModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete All</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <strong>ALL</strong> periods? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteAllModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAllPeriods}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Timetable Confirmation Modal */}
      {showDeleteTimetableModal && timetableToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowDeleteTimetableModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete this timetable entry? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteTimetableModal(false)
                      setTimetableToDelete(null)
                    }}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteTimetable(timetableToDelete.id)}
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

export default function TimetablePage() {
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
      permissionKey="timetable_timetable_view"
      pageName="Timetable"
    >
      <TimetableContent />
    </PermissionGuard>
  )
}
