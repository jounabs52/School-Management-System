'use client'

import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { convertImageToBase64 } from '@/lib/pdfUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

export default function StudentIDCardsPage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [printFor, setPrintFor] = useState('individual') // 'individual' or 'all'
  const [validityUpto, setValidityUpto] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [principalSignature, setPrincipalSignature] = useState(null)
  const [principalSignaturePreview, setPrincipalSignaturePreview] = useState(null)
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [schoolData, setSchoolData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [printingStudentId, setPrintingStudentId] = useState(null)

  useEffect(() => {
    fetchClasses()
    fetchSchoolData()

    // Set default validity date to 1 year from now
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    setValidityUpto(nextYear.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchSections()
      setSelectedSection('') // Clear section when class changes
      setStudents([]) // Clear students when class changes
    } else {
      setSections([])
      setSelectedSection('')
      setStudents([])
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
        setFilteredStudents([])
      }
    } else {
      setStudents([])
      setFilteredStudents([])
    }
  }, [selectedClass, selectedSection, sections.length])

  // Filter students based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students)
    } else {
      const filtered = students.filter(student => {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
        const admNumber = student.admission_number?.toLowerCase() || ''
        return fullName.includes(searchQuery.toLowerCase()) || admNumber.includes(searchQuery.toLowerCase())
      })
      setFilteredStudents(filtered)
    }
  }, [searchQuery, students])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchSections = async () => {
    try {
      let query = supabase
        .from('sections')
        .select('id, section_name, class_id')
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      // If a specific class is selected, filter by that class
      // If 'all' is selected, get all sections
      if (selectedClass && selectedClass !== '') {
        query = query.eq('class_id', selectedClass)
      }

      const { data, error } = await query

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Error fetching sections:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('first_name', { ascending: true })

      // Filter by class if a specific class is selected
      if (selectedClass && selectedClass !== '') {
        query = query.eq('current_class_id', selectedClass)
      }

      // Filter by section
      if (selectedSection && selectedSection !== '') {
        query = query.eq('current_section_id', selectedSection)
      }

      const { data, error } = await query

      if (error) throw error
      setStudents(data || [])
      setFilteredStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
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
    } catch (error) {
      console.error('Error fetching school data:', error)
    }
  }

  const getClassName = (classId) => {
    const classObj = classes.find(c => c.id === classId)
    return classObj?.class_name || ''
  }

  const getSectionName = (sectionId) => {
    const sectionObj = sections.find(s => s.id === sectionId)
    return sectionObj?.section_name || ''
  }

  // Handle signature upload
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('File size should be less than 2MB')
        return
      }

      setPrincipalSignature(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPrincipalSignaturePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Save ID card to database and print
  const handlePrint = async (student) => {
    if (!student) {
      alert('Please select a student first')
      return
    }

    if (!validityUpto) {
      alert('Please select validity date')
      return
    }

    try {
      setPrintingStudentId(student.id)

      // Fetch school_id
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .limit(1)
        .single()

      if (schoolError) throw new Error('Unable to fetch school information')

      // Fetch active session
      let { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single()

      // If no active session exists, create a default one
      if (!session) {
        const currentYear = new Date().getFullYear()
        const { data: newSession, error: sessionCreateError } = await supabase
          .from('sessions')
          .insert({
            school_id: schools.id,
            name: `${currentYear}-${currentYear + 1}`,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(currentYear + 1, 5, 30).toISOString().split('T')[0],
            status: 'active'
          })
          .select()
          .single()

        if (sessionCreateError) {
          console.error('Session creation error:', sessionCreateError)
          throw new Error(`Unable to create session: ${sessionCreateError.message}`)
        }
        session = newSession
      }

      // Generate card number
      const cardNumber = `ID-${Date.now()}-${student.admission_number}`

      // Generate barcode
      const barcode = `${schools.id}-${student.admission_number}-${Date.now()}`

      // Save to database
      const { error } = await supabase
        .from('student_id_cards')
        .insert({
          student_id: student.id,
          school_id: schools.id,
          session_id: session.id,
          card_number: cardNumber,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: validityUpto,
          status: 'active',
          barcode: barcode
        })

      if (error) throw error

      // Print the ID card
      printIDCard(student)
    } catch (error) {
      console.error('Error saving ID card:', error)
      alert('Error saving ID card: ' + error.message)
    } finally {
      setPrintingStudentId(null)
    }
  }

  // Print ID card using jsPDF
  const printIDCard = async (student) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98] // Standard CR80 card size in mm
    })

    const cardWidth = 85.6
    const cardHeight = 53.98

    // White background for card
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, cardWidth, cardHeight, 'F')

    // Add border with rounded corners effect
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.roundedRect(1, 1, cardWidth - 2, cardHeight - 2, 2, 2, 'D')

    // Header section - Navy blue background
    doc.setFillColor(31, 58, 96) // Navy blue color
    doc.roundedRect(1, 1, cardWidth - 2, 14, 2, 2, 'F')

    // School name in header
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text((schoolData?.name || 'NORTHWOOD HIGH SCHOOL').toUpperCase(), cardWidth / 2, 7, { align: 'center' })

    // Card title - Gold color
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(184, 134, 11) // Gold color
    doc.text('STUDENT ID CARD', cardWidth / 2, 12, { align: 'center' })

    // Left section - Photo with gold border
    const photoX = 6
    const photoY = 18
    const photoSize = 20

    // Add student photo as background layer (rectangular/square)
    if (student.photo_url && student.photo_url.trim() !== '') {
      try {
        // Convert image to base64
        const photoUrl = student.photo_url

        // Create a promise to load and convert image
        const imageData = await new Promise((resolve, reject) => {
          const img = new Image()

          // Set crossOrigin before setting src
          img.crossOrigin = 'anonymous'

          img.onload = () => {
            try {
              // Create square canvas for the image
              const canvasSize = 600
              const canvas = document.createElement('canvas')
              canvas.width = canvasSize
              canvas.height = canvasSize
              const ctx = canvas.getContext('2d')

              // Enable image smoothing for better quality
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'

              // Calculate dimensions to cover the square area
              const scale = Math.max(canvasSize / img.width, canvasSize / img.height)
              const scaledWidth = img.width * scale
              const scaledHeight = img.height * scale
              const offsetX = (canvasSize - scaledWidth) / 2
              const offsetY = (canvasSize - scaledHeight) / 2

              // Draw image to cover the entire square
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

              // Convert to base64 with maximum quality
              const dataURL = canvas.toDataURL('image/jpeg', 0.98)
              resolve(dataURL)
            } catch (err) {
              console.error('Canvas error:', err)
              reject(err)
            }
          }

          img.onerror = (err) => {
            console.error('Image load error:', err)
            reject(new Error('Failed to load image'))
          }

          // Set the source last
          img.src = photoUrl
        })

        // Add rectangular/square image as background layer - fills entire photo area
        doc.addImage(imageData, 'JPEG', photoX, photoY, photoSize, photoSize)
      } catch (error) {
        console.error('Error adding photo:', error)
        // Show gray background if image fails
        doc.setFillColor(240, 240, 240)
        doc.rect(photoX, photoY, photoSize, photoSize, 'F')
      }
    } else {
      // Gray background if no photo
      doc.setFillColor(240, 240, 240)
      doc.rect(photoX, photoY, photoSize, photoSize, 'F')
    }

    // Draw thick Gold/Mustard circular border ON TOP of the image
    doc.setDrawColor(184, 134, 11) // Gold/mustard color
    doc.setLineWidth(1.5) // Thicker border
    doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'S')

    // Add second circle for extra thickness effect
    doc.setLineWidth(1.2)
    doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2 - 0.3, 'S')

    // Student name below photo in gold
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(184, 134, 11)
    const studentFullName = `${student.first_name || ''} ${student.last_name || ''}`.trim().toUpperCase()
    doc.text(studentFullName, photoX + photoSize/2, photoY + photoSize + 4, { align: 'center' })

    // QR Code area below student name
    const qrY = photoY + photoSize + 7
    const qrSize = 14

    // Generate Student ID Number
    const studentIDNumber = `NWH-2023-${student.admission_number}`

    // Generate QR code with student information
    const qrData = JSON.stringify({
      id: studentIDNumber,
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      admission: student.admission_number,
      school: schoolData?.name || 'NORTHWOOD HIGH SCHOOL'
    })

    try {
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      // Add QR code to PDF
      doc.addImage(qrCodeDataUrl, 'PNG', photoX + (photoSize - qrSize) / 2, qrY, qrSize, qrSize)
    } catch (error) {
      console.error('Error generating QR code:', error)
      // Fallback: show text if QR code fails
      doc.setFontSize(6)
      doc.setTextColor(0, 0, 0)
      doc.text('QR ERROR', photoX + photoSize/2, qrY + qrSize/2, { align: 'center' })
    }

    // ID Number below QR code
    doc.setFontSize(5.5)
    doc.setTextColor(0, 0, 0)
    doc.setFont('courier', 'bold')
    doc.text(studentIDNumber, photoX + photoSize/2, qrY + qrSize + 2, { align: 'center' })

    // Right section - Student details
    const detailsX = 32
    let detailsY = 20

    // ID Number
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('ID Number:', detailsX, detailsY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 58, 96)
    doc.text(studentIDNumber, detailsX + 18, detailsY)

    detailsY += 6

    // Father's Name
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text("Father's Name:", detailsX, detailsY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 58, 96)
    doc.text(student.father_name || 'N/A', detailsX + 18, detailsY)

    detailsY += 6

    // Issue Date and Expiry Date
    const issueDate = new Date().toLocaleDateString('en-GB')
    const expiryDate = new Date(validityUpto).toLocaleDateString('en-GB')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Issue Date:', detailsX, detailsY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 58, 96)
    doc.text(issueDate, detailsX + 18, detailsY)

    detailsY += 4

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Expiry Date:', detailsX, detailsY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 58, 96)
    doc.text(expiryDate, detailsX + 18, detailsY)

    // Principal's Signature area - positioned at bottom right
    const sigX = cardWidth - 22
    const sigY = cardHeight - 7

    // Add signature image if uploaded (without box)
    if (principalSignaturePreview) {
      try {
        // Add the signature image directly without border
        doc.addImage(principalSignaturePreview, 'PNG', sigX - 2, sigY - 5, 20, 5)
      } catch (error) {
        console.error('Error adding signature:', error)
      }
    }

    // Signature label - directly below signature
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text("Principal's Signature", sigX + 8, sigY + 1, { align: 'center' })

    // Save PDF
    const fileName = `IDCard_${student.first_name}_${student.admission_number}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-600 rounded-lg">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Identity Cards</h1>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* ID Card Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value)
                setSelectedSection('')
                setSearchQuery('')
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Validity Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validity Upto
            </label>
            <input
              type="date"
              value={validityUpto}
              onChange={(e) => setValidityUpto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Principal's Signature Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Principal's Signature
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
            {principalSignaturePreview && (
              <div className="mt-2">
                <img
                  src={principalSignaturePreview}
                  alt="Signature Preview"
                  className="h-12 border border-gray-200 rounded p-1"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section Selection - shown after class is selected */}
        {selectedClass && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section <span className="text-red-500">*</span>
              </label>
              {sections.length === 0 ? (
                <div className="w-full px-4 py-3 border border-blue-300 rounded-lg bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  No sections found. Showing all students from this class.
                </div>
              ) : (
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value)
                    setSearchQuery('')
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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

            {(selectedSection || sections.length === 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Print For <span className="text-red-500">*</span>
                </label>
                <select
                  value={printFor}
                  onChange={(e) => setPrintFor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="individual">Individual Student</option>
                  <option value="all">{sections.length === 0 ? 'All Class Students' : 'All Students'}</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Search Student - shown after section is selected */}
        {(selectedSection || (selectedClass && sections.length === 0)) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Student (Optional)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or admission number..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        )}

        {/* Students List */}
        {(selectedSection || (selectedClass && sections.length === 0)) && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {printFor === 'individual'
                ? 'Select Student'
                : sections.length === 0
                  ? `Students in ${getClassName(selectedClass)}`
                  : `Students in ${getClassName(selectedClass)} - ${getSectionName(selectedSection)}`}
            </h3>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">
                  {searchQuery ? 'No students found matching your search' : 'No students found in this section'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-3 mb-3">
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
                      {printFor === 'individual' && (
                        <button
                          onClick={() => handlePrint(student)}
                          disabled={printingStudentId === student.id}
                          className="w-full text-white py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#1E3A8A', '&:hover': { backgroundColor: '#1e40af' } }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#1e40af'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#1E3A8A'}
                        >
                          <CreditCard className="w-4 h-4" />
                          {printingStudentId === student.id ? 'Printing...' : 'Print Card'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Print All Button */}
                {printFor === 'all' && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={async () => {
                        setSaving(true)
                        try {
                          for (const student of filteredStudents) {
                            await handlePrint(student)
                            await new Promise(resolve => setTimeout(resolve, 500))
                          }
                          alert(`Generated ${filteredStudents.length} ID cards successfully!`)
                        } catch (error) {
                          alert('Error generating ID cards')
                        } finally {
                          setSaving(false)
                        }
                      }}
                      disabled={saving}
                      className="text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ backgroundColor: '#1E3A8A' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1e40af'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#1E3A8A'}
                    >
                      <CreditCard className="w-5 h-5" />
                      {saving ? 'Generating Cards...' : `Print All ${filteredStudents.length} Cards`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* No Selection Message */}
        {!selectedClass && (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Select a class and section to generate ID cards</p>
          </div>
        )}
      </div>
    </div>
  )
}
