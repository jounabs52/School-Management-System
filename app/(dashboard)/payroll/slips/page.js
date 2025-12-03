'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Search, Printer, Info, Trash2, Download, Filter } from 'lucide-react'

export default function SalarySlipsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [salaryPayments, setSalaryPayments] = useState([])
  const [filteredPayments, setFilteredPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)

  // Notification states
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  // Modal states
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [generating, setGenerating] = useState(false)

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
  }, [salaryPayments, searchQuery, statusFilter, searchType])

  const loadSalaryPayments = async () => {
    console.log('=== Loading Salary Payments ===')
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
        .from('salary_payments')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            father_name,
            employee_number,
            designation,
            department,
            photo_url
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('payment_year', { ascending: false })
        .order('payment_month', { ascending: false })

      console.log('Query Result:', { data, error })
      console.log('Number of payments found:', data?.length || 0)

      if (error) throw error

      setSalaryPayments(data || [])
      console.log('Salary payments state updated')
    } catch (error) {
      console.error('Error loading salary payments:', error)
      showToast('Failed to load salary slips', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = [...salaryPayments]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()

      filtered = filtered.filter(payment => {
        if (searchType === 'staff_name') {
          return (
            payment.staff?.first_name?.toLowerCase().includes(query) ||
            payment.staff?.last_name?.toLowerCase().includes(query)
          )
        } else if (searchType === 'employee_number') {
          return payment.staff?.employee_number?.toLowerCase().includes(query)
        } else if (searchType === 'month') {
          return getMonthName(payment.payment_month).toLowerCase().includes(query)
        } else {
          // Search all fields
          return (
            payment.staff?.first_name?.toLowerCase().includes(query) ||
            payment.staff?.last_name?.toLowerCase().includes(query) ||
            payment.staff?.employee_number?.toLowerCase().includes(query) ||
            getMonthName(payment.payment_month).toLowerCase().includes(query) ||
            payment.payment_year.toString().includes(query)
          )
        }
      })
    }

    setFilteredPayments(filtered)
  }

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const calculateBalance = (payment) => {
    // Balance = Net Salary - (if any partial payment made)
    if (payment.status === 'paid') {
      return 0
    } else if (payment.status === 'pending') {
      return parseFloat(payment.net_salary || 0)
    } else if (payment.status === 'partial') {
      // For partial payments, you might track actual amount paid separately
      // For now, show full amount as balance
      return parseFloat(payment.net_salary || 0)
    }
    return parseFloat(payment.net_salary || 0)
  }

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment)
    setShowDetailsModal(true)
  }

  const handleGenerateSlip = async (payment) => {
    setGenerating(true)
    try {
      // Check if slip already exists
      const { data: existingSlip } = await supabase
        .from('salary_slips')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('payment_id', payment.id)
        .single()

      if (existingSlip) {
        showToast('Salary slip already generated for this payment', 'warning')
        // You can add logic here to open/download the existing slip
        return
      }

      // Generate slip data
      const slipData = {
        school_id: currentUser.school_id,
        staff_id: payment.staff_id,
        payment_id: payment.id,
        slip_number: `SLP-${payment.payment_year}-${String(payment.payment_month).padStart(2, '0')}-${payment.staff.employee_number}`,
        month: payment.payment_month,
        year: payment.payment_year,
        generated_by: currentUser.id,
        generated_date: new Date().toISOString().split('T')[0],
        // In a real app, you would generate a PDF and store the file_path
        file_path: null,
        status: 'generated'
      }

      const { error } = await supabase
        .from('salary_slips')
        .insert(slipData)

      if (error) throw error

      showToast('Salary slip generated successfully!', 'success')
      // In a real application, you would generate a PDF here and open it
      await loadSalaryPayments()
    } catch (error) {
      console.error('Error generating salary slip:', error)
      showToast('Failed to generate salary slip', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handlePrintSlip = (payment) => {
    // Generate a simple print-friendly view
    const printWindow = window.open('', '_blank')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Slip - ${payment.staff?.first_name} ${payment.staff?.last_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .info-section { margin-bottom: 30px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total-row { background-color: #e8f5e9; font-weight: bold; font-size: 1.1em; }
            .text-right { text-align: right; }
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SALARY SLIP</h1>
            <p>${getMonthName(payment.payment_month)} ${payment.payment_year}</p>
          </div>

          <div class="info-section">
            <h3>Employee Information</h3>
            <div class="info-row">
              <span><strong>Name:</strong> ${payment.staff?.first_name} ${payment.staff?.last_name}</span>
              <span><strong>Employee No:</strong> ${payment.staff?.employee_number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Designation:</strong> ${payment.staff?.designation || 'N/A'}</span>
              <span><strong>Department:</strong> ${payment.staff?.department || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Payment Date:</strong> ${new Date(payment.payment_date).toLocaleDateString('en-GB')}</span>
              <span><strong>Payment Method:</strong> ${payment.payment_method?.replace('_', ' ').toUpperCase()}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td class="text-right">${parseFloat(payment.basic_salary || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Total Allowances</td>
                <td class="text-right">${parseFloat(payment.total_allowances || 0).toLocaleString()}</td>
              </tr>
              <tr style="background-color: #e3f2fd;">
                <td><strong>Gross Salary</strong></td>
                <td class="text-right"><strong>${parseFloat(payment.gross_salary || 0).toLocaleString()}</strong></td>
              </tr>
              <tr>
                <td>Total Deductions</td>
                <td class="text-right">${parseFloat(payment.total_deductions || 0).toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td>NET SALARY</td>
                <td class="text-right">Rs ${parseFloat(payment.net_salary || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          ${payment.remarks ? `<div style="margin-top: 30px;"><strong>Remarks:</strong> ${payment.remarks}</div>` : ''}

          <div style="margin-top: 50px; text-align: center;">
            <button onclick="window.print()" style="background-color: #2196F3; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              Print Slip
            </button>
            <button onclick="window.close()" style="background-color: #757575; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    showToast('Salary slip opened in new window', 'success')
  }

  const confirmDelete = (payment) => {
    setPaymentToDelete(payment)
    setShowDeleteModal(true)
  }

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return

    setDeleting(true)
    try {
      // First delete any associated salary slips
      await supabase
        .from('salary_slips')
        .delete()
        .eq('payment_id', paymentToDelete.id)

      // Then delete the payment
      const { error } = await supabase
        .from('salary_payments')
        .delete()
        .eq('id', paymentToDelete.id)

      if (error) throw error

      showToast('Payment record deleted successfully', 'success')
      setShowDeleteModal(false)
      setPaymentToDelete(null)
      await loadSalaryPayments()
    } catch (error) {
      console.error('Error deleting payment:', error)
      showToast('Failed to delete payment record', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSearchType('all')
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Payroll - Salary Slips</h1>
        <p className="text-gray-600 mt-1">Manage and generate salary slips for staff members</p>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search Type Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Default Search</option>
              <option value="staff_name">Staff Name</option>
              <option value="employee_number">Employee Number</option>
              <option value="month">Month</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={filterPayments}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Search size={20} />
            Search
          </button>

          {/* Advanced Search Toggle */}
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Filter size={20} />
            Advance Search
          </button>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 mt-4">
          There are <span className="font-bold text-blue-600">{filteredPayments.length}</span> salary slips.
        </p>
      </div>

      {/* Salary Slips Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading salary slips...</div>
        ) : filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
                  <th className="px-4 py-3 text-left font-semibold text-sm">Sr.</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Staff Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Narration</th>
                  <th className="px-4 py-3 text-right font-semibold text-sm">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-sm">Balance</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => {
                  const balance = calculateBalance(payment)
                  const isPaid = payment.status === 'paid'

                  return (
                    <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {payment.staff?.first_name?.[0]}{payment.staff?.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {payment.staff?.first_name} {payment.staff?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payment.staff?.employee_number || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        Salary Slip ({getMonthName(payment.payment_month)} - {payment.payment_year})
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        Rs{parseFloat(payment.net_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        Rs{balance.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          payment.status === 'paid'
                            ? 'bg-green-500 text-white'
                            : payment.status === 'pending'
                            ? 'bg-orange-500 text-white'
                            : payment.status === 'partial'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-500 text-white'
                        }`}>
                          {payment.status === 'paid'
                            ? 'Full Paid'
                            : payment.status === 'pending'
                            ? 'Pending'
                            : payment.status === 'partial'
                            ? 'Partial'
                            : payment.status
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(payment)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Details"
                          >
                            <Info size={20} />
                          </button>
                          <button
                            onClick={() => handlePrintSlip(payment)}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="Print Slip"
                          >
                            <Printer size={20} />
                          </button>
                          {isPaid && (
                            <button
                              onClick={() => handleGenerateSlip(payment)}
                              disabled={generating}
                              className="text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                              title="Generate Slip"
                            >
                              <Download size={20} />
                            </button>
                          )}
                          <button
                            onClick={() => confirmDelete(payment)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No salary slips found. {searchQuery && 'Try adjusting your search criteria.'}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPayment && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowDetailsModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-xl font-bold">Salary Slip Details</h3>
                <p className="text-blue-100 text-sm">
                  {selectedPayment.staff?.first_name} {selectedPayment.staff?.last_name} - {getMonthName(selectedPayment.payment_month)} {selectedPayment.payment_year}
                </p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Staff Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Staff Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedPayment.staff?.first_name} {selectedPayment.staff?.last_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Employee No:</span>
                      <span className="ml-2 font-medium">{selectedPayment.staff?.employee_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Designation:</span>
                      <span className="ml-2 font-medium">{selectedPayment.staff?.designation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Department:</span>
                      <span className="ml-2 font-medium">{selectedPayment.staff?.department || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Salary Breakdown</h4>
                  <table className="w-full border-collapse border border-gray-300">
                    <tbody>
                      <tr className="bg-gray-100">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Basic Salary</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">Rs{parseFloat(selectedPayment.basic_salary || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-green-700">Total Allowances</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-green-700">+Rs{parseFloat(selectedPayment.total_allowances || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="bg-blue-50 font-semibold">
                        <td className="border border-gray-300 px-4 py-2">Gross Salary</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-blue-600">Rs{parseFloat(selectedPayment.gross_salary || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-red-700">Total Deductions</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-red-700">-Rs{parseFloat(selectedPayment.total_deductions || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="bg-green-100 font-bold text-lg">
                        <td className="border border-gray-300 px-4 py-3">Net Salary</td>
                        <td className="border border-gray-300 px-4 py-3 text-right text-green-700">Rs{parseFloat(selectedPayment.net_salary || 0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Payment Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Payment Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Payment Date:</span>
                      <span className="ml-2 font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="ml-2 font-medium capitalize">{selectedPayment.payment_method?.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="ml-2 font-medium">{selectedPayment.transaction_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 font-medium ${
                        selectedPayment.status === 'paid' ? 'text-green-600' :
                        selectedPayment.status === 'pending' ? 'text-orange-600' :
                        selectedPayment.status === 'partial' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {selectedPayment.status === 'paid' ? 'Full Paid' :
                         selectedPayment.status === 'pending' ? 'Pending' :
                         selectedPayment.status === 'partial' ? 'Partial' :
                         selectedPayment.status}
                      </span>
                    </div>
                  </div>
                  {selectedPayment.remarks && (
                    <div className="mt-3">
                      <span className="text-gray-600">Remarks:</span>
                      <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedPayment.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => handlePrintSlip(selectedPayment)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Print Slip
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && paymentToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete the salary payment for <span className="font-bold text-red-600">{paymentToDelete.staff?.first_name} {paymentToDelete.staff?.last_name}</span> ({getMonthName(paymentToDelete.payment_month)} {paymentToDelete.payment_year})? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setPaymentToDelete(null)
                    }}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePayment}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
