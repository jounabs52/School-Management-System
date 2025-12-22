'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Eye, Printer, Search, Calendar, DollarSign, CheckCircle, XCircle, AlertCircle, X, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getPdfSettings, hexToRgb, getMarginValues, formatCurrency, generateChallanNumber, getMonthName, getFeePeriodLabel, calculateDueDate, getLogoSize, applyPdfSettings } from '@/lib/pdfSettings'

export default function FeeChallans({ user, classes, schoolData, showToast }) {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const [generateForm, setGenerateForm] = useState({
    classId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    dueInDays: 15,
    generateFor: 'class' // 'class' or 'individual'
  })

  useEffect(() => {
    if (user && user.school_id) {
      fetchChallans()
    }
  }, [user, statusFilter, classFilter])

  const fetchChallans = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('fee_challans')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            admission_number,
            current_class_id,
            base_fee,
            discount_percent,
            final_fee,
            fee_plan
          ),
          classes:students(current_class_id(id, class_name))
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      if (classFilter) {
        query = query.eq('students.current_class_id', classFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching challans:', error)
        showToast('Error loading challans', 'error')
      } else {
        setChallans(data || [])
      }
    } catch (error) {
      console.error('Error fetching challans:', error)
      showToast('Error loading challans', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateChallan = async () => {
    try {
      if (!generateForm.classId) {
        showToast('Please select a class', 'error')
        return
      }

      setLoading(true)

      // Fetch students for the selected class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('current_class_id', generateForm.classId)
        .eq('status', 'active')

      if (studentsError) {
        console.error('Error fetching students:', error)
        showToast('Error fetching students', 'error')
        return
      }

      if (!students || students.length === 0) {
        showToast('No active students found in this class', 'error')
        return
      }

      // Generate challans for all students
      const issueDate = new Date()
      const dueDate = calculateDueDate(issueDate, parseInt(generateForm.dueInDays))

      const challansToInsert = students.map(student => {
        const periodLabel = getFeePeriodLabel(
          student.fee_plan || 'monthly',
          parseInt(generateForm.month),
          parseInt(generateForm.year)
        )

        return {
          school_id: user.school_id,
          student_id: student.id,
          challan_number: generateChallanNumber(schoolData.code || 'SCH'),
          fee_month: getMonthName(parseInt(generateForm.month)),
          fee_year: generateForm.year.toString(),
          issue_date: issueDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          total_amount: student.final_fee || student.base_fee || 0,
          paid_amount: 0,
          fee_plan: student.fee_plan || 'monthly',
          period_label: periodLabel,
          status: 'pending',
          created_by: user.id
        }
      })

      const { data, error } = await supabase
        .from('fee_challans')
        .insert(challansToInsert)
        .select()

      if (error) {
        console.error('Error creating challans:', error)
        showToast('Error generating challans', 'error')
      } else {
        showToast(`Successfully generated ${data.length} challans`, 'success')
        setShowGenerateModal(false)
        fetchChallans()

        // Generate PDFs for all challans
        if (generateForm.generateFor === 'class') {
          await generateClassPDF(data)
        }
      }
    } catch (error) {
      console.error('Error generating challans:', error)
      showToast('Error generating challans', 'error')
    } finally {
      setLoading(false)
    }
  }

  const generateClassPDF = async (challansData) => {
    try {
      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default
      const { default: autoTable } = await import('jspdf-autotable')

      const pdfSettings = getPdfSettings()

      // Create PDF with settings from PAGE SETTINGS
      const doc = new jsPDF({
        orientation: pdfSettings.orientation || 'portrait',
        unit: 'mm',
        format: pdfSettings.pageSize?.toLowerCase() || 'a4'
      })

      // Get page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Get margin values from settings
      const margins = getMarginValues(pdfSettings.margin)
      const leftMargin = margins.left
      const rightMargin = pageWidth - margins.right

      for (let i = 0; i < challansData.length; i++) {
        const challan = challansData[i]

        // Fetch student and challan items data in parallel
        const [studentResult, itemsResult] = await Promise.all([
          supabase
            .from('students')
            .select('*, classes(class_name)')
            .eq('id', challan.student_id)
            .single(),
          supabase
            .from('fee_challan_items')
            .select('description, amount, fee_types(fee_name)')
            .eq('challan_id', challan.id)
        ])

        const student = studentResult.data
        const items = itemsResult.data || []
        const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
        const className = student?.classes?.class_name || 'N/A'

        if (i > 0) doc.addPage()

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
                  const currentLogoSize = getLogoSize(pdfSettings.logoSize)
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

        // School name and subtitle in white
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(schoolData.name || 'School Name', pageWidth / 2, yPos + 5, { align: 'center' })

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('Student FEE CHALLAN', pageWidth / 2, yPos + 12, { align: 'center' })

        // Generated date - position based on logo position to avoid overlap
        doc.setFontSize(7)
        doc.setTextColor(220, 220, 220)
        const now = new Date()
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const genDate = `Generated: ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`

        // If logo is on right, put date on left to avoid overlap
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

        // Student info grid with labels and values
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
        const dueDayName = days[new Date(challan.due_date).getDay()]
        doc.text(formattedDueDate + ' ' + dueDayName, xPos + labelWidth, yPos)

        xPos = pageWidth / 2 + 5
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Fee Type:', xPos, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('School Fee (Monthly)', xPos + labelWidth, yPos)

        yPos += 12

        // FEE BREAKDOWN Section
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('FEE BREAKDOWN', leftMargin, yPos)
        yPos += 2

        // Fee table with Particulars and Amount columns
        if (items && items.length > 0) {
          const tableData = items.map(item => [
            item.fee_types?.fee_name || item.description,
            formatCurrency(item.amount)
          ])

          autoTable(doc, {
            startY: yPos,
            head: [['Particulars', 'Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: {
              fillColor: hexToRgb(pdfSettings.tableHeaderColor),
              textColor: [255, 255, 255],
              fontSize: 9,
              fontStyle: 'bold',
              halign: 'left',
              cellPadding: { top: 3, bottom: 3, left: 5, right: 5 }
            },
            bodyStyles: {
              fontSize: 9,
              cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
              textColor: [0, 0, 0]
            },
            columnStyles: {
              0: { cellWidth: 130, halign: 'left', fontStyle: 'normal' },
              1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: leftMargin, right: leftMargin },
            didParseCell: function(data) {
              data.cell.styles.lineColor = [200, 200, 200]
              data.cell.styles.lineWidth = 0.1
            },
            didDrawCell: function(data) {
              if (data.column.index === 1 && data.section === 'body') {
                const amountText = data.cell.raw || ''
                if (amountText.includes('-') || amountText.toLowerCase().includes('discount')) {
                  doc.setTextColor(220, 38, 38)
                }
              }
            }
          })

          yPos = doc.lastAutoTable.finalY + 3
        }

        // TOTAL FEE PAYABLE
        doc.setFillColor(240, 253, 244)
        doc.rect(leftMargin, yPos, pageWidth - leftMargin - margins.right, 10, 'F')
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.rect(leftMargin, yPos, pageWidth - leftMargin - margins.right, 10)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('TOTAL FEE PAYABLE', leftMargin + 5, yPos + 6.5)

        doc.setTextColor(22, 163, 74)
        doc.text(formatCurrency(challan.total_amount), rightMargin - 5, yPos + 6.5, { align: 'right' })

        yPos += 15

        // Amount in words
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text('Amount in Words:', margins.left, yPos)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text('Two Thousand Seven Hundred Only', margins.left, yPos + 5)

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

        // Horizontal line above footer text
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3)

        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.setFont('helvetica', 'normal')
        doc.text(schoolData.name || 'School Name', pageWidth / 2, yPos, { align: 'center' })
      }

      // Open PDF in new window instead of downloading
      window.open(doc.output('bloburl'), '_blank')
      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Error generating PDF', 'error')
    }
  }

  const handleViewChallan = async (challan) => {
    try {
      const jsPDF = (await import('jspdf')).default
      const { default: autoTable } = await import('jspdf-autotable')

      // Fetch challan items and school data
      const [itemsResult, schoolResult] = await Promise.all([
        supabase
          .from('fee_challan_items')
          .select('description, amount, fee_types(fee_name)')
          .eq('challan_id', challan.id),
        supabase
          .from('schools')
          .select('name, address, phone, email, logo_url, code')
          .eq('id', user?.school_id)
          .single()
      ])

      const items = itemsResult.data || []
      const schoolData = schoolResult.data || {}

      const student = challan.students
      const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
      const className = student?.classes?.class_name || 'N/A'

      // Get PDF settings
      const pdfSettings = getPdfSettings()

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
                const currentLogoSize = getLogoSize(pdfSettings.logoSize)
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

      // School name and subtitle in white
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(schoolData.name || 'School Name', pageWidth / 2, yPos + 5, { align: 'center' })

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Student FEE CHALLAN', pageWidth / 2, yPos + 12, { align: 'center' })

      // Generated date - position based on logo position to avoid overlap
      doc.setFontSize(7)
      doc.setTextColor(220, 220, 220)
      const now = new Date()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const genDate = `Generated: ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`

      // If logo is on right, put date on left to avoid overlap
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

      // Student info grid with labels and values
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
      const dueDayName = days[new Date(challan.due_date).getDay()]
      doc.text(formattedDueDate + ' ' + dueDayName, xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('Fee Type:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('School Fee (Monthly)', xPos + labelWidth, yPos)

      yPos += 12

      // FEE BREAKDOWN Section
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('FEE BREAKDOWN', leftMargin, yPos)
      yPos += 2

      // Fee table with Particulars and Amount columns
      if (items && items.length > 0) {
        const tableData = items.map(item => [
          item.fee_types?.fee_name || item.description,
          formatCurrency(item.amount)
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Particulars', 'Amount']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: hexToRgb(pdfSettings.tableHeaderColor),
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: { top: 3, bottom: 3, left: 5, right: 5 }
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
            textColor: [0, 0, 0]
          },
          columnStyles: {
            0: { cellWidth: 130, halign: 'left', fontStyle: 'normal' },
            1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: leftMargin, right: leftMargin },
          didParseCell: function(data) {
            data.cell.styles.lineColor = [200, 200, 200]
            data.cell.styles.lineWidth = 0.1
          },
          didDrawCell: function(data) {
            if (data.column.index === 1 && data.section === 'body') {
              const amountText = data.cell.raw || ''
              if (amountText.includes('-') || amountText.toLowerCase().includes('discount')) {
                doc.setTextColor(220, 38, 38)
              }
            }
          }
        })

        yPos = doc.lastAutoTable.finalY + 3
      }

      // TOTAL FEE PAYABLE
      doc.setFillColor(240, 253, 244)
      doc.rect(leftMargin, yPos, pageWidth - leftMargin - margins.right, 10, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.1)
      doc.rect(leftMargin, yPos, pageWidth - leftMargin - margins.right, 10)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('TOTAL FEE PAYABLE', leftMargin + 5, yPos + 6.5)

      doc.setTextColor(22, 163, 74)
      doc.text(formatCurrency(challan.total_amount), rightMargin - 5, yPos + 6.5, { align: 'right' })

      yPos += 15

      // Amount in words
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('Amount in Words:', margins.left, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text('Two Thousand Seven Hundred Only', margins.left, yPos + 5)

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

      // Horizontal line above footer text
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3)

      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text(schoolData.name || 'Superior College Bhakkar', pageWidth / 2, yPos, { align: 'center' })

      // Download PDF directly
      doc.save(`Fee_Challan_${challan.challan_number}.pdf`)
      showToast('PDF downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to generate PDF', 'error')
    }
  }

  const handlePrintChallan = async (challan) => {
    if (challan.status !== 'paid') {
      showToast('Can only print paid challans', 'error')
      return
    }

    await handleViewChallan(challan)
  }

  const handleStatusChange = async (challanId, newStatus) => {
    try {
      const { error } = await supabase
        .from('fee_challans')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', challanId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error updating status:', error)
        showToast('Error updating status', 'error')
      } else {
        showToast('Status updated successfully!', 'success')
        fetchChallans()
      }
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Error updating status', 'error')
    }
  }

  // Filter and paginate challans
  const filteredChallans = challans.filter(challan => {
    const studentName = `${challan.students?.first_name} ${challan.students?.last_name || ''}`.toLowerCase()
    const challanNumber = challan.challan_number.toLowerCase()
    const search = searchTerm.toLowerCase()

    return studentName.includes(search) || challanNumber.includes(search)
  })

  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const currentChallans = filteredChallans.slice(startIndex, startIndex + rowsPerPage)

  return (
    <div className="space-y-3">
      {/* Header Actions */}
      <div className="bg-white rounded-lg shadow p-2">
        <div className="flex flex-col md:flex-row gap-1.5 items-center">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-2.5 py-1.5 rounded font-medium transition flex items-center gap-1 text-xs whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
          >
            <Plus size={12} />
            Generate Challans
          </button>

          <div className="md:w-32">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="md:w-32">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 relative w-full">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              placeholder="Search by student name or challan number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Challans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Challan No</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Student Name</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Class</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Period</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Amount</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Due Date</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-3 py-6 text-center text-gray-500">
                    Loading challans...
                  </td>
                </tr>
              ) : currentChallans.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-3 py-6 text-center text-gray-500">
                    No challans found
                  </td>
                </tr>
              ) : (
                currentChallans.map((challan, index) => {
                  const studentName = `${challan.students?.first_name} ${challan.students?.last_name || ''}`.trim()
                  const isDue = new Date(challan.due_date) < new Date() && challan.status === 'pending'

                  return (
                    <tr
                      key={challan.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-3 py-2.5 border border-gray-200">{startIndex + index + 1}</td>
                      <td className="px-3 py-2.5 border border-gray-200 font-mono text-xs">
                        {challan.challan_number}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="text-blue-600 font-medium">{studentName}</span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {challan.students?.classes?.class_name || '-'}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {challan.period_label || `${challan.fee_month} ${challan.fee_year}`}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200 font-semibold text-green-600">
                        {formatCurrency(challan.total_amount)}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className={isDue ? 'text-red-600 font-semibold' : ''}>
                          {new Date(challan.due_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <select
                          value={challan.status}
                          onChange={(e) => handleStatusChange(challan.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-semibold border ${
                            challan.status === 'paid'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : challan.status === 'overdue'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : challan.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-800 border-gray-300'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewChallan(challan)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                            title="View Challan"
                          >
                            <Eye size={16} />
                          </button>
                          {challan.status === 'paid' && (
                            <button
                              onClick={() => handlePrintChallan(challan)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded transition"
                              title="Print Challan"
                            >
                              <Printer size={16} />
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
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-xs text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredChallans.length)} of {filteredChallans.length} challans
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 py-1 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Challan Modal */}
      {showGenerateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowGenerateModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-[10000] w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Generate Fee Challans</h3>
                  <p className="text-blue-200 text-xs mt-1">Create challans for students</p>
                </div>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={generateForm.classId}
                  onChange={(e) => setGenerateForm({ ...generateForm, classId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Choose a class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    value={generateForm.month}
                    onChange={(e) => setGenerateForm({ ...generateForm, month: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={generateForm.year}
                    onChange={(e) => setGenerateForm({ ...generateForm, year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due in Days
                </label>
                <input
                  type="number"
                  value={generateForm.dueInDays}
                  onChange={(e) => setGenerateForm({ ...generateForm, dueInDays: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  min="1"
                  max="90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generate For
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="class"
                      checked={generateForm.generateFor === 'class'}
                      onChange={(e) => setGenerateForm({ ...generateForm, generateFor: e.target.value })}
                      className="mr-2"
                    />
                    <span className="text-sm">Entire Class</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="individual"
                      checked={generateForm.generateFor === 'individual'}
                      onChange={(e) => setGenerateForm({ ...generateForm, generateFor: e.target.value })}
                      className="mr-2"
                    />
                    <span className="text-sm">Individual PDFs</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateChallan}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
