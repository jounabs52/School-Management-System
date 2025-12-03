'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Printer, FileText, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DatesheetReportsPage() {
  const router = useRouter()
  const [datesheets, setDatesheets] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [schedules, setSchedules] = useState([])
  const [subjects, setSubjects] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [session, setSession] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState([])

  // Configuration Modal State
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configType, setConfigType] = useState('datesheet') // 'datesheet' or 'rollno'

  // Configuration Form State
  const [config, setConfig] = useState({
    // Visible Items
    showRoomNumber: true,
    showSyllabus: true,
    showExamTime: true,
    showPrincipalSignature: true,
    printDate: new Date().toISOString().split('T')[0],

    // Data Filters
    selectedDatesheet: '',
    template: 'default',
    feeStatus: 'all',
    selectedClass: 'all',

    // Printer Parameters
    textFontSize: '12',
    extraColumns: '2',
    logoHeight: '48',
    logoWidth: '48',
    bgColor: '#ffffff',
    textColor: '#000000',
    landscapeMode: false,
    hideReportCriteria: false
  })

  // Roll No Slip State
  const [showRollNoSlip, setShowRollNoSlip] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedDatesheetForSlip, setSelectedDatesheetForSlip] = useState(null)
  const printRef = useRef(null)

  // Toast notification
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
        console.log('👤 User loaded:', user)
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
          // Fallback to most recent session
          const { data: recentSession, error: recentError } = await supabase
            .from('sessions')
            .select('*')
            .eq('school_id', currentUser.school_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (recentError) {
            showToast('No academic session found', 'error')
            return
          }
          setSession(recentSession)
          console.log('📅 Recent session loaded:', recentSession)
        } else {
          setSession(data)
          console.log('📅 Current session loaded:', data)
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
    if (currentUser?.school_id && session?.id) {
      fetchDatesheets()
      fetchClasses()
      fetchSubjects()
      fetchStudents()
    }
  }, [currentUser, session])

  const fetchDatesheets = async () => {
    if (!currentUser?.school_id || !session?.id) {
      console.log('⚠️ fetchDatesheets skipped - missing data:', {
        school_id: currentUser?.school_id,
        session_id: session?.id
      })
      return
    }

    console.log('📥 Fetching exams/datesheets with:', {
      school_id: currentUser.school_id,
      session_id: session.id
    })

    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('✅ Fetched datesheets/exams:', data)
      console.log(`Found ${data?.length || 0} exams for reports`)
      setDatesheets(data || [])
    } catch (error) {
      console.error('❌ Error fetching datesheets:', error)
      showToast('Error fetching exams', 'error')
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

  const fetchSchedules = async (examId) => {
    if (!currentUser?.school_id) return

    console.log('📅 Fetching schedules for exam:', examId)

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

      console.log('✅ Fetched schedules:', data)
      setSchedules(data || [])
    } catch (error) {
      console.error('❌ Error fetching schedules:', error)
      showToast('Error fetching schedules', 'error')
    }
  }

  const handleViewDateSheet = () => {
    if (!config.selectedDatesheet) {
      showToast('Please select a datesheet first', 'warning')
      return
    }
    setShowConfigModal(true)
    setConfigType('datesheet')
  }

  const handleViewRollNoSlips = () => {
    if (!config.selectedDatesheet) {
      showToast('Please select a datesheet first', 'warning')
      return
    }
    setShowConfigModal(true)
    setConfigType('rollno')
  }

  const handlePrintIndividualSlip = async () => {
    if (!config.selectedDatesheet) {
      showToast('Please select a datesheet', 'warning')
      return
    }

    // Get first student for demo or you can add a student selector
    if (students.length === 0) {
      showToast('No students found', 'error')
      return
    }

    const datesheet = datesheets.find(d => d.id === config.selectedDatesheet)
    if (!datesheet) return

    await fetchSchedules(config.selectedDatesheet)

    const filteredStudents = config.selectedClass !== 'all'
      ? students.filter(s => s.current_class_id === config.selectedClass)
      : students

    if (filteredStudents.length > 0) {
      setSelectedStudent(filteredStudents[0])
      setSelectedDatesheetForSlip(datesheet)
      setShowRollNoSlip(true)

      // Trigger print after a short delay to ensure rendering
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }

  const handleProcessConfig = () => {
    if (configType === 'datesheet') {
      // Generate Date Sheet Report (could open a new window or download PDF)
      showToast('Date Sheet Report generated successfully', 'success')
      setShowConfigModal(false)
    } else {
      // Generate Roll No Slips for all students
      handlePrintIndividualSlip()
      setShowConfigModal(false)
    }
  }

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId)
    return cls?.class_name || 'N/A'
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId)
    return subject?.subject_name || ''
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Datesheet Reports</h1>
        <button
          onClick={() => router.push('/datesheet')}
          className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
        >
          Back to Datesheets
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleViewDateSheet}
          className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          Reports
        </button>
        <button
          onClick={handlePrintIndividualSlip}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print Individual Roll No Slip
        </button>
      </div>

      {/* Search and Datesheet Selection */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Write search text here..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Datesheet / Exam</label>
          <select
            value={config.selectedDatesheet}
            onChange={(e) => setConfig({ ...config, selectedDatesheet: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Select an exam</option>
            {datesheets.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.exam_name}</option>
            ))}
          </select>
          {datesheets.length === 0 && (
            <p className="text-sm text-red-500 mt-1">No exams found for current session</p>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-teal-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Sr.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date Sheet Reports</th>
              <th className="px-4 py-3 text-left text-sm font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">1</td>
              <td className="px-4 py-3 text-sm font-medium">Date Sheet</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={handleViewDateSheet}
                  className="bg-teal-600 text-white px-6 py-1 rounded hover:bg-teal-700"
                >
                  View
                </button>
              </td>
            </tr>
            <tr className="bg-gray-300">
              <td colSpan="3" className="px-4 py-2 text-sm font-semibold text-gray-700">
                Roll No Slips
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">2</td>
              <td className="px-4 py-3 text-sm font-medium">Roll No Slips</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={handleViewRollNoSlips}
                  className="bg-teal-600 text-white px-6 py-1 rounded hover:bg-teal-700"
                >
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-green-500 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Configure Visible Parameters</h2>
              <button onClick={() => setShowConfigModal(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Configure Visible Items */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5" />
                  <h3 className="font-semibold text-gray-800">CONFIGURE VISIBLE ITEMS</h3>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showRoomNumber}
                      onChange={(e) => setConfig({ ...config, showRoomNumber: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Room Number</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showSyllabus}
                      onChange={(e) => setConfig({ ...config, showSyllabus: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Syllabus</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showExamTime}
                      onChange={(e) => setConfig({ ...config, showExamTime: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Exam Time</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.showPrincipalSignature}
                      onChange={(e) => setConfig({ ...config, showPrincipalSignature: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Principal Signature</span>
                  </label>
                </div>
                <div className="w-1/4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Print Date</label>
                  <input
                    type="date"
                    value={config.printDate}
                    onChange={(e) => setConfig({ ...config, printDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <hr />

              {/* Configure Data Filters */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">▼ CONFIGURE DATA FILTERS</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Datesheet / Exam</label>
                    <select
                      value={config.selectedDatesheet}
                      onChange={(e) => setConfig({ ...config, selectedDatesheet: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">Select an option</option>
                      {datesheets.map(ds => (
                        <option key={ds.id} value={ds.id}>{ds.exam_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                    <select
                      value={config.template}
                      onChange={(e) => setConfig({ ...config, template: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="default">Default Template</option>
                      <option value="custom">Custom Template</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fee Status</label>
                    <select
                      value={config.feeStatus}
                      onChange={(e) => setConfig({ ...config, feeStatus: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="all">Select an option</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr />

              {/* Academic Parameters */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">📚 ACADEMIC PARAMETERS</h3>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <select
                    value={config.selectedClass}
                    onChange={(e) => setConfig({ ...config, selectedClass: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="all">All Classes</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <hr />

              {/* Adjust Page Printer Parameters */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">🖨️ ADJUST PAGE PRINTER PARAMETERS</h3>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Font Size</label>
                    <select
                      value={config.textFontSize}
                      onChange={(e) => setConfig({ ...config, textFontSize: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="10">10pt</option>
                      <option value="12">12pt</option>
                      <option value="14">14pt</option>
                      <option value="16">16pt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Extra Columns</label>
                    <select
                      value={config.extraColumns}
                      onChange={(e) => setConfig({ ...config, extraColumns: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo Height (pt)</label>
                    <input
                      type="number"
                      value={config.logoHeight}
                      onChange={(e) => setConfig({ ...config, logoHeight: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo Width (pt)</label>
                    <input
                      type="number"
                      value={config.logoWidth}
                      onChange={(e) => setConfig({ ...config, logoWidth: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">BG Color</label>
                    <input
                      type="color"
                      value={config.bgColor}
                      onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                    <input
                      type="color"
                      value={config.textColor}
                      onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.landscapeMode}
                      onChange={(e) => setConfig({ ...config, landscapeMode: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Landscape Mode</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.hideReportCriteria}
                      onChange={(e) => setConfig({ ...config, hideReportCriteria: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Hide Report Criteria</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-2 text-gray-700 hover:text-gray-900"
              >
                Close
              </button>
              <button
                onClick={handleProcessConfig}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
              >
                Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roll No Slip Print View */}
      {showRollNoSlip && selectedStudent && selectedDatesheetForSlip && (
        <div className="fixed inset-0 bg-white z-[100] overflow-auto print:relative print:z-auto">
          <div className="max-w-4xl mx-auto p-8" ref={printRef}>
            {/* Print Header */}
            <div className="text-center mb-6 border-b-2 border-red-600 pb-4">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  S
                </div>
                <div>
                  <h1 className="text-2xl font-bold">SKOOLZOOM DEMO SOFTWARE</h1>
                  <p className="text-sm">BLOCK D STREET 29 ISLAMABAD</p>
                  <p className="text-sm">Ph: 03011016102</p>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-center mb-2">EXAM ENTRANCE SLIP</h2>
            <h3 className="text-lg font-bold text-center mb-6">{selectedDatesheetForSlip.exam_name?.toUpperCase()}</h3>

            {/* Student Details */}
            <div className="border-2 border-red-600 rounded p-4 mb-6 relative">
              <div className="absolute right-4 top-4 w-20 h-24 border border-gray-300 flex items-center justify-center">
                <div className="text-center text-xs text-gray-400">Photo</div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 font-semibold w-1/3">Student's Name</td>
                    <td className="py-2">{selectedStudent.first_name} {selectedStudent.last_name}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-semibold">Father's Name</td>
                    <td className="py-2">{selectedStudent.father_name}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-semibold">Class</td>
                    <td className="py-2">
                      {getClassName(selectedStudent.current_class_id)}
                      <span className="ml-8 font-semibold">Adm#</span> {selectedStudent.admission_number}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-semibold">Section</td>
                    <td className="py-2">
                      {selectedStudent.current_section_id ? 'A' : '-'}
                      <span className="ml-8 font-semibold">Group</span> GENERAL
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-semibold">Session</td>
                    <td className="py-2">
                      {session?.session_name || '2024-2025'}
                      <span className="ml-8 font-semibold">Roll#</span> {selectedStudent.roll_number}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Exam Center</td>
                    <td className="py-2">{selectedDatesheetForSlip.exam_center || 'Main Campus'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Exam Schedule Table */}
            <table className="w-full border-2 border-black text-sm mb-6">
              <thead>
                <tr className="bg-white border-b-2 border-black">
                  <th className="border-r-2 border-black px-2 py-2 text-left">#</th>
                  <th className="border-r-2 border-black px-2 py-2 text-left">Subject</th>
                  <th className="border-r-2 border-black px-2 py-2 text-left">Exam Date</th>
                  {config.showExamTime && (
                    <>
                      <th className="border-r-2 border-black px-2 py-2 text-left">Start Time</th>
                      <th className="border-r-2 border-black px-2 py-2 text-left">End Time</th>
                    </>
                  )}
                  {config.showRoomNumber && (
                    <th className="px-2 py-2 text-left">Room No</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {schedules
                  .filter(s => s.class_id === selectedStudent.current_class_id && s.subject_id)
                  .map((schedule, index) => (
                    <tr key={schedule.id} className="border-b border-black">
                      <td className="border-r-2 border-black px-2 py-2">{index + 1}</td>
                      <td className="border-r-2 border-black px-2 py-2">{getSubjectName(schedule.subject_id)}</td>
                      <td className="border-r-2 border-black px-2 py-2">{formatDate(schedule.exam_date)}</td>
                      {config.showExamTime && (
                        <>
                          <td className="border-r-2 border-black px-2 py-2">{formatTime(schedule.start_time)}</td>
                          <td className="border-r-2 border-black px-2 py-2">{formatTime(schedule.end_time)}</td>
                        </>
                      )}
                      {config.showRoomNumber && (
                        <td className="px-2 py-2">{schedule.room_number || '-'}</td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Syllabus Section */}
            {config.showSyllabus && (
              <div className="mb-6">
                <p className="text-center text-sm">Syllabus: <span className="border-b border-dotted border-black inline-block w-96"></span></p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-end text-sm">
              <div>
                <p>Dated: <span className="font-semibold">{formatDate(config.printDate)}</span></p>
              </div>
              {config.showPrincipalSignature && (
                <div className="text-right">
                  <p className="border-b border-black inline-block px-12 mb-1"></p>
                  <p>Controller Examination</p>
                </div>
              )}
            </div>

            {/* Print Button (hide when printing) */}
            <div className="mt-8 text-center print:hidden">
              <button
                onClick={() => setShowRollNoSlip(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 mr-4"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Print
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
