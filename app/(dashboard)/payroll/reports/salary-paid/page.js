'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Printer, Download, Filter, ArrowLeft } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'
import {
  addPDFHeader,
  addPDFFooter,
  addPDFWatermark,
  formatCurrency,
  convertImageToBase64,
  PDF_COLORS
} from '@/lib/pdfUtils'

export default function SalaryPaidReport() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [salaryPayments, setSalaryPayments] = useState([])
  const [filteredPayments, setFilteredPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
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
      loadSalaryPayments()
      fetchSchoolDetails()
    }
  }, [currentUser])

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

  useEffect(() => {
    filterPayments()
  }, [salaryPayments, selectedMonth, selectedYear, statusFilter])

  const loadSalaryPayments = async () => {
    if (!currentUser?.school_id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('salary_payments')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            employee_number,
            designation,
            department
          ),
          paid_by_user:paid_by (
            id,
            username
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('payment_year', { ascending: false })
        .order('payment_month', { ascending: false })
        .order('payment_date', { ascending: false })

      if (error) throw error

      setSalaryPayments(data || [])
    } catch (error) {
      console.error('Error loading salary payments:', error)
      toast.error('Failed to load salary payment report')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = [...salaryPayments]

    // Filter by month and year
    filtered = filtered.filter(
      p => parseInt(p.payment_month) === parseInt(selectedMonth) &&
           parseInt(p.payment_year) === parseInt(selectedYear)
    )

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    setFilteredPayments(filtered)
  }

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const calculateGrandTotal = () => {
    return filteredPayments.reduce((sum, payment) => sum + parseFloat(payment.net_salary || 0), 0)
  }

  const handlePrint = async () => {
    if (filteredPayments.length === 0) {
      toast.error('No data to print')
      return
    }

    if (!schoolDetails) {
      toast.error('School data not loaded. Please wait and try again.')
      return
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()

      // Add professional header
      let subtitle = `${getMonthName(selectedMonth)} ${selectedYear}`
      if (statusFilter !== 'all') {
        subtitle += ` - ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`
      }

      const headerOptions = {
        subtitle: subtitle,
        info: `Total Payments: ${filteredPayments.length}`
      }
      let yPos = addPDFHeader(pdf, schoolDetails, 'SALARY PAYMENT REPORT', headerOptions)

      // Add watermark
      addPDFWatermark(pdf, schoolDetails, 'CONFIDENTIAL')

      yPos += 5

      // Prepare table data
      const tableData = filteredPayments.map((payment, index) => [
        index + 1,
        `${payment.staff?.first_name} ${payment.staff?.last_name}`,
        payment.staff?.employee_number || 'N/A',
        `Salary ${payment.status === 'paid' ? 'Paid' : payment.status === 'pending' ? 'Pending' : 'Partial'} for ${getMonthName(payment.payment_month)} ${payment.payment_year}`,
        parseFloat(payment.net_salary || 0).toLocaleString(),
        new Date(payment.payment_date).toLocaleDateString('en-GB')
      ])

      // Add grand total row
      const grandTotal = calculateGrandTotal()
      const totals = [
        '',
        '',
        '',
        'Grand Total',
        grandTotal.toLocaleString(),
        '---'
      ]

      autoTable(pdf, {
        startY: yPos,
        head: [['#', 'Staff Name', 'Emp#', 'Narration', 'Amount Paid', 'Date']],
        body: [...tableData, totals],
        theme: 'grid',
        headStyles: {
          fillColor: PDF_COLORS.headerBg,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 50 },
          4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 25, halign: 'center' }
        },
        didParseCell: function(data) {
          // Highlight totals row
          if (data.row.index === tableData.length && data.section === 'body') {
            data.cell.styles.fillColor = [254, 202, 202]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.textColor = [153, 27, 27]
          }
        }
      })

      // Add professional footer
      addPDFFooter(pdf, 1, 1)

      // Download PDF
      const fileName = `Salary-Payment-Report-${getMonthName(selectedMonth)}-${selectedYear}.pdf`
      pdf.save(fileName)
      toast.success('Salary payment report downloaded successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF: ' + error.message)
    }
  }

  const handleExport = () => {
    if (filteredPayments.length === 0) {
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

      const headers = ['#', 'Staff Name', 'Employee No', 'Narration', 'Amount Paid', 'Date', 'Status', 'Payment Method']

      const rows = filteredPayments.map((payment, index) => [
        index + 1,
        `${payment.staff?.first_name || ''} ${payment.staff?.last_name || ''}`.trim(),
        payment.staff?.employee_number || 'N/A',
        `Salary ${payment.status} for ${getMonthName(payment.payment_month)} ${payment.payment_year}`,
        parseFloat(payment.net_salary || 0),
        new Date(payment.payment_date).toLocaleDateString('en-GB'),
        payment.status,
        payment.payment_method || 'N/A'
      ])

      // Add grand total row
      const grandTotal = calculateGrandTotal()
      const totals = [
        '',
        '',
        '',
        'Grand Total',
        grandTotal,
        '---',
        '---',
        '---'
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
      link.setAttribute('download', `Salary-Payment-Report-${getMonthName(selectedMonth)}-${selectedYear}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Salary payment report exported successfully!')
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
              <h1 className="text-base font-bold text-gray-800 print:text-lg">Salary Payment Report</h1>
              <p className="text-gray-600 text-sm mt-1">
                Report for {getMonthName(selectedMonth)} {selectedYear}
                {statusFilter !== 'all' && ` - Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Filter size={16} />
              Filters
            </button>
            <button
              onClick={handlePrint}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleExport}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm p-3 mb-2 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Salary Payments Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden print:shadow-none">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading salary payment report...</div>
        ) : filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white print:bg-gray-800">
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">#</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Staff Name</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Computer No</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Narration</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-right font-semibold">Amount Paid</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Date</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold print:hidden">User</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => (
                  <tr key={payment.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                    <td className="border border-gray-200 px-3 py-2.5">{index + 1}</td>
                    <td className="border border-gray-200 px-3 py-2.5 font-medium">
                      {payment.staff?.first_name} {payment.staff?.last_name}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5">
                      {payment.staff?.employee_number || 'N/A'}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5">
                      Salary {payment.status === 'paid' ? 'Paid' : payment.status === 'pending' ? 'Pending' : 'Partial'} for {getMonthName(payment.payment_month)} {payment.payment_year}
                      {payment.remarks && ` - ${payment.remarks}`}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-right font-semibold">
                      {parseFloat(payment.net_salary || 0).toLocaleString()}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-center">
                      {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-center print:hidden">
                      {payment.paid_by_user?.username || 'N/A'}
                    </td>
                  </tr>
                ))}
                {/* Grand Total Row */}
                <tr className="bg-red-100 font-bold">
                  <td colSpan="4" className="border border-gray-200 px-3 py-2.5 text-right">
                    Grand Total
                  </td>
                  <td className="border border-gray-200 px-3 py-2.5 text-right text-red-700">
                    {calculateGrandTotal().toLocaleString()}
                  </td>
                  <td className="border border-gray-200 px-3 py-2.5 text-center">---</td>
                  <td className="border border-gray-200 px-3 py-2.5 text-center print:hidden">---</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 border border-gray-300">
            <div className="mb-2">Grand Total</div>
            <div className="text-lg font-bold">0</div>
            <div className="mt-4 text-sm">No salary payments found for the selected period.</div>
          </div>
        )}
      </div>

      {/* Summary Card */}
      {filteredPayments.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Payments</p>
              <p className="text-lg font-bold text-blue-600">{filteredPayments.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Amount Paid</p>
              <p className="text-lg font-bold text-green-600">Rs {calculateGrandTotal().toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Salary</p>
              <p className="text-lg font-bold text-purple-600">
                Rs {filteredPayments.length > 0 ? (calculateGrandTotal() / filteredPayments.length).toFixed(0).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-8 text-xs text-gray-600">
        <p className="text-right">SKZ-F3004</p>
        <p className="text-right">Print time: {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}</p>
        <p className="text-right mt-2">skoolzoom demo software</p>
      </div>
    </div>
  )
}
