'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  X, Plus, Search, FileText, Edit, Trash2, Calendar, Phone, Mail, User,
  CheckCircle, XCircle, AlertCircle, ChevronDown, Download, FileSpreadsheet, Upload, UserCheck
} from 'lucide-react'

export default function AdmissionInquiryPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [inquiries, setInquiries] = useState([])
  const [filteredInquiries, setFilteredInquiries] = useState([])
  const [sessions, setSessions] = useState([])
  const [classes, setClasses] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('Via General Data')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingInquiry, setEditingInquiry] = useState(null)
  const [activeTab, setActiveTab] = useState('basic')

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

  // Form state
  const [formData, setFormData] = useState({
    inquiry_no: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    gender: '',
    date_of_birth: '',
    session_id: '',
    class_id: '',
    father_name: '',
    father_mobile: '',
    father_cnic: '',
    father_qualification: '',
    father_profession: '',
    mother_name: '',
    mother_mobile: '',
    mother_cnic: '',
    mother_qualification: '',
    mother_profession: '',
    blood_group: '',
    region: '',
    current_address: '',
    previous_school: '',
    inquiry_source: '',
    date: new Date().toISOString().split('T')[0],
    follow_up_date: '',
    note: '',
    reference: '',
    status: 'pending'
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
    'Via Phone',
    'Via Email',
    'Via Inquiry No'
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
      fetchSessions()
      fetchClasses()
      fetchInquiries()
      generateInquiryNo()
    }
  }, [currentUser])

  const generateInquiryNo = async () => {
    try {
      const { count } = await supabase
        .from('admission_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', currentUser.school_id)

      const nextNo = (count || 0) + 1
      setFormData(prev => ({ ...prev, inquiry_no: `INQ-${String(nextNo).padStart(5, '0')}` }))
    } catch (error) {
      console.error('Error generating inquiry number:', error)
    }
  }

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('order_number')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchInquiries = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('admission_inquiries')
        .select(`
          *,
          sessions (id, name),
          classes (id, class_name)
        `)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setInquiries(data || [])
      setFilteredInquiries(data || [])
    } catch (error) {
      console.error('Error fetching inquiries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    let filtered = [...inquiries]

    // Apply status filter
    if (statusFilter && statusFilter !== '') {
      filtered = filtered.filter(i => i.status === statusFilter)
    }

    // Apply search filter based on type
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      switch (searchType) {
        case 'Via Name':
          filtered = filtered.filter(i => i.name?.toLowerCase().includes(query))
          break
        case 'Via Phone':
          filtered = filtered.filter(i => i.phone?.includes(searchQuery))
          break
        case 'Via Email':
          filtered = filtered.filter(i => i.email?.toLowerCase().includes(query))
          break
        case 'Via Inquiry No':
          filtered = filtered.filter(i => i.inquiry_no?.toLowerCase().includes(query))
          break
        case 'Via General Data':
        default:
          filtered = filtered.filter(i =>
            i.name?.toLowerCase().includes(query) ||
            i.phone?.includes(searchQuery) ||
            i.email?.toLowerCase().includes(query) ||
            i.inquiry_no?.toLowerCase().includes(query)
          )
          break
      }
    }

    setFilteredInquiries(filtered)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      inquiry_no: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      gender: '',
      date_of_birth: '',
      session_id: '',
      class_id: '',
      father_name: '',
      father_mobile: '',
      father_cnic: '',
      father_qualification: '',
      father_profession: '',
      mother_name: '',
      mother_mobile: '',
      mother_cnic: '',
      mother_qualification: '',
      mother_profession: '',
      blood_group: '',
      region: '',
      current_address: '',
      previous_school: '',
      inquiry_source: '',
      date: new Date().toISOString().split('T')[0],
      follow_up_date: '',
      note: '',
      reference: '',
      status: 'pending'
    })
    generateInquiryNo()
  }

  const handleSaveInquiry = async () => {
    if (!formData.name || !formData.phone || !formData.inquiry_no) {
      showToast('Please fill all required fields', 'error')
      return
    }

    setSaving(true)
    try {
      const inquiryData = {
        ...formData,
        school_id: currentUser.school_id,
        created_by: currentUser.id,
        // Convert empty strings to null for optional fields
        session_id: formData.session_id || null,
        class_id: formData.class_id || null,
        email: formData.email || null,
        address: formData.address || null,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        father_name: formData.father_name || null,
        father_mobile: formData.father_mobile || null,
        father_cnic: formData.father_cnic || null,
        father_qualification: formData.father_qualification || null,
        father_profession: formData.father_profession || null,
        mother_name: formData.mother_name || null,
        mother_mobile: formData.mother_mobile || null,
        mother_cnic: formData.mother_cnic || null,
        mother_qualification: formData.mother_qualification || null,
        mother_profession: formData.mother_profession || null,
        blood_group: formData.blood_group || null,
        region: formData.region || null,
        current_address: formData.current_address || null,
        previous_school: formData.previous_school || null,
        inquiry_source: formData.inquiry_source || null,
        follow_up_date: formData.follow_up_date || null,
        note: formData.note || null,
        reference: formData.reference || null
      }

      if (editingInquiry) {
        const { error } = await supabase
          .from('admission_inquiries')
          .update(inquiryData)
          .eq('id', editingInquiry.id)

        if (error) throw error
        showToast('Inquiry updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('admission_inquiries')
          .insert([inquiryData])

        if (error) throw error
        showToast('Inquiry added successfully', 'success')
      }

      setShowAddModal(false)
      setEditingInquiry(null)
      resetForm()
      fetchInquiries()
    } catch (error) {
      console.error('Error saving inquiry:', error)
      showToast(error.message || 'Failed to save inquiry', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditInquiry = (inquiry) => {
    setEditingInquiry(inquiry)
    setFormData({
      inquiry_no: inquiry.inquiry_no || '',
      name: inquiry.name || '',
      phone: inquiry.phone || '',
      email: inquiry.email || '',
      address: inquiry.address || '',
      gender: inquiry.gender || '',
      date_of_birth: inquiry.date_of_birth || '',
      session_id: inquiry.session_id || '',
      class_id: inquiry.class_id || '',
      father_name: inquiry.father_name || '',
      father_mobile: inquiry.father_mobile || '',
      father_cnic: inquiry.father_cnic || '',
      father_qualification: inquiry.father_qualification || '',
      father_profession: inquiry.father_profession || '',
      mother_name: inquiry.mother_name || '',
      mother_mobile: inquiry.mother_mobile || '',
      mother_cnic: inquiry.mother_cnic || '',
      mother_qualification: inquiry.mother_qualification || '',
      mother_profession: inquiry.mother_profession || '',
      blood_group: inquiry.blood_group || '',
      region: inquiry.region || '',
      current_address: inquiry.current_address || '',
      previous_school: inquiry.previous_school || '',
      inquiry_source: inquiry.inquiry_source || '',
      date: inquiry.date || new Date().toISOString().split('T')[0],
      follow_up_date: inquiry.follow_up_date || '',
      note: inquiry.note || '',
      reference: inquiry.reference || '',
      status: inquiry.status || 'pending'
    })
    setShowAddModal(true)
  }

  const handleDeleteInquiry = (id) => {
    showConfirmDialog(
      'Delete Inquiry',
      'Are you sure you want to delete this inquiry? This action cannot be undone.',
      async () => {
        try {
          const { error } = await supabase
            .from('admission_inquiries')
            .delete()
            .eq('id', id)

          if (error) throw error
          showToast('Inquiry deleted successfully', 'success')
          fetchInquiries()
        } catch (error) {
          console.error('Error deleting inquiry:', error)
          showToast('Failed to delete inquiry', 'error')
        }
      }
    )
  }

  const handleConfirmAdmission = (inquiry) => {
    showConfirmDialog(
      'Confirm Admission',
      `Are you sure you want to confirm admission for ${inquiry.name}? This will create a student record.`,
      async () => {
        try {
          setSaving(true)

          // Create student record from inquiry data
          const studentData = {
            school_id: currentUser.school_id,
            created_by: currentUser.id,
            admission_no: `ADM-${Date.now()}`, // Generate admission number
            name: inquiry.name,
            gender: inquiry.gender,
            date_of_birth: inquiry.date_of_birth,
            blood_group: inquiry.blood_group,
            phone: inquiry.phone,
            email: inquiry.email,
            address: inquiry.address,
            current_address: inquiry.current_address,
            class_id: inquiry.class_id,
            session_id: inquiry.session_id,
            father_name: inquiry.father_name,
            father_mobile: inquiry.father_mobile,
            father_cnic: inquiry.father_cnic,
            father_qualification: inquiry.father_qualification,
            father_profession: inquiry.father_profession,
            mother_name: inquiry.mother_name,
            mother_mobile: inquiry.mother_mobile,
            mother_cnic: inquiry.mother_cnic,
            mother_qualification: inquiry.mother_qualification,
            mother_profession: inquiry.mother_profession,
            previous_school: inquiry.previous_school,
            admission_date: new Date().toISOString().split('T')[0],
            status: 'active'
          }

          // Insert student record
          const { error: studentError } = await supabase
            .from('students')
            .insert([studentData])

          if (studentError) throw studentError

          // Update inquiry status to admitted
          const { error: updateError } = await supabase
            .from('admission_inquiries')
            .update({ status: 'admitted' })
            .eq('id', inquiry.id)

          if (updateError) throw updateError

          showToast('Admission confirmed successfully! Student record created.', 'success')
          fetchInquiries()
        } catch (error) {
          console.error('Error confirming admission:', error)
          showToast('Failed to confirm admission: ' + error.message, 'error')
        } finally {
          setSaving(false)
        }
      }
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'contacted': return 'bg-blue-100 text-blue-800'
      case 'visited': return 'bg-purple-100 text-purple-800'
      case 'admitted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
            setEditingInquiry(null)
            resetForm()
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Inquiry
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

          {/* Status Filter */}
          <div className="min-w-[140px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="visited">Visited</option>
              <option value="admitted">Admitted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

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
          Showing <span className="text-blue-600 font-semibold">{filteredInquiries.length}</span> of <span className="text-blue-600 font-semibold">{inquiries.length}</span> inquiries
        </p>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Loading inquiries...</div>
        ) : filteredInquiries.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No inquiries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600 text-white text-sm">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Inquiry No</th>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Phone</th>
                  <th className="px-3 py-2 text-left font-semibold">Class</th>
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Follow Up</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map(inquiry => (
                  <tr key={inquiry.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium">
                      {inquiry.inquiry_no}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900">{inquiry.name}</div>
                      {inquiry.email && <div className="text-xs text-gray-500">{inquiry.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {inquiry.phone}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {inquiry.classes?.class_name || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {new Date(inquiry.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {inquiry.follow_up_date ? new Date(inquiry.follow_up_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {inquiry.status !== 'admitted' && (
                          <button
                            onClick={() => handleConfirmAdmission(inquiry)}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Confirm Admission"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditInquiry(inquiry)}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInquiry(inquiry.id)}
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

      {/* Add/Edit Modal - Compact Tabbed Design */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingInquiry ? 'Edit Inquiry' : 'Add New Inquiry'}
              </h2>
              <button onClick={() => {
                setShowAddModal(false)
                setEditingInquiry(null)
                resetForm()
                setActiveTab('basic')
              }} className="hover:bg-blue-800 p-1 rounded transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-4">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  activeTab === 'basic'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('parents')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  activeTab === 'parents'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Parents Info
              </button>
              <button
                onClick={() => setActiveTab('academic')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  activeTab === 'academic'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Academic
              </button>
              <button
                onClick={() => setActiveTab('other')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  activeTab === 'other'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Other Details
              </button>
            </div>

            {/* Tab Content - Fixed Height with Internal Scroll if needed */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Basic Information Tab */}
              {activeTab === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Inquiry No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.inquiry_no}
                      onChange={(e) => handleInputChange('inquiry_no', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      disabled={editingInquiry}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Blood Group</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => handleInputChange('blood_group', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Current Address</label>
                    <textarea
                      value={formData.current_address}
                      onChange={(e) => handleInputChange('current_address', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Parents Information Tab */}
              {activeTab === 'parents' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">Father Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Father Name</label>
                        <input
                          type="text"
                          value={formData.father_name}
                          onChange={(e) => handleInputChange('father_name', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Father Mobile</label>
                        <input
                          type="tel"
                          value={formData.father_mobile}
                          onChange={(e) => handleInputChange('father_mobile', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Father CNIC</label>
                        <input
                          type="text"
                          value={formData.father_cnic}
                          onChange={(e) => handleInputChange('father_cnic', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Father Qualification</label>
                        <input
                          type="text"
                          value={formData.father_qualification}
                          onChange={(e) => handleInputChange('father_qualification', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Father Profession</label>
                        <input
                          type="text"
                          value={formData.father_profession}
                          onChange={(e) => handleInputChange('father_profession', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-pink-50 p-3 rounded">
                    <h4 className="text-sm font-semibold text-pink-900 mb-3">Mother Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mother Name</label>
                        <input
                          type="text"
                          value={formData.mother_name}
                          onChange={(e) => handleInputChange('mother_name', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mother Mobile</label>
                        <input
                          type="tel"
                          value={formData.mother_mobile}
                          onChange={(e) => handleInputChange('mother_mobile', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mother CNIC</label>
                        <input
                          type="text"
                          value={formData.mother_cnic}
                          onChange={(e) => handleInputChange('mother_cnic', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mother Qualification</label>
                        <input
                          type="text"
                          value={formData.mother_qualification}
                          onChange={(e) => handleInputChange('mother_qualification', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mother Profession</label>
                        <input
                          type="text"
                          value={formData.mother_profession}
                          onChange={(e) => handleInputChange('mother_profession', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Academic Information Tab */}
              {activeTab === 'academic' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Session</label>
                    <select
                      value={formData.session_id}
                      onChange={(e) => handleInputChange('session_id', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Session</option>
                      {sessions.map(session => (
                        <option key={session.id} value={session.id}>{session.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
                    <select
                      value={formData.class_id}
                      onChange={(e) => handleInputChange('class_id', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Previous School</label>
                    <input
                      type="text"
                      value={formData.previous_school}
                      onChange={(e) => handleInputChange('previous_school', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Other Details Tab */}
              {activeTab === 'other' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => handleInputChange('region', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Inquiry Source</label>
                    <input
                      type="text"
                      value={formData.inquiry_source}
                      onChange={(e) => handleInputChange('inquiry_source', e.target.value)}
                      placeholder="e.g., Website, Referral"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Reference</label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => handleInputChange('reference', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Inquiry Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up Date</label>
                    <input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => handleInputChange('follow_up_date', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="visited">Visited</option>
                      <option value="admitted">Admitted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => handleInputChange('note', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add any additional notes..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingInquiry(null)
                  resetForm()
                  setActiveTab('basic')
                }}
                className="text-gray-700 hover:text-gray-900 font-medium px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
              >
                Close
              </button>
              <button
                onClick={handleSaveInquiry}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {saving ? 'Saving...' : editingInquiry ? 'Update Inquiry' : 'Save Inquiry'}
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
