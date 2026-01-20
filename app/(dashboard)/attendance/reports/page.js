'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, FileDown } from 'lucide-react'
import { jsPDF } from 'jspdf'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import autoTable from 'jspdf-autotable'
import {
  addPDFHeader,
  addPDFFooter,
  addPDFWatermark,
  convertImageToBase64,
  PDF_COLORS,
  PDF_FONTS
} from '@/lib/pdfUtils'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

function AttendanceReportsContent() {
  const [activeTab, setActiveTab] = useState('student')
  const [currentUser, setCurrentUser] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [toasts, setToasts] = useState([])
  const [activeReport, setActiveReport] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

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

      setSchoolData(schoolData)
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

  // Prevent body scrolling and blur sidebar when modal is open
  useEffect(() => {
    if (activeReport || showPdfPreview) {
      document.body.style.overflow = 'hidden'
      
      // Blur only the sidebar
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
  }, [activeReport, showPdfPreview])

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
        .eq('user_id', currentUser.id)           // ✅ Filter by user
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
        .eq('user_id', currentUser.id)           // ✅ Filter by user
        .eq('school_id', currentUser.school_id)  // ✅ Filter by school
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

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
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

        // Report Title
        const reportName = activeTab === 'student'
          ? studentReports.find(r => r.id === activeReport)?.name
          : staffReports.find(r => r.id === activeReport)?.name

        // Add professional header with logo
        const headerOptions = {
          subtitle: reportName || 'Attendance Report',
          info: `Generated on: ${new Date().toLocaleDateString('en-GB')}`
        }
        let yPosition = addPDFHeader(doc, schoolData, 'ATTENDANCE REPORT', headerOptions)

        // Add watermark
        if (schoolData) {
          addPDFWatermark(doc, schoolData)
        }

        yPosition += 5

        // Extract table data from DOM
        // table variable already defined above
        if (table) {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim())
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
          Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
        )

        // Determine column widths based on number of columns
        const numColumns = headers.length
        const pageWidth = doc.internal.pageSize.getWidth()
        const availableWidth = pageWidth - 30 // margins

        // Build column styles dynamically
        const columnStyles = {}

        if (numColumns > 10) {
          // For attendance registers with many date columns
          // First 3 columns: Sr, Staff Name/Student Name, Emp#/Admission# - wider
          columnStyles[0] = { cellWidth: 8, halign: 'center', valign: 'middle' } // Sr
          columnStyles[1] = { cellWidth: 35, halign: 'left', valign: 'middle' } // Name
          columnStyles[2] = { cellWidth: 20, halign: 'center', valign: 'middle' } // ID/Emp#

          // Remaining columns (dates) - equal small width
          const dateColWidth = (availableWidth - 63) / (numColumns - 3)
          for (let i = 3; i < numColumns; i++) {
            columnStyles[i] = {
              cellWidth: dateColWidth,
              halign: 'center',
              valign: 'middle',
              fontSize: 7
            }
          }
        } else {
          // For regular reports with fewer columns - auto width
          const colWidth = availableWidth / numColumns
          for (let i = 0; i < numColumns; i++) {
            columnStyles[i] = {
              cellWidth: colWidth,
              halign: i === 0 ? 'center' : (i === 1 ? 'left' : 'center'),
              valign: 'middle'
            }
          }
        }

        autoTable(doc, {
          startY: yPosition,
          head: [headers],
          body: rows,
          theme: 'grid',
          headStyles: {
            fillColor: PDF_COLORS.headerBg,
            textColor: [255, 255, 255],
            fontSize: numColumns > 10 ? 7 : 9,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: { top: 2, right: 1, bottom: 2, left: 1 }
          },
          bodyStyles: {
            fontSize: numColumns > 10 ? 7 : 8,
            cellPadding: numColumns > 10 ? { top: 1.5, right: 1, bottom: 1.5, left: 1 } : 2,
            valign: 'middle',
            lineColor: [200, 200, 200],
            lineWidth: 0.1
          },
          columnStyles: columnStyles,
          alternateRowStyles: {
            fillColor: [248, 248, 248]
          },
          margin: { left: 15, right: 15 },
          tableWidth: 'auto',
          styles: {
            overflow: 'linebreak',
            cellWidth: 'wrap'
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

      // Set state for preview modal
      const fileName = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('PDF generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      console.error('Error details:', error.message, error.stack)
      showToast('Failed to generate PDF: ' + error.message, 'error')
    }
  }

  return (
    <div className="p-1">
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

      {/* Report Modal - Full Screen Slide from Right */}
      {activeReport && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={handleCloseReport}></div>
          <div className="fixed top-0 right-0 h-full w-full bg-white shadow-2xl z-50 overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-lg print:hidden">
              <h2 className="text-xl font-semibold">
                {activeTab === 'student'
                  ? studentReports.find(r => r.id === activeReport)?.name
                  : staffReports.find(r => r.id === activeReport)?.name
                }
              </h2>
              <button
                onClick={handleCloseReport}
                className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div id="report-content" className="flex-1 overflow-auto p-6 bg-gray-50">
              {renderReportContent()}
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      {!activeReport && (
        <>
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setActiveTab('student')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'student'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Student Reports
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'staff'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Staff Reports
            </button>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Sr.</th>
                    <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Report Name</th>
                    <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Description</th>
                    <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'student' ? studentReports : staffReports).map((report, index) => (
                    <tr key={report.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                      <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{index + 1}</td>
                      <td className="border border-gray-200 px-3 py-2.5 font-medium text-gray-900">{report.name}</td>
                      <td className="border border-gray-200 px-3 py-2.5 text-gray-600">{report.description}</td>
                      <td className="border border-gray-200 px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleViewReport(report.id)}
                          className="px-4 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
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

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
        isOpen={showPdfPreview}
        onClose={handleClosePdfPreview}
      />
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
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
            <table className="w-full border-collapse border border-gray-300 bg-white">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Filters */}
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 print:hidden">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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

export default function AttendanceReportsPage() {
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
      permissionKey="attendance_reports_view"
      pageName="Attendance Reports"
    >
      <AttendanceReportsContent />
    </PermissionGuard>
  )
}