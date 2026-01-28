'use client'

import { useState, useEffect } from 'react'
import { CreditCard, ChevronDown, CheckCircle, XCircle, AlertCircle, X, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { convertImageToBase64 } from '@/lib/pdfUtils'
import { getPdfSettings } from '@/lib/pdfSettings'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

function StaffIDCardsContent() {
  const [validityUpto, setValidityUpto] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [staffData, setStaffData] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [allStaff, setAllStaff] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

  // ID Card settings defaults and state (persist per-school in localStorage)
  const DEFAULT_IDCARD_SETTINGS = {
    instituteName: '',
    headerSubtitle: 'STAFF ID CARD',
    showLogo: true,
    logoShape: 'circle', // circle | square
    logoSize: 'medium', // small | medium | large
    logoPosition: 'left', // left | center | right
    headerBg: '#00008B', // default dark blue
    headerTextColor: '#ffffff',
    accentColor: '#F4A460',
    textColor: '#000000',
    photoShape: 'rectangle', // rectangle | circle
    photoSize: 'medium', // small | medium | large
    photoPosition: 'right',
    photoBorderColor: '#000000',
    frontFields: {
      name: true,
      employeeNo: true,
      designation: true,
      joining: true,
      expiry: true,
      signature: true
    },
    cardOrientation: 'horizontal', // horizontal | vertical
    headerFont: 'helvetica',
    labelFont: 'helvetica',
    valueFont: 'helvetica',
    backHeaderText: '',
    showLogoOnBack: true,
    showQRCode: true,
    qrData: '',
    qrSize: 'medium',
    terms: [
      'This card is property of the institution.',
      'If found, please return to the address below.',
      'This card is non-transferable.',
      'Card holder must carry this card at all times on premises.'
    ]
  }

  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [idCardSettings, setIdCardSettings] = useState(() => ({ ...DEFAULT_IDCARD_SETTINGS }))

  // Inline confirmation for resetting ID card settings
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Disable background scroll when settings or confirm modal open
  useEffect(() => {
    const locked = showSettingsModal || showResetConfirm
    if (locked) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showSettingsModal, showResetConfirm])
  // Load settings for school from localStorage
  useEffect(() => {
    if (!currentUser?.school_id) return
    const key = `idcard_settings_${currentUser.school_id}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) setIdCardSettings(prev => ({ ...prev, ...JSON.parse(raw) }))
      else setIdCardSettings(prev => ({ ...prev, instituteName: schoolData?.name || prev.instituteName }))
    } catch (e) {
      console.error('Error loading idcard settings', e)
    }
  }, [currentUser, schoolData])

  const saveIdCardSettings = () => {
    if (!currentUser?.school_id) return showToast('Unable to save: no school context', 'error')
    try {
      const key = `idcard_settings_${currentUser.school_id}`
      localStorage.setItem(key, JSON.stringify(idCardSettings))
      setShowSettingsModal(false)
      showToast('ID card settings saved', 'success')
    } catch (e) {
      console.error('Error saving idcard settings', e)
      showToast('Error saving settings', 'error')
    }
  }

  // Open reset confirmation (no window.confirm)
  const handleResetIdcard = () => {
    setShowResetConfirm(true)
  }

  // Perform reset of ID card settings
  const performResetIdcard = () => {
    setIdCardSettings({ ...DEFAULT_IDCARD_SETTINGS })
    try {
      if (currentUser?.school_id) {
        const key = `idcard_settings_${currentUser.school_id}`
        localStorage.removeItem(key)
      }
    } catch (e) {
      console.error('Error removing idcard settings from storage', e)
    }
    setShowResetConfirm(false)
    setShowSettingsModal(false)
    showToast('ID card settings reset to defaults', 'success')
  }

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

  // Get current user
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

    // Set default validity date to 1 year from now
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    setValidityUpto(nextYear.toISOString().split('T')[0])
  }, [])

  // Fetch school and staff data
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchSchoolData()
      fetchAllStaff()
    }
  }, [currentUser])

  // Filter staff
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

  // Fetch school data
  const fetchSchoolData = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error

      // Convert logo URL to base64 if it exists
      let logoBase64 = data?.logo_url
      if (data?.logo_url && (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://'))) {
        try {
          logoBase64 = await convertImageToBase64(data.logo_url)
        } catch (err) {
          console.error('Error converting logo to base64:', err)
        }
      }

      setSchoolData({
        ...data,
        logo: logoBase64 // Store as 'logo' for consistency
      })
    } catch (error) {
      console.error('Error fetching school data:', error)
      showToast('Error loading school data', 'error')
    }
  }

  // Fetch all staff
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

  // Handle staff selection
  const handleStaffSelect = (staff) => {
    setStaffData(staff)
    setSelectedStaffId(staff.id)
    setSearchQuery(`${staff.first_name} ${staff.last_name || ''} (${staff.employee_number})`)
    setShowDropdown(false)
  }

  // Convert image URL to base64
  const getImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error converting image:', error)
      return null
    }
  }

  // Create circular image from base64
  const createCircularImage = (base64Image, size) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      canvas.width = size
      canvas.height = size

      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      const img = new Image()
      img.onload = () => {
        const scale = Math.max(size / img.width, size / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (size - scaledWidth) / 2
        const y = (size - scaledHeight) / 2

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = base64Image
    })
  }

  // Generate QR Code
  const generateQRCode = async (text) => {
    try {
      return await QRCode.toDataURL(text, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      return null
    }
  }

  // Generate ID Card PDF
  const generateIDCardPDF = async () => {
    if (!staffData || !schoolData) {
      showToast('Missing required data', 'error')
      return
    }

    try {
      setSaving(true)

      // Ensure we can obtain a data URL for the logo (returns null if not possible)
      const ensureLogoDataUrl = async (logo) => {
        if (!logo) return null
        if (typeof logo === 'string' && logo.startsWith('data:')) return logo

        // Try fetch + blob -> dataURL
        try {
          const converted = await convertImageToBase64(logo)
          if (converted) return converted
        } catch (e) {
          console.warn('convertImageToBase64 failed', e)
        }

        // Fallback: try loading via Image + canvas (requires CORS on source)
        try {
          const img = await new Promise((resolve, reject) => {
            const image = new Image()
            image.crossOrigin = 'Anonymous'
            image.onload = () => resolve(image)
            image.onerror = (err) => reject(err)
            image.src = logo
          })

          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)

          try {
            return canvas.toDataURL('image/png')
          } catch (e) {
            console.warn('canvas.toDataURL failed', e)
          }
        } catch (e) {
          console.warn('Image load fallback failed for logo', e)
        }

        return null
      }

      let logoBase64 = null
      if (schoolData?.logo) {
        logoBase64 = await ensureLogoDataUrl(schoolData.logo)
        if (!logoBase64 && s.showLogo) {
          // Do not keep remote URL fallback because addImage won't accept remote URLs reliably
          showToast('Unable to load school logo (CORS or network issue); using placeholder instead', 'warning')
        }
        console.debug('Logo data URL available?', !!logoBase64)
      }

      // Get global PDF settings and merge with card settings
      const globalPdfSettings = getPdfSettings()
      console.log('📄 Using global PDF settings for ID Card:', globalPdfSettings)

      // Merge card settings with global PDF settings (card settings take priority)
      const s = {
        ...globalPdfSettings,
        ...(idCardSettings || {})
      }

      const hexToRgbArray = (hex) => {
        if (!hex) return [0,0,0]
        const sanitized = hex.replace('#','')
        const bigint = parseInt(sanitized, 16)
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
      }

      // Orientation support (vertical card option) - use global settings if no card-specific orientation
      const isVertical = s.cardOrientation === 'vertical'
      const orientation = isVertical ? 'portrait' : 'landscape'
      const format = isVertical ? [53.98, 85.6] : [85.6, 53.98]

      // Create PDF - ID Card size
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format
      })

      const cardWidth = isVertical ? 53.98 : 85.6
      const cardHeight = isVertical ? 85.6 : 53.98

      // Compute color helpers based on settings
      const headerRgb = hexToRgbArray(s.headerBg || '#1f4e78')
      const textRgb = hexToRgbArray(s.textColor || '#000000')
      const accentRgb = hexToRgbArray(s.accentColor || '#F4A460')
      const photoBorderRgb = hexToRgbArray(s.photoBorderColor || '#C8C8C8')

      // ========== FRONT SIDE ==========

      // White background
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, cardWidth, cardHeight, 'F')

      // Header
      doc.setFillColor(...headerRgb)
      doc.rect(0, 0, cardWidth, 12, 'F')

      // School logo placement (respect showLogo, shape, size, position)
      try {
        const sizeMap = { small: 6, medium: 9, large: 12 }
        const logoSize = sizeMap[s.logoSize] || 9
        const logoRadius = logoSize / 2

        // Logo positioning based on logoPosition setting
        let logoCenterX = 6  // Default left position
        if (s.logoPosition === 'center') {
          logoCenterX = cardWidth / 2
        } else if (s.logoPosition === 'right') {
          logoCenterX = cardWidth - 6
        }

        const logoX = logoCenterX - logoRadius
        const logoY = 6 - logoRadius

        doc.setFillColor(255,255,255)

        if (s.showLogo && logoBase64) {
          // Attempt to add image only when we have a data URL
          if (typeof logoBase64 === 'string' && logoBase64.startsWith('data:')) {
            let format = 'PNG'
            if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) format = 'JPEG'

            try {
              // If circle shape is selected, create circular version of logo
              if (s.logoShape === 'circle') {
                // Draw white circle background
                doc.circle(logoCenterX, 6, logoRadius, 'F')
                // Create circular version of the logo
                const circularLogo = await createCircularImage(logoBase64, logoSize * 10) // Higher resolution
                doc.addImage(circularLogo, 'PNG', logoX, logoY, logoSize, logoSize)
              } else {
                // Draw white rectangle background
                doc.rect(logoX, logoY, logoSize, logoSize, 'F')
                // Add rectangular logo
                doc.addImage(logoBase64, format, logoX, logoY, logoSize, logoSize)
              }
            } catch (e) {
              console.warn('addImage failed for logo; keeping placeholder background', e)
              // Draw placeholder
              if (s.logoShape === 'circle') {
                doc.circle(logoCenterX, 6, logoRadius, 'F')
              } else {
                doc.rect(logoX, logoY, logoSize, logoSize, 'F')
              }
            }
          } else {
            // No valid data URL, just show white background
            if (s.logoShape === 'circle') {
              doc.circle(logoCenterX, 6, logoRadius, 'F')
            } else {
              doc.rect(logoX, logoY, logoSize, logoSize, 'F')
            }
          }
        } else if (s.showLogo) {
          // Show placeholder according to selected size/shape/position
          if (s.logoShape === 'circle') {
            doc.circle(logoCenterX, 6, logoRadius, 'F')
          } else {
            doc.rect(logoX, logoY, logoSize, logoSize, 'F')
          }
        } else {
          // If logo is disabled, draw a small neutral placeholder on left
          const smallSize = 8
          doc.circle(6, 6, smallSize/2, 'F')
        }
      } catch (error) {
        console.error('Could not add or render header logo:', error, error.stack)
      }

      // School name in header (use instituteName override)
      doc.setTextColor(...hexToRgbArray(s.headerTextColor || '#ffffff'))
      doc.setFontSize(10)
      doc.setFont(s.headerFont || 'helvetica', 'bold')
      const schoolNameDisplay = (s.instituteName || schoolData.name || '').toUpperCase() || 'SCHOOL NAME'
      doc.text(schoolNameDisplay, cardWidth / 2, 7, { align: 'center' })

      // Header subtitle
      doc.setFontSize(7)
      doc.setFont(s.headerFont || 'helvetica', 'normal')
      const subtitle = s.headerSubtitle || 'STAFF ID CARD'
      doc.text(subtitle, cardWidth / 2, 10.5, { align: 'center' })

      // Left side - Staff information
      const leftMargin = 5
      let yPos = 18

      doc.setTextColor(...textRgb)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')

      // Prepare staff name for use across the page
      const staffName = `${staffData.first_name} ${staffData.last_name || ''}`.trim()

      // Conditionally render front fields based on settings
      const ff = s.frontFields || {}
      if (ff.name) {
        doc.text('Name', leftMargin, yPos)
        doc.text(':', leftMargin + 20, yPos)
        doc.setFont(s.labelFont || 'helvetica', 'bold')
        doc.text(staffName, leftMargin + 22, yPos)
        yPos += 5
      }

      if (ff.employeeNo) {
        doc.setFont(s.labelFont || 'helvetica', 'normal')
        doc.text('Employee No', leftMargin, yPos)
        doc.text(':', leftMargin + 20, yPos)
        doc.setFont(s.valueFont || 'helvetica', 'bold')
        doc.text(staffData.employee_number || 'N/A', leftMargin + 22, yPos)
        yPos += 5
      }

      if (ff.designation) {
        doc.setFont(s.labelFont || 'helvetica', 'normal')
        doc.text('Designation', leftMargin, yPos)
        doc.text(':', leftMargin + 20, yPos)
        doc.setFont(s.valueFont || 'helvetica', 'bold')
        doc.text(staffData.designation || 'Staff', leftMargin + 22, yPos)
        yPos += 5
      }

      if (ff.joining && staffData.joining_date) {
        doc.setFont(s.labelFont || 'helvetica', 'normal')
        doc.text('Joining', leftMargin, yPos)
        doc.text(':', leftMargin + 20, yPos)
        doc.setFont(s.valueFont || 'helvetica', 'bold')
        const joiningDate = new Date(staffData.joining_date).getFullYear()
        doc.text(joiningDate.toString(), leftMargin + 22, yPos)
        yPos += 5
      }

      // Photo placement (support left, center, right) and size mapping
      const photoY = 17
      const photoSizeMap = { small: 18, medium: 22, large: 26 }
      let photoSize = photoSizeMap[s.photoSize] || 22

      // Compute X position dynamically so center works and right aligns to margin
      const photoMargin = 8
      let photoX = photoMargin
      if (s.photoPosition === 'left') {
        photoX = photoMargin
      } else if (s.photoPosition === 'center') {
        photoX = (cardWidth - photoSize) / 2
      } else {
        // right (default)
        photoX = cardWidth - photoSize - photoMargin
      }

      if (staffData.photo_url) {
        try {
          const photoBase64 = await getImageAsBase64(staffData.photo_url)
          if (photoBase64) {
            if (s.photoShape === 'circle') {
              // create circular image sized proportionally for better quality
              const circularPhoto = await createCircularImage(photoBase64, Math.max(200, Math.round(photoSize * 10)))
              doc.addImage(circularPhoto, 'PNG', photoX, photoY, photoSize, photoSize)

              // Draw circular border
              try {
                doc.setDrawColor(...photoBorderRgb)
                doc.setLineWidth(0.7)
                const cx = photoX + photoSize / 2
                const cy = photoY + photoSize / 2
                doc.circle(cx, cy, photoSize / 2, 'S')
              } catch (e) {
                console.error('Error drawing photo border (circle):', e, e.stack)
              }
            } else {
              // rectangle
              let format = 'PNG'
              if (photoBase64.includes('data:image/jpeg') || photoBase64.includes('data:image/jpg')) format = 'JPEG'
              doc.addImage(photoBase64, format, photoX, photoY, photoSize, photoSize)

              // Draw rectangle border
              try {
                doc.setDrawColor(...photoBorderRgb)
                doc.setLineWidth(0.7)
                doc.rect(photoX, photoY, photoSize, photoSize, 'S')
              } catch (e) {
                console.error('Error drawing photo border (rect):', e, e.stack)
              }
            }
          }
        } catch (error) {
          console.error('Could not load photo:', error, error.stack)
        }
      } else {
        // Placeholder circle/rect
        doc.setDrawColor(...photoBorderRgb)
        doc.setLineWidth(0.5)
        if (s.photoShape === 'circle') doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'S')
        else doc.rect(photoX, photoY, photoSize, photoSize, 'S')
      }

      // Expiry badge at bottom left (optional)
      if (ff.expiry) {
        doc.setFillColor(220, 38, 38) // Red color
        doc.roundedRect(5, cardHeight - 10, 25, 6, 1, 1, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        const expiryDate = validityUpto ? new Date(validityUpto).toLocaleDateString('en-GB').replace(/\//g, '-') : '01-01-25'
        doc.text(`Expiry: ${expiryDate}`, 17.5, cardHeight - 6, { align: 'center' })
      }

      // Expiry badge at bottom left
      doc.setFillColor(220, 38, 38) // Red color
      doc.roundedRect(5, cardHeight - 10, 25, 6, 1, 1, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      const expiryDate = validityUpto ? new Date(validityUpto).toLocaleDateString('en-GB').replace(/\//g, '-') : '01-01-25'
      doc.text(`Expiry: ${expiryDate}`, 17.5, cardHeight - 6, { align: 'center' })

      // Issuing Authority text at bottom right
      doc.setTextColor(...textRgb)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text('Issuing Authority', cardWidth - 5, cardHeight - 3, { align: 'right' })

      // ========== BACK SIDE ==========
      doc.addPage()

      // White background
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, cardWidth, cardHeight, 'F')

      // Header background (use same header color setting)
      doc.setFillColor(...headerRgb)
      doc.rect(0, 0, cardWidth, 12, 'F')

      // School logo circle - left side of header (use same size mapping)
      try {
        const sizeMap = { small: 6, medium: 9, large: 12 }
        const backLogoSize = sizeMap[s.logoSize] || 9
        const backLogoX = 6 - backLogoSize/2
        const backLogoY = 6 - backLogoSize/2

        doc.setFillColor(255, 255, 255)

        if (logoBase64 && typeof logoBase64 === 'string' && logoBase64.startsWith('data:')) {
          let format = 'PNG'
          if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) format = 'JPEG'

          try {
            // If circle shape is selected, create circular version of logo
            if (s.logoShape === 'circle') {
              // Draw white circle background
              doc.circle(6, 6, backLogoSize/2, 'F')
              // Create circular version of the logo
              const circularBackLogo = await createCircularImage(logoBase64, backLogoSize * 10)
              doc.addImage(circularBackLogo, 'PNG', backLogoX, backLogoY, backLogoSize, backLogoSize)
            } else {
              // Draw white rectangle background
              doc.rect(backLogoX, backLogoY, backLogoSize, backLogoSize, 'F')
              // Add rectangular logo
              doc.addImage(logoBase64, format, backLogoX, backLogoY, backLogoSize, backLogoSize)
            }
          } catch (e) {
            console.warn('addImage failed for back logo; keeping placeholder background', e)
            // Draw placeholder
            if (s.logoShape === 'circle') {
              doc.circle(6, 6, backLogoSize/2, 'F')
            } else {
              doc.rect(backLogoX, backLogoY, backLogoSize, backLogoSize, 'F')
            }
          }
        } else {
          // fallback placeholder
          if (s.logoShape === 'circle') doc.circle(6, 6, backLogoSize/2, 'F')
          else doc.rect(backLogoX, backLogoY, backLogoSize, backLogoSize, 'F')
        }
      } catch (e) {
        console.error('Error rendering back logo', e, e.stack)
      }

      // School name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(schoolNameDisplay, cardWidth / 2, 8.5, { align: 'center' })

      // TERMS & CONDITIONS heading
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('TERMS & CONDITIONS', cardWidth / 2, 18, { align: 'center' })

      // Terms & Conditions list from settings
      doc.setFontSize(7)
      doc.setFont(s.valueFont || 'helvetica', 'normal')
      const startY = 24
      let ty = Number(startY) || 24
      // Ensure terms is an array of strings to avoid runtime errors
      const termsList = Array.isArray(s.terms) ? s.terms : (s.terms ? [String(s.terms)] : [])
      termsList.forEach((t) => {
        try {
          doc.text(`• ${t}`, 10, ty)
        } catch (e) {
          console.error('Error writing terms line to PDF:', e, e.stack)
        }
        ty += 4
      })

      // QR Code (single source) - prefer custom setting `s.qrData`, otherwise build default staff QR
      if (s.showQRCode) {
        const defaultQR = `Staff ID: ${staffData.employee_number}\nName: ${staffName}\nSchool: ${schoolNameDisplay}`
        const qrText = (typeof s.qrData === 'string' && s.qrData.trim() !== '') ? s.qrData : defaultQR
        try {
          const qSize = s.qrSize === 'large' ? 22 : s.qrSize === 'small' ? 10 : 15
          const qrX = cardWidth - qSize - 8
          // Fixed position for QR code on right side, regardless of terms length
          const qrY = 22

          const qrImg = await generateQRCode(qrText)
          if (qrImg) {
            doc.addImage(qrImg, 'PNG', qrX, qrY, qSize, qSize)
          }
        } catch (e) {
          console.error('Error generating/adding QR code to ID card:', e, e.stack)
          showToast('Error adding QR code to ID card: ' + (e.message || String(e)), 'error')
        }
      }

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)

      // Set state for preview modal
      const fileName = `Staff_ID_Card_${staffData.employee_number}_${Date.now()}.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      // Save to database
      await saveIDCardRecord()

      showToast('ID Card generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating ID card:', error, error.stack)
      showToast('Error generating ID card: ' + (error.message || String(error)), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
  }

  // Save ID card record to database
  const saveIDCardRecord = async () => {
    try {
      const cardNumber = `ID-${staffData.employee_number}-${Date.now()}`

      const { error } = await supabase
        .from('staff_id_cards')
        .insert({
          staff_id: staffData.id,
          school_id: currentUser.school_id,
          card_number: cardNumber,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: validityUpto,
          status: 'active',
          issued_by: currentUser.id
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving ID card record:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-1.5 sm:p-2 md:p-3 lg:p-4">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-2 sm:px-3 py-1.5 sm:py-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-[#1E3A8A] p-1.5 sm:p-2 rounded-lg">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Staff ID Cards</h1>
              <p className="text-xs sm:text-sm text-gray-500">Generate professional staff identification cards</p>
            </div>
          </div>

          {/* Settings button */}
          <div className="w-full sm:w-auto">
            <button onClick={() => setShowSettingsModal(true)} className="flex items-center justify-center gap-1.5 sm:gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded shadow-sm w-full sm:w-auto">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-2 sm:p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">

          {/* Configuration Row */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4">

            {/* Staff Search */}
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

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

            {/* Validity Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Valid Until
              </label>
              <input
                type="date"
                value={validityUpto}
                onChange={(e) => setValidityUpto(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Staff Information Display */}

          {/* Settings Modal */}
          {showSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-16 px-2 sm:px-0">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)}></div>
              <div className="relative w-full sm:w-3/4 lg:w-2/3 xl:w-1/2 bg-white rounded-lg shadow-lg overflow-hidden z-50 max-h-[90vh] sm:max-h-auto">
                <div className="flex items-center justify-between px-3 sm:px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold">ID Card Settings</h3>
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
                        <label className="block text-xs font-medium text-gray-600 mb-1">Institute Name (Main Header)</label>
                        <input type="text" value={idCardSettings.instituteName} onChange={(e) => setIdCardSettings(prev => ({...prev, instituteName: e.target.value }))} placeholder="e.g., SUPERIOR COLLEGE BHAKKAR" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Header Subtitle</label>
                        <input type="text" value={idCardSettings.headerSubtitle} onChange={(e) => setIdCardSettings(prev => ({...prev, headerSubtitle: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                      </div>

                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="showLogo" checked={idCardSettings.showLogo} onChange={(e) => setIdCardSettings(prev => ({...prev, showLogo: e.target.checked }))} />
                        <label className="text-sm text-gray-600" htmlFor="showLogo">Show Logo</label>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Logo Shape</label>
                          <select value={idCardSettings.logoShape} onChange={(e) => setIdCardSettings(prev => ({...prev, logoShape: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                            <option value="circle">Circle</option>
                            <option value="square">Square</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Logo Size</label>
                          <select value={idCardSettings.logoSize} onChange={(e) => setIdCardSettings(prev => ({...prev, logoSize: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Logo Position</label>
                          <select value={idCardSettings.logoPosition} onChange={(e) => setIdCardSettings(prev => ({...prev, logoPosition: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Settings */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold mb-2">COLOR SETTINGS</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Header Background</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={idCardSettings.headerBg} onChange={(e) => setIdCardSettings(prev => ({...prev, headerBg: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                          <input value={idCardSettings.headerBg} onChange={(e) => setIdCardSettings(prev => ({...prev, headerBg: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Header Text Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={idCardSettings.headerTextColor} onChange={(e) => setIdCardSettings(prev => ({...prev, headerTextColor: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                          <input value={idCardSettings.headerTextColor} onChange={(e) => setIdCardSettings(prev => ({...prev, headerTextColor: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Accent Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={idCardSettings.accentColor} onChange={(e) => setIdCardSettings(prev => ({...prev, accentColor: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                          <input value={idCardSettings.accentColor} onChange={(e) => setIdCardSettings(prev => ({...prev, accentColor: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={idCardSettings.textColor} onChange={(e) => setIdCardSettings(prev => ({...prev, textColor: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                          <input value={idCardSettings.textColor} onChange={(e) => setIdCardSettings(prev => ({...prev, textColor: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Photo Settings */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold mb-2">STUDENT PHOTO</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Photo Shape</label>
                        <select value={idCardSettings.photoShape} onChange={(e) => setIdCardSettings(prev => ({...prev, photoShape: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                          <option value="rectangle">Rectangle</option>
                          <option value="circle">Circle</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Photo Size</label>
                        <select value={idCardSettings.photoSize} onChange={(e) => setIdCardSettings(prev => ({...prev, photoSize: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Photo Position</label>
                        <select value={idCardSettings.photoPosition} onChange={(e) => setIdCardSettings(prev => ({...prev, photoPosition: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                          <option value="right">Right</option>
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Photo Border Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={idCardSettings.photoBorderColor} onChange={(e) => setIdCardSettings(prev => ({...prev, photoBorderColor: e.target.value }))} className="w-10 h-8 p-0 border rounded" />
                          <input value={idCardSettings.photoBorderColor} onChange={(e) => setIdCardSettings(prev => ({...prev, photoBorderColor: e.target.value }))} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Front Side Fields */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold mb-2">FRONT SIDE FIELDS</h4>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={idCardSettings.frontFields.name} onChange={(e) => setIdCardSettings(prev => ({...prev, frontFields: {...prev.frontFields, name: e.target.checked }}))} /> Name</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={idCardSettings.frontFields.employeeNo} onChange={(e) => setIdCardSettings(prev => ({...prev, frontFields: {...prev.frontFields, employeeNo: e.target.checked }}))} /> Roll No</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={idCardSettings.frontFields.designation} onChange={(e) => setIdCardSettings(prev => ({...prev, frontFields: {...prev.frontFields, designation: e.target.checked }}))} /> Designation</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={idCardSettings.frontFields.joining} onChange={(e) => setIdCardSettings(prev => ({...prev, frontFields: {...prev.frontFields, joining: e.target.checked }}))} /> Joining</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={idCardSettings.frontFields.expiry} onChange={(e) => setIdCardSettings(prev => ({...prev, frontFields: {...prev.frontFields, expiry: e.target.checked }}))} /> Expiry Date</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={idCardSettings.frontFields.signature} onChange={(e) => setIdCardSettings(prev => ({...prev, frontFields: {...prev.frontFields, signature: e.target.checked }}))} /> Signature</label>
                    </div>
                  </div>

                  {/* Card Design & Font Settings */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold mb-2">CARD DESIGN</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Card Orientation</label>
                        <select value={idCardSettings.cardOrientation} onChange={(e) => setIdCardSettings(prev => ({...prev, cardOrientation: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                          <option value="horizontal">Horizontal (Landscape)</option>
                          <option value="vertical">Vertical (Portrait)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Header Font</label>
                        <select value={idCardSettings.headerFont} onChange={(e) => setIdCardSettings(prev => ({...prev, headerFont: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                          <option value="helvetica">Helvetica - Clean & Modern</option>
                          <option value="times">Times - Classic</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Back Side & QR */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold mb-2">BACK SIDE SETTINGS</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Header Text</label>
                        <input type="text" value={idCardSettings.backHeaderText} onChange={(e) => setIdCardSettings(prev => ({...prev, backHeaderText: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                      </div>

                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={idCardSettings.showLogoOnBack} onChange={(e) => setIdCardSettings(prev => ({...prev, showLogoOnBack: e.target.checked }))} />
                        <label className="text-sm text-gray-600">Show Logo on Back</label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={idCardSettings.showQRCode} onChange={(e) => setIdCardSettings(prev => ({...prev, showQRCode: e.target.checked }))} />
                        <label className="text-sm text-gray-600">Show QR Code</label>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">QR Code Data (Text to encode)</label>
                        <textarea value={idCardSettings.qrData} onChange={(e) => setIdCardSettings(prev => ({...prev, qrData: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Enter text/URL/data for QR code" rows={3}></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold mb-2">TERMS & CONDITIONS</h4>
                    <div className="space-y-2">
                      {(idCardSettings.terms || []).map((t, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <input value={t} onChange={(e) => setIdCardSettings(prev => {
                            const updated = [...prev.terms]; updated[idx] = e.target.value; return {...prev, terms: updated}
                          })} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                          <button onClick={() => setIdCardSettings(prev => ({...prev, terms: prev.terms.filter((_,i)=>i!==idx)}))} className="px-3 py-1 rounded bg-red-50 text-red-600 text-sm">Remove</button>
                        </div>
                      ))}
                      <button onClick={() => setIdCardSettings(prev => ({...prev, terms: [...(prev.terms||[]), '']}))} className="px-3 py-2 rounded bg-blue-50 text-blue-700 text-sm">+ Add Term</button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-3 sm:px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 bg-gray-50">
                  <button onClick={() => setShowSettingsModal(false)} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-gray-300 text-sm w-full sm:w-auto">Cancel</button>
                  <button onClick={() => setShowResetConfirm(true)} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm w-full sm:w-auto">Reset</button>
                  <button onClick={saveIdCardSettings} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm w-full sm:w-auto">Save Settings</button>
                </div>
              </div>
            </div>
          )}
          {staffData && (
            <>
              <div className="border-t border-gray-200 pt-3 sm:pt-4 mb-4">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3 uppercase tracking-wide">
                  Staff Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={`${staffData.first_name} ${staffData.last_name || ''}`}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employee Number
                    </label>
                    <input
                      type="text"
                      value={staffData.employee_number}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      value={staffData.father_name || 'N/A'}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

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
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-start pt-2">
                <button
                  onClick={generateIDCardPDF}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto text-sm sm:text-base"
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  {saving ? 'Generating...' : 'Generate ID Card PDF'}
                </button>
              </div>
            </>
          )}

          {/* No Data Message */}
          {!staffData && !loading && allStaff.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Select a staff member to generate ID card</p>
              <p className="text-xs mt-1.5">Total Staff: {allStaff.length}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm">Loading staff data...</p>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal (red) */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}></div>
          <div className="relative z-50 w-full max-w-sm bg-white border border-red-200 rounded-lg shadow-lg overflow-hidden">
            <div className="p-3 sm:p-4 flex items-start gap-3">
              <div className="text-red-600 p-1 rounded bg-red-50">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-red-700 text-sm sm:text-base">Reset ID Card Settings</h4>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">This will remove saved ID card settings and restore defaults. Uploaded logos remain in school settings. Continue?</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50">
              <button onClick={() => setShowResetConfirm(false)} className="px-3 py-2 rounded border border-gray-300 text-sm w-full sm:w-auto">Cancel</button>
              <button onClick={performResetIdcard} className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm w-full sm:w-auto">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 w-[calc(100%-2rem)] sm:w-auto">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 sm:gap-3 min-w-0 sm:min-w-[300px] max-w-full sm:max-w-md px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' :
              toast.type === 'warning' ? 'bg-amber-600' :
              'bg-blue-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
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

export default function StaffIDCardsPage() {
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
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="staff_cards_view"
      pageName="Staff ID Cards"
    >
      <StaffIDCardsContent />
    </PermissionGuard>
  )
}
