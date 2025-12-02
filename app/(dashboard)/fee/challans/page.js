'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Download, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

export default function FeeChallanPage() {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedChallan, setSelectedChallan] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [challanItems, setChallanItems] = useState([])

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (showViewModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showViewModal])

  useEffect(() => {
    fetchChallans()
  }, [])

  const fetchChallans = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('fee_challans')
        .select(`
          id,
          challan_number,
          issue_date,
          due_date,
          total_amount,
          status,
          student_id,
          students:student_id (
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
          )
        `)
        .eq('school_id', user.school_id)
        .order('issue_date', { ascending: false })

      if (error) throw error
      setChallans(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const fetchChallanItems = async (challanId) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_challan_items')
        .select(`
          id,
          description,
          amount,
          fee_type_id,
          fee_types:fee_type_id (
            fee_name
          )
        `)
        .eq('school_id', user.school_id)
        .eq('challan_id', challanId)

      if (error) throw error
      setChallanItems(data || [])
    } catch (error) {
      console.error('Error:', error)
      setChallanItems([])
    }
  }

  const handleViewChallan = async (challan) => {
    setSelectedChallan(challan)
    await fetchChallanItems(challan.id)
    setShowViewModal(true)
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || badges.pending
  }

  const filteredChallans = challans.filter(challan => {
    const searchLower = searchTerm.toLowerCase()
    const student = challan.students
    const fullName = student ? `${student.first_name} ${student.last_name || ''}`.toLowerCase() : ''

    const matchesSearch =
      challan.challan_number.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      (student?.admission_number || '').toLowerCase().includes(searchLower)

    const matchesStatus = statusFilter === 'all' || challan.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">View Challans</h1>
        <p className="text-gray-600">View and manage fee challans</p>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by challan number, student name, or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2">
            <Search size={20} />
            Search
          </button>
        </div>

        <p className="text-gray-600 text-sm">
          There are <span className="font-bold text-red-600">{filteredChallans.length}</span> challans in the database
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Sr.</th>
                <th className="px-6 py-4 text-left font-semibold">Challan No.</th>
                <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                <th className="px-6 py-4 text-left font-semibold">Admission No.</th>
                <th className="px-6 py-4 text-left font-semibold">Class</th>
                <th className="px-6 py-4 text-left font-semibold">Issue Date</th>
                <th className="px-6 py-4 text-left font-semibold">Due Date</th>
                <th className="px-6 py-4 text-left font-semibold">Amount</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                    No challans found
                  </td>
                </tr>
              ) : (
                filteredChallans.map((challan, index) => {
                  const student = challan.students
                  return (
                    <tr key={challan.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-700">{index + 1}</td>
                      <td className="px-6 py-4 text-gray-900 font-semibold">{challan.challan_number}</td>
                      <td className="px-6 py-4 text-gray-900">
                        {student ? `${student.first_name} ${student.last_name || ''}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{student?.admission_number || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {student?.classes?.class_name || 'N/A'} {student?.sections?.section_name ? `- ${student.sections.section_name}` : ''}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(challan.issue_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(challan.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-bold">
                        Rs. {parseFloat(challan.total_amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(challan.status)}`}>
                          {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewChallan(challan)}
                          className="text-blue-600 hover:text-blue-800 transition p-2"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Challan Modal */}
      {showViewModal && selectedChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowViewModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Challan Details</h3>
                  <p className="text-blue-200 text-sm mt-1">{selectedChallan.challan_number}</p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Student Info */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-800 mb-3">Student Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedChallan.students ? `${selectedChallan.students.first_name} ${selectedChallan.students.last_name || ''}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admission No:</span>
                    <span className="font-semibold text-gray-900">{selectedChallan.students?.admission_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Class:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedChallan.students?.classes?.class_name || 'N/A'} {selectedChallan.students?.sections?.section_name ? `- ${selectedChallan.students.sections.section_name}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Challan Info */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-800 mb-3">Challan Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issue Date:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(selectedChallan.issue_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(selectedChallan.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedChallan.status)}`}>
                      {selectedChallan.status.charAt(0).toUpperCase() + selectedChallan.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fee Items */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-800 mb-3">Fee Breakdown</h4>
                <div className="space-y-2">
                  {challanItems.length === 0 ? (
                    <p className="text-sm text-gray-500">No fee items found</p>
                  ) : (
                    challanItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <div>
                          <p className="font-medium text-gray-800">{item.fee_types?.fee_name || 'Fee'}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500">{item.description}</p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">
                          Rs. {parseFloat(item.amount).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 text-lg">Total Amount:</span>
                  <span className="font-bold text-red-600 text-2xl">
                    Rs. {parseFloat(selectedChallan.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Close
                </button>
                <button
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
