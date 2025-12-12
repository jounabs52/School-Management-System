'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, FileDown } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function AttendanceReportsPage() {
  const [activeTab, setActiveTab] = useState('student')
  const [currentUser, setCurrentUser] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [toasts, setToasts] = useState([])
  const [activeReport, setActiveReport] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Report filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])

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

  // Load classes and fetch school data
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchSchoolData()
      loadClasses()
    }
  }, [currentUser])

  const fetchSchoolData = async () => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error
      setSchoolData(data)
    } catch (error) {
      console.error('Error fetching school data:', error)
    }
  }

  // Load sections when class is selected
  useEffect(() => {
    if (selectedClass) {
      loadSections()
    } else {
      setSections([])
      setSelectedSection('')
    }
  }, [selectedClass])

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (activeReport) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [activeReport])

  const loadClasses = async () => {
    if (!currentUser?.school_id) {
      console.log('loadClasses: currentUser not loaded yet')
      return
    }

    try {
      console.log('loadClasses: Loading classes for school_id:', currentUser.school_id)
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('order_number')

      if (error) throw error
      console.log('loadClasses: Successfully loaded', data?.length || 0, 'classes')
      setClasses(data || [])
    } catch (error) {
      console.error('loadClasses: Error loading classes:', error)
      if (currentUser?.school_id) {
        showToast('Failed to load classes', 'error')
      }
    }
  }

  const loadSections = async () => {
    if (!currentUser?.school_id || !selectedClass) return

    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('class_id', selectedClass)
        .order('section_name')

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Error loading sections:', error)
      if (currentUser?.school_id) {
        showToast('Failed to load sections', 'error')
      }
    }
  }

  // Toast notification system
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

  // Student Reports
  const studentReports = [
    { id: 'daily-attendance', name: 'Daily Attendance Report', description: 'View attendance summary by class for a specific date' },
    { id: 'monthly-summary', name: 'Monthly Attendance Summary', description: 'Individual student attendance summary for the month' },
    { id: 'attendance-register', name: 'Attendance Register', description: 'Day-by-day attendance grid for the month' },
    { id: 'today-present', name: 'Today Present Students', description: 'List of all present students today' },
    { id: 'today-absent', name: 'Today Absent Students', description: 'List of all absent students today' },
    { id: 'today-late', name: 'Today Late Comers', description: 'List of all late students today' },
    { id: 'today-leave', name: 'Today Leave Students', description: 'List of all students on leave today' }
  ]

  // Staff Reports
  const staffReports = [
    { id: 'staff-daily-attendance', name: 'Daily Attendance Report', description: 'View staff attendance summary for a specific date' },
    { id: 'staff-monthly-summary', name: 'Monthly Attendance Summary', description: 'Individual staff attendance summary for the month' },
    { id: 'staff-attendance-register', name: 'Attendance Register', description: 'Day-by-day staff attendance grid for the month' },
    { id: 'staff-today-present', name: 'Today Present Staff', description: 'List of all present staff today' },
    { id: 'staff-today-absent', name: 'Today Absent Staff', description: 'List of all absent staff today' },
    { id: 'staff-today-late', name: 'Today Late Comers', description: 'List of all late staff today' },
    { id: 'staff-today-leave', name: 'Today Leave Staff', description: 'List of all staff on leave today' }
  ]

  const handleViewReport = (reportId) => {
    setActiveReport(reportId)
    setReportData(null)
  }

  const handleCloseReport = () => {
    setActiveReport(null)
    setReportData(null)
  }

  const handleDownloadPDF = () => {
    try {
      showToast('Generating PDF...', 'info')

      const reportElement = document.getElementById('report-content')
      if (!reportElement) {
        console.error('Report content element not found')
        showToast('Report content not found', 'error')
        return
      }

      console.log('Report element found, searching for table...')

      // Search for table inside the report-content element
      const table = reportElement.querySelector('table')

      if (!table) {
        console.error('No table found in report content')
        console.error('reportElement children:', reportElement.children)
        const allTables = document.querySelectorAll('table')
        console.error('All tables on page:', allTables.length, allTables)
        showToast('No data table found. Please try generating the report again.', 'warning')
        return
      }

      console.log('Table found!')

      // Validate that table has actual data rows (not empty state)
      const tbody = table.querySelector('tbody')
      const rows = tbody ? tbody.querySelectorAll('tr') : []

      if (rows.length === 0) {
        console.error('Table found but has no data rows')
        showToast('No data in the report. Please generate the report with valid data.', 'warning')
        return
      }

      console.log('Found table with', rows.length, 'rows')

        const doc = new jsPDF('p', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.width
        const pageHeight = doc.internal.pageSize.height
        
        // Colors
        const primaryColor = [41, 128, 185]
        const secondaryColor = [52, 73, 94]
        
        let yPosition = 20

        // Add School Header
        if (schoolData) {
          // Logo
          if (schoolData.logo_url) {
            try {
              doc.addImage(schoolData.logo_url, 'PNG', 15, yPosition, 25, 25)
            } catch (e) {
              console.log('Could not load logo')
            }
          }

          // School Name
          doc.setFontSize(20)
          doc.setTextColor(...primaryColor)
          doc.setFont('helvetica', 'bold')
          doc.text(schoolData.name || 'School Name', pageWidth / 2, yPosition + 5, { align: 'center' })

          yPosition += 13
          doc.setFontSize(10)
          doc.setTextColor(...secondaryColor)
          doc.setFont('helvetica', 'normal')

          // Address
          if (schoolData.address) {
            doc.text(schoolData.address, pageWidth / 2, yPosition, { align: 'center' })
            yPosition += 5
          }

          // Contact Info
          const contactInfo = []
          if (schoolData.phone) contactInfo.push(`Phone: ${schoolData.phone}`)
          if (schoolData.email) contactInfo.push(`Email: ${schoolData.email}`)
          if (contactInfo.length > 0) {
            doc.text(contactInfo.join(' | '), pageWidth / 2, yPosition, { align: 'center' })
            yPosition += 5
          }

          // Website
          if (schoolData.website) {
            doc.text(schoolData.website, pageWidth / 2, yPosition, { align: 'center' })
            yPosition += 8
          } else {
            yPosition += 3
          }

          // Divider Line
          doc.setDrawColor(...primaryColor)
          doc.setLineWidth(0.5)
          doc.line(15, yPosition, pageWidth - 15, yPosition)
          yPosition += 8
        }

        // Report Title
        const reportName = activeTab === 'student'
          ? studentReports.find(r => r.id === activeReport)?.name
          : staffReports.find(r => r.id === activeReport)?.name

        doc.setFontSize(16)
        doc.setTextColor(...primaryColor)
        doc.setFont('helvetica', 'bold')
        doc.text(reportName || 'Report', pageWidth / 2, yPosition, { align: 'center' })
        yPosition += 10

        // Extract table data from DOM
        // table variable already defined above
        if (table) {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim())
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
          Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
        )

        autoTable(doc, {
          startY: yPosition,
          head: [headers],
          body: rows,
          theme: 'grid',
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: {
            fontSize: 9,
            cellPadding: 3
          },
          margin: { left: 15, right: 15 }
        })
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(...secondaryColor)
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
        doc.text(
          'Generated by Smart School Pro',
          pageWidth - 15,
          pageHeight - 10,
          { align: 'right' }
        )
      }

      // Save PDF
      const fileName = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      showToast('PDF downloaded successfully', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      console.error('Error details:', error.message, error.stack)
      showToast('Failed to generate PDF: ' + error.message, 'error')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Attendance Reports</h1>

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

      {/* Report Modal */}
      {activeReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between rounded-t-lg print:hidden">
              <h2 className="text-xl font-semibold">
                {activeTab === 'student'
                  ? studentReports.find(r => r.id === activeReport)?.name
                  : staffReports.find(r => r.id === activeReport)?.name
                }
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCloseReport}
                  className="text-white hover:bg-blue-700 p-1 rounded"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div id="report-content" className="flex-1 overflow-auto p-6">
              {renderReportContent()}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!activeReport && (
        <>
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="flex gap-2 p-2">
              <button
                onClick={() => setActiveTab('student')}
                className={`px-6 py-3 font-medium rounded ${
                  activeTab === 'student'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Student Reports
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-6 py-3 font-medium rounded ${
                  activeTab === 'staff'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Staff Reports
              </button>
            </div>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Sr.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Report Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(activeTab === 'student' ? studentReports : staffReports).map((report, index) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{report.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{report.description}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewReport(report.id)}
                          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )

  // Render report content based on active report
  function renderReportContent() {
    if (!activeReport) return null

    // Student Reports
    if (activeReport === 'daily-attendance') {
      return <DailyAttendanceReport onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'monthly-summary') {
      return <MonthlyAttendanceSummary onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'attendance-register') {
      return <AttendanceRegister onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'attendance-sheet') {
      return <AttendanceSheet onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'today-present') {
      return <TodayStudentsList status="present" onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'today-absent') {
      return <TodayStudentsList status="absent" onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'today-late') {
      return <TodayStudentsList status="late" onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'today-leave') {
      return <TodayStudentsList status="on-leave" onDownloadPDF={handleDownloadPDF} />
    }

    // Staff Reports
    if (activeReport === 'staff-daily-attendance') {
      return <StaffDailyAttendanceReport onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'staff-monthly-summary') {
      return <StaffMonthlyAttendanceSummary onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'staff-attendance-register') {
      return <StaffAttendanceRegister onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'staff-attendance-sheet') {
      return <StaffAttendanceSheet onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'staff-today-present') {
      return <TodayStaffList status="present" onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'staff-today-absent') {
      return <TodayStaffList status="absent" onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'staff-today-late') {
      return <TodayStaffList status="late" onDownloadPDF={handleDownloadPDF} />
    }
    if (activeReport === 'staff-today-leave') {
      return <TodayStaffList status="on-leave" onDownloadPDF={handleDownloadPDF} />
    }

    return <div className="text-center text-gray-500">Report not implemented yet</div>
  }

  // Daily Attendance Report Component
  function DailyAttendanceReport({ onDownloadPDF }) {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)

    const loadReport = async () => {
      console.log('DailyAttendanceReport: loadReport called', { school_id: currentUser?.school_id, reportDate })

      if (!currentUser?.school_id || !reportDate) {
        showToast('Please select a date', 'warning')
        return
      }

      setLoading(true)
      try {
        console.log('DailyAttendanceReport: Fetching classes...')
        // Get all classes
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id, class_name')
          .eq('school_id', currentUser.school_id)
          .order('order_number')

        if (classesError) {
          console.error('DailyAttendanceReport: Classes error:', classesError)
          throw classesError
        }
        console.log('DailyAttendanceReport: Loaded', classesData?.length || 0, 'classes')

        // For each class, get attendance counts
        const reportData = []
        for (const classItem of classesData || []) {
          // Get all students in this class
          const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('id')
            .eq('school_id', currentUser.school_id)
            .eq('current_class_id', classItem.id)
            .eq('status', 'active')

          if (studentsError) throw studentsError

          const totalStudents = students?.length || 0

          // Get attendance records for this class and date
          const { data: attendance, error: attendanceError } = await supabase
            .from('student_attendance')
            .select('status')
            .eq('school_id', currentUser.school_id)
            .eq('class_id', classItem.id)
            .eq('attendance_date', reportDate)

          if (attendanceError) throw attendanceError

          // Count by status
          const present = attendance?.filter(a => a.status === 'present').length || 0
          const late = attendance?.filter(a => a.status === 'late').length || 0
          const halfDay = attendance?.filter(a => a.status === 'half-day').length || 0
          const leave = attendance?.filter(a => a.status === 'on-leave').length || 0
          const absent = attendance?.filter(a => a.status === 'absent').length || 0
          const markedCount = attendance?.length || 0
          const notMarked = totalStudents - markedCount

          reportData.push({
            className: classItem.class_name,
            present,
            late,
            halfDay,
            leave,
            absent,
            notMarked,
            total: totalStudents
          })
        }

        console.log('DailyAttendanceReport: Report generated successfully')
        setData(reportData)
      } catch (error) {
        console.error('DailyAttendanceReport: Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      if (currentUser?.school_id) {
        loadReport()
      }
    }, [reportDate, currentUser])

    return (
      <div>
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadReport}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Daily Attendance Report</h3>
          <p className="text-gray-600">Date: {new Date(reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Download Button - Only shown when data is loaded */}
        {!loading && data.length > 0 && (
          <div className="flex justify-end mb-4 print:hidden">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}

        {/* Report Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading report...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Class</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Present</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">P/Late</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Half Day</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Absent</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Not Marked</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm">{row.className}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-green-600 font-medium">{row.present}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-orange-600 font-medium">{row.late}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-blue-600 font-medium">{row.halfDay}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-purple-600 font-medium">{row.leave}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-red-600 font-medium">{row.absent}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-500 font-medium">{row.notMarked}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No data available for the selected date</div>
        )}
      </div>
    )
  }

  // Monthly Attendance Summary Component
  function MonthlyAttendanceSummary({ onDownloadPDF }) {
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7))
    const [reportClass, setReportClass] = useState('')
    const [reportSection, setReportSection] = useState('')
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [localClasses, setLocalClasses] = useState([])
    const [localSections, setLocalSections] = useState([])

    useEffect(() => {
      if (currentUser?.school_id) {
        loadLocalClasses()
      }
    }, [currentUser])

    useEffect(() => {
      if (reportClass) {
        loadLocalSections()
      } else {
        setLocalSections([])
        setReportSection('')
      }
    }, [reportClass])

    const loadLocalClasses = async () => {
      if (!currentUser?.school_id) return

      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('order_number')

        if (error) throw error
        setLocalClasses(data || [])
      } catch (error) {
        console.error('Error loading classes:', error)
      }
    }

    const loadLocalSections = async () => {
      if (!reportClass) return

      try {
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('class_id', reportClass)
          .order('section_name')

        if (error) throw error
        setLocalSections(data || [])
      } catch (error) {
        console.error('Error loading sections:', error)
      }
    }

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportMonth || !reportClass) {
        showToast('Please select month and class', 'warning')
        return
      }

      setLoading(true)
      try {
        // Get all students in selected class/section
        let studentsQuery = supabase
          .from('students')
          .select('id, first_name, last_name, roll_number, admission_number')
          .eq('school_id', currentUser.school_id)
          .eq('current_class_id', reportClass)
          .eq('status', 'active')
          .order('roll_number')

        if (reportSection) {
          studentsQuery = studentsQuery.eq('current_section_id', reportSection)
        }

        const { data: students, error: studentsError } = await studentsQuery

        if (studentsError) throw studentsError

        // Get number of days in selected month
        const [year, month] = reportMonth.split('-')
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()

        // Get all attendance records for this month, class, and section
        const startDate = `${reportMonth}-01`
        const endDate = `${reportMonth}-${daysInMonth}`

        const { data: attendance, error: attendanceError } = await supabase
          .from('student_attendance')
          .select('student_id, status, attendance_date')
          .eq('school_id', currentUser.school_id)
          .eq('class_id', reportClass)
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate)

        if (attendanceError) throw attendanceError

        // Build report data
        const reportData = students.map(student => {
          const studentAttendance = attendance.filter(a => a.student_id === student.id)

          const present = studentAttendance.filter(a => a.status === 'present').length
          const late = studentAttendance.filter(a => a.status === 'late').length
          const halfDay = studentAttendance.filter(a => a.status === 'half-day').length
          const absent = studentAttendance.filter(a => a.status === 'absent').length
          const leave = studentAttendance.filter(a => a.status === 'on-leave').length
          const markedDays = studentAttendance.length
          const notMarked = daysInMonth - markedDays

          return {
            name: `${student.first_name} ${student.last_name || ''}`,
            rollNumber: student.roll_number || 'N/A',
            admissionNumber: student.admission_number || 'N/A',
            days: daysInMonth,
            present,
            late,
            halfDay,
            absent,
            leave,
            holiday: 0, // You can calculate holidays from a holidays table if you have one
            notMarked
          }
        })

        setData(reportData)
      } catch (error) {
        console.error('Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    return (
      <div>
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                <select
                  value={reportClass}
                  onChange={(e) => setReportClass(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Class</option>
                  {localClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Section</label>
                <select
                  value={reportSection}
                  onChange={(e) => setReportSection(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={!reportClass}
                >
                  <option value="">All Sections</option>
                  {localSections.map(section => (
                    <option key={section.id} value={section.id}>{section.section_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadReport}
                  disabled={loading || !reportClass}
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Monthly Attendance Summary</h3>
          <p className="text-gray-600">
            Month: {new Date(reportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            {reportClass && ` | Class: ${localClasses.find(c => c.id === reportClass)?.class_name || ''}`}
            {reportSection && ` | Section: ${localSections.find(s => s.id === reportSection)?.section_name || ''}`}
          </p>
        </div>

        {/* Download Button - Only shown when data is loaded */}
        {!loading && data.length > 0 && (
          <div className="flex justify-end mb-4 print:hidden">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}

        {/* Report Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading report...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Sr.</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Student Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Roll No</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Days</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Present</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">P/Late</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Short Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Absent</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Holiday</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Not Marked</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{row.name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm">{row.rollNumber}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">{row.days}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-green-600 font-medium">{row.present}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-orange-600 font-medium">{row.late}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-blue-600 font-medium">{row.halfDay}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-red-600 font-medium">{row.absent}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-purple-600 font-medium">{row.leave}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600 font-medium">{row.holiday}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-500 font-medium">{row.notMarked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {reportClass ? 'No students found for the selected class' : 'Please select a class and generate report'}
          </div>
        )}
      </div>
    )
  }

  // Attendance Register Component
  function AttendanceRegister({ onDownloadPDF }) {
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7))
    const [reportClass, setReportClass] = useState('')
    const [reportSection, setReportSection] = useState('')
    const [data, setData] = useState([])
    const [daysInMonth, setDaysInMonth] = useState(0)
    const [loading, setLoading] = useState(false)
    const [localClasses, setLocalClasses] = useState([])
    const [localSections, setLocalSections] = useState([])

    useEffect(() => {
      if (currentUser?.school_id) {
        loadLocalClasses()
      }
    }, [currentUser])

    useEffect(() => {
      if (reportClass) {
        loadLocalSections()
      } else {
        setLocalSections([])
        setReportSection('')
      }
    }, [reportClass])

    const loadLocalClasses = async () => {
      if (!currentUser?.school_id) return

      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('order_number')

        if (error) throw error
        setLocalClasses(data || [])
      } catch (error) {
        console.error('Error loading classes:', error)
      }
    }

    const loadLocalSections = async () => {
      if (!reportClass) return

      try {
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('class_id', reportClass)
          .order('section_name')

        if (error) throw error
        setLocalSections(data || [])
      } catch (error) {
        console.error('Error loading sections:', error)
      }
    }

    const getStatusCode = (status) => {
      switch (status) {
        case 'present': return 'P'
        case 'absent': return 'A'
        case 'half-day': return 'H'
        case 'on-leave': return 'L'
        case 'late': return 'P/L'
        default: return '-'
      }
    }

    const getStatusColor = (status) => {
      switch (status) {
        case 'present': return 'text-green-600 bg-green-50'
        case 'absent': return 'text-red-600 bg-red-50'
        case 'half-day': return 'text-blue-600 bg-blue-50'
        case 'on-leave': return 'text-purple-600 bg-purple-50'
        case 'late': return 'text-orange-600 bg-orange-50'
        default: return 'text-gray-400 bg-gray-50'
      }
    }

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportMonth || !reportClass) {
        showToast('Please select month and class', 'warning')
        return
      }

      setLoading(true)
      try {
        // Get all students in selected class/section
        let studentsQuery = supabase
          .from('students')
          .select('id, first_name, last_name, roll_number')
          .eq('school_id', currentUser.school_id)
          .eq('current_class_id', reportClass)
          .eq('status', 'active')
          .order('roll_number')

        if (reportSection) {
          studentsQuery = studentsQuery.eq('current_section_id', reportSection)
        }

        const { data: students, error: studentsError } = await studentsQuery

        if (studentsError) throw studentsError

        // Get number of days in selected month
        const [year, month] = reportMonth.split('-')
        const days = new Date(parseInt(year), parseInt(month), 0).getDate()
        setDaysInMonth(days)

        // Get all attendance records for this month, class, and section
        const startDate = `${reportMonth}-01`
        const endDate = `${reportMonth}-${days}`

        const { data: attendance, error: attendanceError } = await supabase
          .from('student_attendance')
          .select('student_id, status, attendance_date')
          .eq('school_id', currentUser.school_id)
          .eq('class_id', reportClass)
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate)

        if (attendanceError) throw attendanceError

        // Build attendance map
        const attendanceMap = {}
        attendance.forEach(record => {
          const key = `${record.student_id}-${record.attendance_date}`
          attendanceMap[key] = record.status
        })

        // Build report data
        const reportData = students.map(student => {
          const dailyStatus = []
          for (let day = 1; day <= days; day++) {
            const dateStr = `${reportMonth}-${String(day).padStart(2, '0')}`
            const key = `${student.id}-${dateStr}`
            dailyStatus.push(attendanceMap[key] || null)
          }

          return {
            name: `${student.first_name} ${student.last_name || ''}`,
            rollNumber: student.roll_number || 'N/A',
            dailyStatus
          }
        })

        setData(reportData)
      } catch (error) {
        console.error('Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    return (
      <div>
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                <select
                  value={reportClass}
                  onChange={(e) => setReportClass(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Class</option>
                  {localClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Section</label>
                <select
                  value={reportSection}
                  onChange={(e) => setReportSection(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={!reportClass}
                >
                  <option value="">All Sections</option>
                  {localSections.map(section => (
                    <option key={section.id} value={section.id}>{section.section_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadReport}
                  disabled={loading || !reportClass}
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Attendance Register</h3>
          <p className="text-gray-600">
            Month: {new Date(reportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            {reportClass && ` | Class: ${localClasses.find(c => c.id === reportClass)?.class_name || ''}`}
            {reportSection && ` | Section: ${localSections.find(s => s.id === reportSection)?.section_name || ''}`}
          </p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1"><span className="text-green-600 font-bold">P</span> = Present</span>
            <span className="flex items-center gap-1"><span className="text-red-600 font-bold">A</span> = Absent</span>
            <span className="flex items-center gap-1"><span className="text-blue-600 font-bold">H</span> = Half Day</span>
            <span className="flex items-center gap-1"><span className="text-purple-600 font-bold">L</span> = Leave</span>
            <span className="flex items-center gap-1"><span className="text-orange-600 font-bold">P/L</span> = Late</span>
          </div>
        </div>

        {/* Download Button - Only shown when data is loaded */}
        {!loading && data.length > 0 && (
          <div className="flex justify-end mb-4 print:hidden">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}

        {/* Report Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading report...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold sticky left-0 bg-blue-900 text-white z-10">Sr.</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold sticky left-10 bg-blue-900 text-white z-10">Student Name</th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold sticky left-40 bg-blue-900 text-white z-10">Roll</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className="border border-gray-300 px-1 py-2 text-center text-xs font-semibold min-w-[30px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2 text-xs sticky left-0 bg-white">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs sticky left-10 bg-white">{row.name}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center text-xs sticky left-40 bg-white">{row.rollNumber}</td>
                    {row.dailyStatus.map((status, dayIndex) => (
                      <td
                        key={dayIndex}
                        className={`border border-gray-300 px-1 py-2 text-center text-xs font-bold ${status ? getStatusColor(status) : 'bg-white text-gray-300'}`}
                      >
                        {status ? getStatusCode(status) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {reportClass ? 'No students found for the selected class' : 'Please select a class and generate report'}
          </div>
        )}
      </div>
    )
  }

  // Attendance Sheet Component (Simplified version of Register)
  function AttendanceSheet() {
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7))
    const [reportClass, setReportClass] = useState('')
    const [reportSection, setReportSection] = useState('')
    const [data, setData] = useState([])
    const [daysInMonth, setDaysInMonth] = useState(0)
    const [loading, setLoading] = useState(false)
    const [localClasses, setLocalClasses] = useState([])
    const [localSections, setLocalSections] = useState([])

    useEffect(() => {
      if (currentUser?.school_id) {
        loadLocalClasses()
      }
    }, [currentUser])

    useEffect(() => {
      if (reportClass) {
        loadLocalSections()
      } else {
        setLocalSections([])
        setReportSection('')
      }
    }, [reportClass])

    const loadLocalClasses = async () => {
      if (!currentUser?.school_id) return

      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('order_number')

        if (error) throw error
        setLocalClasses(data || [])
      } catch (error) {
        console.error('Error loading classes:', error)
      }
    }

    const loadLocalSections = async () => {
      if (!reportClass) return

      try {
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('class_id', reportClass)
          .order('section_name')

        if (error) throw error
        setLocalSections(data || [])
      } catch (error) {
        console.error('Error loading sections:', error)
      }
    }

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportMonth || !reportClass) {
        showToast('Please select month and class', 'warning')
        return
      }

      setLoading(true)
      try {
        // Get all students in selected class/section
        let studentsQuery = supabase
          .from('students')
          .select('id, first_name, last_name, roll_number')
          .eq('school_id', currentUser.school_id)
          .eq('current_class_id', reportClass)
          .eq('status', 'active')
          .order('roll_number')

        if (reportSection) {
          studentsQuery = studentsQuery.eq('current_section_id', reportSection)
        }

        const { data: students, error: studentsError } = await studentsQuery

        if (studentsError) throw studentsError

        // Get number of days in selected month
        const [year, month] = reportMonth.split('-')
        const days = new Date(parseInt(year), parseInt(month), 0).getDate()
        setDaysInMonth(days)

        // Build report data (no attendance data needed for empty sheet)
        const reportData = students.map(student => ({
          name: `${student.first_name} ${student.last_name || ''}`,
          rollNumber: student.roll_number || 'N/A'
        }))

        setData(reportData)
      } catch (error) {
        console.error('Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    return (
      <div>
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                <select
                  value={reportClass}
                  onChange={(e) => setReportClass(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Class</option>
                  {localClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Section</label>
                <select
                  value={reportSection}
                  onChange={(e) => setReportSection(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={!reportClass}
                >
                  <option value="">All Sections</option>
                  {localSections.map(section => (
                    <option key={section.id} value={section.id}>{section.section_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadReport}
                  disabled={loading || !reportClass}
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Loading...' : 'Generate Sheet'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Attendance Sheet</h3>
          <p className="text-gray-600">
            Month: {new Date(reportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            {reportClass && ` | Class: ${localClasses.find(c => c.id === reportClass)?.class_name || ''}`}
            {reportSection && ` | Section: ${localSections.find(s => s.id === reportSection)?.section_name || ''}`}
          </p>
          <p className="text-sm text-gray-500 mt-1">Fill in manually with attendance marks</p>
        </div>

        {/* Report Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading sheet...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-400 text-xs">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border-2 border-gray-400 px-2 py-2 text-left text-xs font-semibold w-12">Sr.</th>
                  <th className="border-2 border-gray-400 px-2 py-2 text-left text-xs font-semibold min-w-[150px]">Student Name</th>
                  <th className="border-2 border-gray-400 px-2 py-2 text-center text-xs font-semibold w-16">Roll</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className="border-2 border-gray-400 px-1 py-2 text-center text-xs font-semibold w-8">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    <td className="border-2 border-gray-400 px-2 py-3 text-xs text-center">{index + 1}</td>
                    <td className="border-2 border-gray-400 px-2 py-3 text-xs">{row.name}</td>
                    <td className="border-2 border-gray-400 px-2 py-3 text-center text-xs">{row.rollNumber}</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i).map(day => (
                      <td key={day} className="border-2 border-gray-400 px-1 py-3 text-center bg-white h-8">
                        &nbsp;
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {reportClass ? 'No students found for the selected class' : 'Please select a class and generate sheet'}
          </div>
        )}
      </div>
    )
  }

  // Today Students List Component (filtered by status)
  function TodayStudentsList({ status, onDownloadPDF }) {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
    const [reportClass, setReportClass] = useState('')
    const [reportSection, setReportSection] = useState('')
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [localClasses, setLocalClasses] = useState([])
    const [localSections, setLocalSections] = useState([])

    useEffect(() => {
      if (currentUser?.school_id) {
        loadLocalClasses()
        loadReport() // Auto-load for today
      }
    }, [currentUser])

    useEffect(() => {
      if (reportClass) {
        loadLocalSections()
      } else {
        setLocalSections([])
        setReportSection('')
      }
    }, [reportClass])

    const loadLocalClasses = async () => {
      if (!currentUser?.school_id) return

      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('order_number')

        if (error) throw error
        setLocalClasses(data || [])
      } catch (error) {
        console.error('Error loading classes:', error)
      }
    }

    const loadLocalSections = async () => {
      if (!reportClass) return

      try {
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('class_id', reportClass)
          .order('section_name')

        if (error) throw error
        setLocalSections(data || [])
      } catch (error) {
        console.error('Error loading sections:', error)
      }
    }

    const getStatusLabel = () => {
      switch (status) {
        case 'present': return 'Present'
        case 'absent': return 'Absent'
        case 'late': return 'Late'
        case 'on-leave': return 'On Leave'
        default: return status
      }
    }

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportDate) {
        showToast('Please select a date', 'warning')
        return
      }

      setLoading(true)
      try {
        // Build query for attendance records with the given status
        let query = supabase
          .from('student_attendance')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .eq('attendance_date', reportDate)
          .eq('status', status)

        if (reportClass) {
          query = query.eq('class_id', reportClass)
        }

        const { data: attendanceData, error: attendanceError } = await query

        if (attendanceError) throw attendanceError

        // Get all unique student IDs
        const studentIds = attendanceData.map(a => a.student_id)

        if (studentIds.length === 0) {
          setData([])
          return
        }

        // Fetch student details
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, father_name, admission_number, roll_number, current_class_id, current_section_id')
          .in('id', studentIds)

        if (studentsError) throw studentsError

        // Get unique class and section IDs
        const classIds = [...new Set(students.map(s => s.current_class_id).filter(Boolean))]
        const sectionIds = [...new Set(students.map(s => s.current_section_id).filter(Boolean))]

        // Fetch class names
        let classMap = {}
        if (classIds.length > 0) {
          const { data: classes } = await supabase
            .from('classes')
            .select('id, class_name')
            .in('id', classIds)

          classMap = (classes || []).reduce((acc, c) => ({ ...acc, [c.id]: c.class_name }), {})
        }

        // Fetch section names
        let sectionMap = {}
        if (sectionIds.length > 0) {
          const { data: sections } = await supabase
            .from('sections')
            .select('id, section_name')
            .in('id', sectionIds)

          sectionMap = (sections || []).reduce((acc, s) => ({ ...acc, [s.id]: s.section_name }), {})
        }

        // Format the data
        const formattedData = students.map(student => ({
          name: `${student.first_name} ${student.last_name || ''}`,
          fatherName: student.father_name || 'N/A',
          admissionNumber: student.admission_number || 'N/A',
          className: classMap[student.current_class_id] || 'N/A',
          section: sectionMap[student.current_section_id] || '',
          rollNumber: student.roll_number || 'N/A'
        }))

        setData(formattedData)
      } catch (error) {
        console.error(`TodayStudentsList (${status}): Error loading report:`, error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    return (
      <div>
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class (Optional)</label>
                <select
                  value={reportClass}
                  onChange={(e) => setReportClass(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">All Classes</option>
                  {localClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Section (Optional)</label>
                <select
                  value={reportSection}
                  onChange={(e) => setReportSection(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={!reportClass}
                >
                  <option value="">All Sections</option>
                  {localSections.map(section => (
                    <option key={section.id} value={section.id}>{section.section_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadReport}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">{getStatusLabel()} Students List</h3>
          <p className="text-gray-600">
            Date: {new Date(reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            {reportClass && ` | Class: ${localClasses.find(c => c.id === reportClass)?.class_name || 'All'}`}
            {reportSection && ` | Section: ${localSections.find(s => s.id === reportSection)?.section_name || 'All'}`}
          </p>
          <p className="text-sm text-gray-600 mt-1">Total: {data.length} student{data.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Download Button - Only shown when data is loaded */}
        {!loading && data.length > 0 && (
          <div className="flex justify-end mb-4 print:hidden">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}

        {/* Report Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading report...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Sr.</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Father Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Admission No</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Class</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Roll No</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{row.name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{row.fatherName}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm">{row.admissionNumber}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                      {row.className}{row.section && ` - ${row.section}`}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm">{row.rollNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No {getStatusLabel().toLowerCase()} students found for the selected date
          </div>
        )}
      </div>
    )
  }

  // Staff Daily Attendance Report
  function StaffDailyAttendanceReport({ onDownloadPDF }) {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
    const [data, setData] = useState({ present: 0, late: 0, halfDay: 0, leave: 0, absent: 0, notMarked: 0, total: 0 })
    const [loading, setLoading] = useState(false)

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportDate) {
        showToast('Please select a date', 'warning')
        return
      }

      setLoading(true)
      try {
        // Get all active staff
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('school_id', currentUser.school_id)
          .eq('status', 'active')

        if (staffError) throw staffError

        const totalStaff = staff?.length || 0

        // Get attendance records for this date
        const { data: attendance, error: attendanceError } = await supabase
          .from('staff_attendance')
          .select('status')
          .eq('school_id', currentUser.school_id)
          .eq('attendance_date', reportDate)

        if (attendanceError) throw attendanceError

        // Count by status
        const present = attendance?.filter(a => a.status === 'present').length || 0
        const late = attendance?.filter(a => a.status === 'late').length || 0
        const halfDay = attendance?.filter(a => a.status === 'half-day').length || 0
        const leave = attendance?.filter(a => a.status === 'on-leave').length || 0
        const absent = attendance?.filter(a => a.status === 'absent').length || 0
        const markedCount = attendance?.length || 0
        const notMarked = totalStaff - markedCount

        setData({ present, late, halfDay, leave, absent, notMarked, total: totalStaff })
      } catch (error) {
        console.error('Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      if (currentUser?.school_id) {
        loadReport()
      }
    }, [reportDate, currentUser])

    return (
      <div>
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div className="flex items-end">
                <button onClick={loadReport} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Staff Daily Attendance Report</h3>
          <p className="text-gray-600">Date: {new Date(reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Download Button - Only shown when data is loaded */}
        {!loading && data.total > 0 && (
          <div className="flex justify-end mb-4 print:hidden">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading report...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Present</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">P/Late</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Half Day</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Absent</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Not Marked</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-green-600 font-medium">{data.present}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-orange-600 font-medium">{data.late}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-blue-600 font-medium">{data.halfDay}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-purple-600 font-medium">{data.leave}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-red-600 font-medium">{data.absent}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-500 font-medium">{data.notMarked}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">{data.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Staff Monthly Attendance Summary
  function StaffMonthlyAttendanceSummary({ onDownloadPDF }) {
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7))
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportMonth) {
        showToast('Please select month', 'warning')
        return
      }

      setLoading(true)
      try {
        // Get all staff
        console.log('StaffMonthlyAttendanceSummary: Fetching staff for school_id:', currentUser.school_id)
        const { data: staff, error: staffError} = await supabase
          .from('staff')
          .select('id, first_name, last_name, employee_number, department')
          .eq('school_id', currentUser.school_id)
          .order('first_name')

        console.log('StaffMonthlyAttendanceSummary: Fetched', staff?.length || 0, 'staff members')

        if (staffError) {
          console.error('StaffMonthlyAttendanceSummary: Error:', staffError)
          throw staffError
        }

        if (!staff || staff.length === 0) {
          console.warn('StaffMonthlyAttendanceSummary: No staff found')
          showToast('No staff members found for this school', 'warning')
          setData([])
          setLoading(false)
          return
        }

        // Get number of days in selected month
        const [year, month] = reportMonth.split('-')
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()

        // Get all attendance records for this month
        const startDate = `${reportMonth}-01`
        const endDate = `${reportMonth}-${daysInMonth}`

        const { data: attendance, error: attendanceError } = await supabase
          .from('staff_attendance')
          .select('staff_id, status, attendance_date')
          .eq('school_id', currentUser.school_id)
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate)

        if (attendanceError) throw attendanceError

        // Build report data
        const reportData = staff.map(staffMember => {
          const staffAttendance = attendance.filter(a => a.staff_id === staffMember.id)

          const present = staffAttendance.filter(a => a.status === 'present').length
          const late = staffAttendance.filter(a => a.status === 'late').length
          const halfDay = staffAttendance.filter(a => a.status === 'half-day').length
          const absent = staffAttendance.filter(a => a.status === 'absent').length
          const leave = staffAttendance.filter(a => a.status === 'on-leave').length
          const markedDays = staffAttendance.length
          const notMarked = daysInMonth - markedDays

          return {
            name: `${staffMember.first_name} ${staffMember.last_name || ''}`,
            employeeId: staffMember.employee_number || 'N/A',
            department: staffMember.department || 'N/A',
            days: daysInMonth,
            present,
            late,
            halfDay,
            absent,
            leave,
            holiday: 0,
            notMarked
          }
        })

        setData(reportData)
      } catch (error) {
        console.error('Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    return (
      <div>
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div className="flex items-end">
                <button onClick={loadReport} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Staff Monthly Attendance Summary</h3>
          <p className="text-gray-600">Month: {new Date(reportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
        </div>

        {/* Download Button - Only shown when data is loaded */}
        {!loading && data.length > 0 && (
          <div className="flex justify-end mb-4 print:hidden">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading report...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Sr.</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Staff Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Employee ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Department</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Days</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Present</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">P/Late</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Short Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Absent</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Holiday</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Not Marked</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{row.name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm">{row.employeeId}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{row.department}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">{row.days}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-green-600 font-medium">{row.present}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-orange-600 font-medium">{row.late}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-blue-600 font-medium">{row.halfDay}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-red-600 font-medium">{row.absent}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-purple-600 font-medium">{row.leave}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600 font-medium">{row.holiday}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-500 font-medium">{row.notMarked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No staff found. Please generate report.</div>
        )}
      </div>
    )
  }

  // Staff Attendance Register
  function StaffAttendanceRegister({ onDownloadPDF }) {
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7))
    const [data, setData] = useState([])
    const [daysInMonth, setDaysInMonth] = useState(0)
    const [loading, setLoading] = useState(false)

    const getStatusCode = (status) => {
      switch (status) {
        case 'present': return 'P'
        case 'absent': return 'A'
        case 'half-day': return 'H'
        case 'on-leave': return 'L'
        case 'late': return 'P/L'
        default: return '-'
      }
    }

    const getStatusColor = (status) => {
      switch (status) {
        case 'present': return 'text-green-600 bg-green-50'
        case 'absent': return 'text-red-600 bg-red-50'
        case 'half-day': return 'text-blue-600 bg-blue-50'
        case 'on-leave': return 'text-purple-600 bg-purple-50'
        case 'late': return 'text-orange-600 bg-orange-50'
        default: return 'text-gray-400 bg-gray-50'
      }
    }

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportMonth) {
        showToast('Please select month', 'warning')
        return
      }

      setLoading(true)
      try {
        // Get all staff
        console.log('StaffAttendanceRegister: Fetching staff for school_id:', currentUser.school_id)
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, employee_number')
          .eq('school_id', currentUser.school_id)
          .order('first_name')

        console.log('StaffAttendanceRegister: Fetched', staff?.length || 0, 'staff members')

        if (staffError) {
          console.error('StaffAttendanceRegister: Error:', staffError)
          throw staffError
        }

        if (!staff || staff.length === 0) {
          console.warn('StaffAttendanceRegister: No staff found')
          showToast('No staff members found for this school', 'warning')
          setData([])
          setLoading(false)
          return
        }

        // Get number of days in selected month
        const [year, month] = reportMonth.split('-')
        const days = new Date(parseInt(year), parseInt(month), 0).getDate()
        setDaysInMonth(days)

        // Get all attendance records for this month
        const startDate = `${reportMonth}-01`
        const endDate = `${reportMonth}-${days}`

        const { data: attendance, error: attendanceError } = await supabase
          .from('staff_attendance')
          .select('staff_id, status, attendance_date')
          .eq('school_id', currentUser.school_id)
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate)

        if (attendanceError) throw attendanceError

        // Build attendance map
        const attendanceMap = {}
        attendance.forEach(record => {
          const key = `${record.staff_id}-${record.attendance_date}`
          attendanceMap[key] = record.status
        })

        // Build report data
        const reportData = staff.map(staffMember => {
          const dailyStatus = []
          for (let day = 1; day <= days; day++) {
            const dateStr = `${reportMonth}-${String(day).padStart(2, '0')}`
            const key = `${staffMember.id}-${dateStr}`
            dailyStatus.push(attendanceMap[key] || null)
          }

          return {
            name: `${staffMember.first_name} ${staffMember.last_name || ''}`,
            employeeId: staffMember.employee_number || 'N/A',
            dailyStatus
          }
        })

        setData(reportData)
      } catch (error) {
        console.error('Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    return (
      <div>
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div className="flex items-end">
                <button onClick={loadReport} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Staff Attendance Register</h3>
          <p className="text-gray-600">Month: {new Date(reportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1"><span className="text-green-600 font-bold">P</span> = Present</span>
            <span className="flex items-center gap-1"><span className="text-red-600 font-bold">A</span> = Absent</span>
            <span className="flex items-center gap-1"><span className="text-blue-600 font-bold">H</span> = Half Day</span>
            <span className="flex items-center gap-1"><span className="text-purple-600 font-bold">L</span> = Leave</span>
            <span className="flex items-center gap-1"><span className="text-orange-600 font-bold">P/L</span> = Late</span>
          </div>
        </div>

        {/* Download Button - Only shown when data is loaded */}
        {!loading && data.length > 0 && (
          <div className="flex justify-end mb-4 print:hidden">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading report...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold sticky left-0 bg-blue-900 text-white z-10">Sr.</th>
                  <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold sticky left-10 bg-blue-900 text-white z-10">Staff Name</th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold sticky left-40 bg-blue-900 text-white z-10">Emp ID</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className="border border-gray-300 px-1 py-2 text-center text-xs font-semibold min-w-[30px]">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2 text-xs sticky left-0 bg-white">{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-2 text-xs sticky left-10 bg-white">{row.name}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center text-xs sticky left-40 bg-white">{row.employeeId}</td>
                    {row.dailyStatus.map((status, dayIndex) => (
                      <td key={dayIndex} className={`border border-gray-300 px-1 py-2 text-center text-xs font-bold ${status ? getStatusColor(status) : 'bg-white text-gray-300'}`}>
                        {status ? getStatusCode(status) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No staff found. Please generate report.</div>
        )}
      </div>
    )
  }

  // Staff Attendance Sheet
  function StaffAttendanceSheet() {
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7))
    const [data, setData] = useState([])
    const [daysInMonth, setDaysInMonth] = useState(0)
    const [loading, setLoading] = useState(false)

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportMonth) {
        showToast('Please select month', 'warning')
        return
      }

      setLoading(true)
      try {
        // Get all staff
        console.log('StaffAttendanceSheet: Fetching staff for school_id:', currentUser.school_id)
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, employee_number')
          .eq('school_id', currentUser.school_id)
          .order('first_name')

        console.log('StaffAttendanceSheet: Fetched', staff?.length || 0, 'staff members')

        if (staffError) {
          console.error('StaffAttendanceSheet: Error:', staffError)
          throw staffError
        }

        if (!staff || staff.length === 0) {
          console.warn('StaffAttendanceSheet: No staff found')
          showToast('No staff members found for this school', 'warning')
          setData([])
          setLoading(false)
          return
        }

        // Get number of days in selected month
        const [year, month] = reportMonth.split('-')
        const days = new Date(parseInt(year), parseInt(month), 0).getDate()
        setDaysInMonth(days)

        // Build report data (no attendance data needed for empty sheet)
        const reportData = staff.map(staffMember => ({
          name: `${staffMember.first_name} ${staffMember.last_name || ''}`,
          employeeId: staffMember.employee_number || 'N/A'
        }))

        setData(reportData)
      } catch (error) {
        console.error('Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    return (
      <div>
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div className="flex items-end">
                <button onClick={loadReport} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {loading ? 'Loading...' : 'Generate Sheet'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Staff Attendance Sheet</h3>
          <p className="text-gray-600">Month: {new Date(reportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
          <p className="text-sm text-gray-500 mt-1">Fill in manually with attendance marks</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading sheet...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-400 text-xs">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border-2 border-gray-400 px-2 py-2 text-left text-xs font-semibold w-12">Sr.</th>
                  <th className="border-2 border-gray-400 px-2 py-2 text-left text-xs font-semibold min-w-[150px]">Staff Name</th>
                  <th className="border-2 border-gray-400 px-2 py-2 text-center text-xs font-semibold w-20">Emp ID</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className="border-2 border-gray-400 px-1 py-2 text-center text-xs font-semibold w-8">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    <td className="border-2 border-gray-400 px-2 py-3 text-xs text-center">{index + 1}</td>
                    <td className="border-2 border-gray-400 px-2 py-3 text-xs">{row.name}</td>
                    <td className="border-2 border-gray-400 px-2 py-3 text-center text-xs">{row.employeeId}</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i).map(day => (
                      <td key={day} className="border-2 border-gray-400 px-1 py-3 text-center bg-white h-8">&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No staff found. Please generate sheet.</div>
        )}
      </div>
    )
  }

  // Today Staff List (filtered by status)
  function TodayStaffList({ status, onDownloadPDF }) {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)

    const getStatusLabel = () => {
      switch (status) {
        case 'present': return 'Present'
        case 'absent': return 'Absent'
        case 'late': return 'Late'
        case 'on-leave': return 'On Leave'
        default: return status
      }
    }

    const loadReport = async () => {
      if (!currentUser?.school_id || !reportDate) return

      setLoading(true)
      try {
        // Get attendance records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('staff_attendance')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .eq('attendance_date', reportDate)
          .eq('status', status)

        if (attendanceError) throw attendanceError

        // Get all unique staff IDs
        const staffIds = attendanceData.map(a => a.staff_id)

        if (staffIds.length === 0) {
          setData([])
          return
        }

        // Fetch staff details
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, employee_number, phone, department')
          .in('id', staffIds)

        if (staffError) throw staffError

        // Format the data
        const formattedData = staff.map(staffMember => ({
          name: `${staffMember.first_name} ${staffMember.last_name || ''}`,
          employeeId: staffMember.employee_number || 'N/A',
          department: staffMember.department || 'N/A',
          phone: staffMember.phone || 'N/A'
        }))

        setData(formattedData)
      } catch (error) {
        console.error('Error loading report:', error)
        if (currentUser?.school_id) {
          showToast('Failed to load report', 'error')
        }
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      if (currentUser?.school_id) {
        loadReport()
      }
    }, [currentUser, reportDate])

    return (
      <div>
        <div className="mb-6 print:hidden">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-medium">Report Filters</h3>
          </div>
          <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div className="flex items-end">
                <button onClick={loadReport} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">{getStatusLabel()} Staff List</h3>
          <p className="text-gray-600">Date: {new Date(reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="text-sm text-gray-600 mt-1">Total: {data.length} staff member{data.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Download Button - Only shown when data is loaded */}
        {!loading && data.length > 0 && (
          <div className="flex justify-end mb-4 print:hidden">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading report...</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Sr.</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Employee ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Department</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Phone</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{row.name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm">{row.employeeId}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{row.department}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-sm">{row.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No {getStatusLabel().toLowerCase()} staff found for the selected date
          </div>
        )}
      </div>
    )
  }
}