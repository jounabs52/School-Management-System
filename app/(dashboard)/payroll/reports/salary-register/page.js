'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Printer, Download, ArrowLeft } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'

export default function SalaryRegisterReport() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [salaryStructures, setSalaryStructures] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [schoolDetails, setSchoolDetails] = useState(null)

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
        .select('school_name, logo')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error
      setSchoolDetails(data)
    } catch (error) {
      console.error('Error fetching school details:', error)
    }
  }

  const loadSalaryStructures = async () => {
    console.log('=== Loading Salary Structures ===')
    console.log('Current User:', currentUser)
    console.log('School ID:', currentUser?.school_id)

    if (!currentUser?.school_id) {
      console.log('No school_id found, returning early')
      return
    }

    setLoading(true)
    try {
      console.log('Executing Supabase query...')
      const { data, error } = await supabase
        .from('salary_structures')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            employee_number,
            designation,
            department
          )
        `)
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      console.log('Query Result:', { data, error })
      console.log('Number of structures found:', data?.length || 0)

      if (error) throw error

      setSalaryStructures(data || [])
      console.log('Salary structures state updated')
    } catch (error) {
      console.error('Error loading salary structures:', error)
      console.error('Error details:', error.message, error.code)
      toast.error('Failed to load salary register')
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

    try {
      const pdf = new jsPDF('l', 'mm', 'a4') // Landscape for wide table
      const pageWidth = pdf.internal.pageSize.getWidth()
      let yPos = 20

      // Add school logo if available
      if (schoolDetails?.logo) {
        try {
          const imgWidth = 20
          const imgHeight = 20
          const imgX = (pageWidth - imgWidth) / 2
          pdf.addImage(schoolDetails.logo, 'PNG', imgX, yPos, imgWidth, imgHeight)
          yPos += 25
        } catch (error) {
          console.error('Error adding logo:', error)
          yPos += 5
        }
      }

      // School Name
      if (schoolDetails?.school_name) {
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(31, 78, 120)
        pdf.text(schoolDetails.school_name, pageWidth / 2, yPos, { align: 'center' })
        yPos += 8
      }

      // Title
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text('Staff Salary Register', pageWidth / 2, yPos, { align: 'center' })
      yPos += 6

      // Report period
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Report Criteria: ${getMonthName(selectedMonth)} ${selectedYear}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

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

      autoTable(pdf, {
        startY: yPos,
        head: [['#', 'Name', 'Role', 'Emp#', 'Prov', 'Basic', 'House', 'Medical', 'Trans', 'Other', 'Gross', 'Tax', 'Ded', 'Net']],
        body: [...tableData, totals],
        theme: 'grid',
        headStyles: {
          fillColor: [31, 78, 120],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7,
          cellPadding: 2
        },
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
          // Highlight totals row
          if (data.row.index === tableData.length && data.section === 'body') {
            data.cell.styles.fillColor = [220, 220, 220]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      })

      // Footer
      const finalY = pdf.lastAutoTable.finalY + 10
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'italic')
      pdf.setTextColor(150, 150, 150)
      pdf.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, finalY, { align: 'center' })

      // Download PDF
      const fileName = `Salary-Register-${getMonthName(selectedMonth)}-${selectedYear}.pdf`
      pdf.save(fileName)
      toast.success('Salary register downloaded successfully!')
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

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="p-1">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Header */}
      <div className="mb-2 print:mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
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
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Month/Year Filter */}
        <div className="flex gap-4 mb-2 print:hidden">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Salary Register Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden print:shadow-none">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading salary register...</div>
        ) : salaryStructures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-900 to-blue-800 text-white print:bg-gray-800">
                  <th className="px-2 py-2 text-left font-semibold text-xs">#</th>
                  <th className="px-2 py-2 text-left font-semibold text-xs">Name</th>
                  <th className="px-2 py-2 text-left font-semibold text-xs">Role</th>
                  <th className="px-2 py-2 text-center font-semibold text-xs">Comp</th>
                  <th className="px-2 py-2 text-center font-semibold text-xs">J.Date</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Prov Fund</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Basic</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">House</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Medical</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Transport</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Other Allow</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs bg-blue-700">Gross</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Tax</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Other Ded</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs bg-green-700">Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {salaryStructures.map((structure, index) => (
                  <tr key={structure.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-2 text-xs">{index + 1}</td>
                    <td className="px-2 py-2 text-xs font-medium">
                      {structure.staff?.first_name} {structure.staff?.last_name}
                    </td>
                    <td className="px-2 py-2 text-xs">{structure.staff?.designation || 'N/A'}</td>
                    <td className="px-2 py-2 text-xs text-center">{structure.staff?.employee_number || 'N/A'}</td>
                    <td className="px-2 py-2 text-xs text-center">
                      {structure.staff?.date_of_joining
                        ? new Date(structure.staff.date_of_joining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.provident_fund || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right font-medium">{parseFloat(structure.basic_salary || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.house_allowance || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.medical_allowance || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.transport_allowance || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.other_allowances || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right font-semibold bg-blue-50">{parseFloat(structure.gross_salary || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right text-red-600">{parseFloat(structure.tax_deduction || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right text-red-600">{parseFloat(structure.other_deductions || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right font-bold text-green-700 bg-green-50">{parseFloat(structure.net_salary || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan="6" className="px-2 py-2 text-xs text-right">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.basic_salary || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.house_allowance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.medical_allowance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.transport_allowance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_allowances || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right bg-blue-100">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.gross_salary || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right text-red-600">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.tax_deduction || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right text-red-600">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_deductions || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right text-green-700 bg-green-100">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No salary structures found for the selected period.
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 text-xs text-gray-600 text-center">
        <p>Print time: {new Date().toLocaleString('en-GB')}</p>
        <p className="mt-1">skoolzoom demo software</p>
      </div>
    </div>
  )
}
