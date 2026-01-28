'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Upload, Search, Filter, Download, FileSpreadsheet,
  Edit, Trash2, ChevronDown, X, User, Upload as UploadIcon, CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { convertImageToBase64, addPDFHeader, addPDFFooter } from '@/lib/pdfUtils'
import { getPdfSettings, getAutoTableStyles } from '@/lib/pdfSettings'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardGrid, CardInfoGrid } from '@/components/DataCard'

function ActiveStaffContent() {
  const [searchType, setSearchType] = useState('Via General Data')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAdvanceSearch, setShowAdvanceSearch] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState([])
  const [editingStaff, setEditingStaff] = useState(null)
  const [statusDropdownId, setStatusDropdownId] = useState(null)
  const [dropdownOpenUp, setDropdownOpenUp] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [toasts, setToasts] = useState([])
  const [showCustomDepartment, setShowCustomDepartment] = useState(false)
  const [customDepartment, setCustomDepartment] = useState('')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Photo upload state
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

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
    emergencyContactPhone: '',
    photoUrl: ''
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

  // Predefined department options
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

  // Status options for Active Staff
  const statusOptions = [
    { value: 'inactive', label: 'Deactive', color: 'bg-red-500' }
  ]

  // Fetch staff data from Supabase
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

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showAddModal || showEditModal || showImportModal || showAdvanceSearch) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAddModal, showEditModal, showImportModal, showAdvanceSearch])

  // Auto search when query changes
  useEffect(() => {
    // Only run search if staff data is loaded
    if (staffData.length === 0 && !searchQuery && !filters.employmentType && !filters.designation && !filters.department && !filters.gender) {
      return
    }

    const timer = setTimeout(() => {
      handleSearch()
    }, 300) // Debounce search by 300ms

    return () => clearTimeout(timer)
  }, [searchQuery, searchType, filters, staffData])

  const fetchStaffData = async () => {
    if (!currentUser?.school_id || !currentUser?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', currentUser.school_id) // ✅ Filter by school
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = (data || []).map((staff) => ({
        id: staff.id,
        name: `${staff.first_name} ${staff.last_name || ''}`.trim(),
        employeeNumber: staff.employee_number,
        designation: staff.designation || 'N/A',
        phone: staff.phone || 'N/A',
        department: staff.department || 'N/A',
        status: staff.status?.toUpperCase() || 'ACTIVE',
        photoUrl: staff.photo_url || null,
        originalData: staff
      }))

      console.log('Fetched staff data:', formattedData.map(s => ({ name: s.name, photoUrl: s.photoUrl })))
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStaff(filteredStaffData.map(s => s.id))
    } else {
      setSelectedStaff([])
    }
  }

  const handleSelectStaff = (id) => {
    setSelectedStaff(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
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
    // Reset photo states
    setPhotoFile(null)
    setPhotoPreview(null)
    setShowEditModal(true)
  }

  // Handle status change
  const handleStatusChange = async (staffId, newStatus) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ status: newStatus })
        .eq('id', staffId)
        .eq('school_id', currentUser.school_id) // ✅ Security check

      if (error) throw error

      // Remove from active staff list (since they're no longer active)
      setStaffData(prev => prev.filter(s => s.id !== staffId))
      setFilteredStaffData(prev => prev.filter(s => s.id !== staffId))

      setStatusDropdownId(null)
      showToast('Status updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
    }
  }

  const handleDelete = (staffId) => {
    showConfirmDialog(
      'Delete Staff Member',
      'Are you sure you want to delete this staff member? This action cannot be undone.',
      async () => {
        try {
          const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', staffId)
            .eq('school_id', currentUser.school_id)

          if (error) throw error

          const updatedData = staffData.filter(s => s.id !== staffId)
          setStaffData(updatedData)
          setFilteredStaffData(updatedData)
          showToast('Staff member deleted successfully', 'success')
        } catch (error) {
          console.error('Error deleting staff:', error)
          showToast('Error deleting staff: ' + error.message, 'error')
        }
      }
    )
  }

  // Search functionality
  const handleSearch = () => {
    setCurrentPage(1) // Reset to first page on new search

    if (!searchQuery.trim() && !filters.employmentType && !filters.designation && !filters.department && !filters.gender) {
      setFilteredStaffData(staffData)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    let filtered = staffData

    // Apply search filter
    if (searchQuery.trim()) {
      switch (searchType) {
        case 'Via Name':
          filtered = filtered.filter(s => s.name.toLowerCase().includes(query))
          break
        case 'Via Email':
          filtered = filtered.filter(s =>
            s.originalData?.email?.toLowerCase().includes(query)
          )
          break
        case 'Via Mobile':
          filtered = filtered.filter(s =>
            s.phone?.toLowerCase().includes(query)
          )
          break
        case 'Via Staff ID':
          filtered = filtered.filter(s =>
            s.employeeNumber?.toLowerCase().includes(query)
          )
          break
        case 'Via General Data':
        default:
          filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.employeeNumber?.toLowerCase().includes(query) ||
            s.designation?.toLowerCase().includes(query) ||
            s.department?.toLowerCase().includes(query) ||
            s.phone?.toLowerCase().includes(query) ||
            s.originalData?.email?.toLowerCase().includes(query)
          )
          break
      }
    }

    // Apply additional filters
    if (filters.employmentType) {
      filtered = filtered.filter(s => s.originalData?.employment_type === filters.employmentType)
    }
    if (filters.designation) {
      filtered = filtered.filter(s => s.designation === filters.designation)
    }
    if (filters.department) {
      filtered = filtered.filter(s => s.department === filters.department)
    }
    if (filters.gender) {
      filtered = filtered.filter(s => s.originalData?.gender === filters.gender)
    }

    setFilteredStaffData(filtered)
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredStaffData.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredStaffData.length / itemsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
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
    link.download = `staff_data_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Export to PDF using jsPDF
  const exportToPDF = async () => {
    try {
      // Get PDF settings from localStorage
      const pdfSettings = getPdfSettings()
      console.log('📄 Using PDF settings for Active Staff Report:', pdfSettings)

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
      const startY = addPDFHeader(doc, schoolInfo, 'ACTIVE STAFF REPORT', {
        subtitle: `Total Staff: ${filteredStaffData.length}`,
        info: `Status: Active`,
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
        staff.name || '',
        staff.employeeNumber || '',
        staff.designation || '',
        staff.phone || '',
        staff.department || '',
        staff.status || ''
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
      const fileName = `Active_Staff_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`
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

  // Download sample Excel template
  const downloadSampleExcel = () => {
    const headers = ['first_name', 'last_name', 'father_name', 'date_of_birth', 'gender', 'phone', 'email', 'address', 'city', 'designation', 'department', 'joining_date', 'employment_type']
    const sampleData = [
      ['John', 'Doe', 'Robert Doe', '1990-01-15', 'male', '03001234567', 'john@example.com', '123 Main St', 'Karachi', 'Teacher', 'Science', '2024-01-01', 'permanent'],
      ['Jane', 'Smith', 'Michael Smith', '1985-06-20', 'female', '03009876543', 'jane@example.com', '456 Oak Ave', 'Lahore', 'Admin', 'Administration', '2024-02-15', 'contract']
    ]

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'staff_import_template.csv'
    link.click()
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImportFile(file)
    }
  }

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      showToast('Please select a file first', 'warning')
      return
    }

    if (!currentUser?.school_id) {
      showToast('Error: No school ID found. Please login again.', 'error')
      return
    }

    setImporting(true)

    try {
      const text = await importFile.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        showToast('File is empty or has no data rows', 'warning')
        setImporting(false)
        return
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
      const records = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/("([^"]*)"|[^,]+)/g) || []
        const cleanValues = values.map(v => v.replace(/"/g, '').trim())

        const row = {}
        headers.forEach((header, index) => {
          row[header] = cleanValues[index] || ''
        })

        // Map CSV columns to database fields
        const staffRecord = {
          user_id: currentUser.id,
          school_id: currentUser.school_id,
          created_by: currentUser.id || null,
          employee_number: `EMP-${Date.now()}-${i}`,
          first_name: row.first_name || row.firstname || '',
          last_name: row.last_name || row.lastname || null,
          father_name: row.father_name || row.fathername || null,
          date_of_birth: row.date_of_birth || row.dob || null,
          gender: row.gender || 'male',
          phone: row.phone || row.mobile || null,
          email: row.email || null,
          address: row.address || null,
          city: row.city || null,
          state: row.state || null,
          postal_code: row.postal_code || row.postalcode || null,
          designation: row.designation || null,
          department: row.department || null,
          joining_date: row.joining_date || row.joiningdate || new Date().toISOString().split('T')[0],
          employment_type: row.employment_type || row.employmenttype || 'permanent',
          qualification: row.qualification || null,
          nationality: row.nationality || 'Pakistan',
          status: 'active'
        }

        if (staffRecord.first_name) {
          records.push(staffRecord)
        }
      }

      if (records.length === 0) {
        showToast('No valid records found in file', 'warning')
        setImporting(false)
        return
      }

      const { error } = await supabase
        .from('staff')
        .insert(records)

      if (error) throw error

      showToast(`Successfully imported ${records.length} staff members!`, 'success')
      setShowImportModal(false)
      setImportFile(null)
      fetchStaffData()
    } catch (error) {
      console.error('Import error:', error)
      showToast('Error importing data: ' + error.message, 'error')
    } finally {
      setImporting(false)
    }
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
    setShowCustomDepartment(false)
    setCustomDepartment('')
  }

  const handleSaveStaff = async () => {
    if (!currentUser?.school_id) {
      showToast('Error: No school ID found. Please login again.', 'error')
      return
    }

    try {
      setSaving(true)

      let photoUrl = null

      // Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = fileName

        const { error: uploadError } = await supabase.storage
          .from('staff-photos')
          .upload(filePath, photoFile)

        if (uploadError) {
          console.error('Photo upload error:', uploadError)
          showToast('Failed to upload photo: ' + uploadError.message, 'error')
        } else {
          const { data } = supabase.storage
            .from('staff-photos')
            .getPublicUrl(filePath)

          photoUrl = data.publicUrl
          console.log('Photo uploaded successfully:', photoUrl)
        }
      }

      // Determine final department value
      const finalDepartment = formData.department === 'Other' ? customDepartment : formData.department

      // All staff members are saved to the staff table
      const staffRecord = {
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        created_by: currentUser.id || null,
        employee_number: `EMP-${Date.now()}`,
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
        joining_date: formData.joiningDate || new Date().toISOString().split('T')[0],
        designation: formData.designation || null,
        department: finalDepartment || null,
        qualification: formData.qualification || null,
        experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        employment_type: formData.employmentType || 'permanent',
        marital_status: formData.maritalStatus || null,
        emergency_contact_name: formData.emergencyContactName || null,
        emergency_contact_phone: formData.emergencyContactPhone || null,
        status: 'active',
        photo_url: photoUrl
      }

      const { error } = await supabase
        .from('staff')
        .insert([staffRecord])
        .select()

      if (error) throw error

      showToast('Staff member added successfully!', 'success')
      setShowAddModal(false)
      resetForm()
      setPhotoFile(null)
      setPhotoPreview(null)
      fetchStaffData()
    } catch (error) {
      console.error('Error saving staff:', error)
      showToast('Error saving staff: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff) return

    try {
      setSaving(true)

      let photoUrl = editingStaff.photoUrl // Keep existing photo URL

      // Upload new photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = fileName

        const { error: uploadError } = await supabase.storage
          .from('staff-photos')
          .upload(filePath, photoFile)

        if (uploadError) {
          console.error('Photo upload error:', uploadError)
          showToast('Failed to upload photo: ' + uploadError.message, 'error')
        } else {
          const { data } = supabase.storage
            .from('staff-photos')
            .getPublicUrl(filePath)

          photoUrl = data.publicUrl
          console.log('Photo updated successfully:', photoUrl)

          // Delete old photo if exists
          if (editingStaff.photoUrl) {
            const oldPath = editingStaff.photoUrl.split('/staff-photos/')[1]
            if (oldPath) {
              await supabase.storage
                .from('staff-photos')
                .remove([oldPath])
            }
          }
        }
      }

      // Only send fields that exist in Supabase staff table
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
        department: formData.department || null,
        qualification: formData.qualification || null,
        experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        employment_type: formData.employmentType || 'permanent',
        marital_status: formData.maritalStatus || null,
        emergency_contact_name: formData.emergencyContactName || null,
        emergency_contact_phone: formData.emergencyContactPhone || null,
        status: 'active', // Ensure status remains active
        photo_url: photoUrl
      }

      const { error } = await supabase
        .from('staff')
        .update(staffRecord)
        .eq('id', editingStaff.id)
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      showToast('Staff member updated successfully!', 'success')
      setShowEditModal(false)
      setEditingStaff(null)
      resetForm()
      setPhotoFile(null)
      setPhotoPreview(null)
      fetchStaffData()
    } catch (error) {
      console.error('Error updating staff:', error)
      showToast('Error updating staff: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full p-1 sm:p-2 md:p-3 lg:p-4">
      <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Active Staff</h1>

      {/* Action Buttons */}
      <div className="btn-row-mobile mb-3 sm:mb-4">
        <button
          onClick={() => { resetForm(); setPhotoFile(null); setPhotoPreview(null); setShowAddModal(true); }}
          className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-1.5 sm:py-2 px-2.5 sm:px-3 rounded text-xs sm:text-sm font-medium transition"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="truncate">Add Staff</span>
        </button>
        <button
          onClick={exportToExcel}
          className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-1.5 sm:py-2 px-2.5 sm:px-3 rounded text-xs sm:text-sm font-medium transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="truncate">Excel</span>
        </button>
        <button
          onClick={exportToPDF}
          className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-1.5 sm:py-2 px-2.5 sm:px-3 rounded text-xs sm:text-sm font-medium transition"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="truncate">PDF</span>
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white shadow-sm rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="filter-row-mobile sm:items-center">
          {/* Search Type Dropdown */}
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 pr-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 appearance-none relative"
          >
            {searchOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="col-span-2 sm:col-span-1 sm:flex-1 relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Auto search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm py-1.5 sm:py-2 pl-8 sm:pl-10 pr-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Advance Search Button */}
          <button
            onClick={() => setShowAdvanceSearch(true)}
            className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-1.5 sm:py-2 px-2.5 sm:px-3 rounded text-xs sm:text-sm font-medium transition"
          >
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Filters</span>
          </button>
        </div>

        {/* Staff Count */}
        <p className="mt-2 sm:mt-3 text-gray-600 text-xs sm:text-sm">
          Showing <span className="text-blue-600 font-semibold">{filteredStaffData.length}</span> of <span className="text-blue-600 font-semibold">{staffData.length}</span> staff members
        </p>
      </div>

      {/* Staff Table */}
      <ResponsiveTableWrapper
        tableView={
          <>
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-blue-900 text-white text-xs sm:text-sm">
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Sr.</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Name</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Employee #</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Designation</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Phone</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Department</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Status</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium whitespace-nowrap">Options</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((staff, index) => (
                  <tr key={staff.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                          {staff.photoUrl ? (
                            <img
                              src={staff.photoUrl}
                              alt={staff.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
                              }}
                            />
                          ) : (
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          )}
                        </div>
                        <span className="text-blue-600 hover:underline cursor-pointer font-medium text-xs sm:text-sm">
                          {staff.name}
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-blue-600 text-xs sm:text-sm whitespace-nowrap">{staff.employeeNumber}</td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 text-xs sm:text-sm whitespace-nowrap">{staff.designation}</td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 text-xs sm:text-sm whitespace-nowrap">{staff.phone}</td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 text-xs sm:text-sm whitespace-nowrap">{staff.department}</td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = e.currentTarget.getBoundingClientRect()
                            const spaceBelow = window.innerHeight - rect.bottom
                            const shouldOpenUp = spaceBelow < 200
                            setDropdownOpenUp(shouldOpenUp)
                            setStatusDropdownId(statusDropdownId === staff.id ? null : staff.id)
                          }}
                          className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded text-xs font-medium text-white bg-blue-600"
                        >
                          {staff.status}
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {statusDropdownId === staff.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute left-0 ${dropdownOpenUp ? 'bottom-full mb-1' : 'top-full mt-1'} min-w-[140px] sm:min-w-[160px] bg-white border border-gray-200 rounded-md shadow-xl z-[9999]`}
                          >
                            {statusOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handleStatusChange(staff.id, option.value)}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors first:rounded-t-md last:rounded-b-md"
                              >
                                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${option.color}`} />
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEdit(staff)}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(staff.id)}
                          className="text-red-500 hover:text-red-600 p-1"
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 md:gap-4 px-2 sm:px-3 py-1.5 sm:py-2 border-t border-gray-200">
                <div className="text-xs sm:text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-medium ${
                        currentPage === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        }
        cardView={
          <>
            <CardGrid>
              {currentItems.map((staff, index) => (
                <DataCard key={staff.id}>
                  <CardHeader
                    srNumber={indexOfFirstItem + index + 1}
                    photo={staff.photoUrl || <User className="w-4 h-4" />}
                    name={staff.name}
                    badge={
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                        {staff.status}
                      </span>
                    }
                  />
                  <CardInfoGrid>
                    <CardRow label="Emp #" value={staff.employeeNumber} />
                    <CardRow label="Phone" value={staff.phone} />
                    <CardRow label="Designation" value={staff.designation} />
                    <CardRow label="Department" value={staff.department} />
                  </CardInfoGrid>
                  <CardActions>
                    <button
                      onClick={() => handleEdit(staff)}
                      className="p-1 text-blue-500 rounded"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(staff.id)}
                      className="p-1 text-red-500 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setStatusDropdownId(statusDropdownId === staff.id ? null : staff.id)
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-medium"
                      >
                        Deactivate
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {statusDropdownId === staff.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-full mb-1 min-w-[120px] bg-white border border-gray-200 rounded-md shadow-xl z-[9999]"
                        >
                          {statusOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleStatusChange(staff.id, option.value)}
                              className="w-full px-2 py-1.5 text-left text-[10px] text-gray-700 hover:bg-gray-100 flex items-center gap-1 transition-colors first:rounded-t-md last:rounded-b-md"
                            >
                              <span className={`w-2 h-2 rounded-full ${option.color}`} />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardActions>
                </DataCard>
              ))}
            </CardGrid>

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-col items-center gap-2">
                <div className="text-[10px] text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="px-2 py-1 border border-gray-300 rounded text-[10px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  {[...Array(totalPages)].slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1)).map((_, i) => {
                    const pageNum = Math.max(1, currentPage - 1) + i
                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`px-2 py-1 rounded text-[10px] font-medium ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 border border-gray-300 rounded text-[10px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        }
        loading={loading}
        empty={filteredStaffData.length === 0}
        emptyMessage="No staff members found"
      />

      {/* Import Staff Data Modal */}
      {showImportModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => setShowImportModal(false)} />
          <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:max-w-md md:max-w-lg bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="bg-blue-600 text-white p-3 sm:p-4 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold">Import Staff Data</h2>
              <button onClick={() => setShowImportModal(false)} className="hover:bg-blue-700 p-1 rounded">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4">
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                Download {' '}
                <button
                  onClick={downloadSampleExcel}
                  className="text-blue-500 hover:underline font-medium"
                >
                  Sample CSV File
                </button>
                {' '} to see the required format.
              </p>

              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-5 mb-3 sm:mb-4">
                <div className="text-center">
                  <UploadIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2 text-sm sm:text-base">
                    {importFile ? importFile.name : 'Select a CSV file to import'}
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="inline-block px-2 sm:px-3 py-1.5 sm:py-2 sm:py-2.5 border border-gray-300 rounded bg-white hover:bg-gray-100 font-medium cursor-pointer text-sm sm:text-base"
                  >
                    Browse File
                  </label>
                </div>
              </div>

              {importFile && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 sm:p-3 mb-3 sm:mb-4">
                  <p className="text-blue-800 text-xs sm:text-sm">
                    Selected: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 bg-red-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm w-full sm:w-auto"
                >
                  <UploadIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  {importing ? 'Importing...' : 'Upload & Save'}
                </button>
              </div>
            </div>
            <div className="p-3 sm:p-4 border-t flex justify-end">
              <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base">
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add New Staff Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:max-w-md md:max-w-lg xl:max-w-2xl 2xl:max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="bg-blue-600 text-white p-3 sm:p-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Add New Staff</h2>
              <button onClick={() => setShowAddModal(false)} className="hover:bg-blue-700 p-1 rounded">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-2 sm:p-3 md:p-4 lg:p-6">
              {/* Photo Upload Section */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  EMPLOYEE PHOTO
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-300 flex-shrink-0">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            setPhotoFile(file)
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setPhotoPreview(reader.result)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="inline-block px-2 sm:px-3 py-1.5 sm:py-2 sm:py-2.5 bg-blue-600 text-white rounded cursor-pointer text-xs sm:text-sm hover:bg-blue-700"
                      >
                        Choose Photo
                      </label>
                      {photoFile && (
                        <button
                          onClick={() => {
                            setPhotoFile(null)
                            setPhotoPreview(null)
                          }}
                          className="ml-2 px-2 sm:px-3 py-1.5 sm:py-2 sm:py-2.5 border border-gray-300 rounded text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Recommended: Square image, max 2MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  PERSONAL INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Last Name</label>
                      <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Father Name</label>
                      <input type="text" placeholder="Father Name" value={formData.fatherName} onChange={(e) => setFormData({...formData, fatherName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Date of Birth</label>
                      <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Gender</label>
                      <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Blood Group</label>
                      <select value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Religion</label>
                      <input type="text" placeholder="Religion" value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Nationality</label>
                      <input type="text" placeholder="Nationality" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Marital Status</label>
                      <select value={formData.maritalStatus} onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                        <option value="">Select</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <span>📱</span>
                  CONTACT INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Phone</label>
                      <input type="text" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Alternate Phone</label>
                      <input type="text" placeholder="Alternate Phone" value={formData.alternatePhone} onChange={(e) => setFormData({...formData, alternatePhone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Email</label>
                      <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Address</label>
                      <input type="text" placeholder="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">City</label>
                      <input type="text" placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">State</label>
                      <input type="text" placeholder="State" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Postal Code</label>
                      <input type="text" placeholder="Postal Code" value={formData.postalCode} onChange={(e) => setFormData({...formData, postalCode: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <span>📞</span>
                  EMERGENCY CONTACT
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Contact Name</label>
                      <input type="text" placeholder="Contact Name" value={formData.emergencyContactName} onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Contact Phone</label>
                      <input type="text" placeholder="Contact Phone" value={formData.emergencyContactPhone} onChange={(e) => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <span>💼</span>
                  PROFESSIONAL INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Joining Date <span className="text-red-500">*</span></label>
                      <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Employment Type</label>
                      <select value={formData.employmentType} onChange={(e) => setFormData({...formData, employmentType: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                        <option value="permanent">Permanent</option>
                        <option value="contract">Contract</option>
                        <option value="temporary">Temporary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => {
                          setFormData({...formData, department: e.target.value})
                          setShowCustomDepartment(e.target.value === 'Other')
                          if (e.target.value !== 'Other') {
                            setCustomDepartment('')
                          }
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base"
                      >
                        <option value="">Select Department</option>
                        {departmentOptions.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    {showCustomDepartment && (
                      <div>
                        <label className="block text-xs sm:text-sm text-gray-600 mb-1">Custom Department</label>
                        <input
                          type="text"
                          placeholder="Enter department name"
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Designation</label>
                      <input type="text" placeholder="Designation" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Qualification</label>
                      <input type="text" placeholder="Qualification" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Experience (Years)</label>
                      <input type="number" placeholder="Years" value={formData.experienceYears} onChange={(e) => setFormData({...formData, experienceYears: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-2 sm:p-3 md:p-4 lg:p-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowAddModal(false)} className="text-blue-600 hover:text-blue-700 font-medium px-2 sm:px-3 py-1.5 sm:py-2 sm:py-2.5 text-sm sm:text-base w-full sm:w-auto">
                Close
              </button>
              <button
                onClick={handleSaveStaff}
                disabled={saving}
                className="bg-red-600 text-white px-4 sm:px-5 md:px-3 sm:px-4 py-2 sm:py-2.5 rounded hover:bg-red-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => setShowEditModal(false)} />
          <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:max-w-md md:max-w-lg xl:max-w-2xl 2xl:max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="bg-blue-600 text-white p-3 sm:p-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold truncate pr-2">Update Staff ({editingStaff.name})</h2>
              <button onClick={() => setShowEditModal(false)} className="hover:bg-blue-700 p-1 rounded flex-shrink-0">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-2 sm:p-3 md:p-4 lg:p-6">
              {/* Photo Upload Section */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  EMPLOYEE PHOTO
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-300 flex-shrink-0">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : editingStaff?.photoUrl ? (
                        <img src={editingStaff.photoUrl} alt={editingStaff.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            setPhotoFile(file)
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setPhotoPreview(reader.result)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="hidden"
                        id="photo-upload-edit"
                      />
                      <label
                        htmlFor="photo-upload-edit"
                        className="inline-block px-2 sm:px-3 py-1.5 sm:py-2 sm:py-2.5 bg-blue-600 text-white rounded cursor-pointer text-xs sm:text-sm hover:bg-blue-700"
                      >
                        Change Photo
                      </label>
                      {(photoFile || editingStaff?.photoUrl) && (
                        <button
                          onClick={() => {
                            setPhotoFile(null)
                            setPhotoPreview(null)
                          }}
                          className="ml-2 px-2 sm:px-3 py-1.5 sm:py-2 sm:py-2.5 border border-gray-300 rounded text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Recommended: Square image, max 2MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  PERSONAL INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Last Name</label>
                      <input type="text" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Father Name</label>
                      <input type="text" placeholder="Father Name" value={formData.fatherName} onChange={(e) => setFormData({...formData, fatherName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Date of Birth</label>
                      <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Gender</label>
                      <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Nationality</label>
                      <input type="text" placeholder="Nationality" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <span>📱</span>
                  CONTACT INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Phone</label>
                      <input type="text" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Email</label>
                      <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">City</label>
                      <input type="text" placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Address</label>
                      <input type="text" placeholder="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <span>📞</span>
                  EMERGENCY CONTACT
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Contact Name</label>
                      <input type="text" placeholder="Contact Name" value={formData.emergencyContactName} onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Contact Phone</label>
                      <input type="text" placeholder="Contact Phone" value={formData.emergencyContactPhone} onChange={(e) => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="mb-3 sm:mb-4 lg:mb-6">
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t flex items-center gap-2 text-xs sm:text-sm">
                  <span>💼</span>
                  PROFESSIONAL INFORMATION
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b p-2 sm:p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Joining Date</label>
                      <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Employment Type</label>
                      <select value={formData.employmentType} onChange={(e) => setFormData({...formData, employmentType: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                        <option value="permanent">Permanent</option>
                        <option value="contract">Contract</option>
                        <option value="temporary">Temporary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => {
                          setFormData({...formData, department: e.target.value})
                          setShowCustomDepartment(e.target.value === 'Other')
                          if (e.target.value !== 'Other') {
                            setCustomDepartment('')
                          }
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base"
                      >
                        <option value="">Select Department</option>
                        {departmentOptions.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    {showCustomDepartment && (
                      <div>
                        <label className="block text-xs sm:text-sm text-gray-600 mb-1">Custom Department</label>
                        <input
                          type="text"
                          placeholder="Enter department name"
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Designation</label>
                      <input type="text" placeholder="Designation" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Qualification</label>
                      <input type="text" placeholder="Qualification" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm text-gray-600 mb-1">Experience (Years)</label>
                      <input type="number" placeholder="Years" value={formData.experienceYears} onChange={(e) => setFormData({...formData, experienceYears: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-2 sm:p-3 md:p-4 lg:p-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowEditModal(false)} className="text-blue-600 hover:text-blue-700 font-medium px-2 sm:px-3 py-1.5 sm:py-2 sm:py-2.5 text-sm sm:text-base w-full sm:w-auto">
                Close
              </button>
              <button
                onClick={handleUpdateStaff}
                disabled={saving}
                className="bg-red-600 text-white px-4 sm:px-5 md:px-3 sm:px-4 py-2 sm:py-2.5 rounded hover:bg-red-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => setShowAdvanceSearch(false)} />
          <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:max-w-md md:max-w-lg bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="bg-blue-600 text-white p-3 sm:p-4 flex items-center justify-between">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Refine Your Search</h2>
              <button onClick={() => setShowAdvanceSearch(false)} className="hover:bg-blue-700 p-1 rounded">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm text-gray-600 mb-1">Employment Type</label>
                <select value={filters.employmentType} onChange={(e) => setFilters({...filters, employmentType: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                  <option value="">All Types</option>
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-600 mb-1">Designation</label>
                <input type="text" placeholder="Filter by designation" value={filters.designation} onChange={(e) => setFilters({...filters, designation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-600 mb-1">Department</label>
                <select value={filters.department} onChange={(e) => setFilters({...filters, department: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                  <option value="">All Departments</option>
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-600 mb-1">Gender</label>
                <select value={filters.gender} onChange={(e) => setFilters({...filters, gender: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-600 mb-1">Education/Qualification</label>
                <select value={filters.qualification} onChange={(e) => setFilters({...filters, qualification: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 sm:py-2 text-sm sm:text-base">
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
            <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button onClick={() => setShowAdvanceSearch(false)} className="text-blue-600 hover:text-blue-700 font-medium w-full sm:w-auto py-2 sm:py-2.5 text-sm sm:text-base">Close</button>
              <button className="bg-red-600 text-white px-4 sm:px-5 md:px-3 sm:px-4 py-2 sm:py-2.5 rounded hover:bg-red-700 font-medium flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base">
                Filter
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/80 sm:bg-black/50 sm:backdrop-blur-md z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={handleCancelConfirm}>
            <div
              className="w-full sm:w-auto sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-red-600 text-white px-3 sm:px-4 md:px-3 sm:px-4 py-2 sm:py-3 md:py-4 rounded-t-lg">
                <h3 className="text-sm sm:text-base font-semibold">{confirmDialog.title}</h3>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <p className="text-xs sm:text-sm text-gray-700">{confirmDialog.message}</p>
              </div>
              <div className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={handleCancelConfirm}
                  className="px-4 sm:px-5 md:px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition w-full sm:w-auto text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 sm:px-5 md:px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded font-medium transition hover:bg-red-700 w-full sm:w-auto text-xs sm:text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-[9999] space-y-2 w-[calc(100%-1rem)] sm:w-auto max-w-[calc(100%-1rem)] sm:max-w-md">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 sm:gap-3 min-w-0 sm:min-w-[280px] px-2 sm:px-3 py-1.5 sm:py-2 sm:py-2.5 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-600' :
              toast.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
            <span className="flex-1 text-xs sm:text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
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

export default function ActiveStaffPage() {
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
      permissionKey="staff_active_view"
      pageName="Active Staff"
    >
      <ActiveStaffContent />
    </PermissionGuard>
  )
}
