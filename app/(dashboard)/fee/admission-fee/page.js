'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import { Users, FileText, TrendingUp, TrendingDown, Edit, Trash2, Plus, X, CheckCircle } from 'lucide-react'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
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

export default function AdmissionFeePolicyPage() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState(null)
  const [activeTab, setActiveTab] = useState('policy')
  const [feePolicy, setFeePolicy] = useState([])
  const [showIncrementModal, setShowIncrementModal] = useState(false)
  const [showDecrementModal, setShowDecrementModal] = useState(false)
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false)
  const [incrementAmount, setIncrementAmount] = useState('')
  const [decrementAmount, setDecrementAmount] = useState('')
  const [incrementType, setIncrementType] = useState('percentage')
  const [decrementType, setDecrementType] = useState('percentage')
  const [feeTypes, setFeeTypes] = useState([])
  const [feeTypeName, setFeeTypeName] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingPolicyId, setDeletingPolicyId] = useState(null)

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

  // Lock/unlock body scroll when modals open/close with scrollbar compensation
  useEffect(() => {
    if (showAddPolicyModal || showEditModal || showDeleteModal || showIncrementModal || showDecrementModal) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showAddPolicyModal, showEditModal, showDeleteModal, showIncrementModal, showDecrementModal])

  useEffect(() => {
    fetchClasses()
    fetchFeeTypes()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      fetchFeePolicy()
    }
  }, [selectedClass])

  const fetchClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name, order_number')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('order_number', { ascending: true })

      if (classesError) throw classesError
      setClasses(classesData || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFeeTypes = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_types')
        .select('id, fee_name, fee_code')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('fee_name')

      if (error) throw error
      setFeeTypes(data || [])
    } catch (error) {
      console.error('Error fetching fee types:', error)
    }
  }

  const fetchFeePolicy = async () => {
    try {
      const user = getUserFromCookie()
      if (!user || !selectedClass) return

      const { data, error } = await supabase
        .from('fee_structures')
        .select(`
          id,
          amount,
          fee_types (
            id,
            fee_name,
            fee_code
          )
        `)
        .eq('school_id', user.school_id)
        .eq('class_id', selectedClass.id)
        .eq('status', 'active')

      if (error) throw error
      setFeePolicy(data || [])
    } catch (error) {
      console.error('Error fetching fee policy:', error)
    }
  }

  const handleViewClass = (cls) => {
    setSelectedClass(cls)
    setActiveTab('policy')
  }

  const handleApplyFeeIncrement = async () => {
    if (!selectedClass || !incrementAmount) {
      showToast('Please enter an increment amount', 'warning')
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('standard_fee')
        .eq('id', selectedClass.id)
        .single()

      if (classError) throw classError

      const currentStandardFee = parseFloat(classData.standard_fee) || 0

      let newStandardFee = currentStandardFee
      if (incrementType === 'percentage') {
        newStandardFee = currentStandardFee + (currentStandardFee * (parseFloat(incrementAmount) / 100))
      } else {
        newStandardFee = currentStandardFee + parseFloat(incrementAmount)
      }

      newStandardFee = Math.round(newStandardFee)

      const { error: updateError } = await supabase
        .from('classes')
        .update({ standard_fee: newStandardFee })
        .eq('id', selectedClass.id)

      if (updateError) throw updateError

      showToast(`Fee increment applied! Rs. ${currentStandardFee.toLocaleString()} → Rs. ${newStandardFee.toLocaleString()}`, 'success')
      setShowIncrementModal(false)
      setIncrementAmount('')
      setActiveTab('policy')
    } catch (error) {
      console.error('Error applying fee increment:', error)
      showToast('Failed to apply fee increment', 'error')
    }
  }

  const handleApplyFeeDecrement = async () => {
    if (!selectedClass || !decrementAmount) {
      showToast('Please enter a decrement amount', 'warning')
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('standard_fee')
        .eq('id', selectedClass.id)
        .single()

      if (classError) throw classError

      const currentStandardFee = parseFloat(classData.standard_fee) || 0

      let newStandardFee = currentStandardFee
      if (decrementType === 'percentage') {
        newStandardFee = currentStandardFee - (currentStandardFee * (parseFloat(decrementAmount) / 100))
      } else {
        newStandardFee = currentStandardFee - parseFloat(decrementAmount)
      }

      newStandardFee = Math.max(0, Math.round(newStandardFee))

      const { error: updateError } = await supabase
        .from('classes')
        .update({ standard_fee: newStandardFee })
        .eq('id', selectedClass.id)

      if (updateError) throw updateError

      showToast(`Fee decrement applied! Rs. ${currentStandardFee.toLocaleString()} → Rs. ${newStandardFee.toLocaleString()}`, 'success')
      setShowDecrementModal(false)
      setDecrementAmount('')
      setActiveTab('policy')
    } catch (error) {
      console.error('Error applying fee decrement:', error)
      showToast('Failed to apply fee decrement', 'error')
    }
  }

  const handleEditPolicy = (policy) => {
    setEditingPolicy(policy)
    setFeeTypeName(policy.fee_types?.fee_name || '')
    setFeeAmount(policy.amount?.toString() || '')
    setShowEditModal(true)
  }

  const handleUpdateFeePolicy = async () => {
    if (!editingPolicy || !feeTypeName || !feeAmount) {
      showToast('Please fill in all fields', 'warning')
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) return

      let feeTypeId = null

      const { data: existingFeeType } = await supabase
        .from('fee_types')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('fee_name', feeTypeName)
        .eq('status', 'active')
        .maybeSingle()

      if (existingFeeType) {
        feeTypeId = existingFeeType.id
      } else {
        const { data: newFeeType, error: feeTypeError } = await supabase
          .from('fee_types')
          .insert({
            school_id: user.school_id,
            fee_name: feeTypeName,
            fee_code: feeTypeName.toUpperCase().replace(/\s+/g, '_'),
            status: 'active'
          })
          .select('id')
          .single()

        if (feeTypeError) throw feeTypeError
        feeTypeId = newFeeType.id
      }

      const { error: updateError } = await supabase
        .from('fee_structures')
        .update({
          fee_type_id: feeTypeId,
          amount: parseFloat(feeAmount)
        })
        .eq('id', editingPolicy.id)

      if (updateError) throw updateError

      // Update state locally for real-time effect
      setFeePolicy(prevPolicies =>
        prevPolicies.map(policy =>
          policy.id === editingPolicy.id
            ? {
                ...policy,
                amount: parseFloat(feeAmount),
                fee_types: { ...policy.fee_types, fee_name: feeTypeName }
              }
            : policy
        )
      )

      showToast('Fee policy updated successfully!', 'success')
      setShowEditModal(false)
      setEditingPolicy(null)
      setFeeTypeName('')
      setFeeAmount('')
    } catch (error) {
      console.error('Error updating fee policy:', error)
      showToast('Failed to update fee policy', 'error')
    }
  }

  const handleDeletePolicy = (policyId) => {
    setDeletingPolicyId(policyId)
    setShowDeleteModal(true)
  }

  const confirmDeletePolicy = async () => {
    if (!deletingPolicyId) return

    try {
      const { error } = await supabase
        .from('fee_structures')
        .delete()
        .eq('id', deletingPolicyId)

      if (error) throw error

      // Update state locally for real-time effect
      setFeePolicy(prevPolicies => prevPolicies.filter(policy => policy.id !== deletingPolicyId))

      showToast('Fee policy deleted successfully!', 'success')
      setShowDeleteModal(false)
      setDeletingPolicyId(null)
    } catch (error) {
      console.error('Error deleting fee policy:', error)
      showToast('Failed to delete fee policy', 'error')
      setShowDeleteModal(false)
      setDeletingPolicyId(null)
    }
  }

  const handleAddFeePolicy = async () => {
    if (!selectedClass || !feeTypeName || !feeAmount) {
      showToast('Please fill in all fields', 'warning')
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('is_current', true)
        .single()

      if (sessionError || !sessionData) {
        showToast('No active session found. Please create an active session first.', 'error')
        return
      }

      let feeTypeId = null

      const { data: existingFeeType } = await supabase
        .from('fee_types')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('fee_name', feeTypeName)
        .eq('status', 'active')
        .maybeSingle()

      if (existingFeeType) {
        feeTypeId = existingFeeType.id
      } else {
        const { data: newFeeType, error: feeTypeError } = await supabase
          .from('fee_types')
          .insert({
            school_id: user.school_id,
            fee_name: feeTypeName,
            fee_code: feeTypeName.toUpperCase().replace(/\s+/g, '_'),
            status: 'active'
          })
          .select('id')
          .single()

        if (feeTypeError) throw feeTypeError
        feeTypeId = newFeeType.id
      }

      const { data: existingPolicy } = await supabase
        .from('fee_structures')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('session_id', sessionData.id)
        .eq('class_id', selectedClass.id)
        .eq('fee_type_id', feeTypeId)
        .eq('status', 'active')
        .maybeSingle()

      if (existingPolicy) {
        showToast('This fee type already exists for this class in the current session.', 'warning')
        return
      }

      const { data: newPolicy, error: insertError } = await supabase
        .from('fee_structures')
        .insert({
          school_id: user.school_id,
          session_id: sessionData.id,
          class_id: selectedClass.id,
          fee_type_id: feeTypeId,
          amount: parseFloat(feeAmount),
          status: 'active'
        })
        .select(`
          id,
          amount,
          fee_types (
            id,
            fee_name,
            fee_code
          )
        `)
        .single()

      if (insertError) throw insertError

      // Update state locally for real-time effect
      if (newPolicy) {
        setFeePolicy(prevPolicies => [...prevPolicies, newPolicy])
      }

      showToast('Fee policy added successfully!', 'success')
      setShowAddPolicyModal(false)
      setFeeTypeName('')
      setFeeAmount('')
    } catch (error) {
      console.error('Error adding fee policy:', error)
      showToast('Failed to add fee policy', 'error')
    }
  }

  // Reset to page 1 when class changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedClass])

  // Pagination calculations
  const totalPages = Math.ceil(feePolicy.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedPolicies = feePolicy.slice(startIndex, endIndex)

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
        for (let i = 1; i <= maxVisiblePages; i++) pages.push(i)
      } else if (currentPage >= totalPages - 1) {
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        for (let i = currentPage - 1; i <= currentPage + 2; i++) {
          if (i >= 1 && i <= totalPages) pages.push(i)
        }
      }
    }
    return pages
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-bold text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>

      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admission Fee Management</h1>
        <p className="text-gray-600 mt-1">Manage admission fees and increments for each class</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setActiveTab('policy')}
          className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
            activeTab === 'policy'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText size={20} />
          Admission Fee
        </button>
        <button
          onClick={() => setActiveTab('increment')}
          className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
            activeTab === 'increment'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUp size={20} />
          Fee Increment
        </button>
        <button
          onClick={() => setActiveTab('decrement')}
          className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
            activeTab === 'decrement'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingDown size={20} />
          Fee Decrement
        </button>
      </div>

      {/* Class Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Select Class
        </label>
        <select
          value={selectedClass?.id || ''}
          onChange={(e) => {
            const cls = classes.find(c => c.id === e.target.value)
            if (cls) {
              handleViewClass(cls)
            } else {
              setSelectedClass(null)
              setFeePolicy([])
            }
          }}
          className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          <option value="">-- Select a class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.class_name}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Content */}
      {selectedClass && activeTab === 'policy' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Fee Policy for Class: {selectedClass.class_name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                All fees shown below are specific to this class only
              </p>
            </div>
            <button
              onClick={() => setShowAddPolicyModal(true)}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              Add Fee Policy
            </button>
          </div>

          {/* Fee Policy Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#1E3A8A] text-white">
                    <th className="px-4 py-4 text-left text-sm font-semibold border border-blue-800">Sr.</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold border border-blue-800">Fee Head</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold border border-blue-800">Title</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold border border-blue-800">Amount</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold border border-blue-800">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {feePolicy.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500 border border-gray-200">
                        No fee policy found for this class. Click "Add Fee Policy" to get started.
                      </td>
                    </tr>
                  ) : (
                    paginatedPolicies.map((policy, index) => (
                      <tr key={policy.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                        <td className="px-4 py-4 border border-gray-200 text-sm text-gray-600">{startIndex + index + 1}</td>
                        <td className="px-4 py-4 border border-gray-200 text-sm">
                          <span className="text-blue-600 font-medium">{policy.fee_types?.fee_name || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-4 border border-gray-200 text-sm text-gray-600">
                          {policy.fee_types?.fee_name || 'N/A'}
                        </td>
                        <td className="px-4 py-4 border border-gray-200 text-sm text-blue-600 font-medium">
                          Rs. {policy.amount ? policy.amount.toLocaleString() : '0'}
                        </td>
                        <td className="px-4 py-4 border border-gray-200">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleEditPolicy(policy)}
                              className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                              title="Edit Policy"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeletePolicy(policy.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Policy"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {feePolicy.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, feePolicy.length)} of {feePolicy.length} policies
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
                      onClick={() => goToPage(page)}
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
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      currentPage === totalPages || totalPages === 0
                        ? 'bg-blue-300 text-white cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedClass && activeTab === 'increment' && (
        <div>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Fee Increment for {selectedClass.class_name}
            </h2>
            <p className="text-gray-600 mb-6">
              Click the button below to open the fee increment modal. This will increase the Standard Fee (base monthly tuition) for this class.
            </p>
            <button
              onClick={() => setShowIncrementModal(true)}
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2"
            >
              <TrendingUp size={20} />
              Open Fee Increment Modal
            </button>
          </div>
        </div>
      )}

      {selectedClass && activeTab === 'decrement' && (
        <div>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Fee Decrement for {selectedClass.class_name}
            </h2>
            <p className="text-gray-600 mb-6">
              Click the button below to open the fee decrement modal. This will decrease the Standard Fee (base monthly tuition) for this class.
            </p>
            <button
              onClick={() => setShowDecrementModal(true)}
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2"
            >
              <TrendingDown size={20} />
              Open Fee Decrement Modal
            </button>
          </div>
        </div>
      )}

      {/* Fee Increment Modal - Matching Design */}
      {showIncrementModal && selectedClass && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => {
              setShowIncrementModal(false)
              setIncrementAmount('')
            }}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-2xl z-[10000] rounded-xl overflow-hidden">
            {/* Blue Header */}
            <div className="bg-[#2B5AA8] px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Fee Increment</h3>
                <p className="text-blue-100 text-sm mt-0.5">For class: {selectedClass.class_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowIncrementModal(false)
                  setIncrementAmount('')
                }}
                className="text-white hover:bg-white/20 p-1.5 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 bg-white">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Increment Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="incrementType"
                        value="percentage"
                        checked={incrementType === 'percentage'}
                        onChange={(e) => setIncrementType(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-gray-700">Percentage (%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="incrementType"
                        value="fixed"
                        checked={incrementType === 'fixed'}
                        onChange={(e) => setIncrementType(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-gray-700">Fixed Amount</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {incrementType === 'percentage' ? 'Percentage' : 'Amount'}
                  </label>
                  <input
                    type="number"
                    value={incrementAmount}
                    onChange={(e) => setIncrementAmount(e.target.value)}
                    placeholder={incrementType === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 500'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This will increment the Standard Fee for this class.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowIncrementModal(false)
                  setIncrementAmount('')
                }}
                className="px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyFeeIncrement}
                className="px-8 py-2.5 bg-[#2B5AA8] text-white font-medium hover:bg-[#234a8f] rounded-lg transition flex items-center gap-2"
              >
                <TrendingUp size={18} />
                Apply Increment
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fee Decrement Modal - Matching Design */}
      {showDecrementModal && selectedClass && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => {
              setShowDecrementModal(false)
              setDecrementAmount('')
            }}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-2xl z-[10000] rounded-xl overflow-hidden">
            {/* Blue Header */}
            <div className="bg-[#2B5AA8] px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Fee Decrement</h3>
                <p className="text-blue-100 text-sm mt-0.5">For class: {selectedClass.class_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowDecrementModal(false)
                  setDecrementAmount('')
                }}
                className="text-white hover:bg-white/20 p-1.5 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 bg-white">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Decrement Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="decrementType"
                        value="percentage"
                        checked={decrementType === 'percentage'}
                        onChange={(e) => setDecrementType(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-gray-700">Percentage (%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="decrementType"
                        value="fixed"
                        checked={decrementType === 'fixed'}
                        onChange={(e) => setDecrementType(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-gray-700">Fixed Amount</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {decrementType === 'percentage' ? 'Percentage' : 'Amount'}
                  </label>
                  <input
                    type="number"
                    value={decrementAmount}
                    onChange={(e) => setDecrementAmount(e.target.value)}
                    placeholder={decrementType === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 500'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This will decrement the Standard Fee for this class. Fees cannot go below 0.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDecrementModal(false)
                  setDecrementAmount('')
                }}
                className="px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyFeeDecrement}
                className="px-8 py-2.5 bg-[#2B5AA8] text-white font-medium hover:bg-[#234a8f] rounded-lg transition flex items-center gap-2"
              >
                <TrendingDown size={18} />
                Apply Decrement
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Fee Policy Modal - Slide from Right with Blue Header */}
      {showAddPolicyModal && selectedClass && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => {
              setShowAddPolicyModal(false)
              setFeeTypeName('')
              setFeeAmount('')
            }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200 animate-slide-in">
            {/* Blue Header */}
            <div className="bg-[#2B5AA8] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Add Fee Policy</h3>
                <p className="text-blue-100 text-sm mt-0.5">Create new fee policy for {selectedClass.class_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAddPolicyModal(false)
                  setFeeTypeName('')
                  setFeeAmount('')
                }}
                className="text-white hover:bg-white/20 p-1.5 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Fee Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={feeTypeName}
                    onChange={(e) => setFeeTypeName(e.target.value)}
                    placeholder="e.g., Admission Fee, Lab Fee, Sports Fee"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    placeholder="e.g., 5000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will add a new fee policy for the selected class. Make sure the fee type doesn't already exist for this class.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddPolicyModal(false)
                    setFeeTypeName('')
                    setFeeAmount('')
                  }}
                  className="flex-1 px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFeePolicy}
                  className="flex-1 px-8 py-2.5 bg-[#DC2626] text-white font-medium hover:bg-[#B91C1C] rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Policy
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Fee Policy Modal - Slide from Right with Blue Header */}
      {showEditModal && editingPolicy && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => {
              setShowEditModal(false)
              setEditingPolicy(null)
              setFeeTypeName('')
              setFeeAmount('')
            }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200 animate-slide-in">
            {/* Blue Header */}
            <div className="bg-[#2B5AA8] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Edit Fee Policy</h3>
                <p className="text-blue-100 text-sm mt-0.5">Update fee policy details</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingPolicy(null)
                  setFeeTypeName('')
                  setFeeAmount('')
                }}
                className="text-white hover:bg-white/20 p-1.5 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Fee Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={feeTypeName}
                    onChange={(e) => setFeeTypeName(e.target.value)}
                    placeholder="e.g., Admission Fee, Lab Fee, Sports Fee"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    placeholder="e.g., 5000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will update the fee policy for the selected class.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingPolicy(null)
                    setFeeTypeName('')
                    setFeeAmount('')
                  }}
                  className="flex-1 px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateFeePolicy}
                  className="flex-1 px-8 py-2.5 bg-[#DC2626] text-white font-medium hover:bg-[#B91C1C] rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  Update Policy
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal - Matching Design */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => {
              setShowDeleteModal(false)
              setDeletingPolicyId(null)
            }}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-2xl z-[10000] rounded-lg overflow-hidden">
            {/* Red Header */}
            <div className="bg-[#DC2626] px-6 py-3.5">
              <h3 className="text-xl font-bold text-white">Confirm Delete</h3>
            </div>

            {/* Content */}
            <div className="p-6 bg-white">
              <p className="text-gray-700 text-sm leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-[#DC2626]">this fee policy</span>? This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingPolicyId(null)
                }}
                className="px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePolicy}
                className="px-8 py-2.5 bg-[#DC2626] text-white font-medium hover:bg-[#B91C1C] rounded-lg transition flex items-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* No Class Selected Message */}
      {!selectedClass && (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <div className="text-gray-400 mb-4">
            <Users size={64} className="mx-auto" />
          </div>
          <p className="text-xl text-gray-600">Please select a class to continue</p>
          <p className="text-gray-500 mt-2">Choose a class from the dropdown above to manage fees</p>
        </div>
      )}

      {classes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users size={64} className="mx-auto" />
          </div>
          <p className="text-xl text-gray-600">No classes found</p>
          <p className="text-gray-500 mt-2">Add classes to manage admission fee policies</p>
        </div>
      )}
    </div>
  )
}