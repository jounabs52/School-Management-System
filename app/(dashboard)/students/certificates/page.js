'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, AlertCircle, X, Download, Save, Check, Settings } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import {
  addDecorativeBorder,
  convertImageToBase64,
  PDF_COLORS,
  PDF_FONTS
} from '@/lib/pdfUtils'

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
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [certificateData, setCertificateData] = useState({
    conduct: 'V.Good'
  })
  const [showCertificateSettings, setShowCertificateSettings] = useState(false)
  const [certificateSettings, setCertificateSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('certificateSettings')
      return saved ? JSON.parse(saved) : {
        // Header
        instituteName: 'Superior College Bhakkar',
        certificateTitle: 'Character Certificate',
        showSchoolLogo: true,
        logoSize: 'medium',

        // Colors
        borderColor: '#8B4513',
        headerTextColor: '#8B4513',
        textColor: '#000000',
        accentColor: '#D2691E',

        // Certificate Fields
        showDate: true,
        showGroup: true,
        showRegistrationNo: true,
        showFatherName: true,
        showDateOfBirth: true,
        showConduct: true,

        // Signature
        principalSignature: null,
        principalTitle: 'Principal',
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
      certificateTitle: 'Character Certificate',
      showSchoolLogo: true,
      logoSize: 'medium',
      borderColor: '#8B4513',
      headerTextColor: '#8B4513',
      textColor: '#000000',
      accentColor: '#D2691E',
      showDate: true,
      showGroup: true,
      showRegistrationNo: true,
      showFatherName: true,
      showDateOfBirth: true,
      showConduct: true,
      principalSignature: null,
      principalTitle: 'Principal',
      schoolNameInSignature: 'Superior College Bhakkar',
      footerText: '',
      showBorder: true,
      borderStyle: 'decorative'
    }
  })

  useEffect(() => {
    fetchClasses()
    fetchSchoolData()
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

  const handlePrintCertificate = async (student, conduct) => {
    // Use provided student or fall back to selectedStudent
    const studentData = student || selectedStudent
    const conductValue = conduct || certificateData.conduct

    if (!studentData) {
      setError('No student selected')
      return
    }

    console.log('Generating certificate for:', studentData)

    // Save to database first
    try {
      // Fetch school_id
      const { data: schools, error: schoolError} = await supabase
        .from('schools')
        .select('id')
        .limit(1)
        .single()

      if (!schoolError && schools) {
        const certificateRecord = {
          student_id: studentData.id,
          school_id: schools.id,
          certificate_type: 'character',
          issue_date: new Date().toISOString().split('T')[0],
          remarks: `Conduct: ${conductValue}`,
          created_at: new Date().toISOString()
        }

        await supabase
          .from('student_certificates')
          .insert([certificateRecord])
      }
    } catch (err) {
      console.error('Error saving certificate:', err)
      // Continue with printing even if save fails
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 12

    // Helper function to convert hex to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : [0, 0, 0]
    }

    const borderRgb = hexToRgb(certificateSettings.borderColor || '#8B4513')
    const headerRgb = hexToRgb(certificateSettings.headerTextColor || '#8B4513')
    const textRgb = hexToRgb(certificateSettings.textColor || '#000000')
    const accentRgb = hexToRgb(certificateSettings.accentColor || '#D2691E')

    // Add decorative border if enabled
    if (certificateSettings.showBorder) {
      addDecorativeBorder(doc, certificateSettings.borderColor || '#8B4513')
    }

    // Generate a simple serial number (you can customize this logic)
    const serialNumber = Math.floor(Math.random() * 1000) + 1

    // Sr. No. at top left corner (on same line, inside border)
    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Sr. No.:', margin + 5, margin + 7)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.text(serialNumber.toString(), margin + 21, margin + 7)

    // Dated at top right corner (on same line, inside border)
    const currentDate = new Date().toLocaleDateString('en-GB')
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.text('Dated:', pageWidth - margin - 38, margin + 7)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.text(currentDate, pageWidth - margin - 21, margin + 7)

    // Add school logo at top center
    if (certificateSettings.showSchoolLogo && schoolData?.logo) {
      try {
        const logoSize = 20
        const logoX = (pageWidth - logoSize) / 2
        const logoY = margin + 8

        let format = 'PNG'
        if (schoolData.logo.includes('data:image/jpeg') || schoolData.logo.includes('data:image/jpg')) {
          format = 'JPEG'
        }

        doc.addImage(schoolData.logo, format, logoX, logoY, logoSize, logoSize)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // School Name (centered, below logo)
    doc.setFontSize(20)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...headerRgb)
    const instituteName = certificateSettings.instituteName || schoolData?.name || 'Superior College Bhakkar'
    doc.text(instituteName, pageWidth / 2, margin + 35, { align: 'center' })

    // School Address/Subtitle (small text under school name)
    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...textRgb)
    doc.text(schoolData?.address || 'Bhakkar', pageWidth / 2, margin + 41, { align: 'center' })

    // Certificate Title
    doc.setFontSize(18)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...accentRgb)
    doc.text(certificateSettings.certificateTitle || 'Character Certificate', pageWidth / 2, margin + 51, { align: 'center' })

    // Student Details Section (Clean Table-like Layout)
    const detailsY = margin + 62
    const leftColX = margin + 18
    const midColX = pageWidth / 2 + 10
    const lineHeight = 7

    let currentY = detailsY

    doc.setFontSize(10)

    // Row 1: Name of Student and Roll No
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Name of Student:', leftColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    doc.text(`${studentData.first_name || ''}${studentData.last_name ? ' ' + studentData.last_name : ''}`.trim() || 'Iqbal', leftColX + 38, currentY)

    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Roll No.:', midColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    doc.text(studentData.roll_number || '77', midColX + 18, currentY)

    currentY += lineHeight

    // Row 2: Examination Passed and Session
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Examination Passed:', leftColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    doc.text('SSC', leftColX + 43, currentY)

    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Session:', midColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    const currentYear = new Date().getFullYear()
    doc.text(`${currentYear - 2}-${currentYear.toString().substr(2)}`, midColX + 18, currentY)

    currentY += lineHeight

    // Row 3: Marks Obtained and Total Marks
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Marks Obtained:', leftColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    doc.text(studentData.marks_obtained?.toString() || 'N/A', leftColX + 38, currentY)

    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Total Marks:', midColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    doc.text(studentData.total_marks?.toString() || 'N/A', midColX + 28, currentY)

    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Year:', midColX + 58, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    doc.text(currentYear.toString(), midColX + 73, currentY)

    currentY += lineHeight

    // Row 4: Grade
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Grade:', leftColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    doc.text(studentData.grade || 'N/A', leftColX + 16, currentY)

    // Principal Signature Section (bottom right)
    const signX = pageWidth - margin - 45
    const signY = pageHeight - margin - 30

    // Add signature image if available
    if (certificateSettings.principalSignature) {
      try {
        doc.addImage(certificateSettings.principalSignature, 'PNG', signX - 10, signY - 10, 30, 12)
      } catch (error) {
        console.error('Error adding signature:', error)
      }
    }

    // Signature line
    doc.setLineWidth(0.3)
    doc.setDrawColor(...textRgb)
    doc.line(signX - 15, signY + 5, signX + 30, signY + 5)

    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Principal Signature', signX + 7, signY + 10, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(0, 0, 139)
    const schoolLines = (certificateSettings.schoolNameInSignature || instituteName).split('\n')
    schoolLines.forEach((line, index) => {
      doc.text(line, signX + 7, signY + 15 + (index * 4), { align: 'center' })
    })

    // Footer
    if (certificateSettings.footerText) {
      doc.setFontSize(8)
      doc.setTextColor(...textRgb)
      doc.text(certificateSettings.footerText, pageWidth / 2, pageHeight - margin - 5, { align: 'center' })
    }

    // Save PDF
    const fileName = `Certificate_${studentData.first_name || 'Student'}_${studentData.admission_number || 'NA'}_${Date.now()}.pdf`
    doc.save(fileName)

    // Close the modal after printing (only if modal is open)
    if (selectedStudent) {
      setShowPreview(false)
      setSelectedStudent(null)
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
          {/* Certificate Type (Fixed) */}
          <div>
            <label className="block text-gray-700 font-semibold text-sm mb-2">
              Certificate Type
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              Character Certificate
            </div>
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
                          onClick={() => handleGenerateCertificate(student)}
                          className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                        >
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
                        setLoading(true)
                        try {
                          // For full section, generate certificates for all students
                          for (const student of students) {
                            handlePrintCertificate(student, 'V.Good')
                            // Small delay between downloads to prevent browser issues
                            await new Promise(resolve => setTimeout(resolve, 300))
                          }
                          setSuccess(`Successfully generated ${students.length} certificate(s)!`)
                          setTimeout(() => setSuccess(null), 5000)
                        } catch (err) {
                          console.error('Certificate generation error:', err)
                          setError('Failed to generate certificates. Please try again.')
                        } finally {
                          setLoading(false)
                        }
                      }}
                      disabled={loading}
                      className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          Print All Certificates
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => !saving && setShowPreview(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
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

                {/* Certificate Data Form */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Conduct <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={certificateData.conduct}
                      onChange={(e) => setCertificateData({ ...certificateData, conduct: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="V.Good">V.Good</option>
                      <option value="Good">Good</option>
                      <option value="Satisfactory">Satisfactory</option>
                    </select>
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
                  onClick={() => handlePrintCertificate(selectedStudent, certificateData.conduct)}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Print
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
                      placeholder="e.g., SUPILER COLLEGE BHAKKAR"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Header Subtitle
                    </label>
                    <input
                      type="text"
                      value={certificateSettings.headerSubtitle}
                      onChange={(e) => handleCertificateSettingChange('headerSubtitle', e.target.value)}
                      placeholder="e.g., CERTIFICATE OF ACHIEVEMENT"
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
                      Principal Name
                    </label>
                    <input
                      type="text"
                      value={certificateSettings.principalName}
                      onChange={(e) => handleCertificateSettingChange('principalName', e.target.value)}
                      placeholder="e.g., Dr. John Smith"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Principal Designation
                    </label>
                    <input
                      type="text"
                      value={certificateSettings.principalDesignation}
                      onChange={(e) => handleCertificateSettingChange('principalDesignation', e.target.value)}
                      placeholder="e.g., Principal"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
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
