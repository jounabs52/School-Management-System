'use client'

import { useState, useEffect } from 'react'
import { Search, DollarSign, Calendar, User, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

export default function FeeCollectPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingChallans, setPendingChallans] = useState([])

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
    fetchStudentsWithPendingFees()
  }, [])

  const fetchStudentsWithPendingFees = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          current_class_id,
          classes:current_class_id (
            class_name
          ),
          sections:current_section_id (
            section_name
          )
        `)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('admission_number', { ascending: true })

      if (error) throw error

      // Fetch pending challans for each student
      const studentsWithFees = await Promise.all(
        (data || []).map(async (student) => {
          const { data: challans, error: challanError } = await supabase
            .from('fee_challans')
            .select('id, challan_number, total_amount, due_date, status')
            .eq('school_id', user.school_id)
            .eq('student_id', student.id)
            .in('status', ['pending', 'overdue'])

          if (challanError) {
            console.error('Error fetching challans:', challanError)
            return { ...student, pendingAmount: 0, challanCount: 0 }
          }

          const pendingAmount = (challans || []).reduce((sum, c) => sum + parseFloat(c.total_amount || 0), 0)

          return {
            ...student,
            pendingAmount,
            challanCount: (challans || []).length
          }
        })
      )

      setStudents(studentsWithFees)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const fetchStudentChallans = async (studentId) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_challans')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('student_id', studentId)
        .in('status', ['pending', 'overdue'])
        .order('issue_date', { ascending: true })

      if (error) throw error
      setPendingChallans(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student)
    await fetchStudentChallans(student.id)
    setShowPaymentModal(true)
    setPaymentData({
      paymentMethod: 'cash',
      amountPaid: student.pendingAmount.toString(),
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
      let remainingAmount = amountPaid

      // Process payments for each challan
      for (const challan of pendingChallans) {
        if (remainingAmount <= 0) break

        const challanAmount = parseFloat(challan.total_amount)
        const paymentAmount = Math.min(remainingAmount, challanAmount)

        // Generate receipt number
        const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        // Insert payment
        const { error: paymentError } = await supabase
          .from('fee_payments')
          .insert([{
            school_id: user.school_id,
            challan_id: challan.id,
            student_id: selectedStudent.id,
            payment_date: new Date().toISOString().split('T')[0],
            amount_paid: paymentAmount,
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
        const newStatus = paymentAmount >= challanAmount ? 'paid' : 'pending'
        const { error: updateError } = await supabase
          .from('fee_challans')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', challan.id)

        if (updateError) throw updateError

        remainingAmount -= paymentAmount
      }

      alert('Payment collected successfully!')
      setShowPaymentModal(false)
      setSelectedStudent(null)
      setPendingChallans([])
      fetchStudentsWithPendingFees()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to process payment')
    }
  }

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${student.first_name} ${student.last_name || ''}`.toLowerCase()
    return (
      fullName.includes(searchLower) ||
      student.admission_number.toLowerCase().includes(searchLower) ||
      (student.classes?.class_name || '').toLowerCase().includes(searchLower)
    )
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
              placeholder="Search by name, admission number, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2">
            <Search size={20} />
            Search
          </button>
        </div>

        <p className="text-gray-600 mt-4 text-sm">
          There are <span className="font-bold text-red-600">{filteredStudents.length}</span> students with pending fees
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Sr.</th>
                <th className="px-6 py-4 text-left font-semibold">Admission No.</th>
                <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                <th className="px-6 py-4 text-left font-semibold">Class</th>
                <th className="px-6 py-4 text-left font-semibold">Pending Challans</th>
                <th className="px-6 py-4 text-left font-semibold">Pending Amount</th>
                <th className="px-6 py-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No students found with pending fees
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-gray-700">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{student.admission_number}</td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {student.classes?.class_name || 'N/A'} {student.sections?.section_name ? `- ${student.sections.section_name}` : ''}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                        {student.challanCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-bold">
                      Rs. {student.pendingAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleSelectStudent(student)}
                        className="bg-red-600 text-white px-4 py-1.5 rounded hover:bg-red-700 transition text-sm font-medium"
                        disabled={student.challanCount === 0}
                      >
                        Collect Fee
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && (
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
                    {selectedStudent.first_name} {selectedStudent.last_name} - {selectedStudent.admission_number}
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
              {/* Pending Challans */}
              <div className="mb-6">
                <h4 className="text-gray-800 font-bold mb-3">Pending Challans</h4>
                <div className="space-y-2">
                  {pendingChallans.map((challan) => (
                    <div key={challan.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">{challan.challan_number}</p>
                          <p className="text-sm text-gray-600">Due: {new Date(challan.due_date).toLocaleDateString()}</p>
                        </div>
                        <p className="font-bold text-red-600">Rs. {parseFloat(challan.total_amount).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Total Pending:</span>
                    <span className="font-bold text-red-600 text-xl">
                      Rs. {selectedStudent.pendingAmount.toLocaleString()}
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
