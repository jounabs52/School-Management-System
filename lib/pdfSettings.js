/**
 * PDF Settings Utility
 *
 * This utility provides centralized PDF settings that can be used across the application.
 * Settings are stored in localStorage and can be configured from the Settings page.
 */

// Default PDF settings matching timetable page
const DEFAULT_PDF_SETTINGS = {
  pageSize: 'A4',
  orientation: 'landscape',
  margin: 'narrow',
  fontSize: '8',
  fontFamily: 'Helvetica',
  primaryColor: '#dc2626',
  secondaryColor: '#1f2937',
  textColor: '#000000',
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#1E3A8A',
  tableHeaderColor: '#1E3A8A',
  alternateRowColor: '#F8FAFC',
  includeHeader: true,
  includeFooter: true,
  includeLogo: true,
  includeSchoolName: true,
  includeTagline: false,
  includeContactInfo: false,
  logoPosition: 'left',
  logoSize: 'medium',
  logoStyle: 'circle',
  schoolNameFontSize: 18,
  headerText: '',
  sectionText: '',
  footerText: '',
  includePageNumbers: true,
  includeDate: true,
  includeGeneratedDate: true,
  borderStyle: 'thin',
  tableStyle: 'grid',
  cellPadding: 'normal',
  lineWidth: 'thin'
}

/**
 * Get PDF settings from localStorage or return defaults
 * @param {string} schoolId - Optional school ID for school-specific settings
 */
export const getPdfSettings = (schoolId = null) => {
  if (typeof window === 'undefined') {
    return DEFAULT_PDF_SETTINGS
  }

  try {
    // Try to load school-specific settings first if schoolId is provided
    if (schoolId) {
      const schoolPdfSettingsKey = `pdfSettings_${schoolId}`
      const schoolSaved = localStorage.getItem(schoolPdfSettingsKey)
      if (schoolSaved) {
        const settings = JSON.parse(schoolSaved)
        console.log('📄 Loaded school-specific PDF Settings for school:', schoolId)
        return settings
      }
    }

    // Fall back to global settings
    const saved = localStorage.getItem('pdfSettings')
    if (saved) {
      const settings = JSON.parse(saved)

      console.log('📄 Loaded global PDF Settings:', {
        headerBackgroundColor: settings.headerBackgroundColor,
        tableHeaderColor: settings.tableHeaderColor,
        alternateRowColor: settings.alternateRowColor,
        textColor: settings.textColor
      })
      return settings

      // Merge with defaults to ensure all settings are present
      return {
        ...DEFAULT_PDF_SETTINGS,
        ...settings
      }
    }
  } catch (e) {
    console.error('Error loading PDF settings:', e)
  }

  return DEFAULT_PDF_SETTINGS
}

/**
 * Convert hex color to RGB array for jsPDF
 * @param {string} hex - Hex color code (e.g., '#1E3A8A')
 * @returns {number[]} RGB array (e.g., [30, 58, 138])
 */
export const hexToRgb = (hex) => {
  if (!hex) {
    console.warn('hexToRgb: No color provided, using black')
    return [0, 0, 0]
  }

  // Convert to string and remove any whitespace
  hex = String(hex).trim().toUpperCase()

  // Remove # if present
  if (hex.startsWith('#')) {
    hex = hex.substring(1)
  }

  // Check if valid hex format (6 characters)
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    console.warn(`hexToRgb: Invalid color format "${hex}", using black`)
    return [0, 0, 0]
  }

  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  ]
}

/**
 * Get margin values in mm based on margin setting
 * @param {string} marginType - 'none', 'narrow', 'normal', 'wide'
 * @returns {object} Margin object with top, left, right, bottom
 */
export const getMarginValues = (marginType) => {
  const margins = {
    none: { top: 0, left: 0, right: 0, bottom: 0 },
    narrow: { top: 40, left: 8, right: 8, bottom: 25 },
    normal: { top: 40, left: 15, right: 15, bottom: 25 },
    wide: { top: 40, left: 25, right: 25, bottom: 25 }
  }
  return margins[marginType] || margins.narrow
}

/**
 * Get cell padding value based on padding setting
 * @param {string} paddingType - 'compact', 'normal', 'comfortable'
 * @returns {number} Padding value in mm
 */
export const getCellPadding = (paddingType) => {
  const paddings = {
    compact: 1.5,
    normal: 2.5,
    comfortable: 4
  }
  return paddings[paddingType] || 2.5
}

/**
 * Get line width value based on line width setting
 * @param {string} lineWidthType - 'thin', 'normal', 'thick'
 * @returns {number} Line width in mm
 */
export const getLineWidth = (lineWidthType) => {
  const lineWidths = {
    thin: 0.3,
    normal: 0.5,
    thick: 0.8
  }
  return lineWidths[lineWidthType] || 0.3
}

/**
 * Get logo size dimensions based on size setting
 * @param {string} sizeType - 'small', 'medium', 'large'
 * @returns {object} Logo size object with width and height in mm
 */
export const getLogoSize = (sizeType) => {
  const sizes = {
    small: { width: 20, height: 20 },
    medium: { width: 25, height: 25 },
    large: { width: 32, height: 32 }
  }
  return sizes[sizeType] || sizes.medium
}

/**
 * Apply PDF settings to jsPDF document
 * @param {object} doc - jsPDF document instance
 * @param {object} settings - PDF settings object
 */
export const applyPdfSettings = (doc, settings = null) => {
  const pdfSettings = settings || getPdfSettings()

  // Set default font
  if (pdfSettings.fontFamily) {
    try {
      doc.setFont(pdfSettings.fontFamily.toLowerCase())
    } catch (e) {
      console.warn('Font not available:', pdfSettings.fontFamily)
    }
  }

  return pdfSettings
}

/**
 * Get table theme configuration for autoTable
 * @param {object} settings - PDF settings object
 * @returns {string} Theme name
 */
export const getTableTheme = (tableStyle) => {
  const themes = {
    striped: 'striped',
    bordered: 'plain',
    minimal: 'plain',
    modern: 'plain',
    grid: 'grid'
  }
  return themes[tableStyle] || 'grid'
}

/**
 * Get complete autoTable styles based on PDF settings
 * @param {object} pdfSettings - PDF settings object
 * @returns {object} autoTable styles configuration
 */
export const getAutoTableStyles = (pdfSettings = null) => {
  const settings = pdfSettings || getPdfSettings()
  const margins = getMarginValues(settings.margin)
  const cellPadding = getCellPadding(settings.cellPadding)
  const lineWidth = getLineWidth(settings.lineWidth)

  return {
    theme: getTableTheme(settings.tableStyle),
    // NOTE: margin is NOT included here - it's set manually in the PDF generation code
    // to ensure table starts immediately after header with no gap
    styles: {
      fontSize: parseInt(settings.fontSize),
      cellPadding: cellPadding,
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'center',
      lineColor: [200, 200, 200],
      lineWidth: lineWidth,
      textColor: hexToRgb(settings.textColor)
    },
    headStyles: {
      fillColor: hexToRgb(settings.tableHeaderColor),
      textColor: [255, 255, 255],
      fontSize: parseInt(settings.fontSize) + 1,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: cellPadding + 0.5
    },
    alternateRowStyles: {
      fillColor: hexToRgb(settings.alternateRowColor)
    }
  }
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `Rs. ${parseFloat(amount || 0).toFixed(2)}`
}

/**
 * Generate unique challan number
 * @param {string} schoolCode - School code prefix
 * @returns {string} Unique challan number
 */
export const generateChallanNumber = (schoolCode = 'SCH') => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${schoolCode}-${timestamp}-${random}`
}

/**
 * Get month name from number
 * @param {number} monthNum - Month number (1-12)
 * @returns {string} Month name
 */
export const getMonthName = (monthNum) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[monthNum - 1] || ''
}

/**
 * Calculate fee period label based on fee plan
 * @param {string} feePlan - Fee plan type (monthly, quarterly, semi-annual, annual)
 * @param {number} startMonth - Starting month number
 * @param {number} year - Year
 * @returns {string} Period label
 */
export const getFeePeriodLabel = (feePlan, startMonth, year) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  switch (feePlan) {
    case 'monthly':
      return `${months[startMonth - 1]} ${year}`
    case 'quarterly': {
      const endMonth = Math.min(startMonth + 2, 12)
      return `${months[startMonth - 1]}-${months[endMonth - 1]} ${year}`
    }
    case 'semi-annual': {
      const endMonth = Math.min(startMonth + 5, 12)
      return `${months[startMonth - 1]}-${months[endMonth - 1]} ${year}`
    }
    case 'annual':
      return `Year ${year}`
    default:
      return `${months[startMonth - 1]} ${year}`
  }
}

/**
 * Calculate due date based on issue date and days
 * @param {Date} issueDate - Issue date
 * @param {number} daysToAdd - Number of days to add
 * @returns {Date} Due date
 */
export const calculateDueDate = (issueDate, daysToAdd = 15) => {
  const dueDate = new Date(issueDate)
  dueDate.setDate(dueDate.getDate() + daysToAdd)
  return dueDate
}

/**
 * Convert image URL to base64 for embedding in PDF
 * @param {string} url - Image URL (http/https)
 * @returns {Promise<string>} Base64 encoded image
 */
export const convertImageToBase64 = async (url) => {
  try {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const dataURL = canvas.toDataURL('image/png')
          resolve(dataURL)
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })
  } catch (error) {
    console.error('Error converting image to base64:', error)
    return null
  }
}

/**
 * Add PDF header with school logo and name
 * @param {object} doc - jsPDF document instance
 * @param {object} schoolData - School information object with name, logo_url, address, phone, email, tagline
 * @param {string} sectionText - Section title text (e.g., "Active Students List")
 * @param {object} pdfSettings - PDF settings object (optional)
 * @returns {number} Y position where content should start after header
 */
export const addPDFHeader = async (doc, schoolData, sectionText = '', pdfSettings = null) => {
  const settings = pdfSettings || getPdfSettings()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margins = getMarginValues(settings.margin)

  let currentY = margins.top - 30

  // Add logo if enabled and available
  if (settings.includeLogo && schoolData?.logo_url) {
    try {
      let logoBase64 = schoolData.logo_url

      // Convert to base64 if it's a URL
      if (logoBase64.startsWith('http://') || logoBase64.startsWith('https://')) {
        logoBase64 = await convertImageToBase64(logoBase64)
      }

      if (logoBase64) {
        const logoSizes = getLogoSize(settings.logoSize)

        // Position logo based on settings
        let logoX = margins.left + 10 // Default left
        if (settings.logoPosition === 'center') {
          logoX = (pageWidth - logoSizes.width) / 2
        } else if (settings.logoPosition === 'right') {
          logoX = pageWidth - margins.right - logoSizes.width - 10
        }

        let format = 'PNG'
        if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
          format = 'JPEG'
        }

        // Add logo based on style (circle, rounded, square)
        if (settings.logoStyle === 'circle' || settings.logoStyle === 'rounded') {
          // Create canvas for clipping
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const size = 400 // High resolution
          canvas.width = size
          canvas.height = size

          // Load image to canvas
          const img = new Image()
          img.crossOrigin = 'anonymous'

          await new Promise((resolve, reject) => {
            img.onload = () => {
              ctx.beginPath()
              if (settings.logoStyle === 'circle') {
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

              // Draw and center image
              const scale = Math.max(size / img.width, size / img.height)
              const scaledWidth = img.width * scale
              const scaledHeight = img.height * scale
              const offsetX = (size - scaledWidth) / 2
              const offsetY = (size - scaledHeight) / 2
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

              resolve()
            }
            img.onerror = reject
            img.src = logoBase64
          })

          logoBase64 = canvas.toDataURL('image/png')
        }

        doc.addImage(logoBase64, format, logoX, currentY, logoSizes.width, logoSizes.height)
        currentY += logoSizes.height + 5
      }
    } catch (error) {
      console.error('Error adding logo to PDF header:', error)
    }
  }

  // Add school name if enabled
  if (settings.includeSchoolName && schoolData?.name) {
    doc.setFontSize(settings.schoolNameFontSize || 18)
    doc.setFont(settings.fontFamily || 'helvetica', 'bold')
    doc.setTextColor(...hexToRgb(settings.headerBackgroundColor || settings.primaryColor))
    doc.text(schoolData.name, pageWidth / 2, currentY, { align: 'center' })
    currentY += 6
  }

  // Add tagline if enabled
  if (settings.includeTagline && schoolData?.tagline) {
    doc.setFontSize(10)
    doc.setFont(settings.fontFamily || 'helvetica', 'normal')
    doc.setTextColor(...hexToRgb(settings.textColor))
    doc.text(schoolData.tagline, pageWidth / 2, currentY, { align: 'center' })
    currentY += 5
  }

  // Add contact info if enabled
  if (settings.includeContactInfo) {
    doc.setFontSize(8)
    doc.setFont(settings.fontFamily || 'helvetica', 'normal')
    doc.setTextColor(...hexToRgb(settings.textColor))

    const contactParts = []
    if (schoolData?.address) contactParts.push(schoolData.address)
    if (schoolData?.phone) contactParts.push(`Tel: ${schoolData.phone}`)
    if (schoolData?.email) contactParts.push(schoolData.email)

    if (contactParts.length > 0) {
      doc.text(contactParts.join(' | '), pageWidth / 2, currentY, { align: 'center' })
      currentY += 5
    }
  }

  // Add section text if enabled and provided
  if (settings.includeSectionText && sectionText) {
    currentY += 2
    doc.setFontSize(parseInt(settings.sectionTextSize || 14))
    doc.setFont(settings.fontFamily || 'helvetica', 'bold')
    doc.setTextColor(...hexToRgb(settings.tableHeaderColor))
    doc.text(sectionText, pageWidth / 2, currentY, { align: 'center' })
    currentY += 7
  }

  // Add generated date if enabled
  if (settings.includeGeneratedDate) {
    doc.setFontSize(8)
    doc.setFont(settings.fontFamily || 'helvetica', 'normal')
    doc.setTextColor(...hexToRgb(settings.textColor))
    const dateStr = `Generated on: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`
    doc.text(dateStr, pageWidth / 2, currentY, { align: 'center' })
    currentY += 5
  }

  // Add a separator line with settings colors
  const lineWidth = getLineWidth(settings.lineWidth || 'thin')
  doc.setDrawColor(...hexToRgb(settings.tableHeaderColor))
  doc.setLineWidth(lineWidth)
  doc.line(margins.left, currentY, pageWidth - margins.right, currentY)
  currentY += 5

  return currentY
}

/**
 * Add compact PDF header for single-page documents (logo and school name on same line)
 * @param {object} doc - jsPDF document instance
 * @param {object} schoolData - School information object
 * @param {string} sectionText - Section title text
 * @param {object} pdfSettings - PDF settings object (optional)
 * @returns {number} Y position where content should start
 */
export const addCompactPDFHeader = async (doc, schoolData, sectionText = '', pdfSettings = null) => {
  const settings = pdfSettings || getPdfSettings()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margins = getMarginValues(settings.margin)

  let currentY = margins.top - 30
  const headerHeight = 25 // Compact header height

  // Determine logo position
  const logoOnLeft = settings.logoPosition !== 'right'

  // Add logo if enabled
  let logoWidth = 0
  if (settings.includeLogo && schoolData?.logo_url) {
    try {
      let logoBase64 = schoolData.logo_url

      if (logoBase64.startsWith('http://') || logoBase64.startsWith('https://')) {
        logoBase64 = await convertImageToBase64(logoBase64)
      }

      if (logoBase64) {
        const logoSizes = getLogoSize(settings.logoSize)
        logoWidth = logoSizes.width

        // Position logo
        let logoX = logoOnLeft ? margins.left : pageWidth - margins.right - logoWidth

        // Process logo style
        if (settings.logoStyle === 'circle' || settings.logoStyle === 'rounded') {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const size = 400
          canvas.width = size
          canvas.height = size

          const img = new Image()
          img.crossOrigin = 'anonymous'

          await new Promise((resolve, reject) => {
            img.onload = () => {
              ctx.beginPath()
              if (settings.logoStyle === 'circle') {
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

              const scale = Math.max(size / img.width, size / img.height)
              const scaledWidth = img.width * scale
              const scaledHeight = img.height * scale
              const offsetX = (size - scaledWidth) / 2
              const offsetY = (size - scaledHeight) / 2
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

              resolve()
            }
            img.onerror = reject
            img.src = logoBase64
          })

          logoBase64 = canvas.toDataURL('image/png')
        }

        let format = 'PNG'
        if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
          format = 'JPEG'
        }

        doc.addImage(logoBase64, format, logoX, currentY, logoSizes.width, logoSizes.height)
      }
    } catch (error) {
      console.error('Error adding logo:', error)
    }
  }

  // Add school name next to logo (same line)
  if (settings.includeSchoolName && schoolData?.name) {
    const textX = logoOnLeft ? margins.left + logoWidth + 5 : margins.left
    const textWidth = logoOnLeft ?
      pageWidth - margins.left - margins.right - logoWidth - 10 :
      pageWidth - margins.left - margins.right - logoWidth - 10

    doc.setFontSize(settings.schoolNameFontSize || 16)
    doc.setFont(settings.fontFamily || 'helvetica', 'bold')
    doc.setTextColor(...hexToRgb(settings.headerBackgroundColor || settings.primaryColor))
    doc.text(schoolData.name, textX, currentY + 8, { maxWidth: textWidth })

    // Add contact info below school name
    if (settings.includeContactInfo) {
      doc.setFontSize(7)
      doc.setFont(settings.fontFamily || 'helvetica', 'normal')
      doc.setTextColor(...hexToRgb(settings.textColor))

      const contactParts = []
      if (schoolData?.address) contactParts.push(schoolData.address)
      if (schoolData?.phone) contactParts.push(`Tel: ${schoolData.phone}`)

      if (contactParts.length > 0) {
        doc.text(contactParts.join(' | '), textX, currentY + 14, { maxWidth: textWidth })
      }
    }
  }

  // Add generated date on opposite side
  if (settings.includeGeneratedDate) {
    const dateX = logoOnLeft ? pageWidth - margins.right : margins.left + logoWidth + 5
    doc.setFontSize(7)
    doc.setFont(settings.fontFamily || 'helvetica', 'normal')
    doc.setTextColor(...hexToRgb(settings.textColor))
    const dateStr = `Generated: ${new Date().toLocaleDateString('en-GB')}\n${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    doc.text(dateStr, dateX, currentY + 8, { align: logoOnLeft ? 'right' : 'left' })
  }

  currentY += headerHeight

  // Add section text if provided
  if (sectionText) {
    currentY += 2
    doc.setFontSize(parseInt(settings.sectionTextSize || 12))
    doc.setFont(settings.fontFamily || 'helvetica', 'bold')
    doc.setTextColor(...hexToRgb(settings.tableHeaderColor))
    doc.text(sectionText, pageWidth / 2, currentY, { align: 'center' })
    currentY += 6
  }

  // Add separator line
  const lineWidth = getLineWidth(settings.lineWidth || 'thin')
  doc.setDrawColor(...hexToRgb(settings.tableHeaderColor))
  doc.setLineWidth(lineWidth)
  doc.line(margins.left, currentY, pageWidth - margins.right, currentY)
  currentY += 3

  return currentY
}

/**
 * Add PDF footer with page numbers
 * @param {object} doc - jsPDF document instance
 * @param {object} pdfSettings - PDF settings object (optional)
 */
export const addPDFFooter = (doc, pdfSettings = null) => {
  const settings = pdfSettings || getPdfSettings()

  if (!settings.includeFooter && !settings.includePageNumbers && !settings.includeDate) return

  const pageCount = doc.internal.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margins = getMarginValues(settings.margin)

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer styling
    doc.setFontSize(7.5)
    doc.setFont(settings.fontFamily || 'helvetica', 'normal')
    doc.setTextColor(120, 120, 120)

    const footerY = pageHeight - 8

    // Footer text (left side)
    if (settings.footerText) {
      doc.text(settings.footerText, margins.left + 2, footerY)
    }

    // Page number (right side) if enabled
    if (settings.includePageNumbers) {
      const pageText = `Page ${i} of ${pageCount}`
      doc.text(pageText, pageWidth - margins.right - 2, footerY, { align: 'right' })
    }

    // Print date (center) if enabled
    if (settings.includeDate) {
      const dateStr = new Date().toLocaleDateString('en-GB')
      doc.text(dateStr, pageWidth / 2, footerY, { align: 'center' })
    }
  }
}

/**
 * Initialize PDF document with all settings applied
 * @param {object} schoolData - School information object
 * @param {object} pdfSettings - PDF settings object (optional)
 * @returns {object} Configured jsPDF document
 */
export const initializePDF = (schoolData = null, pdfSettings = null) => {
  const settings = pdfSettings || getPdfSettings(schoolData?.id)

  // Import jsPDF dynamically (for client-side usage)
  if (typeof window === 'undefined') return null

  const jsPDF = require('jspdf').default

  // Create PDF with settings
  const doc = new jsPDF({
    orientation: settings.orientation || 'portrait',
    unit: 'mm',
    format: settings.pageSize?.toLowerCase() || 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Apply font settings
  applyPdfSettings(doc, settings)

  // Set page background color
  const bgRgb = hexToRgb(settings.backgroundColor || '#ffffff')
  doc.setFillColor(...bgRgb)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  return doc
}

/**
 * Generate complete PDF with header, content, and footer
 * @param {object} options - PDF generation options
 * @param {object} options.schoolData - School information
 * @param {string} options.sectionTitle - Title for this PDF section
 * @param {function} options.contentGenerator - Async function that generates PDF content, receives (doc, startY, settings)
 * @param {string} options.filename - Output filename
 * @param {object} options.pdfSettings - PDF settings (optional)
 * @returns {Promise<void>}
 */
export const generateCompletePDF = async ({
  schoolData,
  sectionTitle,
  contentGenerator,
  filename,
  pdfSettings = null
}) => {
  const settings = pdfSettings || getPdfSettings(schoolData?.id)

  // Import jsPDF dynamically
  if (typeof window === 'undefined') return

  const jsPDF = require('jspdf').default
  require('jspdf-autotable')

  // Create PDF with all settings
  const doc = new jsPDF({
    orientation: settings.orientation || 'portrait',
    unit: 'mm',
    format: settings.pageSize?.toLowerCase() || 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Apply font and background
  applyPdfSettings(doc, settings)

  const bgRgb = hexToRgb(settings.backgroundColor || '#ffffff')
  doc.setFillColor(...bgRgb)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Add header with logo
  const startY = await addPDFHeader(doc, schoolData, sectionTitle, settings)

  // Generate content
  await contentGenerator(doc, startY, settings)

  // Add footer
  addPDFFooter(doc, settings)

  // Save PDF
  doc.save(filename)
}

export default {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  getCellPadding,
  getLineWidth,
  getLogoSize,
  applyPdfSettings,
  getTableTheme,
  getAutoTableStyles,
  formatCurrency,
  generateChallanNumber,
  getMonthName,
  getFeePeriodLabel,
  calculateDueDate,
  convertImageToBase64,
  addPDFHeader,
  addCompactPDFHeader,
  addPDFFooter,
  initializePDF,
  generateCompletePDF,
  DEFAULT_PDF_SETTINGS
}
