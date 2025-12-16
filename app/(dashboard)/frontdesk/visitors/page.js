'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  X, Plus, Search, Users, Mail, Edit, Trash2, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronDown, Download, FileSpreadsheet, Upload
} from 'lucide-react'

export default function VisitorsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [visitors, setVisitors] = useState([])
  const [filteredVisitors, setFilteredVisitors] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('Via General Data')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVisitor, setEditingVisitor] = useState(null)

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

  // Form state
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_mobile: '',
    destination: '',
    time_in: '',
    time_out: '',
    visit_details: ''
  })

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm
    })
  }

  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm()
    }
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

  const handleCancelConfirm = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

  const showToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Search options
  const searchOptions = [
    'Via General Data',
    'Via Name',
    'Via Mobile',
    'Via Destination'
  ]

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
    }

    const userData = getCookie('user-data')
    if (userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData))
        setCurrentUser(user)
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchVisitors()
    }
  }, [currentUser])

  const fetchVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('visit_date', { ascending: false })
        .order('time_in', { ascending: false })

      if (error) throw error
      setVisitors(data || [])
      setFilteredVisitors(data || [])
    } catch (error) {
      console.error('Error fetching visitors:', error)
    }
  }

  const handleSearch = () => {
    let filtered = [...visitors]

    // Apply date filters
    if (fromDate) {
      filtered = filtered.filter(v => new Date(v.visit_date) >= new Date(fromDate))
    }

    if (toDate) {
      filtered = filtered.filter(v => new Date(v.visit_date) <= new Date(toDate))
    }

    // Apply search filter based on type
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      switch (searchType) {
        case 'Via Name':
          filtered = filtered.filter(v => v.visitor_name?.toLowerCase().includes(query))
          break
        case 'Via Mobile':
          filtered = filtered.filter(v => v.visitor_mobile?.includes(searchQuery))
          break
        case 'Via Destination':
          filtered = filtered.filter(v => v.destination?.toLowerCase().includes(query))
          break
        case 'Via General Data':
        default:
          filtered = filtered.filter(v =>
            v.visitor_name?.toLowerCase().includes(query) ||
            v.destination?.toLowerCase().includes(query) ||
            v.visitor_mobile?.includes(searchQuery)
          )
          break
      }
    }

    setFilteredVisitors(filtered)
  }

  const handleSaveVisitor = async () => {
    if (!formData.visitor_name || !formData.visitor_mobile || !formData.destination || !formData.time_in) {
      showToast('Please fill all required fields', 'error')
      return
    }

    setSaving(true)
    try {
      const visitorData = {
        ...formData,
        school_id: currentUser.school_id,
        visit_date: new Date().toISOString().split('T')[0],
        // Convert empty strings to null for time fields
        time_out: formData.time_out || null
      }

      if (editingVisitor) {
        const { error } = await supabase
          .from('visitors')
          .update(visitorData)
          .eq('id', editingVisitor.id)

        if (error) throw error
        showToast('Visitor updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('visitors')
          .insert([visitorData])

        if (error) throw error
        showToast('Visitor added successfully', 'success')
      }

      setShowAddModal(false)
      setEditingVisitor(null)
      resetForm()
      fetchVisitors()
    } catch (error) {
      console.error('Error saving visitor:', error)
      showToast('Failed to save visitor', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkLeft = async (visitor) => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })

      const { error } = await supabase
        .from('visitors')
        .update({ time_out: currentTime })
        .eq('id', visitor.id)

      if (error) throw error
      showToast('Time out marked successfully', 'success')
      fetchVisitors()
    } catch (error) {
      console.error('Error marking time out:', error)
      showToast('Failed to mark time out', 'error')
    }
  }

  const handleDeleteVisitor = (id) => {
    showConfirmDialog(
      'Delete Visitor Entry',
      'Are you sure you want to delete this visitor entry? This action cannot be undone.',
      async () => {
        try {
          const { error } = await supabase
            .from('visitors')
            .delete()
            .eq('id', id)

          if (error) throw error
          showToast('Visitor deleted successfully', 'success')
          fetchVisitors()
        } catch (error) {
          console.error('Error deleting visitor:', error)
          showToast('Failed to delete visitor', 'error')
        }
      }
    )
  }

  const handleEditVisitor = (visitor) => {
    setEditingVisitor(visitor)
    setFormData({
      visitor_name: visitor.visitor_name || '',
      visitor_mobile: visitor.visitor_mobile || '',
      destination: visitor.destination || '',
      time_in: visitor.time_in || '',
      time_out: visitor.time_out || '',
      visit_details: visitor.visit_details || ''
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      visitor_name: '',
      visitor_mobile: '',
      destination: '',
      time_in: '',
      time_out: '',
      visit_details: ''
    })
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  // Apply blur effect to sidebar when modals are open
  useEffect(() => {
    if (showAddModal || confirmDialog.show) {
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
  }, [showAddModal, confirmDialog.show])

  return (
    <div className="p-1">

      {/* Header Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <button
          onClick={() => {
            setEditingVisitor(null)
            resetForm()
            setFormData({ ...formData, time_in: getCurrentTime() })
            setShowAddModal(true)
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add New Visitor
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Search Type Dropdown */}
          <div className="relative min-w-[150px]">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 bg-white text-sm"
            >
              {searchOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Date Filters */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition text-sm"
          >
            Search
            <Search className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 pt-3 border-t border-gray-200 text-gray-600 text-sm">
          Showing <span className="text-blue-600 font-semibold">{filteredVisitors.length}</span> of <span className="text-blue-600 font-semibold">{visitors.length}</span> visitors
        </p>
      </div>

      {/* Visitors Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Loading visitors...</div>
        ) : filteredVisitors.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No visitors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600 text-white text-sm">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Sr.</th>
                  <th className="px-3 py-2 text-left font-semibold">Visitor Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Destination</th>
                  <th className="px-3 py-2 text-left font-semibold">Time In</th>
                  <th className="px-3 py-2 text-left font-semibold">Time Out</th>
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Options</th>
                </tr>
              </thead>
            <tbody>
              {filteredVisitors.map((visitor, index) => (
                <tr key={visitor.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{index + 1}</td>
                  <td className="px-3 py-2 text-sm font-medium">{visitor.visitor_name}</td>
                  <td className="px-3 py-2 text-sm">{visitor.destination}</td>
                  <td className="px-3 py-2 text-sm">{visitor.time_in}</td>
                  <td className="px-3 py-2 text-sm">
                    {visitor.time_out ? (
                      visitor.time_out
                    ) : (
                      <span className="text-blue-600 font-medium">Mark Left</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {visitor.visit_date ? new Date(visitor.visit_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button className="text-green-500 hover:text-green-600 p-1" title="Send Message">
                        
                      </button>
                      {!visitor.time_out && (
                        <button
                          onClick={() => handleMarkLeft(visitor)}
                          className="text-orange-500 hover:text-orange-600 p-1"
                          title="Mark Time Out"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditVisitor(visitor)}
                        className="text-blue-500 hover:text-blue-600 p-1"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVisitor(visitor.id)}
                        className="text-red-500 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Add/Edit Visitor Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-semibold">
                {editingVisitor ? 'Edit Visitor' : 'Register New Visitor'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingVisitor(null)
                  resetForm()
                }}
                className="hover:bg-blue-800 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visitor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.visitor_name}
                    onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visitor Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.visitor_mobile}
                    onChange={(e) => setFormData({ ...formData, visitor_mobile: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Mobile Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Whom to meet?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time In <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time_in}
                    onChange={(e) => setFormData({ ...formData, time_in: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Out
                  </label>
                  <input
                    type="time"
                    value={formData.time_out}
                    onChange={(e) => setFormData({ ...formData, time_out: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visit Details
                  </label>
                  <textarea
                    value={formData.visit_details}
                    onChange={(e) => setFormData({ ...formData, visit_details: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows="3"
                    placeholder="Visit Details"
                  />
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white z-10">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingVisitor(null)
                  resetForm()
                }}
                className="text-gray-700 hover:text-gray-900 font-medium px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
              >
                Close
              </button>
              <button
                onClick={handleSaveVisitor}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded font-medium flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {saving ? 'Saving...' : editingVisitor ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center" onClick={handleCancelConfirm}>
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-t-lg">
                <h3 className="text-base font-semibold">{confirmDialog.title}</h3>
              </div>
              <div className="p-5">
                <p className="text-gray-700 text-sm">{confirmDialog.message}</p>
              </div>
              <div className="px-5 pb-5 flex justify-end gap-2">
                <button
                  onClick={handleCancelConfirm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 min-w-[320px] max-w-md px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-blue-500' :
              toast.type === 'error' ? 'bg-blue-600' :
              toast.type === 'warning' ? 'bg-blue-500' :
              'bg-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
