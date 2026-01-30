'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileText, ChevronDown, CheckCircle, XCircle, AlertCircle, X, Plus, Settings, Trash2, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardInfoGrid } from '@/components/DataCard'
import { jsPDF } from 'jspdf'
import {
  addPDFWatermark,
  addDecorativeBorder,
  addPDFFooter,
  addSignatureSection,
  formatDate,
  convertImageToBase64,
  PDF_COLORS,
  PDF_FONTS
} from '@/lib/pdfUtils'
import { getPdfSettings } from '@/lib/pdfSettings'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

// Modal Overlay Component - Uses Portal to render at document body level
const ModalOverlay = ({ children, onClose }) => {
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
        onClick={onClose}
      />
      {children}
    </>,
    document.body
  )
}

function HRCertificatesContent() {
  const [activeSection, setActiveSection] = useState('generate') // 'generate' or 'list'
  const [certificateType, setCertificateType] = useState('experience')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [staffData, setStaffData] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [allStaff, setAllStaff] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const [showAddNewType, setShowAddNewType] = useState(false)

  // Created certificates list state
  const [createdCertificates, setCreatedCertificates] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')
  const [newCertificateType, setNewCertificateType] = useState('')
  const [certificateTypes, setCertificateTypes] = useState([
    { value: 'experience', label: 'Experience Certificate', dbSafe: true },
    { value: 'relieving', label: 'Relieving Certificate', dbSafe: true },
    { value: 'appreciation', label: 'Appreciation Certificate', dbSafe: true }
  ])

  // Certificate design settings (saved per school in localStorage)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Defaults for certificate settings so we can reset easily
  const DEFAULT_CERTIFICATE_SETTINGS = {
    instituteName: '',
    headerSubtitle: '',
    showLogo: true,
    logoSize: 'medium', // small | medium | large
    borderColor: '#8B4513',
    headerTextColor: '#8B4513',
    textColor: '#000000',
    accentColor: '#D2691E',
    principalSignature: null, // base64 data URL
    principalName: '',
    principalDesignation: '',
    showBorder: true,
    borderStyle: 'decorative', // decorative | simple | gold
    showIssueDate: true,
    showSerialNumber: false
  }

  const [certificateSettings, setCertificateSettings] = useState(() => ({ ...DEFAULT_CERTIFICATE_SETTINGS }))
  // Inline confirmation for destructive reset
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Disable background scroll and add blur when modal open
  useEffect(() => {
    const locked = showSettingsModal || showResetConfirm
    if (locked) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showSettingsModal, showResetConfirm])
  // Toast notification function
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

  // Fetch school and staff data when user is loaded
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchSchoolData()
      fetchAllStaff()
    }
  }, [currentUser])

  // Filter staff based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStaff(allStaff)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = allStaff.filter(staff => {
        const fullName = `${staff.first_name} ${staff.last_name || ''}`.toLowerCase()
        const empNumber = staff.employee_number.toLowerCase()
        return fullName.includes(query) || empNumber.includes(query)
      })
      setFilteredStaff(filtered)
    }
  }, [searchQuery, allStaff])

  // Fetch created certificates when switching to list view
  useEffect(() => {
    if (currentUser?.school_id && activeSection === 'list') {
      fetchCreatedCertificates()
    }
  }, [currentUser, activeSection])

  // Fetch school data
  const fetchSchoolData = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error
      setSchoolData(data)
    } catch (error) {
      console.error('Error fetching school data:', error)
      showToast('Error loading school data', 'error')
    }
  }

  // Load certificate settings from localStorage when schoolData is available
  useEffect(() => {
    if (!currentUser?.school_id) return
    const key = `certificate_settings_${currentUser.school_id}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        setCertificateSettings(prev => ({ ...prev, ...JSON.parse(raw) }))
      } else {
        // populate some defaults from school data
        setCertificateSettings(prev => ({
          ...prev,
          instituteName: schoolData?.name || prev.instituteName,
          principalName: schoolData?.principal_name || prev.principalName
        }))
      }
    } catch (e) {
      console.error('Error loading certificate settings:', e)
    }
  }, [currentUser, schoolData])

  // Fetch all staff from database
  const fetchAllStaff = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('first_name', { ascending: true })

      if (error) throw error
      setAllStaff(data || [])
      setFilteredStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
      showToast('Error loading staff data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch created certificates from database
  const fetchCreatedCertificates = async () => {
    if (!currentUser?.school_id) return
    setLoadingList(true)
    try {
      const { data, error } = await supabase
        .from('staff_certificates')
        .select(`
          *,
          staff (
            first_name,
            last_name,
            designation,
            department,
            photo_url
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCreatedCertificates(data || [])
    } catch (error) {
      console.error('Error fetching certificates:', error)
      showToast('Failed to load certificates', 'error')
    } finally {
      setLoadingList(false)
    }
  }

  // Handle staff selection
  const handleStaffSelect = (staff) => {
    setStaffData(staff)
    setSelectedStaffId(staff.id)
    setSearchQuery(`${staff.first_name} ${staff.last_name || ''} (${staff.employee_number})`)
    setShowDropdown(false)
  }

  // Handle adding new certificate type
  const handleAddNewType = () => {
    if (newCertificateType.trim()) {
      const value = newCertificateType.toLowerCase().replace(/\s+/g, '_')
      const newType = {
        value: value,
        label: newCertificateType.trim(),
        dbSafe: false // Custom types won't be saved to database
      }
      setCertificateTypes([...certificateTypes, newType])
      setCertificateType(value)
      setNewCertificateType('')
      setShowAddNewType(false)
      showToast('New certificate type added successfully', 'success')
    }
  }

  // Save certificate settings to localStorage
  const handleSaveSettings = () => {
    if (!currentUser?.school_id) return showToast('Unable to save settings: no school context', 'error')
    try {
      const key = `certificate_settings_${currentUser.school_id}`
      localStorage.setItem(key, JSON.stringify(certificateSettings))
      setShowSettingsModal(false)
      showToast('Certificate settings saved successfully', 'success')
    } catch (e) {
      console.error('Error saving settings', e)
      showToast('Error saving settings', 'error')
    }
  }

  // Handle signature image upload (store base64 data URL)
  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setCertificateSettings(prev => ({ ...prev, principalSignature: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  // Prepare reset flow: open inline confirmation (do not use window.confirm)
  const handleResetSettings = () => {
    setShowResetConfirm(true)
  }

  // Perform the actual reset when user confirms in the inline modal
  const performResetSettings = () => {
    setCertificateSettings({ ...DEFAULT_CERTIFICATE_SETTINGS })
    try {
      if (currentUser?.school_id) {
        const key = `certificate_settings_${currentUser.school_id}`
        localStorage.removeItem(key)
      }
    } catch (e) {
      console.error('Error removing certificate settings from storage', e)
    }
    setShowResetConfirm(false)
    showToast('Certificate settings reset to defaults', 'success')
  }

  // Generate PDF Certificate
  const generatePDFCertificate = async () => {
    if (!staffData || !schoolData) return

    try {
      // Get global PDF settings and merge with certificate settings
      const globalPdfSettings = getPdfSettings()
      console.log('📄 Using global PDF settings for Certificate:', globalPdfSettings)

      const doc = new jsPDF({
        orientation: globalPdfSettings.orientation || 'landscape',
        unit: 'mm',
        format: globalPdfSettings.pageSize?.toLowerCase() || 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - (2 * margin)

      // Load school logo if available
      let logoBase64 = null
      if (schoolData?.logo) {
        logoBase64 = await convertImageToBase64(schoolData.logo)
      }

      // Merge certificate settings with global PDF settings (certificate settings take priority)
      const settings = {
        ...globalPdfSettings,
        ...(certificateSettings || {})
      }
      const hexToRgbArray = (hex) => {
        if (!hex) return [0,0,0]
        const sanitized = hex.replace('#','')
        const bigint = parseInt(sanitized, 16)
        const r = (bigint >> 16) & 255
        const g = (bigint >> 8) & 255
        const b = bigint & 255
        return [r,g,b]
      }

      // Override some PDF colors temporarily based on settings
      try {
        if (settings.borderColor) PDF_COLORS.secondary = hexToRgbArray(settings.borderColor)
        if (settings.textColor) PDF_COLORS.textDark = hexToRgbArray(settings.textColor)
        if (settings.accentColor) PDF_COLORS.accent = hexToRgbArray(settings.accentColor)
      } catch (e) {
        console.error('Error applying color settings', e)
      }

      // Add decorative border if enabled
      if (settings.showBorder !== false) {
        addDecorativeBorder(doc, settings.borderStyle === 'gold' ? 'gold' : 'brown')
      }

      // Add watermark
      addPDFWatermark(doc, schoolData, 'OFFICIAL')

      // School Logo at the top center (respect showLogo setting)
      if (logoBase64 && settings.showLogo !== false) {
        try {
          const logoSize = settings.logoSize === 'large' ? 28 : settings.logoSize === 'small' ? 14 : 20
          const logoX = (pageWidth - logoSize) / 2
          const logoY = 18

          let format = 'PNG'
          if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
            format = 'JPEG'
          }

          doc.addImage(logoBase64, format, logoX, logoY, logoSize, logoSize)
        } catch (error) {
          console.error('Error adding logo to certificate:', error)
        }
      }


      // Certificate Type Label
      const certificateTypeLabel = certificateTypes.find(ct => ct.value === certificateType)?.label || certificateType

      // Header - Certificate Title (adjusted position for logo)
      const titleY = logoBase64 ? 42 : 35
      doc.setFont(PDF_FONTS.primary, 'bold')
      doc.setFontSize(28)
      // Use header text color from settings if present
      doc.setTextColor(...(settings.headerTextColor ? hexToRgbArray(settings.headerTextColor) : PDF_COLORS.secondary))
      doc.text('CERTIFICATE', pageWidth / 2, titleY, { align: 'center' })

      // School Name
      const schoolNameY = logoBase64 ? 55 : 48
      doc.setFontSize(18)
      doc.setTextColor(...PDF_COLORS.textDark)
      doc.text(settings.instituteName || schoolData.name || 'SCHOOL NAME', pageWidth / 2, schoolNameY, { align: 'center' })

      // Header Subtitle / Tagline (if available)
      let currentY = schoolNameY + 6
      if (settings.headerSubtitle) {
        doc.setFont(PDF_FONTS.primary, 'italic')
        doc.setFontSize(10)
        doc.setTextColor(...PDF_COLORS.textLight)
        doc.text(settings.headerSubtitle, pageWidth / 2, currentY, { align: 'center' })
        currentY += 6
      } else if (schoolData.tagline) {
        doc.setFont(PDF_FONTS.primary, 'italic')
        doc.setFontSize(10)
        doc.setTextColor(...PDF_COLORS.textLight)
        doc.text(schoolData.tagline, pageWidth / 2, currentY, { align: 'center' })
        currentY += 6
      }

      // School Details
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...PDF_COLORS.textLight)
      const schoolDetails = []
      if (schoolData.address) schoolDetails.push(schoolData.address)
      if (schoolData.phone) schoolDetails.push(`Ph: ${schoolData.phone}`)
      if (schoolData.email) schoolDetails.push(`Email: ${schoolData.email}`)

      if (schoolDetails.length > 0) {
        doc.text(schoolDetails.join(' | '), pageWidth / 2, currentY, { align: 'center' })
        currentY += 6
      }

      // Divider line
      doc.setDrawColor(...PDF_COLORS.border)
      doc.setLineWidth(0.5)
      doc.line(margin + 10, currentY, pageWidth - margin - 10, currentY)
      currentY += 9

      // Certificate Type
      doc.setFont(PDF_FONTS.primary, 'bolditalic')
      doc.setFontSize(16)
      doc.setTextColor(...PDF_COLORS.secondary)
      doc.text(certificateTypeLabel, pageWidth / 2, currentY, { align: 'center' })
      currentY += 13

      // Main Content
      const startY = currentY
      doc.setFont(PDF_FONTS.primary, 'normal')
      doc.setFontSize(12)
      doc.setTextColor(...PDF_COLORS.textDark)

      // Certificate text with actual data using formatDate utility
      const joiningDate = formatDate(staffData.joining_date, 'long')
      const currentDate = formatDate(new Date().toISOString(), 'long')

      let certificateText = ''
      const staffFullName = `${staffData.first_name} ${staffData.last_name || ''}`.trim()
      const staffDesignation = staffData.designation || 'Staff Member'
      const staffDepartment = staffData.department || 'General'

      if (certificateType === 'experience') {
        certificateText = `This is to certify that ${staffFullName}${staffData.father_name ? `, S/o ${staffData.father_name},` : ''} has worked with ${schoolData.name} as ${staffDesignation} in the ${staffDepartment} department from ${joiningDate} to ${currentDate}. During this period, they have shown dedication, professionalism, and commitment to their duties.`
      } else if (certificateType === 'relieving') {
        certificateText = `This is to certify that ${staffFullName}, Employee Number: ${staffData.employee_number}, has been relieved from their duties as ${staffDesignation} at ${schoolData.name} effective ${currentDate}. During their tenure from ${joiningDate}, they have cleared all dues and obligations. We wish them all the best in their future endeavors.`
      } else if (certificateType === 'appreciation') {
        certificateText = `This certificate is presented to ${staffFullName} in recognition of their outstanding contribution and dedicated service as ${staffDesignation} at ${schoolData.name}. Their commitment, excellence, and professionalism have significantly contributed to our institution's success and growth.`
      } else {
        // For custom certificate types
        certificateText = `This is to certify that ${staffFullName} has been associated with ${schoolData.name} as ${staffDesignation}. This ${certificateTypeLabel} is issued as per their request and in recognition of their valuable contribution to our institution.`
      }

      // Text wrapping with better formatting
      const lines = doc.splitTextToSize(certificateText, contentWidth - 40)
      doc.text(lines, pageWidth / 2, startY, { align: 'center', maxWidth: contentWidth - 40 })

      // Staff Information - Professional Box Design
      const infoY = startY + (lines.length * 7) + 18
      const boxY = infoY
      const boxHeight = 35
      const leftMargin = margin + 20

      // Info box with light background
      doc.setFillColor(250, 250, 250)
      doc.rect(leftMargin, boxY, contentWidth - 40, boxHeight, 'F')
      doc.setDrawColor(...PDF_COLORS.border)
      doc.setLineWidth(0.3)
      doc.rect(leftMargin, boxY, contentWidth - 40, boxHeight, 'S')

      // Staff Details - Two Column Layout
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...PDF_COLORS.textDark)

      let staffInfoY = boxY + 8
      const col1X = leftMargin + 5
      const col2X = leftMargin + (contentWidth - 40) / 2 + 5

      // Row 1
      doc.setTextColor(...PDF_COLORS.textLight)
      doc.text('Name:', col1X, staffInfoY)
      doc.text("Father's Name:", col2X, staffInfoY)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...PDF_COLORS.textDark)
      doc.text(staffFullName, col1X + 25, staffInfoY)
      doc.text(staffData.father_name || 'N/A', col2X + 30, staffInfoY)

      // Row 2
      staffInfoY += 8
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...PDF_COLORS.textLight)
      doc.text('Designation:', col1X, staffInfoY)
      doc.text('Department:', col2X, staffInfoY)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...PDF_COLORS.textDark)
      doc.text(staffDesignation, col1X + 25, staffInfoY)
      doc.text(staffDepartment, col2X + 30, staffInfoY)

      // Row 3
      staffInfoY += 8
      doc.setFont(PDF_FONTS.secondary, 'normal')
      doc.setTextColor(...PDF_COLORS.textLight)
      doc.text('Employee Number:', col1X, staffInfoY)
      doc.text('Joining Date:', col2X, staffInfoY)

      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.setTextColor(...PDF_COLORS.textDark)
      doc.text(staffData.employee_number || 'N/A', col1X + 35, staffInfoY)
      doc.text(joiningDate, col2X + 30, staffInfoY)

      // Row 4 - Issue Date (optional based on settings)
      if (settings.showIssueDate !== false) {
        staffInfoY += 8
        doc.setFont(PDF_FONTS.secondary, 'normal')
        doc.setTextColor(...PDF_COLORS.textLight)
        doc.text('Issue Date:', col1X, staffInfoY)

        doc.setFont(PDF_FONTS.secondary, 'bold')
        doc.setTextColor(...PDF_COLORS.textDark)
        doc.text(currentDate, col1X + 25, staffInfoY)
      }

      // Signature Section using utility function
      const sigY = boxY + boxHeight + 20
      const signatures = [
        {
          label: 'Authorized By',
          name: settings.principalName || schoolData.principal_name || '',
          title: settings.principalDesignation || 'Principal / Head of Institution'
        },
        {
          label: 'Issued By',
          name: '',
          title: 'HR Department'
        }
      ]
      addSignatureSection(doc, signatures, sigY)

      // Add principal signature image if provided in settings
      if (settings.principalSignature) {
        try {
          const sigImg = settings.principalSignature
          const sigFormat = sigImg.includes('data:image/jpeg') || sigImg.includes('data:image/jpg') ? 'JPEG' : 'PNG'
          const signatureWidth = (pageWidth - 40) / signatures.length
          const xPos = 20 + (0 * signatureWidth)
          // Place above the signature line
          doc.addImage(sigImg, sigFormat, xPos + 5, sigY - 18, 40, 20)
        } catch (e) {
          console.error('Error adding principal signature image', e)
        }
      }

      // Certificate Number (bottom left) - optional
      if (settings.showSerialNumber) {
        const certNumber = `CERT-${Date.now()}-${staffData.employee_number}`
        doc.setFont(PDF_FONTS.secondary, 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...PDF_COLORS.textLight)
        doc.text(certNumber, leftMargin, pageHeight - 20)
      }

      // School Stamp placeholder (right side)
      doc.setDrawColor(...PDF_COLORS.border)
      doc.setLineWidth(0.5)
      const stampX = pageWidth - margin - 50
      const stampY = sigY - 5
      doc.circle(stampX + 20, stampY + 15, 18, 'S')
      doc.setFontSize(7)
      doc.text('SCHOOL', stampX + 20, stampY + 13, { align: 'center' })
      doc.text('STAMP', stampX + 20, stampY + 18, { align: 'center' })

      // Professional Footer using utility (with global PDF settings)
      addPDFFooter(doc, 1, 1, globalPdfSettings)

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)

      // Set state for preview modal
      const fileName = `${certificateTypeLabel.replace(/\s+/g, '_')}_${staffData.first_name}_${staffData.last_name}_${Date.now()}.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('Certificate generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating certificate:', error)
      showToast('Error generating certificate PDF', 'error')
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
  }

  // Save certificate to database and generate PDF
  const handleGenerateCertificate = async () => {
    if (!staffData) {
      showToast('Please select a staff member first', 'warning')
      return
    }

    if (!schoolData) {
      showToast('School data not loaded', 'error')
      return
    }

    // Check if the selected certificate type can be saved to database
    const currentType = certificateTypes.find(ct => ct.value === certificateType)
    const isDbSafe = currentType?.dbSafe || false

    try {
      setSaving(true)

      // Generate certificate number
      const certificateNumber = `CERT-${Date.now()}-${staffData.employee_number}`

      // Only save to database if it's a valid database type
      if (isDbSafe) {
        const { error } = await supabase
          .from('staff_certificates')
          .insert({
            user_id: currentUser.id,
            staff_id: staffData.id,
            school_id: currentUser.school_id,
            certificate_type: certificateType, // Only 'experience', 'relieving', 'appreciation'
            issue_date: new Date().toISOString().split('T')[0],
            issued_by: currentUser.username || currentUser.email,
            certificate_number: certificateNumber,
            created_by: currentUser.id
          })

        if (error) throw error
        showToast('Certificate saved to database successfully!', 'success')

        // Refresh list if we're in list view
        if (activeSection === 'list') {
          fetchCreatedCertificates()
        }
      } else {
        // For custom types, just show a message
        showToast('Custom certificate type - PDF only (not saved to database)', 'info')
      }

      // Generate PDF for all types (including custom)
      generatePDFCertificate()

      showToast('PDF certificate generated successfully!', 'success')
    } catch (error) {
      console.error('Error saving certificate:', error)
      showToast('Error saving certificate: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  // Handle delete certificate
  const handleDeleteCertificate = async (certId) => {
    setItemToDelete(certId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const { error } = await supabase
        .from('staff_certificates')
        .delete()
        .eq('id', itemToDelete)

      if (error) throw error

      setCreatedCertificates(prev => prev.filter(cert => cert.id !== itemToDelete))
      showToast('Certificate deleted successfully', 'success')
      setShowDeleteModal(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('Error deleting certificate:', error)
      showToast('Failed to delete certificate', 'error')
    }
  }

  // Handle print/regenerate certificate
  const handlePrintCertificate = async (cert) => {
    try {
      // Set the staff data and certificate type from the saved certificate
      const staff = cert.staff
      if (!staff) {
        showToast('Staff data not found', 'error')
        return
      }

      // Temporarily set state to regenerate the PDF
      setStaffData(staff)
      setCertificateType(cert.certificate_type)

      // Wait a moment for state to update then generate
      setTimeout(() => {
        generatePDFCertificate()
      }, 100)
    } catch (error) {
      console.error('Error printing certificate:', error)
      showToast('Failed to print certificate', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-1.5 sm:p-2 md:p-3 lg:p-4">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-2 sm:px-3 py-1.5 sm:py-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-[#1E3A8A] p-1.5 sm:p-2 rounded-lg">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Staff Certificates</h1>
              <p className="text-xs sm:text-sm text-gray-500">Generate and manage staff certificates</p>
            </div>
          </div>

          {/* Settings button (top-right) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded shadow-sm w-full sm:w-auto"
              aria-label="Certificate Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Buttons */}
      <div className="bg-white rounded-xl shadow-lg mb-4 mx-2 sm:mx-4 mt-2 sm:mt-4">
        <div className="border-b border-gray-200">
          <div className="flex flex-wrap gap-2 p-2.5 sm:p-3.5">
            <button
              onClick={() => setActiveSection('generate')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeSection === 'generate'
                  ? 'bg-[#D12323] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Plus size={16} />
              <span>Generate Certificates</span>
            </button>
            <button
              onClick={() => setActiveSection('list')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeSection === 'list'
                  ? 'bg-[#D12323] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText size={16} />
              <span>Created List</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-bold ${
                activeSection === 'list' ? 'bg-white/20' : 'bg-gray-300'
              }`}>
                {createdCertificates.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Compact */}
      <div className="p-2 sm:p-4">
        {activeSection === 'generate' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">

          {/* Certificate Selection Row */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4">
            
            {/* Certificate Type Dropdown with Add New */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Certificate Type
              </label>
              <div className="flex gap-2">
                <select
                  value={certificateType}
                  onChange={(e) => {
                    if (e.target.value === 'add_new') {
                      setShowAddNewType(true)
                    } else {
                      setCertificateType(e.target.value)
                    }
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  {certificateTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                  <option value="add_new">+ Add New Type</option>
                </select>
              </div>

              {/* Add New Type Input */}
              {showAddNewType && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter new certificate type"
                      value={newCertificateType}
                      onChange={(e) => setNewCertificateType(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewType()}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleAddNewType}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowAddNewType(false)
                        setNewCertificateType('')
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Custom types will generate PDF only (not saved to database)
                  </p>
                </div>
              )}
            </div>

            {/* Staff Search Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Staff Member
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or employee number"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                {/* Dropdown List */}
                {showDropdown && filteredStaff.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                    {filteredStaff.map((staff) => (
                      <button
                        key={staff.id}
                        onClick={() => handleStaffSelect(staff)}
                        className="w-full px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900 text-sm">
                          {staff.first_name} {staff.last_name || ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          {staff.employee_number} • {staff.designation || 'N/A'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && searchQuery && filteredStaff.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm z-50">
                    No staff member found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Certificate Information - Compact Grid */}
          {staffData && (
            <>
              <div className="border-t border-gray-200 pt-3 sm:pt-4 mb-4">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3 uppercase tracking-wide">
                  Certificate Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={`${staffData.first_name} ${staffData.last_name || ''}`}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Father Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Father Name
                    </label>
                    <input
                      type="text"
                      value={staffData.father_name || 'N/A'}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={staffData.designation || 'N/A'}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={staffData.department || 'N/A'}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Employee Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employee #
                    </label>
                    <input
                      type="text"
                      value={staffData.employee_number}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="text"
                      value={
                        staffData.joining_date
                          ? new Date(staffData.joining_date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'N/A'
                      }
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Issue Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="text"
                      value={new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Generate Button - Red */}
              <div className="flex justify-start pt-2">
                <button
                  onClick={handleGenerateCertificate}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 bg-red-600 hover:bg-red-700 text-white px-4 sm:px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto text-sm sm:text-base"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  {saving ? 'Generating...' : 'Generate Certificate PDF'}
                </button>
              </div>
            </>
          )}

          {/* No Data Message */}
          {!staffData && !loading && allStaff.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Select a staff member to generate certificate</p>
              <p className="text-xs mt-1.5">Total Staff: {allStaff.length}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
              <p className="text-sm">Loading staff data...</p>
            </div>
          )}
        </div>
        )}

        {/* Created Certificates List */}
        {activeSection === 'list' && (
          <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-5">
            {/* Filters */}
            <div className="mb-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              >
                <option value="">All Departments</option>
                <option value="Teaching">Teaching</option>
                <option value="Administration">Administration</option>
                <option value="Support">Support</option>
              </select>
            </div>

            {/* List */}
            {loadingList ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 text-gray-600">Loading certificates...</p>
              </div>
            ) : createdCertificates.filter(cert => {
              const staff = cert.staff
              const matchesName = !searchName ||
                `${staff?.first_name} ${staff?.last_name}`.toLowerCase().includes(searchName.toLowerCase())
              const matchesDepartment = !selectedDepartment || staff?.department === selectedDepartment
              return matchesName && matchesDepartment
            }).length === 0 ? (
              <div className="text-center py-10">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600">No certificates found</p>
              </div>
            ) : (
              <ResponsiveTableWrapper
                tableView={
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-blue-900 text-white text-xs sm:text-sm">
                          <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Sr.</th>
                          <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Staff Name</th>
                          <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Designation</th>
                          <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Department</th>
                          <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Type</th>
                          <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Issue Date</th>
                          <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-center font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createdCertificates
                          .filter(cert => {
                            const staff = cert.staff
                            const matchesName = !searchName ||
                              `${staff?.first_name} ${staff?.last_name}`.toLowerCase().includes(searchName.toLowerCase())
                            const matchesDepartment = !selectedDepartment || staff?.department === selectedDepartment
                            return matchesName && matchesDepartment
                          })
                          .map((cert, index) => {
                            const staff = cert.staff
                            return (
                              <tr key={cert.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 border border-gray-200 text-sm">{index + 1}</td>
                                <td className="px-3 py-2 border border-gray-200 text-sm font-medium">
                                  {staff?.first_name} {staff?.last_name}
                                </td>
                                <td className="px-3 py-2 border border-gray-200 text-sm">{staff?.designation || 'N/A'}</td>
                                <td className="px-3 py-2 border border-gray-200 text-sm">{staff?.department || 'N/A'}</td>
                                <td className="px-3 py-2 border border-gray-200">
                                  <span className="inline-block px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold capitalize">
                                    {cert.certificate_type}
                                  </span>
                                </td>
                                <td className="px-3 py-2 border border-gray-200 text-sm">
                                  {new Date(cert.issue_date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-3 py-2 border border-gray-200">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handlePrintCertificate(cert)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                      title="Print"
                                    >
                                      <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCertificate(cert.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                }
                cardView={
                  <div className="space-y-3">
                    {createdCertificates
                      .filter(cert => {
                        const staff = cert.staff
                        const matchesName = !searchName ||
                          `${staff?.first_name} ${staff?.last_name}`.toLowerCase().includes(searchName.toLowerCase())
                        const matchesDepartment = !selectedDepartment || staff?.department === selectedDepartment
                        return matchesName && matchesDepartment
                      })
                      .map((cert) => {
                        const staff = cert.staff
                        return (
                          <DataCard key={cert.id}>
                            <CardHeader
                              title={`${staff?.first_name} ${staff?.last_name}`}
                              subtitle={staff?.designation || 'N/A'}
                              badge={
                                <span className="px-2 py-0.5 bg-green-500 text-white rounded text-xs font-semibold capitalize">
                                  {cert.certificate_type}
                                </span>
                              }
                            />
                            <CardInfoGrid>
                              <CardRow label="Department" value={staff?.department || 'N/A'} />
                              <CardRow label="Issue Date" value={new Date(cert.issue_date).toLocaleDateString('en-GB')} />
                            </CardInfoGrid>
                            <CardActions>
                              <button
                                onClick={() => handlePrintCertificate(cert)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition"
                              >
                                <Printer size={14} />
                                <span>Print</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCertificate(cert.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </CardActions>
                          </DataCard>
                        )
                      })}
                  </div>
                }
                loading={loadingList}
                empty={createdCertificates.length === 0}
              />
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-16 px-2 sm:px-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}></div>
          <div className="relative w-full sm:w-3/4 lg:w-2/3 xl:w-1/2 bg-white rounded-lg shadow-lg overflow-hidden z-50 max-h-[90vh] sm:max-h-auto">
            <div className="flex items-center justify-between px-3 sm:px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold">Certificate Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 sm:p-5 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto space-y-4">
              {/* Header & Branding */}
              <div>
                <h4 className="text-xs sm:text-sm font-semibold mb-2">HEADER & BRANDING</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Institute Name</label>
                    <input type="text" value={certificateSettings.instituteName} onChange={(e) => setCertificateSettings(prev => ({...prev, instituteName: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Header Subtitle</label>
                    <input type="text" value={certificateSettings.headerSubtitle} onChange={(e) => setCertificateSettings(prev => ({...prev, headerSubtitle: e.target.value }))} placeholder="e.g., CERTIFICATE OF ACHIEVEMENT" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="showLogo" checked={certificateSettings.showLogo} onChange={(e) => setCertificateSettings(prev => ({...prev, showLogo: e.target.checked }))} />
                    <label className="text-sm text-gray-600" htmlFor="showLogo">Show School Logo</label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Logo Size</label>
                    <select value={certificateSettings.logoSize} onChange={(e) => setCertificateSettings(prev => ({...prev, logoSize: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Color Settings */}
              <div>
                <h4 className="text-xs sm:text-sm font-semibold mb-2">COLOR SETTINGS</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Border Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={certificateSettings.borderColor} onChange={(e) => setCertificateSettings(prev => ({...prev, borderColor: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                      <input value={certificateSettings.borderColor} onChange={(e) => setCertificateSettings(prev => ({...prev, borderColor: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Header Text Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={certificateSettings.headerTextColor} onChange={(e) => setCertificateSettings(prev => ({...prev, headerTextColor: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                      <input value={certificateSettings.headerTextColor} onChange={(e) => setCertificateSettings(prev => ({...prev, headerTextColor: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={certificateSettings.textColor} onChange={(e) => setCertificateSettings(prev => ({...prev, textColor: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                      <input value={certificateSettings.textColor} onChange={(e) => setCertificateSettings(prev => ({...prev, textColor: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={certificateSettings.accentColor} onChange={(e) => setCertificateSettings(prev => ({...prev, accentColor: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                      <input value={certificateSettings.accentColor} onChange={(e) => setCertificateSettings(prev => ({...prev, accentColor: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Settings */}
              <div>
                <h4 className="text-xs sm:text-sm font-semibold mb-2">SIGNATURE SETTINGS</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Principal Signature Image</label>
                    <input type="file" accept="image/*" onChange={handleSignatureUpload} className="w-full text-sm" />
                    {certificateSettings.principalSignature && (
                      <img src={certificateSettings.principalSignature} alt="signature" className="mt-2 h-12 object-contain" />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Principal Name</label>
                    <input type="text" value={certificateSettings.principalName} onChange={(e) => setCertificateSettings(prev => ({...prev, principalName: e.target.value }))} placeholder="e.g., Dr. John Smith" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Principal Designation</label>
                    <input type="text" value={certificateSettings.principalDesignation} onChange={(e) => setCertificateSettings(prev => ({...prev, principalDesignation: e.target.value }))} placeholder="e.g., Principal" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              {/* Border & Footer */}
              <div>
                <h4 className="text-xs sm:text-sm font-semibold mb-2">BORDER & DESIGN</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="showBorder" checked={certificateSettings.showBorder} onChange={(e) => setCertificateSettings(prev => ({...prev, showBorder: e.target.checked }))} />
                    <label htmlFor="showBorder" className="text-sm text-gray-600">Show Border</label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Border Style</label>
                    <select value={certificateSettings.borderStyle} onChange={(e) => setCertificateSettings(prev => ({...prev, borderStyle: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                      <option value="decorative">Decorative</option>
                      <option value="simple">Simple</option>
                      <option value="gold">Gold</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <h4 className="text-xs sm:text-sm font-semibold mb-2">FOOTER SETTINGS</h4>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="showIssueDate" checked={certificateSettings.showIssueDate} onChange={(e) => setCertificateSettings(prev => ({...prev, showIssueDate: e.target.checked }))} />
                      <label htmlFor="showIssueDate" className="text-sm text-gray-600">Show Issue Date</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="showSerialNumber" checked={certificateSettings.showSerialNumber} onChange={(e) => setCertificateSettings(prev => ({...prev, showSerialNumber: e.target.checked }))} />
                      <label htmlFor="showSerialNumber" className="text-sm text-gray-600">Show Serial Number</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-3 sm:px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setShowSettingsModal(false)} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-gray-300 text-sm w-full sm:w-auto hover:bg-gray-100 transition">Cancel</button>
              <button onClick={() => setShowResetConfirm(true)} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm w-full sm:w-auto transition">Reset</button>
              <button onClick={handleSaveSettings} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm w-full sm:w-auto transition">Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal (red) */}
      {showResetConfirm && (
        <ModalOverlay onClose={() => setShowResetConfirm(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-3 md:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95%] sm:max-w-md md:max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 rounded-t-xl">
                <h3 className="text-sm sm:text-base md:text-lg font-bold">Reset Certificate Settings</h3>
              </div>
              <div className="p-3 sm:p-4 md:p-5 lg:p-6">
                <p className="text-gray-700 text-xs sm:text-sm md:text-base mb-3 sm:mb-4">
                  This will remove the uploaded signature and restore defaults. Are you sure you want to continue?
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 text-gray-700 font-medium text-xs sm:text-sm hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={performResetSettings}
                    className="flex-1 py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 bg-red-600 text-white font-medium text-xs sm:text-sm rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5 sm:gap-2"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <ModalOverlay onClose={() => setShowDeleteModal(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-3 md:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95%] sm:max-w-md md:max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 rounded-t-xl">
                <h3 className="text-sm sm:text-base md:text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-3 sm:p-4 md:p-5 lg:p-6">
                <p className="text-gray-700 text-xs sm:text-sm md:text-base mb-3 sm:mb-4">
                  Are you sure you want to delete this certificate? This action cannot be undone.
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 text-gray-700 font-medium text-xs sm:text-sm hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 bg-red-600 text-white font-medium text-xs sm:text-sm rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1.5 sm:gap-2"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-[9999] space-y-2 w-[calc(100%-1rem)] sm:w-auto max-w-[calc(100%-1rem)] sm:max-w-md">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 sm:gap-3 min-w-0 sm:min-w-[280px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-600' :
              toast.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
            <span className="flex-1 text-xs sm:text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        ))}
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

export default function HRCertificatesPage() {
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
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="staff_certificates_view"
      pageName="Staff Certificates"
    >
      <HRCertificatesContent />
    </PermissionGuard>
  )
}