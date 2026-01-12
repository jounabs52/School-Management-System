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
 * @param {string} userId - Optional user ID for user-specific settings
 */
export const getPdfSettings = (userId = null) => {
  if (typeof window === 'undefined') {
    return DEFAULT_PDF_SETTINGS
  }

  try {
    // Try to load user-specific settings first if userId is provided
    if (userId) {
      const userPdfSettingsKey = `pdfSettings_${userId}`
      const userSaved = localStorage.getItem(userPdfSettingsKey)
      if (userSaved) {
        const settings = JSON.parse(userSaved)
        console.log('📄 Loaded user-specific PDF Settings for user:', userId)
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
  DEFAULT_PDF_SETTINGS
}
