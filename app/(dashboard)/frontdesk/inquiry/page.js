'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import {
  X, Plus, Search, FileText, Edit, Trash2, Calendar, Phone, Mail, User,
  CheckCircle, XCircle, AlertCircle, ChevronDown, Download, FileSpreadsheet, Upload, UserCheck
} from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardGrid, CardInfoGrid } from '@/components/DataCard'

// Modal Overlay Component - Uses Portal to render at document body level
const ModalOverlay = ({ children, onClose }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[99998]"
        style={{
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
        onClick={onClose}
      />
      {children}
    </>,
    document.body
  )
}

function AdmissionInquiryContent() {
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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [inquiryToDelete, setInquiryToDelete] = useState(null)

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
        user_id: currentUser.id,
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

  const handleDeleteInquiry = (inquiry) => {
    setInquiryToDelete(inquiry)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!inquiryToDelete) return

    try {
      const { error } = await supabase
        .from('admission_inquiries')
        .delete()
        .eq('id', inquiryToDelete.id)

      if (error) throw error
      showToast('Inquiry deleted successfully', 'success')
      fetchInquiries()
    } catch (error) {
      console.error('Error deleting inquiry:', error)
      showToast('Failed to delete inquiry', 'error')
    } finally {
      setShowDeleteModal(false)
      setInquiryToDelete(null)
    }
  }

  const handleConfirmAdmission = async (inquiry) => {
    try {
      setSaving(true)

      // Create student record from inquiry data
      const studentData = {
        school_id: currentUser.school_id,
        user_id: currentUser.id,
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
    if (showAddModal || showDeleteModal) {
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
  }, [showAddModal, showDeleteModal])

  return (
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4">
      {/* Header Actions */}
      <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 md:p-4 mb-2 sm:mb-3">
        <div className="btn-row-mobile">
          <button
            onClick={() => {
              setEditingInquiry(null)
              resetForm()
              setShowAddModal(true)
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-red-500 hover:bg-red-600 text-white py-1.5 sm:py-2 px-3 rounded font-medium transition text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Add Inquiry
          </button>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 md:p-4 mb-2 sm:mb-3">
        <div className="filter-row-mobile">
          {/* Search Type Dropdown */}
          <div className="relative">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded py-1.5 sm:py-2 px-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 bg-white text-sm sm:text-base"
            >
              {searchOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="sm:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full border border-gray-300 rounded pl-9 sm:pl-10 pr-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded py-1.5 sm:py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base"
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
            className="sm:col-span-2 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-1.5 sm:py-2 px-3 rounded font-medium transition text-xs sm:text-sm"
          >
            Search
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <p className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 text-gray-600 text-xs sm:text-sm">
          Showing <span className="text-blue-600 font-semibold">{filteredInquiries.length}</span> of <span className="text-blue-600 font-semibold">{inquiries.length}</span> inquiries
        </p>
      </div>

      {/* Inquiries Table/Cards */}
      <ResponsiveTableWrapper
        loading={loading}
        empty={filteredInquiries.length === 0}
        emptyMessage="No inquiries found"
        tableView={
          <table className="w-full min-w-[700px] border-collapse">
            <thead className="bg-blue-900 text-white text-xs sm:text-sm">
              <tr>
                <th className="border border-blue-800 px-3 sm:px-4 py-2 sm:py-2.5 text-left font-semibold border-r border-blue-800 whitespace-nowrap">Inquiry No</th>
                <th className="border border-blue-800 px-3 sm:px-4 py-2 sm:py-2.5 text-left font-semibold border-r border-blue-800 whitespace-nowrap">Name</th>
                <th className="border border-blue-800 px-3 sm:px-4 py-2 sm:py-2.5 text-left font-semibold border-r border-blue-800 whitespace-nowrap">Phone</th>
                <th className="border border-blue-800 px-3 sm:px-4 py-2 sm:py-2.5 text-left font-semibold border-r border-blue-800 whitespace-nowrap">Class</th>
                <th className="border border-blue-800 px-3 sm:px-4 py-2 sm:py-2.5 text-left font-semibold border-r border-blue-800 whitespace-nowrap">Date</th>
                <th className="border border-blue-800 px-3 sm:px-4 py-2 sm:py-2.5 text-left font-semibold border-r border-blue-800 whitespace-nowrap">Follow Up</th>
                <th className="border border-blue-800 px-3 sm:px-4 py-2 sm:py-2.5 text-left font-semibold border-r border-blue-800 whitespace-nowrap">Status</th>
                <th className="border border-blue-800 px-3 sm:px-4 py-2 sm:py-2.5 text-left font-semibold whitespace-nowrap">Options</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map(inquiry => (
                <tr key={inquiry.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-r border-gray-200 whitespace-nowrap">
                    {inquiry.inquiry_no}
                  </td>
                  <td className="border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 border-r border-gray-200 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{inquiry.name}</div>
                    {inquiry.email && <div className="text-[10px] sm:text-xs text-gray-500">{inquiry.email}</div>}
                  </td>
                  <td className="border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-500 border-r border-gray-200 whitespace-nowrap">
                    {inquiry.phone}
                  </td>
                  <td className="border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-500 border-r border-gray-200 whitespace-nowrap">
                    {inquiry.classes?.class_name || '-'}
                  </td>
                  <td className="border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-500 border-r border-gray-200 whitespace-nowrap">
                    {new Date(inquiry.date).toLocaleDateString()}
                  </td>
                  <td className="border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-500 border-r border-gray-200 whitespace-nowrap">
                    {inquiry.follow_up_date ? new Date(inquiry.follow_up_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 border-r border-gray-200 whitespace-nowrap">
                    <span className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-full ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {inquiry.status !== 'admitted' && (
                        <button
                          onClick={() => handleConfirmAdmission(inquiry)}
                          className="text-green-600 hover:text-green-700 p-1 sm:p-1.5"
                          title="Confirm Admission"
                        >
                          <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditInquiry(inquiry)}
                        className="text-blue-500 hover:text-blue-600 p-1 sm:p-1.5"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteInquiry(inquiry)}
                        className="text-red-500 hover:text-red-600 p-1 sm:p-1.5"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cardView={
          <CardGrid>
            {filteredInquiries.map((inquiry, index) => (
              <DataCard key={inquiry.id}>
                <CardHeader
                  srNumber={index + 1}
                  name={inquiry.name}
                  badge={
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  }
                />

                <CardInfoGrid>
                  <CardRow label="Phone" value={inquiry.phone || '-'} />
                  <CardRow label="Class" value={inquiry.classes?.class_name || '-'} />
                  <CardRow label="Inquiry#" value={inquiry.inquiry_no} />
                  <CardRow label="Date" value={new Date(inquiry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })} />
                </CardInfoGrid>

                <CardActions>
                  {inquiry.status !== 'admitted' && (
                    <button
                      onClick={() => handleConfirmAdmission(inquiry)}
                      className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100 transition"
                      title="Confirm Admission"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditInquiry(inquiry)}
                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteInquiry(inquiry)}
                    className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </CardActions>
              </DataCard>
            ))}
          </CardGrid>
        }
      />

      {/* Add/Edit Modal - Compact Tabbed Design */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 sm:top-0 sm:right-0 sm:left-auto sm:bottom-auto h-full w-full sm:max-w-md md:max-w-lg xl:max-w-2xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold">
                {editingInquiry ? 'Edit Inquiry' : 'Add New Inquiry'}
              </h2>
              <button onClick={() => {
                setShowAddModal(false)
                setEditingInquiry(null)
                resetForm()
                setActiveTab('basic')
              }} className="hover:bg-blue-800 p-1.5 sm:p-2 rounded transition">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap border-b border-gray-200 bg-gray-50 px-2 sm:px-3 md:px-4">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium border-b-2 transition ${
                  activeTab === 'basic'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab('parents')}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium border-b-2 transition ${
                  activeTab === 'parents'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Parents Info
              </button>
              <button
                onClick={() => setActiveTab('academic')}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium border-b-2 transition ${
                  activeTab === 'academic'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Academic
              </button>
              <button
                onClick={() => setActiveTab('other')}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium border-b-2 transition ${
                  activeTab === 'other'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Other Details
              </button>
            </div>

            {/* Tab Content - Fixed Height with Internal Scroll if needed */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {/* Basic Information Tab */}
              {activeTab === 'basic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Inquiry No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.inquiry_no}
                      onChange={(e) => handleInputChange('inquiry_no', e.target.value)}
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      disabled={editingInquiry}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Blood Group</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => handleInputChange('blood_group', e.target.value)}
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Current Address</label>
                    <textarea
                      value={formData.current_address}
                      onChange={(e) => handleInputChange('current_address', e.target.value)}
                      rows="2"
                      className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Parents Information Tab */}
              {activeTab === 'parents' && (
                <div className="space-y-4 sm:space-y-5">
                  <div className="bg-blue-50 p-3 sm:p-4 md:p-5 rounded">
                    <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-3 sm:mb-4">Father Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Father Name</label>
                        <input
                          type="text"
                          value={formData.father_name}
                          onChange={(e) => handleInputChange('father_name', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Father Mobile</label>
                        <input
                          type="tel"
                          value={formData.father_mobile}
                          onChange={(e) => handleInputChange('father_mobile', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Father CNIC</label>
                        <input
                          type="text"
                          value={formData.father_cnic}
                          onChange={(e) => handleInputChange('father_cnic', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Father Qualification</label>
                        <input
                          type="text"
                          value={formData.father_qualification}
                          onChange={(e) => handleInputChange('father_qualification', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Father Profession</label>
                        <input
                          type="text"
                          value={formData.father_profession}
                          onChange={(e) => handleInputChange('father_profession', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-pink-50 p-3 sm:p-4 md:p-5 rounded">
                    <h4 className="text-xs sm:text-sm font-semibold text-pink-900 mb-3 sm:mb-4">Mother Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Mother Name</label>
                        <input
                          type="text"
                          value={formData.mother_name}
                          onChange={(e) => handleInputChange('mother_name', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Mother Mobile</label>
                        <input
                          type="tel"
                          value={formData.mother_mobile}
                          onChange={(e) => handleInputChange('mother_mobile', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Mother CNIC</label>
                        <input
                          type="text"
                          value={formData.mother_cnic}
                          onChange={(e) => handleInputChange('mother_cnic', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Mother Qualification</label>
                        <input
                          type="text"
                          value={formData.mother_qualification}
                          onChange={(e) => handleInputChange('mother_qualification', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Mother Profession</label>
                        <input
                          type="text"
                          value={formData.mother_profession}
                          onChange={(e) => handleInputChange('mother_profession', e.target.value)}
                          className="w-full py-1.5 sm:py-2 px-3 text-sm sm:text-base border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Academic Information Tab */}
              {activeTab === 'academic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
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
                  <div className="sm:col-span-2 lg:col-span-3">
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
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingInquiry(null)
                  resetForm()
                  setActiveTab('basic')
                }}
                className="w-full sm:w-auto text-gray-700 hover:text-gray-900 font-medium px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
              >
                Close
              </button>
              <button
                onClick={handleSaveInquiry}
                disabled={saving}
                className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {saving ? 'Saving...' : editingInquiry ? 'Update Inquiry' : 'Save Inquiry'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && inquiryToDelete && (
        <ModalOverlay onClose={() => setShowDeleteModal(false)}>
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full sm:max-w-md bg-white rounded-lg shadow-2xl z-[99999]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 sm:px-4 py-3 sm:py-4 rounded-t-lg">
              <h3 className="text-sm sm:text-base font-semibold">Confirm Delete</h3>
            </div>
            <div className="p-3 sm:p-4">
              <p className="text-gray-700 text-xs sm:text-sm">
                Are you sure you want to delete the inquiry for <strong>{inquiryToDelete.name}</strong> (Inquiry No: {inquiryToDelete.inquiry_no})? This action cannot be undone.
              </p>
            </div>
            <div className="px-3 sm:px-4 lg:px-6 pb-4 sm:pb-5 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:w-auto py-1.5 sm:py-2 px-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="w-full sm:w-auto py-1.5 sm:py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 w-[calc(100%-2rem)] sm:w-auto">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 sm:gap-3 min-w-0 sm:min-w-[320px] max-w-full sm:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-orange-500' :
              'bg-gray-500'
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

export default function AdmissionInquiryPage() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const user = getUserFromCookie()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="frontdesk_inquiry_view"
      pageName="Inquiry"
    >
      <AdmissionInquiryContent />
    </PermissionGuard>
  )
}
