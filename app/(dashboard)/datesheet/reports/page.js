'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Printer, FileText, Settings, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function DatesheetReportsPage() {
  const router = useRouter()
  const [datesheets, setDatesheets] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [schedules, setSchedules] = useState([])
  const [subjects, setSubjects] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [session, setSession] = useState(null)
  const [schoolInfo, setSchoolInfo] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState([])

  // Configuration Modal State
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configType, setConfigType] = useState('datesheet')

  // New state for datesheet type selection
  const [showClassSelectionModal, setShowClassSelectionModal] = useState(false)
  const [selectedClassForDatesheet, setSelectedClassForDatesheet] = useState('')

  // Roll No Slip State - Updated with dropdown student selection
  const [showRollNoSlipModal, setShowRollNoSlipModal] = useState(false)
  const [selectedClassForSlip, setSelectedClassForSlip] = useState('')
  const [filteredStudentsForSlip, setFilteredStudentsForSlip] = useState([])
  const [selectedStudentForSlip, setSelectedStudentForSlip] = useState('')

  // Configuration Form State
  const [config, setConfig] = useState({
    showRoomNumber: true,
    showSyllabus: true,
    showExamTime: true,
    showPrincipalSignature: true,
    printDate: new Date().toISOString().split('T')[0],
    selectedDatesheet: '',
    template: 'default',
    feeStatus: 'all',
    selectedClass: 'all',
    textFontSize: '12',
    extraColumns: '2',
    logoHeight: '48',
    logoWidth: '48',
    bgColor: '#ffffff',
    textColor: '#000000',
    landscapeMode: false,
    hideReportCriteria: false
  })

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

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showConfigModal || showClassSelectionModal || showRollNoSlipModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showConfigModal, showClassSelectionModal, showRollNoSlipModal])

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
        console.log('🏫 School info loaded:', data)
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
      setSchedules(data || [])
      return data || []
    } catch (error) {
      console.error('Error fetching schedules:', error)
      showToast('Error fetching schedules', 'error')
      return []
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

    const datesheet = datesheets.find(d => d.id === config.selectedDatesheet)
    if (!datesheet) {
      showToast('Datesheet not found', 'error')
      return
    }

    const scheduleData = await fetchSchedules(config.selectedDatesheet)
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
          fillColor: [25, 49, 83],
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

      if (config.showSyllabus) {
        doc.setFontSize(8)
        doc.text('Syllabus: ____________________________________________', leftMargin, finalY)
      }

      const footerY = pageHeight - 20
      doc.setFontSize(8)
      doc.text(`Dated: ${new Date(config.printDate).toLocaleDateString('en-GB')}`, leftMargin, footerY)
      
      if (config.showPrincipalSignature) {
        doc.text('_____________________', pageWidth - 60, footerY - 5)
        doc.text('Controller Examination', pageWidth - 60, footerY)
      }

      const fileName = `RollNoSlip_${student.admission_number}_${datesheet.title}.pdf`
      doc.save(fileName)

      showToast('Roll No Slip generated successfully', 'success')
    } catch (error) {
      console.error('Error generating roll no slip:', error)
      showToast(`Error generating slip: ${error.message}`, 'error')
    }
  }

  const handleProcessConfig = async () => {
    if (!config.selectedDatesheet || !currentUser?.school_id || !currentUser?.id) {
      showToast('Missing required information', 'error')
      return
    }

    try {
      const selectedDatesheet = datesheets.find(d => d.id === config.selectedDatesheet)
      if (!selectedDatesheet) {
        showToast('Selected datesheet not found', 'error')
        return
      }

      await fetchSchedules(config.selectedDatesheet)

      if (configType === 'datesheet') {
        const result = await supabase
          .from('datesheet_reports')
          .insert({
            school_id: currentUser.school_id,
            datesheet_id: config.selectedDatesheet,
            report_name: `${selectedDatesheet.title} - Date Sheet Report`,
            report_type: 'datesheet',
            class_id: config.selectedClass !== 'all' ? config.selectedClass : null,
            gender_filter: null,
            file_url: `/reports/datesheet/${config.selectedDatesheet}`,
            configuration: config,
            generated_by: currentUser.id,
            status: 'generated'
          })
          .select()

        if (!result.error) {
          showToast('Date Sheet Report saved successfully', 'success')
          setShowConfigModal(false)
        }
      }
    } catch (error) {
      console.error('Error saving report:', error)
      showToast(`Failed to save report: ${error.message}`, 'error')
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

  const generateSingleClassDatesheetPDF = async (classId) => {
    if (!config.selectedDatesheet || !classId) {
      showToast('Please select both datesheet and class', 'warning')
      return
    }

    try {
      const datesheet = datesheets.find(d => d.id === config.selectedDatesheet)
      if (!datesheet) {
        showToast('Datesheet not found', 'error')
        return
      }

      const { data: classSchedules, error } = await supabase
        .from('datesheet_schedules')
        .select(`
          *,
          subjects (subject_name, subject_code)
        `)
        .eq('datesheet_id', config.selectedDatesheet)
        .eq('class_id', classId)
        .not('subject_id', 'is', null)
        .order('exam_date')

      if (error) throw error

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      let yPos = 20
      
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

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('DATE SHEET SCHEDULE', pageWidth / 2, yPos, { align: 'center' })
      yPos += 7
      doc.text(datesheet.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      const leftMargin = 20

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Class: ${getClassName(classId)}`, leftMargin, yPos)
      yPos += 6
      doc.text(`Session: ${datesheet.session}`, leftMargin, yPos)
      yPos += 6
      doc.text(`Exam Center: ${datesheet.exam_center || schoolInfo?.address || 'Main Campus'}`, leftMargin, yPos)
      yPos += 10

      const tableData = classSchedules?.map((schedule, index) => {
        const date = new Date(schedule.exam_date)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const formattedDate = `${dayNames[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')}-${monthNames[date.getMonth()]}-${date.getFullYear()}`

        return [
          (index + 1).toString(),
          schedule.subjects?.subject_name || 'N/A',
          formattedDate,
          formatTime(schedule.start_time) || 'N/A',
          formatTime(schedule.end_time) || 'N/A',
          schedule.room_number || 'N/A'
        ]
      }) || []

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Subject', 'Exam Date', 'Start Time', 'End Time', 'Room No']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [25, 49, 83],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 }
        }
      })

      const footerY = pageHeight - 20
      doc.setFontSize(8)
      doc.text(`Dated: ${new Date().toLocaleDateString('en-GB')}`, leftMargin, footerY)
      doc.text('Controller Examination: _______________', pageWidth - 80, footerY)

      const fileName = `${getClassName(classId)}_${datesheet.title}_Datesheet.pdf`
      doc.save(fileName)

      showToast('Single class datesheet generated successfully', 'success')
    } catch (error) {
      console.error('Error generating single class datesheet:', error)
      showToast(`Error generating datesheet: ${error.message}`, 'error')
    }
  }

  // ===================================================================
// PROFESSIONAL PDF GENERATION FUNCTION - REPLACE IN BOTH FILES
// ===================================================================
// 
// This fixes the terrible PDF formatting you showed in the screenshot.
// Replace the ENTIRE generateAllClassesDatesheetPDF function with this.
//
// Location in Reports Page: Around line 668
// Location in Management Page: Search for "generateAllClassesDatesheetPDF"
// ===================================================================

  const generateAllClassesDatesheetPDF = async () => {
    if (!config.selectedDatesheet) {
      showToast('Please select a datesheet', 'warning')
      return
    }

    try {
      const datesheet = datesheets.find(d => d.id === config.selectedDatesheet)
      if (!datesheet) {
        showToast('Datesheet not found', 'error')
        return
      }

      const { data: allSchedules, error } = await supabase
        .from('datesheet_schedules')
        .select(`
          *,
          subjects (subject_name, subject_code)
        `)
        .eq('datesheet_id', config.selectedDatesheet)
        .order('exam_date')

      if (error) throw error

      const uniqueDates = [...new Set(allSchedules.map(s => s.exam_date))].sort()
      const classesInDatesheet = datesheet.class_ids || []
      const filteredClasses = classes.filter(c => classesInDatesheet.includes(c.id))

      const doc = new jsPDF('l') // Landscape
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      let yPos = 15

      // === HEADER SECTION ===
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(schoolInfo?.name || 'School Name', pageWidth / 2, yPos, { align: 'center' })
      yPos += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      if (schoolInfo?.address) {
        doc.text(schoolInfo.address, pageWidth / 2, yPos, { align: 'center' })
        yPos += 5
      }
      if (schoolInfo?.phone) {
        doc.text(`Phone: ${schoolInfo.phone}`, pageWidth / 2, yPos, { align: 'center' })
        yPos += 5
      }

      yPos += 3

      // === TITLE ===
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(datesheet.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' })
      yPos += 8

      // === SESSION ===
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Academic Session: ${datesheet.session}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      // === PROFESSIONAL DATE HEADERS ===
      // This is the KEY FIX - formats dates properly
      const dateHeaders = uniqueDates.map(dateStr => {
        const date = new Date(dateStr)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        const dayName = dayNames[date.getDay()]
        const day = date.getDate().toString().padStart(2, '0')
        const month = monthNames[date.getMonth()]
        
        // Two-line format: Day name on top, date below
        return `${dayName}\n${day}-${month}`
      })

      // === TABLE STRUCTURE ===
      const tableHead = [['#', 'Class', ...dateHeaders]]

      const tableBody = filteredClasses.map((cls, index) => {
        const row = [(index + 1).toString(), cls.class_name]

        uniqueDates.forEach(date => {
          const schedule = allSchedules.find(s => s.class_id === cls.id && s.exam_date === date)
          row.push(schedule && schedule.subjects ? schedule.subjects.subject_name : '-')
        })

        return row
      })

      // === DYNAMIC COLUMN WIDTHS ===
      // Calculates optimal width based on number of date columns
      const numDates = uniqueDates.length
      const fixedWidth = 12 + 30 // # + Class columns
      const availableWidth = pageWidth - 30 // minus margins
      const dateColWidth = Math.max(25, Math.min(35, (availableWidth - fixedWidth) / numDates))

      const columnStyles = {
        0: { cellWidth: 12, halign: 'center', valign: 'middle' },
        1: { cellWidth: 30, halign: 'left', valign: 'middle', fontStyle: 'bold' }
      }

      // Apply same width to all date columns
      for (let i = 0; i < numDates; i++) {
        columnStyles[i + 2] = { 
          cellWidth: dateColWidth, 
          halign: 'center', 
          valign: 'middle', 
          fontSize: 8 
        }
      }

      // === GENERATE TABLE ===
      autoTable(doc, {
        startY: yPos,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [25, 49, 83], // Dark blue header
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          cellPadding: 4,
          lineWidth: 0.5,
          lineColor: [255, 255, 255]
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245] // Light gray alternate rows
        },
        columnStyles: columnStyles,
        margin: { left: 15, right: 15 }
      })

      // === FOOTER ===
      const footerY = pageHeight - 10
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 15, footerY)
      doc.text('Controller of Examinations', pageWidth - 15, footerY, { align: 'right' })

      // === SAVE PDF ===
      const fileName = `DateSheet_${datesheet.title.replace(/\s+/g, '_')}.pdf`
      doc.save(fileName)

      showToast('Datesheet generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating datesheet:', error)
      showToast(`Error: ${error.message}`, 'error')
    }
  }

// ===================================================================
// END OF REPLACEMENT FUNCTION
// ===================================================================

  const handleSingleClassDatesheet = () => {
    if (!config.selectedDatesheet) {
      showToast('Please select a datesheet first', 'warning')
      return
    }
    setShowClassSelectionModal(true)
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
    setShowClassSelectionModal(false)
    setSelectedClassForDatesheet('')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Reports
          </button>
          <button
            onClick={handleViewRollNoSlips}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print Roll No Slip
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
              value={config.selectedDatesheet}
              onChange={(e) => setConfig({ ...config, selectedDatesheet: e.target.value })}
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
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Sr.</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date Sheet Reports</th>
                <th className="px-6 py-3 text-left text-sm font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">1</td>
                <td className="px-6 py-4 text-sm font-medium">Single Class Datesheet</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={handleSingleClassDatesheet}
                    className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
                  >
                    Generate
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">2</td>
                <td className="px-6 py-4 text-sm font-medium">All Classes Datesheet</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={handleAllClassesDatesheet}
                    className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
                  >
                    Generate
                  </button>
                </td>
              </tr>
              <tr className="bg-gray-300">
                <td colSpan="3" className="px-6 py-2 text-sm font-semibold text-gray-700">
                  Roll No Slips
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">3</td>
                <td className="px-6 py-4 text-sm font-medium">Roll No Slips</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={handleViewRollNoSlips}
                    className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
                  >
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Blur overlay when modal is open */}
      {(showConfigModal || showClassSelectionModal || showRollNoSlipModal) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0">
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
                        <option key={ds.id} value={ds.id}>{ds.title}</option>
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
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
              >
                Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roll No Slip Modal with Dropdown Student Selection */}
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
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 flex items-center gap-2"
                disabled={!selectedStudentForSlip}
              >
                <Download className="w-5 h-5" />
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Selection Modal */}
      {showClassSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Select Class</h2>
              <button onClick={() => setShowClassSelectionModal(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select a Class</label>
              <select
                value={selectedClassForDatesheet}
                onChange={(e) => setSelectedClassForDatesheet(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
              >
                <option value="">Select a class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowClassSelectionModal(false)}
                className="px-6 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSingleClassPDF}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
              >
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
            className={`flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg min-w-[300px] ${
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
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}