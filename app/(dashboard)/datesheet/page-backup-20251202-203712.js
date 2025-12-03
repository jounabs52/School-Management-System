'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, Pencil, Trash2, Clock, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DatesheetPage() {
  const router = useRouter()
  const [exams, setExams] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState([])
  const [session, setSession] = useState(null)

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showEditExamModal, setShowEditExamModal] = useState(false)
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false)

  // Form States
  const [selectedClasses, setSelectedClasses] = useState([])
  const [examName, setExamName] = useState('')
  const [examType, setExamType] = useState('term')
  const [examStartDate, setExamStartDate] = useState('')
  const [examEndDate, setExamEndDate] = useState('')
  const [defaultStartTime, setDefaultStartTime] = useState('11:00')
  const [defaultEndTime, setDefaultEndTime] = useState('12:30')
  const [interval, setInterval] = useState(2)
  const [saturdayOff, setSaturdayOff] = useState(true)
  const [sundayOff, setSundayOff] = useState(true)
  const [examCenter, setExamCenter] = useState('')

  // Schedule States
  const [currentExam, setCurrentExam] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [scheduleDates, setScheduleDates] = useState([])

  // Edit Schedule States
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [editSubject, setEditSubject] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editRoomNumber, setEditRoomNumber] = useState('')
  const [editTotalMarks, setEditTotalMarks] = useState('100')
  const [editPassingMarks, setEditPassingMarks] = useState('40')

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

  // Toast notification function
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

  // Fetch data
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchExams()
      fetchClasses()
      fetchSubjects()
    }
  }, [currentUser, session])

  const fetchExams = async () => {
    if (!currentUser?.school_id || !session?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExams(data || [])
    } catch (error) {
      console.error('Error fetching exams:', error)
      showToast('Error fetching exams', 'error')
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

  const fetchSchedules = async (examId) => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('exam_schedules')
        .select(`
          *,
          classes (class_name),
          subjects (subject_name)
        `)
        .eq('exam_id', examId)
        .order('exam_date')
        .order('start_time')

      if (error) throw error
      setSchedules(data || [])

      // Extract unique dates
      const dates = [...new Set(data?.map(s => s.exam_date) || [])]
      setScheduleDates(dates)
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

  const handleCreateExam = async () => {
    // Detailed validation with specific error messages
    if (!currentUser?.school_id) {
      console.error('Current user or school_id not found:', currentUser)
      showToast('User not logged in or school not found', 'error')
      return
    }

    if (!session?.id) {
      console.error('Session not loaded:', session)
      showToast('Academic session not found. Please ensure a session is created and marked as current.', 'error')
      return
    }

    if (selectedClasses.length === 0) {
      showToast('Please select at least one class', 'warning')
      return
    }

    if (!examName || !examStartDate || !examEndDate) {
      showToast('Please fill all required fields', 'warning')
      return
    }

    console.log('Creating exam with:', {
      school_id: currentUser.school_id,
      session_id: session.id,
      examName,
      selectedClasses
    })

    setLoading(true)
    try {
      // Create exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          school_id: currentUser.school_id,
          session_id: session.id,
          exam_name: examName,
          exam_type: examType,
          start_date: examStartDate,
          end_date: examEndDate,
          status: 'scheduled',
          created_by: currentUser.id
        })
        .select()
        .single()

      if (examError) throw examError

      // Generate schedule dates
      const dates = generateScheduleDates(examStartDate, examEndDate, interval, saturdayOff, sundayOff)

      // Create initial empty schedules for each class and date
      const scheduleRecords = []
      selectedClasses.forEach(classId => {
        dates.forEach(date => {
          scheduleRecords.push({
            exam_id: exam.id,
            school_id: currentUser.school_id,
            class_id: classId,
            subject_id: null,
            exam_date: date.toISOString().split('T')[0],
            start_time: defaultStartTime,
            end_time: defaultEndTime,
            room_number: examCenter,
            total_marks: 100,
            passing_marks: 40,
            created_by: currentUser.id
          })
        })
      })

      if (scheduleRecords.length > 0) {
        // Insert schedules in batches to avoid timeout
        const batchSize = 50
        for (let i = 0; i < scheduleRecords.length; i += batchSize) {
          const batch = scheduleRecords.slice(i, i + batchSize)
          const { error: scheduleError } = await supabase
            .from('exam_schedules')
            .insert(batch)

          if (scheduleError) throw scheduleError
        }
      }

      showToast('Exam datesheet created successfully', 'success')
      setShowCreateModal(false)
      resetForm()
      fetchExams()
    } catch (error) {
      console.error('Error creating exam:', error)
      showToast(`Failed to create exam: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExam = async (id) => {
    showConfirmDialog(
      'Delete Exam',
      'Are you sure you want to delete this exam? This will also delete all associated schedules.',
      async () => {
        try {
          // Delete schedules first
          const { error: scheduleError } = await supabase
            .from('exam_schedules')
            .delete()
            .eq('exam_id', id)

          if (scheduleError) throw scheduleError

          // Delete exam
          const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', id)

          if (error) throw error

          showToast('Exam deleted successfully', 'success')
          fetchExams()
        } catch (error) {
          console.error('Error deleting exam:', error)
          showToast('Failed to delete exam', 'error')
        }
      }
    )
  }

  const handleOpenSchedule = async (exam) => {
    setCurrentExam(exam)

    // Get all classes that have schedules for this exam
    const { data: examSchedules } = await supabase
      .from('exam_schedules')
      .select('class_id')
      .eq('exam_id', exam.id)

    const classIds = [...new Set(examSchedules?.map(s => s.class_id) || [])]
    setSelectedClasses(classIds)

    await fetchSchedules(exam.id)
    setShowScheduleModal(true)
  }

  const handleOpenEditExam = (exam) => {
    setCurrentExam(exam)
    setExamName(exam.exam_name)
    setExamType(exam.exam_type)
    setExamStartDate(exam.start_date)
    setExamEndDate(exam.end_date)
    setShowEditExamModal(true)
  }

  const handleUpdateExam = async () => {
    if (!currentExam) return

    try {
      const { error } = await supabase
        .from('exams')
        .update({
          exam_name: examName,
          exam_type: examType,
          start_date: examStartDate,
          end_date: examEndDate
        })
        .eq('id', currentExam.id)

      if (error) throw error

      showToast('Exam updated successfully', 'success')
      setShowEditExamModal(false)
      resetForm()
      fetchExams()
    } catch (error) {
      console.error('Error updating exam:', error)
      showToast('Failed to update exam', 'error')
    }
  }

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule)
    setEditSubject(schedule.subject_id || '')
    setEditDate(schedule.exam_date)
    setEditStartTime(schedule.start_time)
    setEditEndTime(schedule.end_time)
    setEditRoomNumber(schedule.room_number || '')
    setEditTotalMarks(schedule.total_marks || '100')
    setEditPassingMarks(schedule.passing_marks || '40')
    setShowEditScheduleModal(true)
  }

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return

    try {
      const { error } = await supabase
        .from('exam_schedules')
        .update({
          subject_id: editSubject || null,
          exam_date: editDate,
          start_time: editStartTime,
          end_time: editEndTime,
          room_number: editRoomNumber,
          total_marks: parseFloat(editTotalMarks),
          passing_marks: parseFloat(editPassingMarks)
        })
        .eq('id', editingSchedule.id)

      if (error) throw error

      showToast('Schedule updated successfully', 'success')
      setShowEditScheduleModal(false)
      fetchSchedules(currentExam.id)
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
            .from('exam_schedules')
            .update({ subject_id: null })
            .eq('id', scheduleId)

          if (error) throw error

          showToast('Schedule cleared successfully', 'success')
          fetchSchedules(currentExam.id)
        } catch (error) {
          console.error('Error deleting schedule:', error)
          showToast('Failed to delete schedule', 'error')
        }
      }
    )
  }

  const resetForm = () => {
    setSelectedClasses([])
    setExamName('')
    setExamType('term')
    setExamStartDate('')
    setExamEndDate('')
    setDefaultStartTime('11:00')
    setDefaultEndTime('12:30')
    setInterval(2)
    setSaturdayOff(true)
    setSundayOff(true)
    setExamCenter('')
    setCurrentExam(null)
  }

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId)
    return cls?.class_name || 'N/A'
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId)
    return subject?.subject_name || ''
  }

  const filteredExams = exams.filter(exam =>
    exam.exam_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getScheduleForClassAndDate = (classId, date) => {
    return schedules.find(s => s.class_id === classId && s.exam_date === date)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Exam Datesheets</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/datesheet/reports')}
            className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Reports
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Create New Datesheet
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        {!session && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p className="font-semibold">⚠️ No Active Session</p>
            <p className="text-sm">Please create an academic session and mark it as current before creating datesheets.</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-4 py-2"
          />
          <button className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600">
            Search
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          There are <span className="font-semibold text-red-600">{filteredExams.length}</span> records for session
          <span className="font-semibold"> {session?.name || 'Loading...'}</span>
        </div>
      </div>

      {/* Exams Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Sr.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Exam Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Start Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">End Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredExams.length > 0 ? (
              filteredExams.map((exam, index) => (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{exam.exam_name}</td>
                  <td className="px-4 py-3 text-sm">{exam.start_date || '-'}</td>
                  <td className="px-4 py-3 text-sm">{exam.end_date || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenSchedule(exam)}
                        className="bg-orange-500 text-white px-4 py-1 rounded text-sm hover:bg-orange-600 flex items-center gap-1"
                      >
                        <Calendar className="w-4 h-4" />
                        Exam Schedule
                      </button>
                      <button
                        onClick={() => handleOpenEditExam(exam)}
                        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam.id)}
                        className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No exams found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create New Datesheet</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
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

              {/* Exam Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datesheet Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mid term exam"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Exam Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="term">Term</option>
                    <option value="unit">Unit</option>
                    <option value="final">Final</option>
                    <option value="assessment">Assessment</option>
                  </select>
                </div>

                {/* Exam Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Start Date</label>
                  <input
                    type="date"
                    value={examStartDate}
                    onChange={(e) => setExamStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                {/* Exam End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam End Date</label>
                  <input
                    type="date"
                    value={examEndDate}
                    onChange={(e) => setExamEndDate(e.target.value)}
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

              <div className="grid grid-cols-3 gap-4">
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
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={handleCreateExam}
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading ? 'Creating...' : 'Create Datesheet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && currentExam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-green-500 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Update Date Sheet Schedule ({currentExam.exam_name})</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="border border-gray-300 px-3 py-2 text-sm">Sr.</th>
                      <th className="border border-gray-300 px-3 py-2 text-sm">Class Name</th>
                      {scheduleDates.map(date => (
                        <th key={date} className="border border-gray-300 px-3 py-2 text-sm min-w-[150px]">
                          {new Date(date).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClasses?.map((classId, index) => (
                      <tr key={classId}>
                        <td className="border border-gray-300 px-3 py-2 text-center text-sm">{index + 1}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-medium">
                          {getClassName(classId)}
                        </td>
                        {scheduleDates.map(date => {
                          const schedule = getScheduleForClassAndDate(classId, date)
                          return (
                            <td key={date} className="border border-gray-300 px-2 py-2 text-sm">
                              {schedule?.subject_id ? (
                                <div className="flex flex-col gap-1">
                                  <div className="font-medium text-blue-600">
                                    {getSubjectName(schedule.subject_id)}
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleEditSchedule(schedule)}
                                      className="text-green-600 hover:text-green-800"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSchedule(schedule.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                schedule && (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {showEditExamModal && currentExam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="bg-green-500 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Update Date Sheet ({currentExam.exam_name})</h2>
              <button onClick={() => setShowEditExamModal(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Name</label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="term">Term</option>
                    <option value="unit">Unit</option>
                    <option value="final">Final</option>
                    <option value="assessment">Assessment</option>
                  </select>
                </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={examEndDate}
                    onChange={(e) => setExamEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowEditExamModal(false)}
                className="px-6 py-2 text-blue-600 hover:text-blue-800"
              >
                Close
              </button>
              <button
                onClick={handleUpdateExam}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {showEditScheduleModal && editingSchedule && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Edit Schedule</h2>
              <button onClick={() => setShowEditScheduleModal(false)} className="text-white hover:text-gray-200">
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
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                  ))}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                  <input
                    type="number"
                    value={editTotalMarks}
                    onChange={(e) => setEditTotalMarks(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks</label>
                  <input
                    type="number"
                    value={editPassingMarks}
                    onChange={(e) => setEditPassingMarks(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowEditScheduleModal(false)}
                className="px-6 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSchedule}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-600">{confirmDialog.message}</p>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
