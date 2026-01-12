'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Eye, Edit2, Trash2, Loader2, AlertCircle, X, ToggleLeft, ToggleRight, Printer, CheckCircle, Download } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { getPdfSettings, hexToRgb, getMarginValues, getLogoSize, applyPdfSettings } from '@/lib/pdfSettings'
import { addPDFFooter } from '@/lib/pdfUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// Modal Overlay Component - Uses Portal to render at document body level
const ModalOverlay = ({ children, onClose, disabled = false }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[99998]"
        style={{
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
        onClick={disabled ? undefined : onClose}
      />
      {children}
    </>,
    document.body
  )
}

// Toast Component - Matches screenshot design with pill/rounded shape
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-5 py-3 rounded-full shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}
    style={{
      animation: 'slideIn 0.3s ease-out'
    }}>
      {type === 'success' && <CheckCircle size={20} strokeWidth={2.5} />}
      {type === 'error' && <X size={20} strokeWidth={2.5} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-80 transition-opacity">
        <X size={18} strokeWidth={2.5} />
      </button>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

export default function ActiveStudentsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingSections, setLoadingSections] = useState(false)
  const [error, setError] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showOtherDetails, setShowOtherDetails] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(10)

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const [formData, setFormData] = useState({
    id: null,
    admissionNo: '',
    class: '',
    section: '',
    admissionDate: new Date().toISOString().split('T')[0],
    discount: '',
    baseFee: '',
    discountNote: '',
    photoUrl: '',
    rollNumber: '',
    house: '',
    studentName: '',
    fatherName: '',
    fatherMobile: '',
    fatherEmail: '',
    fatherCnic: '',
    fatherOccupation: '',
    fatherQualification: '',
    fatherAnnualIncome: '',
    whatsappNumber: '',
    dateOfBirth: '',
    studentCnic: '',
    studentMobile: '',
    casteRace: '',
    gender: 'male',
    birthPlace: '',
    currentAddress: '',
    city: '',
    state: '',
    postalCode: '',
    motherName: '',
    motherCnic: '',
    motherMobile: '',
    motherEmail: '',
    motherQualification: '',
    motherOccupation: '',
    motherAnnualIncome: '',
    guardianName: '',
    guardianRelation: '',
    guardianMobile: '',
    guardianEmail: '',
    emergencyContactName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    emergencyMobile: '',
    emergencyAddress: '',
    religion: '',
    nationality: 'Pakistan',
    previousSchool: '',
    previousClass: '',
    permanentAddress: '',
    medicalProblem: '',
    bloodGroup: ''
  })

  // Load current user from cookie
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
        console.log('✅ Current user loaded:', user)
      } catch (e) {
        console.error('❌ Error parsing user data:', e)
      }
    } else {
      console.error('❌ No user-data cookie found')
    }
  }, [])

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchClasses()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchStudents()
    }
  }, [selectedClass, currentUser])

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showEditModal || showViewModal || showDeleteModal) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showEditModal, showViewModal, showDeleteModal])

  const fetchClasses = async () => {
    if (!currentUser?.id || !currentUser?.school_id) {
      console.log('⏳ Waiting for currentUser to load classes...')
      return
    }

    setLoadingClasses(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, standard_fee, status')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) throw error

      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError('Failed to load classes')
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSections = async (classId) => {
    if (!classId) {
      setSections([])
      return
    }

    setLoadingSections(true)
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, section_name, status')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (error) throw error

      setSections(data || [])
    } catch (err) {
      console.error('Error fetching sections:', err)
      setSections([])
    } finally {
      setLoadingSections(false)
    }
  }

  const fetchStudents = async () => {
    if (!currentUser?.id || !currentUser?.school_id) {
      console.log('⏳ Waiting for currentUser to load...')
      return
    }

    setLoading(true)
    setError(null)
    try {
      console.log('📚 Fetching students for user:', currentUser.id, 'school:', currentUser.school_id)

      let query = supabase
        .from('students')
        .select('*')
        .eq('user_id', currentUser.id)          // ✅ Filter by user
        .eq('school_id', currentUser.school_id)      // ✅ Filter by school
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (selectedClass) {
        query = query.eq('current_class_id', selectedClass)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }

      if (!data) {
        setStudents([])
        return
      }

      const formattedStudents = data.map((student, index) => ({
        id: student.id,
        sr: index + 1,
        admNo: student.admission_number,
        name: `${student.first_name}${student.last_name ? ' ' + student.last_name : ''}`,
        father: student.father_name || 'N/A',
        class: student.current_class_id,
        session: '2024-2025',
        gender: student.gender,
        avatar: student.gender === 'female' ? '👧' : (student.gender === 'male' ? '👦' : '🧑'),
        dateOfBirth: student.date_of_birth,
        admissionDate: student.admission_date,
        status: student.status,
        photo_url: student.photo_url,
        cnic: student.admission_number
      }))

      setStudents(formattedStudents)
    } catch (err) {
      console.error('Error fetching students:', err)
      setError(`Failed to load students: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getClassName = (classId) => {
    const classObj = classes.find(c => c.id === classId)
    return classObj?.class_name || classId || 'N/A'
  }

  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      showToast('No data to export', 'error')
      return
    }

    const csvData = filteredStudents.map((student, index) => ({
      'Sr.': index + 1,
      'Session': student.session || 'N/A',
      'Class': student.class || 'N/A',
      'Student Name': student.name || 'N/A',
      'Father Name': student.father || 'N/A',
      'Admission No.': student.admNo || 'N/A',
      'CNIC': student.cnic || 'N/A',
      'Gender': student.gender || 'N/A',
      'Date of Birth': student.dateOfBirth || 'N/A',
      'Admission Date': student.admissionDate || 'N/A'
    }))

    const headers = Object.keys(csvData[0])
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    a.download = `active-students-${date}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    showToast('CSV exported successfully!', 'success')
  }

  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      student.name.toLowerCase().includes(query) ||
      student.father.toLowerCase().includes(query) ||
      student.admNo.toString().toLowerCase().includes(query) ||
      student.cnic.toString().toLowerCase().includes(query)
    )
  })

  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedClass])

  const handleView = async (student) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .single()

      if (error) {
        console.error('Error fetching student details:', error)
        showToast('Failed to load student details', 'error')
        return
      }

      let className = 'N/A'
      let sectionName = 'N/A'

      if (data.current_class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('class_name')
          .eq('id', data.current_class_id)
          .single()

        if (classData) className = classData.class_name
      }

      if (data.current_section_id) {
        const { data: sectionData } = await supabase
          .from('sections')
          .select('section_name')
          .eq('id', data.current_section_id)
          .single()

        if (sectionData) sectionName = sectionData.section_name
      }

      setSelectedStudent({
        ...data,
        className,
        sectionName,
        avatar: data.gender === 'female' ? '👧' : (data.gender === 'male' ? '👦' : '🧑')
      })
      setShowViewModal(true)
    } catch (err) {
      console.error('Error in handleView:', err)
      showToast('An error occurred while loading student details', 'error')
    }
  }

  const handlePrintStudent = async () => {
    if (!selectedStudent) return

    // Check if currentUser exists
    if (!currentUser || !currentUser.school_id) {
      console.error('Current user not found or missing school_id:', currentUser)
      showToast('User session not found. Please refresh the page.', 'error')
      return
    }

    try {
      // Load PDF settings from centralized settings with user ID
      const pdfSettings = getPdfSettings(currentUser.id)

      console.log('PDF Settings loaded for user:', currentUser.id)
      console.log('PDF Settings:', pdfSettings)
      console.log('Current user school_id:', currentUser.school_id)

      // Fetch school data for logo and name
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (schoolError) {
        console.error('Error fetching school data:', schoolError)
        throw new Error('Failed to fetch school data: ' + schoolError.message)
      }

      if (!schoolData) {
        console.error('No school data found for school_id:', currentUser.school_id)
        throw new Error('School data not found')
      }

      console.log('School data fetched:', schoolData)
      console.log('School logo URL:', schoolData?.logo_url)

      // Create PDF with settings - respect user's orientation choice
      const orientation = pdfSettings.orientation || 'portrait'
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pdfSettings.pageSize?.toLowerCase() || 'a4'
      })

      console.log('PDF created with orientation:', orientation)

      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Set page background color
      const bgRgb = hexToRgb(pdfSettings.backgroundColor || '#ffffff')
      doc.setFillColor(...bgRgb)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')

      // Calculate margins using centralized function
      const margins = getMarginValues(pdfSettings.margin)

      const primaryRgb = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.primaryColor || '#1E3A8A')
      const secondaryRgb = hexToRgb(pdfSettings.secondaryColor || '#3B82F6')
      const textRgb = hexToRgb(pdfSettings.textColor || '#000000')

      console.log('Color settings:')
      console.log('  Primary RGB:', primaryRgb, 'from', pdfSettings.headerBackgroundColor || pdfSettings.primaryColor)
      console.log('  Secondary RGB:', secondaryRgb, 'from', pdfSettings.secondaryColor)
      console.log('  Text RGB:', textRgb, 'from', pdfSettings.textColor)
      console.log('  Table Header:', pdfSettings.tableHeaderColor)
      console.log('  Alt Row:', pdfSettings.alternateRowColor)

      // Header (if enabled)
      if (pdfSettings.includeHeader !== false) {
        doc.setFillColor(...primaryRgb)
        doc.rect(0, 0, pageWidth, 40, 'F')

        // School Logo (if available) - WITH SETTINGS
        if (pdfSettings.includeLogo && schoolData?.logo_url) {
          try {
            console.log('Loading school logo from:', schoolData.logo_url)

            const logoImg = new Image()
            logoImg.crossOrigin = 'anonymous'

            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Logo load timeout')), 10000)

              logoImg.onload = () => {
                clearTimeout(timeout)
                try {
                  const currentLogoSize = getLogoSize(pdfSettings.logoSize)
                  const headerHeight = 40
                  const logoY = (headerHeight - currentLogoSize) / 2
                  let logoX = 10 // Default to left with 10mm margin

                  // Position logo based on settings
                  if (pdfSettings.logoPosition === 'center') {
                    logoX = 10 // Keep on left even if center selected (to avoid text overlap)
                  } else if (pdfSettings.logoPosition === 'right') {
                    logoX = pageWidth - currentLogoSize - 10 // Right side with 10mm margin
                  }

                  // Add logo with style
                  if (pdfSettings.logoStyle === 'circle' || pdfSettings.logoStyle === 'rounded') {
                    // Create a canvas to clip the image
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    const size = 200 // Higher resolution for better quality
                    canvas.width = size
                    canvas.height = size

                    // Draw clipped image on canvas
                    ctx.beginPath()
                    if (pdfSettings.logoStyle === 'circle') {
                      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                    } else {
                      // Rounded corners
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

                    // Draw image
                    ctx.drawImage(logoImg, 0, 0, size, size)

                    // Convert canvas to data URL and add to PDF
                    const clippedImage = canvas.toDataURL('image/png')
                    doc.addImage(clippedImage, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
                  } else {
                    // Square logo
                    doc.addImage(logoImg, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
                  }

                  console.log('School logo added to PDF successfully')
                  resolve()
                } catch (err) {
                  console.error('Logo canvas error:', err)
                  resolve()
                }
              }

              logoImg.onerror = (err) => {
                clearTimeout(timeout)
                console.error('Logo load failed:', err)
                resolve()
              }

              // Handle both absolute and relative URLs
              const logoUrl = schoolData.logo_url.startsWith('http')
                ? schoolData.logo_url
                : `${window.location.origin}${schoolData.logo_url.startsWith('/') ? '' : '/'}${schoolData.logo_url}`

              console.log('Final logo URL:', logoUrl)
              logoImg.src = logoUrl
            })
          } catch (e) {
            console.error('Error adding school logo:', e.message)
          }
        }

        // Title
        doc.setFontSize(20)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(pdfSettings.headerText || 'STUDENT INFORMATION RECORD', pageWidth / 2, 18, { align: 'center' })

        // Subtitle - School Name
        doc.setFontSize(10)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
        doc.text(schoolData?.name || 'School Management System', pageWidth / 2, 28, { align: 'center' })

        // Date in header (if enabled)
        if (pdfSettings.includeDate || pdfSettings.includeGeneratedDate) {
          doc.setFontSize(8)
          doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 15, 35, { align: 'right' })
        }
      }

      let yPos = pdfSettings.includeHeader !== false ? 48 : 15

      // Student Header Card - COMPACT responsive height
      const headerCardHeight = orientation === 'landscape' ? 20 : 24

      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margins.left, yPos, pageWidth - margins.left - margins.right, headerCardHeight, 2, 2, 'F')

      // Add light border
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.roundedRect(margins.left, yPos, pageWidth - margins.left - margins.right, headerCardHeight, 2, 2, 'S')

      // Student Photo (if available) - COMPACT
      const photoSize = orientation === 'landscape' ? 16 : 20 // Smaller photo
      const photoX = margins.left + 2
      const photoY = yPos + 2

      if (selectedStudent.photo_url) {
        try {
          console.log('Loading student photo from:', selectedStudent.photo_url)

          // Better image loading with canvas
          const img = new Image()
          img.crossOrigin = 'anonymous'

          const photoBase64 = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Image load timeout')), 10000)

            img.onload = () => {
              clearTimeout(timeout)
              try {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                console.log('Photo converted successfully, size:', dataUrl.length)
                resolve(dataUrl)
              } catch (err) {
                console.error('Canvas error:', err)
                reject(err)
              }
            }

            img.onerror = (err) => {
              clearTimeout(timeout)
              console.error('Image load failed:', err)
              reject(err)
            }

            // Handle both absolute and relative URLs
            const photoUrl = selectedStudent.photo_url.startsWith('http')
              ? selectedStudent.photo_url
              : `${window.location.origin}${selectedStudent.photo_url.startsWith('/') ? '' : '/'}${selectedStudent.photo_url}`

            console.log('Final photo URL:', photoUrl)
            img.src = photoUrl
          })

          if (photoBase64 && photoBase64.length > 100) {
            doc.addImage(photoBase64, 'JPEG', photoX, photoY, photoSize, photoSize)
            console.log('Student photo added to PDF successfully')

            // Professional rounded border
            doc.setDrawColor(203, 213, 225) // Gray-300
            doc.setLineWidth(0.5)
            doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, 'S')
          } else {
            throw new Error('Invalid photo data')
          }
        } catch (e) {
          console.error('❌ Error loading student photo:', e.message)
          console.error('Photo URL was:', selectedStudent.photo_url)
          console.error('Full error:', e)
          // Fallback to avatar
          doc.setFillColor(226, 232, 240)
          doc.rect(photoX, photoY, photoSize, photoSize, 'F')
          doc.setFontSize(14)
          doc.setTextColor(...textRgb)
          doc.text(selectedStudent.avatar || '👤', photoX + photoSize/2, photoY + photoSize/2 + 3, { align: 'center' })
        }
      } else {
        console.log('⚠️ No photo URL for student:', selectedStudent.first_name)
        console.log('Student object:', selectedStudent)
        // Photo placeholder
        doc.setFillColor(226, 232, 240)
        doc.rect(photoX, photoY, photoSize, photoSize, 'F')
        doc.setFontSize(14)
        doc.setTextColor(...textRgb)
        doc.text(selectedStudent.avatar || '👤', photoX + photoSize/2, photoY + photoSize/2 + 3, { align: 'center' })
      }

      // Student name and key info - positioned next to photo - COMPACT
      const infoX = photoX + photoSize + 4

      doc.setFontSize(parseInt(pdfSettings.fontSize || '10') + 2)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
      doc.setTextColor(...primaryRgb)
      doc.text(`${selectedStudent.first_name} ${selectedStudent.last_name || ''}`, infoX, yPos + 7)

      doc.setFontSize(parseInt(pdfSettings.fontSize || '10') - 2)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
      doc.setTextColor(75, 85, 99)
      doc.text(`Admission No: ${selectedStudent.admission_number}`, infoX, yPos + 12)
      doc.text(`Class: ${selectedStudent.className || 'N/A'} | Section: ${selectedStudent.sectionName || 'N/A'}`, infoX, yPos + 16)

      // Status badge - positioned in top right of card - COMPACT
      const status = selectedStudent.status || 'active'
      const statusColor = status === 'active' ? [34, 197, 94] : [239, 68, 68]
      doc.setFillColor(...statusColor)
      doc.roundedRect(pageWidth - margins.right - 25, yPos + 4, 23, 6, 2, 2, 'F')
      doc.setFontSize(7)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(status.toUpperCase(), pageWidth - margins.right - 13.5, yPos + 8, { align: 'center' })

      // Adjust spacing based on orientation - MORE COMPACT
      yPos += orientation === 'landscape' ? 20 : 25

      // Helper function for COMPACT section headers with professional styling
      const addSectionHeader = (title) => {
        // Reserve space for footer
        const footerReservedSpace = 20
        const maxContentY = pageHeight - footerReservedSpace

        // Check if we need a new page for the section header
        if (yPos + 10 > maxContentY) {
          doc.addPage()
          yPos = margins.top || 15
        }

        // Blue gradient-like header - REDUCED HEIGHT
        const tableHeaderRgb = hexToRgb(pdfSettings.tableHeaderColor || pdfSettings.secondaryColor || '#3B82F6')
        doc.setFillColor(...tableHeaderRgb)
        doc.roundedRect(margins.left, yPos, pageWidth - margins.left - margins.right, 6, 1, 1, 'F')

        doc.setFontSize(parseInt(pdfSettings.fontSize || '10') - 1)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(title, margins.left + 3, yPos + 4)
        yPos += 7.5
      }

      // Helper function for responsive multi-column fields - adapts to orientation
      const addTwoColumnFields = (fields) => {
        // Use 3 columns for landscape, 2 for portrait
        const numColumns = orientation === 'landscape' ? 3 : 2
        const gapSize = 2
        const totalGaps = (numColumns - 1) * gapSize
        const colWidth = (pageWidth - margins.left - margins.right - totalGaps) / numColumns

        let col = 0
        let rowY = yPos

        // Professional color scheme
        const fieldBgRgb = [249, 250, 251] // Very light gray
        const labelColorRgb = [107, 114, 128] // Gray-500
        const borderRgb = [229, 231, 235] // Gray-200

        // Reserve space for footer (footer area starts at pageHeight - 20)
        const footerReservedSpace = 20
        const maxContentY = pageHeight - footerReservedSpace

        // COMPACT field height
        const fieldHeight = 7.5

        fields.forEach(([label, value]) => {
          if (value && value !== 'N/A' && value !== null && value !== undefined && value !== '') {
            // Check if we need a new page
            if (rowY + 10 > maxContentY) {
              doc.addPage()
              rowY = margins.top || 15
              col = 0
            }

            const xPos = margins.left + (col * (colWidth + gapSize))

            // Card background with subtle shadow effect
            doc.setFillColor(...fieldBgRgb)
            doc.roundedRect(xPos, rowY, colWidth, fieldHeight, 1, 1, 'F')

            // Subtle border for definition
            doc.setDrawColor(...borderRgb)
            doc.setLineWidth(0.2)
            doc.roundedRect(xPos, rowY, colWidth, fieldHeight, 1, 1, 'S')

            // Label - small gray uppercase
            doc.setFontSize(5.5)
            doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
            doc.setTextColor(...labelColorRgb)
            doc.text(label.toUpperCase(), xPos + 1.5, rowY + 3)

            // Value - larger and bold with proper text fitting
            doc.setFontSize(7.5)
            doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
            doc.setTextColor(31, 41, 55) // Gray-800

            // Smart truncation based on column width
            const maxChars = orientation === 'landscape' ? 28 : 35
            let valueText = String(value)
            if (valueText.length > maxChars) {
              valueText = valueText.substring(0, maxChars - 3) + '...'
            }

            doc.text(valueText, xPos + 1.5, rowY + 6, { maxWidth: colWidth - 3 })

            col++
            if (col >= numColumns) {
              col = 0
              rowY += fieldHeight + 1.5
            }
          }
        })

        yPos = col === 0 ? rowY : rowY + fieldHeight + 1.5
      }

      // Basic Information
      addSectionHeader('BASIC INFORMATION')
      addTwoColumnFields([
        ['First Name', selectedStudent.first_name],
        ['Last Name', selectedStudent.last_name],
        ['Gender', selectedStudent.gender],
        ['Date of Birth', selectedStudent.date_of_birth],
        ['Blood Group', selectedStudent.blood_group],
        ['Religion', selectedStudent.religion],
        ['Caste', selectedStudent.caste],
        ['Nationality', selectedStudent.nationality || 'Pakistan']
      ])

      yPos += orientation === 'landscape' ? 1.5 : 2

      // Academic Information
      addSectionHeader('ACADEMIC INFORMATION')
      addTwoColumnFields([
        ['Class', selectedStudent.className],
        ['Section', selectedStudent.sectionName],
        ['Roll Number', selectedStudent.roll_number],
        ['House', selectedStudent.house],
        ['Admission Date', selectedStudent.admission_date],
        ['Status', selectedStudent.status]
      ])

      yPos += orientation === 'landscape' ? 1.5 : 2

      // Father Information
      if (selectedStudent.father_name) {
        addSectionHeader('FATHER INFORMATION')
        addTwoColumnFields([
          ['Father Name', selectedStudent.father_name],
          ['Father CNIC', selectedStudent.father_cnic],
          ['Mobile', selectedStudent.father_phone],
          ['Email', selectedStudent.father_email],
          ['Qualification', selectedStudent.father_qualification],
          ['Occupation', selectedStudent.father_occupation],
          ['Annual Income', selectedStudent.father_annual_income]
        ])
        yPos += orientation === 'landscape' ? 1.5 : 2
      }

      // Mother Information
      if (selectedStudent.mother_name) {
        addSectionHeader('MOTHER INFORMATION')
        addTwoColumnFields([
          ['Mother Name', selectedStudent.mother_name],
          ['Mother CNIC', selectedStudent.mother_cnic],
          ['Mobile', selectedStudent.mother_phone],
          ['Email', selectedStudent.mother_email],
          ['Qualification', selectedStudent.mother_qualification],
          ['Occupation', selectedStudent.mother_occupation],
          ['Annual Income', selectedStudent.mother_annual_income]
        ])
        yPos += orientation === 'landscape' ? 1.5 : 2
      }

      // Contact Information
      if (selectedStudent.whatsapp_number || selectedStudent.current_address) {
        addSectionHeader('CONTACT INFORMATION')
        addTwoColumnFields([
          ['WhatsApp Number', selectedStudent.whatsapp_number],
          ['Guardian Mobile', selectedStudent.guardian_mobile],
          ['Address', selectedStudent.current_address],
          ['City', selectedStudent.city],
          ['State', selectedStudent.state],
          ['Postal Code', selectedStudent.postal_code]
        ])
        yPos += orientation === 'landscape' ? 1.5 : 2
      }

      // Fee Information
      if (selectedStudent.base_fee || selectedStudent.discount_amount) {
        addSectionHeader('FEE INFORMATION')
        addTwoColumnFields([
          ['Base Fee', selectedStudent.base_fee ? `PKR ${selectedStudent.base_fee}` : null],
          ['Discount Amount', selectedStudent.discount_amount ? `PKR ${selectedStudent.discount_amount}` : null],
          ['Final Fee', selectedStudent.final_fee ? `PKR ${selectedStudent.final_fee}` : null],
          ['Fee Plan', selectedStudent.fee_plan],
          ['Discount Note', selectedStudent.discount_note]
        ])
      }

      // Footer (using centralized footer function)
      if (pdfSettings.includeFooter !== false) {
        addPDFFooter(doc, 1, 1, pdfSettings)
      }

      // Save the PDF
      doc.save(`Student_${selectedStudent.admission_number}_${selectedStudent.first_name}.pdf`)

      // Close the modal
      setShowViewModal(false)

      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      console.error('Error details:', error.message, error.stack)
      showToast(`Failed to generate PDF: ${error.message || 'Please try again'}`, 'error')
    }
  }

  const handleDelete = (student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const studentId = selectedStudent.id
      const studentName = selectedStudent.name

      setShowDeleteModal(false)
      setSelectedStudent(null)

      // ✅ Get logged-in user for security
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}

      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('user_id', user.id)         // ✅ Security check
        .eq('school_id', user.school_id) // ✅ Security check

      if (deleteError) throw deleteError

      setStudents(prev => prev.filter(std => std.id !== studentId))

      showToast(`Student "${studentName}" deleted successfully!`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to delete student', 'error')
      console.error('Delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = async (student) => {
    try {
      const newStatus = student.status === 'active' ? 'inactive' : 'active'

      // ✅ Get logged-in user for security
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}

      const { error: updateError } = await supabase
        .from('students')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', student.id)
        .eq('user_id', user.id)         // ✅ Security check
        .eq('school_id', user.school_id) // ✅ Security check

      if (updateError) throw updateError

      if (newStatus === 'inactive') {
        setStudents(prev => prev.filter(std => std.id !== student.id))
      } else {
        setStudents(prev => prev.map(std =>
          std.id === student.id ? { ...std, status: newStatus } : std
        ))
      }

      const statusText = newStatus === 'active' ? 'activated' : 'deactivated'
      showToast(`Student ${statusText} successfully!`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update student status', 'error')
      console.error('Toggle status error:', err)
    }
  }

  const handleEdit = async (student) => {
    setShowEditModal(true)

    try {
      const { data: fullStudent, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .single()

      if (error) throw error

      if (fullStudent.current_class_id) {
        await fetchSections(fullStudent.current_class_id)
      }

      const selectedClass = classes.find(c => c.id === fullStudent.current_class_id)

      if (fullStudent.photo_url) {
        setImagePreview(null)
      }

      setFormData({
        id: fullStudent.id,
        admissionNo: fullStudent.admission_number || '',
        class: fullStudent.current_class_id || '',
        section: fullStudent.current_section_id || '',
        admissionDate: fullStudent.admission_date || '',
        discount: fullStudent.discount_amount || '',
        baseFee: fullStudent.base_fee || selectedClass?.standard_fee || '',
        discountNote: fullStudent.discount_note || '',
        photoUrl: fullStudent.photo_url || '',
        rollNumber: fullStudent.roll_number || '',
        house: fullStudent.house || '',
        studentName: `${fullStudent.first_name}${fullStudent.last_name ? ' ' + fullStudent.last_name : ''}`,
        fatherName: fullStudent.father_name || '',
        fatherMobile: fullStudent.father_phone || '',
        fatherEmail: fullStudent.father_email || '',
        fatherCnic: fullStudent.father_cnic || '',
        fatherOccupation: fullStudent.father_occupation || '',
        fatherQualification: fullStudent.father_qualification || '',
        fatherAnnualIncome: fullStudent.father_annual_income || '',
        whatsappNumber: fullStudent.whatsapp_number || '',
        dateOfBirth: fullStudent.date_of_birth || '',
        studentCnic: fullStudent.student_cnic || '',
        studentMobile: fullStudent.student_mobile || '',
        casteRace: fullStudent.caste || '',
        gender: fullStudent.gender || 'male',
        currentAddress: fullStudent.current_address || '',
        motherName: fullStudent.mother_name || '',
        motherCnic: fullStudent.mother_cnic || '',
        motherMobile: fullStudent.mother_phone || '',
        motherEmail: fullStudent.mother_email || '',
        motherQualification: fullStudent.mother_qualification || '',
        motherOccupation: fullStudent.mother_occupation || '',
        motherAnnualIncome: fullStudent.mother_annual_income || '',
        guardianName: fullStudent.guardian_name || '',
        guardianRelation: fullStudent.guardian_relation || '',
        guardianMobile: fullStudent.guardian_phone || '',
        guardianEmail: fullStudent.guardian_email || '',
        emergencyContactName: fullStudent.emergency_contact_name || '',
        emergencyRelation: fullStudent.emergency_relation || '',
        emergencyPhone: fullStudent.emergency_phone || '',
        emergencyMobile: fullStudent.emergency_mobile || '',
        emergencyAddress: fullStudent.emergency_address || '',
        religion: fullStudent.religion || '',
        nationality: fullStudent.nationality || 'Pakistan',
        previousSchool: fullStudent.previous_school || '',
        previousClass: fullStudent.previous_class || '',
        permanentAddress: fullStudent.permanent_address || '',
        medicalProblem: fullStudent.medical_problem || '',
        bloodGroup: fullStudent.blood_group || ''
      })
    } catch (err) {
      setError(err.message || 'Failed to load student details')
      console.error('Edit error:', err)
      setShowEditModal(false)
    }
  }

  const handleClassChange = (classId) => {
    const selectedClass = classes.find(c => c.id === classId)
    setFormData({
      ...formData,
      class: classId,
      section: '',
      baseFee: selectedClass?.standard_fee || ''
    })
    fetchSections(classId)
  }

  const handleSaveStudent = async () => {
    setSaving(true)
    setError(null)

    try {
      const nameParts = formData.studentName.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || null

      let photoUrl = formData.photoUrl || null
      if (imageFile) {
        try {
          const fileExt = imageFile.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `student-photos/${fileName}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('student-images')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            throw new Error(`Failed to upload image: ${uploadError.message}`)
          }

          const { data: urlData } = supabase.storage
            .from('student-images')
            .getPublicUrl(filePath)

          photoUrl = urlData.publicUrl
        } catch (imgError) {
          console.error('Image upload error:', imgError)
          showToast('Image upload failed. Student will be saved without photo.', 'error')
          photoUrl = formData.photoUrl || null
        }
      }

      const { error: updateError } = await supabase
        .from('students')
        .update({
          admission_number: formData.admissionNo,
          first_name: firstName,
          last_name: lastName,
          father_name: formData.fatherName,
          mother_name: formData.motherName || null,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender,
          blood_group: formData.bloodGroup || null,
          caste: formData.casteRace || null,
          religion: formData.religion || null,
          nationality: formData.nationality || 'Pakistan',
          photo_url: photoUrl,
          admission_date: formData.admissionDate,
          current_class_id: formData.class || null,
          current_section_id: formData.section || null,
          roll_number: formData.rollNumber || null,
          house: formData.house || null,
          base_fee: parseFloat(formData.baseFee) || 0,
          discount_amount: parseFloat(formData.discount) || 0,
          discount_note: formData.discountNote || null,
          final_fee: (parseFloat(formData.baseFee) || 0) - (parseFloat(formData.discount) || 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id)

      if (updateError) throw updateError

      setStudents(prev => prev.map(std =>
        std.id === formData.id
          ? { ...std, name: `${firstName} ${lastName || ''}`, father: formData.fatherName, admNo: formData.admissionNo, photo_url: photoUrl }
          : std
      ))

      setShowEditModal(false)
      setImageFile(null)
      setImagePreview(null)

      showToast('Student updated successfully!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update student', 'error')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-2 lg:p-4 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-5">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Active Students</h2>

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-3 mb-4">
          <div className="md:col-span-3">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              disabled={loadingClasses}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-7 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, father name, admission number, or CNIC"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <p className="text-gray-600 text-sm">
            There are <span className="text-red-600 font-bold">{filteredStudents.length}</span> active students{selectedClass ? ' in this class' : ''}.
          </p>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Download size={18} />
            Export to Excel
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 size={32} className="animate-spin text-red-600" />
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Session</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Class</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Student Name</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Father Name</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Adm.No</th>
                    <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-3 py-6 text-center text-gray-500">
                        No active students found.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student, index) => (
                      <tr
                        key={student.id}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50 transition`}
                      >
                        <td className="px-3 py-2.5 border border-gray-200">{startIndex + index + 1}</td>
                        <td className="px-3 py-2.5 border border-gray-200">{student.session}</td>
                        <td className="px-3 py-2.5 border border-gray-200">{getClassName(student.class)}</td>
                        <td className="px-3 py-2.5 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                              {student.photo_url ? (
                                <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-base">{student.avatar}</span>
                              )}
                            </div>
                            <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                              {student.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 border border-gray-200">{student.father}</td>
                        <td className="px-3 py-2.5 border border-gray-200">{student.admNo}</td>
                        <td className="px-3 py-2.5 border border-gray-200">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => handleView(student)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(student)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(student)}
                              className={`p-1.5 rounded-lg transition ${
                                student.status === 'active'
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                              title={student.status === 'active' ? 'Deactivate Student' : 'Activate Student'}
                            >
                              {student.status === 'active' ? (
                                <ToggleRight size={16} />
                              ) : (
                                <ToggleLeft size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(student)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredStudents.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50">
                <div className="text-xs text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = []
                      const maxVisiblePages = 4
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1)
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                              currentPage === i
                                ? 'bg-blue-900 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                          >
                            {i}
                          </button>
                        )
                      }
                      return pages
                    })()}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Student Modal - Slide from Right */}
      {showViewModal && selectedStudent && (
        <ModalOverlay onClose={() => setShowViewModal(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">Student Information</h3>
                    <p className="text-blue-200 text-sm mt-0.5">View complete student details</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintStudent}
                      className="text-white hover:bg-white/10 p-2 rounded-full transition"
                      title="Print Student Information"
                    >
                      <Printer size={20} />
                    </button>
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="text-white hover:bg-white/10 p-2 rounded-full transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9'
              }}>
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
                    {selectedStudent.photo_url ? (
                      <img src={selectedStudent.photo_url} alt={selectedStudent.first_name} className="w-full h-full object-cover" />
                    ) : (
                      selectedStudent.avatar
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-800">
                      {selectedStudent.first_name} {selectedStudent.last_name || ''}
                    </h4>
                    <p className="text-gray-600">Admission No: <span className="font-semibold">{selectedStudent.admission_number}</span></p>
                    <p className="text-sm text-gray-500">Status: <span className={`font-semibold ${selectedStudent.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{selectedStudent.status || 'N/A'}</span></p>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Basic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedStudent.first_name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">First Name</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.first_name}</p>
                      </div>
                    )}
                    {selectedStudent.last_name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Last Name</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.last_name}</p>
                      </div>
                    )}
                    {selectedStudent.gender && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Gender</p>
                        <p className="font-semibold text-gray-800 capitalize">{selectedStudent.gender}</p>
                      </div>
                    )}
                    {selectedStudent.date_of_birth && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.date_of_birth}</p>
                      </div>
                    )}
                    {selectedStudent.student_cnic && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Student CNIC/B-Form</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.student_cnic}</p>
                      </div>
                    )}
                    {selectedStudent.blood_group && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Blood Group</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.blood_group}</p>
                      </div>
                    )}
                    {selectedStudent.religion && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Religion</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.religion}</p>
                      </div>
                    )}
                    {selectedStudent.caste_race && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Caste/Race</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.caste_race}</p>
                      </div>
                    )}
                    {selectedStudent.nationality && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Nationality</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.nationality}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Academic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedStudent.className && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Class</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.className}</p>
                      </div>
                    )}
                    {selectedStudent.sectionName && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Section</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.sectionName}</p>
                      </div>
                    )}
                    {selectedStudent.roll_number && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Roll Number</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.roll_number}</p>
                      </div>
                    )}
                    {selectedStudent.admission_date && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Admission Date</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.admission_date}</p>
                      </div>
                    )}
                    {selectedStudent.house && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">House</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.house}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Father Information */}
                {selectedStudent.father_name && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Father Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.father_name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Name</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_name}</p>
                        </div>
                      )}
                      {selectedStudent.father_cnic && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father CNIC</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_cnic}</p>
                        </div>
                      )}
                      {selectedStudent.father_mobile && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Mobile</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_mobile}</p>
                        </div>
                      )}
                      {selectedStudent.father_email && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Email</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_email}</p>
                        </div>
                      )}
                      {selectedStudent.father_qualification && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Qualification</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_qualification}</p>
                        </div>
                      )}
                      {selectedStudent.father_occupation && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Occupation</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_occupation}</p>
                        </div>
                      )}
                      {selectedStudent.father_annual_income && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Father Annual Income</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_annual_income}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mother Information */}
                {selectedStudent.mother_name && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Mother Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.mother_name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Name</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_name}</p>
                        </div>
                      )}
                      {selectedStudent.mother_cnic && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother CNIC</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_cnic}</p>
                        </div>
                      )}
                      {selectedStudent.mother_mobile && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Mobile</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_mobile}</p>
                        </div>
                      )}
                      {selectedStudent.mother_email && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Email</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_email}</p>
                        </div>
                      )}
                      {selectedStudent.mother_qualification && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Qualification</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_qualification}</p>
                        </div>
                      )}
                      {selectedStudent.mother_occupation && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Occupation</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_occupation}</p>
                        </div>
                      )}
                      {selectedStudent.mother_annual_income && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Mother Annual Income</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_annual_income}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {(selectedStudent.whatsapp_number || selectedStudent.current_address || selectedStudent.city || selectedStudent.state || selectedStudent.postal_code) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Contact Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.whatsapp_number && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">WhatsApp Number</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.whatsapp_number}</p>
                        </div>
                      )}
                      {selectedStudent.current_address && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Current Address</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.current_address}</p>
                        </div>
                      )}
                      {selectedStudent.city && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">City</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.city}</p>
                        </div>
                      )}
                      {selectedStudent.state && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">State/Province</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.state}</p>
                        </div>
                      )}
                      {selectedStudent.postal_code && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Postal Code</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.postal_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fee Information */}
                {(selectedStudent.base_fee || selectedStudent.discount_amount || selectedStudent.final_fee) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Fee Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.base_fee && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.base_fee}</p>
                        </div>
                      )}
                      {selectedStudent.discount_amount && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Discount</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.discount_amount}</p>
                        </div>
                      )}
                      {selectedStudent.final_fee && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Final Fee</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.final_fee}</p>
                        </div>
                      )}
                      {selectedStudent.discount_note && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Discount Note</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.discount_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <ModalOverlay onClose={() => !deleting && setShowDeleteModal(false)} disabled={deleting}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-t-xl">
                <h3 className="text-base font-bold">Confirm Action</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-700 mb-4 text-sm">
                  Are you sure you want to delete <span className="font-bold text-red-600">{selectedStudent.first_name} {selectedStudent.last_name || ''}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    {deleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <ModalOverlay onClose={() => !saving && setShowEditModal(false)} disabled={saving}>
          <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[99999] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold">Edit Student</h3>
                  <p className="text-blue-200 text-xs mt-0.5">Update student details</p>
                </div>
                <button
                  onClick={() => !saving && setShowEditModal(false)}
                  disabled={saving}
                  className="text-white hover:bg-white/10 p-1.5 rounded-full transition disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {/* Academic Data Section */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-green-600 mb-3">ACADEMIC DATA</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">
                      Admission/GR No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.admissionNo}
                      onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Class</label>
                    <select
                      value={formData.class}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.class_name} - Fee: {cls.standard_fee}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Section</label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      disabled={loadingSections || !formData.class}
                    >
                      <option value="">Select Section</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.section_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Admission Date</label>
                    <input
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Roll Number</label>
                    <input
                      type="text"
                      placeholder="Enter Roll Number"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">House</label>
                    <select
                      value={formData.house}
                      onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select House</option>
                      <option value="Red">Red</option>
                      <option value="Blue">Blue</option>
                      <option value="Green">Green</option>
                      <option value="Yellow">Yellow</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Base Fee</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.baseFee}
                      readOnly
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Discount</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Discount Note</label>
                    <input
                      type="text"
                      placeholder="Optional note"
                      value={formData.discountNote}
                      onChange={(e) => setFormData({ ...formData, discountNote: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Student & Father Information */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-blue-600 mb-3">STUDENT & FATHER INFORMATION</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Student Name"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">
                      Father Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Father Name"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-xs mb-1">Student Photo</label>
                    <div className="flex items-center gap-3">
                      {imagePreview && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-300">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null)
                              setImagePreview(null)
                            }}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      {formData.photoUrl && !imagePreview && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-300">
                          <img src={formData.photoUrl} alt="Current" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            setImageFile(file)
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setImagePreview(reader.result)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Father Mobile</label>
                    <input
                      type="text"
                      placeholder="Enter Father Mobile"
                      value={formData.fatherMobile}
                      onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Date Of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-xs mb-1">Current Address</label>
                    <input
                      type="text"
                      placeholder="Enter Current Address"
                      value={formData.currentAddress}
                      onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Student Other Details - Collapsible */}
              <div className="mb-4">
                <button
                  onClick={() => setShowOtherDetails(!showOtherDetails)}
                  className="w-full bg-purple-600 text-white px-3 py-2 rounded-lg font-semibold flex justify-between items-center hover:bg-purple-700 transition text-sm"
                >
                  <span>Student Other Details</span>
                  <span className="text-xs">{showOtherDetails ? '▲ Hide' : '▼ Show'}</span>
                </button>

                {showOtherDetails && (
                  <div className="mt-3 bg-white p-3 rounded-lg border border-gray-200">
                    <h4 className="text-xs font-bold text-purple-600 mb-3">MOTHER INFORMATION</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-gray-700 text-xs mb-1">Mother Name</label>
                        <input
                          type="text"
                          placeholder="Mother Name"
                          value={formData.motherName}
                          onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-xs mb-1">Mother Mobile</label>
                        <input
                          type="text"
                          placeholder="Enter Mother Mobile"
                          value={formData.motherMobile}
                          onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-green-600 mb-3">OTHER INFORMATION</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 text-xs mb-1">Religion</label>
                        <select
                          value={formData.religion}
                          onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select Religion</option>
                          <option value="Islam">Islam</option>
                          <option value="Christianity">Christianity</option>
                          <option value="Hinduism">Hinduism</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-xs mb-1">Nationality</label>
                        <input
                          type="text"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 bg-white">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStudent}
                  disabled={saving || !formData.studentName || !formData.fatherName || !formData.admissionNo}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 text-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Update Student'
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}