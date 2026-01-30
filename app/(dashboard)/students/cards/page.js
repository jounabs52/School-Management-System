'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Settings, X, Download } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { convertImageToBase64 } from '@/lib/pdfUtils'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { getPdfSettings, hexToRgb, getMarginValues, getLogoSize, applyPdfSettings } from '@/lib/pdfSettings'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// ✅ Helper to get logged-in user
const getLoggedInUser = () => {
  if (typeof window === 'undefined') return { id: null, school_id: null }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return { id: user?.id, school_id: user?.school_id }
  } catch {
    return { id: null, school_id: null }
  }
}

function StudentIDCardsContent() {
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
  const [showCardSettings, setShowCardSettings] = useState(false)
  const [cardSettings, setCardSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('idCardSettings')
      return saved ? JSON.parse(saved) : {
        // Front Side - Header
        instituteName: '',
        headerSubtitle: 'STUDENT ID CARD',
        showSchoolLogo: true,
        logoSize: 'medium',
        logoPosition: 'left',
        logoShape: 'circle', // circle, square, rounded

        // Front Side - Colors
        cardBgColor: '#FFFFFF',
        headerBgColor: '#1a4d4d',
        headerTextColor: '#FFFFFF',
        accentColor: '#F4A460',
        textColor: '#000000',
        labelColor: '#666666',

        // Front Side - Photo
        photoShape: 'rectangle',
        photoSize: 'medium',
        photoPosition: 'right',
        photoBorderColor: '#000000',

        // Front Side - Fields
        showName: true,
        showRollNo: true,
        showClass: true,
        showBloodGroup: false,
        showSession: true,
        showDesignation: true,
        showExpiry: true,
        showSignature: true,

        // Signature
        signatureImage: null,

        // Front Side - Design
        showDecorativeStripe: false,
        stripeColor: '#F4A460',
        cardOrientation: 'horizontal',

        // Font Settings
        headerFont: 'helvetica',
        labelFont: 'helvetica',
        valueFont: 'helvetica',
        termsFont: 'helvetica',

        // Back Side - Header
        backHeaderText: 'Teram',
        departmentText: '',
        showBackLogo: true,
        logoShapeBack: 'circle',

        // Back Side - QR Code
        showQRCode: true,
        qrCodeData: '',
        qrCodeSize: 'medium',

        // Back Side - Terms & Conditions
        termsAndConditions: [
          'This card is property of the institution.',
          'If found, should be returned/posted to following address:',
          'Incharge, Institution Address.',
          'Ph: +92xxx-xxxxxxx Email: info@institution.edu.pk'
        ]
      }
    }
    return {
      instituteName: '',
      headerSubtitle: 'STUDENT ID CARD',
      showSchoolLogo: true,
      logoSize: 'medium',
      logoPosition: 'left',
      logoShape: 'circle',
      cardBgColor: '#FFFFFF',
      headerBgColor: '#1a4d4d',
      headerTextColor: '#FFFFFF',
      accentColor: '#F4A460',
      textColor: '#000000',
      labelColor: '#666666',
      photoShape: 'rectangle',
      photoSize: 'medium',
      photoPosition: 'right',
      photoBorderColor: '#000000',
      showName: true,
      showRollNo: true,
      showClass: true,
      showBloodGroup: false,
      showSession: true,
      showDesignation: true,
      showExpiry: true,
      showSignature: true,
      signatureImage: null,
      showDecorativeStripe: false,
      stripeColor: '#F4A460',
      cardOrientation: 'horizontal',
      headerFont: 'helvetica',
      labelFont: 'helvetica',
      valueFont: 'helvetica',
      termsFont: 'helvetica',
      backHeaderText: 'Teram',
      departmentText: '',
      showBackLogo: true,
      logoShapeBack: 'circle',
      showQRCode: true,
      qrCodeData: '',
      qrCodeSize: 'medium',
      termsAndConditions: [
        'This card is property of [Enter college/School Name], Pakistan.',
        'If found, should be returned/posted to following address:',
        'Incharge, [Enter college/School Name], Pakistan.'
      ]
    }
  })

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
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      let query = supabase
        .from('sections')
        .select('id, section_name, class_id')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      let query = supabase
        .from('students')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
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

      // Check if card already exists BEFORE saving to database
      if (await isCardValid(student.id)) {
        const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ')
        toast(`Card already generated for ${studentName}!`, {
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
        return false
      }

      // Fetch school_id
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('id', schoolId)
        .limit(1)
        .single()

      if (schoolError) throw new Error('Unable to fetch school information')

      // Fetch active session
      let { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date')
        .eq('is_current', true)
        .eq('status', 'active')
        .limit(1)
        .single()

      // If no current session exists, check for any active session
      if (!session && (!sessionError || sessionError.code === 'PGRST116')) {
        const { data: anySession } = await supabase
          .from('sessions')
          .select('id, name, start_date, end_date')
          .eq('status', 'active')
          .order('start_date', { ascending: false })
          .limit(1)
          .single()

        if (anySession) {
          session = anySession
        } else {
          // Only create session if none exists at all
          const currentYear = new Date().getFullYear()
          const currentMonth = new Date().getMonth()
          const sessionStartYear = currentMonth >= 6 ? currentYear : currentYear - 1

          const { data: newSession, error: sessionCreateError } = await supabase
            .from('sessions')
            .insert({
              school_id: schools.id,
              name: `${sessionStartYear}-${sessionStartYear + 1}`,
              start_date: `${sessionStartYear}-07-01`,
              end_date: `${sessionStartYear + 1}-06-30`,
              is_current: true,
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

      // Print the ID card (skip validation since we already checked above)
      const result = await printIDCard(student, true)

      // Show success toast
      if (result !== false) {
        const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ')
        toast.success(`ID card generated successfully for ${studentName}!`, {
          duration: 4000,
          position: 'top-right',
          style: {
            zIndex: 9999,
          },
        })
      }

      return result
    } catch (error) {
      console.error('Error saving ID card:', error)
      toast.error('Error saving ID card: ' + error.message, {
        duration: 3000,
        position: 'top-right',
        style: {
          zIndex: 9999,
        },
      })
      return false
    } finally {
      setPrintingStudentId(null)
    }
  }

  // Helper function to convert hex to RGB (kept for backward compatibility with existing card generation)
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [255, 255, 255]
  }

  // Generate Student Card PDF using centralized PDF settings
  const handleGenerateCardPDF = async (student) => {
    if (!student) {
      toast.error('Please select a student first', {
        duration: 3000,
        position: 'top-right',
        style: { zIndex: 9999 }
      })
      return
    }

    if (!validityUpto) {
      toast.error('Please select validity date', {
        duration: 3000,
        position: 'top-right',
        style: { zIndex: 9999 }
      })
      return
    }

    try {
      setPrintingStudentId(student.id)

      // Dynamically import jsPDF and jspdf-autotable
      const [{ default: jsPDF }, autoTable] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ])

      // Fetch school data
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('name, address, phone, email, logo_url')
        .eq('id', schoolId)
        .limit(1)
        .single()

      if (schoolError) throw new Error('Unable to fetch school information')

      // Get PDF settings
      const pdfSettings = getPdfSettings()

      // Create PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Apply PDF settings
      applyPdfSettings(doc, pdfSettings)

      // Get margin values
      const margins = getMarginValues(pdfSettings.margin)
      const leftMargin = margins.left
      const rightMargin = pageWidth - margins.right
      const topMargin = margins.top

      // Calculate color values from settings
      const textColorRgb = hexToRgb(pdfSettings.textColor)
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      const primaryColorRgb = hexToRgb(pdfSettings.primaryColor)

      let yPos = topMargin

      // Header background
      const headerHeight = 35
      doc.setFillColor(...headerBgColor)
      doc.rect(0, 0, pageWidth, headerHeight, 'F')

      // Logo in header
      if (pdfSettings.includeLogo && schoolData.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = schoolData.logo_url

          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const currentLogoSize = getLogoSize(pdfSettings.logoSize)
                const logoY = (headerHeight - currentLogoSize) / 2
                let logoX = 10

                if (pdfSettings.logoPosition === 'right') {
                  logoX = pageWidth - currentLogoSize - 10
                } else if (pdfSettings.logoPosition === 'center') {
                  logoX = (pageWidth - currentLogoSize) / 2
                }

                // Add logo with style
                if (pdfSettings.logoStyle === 'circle' || pdfSettings.logoStyle === 'rounded') {
                  const canvas = document.createElement('canvas')
                  const ctx = canvas.getContext('2d')
                  const size = 200
                  canvas.width = size
                  canvas.height = size

                  ctx.beginPath()
                  if (pdfSettings.logoStyle === 'circle') {
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                  } else {
                    const radius = size * 0.15
                    ctx.moveTo(radius, 0)
                    ctx.lineTo(size - radius, 0)
                    ctx.quadraticCurveTo(size, 0, size, radius)
                    ctx.lineTo(size, size - radius)
                    ctx.quadraticCurveTo(size, size, size - radius, size)
                    ctx.lineTo(radius, size)
                    ctx.quadraticCurveTo(0, size, 0, size - radius)
                    ctx.lineTo(0, radius)
                    ctx.quadraticCurveTo(0, 0, radius, 0)
                  }
                  ctx.closePath()
                  ctx.clip()
                  ctx.drawImage(img, 0, 0, size, size)

                  const clippedImage = canvas.toDataURL('image/png')
                  doc.addImage(clippedImage, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
                } else {
                  doc.addImage(img, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
                }

                resolve()
              } catch (e) {
                console.warn('Could not add logo to PDF:', e)
                resolve()
              }
            }
            img.onerror = () => {
              console.warn('Could not load logo image')
              resolve()
            }
          })
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // School name and title
      if (pdfSettings.includeHeader !== false) {
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(18)
        doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
        doc.text(schoolData.name || 'SCHOOL NAME', pageWidth / 2, 15, { align: 'center' })

        doc.setFontSize(10)
        doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'normal')
        if (schoolData.address) {
          doc.text(schoolData.address, pageWidth / 2, 22, { align: 'center' })
        }
        if (schoolData.phone) {
          doc.text(`Phone: ${schoolData.phone}`, pageWidth / 2, 28, { align: 'center' })
        }
      }

      // Title
      yPos = headerHeight + 10
      doc.setTextColor(...textColorRgb)
      doc.setFontSize(16)
      doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
      doc.text('STUDENT ID CARD', pageWidth / 2, yPos, { align: 'center' })

      // Underline
      doc.setDrawColor(...primaryColorRgb)
      doc.setLineWidth(0.5)
      doc.line(leftMargin + 30, yPos + 2, rightMargin - 30, yPos + 2)

      yPos += 15

      // Card container
      const cardX = leftMargin + 10
      const cardY = yPos
      const cardWidth = pageWidth - leftMargin - rightMargin - 20
      const cardHeight = 80

      // Card border
      doc.setDrawColor(...hexToRgb(pdfSettings.primaryColor))
      doc.setLineWidth(0.8)
      doc.rect(cardX, cardY, cardWidth, cardHeight)

      // Student photo
      const photoSize = 25
      const photoX = cardX + 5
      const photoY = cardY + 5

      if (student.photo_url && student.photo_url.trim() !== '') {
        try {
          const photoImg = new Image()
          photoImg.crossOrigin = 'anonymous'
          photoImg.src = student.photo_url

          await new Promise((resolve) => {
            photoImg.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                const size = 200
                canvas.width = size
                canvas.height = size

                ctx.beginPath()
                ctx.rect(0, 0, size, size)
                ctx.closePath()
                ctx.clip()

                const scale = Math.max(size / photoImg.width, size / photoImg.height)
                const scaledWidth = photoImg.width * scale
                const scaledHeight = photoImg.height * scale
                const offsetX = (size - scaledWidth) / 2
                const offsetY = (size - scaledHeight) / 2
                ctx.drawImage(photoImg, offsetX, offsetY, scaledWidth, scaledHeight)

                const photoData = canvas.toDataURL('image/png')
                doc.addImage(photoData, 'PNG', photoX, photoY, photoSize, photoSize)
                resolve()
              } catch (e) {
                console.warn('Could not add photo:', e)
                resolve()
              }
            }
            photoImg.onerror = () => {
              console.warn('Could not load student photo')
              resolve()
            }
          })
        } catch (error) {
          console.error('Error adding photo:', error)
        }
      } else {
        // Placeholder for no photo
        doc.setFillColor(240, 240, 240)
        doc.rect(photoX, photoY, photoSize, photoSize, 'F')
      }

      // Student details
      const detailsX = photoX + photoSize + 8
      const detailsY = cardY + 10
      const labelWidth = 35

      doc.setFontSize(parseInt(pdfSettings.fontSize) || 9)
      doc.setTextColor(...textColorRgb)

      const drawField = (label, value, y) => {
        doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'normal')
        doc.text(label + ':', detailsX, y)
        doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
        doc.text(value, detailsX + labelWidth, y)
      }

      let detailY = detailsY
      const studentFullName = `${student.first_name || ''} ${student.last_name || ''}`.trim()
      drawField('Name', studentFullName, detailY)
      detailY += 6

      drawField('Father Name', student.father_name || 'N/A', detailY)
      detailY += 6

      const className = getClassName(student.current_class_id)
      const sectionName = getSectionName(student.current_section_id)
      drawField('Class', `${className} ${sectionName}`.trim(), detailY)
      detailY += 6

      drawField('Roll Number', student.roll_number || 'N/A', detailY)
      detailY += 6

      drawField('Admission No', student.admission_number || 'N/A', detailY)
      detailY += 6

      if (student.date_of_birth) {
        const dob = new Date(student.date_of_birth)
        drawField('Date of Birth', dob.toLocaleDateString(), detailY)
        detailY += 6
      }

      if (student.blood_group) {
        drawField('Blood Group', student.blood_group, detailY)
        detailY += 6
      }

      // Additional info section
      yPos = cardY + cardHeight + 15

      doc.setFontSize(parseInt(pdfSettings.fontSize) + 1 || 10)
      doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
      doc.text('Additional Information:', leftMargin, yPos)

      yPos += 8
      doc.setFontSize(parseInt(pdfSettings.fontSize) || 9)
      doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'normal')

      if (student.address) {
        doc.text(`Address: ${student.address}`, leftMargin, yPos)
        yPos += 6
      }

      if (student.phone) {
        doc.text(`Phone: ${student.phone}`, leftMargin, yPos)
        yPos += 6
      }

      // Session and validity dates
      yPos += 5
      const currentYear = new Date().getFullYear()
      const sessionYear = `${currentYear}-${currentYear + 1}`

      doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
      doc.text(`Academic Year: ${sessionYear}`, leftMargin, yPos)
      yPos += 6

      const issueDate = new Date().toLocaleDateString()
      doc.text(`Issue Date: ${issueDate}`, leftMargin, yPos)
      yPos += 6

      const validDate = new Date(validityUpto).toLocaleDateString()
      doc.text(`Valid Until: ${validDate}`, leftMargin, yPos)

      // Footer
      if (pdfSettings.includeFooter !== false) {
        const footerY = pageHeight - 15
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(leftMargin, footerY - 5, rightMargin, footerY - 5)

        doc.setFontSize(8)
        doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'italic')
        doc.setTextColor(100, 100, 100)

        const footerText = pdfSettings.footerText || `Generated on ${new Date().toLocaleDateString()}`
        doc.text(footerText, pageWidth / 2, footerY, { align: 'center' })

        if (pdfSettings.includePageNumbers !== false) {
          doc.text('Page 1', rightMargin - 10, footerY, { align: 'right' })
        }
      }

      // Save PDF
      const fileName = `student-card-${student.admission_number || student.id}.pdf`
      doc.save(fileName)

      toast.success(`Card generated successfully for ${studentFullName}!`, {
        duration: 4000,
        position: 'top-right',
        style: { zIndex: 9999 }
      })
    } catch (error) {
      console.error('Error generating card PDF:', error)
      toast.error(`Error generating card: ${error.message}`, {
        duration: 3000,
        position: 'top-right',
        style: { zIndex: 9999 }
      })
    } finally {
      setPrintingStudentId(null)
    }
  }

  // Generate bulk cards PDF
  const handleGenerateBulkCardsPDF = async () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('No students to generate cards for', {
        duration: 3000,
        position: 'top-right',
        style: { zIndex: 9999 }
      })
      return
    }

    if (!validityUpto) {
      toast.error('Please select validity date', {
        duration: 3000,
        position: 'top-right',
        style: { zIndex: 9999 }
      })
      return
    }

    try {
      setSaving(true)
      let generatedCount = 0

      // Generate individual PDFs for each student
      for (const student of filteredStudents) {
        await handleGenerateCardPDF(student)
        generatedCount++
        // Small delay to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      toast.success(`Successfully generated ${generatedCount} student card(s)!`, {
        duration: 4000,
        position: 'top-right',
        style: { zIndex: 9999 }
      })
    } catch (error) {
      console.error('Error generating bulk cards:', error)
      toast.error(`Error generating bulk cards: ${error.message}`, {
        duration: 3000,
        position: 'top-right',
        style: { zIndex: 9999 }
      })
    } finally {
      setSaving(false)
    }
  }

  // Check if card already exists and is still valid
  const isCardValid = async (studentId) => {
    try {
      // Fetch school_id
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('id', schoolId)
        .limit(1)
        .single()

      if (schoolError) return false

      // Check database for existing active card
      const { data: existingCard, error: checkError } = await supabase
        .from('student_id_cards')
        .select('id, expiry_date, status')
        .eq('student_id', studentId)
        .eq('school_id', schools.id)
        .eq('status', 'active')
        .limit(1)

      if (checkError || !existingCard || existingCard.length === 0) {
        return false
      }

      // Check if card is expired
      const expiryDate = new Date(existingCard[0].expiry_date)
      const today = new Date()

      return expiryDate > today
    } catch (error) {
      console.error('Error checking card validity:', error)
      return false
    }
  }

  // Save card generation info
  const saveCardGeneration = (studentId, expiryDate) => {
    const generatedCards = JSON.parse(localStorage.getItem('generatedIDCards') || '{}')
    generatedCards[studentId] = {
      generatedAt: new Date().toISOString(),
      expiryDate: expiryDate
    }
    localStorage.setItem('generatedIDCards', JSON.stringify(generatedCards))
  }

  // Print ID card using jsPDF with settings
  const printIDCard = async (student, skipValidation = false) => {
    // Check if card already exists and is valid (unless in bulk mode)
    if (!skipValidation && await isCardValid(student.id)) {
      const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ')
      toast(`Card already generated for ${studentName}!`, {
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
      return false
    }
    const orientation = cardSettings.cardOrientation === 'vertical' ? 'portrait' : 'landscape'
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [85.6, 53.98]
    })

    const cardWidth = orientation === 'landscape' ? 85.6 : 53.98
    const cardHeight = orientation === 'landscape' ? 53.98 : 85.6

    // ========== FRONT SIDE ==========
    const bgColor = hexToRgb(cardSettings.cardBgColor)
    const headerColor = hexToRgb(cardSettings.headerBgColor)
    const accentColor = hexToRgb(cardSettings.accentColor)
    const textColor = hexToRgb(cardSettings.textColor)
    const labelColor = hexToRgb(cardSettings.labelColor)
    const borderColor = hexToRgb(cardSettings.photoBorderColor)

    // Card background
    doc.setFillColor(...bgColor)
    doc.rect(0, 0, cardWidth, cardHeight, 'F')

    // Define header height first
    const headerHeight = 12

    // Decorative diagonal stripe - smooth curved wave EXACTLY like reference card
    if (cardSettings.showDecorativeStripe) {
      const stripeColor = hexToRgb(cardSettings.stripeColor)
      doc.setFillColor(...stripeColor)

      // Reference card stripe starts from about 35% from LEFT (65% from right edge)
      // This creates narrower stripe covering only right portion
      const waveStartX = cardWidth * 0.35  // Start at 35% from left edge

      // Draw smooth curved diagonal wave
      doc.lines([
        [cardWidth - waveStartX, 0],      // Width of stripe at top
        [2, headerHeight],                 // Down to bottom of header
        [3, 10],                           // Gentle curve outward
        [-1, cardHeight - headerHeight - 15], // Flow down diagonally
        [-2, 5],                           // Curve in at bottom
        [-(cardWidth - waveStartX + 2), 0], // Back to left side
        [0, -cardHeight]                   // Close path
      ], waveStartX, 0, [1, 1], 'F')
    }

    // Header section - curved wave design like reference card
    doc.setFillColor(...headerColor)

    // Draw simple header rectangle (wave will be added as overlay with stripe)
    doc.rect(0, 0, cardWidth, headerHeight, 'F')

    // School logo in header with canvas clipping for shapes
    if (cardSettings.showSchoolLogo && schoolData?.logo) {
      try {
        const logoSizeMap = { small: 7, medium: 9, large: 11 }
        const logoSize = logoSizeMap[cardSettings.logoSize] || 9
        const logoY = (headerHeight - logoSize) / 2

        // Apply logo position setting
        let logoX = 2  // default left
        if (cardSettings.logoPosition === 'right') {
          logoX = cardWidth - logoSize - 2
        } else if (cardSettings.logoPosition === 'center') {
          logoX = (cardWidth - logoSize) / 2
        }

        // Process logo with canvas clipping for circular/rounded shapes
        const logoImageData = await new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              const canvasSize = 400
              const canvas = document.createElement('canvas')
              canvas.width = canvasSize
              canvas.height = canvasSize
              const ctx = canvas.getContext('2d')
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'

              // Apply clipping path based on logo shape setting
              ctx.beginPath()
              if (cardSettings.logoShape === 'circle') {
                ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2)
              } else if (cardSettings.logoShape === 'rounded') {
                const radius = canvasSize * 0.15
                ctx.moveTo(radius, 0)
                ctx.lineTo(canvasSize - radius, 0)
                ctx.quadraticCurveTo(canvasSize, 0, canvasSize, radius)
                ctx.lineTo(canvasSize, canvasSize - radius)
                ctx.quadraticCurveTo(canvasSize, canvasSize, canvasSize - radius, canvasSize)
                ctx.lineTo(radius, canvasSize)
                ctx.quadraticCurveTo(0, canvasSize, 0, canvasSize - radius)
                ctx.lineTo(0, radius)
                ctx.quadraticCurveTo(0, 0, radius, 0)
              } else {
                ctx.rect(0, 0, canvasSize, canvasSize)
              }
              ctx.closePath()
              ctx.clip()

              // Draw logo centered
              const scale = Math.max(canvasSize / img.width, canvasSize / img.height)
              const scaledWidth = img.width * scale
              const scaledHeight = img.height * scale
              const offsetX = (canvasSize - scaledWidth) / 2
              const offsetY = (canvasSize - scaledHeight) / 2
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

              resolve(canvas.toDataURL('image/png', 0.98))
            } catch (err) {
              reject(err)
            }
          }
          img.onerror = () => reject(new Error('Failed to load logo'))
          img.src = schoolData.logo
        })

        doc.addImage(logoImageData, 'PNG', logoX, logoY, logoSize, logoSize)
      } catch (err) {
        console.error('Error adding logo:', err)
      }
    }

    // School name in header
    const instituteName = cardSettings.instituteName || schoolData?.name || 'SUPILER COLLEGE BHKKAR'
    const headerTextColorRgb = hexToRgb(cardSettings.headerTextColor)
    doc.setFontSize(10)
    doc.setFont(cardSettings.headerFont || 'helvetica', 'bold')
    doc.setTextColor(...headerTextColorRgb)
    doc.text(instituteName.toUpperCase(), cardWidth / 2, 6, { align: 'center' })

    // Card subtitle (customizable from settings)
    const headerSubtitle = cardSettings.headerSubtitle || 'STUDENT ID CARD'
    doc.setFontSize(5.5)
    doc.setFont(cardSettings.headerFont || 'helvetica', 'normal')
    doc.setTextColor(...headerTextColorRgb)
    doc.text(headerSubtitle.toUpperCase(), cardWidth / 2, 10, { align: 'center' })

    // Photo section - position based on settings
    const photoSizeMap = { small: 18, medium: 22, large: 26 }
    const photoSize = photoSizeMap[cardSettings.photoSize] || 22

    let photoX = cardWidth - photoSize - 4 // default right
    if (cardSettings.photoPosition === 'left') {
      photoX = 4
    } else if (cardSettings.photoPosition === 'center') {
      photoX = (cardWidth - photoSize) / 2
    }
    const photoY = 15

    // Add student photo with shape clipping
    if (student.photo_url && student.photo_url.trim() !== '') {
      try {
        const imageData = await new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              const canvasSize = 600
              const canvas = document.createElement('canvas')
              canvas.width = canvasSize
              canvas.height = canvasSize
              const ctx = canvas.getContext('2d')
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'

              // Apply clipping path based on photo shape setting
              ctx.beginPath()
              if (cardSettings.photoShape === 'circle') {
                // Circular clip
                ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2)
              } else if (cardSettings.photoShape === 'rounded') {
                // Rounded rectangle clip
                const radius = canvasSize * 0.15
                ctx.moveTo(radius, 0)
                ctx.lineTo(canvasSize - radius, 0)
                ctx.quadraticCurveTo(canvasSize, 0, canvasSize, radius)
                ctx.lineTo(canvasSize, canvasSize - radius)
                ctx.quadraticCurveTo(canvasSize, canvasSize, canvasSize - radius, canvasSize)
                ctx.lineTo(radius, canvasSize)
                ctx.quadraticCurveTo(0, canvasSize, 0, canvasSize - radius)
                ctx.lineTo(0, radius)
                ctx.quadraticCurveTo(0, 0, radius, 0)
              } else {
                // Rectangle (no clipping, just draw rect path)
                ctx.rect(0, 0, canvasSize, canvasSize)
              }
              ctx.closePath()
              ctx.clip()

              // Draw image centered and cropped to fill the canvas
              const scale = Math.max(canvasSize / img.width, canvasSize / img.height)
              const scaledWidth = img.width * scale
              const scaledHeight = img.height * scale
              const offsetX = (canvasSize - scaledWidth) / 2
              const offsetY = (canvasSize - scaledHeight) / 2
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

              resolve(canvas.toDataURL('image/png', 0.98))
            } catch (err) {
              reject(err)
            }
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = student.photo_url
        })

        doc.addImage(imageData, 'PNG', photoX, photoY, photoSize, photoSize)
      } catch (error) {
        console.error('Error adding photo:', error)
        doc.setFillColor(240, 240, 240)
        doc.rect(photoX, photoY, photoSize, photoSize, 'F')
      }
    } else {
      doc.setFillColor(240, 240, 240)
      doc.rect(photoX, photoY, photoSize, photoSize, 'F')
    }

    // Photo border - thicker border like reference card (always black for visibility)
    doc.setDrawColor(0, 0, 0)  // Force black border
    doc.setLineWidth(1.5)
    if (cardSettings.photoShape === 'circle') {
      doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'S')
    } else if (cardSettings.photoShape === 'rounded') {
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, 'S')
    } else {
      doc.rect(photoX, photoY, photoSize, photoSize, 'S')
    }

    // Student details section - position opposite to photo
    let detailsX = 4
    const maxDetailsWidth = cardWidth - photoSize - 12

    // If photo is on right, details go left; if photo is left, details go right
    if (cardSettings.photoPosition === 'left') {
      detailsX = photoX + photoSize + 4
    } else if (cardSettings.photoPosition === 'center') {
      detailsX = 4
    }

    let detailsY = 18
    const labelWidth = 22
    const studentIDNumber = `NWH-2023-${student.admission_number}`

    // Helper function to draw field with colon alignment - matching reference card
    const drawField = (label, value, y) => {
      doc.setFontSize(7)
      doc.setFont(cardSettings.labelFont || 'helvetica', 'normal')
      doc.setTextColor(...labelColor)
      doc.text(label, detailsX, y)

      doc.setFontSize(7.5)
      doc.setFont(cardSettings.valueFont || 'helvetica', 'bold')
      doc.setTextColor(...textColor)
      doc.text(':', detailsX + labelWidth, y)
      doc.text(value, detailsX + labelWidth + 3, y)
    }

    if (cardSettings.showName) {
      const studentFullName = `${student.first_name || ''} ${student.last_name || ''}`.trim()
      drawField('Name', studentFullName, detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showRollNo) {
      drawField('Roll No', studentIDNumber, detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showClass) {
      const className = getClassName(student.current_class_id)
      const sectionName = getSectionName(student.current_section_id)
      drawField('Class', `${className} ${sectionName}`, detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showBloodGroup && student.blood_group) {
      drawField('Blood Group', student.blood_group, detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showSession) {
      drawField('Session', '2023-2027', detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showDesignation) {
      drawField('Designation', 'Student', detailsY)
      detailsY += 5.5
    }

    // Expiry date with accent color background highlight at bottom left - matching reference
    if (cardSettings.showExpiry) {
      // Format date as DD-MM-YY with dashes like reference card
      const expiryDateObj = new Date(validityUpto)
      const day = String(expiryDateObj.getDate()).padStart(2, '0')
      const month = String(expiryDateObj.getMonth() + 1).padStart(2, '0')
      const year = String(expiryDateObj.getFullYear()).slice(-2)
      const expiryDate = `${day}-${month}-${year}`

      // Accent color background box for expiry - bottom left
      const expiryBoxX = 3
      const expiryBoxY = cardHeight - 7.5
      const expiryBoxWidth = 30
      const expiryBoxHeight = 5.5

      doc.setFillColor(...accentColor)
      doc.rect(expiryBoxX, expiryBoxY, expiryBoxWidth, expiryBoxHeight, 'F')

      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(`Expiry: ${expiryDate}`, expiryBoxX + 2.5, expiryBoxY + 3.8)
    }

    // Signature area - bottom right, matching reference card layout
    if (cardSettings.showSignature) {
      const sigX = cardWidth - 26
      const sigY = cardHeight - 7

      // Use signature from card settings
      if (cardSettings.signatureImage) {
        try {
          doc.addImage(cardSettings.signatureImage, 'PNG', sigX + 1, sigY - 6, 24, 6)
        } catch (error) {
          console.error('Error adding signature:', error)
        }
      }

      // Signature line - thicker and more prominent
      doc.setDrawColor(...textColor)
      doc.setLineWidth(0.5)
      doc.line(sigX, sigY, sigX + 24, sigY)

      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColor)
      doc.text('Issuing Authority', sigX + 12, sigY + 3, { align: 'center' })
    }

    // Border
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(0, 0, cardWidth, cardHeight, 'S')

    // ========== BACK SIDE ==========
    doc.addPage()

    // Background
    doc.setFillColor(...bgColor)
    doc.rect(0, 0, cardWidth, cardHeight, 'F')

    // Decorative diagonal stripe on back - matching front EXACTLY
    if (cardSettings.showDecorativeStripe) {
      const stripeColor = hexToRgb(cardSettings.stripeColor)
      doc.setFillColor(...stripeColor)

      const backHeaderHeight = 10
      const waveStartX = cardWidth * 0.35  // Same as front - start at 35%

      // Same smooth curved wave as front
      doc.lines([
        [cardWidth - waveStartX, 0],
        [2, backHeaderHeight],
        [3, 10],
        [-1, cardHeight - backHeaderHeight - 15],
        [-2, 5],
        [-(cardWidth - waveStartX + 2), 0],
        [0, -cardHeight]
      ], waveStartX, 0, [1, 1], 'F')
    }

    // Header
    doc.setFillColor(...headerColor)
    doc.rect(0, 0, cardWidth, 10, 'F')

    // Logo on back with canvas clipping for shapes
    if (cardSettings.showBackLogo && schoolData?.logo) {
      try {
        const logoSize = 7
        const logoX = 2
        const logoY = 1.5

        // Process logo with canvas clipping for circular/rounded shapes
        const backLogoImageData = await new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              const canvasSize = 400
              const canvas = document.createElement('canvas')
              canvas.width = canvasSize
              canvas.height = canvasSize
              const ctx = canvas.getContext('2d')
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'

              // Apply clipping path based on logo shape setting
              const backLogoShape = cardSettings.logoShapeBack || cardSettings.logoShape
              ctx.beginPath()
              if (backLogoShape === 'circle') {
                ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2)
              } else if (backLogoShape === 'rounded') {
                const radius = canvasSize * 0.15
                ctx.moveTo(radius, 0)
                ctx.lineTo(canvasSize - radius, 0)
                ctx.quadraticCurveTo(canvasSize, 0, canvasSize, radius)
                ctx.lineTo(canvasSize, canvasSize - radius)
                ctx.quadraticCurveTo(canvasSize, canvasSize, canvasSize - radius, canvasSize)
                ctx.lineTo(radius, canvasSize)
                ctx.quadraticCurveTo(0, canvasSize, 0, canvasSize - radius)
                ctx.lineTo(0, radius)
                ctx.quadraticCurveTo(0, 0, radius, 0)
              } else {
                ctx.rect(0, 0, canvasSize, canvasSize)
              }
              ctx.closePath()
              ctx.clip()

              // Draw logo centered
              const scale = Math.max(canvasSize / img.width, canvasSize / img.height)
              const scaledWidth = img.width * scale
              const scaledHeight = img.height * scale
              const offsetX = (canvasSize - scaledWidth) / 2
              const offsetY = (canvasSize - scaledHeight) / 2
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

              resolve(canvas.toDataURL('image/png', 0.98))
            } catch (err) {
              reject(err)
            }
          }
          img.onerror = () => reject(new Error('Failed to load back logo'))
          img.src = schoolData.logo
        })

        doc.addImage(backLogoImageData, 'PNG', logoX, logoY, logoSize, logoSize)
      } catch (err) {
        console.error('Error adding back logo:', err)
      }
    }

    // Back header text - department/faculty name
    const backHeaderText = cardSettings.backHeaderText || 'STUDENT CARD'
    const departmentText = cardSettings.departmentText || ''

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...headerTextColorRgb)

    // If department text is provided, show it instead
    if (departmentText) {
      doc.text(departmentText.toUpperCase(), cardWidth / 2, 6, { align: 'center' })
    } else {
      doc.text(backHeaderText.toUpperCase(), cardWidth / 2, 6, { align: 'center' })
    }

    // "TERMS & CONDITIONS" heading
    let backY = 16
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textColor)
    doc.text('TERMS & CONDITIONS', cardWidth / 2, backY, { align: 'center' })
    backY += 6

    // Terms & Conditions - formatted like reference card
    if (cardSettings.termsAndConditions && cardSettings.termsAndConditions.length > 0) {
      doc.setFontSize(6.5)
      doc.setFont(cardSettings.termsFont || 'helvetica', 'normal')
      doc.setTextColor(...textColor)

      cardSettings.termsAndConditions.forEach((term, index) => {
        if (term && term.trim()) {
          const bulletPoint = '•     '
          const termText = bulletPoint + term
          // Adjust maxWidth to account for QR code on right side
          const maxWidth = cardWidth - 32
          const lines = doc.splitTextToSize(termText, maxWidth)
          lines.forEach((line, lineIndex) => {
            if (backY < cardHeight - 10) {
              // Indent continuation lines
              const xPos = lineIndex === 0 ? 6 : 12
              doc.text(line, xPos, backY)
              backY += 3.8
            }
          })
        }
      })
    }

    // QR Code on back - positioned higher and to the right like reference card
    if (cardSettings.showQRCode) {
      const qrSizeMap = { small: 14, medium: 18, large: 22 }
      const qrSize = qrSizeMap[cardSettings.qrCodeSize] || 18
      const qrX = cardWidth - qrSize - 5
      const qrY = cardHeight / 2 - qrSize / 2 + 5

      // Generate real QR code
      try {
        const qrData = cardSettings.qrCodeData || `ID:${student.admission_number}`
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })

        // Add the QR code image
        doc.addImage(qrCodeDataURL, 'PNG', qrX, qrY, qrSize, qrSize)
      } catch (error) {
        console.error('Error generating QR code:', error)
        // Fallback: draw placeholder
        doc.setDrawColor(...textColor)
        doc.setLineWidth(0.5)
        doc.rect(qrX, qrY, qrSize, qrSize, 'S')
        doc.setFontSize(4)
        doc.setTextColor(...labelColor)
        doc.text('QR Error', qrX + qrSize/2, qrY + qrSize/2, { align: 'center' })
      }
    }

    // Border
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(0, 0, cardWidth, cardHeight, 'S')

    // Save PDF
    const fileName = `IDCard_${student.first_name}_${student.admission_number}.pdf`
    doc.save(fileName)

    // Save card generation info to localStorage
    saveCardGeneration(student.id, validityUpto)

    return true
  }

  const handleCardSettingSave = () => {
    localStorage.setItem('idCardSettings', JSON.stringify(cardSettings))
    setShowCardSettings(false)
    toast.success('Card settings saved successfully!', {
      duration: 3000,
      position: 'top-right',
      style: {
        zIndex: 9999,
      },
    })
  }

  const handleCardSettingChange = (key, value) => {
    setCardSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-1.5 sm:p-1.5 md:p-3 lg:p-3 xl:p-3">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            zIndex: 9999,
          },
        }}
      />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 mb-3 sm:mb-4 md:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="p-1.5 sm:p-1.5 md:p-3 bg-red-600 rounded-lg">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800">Identity Cards</h1>
        </div>
        <button
          onClick={() => setShowCardSettings(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-3 py-1.5 sm:py-2 bg-[#D12323] text-white rounded-lg hover:bg-red-700 transition text-xs sm:text-sm md:text-base"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Card Settings</span>
          <span className="sm:hidden">Settings</span>
        </button>
      </div>

      {/* Card Settings Modal */}
      {showCardSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-1 sm:p-1.5 md:p-3">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xl w-[98%] sm:max-w-xl lg:max-w-2xl max-h-[98vh] sm:max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-2.5 sm:px-3 md:px-3 py-2 sm:py-2.5 md:py-4 flex items-center justify-between">
              <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-800">ID Card Settings</h2>
              <button
                onClick={() => setShowCardSettings(false)}
                className="p-1.5 sm:p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-1.5 sm:p-3 md:p-3 lg:p-3 space-y-3 sm:space-y-4 md:space-y-4">
              {/* Header & Branding */}
              <div>
                <h3 className="text-sm font-semibold mb-1.5 sm:mb-3 text-gray-700">HEADER & BRANDING</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Institute Name (Main Header)
                    </label>
                    <input
                      type="text"
                      value={cardSettings.instituteName}
                      onChange={(e) => handleCardSettingChange('instituteName', e.target.value)}
                      placeholder="e.g., [Enter college/School Name]"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Header Subtitle
                    </label>
                    <input
                      type="text"
                      value={cardSettings.headerSubtitle}
                      onChange={(e) => handleCardSettingChange('headerSubtitle', e.target.value)}
                      placeholder="e.g., STUDENT ID CARD"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <input
                        type="checkbox"
                        id="showSchoolLogo"
                        checked={cardSettings.showSchoolLogo}
                        onChange={(e) => handleCardSettingChange('showSchoolLogo', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="showSchoolLogo" className="text-sm font-medium text-gray-700">
                        Show Logo
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Logo Shape</label>
                      <select
                        value={cardSettings.logoShape}
                        onChange={(e) => handleCardSettingChange('logoShape', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="circle">Circle</option>
                        <option value="square">Square</option>
                        <option value="rounded">Rounded</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Logo Size</label>
                      <select
                        value={cardSettings.logoSize}
                        onChange={(e) => handleCardSettingChange('logoSize', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Logo Position</label>
                      <select
                        value={cardSettings.logoPosition}
                        onChange={(e) => handleCardSettingChange('logoPosition', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  {/* Signature Upload */}
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Signature Image (for ID cards)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            handleCardSettingChange('signatureImage', reader.result)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    {cardSettings.signatureImage && (
                      <div className="mt-2">
                        <img src={cardSettings.signatureImage} alt="Signature" className="h-10 border border-gray-300 rounded" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Color Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">COLOR SETTINGS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Card Background
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cardSettings.cardBgColor}
                        onChange={(e) => handleCardSettingChange('cardBgColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cardSettings.cardBgColor}
                        onChange={(e) => handleCardSettingChange('cardBgColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Header Background
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cardSettings.headerBgColor}
                        onChange={(e) => handleCardSettingChange('headerBgColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cardSettings.headerBgColor}
                        onChange={(e) => handleCardSettingChange('headerBgColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Header Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cardSettings.headerTextColor}
                        onChange={(e) => handleCardSettingChange('headerTextColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cardSettings.headerTextColor}
                        onChange={(e) => handleCardSettingChange('headerTextColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Accent Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cardSettings.accentColor}
                        onChange={(e) => handleCardSettingChange('accentColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cardSettings.accentColor}
                        onChange={(e) => handleCardSettingChange('accentColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cardSettings.textColor}
                        onChange={(e) => handleCardSettingChange('textColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cardSettings.textColor}
                        onChange={(e) => handleCardSettingChange('textColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Label Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cardSettings.labelColor}
                        onChange={(e) => handleCardSettingChange('labelColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cardSettings.labelColor}
                        onChange={(e) => handleCardSettingChange('labelColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">STUDENT PHOTO</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Photo Shape
                    </label>
                    <select
                      value={cardSettings.photoShape}
                      onChange={(e) => handleCardSettingChange('photoShape', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="circle">Circle</option>
                      <option value="rounded">Rounded</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Photo Size
                    </label>
                    <select
                      value={cardSettings.photoSize}
                      onChange={(e) => handleCardSettingChange('photoSize', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Photo Position
                    </label>
                    <select
                      value={cardSettings.photoPosition}
                      onChange={(e) => handleCardSettingChange('photoPosition', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Photo Border Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cardSettings.photoBorderColor}
                        onChange={(e) => handleCardSettingChange('photoBorderColor', e.target.value)}
                        className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cardSettings.photoBorderColor}
                        onChange={(e) => handleCardSettingChange('photoBorderColor', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Front Side Fields */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">FRONT SIDE FIELDS</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showName"
                      checked={cardSettings.showName}
                      onChange={(e) => handleCardSettingChange('showName', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showName" className="text-sm text-gray-700">Name</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showRollNo"
                      checked={cardSettings.showRollNo}
                      onChange={(e) => handleCardSettingChange('showRollNo', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showRollNo" className="text-sm text-gray-700">Roll No</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showClass"
                      checked={cardSettings.showClass}
                      onChange={(e) => handleCardSettingChange('showClass', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showClass" className="text-sm text-gray-700">Class</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showBloodGroup"
                      checked={cardSettings.showBloodGroup}
                      onChange={(e) => handleCardSettingChange('showBloodGroup', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showBloodGroup" className="text-sm text-gray-700">Blood Group</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showSession"
                      checked={cardSettings.showSession}
                      onChange={(e) => handleCardSettingChange('showSession', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showSession" className="text-sm text-gray-700">Session</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showDesignation"
                      checked={cardSettings.showDesignation}
                      onChange={(e) => handleCardSettingChange('showDesignation', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showDesignation" className="text-sm text-gray-700">Designation</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showExpiry"
                      checked={cardSettings.showExpiry}
                      onChange={(e) => handleCardSettingChange('showExpiry', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showExpiry" className="text-sm text-gray-700">Expiry Date</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showSignature"
                      checked={cardSettings.showSignature}
                      onChange={(e) => handleCardSettingChange('showSignature', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showSignature" className="text-sm text-gray-700">Signature</label>
                  </div>
                </div>
              </div>

              {/* Card Design */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">CARD DESIGN</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Card Orientation
                    </label>
                    <select
                      value={cardSettings.cardOrientation}
                      onChange={(e) => handleCardSettingChange('cardOrientation', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="vertical">Vertical (Portrait)</option>
                      <option value="horizontal">Horizontal (Landscape)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Font Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">FONT SETTINGS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Header Font
                    </label>
                    <select
                      value={cardSettings.headerFont}
                      onChange={(e) => handleCardSettingChange('headerFont', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="helvetica">Helvetica - Clean & Modern</option>
                      <option value="times">Times New Roman - Classic Serif</option>
                      <option value="courier">Courier - Monospace</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Label Font (Name, Roll No, etc.)
                    </label>
                    <select
                      value={cardSettings.labelFont}
                      onChange={(e) => handleCardSettingChange('labelFont', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="helvetica">Helvetica - Clean & Modern</option>
                      <option value="times">Times New Roman - Classic Serif</option>
                      <option value="courier">Courier - Monospace</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Value Font (Student Data)
                    </label>
                    <select
                      value={cardSettings.valueFont}
                      onChange={(e) => handleCardSettingChange('valueFont', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="helvetica">Helvetica - Clean & Modern</option>
                      <option value="times">Times New Roman - Classic Serif</option>
                      <option value="courier">Courier - Monospace</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Terms & Conditions Font
                    </label>
                    <select
                      value={cardSettings.termsFont}
                      onChange={(e) => handleCardSettingChange('termsFont', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="helvetica">Helvetica - Clean & Modern</option>
                      <option value="times">Times New Roman - Classic Serif</option>
                      <option value="courier">Courier - Monospace</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Back Side Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">BACK SIDE SETTINGS</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Header Text
                    </label>
                    <input
                      type="text"
                      value={cardSettings.backHeaderText}
                      onChange={(e) => handleCardSettingChange('backHeaderText', e.target.value)}
                      placeholder="e.g., TERMS & CONDITIONS"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Department/Faculty Text
                    </label>
                    <input
                      type="text"
                      value={cardSettings.departmentText}
                      onChange={(e) => handleCardSettingChange('departmentText', e.target.value)}
                      placeholder="e.g., FACULTY OF COMPUTING"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showBackLogo"
                      checked={cardSettings.showBackLogo}
                      onChange={(e) => handleCardSettingChange('showBackLogo', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showBackLogo" className="text-sm font-medium text-gray-700">
                      Show Logo on Back
                    </label>
                  </div>
                </div>
              </div>

              {/* QR Code Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">QR CODE SETTINGS</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showQRCode"
                      checked={cardSettings.showQRCode}
                      onChange={(e) => handleCardSettingChange('showQRCode', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="showQRCode" className="text-sm font-medium text-gray-700">
                      Show QR Code
                    </label>
                  </div>
                  {cardSettings.showQRCode && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          QR Code Data (Text to encode)
                        </label>
                        <textarea
                          value={cardSettings.qrCodeData}
                          onChange={(e) => handleCardSettingChange('qrCodeData', e.target.value)}
                          placeholder="Enter text/URL/data for QR code"
                          rows="3"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">This text will be encoded in the QR code</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          QR Code Size
                        </label>
                        <select
                          value={cardSettings.qrCodeSize}
                          onChange={(e) => handleCardSettingChange('qrCodeSize', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">TERMS & CONDITIONS</h3>
                <div className="space-y-3">
                  {(cardSettings.termsAndConditions || []).map((term, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={term}
                        onChange={(e) => {
                          const newTerms = [...(cardSettings.termsAndConditions || [])]
                          newTerms[index] = e.target.value
                          handleCardSettingChange('termsAndConditions', newTerms)
                        }}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => {
                          const newTerms = (cardSettings.termsAndConditions || []).filter((_, i) => i !== index)
                          handleCardSettingChange('termsAndConditions', newTerms)
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newTerms = [...(cardSettings.termsAndConditions || []), '']
                      handleCardSettingChange('termsAndConditions', newTerms)
                    }}
                    className="px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-sm"
                  >
                    + Add Term
                  </button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 py-2 flex justify-end gap-2">
              <button
                onClick={() => setShowCardSettings(false)}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCardSettingSave}
                className="px-3 py-2 bg-[#D12323] text-white rounded-lg hover:bg-red-700 transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 sm:p-3.5 lg:p-3">
        {/* ID Card Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2 mb-4 sm:mb-6">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value)
                setSelectedSection('')
                setSearchQuery('')
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Expiry Date
            </label>
            <input
              type="date"
              value={validityUpto}
              onChange={(e) => setValidityUpto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Section Selection - shown after class is selected */}
        {selectedClass && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2 mb-4 sm:mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Section <span className="text-red-500">*</span>
              </label>
              {sections.length === 0 ? (
                <div className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Print For <span className="text-red-500">*</span>
                </label>
                <select
                  value={printFor}
                  onChange={(e) => setPrintFor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Search Student (Optional)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or admission number..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        )}

        {/* Students List */}
        {(selectedSection || (selectedClass && sections.length === 0)) && (
          <div className="border-t border-gray-200 pt-4 sm:pt-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              {printFor === 'individual'
                ? 'Select Student'
                : sections.length === 0
                  ? `Students in ${getClassName(selectedClass)}`
                  : `Students in ${getClassName(selectedClass)} - ${getSectionName(selectedSection)}`}
            </h3>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-12 h-10 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
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
                        <div>
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Print All Button */}
                {printFor === 'all' && (
                  <div className="mt-6 flex justify-center gap-2">
                    <button
                      onClick={async () => {
                        setSaving(true)
                        try {
                          let generatedCount = 0
                          let skippedCount = 0

                          for (const student of filteredStudents) {
                            // Check if card is already valid
                            if (await isCardValid(student.id)) {
                              skippedCount++
                              continue
                            }

                            // Generate card
                            const result = await handlePrint(student)
                            if (result !== false) {
                              generatedCount++
                            }
                            await new Promise(resolve => setTimeout(resolve, 500))
                          }

                          // Show appropriate message based on results
                          if (skippedCount > 0 && generatedCount === 0) {
                            // All cards already exist
                            toast(`All ${skippedCount} student(s) already have valid ID cards!`, {
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
                            // All cards were generated
                            toast.success(`Successfully generated ${generatedCount} ID card(s)!`, {
                              duration: 4000,
                              position: 'top-right',
                              style: {
                                zIndex: 9999,
                              },
                            })
                          } else if (generatedCount > 0 && skippedCount > 0) {
                            // Some generated, some skipped
                            toast.success(`Generated ${generatedCount} card(s). ${skippedCount} student(s) already had valid cards.`, {
                              duration: 4000,
                              position: 'top-right',
                              style: {
                                zIndex: 9999,
                              },
                            })
                          } else {
                            // No students selected or other case
                            toast('No ID cards were generated.', {
                              duration: 3000,
                              position: 'top-right',
                              style: {
                                zIndex: 9999,
                              },
                              icon: 'ℹ️',
                            })
                          }
                        } catch (error) {
                          console.error('Error generating ID cards:', error)
                          toast.error(`Error generating ID cards: ${error.message || 'Unknown error'}`, {
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
                      className="text-white px-8 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

export default function StudentIDCardsPage() {
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
        <div className="w-12 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="students_cards_view"
      pageName="Student ID Cards"
    >
      <StudentIDCardsContent />
    </PermissionGuard>
  )
}
