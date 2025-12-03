'use client'

import { useState, useEffect } from 'react'
import { Clock, CalendarDays, Plus, Edit2, Trash2, X, Search, Users, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import toast, { Toaster } from 'react-hot-toast'

export default function TimetablePage() {
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
            toast.error('Error: User account is not associated with a school. Please contact support.')
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

  // Fetch initial data when user is available
  useEffect(() => {
    if (user && user.school_id) {
      fetchClasses()
      fetchSessions()
      fetchPeriods()
      fetchTeachers()
    } else if (user) {
      setLoadingClasses(false)
    }
  }, [user])

  // Fetch sections when class is selected
  useEffect(() => {
    if (selectedClass && user && user.school_id) {
      fetchSections(selectedClass)
      fetchClassSubjects(selectedClass)
    }
  }, [selectedClass])

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

  const fetchPeriods = async () => {
    try {
      if (!user || !user.school_id) return

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
    } catch (error) {
      console.error('Error fetching periods:', error)
      setPeriods([])
    }
  }

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
      toast.error('Please select a class first')
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
      const allTimetables = []

      for (const cls of classes) {
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
        } else {
          allTimetables.push({
            class_id: cls.id,
            class_name: cls.class_name,
            timetable: data || []
          })
        }
      }

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
        toast.error('Please fill all required fields (Period Number, Start Time, End Time)')
        return
      }

      if (!user || !user.school_id) {
        toast.error('User authentication error')
        return
      }

      const periodData = {
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
          toast.error(`Failed to update period: ${error.message || JSON.stringify(error)}`)
          return
        }
        console.log('Period updated successfully:', data)
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
          toast.error(`Failed to create period: ${error.message || 'Unknown error. Check console for details.'}`)
          return
        }
        console.log('Period created successfully:', data)
      }

      await fetchPeriods()
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
      toast.error('An error occurred while saving')
    }
  }

  const handleDeletePeriod = async (periodId) => {
    if (!confirm('Are you sure you want to delete this period?')) return

    try {
      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('id', periodId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting period:', error)
        toast.error('Failed to delete period')
        return
      }

      await fetchPeriods()
    } catch (error) {
      console.error('Error deleting period:', error)
      toast.error('An error occurred while deleting')
    }
  }

  const handleSaveBulkPeriods = async () => {
    try {
      if (!bulkPeriodForm.class_ids.length || !bulkPeriodForm.day_of_weeks.length) {
        toast.error('Please select at least one class and one day')
        return
      }

      if (!bulkPeriodForm.start_time || !bulkPeriodForm.period_duration || !bulkPeriodForm.period_gap) {
        toast.error('Please fill all required fields (Start Time, Period Duration, Period Gap)')
        return
      }

      if (!user || !user.school_id) {
        toast.error('User authentication error')
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
        toast.error('Failed to create periods: ' + error.message)
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
      toast.success(`Bulk periods created successfully! Created ${periodsToCreate.length} periods.`)
    } catch (error) {
      console.error('Error saving bulk periods:', error)
      toast.error('An error occurred while saving')
    }
  }

  const handleChangeTimings = async () => {
    try {
      if (!timingForm.start_time || !timingForm.period_duration) {
        toast.error('Please fill required fields (Start Time and Period Duration)')
        return
      }

      if (!user || !user.school_id) {
        toast.error('User authentication error')
        return
      }

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

      // Update all existing periods
      for (const period of periods) {
        if (period.period_type !== 'break' && period.period_type !== 'lunch') {
          const startTime = currentTime
          const endTime = addMinutes(currentTime, periodDuration)

          const { error } = await supabase
            .from('periods')
            .update({
              start_time: startTime,
              end_time: endTime
            })
            .eq('id', period.id)
            .eq('school_id', user.school_id)

          if (error) {
            console.error('Error updating period:', error)
          }

          currentTime = addMinutes(endTime, periodGap)
        }
      }

      await fetchPeriods()
      setShowTimingModal(false)
      setTimingForm({
        start_time: '',
        period_duration: '',
        period_gap: '',
        break_duration: ''
      })
      toast.success('Period timings updated successfully!')
    } catch (error) {
      console.error('Error updating timings:', error)
      toast.error('An error occurred while updating')
    }
  }

  const handleDeleteAllPeriods = async () => {
    try {
      if (!user || !user.school_id) {
        toast.error('User authentication error')
        return
      }

      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting all periods:', error)
        toast.error('Failed to delete all periods')
        return
      }

      await fetchPeriods()
      setShowDeleteConfirm(false)
      toast.success('All periods deleted successfully!')
    } catch (error) {
      console.error('Error deleting all periods:', error)
      toast.error('An error occurred while deleting')
    }
  }

  const handleAutoGenerateTimetable = async () => {
    try {
      if (!autoGenerateForm.class_id || !autoGenerateForm.day_of_week) {
        toast.error('Please select Class and Day')
        return
      }

      if (!user || !user.school_id) {
        toast.error('Authentication error. Please login again.')
        return
      }

      if (!currentSession) {
        toast.error('No active session found. Please create and activate a session first.')
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
        toast.error('Failed to fetch class subjects')
        return
      }

      if (!classSubjectsData || classSubjectsData.length === 0) {
        toast.error('No subjects found for this class. Please add subjects first.')
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
        toast.error('No periods found. Please create periods first.')
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
        if (!confirm(`Timetable already exists for ${autoGenerateForm.day_of_week}. Do you want to replace it?`)) {
          return
        }
        // Delete existing timetable for this day
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
        toast.error('Failed to generate timetable: ' + insertError.message)
        return
      }

      toast.success(`Timetable generated successfully for ${autoGenerateForm.day_of_week}! Created ${timetableEntries.length} entries.`)
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
      toast.error('An error occurred while generating timetable')
    }
  }

  const handleSaveTimetable = async () => {
    try {
      if (!timetableForm.day_of_week || !timetableForm.period_number) {
        toast.error('Please select Day and Period')
        return
      }

      // Only validate subject and teacher for regular periods, not breaks
      if (timetableForm.entry_type === 'regular') {
        if (!timetableForm.subject_id) {
          toast.error('Please select a Subject')
          return
        }

        if (!timetableForm.teacher_id) {
          toast.error('Please select a Teacher')
          return
        }
      }

      if (!user || !user.school_id) {
        toast.error('Authentication error. Please login again.')
        return
      }

      if (!selectedClass) {
        toast.error('Please select a class first')
        return
      }

      if (!currentSession) {
        toast.error('No active session found. Please create and activate a session first.')
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
        toast.error('Period timing not found. Please create period timings first.')
        return
      }

      const timetableData = {
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
          toast.error('Failed to update timetable')
          return
        }
      } else {
        const { error } = await supabase
          .from('timetable')
          .insert(timetableData)

        if (error) {
          console.error('Error creating timetable:', error)
          toast.error('Failed to create timetable entry')
          return
        }
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
      toast.error('An error occurred while saving')
    }
  }

  const handleDeleteTimetable = async (timetableId) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return

    try {
      const { error } = await supabase
        .from('timetable')
        .delete()
        .eq('id', timetableId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting timetable:', error)
        toast.error('Failed to delete timetable entry')
        return
      }

      await fetchTimetable()
    } catch (error) {
      console.error('Error deleting timetable:', error)
      toast.error('An error occurred while deleting')
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
        toast.error('No classes available')
        return
      }

      // Fetch all timetables
      const allTimetablesData = await fetchAllClassesTimetables()

      if (allTimetablesData.length === 0) {
        toast.error('No timetables found')
        return
      }

      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF('l', 'mm', 'a4') // landscape orientation
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

        // Add decorative header background
        doc.setFillColor(30, 58, 138) // #1E3A8A
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F')

        doc.setFontSize(22)
        doc.setTextColor(255, 255, 255)
        doc.setFont(undefined, 'bold')
        doc.text('SCHOOL TIMETABLE', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' })

        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text(`${className}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' })

        doc.setFontSize(11)
        doc.setFont(undefined, 'normal')
        doc.text(`Academic Session: ${sessionName}`, doc.internal.pageSize.getWidth() / 2, 27, { align: 'center' })

        doc.setFontSize(9)
        const dateStr = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        doc.text(`Generated: ${dateStr}`, doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' })

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
        doc.setTextColor(0, 0, 0)

        const pageHeight = doc.internal.pageSize.getHeight()
        const availableHeight = pageHeight - 40 - 25
        const rowHeight = Math.min(availableHeight / (tableData.length + 1), 23)

        // Create the table
        autoTable(doc, {
          head: [['PERIOD', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']],
          body: tableData,
          startY: 40,
          theme: 'grid',
          tableWidth: 'auto',
          styles: {
            fontSize: 8,
            cellPadding: 2.5,
            overflow: 'linebreak',
            valign: 'middle',
            halign: 'center',
            lineColor: [200, 200, 200],
            lineWidth: 0.3,
            minCellHeight: rowHeight,
            cellHeight: rowHeight
          },
          headStyles: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 3,
            minCellHeight: 12
          },
          columnStyles: {
            0: {
              fillColor: [30, 58, 138],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              cellWidth: 38,
              fontSize: 7.5,
              halign: 'center'
            },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 'auto' },
            6: { cellWidth: 'auto' }
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          margin: { top: 40, left: 8, right: 8, bottom: 25 }
        })
      }

      // Add professional footer to all pages
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)

        doc.setDrawColor(30, 58, 138)
        doc.setLineWidth(0.5)
        doc.line(10, doc.internal.pageSize.getHeight() - 15, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 15)

        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.setFont(undefined, 'normal')

        doc.text(
          'All Classes Timetable',
          10,
          doc.internal.pageSize.getHeight() - 8
        )

        doc.text(
          `Generated on ${new Date().toLocaleDateString()}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        )

        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 10,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'right' }
        )
      }

      // Save the PDF
      const filename = `All_Timetables_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      console.log('All Classes PDF saved:', filename)
    } catch (error) {
      console.error('Error generating All Classes PDF:', error)
      console.error('Error details:', error.message, error.stack)
      toast.error(`Failed to generate PDF: ${error.message}`)
    }
  }

  // Print timetable to PDF
  const handlePrintTimetable = async () => {
    try {
      console.log('Starting PDF generation...')

      if (!selectedClass) {
        toast.error('Please select a class first')
        return
      }

      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF('l', 'mm', 'a4') // landscape orientation
      console.log('jsPDF initialized')

      // Get selected class name
      const selectedClassName = classes.find(c => c.id === selectedClass)?.class_name || 'Class'
      const selectedSectionName = selectedSection ?
        sections.find(s => s.id === selectedSection)?.section_name :
        'All Sections'

      console.log('Class:', selectedClassName, 'Section:', selectedSectionName)

      // Get current session info
      const sessionName = currentSession?.name || 'Current Session'

      // Add decorative header background
      doc.setFillColor(30, 58, 138) // #1E3A8A
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F')

      // Add school name/logo area (you can customize this)
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.setFont(undefined, 'bold')
      doc.text('SCHOOL TIMETABLE', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' })

      // Add session and class info
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text(`${selectedClassName}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' })

      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.text(`Section: ${selectedSectionName} | Academic Session: ${sessionName}`, doc.internal.pageSize.getWidth() / 2, 27, { align: 'center' })

      // Add generation date in header
      doc.setFontSize(9)
      const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      doc.text(`Generated: ${dateStr}`, doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' })

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
      doc.setTextColor(0, 0, 0)

      // Calculate available height for table to fit on one page
      const pageHeight = doc.internal.pageSize.getHeight()
      const availableHeight = pageHeight - 40 - 25 // header and footer space
      const rowHeight = Math.min(availableHeight / (tableData.length + 1), 23) // +1 for header row, max 23mm

      // Create the table using autoTable - optimized to fit on one page
      autoTable(doc, {
        head: [['PERIOD', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        tableWidth: 'auto',
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          overflow: 'linebreak',
          valign: 'middle',
          halign: 'center',
          lineColor: [200, 200, 200],
          lineWidth: 0.3,
          minCellHeight: rowHeight,
          cellHeight: rowHeight
        },
        headStyles: {
          fillColor: [30, 58, 138], // #1E3A8A
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 3,
          minCellHeight: 12
        },
        columnStyles: {
          0: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            cellWidth: 38,
            fontSize: 7.5,
            halign: 'center'
          },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 'auto' },
          6: { cellWidth: 'auto' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { top: 40, left: 8, right: 8, bottom: 25 },
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
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)

        // Footer line
        doc.setDrawColor(30, 58, 138)
        doc.setLineWidth(0.5)
        doc.line(10, doc.internal.pageSize.getHeight() - 15, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 15)

        // Footer text
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.setFont(undefined, 'normal')

        // Left side - Document info
        doc.text(
          `Timetable - ${selectedClassName}`,
          10,
          doc.internal.pageSize.getHeight() - 8
        )

        // Center - Generation date
        doc.text(
          `Generated on ${new Date().toLocaleDateString()}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        )

        // Right side - Page number
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 10,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'right' }
        )
      }

      console.log('Footer added')

      // Save the PDF
      const filename = `Timetable_${selectedClassName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      console.log('PDF saved:', filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      console.error('Error details:', error.message, error.stack)
      toast.error(`Failed to generate PDF: ${error.message}`)
    }
  }

  const filteredPeriods = periods.filter(period => {
    const matchesSearch = period.period_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         period.start_time?.includes(searchTerm) ||
                         period.end_time?.includes(searchTerm)
    return matchesSearch
  })

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => {
            setActiveTab('timetable')
            setShowPeriodModal(false)
            setShowBulkPeriodModal(false)
            setShowTimingModal(false)
            setShowDeleteConfirm(false)
          }}
          className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
            activeTab === 'timetable'
              ? 'bg-[#DC2626] text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Clock size={20} />
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
          className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
            activeTab === 'periods'
              ? 'bg-[#DC2626] text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <CalendarDays size={20} />
          Periods
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'timetable' ? (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: '280px' }}>
                <label className="block text-gray-700 text-xs mb-1.5 font-medium">Class</label>
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
                <div style={{ width: '280px' }}>
                  <label className="block text-gray-700 text-xs mb-1.5 font-medium">Section (Optional)</label>
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
            <div className="text-center py-12">
              <Clock size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                {!selectedClass ? 'Select a Class' : 'Click Load to View Timetable'}
              </h3>
              <p className="text-gray-500">
                {!selectedClass
                  ? 'Please select a class and click Load to view the timetable'
                  : 'Click the Load button to display the timetable'}
              </p>
            </div>
          ) : (
            <>
              {/* Filter and Action Buttons Row */}
              <div className="flex items-center justify-between gap-3 mb-4">
                {selectedClass !== 'all' && (
                  <div style={{ width: '280px' }}>
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
                <div className="space-y-8">
                  {allClassesTimetables.map((classData) => (
                    <div key={classData.class_id} className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-[#1E3A8A] text-white px-4 py-3">
                        <h3 className="text-lg font-bold">{classData.class_name}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">PERIOD</th>
                              <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">MONDAY</th>
                              <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">TUESDAY</th>
                              <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">WEDNESDAY</th>
                              <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">THURSDAY</th>
                              <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">FRIDAY</th>
                              <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">SATURDAY</th>
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
                                  <td className="px-3 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm w-32">
                                    <div className="uppercase whitespace-nowrap">PERIOD {periodNumber}</div>
                                    <div className="text-[10px] font-normal mt-1 leading-tight">
                                      {getPeriodTimeForClass(periodNumber, daysOfWeek[0])}
                                    </div>
                                  </td>
                                  {daysOfWeek.map((day) => {
                                    const cell = classData.timetable.find(t => t.day_of_week === day && t.period_number === periodNumber)
                                    return (
                                      <td key={day} className="px-2 py-2 border border-gray-300 bg-white h-12">
                                        {cell ? (
                                          !cell.subject_id && !cell.teacher_id ? (
                                            // Break/Lunch Period
                                            <div className="h-full flex items-center justify-center">
                                              <div className="font-semibold text-amber-600 text-xs">BREAK</div>
                                            </div>
                                          ) : (
                                            <div className="relative h-full">
                                              <div className="font-semibold text-gray-800 text-xs mb-0.5">{cell.subjects?.subject_name || 'Subject'}</div>
                                              {cell.staff && <div className="text-gray-600 text-[10px] leading-tight">{cell.staff.first_name} {cell.staff.last_name}</div>}
                                              {cell.room_number && <div className="text-gray-500 text-[10px] leading-tight mt-0.5">Room: {cell.room_number}</div>}
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
                  <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">PERIOD</th>
                      <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">MONDAY</th>
                      <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">TUESDAY</th>
                      <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">WEDNESDAY</th>
                      <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">THURSDAY</th>
                      <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">FRIDAY</th>
                      <th className="px-4 py-3 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm uppercase tracking-wide">SATURDAY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map((periodNumber) => (
                      <tr key={periodNumber} className="border-t border-gray-200">
                        <td className="px-3 py-2 text-center font-bold bg-[#1E3A8A] text-white border border-white text-sm w-32">
                          <div className="uppercase whitespace-nowrap">PERIOD {periodNumber}</div>
                          <div className="text-[10px] font-normal mt-1 leading-tight">
                            {getPeriodTime(periodNumber, daysOfWeek[0]) || 'Time not set'}
                          </div>
                        </td>
                        {daysOfWeek.map((day) => {
                          const cell = getTimetableCell(day, periodNumber)
                          // Filter by teacher if selected
                          const shouldShowCell = !selectedTeacherFilter || (cell && cell.teacher_id === selectedTeacherFilter)

                          return (
                            <td key={day} className="px-2 py-2 border border-gray-300 bg-white relative group h-12">
                              {cell && shouldShowCell ? (
                                <div className="relative h-full">
                                  {!cell.subject_id && !cell.teacher_id ? (
                                    // Break/Lunch Period - No subject or teacher
                                    <div className="font-semibold text-amber-600 text-xs text-center flex items-center justify-center h-full">
                                      BREAK
                                    </div>
                                  ) : (
                                    // Normal Mode - Display subject and conditionally teacher
                                    <>
                                      <div className="font-semibold text-gray-800 text-xs mb-0.5">{cell.subjects?.subject_name || 'Subject'}</div>
                                      {showTeacherMode && cell.staff && (
                                        <div className="text-gray-600 text-[10px] leading-tight">
                                          {cell.staff.first_name} {cell.staff.last_name}
                                        </div>
                                      )}
                                      {cell.room_number && <div className="text-gray-500 text-[10px] leading-tight mt-0.5">Room: {cell.room_number}</div>}
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
                                        onClick={() => handleDeleteTimetable(cell.id)}
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
                <div className="flex justify-end gap-3 mt-4">
                  {numberOfPeriods > 1 && (
                    <button
                      onClick={() => {
                        setNumberOfPeriods(prev => Math.max(1, prev - 1))
                      }}
                      className="bg-[#EF4444] text-white px-4 py-2.5 rounded-md font-semibold hover:bg-red-600 transition flex items-center gap-2 shadow-md"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                      Remove Period Row
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setNumberOfPeriods(prev => prev + 1)
                    }}
                    className="bg-[#10B981] text-white px-4 py-2.5 rounded-md font-semibold hover:bg-green-600 transition flex items-center gap-2 shadow-md"
                  >
                    <Plus size={18} />
                    Add Period Row
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Periods</h2>

            <div className="flex flex-wrap gap-3 mb-6">
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
                className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                  showPeriodModal
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#F3F4F6] text-gray-700 hover:bg-[#DC2626] hover:text-white'
                }`}
              >
                <Plus size={20} />
                Add Single Period
              </button>
              <button
                onClick={() => setShowBulkPeriodModal(true)}
                className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                  showBulkPeriodModal
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#F3F4F6] text-gray-700 hover:bg-[#DC2626] hover:text-white'
                }`}
              >
                <Plus size={20} />
                Add Bulk Periods
              </button>
              <button
                onClick={() => setShowTimingModal(true)}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  showTimingModal
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#F3F4F6] text-gray-700 hover:bg-[#DC2626] hover:text-white'
                }`}
              >
                Change Timing
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                  showDeleteConfirm
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#F3F4F6] text-gray-700 hover:bg-[#DC2626] hover:text-white'
                }`}
              >
                <Trash2 size={20} />
                Delete Periods
              </button>
            </div>

            <div className="flex gap-4 mb-6">
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                />
                <button className="absolute right-0 top-0 h-full px-4 bg-[#28A745] text-white rounded-r-lg hover:bg-[#218838]">
                  <Search size={20} />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              There are <span className="text-red-600 font-semibold">{periods.length}</span> periods registered in the system.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1B3C6D] text-white">
                  <th className="px-4 py-3 text-left font-semibold border border-[#1B3C6D]">Sr.</th>
                  <th className="px-4 py-3 text-left font-semibold border border-[#1B3C6D]">Class</th>
                  <th className="px-4 py-3 text-left font-semibold border border-[#1B3C6D]">Day</th>
                  <th className="px-4 py-3 text-left font-semibold border border-[#1B3C6D]">Name</th>
                  <th className="px-4 py-3 text-left font-semibold border border-[#1B3C6D]">Start Time</th>
                  <th className="px-4 py-3 text-left font-semibold border border-[#1B3C6D]">End Time</th>
                  <th className="px-4 py-3 text-left font-semibold border border-[#1B3C6D]">Type</th>
                  <th className="px-4 py-3 text-center font-semibold border border-[#1B3C6D]">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeriods.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      No periods found
                    </td>
                  </tr>
                ) : (
                  filteredPeriods.map((period, index) => (
                    <tr key={period.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 border border-gray-200">{index + 1}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        {period.class_id ? classes.find(c => c.id === period.class_id)?.class_name || '-' : 'All Classes'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">{period.day_of_week || 'ALL DAYS'}</td>
                      <td className="px-4 py-3 border border-gray-200">{period.period_name}</td>
                      <td className="px-4 py-3 border border-gray-200">{formatTime(period.start_time)}</td>
                      <td className="px-4 py-3 border border-gray-200">{formatTime(period.end_time)}</td>
                      <td className="px-4 py-3 border border-gray-200">{formatPeriodType(period.period_type)}</td>
                      <td className="px-4 py-3 border border-gray-200">
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
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeletePeriod(period.id)}
                            className="text-red-600 hover:text-red-800"
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
      )}

      {/* Add Period Modal */}
      {showPeriodModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
          onClick={() => setShowPeriodModal(false)}
        >
          <div
            className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F5BA0] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{editingPeriod ? 'Update Period' : 'Add Period'}</h3>
                <p className="text-sm text-blue-100 mt-1">Fill in the details below</p>
              </div>
              <button onClick={() => setShowPeriodModal(false)} className="text-white hover:bg-white/10 p-2 rounded">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
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
                    placeholder="Leave empty to auto-generate (e.g., Period 1)"
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

              <div className="flex justify-end gap-3 pt-4">
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
        </div>
      )}

      {/* Bulk Period Modal */}
      {showBulkPeriodModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
          onClick={() => setShowBulkPeriodModal(false)}
        >
          <div
            className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F5BA0] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Add Period via policy</h3>
                <p className="text-sm text-blue-100 mt-1">Fill in the details below</p>
              </div>
              <button onClick={() => setShowBulkPeriodModal(false)} className="text-white hover:bg-white/10 p-2 rounded">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                This will create 8 periods automatically with the specified timing and gap between periods for selected classes and days.
              </p>

              {/* Class Selection */}
              <div className="col-span-2">
                <label className="block text-gray-700 font-semibold mb-2">Class <span className="text-red-500">*</span></label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-40 overflow-y-auto bg-gray-50">
                  {classes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No classes available</p>
                  ) : (
                    classes.map((cls) => (
                      <label key={cls.id} className="flex items-center gap-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer">
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
                          className="w-4 h-4 text-blue-600"
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
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2">
                    {daysOfWeek.map((day) => (
                      <label key={day} className="flex items-center gap-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer">
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
                          className="w-4 h-4 text-blue-600"
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

              <div className="flex justify-end gap-3 pt-4">
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
        </div>
      )}

      {/* Change Timing Modal */}
      {showTimingModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
          onClick={() => setShowTimingModal(false)}
        >
          <div
            className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F5BA0] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Change Period Timing</h3>
                <p className="text-sm text-blue-100 mt-1">Fill in the details below</p>
              </div>
              <button onClick={() => setShowTimingModal(false)} className="text-white hover:bg-white/10 p-2 rounded">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
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

              <div className="flex justify-end gap-3 pt-4">
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
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#DC2626] text-white px-6 py-4">
              <h3 className="text-xl font-bold">Confirm Delete</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <span className="text-red-600 font-bold">All Periods</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllPeriods}
                  className="flex-1 px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Entry Modal */}
      {showTimetableModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
          onClick={() => setShowTimetableModal(false)}
        >
          <div
            className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F5BA0] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{editingTimetable ? 'Update Timetable Entry' : 'Add Timetable Entry'}</h3>
                <p className="text-sm text-blue-100 mt-1">Fill in the details below</p>
              </div>
              <button onClick={() => setShowTimetableModal(false)} className="text-white hover:bg-white/10 p-2 rounded">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
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
        </div>
      )}

      {/* Auto Generate Timetable Modal */}
      {showAutoGenerateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setShowAutoGenerateModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#059669] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Auto Generate Timetable</h3>
                <p className="text-sm text-emerald-100 mt-1">Generate full day timetable automatically</p>
              </div>
              <button onClick={() => setShowAutoGenerateModal(false)} className="text-white hover:bg-white/10 p-2 rounded">
                <X size={24} />
              </button>
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
        </div>
      )}
    </div>
  )
}
