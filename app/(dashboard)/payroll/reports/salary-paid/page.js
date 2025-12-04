'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Printer, Download, Filter, ArrowLeft } from 'lucide-react'

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

  // Notification states
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const showToast = (message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 5000)
    } else if (type === 'error' || type === 'warning') {
      setError(message)
      setTimeout(() => setError(null), 5000)
    }
  }

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
    }
  }, [currentUser])

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
      showToast('Failed to load salary payment report', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = [...salaryPayments]

    // Filter by month and year
    filtered = filtered.filter(
      p => p.payment_month === selectedMonth && p.payment_year === selectedYear
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

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    showToast('Export functionality coming soon!', 'success')
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative print:hidden">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center gap-2 print:hidden">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 print:mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/payroll/reports')}
              className="print:hidden bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition-colors"
              title="Back to Reports"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 print:text-2xl">Salary Payment Report</h1>
              <p className="text-gray-600 text-sm mt-1">
                Report for {getMonthName(selectedMonth)} {selectedYear}
                {statusFilter !== 'all' && ` - Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Filter size={16} />
              Filters
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-4 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div className="bg-white rounded-lg shadow-md overflow-hidden print:shadow-none">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading salary payment report...</div>
        ) : filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-red-600 to-red-700 text-white print:bg-gray-800">
                  <th className="border border-red-800 px-4 py-3 text-left font-semibold text-sm">#</th>
                  <th className="border border-red-800 px-4 py-3 text-left font-semibold text-sm">Staff Name</th>
                  <th className="border border-red-800 px-4 py-3 text-left font-semibold text-sm">Computer No</th>
                  <th className="border border-red-800 px-4 py-3 text-left font-semibold text-sm">Narration</th>
                  <th className="border border-red-800 px-4 py-3 text-right font-semibold text-sm">Amount Paid</th>
                  <th className="border border-red-800 px-4 py-3 text-center font-semibold text-sm">Date</th>
                  <th className="border border-red-800 px-4 py-3 text-center font-semibold text-sm print:hidden">User</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => (
                  <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm font-medium">
                      {payment.staff?.first_name} {payment.staff?.last_name}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {payment.staff?.employee_number || 'N/A'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      Salary {payment.status === 'paid' ? 'Paid' : payment.status === 'pending' ? 'Pending' : 'Partial'} for {getMonthName(payment.payment_month)} {payment.payment_year}
                      {payment.remarks && ` - ${payment.remarks}`}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-right font-semibold">
                      {parseFloat(payment.net_salary || 0).toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-center">
                      {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm text-center print:hidden">
                      {payment.paid_by_user?.username || 'N/A'}
                    </td>
                  </tr>
                ))}
                {/* Grand Total Row */}
                <tr className="bg-red-100 font-bold">
                  <td colSpan="4" className="border border-gray-300 px-4 py-3 text-sm text-right">
                    Grand Total
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-right text-red-700">
                    {calculateGrandTotal().toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-center">---</td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-center print:hidden">---</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 border border-gray-300">
            <div className="mb-2">Grand Total</div>
            <div className="text-2xl font-bold">0</div>
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
              <p className="text-2xl font-bold text-blue-600">{filteredPayments.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">Rs {calculateGrandTotal().toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Salary</p>
              <p className="text-2xl font-bold text-purple-600">
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
