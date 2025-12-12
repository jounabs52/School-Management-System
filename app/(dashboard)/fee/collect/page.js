'use client'

import { useState, useEffect } from 'react'
<<<<<<< HEAD
import { Search, CheckCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={20} />}
      {type === 'error' && <X size={20} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  )
}

=======
import { Search, DollarSign, Calendar, User, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
export default function FeeCollectPage() {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChallan, setSelectedChallan] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [classes, setClasses] = useState([])
<<<<<<< HEAD
  
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
=======
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9

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

<<<<<<< HEAD
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, classFilter])

=======
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
  const fetchAllClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

<<<<<<< HEAD
=======
      // Fetch ALL classes for the filter dropdown
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Fetch all challans
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Fetch classes and sections separately (manual joining)
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Create lookup maps
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      const classMap = {}
      classesData?.forEach(c => { classMap[c.id] = c })

      const sectionMap = {}
      sectionsData?.forEach(s => { sectionMap[s.id] = s })

<<<<<<< HEAD
=======
      // Merge data
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
        showToast('User not found', 'error')
=======
        alert('User not found')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        return
      }

      if (!paymentData.amountPaid || parseFloat(paymentData.amountPaid) <= 0) {
<<<<<<< HEAD
        showToast('Please enter a valid amount', 'error')
=======
        alert('Please enter a valid amount')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
        return
      }

      const amountPaid = parseFloat(paymentData.amountPaid)
      const challanAmount = parseFloat(selectedChallan.total_amount)

<<<<<<< HEAD
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

=======
      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // Insert payment
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
=======
      // Update challan status
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      const newStatus = amountPaid >= challanAmount ? 'paid' : 'pending'
      const { error: updateError } = await supabase
        .from('fee_challans')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedChallan.id)

      if (updateError) throw updateError

<<<<<<< HEAD
      showToast('Payment collected successfully!', 'success')
      setShowPaymentModal(false)
      
      // Update the challan status locally without reloading the entire page
      setChallans(prevChallans => 
        prevChallans.map(challan => 
          challan.id === selectedChallan.id 
            ? { ...challan, status: newStatus, updated_at: new Date().toISOString() }
            : challan
        )
      )
      
      setSelectedChallan(null)
      // Removed fetchAllChallans() to prevent full page reload
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to process payment', 'error')
=======
      alert('Payment collected successfully!')
      setShowPaymentModal(false)
      setSelectedChallan(null)
      fetchAllChallans()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to process payment')
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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

<<<<<<< HEAD
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
        // Near start: show first 4
        for (let i = 1; i <= maxVisiblePages; i++) pages.push(i)
      } else if (currentPage >= totalPages - 1) {
        // Near end: show last 4
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        // Middle: show current and surrounding (4 total)
        for (let i = currentPage - 1; i <= currentPage + 2; i++) {
          if (i >= 1 && i <= totalPages) pages.push(i)
        }
      }
    }
    return pages
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

=======
  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Collect Fee</h1>
        <p className="text-gray-600">Search students and collect pending fees</p>
      </div>

<<<<<<< HEAD
      {/* Search Section - REORDERED: Status, Classes, Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="md:w-48">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
=======
      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
=======
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
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Admission No.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Issue Date</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Amount</th>
                <th className="px-4 py-3 text-center font-semibold border border-blue-800">Status</th>
                <th className="px-4 py-3 text-center font-semibold border border-blue-800">Action</th>
              </tr>
            </thead>
            <tbody>
=======
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
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
<<<<<<< HEAD
              ) : paginatedChallans.length === 0 ? (
=======
              ) : filteredChallans.length === 0 ? (
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No challans found
                  </td>
                </tr>
              ) : (
<<<<<<< HEAD
                paginatedChallans.map((challan, index) => (
                  <tr
                    key={challan.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition ${challan.status === 'paid' ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold border border-gray-200">
                      {challan.student?.first_name} {challan.student?.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700 border border-gray-200">{challan.student?.admission_number}</td>
                    <td className="px-4 py-3 text-gray-700 border border-gray-200">
                      {challan.student?.class?.class_name || 'N/A'}
                      {challan.student?.section?.section_name ? ` - ${challan.student.section.section_name}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-700 border border-gray-200">
                      {new Date(challan.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700 border border-gray-200">
                      {new Date(challan.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-bold border border-gray-200">
                      Rs. {parseFloat(challan.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center border border-gray-200">
=======
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
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        challan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        challan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                      </span>
                    </td>
<<<<<<< HEAD
                    <td className="px-4 py-3 text-center border border-gray-200">
=======
                    <td className="px-4 py-3 text-center">
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD

        {/* Pagination */}
        {!loading && filteredChallans.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length} challans
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
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
                  className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition ${
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
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
=======
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedChallan && (
        <>
          <div
<<<<<<< HEAD
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowPaymentModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
=======
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowPaymentModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
                  <X size={24} />
=======
                  ×
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 41a7b959a3b7fd8ab5e53864e9567b110a3262f9
