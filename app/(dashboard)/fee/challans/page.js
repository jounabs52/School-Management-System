'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Printer, CheckCircle, X, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getPdfSettings, hexToRgb, getMarginValues, formatCurrency, getLogoSize, applyPdfSettings } from '@/lib/pdfSettings'
import PermissionGuard from '@/components/PermissionGuard'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[10001] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={20} />}
      {type === 'error' && <X size={20} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  )
}

// Main Content Component
function FeeChallanContent() {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [selectedChallan, setSelectedChallan] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [challanItems, setChallanItems] = useState([])
  const [schoolName, setSchoolName] = useState('SMART SCHOOL PRO')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (showViewModal) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = ''
    }
  }, [showViewModal])

  useEffect(() => {
    fetchChallans()
    fetchSchoolName()
    fetchAllClasses()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, classFilter])

  const fetchSchoolName = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('schools')
        .select('school_name')
        .eq('id', user.school_id)
        .single()

      if (!error && data) {
        setSchoolName(data.school_name)
      }
    } catch (error) {
      console.error('Error fetching school name:', error)
    }
  }

  const fetchAllClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      // First, get all challans to find which classes have challans
      const { data: challansData } = await supabase
        .from('fee_challans')
        .select(`
          students!student_id (
            current_class_id
          )
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)

      // Get unique class IDs from challans
      const classIdsWithChallans = [...new Set(
        challansData?.map(c => c.students?.current_class_id).filter(Boolean)
      )]

      if (classIdsWithChallans.length === 0) {
        setClasses([])
        return
      }

      // Fetch only classes that have challans
      const { data: allClasses, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .in('id', classIdsWithChallans)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('class_name', { ascending: true })

      if (!error && allClasses) {
        setClasses(allClasses)
      }

      // Fetch sections for the classes that have challans
      const { data: allSections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_name, class_id')
        .in('class_id', classIdsWithChallans)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('section_name', { ascending: true })

      if (!sectionsError && allSections) {
        setSections(allSections)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchChallans = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      const { data: challansData, error: challansError } = await supabase
        .from('fee_challans')
        .select(`
          *,
          students!student_id (
            id,
            admission_number,
            first_name,
            last_name,
            father_name,
            current_class_id,
            current_section_id,
            fee_plan,
            base_fee,
            discount_amount,
            discount_value,
            discount_type,
            final_fee
          )
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('issue_date', { ascending: false })

      if (challansError) {
        console.error('Query error:', challansError)
        showToast(`Database Error: ${challansError.message}`, 'error')
        setLoading(false)
        return
      }

      const classIds = [...new Set(challansData?.map(c => c.students?.current_class_id).filter(Boolean))]
      const sectionIds = [...new Set(challansData?.map(c => c.students?.current_section_id).filter(Boolean))]

      let classesMap = {}
      let sectionsMap = {}

      if (classIds.length > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, class_name, fee_plan')
          .in('id', classIds)
          .eq('user_id', user.id)
        .eq('school_id', user.school_id)

        if (classesData) {
          classesData.forEach(cls => {
            classesMap[cls.id] = cls
          })
        }
      }

      if (sectionIds.length > 0) {
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, section_name')
          .in('id', sectionIds)

        if (sectionsData) {
          sectionsData.forEach(sec => {
            sectionsMap[sec.id] = sec
          })
        }
      }

      // Fetch all payments for these challans
      const challanIds = challansData?.map(c => c.id).filter(Boolean) || []
      const { data: paymentsData } = await supabase
        .from('fee_payments')
        .select('challan_id, amount_paid')
        .in('challan_id', challanIds)
        .eq('school_id', user.school_id)

      // Calculate total paid amount for each challan
      const paymentMap = {}
      paymentsData?.forEach(payment => {
        if (!paymentMap[payment.challan_id]) {
          paymentMap[payment.challan_id] = 0
        }
        paymentMap[payment.challan_id] += parseFloat(payment.amount_paid || 0)
      })

      const enrichedChallans = challansData?.map(challan => {
        // Calculate paid amount from payments
        const paidAmount = paymentMap[challan.id] || 0

        return {
          ...challan,
          // Use challan's total_amount as it includes all fee items (monthly + other fees)
          paid_amount: paidAmount,
          students: challan.students ? {
            ...challan.students,
            classes: challan.students.current_class_id ? classesMap[challan.students.current_class_id] : null,
            sections: challan.students.current_section_id ? sectionsMap[challan.students.current_section_id] : null
          } : null
        }
      })

      setChallans(enrichedChallans || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching challans:', error)
      showToast(`Unexpected Error: ${error.message}`, 'error')
      setLoading(false)
    }
  }

  const fetchChallanItems = async (challanId) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_challan_items')
        .select(`
          *,
          fee_types!fee_type_id (
            fee_name,
            fee_fund
          )
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('challan_id', challanId)

      if (error) {
        console.error('Error fetching challan items:', error)
        setChallanItems([])
        return
      }

      setChallanItems(data || [])
    } catch (error) {
      console.error('Error:', error)
      setChallanItems([])
    }
  }

  const handleViewChallan = async (challan) => {
    setSelectedChallan(challan)
    await fetchChallanItems(challan.id)
    setShowViewModal(true)
  }

  const handleDirectDownloadPDF = async (challan) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_challan_items')
        .select(`
          *,
          fee_types!fee_type_id (
            fee_name,
            fee_fund
          )
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('challan_id', challan.id)

      if (error) {
        console.error('Error fetching challan items:', error)
      }

      await downloadChallanPDF(challan, data || [])
      showToast('PDF downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      showToast(`Failed to download PDF: ${error.message}`, 'error')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || badges.pending
  }

  // Function to convert number to words
  const numberToWords = (num) => {
    if (num === 0) return 'Zero'

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

    const convertLessThanThousand = (n) => {
      if (n === 0) return ''
      if (n < 10) return ones[n]
      if (n < 20) return teens[n - 10]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '')
    }

    const integerPart = Math.floor(num)

    if (integerPart < 1000) {
      return convertLessThanThousand(integerPart) + ' Only'
    }

    if (integerPart < 100000) {
      const thousands = Math.floor(integerPart / 1000)
      const remainder = integerPart % 1000
      return convertLessThanThousand(thousands) + ' Thousand' +
             (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '') + ' Only'
    }

    if (integerPart < 10000000) {
      const lakhs = Math.floor(integerPart / 100000)
      const remainder = integerPart % 100000
      const thousands = Math.floor(remainder / 1000)
      const hundreds = remainder % 1000

      let result = convertLessThanThousand(lakhs) + ' Lakh'
      if (thousands > 0) result += ' ' + convertLessThanThousand(thousands) + ' Thousand'
      if (hundreds > 0) result += ' ' + convertLessThanThousand(hundreds)
      return result + ' Only'
    }

    const crores = Math.floor(integerPart / 10000000)
    const remainder = integerPart % 10000000
    const lakhs = Math.floor(remainder / 100000)
    const thousands = Math.floor((remainder % 100000) / 1000)
    const hundreds = remainder % 1000

    let result = convertLessThanThousand(crores) + ' Crore'
    if (lakhs > 0) result += ' ' + convertLessThanThousand(lakhs) + ' Lakh'
    if (thousands > 0) result += ' ' + convertLessThanThousand(thousands) + ' Thousand'
    if (hundreds > 0) result += ' ' + convertLessThanThousand(hundreds)
    return result + ' Only'
  }

  const downloadChallanPDF = async (challan = null, items = null) => {
    const challanToUse = challan || selectedChallan
    const itemsToUse = items || challanItems

    if (!challanToUse) return

    try {
      // Fetch school data
      const schoolResult = await supabase
        .from('schools')
        .select('name, address, phone, email, logo_url, code')
        .eq('id', getUserFromCookie()?.school_id)
        .single()

      const schoolData = schoolResult.data || {}

      const student = challanToUse.students
      const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
      const className = student?.classes?.class_name || 'N/A'

      // Get user ID for PDF settings
      const currentUser = getUserFromCookie()

      // Fetch class data for fee plan
      const { data: classData } = await supabase
        .from('classes')
        .select('fee_plan')
        .eq('id', student?.current_class_id)
        .eq('user_id', currentUser?.id)
        .eq('school_id', currentUser?.school_id)
        .single()

      const feePlan = classData?.fee_plan || 'Monthly'

      // Get PDF settings
      const pdfSettings = getPdfSettings(currentUser?.id)

      // Create PDF with settings from PAGE SETTINGS
      const doc = new jsPDF({
        orientation: pdfSettings.orientation || 'portrait',
        unit: 'mm',
        format: pdfSettings.pageSize?.toLowerCase() || 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Get margin values from settings
      const margins = getMarginValues(pdfSettings.margin)
      const leftMargin = margins.left
      const rightMargin = pageWidth - margins.right

      // Calculate color values from settings for reuse
      const textColorRgb = hexToRgb(pdfSettings.textColor)
      const secondaryColorRgb = hexToRgb(pdfSettings.secondaryColor)
      const primaryColorRgb = hexToRgb(pdfSettings.primaryColor)
      const lineWidthValue = pdfSettings.lineWidth === 'thick' ? 0.3 : pdfSettings.lineWidth === 'normal' ? 0.2 : 0.1

      // Header background with header background color from settings
      const headerHeight = 40
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      doc.setFillColor(...headerBgColor)
      doc.rect(0, 0, pageWidth, headerHeight, 'F')

      // Logo in header
      let yPos = 18
      if (pdfSettings.includeLogo && schoolData.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = schoolData.logo_url

          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const logoSizeObj = getLogoSize(pdfSettings.logoSize)
                const currentLogoSize = logoSizeObj.width // Use width property
                // Center logo vertically in header
                const logoY = (headerHeight - currentLogoSize) / 2
                let logoX = 10 // Default to left with 10mm margin

                // Position logo based on settings
                if (pdfSettings.logoPosition === 'center') {
                  // Center logo - but this will overlap with text, so skip if center
                  logoX = 10 // Keep on left
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
                  ctx.drawImage(img, 0, 0, size, size)

                  // Convert canvas to data URL and add to PDF
                  const clippedImage = canvas.toDataURL('image/png')
                  doc.addImage(clippedImage, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)

                  // Add border based on logo style from PDF settings
                  const borderRgb = pdfSettings.logoBorderColor ? hexToRgb(pdfSettings.logoBorderColor) : [255, 255, 255]
                  if (pdfSettings.logoStyle === 'circle') {
                    doc.setDrawColor(...borderRgb)
                    doc.setLineWidth(0.5)
                    doc.circle(logoX + currentLogoSize/2, logoY + currentLogoSize/2, currentLogoSize/2, 'S')
                  } else if (pdfSettings.logoStyle === 'rounded') {
                    doc.setDrawColor(...borderRgb)
                    doc.setLineWidth(0.5)
                    doc.roundedRect(logoX, logoY, currentLogoSize, currentLogoSize, 3, 3, 'S')
                  }
                } else {
                  // Square logo
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

      // School name and subtitle in white (only if includeHeader is true)
      if (pdfSettings.includeHeader !== false) {
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(parseInt(pdfSettings.fontSize) + 8) // Header title larger than base font
        doc.setFont('helvetica', 'bold')
        doc.text(schoolData.name || schoolName, pageWidth / 2, yPos + 5, { align: 'center' })

        doc.setFontSize(parseInt(pdfSettings.fontSize) + 1) // Subtitle slightly larger than base
        doc.setFont('helvetica', 'normal')
        const headerText = pdfSettings.headerText || 'Student FEE CHALLAN'
        doc.text(headerText, pageWidth / 2, yPos + 12, { align: 'center' })
      }

      // Generated date - position based on logo position to avoid overlap
      doc.setFontSize(parseInt(pdfSettings.fontSize) - 1) // Date slightly smaller than base
      doc.setTextColor(220, 220, 220)
      const now = new Date()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const genDate = `Generated: ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`

      // If logo is on right, put date on left to avoid overlap
      const dateAlign = pdfSettings.logoPosition === 'right' ? 'left' : 'right'
      const dateX = pdfSettings.logoPosition === 'right' ? leftMargin : rightMargin
      doc.text(genDate, dateX, yPos + 18, { align: dateAlign })

      // Reset to text color from settings
      doc.setTextColor(...textColorRgb)
      yPos = headerHeight + 10

      // STUDENT INFORMATION Section
      doc.setFontSize(parseInt(pdfSettings.fontSize) + 2) // Section titles slightly larger
      doc.setFont('helvetica', 'bold')
      doc.text('STUDENT INFORMATION', leftMargin, yPos)
      yPos += 7

      // Student info grid with labels and values
      const labelWidth = 35
      let xPos = leftMargin

      // Row 1: Student Name and Student Roll#
      doc.setFontSize(parseInt(pdfSettings.fontSize))
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb) // Use secondary color for labels
      doc.text('Student Name:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb) // Use text color for values
      doc.text(studentName || 'N/A', xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Student Roll#:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(student?.admission_number || 'N/A', xPos + labelWidth, yPos)

      yPos += 6
      xPos = leftMargin

      // Row 2: Class and Father Name
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Class:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(className, xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Father Name:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(student?.father_name || 'N/A', xPos + labelWidth, yPos)

      yPos += 6
      xPos = leftMargin

      // Row 3: Due Date and Fee Type
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Due Date:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      const formattedDueDate = new Date(challanToUse.due_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-')
      const dueDayName = days[new Date(challanToUse.due_date).getDay()]
      doc.text(formattedDueDate + ' ' + dueDayName, xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Fee Type:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(`School Fee (${feePlan})`, xPos + labelWidth, yPos)

      yPos += 12

      // FEE BREAKDOWN Section
      doc.setFontSize(parseInt(pdfSettings.fontSize) + 2)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text('FEE BREAKDOWN', leftMargin, yPos)
      yPos += 2

      // Calculate paid amount and balance due
      const totalAmount = parseFloat(challanToUse?.total_amount || 0)
      const paidAmount = parseFloat(challanToUse?.paid_amount || 0)
      const balanceDue = Math.max(0, totalAmount - paidAmount)

      // Build detailed fee breakdown table from actual challan items
      const tableData = []

      // Add ALL fee items from fee_challan_items table
      if (itemsToUse && itemsToUse.length > 0) {
        // New challan with detailed fee items
        itemsToUse.forEach(item => {
          const itemName = item.fee_types?.fee_name || item.description || 'Fee'
          const itemAmount = parseFloat(item.amount) || 0
          tableData.push({ label: itemName, amount: formatCurrency(itemAmount), type: 'normal' })
        })
      } else {
        // Fallback for old challans: calculate fees from total_amount
        const baseFee = parseFloat(student?.base_fee) || parseFloat(challanToUse?.base_fee) || 0
        const discountAmt = parseFloat(student?.discount_amount) || parseFloat(challanToUse?.discount_amount) || 0

        // Calculate other fees: total_amount - (baseFee - discount)
        const monthlyFeeAfterDiscount = baseFee - discountAmt
        const otherFeesAmount = totalAmount - monthlyFeeAfterDiscount

        // Add Monthly Fee
        if (baseFee > 0) {
          tableData.push({ label: 'Monthly Fee', amount: formatCurrency(baseFee), type: 'normal' })
        }

        // Add Other Fees if they exist
        if (otherFeesAmount > 0) {
          tableData.push({ label: 'Other Fees', amount: formatCurrency(otherFeesAmount), type: 'normal' })
        }
      }

      // Add discount row if exists
      const discountAmount = student?.discount_amount || challanToUse?.discount_amount || 0
      if (discountAmount > 0) {
        tableData.push({ label: 'Discount', amount: `- ${formatCurrency(discountAmount)}`, type: 'discount' })
      }

      // Add summary rows
      tableData.push({ label: 'TOTAL FEE PAYABLE', amount: formatCurrency(totalAmount), type: 'total' })
      tableData.push({ label: 'Already Paid', amount: formatCurrency(paidAmount), type: 'paid' })
      tableData.push({ label: 'Balance Due', amount: formatCurrency(balanceDue), type: 'balance' })

      // Convert to autoTable format
      const tableBody = tableData.map(row => [row.label, row.amount])

      const cellPaddingValue = pdfSettings.cellPadding === 'comfortable' ? 5 : pdfSettings.cellPadding === 'normal' ? 4 : 3
      const alternateRowColorRgb = hexToRgb(pdfSettings.alternateRowColor || '#F8FAFC')

      if (tableBody.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Particulars', 'Amount']],
          body: tableBody,
          theme: pdfSettings.tableStyle || 'grid',
          headStyles: {
            fillColor: hexToRgb(pdfSettings.tableHeaderColor),
            textColor: [255, 255, 255],
            fontSize: parseInt(pdfSettings.fontSize) + 1,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: { top: cellPaddingValue, bottom: cellPaddingValue, left: 5, right: 5 }
          },
          bodyStyles: {
            fontSize: parseInt(pdfSettings.fontSize) + 1,
            cellPadding: { top: cellPaddingValue, bottom: cellPaddingValue, left: 5, right: 5 },
            textColor: textColorRgb
          },
          columnStyles: {
            0: { cellWidth: 130, halign: 'left' },
            1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: leftMargin, right: leftMargin },
          didParseCell: function(data) {
            data.cell.styles.lineColor = secondaryColorRgb
            data.cell.styles.lineWidth = lineWidthValue

            if (data.section === 'body') {
              const rowType = tableData[data.row.index]?.type

              // Style for TOTAL FEE PAYABLE row
              if (rowType === 'total') {
                data.cell.styles.fillColor = hexToRgb('#F0FDF4')
                data.cell.styles.fontStyle = 'bold'
                if (data.column.index === 0) {
                  data.cell.styles.textColor = textColorRgb
                } else {
                  data.cell.styles.textColor = primaryColorRgb
                }
              }
              // Style for Already Paid row
              else if (rowType === 'paid') {
                data.cell.styles.fillColor = [255, 255, 255]
                data.cell.styles.fontStyle = 'bold'
                if (data.column.index === 1) {
                  data.cell.styles.textColor = [34, 197, 94] // Green
                }
              }
              // Style for Balance Due row
              else if (rowType === 'balance') {
                data.cell.styles.fillColor = balanceDue > 0 ? hexToRgb('#FEF2F2') : hexToRgb('#F0FDF4')
                data.cell.styles.fontStyle = 'bold'
                if (data.column.index === 1) {
                  data.cell.styles.textColor = balanceDue > 0 ? [220, 38, 38] : [34, 197, 94] // Red if due, green if paid
                }
              }
              // Style for Discount row
              else if (rowType === 'discount') {
                if (data.column.index === 1) {
                  data.cell.styles.textColor = [220, 38, 38] // Red for discount
                }
              }
              // Alternate row colors for normal rows
              else if (data.row.index % 2 === 1) {
                data.cell.styles.fillColor = alternateRowColorRgb
              }
            }
          }
        })

        yPos = doc.lastAutoTable.finalY + 5
      }

      // Amount in words
      doc.setFontSize(parseInt(pdfSettings.fontSize))
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Amount in Words:', margins.left, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textColorRgb)
      const amountInWords = numberToWords(challanToUse.total_amount)
      doc.text(amountInWords, margins.left, yPos + 5)

      yPos += 12

      // Payment Status
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Payment Status:', margins.left, yPos)

      // Use primary color for status with different shades based on status
      const statusColor = challanToUse.status === 'paid' ? primaryColorRgb : challanToUse.status === 'overdue' ? [220, 38, 38] : secondaryColorRgb
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...statusColor)
      doc.text(challanToUse.status.charAt(0).toUpperCase() + challanToUse.status.slice(1), margins.left + 32, yPos)

      // Footer (only if includeFooter is true)
      if (pdfSettings.includeFooter !== false) {
        yPos = pageHeight - margins.bottom + 5

        // Horizontal line above footer text
        doc.setDrawColor(...secondaryColorRgb)
        doc.setLineWidth(lineWidthValue)
        doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3)

        doc.setFontSize(parseInt(pdfSettings.fontSize) - 1)
        doc.setTextColor(...secondaryColorRgb)
        doc.setFont('helvetica', 'normal')

        // Use footerText from settings if available, otherwise use school name
        const footerText = pdfSettings.footerText || schoolData.name || schoolName
        let footerContent = footerText

        // Add page numbers if includePageNumbers is true
        if (pdfSettings.includePageNumbers) {
          footerContent = `${footerText} - Page 1`
        }

        doc.text(footerContent, pageWidth / 2, yPos, { align: 'center' })
      }

      // Download PDF directly
      const fileName = `Fee_Challan_${student?.admission_number || 'unknown'}_${new Date().getTime()}.pdf`
      doc.save(fileName)
      showToast('PDF downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast(`Failed to generate PDF: ${error.message}`, 'error')
    }
  }

  const handleBulkDownload = async () => {
    if (filteredChallans.length === 0) {
      showToast('No challans available to download', 'error')
      return
    }

    try {

      const user = getUserFromCookie()
      if (!user) return

      // Fetch school data once
      const schoolResult = await supabase
        .from('schools')
        .select('name, address, phone, email, logo_url, code')
        .eq('id', user.school_id)
        .single()

      const schoolData = schoolResult.data || {}
      const pdfSettings = getPdfSettings(user?.id)

      // Process each challan
      for (let i = 0; i < filteredChallans.length; i++) {
        const challan = filteredChallans[i]

        // Fetch challan items - simplified query
        const { data: items, error: itemsError } = await supabase
          .from('fee_challan_items')
          .select('*')
          .eq('challan_id', challan.id)

        // If items exist, fetch fee type names separately
        if (items && items.length > 0) {
          const feeTypeIds = items.map(i => i.fee_type_id).filter(Boolean)
          if (feeTypeIds.length > 0) {
            const { data: feeTypes } = await supabase
              .from('fee_types')
              .select('id, fee_name')
              .in('id', feeTypeIds)

            // Create a map of fee type names
            const feeTypeMap = {}
            feeTypes?.forEach(ft => {
              feeTypeMap[ft.id] = ft.fee_name
            })

            // Add fee type names to items
            items.forEach(item => {
              if (item.fee_type_id && feeTypeMap[item.fee_type_id]) {
                item.fee_type_name = feeTypeMap[item.fee_type_id]
              }
            })
          }
        }

        if (itemsError) {
          console.error('Error fetching challan items for PDF:', itemsError)
        }

        const itemsToUse = items || []
        const student = challan.students
        const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
        const className = student?.classes?.class_name || 'N/A'

        // Fetch class data for fee plan
        const { data: classData } = await supabase
          .from('classes')
          .select('fee_plan')
          .eq('id', student?.current_class_id)
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
          .single()

        const feePlan = classData?.fee_plan || 'Monthly'

        // Create PDF
        const doc = new jsPDF({
          orientation: pdfSettings.orientation || 'portrait',
          unit: 'mm',
          format: pdfSettings.pageSize?.toLowerCase() || 'a4'
        })

        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        applyPdfSettings(doc, pdfSettings)

        const margins = getMarginValues(pdfSettings.margin)
        const leftMargin = margins.left
        const rightMargin = pageWidth - margins.right

        // Header background
        const headerHeight = 40
        const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
        doc.setFillColor(...headerBgColor)
        doc.rect(0, 0, pageWidth, headerHeight, 'F')

        // Logo in header
        let yPos = 18
        if (pdfSettings.includeLogo && schoolData.logo_url) {
          try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.src = schoolData.logo_url

            await new Promise((resolve) => {
              img.onload = () => {
                try {
                  const logoSizeObj = getLogoSize(pdfSettings.logoSize)
                  const currentLogoSize = logoSizeObj.width // Use width property
                  const logoY = (headerHeight - currentLogoSize) / 2
                  let logoX = 10

                  if (pdfSettings.logoPosition === 'right') {
                    logoX = pageWidth - currentLogoSize - 10
                  }

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

                    // Add border based on logo style from PDF settings
                    const borderRgb = pdfSettings.logoBorderColor ? hexToRgb(pdfSettings.logoBorderColor) : [255, 255, 255]
                    if (pdfSettings.logoStyle === 'circle') {
                      doc.setDrawColor(...borderRgb)
                      doc.setLineWidth(0.5)
                      doc.circle(logoX + currentLogoSize/2, logoY + currentLogoSize/2, currentLogoSize/2, 'S')
                    } else if (pdfSettings.logoStyle === 'rounded') {
                      doc.setDrawColor(...borderRgb)
                      doc.setLineWidth(0.5)
                      doc.roundedRect(logoX, logoY, currentLogoSize, currentLogoSize, 3, 3, 'S')
                    }
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

        // School name and subtitle in white
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(schoolData.name || schoolName, pageWidth / 2, yPos + 5, { align: 'center' })

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('Student FEE CHALLAN', pageWidth / 2, yPos + 12, { align: 'center' })

        // Generated date
        doc.setFontSize(7)
        doc.setTextColor(220, 220, 220)
        const now = new Date()
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const genDate = `Generated: ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`

        const dateAlign = pdfSettings.logoPosition === 'right' ? 'left' : 'right'
        const dateX = pdfSettings.logoPosition === 'right' ? leftMargin : rightMargin
        doc.text(genDate, dateX, yPos + 18, { align: dateAlign })

        // Reset to black
        doc.setTextColor(0, 0, 0)
        yPos = headerHeight + 10

        // STUDENT INFORMATION Section
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('STUDENT INFORMATION', leftMargin, yPos)
        yPos += 7

        const labelWidth = 35
        let xPos = leftMargin

        // Row 1: Student Name and Student Roll#
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Student Name:', xPos, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(studentName || 'N/A', xPos + labelWidth, yPos)

        xPos = pageWidth / 2 + 5
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Student Roll#:', xPos, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(student?.admission_number || 'N/A', xPos + labelWidth, yPos)

        yPos += 6
        xPos = leftMargin

        // Row 2: Class and Father Name
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Class:', xPos, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(className, xPos + labelWidth, yPos)

        xPos = pageWidth / 2 + 5
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Father Name:', xPos, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(student?.father_name || 'N/A', xPos + labelWidth, yPos)

        yPos += 6
        xPos = leftMargin

        // Row 3: Due Date and Fee Type
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Due Date:', xPos, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const formattedDueDate = new Date(challan.due_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-')
        doc.text(formattedDueDate + ' Tuesday', xPos + labelWidth, yPos)

        xPos = pageWidth / 2 + 5
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Fee Type:', xPos, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(`School Fee (${feePlan})`, xPos + labelWidth, yPos)

        yPos += 12

        // FEE BREAKDOWN Section
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('FEE BREAKDOWN', leftMargin, yPos)
        yPos += 2

        // Calculate paid amount and balance due
        const totalAmount = parseFloat(challan?.total_amount || 0)
        const paidAmount = parseFloat(challan?.paid_amount || 0)
        const balanceDue = Math.max(0, totalAmount - paidAmount)

        // Build detailed fee breakdown table from actual challan items
        const tableData = []

        // Add ALL fee items from fee_challan_items table
        if (itemsToUse && itemsToUse.length > 0) {
          // New challan with detailed fee items
          itemsToUse.forEach(item => {
            const itemName = item.fee_type_name || item.description || 'Fee'
            const itemAmount = parseFloat(item.amount) || 0
            tableData.push({ label: itemName, amount: formatCurrency(itemAmount), type: 'normal' })
          })
        } else {
          // Fallback for old challans: calculate fees from total_amount
          const baseFee = parseFloat(student?.base_fee) || parseFloat(challan?.base_fee) || 0
          const discountAmt = parseFloat(student?.discount_amount) || parseFloat(challan?.discount_amount) || 0

          // Calculate other fees: total_amount - (baseFee - discount)
          const monthlyFeeAfterDiscount = baseFee - discountAmt
          const otherFeesAmount = totalAmount - monthlyFeeAfterDiscount

          // Add Monthly Fee
          if (baseFee > 0) {
            tableData.push({ label: 'Monthly Fee', amount: formatCurrency(baseFee), type: 'normal' })
          }

          // Add Other Fees if they exist
          if (otherFeesAmount > 0) {
            tableData.push({ label: 'Other Fees', amount: formatCurrency(otherFeesAmount), type: 'normal' })
          }
        }

        // Add discount row if exists
        const discountAmount = student?.discount_amount || challan?.discount_amount || 0
        if (discountAmount > 0) {
          tableData.push({ label: 'Discount', amount: `- ${formatCurrency(discountAmount)}`, type: 'discount' })
        }

        // Add summary rows
        tableData.push({ label: 'TOTAL FEE PAYABLE', amount: formatCurrency(totalAmount), type: 'total' })
        tableData.push({ label: 'Already Paid', amount: formatCurrency(paidAmount), type: 'paid' })
        tableData.push({ label: 'Balance Due', amount: formatCurrency(balanceDue), type: 'balance' })

        // Convert to autoTable format
        const tableBody = tableData.map(row => [row.label, row.amount])

        if (tableBody.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Particulars', 'Amount']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
              fillColor: hexToRgb(pdfSettings.tableHeaderColor),
              textColor: [255, 255, 255],
              fontSize: 9,
              fontStyle: 'bold',
              halign: 'left',
              cellPadding: { top: 4, bottom: 4, left: 5, right: 5 }
            },
            bodyStyles: {
              fontSize: 9,
              cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
              textColor: [0, 0, 0]
            },
            columnStyles: {
              0: { cellWidth: 130, halign: 'left' },
              1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: leftMargin, right: leftMargin },
            didParseCell: function(data) {
              data.cell.styles.lineColor = [200, 200, 200]
              data.cell.styles.lineWidth = 0.1

              if (data.section === 'body') {
                const rowType = tableData[data.row.index]?.type

                // Style for TOTAL FEE PAYABLE row
                if (rowType === 'total') {
                  data.cell.styles.fillColor = [240, 253, 244]
                  data.cell.styles.fontStyle = 'bold'
                  if (data.column.index === 1) {
                    data.cell.styles.textColor = [22, 163, 74] // Green
                  }
                }
                // Style for Already Paid row
                else if (rowType === 'paid') {
                  data.cell.styles.fillColor = [255, 255, 255]
                  data.cell.styles.fontStyle = 'bold'
                  if (data.column.index === 1) {
                    data.cell.styles.textColor = [34, 197, 94] // Green
                  }
                }
                // Style for Balance Due row
                else if (rowType === 'balance') {
                  data.cell.styles.fillColor = balanceDue > 0 ? [254, 242, 242] : [240, 253, 244]
                  data.cell.styles.fontStyle = 'bold'
                  if (data.column.index === 1) {
                    data.cell.styles.textColor = balanceDue > 0 ? [220, 38, 38] : [34, 197, 94]
                  }
                }
                // Style for Discount row
                else if (rowType === 'discount') {
                  if (data.column.index === 1) {
                    data.cell.styles.textColor = [220, 38, 38] // Red for discount
                  }
                }
              }
            }
          })

          yPos = doc.lastAutoTable.finalY + 5
        }

        // Amount in words
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Amount in Words:', margins.left, yPos)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        const amountInWords = numberToWords(challan.total_amount)
        doc.text(amountInWords, margins.left, yPos + 5)

        yPos += 12

        // Payment Status
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Payment Status:', margins.left, yPos)

        const statusColor = challan.status === 'paid' ? [22, 163, 74] : challan.status === 'overdue' ? [220, 38, 38] : [234, 179, 8]
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...statusColor)
        doc.text(challan.status.charAt(0).toUpperCase() + challan.status.slice(1), margins.left + 32, yPos)

        // Footer
        yPos = pageHeight - margins.bottom - 8

        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3)

        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.setFont('helvetica', 'normal')
        doc.text(schoolData.name || schoolName, pageWidth / 2, yPos, { align: 'center' })

        // Save each PDF
        const fileName = `Fee_Challan_${student?.admission_number || 'unknown'}_${new Date().getTime()}.pdf`
        doc.save(fileName)

        // Add small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      showToast('PDF file downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error in bulk download:', error)
      showToast('Failed to download PDF file', 'error')
    }
  }

  const filteredChallans = challans.filter(challan => {
    const searchLower = searchTerm.toLowerCase()
    const student = challan.students
    const fullName = student ? `${student.first_name} ${student.last_name || ''}`.toLowerCase() : ''

    const matchesSearch =
      challan.challan_number.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      (student?.admission_number || '').toLowerCase().includes(searchLower)

    const matchesStatus = statusFilter === 'all' || challan.status === statusFilter
    const matchesClass = classFilter === 'all' || challan.students?.classes?.id === classFilter
    const matchesSection = sectionFilter === 'all' || challan.students?.sections?.id === sectionFilter

    return matchesSearch && matchesStatus && matchesClass && matchesSection
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Generate page numbers to display (max 4 visible)
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 4
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 2) {
        for (let i = 1; i <= maxVisiblePages; i++) pages.push(i)
      } else if (currentPage >= totalPages - 1) {
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        for (let i = currentPage - 1; i <= currentPage + 2; i++) {
          if (i >= 1 && i <= totalPages) pages.push(i)
        }
      }
    }
    return pages
  }

  return (
    <div className="p-2 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Header */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-800">View Challans</h1>
      </div>

      {/* Search & Filter Section - Compact */}
      <div className="bg-white rounded-lg shadow p-3 mb-3">
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <div className="md:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="md:w-40">
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value)
                setSectionFilter('all') // Reset section when class changes
              }}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:w-40">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              disabled={classFilter === 'all'}
            >
              <option value="all">All Sections</option>
              {sections
                .filter(sec => classFilter === 'all' || sec.class_id === classFilter)
                .map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by challan number, student name, or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {/* Download PDF Button - Always visible */}
          <button
            onClick={handleBulkDownload}
            disabled={filteredChallans.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            title="Download PDF"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>

        <div className="flex gap-3 text-xs">
          <p className="text-gray-600">
            Total: <span className="font-bold text-blue-600">{filteredChallans.length}</span>
          </p>
          <p className="text-gray-600">
            Pending: <span className="font-bold text-yellow-600">{filteredChallans.filter(c => c.status === 'pending').length}</span>
          </p>
          <p className="text-gray-600">
            Paid: <span className="font-bold text-green-600">{filteredChallans.filter(c => c.status === 'paid').length}</span>
          </p>
          <p className="text-gray-600">
            Overdue: <span className="font-bold text-red-600">{filteredChallans.filter(c => c.status === 'overdue').length}</span>
          </p>
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Sr.</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Student Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Admission No.</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Class</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Issue Date</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Due Date</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Total Amount</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Already Paid</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Balance Due</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold text-xs border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-3 py-8 text-center text-gray-500 text-xs">
                    Loading...
                  </td>
                </tr>
              ) : paginatedChallans.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-3 py-8 text-center text-gray-500 text-xs">
                    No challans found
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan, index) => {
                  const student = challan.students
                  const totalAmount = parseFloat(challan.total_amount)
                  const paidAmount = parseFloat(challan.paid_amount || 0)
                  const balanceDue = totalAmount - paidAmount

                  return (
                    <tr key={challan.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition ${challan.status === 'paid' ? 'bg-green-50' : ''}`}>
                      <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">{startIndex + index + 1}</td>
                      <td className="px-3 py-2.5 text-blue-600 font-medium text-xs border border-gray-200">
                        {student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'N/A'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">{student?.admission_number || 'N/A'}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">
                        {student?.classes?.class_name || 'N/A'}{student?.sections?.section_name ? ` - ${student.sections.section_name}` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">
                        {new Date(challan.issue_date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">
                        {new Date(challan.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5 text-gray-900 font-bold text-xs border border-gray-200">
                        Rs. {totalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="text-green-600 font-semibold text-xs">
                          Rs. {paidAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className={`font-bold text-xs ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Rs. {balanceDue.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(challan.status)}`}>
                          {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewChallan(challan)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDirectDownloadPDF(challan)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            title="Print Challan"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredChallans.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded text-xs font-medium transition ${
                  currentPage === 1
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof page === 'number' && goToPage(page)}
                  className={`w-8 h-8 rounded text-xs font-medium transition ${
                    page === currentPage
                      ? 'bg-blue-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded text-xs font-medium transition ${
                  currentPage === totalPages
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-2">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500 text-xs">
            Loading...
          </div>
        ) : paginatedChallans.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500 text-xs">
            No challans found
          </div>
        ) : (
          <>
            {paginatedChallans.map((challan, index) => {
              const student = challan.students
              const totalAmount = parseFloat(challan.total_amount)
              const paidAmount = parseFloat(challan.paid_amount || 0)
              const balanceDue = totalAmount - paidAmount

              return (
                <div key={challan.id} className={`bg-white rounded-lg shadow p-3 border border-gray-200 ${challan.status === 'paid' ? 'bg-green-50' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Challan #{startIndex + index + 1}</div>
                      <div className="font-bold text-blue-600 text-xs">
                        {student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'Student Info Not Available'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(challan.status)}`}>
                      {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Admission No:</span>
                      <span className="font-semibold text-gray-900">{student?.admission_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Class:</span>
                      <span className="font-semibold text-gray-900">
                        {student?.classes?.class_name || 'N/A'} {student?.sections?.section_name ? `- ${student.sections.section_name}` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issue Date:</span>
                      <span className="text-gray-900">{new Date(challan.issue_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="text-gray-900">{new Date(challan.due_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                      <span className="text-gray-600 font-semibold">Total Amount:</span>
                      <span className="text-gray-900 font-bold text-sm">
                        Rs. {totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-semibold">Already Paid:</span>
                      <span className="text-green-600 font-semibold text-sm">
                        Rs. {paidAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-semibold">Balance Due:</span>
                      <span className={`font-bold text-sm ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs. {balanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewChallan(challan)}
                        className="flex-1 bg-blue-600 text-white py-1.5 rounded font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => handleDirectDownloadPDF(challan)}
                        className="flex-1 bg-red-600 text-white py-1.5 rounded font-semibold hover:bg-red-700 transition flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Printer size={14} />
                        Print
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Mobile Pagination */}
            {filteredChallans.length > 0 && (
              <div className="bg-white rounded-lg shadow p-3 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {startIndex + 1}-{Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded text-xs font-medium transition ${
                      currentPage === 1
                        ? 'bg-blue-300 text-white cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded text-xs font-medium transition ${
                      currentPage === totalPages
                        ? 'bg-blue-300 text-white cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Challan Modal */}
      {showViewModal && selectedChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowViewModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-[#2B5AA8] text-white px-4 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold">Challan Details</h3>
                  <p className="text-blue-100 text-xs mt-0.5">{selectedChallan.challan_number}</p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:bg-white/20 p-1.5 rounded transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {/* Student Info */}
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-3">
                <h4 className="font-bold text-gray-800 mb-2 text-sm">Student Information</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedChallan.students ? `${selectedChallan.students.first_name} ${selectedChallan.students.last_name || ''}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admission No:</span>
                    <span className="font-semibold text-gray-900">{selectedChallan.students?.admission_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Class:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedChallan.students?.classes?.class_name || 'N/A'} {selectedChallan.students?.sections?.section_name ? `- ${selectedChallan.students.sections.section_name}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Challan Info */}
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-3">
                <h4 className="font-bold text-gray-800 mb-2 text-sm">Challan Information</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issue Date:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(selectedChallan.issue_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(selectedChallan.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(selectedChallan.status)}`}>
                      {selectedChallan.status.charAt(0).toUpperCase() + selectedChallan.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fee Items */}
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-3">
                <h4 className="font-bold text-gray-800 mb-2 text-sm">Fee Breakdown</h4>
                <div className="space-y-1.5">
                  {challanItems.length === 0 ? (
                    <p className="text-xs text-gray-500">No fee items found</p>
                  ) : (
                    challanItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{item.fee_types?.fee_name || 'Fee'}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500">{item.description}</p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900 text-xs">
                          Rs. {parseFloat(item.amount).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 text-sm">Total Amount:</span>
                  <span className="font-bold text-red-600 text-lg">
                    Rs. {parseFloat(selectedChallan.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-2.5 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-1.5 text-gray-700 font-medium hover:bg-gray-100 rounded transition border border-gray-300 text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    downloadChallanPDF()
                    showToast('PDF downloaded successfully!', 'success')
                  }}
                  className="px-4 py-1.5 bg-red-600 text-white font-medium rounded hover:bg-red-700 transition flex items-center gap-1.5 text-xs"
                >
                  <Printer size={12} />
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

// Main Page Component with Permission Guard
export default function FeeChallanPage() {
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
      permissionKey="fee_challans_view"
      pageName="Fee Challans"
    >
      <FeeChallanContent />
    </PermissionGuard>
  )
}