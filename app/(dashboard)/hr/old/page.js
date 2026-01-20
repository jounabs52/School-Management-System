'use client'

import { useState, useEffect } from 'react'
import {
  Search, Filter, Download, FileSpreadsheet,
  Edit, Trash2, ChevronDown, X, User, CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { convertImageToBase64, addPDFHeader, addPDFFooter } from '@/lib/pdfUtils'
import { getPdfSettings, getAutoTableStyles } from '@/lib/pdfSettings'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

function OldStaffContent() {
  const [searchType, setSearchType] = useState('Via General Data')
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAdvanceSearch, setShowAdvanceSearch] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [statusDropdownId, setStatusDropdownId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [toasts, setToasts] = useState([])
  const [showCustomDepartment, setShowCustomDepartment] = useState(false)
  const [customDepartment, setCustomDepartment] = useState('')

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

  // Form state matching Supabase staff table fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    religion: '',
    nationality: 'Pakistan',
    phone: '',
    email: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    joiningDate: '',
    designation: '',
    department: '',
    qualification: '',
    experienceYears: '',
    employmentType: 'permanent',
    maritalStatus: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  })

  // Filter states
  const [filters, setFilters] = useState({
    employmentType: '',
    designation: '',
    department: '',
    gender: ''
  })

  // Staff data from Supabase
  const [staffData, setStaffData] = useState([])
  const [filteredStaffData, setFilteredStaffData] = useState([])

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
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

  // Toast notification function
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

  // Get current user from cookie
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

  const searchOptions = [
    'Via General Data',
    'Via Name',
    'Via Computer Number',
    'Via Email',
    'Via Mobile',
    'Via C.N.I.C #',
    'Via Staff ID',
    'Via Biometric ID'
  ]

  // Status options for Old Staff
  const statusOptions = [
    { value: 'active', label: 'Active', color: 'bg-green-500' }
  ]

  // Department options
  const departmentOptions = [
    'ACADEMIC',
    'ACCOUNTS',
    'ADMIN',
    'POLITICAL',
    'SPORTS',
    'SUPPORTING STAFF',
    'TEACHING',
    'Other'
  ]

  // Fetch OLD/DISABLED staff data from Supabase
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchStaffData()
      fetchSchoolData()
    }
  }, [currentUser])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusDropdownId !== null) {
        setStatusDropdownId(null)
      }
    }

    if (statusDropdownId !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [statusDropdownId])

  // Auto search when query changes
  useEffect(() => {
    // Only run search if staff data is loaded
    if (staffData.length === 0 && !searchQuery) {
      return
    }

    handleSearch()
  }, [searchQuery, searchType, staffData])

  // Apply blur effect to sidebar and disable background scrolling when modals are open
  useEffect(() => {
    const isModalOpen = showEditModal || showAdvanceSearch || confirmDialog.show
    if (isModalOpen) {
      // Disable body scrolling
      document.body.style.overflow = 'hidden'

      // Blur only the sidebar
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = 'blur(4px)'
        sidebar.style.pointerEvents = 'none'
      }
    } else {
      // Remove blur and enable interactions
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
  }, [showEditModal, showAdvanceSearch, confirmDialog.show])

  const fetchStaffData = async () => {
    if (!currentUser?.school_id) return

    try {
      setLoading(true)
      // Fetch staff with status NOT 'active' (disabled, inactive, terminated, transferred, resigned)
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .neq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = (data || []).map((staff) => ({
        id: staff.id,
        name: `${staff.first_name} ${staff.last_name || ''}`.trim(),
        employeeNumber: staff.employee_number,
        designation: staff.designation || 'N/A',
        phone: staff.phone || 'N/A',
        department: staff.department || 'N/A',
        status: staff.status?.toUpperCase() || 'DISABLED',
        originalData: staff
      }))

      setStaffData(formattedData)
      setFilteredStaffData(formattedData)
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchoolData = async () => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error
      setSchoolData(data)
    } catch (error) {
      console.error('Error fetching school data:', error)
    }
  }

  const handleEdit = (staff) => {
    setEditingStaff(staff)
    const original = staff.originalData || {}
    setFormData({
      firstName: original.first_name || '',
      lastName: original.last_name || '',
      fatherName: original.father_name || '',
      dateOfBirth: original.date_of_birth || '',
      gender: original.gender || 'male',
      bloodGroup: original.blood_group || '',
      religion: original.religion || '',
      nationality: original.nationality || 'Pakistan',
      phone: original.phone || '',
      email: original.email || '',
      alternatePhone: original.alternate_phone || '',
      address: original.address || '',
      city: original.city || '',
      state: original.state || '',
      postalCode: original.postal_code || '',
      joiningDate: original.joining_date || '',
      designation: original.designation || '',
      department: original.department || '',
      qualification: original.qualification || '',
      experienceYears: original.experience_years || '',
      employmentType: original.employment_type || 'permanent',
      maritalStatus: original.marital_status || '',
      emergencyContactName: original.emergency_contact_name || '',
      emergencyContactPhone: original.emergency_contact_phone || ''
    })
    setShowEditModal(true)
  }

  // Handle status change
  const handleStatusChange = async (staffId, newStatus) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ status: newStatus })
        .eq('id', staffId)

      if (error) throw error

      // If reactivated, remove from old staff list
      if (newStatus === 'active') {
        setStaffData(prev => prev.filter(s => s.id !== staffId))
        setFilteredStaffData(prev => prev.filter(s => s.id !== staffId))
      } else {
        // Update the status in the list
        setStaffData(prev => prev.map(s =>
          s.id === staffId ? { ...s, status: newStatus.toUpperCase() } : s
        ))
        setFilteredStaffData(prev => prev.map(s =>
          s.id === staffId ? { ...s, status: newStatus.toUpperCase() } : s
        ))
      }

      setStatusDropdownId(null)
      showToast('Status updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase()
    const option = statusOptions.find(opt => opt.value === statusLower)
    return option ? option.color : 'bg-gray-500'
  }

  const handleDelete = (staffId) => {
    showConfirmDialog(
      'Permanently Delete Staff Member',
      'Are you sure you want to permanently delete this staff member? This action cannot be undone.',
      async () => {
        try {
          const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', staffId)

          if (error) throw error

          const updatedData = staffData.filter(s => s.id !== staffId)
          setStaffData(updatedData)
          setFilteredStaffData(updatedData)
          showToast('Staff member deleted permanently', 'success')
        } catch (error) {
          console.error('Error deleting staff:', error)
          showToast('Error deleting staff: ' + error.message, 'error')
        }
      }
    )
  }

  // Search functionality
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredStaffData(staffData)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    let filtered = staffData

    switch (searchType) {
      case 'Via Name':
        filtered = staffData.filter(s => s.name.toLowerCase().includes(query))
        break
      case 'Via Email':
        filtered = staffData.filter(s =>
          s.originalData?.email?.toLowerCase().includes(query)
        )
        break
      case 'Via Mobile':
        filtered = staffData.filter(s =>
          s.phone?.toLowerCase().includes(query)
        )
        break
      case 'Via Staff ID':
        filtered = staffData.filter(s =>
          s.employeeNumber?.toLowerCase().includes(query)
        )
        break
      case 'Via General Data':
      default:
        filtered = staffData.filter(s =>
          s.name.toLowerCase().includes(query) ||
          s.employeeNumber?.toLowerCase().includes(query) ||
          s.designation?.toLowerCase().includes(query) ||
          s.department?.toLowerCase().includes(query) ||
          s.phone?.toLowerCase().includes(query) ||
          s.originalData?.email?.toLowerCase().includes(query)
        )
        break
    }

    setFilteredStaffData(filtered)
  }

  // Export to Excel (CSV)
  const exportToExcel = () => {
    const headers = ['Sr.', 'Name', 'Employee #', 'Designation', 'Phone', 'Department', 'Email', 'Status']
    const csvData = filteredStaffData.map((staff, index) => [
      index + 1,
      staff.name,
      staff.employeeNumber || '',
      staff.designation || '',
      staff.phone || '',
      staff.department || '',
      staff.originalData?.email || '',
      staff.status || ''
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `old_staff_data_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Export to PDF using jsPDF
  const exportToPDF = async () => {
    try {
      // Get PDF settings from localStorage
      const pdfSettings = getPdfSettings()
      console.log('📄 Using PDF settings for Old Staff Report:', pdfSettings)

      const doc = new jsPDF({
        orientation: pdfSettings.orientation || 'portrait',
        unit: 'mm',
        format: pdfSettings.pageSize || 'A4'
      })

      // Load school logo if available (check both logo and logo_url columns)
      let logoBase64 = null
      const logoUrl = schoolData?.logo || schoolData?.logo_url

      if (logoUrl) {
        console.log('📸 Logo URL found:', logoUrl)
        // If it's a URL, convert it to base64
        if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
          console.log('🔄 Converting logo URL to base64...')
          logoBase64 = await convertImageToBase64(logoUrl)
          console.log('✅ Logo conversion:', logoBase64 ? 'Success' : 'Failed')
        } else {
          // Already base64
          logoBase64 = logoUrl
          console.log('✅ Logo is already base64')
        }
      } else {
        console.log('⚠️ No logo found in schoolData')
        console.log('SchoolData:', schoolData)
      }

      // Prepare school data for header (without logo - we'll add it manually)
      const schoolInfo = {
        name: schoolData?.name || 'SCHOOL NAME',
        logo: null  // Don't pass logo to addPDFHeader, we'll add it manually
      }

      // Add professional header (with PDF settings)
      const startY = addPDFHeader(doc, schoolInfo, 'OLD / INACTIVE STAFF REPORT', {
        subtitle: `Total Staff: ${filteredStaffData.length}`,
        info: `Status: Inactive/Disabled`,
        pdfSettings: pdfSettings
      })

      // Add logo manually on top of the header (after header is drawn)
      if (logoBase64) {
        try {
          const logoBoxSize = 25
          const logoBoxX = 10
          const logoBoxY = 5

          // White box for logo (like datesheet)
          doc.setFillColor(255, 255, 255)
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.5)
          doc.rect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 'FD')

          // Add logo inside box
          const logoImageSize = 22
          const logoPadding = (logoBoxSize - logoImageSize) / 2
          const logoX = logoBoxX + logoPadding
          const logoY = logoBoxY + logoPadding

          // Determine image format
          let format = 'PNG'
          if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
            format = 'JPEG'
          }

          // Add the logo
          doc.addImage(logoBase64, format, logoX, logoY, logoImageSize, logoImageSize)
        } catch (error) {
          console.error('Error adding logo to PDF:', error)
        }
      }

      // Prepare table data
      const tableData = filteredStaffData.map((staff, index) => [
        index + 1,
        staff.name || 'N/A',
        staff.employeeNumber || 'N/A',
        staff.designation || 'N/A',
        staff.phone || 'N/A',
        staff.department || 'N/A',
        staff.status || 'N/A'
      ])

      // Get table styles from settings
      const tableStyles = getAutoTableStyles(pdfSettings)

      // Add table with settings
      autoTable(doc, {
        head: [['Sr.', 'Name', 'Employee #', 'Designation', 'Phone', 'Department', 'Status']],
        body: tableData,
        startY: startY,
        ...tableStyles,
        margin: { left: 15, right: 15 }
      })

      // Add footer (with PDF settings)
      addPDFFooter(doc, 1, 1, pdfSettings)

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)

      // Set state for preview modal
      const fileName = `old_staff_report_${new Date().toISOString().split('T')[0]}.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('PDF generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Error generating PDF report', 'error')
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      fatherName: '',
      dateOfBirth: '',
      gender: 'male',
      bloodGroup: '',
      religion: '',
      nationality: 'Pakistan',
      phone: '',
      email: '',
      alternatePhone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      joiningDate: '',
      designation: '',
      department: '',
      qualification: '',
      experienceYears: '',
      employmentType: 'permanent',
      maritalStatus: '',
      emergencyContactName: '',
      emergencyContactPhone: ''
    })
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff) return

    try {
      setSaving(true)

      // Use custom department if "Other" is selected
      const finalDepartment = formData.department === 'Other' ? customDepartment : formData.department

      const staffRecord = {
        first_name: formData.firstName,
        last_name: formData.lastName || null,
        father_name: formData.fatherName || null,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || 'male',
        blood_group: formData.bloodGroup || null,
        religion: formData.religion || null,
        nationality: formData.nationality || 'Pakistan',
        phone: formData.phone || null,
        email: formData.email || null,
        alternate_phone: formData.alternatePhone || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postalCode || null,
        joining_date: formData.joiningDate || null,
        designation: formData.designation || null,
        department: finalDepartment || null,
        qualification: formData.qualification || null,
        experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        employment_type: formData.employmentType || 'permanent',
        marital_status: formData.maritalStatus || null,
        emergency_contact_name: formData.emergencyContactName || null,
        emergency_contact_phone: formData.emergencyContactPhone || null
      }

      const { error } = await supabase
        .from('staff')
        .update(staffRecord)
        .eq('id', editingStaff.id)

      if (error) throw error

      showToast('Staff member updated successfully!', 'success')
      setShowEditModal(false)
      setEditingStaff(null)
      resetForm()
      fetchStaffData()
    } catch (error) {
      console.error('Error updating staff:', error)
      showToast('Error updating staff: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-3">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel
        </button>
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-medium transition"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Type Dropdown */}
          <div className="relative min-w-[180px]">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 bg-white"
            >
              {searchOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search old staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Advance Search Button */}
          <button
            onClick={() => setShowAdvanceSearch(true)}
            className="flex items-center gap-2 border-2 border-blue-500 text-blue-500 hover:bg-blue-50 px-3 py-2 rounded text-sm font-medium transition"
          >
            <Filter className="w-4 h-4" />
            Advance Search
          </button>
        </div>

        {/* Staff Count */}
        <p className="mt-2 text-sm text-gray-600">
          Showing <span className="text-blue-600 font-semibold">{filteredStaffData.length}</span> of <span className="text-blue-600 font-semibold">{staffData.length}</span> old/disabled staff members
        </p>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative overflow-visible">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading staff data...</div>
        ) : filteredStaffData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No old/disabled staff members found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="bg-blue-600 text-white text-sm">
                <th className="px-3 py-2 text-left font-medium">Sr.</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Employee #</th>
                <th className="px-3 py-2 text-left font-medium">Designation</th>
                <th className="px-3 py-2 text-left font-medium">Phone</th>
                <th className="px-3 py-2 text-left font-medium">Department</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaffData.map((staff, index) => (
                <tr key={staff.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-700">{index + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-700">
                        {staff.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{staff.employeeNumber}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{staff.designation}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{staff.phone}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{staff.department}</td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setStatusDropdownId(statusDropdownId === staff.id ? null : staff.id)
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium text-white ${getStatusColor(staff.status)}`}
                      >
                        {staff.status}
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {statusDropdownId === staff.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 bottom-full mb-1 min-w-[160px] bg-white border border-gray-200 rounded-md shadow-xl z-[9999]"
                        >
                          {statusOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleStatusChange(staff.id, option.value)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors first:rounded-t-md last:rounded-b-md"
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${option.color}`} />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(staff)}
                        className="text-blue-500 hover:text-blue-600 p-1"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(staff.id)}
                        className="text-red-500 hover:text-red-600 p-1"
                        title="Delete Permanently"
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

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]" onClick={() => setShowEditModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white shadow-2xl z-[9999] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base font-semibold">Update Staff ({editingStaff.name})</h2>
              <button onClick={() => setShowEditModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {/* Personal Information */}
              <div className="mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 text-sm rounded-t flex items-center gap-2">
                  <User className="w-4 h-4" />
                  PERSONAL INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Last Name</label>
                      <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Father Name</label>
                      <input type="text" placeholder="Father Name" value={formData.fatherName} onChange={(e) => setFormData({...formData, fatherName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
                      <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Gender</label>
                      <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Nationality</label>
                      <input type="text" placeholder="Nationality" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 text-sm rounded-t flex items-center gap-2">
                  <span>📱</span>
                  CONTACT INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Phone</label>
                      <input type="text" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Email</label>
                      <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">City</label>
                      <input type="text" placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Address</label>
                      <input type="text" placeholder="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="mb-4">
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-3 py-2 text-sm rounded-t flex items-center gap-2">
                  <span>💼</span>
                  PROFESSIONAL INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Joining Date</label>
                      <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Employment Type</label>
                      <select value={formData.employmentType} onChange={(e) => setFormData({...formData, employmentType: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="permanent">Permanent</option>
                        <option value="contract">Contract</option>
                        <option value="temporary">Temporary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => {
                          setFormData({...formData, department: e.target.value})
                          setShowCustomDepartment(e.target.value === 'Other')
                          if (e.target.value !== 'Other') {
                            setCustomDepartment('')
                          }
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="">Select Department</option>
                        {departmentOptions.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    {showCustomDepartment && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Custom Department</label>
                        <input
                          type="text"
                          placeholder="Enter department name"
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Designation</label>
                      <input type="text" placeholder="Designation" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Qualification</label>
                      <input type="text" placeholder="Qualification" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Experience (Years)</label>
                      <input type="number" placeholder="Years" value={formData.experienceYears} onChange={(e) => setFormData({...formData, experienceYears: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setShowEditModal(false)} className="text-blue-500 hover:text-blue-600 font-medium px-4 py-2 text-sm">
                Close
              </button>
              <button
                onClick={handleUpdateStaff}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Advance Search Modal */}
      {showAdvanceSearch && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]" onClick={() => setShowAdvanceSearch(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[9999] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Refine Your Search</h2>
              <button onClick={() => setShowAdvanceSearch(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Employment Type</label>
                <select value={filters.employmentType} onChange={(e) => setFilters({...filters, employmentType: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="">All Types</option>
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Designation</label>
                <input type="text" placeholder="Filter by designation" value={filters.designation} onChange={(e) => setFilters({...filters, designation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Department</label>
                <select value={filters.department} onChange={(e) => setFilters({...filters, department: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="">All Departments</option>
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Gender</label>
                <select value={filters.gender} onChange={(e) => setFilters({...filters, gender: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Education/Qualification</label>
                <select value={filters.qualification} onChange={(e) => setFilters({...filters, qualification: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="">All Qualifications</option>
                  <option value="Matric">Matric</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Bachelor">Bachelor</option>
                  <option value="Master">Master</option>
                  <option value="PhD">PhD</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="p-3 border-t flex justify-end gap-2">
              <button onClick={() => setShowAdvanceSearch(false)} className="text-blue-500 font-medium text-sm px-4 py-2">Close</button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm font-medium flex items-center gap-2">
                Filter
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
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-t-lg">
                <h3 className="text-base font-semibold">{confirmDialog.title}</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-700">{confirmDialog.message}</p>
              </div>
              <div className="px-4 pb-4 flex justify-end gap-2">
                <button
                  onClick={handleCancelConfirm}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10000] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 min-w-[280px] max-w-md px-3 py-2 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-blue-500' :
              toast.type === 'error' ? 'bg-blue-600' :
              toast.type === 'warning' ? 'bg-blue-500' :
              'bg-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1 text-xs font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
        isOpen={showPdfPreview}
        onClose={handleClosePdfPreview}
      />
    </div>
  )
}

export default function OldStaffPage() {
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
      permissionKey="staff_old_view"
      pageName="Old Staff"
    >
      <OldStaffContent />
    </PermissionGuard>
  )
}
