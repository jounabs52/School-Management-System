'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Plus, Search, Save, AlertCircle, CheckCircle, XCircle, FileText, Printer, Eye } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  getLogoSize,
  applyPdfSettings,
  getAutoTableStyles
} from '@/lib/pdfSettings'
import { convertImageToBase64 } from '@/lib/pdfUtils'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import PermissionGuard from '@/components/PermissionGuard'

function TestMarksPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [tests, setTests] = useState([])
  const [completedTests, setCompletedTests] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const [activeTab, setActiveTab] = useState('enter') // 'enter' or 'view'

  // Enter Marks States
  const [selectedTest, setSelectedTest] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [marksData, setMarksData] = useState({})
  const [existingMarks, setExistingMarks] = useState({})
  const [subjectTotalMarks, setSubjectTotalMarks] = useState(0)

  // View Results States
  const [viewTest, setViewTest] = useState('')
  const [viewSubject, setViewSubject] = useState('')
  const [viewStudents, setViewStudents] = useState([])
  const [viewMarks, setViewMarks] = useState([])
  const [viewSubjectTotalMarks, setViewSubjectTotalMarks] = useState(0)

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

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

  const fetchSchoolData = async () => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error

      // Convert logo URL to base64
      let logoBase64 = data?.logo_url
      if (data?.logo_url && (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://'))) {
        logoBase64 = await convertImageToBase64(data.logo_url)
      }

      setSchoolData({
        name: data?.name || 'School',
        logo: logoBase64
      })
    } catch (error) {
      console.error('Error fetching school data:', error)
    }
  }

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
      fetchSchoolData()
      fetchClasses()
      fetchOpenTests()
      fetchCompletedTests()
    }
  }, [currentUser])

  useEffect(() => {
    if (selectedClass && currentUser?.school_id) {
      fetchSections()
    } else {
      setSections([])
      setSelectedSection('')
    }
  }, [selectedClass])

  useEffect(() => {
    if (selectedTest && selectedClass && selectedSubject && currentUser?.school_id) {
      fetchStudents()
      fetchExistingMarks()
      fetchSubjectTotalMarks()
    } else {
      setStudents([])
      setMarksData({})
      setSubjectTotalMarks(0)
    }
  }, [selectedTest, selectedClass, selectedSection, selectedSubject])

  // View Results Effect
  useEffect(() => {
    if (viewTest && viewSubject && currentUser?.school_id) {
      fetchTestResults()
      fetchViewSubjectTotalMarks()
    } else {
      setViewStudents([])
      setViewMarks([])
      setViewSubjectTotalMarks(0)
    }
  }, [viewTest, viewSubject])

  const fetchClasses = async () => {
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

  const fetchOpenTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          classes (class_name),
          sections (section_name)
        `)
        .eq('school_id', currentUser.school_id)
        .eq('status', 'opened')
        .order('test_date', { ascending: false })

      if (error) throw error
      setTests(data || [])
    } catch (error) {
      console.error('Error fetching tests:', error)
    }
  }

  const fetchCompletedTests = async () => {
    try {
      // Fetch tests that have marks entered
      const { data: marksData, error: marksError } = await supabase
        .from('test_marks')
        .select('test_id')
        .eq('school_id', currentUser.school_id)

      if (marksError) throw marksError

      const testIds = [...new Set(marksData?.map(m => m.test_id) || [])]

      if (testIds.length === 0) {
        setCompletedTests([])
        return
      }

      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          classes (class_name),
          sections (section_name)
        `)
        .in('id', testIds)
        .eq('school_id', currentUser.school_id)
        .order('test_date', { ascending: false })

      if (error) throw error
      setCompletedTests(data || [])
    } catch (error) {
      console.error('Error fetching completed tests:', error)
    }
  }

  const fetchTestSubjects = async (testId) => {
    try {
      const { data, error } = await supabase
        .from('test_subjects')
        .select(`
          subject_id,
          subjects (
            id,
            subject_name,
            subject_code
          )
        `)
        .eq('test_id', testId)

      if (error) throw error
      setSubjects(data?.map(ts => ts.subjects) || [])
    } catch (error) {
      console.error('Error fetching test subjects:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('current_class_id', selectedClass)
        .eq('status', 'active')
        .order('roll_number')

      if (selectedSection) {
        query = query.eq('current_section_id', selectedSection)
      }

      const { data, error } = await query
      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchExistingMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('test_marks')
        .select('*')
        .eq('test_id', selectedTest)
        .eq('subject_id', selectedSubject)

      if (error) throw error

      const marksMap = {}
      data?.forEach(mark => {
        marksMap[mark.student_id] = {
          obtained_marks: mark.obtained_marks,
          is_absent: mark.is_absent,
          remarks: mark.remarks || '',
          id: mark.id
        }
      })
      setExistingMarks(marksMap)
      setMarksData(marksMap)
    } catch (error) {
      console.error('Error fetching existing marks:', error)
    }
  }

  const fetchSubjectTotalMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('test_subjects')
        .select('total_marks')
        .eq('test_id', selectedTest)
        .eq('subject_id', selectedSubject)
        .single()

      if (error) throw error
      setSubjectTotalMarks(data?.total_marks || 0)
    } catch (error) {
      console.error('Error fetching subject total marks:', error)
      setSubjectTotalMarks(0)
    }
  }

  const fetchViewSubjectTotalMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('test_subjects')
        .select('total_marks')
        .eq('test_id', viewTest)
        .eq('subject_id', viewSubject)
        .single()

      if (error) throw error
      setViewSubjectTotalMarks(data?.total_marks || 0)
    } catch (error) {
      console.error('Error fetching view subject total marks:', error)
      setViewSubjectTotalMarks(0)
    }
  }

  const fetchTestResults = async () => {
    try {
      const test = completedTests.find(t => t.id === viewTest)

      const { data: marksData, error: marksError } = await supabase
        .from('test_marks')
        .select(`
          *,
          students (
            id,
            admission_number,
            first_name,
            last_name,
            father_name,
            roll_number,
            current_section_id
          )
        `)
        .eq('test_id', viewTest)
        .eq('subject_id', viewSubject)
        .order('students(roll_number)')

      if (marksError) throw marksError

      setViewMarks(marksData || [])
      setViewStudents(marksData?.map(m => m.students) || [])
    } catch (error) {
      console.error('Error fetching test results:', error)
      showToast('Failed to fetch test results', 'error')
    }
  }

  const handleTestChange = (testId) => {
    setSelectedTest(testId)
    setSelectedSubject('')
    setSubjects([])
    setStudents([])
    setMarksData({})

    if (testId) {
      const test = tests.find(t => t.id === testId)
      if (test) {
        setSelectedClass(test.class_id)
        setSelectedSection(test.section_id || '')
        fetchTestSubjects(testId)
      }
    }
  }

  const handleViewTestChange = (testId) => {
    setViewTest(testId)
    setViewSubject('')
    setSubjects([])
    setViewStudents([])
    setViewMarks([])

    if (testId) {
      fetchTestSubjects(testId)
    }
  }

  const handleMarksChange = (studentId, field, value) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const handleSaveMarks = async () => {
    if (!selectedTest || !selectedSubject || students.length === 0) {
      showToast('Please select test, subject and ensure students are loaded', 'error')
      return
    }

    setLoading(true)
    try {
      // Validate marks using subject-specific total marks
      for (const studentId in marksData) {
        const marks = marksData[studentId]
        if (!marks.is_absent && marks.obtained_marks) {
          if (parseFloat(marks.obtained_marks) > parseFloat(subjectTotalMarks)) {
            showToast(`Obtained marks cannot exceed total marks (${subjectTotalMarks})`, 'error')
            setLoading(false)
            return
          }
        }
      }

      // Prepare data for upsert
      const marksToSave = students.map(student => {
        const marks = marksData[student.id] || {}
        return {
          school_id: currentUser.school_id,
          test_id: selectedTest,
          student_id: student.id,
          subject_id: selectedSubject,
          obtained_marks: marks.is_absent ? null : (marks.obtained_marks || null),
          is_absent: marks.is_absent || false,
          remarks: marks.remarks || null,
          entered_by: currentUser.id,
          entry_date: new Date().toISOString().split('T')[0]
        }
      })

      const { error } = await supabase
        .from('test_marks')
        .upsert(marksToSave, {
          onConflict: 'test_id,student_id,subject_id'
        })

      if (error) throw error

      showToast('Marks saved successfully', 'success')
      fetchExistingMarks()
      fetchCompletedTests()
    } catch (error) {
      console.error('Error saving marks:', error)
      showToast('Failed to save marks', 'error')
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async () => {
    if (!viewTest || !viewSubject || viewMarks.length === 0) {
      showToast('No data to generate PDF', 'error')
      return
    }

    try {
      const test = completedTests.find(t => t.id === viewTest)
      const subject = subjects.find(s => s.id === viewSubject)

      if (!test || !subject) {
        showToast('Test or subject data not found', 'error')
        return
      }

      console.log('Generating PDF for:', { test, subject, marksCount: viewMarks.length })

      const pdfSettings = getPdfSettings()

      // Create PDF with settings from Settings page
      const orientation = pdfSettings.orientation === 'portrait' ? 'p' : 'l'
      const pageSize = pdfSettings.pageSize || 'a4'
      const doc = new jsPDF(orientation, 'mm', pageSize)
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margins = getMarginValues(pdfSettings.margin)

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Get colors from settings
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      const textColor = hexToRgb(pdfSettings.textColor)

      // Test Details
      const testDate = new Date(test.test_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })

      // Header Section with blue background box
      const headerHeight = 45
      let yPos = 10

      // Draw blue background rectangle
      doc.setFillColor(...headerBgColor)
      doc.rect(0, 0, pageWidth, headerHeight, 'F')

      // Add "Generated" date in top right corner
      if (pdfSettings.includeGeneratedDate) {
        const generatedDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(255, 255, 255)
        doc.text(`Generated: ${generatedDate}`, pageWidth - 10, 8, { align: 'right' })
      }

      // Add logo in white box on the left if enabled
      if (pdfSettings.includeLogo && schoolData?.logo) {
        try {
          const logoSize = getLogoSize(pdfSettings.logoSize)
          const logoBoxSize = logoSize.width + 8
          const logoBoxX = 15
          const logoBoxY = (headerHeight - logoBoxSize) / 2 + 5

          // Draw white box for logo
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 3, 3, 'F')

          // Add logo centered in white box
          const logoX = logoBoxX + 4
          const logoY = logoBoxY + 4
          doc.addImage(schoolData.logo, 'PNG', logoX, logoY, logoSize.width, logoSize.height)
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // Center section with school name and title
      yPos = 18

      // School name
      if (pdfSettings.includeSchoolName && schoolData?.name) {
        doc.setFontSize(pdfSettings.schoolNameFontSize || 18)
        doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(schoolData.name, pageWidth / 2, yPos, { align: 'center' })
        yPos += 8
      }

      // Title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('TEST MARKS REPORT', pageWidth / 2, yPos, { align: 'center' })
      yPos += 6

      // Subtitle with test details
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(255, 255, 255)
      doc.text(`${test.test_name || 'N/A'} - ${test.classes?.class_name || 'N/A'} - ${subject.subject_name || 'N/A'}`, pageWidth / 2, yPos, { align: 'center' })

      // Reset y position to start content after header
      yPos = headerHeight + 8

      // Summary information below header
      doc.setTextColor(...textColor)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Test Date: ${testDate} | Total Students: ${viewMarks.length}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 8

      // Prepare table data with null checks, percentage, and status
      const tableData = viewMarks.map((mark, index) => {
        const student = mark.students || {}
        const percentage = mark.is_absent ? 0 : ((mark.obtained_marks / viewSubjectTotalMarks) * 100).toFixed(2)
        const isPassing = percentage >= 40

        let status = 'Pass'
        if (mark.is_absent) {
          status = 'Absent'
        } else if (!isPassing) {
          status = 'Fail'
        }

        return [
          (index + 1).toString(),
          student.roll_number || 'N/A',
          student.admission_number || 'N/A',
          `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A',
          student.father_name || 'N/A',
          (viewSubjectTotalMarks || 0).toString(),
          mark.is_absent ? 'Absent' : (mark.obtained_marks?.toString() || '0'),
          mark.is_absent ? '-' : `${percentage}%`,
          status
        ]
      })

      console.log('Table data prepared:', tableData.length, 'rows')

      // Get autoTable styles from centralized settings
      const autoTableStyles = getAutoTableStyles(pdfSettings)

      // Generate table
      autoTable(doc, {
        startY: yPos,
        head: [['Sr.', 'Roll No', 'Adm. No', 'Student Name', 'Father Name', 'Total', 'Obtained', 'Percentage', 'Status']],
        body: tableData,
        ...autoTableStyles,
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 15 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'left', cellWidth: 35 },
          4: { halign: 'left', cellWidth: 32 },
          5: { halign: 'center', cellWidth: 15 },
          6: { halign: 'center', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 20 },
          8: { halign: 'center', cellWidth: 17 }
        },
        didParseCell: function(data) {
          // Color code status column
          if (data.column.index === 8 && data.section === 'body') {
            const status = data.cell.raw
            if (status === 'Pass') {
              data.cell.styles.textColor = [34, 197, 94] // green-500
              data.cell.styles.fontStyle = 'bold'
            } else if (status === 'Fail') {
              data.cell.styles.textColor = [239, 68, 68] // red-500
              data.cell.styles.fontStyle = 'bold'
            } else if (status === 'Absent') {
              data.cell.styles.textColor = [107, 114, 128] // gray-500
              data.cell.styles.fontStyle = 'bold'
            }
          }
        }
      })

      // Add footer to all pages if enabled
      if (pdfSettings.includeFooter && pdfSettings.footerText) {
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          const footerY = pageHeight - margins.bottom + 5
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...textColor)
          doc.text(pdfSettings.footerText, pageWidth / 2, footerY, { align: 'center' })
        }
      }

      // Generate blob and show preview
      const testName = test.test_name || 'Test'
      const subjectName = subject.subject_name || 'Subject'
      const fileName = `${testName}_${subjectName}_Marks.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_')

      console.log('Saving PDF as:', fileName)
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast(`Failed to generate PDF: ${error.message}`, 'error')
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
  }

  const selectedTestData = tests.find(t => t.id === selectedTest)
  const viewTestData = completedTests.find(t => t.id === viewTest)
  const viewSubjectData = subjects.find(s => s.id === viewSubject)

  return (
    <div className="p-1">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            } text-white min-w-[300px]`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="hover:bg-white/20 p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Test Marks Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('enter')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'enter'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Enter Marks
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'view'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              View Results
            </button>
          </div>
        </div>

        {activeTab === 'enter' && (
          <div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Test <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTest}
                  onChange={(e) => handleTestChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Test</option>
                  {tests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.test_name} - {test.classes?.class_name} ({new Date(test.test_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                <input
                  type="text"
                  value={selectedTestData?.classes?.class_name || ''}
                  disabled
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                <input
                  type="text"
                  value={selectedTestData?.sections?.section_name || 'All Sections'}
                  disabled
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={!selectedTest}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTestData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Total Marks (This Subject):</span>
                    <span className="ml-2 text-gray-900">{subjectTotalMarks || 'Select subject'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Test Date:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(selectedTestData.test_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Students:</span>
                    <span className="ml-2 text-gray-900">{students.length}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Status:</span>
                    <span className="ml-2 text-green-600 font-medium">{selectedTestData.status}</span>
                  </div>
                </div>
              </div>
            )}

            {students.length > 0 && selectedSubject && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="w-full">
                    <thead className="bg-blue-600 text-white sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Roll No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Admission No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Father Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold w-32">
                          Marks Obtained <span className="text-red-300">*</span>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold w-24">Absent</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold w-48">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const marks = marksData[student.id] || {}
                        return (
                          <tr key={student.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm">{student.roll_number || 'N/A'}</td>
                            <td className="px-3 py-2 text-sm">{student.admission_number}</td>
                            <td className="px-3 py-2 text-sm font-medium">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="px-3 py-2 text-sm">{student.father_name}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={subjectTotalMarks || 100}
                                value={marks.obtained_marks || ''}
                                onChange={(e) => handleMarksChange(student.id, 'obtained_marks', e.target.value)}
                                disabled={marks.is_absent}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={marks.is_absent || false}
                                onChange={(e) => handleMarksChange(student.id, 'is_absent', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={marks.remarks || ''}
                                onChange={(e) => handleMarksChange(student.id, 'remarks', e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Optional"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setMarksData(existingMarks)
                      showToast('Changes reset', 'info')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSaveMarks}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Marks'}
                  </button>
                </div>
              </div>
            )}

            {selectedTest && selectedSubject && students.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No students found for the selected class/section</p>
              </div>
            )}

            {(!selectedTest || !selectedSubject) && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Please select a test and subject to enter marks</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'view' && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Test <span className="text-red-500">*</span>
                </label>
                <select
                  value={viewTest}
                  onChange={(e) => handleViewTestChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Test</option>
                  {completedTests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.test_name} - {test.classes?.class_name} ({new Date(test.test_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={viewSubject}
                  onChange={(e) => setViewSubject(e.target.value)}
                  disabled={!viewTest}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generatePDF}
                  disabled={!viewTest || !viewSubject || viewMarks.length === 0}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Print PDF
                </button>
              </div>
            </div>

            {viewTestData && viewSubject && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Test Name:</span>
                    <span className="ml-2 text-gray-900">{viewTestData.test_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Class:</span>
                    <span className="ml-2 text-gray-900">{viewTestData.classes?.class_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Total Marks (This Subject):</span>
                    <span className="ml-2 text-gray-900">{viewSubjectTotalMarks}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Total Students:</span>
                    <span className="ml-2 text-gray-900">{viewMarks.length}</span>
                  </div>
                </div>
              </div>
            )}

            {viewMarks.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="w-full">
                    <thead className="bg-blue-600 text-white sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Sr.</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Roll No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Admission No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Father Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Total Marks</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Obtained Marks</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Percentage</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewMarks.map((mark, index) => {
                        const student = mark.students
                        const percentage = mark.is_absent ? 0 : ((mark.obtained_marks / viewSubjectTotalMarks) * 100).toFixed(2)
                        const isPassing = percentage >= 40

                        return (
                          <tr key={mark.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm">{index + 1}</td>
                            <td className="px-3 py-2 text-sm">{student.roll_number || 'N/A'}</td>
                            <td className="px-3 py-2 text-sm">{student.admission_number}</td>
                            <td className="px-3 py-2 text-sm font-medium">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="px-3 py-2 text-sm">{student.father_name}</td>
                            <td className="px-3 py-2 text-sm text-center">{viewSubjectTotalMarks}</td>
                            <td className="px-3 py-2 text-sm text-center font-medium">
                              {mark.is_absent ? (
                                <span className="text-red-600">Absent</span>
                              ) : (
                                mark.obtained_marks || 0
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm text-center">
                              {mark.is_absent ? '-' : `${percentage}%`}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {mark.is_absent ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Absent
                                </span>
                              ) : isPassing ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Pass
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Fail
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewTest && viewSubject && viewMarks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No marks found for the selected test and subject</p>
              </div>
            )}

            {(!viewTest || !viewSubject) && (
              <div className="text-center py-12 text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Please select a test and subject to view results</p>
              </div>
            )}
          </div>
        )}
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

export default function TestMarksPageWithPermission() {
  const [currentUser, setCurrentUser] = useState(null)

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

  return (
    <PermissionGuard permissionKey="examination_testmarks_view" pageName="Test Marks" currentUser={currentUser}>
      <TestMarksPage />
    </PermissionGuard>
  )
}
