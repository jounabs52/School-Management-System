'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, AlertCircle, X, Download, Save, Check, Settings } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import toast, { Toaster } from 'react-hot-toast'
import {
  addDecorativeBorder,
  convertImageToBase64,
  PDF_COLORS,
  PDF_FONTS
} from '@/lib/pdfUtils'
import {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  getLogoSize
} from '@/lib/pdfSettings'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

export default function StudentCertificatesPage() {
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [certificateFor, setCertificateFor] = useState('individual') // 'individual' or 'section'
  const [certificateType, setCertificateType] = useState('character') // 'character', 'leaving', 'attendance'
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [currentSession, setCurrentSession] = useState(null)
  const [certificateData, setCertificateData] = useState({
    conduct: 'V.Good',
    leavingReason: 'Change of residence',
    attendancePercentage: 95
  })
  const [showCertificateSettings, setShowCertificateSettings] = useState(false)
  const [certificateSettings, setCertificateSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('certificateSettings')
      return saved ? JSON.parse(saved) : {
        // Header
        instituteName: 'Superior College Bhakkar',
        instituteLocation: 'Bhakkar',
        certificateTitle: 'Character Certificate',
        showSchoolLogo: true,
        logoSize: 'medium',

        // Colors
        borderColor: '#8B4513',
        headerTextColor: '#8B4513',
        textColor: '#000000',
        accentColor: '#D2691E',
        fieldLabelColor: '#000000',
        fieldValueColor: '#00008B',
        certificateTextColor: '#8B0000',

        // Typography
        instituteNameSize: 20,
        instituteTitleSize: 18,
        fieldLabelSize: 10,
        fieldValueSize: 10,
        certificateTextSize: 10,
        serialNumberSize: 9,

        // Certificate Content Template
        certificateText: 'This is to certify that {studentName}, son of {fatherName}, has been a student of this {collegeName}. He is a brilliant student who secured {marksObtained}/{totalMarks} marks with an {grade} grade in his {className} examination. His academic dedication is exemplary, and he maintains a highly disciplined and respectful attitude toward his teachers and peers.',

        // Field Labels
        nameLabel: 'Name of Student:',
        rollNoLabel: 'Roll No.:',
        examinationLabel: 'Examination Passed:',
        sessionLabel: 'Session:',
        marksObtainedLabel: 'Marks Obtained:',
        totalMarksLabel: 'Total Marks:',
        yearLabel: 'Year:',
        gradeLabel: 'Grade:',

        // Field Visibility
        showSerialNumber: true,
        showDate: true,
        showName: true,
        showRollNo: true,
        showExamination: true,
        showSession: true,
        showMarks: true,
        showTotalMarks: true,
        showYear: true,
        showGrade: true,

        // Signature
        principalSignature: null,
        principalTitle: 'Principal Signature',
        schoolNameInSignature: 'Superior College Bhakkar',

        // Footer
        footerText: '',

        // Border & Design
        showBorder: true,
        borderStyle: 'decorative'
      }
    }
    return {
      instituteName: 'Superior College Bhakkar',
      instituteLocation: 'Bhakkar',
      certificateTitle: 'Character Certificate',
      showSchoolLogo: true,
      logoSize: 'medium',
      borderColor: '#8B4513',
      headerTextColor: '#8B4513',
      textColor: '#000000',
      accentColor: '#D2691E',
      fieldLabelColor: '#000000',
      fieldValueColor: '#00008B',
      certificateTextColor: '#8B0000',
      instituteNameSize: 20,
      instituteTitleSize: 18,
      fieldLabelSize: 10,
      fieldValueSize: 10,
      certificateTextSize: 10,
      serialNumberSize: 9,
      certificateText: 'This is to certify that {studentName}, son of {fatherName}, has been a student of this {collegeName}. He is a brilliant student who secured {marksObtained}/{totalMarks} marks with an {grade} grade in his {className} examination. His academic dedication is exemplary, and he maintains a highly disciplined and respectful attitude toward his teachers and peers.',
      nameLabel: 'Name of Student:',
      rollNoLabel: 'Roll No.:',
      examinationLabel: 'Examination Passed:',
      sessionLabel: 'Session:',
      marksObtainedLabel: 'Marks Obtained:',
      totalMarksLabel: 'Total Marks:',
      yearLabel: 'Year:',
      gradeLabel: 'Grade:',
      showSerialNumber: true,
      showDate: true,
      showName: true,
      showRollNo: true,
      showExamination: true,
      showSession: true,
      showMarks: true,
      showTotalMarks: true,
      showYear: true,
      showGrade: true,
      principalSignature: null,
      principalTitle: 'Principal Signature',
      schoolNameInSignature: 'Superior College Bhakkar',
      footerText: '',
      showBorder: true,
      borderStyle: 'decorative'
    }
  })

  useEffect(() => {
    fetchClasses()
    fetchSchoolData()
    fetchCurrentSession()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchSections()
    } else {
      setSections([])
      setSelectedSection('')
    }
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass) {
      // Fetch students if class is selected (with or without section)
      // If sections exist but none selected, don't fetch yet
      if (sections.length === 0 || selectedSection) {
        fetchStudents()
      } else {
        setStudents([])
      }
    } else {
      setStudents([])
    }
  }, [selectedClass, selectedSection, sections.length])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError('Failed to load classes')
    }
  }

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, section_name')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (error) throw error
      setSections(data || [])
    } catch (err) {
      console.error('Error fetching sections:', err)
      setSections([])
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('current_class_id', selectedClass)
        .eq('status', 'active')
        .order('first_name', { ascending: true })

      // Only filter by section if a section is selected
      if (selectedSection) {
        query = query.eq('current_section_id', selectedSection)
      }

      const { data, error } = await query

      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const fetchSchoolData = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .limit(1)
        .single()

      if (error) throw error

      // Convert logo URL to base64
      let logoBase64 = data?.logo_url
      if (data?.logo_url && (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://'))) {
        logoBase64 = await convertImageToBase64(data.logo_url)
      }

      setSchoolData({
        ...data,
        logo: logoBase64
      })
    } catch (err) {
      console.error('Error fetching school data:', err)
    }
  }

  const fetchCurrentSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_current', true)
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setCurrentSession(data)
    } catch (err) {
      console.error('Error fetching current session:', err)
    }
  }

  const handleCertificateSettingChange = (key, value) => {
    setCertificateSettings(prev => {
      const updated = { ...prev, [key]: value }
      localStorage.setItem('certificateSettings', JSON.stringify(updated))
      return updated
    })
  }

  const saveCertificateSettings = () => {
    localStorage.setItem('certificateSettings', JSON.stringify(certificateSettings))
    setSuccess('Certificate settings saved successfully!')
    setTimeout(() => setSuccess(null), 3000)
    setShowCertificateSettings(false)
  }

  const getClassName = (classId) => {
    const classObj = classes.find(c => c.id === classId)
    return classObj?.class_name || ''
  }

  const handleGenerateCertificate = (student) => {
    setSelectedStudent(student)
    setShowPreview(true)
  }

  const handleSaveCertificate = async () => {
    setSaving(true)
    setError(null)

    try {
      // Fetch school_id
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .limit(1)
        .single()

      if (schoolError) throw new Error('Unable to fetch school information')

      const certificateRecord = {
        student_id: selectedStudent.id,
        school_id: schools.id,
        certificate_type: 'character',
        issue_date: new Date().toISOString().split('T')[0],
        remarks: `Conduct: ${certificateData.conduct}`,
        created_at: new Date().toISOString()
      }

      const { error: insertError } = await supabase
        .from('student_certificates')
        .insert([certificateRecord])

      if (insertError) throw insertError

      setSuccess('Certificate saved successfully!')
      setTimeout(() => setSuccess(null), 3000)

      // Close the modal after successful save
      setShowPreview(false)
      setSelectedStudent(null)
    } catch (err) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save certificate')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateCertificatePDF = async (student, certType, skipValidation = false) => {
    // Dynamic import of jsPDF
    const { default: jsPDF } = await import('jspdf')

    // Use provided student or fall back to selectedStudent
    const studentData = student || selectedStudent
    const certificateTypeToUse = certType || certificateType

    if (!studentData) {
      setError('No student selected')
      return
    }

    console.log('Generating certificate for:', studentData, 'Type:', certificateTypeToUse)

    // Check if certificate already exists BEFORE saving to database (unless validation is skipped)
    if (!skipValidation) {
      try {
        const { data: schools, error: schoolError } = await supabase
          .from('schools')
          .select('id')
          .limit(1)
          .single()

        if (!schoolError && schools) {
          const { data: existingCert, error: checkError } = await supabase
            .from('student_certificates')
            .select('id')
            .eq('student_id', studentData.id)
            .eq('school_id', schools.id)
            .eq('certificate_type', certificateTypeToUse)
            .limit(1)

          if (!checkError && existingCert && existingCert.length > 0) {
            // Certificate already exists
            const studentName = [studentData.first_name, studentData.last_name].filter(Boolean).join(' ')
            toast(`${certificateTypeToUse.charAt(0).toUpperCase() + certificateTypeToUse.slice(1)} certificate already exists for ${studentName}!`, {
              duration: 4000,
              position: 'top-right',
              style: {
                background: '#ef4444',
                color: '#fff',
                fontWeight: '500',
                zIndex: 9999,
              },
              icon: '✕',
            })
            return
          }
        }
      } catch (error) {
        console.error('Error checking certificate:', error)
      }
    }

    // Fetch school data from Supabase
    let schoolDataToUse = schoolData
    if (!schoolDataToUse) {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .limit(1)
          .single()

        if (!error && data) {
          let logoBase64 = data?.logo_url
          if (data?.logo_url && (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://'))) {
            logoBase64 = await convertImageToBase64(data.logo_url)
          }
          schoolDataToUse = { ...data, logo: logoBase64 }
        }
      } catch (err) {
        console.error('Error fetching school data:', err)
      }
    }

    // Get PDF settings from centralized location
    const pdfSettings = getPdfSettings()

    // Fetch exam marks for the student
    let examMarksData = null
    try {
      const { data: marksData, error: marksError } = await supabase
        .from('exam_marks')
        .select(`
          obtained_marks,
          total_marks,
          subjects (
            subject_name
          )
        `)
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false })

      if (!marksError && marksData && marksData.length > 0) {
        let totalObtained = 0
        let totalPossible = 0

        marksData.forEach(mark => {
          totalObtained += mark.obtained_marks || 0
          totalPossible += mark.total_marks || 0
        })

        const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0
        let grade = 'N/A'
        if (percentage >= 90) grade = 'A+'
        else if (percentage >= 80) grade = 'A'
        else if (percentage >= 70) grade = 'B'
        else if (percentage >= 60) grade = 'C'
        else if (percentage >= 50) grade = 'D'
        else grade = 'F'

        examMarksData = {
          marks_obtained: totalObtained,
          total_marks: totalPossible,
          grade: grade,
          percentage: percentage.toFixed(2)
        }

        studentData.marks_obtained = totalObtained
        studentData.total_marks = totalPossible
        studentData.grade = grade
      }
    } catch (err) {
      console.error('Error fetching exam marks:', err)
    }

    // Fetch attendance data for attendance certificate
    let attendanceData = null
    if (certificateTypeToUse === 'attendance') {
      try {
        const { data: attData, error: attError } = await supabase
          .from('attendance')
          .select('status, date')
          .eq('student_id', studentData.id)

        if (!attError && attData && attData.length > 0) {
          const totalDays = attData.length
          const presentDays = attData.filter(a => a.status === 'present').length
          const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0

          attendanceData = {
            totalDays,
            presentDays,
            absentDays: totalDays - presentDays,
            percentage
          }
        }
      } catch (err) {
        console.error('Error fetching attendance:', err)
      }
    }

    // Save to database first
    try {
      const { data: schools, error: schoolError} = await supabase
        .from('schools')
        .select('id')
        .limit(1)
        .single()

      if (!schoolError && schools) {
        const certificateRecord = {
          student_id: studentData.id,
          school_id: schools.id,
          certificate_type: certificateTypeToUse,
          issue_date: new Date().toISOString().split('T')[0],
          remarks: certificateTypeToUse === 'leaving'
            ? `Reason: ${certificateData.leavingReason}, Conduct: ${certificateData.conduct}`
            : `Conduct: ${certificateData.conduct}`,
          created_at: new Date().toISOString()
        }

        await supabase
          .from('student_certificates')
          .insert([certificateRecord])
      }
    } catch (err) {
      console.error('Error saving certificate:', err)
    }

    // Generate appropriate certificate based on type
    let doc
    if (certificateTypeToUse === 'character') {
      doc = await generateCharacterCertificate(jsPDF, studentData, schoolDataToUse, pdfSettings, examMarksData)
    } else if (certificateTypeToUse === 'leaving') {
      doc = await generateLeavingCertificate(jsPDF, studentData, schoolDataToUse, pdfSettings, examMarksData)
    } else if (certificateTypeToUse === 'attendance') {
      doc = await generateAttendanceCertificate(jsPDF, studentData, schoolDataToUse, pdfSettings, attendanceData)
    }

    // Save PDF
    const fileName = `${certificateTypeToUse}-certificate-${studentData.first_name || 'Student'}-${studentData.admission_number || 'NA'}-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)

    // Show success toast
    const studentName = [studentData.first_name, studentData.last_name].filter(Boolean).join(' ')
    toast.success(`${certificateTypeToUse.charAt(0).toUpperCase() + certificateTypeToUse.slice(1)} certificate generated successfully for ${studentName}!`, {
      duration: 4000,
      position: 'top-right',
      style: {
        zIndex: 9999,
      },
    })

    // Close the modal after printing (only if modal is open)
    if (selectedStudent) {
      setShowPreview(false)
      setSelectedStudent(null)
    }
  }

  // Character Certificate Generator
  const generateCharacterCertificate = async (jsPDF, studentData, schoolDataToUse, pdfSettings, examMarksData) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 12

    const borderRgb = hexToRgb(certificateSettings.borderColor || pdfSettings.primaryColor)
    const headerRgb = hexToRgb(certificateSettings.headerTextColor || pdfSettings.primaryColor)
    const textRgb = hexToRgb(certificateSettings.textColor || pdfSettings.textColor)
    const accentRgb = hexToRgb(certificateSettings.accentColor || pdfSettings.secondaryColor)

    // Add decorative border if enabled
    if (certificateSettings.showBorder) {
      addDecorativeBorder(doc, certificateSettings.borderColor || pdfSettings.primaryColor)
    }

    const serialNumber = Math.floor(Math.random() * 10000) + 1

    // Serial number at top left
    if (certificateSettings.showSerialNumber) {
      doc.setFontSize(9)
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Sr. No.:', margin + 11, margin + 11)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(serialNumber.toString(), margin + 27, margin + 11)
    }

    // Date at top right
    if (certificateSettings.showDate) {
      const currentDate = new Date().toLocaleDateString('en-GB')
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Dated:', pageWidth - margin - 48, margin + 11)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(currentDate, pageWidth - margin - 31, margin + 11)
    }

    // School logo at top center
    if (certificateSettings.showSchoolLogo && schoolDataToUse?.logo) {
      try {
        const logoSize = getLogoSize(certificateSettings.logoSize || 'medium')
        const logoX = (pageWidth - logoSize) / 2
        const logoY = margin + 8

        let format = 'PNG'
        if (schoolDataToUse.logo.includes('data:image/jpeg') || schoolDataToUse.logo.includes('data:image/jpg')) {
          format = 'JPEG'
        }

        doc.addImage(schoolDataToUse.logo, format, logoX, logoY, logoSize, logoSize)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // School Name
    doc.setFontSize(certificateSettings.instituteNameSize || 20)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...headerRgb)
    const instituteName = certificateSettings.instituteName || schoolDataToUse?.name || 'School Name'
    doc.text(instituteName, pageWidth / 2, margin + 35, { align: 'center' })

    // School Address
    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...textRgb)
    doc.text(certificateSettings.instituteLocation || schoolDataToUse?.address || 'School Address', pageWidth / 2, margin + 41, { align: 'center' })

    // Certificate Title
    doc.setFontSize(certificateSettings.instituteTitleSize || 18)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...accentRgb)
    doc.text(certificateSettings.certificateTitle || 'CHARACTER CERTIFICATE', pageWidth / 2, margin + 51, { align: 'center' })

    // Student Details
    const detailsY = margin + 62
    const leftColX = margin + 18
    const midColX = pageWidth / 2 + 10
    const lineHeight = 7
    let currentY = detailsY

    doc.setFontSize(certificateSettings.fieldLabelSize || 10)

    const studentFullName = `${studentData.first_name || ''}${studentData.last_name ? ' ' + studentData.last_name : ''}`.trim()
    const className = getClassName(studentData.current_class_id) || 'N/A'
    const currentYear = new Date().getFullYear()
    const grade = studentData.grade || 'N/A'

    // Row 1: Name and Roll No
    if (certificateSettings.showName) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.nameLabel || 'Name of Student:', leftColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
      doc.text(studentFullName, leftColX + 38, currentY)
    }

    if (certificateSettings.showRollNo) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.rollNoLabel || 'Roll No.:', midColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
      doc.text(studentData.roll_number || 'N/A', midColX + 18, currentY)
    }

    currentY += lineHeight

    // Row 2: Class and Session
    if (certificateSettings.showExamination) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.examinationLabel || 'Class:', leftColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
      doc.text(className, leftColX + 43, currentY)
    }

    if (certificateSettings.showSession) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.sessionLabel || 'Session:', midColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
      const sessionText = currentSession?.name || `${currentYear - 1}-${currentYear}`
      doc.text(sessionText, midColX + 18, currentY)
    }

    currentY += lineHeight

    // Row 3: Marks
    if (certificateSettings.showMarks && studentData.marks_obtained) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.marksObtainedLabel || 'Marks Obtained:', leftColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
      doc.text(studentData.marks_obtained?.toString() || 'N/A', leftColX + 38, currentY)
    }

    if (certificateSettings.showTotalMarks && studentData.total_marks) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.totalMarksLabel || 'Total Marks:', midColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
      doc.text(studentData.total_marks?.toString() || 'N/A', midColX + 28, currentY)
    }

    if (certificateSettings.showYear) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.yearLabel || 'Year:', midColX + 58, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
      doc.text(currentYear.toString(), midColX + 73, currentY)
    }

    currentY += lineHeight

    // Row 4: Grade
    if (certificateSettings.showGrade && grade) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.gradeLabel || 'Grade:', leftColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
      doc.text(grade, leftColX + 16, currentY)
    }

    currentY += lineHeight + 8

    // Certificate Text
    doc.setFontSize(certificateSettings.certificateTextSize || 10)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...textRgb)

    const fatherName = studentData.father_name || 'N/A'
    const collegeName = certificateSettings.instituteName || schoolDataToUse?.name || 'This Institution'
    const marksObtained = studentData.marks_obtained || 'N/A'
    const totalMarks = studentData.total_marks || 'N/A'

    let certificateText = certificateSettings.certificateText ||
      'This is to certify that {studentName}, son/daughter of {fatherName}, has been a student of {collegeName}. During their time here, the student has demonstrated good character, discipline, and respectful behavior towards teachers and peers. We wish them success in their future endeavors.'

    const sessionText = currentSession?.name || `${currentYear - 1}-${currentYear}`
    certificateText = certificateText
      .replace(/{studentName}/g, studentFullName)
      .replace(/{fatherName}/g, fatherName)
      .replace(/{collegeName}/g, collegeName)
      .replace(/{marksObtained}/g, marksObtained)
      .replace(/{totalMarks}/g, totalMarks)
      .replace(/{grade}/g, grade)
      .replace(/{className}/g, className)
      .replace(/{rollNumber}/g, studentData.roll_number || 'N/A')
      .replace(/{session}/g, sessionText)
      .replace(/{year}/g, currentYear.toString())

    doc.text(certificateText, leftColX, currentY, {
      maxWidth: pageWidth - (2 * leftColX),
      align: 'justify',
      lineHeightFactor: 1.5
    })

    // Principal Signature Section
    const signX = pageWidth - margin - 45
    const signY = pageHeight - margin - 30

    if (certificateSettings.principalSignature) {
      try {
        doc.addImage(certificateSettings.principalSignature, 'PNG', signX - 10, signY - 10, 30, 12)
      } catch (error) {
        console.error('Error adding signature:', error)
      }
    }

    doc.setLineWidth(0.3)
    doc.setDrawColor(...textRgb)
    doc.line(signX - 15, signY + 5, signX + 30, signY + 5)

    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text(certificateSettings.principalTitle || 'Principal Signature', signX + 7, signY + 10, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor || '#00008B'))
    const schoolLines = (certificateSettings.schoolNameInSignature || instituteName).split('\n')
    schoolLines.forEach((line, index) => {
      doc.text(line, signX + 7, signY + 15 + (index * 4), { align: 'center' })
    })

    if (certificateSettings.footerText) {
      doc.setFontSize(8)
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.footerText, pageWidth / 2, pageHeight - margin - 5, { align: 'center' })
    }

    return doc
  }

  // Leaving Certificate Generator
  const generateLeavingCertificate = async (jsPDF, studentData, schoolDataToUse, pdfSettings, examMarksData) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margins = getMarginValues(pdfSettings.margin || 'normal')

    // Header with school logo
    let yPos = margins.top

    // School Logo
    if (pdfSettings.includeLogo && schoolDataToUse?.logo) {
      try {
        const logoSize = getLogoSize(pdfSettings.logoSize || 'medium')
        const logoX = (pageWidth - logoSize) / 2

        let format = 'PNG'
        if (schoolDataToUse.logo.includes('data:image/jpeg') || schoolDataToUse.logo.includes('data:image/jpg')) {
          format = 'JPEG'
        }

        doc.addImage(schoolDataToUse.logo, format, logoX, yPos - 25, logoSize, logoSize)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // School Name
    doc.setFontSize(18)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...hexToRgb(pdfSettings.primaryColor))
    doc.text(schoolDataToUse?.name || 'School Name', pageWidth / 2, yPos, { align: 'center' })

    yPos += 8

    // School Address
    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    doc.text(schoolDataToUse?.address || 'School Address', pageWidth / 2, yPos, { align: 'center' })
    if (schoolDataToUse?.phone) {
      yPos += 5
      doc.text(`Phone: ${schoolDataToUse.phone}`, pageWidth / 2, yPos, { align: 'center' })
    }

    yPos += 12

    // Title
    doc.setFontSize(16)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...hexToRgb(pdfSettings.secondaryColor))
    doc.text('SCHOOL LEAVING CERTIFICATE', pageWidth / 2, yPos, { align: 'center' })

    yPos += 10

    // Certificate Number and Date
    const certNumber = `LC/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`
    const issueDate = new Date().toLocaleDateString('en-GB')

    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    doc.text(`Certificate No: ${certNumber}`, margins.left, yPos)
    doc.text(`Date: ${issueDate}`, pageWidth - margins.right, yPos, { align: 'right' })

    yPos += 12

    // Student Information Table
    const tableData = [
      ['Name of Student', `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim()],
      ['Father Name', studentData.father_name || 'N/A'],
      ['Date of Birth', studentData.date_of_birth ? new Date(studentData.date_of_birth).toLocaleDateString('en-GB') : 'N/A'],
      ['Class', getClassName(studentData.current_class_id) || 'N/A'],
      ['Admission Number', studentData.admission_number || 'N/A'],
      ['Admission Date', studentData.admission_date ? new Date(studentData.admission_date).toLocaleDateString('en-GB') : 'N/A'],
      ['Leaving Date', new Date().toLocaleDateString('en-GB')],
      ['Reason for Leaving', certificateData.leavingReason || 'Personal Reasons'],
    ]

    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'normal')

    tableData.forEach((row, index) => {
      const rowY = yPos + (index * 8)

      // Label
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...hexToRgb(pdfSettings.textColor))
      doc.text(row[0] + ':', margins.left, rowY)

      // Value
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...hexToRgb(pdfSettings.secondaryColor))
      doc.text(row[1], margins.left + 55, rowY)

      // Underline
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.1)
      doc.line(margins.left + 55, rowY + 1, pageWidth - margins.right, rowY + 1)
    })

    yPos += (tableData.length * 8) + 12

    // Character and Conduct
    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    doc.text('Character:', margins.left, yPos)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.secondaryColor))
    doc.text('Good', margins.left + 55, yPos)

    yPos += 8

    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    doc.text('Conduct:', margins.left, yPos)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.secondaryColor))
    doc.text(certificateData.conduct || 'V.Good', margins.left + 55, yPos)

    yPos += 15

    // Remarks
    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    const remarksText = `This is to certify that the above particulars are correct as per the school records. The student has cleared all dues and is leaving the school with good character and conduct.`
    doc.text(remarksText, margins.left, yPos, {
      maxWidth: pageWidth - margins.left - margins.right,
      align: 'justify',
      lineHeightFactor: 1.5
    })

    // Signature Section
    const signY = pageHeight - 60

    // Class Teacher Signature
    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    doc.setDrawColor(...hexToRgb(pdfSettings.textColor))
    doc.line(margins.left, signY, margins.left + 50, signY)
    doc.text('Class Teacher', margins.left + 25, signY + 5, { align: 'center' })

    // Principal Signature
    doc.line(pageWidth - margins.right - 50, signY, pageWidth - margins.right, signY)
    doc.text('Principal', pageWidth - margins.right - 25, signY + 5, { align: 'center' })
    doc.text(schoolDataToUse?.name || 'School Name', pageWidth - margins.right - 25, signY + 10, { align: 'center' })

    // School Seal Area
    doc.setFontSize(8)
    doc.text('(School Seal)', pageWidth / 2, signY + 20, { align: 'center' })
    doc.setDrawColor(...hexToRgb(pdfSettings.primaryColor))
    doc.setLineWidth(0.5)
    doc.circle(pageWidth / 2, signY + 30, 15, 'S')

    return doc
  }

  // Attendance Certificate Generator
  const generateAttendanceCertificate = async (jsPDF, studentData, schoolDataToUse, pdfSettings, attendanceData) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margins = getMarginValues(pdfSettings.margin || 'normal')

    let yPos = margins.top

    // School Logo
    if (pdfSettings.includeLogo && schoolDataToUse?.logo) {
      try {
        const logoSize = getLogoSize(pdfSettings.logoSize || 'medium')
        const logoX = (pageWidth - logoSize) / 2

        let format = 'PNG'
        if (schoolDataToUse.logo.includes('data:image/jpeg') || schoolDataToUse.logo.includes('data:image/jpg')) {
          format = 'JPEG'
        }

        doc.addImage(schoolDataToUse.logo, format, logoX, yPos - 25, logoSize, logoSize)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // School Name
    doc.setFontSize(18)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...hexToRgb(pdfSettings.primaryColor))
    doc.text(schoolDataToUse?.name || 'School Name', pageWidth / 2, yPos, { align: 'center' })

    yPos += 8

    // School Address
    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    doc.text(schoolDataToUse?.address || 'School Address', pageWidth / 2, yPos, { align: 'center' })
    if (schoolDataToUse?.phone) {
      yPos += 5
      doc.text(`Phone: ${schoolDataToUse.phone}`, pageWidth / 2, yPos, { align: 'center' })
    }

    yPos += 12

    // Title
    doc.setFontSize(16)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...hexToRgb(pdfSettings.secondaryColor))
    doc.text('ATTENDANCE CERTIFICATE', pageWidth / 2, yPos, { align: 'center' })

    yPos += 10

    // Certificate Number and Date
    const certNumber = `AC/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`
    const issueDate = new Date().toLocaleDateString('en-GB')

    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    doc.text(`Certificate No: ${certNumber}`, margins.left, yPos)
    doc.text(`Date: ${issueDate}`, pageWidth - margins.right, yPos, { align: 'right' })

    yPos += 15

    // Student Details
    const studentFullName = `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim()
    const className = getClassName(studentData.current_class_id) || 'N/A'
    const currentYear = new Date().getFullYear()
    const sessionText = currentSession?.name || `${currentYear - 1}-${currentYear}`

    doc.setFontSize(11)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))

    const studentInfoY = yPos
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.text('Student Name:', margins.left, studentInfoY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.text(studentFullName, margins.left + 40, studentInfoY)

    yPos += 8

    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.text('Father Name:', margins.left, yPos)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.text(studentData.father_name || 'N/A', margins.left + 40, yPos)

    yPos += 8

    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.text('Class:', margins.left, yPos)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.text(className, margins.left + 40, yPos)

    yPos += 8

    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.text('Academic Session:', margins.left, yPos)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.text(sessionText, margins.left + 40, yPos)

    yPos += 15

    // Attendance Statistics
    doc.setFontSize(12)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...hexToRgb(pdfSettings.secondaryColor))
    doc.text('ATTENDANCE RECORD', pageWidth / 2, yPos, { align: 'center' })

    yPos += 10

    if (attendanceData) {
      const attStats = [
        ['Total School Days', attendanceData.totalDays.toString()],
        ['Days Present', attendanceData.presentDays.toString()],
        ['Days Absent', attendanceData.absentDays.toString()],
        ['Attendance Percentage', `${attendanceData.percentage}%`]
      ]

      doc.setFontSize(11)
      attStats.forEach((row, index) => {
        const rowY = yPos + (index * 8)

        doc.setFont(PDF_FONTS.secondary, 'bold')
        doc.setTextColor(...hexToRgb(pdfSettings.textColor))
        doc.text(row[0] + ':', margins.left + 20, rowY)

        doc.setFont(PDF_FONTS.secondary, 'normal')
        doc.setTextColor(...hexToRgb(pdfSettings.secondaryColor))
        doc.text(row[1], margins.left + 90, rowY)
      })

      yPos += (attStats.length * 8) + 15
    } else {
      doc.setFontSize(10)
      doc.setFont(PDF_FONTS.secondary, 'italic')
      doc.setTextColor(150, 150, 150)
      doc.text('No attendance data available', pageWidth / 2, yPos, { align: 'center' })
      yPos += 15
    }

    // Certificate Text
    doc.setFontSize(11)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))

    const certificateText = attendanceData
      ? `This is to certify that ${studentFullName}, son/daughter of ${studentData.father_name || 'N/A'}, studying in ${className}, has maintained an attendance record of ${attendanceData.percentage}% during the academic session ${sessionText}. The student has attended ${attendanceData.presentDays} days out of ${attendanceData.totalDays} total school days.`
      : `This is to certify that ${studentFullName}, son/daughter of ${studentData.father_name || 'N/A'}, is a registered student of ${className} for the academic session ${sessionText}.`

    doc.text(certificateText, margins.left, yPos, {
      maxWidth: pageWidth - margins.left - margins.right,
      align: 'justify',
      lineHeightFactor: 1.6
    })

    yPos += 30

    // Remarks
    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'italic')
    const remarks = attendanceData && parseFloat(attendanceData.percentage) >= 75
      ? 'The student has maintained satisfactory attendance as per school policy.'
      : 'This certificate is issued as per the student\'s attendance record in our school.'

    doc.text(remarks, margins.left, yPos, {
      maxWidth: pageWidth - margins.left - margins.right,
      align: 'center'
    })

    // Signature Section
    const signY = pageHeight - 60

    // Class Teacher
    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(pdfSettings.textColor))
    doc.setDrawColor(...hexToRgb(pdfSettings.textColor))
    doc.line(margins.left, signY, margins.left + 50, signY)
    doc.text('Class Teacher', margins.left + 25, signY + 5, { align: 'center' })

    // Principal
    doc.line(pageWidth - margins.right - 50, signY, pageWidth - margins.right, signY)
    doc.text('Principal', pageWidth - margins.right - 25, signY + 5, { align: 'center' })
    doc.text(schoolDataToUse?.name || 'School Name', pageWidth - margins.right - 25, signY + 10, { align: 'center' })

    // School Seal
    doc.setFontSize(8)
    doc.text('(School Seal)', pageWidth / 2, signY + 20, { align: 'center' })
    doc.setDrawColor(...hexToRgb(pdfSettings.primaryColor))
    doc.setLineWidth(0.5)
    doc.circle(pageWidth / 2, signY + 30, 15, 'S')

    return doc
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            zIndex: 9999,
          },
        }}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
            <FileText className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Certificates</h1>
        </div>
        <button
          onClick={() => setShowCertificateSettings(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#D12323] text-white rounded-lg hover:bg-red-700 transition"
        >
          <Settings className="w-4 h-4" />
          Certificate Settings
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative flex items-center gap-2">
          <Check size={20} />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Selection Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Certificate Type Selection */}
          <div>
            <label className="block text-gray-700 font-semibold text-sm mb-2">
              Certificate Type <span className="text-red-500">*</span>
            </label>
            <select
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="character">Character Certificate</option>
              <option value="leaving">Leaving Certificate</option>
              <option value="attendance">Attendance Certificate</option>
            </select>
          </div>

          {/* Class Selection */}
          <div>
            <label className="block text-gray-700 font-semibold text-sm mb-2">
              Select Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value)
                setSelectedSection('')
                setSelectedStudent(null)
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selection */}
          {selectedClass && (
            <div>
              <label className="block text-gray-700 font-semibold text-sm mb-2">
                Select Section <span className="text-red-500">*</span>
              </label>
              {sections.length === 0 ? (
                <div className="w-full px-4 py-3 border border-blue-300 rounded-lg bg-blue-50 text-blue-700 text-sm">
                  <AlertCircle size={16} className="inline mr-2" />
                  No sections found. Showing all students from this class.
                </div>
              ) : (
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value)
                    setSelectedStudent(null)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Select Section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.section_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Certificate For */}
          {(selectedSection || (selectedClass && sections.length === 0)) && (
            <div>
              <label className="block text-gray-700 font-semibold text-sm mb-2">
                Certificate For <span className="text-red-500">*</span>
              </label>
              <select
                value={certificateFor}
                onChange={(e) => {
                  setCertificateFor(e.target.value)
                  setSelectedStudent(null)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="individual">Individual Student</option>
                <option value="section">{sections.length === 0 ? 'Full Class' : 'Full Section'}</option>
              </select>
            </div>
          )}
        </div>

        {/* Students List */}
        {(selectedSection || (selectedClass && sections.length === 0)) && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {certificateFor === 'individual' ? 'Select Student' : sections.length === 0 ? 'Students in Class' : 'Students in Section'}
            </h3>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 size={40} className="animate-spin text-red-600" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No students found in this section</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                          {student.gender === 'female' ? '👧' : '👦'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">
                            {student.first_name} {student.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">Adm: {student.admission_number}</p>
                        </div>
                      </div>
                      {certificateFor === 'individual' && (
                        <button
                          onClick={() => handleGenerateCertificatePDF(student, certificateType)}
                          className="mt-3 w-full bg-[#D12323] text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Generate Certificate
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Generate All Button for Full Section */}
                {certificateFor === 'section' && (
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setCertificateFor('individual')
                      }}
                      className="px-8 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        setError(null)
                        setSuccess(null)
                        setSaving(true)
                        try {
                          let generatedCount = 0
                          let skippedCount = 0

                          // Fetch school_id first
                          const { data: schools, error: schoolError } = await supabase
                            .from('schools')
                            .select('id')
                            .limit(1)
                            .single()

                          if (schoolError) throw new Error('Unable to fetch school information')

                          // For full section, generate certificates for all students
                          for (const student of students) {
                            // Check if certificate already exists for this student
                            const { data: existingCert, error: checkError } = await supabase
                              .from('student_certificates')
                              .select('id')
                              .eq('student_id', student.id)
                              .eq('school_id', schools.id)
                              .eq('certificate_type', certificateType)
                              .limit(1)

                            if (!checkError && existingCert && existingCert.length > 0) {
                              // Certificate already exists, skip
                              skippedCount++
                              continue
                            }

                            // Generate certificate (skip validation since we already checked)
                            await handleGenerateCertificatePDF(student, certificateType, true)
                            generatedCount++
                            // Small delay between downloads to prevent browser issues
                            await new Promise(resolve => setTimeout(resolve, 300))
                          }

                          // Show appropriate toast based on results
                          if (skippedCount > 0 && generatedCount === 0) {
                            // All certificates already exist
                            toast(`All ${skippedCount} student(s) already have valid certificates!`, {
                              duration: 4000,
                              position: 'top-right',
                              style: {
                                background: '#ef4444',
                                color: '#fff',
                                fontWeight: '500',
                                zIndex: 9999,
                              },
                              icon: '✕',
                            })
                          } else if (generatedCount > 0 && skippedCount === 0) {
                            // All certificates were generated
                            toast.success(`Successfully generated ${generatedCount} certificate(s)!`, {
                              duration: 4000,
                              position: 'top-right',
                              style: {
                                zIndex: 9999,
                              },
                            })
                          } else if (generatedCount > 0 && skippedCount > 0) {
                            // Some generated, some skipped
                            toast.success(`Generated ${generatedCount} certificate(s). ${skippedCount} student(s) already had valid certificates.`, {
                              duration: 4000,
                              position: 'top-right',
                              style: {
                                zIndex: 9999,
                              },
                            })
                          } else {
                            // No students selected or other case
                            toast('No certificates were generated.', {
                              duration: 3000,
                              position: 'top-right',
                              style: {
                                zIndex: 9999,
                              },
                              icon: 'ℹ️',
                            })
                          }
                        } catch (err) {
                          console.error('Certificate generation error:', err)
                          toast.error(`Error generating certificates: ${err.message || 'Unknown error'}`, {
                            duration: 4000,
                            position: 'top-right',
                            style: {
                              zIndex: 9999,
                            },
                          })
                        } finally {
                          setSaving(false)
                        }
                      }}
                      disabled={saving}
                      className="px-8 py-3 bg-[#D12323] text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          Generate All Certificates
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedClass && (
          <div className="text-center py-16">
            <FileText size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg mb-2">Select a class to generate certificate</p>
            <p className="text-gray-400 text-sm">Total Students: {students.length}</p>
          </div>
        )}
      </div>

      {/* Certificate Preview Modal */}
      {showPreview && selectedStudent && (
        <>
          <div
            className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-md z-[9998] transition-opacity"
            style={{ position: 'fixed', margin: 0 }}
            onClick={() => !saving && setShowPreview(false)}
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Certificate Details</h3>
                  <button
                    onClick={() => !saving && setShowPreview(false)}
                    disabled={saving}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition disabled:opacity-50"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Student Info */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Student Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Admission No:</span>
                      <span className="ml-2 font-semibold">{selectedStudent.admission_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Father Name:</span>
                      <span className="ml-2 font-semibold">{selectedStudent.father_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Date of Birth:</span>
                      <span className="ml-2 font-semibold">{selectedStudent.date_of_birth || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  disabled={saving}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition border border-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCertificate}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleGenerateCertificatePDF(selectedStudent, certificateType)}
                  className="flex-1 px-6 py-3 bg-[#D12323] text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Certificate Settings Modal */}
      {showCertificateSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Certificate Settings</h2>
              <button
                onClick={() => setShowCertificateSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header & Branding */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-gray-700">HEADER & BRANDING</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Institute Name
                    </label>
                    <input
                      type="text"
                      value={certificateSettings.instituteName}
                      onChange={(e) => handleCertificateSettingChange('instituteName', e.target.value)}
                      placeholder="e.g., Superior College Bhakkar"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Institute Location
                    </label>
                    <input
                      type="text"
                      value={certificateSettings.instituteLocation}
                      onChange={(e) => handleCertificateSettingChange('instituteLocation', e.target.value)}
                      placeholder="e.g., Bhakkar"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Certificate Title
                    </label>
                    <input
                      type="text"
                      value={certificateSettings.certificateTitle}
                      onChange={(e) => handleCertificateSettingChange('certificateTitle', e.target.value)}
                      placeholder="e.g., Character Certificate"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showSchoolLogo"
                        checked={certificateSettings.showSchoolLogo}
                        onChange={(e) => handleCertificateSettingChange('showSchoolLogo', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="showSchoolLogo" className="text-sm font-medium text-gray-700">
                        Show School Logo
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Logo Size</label>
                      <select
                        value={certificateSettings.logoSize}
                        onChange={(e) => handleCertificateSettingChange('logoSize', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">COLOR SETTINGS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Border Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={certificateSettings.borderColor}
                        onChange={(e) => handleCertificateSettingChange('borderColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={certificateSettings.borderColor}
                        onChange={(e) => handleCertificateSettingChange('borderColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Header Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={certificateSettings.headerTextColor}
                        onChange={(e) => handleCertificateSettingChange('headerTextColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={certificateSettings.headerTextColor}
                        onChange={(e) => handleCertificateSettingChange('headerTextColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={certificateSettings.textColor}
                        onChange={(e) => handleCertificateSettingChange('textColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={certificateSettings.textColor}
                        onChange={(e) => handleCertificateSettingChange('textColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Accent Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={certificateSettings.accentColor}
                        onChange={(e) => handleCertificateSettingChange('accentColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={certificateSettings.accentColor}
                        onChange={(e) => handleCertificateSettingChange('accentColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificate Content Template */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">CERTIFICATE CONTENT</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Certificate Text Template
                      <span className="text-gray-500 font-normal ml-2">(Use {`{studentName}`}, {`{fatherName}`}, {`{collegeName}`}, {`{marksObtained}`}, {`{totalMarks}`}, {`{grade}`}, {`{className}`}, {`{rollNumber}`}, {`{session}`}, {`{year}`})</span>
                    </label>
                    <textarea
                      value={certificateSettings.certificateText}
                      onChange={(e) => handleCertificateSettingChange('certificateText', e.target.value)}
                      placeholder="Enter certificate text with placeholders like {studentName}, {fatherName}, etc."
                      rows={5}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Field Visibility */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">FIELD VISIBILITY</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showSerialNumber"
                      checked={certificateSettings.showSerialNumber}
                      onChange={(e) => handleCertificateSettingChange('showSerialNumber', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showSerialNumber" className="text-sm text-gray-700">Serial Number</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showDate"
                      checked={certificateSettings.showDate}
                      onChange={(e) => handleCertificateSettingChange('showDate', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showDate" className="text-sm text-gray-700">Date</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showName"
                      checked={certificateSettings.showName}
                      onChange={(e) => handleCertificateSettingChange('showName', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showName" className="text-sm text-gray-700">Student Name</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showRollNo"
                      checked={certificateSettings.showRollNo}
                      onChange={(e) => handleCertificateSettingChange('showRollNo', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showRollNo" className="text-sm text-gray-700">Roll Number</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showExamination"
                      checked={certificateSettings.showExamination}
                      onChange={(e) => handleCertificateSettingChange('showExamination', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showExamination" className="text-sm text-gray-700">Examination</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showSession"
                      checked={certificateSettings.showSession}
                      onChange={(e) => handleCertificateSettingChange('showSession', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showSession" className="text-sm text-gray-700">Session</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showMarks"
                      checked={certificateSettings.showMarks}
                      onChange={(e) => handleCertificateSettingChange('showMarks', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showMarks" className="text-sm text-gray-700">Marks Obtained</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showTotalMarks"
                      checked={certificateSettings.showTotalMarks}
                      onChange={(e) => handleCertificateSettingChange('showTotalMarks', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showTotalMarks" className="text-sm text-gray-700">Total Marks</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showYear"
                      checked={certificateSettings.showYear}
                      onChange={(e) => handleCertificateSettingChange('showYear', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showYear" className="text-sm text-gray-700">Year</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showGrade"
                      checked={certificateSettings.showGrade}
                      onChange={(e) => handleCertificateSettingChange('showGrade', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showGrade" className="text-sm text-gray-700">Grade</label>
                  </div>
                </div>
              </div>

              {/* Signature Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">SIGNATURE SETTINGS</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Principal Signature Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            handleCertificateSettingChange('principalSignature', reader.result)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    {certificateSettings.principalSignature && (
                      <div className="mt-2">
                        <img src={certificateSettings.principalSignature} alt="Principal Signature" className="h-12 border border-gray-300 rounded" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Principal Title/Label
                    </label>
                    <input
                      type="text"
                      value={certificateSettings.principalTitle}
                      onChange={(e) => handleCertificateSettingChange('principalTitle', e.target.value)}
                      placeholder="e.g., Principal Signature"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      School Name in Signature
                    </label>
                    <input
                      type="text"
                      value={certificateSettings.schoolNameInSignature}
                      onChange={(e) => handleCertificateSettingChange('schoolNameInSignature', e.target.value)}
                      placeholder="e.g., Superior College Bhakkar"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Border & Design */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">BORDER & DESIGN</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="showBorder"
                      checked={certificateSettings.showBorder}
                      onChange={(e) => handleCertificateSettingChange('showBorder', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showBorder" className="text-sm font-medium text-gray-700">
                      Show Border
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Border Style</label>
                    <select
                      value={certificateSettings.borderStyle}
                      onChange={(e) => handleCertificateSettingChange('borderStyle', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="simple">Simple</option>
                      <option value="decorative">Decorative</option>
                      <option value="double">Double Line</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">FOOTER SETTINGS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="showDate"
                      checked={certificateSettings.showDate}
                      onChange={(e) => handleCertificateSettingChange('showDate', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showDate" className="text-sm font-medium text-gray-700">
                      Show Issue Date
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="showSerialNumber"
                      checked={certificateSettings.showSerialNumber}
                      onChange={(e) => handleCertificateSettingChange('showSerialNumber', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showSerialNumber" className="text-sm font-medium text-gray-700">
                      Show Serial Number
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Save Button */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCertificateSettings(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveCertificateSettings}
                className="px-4 py-2 bg-[#D12323] text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
