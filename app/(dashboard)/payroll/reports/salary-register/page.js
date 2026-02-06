'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserFromCookie } from '@/lib/clientAuth'
import PermissionGuard from '@/components/PermissionGuard'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Printer, Download, ArrowLeft } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'
import {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  getLogoSize,
  applyPdfSettings,
  getAutoTableStyles
} from '@/lib/pdfSettings'
import { convertImageToBase64 } from '@/lib/pdfUtils'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardGrid, CardInfoGrid } from '@/components/DataCard'

function SalaryRegisterReportContent() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [salaryStructures, setSalaryStructures] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [schoolDetails, setSchoolDetails] = useState(null)

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

  useEffect(() => {
    const userData = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-data='))

    if (userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData.split('=')[1]))
        setCurrentUser(user)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (currentUser?.school_id) {
      loadSalaryStructures()
      fetchSchoolDetails()
    }
  }, [currentUser, selectedMonth, selectedYear])

  const fetchSchoolDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error

      // Convert logo URL to base64 if it exists
      let logoBase64 = data.logo_url
      if (data.logo_url && (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://'))) {
        console.log('🔄 Converting logo URL to base64...')
        logoBase64 = await convertImageToBase64(data.logo_url)
        console.log('✅ Logo converted to base64:', logoBase64 ? 'Success' : 'Failed')
      }

      // Map to expected format
      const schoolData = {
        school_name: data.name,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        logo: logoBase64,
        tagline: data.tagline,
        principal_name: data.principal_name,
        established_date: data.established_date
      }

      setSchoolDetails(schoolData)
    } catch (error) {
      console.error('Error fetching school details:', error)
    }
  }

  const loadSalaryStructures = async () => {
    console.log('=== Loading Salary Payments ===')
    console.log('Current User:', currentUser)
    console.log('School ID:', currentUser?.school_id)
    console.log('Selected Month:', selectedMonth)
    console.log('Selected Year:', selectedYear)

    if (!currentUser?.school_id) {
      console.log('No school_id found, returning early')
      return
    }

    setLoading(true)
    try {
      console.log('Executing Supabase query...')
      console.log('User ID:', currentUser.id)
      console.log('School ID:', currentUser.school_id)

      // Load salary payments for the selected month and year
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('salary_payments')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            employee_number,
            designation,
            department,
            joining_date
          )
        `)
        .eq('school_id', currentUser.school_id)
        .eq('payment_month', selectedMonth)
        .eq('payment_year', selectedYear)
        .order('payment_date', { ascending: false })

      console.log('Payments Query Result:', { dataLength: paymentsData?.length, error: paymentsError })

      if (paymentsError) {
        console.error('Supabase query error:', paymentsError)
        throw paymentsError
      }

      // Get staff IDs to fetch their current salary structures for detailed breakdown
      const staffIds = (paymentsData || []).map(p => p.staff_id)

      let structuresMap = {}
      if (staffIds.length > 0) {
        const { data: structuresData, error: structuresError } = await supabase
          .from('salary_structures')
          .select('*')
          .in('staff_id', staffIds)
          .eq('status', 'active')

        if (!structuresError && structuresData) {
          structuresData.forEach(s => {
            structuresMap[s.staff_id] = s
          })
        }
      }

      // Combine payment data with structure details for complete breakdown
      const mappedData = (paymentsData || []).map(payment => {
        const structure = structuresMap[payment.staff_id] || {}
        return {
          id: payment.id,
          staff_id: payment.staff_id,
          staff: payment.staff,
          basic_salary: payment.basic_salary,
          house_allowance: structure.house_allowance || 0,
          medical_allowance: structure.medical_allowance || 0,
          transport_allowance: structure.transport_allowance || 0,
          other_allowances: structure.other_allowances || 0,
          provident_fund: structure.provident_fund || 0,
          tax_deduction: structure.tax_deduction || 0,
          other_deductions: structure.other_deductions || 0,
          gross_salary: payment.gross_salary,
          net_salary: payment.net_salary,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          status: payment.status
        }
      })

      console.log('Salary payments for selected month:', mappedData?.length || 0)

      setSalaryStructures(mappedData || [])
      console.log('Salary payments state updated successfully')
    } catch (error) {
      console.error('Error loading salary payments:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', error.message, error.code)
      console.error('Error stack:', error.stack)
      toast.error(`Failed to load salary register: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const handlePrint = async () => {
    if (salaryStructures.length === 0) {
      toast.error('No data to print')
      return
    }

    if (!schoolDetails) {
      toast.error('School data not loaded. Please wait and try again.')
      return
    }

    try {
      const pdfSettings = getPdfSettings()

      // Create PDF with settings from Settings page
      const orientation = 'l' // Landscape for wide table
      const pageSize = pdfSettings.pageSize || 'a4'
      const pdf = new jsPDF(orientation, 'mm', pageSize)
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margins = getMarginValues(pdfSettings.margin)

      // Apply PDF settings (font, etc.)
      applyPdfSettings(pdf, pdfSettings)

      // Get colors from settings
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      const textColor = hexToRgb(pdfSettings.textColor)

      // Header Section with blue background box
      const headerHeight = 45
      let yPos = 10

      // Draw blue background rectangle
      pdf.setFillColor(...headerBgColor)
      pdf.rect(0, 0, pageWidth, headerHeight, 'F')

      // Add "Generated" date in top right corner
      if (pdfSettings.includeGeneratedDate) {
        const generatedDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(255, 255, 255)
        pdf.text(`Generated: ${generatedDate}`, pageWidth - 10, 8, { align: 'right' })
      }

      // Add logo in white box on the left if enabled
      if (pdfSettings.includeLogo && schoolDetails.logo) {
        try {
          const logoSize = getLogoSize(pdfSettings.logoSize)
          const logoBoxSize = logoSize.width + 8
          const logoBoxX = 15
          const logoBoxY = (headerHeight - logoBoxSize) / 2 + 5

          // Draw white box for logo
          pdf.setFillColor(255, 255, 255)
          pdf.roundedRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 3, 3, 'F')

          // Add logo centered in white box
          const logoX = logoBoxX + 4
          const logoY = logoBoxY + 4
          pdf.addImage(schoolDetails.logo, 'PNG', logoX, logoY, logoSize.width, logoSize.height)
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // Center section with school name and title
      yPos = 18

      // School name
      if (pdfSettings.includeSchoolName && (schoolDetails.school_name || schoolDetails.name)) {
        const schoolName = schoolDetails.school_name || schoolDetails.name
        pdf.setFontSize(pdfSettings.schoolNameFontSize || 18)
        pdf.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
        pdf.setTextColor(255, 255, 255)
        pdf.text(schoolName, pageWidth / 2, yPos, { align: 'center' })
        yPos += 8
      }

      // Title
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(255, 255, 255)
      pdf.text('STAFF SALARY REGISTER', pageWidth / 2, yPos, { align: 'center' })
      yPos += 6

      // Subtitle with month/year
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(255, 255, 255)
      pdf.text(`${getMonthName(selectedMonth)} ${selectedYear}`, pageWidth / 2, yPos, { align: 'center' })

      // Reset y position to start content after header
      yPos = headerHeight + 8

      // Summary information below header
      pdf.setTextColor(...textColor)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Total Staff: ${salaryStructures.length}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 8

      // Prepare table data
      const tableData = salaryStructures.map((structure, index) => [
        index + 1,
        `${structure.staff?.first_name} ${structure.staff?.last_name}`,
        structure.staff?.designation || 'N/A',
        structure.staff?.employee_number || 'N/A',
        parseFloat(structure.provident_fund || 0).toLocaleString(),
        parseFloat(structure.basic_salary || 0).toLocaleString(),
        parseFloat(structure.house_allowance || 0).toLocaleString(),
        parseFloat(structure.medical_allowance || 0).toLocaleString(),
        parseFloat(structure.transport_allowance || 0).toLocaleString(),
        parseFloat(structure.other_allowances || 0).toLocaleString(),
        parseFloat(structure.gross_salary || 0).toLocaleString(),
        parseFloat(structure.tax_deduction || 0).toLocaleString(),
        parseFloat(structure.other_deductions || 0).toLocaleString(),
        parseFloat(structure.net_salary || 0).toLocaleString()
      ])

      // Add totals row
      const totals = [
        '',
        'TOTAL',
        '',
        '',
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.provident_fund || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.basic_salary || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.house_allowance || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.medical_allowance || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.transport_allowance || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_allowances || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.gross_salary || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.tax_deduction || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_deductions || 0), 0).toLocaleString(),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0).toLocaleString()
      ]

      // Get autoTable styles from centralized settings
      const autoTableStyles = getAutoTableStyles(pdfSettings)

      autoTable(pdf, {
        startY: yPos,
        head: [['#', 'Name', 'Role', 'Emp#', 'Prov', 'Basic', 'House', 'Medical', 'Trans', 'Other', 'Gross', 'Tax', 'Ded', 'Net']],
        body: [...tableData, totals],
        ...autoTableStyles,
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 15, halign: 'right' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 18, halign: 'right' },
          7: { cellWidth: 18, halign: 'right' },
          8: { cellWidth: 18, halign: 'right' },
          9: { cellWidth: 18, halign: 'right' },
          10: { cellWidth: 20, halign: 'right', fillColor: [227, 242, 253] },
          11: { cellWidth: 15, halign: 'right' },
          12: { cellWidth: 15, halign: 'right' },
          13: { cellWidth: 22, halign: 'right', fillColor: [232, 245, 233], fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          // Highlight totals row with header color
          if (data.row.index === tableData.length && data.section === 'body') {
            data.cell.styles.fillColor = headerBgColor
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      })

      // Generate PDF blob for preview
      const fileName = `Salary-Register-${getMonthName(selectedMonth)}-${selectedYear}.pdf`
      const pdfBlob = pdf.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      toast.success('Salary register generated successfully. Preview opened.')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF: ' + error.message)
    }
  }

  const handleExport = () => {
    if (salaryStructures.length === 0) {
      toast.error('No data to export')
      return
    }

    try {
      // Prepare CSV content with proper escaping
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }

      const headers = ['#', 'Name', 'Role', 'Employee No', 'Prov Fund', 'Basic', 'House', 'Medical', 'Transport', 'Other Allow', 'Gross', 'Tax', 'Other Ded', 'Net Salary']

      const rows = salaryStructures.map((structure, index) => [
        index + 1,
        `${structure.staff?.first_name || ''} ${structure.staff?.last_name || ''}`.trim(),
        structure.staff?.designation || 'N/A',
        structure.staff?.employee_number || 'N/A',
        parseFloat(structure.provident_fund || 0),
        parseFloat(structure.basic_salary || 0),
        parseFloat(structure.house_allowance || 0),
        parseFloat(structure.medical_allowance || 0),
        parseFloat(structure.transport_allowance || 0),
        parseFloat(structure.other_allowances || 0),
        parseFloat(structure.gross_salary || 0),
        parseFloat(structure.tax_deduction || 0),
        parseFloat(structure.other_deductions || 0),
        parseFloat(structure.net_salary || 0)
      ])

      // Add totals row
      const totals = [
        '',
        'TOTAL',
        '',
        '',
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.provident_fund || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.basic_salary || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.house_allowance || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.medical_allowance || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.transport_allowance || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_allowances || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.gross_salary || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.tax_deduction || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_deductions || 0), 0),
        salaryStructures.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0)
      ]

      // Create CSV string
      let csvContent = headers.map(escapeCSV).join(',') + '\n'
      rows.forEach(row => {
        csvContent += row.map(escapeCSV).join(',') + '\n'
      })
      csvContent += totals.map(escapeCSV).join(',') + '\n'

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `Salary-Register-${getMonthName(selectedMonth)}-${selectedYear}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Salary register exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
        }}
      />

      {/* Header */}
      <div className="mb-2 print:mb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/payroll/reports')}
              className="print:hidden bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition-colors"
              title="Back to Reports"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-800 print:text-lg">Staff Salary Register</h1>
              <p className="text-gray-600 text-sm mt-1">
                Report Criteria [Month: {getMonthName(selectedMonth)} | Year: {selectedYear}]
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleExport}
              className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Month/Year Filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-2 print:hidden">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Salary Register Table */}
      <ResponsiveTableWrapper
        tableView={
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white print:bg-gray-800">
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold">#</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold">Name</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold">Role</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-center font-semibold">Comp</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-center font-semibold">J.Date</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Prov Fund</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Basic</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">House</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Medical</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Transport</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Other Allow</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Gross</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Tax</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Other Ded</th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              {salaryStructures.map((structure, index) => (
                <tr key={structure.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2">{index + 1}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 font-medium">
                    {structure.staff?.first_name} {structure.staff?.last_name}
                  </td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2">{structure.staff?.designation || 'N/A'}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-center">{structure.staff?.employee_number || 'N/A'}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-center">
                    {structure.staff?.joining_date
                      ? new Date(structure.staff.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A'}
                  </td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">{parseFloat(structure.provident_fund || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium">{parseFloat(structure.basic_salary || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">{parseFloat(structure.house_allowance || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">{parseFloat(structure.medical_allowance || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">{parseFloat(structure.transport_allowance || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">{parseFloat(structure.other_allowances || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold">{parseFloat(structure.gross_salary || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-red-600">{parseFloat(structure.tax_deduction || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-red-600">{parseFloat(structure.other_deductions || 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-bold text-green-700">{parseFloat(structure.net_salary || 0).toLocaleString()}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-gray-200 font-bold">
                <td colSpan="6" className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">TOTAL:</td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.basic_salary || 0), 0).toLocaleString()}
                </td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.house_allowance || 0), 0).toLocaleString()}
                </td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.medical_allowance || 0), 0).toLocaleString()}
                </td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.transport_allowance || 0), 0).toLocaleString()}
                </td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_allowances || 0), 0).toLocaleString()}
                </td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.gross_salary || 0), 0).toLocaleString()}
                </td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-red-600">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.tax_deduction || 0), 0).toLocaleString()}
                </td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-red-600">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_deductions || 0), 0).toLocaleString()}
                </td>
                <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-green-700">
                  {salaryStructures.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        }
        cardView={
          <CardGrid>
            {salaryStructures.map((structure, index) => (
              <DataCard key={structure.id}>
                <CardHeader
                  srNumber={index + 1}
                  name={`${structure.staff?.first_name} ${structure.staff?.last_name}`}
                  subtitle={structure.staff?.designation || 'N/A'}
                />
                <CardInfoGrid>
                  <CardRow label="Emp#" value={structure.staff?.employee_number || 'N/A'} />
                  <CardRow label="Prov" value={`Rs ${parseFloat(structure.provident_fund || 0).toLocaleString()}`} />
                  <CardRow label="Basic" value={`Rs ${parseFloat(structure.basic_salary || 0).toLocaleString()}`} className="font-medium" />
                  <CardRow label="Gross" value={`Rs ${parseFloat(structure.gross_salary || 0).toLocaleString()}`} className="font-semibold" />
                  <CardRow label="Tax" value={`Rs ${parseFloat(structure.tax_deduction || 0).toLocaleString()}`} className="text-red-600" />
                  <CardRow label="Net" value={`Rs ${parseFloat(structure.net_salary || 0).toLocaleString()}`} className="font-bold text-green-700" />
                </CardInfoGrid>
              </DataCard>
            ))}
          </CardGrid>
        }
        loading={loading}
        empty={salaryStructures.length === 0}
        emptyMessage="No salary structures found for the selected period"
      />

      {/* Print Footer */}
      <div className="hidden print:block mt-8 text-xs text-gray-600 text-center">
        <p>Print time: {new Date().toLocaleString('en-GB')}</p>
        <p className="mt-1">skoolzoom demo software</p>
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

export default function SalaryRegisterReport() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = getUserFromCookie()
    setCurrentUser(user)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="payroll_salary_register_view"
      pageName="Salary Register"
    >
      <SalaryRegisterReportContent />
    </PermissionGuard>
  )
}
