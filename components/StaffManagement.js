'use client'

import { useState, useEffect } from 'react'
import { X, UserPlus, Shield, Trash2, Search, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function StaffManagement({ currentUser, showToast }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [staffMembers, setStaffMembers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

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
    dashboard_view_stats: false,

    // Students
    students_view: false,
    students_add: false,
    students_edit: false,
    students_delete: false,

    // Staff/HR
    staff_view: false,
    staff_add: false,
    staff_edit: false,
    staff_delete: false,

    // Attendance
    attendance_view: false,
    attendance_mark: false,
    attendance_edit: false,

    // Classes
    classes_view: false,
    classes_add: false,
    classes_edit: false,
    classes_delete: false,

    // Timetable
    timetable_view: false,
    timetable_edit: false,

    // Exams
    exams_view: false,
    exams_add: false,
    exams_edit: false,
    exams_delete: false,
    exams_marks_entry: false,

    // Fee Management
    fee_view: false,
    fee_collect: false,
    fee_create_challan: false,
    fee_reports: false,

    // Payroll
    payroll_view: false,
    payroll_process: false,
    payroll_reports: false,

    // Transport
    transport_view: false,
    transport_edit: false,

    // Library
    library_view: false,
    library_issue: false,
    library_return: false,

    // Reports
    reports_view: false,
    reports_download: false,

    // Settings
    settings_view: false,
    settings_edit: false
  })

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchStaffMembers()
    }
  }, [currentUser])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddModal || showPermissionsModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAddModal, showPermissionsModal])

  const fetchStaffMembers = async () => {
    if (!currentUser?.school_id) {
      console.log('No school_id found in currentUser')
      return
    }

    setLoading(true)
    try {
      // Fetch users without the staff relationship to avoid schema issues
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, email, role, status, created_at, staff_id')
        .eq('school_id', currentUser.school_id)
        .neq('id', currentUser.id)
        .order('created_at', { ascending: false })

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

    if (!formData.name || !formData.email || !formData.password) {
      if (showToast) showToast('Please fill all required fields', 'warning')
      return
    }

    setSaving(true)
    try {
      // Create user account
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          school_id: currentUser.school_id,
          username: formData.email.split('@')[0],
          email: formData.email,
          password: formData.password,
          role: 'staff',
          status: 'active'
        })
        .select()
        .single()

      if (userError) throw userError

      if (showToast) showToast('Staff member added successfully!', 'success')
      setShowAddModal(false)
      resetForm()
      fetchStaffMembers()
    } catch (error) {
      console.error('Error adding staff:', error)
      if (showToast) showToast('Error adding staff member: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStaff = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', staffId)
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      if (showToast) showToast('Staff member deleted successfully', 'success')
      fetchStaffMembers()
    } catch (error) {
      console.error('Error deleting staff:', error)
      if (showToast) showToast('Error deleting staff member', 'error')
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
        setPermissions(data.permissions || {})
      } else {
        // Reset to defaults
        setPermissions({
          dashboard_view_stats: false,
          students_view: false,
          students_add: false,
          students_edit: false,
          students_delete: false,
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
      const { error } = await supabase
        .from('staff_permissions')
        .upsert({
          user_id: selectedStaff.id,
          school_id: currentUser.school_id,
          permissions: permissions,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,school_id'
        })

      if (error) throw error

      if (showToast) showToast('Permissions saved successfully!', 'success')
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
    const searchLower = searchTerm.toLowerCase()
    const name = staff.staff ? `${staff.staff.first_name} ${staff.staff.last_name}` : staff.username
    return name.toLowerCase().includes(searchLower) ||
           staff.email.toLowerCase().includes(searchLower)
  })

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
                    {filteredStaff.map((staff) => (
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
                            {staff.staff?.phone || 'N/A'}
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
                              onClick={() => openPermissionsModal(staff)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition text-blue-600"
                              title="Manage Permissions"
                            >
                              <Shield className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder=""
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

      {/* Permissions Modal */}
      {showPermissionsModal && selectedStaff && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPermissionsModal(false)
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Manage Permissions</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {selectedStaff.staff ? `${selectedStaff.staff.first_name} ${selectedStaff.staff.last_name}` : selectedStaff.username}
                </p>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                type="button"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Dashboard */}
                <PermissionCard
                  title="Dashboard"
                  permissions={[
                    { key: 'dashboard_view_stats', label: 'View Stats' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Students */}
                <PermissionCard
                  title="Students"
                  permissions={[
                    { key: 'students_view', label: 'View' },
                    { key: 'students_add', label: 'Add' },
                    { key: 'students_edit', label: 'Edit' },
                    { key: 'students_delete', label: 'Delete' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Staff/HR */}
                <PermissionCard
                  title="Staff / HR"
                  permissions={[
                    { key: 'staff_view', label: 'View' },
                    { key: 'staff_add', label: 'Add' },
                    { key: 'staff_edit', label: 'Edit' },
                    { key: 'staff_delete', label: 'Delete' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Attendance */}
                <PermissionCard
                  title="Attendance"
                  permissions={[
                    { key: 'attendance_view', label: 'View' },
                    { key: 'attendance_mark', label: 'Mark' },
                    { key: 'attendance_edit', label: 'Edit' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Classes */}
                <PermissionCard
                  title="Classes"
                  permissions={[
                    { key: 'classes_view', label: 'View' },
                    { key: 'classes_add', label: 'Add' },
                    { key: 'classes_edit', label: 'Edit' },
                    { key: 'classes_delete', label: 'Delete' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Timetable */}
                <PermissionCard
                  title="Timetable"
                  permissions={[
                    { key: 'timetable_view', label: 'View' },
                    { key: 'timetable_edit', label: 'Edit' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Exams */}
                <PermissionCard
                  title="Exams"
                  permissions={[
                    { key: 'exams_view', label: 'View' },
                    { key: 'exams_add', label: 'Add' },
                    { key: 'exams_edit', label: 'Edit' },
                    { key: 'exams_delete', label: 'Delete' },
                    { key: 'exams_marks_entry', label: 'Marks Entry' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Fee Management */}
                <PermissionCard
                  title="Fee Management"
                  permissions={[
                    { key: 'fee_view', label: 'View' },
                    { key: 'fee_collect', label: 'Collect' },
                    { key: 'fee_create_challan', label: 'Create Challan' },
                    { key: 'fee_reports', label: 'Reports' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Payroll */}
                <PermissionCard
                  title="Payroll"
                  permissions={[
                    { key: 'payroll_view', label: 'View' },
                    { key: 'payroll_process', label: 'Process' },
                    { key: 'payroll_reports', label: 'Reports' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Transport */}
                <PermissionCard
                  title="Transport"
                  permissions={[
                    { key: 'transport_view', label: 'View' },
                    { key: 'transport_edit', label: 'Edit' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Library */}
                <PermissionCard
                  title="Library"
                  permissions={[
                    { key: 'library_view', label: 'View' },
                    { key: 'library_issue', label: 'Issue' },
                    { key: 'library_return', label: 'Return' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Reports */}
                <PermissionCard
                  title="Reports"
                  permissions={[
                    { key: 'reports_view', label: 'View' },
                    { key: 'reports_download', label: 'Download' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />

                {/* Settings */}
                <PermissionCard
                  title="Settings"
                  permissions={[
                    { key: 'settings_view', label: 'View' },
                    { key: 'settings_edit', label: 'Edit' }
                  ]}
                  values={permissions}
                  onChange={(key, value) => setPermissions({ ...permissions, [key]: value })}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Permissions'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Permission Card Component
function PermissionCard({ title, permissions, values, onChange }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h4 className="font-semibold text-sm text-gray-800 mb-3">{title}</h4>
      <div className="space-y-2">
        {permissions.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={values[key] || false}
              onChange={(e) => onChange(key, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
