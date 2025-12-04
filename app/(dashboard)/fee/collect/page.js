'use client'

import { useState, useEffect } from 'react'
import { Search, DollarSign, Calendar, User, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

export default function FeeCollectPage() {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChallan, setSelectedChallan] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [classes, setClasses] = useState([])

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
    if (showPaymentModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showPaymentModal])

  useEffect(() => {
    fetchAllChallans()
    fetchAllClasses()
  }, [])

  const fetchAllClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      // Fetch ALL classes for the filter dropdown
      const { data: allClasses, error } = await supabase
        .from('classes')
        .select('id, class_name')
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

      // Fetch all challans
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
            current_section_id
          )
        `)
        .eq('school_id', user.school_id)
        .order('issue_date', { ascending: false })

      if (challansError) throw challansError

      // Fetch classes and sections separately (manual joining)
      const classIds = [...new Set(challansData?.map(c => c.students?.current_class_id).filter(Boolean))]
      const sectionIds = [...new Set(challansData?.map(c => c.students?.current_section_id).filter(Boolean))]

      const { data: classesData } = await supabase
        .from('classes')
        .select('id, class_name')
        .in('id', classIds)

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, section_name')
        .in('id', sectionIds)

      // Create lookup maps
      const classMap = {}
      classesData?.forEach(c => { classMap[c.id] = c })

      const sectionMap = {}
      sectionsData?.forEach(s => { sectionMap[s.id] = s })

      // Merge data
      const challansWithDetails = (challansData || []).map(challan => ({
        ...challan,
        student: {
          ...challan.students,
          class: classMap[challan.students?.current_class_id],
          section: sectionMap[challan.students?.current_section_id]
        }
      }))

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
    setPaymentData({
      paymentMethod: 'cash',
      amountPaid: challan.total_amount.toString(),
      chequeNumber: '',
      bankName: '',
      transactionId: '',
      remarks: ''
    })
  }

  const handlePayment = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('User not found')
        return
      }

      if (!paymentData.amountPaid || parseFloat(paymentData.amountPaid) <= 0) {
        alert('Please enter a valid amount')
        return
      }

      const amountPaid = parseFloat(paymentData.amountPaid)
      const challanAmount = parseFloat(selectedChallan.total_amount)

      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // Insert payment
      const { error: paymentError } = await supabase
        .from('fee_payments')
        .insert([{
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
        }])

      if (paymentError) throw paymentError

      // Update challan status
      const newStatus = amountPaid >= challanAmount ? 'paid' : 'pending'
      const { error: updateError } = await supabase
        .from('fee_challans')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedChallan.id)

      if (updateError) throw updateError

      alert('Payment collected successfully!')
      setShowPaymentModal(false)
      setSelectedChallan(null)
      fetchAllChallans()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to process payment')
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

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Collect Fee</h1>
        <p className="text-gray-600">Search students and collect pending fees</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, admission number, challan number, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.class_name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="flex gap-4 mt-4 text-sm">
          <p className="text-gray-600">
            Total challans: <span className="font-bold text-blue-600">{filteredChallans.length}</span>
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
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold">Student Name</th>
                <th className="px-4 py-3 text-left font-semibold">Admission No.</th>
                <th className="px-4 py-3 text-left font-semibold">Class</th>
                <th className="px-4 py-3 text-left font-semibold">Issue Date</th>
                <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold">Amount</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No challans found
                  </td>
                </tr>
              ) : (
                filteredChallans.map((challan, index) => (
                  <tr
                    key={challan.id}
                    className={`hover:bg-gray-50 transition ${challan.status === 'paid' ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {challan.student?.first_name} {challan.student?.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{challan.student?.admission_number}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {challan.student?.class?.class_name || 'N/A'}
                      {challan.student?.section?.section_name ? ` - ${challan.student.section.section_name}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(challan.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(challan.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-bold">
                      Rs. {parseFloat(challan.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        challan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        challan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {challan.status === 'pending' || challan.status === 'overdue' ? (
                        <button
                          onClick={() => handleSelectChallan(challan)}
                          className="bg-red-600 text-white px-4 py-1.5 rounded hover:bg-red-700 transition text-sm font-medium"
                        >
                          Collect Fee
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowPaymentModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Collect Fee</h3>
                  <p className="text-blue-200 text-sm mt-1">
                    {selectedChallan.student?.first_name} {selectedChallan.student?.last_name} - {selectedChallan.student?.admission_number}
                  </p>
                  <p className="text-blue-300 text-sm">
                    Challan: {selectedChallan.challan_number}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Challan Details */}
              <div className="mb-6">
                <h4 className="text-gray-800 font-bold mb-3">Challan Details</h4>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Challan Number:</span>
                      <span className="font-semibold text-gray-800">{selectedChallan.challan_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issue Date:</span>
                      <span className="font-semibold text-gray-800">{new Date(selectedChallan.issue_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-semibold text-gray-800">{new Date(selectedChallan.due_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedChallan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedChallan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedChallan.status.charAt(0).toUpperCase() + selectedChallan.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Total Amount:</span>
                    <span className="font-bold text-red-600 text-xl">
                      Rs. {parseFloat(selectedChallan.total_amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Amount to Pay <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentData.amountPaid}
                    onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  />
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
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
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                        Cheque Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter cheque number"
                        value={paymentData.chequeNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, chequeNumber: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                      />
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter bank name"
                        value={paymentData.bankName}
                        onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                      />
                    </div>
                  </>
                )}

                {(paymentData.paymentMethod === 'online' || paymentData.paymentMethod === 'bank_transfer') && (
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter transaction ID"
                      value={paymentData.transactionId}
                      onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                    />
                  </div>
                )}

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Remarks
                  </label>
                  <textarea
                    placeholder="Enter remarks (optional)"
                    value={paymentData.remarks}
                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-3 bg-white">
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
