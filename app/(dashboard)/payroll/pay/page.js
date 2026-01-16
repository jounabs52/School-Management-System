'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

function StaffPayrollPageContent() {
  const [currentUser, setCurrentUser] = useState(null)
  const [searchEmployeeNumber, setSearchEmployeeNumber] = useState('')
  const [searchGeneralData, setSearchGeneralData] = useState('')
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [salaryStructure, setSalaryStructure] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [activeTab, setActiveTab] = useState('pay-salary')
  const [staffPaymentStatus, setStaffPaymentStatus] = useState({})

  // Payment form state
  const [paymentMonth, setPaymentMonth] = useState(new Date().getMonth() + 1)
  const [paymentYear, setPaymentYear] = useState(new Date().getFullYear())
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paymentStatus, setPaymentStatus] = useState('paid')
  const [transactionId, setTransactionId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Modals
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false)
  const [showSalaryStructureModal, setShowSalaryStructureModal] = useState(false)
  const [showNoSalaryStructureModal, setShowNoSalaryStructureModal] = useState(false)
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false)
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
      loadStaffList()
    }
  }, [currentUser, searchEmployeeNumber, searchGeneralData])

  // Apply blur effect to sidebar when modals are open
  useEffect(() => {
    const anyModalOpen = showPaymentHistoryModal || showSalaryStructureModal || showNoSalaryStructureModal || showConfirmPaymentModal || showDeletePaymentModal

    if (anyModalOpen) {
      document.body.style.overflow = 'hidden'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = 'blur(4px)'
        sidebar.style.pointerEvents = 'none'
      }
    } else {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }

    return () => {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }
  }, [showPaymentHistoryModal, showSalaryStructureModal, showNoSalaryStructureModal, showConfirmPaymentModal, showDeletePaymentModal])

  const loadStaffList = async () => {
    if (!currentUser?.school_id) return

    setLoading(true)
    try {
      let query = supabase
        .from('staff')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('first_name')

      if (searchEmployeeNumber) {
        query = query.eq('employee_number', searchEmployeeNumber)
      }

      if (searchGeneralData) {
        query = query.or(`first_name.ilike.%${searchGeneralData}%,last_name.ilike.%${searchGeneralData}%,employee_number.ilike.%${searchGeneralData}%,father_name.ilike.%${searchGeneralData}%`)
      }

      const { data, error } = await query

      if (error) throw error

      setStaffList(data || [])

      // Check payment status for current month for all staff members
      if (data && data.length > 0) {
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()

        const { data: payments } = await supabase
          .from('salary_payments')
          .select('staff_id, status')
          .eq('school_id', currentUser.school_id)
          .eq('payment_month', currentMonth)
          .eq('payment_year', currentYear)
          .eq('status', 'paid')

        const paymentStatusMap = {}
        if (payments) {
          payments.forEach(p => {
            paymentStatusMap[p.staff_id] = true
          })
        }
        setStaffPaymentStatus(paymentStatusMap)
      }
    } catch (error) {
      console.error('Error loading staff:', error)
      toast.error('Failed to load staff list')
    } finally {
      setLoading(false)
    }
  }

  const loadStaffDetails = async (staff) => {
    setSelectedStaff(staff)
    setActiveTab('pay-salary')

    // Load salary structure
    await loadSalaryStructure(staff.id)

    // Load payment history
    await loadPaymentHistory(staff.id)
  }

  const loadSalaryStructure = async (staffId) => {
    try {
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .eq('staff_id', staffId)
        .eq('status', 'active')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      setSalaryStructure(data)
    } catch (error) {
      console.error('Error loading salary structure:', error)
      setSalaryStructure(null)
    }
  }

  const loadPaymentHistory = async (staffId) => {
    try {
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .eq('staff_id', staffId)
        .order('payment_year', { ascending: false })
        .order('payment_month', { ascending: false })

      if (error) throw error

      setPaymentHistory(data || [])
    } catch (error) {
      console.error('Error loading payment history:', error)
      setPaymentHistory([])
    }
  }

  const checkAndShowPaymentConfirmation = () => {
    if (!selectedStaff || !salaryStructure) {
      toast.error('Please ensure staff has a salary structure defined')
      return
    }

    // Check if payment already exists for this month/year
    const existingPayment = paymentHistory.find(
      p => p.payment_month === paymentMonth && p.payment_year === paymentYear
    )

    if (existingPayment && existingPayment.status === 'paid') {
      setShowConfirmPaymentModal(true)
    } else {
      handlePaySalary()
    }
  }

  const handlePaySalary = async () => {
    setShowConfirmPaymentModal(false)
    setProcessingPayment(true)
    try {
      // Insert payment record and get the ID back
      const { data: paymentData, error: paymentError } = await supabase
        .from('salary_payments')
        .insert({
          school_id: currentUser.school_id,
          staff_id: selectedStaff.id,
          payment_month: paymentMonth,
          payment_year: paymentYear,
          basic_salary: salaryStructure.basic_salary,
          total_allowances:
            (salaryStructure.house_allowance || 0) +
            (salaryStructure.medical_allowance || 0) +
            (salaryStructure.transport_allowance || 0) +
            (salaryStructure.other_allowances || 0),
          total_deductions:
            (salaryStructure.provident_fund || 0) +
            (salaryStructure.tax_deduction || 0) +
            (salaryStructure.other_deductions || 0),
          gross_salary: salaryStructure.gross_salary,
          net_salary: salaryStructure.net_salary,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          transaction_id: transactionId || null,
          paid_by: currentUser.id,
          status: paymentStatus,
          remarks: remarks || `Salary ${paymentStatus === 'paid' ? 'paid' : 'pending'} for ${getMonthName(paymentMonth)} ${paymentYear}`
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Automatically create salary slip record
      const slipData = {
        school_id: currentUser.school_id,
        staff_id: selectedStaff.id,
        payment_id: paymentData.id,
        slip_number: `SLP-${paymentYear}-${String(paymentMonth).padStart(2, '0')}-${selectedStaff.employee_number || selectedStaff.id}`,
        month: paymentMonth,
        year: paymentYear,
        generated_by: currentUser.id,
        generated_date: new Date().toISOString().split('T')[0],
        file_path: null,
        status: paymentStatus === 'paid' ? 'generated' : 'pending'
      }

      const { error: slipError } = await supabase
        .from('salary_slips')
        .insert(slipData)

      if (slipError) {
        console.error('Error creating salary slip:', slipError)
        // Don't fail the whole operation if slip creation fails
      }

      toast.success(
        paymentStatus === 'paid'
          ? 'Salary paid successfully! Slip record created.'
          : 'Salary payment record created successfully!'
      )

      // Reload payment history
      await loadPaymentHistory(selectedStaff.id)

      // Reload staff list to update button states
      loadStaffList()

      // Reset transaction ID and remarks
      setTransactionId('')
      setRemarks('')
    } catch (error) {
      console.error('Error paying salary:', error)
      if (error.code === '23505') {
        toast.error('Payment for this month already exists!')
      } else {
        toast.error('Failed to pay salary')
      }
    } finally {
      setProcessingPayment(false)
    }
  }

  const confirmDeletePayment = (paymentId) => {
    setPaymentToDelete(paymentId)
    setShowDeletePaymentModal(true)
  }

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('salary_payments')
        .delete()
        .eq('id', paymentToDelete)
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      toast.success('Payment record deleted successfully')
      setShowDeletePaymentModal(false)
      setPaymentToDelete(null)
      await loadPaymentHistory(selectedStaff.id)

      // Reload staff list to update button states
      loadStaffList()
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast.error('Failed to delete payment record')
    } finally {
      setDeleting(false)
    }
  }

  const handleViewSalaryStructure = () => {
    if (salaryStructure) {
      setShowSalaryStructureModal(true)
    } else {
      setShowNoSalaryStructureModal(true)
    }
  }

  const handleNavigateToCreateStructure = () => {
    window.location.href = `/payroll/salary-structure`
  }

  const clearScreen = () => {
    setSearchEmployeeNumber('')
    setSearchGeneralData('')
    setSelectedStaff(null)
    setSalaryStructure(null)
    setPaymentHistory([])
  }

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const getTotalPaid = () => {
    return paymentHistory
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (parseFloat(p.net_salary) || 0), 0)
  }

  const getCurrentYearPaid = () => {
    const currentYear = new Date().getFullYear()
    return paymentHistory
      .filter(p => p.payment_year === currentYear && p.status === 'paid')
      .reduce((sum, p) => sum + (parseFloat(p.net_salary) || 0), 0)
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
              primary: '#10b981',
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

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
            <input
              type="text"
              placeholder="Employee Number"
              value={searchEmployeeNumber}
              onChange={(e) => setSearchEmployeeNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OR General Data</label>
            <input
              type="text"
              placeholder="Search by name, father name or employee number"
              value={searchGeneralData}
              onChange={(e) => setSearchGeneralData(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Click on <span className="text-blue-600 font-medium underline cursor-pointer" onClick={clearScreen}>clear screen</span> or press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Shift+Esc</kbd> to clear the screen.
        </p>
      </div>

      {/* Staff List */}
      {!selectedStaff && (
        <div className="bg-white rounded-lg shadow-md p-3">
          {loading ? (
            <div className="text-center py-4 text-gray-500 text-sm">Loading staff...</div>
          ) : staffList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-blue-900 text-white text-sm">
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Staff Name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Father Name</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Employee Number</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Designation</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((staff, index) => {
                    const isPaid = staffPaymentStatus[staff.id]
                    return (
                      <tr key={staff.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-gray-800 text-sm">{staff.first_name} {staff.last_name}</td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-800 text-sm">{staff.father_name || ''}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-gray-800 text-sm">{staff.employee_number || 'N/A'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-800 text-sm">{staff.designation || 'N/A'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <button
                            onClick={() => loadStaffDetails(staff)}
                            disabled={isPaid}
                            className={`${
                              isPaid
                                ? 'bg-slate-700 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                            } text-white px-4 py-1 rounded text-sm font-medium transition-colors disabled:opacity-90`}
                          >
                            {isPaid ? 'Paid Salary' : 'Pay Salary'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">No active staff found. Please adjust your search criteria.</div>
          )}
        </div>
      )}

      {/* Staff Salary Details */}
      {selectedStaff && (
        <div className="bg-white rounded-lg shadow-md p-3">
          {/* Staff Info Header */}
          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-lg">👨‍💼</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-blue-600">
                {selectedStaff.first_name} {selectedStaff.last_name}
              </h2>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-1">
                <span>Father: {selectedStaff.father_name || 'N/A'}</span>
                <span>Employee No: {selectedStaff.employee_number || 'N/A'}</span>
                <span>Designation: {selectedStaff.designation || 'N/A'}</span>
                <span>Joining Date: {selectedStaff.joining_date ? new Date(selectedStaff.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedStaff(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary Cards */}
          {salaryStructure && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{salaryStructure.basic_salary?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-600">Basic Salary</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {(
                    (salaryStructure.house_allowance || 0) +
                    (salaryStructure.medical_allowance || 0) +
                    (salaryStructure.transport_allowance || 0) +
                    (salaryStructure.other_allowances || 0)
                  ).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Total Allowances</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {(
                    (salaryStructure.provident_fund || 0) +
                    (salaryStructure.tax_deduction || 0) +
                    (salaryStructure.other_deductions || 0)
                  ).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Total Deductions</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{salaryStructure.net_salary?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-600">Net Salary</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">{getCurrentYearPaid().toLocaleString()}</div>
                <div className="text-xs text-gray-600">Paid This Year</div>
              </div>
            </div>
          )}

          {!salaryStructure && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
              <p className="text-yellow-800 font-medium text-sm">⚠️ No salary structure defined for this staff member.</p>
              <p className="text-yellow-700 text-xs mt-1">Please create a salary structure before processing payments.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={handleViewSalaryStructure}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <span>💰</span> View Salary Structure
            </button>
            <button
              onClick={() => setShowPaymentHistoryModal(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <span>📋</span> Payment History ({paymentHistory.length})
            </button>
          </div>

          {/* Payment Form */}
          {salaryStructure && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Process Monthly Salary Payment</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Month</label>
                  <select
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{getMonthName(month)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Year</label>
                  <select
                    value={paymentYear}
                    onChange={(e) => setPaymentYear(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="paid">Paid (Completed)</option>
                    <option value="pending">Pending (Unpaid)</option>
                    <option value="partial">Partial Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="Transaction ID / Cheque Number"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <textarea
                  placeholder="Enter any remarks or notes"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg mb-2">
                <div>
                  <p className="text-xs text-gray-600">Net Salary to be Paid</p>
                  <p className="text-base font-bold text-blue-600">{salaryStructure.net_salary?.toLocaleString()} PKR</p>
                </div>
                <button
                  onClick={checkAndShowPaymentConfirmation}
                  disabled={processingPayment}
                  className={`${
                    paymentStatus === 'paid'
                      ? 'bg-green-500 hover:bg-green-600'
                      : paymentStatus === 'pending'
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-yellow-500 hover:bg-yellow-600'
                  } text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed`}
                >
                  {processingPayment
                    ? 'Processing...'
                    : paymentStatus === 'paid'
                    ? 'Pay Salary'
                    : paymentStatus === 'pending'
                    ? 'Create Pending Payment'
                    : 'Create Partial Payment'
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Salary Structure Modal */}
      {showSalaryStructureModal && salaryStructure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-blue-900 text-white px-3 py-2 flex justify-between items-center">
              <h3 className="text-base font-bold">Salary Structure - {selectedStaff.first_name} {selectedStaff.last_name}</h3>
              <button
                onClick={() => setShowSalaryStructureModal(false)}
                className="text-white hover:text-gray-200 text-lg"
              >
                ×
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[calc(90vh-120px)]">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-gray-300 px-3 py-2 text-sm text-left font-semibold">Component</th>
                    <th className="border border-gray-300 px-3 py-2 text-sm text-right font-semibold">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium">Basic Salary</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right">{salaryStructure.basic_salary?.toLocaleString() || 0}</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 px-3 py-2 text-sm font-semibold" colSpan="2">Allowances</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm pl-8">House Allowance</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right text-green-600">{salaryStructure.house_allowance?.toLocaleString() || 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm pl-8">Medical Allowance</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right text-green-600">{salaryStructure.medical_allowance?.toLocaleString() || 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm pl-8">Transport Allowance</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right text-green-600">{salaryStructure.transport_allowance?.toLocaleString() || 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm pl-8">Other Allowances</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right text-green-600">{salaryStructure.other_allowances?.toLocaleString() || 0}</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="border border-gray-300 px-3 py-2 text-sm font-semibold" colSpan="2">Deductions</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm pl-8">Provident Fund</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right text-red-600">{salaryStructure.provident_fund?.toLocaleString() || 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm pl-8">Tax Deduction</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right text-red-600">{salaryStructure.tax_deduction?.toLocaleString() || 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm pl-8">Other Deductions</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right text-red-600">{salaryStructure.other_deductions?.toLocaleString() || 0}</td>
                  </tr>
                  <tr className="bg-blue-50 font-bold">
                    <td className="border border-gray-300 px-4 py-3">Gross Salary</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-blue-600">{salaryStructure.gross_salary?.toLocaleString() || 0}</td>
                  </tr>
                  <tr className="bg-green-100 font-bold text-lg">
                    <td className="border border-gray-300 px-4 py-3">Net Salary</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-green-700">{salaryStructure.net_salary?.toLocaleString() || 0}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Effective From:</strong> {salaryStructure.effective_from ? new Date(salaryStructure.effective_from).toLocaleDateString('en-GB') : 'N/A'}</p>
                {salaryStructure.effective_to && (
                  <p><strong>Effective To:</strong> {new Date(salaryStructure.effective_to).toLocaleDateString('en-GB')}</p>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-3 py-2 flex justify-end">
              <button
                onClick={() => setShowSalaryStructureModal(false)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Salary Structure Modal */}
      {showNoSalaryStructureModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowNoSalaryStructureModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-3 rounded-t-xl">
                <h3 className="text-lg font-bold">No Salary Structure Found</h3>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-12 h-12 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-gray-700 mb-2">
                      <span className="font-bold">{selectedStaff?.first_name} {selectedStaff?.last_name}</span> does not have a salary structure created yet.
                    </p>
                    <p className="text-gray-600 text-sm">
                      Please create a salary structure for this employee before processing payments or viewing salary details.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowNoSalaryStructureModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNavigateToCreateStructure}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 rounded-lg transition"
                  >
                    Create Salary Structure
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payment History Modal */}
      {showPaymentHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="bg-blue-900 text-white px-3 py-2 flex justify-between items-center">
              <h3 className="text-base font-bold">Payment History - {selectedStaff.first_name} {selectedStaff.last_name}</h3>
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                className="text-white hover:text-gray-200 text-lg"
              >
                ×
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[calc(90vh-120px)]">
              {paymentHistory.length > 0 ? (
                <>
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                        <th className="border border-gray-300 px-3 py-2 text-left">Month/Year</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">Basic</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">Allowances</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">Deductions</th>
                        <th className="border border-gray-300 px-3 py-2 text-right">Net Salary</th>
                        <th className="border border-gray-300 px-3 py-2 text-left">Payment Date</th>
                        <th className="border border-gray-300 px-3 py-2 text-left">Method</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment, index) => (
                        <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-3 py-2">{index + 1}</td>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            {getMonthName(payment.payment_month)} {payment.payment_year}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">{parseFloat(payment.basic_salary).toLocaleString()}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right text-green-600">{parseFloat(payment.total_allowances).toLocaleString()}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right text-red-600">{parseFloat(payment.total_deductions).toLocaleString()}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-bold text-blue-600">{parseFloat(payment.net_salary).toLocaleString()}</td>
                          <td className="border border-gray-300 px-3 py-2">{new Date(payment.payment_date).toLocaleDateString('en-GB')}</td>
                          <td className="border border-gray-300 px-3 py-2 capitalize">{payment.payment_method?.replace('_', ' ')}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                              payment.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                              payment.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {payment.status === 'paid' ? 'Paid' : payment.status === 'pending' ? 'Pending' : payment.status === 'partial' ? 'Partial' : payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-100 font-bold">
                        <td colSpan="5" className="border border-gray-300 px-3 py-2 text-right">Total Paid:</td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-green-700 text-lg">
                          {getTotalPaid().toLocaleString()} PKR
                        </td>
                        <td colSpan="3" className="border border-gray-300"></td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No payment history found for this staff member.
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-3 py-2 flex justify-end">
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Duplicate Payment Modal */}
      {showConfirmPaymentModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => !processingPayment && setShowConfirmPaymentModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-3 py-2 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Duplicate Payment</h3>
              </div>
              <div className="p-3">
                <p className="text-gray-700 mb-6">
                  Salary for <span className="font-bold text-blue-600">{getMonthName(paymentMonth)} {paymentYear}</span> has already been paid. Do you want to create another payment?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmPaymentModal(false)}
                    disabled={processingPayment}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePaySalary}
                    disabled={processingPayment}
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                  >
                    {processingPayment ? 'Processing...' : 'Yes, Pay Again'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Payment Confirmation Modal */}
      {showDeletePaymentModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => !deleting && setShowDeletePaymentModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-3">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete this payment record? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeletePaymentModal(false)
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

export default function StaffPayrollPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getUserFromCookie()
    setCurrentUser(user)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      permissionKey="payroll_pay_view"
      currentUser={currentUser}
      pageName="Pay Salary"
    >
      <StaffPayrollPageContent />
    </PermissionGuard>
  )
}
