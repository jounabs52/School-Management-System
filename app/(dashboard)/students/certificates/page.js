'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, AlertCircle, X, Download, Save, Check } from 'lucide-react'
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
      const { data: schools, error: schoolError } = await supabase
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
    const margin = 15

    // Add decorative border (brown/gold)
    addDecorativeBorder(doc, 'brown')

    // Add school logo if available
    if (schoolData?.logo) {
      try {
        const logoSize = 25
        const logoX = (pageWidth - logoSize) / 2
        const logoY = margin + 5

        // Determine image format
        let format = 'PNG'
        if (schoolData.logo.includes('data:image/jpeg') || schoolData.logo.includes('data:image/jpg')) {
          format = 'JPEG'
        }

        doc.addImage(schoolData.logo, format, logoX, logoY, logoSize, logoSize)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // School Name
    const nameY = schoolData?.logo ? margin + 35 : margin + 15
    doc.setFontSize(22)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...PDF_COLORS.secondary)
    doc.text(schoolData?.name || 'SCHOOL NAME', pageWidth / 2, nameY, { align: 'center' })

    // School Address
    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...PDF_COLORS.textDark)
    doc.text(schoolData?.address || 'School Address', pageWidth / 2, nameY + 7, { align: 'center' })

    // Certificate Title
    const titleY = nameY + 15
    doc.setFontSize(20)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...PDF_COLORS.accent)
    doc.text('Character Certificate', pageWidth / 2, titleY, { align: 'center' })

    // Group/Class
    doc.setFontSize(12)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...PDF_COLORS.textDark)
    doc.text(`Group: ${getClassName(studentData.current_class_id)}`, pageWidth / 2, titleY + 8, { align: 'center' })

    // Registration/Admission Number
    const regNo = `Registration No. ${studentData.admission_number || 'N/A'}`
    doc.setFontSize(11)
    doc.text(regNo, pageWidth / 2, titleY + 16, { align: 'center' })

    // Student Details
    const startY = titleY + 30
    const labelX = margin + 25
    const valueX = margin + 85

    doc.setFontSize(11)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...PDF_COLORS.textDark)

    // Name
    doc.text('Name of Student:', labelX, startY)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...PDF_COLORS.primary)
    doc.text(`${studentData.first_name || ''}${studentData.last_name ? ' ' + studentData.last_name : ''}`.trim() || 'N/A', valueX, startY)

    // Father's Name
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...PDF_COLORS.textDark)
    doc.text("Father's Name:", labelX, startY + 8)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...PDF_COLORS.primary)
    doc.text(studentData.father_name || 'N/A', valueX, startY + 8)

    // Date of Birth
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...PDF_COLORS.textDark)
    doc.text('Date of Birth:', labelX, startY + 16)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...PDF_COLORS.primary)
    doc.text(studentData.date_of_birth || 'N/A', valueX, startY + 16)

    // Conduct Statement
    doc.setFont(PDF_FONTS.primary, 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...PDF_COLORS.textDark)
    const conductText = `During his/her stay at this school, his/her character and conduct was found ${conductValue}.`
    doc.text(conductText, labelX, startY + 32, { maxWidth: pageWidth - 2 * labelX })

    // Date
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_COLORS.textDark)
    const currentDate = new Date().toLocaleDateString('en-GB')
    doc.text(`Date: ${currentDate}`, labelX, pageHeight - margin - 30)

    // Principal Signature
    doc.setFontSize(11)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...PDF_COLORS.textDark)
    doc.text('_____________________', pageWidth - margin - 50, pageHeight - margin - 30)
    doc.text('Principal Signature', pageWidth - margin - 50, pageHeight - margin - 25)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_COLORS.textLight)
    doc.text(schoolData?.name || 'School Name', pageWidth - margin - 50, pageHeight - margin - 20)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.textLight)
    doc.text(schoolData?.phone || '', pageWidth / 2, pageHeight - margin - 8, { align: 'center' })

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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
          <FileText className="text-white" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Certificates</h1>
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
    </div>
  )
}
