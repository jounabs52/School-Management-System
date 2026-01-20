'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, CheckCircle, X, Printer, Eye, Calendar, CreditCard, Building2, GraduationCap, Phone, Mail, MapPin, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import PermissionGuard from '@/components/PermissionGuard'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  formatCurrency,
  getLogoSize,
  applyPdfSettings
} from '@/lib/pdfSettings'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={16} />}
      {type === 'error' && <X size={16} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={14} />
      </button>
    </div>
  )
}

// Modern Print Layout Component
const PrintChallan = ({ challan, school, onClose }) => {
  const printRef = useRef()
  const feeSchedule = challan?.fee_schedule || []
  const [feeItems, setFeeItems] = useState([])

  // Fetch fee items when component mounts
  useEffect(() => {
    const fetchFeeItems = async () => {
      try {
        const { data: items, error: itemsError } = await supabase
          .from('fee_challan_items')
          .select('*')
          .eq('challan_id', challan.id)

        if (itemsError) {
          console.error('Error fetching fee items:', itemsError)
          return
        }

        // If items exist, fetch fee type names
        if (items && items.length > 0) {
          const feeTypeIds = items.map(i => i.fee_type_id).filter(Boolean)
          if (feeTypeIds.length > 0) {
            const { data: feeTypes } = await supabase
              .from('fee_types')
              .select('id, fee_name')
              .in('id', feeTypeIds)

            const feeTypeMap = {}
            feeTypes?.forEach(ft => {
              feeTypeMap[ft.id] = ft.fee_name
            })

            items.forEach(item => {
              if (item.fee_type_id && feeTypeMap[item.fee_type_id]) {
                item.fee_type_name = feeTypeMap[item.fee_type_id]
              }
            })
          }

          setFeeItems(items)
        }
      } catch (error) {
        console.error('Error fetching fee items:', error)
      }
    }

    if (challan?.id) {
      fetchFeeItems()
    }
  }, [challan?.id])

  const handlePrint = async () => {
    try {
      // Get user ID for PDF settings
      const currentUser = getUserFromCookie()

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

      // Fetch class data for fee plan
      const { data: classData } = await supabase
        .from('classes')
        .select('fee_plan')
        .eq('id', challan?.student?.class?.id)
        .eq('user_id', currentUser?.id)
        .eq('school_id', currentUser?.school_id)
        .single()

      const feePlan = classData?.fee_plan || challan?.fee_plan || 'Monthly'

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
      const headerHeight = 45
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      doc.setFillColor(...headerBgColor)
      doc.rect(0, 0, pageWidth, headerHeight, 'F')

      // Logo in header
      let yPos = 18
      if (pdfSettings.includeLogo && school?.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = school.logo_url

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

      // School name and subtitle in white (centered, like fee/create)
      if (pdfSettings.includeHeader !== false) {
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(parseInt(pdfSettings.fontSize) + 8)
        doc.setFont('helvetica', 'bold')
        doc.text(school?.name || school?.school_name || 'School Name', pageWidth / 2, yPos + 5, { align: 'center' })

        doc.setFontSize(parseInt(pdfSettings.fontSize) + 1)
        doc.setFont('helvetica', 'normal')
        const headerText = pdfSettings.headerText || 'Student FEE CHALLAN'
        doc.text(headerText, pageWidth / 2, yPos + 12, { align: 'center' })
      }

      // Generated date
      doc.setFontSize(parseInt(pdfSettings.fontSize) - 1)
      doc.setTextColor(220, 220, 220)
      const now = new Date()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const genDate = `Generated: ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`

      const dateAlign = pdfSettings.logoPosition === 'right' ? 'left' : 'right'
      const dateX = pdfSettings.logoPosition === 'right' ? leftMargin : rightMargin
      doc.text(genDate, dateX, yPos + 18, { align: dateAlign })

      // Reset to text color from settings
      doc.setTextColor(...textColorRgb)
      yPos = headerHeight + 10

      // Calculate cell padding from settings
      const cellPaddingValue = pdfSettings.cellPadding === 'comfortable' ? 5 : pdfSettings.cellPadding === 'normal' ? 4 : 3
      const alternateRowColorRgb = hexToRgb(pdfSettings.alternateRowColor || '#F8FAFC')

      // STUDENT INFORMATION Section (manual layout like fee/create)
      doc.setFontSize(parseInt(pdfSettings.fontSize) + 2)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text('STUDENT INFORMATION', leftMargin, yPos)
      yPos += 7

      const labelWidth = 35
      let xPos = leftMargin

      // Row 1: Student Name and Student Roll#
      doc.setFontSize(parseInt(pdfSettings.fontSize))
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Student Name:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(`${challan?.student?.first_name || ''} ${challan?.student?.last_name || ''}`, xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Student Roll#:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(challan?.student?.admission_number || 'N/A', xPos + labelWidth, yPos)

      yPos += 6
      xPos = leftMargin

      // Row 2: Class and Father Name
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Class:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      const className = `${challan?.student?.class?.class_name || 'N/A'} ${challan?.student?.section?.section_name ? '- ' + challan?.student?.section?.section_name : ''}`
      doc.text(className, xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Father Name:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(challan?.student?.father_name || 'N/A', xPos + labelWidth, yPos)

      yPos += 6
      xPos = leftMargin

      // Row 3: Due Date and Fee Type
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Due Date:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      const formattedDueDate = new Date(challan?.due_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-')
      const dueDayName = days[new Date(challan?.due_date).getDay()]
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
        const baseFee = parseFloat(challan?.student?.base_fee) || parseFloat(challan?.base_fee) || 0
        const discountAmt = parseFloat(challan?.student?.discount_amount) || parseFloat(challan?.discount_amount) || 0

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
      const discountAmount = challan?.student?.discount_amount || challan?.discount_amount || 0
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

      // Simple number to words conversion
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
        if (integerPart < 1000) return convertLessThanThousand(integerPart) + ' Only'
        if (integerPart < 100000) {
          const thousands = Math.floor(integerPart / 1000)
          const remainder = integerPart % 1000
          return convertLessThanThousand(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '') + ' Only'
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

      const amountInWords = numberToWords(challan?.total_amount || 0)
      doc.text(amountInWords, margins.left, yPos + 5)

      yPos += 12

      // Payment Status
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Payment Status:', margins.left, yPos)

      const statusColor = challan?.status === 'paid' ? primaryColorRgb : challan?.status === 'overdue' ? [220, 38, 38] : secondaryColorRgb
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...statusColor)
      doc.text((challan?.status || 'pending').charAt(0).toUpperCase() + (challan?.status || 'pending').slice(1), margins.left + 32, yPos)

      // Footer
      if (pdfSettings.includeFooter !== false) {
        yPos = pageHeight - margins.bottom + 5

        doc.setDrawColor(...secondaryColorRgb)
        doc.setLineWidth(lineWidthValue)
        doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3)

        doc.setFontSize(parseInt(pdfSettings.fontSize) - 1)
        doc.setTextColor(...secondaryColorRgb)
        doc.setFont('helvetica', 'normal')

        const footerText = pdfSettings.footerText || school?.name || school?.school_name || 'School Name'
        let footerContent = footerText

        if (pdfSettings.includePageNumbers) {
          footerContent = `${footerText} - Page 1`
        }

        doc.text(footerContent, pageWidth / 2, yPos, { align: 'center' })
      }

      // Download PDF directly
      const fileName = `Fee_Challan_${challan?.student?.admission_number || 'unknown'}_${new Date().getTime()}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Error generating PDF:', error)
      console.error('Error name:', error?.name)
      console.error('Error message:', error?.message)
      console.error('Error stack:', error?.stack)

      // Log challan data to see what's being processed
      console.error('Challan data:', {
        challanNumber: challan?.challan_number,
        hasStudent: !!challan?.student,
        hasFeeSchedule: !!challan?.fee_schedule,
        feeScheduleLength: challan?.fee_schedule?.length
      })

      alert(`Failed to generate PDF: ${error?.message || 'Unknown error'}. Please check console for details.`)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[9999]"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-5xl max-h-[90vh] bg-white rounded-xl z-[10000] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-[#1e3a5f] text-white px-6 py-3 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Fee Challan Preview</h3>
            <p className="text-blue-200 text-sm">Review and print the challan</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[#D12323] hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-medium text-sm"
            >
              <Printer size={16} />
              Print Challan
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/10 p-2 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div ref={printRef}>
            <div className="challan-container" style={{ width: '100%', background: 'white', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: '#1e3a5f', color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>{school?.name || school?.school_name || 'School Name'}</h1>
                  <p style={{ fontSize: '12px', opacity: '0.9' }}>{school?.address || 'Bhakkar'}</p>
                  <p style={{ fontSize: '12px', opacity: '0.9' }}>{school?.phone && `Phone: ${school.phone}`} {school?.email && `| Email: ${school.email}`}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 16px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: '0.8' }}>Challan No.</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>{challan?.challan_number}</div>
                </div>
              </div>

              {/* Student Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '10px', fontWeight: '600' }}>Student Information</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Name</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>{challan?.student?.first_name} {challan?.student?.last_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Admission No.</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>{challan?.student?.admission_number}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Class / Section</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>{challan?.student?.class?.class_name || 'N/A'} {challan?.student?.section?.section_name ? `- ${challan?.student?.section?.section_name}` : ''}</span>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '10px', fontWeight: '600' }}>Challan Details</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Issue Date</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>{new Date(challan?.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Fee Plan</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px', textTransform: 'capitalize' }}>{challan?.fee_plan || 'Monthly'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Status</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      background: challan?.status === 'paid' ? '#dcfce7' : '#fef3c7',
                      color: challan?.status === 'paid' ? '#166534' : '#b45309'
                    }}>{challan?.status || 'PENDING'}</span>
                  </div>
                </div>
              </div>

              {/* Fee Schedule */}
              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '3px', height: '18px', background: '#1e3a5f', borderRadius: '2px', display: 'inline-block' }}></span>
                  Fee Schedule - Academic Year {challan?.fee_year || new Date().getFullYear()}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Sr.</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Period</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Months</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '10px 12px', textAlign: 'left', fontWeight: '600', fontSize: '12px' }}>Due Date</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontSize: '12px' }}>Amount</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '10px 12px', textAlign: 'center', fontWeight: '600', fontSize: '12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeSchedule.length > 0 ? feeSchedule.map((item, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: '600', fontSize: '12px' }}>{item.period}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>{item.months?.join(', ') || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>{new Date(item.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600', fontSize: '12px' }}>Rs. {parseFloat(item.amount).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            background: item.status === 'paid' ? '#dcfce7' : '#fef3c7',
                            color: item.status === 'paid' ? '#166534' : '#b45309'
                          }}>{item.status || 'Pending'}</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                          No fee schedule available. This may be an older challan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payment Details Section */}
              <div style={{ padding: '20px', background: '#f8fafc' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '3px', height: '18px', background: '#1e3a5f', borderRadius: '2px', display: 'inline-block' }}></span>
                  Payment Summary
                </div>

                {/* Fee Items - Dynamic */}
                {feeItems.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    {feeItems.map((item, idx) => (
                      <div key={idx} style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
                          {item.fee_type_name || item.description || 'Fee'}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
                          Rs. {parseFloat(item.amount || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Fallback for old challans
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>Base Fee (Monthly)</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Rs. {parseFloat(challan?.student?.base_fee || challan?.base_fee || 0).toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {/* Show discount if exists */}
                {(challan?.student?.discount_amount || challan?.discount_amount) > 0 && (
                  <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
                      Discount ({challan?.student?.discount_type || challan?.discount_type || 'fixed'})
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
                      Rs. {parseFloat(challan?.student?.discount_amount || challan?.discount_amount || 0).toLocaleString()}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>Paid Amount</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Rs. {parseFloat(challan?.paid_amount || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#1e3a5f', padding: '14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', fontWeight: '600' }}>Total Payable</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'white' }}>Rs. {parseFloat(challan?.total_amount || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#64748b' }}>
                <div style={{ maxWidth: '400px' }}>
                  <strong style={{ color: '#1e293b', fontSize: '11px' }}>Terms & Conditions:</strong>
                  <ul style={{ marginTop: '6px', paddingLeft: '14px', fontSize: '10px' }}>
                    <li>Fee must be paid by the due date to avoid late fee charges.</li>
                    <li>This challan is computer generated and valid without signature.</li>
                    <li>Please retain this receipt for your records.</li>
                  </ul>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '130px', borderTop: '1px solid #1e293b', marginBottom: '6px' }}></div>
                  <span style={{ fontSize: '10px' }}>Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function FeeCollectContent() {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChallan, setSelectedChallan] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printChallan, setPrintChallan] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [classes, setClasses] = useState([])
  const [school, setSchool] = useState(null)

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

  // CSV Download function
  const downloadCSV = () => {
    try {
      // Prepare CSV headers
      const headers = [
        'Sr.',
        'Student Name',
        'Admission No.',
        'Class',
        'Fee Plan',
        'Challan Number',
        'Issue Date',
        'Due Date',
        'Total Amount',
        'Paid Amount',
        'Remaining',
        'Status'
      ]

      // Prepare CSV rows from filtered challans
      const rows = filteredChallans.map((challan, index) => {
        const studentName = `${challan.student?.first_name || ''} ${challan.student?.last_name || ''}`.trim() || 'N/A'
        const admissionNo = challan.student?.admission_number || 'N/A'
        const className = challan.student?.class?.class_name || 'N/A'
        const sectionName = challan.student?.section?.section_name || ''
        const classWithSection = sectionName ? `${className} - ${sectionName}` : className
        // Get fee_plan from challan first, then from student, then default to 'Monthly'
        const feePlan = (challan.fee_plan || challan.students?.fee_plan || challan.student?.fee_plan || 'monthly')
        const challanNumber = challan.challan_number || 'N/A'

        // Format dates as text - force Excel to treat as text by prepending with tab character
        let issueDate = 'N/A'
        let dueDate = 'N/A'

        if (challan.issue_date) {
          const iDate = new Date(challan.issue_date)
          const day = String(iDate.getDate()).padStart(2, '0')
          const month = String(iDate.getMonth() + 1).padStart(2, '0')
          const year = iDate.getFullYear()
          // Add tab character prefix to force text format in Excel
          issueDate = `\t${day}/${month}/${year}`
        }

        if (challan.due_date) {
          const dDate = new Date(challan.due_date)
          const day = String(dDate.getDate()).padStart(2, '0')
          const month = String(dDate.getMonth() + 1).padStart(2, '0')
          const year = dDate.getFullYear()
          // Add tab character prefix to force text format in Excel
          dueDate = `\t${day}/${month}/${year}`
        }

        // Calculate amounts properly based on status
        const totalAmount = parseFloat(challan.total_amount || 0)
        let paidAmount = 0
        let remaining = 0

        if (challan.status === 'paid') {
          // If paid, show total amount in paid column, 0 in remaining
          paidAmount = totalAmount
          remaining = 0
        } else {
          // If pending/overdue, show actual paid amount and calculate remaining
          paidAmount = parseFloat(challan.paid_amount || 0)
          remaining = Math.max(0, totalAmount - paidAmount)
        }

        const status = (challan.status || 'N/A').toUpperCase()

        return [
          index + 1,
          studentName,
          admissionNo,
          classWithSection,
          feePlan,
          challanNumber,
          issueDate,
          dueDate,
          totalAmount.toFixed(0), // Show as whole number
          paidAmount.toFixed(0), // Show as whole number
          remaining.toFixed(0), // Show as whole number
          status
        ]
      })

      // Combine headers and rows with proper CSV escaping
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Convert to string and escape
          const cellStr = String(cell)
          // Always quote fields that contain commas, quotes, newlines, or special characters
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          // Quote the field to prevent Excel from treating it as a formula or number
          return `"${cellStr}"`
        }).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      // Generate filename with current date and filters
      const date = new Date().toISOString().split('T')[0]
      let filename = `fee_collection_${date}`
      if (statusFilter !== 'all') filename += `_${statusFilter}`
      if (classFilter !== 'all') {
        const selectedClass = classes.find(c => c.id === classFilter)
        if (selectedClass) filename += `_${selectedClass.class_name.replace(/\s+/g, '_')}`
      }
      filename += '.csv'

      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast('CSV file downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error downloading CSV:', error)
      showToast('Failed to download CSV file', 'error')
    }
  }

  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'cash',
    amountPaid: '',
    chequeNumber: '',
    bankName: '',
    transactionId: '',
    remarks: ''
  })

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (showPaymentModal || showPrintModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showPaymentModal, showPrintModal])

  useEffect(() => {
    fetchAllChallans()
    fetchAllClasses()
    fetchSchoolInfo()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, classFilter])

  const fetchSchoolInfo = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user.school_id)
        .single()

      if (!error && schoolData) {
        setSchool(schoolData)
      }
    } catch (error) {
      console.error('Error fetching school:', error)
    }
  }

  const fetchAllClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: allClasses, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('class_name', { ascending: true })

      if (!error && allClasses) {
        setClasses(allClasses)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchAllChallans = async () => {
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

      if (challansError) throw challansError

      const classIds = [...new Set(challansData?.map(c => c.students?.current_class_id).filter(Boolean))]
      const sectionIds = [...new Set(challansData?.map(c => c.students?.current_section_id).filter(Boolean))]

      const { data: classesData } = await supabase
        .from('classes')
        .select('id, class_name, fee_plan')
        .in('id', classIds)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, section_name')
        .in('id', sectionIds)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)

      const classMap = {}
      classesData?.forEach(c => { classMap[c.id] = c })

      const sectionMap = {}
      sectionsData?.forEach(s => { sectionMap[s.id] = s })

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

      const challansWithDetails = (challansData || []).map(challan => {
        // Calculate paid amount from payments
        const paidAmount = paymentMap[challan.id] || 0

        return {
          ...challan,
          // Use challan's total_amount as it includes all fee items (monthly + other fees)
          paid_amount: paidAmount,
          student: {
            ...challan.students,
            class: classMap[challan.students?.current_class_id],
            section: sectionMap[challan.students?.current_section_id]
          }
        }
      })

      setChallans(challansWithDetails)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSelectChallan = async (challan) => {
    setSelectedChallan(challan)
    setShowPaymentModal(true)
    // Calculate remaining balance
    const remainingBalance = parseFloat(challan.total_amount) - parseFloat(challan.paid_amount || 0)
    setPaymentData({
      paymentMethod: 'cash',
      amountPaid: remainingBalance.toString(),
      chequeNumber: '',
      bankName: '',
      transactionId: '',
      remarks: ''
    })
  }

  const handleViewChallan = (challan) => {
    setPrintChallan(challan)
    setShowPrintModal(true)
  }

  const handlePayment = async () => {
    try {
      console.log('handlePayment called')
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        showToast('User not found', 'error')
        return
      }

      console.log('Payment Data:', paymentData)
      console.log('Selected Challan:', selectedChallan)

      if (!paymentData.amountPaid || parseFloat(paymentData.amountPaid) <= 0) {
        showToast('Please enter a valid amount', 'error')
        return
      }

      const amountPaid = parseFloat(paymentData.amountPaid)
      const challanTotalAmount = parseFloat(selectedChallan.total_amount)
      const previouslyPaidAmount = parseFloat(selectedChallan.paid_amount || 0)
      const remainingBalance = challanTotalAmount - previouslyPaidAmount

      console.log('Amount Paid:', amountPaid)
      console.log('Total Amount:', challanTotalAmount)
      console.log('Previously Paid:', previouslyPaidAmount)
      console.log('Remaining Balance:', remainingBalance)

      // Validate payment amount
      if (amountPaid > remainingBalance) {
        showToast(`Payment amount cannot exceed remaining balance of Rs. ${remainingBalance.toLocaleString()}`, 'error')
        return
      }

      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      console.log('Inserting payment record...')
      const paymentRecord = {
        school_id: user.school_id,
        challan_id: selectedChallan.id,
        student_id: selectedChallan.student_id,
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid: amountPaid,
        payment_method: paymentData.paymentMethod,
        transaction_id: paymentData.transactionId || null,
        cheque_number: paymentData.chequeNumber || null,
        bank_name: paymentData.bankName || null,
        received_by: user.id,
        receipt_number: receiptNumber,
        remarks: paymentData.remarks || null
      }
      console.log('Payment Record:', paymentRecord)

      const { error: paymentError } = await supabase
        .from('fee_payments')
        .insert([paymentRecord])

      if (paymentError) {
        console.error('Payment insertion error:', paymentError)
        throw paymentError
      }

      console.log('Payment record inserted successfully')

      // Calculate new paid amount and determine status
      const newPaidAmount = previouslyPaidAmount + amountPaid
      const newStatus = newPaidAmount >= challanTotalAmount ? 'paid' : 'pending'

      console.log('New Paid Amount:', newPaidAmount)
      console.log('New Status:', newStatus)

      console.log('Updating challan...')
      const { error: updateError } = await supabase
        .from('fee_challans')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedChallan.id)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)

      if (updateError) {
        console.error('Challan update error:', updateError)
        throw updateError
      }

      console.log('Challan updated successfully')

      const successMessage = newStatus === 'paid'
        ? 'Full payment collected successfully!'
        : `Partial payment of Rs. ${amountPaid.toLocaleString()} collected. Remaining: Rs. ${(challanTotalAmount - newPaidAmount).toLocaleString()}`

      showToast(successMessage, 'success')
      setShowPaymentModal(false)

      // Update the challan locally without reloading the entire page
      setChallans(prevChallans =>
        prevChallans.map(challan =>
          challan.id === selectedChallan.id
            ? {
                ...challan,
                status: newStatus,
                paid_amount: newPaidAmount,
                updated_at: new Date().toISOString()
              }
            : challan
        )
      )

      setSelectedChallan(null)
      console.log('Payment process completed')
    } catch (error) {
      console.error('Payment Error Details:', error)
      console.error('Error message:', error?.message)
      console.error('Error code:', error?.code)
      console.error('Error details:', error?.details)
      showToast(`Failed to process payment: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const filteredChallans = challans.filter(challan => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${challan.student?.first_name || ''} ${challan.student?.last_name || ''}`.toLowerCase()
    const matchesSearch = (
      fullName.includes(searchLower) ||
      (challan.student?.admission_number || '').toLowerCase().includes(searchLower) ||
      (challan.challan_number || '').toLowerCase().includes(searchLower) ||
      (challan.student?.class?.class_name || '').toLowerCase().includes(searchLower)
    )

    const matchesStatus = statusFilter === 'all' || challan.status === statusFilter
    const matchesClass = classFilter === 'all' || challan.student?.class?.id === classFilter

    return matchesSearch && matchesStatus && matchesClass
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

  const getFeePlanLabel = (plan) => {
    const labels = {
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'semi-annual': 'Semi-Annual',
      'annual': 'Annual'
    }
    return labels[plan] || plan
  }

  return (
    <div className="p-2 lg:p-4 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Print Modal */}
      {showPrintModal && printChallan && (
        <PrintChallan
          challan={printChallan}
          school={school}
          onClose={() => {
            setShowPrintModal(false)
            setPrintChallan(null)
          }}
        />
      )}

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Collect Fee</h1>
        <p className="text-gray-600 text-sm">Search students and collect pending fees</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.class_name}
              </option>
            ))}
          </select>

          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by challan number, student name, or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Download CSV Button */}
          <button
            onClick={downloadCSV}
            disabled={filteredChallans.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ml-auto"
            title="Download CSV"
          >
            <Download size={14} />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Student Name</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Admission No.</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Class</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Fee Plan</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Total Amount</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Already Paid</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Balance Due</th>
                <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-3 py-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedChallans.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-3 py-6 text-center text-gray-500">
                    No challans found
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan, index) => {
                  const totalAmount = parseFloat(challan.total_amount)
                  const paidAmount = parseFloat(challan.paid_amount || 0)
                  const balanceDue = totalAmount - paidAmount

                  return (
                    <tr
                      key={challan.id}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition ${challan.status === 'paid' ? 'bg-green-50' : ''}`}
                    >
                      <td className="px-3 py-2.5 text-gray-700 border border-gray-200">{startIndex + index + 1}</td>
                      <td className="px-3 py-2.5 text-gray-900 font-medium border border-gray-200">
                        {challan.student?.first_name} {challan.student?.last_name}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 border border-gray-200">{challan.student?.admission_number}</td>
                      <td className="px-3 py-2.5 text-gray-700 border border-gray-200">
                        {challan.student?.class?.class_name || 'N/A'}
                        {challan.student?.section?.section_name ? ` - ${challan.student.section.section_name}` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-center border border-gray-200">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                          {getFeePlanLabel(challan.student?.class?.fee_plan || 'monthly')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-900 font-bold border border-gray-200">
                        Rs. {totalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="text-green-600 font-semibold">
                          Rs. {paidAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className={`font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Rs. {balanceDue.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center border border-gray-200">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          challan.status === 'paid' ? 'bg-green-100 text-green-800' :
                          challan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center border border-gray-200">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewChallan(challan)}
                            className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 transition"
                            title="View & Print"
                          >
                            <Eye size={14} />
                          </button>
                          {(challan.status === 'pending' || challan.status === 'overdue' || paidAmount < totalAmount) && (
                            <button
                              onClick={() => handleSelectChallan(challan)}
                              className="bg-red-600 text-white px-2.5 py-1 rounded hover:bg-red-700 transition text-xs font-medium"
                            >
                              Collect
                            </button>
                          )}
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
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length} challans
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
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
                  className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition ${
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
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

      {/* Payment Modal */}
      {showPaymentModal && selectedChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowPaymentModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold">Collect Fee</h3>
                  <p className="text-blue-200 text-xs mt-0.5">
                    {selectedChallan.student?.first_name} {selectedChallan.student?.last_name} - {selectedChallan.student?.admission_number}
                  </p>
                  <p className="text-blue-300 text-xs">
                    Challan: {selectedChallan.challan_number}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white hover:bg-white/10 p-1.5 rounded-full transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {/* Challan Details */}
              <div className="mb-4">
                <h4 className="text-gray-800 font-bold mb-2 text-sm">Challan Details</h4>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Challan Number:</span>
                      <span className="font-semibold text-gray-800">{selectedChallan.challan_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee Plan:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">{getFeePlanLabel(selectedChallan.student?.class?.fee_plan || 'monthly')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        selectedChallan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedChallan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedChallan.status.charAt(0).toUpperCase() + selectedChallan.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 text-sm">Total Amount:</span>
                    <span className="font-bold text-gray-800">
                      Rs. {parseFloat(selectedChallan.total_amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 text-sm">Already Paid:</span>
                    <span className="font-semibold text-green-600">
                      Rs. {parseFloat(selectedChallan.paid_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="font-bold text-gray-800 text-sm">Balance Due:</span>
                    <span className="font-bold text-red-600 text-base">
                      Rs. {(parseFloat(selectedChallan.total_amount) - parseFloat(selectedChallan.paid_amount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Amount to Pay <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentData.amountPaid}
                    onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  />
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online Transfer</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                {paymentData.paymentMethod === 'cheque' && (
                  <>
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                        Cheque Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter cheque number"
                        value={paymentData.chequeNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, chequeNumber: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter bank name"
                        value={paymentData.bankName}
                        onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                      />
                    </div>
                  </>
                )}

                {(paymentData.paymentMethod === 'online' || paymentData.paymentMethod === 'bank_transfer') && (
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter transaction ID"
                      value={paymentData.transactionId}
                      onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                    />
                  </div>
                )}

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Remarks
                  </label>
                  <textarea
                    placeholder="Enter remarks (optional)"
                    value={paymentData.remarks}
                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <CheckCircle size={14} />
                  Collect Payment
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
export default function FeeCollectPage() {
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
      permissionKey="fee_collect_view"
      pageName="Fee Collection"
    >
      <FeeCollectContent />
    </PermissionGuard>
  )
}
