/**
 * PDF Utilities - Global Design Standards
 * Consistent header, footer, watermark, and styling for all school PDFs
 */

import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

/**
 * Convert image URL to base64 data URL (for Supabase storage, external URLs, etc.)
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 data URL
 */
export const convertImageToBase64 = async (url) => {
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
    console.error('Error converting image to base64:', error)
    return null
  }
}

// Global PDF Design Constants
export const PDF_COLORS = {
  primary: [31, 78, 120],      // Dark Blue
  secondary: [139, 69, 19],     // Maroon/Brown
  accent: [184, 134, 11],       // Gold
  textDark: [0, 0, 0],          // Black
  textLight: [100, 100, 100],   // Gray
  border: [200, 200, 200],      // Light Gray
  headerBg: [31, 78, 120],      // Dark Blue
}

export const PDF_FONTS = {
  primary: 'times',
  secondary: 'helvetica',
}

/**
 * Add professional header to PDF (Logo Box Style)
 * @param {jsPDF} doc - PDF document
 * @param {Object} schoolData - School information (logo should be base64 data URL)
 * @param {string} title - Document title
 * @param {Object} options - Additional options (subtitle, info, session, etc.)
 * @param {number} startY - Starting Y position (default: 10)
 */
export const addPDFHeader = (doc, schoolData, title, options = {}, startY = 10) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPos = startY

  // Header background box
  doc.setFillColor(...PDF_COLORS.primary)
  doc.rect(0, 0, pageWidth, 35, 'F')

  // Logo Box (Left side with white background) - Centered vertically in header
  if (schoolData?.logo) {
    try {
      // Logo box dimensions
      const logoBoxSize = 25
      const logoBoxX = 10
      const logoBoxY = 5 // Centered in 35mm header: (35 - 25) / 2 = 5

      // White box for logo
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(...PDF_COLORS.border)
      doc.setLineWidth(0.5)
      doc.rect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 'FD')

      // Add logo inside box (expects base64 data URL)
      const logoImageSize = 22 // Slightly smaller than box for padding
      const logoPadding = (logoBoxSize - logoImageSize) / 2
      const logoX = logoBoxX + logoPadding
      const logoY = logoBoxY + logoPadding

      // Determine image format from base64 data URL
      let format = 'PNG'
      if (schoolData.logo.includes('data:image/jpeg') || schoolData.logo.includes('data:image/jpg')) {
        format = 'JPEG'
      }

      doc.addImage(schoolData.logo, format, logoX, logoY, logoImageSize, logoImageSize)
    } catch (error) {
      console.error('Error adding logo:', error)
    }
  }

  // School Name (Center, Bold, White text) - Vertically centered
  doc.setFont(PDF_FONTS.primary, 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text(schoolData?.name || 'SCHOOL NAME', pageWidth / 2, 12, { align: 'center' })

  // Document Title (Below school name, white text)
  doc.setFont(PDF_FONTS.primary, 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text(title, pageWidth / 2, 20, { align: 'center' })

  // Subtitle/Additional Info (if provided)
  if (options.subtitle) {
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text(options.subtitle, pageWidth / 2, 26, { align: 'center' })
  }

  // Session/Additional details (if provided)
  if (options.session || options.info) {
    const infoText = []
    if (options.section) infoText.push(`Section: ${options.section}`)
    if (options.session) infoText.push(`Academic Session: ${options.session}`)
    if (options.info) infoText.push(options.info)

    doc.setFont(PDF_FONTS.secondary, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(infoText.join(' | '), pageWidth / 2, 31, { align: 'center' })
  }

  // Generated date (bottom right of header)
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  doc.setFont(PDF_FONTS.secondary, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(`Generated: ${dateStr}`, pageWidth - 15, 33, { align: 'right' })

  return 42 // Return Y position after header (header ends at ~35, add some spacing)
}

/**
 * Add professional footer to PDF
 * @param {jsPDF} doc - PDF document
 * @param {number} pageNumber - Current page number
 * @param {number} totalPages - Total number of pages
 */
export const addPDFFooter = (doc, pageNumber = 1, totalPages = 1) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerY = pageHeight - 10

  // Footer line
  doc.setDrawColor(...PDF_COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5)

  // Footer text
  doc.setFont(PDF_FONTS.secondary, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.textLight)

  // Left: Generated by system
  doc.text('Generated by School Management System', 15, footerY)

  // Center: Date & Time
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  doc.text(`${dateStr} ${timeStr}`, pageWidth / 2, footerY, { align: 'center' })

  // Right: Page number
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 15, footerY, { align: 'right' })
}

/**
 * Add watermark to PDF
 * @param {jsPDF} doc - PDF document
 * @param {Object} schoolData - School information
 * @param {string} text - Watermark text (optional)
 */
export const addPDFWatermark = (doc, schoolData, text = null) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Save current state
  const currentFont = doc.getFont()
  const currentFontSize = doc.getFontSize()
  const currentTextColor = doc.getTextColor()

  // Set watermark properties
  doc.setFont(PDF_FONTS.primary, 'bold')
  doc.setFontSize(60)
  doc.setTextColor(220, 220, 220) // Very light gray

  // Rotate and add watermark text
  const watermarkText = text || schoolData?.name || 'CONFIDENTIAL'

  // Calculate center position for rotated text
  const centerX = pageWidth / 2
  const centerY = pageHeight / 2

  // Save graphics state and rotate
  doc.saveGraphicsState()
  doc.setGState(new doc.GState({ opacity: 0.1 }))

  // Add rotated text
  const angle = -45
  doc.text(watermarkText, centerX, centerY, {
    align: 'center',
    angle: angle
  })

  doc.restoreGraphicsState()

  // Restore original state
  doc.setFont(currentFont.fontName, currentFont.fontStyle)
  doc.setFontSize(currentFontSize)
  doc.setTextColor(currentTextColor)
}

/**
 * Add decorative border for certificates
 * @param {jsPDF} doc - PDF document
 * @param {string} color - Border color (brown/gold)
 */
export const addDecorativeBorder = (doc, color = 'brown') => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const borderColor = color === 'gold' ? PDF_COLORS.accent : PDF_COLORS.secondary

  // Outer border
  doc.setLineWidth(1)
  doc.setDrawColor(...borderColor)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S')

  // Inner border
  doc.setLineWidth(0.5)
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S')

  // Corner decorations
  const drawCorner = (x, y, flipX = 1, flipY = 1) => {
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.3)

    for (let i = 0; i < 3; i++) {
      const offset = i * 2
      doc.line(x, y + (offset * flipY), x + (10 * flipX), y + (offset * flipY))
      doc.line(x + (offset * flipX), y, x + (offset * flipX), y + (10 * flipY))
    }
  }

  drawCorner(15, 15, 1, 1)
  drawCorner(pageWidth - 15, 15, -1, 1)
  drawCorner(15, pageHeight - 15, 1, -1)
  drawCorner(pageWidth - 15, pageHeight - 15, -1, -1)
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: Rs.)
 */
export const formatCurrency = (amount, currency = 'Rs.') => {
  if (amount === null || amount === undefined) return `${currency} 0`
  return `${currency} ${parseFloat(amount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format date for display
 * @param {string} dateStr - Date string
 * @param {string} format - Format type (short/long)
 */
export const formatDate = (dateStr, format = 'short') => {
  if (!dateStr) return 'N/A'

  const date = new Date(dateStr)

  if (format === 'long') {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Add summary section to reports
 * @param {jsPDF} doc - PDF document
 * @param {Object} summary - Summary data
 * @param {number} yPos - Y position
 * @param {number} pageWidth - Page width
 */
export const addSummarySection = (doc, summary, yPos, pageWidth) => {
  // Summary box background
  doc.setFillColor(245, 245, 245)
  doc.rect(15, yPos, pageWidth - 30, 25, 'F')

  // Summary border
  doc.setDrawColor(...PDF_COLORS.border)
  doc.setLineWidth(0.5)
  doc.rect(15, yPos, pageWidth - 30, 25, 'S')

  // Summary title
  doc.setFont(PDF_FONTS.primary, 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...PDF_COLORS.textDark)
  doc.text('SUMMARY', 20, yPos + 8)

  // Summary items
  doc.setFont(PDF_FONTS.secondary, 'normal')
  doc.setFontSize(10)

  let xPos = 20
  const itemWidth = (pageWidth - 40) / Object.keys(summary).length

  Object.entries(summary).forEach(([key, value], index) => {
    const itemX = xPos + (index * itemWidth)

    // Label
    doc.setTextColor(...PDF_COLORS.textLight)
    doc.text(key + ':', itemX, yPos + 16)

    // Value
    doc.setFont(PDF_FONTS.secondary, 'bold')
    doc.setTextColor(...PDF_COLORS.primary)
    doc.text(String(value), itemX, yPos + 22)

    doc.setFont(PDF_FONTS.secondary, 'normal')
  })

  return yPos + 30
}

/**
 * Create table with zebra stripes
 * @param {jsPDF} doc - PDF document
 * @param {Array} headers - Table headers
 * @param {Array} data - Table data
 * @param {number} startY - Starting Y position
 * @param {Object} options - Additional options
 */
export const createStripedTable = (doc, headers, data, startY, options = {}) => {
  const defaultOptions = {
    startY: startY,
    head: [headers],
    body: data,
    theme: 'grid',
    headStyles: {
      fillColor: PDF_COLORS.headerBg,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: PDF_COLORS.textDark,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248]
    },
    margin: { left: 15, right: 15 },
    ...options
  }

  doc.autoTable(defaultOptions)

  return doc.lastAutoTable.finalY + 10
}

/**
 * Add signature section
 * @param {jsPDF} doc - PDF document
 * @param {Array} signatures - Array of signature objects {label, name, title}
 * @param {number} yPos - Y position
 */
export const addSignatureSection = (doc, signatures, yPos) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const signatureWidth = (pageWidth - 40) / signatures.length

  doc.setFont(PDF_FONTS.secondary, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.textDark)

  signatures.forEach((sig, index) => {
    const xPos = 20 + (index * signatureWidth)

    // Signature line
    doc.setDrawColor(...PDF_COLORS.textDark)
    doc.line(xPos, yPos, xPos + 60, yPos)

    // Name (if provided)
    if (sig.name) {
      doc.setFont(PDF_FONTS.secondary, 'bold')
      doc.text(sig.name, xPos, yPos + 6)
      doc.setFont(PDF_FONTS.secondary, 'normal')
    }

    // Title/Label
    doc.setTextColor(...PDF_COLORS.textLight)
    doc.text(sig.title || sig.label, xPos, yPos + 12)
  })

  return yPos + 15
}

export default {
  addPDFHeader,
  addPDFFooter,
  addPDFWatermark,
  addDecorativeBorder,
  formatCurrency,
  formatDate,
  addSummarySection,
  createStripedTable,
  addSignatureSection,
  convertImageToBase64,
  PDF_COLORS,
  PDF_FONTS
}
