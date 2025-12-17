'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Printer, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function DatesheetReportsPage() {
  const router = useRouter()
  const [datesheets, setDatesheets] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [session, setSession] = useState(null)
  const [schoolInfo, setSchoolInfo] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState([])

  // Roll No Slip State
  const [showRollNoSlipModal, setShowRollNoSlipModal] = useState(false)
  const [selectedClassForSlip, setSelectedClassForSlip] = useState('')
  const [filteredStudentsForSlip, setFilteredStudentsForSlip] = useState([])
  const [selectedStudentForSlip, setSelectedStudentForSlip] = useState('')
  const [selectedDatesheet, setSelectedDatesheet] = useState('')

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

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showRollNoSlipModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showRollNoSlipModal])

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
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  // Fetch school info
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
        setSchoolInfo(data)
      } catch (error) {
        console.error('Error fetching school info:', error)
      }
    }

    fetchSchoolInfo()
  }, [currentUser])

  // Fetch current session
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
        } else {
          setSession(data)
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
    if (currentUser?.school_id && session?.name) {
      fetchDatesheets()
      fetchClasses()
      fetchSubjects()
      fetchStudents()
    }
  }, [currentUser, session])

  const fetchDatesheets = async () => {
    if (!currentUser?.school_id || !session?.name) return

    try {
      const { data, error } = await supabase
        .from('datesheets')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('session', session.name)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDatesheets(data || [])
    } catch (error) {
      console.error('Error fetching datesheets:', error)
      showToast('Error fetching datesheets', 'error')
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

  const fetchSchedules = async (datesheetId) => {
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
      return data || []
    } catch (error) {
      console.error('Error fetching schedules:', error)
      showToast('Error fetching schedules', 'error')
      return []
    }
  }

  const handleViewRollNoSlips = () => {
    if (!selectedDatesheet) {
      showToast('Please select a datesheet first', 'warning')
      return
    }
    setShowRollNoSlipModal(true)
  }

  const handleClassChangeForSlip = (classId) => {
    setSelectedClassForSlip(classId)
    setSelectedStudentForSlip('')

    if (classId) {
      const filtered = students.filter(s => s.current_class_id === classId)
      setFilteredStudentsForSlip(filtered)
    } else {
      setFilteredStudentsForSlip([])
    }
  }

  const handleGenerateRollNoSlip = async () => {
    if (!selectedStudentForSlip) {
      showToast('Please select a student', 'warning')
      return
    }

    const student = students.find(s => s.id === selectedStudentForSlip)
    if (!student) {
      showToast('Student not found', 'error')
      return
    }

    const datesheet = datesheets.find(d => d.id === selectedDatesheet)
    if (!datesheet) {
      showToast('Datesheet not found', 'error')
      return
    }

    const scheduleData = await fetchSchedules(selectedDatesheet)
    await generateRollNoSlipPDF(student, datesheet, scheduleData)

    setShowRollNoSlipModal(false)
    setSelectedClassForSlip('')
    setSelectedStudentForSlip('')
    setFilteredStudentsForSlip([])
  }

  const generateRollNoSlipPDF = async (student, datesheet, scheduleData) => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      let yPos = 20

      // School name and details
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(schoolInfo?.name || 'School Name', pageWidth / 2, yPos, { align: 'center' })
      yPos += 7

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      if (schoolInfo?.address) {
        doc.text(schoolInfo.address, pageWidth / 2, yPos, { align: 'center' })
        yPos += 5
      }
      if (schoolInfo?.phone) {
        doc.text(`Ph: ${schoolInfo.phone}`, pageWidth / 2, yPos, { align: 'center' })
        yPos += 5
      }

      yPos += 5

      // Title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('ROLL NUMBER SLIP', pageWidth / 2, yPos, { align: 'center' })
      yPos += 7
      doc.text(datesheet.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      // Student Info
      const leftMargin = 20
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      const infoData = [
        ['Student Name', student.first_name + ' ' + (student.last_name || ''), 'Adm#', student.admission_number],
        ['Father Name', student.father_name || 'N/A', 'Roll#', student.roll_number || 'N/A'],
        ['Class', getClassName(student.current_class_id), 'Section', student.current_section_id ? 'A' : '-'],
        ['Session', session?.session_name || session?.name || datesheet.session, 'Group', 'GENERAL'],
        ['Exam Center', datesheet.exam_center || schoolInfo?.address || 'Main Campus', '', '']
      ]

      infoData.forEach((row) => {
        doc.setFont('helvetica', 'bold')
        doc.text(row[0] + ':', leftMargin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(row[1], leftMargin + 35, yPos)

        if (row[2]) {
          doc.setFont('helvetica', 'bold')
          doc.text(row[2] + ':', leftMargin + 105, yPos)
          doc.setFont('helvetica', 'normal')
          doc.text(row[3], leftMargin + 125, yPos)
        }
        yPos += 6
      })

      yPos += 5

      // Schedule Table
      const classSchedules = scheduleData.filter(s =>
        s.class_id === student.current_class_id && s.subject_id
      )

      const tableHead = [['#', 'Subject', 'Exam Date', 'Start Time', 'End Time', 'Room No']]
      const tableBody = classSchedules.map((schedule, index) => {
        const date = new Date(schedule.exam_date)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const formattedDate = `${dayNames[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')}-${monthNames[date.getMonth()]}-${date.getFullYear()}`

        return [
          (index + 1).toString(),
          getSubjectName(schedule.subject_id),
          formattedDate,
          formatTime(schedule.start_time),
          formatTime(schedule.end_time),
          schedule.room_number || 'N/A'
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 50 },
          2: { cellWidth: 55 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 }
        }
      })

      const finalY = doc.lastAutoTable.finalY + 10

      doc.setFontSize(8)
      doc.text('Syllabus: ____________________________________________', leftMargin, finalY)

      const footerY = pageHeight - 20
      doc.setFontSize(8)
      doc.text(`Dated: ${new Date().toLocaleDateString('en-GB')}`, leftMargin, footerY)
      doc.text('_____________________', pageWidth - 60, footerY - 5)
      doc.text('Controller Examination', pageWidth - 60, footerY)

      const fileName = `RollNoSlip_${student.admission_number}_${datesheet.title}.pdf`
      doc.save(fileName)

      showToast('Roll No Slip generated successfully', 'success')
    } catch (error) {
      console.error('Error generating roll no slip:', error)
      showToast(`Error generating slip: ${error.message}`, 'error')
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Roll No Slips</h1>
          <button
            onClick={() => router.push('/datesheet')}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
          >
            Back to Datesheets
          </button>
        </div>

        {/* Search and Datesheet Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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
              value={selectedDatesheet}
              onChange={(e) => setSelectedDatesheet(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select a datesheet</option>
              {datesheets.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.title}</option>
              ))}
            </select>
            {datesheets.length === 0 && (
              <p className="text-sm text-red-500 mt-1">No datesheets found for current session</p>
            )}
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleViewRollNoSlips}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-lg font-medium"
            >
              <Printer className="w-6 h-6" />
              Generate Slip
            </button>
          </div>
        </div>
      </div>

      {/* Blur overlay when modal is open */}
      {showRollNoSlipModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      )}

      {/* Roll No Slip Modal */}
      {showRollNoSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Generate Roll No Slip</h2>
              <button onClick={() => {
                setShowRollNoSlipModal(false)
                setSelectedClassForSlip('')
                setSelectedStudentForSlip('')
                setFilteredStudentsForSlip([])
              }} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                <select
                  value={selectedClassForSlip}
                  onChange={(e) => handleClassChangeForSlip(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select a class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>

              {selectedClassForSlip && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
                  <select
                    value={selectedStudentForSlip}
                    onChange={(e) => setSelectedStudentForSlip(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select a student</option>
                    {filteredStudentsForSlip.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} - Roll: {student.roll_number} - Adm: {student.admission_number}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-2">
                    {filteredStudentsForSlip.length} student(s) found
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRollNoSlipModal(false)
                  setSelectedClassForSlip('')
                  setSelectedStudentForSlip('')
                  setFilteredStudentsForSlip([])
                }}
                className="px-6 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateRollNoSlip}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                disabled={!selectedStudentForSlip}
              >
                <Download className="w-5 h-5" />
                Generate PDF
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
            className="flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg bg-green-600 text-white min-w-[300px]"
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
