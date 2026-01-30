'use client'

import { useState, useEffect, useRef } from 'react'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardGrid, CardInfoGrid } from '@/components/DataCard'
import { FileText, CreditCard, Calendar, User, Hash, Trash2, X, TrendingUp, Award, RefreshCw, Search, Download, CheckCircle, Printer } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { convertImageToBase64, addDecorativeBorder, PDF_FONTS } from '@/lib/pdfUtils'
import QRCode from 'qrcode'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper to get logged-in user
const getLoggedInUser = () => {
  if (typeof window === 'undefined') return { id: null, school_id: null }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return { id: user?.id, school_id: user?.school_id }
  } catch {
    return { id: null, school_id: null }
  }
}

function StudentReportsContent() {
  const [activeTab, setActiveTab] = useState('certificates') // 'certificates' or 'cards'
  const [certificateType, setCertificateType] = useState('all') // 'all', 'character', 'leaving'
  const [certificates, setCertificates] = useState([])
  const [idCards, setIdCards] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [selectedClass, setSelectedClass] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchAdmissionNo, setSearchAdmissionNo] = useState('')

  // Filtered data
  const [filteredData, setFilteredData] = useState([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(10)

  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  // Real-time subscriptions
  const certificatesChannel = useRef(null)
  const idCardsChannel = useRef(null)

  // Statistics
  const [stats, setStats] = useState({
    totalCertificates: 0,
    totalCards: 0,
    activeCards: 0,
    expiredCards: 0
  })

  useEffect(() => {
    fetchClasses()
    fetchCertificates()
    fetchIdCards()
    setupRealtimeSubscriptions()

    return () => {
      // Cleanup subscriptions
      if (certificatesChannel.current) {
        supabase.removeChannel(certificatesChannel.current)
      }
      if (idCardsChannel.current) {
        supabase.removeChannel(idCardsChannel.current)
      }
    }
  }, [])


  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [activeTab, certificateType, selectedClass, searchName, searchAdmissionNo, certificates, idCards])

  useEffect(() => {
    calculateStats()
  }, [certificates, idCards])

  const setupRealtimeSubscriptions = () => {
    const { id: userId, school_id: schoolId } = getLoggedInUser()
    if (!userId || !schoolId) return

    // Subscribe to certificates changes
    certificatesChannel.current = supabase
      .channel('certificates-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_certificates',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log('🔴 Certificate change detected:', payload)
          fetchCertificates()
          showToast('Certificates updated!', 'success')
        }
      )
      .subscribe()

    // Subscribe to ID cards changes
    idCardsChannel.current = supabase
      .channel('id-cards-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_id_cards',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log('🔴 ID card change detected:', payload)
          fetchIdCards()
          showToast('ID Cards updated!', 'success')
        }
      )
      .subscribe()
  }

  const calculateStats = () => {
    const totalCertificates = certificates.length
    const totalCards = idCards.length
    const activeCards = idCards.filter(card => card.status === 'active').length
    const expiredCards = idCards.filter(card => card.status !== 'active').length

    setStats({
      totalCertificates,
      totalCards,
      activeCards,
      expiredCards
    })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchCertificates(), fetchIdCards()])
    showToast('Data refreshed successfully!', 'success')
    setTimeout(() => setIsRefreshing(false), 500)
  }

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
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const fetchCertificates = async () => {
    setLoading(true)
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      console.log('📄 Fetching certificates with userId:', userId, 'schoolId:', schoolId)

      const { data, error} = await supabase
        .from('student_certificates')
        .select(`
          id,
          issue_date,
          certificate_type,
          remarks,
          student_id,
          students (
            id,
            first_name,
            last_name,
            admission_number,
            father_name,
            current_class_id,
            photo_url
          )
        `)
        .eq('school_id', schoolId)
        .order('issue_date', { ascending: false })

      if (error) {
        console.error('❌ Supabase error fetching certificates:', error)
        throw error
      }

      console.log('✅ Fetched certificates:', data?.length || 0, 'records')
      console.log('📄 Certificate data:', data)

      // Fetch class names separately
      let classMap = {}
      if (data && data.length > 0) {
        const classIds = [...new Set(data.map(cert => cert.students?.current_class_id).filter(Boolean))]

        if (classIds.length > 0) {
          const { data: classesData } = await supabase
            .from('classes')
            .select('id, class_name')
            .eq('user_id', userId)
            .eq('school_id', schoolId)
            .in('id', classIds)

          classesData?.forEach(cls => {
            classMap[cls.id] = cls.class_name
          })

          console.log('Class map:', classMap)
        }
      }

      // Flatten the nested structure
      const flattenedData = (data || []).map(cert => ({
        id: cert.id,
        type: 'certificate',
        issue_date: cert.issue_date,
        certificate_type: cert.certificate_type,
        remarks: cert.remarks,
        student_id: cert.students?.id || cert.student_id,
        student_first_name: cert.students?.first_name || 'N/A',
        student_last_name: cert.students?.last_name || '',
        admission_number: cert.students?.admission_number || 'N/A',
        father_name: cert.students?.father_name || 'N/A',
        roll_number: cert.students?.admission_number || 'N/A',
        class_id: cert.students?.current_class_id || '',
        class_name: classMap[cert.students?.current_class_id] || 'N/A',
        photo_url: cert.students?.photo_url || null
      }))

      console.log('Flattened certificates:', flattenedData)
      setCertificates(flattenedData)
    } catch (err) {
      console.error('Error fetching certificates:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchIdCards = async () => {
    setLoading(true)
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      console.log('🆔 Fetching ID cards with userId:', userId, 'schoolId:', schoolId)

      const { data, error } = await supabase
        .from('student_id_cards')
        .select(`
          id,
          card_number,
          issue_date,
          expiry_date,
          status,
          student_id,
          students (
            id,
            first_name,
            last_name,
            admission_number,
            father_name,
            current_class_id,
            photo_url
          )
        `)
        .eq('school_id', schoolId)
        .order('issue_date', { ascending: false })

      if (error) {
        console.error('❌ Supabase error fetching ID cards:', error)
        throw error
      }

      console.log('✅ Fetched ID cards:', data?.length || 0, 'records')
      console.log('🆔 ID card data:', data)

      // Fetch class names separately
      let classMap = {}
      if (data && data.length > 0) {
        const classIds = [...new Set(data.map(card => card.students?.current_class_id).filter(Boolean))]

        if (classIds.length > 0) {
          const { data: classesData } = await supabase
            .from('classes')
            .select('id, class_name')
            .eq('user_id', userId)
            .eq('school_id', schoolId)
            .in('id', classIds)

          classesData?.forEach(cls => {
            classMap[cls.id] = cls.class_name
          })

          console.log('Class map for cards:', classMap)
        }
      }

      // Flatten the nested structure
      const flattenedData = (data || []).map(card => {
        console.log('Processing card:', {
          id: card.id,
          student_id: card.student_id,
          students: card.students,
          has_student: !!card.students
        })

        return {
          id: card.id,
          type: 'card',
          card_number: card.card_number,
          issue_date: card.issue_date,
          expiry_date: card.expiry_date,
          status: card.status,
          student_id: card.students?.id || card.student_id,
          student_first_name: card.students?.first_name || 'N/A',
          student_last_name: card.students?.last_name || '',
          admission_number: card.students?.admission_number || 'N/A',
          father_name: card.students?.father_name || 'N/A',
          roll_number: card.students?.admission_number || 'N/A',
          class_id: card.students?.current_class_id || '',
          class_name: classMap[card.students?.current_class_id] || 'N/A',
          photo_url: card.students?.photo_url || null
        }
      })

      console.log('Flattened ID cards:', flattenedData)
      console.log('Setting idCards state with', flattenedData.length, 'cards')
      setIdCards(flattenedData)
    } catch (err) {
      console.error('Error fetching ID cards:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    const dataToFilter = activeTab === 'certificates' ? certificates : idCards

    let filtered = [...dataToFilter]

    // Filter by certificate type (only for certificates tab)
    if (activeTab === 'certificates' && certificateType !== 'all') {
      filtered = filtered.filter(item => item.certificate_type === certificateType)
    }

    // Filter by class
    if (selectedClass) {
      filtered = filtered.filter(item => item.class_id === selectedClass)
    }

    // Filter by name
    if (searchName.trim()) {
      filtered = filtered.filter(item => {
        const fullName = `${item.student_first_name} ${item.student_last_name}`.toLowerCase()
        return fullName.includes(searchName.toLowerCase())
      })
    }

    // Filter by admission number
    if (searchAdmissionNo.trim()) {
      filtered = filtered.filter(item =>
        item.admission_number?.toLowerCase().includes(searchAdmissionNo.toLowerCase())
      )
    }

    setFilteredData(filtered)
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' })
    }, 4000)
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const clearFilters = () => {
    setSelectedClass('')
    setSearchName('')
    setSearchAdmissionNo('')
  }

  const handlePrint = async (item, type = null) => {
    try {
      if (activeTab === 'certificates') {
        // Generate based on type: 'character', 'leaving', or 'idcard'
        if (type === 'idcard') {
          await generateIDCardPDF(item)
        } else if (type === 'leaving') {
          await generateLeavingCertificatePDF(item)
        } else {
          // Default to character certificate
          await generateCertificatePDF(item)
        }
      } else {
        // Import ID card generation logic from cards page
        await generateIDCardPDF(item)
      }

      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to generate PDF. Please try again.', 'error')
    }
  }

  // Certificate generation function (from certificates page)
  const generateCertificatePDF = async (item) => {
    // Load certificate settings
    let certificateSettings = {
      instituteName: 'Superior College Bhakkar',
      instituteLocation: 'Bhakkar',
      certificateTitle: 'Character Certificate',
      showSchoolLogo: true,
      logoSize: 'medium',
      borderColor: '#8B4513',
      headerTextColor: '#8B4513',
      textColor: '#000000',
      accentColor: '#D2691E',
      instituteNameSize: 20,
      instituteTitleSize: 18,
      certificateText: 'This is to certify that {studentName}, son of {fatherName}, has been a student of this {collegeName}. He is a brilliant student who secured {marksObtained}/{totalMarks} marks with an {grade} grade in his {className} examination. His academic dedication is exemplary, and he maintains a highly disciplined and respectful attitude toward his teachers and peers.',
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
      showBorder: true,
      borderStyle: 'decorative'
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('certificateSettings')
      if (saved) certificateSettings = JSON.parse(saved)
    }

    // Fetch exam marks for the student
    const { id: userId, school_id: schoolId } = getLoggedInUser()
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
        .eq('student_id', item.student_id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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

        // Update item object with exam marks data
        item.marks_obtained = totalObtained
        item.total_marks = totalPossible
        item.grade = grade
      }
    } catch (err) {
      console.error('Error fetching exam marks:', err)
    }

    // Fetch school data
    const { data: schoolData } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .limit(1)
      .single()

    let schoolLogo = schoolData?.logo_url
    if (schoolData?.logo_url && (schoolData.logo_url.startsWith('http://') || schoolData.logo_url.startsWith('https://'))) {
      schoolLogo = await convertImageToBase64(schoolData.logo_url)
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 12

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

    if (certificateSettings.showBorder) {
      addDecorativeBorder(doc, certificateSettings.borderColor || '#8B4513')
    }

    const serialNumber = Math.floor(Math.random() * 1000) + 1

    if (certificateSettings.showSerialNumber) {
      doc.setFontSize(9)
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Sr. No.:', margin + 11, margin + 11)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(serialNumber.toString(), margin + 27, margin + 11)
    }

    if (certificateSettings.showDate) {
      const currentDate = new Date().toLocaleDateString('en-GB')
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Dated:', pageWidth - margin - 48, margin + 11)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(currentDate, pageWidth - margin - 31, margin + 11)
    }

    if (certificateSettings.showSchoolLogo && schoolLogo) {
      try {
        const logoSize = 20
        const logoX = (pageWidth - logoSize) / 2
        const logoY = margin + 8

        let format = 'PNG'
        if (schoolLogo.includes('data:image/jpeg') || schoolLogo.includes('data:image/jpg')) {
          format = 'JPEG'
        }

        doc.addImage(schoolLogo, format, logoX, logoY, logoSize, logoSize)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    doc.setFontSize(20)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...headerRgb)
    const instituteName = certificateSettings.instituteName || schoolData?.name || 'Superior College Bhakkar'
    doc.text(instituteName, pageWidth / 2, margin + 35, { align: 'center' })

    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...textRgb)
    doc.text(certificateSettings.instituteLocation || schoolData?.address || 'Bhakkar', pageWidth / 2, margin + 41, { align: 'center' })

    doc.setFontSize(18)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...accentRgb)
    doc.text(certificateSettings.certificateTitle || 'Character Certificate', pageWidth / 2, margin + 51, { align: 'center' })

    const detailsY = margin + 62
    const leftColX = margin + 18
    const midColX = pageWidth / 2 + 10
    const lineHeight = 7

    let currentY = detailsY

    doc.setFontSize(10)

    const studentFullName = `${item.student_first_name || ''}${item.student_last_name ? ' ' + item.student_last_name : ''}`.trim()
    const className = item.class_name || 'SSC'
    const currentYear = new Date().getFullYear()
    const grade = item.grade || 'N/A'

    if (certificateSettings.showName) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Name of Student:', leftColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(0, 0, 139)
      doc.text(studentFullName, leftColX + 38, currentY)
    }

    if (certificateSettings.showRollNo) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Roll No.:', midColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(0, 0, 139)
      doc.text(item.roll_number || '43', midColX + 18, currentY)
    }

    currentY += lineHeight

    if (certificateSettings.showExamination) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Examination Passed:', leftColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(0, 0, 139)
      doc.text(className, leftColX + 43, currentY)
    }

    if (certificateSettings.showSession) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Session:', midColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(0, 0, 139)
      doc.text(`${currentYear - 2}-${currentYear.toString().substr(2)}`, midColX + 18, currentY)
    }

    currentY += lineHeight

    if (certificateSettings.showMarks) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Marks Obtained:', leftColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(0, 0, 139)
      doc.text((item.marks_obtained || 0).toString(), leftColX + 38, currentY)
    }

    if (certificateSettings.showTotalMarks) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Total Marks:', midColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(0, 0, 139)
      doc.text((item.total_marks || 0).toString(), midColX + 28, currentY)
    }

    currentY += lineHeight

    if (certificateSettings.showGrade) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Grade:', leftColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(0, 0, 139)
      doc.text(item.grade || 'N/A', leftColX + 38, currentY)
    }

    if (certificateSettings.showYear) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Year:', midColX, currentY)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(0, 0, 139)
      doc.text(currentYear.toString(), midColX + 28, currentY)
    }

    currentY += lineHeight + 8

    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...textRgb)

    const fatherName = item.father_name || 'Ali'
    const collegeName = certificateSettings.instituteName || schoolData?.name || 'Superior College Bhakkar'

    // Use default comprehensive template if marks data exists and template doesn't include marks placeholders
    const defaultTemplate = 'This is to certify that {studentName}, son of {fatherName}, has been a student of this {collegeName}. He is a brilliant student who secured {marksObtained}/{totalMarks} marks with an {grade} grade in his {className} examination. His academic dedication is exemplary, and he maintains a highly disciplined and respectful attitude toward his teachers and peers.'

    let certificateText = certificateSettings.certificateText || defaultTemplate

    // If we have marks data but the template doesn't include marks placeholders, use the default template
    if (item.marks_obtained && item.total_marks && item.grade &&
        !certificateText.includes('{marksObtained}') &&
        !certificateText.includes('{totalMarks}') &&
        !certificateText.includes('{grade}')) {
      certificateText = defaultTemplate
    }

    certificateText = certificateText
      .replace(/{studentName}/g, studentFullName)
      .replace(/{fatherName}/g, fatherName)
      .replace(/{collegeName}/g, collegeName)
      .replace(/{className}/g, className)
      .replace(/{year}/g, currentYear.toString())
      .replace(/{marksObtained}/g, (item.marks_obtained || 0).toString())
      .replace(/{totalMarks}/g, (item.total_marks || 0).toString())
      .replace(/{grade}/g, item.grade || 'N/A')

    doc.text(certificateText, leftColX, currentY, {
      maxWidth: pageWidth - (2 * leftColX),
      align: 'justify',
      lineHeightFactor: 1.5
    })

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

    const fileName = `character_certificate_${item.admission_number}_${new Date().getTime()}.pdf`
    doc.save(fileName)
  }

  // Leaving Certificate generation function
  const generateLeavingCertificatePDF = async (item) => {
    // Load certificate settings
    let certificateSettings = {
      instituteName: 'Superior College Bhakkar',
      instituteLocation: 'Bhakkar',
      showSchoolLogo: true,
      logoSize: 'medium',
      borderColor: '#8B4513',
      headerTextColor: '#8B4513',
      textColor: '#000000',
      accentColor: '#D2691E',
      fieldValueColor: '#00008B',
      instituteNameSize: 20,
      instituteTitleSize: 18,
      fieldLabelSize: 10,
      showSerialNumber: true,
      showDate: true,
      principalTitle: 'Principal Signature',
      schoolNameInSignature: 'Superior College Bhakkar',
      showBorder: true,
      headerSpacing: 10,
      fieldSpacing: 9,
      sectionSpacing: 20,
      pageOrientation: 'portrait'
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('certificateSettings')
      if (saved) certificateSettings = JSON.parse(saved)
    }

    const { id: userId, school_id: schoolId } = getLoggedInUser()
    const { data: schoolData } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .limit(1)
      .single()

    let schoolLogo = schoolData?.logo_url
    if (schoolData?.logo_url && (schoolData.logo_url.startsWith('http://') || schoolData.logo_url.startsWith('https://'))) {
      schoolLogo = await convertImageToBase64(schoolData.logo_url)
    }

    const doc = new jsPDF({
      orientation: certificateSettings.pageOrientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0]
    }

    const textRgb = hexToRgb(certificateSettings.textColor || '#000000')
    const headerRgb = hexToRgb(certificateSettings.headerTextColor || '#8B4513')
    const accentRgb = hexToRgb(certificateSettings.accentColor || '#D2691E')

    if (certificateSettings.showBorder) {
      addDecorativeBorder(doc, certificateSettings.borderColor || '#8B4513')
    }

    if (certificateSettings.showSerialNumber) {
      const certNumber = `LC${new Date().getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
      doc.setFontSize(9)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...textRgb)
      doc.text(`Sr. No.: ${certNumber}`, margin + 5, margin + 11)
    }

    if (certificateSettings.showDate) {
      const today = new Date()
      const currentDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...textRgb)
      doc.text('Dated:', pageWidth - margin - 48, margin + 11)
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.text(currentDate, pageWidth - margin - 31, margin + 11)
    }

    const isLandscape = certificateSettings.pageOrientation === 'landscape'
    const headerSpacing = isLandscape ? Math.max((certificateSettings.headerSpacing || 10) - 3, 5) : (certificateSettings.headerSpacing || 10)
    const fieldSpacing = isLandscape ? Math.max((certificateSettings.fieldSpacing || 9) - 2, 6) : (certificateSettings.fieldSpacing || 9)
    const sectionSpacing = isLandscape ? Math.max((certificateSettings.sectionSpacing || 20) - 8, 10) : (certificateSettings.sectionSpacing || 20)
    let currentHeaderY = margin + (isLandscape ? 10 : 15)

    if (certificateSettings.showSchoolLogo && schoolLogo) {
      try {
        const logoSize = 20
        const logoX = (pageWidth - logoSize) / 2
        let format = schoolLogo.includes('data:image/jpeg') ? 'JPEG' : 'PNG'
        doc.addImage(schoolLogo, format, logoX, currentHeaderY, logoSize, logoSize)
        currentHeaderY += logoSize + headerSpacing
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    doc.setFontSize(certificateSettings.instituteNameSize || 20)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...headerRgb)
    let instituteName = certificateSettings.instituteName || schoolData?.name || 'School Name'
    if (instituteName.includes('%')) instituteName = schoolData?.name || 'Superior College Bhakkar'
    doc.text(instituteName, pageWidth / 2, currentHeaderY, { align: 'center' })
    currentHeaderY += headerSpacing

    doc.setFontSize(9)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...textRgb)
    doc.text(certificateSettings.instituteLocation || schoolData?.address || 'School Address', pageWidth / 2, currentHeaderY, { align: 'center' })
    currentHeaderY += headerSpacing

    doc.setFontSize(certificateSettings.instituteTitleSize || 18)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...accentRgb)
    doc.text('LEAVING CERTIFICATE', pageWidth / 2, currentHeaderY, { align: 'center' })
    currentHeaderY += headerSpacing

    const leftColX = margin + 18
    const rightColX = pageWidth / 2 + 10
    const labelWidth = 40
    let currentY = currentHeaderY

    doc.setFontSize(certificateSettings.fieldLabelSize || 10)

    const studentFullName = `${item.student_first_name || ''}${item.student_last_name ? ' ' + item.student_last_name : ''}`.trim()
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A'
      const d = new Date(dateStr)
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    }

    // Row 1
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Name of Student:', leftColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor))
    doc.text(studentFullName, leftColX + labelWidth, currentY)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Class:', rightColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor))
    doc.text(item.class_name || 'N/A', rightColX + 15, currentY)
    currentY += fieldSpacing

    // Row 2
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Father Name:', leftColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor))
    doc.text(item.father_name || 'N/A', leftColX + labelWidth, currentY)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Admission No:', rightColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor))
    doc.text(item.admission_number || 'N/A', rightColX + 30, currentY)
    currentY += fieldSpacing

    // Row 3
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Date of Birth:', leftColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor))
    doc.text(formatDate(item.date_of_birth), leftColX + labelWidth, currentY)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Admission Date:', rightColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor))
    doc.text(formatDate(item.admission_date), rightColX + 35, currentY)
    currentY += fieldSpacing

    // Row 4
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Character:', leftColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor))
    doc.text('Good', leftColX + labelWidth, currentY)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...textRgb)
    doc.text('Leaving Date:', rightColX, currentY)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...hexToRgb(certificateSettings.fieldValueColor))
    const today = new Date()
    const leavingDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
    doc.text(leavingDate, rightColX + 30, currentY)
    currentY += fieldSpacing + sectionSpacing

    // Certificate Text
    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setTextColor(...textRgb)
    const genderRelation = item.gender?.toLowerCase() === 'female' ? 'daughter' : 'son'
    const certificateText = `This is to certify that ${studentFullName}, ${genderRelation} of ${item.father_name || 'N/A'}, has been a student of ${instituteName}. The student has cleared all dues and is leaving the school with good character and conduct. We wish them success in their future endeavors.`
    doc.text(certificateText, leftColX, currentY, { maxWidth: pageWidth - (2 * leftColX), align: 'justify', lineHeightFactor: 1.5 })

    // Signature
    const signX = pageWidth - margin - 45
    const signY = pageHeight - margin - 30
    doc.setLineWidth(0.3)
    doc.setDrawColor(...textRgb)
    doc.line(signX - 15, signY + 5, signX + 30, signY + 5)
    doc.setFontSize(10)
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.text(certificateSettings.principalTitle || 'Principal', signX + 7, signY + 10, { align: 'center' })

    const fileName = `leaving_certificate_${item.admission_number}_${new Date().getTime()}.pdf`
    doc.save(fileName)
  }

  // ID Card generation function (from cards page)
  const generateIDCardPDF = async (item) => {
    // Load card settings
    let cardSettings = {
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
        'This card is property of the institution.',
        'If found, should be returned/posted to following address:',
        'Incharge, Institution Address.'
      ]
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('idCardSettings')
      if (saved) cardSettings = JSON.parse(saved)
    }

    // Fetch school data
    const { id: userId, school_id: schoolId } = getLoggedInUser()
    const { data: schoolData } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .limit(1)
      .single()

    let schoolLogo = schoolData?.logo_url
    if (schoolData?.logo_url && (schoolData.logo_url.startsWith('http://') || schoolData.logo_url.startsWith('https://'))) {
      schoolLogo = await convertImageToBase64(schoolData.logo_url)
    }

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : [255, 255, 255]
    }

    const orientation = cardSettings.cardOrientation === 'vertical' ? 'portrait' : 'landscape'
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [85.6, 53.98]
    })

    const cardWidth = orientation === 'landscape' ? 85.6 : 53.98
    const cardHeight = orientation === 'landscape' ? 53.98 : 85.6

    const bgColor = hexToRgb(cardSettings.cardBgColor)
    const headerColor = hexToRgb(cardSettings.headerBgColor)
    const accentColor = hexToRgb(cardSettings.accentColor)
    const textColor = hexToRgb(cardSettings.textColor)
    const labelColor = hexToRgb(cardSettings.labelColor)

    doc.setFillColor(...bgColor)
    doc.rect(0, 0, cardWidth, cardHeight, 'F')

    const headerHeight = 12

    if (cardSettings.showDecorativeStripe) {
      const stripeColor = hexToRgb(cardSettings.stripeColor)
      doc.setFillColor(...stripeColor)

      const waveStartX = cardWidth * 0.35

      doc.lines([
        [cardWidth - waveStartX, 0],
        [2, headerHeight],
        [3, 10],
        [-1, cardHeight - headerHeight - 15],
        [-2, 5],
        [-(cardWidth - waveStartX + 2), 0],
        [0, -cardHeight]
      ], waveStartX, 0, [1, 1], 'F')
    }

    doc.setFillColor(...headerColor)
    doc.rect(0, 0, cardWidth, headerHeight, 'F')

    if (cardSettings.showSchoolLogo && schoolLogo) {
      try {
        const logoSizeMap = { small: 7, medium: 9, large: 11 }
        const logoSize = logoSizeMap[cardSettings.logoSize] || 9
        const logoY = (headerHeight - logoSize) / 2

        let logoX = 2
        if (cardSettings.logoPosition === 'right') {
          logoX = cardWidth - logoSize - 2
        } else if (cardSettings.logoPosition === 'center') {
          logoX = (cardWidth - logoSize) / 2
        }

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
          img.src = schoolLogo
        })

        doc.addImage(logoImageData, 'PNG', logoX, logoY, logoSize, logoSize)
      } catch (err) {
        console.error('Error adding logo:', err)
      }
    }

    const instituteName = cardSettings.instituteName || schoolData?.name || 'SCHOOL NAME'
    const headerTextColorRgb = hexToRgb(cardSettings.headerTextColor)
    doc.setFontSize(10)
    doc.setFont(cardSettings.headerFont || 'helvetica', 'bold')
    doc.setTextColor(...headerTextColorRgb)
    doc.text(instituteName.toUpperCase(), cardWidth / 2, 6, { align: 'center' })

    const headerSubtitle = cardSettings.headerSubtitle || 'STUDENT ID CARD'
    doc.setFontSize(5.5)
    doc.setFont(cardSettings.headerFont || 'helvetica', 'normal')
    doc.setTextColor(...headerTextColorRgb)
    doc.text(headerSubtitle.toUpperCase(), cardWidth / 2, 10, { align: 'center' })

    const photoSizeMap = { small: 18, medium: 22, large: 26 }
    const photoSize = photoSizeMap[cardSettings.photoSize] || 22

    let photoX = cardWidth - photoSize - 4
    if (cardSettings.photoPosition === 'left') {
      photoX = 4
    } else if (cardSettings.photoPosition === 'center') {
      photoX = (cardWidth - photoSize) / 2
    }
    const photoY = 15

    if (item.photo_url && item.photo_url.trim() !== '') {
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

              ctx.beginPath()
              if (cardSettings.photoShape === 'circle') {
                ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2)
              } else if (cardSettings.photoShape === 'rounded') {
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
          img.src = item.photo_url
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

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(1.5)
    if (cardSettings.photoShape === 'circle') {
      doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'S')
    } else if (cardSettings.photoShape === 'rounded') {
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, 'S')
    } else {
      doc.rect(photoX, photoY, photoSize, photoSize, 'S')
    }

    let detailsX = 4
    if (cardSettings.photoPosition === 'left') {
      detailsX = photoX + photoSize + 4
    } else if (cardSettings.photoPosition === 'center') {
      detailsX = 4
    }

    let detailsY = 18
    const labelWidth = 22
    const studentIDNumber = `ID-${item.admission_number}`

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
      const studentFullName = `${item.student_first_name || ''} ${item.student_last_name || ''}`.trim()
      drawField('Name', studentFullName, detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showRollNo) {
      drawField('Roll No', studentIDNumber, detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showClass) {
      const className = item.class_name
      drawField('Class', className, detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showSession) {
      const currentYear = new Date().getFullYear()
      drawField('Session', `${currentYear}-${currentYear+1}`, detailsY)
      detailsY += 5.5
    }

    if (cardSettings.showExpiry && item.expiry_date) {
      const expiryDateObj = new Date(item.expiry_date)
      const day = String(expiryDateObj.getDate()).padStart(2, '0')
      const month = String(expiryDateObj.getMonth() + 1).padStart(2, '0')
      const year = String(expiryDateObj.getFullYear()).slice(-2)
      const expiryDate = `${day}-${month}-${year}`

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

    if (cardSettings.showSignature) {
      const sigX = cardWidth - 26
      const sigY = cardHeight - 7

      if (cardSettings.signatureImage) {
        try {
          doc.addImage(cardSettings.signatureImage, 'PNG', sigX + 1, sigY - 6, 24, 6)
        } catch (error) {
          console.error('Error adding signature:', error)
        }
      }

      doc.setDrawColor(...textColor)
      doc.setLineWidth(0.5)
      doc.line(sigX, sigY, sigX + 24, sigY)

      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColor)
      doc.text('Issuing Authority', sigX + 12, sigY + 3, { align: 'center' })
    }

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(0, 0, cardWidth, cardHeight, 'S')

    // Back side
    doc.addPage()

    doc.setFillColor(...bgColor)
    doc.rect(0, 0, cardWidth, cardHeight, 'F')

    if (cardSettings.showDecorativeStripe) {
      const stripeColor = hexToRgb(cardSettings.stripeColor)
      doc.setFillColor(...stripeColor)

      const backHeaderHeight = 10
      const waveStartX = cardWidth * 0.35

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

    doc.setFillColor(...headerColor)
    doc.rect(0, 0, cardWidth, 10, 'F')

    const backHeaderText = cardSettings.backHeaderText || 'STUDENT CARD'
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...headerTextColorRgb)
    doc.text(backHeaderText.toUpperCase(), cardWidth / 2, 6, { align: 'center' })

    let backY = 16
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textColor)
    doc.text('TERMS & CONDITIONS', cardWidth / 2, backY, { align: 'center' })
    backY += 6

    if (cardSettings.termsAndConditions && cardSettings.termsAndConditions.length > 0) {
      doc.setFontSize(6.5)
      doc.setFont(cardSettings.termsFont || 'helvetica', 'normal')
      doc.setTextColor(...textColor)

      cardSettings.termsAndConditions.forEach((term) => {
        if (term && term.trim()) {
          const bulletPoint = '•     '
          const termText = bulletPoint + term
          const maxWidth = cardWidth - 32
          const lines = doc.splitTextToSize(termText, maxWidth)
          lines.forEach((line, lineIndex) => {
            if (backY < cardHeight - 10) {
              const xPos = lineIndex === 0 ? 6 : 12
              doc.text(line, xPos, backY)
              backY += 3.8
            }
          })
        }
      })
    }

    if (cardSettings.showQRCode) {
      const qrSizeMap = { small: 14, medium: 18, large: 22 }
      const qrSize = qrSizeMap[cardSettings.qrCodeSize] || 18
      const qrX = cardWidth - qrSize - 5
      const qrY = cardHeight / 2 - qrSize / 2 + 5

      try {
        const qrData = cardSettings.qrCodeData || `ID:${item.admission_number}`
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })

        doc.addImage(qrCodeDataURL, 'PNG', qrX, qrY, qrSize, qrSize)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(0, 0, cardWidth, cardHeight, 'S')

    const fileName = `id_card_${item.admission_number}_${new Date().getTime()}.pdf`
    doc.save(fileName)
  }

  const handleDeleteClick = (item) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const tableName = activeTab === 'certificates' ? 'student_certificates' : 'student_id_cards'

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemToDelete.id)
        .eq('school_id', schoolId)

      if (error) throw error

      // Remove from state without reloading entire page
      if (activeTab === 'certificates') {
        setCertificates(prev => prev.filter(cert => cert.id !== itemToDelete.id))
      } else {
        setIdCards(prev => prev.filter(card => card.id !== itemToDelete.id))
      }

      showToast(`${activeTab === 'certificates' ? 'Certificate' : 'ID card'} deleted successfully!`, 'success')
      setShowDeleteModal(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('Error deleting record:', error)
      showToast('Failed to delete. Please try again.', 'error')
    }
  }


  return (
    <div className="p-3 lg:p-3 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-10 bg-[#D12323] rounded-lg flex items-center justify-center">
              <Award className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Student Reports</h1>
              <p className="text-xs sm:text-sm text-gray-600">Real-time certificates and ID cards management</p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md transition-all border border-gray-200 disabled:opacity-50 text-sm sm:text-base"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="font-medium hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-white rounded-lg p-3 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="w-12 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="text-red-600" size={24} />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{stats.totalCertificates}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-2">Total Certificates</p>
            <p className="text-xs text-green-600 mt-1">📈 All time</p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="w-12 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="text-blue-600" size={24} />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{stats.totalCards}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-2">Total ID Cards</p>
            <p className="text-xs text-green-600 mt-1">📈 All time</p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="w-12 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Award className="text-green-600" size={24} />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{stats.activeCards}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-2">Active Cards</p>
            <p className="text-xs text-green-600 mt-1">✅ Currently valid</p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="w-12 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="text-orange-600" size={24} />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{stats.expiredCards}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-2">Expired Cards</p>
            <p className="text-xs text-orange-600 mt-1">📅 Need renewal</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-lg">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex flex-wrap gap-2 p-2.5 sm:p-3.5">
            {/* Character Certificate Button */}
            <button
              onClick={() => {
                setActiveTab('certificates')
                setCertificateType('character')
              }}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'certificates' && certificateType === 'character'
                  ? 'bg-[#D12323] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Character Certificate</span>
              <span className="sm:hidden">Character</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-bold ${
                activeTab === 'certificates' && certificateType === 'character' ? 'bg-white/20' : 'bg-gray-300'
              }`}>
                {certificates.filter(cert => cert.certificate_type === 'character').length}
              </span>
            </button>

            {/* Leaving Certificate Button */}
            <button
              onClick={() => {
                setActiveTab('certificates')
                setCertificateType('leaving')
              }}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'certificates' && certificateType === 'leaving'
                  ? 'bg-[#D12323] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Leaving Certificate</span>
              <span className="sm:hidden">Leaving</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-bold ${
                activeTab === 'certificates' && certificateType === 'leaving' ? 'bg-white/20' : 'bg-gray-300'
              }`}>
                {certificates.filter(cert => cert.certificate_type === 'leaving').length}
              </span>
            </button>

            {/* ID Cards Button */}
            <button
              onClick={() => {
                setActiveTab('cards')
                setCertificateType('all')
              }}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'cards'
                  ? 'bg-[#D12323] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CreditCard size={16} />
              <span>ID Cards</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-bold ${
                activeTab === 'cards' ? 'bg-white/20' : 'bg-gray-300'
              }`}>
                {idCards.length}
              </span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="p-2.5 sm:p-3.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Search size={14} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">Search & Filter</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2">
            {/* Class Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Filter by Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Search by Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter student name..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Admission Number Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Search by Admission No
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchAdmissionNo}
                  onChange={(e) => setSearchAdmissionNo(e.target.value)}
                  placeholder="Enter admission number..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(selectedClass || searchName || searchAdmissionNo) && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-semibold transition-all text-sm"
              >
                <X size={14} />
                <span>Clear all filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="p-2.5 sm:p-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 sm:mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800">
                {activeTab === 'certificates' ? 'Certificates List' : 'ID Cards List'}
              </h3>
              <p className="text-sm text-gray-500">
                {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'} found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="text-gray-600 font-medium mt-6">Loading data...</p>
              <p className="text-gray-400 text-sm mt-1">Please wait</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                {activeTab === 'certificates' ? (
                  <FileText size={48} className="text-gray-400" />
                ) : (
                  <CreditCard size={48} className="text-gray-400" />
                )}
              </div>
              <p className="text-gray-600 text-xl font-semibold mb-1.5">
                {(selectedClass || searchName || searchAdmissionNo)
                  ? 'No results found'
                  : `No ${activeTab} issued yet`}
              </p>
              <p className="text-gray-400 text-sm">
                {(selectedClass || searchName || searchAdmissionNo)
                  ? 'Try adjusting your filters to find what you\'re looking for'
                  : `${activeTab === 'certificates' ? 'Certificates' : 'ID cards'} will appear here once issued`}
              </p>
            </div>
          ) : (
            <>
            <ResponsiveTableWrapper
              tableView={
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Sr.</th>
                      <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Student Name</th>
                      <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Father Name</th>
                      <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Class</th>
                    {activeTab === 'certificates' ? (
                      <>
                        <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Type</th>
                        <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Issue Date</th>
                        <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Remarks</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Issue Date</th>
                        <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Expiry Date</th>
                        <th className="px-3 py-2 text-left font-bold border border-gray-300 text-sm">Status</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-center font-bold border border-gray-300 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-3 py-2 border border-gray-200 text-sm">{startIndex + index + 1}</td>
                      <td className="px-3 py-2 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                            {item.photo_url ? (
                              <img src={item.photo_url} alt={item.student_first_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                                {item.student_first_name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="text-blue-600 font-medium hover:underline cursor-pointer text-sm">
                            {item.student_first_name} {item.student_last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-gray-200 text-sm">{item.father_name}</td>
                      <td className="px-3 py-2 border border-gray-200">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                          {item.class_name}
                        </span>
                      </td>
                      {activeTab === 'certificates' ? (
                        <>
                          <td className="px-3 py-2 border border-gray-200">
                            <span className="inline-block px-3 py-1 bg-green-500 text-white rounded-lg text-sm font-semibold capitalize">
                              {item.certificate_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-sm">
                                {new Date(item.issue_date).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            <span className="text-gray-600 text-sm">
                              {item.remarks || '-'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 border border-gray-200">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-sm">
                                {new Date(item.issue_date).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-sm">
                                {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold capitalize ${
                              item.status === 'active'
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 border border-gray-200">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrint(item)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              }
              cardView={
                <CardGrid>
                  {paginatedData.map((item, index) => (
                    <DataCard key={item.id}>
                      <CardHeader
                        srNumber={startIndex + index + 1}
                        photo={item.photo_url || item.student_first_name.charAt(0)}
                        name={`${item.student_first_name} ${item.student_last_name}`}
                        subtitle={item.class_name}
                        badge={
                          activeTab === 'certificates' ? (
                            <span className="px-1.5 py-0.5 bg-green-500 text-white rounded text-[10px] font-medium capitalize">
                              {item.certificate_type}
                            </span>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${
                              item.status === 'active' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                              {item.status}
                            </span>
                          )
                        }
                      />
                      <CardInfoGrid>
                        <CardRow label="Father" value={item.father_name} />
                        <CardRow label="Issue" value={new Date(item.issue_date).toLocaleDateString('en-GB')} />
                        {activeTab === 'certificates' ? (
                          <CardRow label="Remarks" value={item.remarks || '-'} className="col-span-2" />
                        ) : (
                          <CardRow label="Expiry" value={new Date(item.expiry_date).toLocaleDateString('en-GB')} />
                        )}
                      </CardInfoGrid>
                      <CardActions>
                        <button
                          onClick={() => handlePrint(item)}
                          className="p-1 text-red-600 rounded"
                          title="Print"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-1 text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </CardActions>
                    </DataCard>
                  ))}
                </CardGrid>
              }
              loading={loading}
              empty={filteredData.length === 0}
              emptyMessage={(selectedClass || searchName || searchAdmissionNo) ? 'No results found' : `No ${activeTab} issued yet`}
            />

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
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
                            className={`w-10 h-10 rounded-lg font-medium transition text-sm ${
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
                    className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
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
            </>
          )
          }
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-2 px-5 py-2 rounded-full shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle size={20} strokeWidth={2.5} />}
          {toast.type === 'error' && <X size={20} strokeWidth={2.5} />}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={hideToast} className="ml-1 hover:opacity-80 transition-opacity">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowDeleteModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-1.5 sm:p-3">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95%] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 sm:px-3 py-2 sm:py-4 rounded-t-xl">
                <h3 className="text-sm sm:text-base md:text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-3 sm:p-3">
                <p className="text-gray-700 mb-1.5 text-xs sm:text-sm md:text-base">
                  Are you sure you want to delete this {activeTab === 'certificates' ? 'certificate' : 'ID card'} for <span className="font-bold text-red-600">{itemToDelete.student_first_name} {itemToDelete.student_last_name}</span>?
                </p>
                <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm md:text-base">
                  Admission No: {itemToDelete.admission_number}. This action cannot be undone.
                </p>
                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setItemToDelete(null)
                    }}
                    className="flex-1 px-3 sm:px-3 py-2 sm:py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm sm:text-base order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-3 sm:px-3 py-2 sm:py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function StudentReportsPage() {
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
      permissionKey="students_reports_view"
      pageName="Student Reports"
    >
      <StudentReportsContent />
    </PermissionGuard>
  )
}