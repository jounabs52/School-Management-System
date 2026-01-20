'use client'

import { useState, useEffect } from 'react'
import { X, UserPlus, Shield, Trash2, Search, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function StaffManagement({ currentUser, showToast }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [staffMembers, setStaffMembers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffToDelete, setStaffToDelete] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    other_details: '',
    notes: ''
  })

  const [permissions, setPermissions] = useState({
    // Dashboard
    dashboard_view: false,

    // Front Desk - Inquiry
    frontdesk_inquiry_view: false,
    frontdesk_inquiry_add: false,
    frontdesk_inquiry_edit: false,
    frontdesk_inquiry_delete: false,

    // Front Desk - Visitors
    frontdesk_visitors_view: false,
    frontdesk_visitors_add: false,
    frontdesk_visitors_edit: false,
    frontdesk_visitors_delete: false,

    // Front Desk - Directory (includes Contacts)
    frontdesk_directory_view: false,
    frontdesk_directory_add: false,
    frontdesk_directory_edit: false,
    frontdesk_directory_delete: false,

    // Students - Active Students
    students_active_view: false,
    students_active_edit: false,
    students_active_delete: false,

    // Students - Admission Register
    students_admission_view: false,
    students_admission_add: false,
    students_admission_edit: false,

    // Students - Old Students
    students_old_view: false,
    students_old_edit: false,

    // Students - Student Reports
    students_reports_view: false,
    students_reports_delete: false,

    // Students - Certificates
    students_certificates_view: false,
    students_certificates_generate: false,

    // Students - ID Cards
    students_cards_view: false,
    students_cards_generate: false,

    // HR/Staff - Active Staff
    staff_active_view: false,
    staff_active_edit: false,
    staff_active_delete: false,

    // HR/Staff - Old Staff
    staff_old_view: false,
    staff_old_edit: false,

    // HR/Staff - Certificates
    staff_certificates_view: false,
    staff_certificates_generate: false,

    // HR/Staff - ID Cards
    staff_cards_view: false,
    staff_cards_generate: false,

    // HR/Staff - Recruitment
    staff_recruitment_view: false,
    staff_recruitment_add: false,
    staff_recruitment_edit: false,

    // Attendance - Staff Attendance
    attendance_staff_view: false,
    attendance_staff_mark: false,
    attendance_staff_edit: false,

    // Attendance - Student Attendance
    attendance_student_view: false,
    attendance_student_mark: false,
    attendance_student_edit: false,

    // Attendance - Reports
    attendance_reports_view: false,
    attendance_reports_download: false,

    // Classes - Class List
    classes_list_view: false,
    classes_list_add: false,
    classes_list_edit: false,
    classes_list_delete: false,

    // Classes - Sections
    classes_sections_view: false,
    classes_sections_add: false,
    classes_sections_edit: false,
    classes_sections_delete: false,

    // Classes - Subjects
    classes_subjects_view: false,
    classes_subjects_add: false,
    classes_subjects_edit: false,
    classes_subjects_delete: false,

    // Timetable - Timetable
    timetable_timetable_view: false,
    timetable_timetable_add: false,
    timetable_timetable_edit: false,
    timetable_timetable_delete: false,

    // Timetable - Date Sheet
    timetable_datesheet_view: false,
    timetable_datesheet_add: false,
    timetable_datesheet_edit: false,
    timetable_datesheet_delete: false,

    // Examination - Exams
    examination_exams_view: false,
    examination_exams_add: false,
    examination_exams_edit: false,
    examination_exams_delete: false,

    // Examination - Tests
    examination_tests_view: false,
    examination_tests_add: false,
    examination_tests_edit: false,
    examination_tests_delete: false,

    // Examination - Test Marks
    examination_testmarks_view: false,
    examination_testmarks_entry: false,

    // Examination - Exam Marks
    examination_exammarks_view: false,
    examination_exammarks_entry: false,

    // Examination - Reports
    examination_reports_view: false,
    examination_reports_download: false,

    // Fee - Collect Fee
    fee_collect_view: false,
    fee_collect_collect: false,

    // Fee - View Challan
    fee_challan_view: false,
    fee_challan_edit: false,
    fee_challan_delete: false,

    // Fee - Create Challan
    fee_create_view: false,
    fee_create_create: false,

    // Fee - Fee Policy
    fee_policy_view: false,
    fee_policy_edit: false,

    // Payroll - Create Salary
    payroll_create_view: false,
    payroll_create_create: false,

    // Payroll - Pay Salary
    payroll_pay_view: false,
    payroll_pay_pay: false,

    // Payroll - Salary Slips
    payroll_slips_view: false,
    payroll_slips_generate: false,

    // Payroll - Reports
    payroll_reports_view: false,
    payroll_reports_download: false,

    // Payroll - Other Expenses
    payroll_expenses_view: false,
    payroll_expenses_add: false,
    payroll_expenses_edit: false,
    payroll_expenses_delete: false,

    // Transport - Passengers
    transport_passengers_view: false,
    transport_passengers_add: false,
    transport_passengers_edit: false,
    transport_passengers_delete: false,

    // Transport - Vehicles
    transport_vehicles_view: false,
    transport_vehicles_add: false,
    transport_vehicles_edit: false,
    transport_vehicles_delete: false,

    // Transport - Routes
    transport_routes_view: false,
    transport_routes_add: false,
    transport_routes_edit: false,
    transport_routes_delete: false,

    // Library - Library
    library_library_view: false,
    library_library_add: false,
    library_library_edit: false,
    library_library_delete: false,

    // Library - Reports
    library_reports_view: false,
    library_reports_download: false,

    // Settings - Basic Settings
    settings_basic_view: false,
    settings_basic_edit: false,

    // Settings - PDF Settings
    settings_pdf_view: false,
    settings_pdf_edit: false,

    // Settings - Manage Access
    settings_access_view: false,
    settings_access_manage: false
  })

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchStaffMembers()
    }
  }, [currentUser])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddModal || showEditModal || showPermissionsModal || showDeleteModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAddModal, showEditModal, showPermissionsModal, showDeleteModal])

  const fetchStaffMembers = async () => {
    if (!currentUser?.school_id) {
      console.log('No school_id found in currentUser')
      return
    }

    setLoading(true)
    try {
      // Fetch users with phone number
      let query = supabase
        .from('users')
        .select('id, username, email, phone, role, status, created_at, staff_id')
        .eq('school_id', currentUser.school_id)
        .neq('id', currentUser.id)

      // If current user is not admin, exclude admin users from the list (case-insensitive)
      const userRole = currentUser.role?.toLowerCase().trim() || ''
      if (userRole !== 'admin' && userRole !== 'owner') {
        console.log('🔒 Current user is not admin, excluding admin users from list')
        // Exclude both 'admin', 'Admin', 'owner', 'Owner' (case-insensitive)
        query = query.not('role', 'ilike', 'admin').not('role', 'ilike', 'owner')
      } else {
        console.log('👑 Current user is admin/owner, showing all users')
      }

      const { data: usersData, error: usersError } = await query.order('created_at', { ascending: false })

      console.log('📋 Fetched users:', usersData?.length || 0, 'Current user role:', currentUser.role)

      if (usersError) {
        console.error('Supabase error:', usersError)
        throw usersError
      }

      // Fetch staff details separately if staff_id exists
      const usersWithStaff = await Promise.all(
        (usersData || []).map(async (user) => {
          if (user.staff_id) {
            try {
              const { data: staffData } = await supabase
                .from('staff')
                .select('first_name, last_name, phone')
                .eq('id', user.staff_id)
                .single()

              return { ...user, staff: staffData }
            } catch (err) {
              return { ...user, staff: null }
            }
          }
          return { ...user, staff: null }
        })
      )

      setStaffMembers(usersWithStaff)
    } catch (error) {
      console.error('Error fetching staff members:', error.message, error)
      if (showToast) {
        showToast('Error loading staff members: ' + error.message, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      if (showToast) showToast('Please fill all required fields', 'warning')
      return
    }

    setSaving(true)
    try {
      // Create user account with inactive status - they can't login until permissions are assigned
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          school_id: currentUser.school_id,
          username: formData.email.split('@')[0],
          email: formData.email,
          password: formData.password,
          phone: formData.phone, // Save phone to users table
          role: 'staff',
          status: 'inactive'
        })
        .select()
        .single()

      if (userError) throw userError

      // Update local state instead of fetching all data
      const newStaffMember = {
        ...userData,
        phone: formData.phone // Phone is now in users table
      }
      setStaffMembers([newStaffMember, ...staffMembers])

      if (showToast) showToast('Staff member added successfully! Assign permissions to activate.', 'success')
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error adding staff:', error)
      if (showToast) showToast('Error adding staff member: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (staff) => {
    setSelectedStaff(staff)
    setIsEditMode(true)
    setFormData({
      name: staff.staff ? `${staff.staff.first_name} ${staff.staff.last_name}` : staff.username,
      email: staff.email,
      phone: staff.phone || '', // Get phone from users table
      password: '',
      other_details: '',
      notes: ''
    })
    setShowEditModal(true)
  }

  const handleEditStaff = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.phone) {
      if (showToast) showToast('Please fill all required fields', 'warning')
      return
    }

    setSaving(true)
    try {
      // Update user account
      const updateData = {
        username: formData.email.split('@')[0],
        email: formData.email,
        phone: formData.phone // Update phone in users table
      }

      // Only update password if provided
      if (formData.password) {
        updateData.password = formData.password
      }

      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedStaff.id)
        .eq('school_id', currentUser.school_id)

      if (userError) throw userError

      // Update local state instead of fetching all data
      setStaffMembers(staffMembers.map(staff =>
        staff.id === selectedStaff.id
          ? {
              ...staff,
              username: formData.email.split('@')[0],
              email: formData.email,
              phone: formData.phone // Phone is now in users table
            }
          : staff
      ))

      if (showToast) showToast('Staff member updated successfully!', 'success')
      setShowEditModal(false)
      setSelectedStaff(null)
      setIsEditMode(false)
      resetForm()
    } catch (error) {
      console.error('Error updating staff:', error)
      if (showToast) showToast('Error updating staff member: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteModal = (staff) => {
    setStaffToDelete(staff)
    setShowDeleteModal(true)
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', staffToDelete.id)
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      // Update local state instead of fetching all data
      setStaffMembers(staffMembers.filter(staff => staff.id !== staffToDelete.id))

      if (showToast) showToast('Staff member deleted successfully', 'success')
      setShowDeleteModal(false)
      setStaffToDelete(null)
    } catch (error) {
      console.error('Error deleting staff:', error)
      if (showToast) showToast('Error deleting staff member', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openPermissionsModal = async (staff) => {
    setSelectedStaff(staff)
    setLoading(true)

    try {
      // Fetch existing permissions
      const { data, error } = await supabase
        .from('staff_permissions')
        .select('*')
        .eq('user_id', staff.id)
        .eq('school_id', currentUser.school_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        // Map database columns directly to permissions state
        setPermissions({
          dashboard_view: data.dashboard_view || false,
          frontdesk_inquiry_view: data.frontdesk_inquiry_view || false,
          frontdesk_inquiry_add: data.frontdesk_inquiry_add || false,
          frontdesk_inquiry_edit: data.frontdesk_inquiry_edit || false,
          frontdesk_inquiry_delete: data.frontdesk_inquiry_delete || false,
          frontdesk_visitors_view: data.frontdesk_visitors_view || false,
          frontdesk_visitors_add: data.frontdesk_visitors_add || false,
          frontdesk_visitors_edit: data.frontdesk_visitors_edit || false,
          frontdesk_visitors_delete: data.frontdesk_visitors_delete || false,
          frontdesk_directory_view: data.frontdesk_directory_view || false,
          frontdesk_directory_add: data.frontdesk_directory_add || false,
          frontdesk_directory_edit: data.frontdesk_directory_edit || false,
          frontdesk_directory_delete: data.frontdesk_directory_delete || false,
          students_active_view: data.students_active_view || false,
          students_active_edit: data.students_active_edit || false,
          students_active_delete: data.students_active_delete || false,
          students_admission_view: data.students_admission_view || false,
          students_admission_add: data.students_admission_add || false,
          students_admission_edit: data.students_admission_edit || false,
          students_old_view: data.students_old_view || false,
          students_old_edit: data.students_old_edit || false,
          students_reports_view: data.students_reports_view || false,
          students_reports_delete: data.students_reports_delete || false,
          students_certificates_view: data.students_certificates_view || false,
          students_certificates_generate: data.students_certificates_generate || false,
          students_cards_view: data.students_cards_view || false,
          students_cards_generate: data.students_cards_generate || false,
          staff_view: data.staff_view || false,
          staff_add: data.staff_add || false,
          staff_edit: data.staff_edit || false,
          staff_delete: data.staff_delete || false,
          attendance_view: data.attendance_view || false,
          attendance_mark: data.attendance_mark || false,
          attendance_edit: data.attendance_edit || false,
          classes_view: data.classes_view || false,
          classes_add: data.classes_add || false,
          classes_edit: data.classes_edit || false,
          classes_delete: data.classes_delete || false,
          timetable_view: data.timetable_view || false,
          timetable_edit: data.timetable_edit || false,
          exams_view: data.exams_view || false,
          exams_add: data.exams_add || false,
          exams_edit: data.exams_edit || false,
          exams_delete: data.exams_delete || false,
          exams_marks_entry: data.exams_marks_entry || false,
          fee_view: data.fee_view || false,
          fee_collect: data.fee_collect || false,
          fee_create_challan: data.fee_create_challan || false,
          fee_reports: data.fee_reports || false,
          payroll_view: data.payroll_view || false,
          payroll_process: data.payroll_process || false,
          payroll_reports: data.payroll_reports || false,
          transport_view: data.transport_view || false,
          transport_edit: data.transport_edit || false,
          library_view: data.library_view || false,
          library_issue: data.library_issue || false,
          library_return: data.library_return || false,
          reports_view: data.reports_view || false,
          reports_download: data.reports_download || false,
          settings_view: data.settings_view || false,
          settings_edit: data.settings_edit || false
        })
      } else {
        // Reset to defaults
        setPermissions({
          dashboard_view: false,
          frontdesk_inquiry_view: false,
          frontdesk_inquiry_add: false,
          frontdesk_inquiry_edit: false,
          frontdesk_inquiry_delete: false,
          frontdesk_visitors_view: false,
          frontdesk_visitors_add: false,
          frontdesk_visitors_edit: false,
          frontdesk_visitors_delete: false,
          frontdesk_directory_view: false,
          frontdesk_directory_add: false,
          frontdesk_directory_edit: false,
          frontdesk_directory_delete: false,
          students_active_view: false,
          students_active_edit: false,
          students_active_delete: false,
          students_admission_view: false,
          students_admission_add: false,
          students_admission_edit: false,
          students_old_view: false,
          students_old_edit: false,
          students_reports_view: false,
          students_reports_delete: false,
          students_certificates_view: false,
          students_certificates_generate: false,
          students_cards_view: false,
          students_cards_generate: false,
          staff_view: false,
          staff_add: false,
          staff_edit: false,
          staff_delete: false,
          attendance_view: false,
          attendance_mark: false,
          attendance_edit: false,
          classes_view: false,
          classes_add: false,
          classes_edit: false,
          classes_delete: false,
          timetable_view: false,
          timetable_edit: false,
          exams_view: false,
          exams_add: false,
          exams_edit: false,
          exams_delete: false,
          exams_marks_entry: false,
          fee_view: false,
          fee_collect: false,
          fee_create_challan: false,
          fee_reports: false,
          payroll_view: false,
          payroll_process: false,
          payroll_reports: false,
          transport_view: false,
          transport_edit: false,
          library_view: false,
          library_issue: false,
          library_return: false,
          reports_view: false,
          reports_download: false,
          settings_view: false,
          settings_edit: false
        })
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
      if (showToast) showToast('Error loading permissions', 'error')
    } finally {
      setLoading(false)
      setShowPermissionsModal(true)
    }
  }

  const handleSavePermissions = async () => {
    setSaving(true)
    try {
      // Save permissions
      const { error: permError } = await supabase
        .from('staff_permissions')
        .upsert({
          user_id: selectedStaff.id,
          school_id: currentUser.school_id,
          ...permissions,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,school_id'
        })

      if (permError) throw permError

      // Activate the user account so they can login
      const { error: userError } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', selectedStaff.id)
        .eq('school_id', currentUser.school_id)

      if (userError) throw userError

      // Update local state to reflect active status
      setStaffMembers(staffMembers.map(staff =>
        staff.id === selectedStaff.id
          ? { ...staff, status: 'active' }
          : staff
      ))

      if (showToast) showToast('Permissions saved and staff activated successfully!', 'success')
      setShowPermissionsModal(false)
    } catch (error) {
      console.error('Error saving permissions:', error)
      if (showToast) showToast('Error saving permissions: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      other_details: '',
      notes: ''
    })
  }

  const filteredStaff = staffMembers.filter(staff => {
    // Additional safety check: Never show admin users to non-admin staff (case-insensitive)
    const userRole = currentUser?.role?.toLowerCase().trim() || ''
    const staffRole = staff.role?.toLowerCase().trim() || ''

    if ((userRole !== 'admin' && userRole !== 'owner') && (staffRole === 'admin' || staffRole === 'owner')) {
      console.log('🚫 Filtering out admin/owner user:', staff.email, 'for non-admin user')
      return false
    }

    const searchLower = searchTerm.toLowerCase()
    const name = staff.staff ? `${staff.staff.first_name} ${staff.staff.last_name}` : staff.username
    return name.toLowerCase().includes(searchLower) ||
           staff.email.toLowerCase().includes(searchLower)
  })

  console.log('✅ Filtered staff list:', filteredStaff.length, 'Current user role:', currentUser?.role)

  return (
    <>
      {/* Main Content */}
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
              <p className="text-sm text-gray-600 mt-1">Manage staff members and their permissions</p>
              {/* Debug info */}
              <p className="text-xs text-blue-600 mt-1 font-mono">
                User: {currentUser?.email} | Role: <strong>{currentUser?.role || 'undefined'}</strong> |
                {currentUser?.role === 'admin' ? ' 👑 Admin (can see all)' : ' 🔒 Staff (admins hidden)'}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm shadow-sm"
            >
              <UserPlus className="w-5 h-5" />
              Add Staff Member
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by name or email..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Staff List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-20">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <UserPlus className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No staff members</h3>
                <p className="text-sm text-gray-600 mb-4">Add your first staff member to get started</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">NAME</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">EMAIL</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PHONE</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">STATUS</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                            <p className="text-sm text-gray-600">Loading staff...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <p className="text-sm text-gray-500">No staff members found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((staff) => (
                        <tr key={staff.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {staff.staff ? `${staff.staff.first_name} ${staff.staff.last_name}` : staff.username}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{staff.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {staff.phone || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              staff.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {staff.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  openEditModal(staff)
                                }}
                                className="p-2 hover:bg-green-50 rounded-lg transition text-green-600"
                                title="Edit"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  openPermissionsModal(staff)
                                }}
                                className="p-2 hover:bg-blue-50 rounded-lg transition text-blue-600"
                                title="Manage Permissions"
                              >
                                <Shield className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  openDeleteModal(staff)
                                }}
                                className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false)
              resetForm()
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Staff Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddStaff} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder=""
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="admin1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder=""
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 pr-10 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Other Details</label>
                  <textarea
                    value={formData.other_details}
                    onChange={(e) => setFormData({ ...formData, other_details: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder=""
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder=""
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Staff'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false)
              setSelectedStaff(null)
              setIsEditMode(false)
              resetForm()
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Staff Member</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedStaff(null)
                  setIsEditMode(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditStaff} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder=""
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="admin1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder=""
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password <span className="text-gray-500">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 pr-10 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Other Details</label>
                  <textarea
                    value={formData.other_details}
                    onChange={(e) => setFormData({ ...formData, other_details: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder=""
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder=""
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedStaff(null)
                    setIsEditMode(false)
                    resetForm()
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Staff'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && staffToDelete && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false)
              setStaffToDelete(null)
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setStaffToDelete(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-2">
                    Are you sure you want to delete this staff member?
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {staffToDelete.staff ? `${staffToDelete.staff.first_name} ${staffToDelete.staff.last_name}` : staffToDelete.username}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {staffToDelete.email}
                  </p>
                  <p className="text-sm text-red-600 mt-3">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setStaffToDelete(null)
                }}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStaff}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Staff
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedStaff && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-[99998]"
            style={{
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)'
            }}
            onClick={() => setShowPermissionsModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 pointer-events-none">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col pointer-events-auto">
              {/* Compact Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-white">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Manage Permissions</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedStaff.staff ? `${selectedStaff.staff.first_name} ${selectedStaff.staff.last_name}` : selectedStaff.username}
                  </p>
                </div>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Content Area - Compact */}
              <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Dashboard */}
                <PermissionCard
                  title="Dashboard"
                  permissions={[
                    { key: 'dashboard_view', label: 'View Stats' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Front Desk - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-green-200 rounded-lg p-3 bg-green-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-green-200">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Front Desk Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Inquiry */}
                    <PermissionCard
                      title="Inquiry"
                      permissions={[
                        { key: 'frontdesk_inquiry_view', label: 'View' },
                        { key: 'frontdesk_inquiry_add', label: 'Add' },
                        { key: 'frontdesk_inquiry_edit', label: 'Edit' },
                        { key: 'frontdesk_inquiry_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Visitors */}
                    <PermissionCard
                      title="Visitors"
                      permissions={[
                        { key: 'frontdesk_visitors_view', label: 'View' },
                        { key: 'frontdesk_visitors_add', label: 'Add' },
                        { key: 'frontdesk_visitors_edit', label: 'Edit' },
                        { key: 'frontdesk_visitors_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Directory (includes Contacts) */}
                    <PermissionCard
                      title="Directory / Contacts"
                      permissions={[
                        { key: 'frontdesk_directory_view', label: 'View' },
                        { key: 'frontdesk_directory_add', label: 'Add' },
                        { key: 'frontdesk_directory_edit', label: 'Edit' },
                        { key: 'frontdesk_directory_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* Students - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-blue-200">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Students Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Active Students */}
                    <PermissionCard
                      title="Active Students"
                      permissions={[
                        { key: 'students_active_view', label: 'View' },
                        { key: 'students_active_edit', label: 'Edit' },
                        { key: 'students_active_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Admission Register */}
                    <PermissionCard
                      title="Admission Register"
                      permissions={[
                        { key: 'students_admission_view', label: 'View' },
                        { key: 'students_admission_add', label: 'Add' },
                        { key: 'students_admission_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Old Students */}
                    <PermissionCard
                      title="Old Students"
                      permissions={[
                        { key: 'students_old_view', label: 'View' },
                        { key: 'students_old_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Student Reports */}
                    <PermissionCard
                      title="Student Reports"
                      permissions={[
                        { key: 'students_reports_view', label: 'View' },
                        { key: 'students_reports_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Certificates */}
                    <PermissionCard
                      title="Certificates"
                      permissions={[
                        { key: 'students_certificates_view', label: 'View' },
                        { key: 'students_certificates_generate', label: 'Generate' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* ID Cards */}
                    <PermissionCard
                      title="ID Cards"
                      permissions={[
                        { key: 'students_cards_view', label: 'View' },
                        { key: 'students_cards_generate', label: 'Generate' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* HR/Staff - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-purple-200 rounded-lg p-3 bg-purple-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-purple-200">
                    <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                    HR / Staff Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Active Staff */}
                    <PermissionCard
                      title="Active Staff"
                      permissions={[
                        { key: 'staff_active_view', label: 'View' },
                        { key: 'staff_active_edit', label: 'Edit' },
                        { key: 'staff_active_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Old Staff */}
                    <PermissionCard
                      title="Old Staff"
                      permissions={[
                        { key: 'staff_old_view', label: 'View' },
                        { key: 'staff_old_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Certificates */}
                    <PermissionCard
                      title="Certificates"
                      permissions={[
                        { key: 'staff_certificates_view', label: 'View' },
                        { key: 'staff_certificates_generate', label: 'Generate' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* ID Cards */}
                    <PermissionCard
                      title="ID Cards"
                      permissions={[
                        { key: 'staff_cards_view', label: 'View' },
                        { key: 'staff_cards_generate', label: 'Generate' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Recruitment */}
                    <PermissionCard
                      title="Recruitment"
                      permissions={[
                        { key: 'staff_recruitment_view', label: 'View' },
                        { key: 'staff_recruitment_add', label: 'Add' },
                        { key: 'staff_recruitment_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* Attendance - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-orange-200 rounded-lg p-3 bg-orange-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-orange-200">
                    <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                    Attendance Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Staff Attendance */}
                    <PermissionCard
                      title="Staff Attendance"
                      permissions={[
                        { key: 'attendance_staff_view', label: 'View' },
                        { key: 'attendance_staff_mark', label: 'Mark' },
                        { key: 'attendance_staff_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Student Attendance */}
                    <PermissionCard
                      title="Student Attendance"
                      permissions={[
                        { key: 'attendance_student_view', label: 'View' },
                        { key: 'attendance_student_mark', label: 'Mark' },
                        { key: 'attendance_student_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Reports */}
                    <PermissionCard
                      title="Reports"
                      permissions={[
                        { key: 'attendance_reports_view', label: 'View' },
                        { key: 'attendance_reports_download', label: 'Download' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* Classes - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-teal-200 rounded-lg p-3 bg-teal-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-teal-200">
                    <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                    Classes Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Class List */}
                    <PermissionCard
                      title="Class List"
                      permissions={[
                        { key: 'classes_list_view', label: 'View' },
                        { key: 'classes_list_add', label: 'Add' },
                        { key: 'classes_list_edit', label: 'Edit' },
                        { key: 'classes_list_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Sections */}
                    <PermissionCard
                      title="Sections"
                      permissions={[
                        { key: 'classes_sections_view', label: 'View' },
                        { key: 'classes_sections_add', label: 'Add' },
                        { key: 'classes_sections_edit', label: 'Edit' },
                        { key: 'classes_sections_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Subjects */}
                    <PermissionCard
                      title="Subjects"
                      permissions={[
                        { key: 'classes_subjects_view', label: 'View' },
                        { key: 'classes_subjects_add', label: 'Add' },
                        { key: 'classes_subjects_edit', label: 'Edit' },
                        { key: 'classes_subjects_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* Timetable Module - Separate Card */}
                <PermissionCard
                  title="Timetable"
                  permissions={[
                    { key: 'timetable_timetable_view', label: 'View' },
                    { key: 'timetable_timetable_add', label: 'Add' },
                    { key: 'timetable_timetable_edit', label: 'Edit' },
                    { key: 'timetable_timetable_delete', label: 'Delete' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Date Sheet Module - Separate Card */}
                <PermissionCard
                  title="Date Sheet"
                  permissions={[
                    { key: 'timetable_datesheet_view', label: 'View' },
                    { key: 'timetable_datesheet_add', label: 'Add' },
                    { key: 'timetable_datesheet_edit', label: 'Edit' },
                    { key: 'timetable_datesheet_delete', label: 'Delete' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Examination - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-red-200 rounded-lg p-3 bg-red-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-red-200">
                    <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                    Examination Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Exams */}
                    <PermissionCard
                      title="Exams"
                      permissions={[
                        { key: 'examination_exams_view', label: 'View' },
                        { key: 'examination_exams_add', label: 'Add' },
                        { key: 'examination_exams_edit', label: 'Edit' },
                        { key: 'examination_exams_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Tests */}
                    <PermissionCard
                      title="Tests"
                      permissions={[
                        { key: 'examination_tests_view', label: 'View' },
                        { key: 'examination_tests_add', label: 'Add' },
                        { key: 'examination_tests_edit', label: 'Edit' },
                        { key: 'examination_tests_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Test Marks */}
                    <PermissionCard
                      title="Test Marks"
                      permissions={[
                        { key: 'examination_testmarks_view', label: 'View' },
                        { key: 'examination_testmarks_entry', label: 'Entry' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Exam Marks */}
                    <PermissionCard
                      title="Exam Marks"
                      permissions={[
                        { key: 'examination_exammarks_view', label: 'View' },
                        { key: 'examination_exammarks_entry', label: 'Entry' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Reports */}
                    <PermissionCard
                      title="Reports"
                      permissions={[
                        { key: 'examination_reports_view', label: 'View' },
                        { key: 'examination_reports_download', label: 'Download' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* Fee - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-pink-200 rounded-lg p-3 bg-pink-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-pink-200">
                    <span className="w-2 h-2 bg-pink-600 rounded-full"></span>
                    Fee Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Collect Fee */}
                    <PermissionCard
                      title="Collect Fee"
                      permissions={[
                        { key: 'fee_collect_view', label: 'View' },
                        { key: 'fee_collect_collect', label: 'Collect' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* View Challan */}
                    <PermissionCard
                      title="View Challan"
                      permissions={[
                        { key: 'fee_challan_view', label: 'View' },
                        { key: 'fee_challan_edit', label: 'Edit' },
                        { key: 'fee_challan_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Create Challan */}
                    <PermissionCard
                      title="Create Challan"
                      permissions={[
                        { key: 'fee_create_view', label: 'View' },
                        { key: 'fee_create_create', label: 'Create' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Fee Policy */}
                    <PermissionCard
                      title="Fee Policy"
                      permissions={[
                        { key: 'fee_policy_view', label: 'View' },
                        { key: 'fee_policy_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* Payroll - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-yellow-200 rounded-lg p-3 bg-yellow-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-yellow-200">
                    <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
                    Payroll Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Create Salary */}
                    <PermissionCard
                      title="Create Salary"
                      permissions={[
                        { key: 'payroll_create_view', label: 'View' },
                        { key: 'payroll_create_create', label: 'Create' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Pay Salary */}
                    <PermissionCard
                      title="Pay Salary"
                      permissions={[
                        { key: 'payroll_pay_view', label: 'View' },
                        { key: 'payroll_pay_pay', label: 'Pay' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Salary Slips */}
                    <PermissionCard
                      title="Salary Slips"
                      permissions={[
                        { key: 'payroll_slips_view', label: 'View' },
                        { key: 'payroll_slips_generate', label: 'Generate' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Reports */}
                    <PermissionCard
                      title="Reports"
                      permissions={[
                        { key: 'payroll_reports_view', label: 'View' },
                        { key: 'payroll_reports_download', label: 'Download' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Other Expenses */}
                    <PermissionCard
                      title="Other Expenses"
                      permissions={[
                        { key: 'payroll_expenses_view', label: 'View' },
                        { key: 'payroll_expenses_add', label: 'Add' },
                        { key: 'payroll_expenses_edit', label: 'Edit' },
                        { key: 'payroll_expenses_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* Transport - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-cyan-200 rounded-lg p-3 bg-cyan-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-cyan-200">
                    <span className="w-2 h-2 bg-cyan-600 rounded-full"></span>
                    Transport Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Passengers */}
                    <PermissionCard
                      title="Passengers"
                      permissions={[
                        { key: 'transport_passengers_view', label: 'View' },
                        { key: 'transport_passengers_add', label: 'Add' },
                        { key: 'transport_passengers_edit', label: 'Edit' },
                        { key: 'transport_passengers_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Vehicles */}
                    <PermissionCard
                      title="Vehicles"
                      permissions={[
                        { key: 'transport_vehicles_view', label: 'View' },
                        { key: 'transport_vehicles_add', label: 'Add' },
                        { key: 'transport_vehicles_edit', label: 'Edit' },
                        { key: 'transport_vehicles_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Routes */}
                    <PermissionCard
                      title="Routes"
                      permissions={[
                        { key: 'transport_routes_view', label: 'View' },
                        { key: 'transport_routes_add', label: 'Add' },
                        { key: 'transport_routes_edit', label: 'Edit' },
                        { key: 'transport_routes_delete', label: 'Delete' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>

                {/* Library Module - Separate Card */}
                <PermissionCard
                  title="Library"
                  permissions={[
                    { key: 'library_library_view', label: 'View' },
                    { key: 'library_library_add', label: 'Add' },
                    { key: 'library_library_edit', label: 'Edit' },
                    { key: 'library_library_delete', label: 'Delete' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Reports Module - Separate Card */}
                <PermissionCard
                  title="Reports"
                  permissions={[
                    { key: 'library_reports_view', label: 'View' },
                    { key: 'library_reports_download', label: 'Download' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Settings - Main Section with nested pages */}
                <div className="md:col-span-2 lg:col-span-4 border border-gray-300 rounded-lg p-3 bg-gray-50/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2.5 flex items-center gap-2 pb-2 border-b border-gray-300">
                    <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                    Settings Module
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Basic Settings */}
                    <PermissionCard
                      title="Basic Settings"
                      permissions={[
                        { key: 'settings_basic_view', label: 'View' },
                        { key: 'settings_basic_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* PDF Settings */}
                    <PermissionCard
                      title="PDF Settings"
                      permissions={[
                        { key: 'settings_pdf_view', label: 'View' },
                        { key: 'settings_pdf_edit', label: 'Edit' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />

                    {/* Manage Access */}
                    <PermissionCard
                      title="Manage Access"
                      permissions={[
                        { key: 'settings_access_view', label: 'View' },
                        { key: 'settings_access_manage', label: 'Manage' }
                      ]}
                      values={permissions}
                      onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                    />
                  </div>
                </div>
              </div>
              </div>

              {/* Compact Footer */}
              <div className="px-5 py-3 bg-white border-t border-gray-200 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Changes will take effect immediately after saving
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPermissionsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Save Permissions
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Compact Permission Card Component
function PermissionCard({ title, subtitle, permissions, values, onChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all">
      <h4 className="font-semibold text-sm text-gray-900 mb-2">{title}</h4>
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      <div className="space-y-1.5">
        {permissions.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={values[key] || false}
              onChange={(e) => onChange(key, e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-1 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
