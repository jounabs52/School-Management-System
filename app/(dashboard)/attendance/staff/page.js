'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardInfoGrid, CardGrid } from '@/components/DataCard'

function StaffAttendanceContent() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [staffList, setStaffList] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [toasts, setToasts] = useState([])

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

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

  const handleCancel = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
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

  // Load staff list and attendance for selected date
  const handleLoadAttendance = async () => {
    if (!currentUser?.school_id) return

    setLoading(true)
    try {
      // Fetch all active staff
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', currentUser.id)          // ✅ Filter by user
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('first_name')

      if (staffError) throw staffError

      setStaffList(staff || [])
      setFilteredStaff(staff || [])

      // Fetch existing attendance records for selected date
      const { data: attendance, error: attendanceError } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('attendance_date', selectedDate)

      if (attendanceError) throw attendanceError

      // Convert attendance array to object with staff_id as key
      const attendanceMap = {}
      if (attendance) {
        attendance.forEach(record => {
          attendanceMap[record.staff_id] = record.status
        })
      }
      setAttendanceRecords(attendanceMap)
      showToast(`Loaded ${staff?.length || 0} staff members successfully`, 'success')

    } catch (error) {
      console.error('Error loading attendance:', error)
      showToast('Failed to load attendance data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filter and search staff
  useEffect(() => {
    let filtered = [...staffList]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(staff => {
        const fullName = `${staff.first_name} ${staff.last_name || ''}`.toLowerCase()
        const fatherName = (staff.father_name || '').toLowerCase()
        const employeeNumber = (staff.employee_number || '').toLowerCase()
        return fullName.includes(searchQuery.toLowerCase()) ||
               fatherName.includes(searchQuery.toLowerCase()) ||
               employeeNumber.includes(searchQuery.toLowerCase())
      })
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(staff => staff.department === filterType)
    }

    setFilteredStaff(filtered)
  }, [searchQuery, filterType, staffList])

  // Mark attendance for a single staff member
  const markAttendance = async (staffId, status) => {
    if (!currentUser?.school_id) return

    setSaving(true)
    try {
      // Check if attendance record exists
      const { data: existing, error: fetchError } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('school_id', currentUser.school_id)
        .eq('staff_id', staffId)
        .eq('attendance_date', selectedDate)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('staff_attendance')
          .update({
            status: status,
            marked_by: currentUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('staff_attendance')
          .insert({
            school_id: currentUser.school_id,
            staff_id: staffId,
            attendance_date: selectedDate,
            status: status,
            marked_by: currentUser.id,
            user_id: currentUser.id
          })

        if (error) throw error
      }

      // Update local state
      setAttendanceRecords(prev => ({
        ...prev,
        [staffId]: status
      }))

    } catch (error) {
      console.error('Error marking attendance:', error)
      showToast(`Failed to mark attendance: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Mark all staff attendance
  const handleMarkAll = async (status) => {
    if (!status || status === '') return
    if (!currentUser?.school_id) return
    if (filteredStaff.length === 0) {
      showToast('Please load staff list first', 'warning')
      return
    }

    showConfirmDialog(
      'Mark All Attendance',
      `Are you sure you want to mark all ${filteredStaff.length} staff members as ${status}?`,
      async () => {
        setSaving(true)
        try {
          for (const staff of filteredStaff) {
            await markAttendance(staff.id, status)
          }
          showToast('Attendance marked for all staff successfully', 'success')
        } catch (error) {
          console.error('Error marking all attendance:', error)
          showToast('Failed to mark all attendance', 'error')
        } finally {
          setSaving(false)
        }
      }
    )
  }

  // Get unique departments for filter
  const departments = ['all', ...new Set(staffList.map(s => s.department).filter(d => d))]

  return (
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4">
      <h1 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Staff Attendance</h1>

      {/* Date Picker and Load Button */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-2 sm:mb-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Fetch Staff List for Attendance
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
              />
              <button
                onClick={handleLoadAttendance}
                disabled={loading}
                className="bg-red-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 transition-colors w-full sm:w-auto"
              >
                {loading ? 'Loading...' : 'Load Attendance'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      {staffList.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-2 sm:mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Members</option>
                {departments.filter(d => d !== 'all').map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="text"
                placeholder="Search by name, father name, or employee number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <select
                onChange={(e) => handleMarkAll(e.target.value)}
                value=""
                disabled={saving}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Mark All Attendance</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half-day">Short Leave</option>
                <option value="on-leave">Leave</option>
                <option value="late">Late</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Staff Attendance Table */}
      {staffList.length > 0 ? (
        <ResponsiveTableWrapper
          tableView={
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap">Sr.</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap">Name</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold hidden sm:table-cell whitespace-nowrap">Father Name</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold hidden md:table-cell whitespace-nowrap">Comp.</th>
                  <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-center font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff, index) => {
                    const currentStatus = attendanceRecords[staff.id]
                    return (
                      <tr key={staff.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                        <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 whitespace-nowrap">{index + 1}</td>
                        <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {staff.photo_url ? (
                              <img
                                src={staff.photo_url}
                                alt={staff.first_name}
                                className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                                {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                                {staff.first_name} {staff.last_name}
                              </div>
                              <div className="text-xs sm:text-xs md:text-sm text-gray-500 truncate">{staff.employee_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 hidden sm:table-cell whitespace-nowrap">{staff.father_name || '-'}</td>
                        <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 hidden md:table-cell whitespace-nowrap">{staff.department || '-'}</td>
                        <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2">
                          <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 flex-wrap">
                            <button
                              onClick={() => markAttendance(staff.id, 'present')}
                              disabled={saving}
                              className={`px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 text-xs sm:text-xs md:text-sm rounded transition-colors ${
                                currentStatus === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-green-600 border border-green-600 hover:bg-green-50'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'absent')}
                              disabled={saving}
                              className={`px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 text-xs sm:text-xs md:text-sm rounded transition-colors ${
                                currentStatus === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-white text-red-600 border border-red-600 hover:bg-red-50'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'half-day')}
                              disabled={saving}
                              className={`px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 text-xs sm:text-xs md:text-sm rounded transition-colors hidden sm:inline-block ${
                                currentStatus === 'half-day'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              Short Leave
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'on-leave')}
                              disabled={saving}
                              className={`px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 text-xs sm:text-xs md:text-sm rounded transition-colors ${
                                currentStatus === 'on-leave'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              Leave
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'late')}
                              disabled={saving}
                              className={`px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 text-xs sm:text-xs md:text-sm rounded transition-colors ${
                                currentStatus === 'late'
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-white text-orange-600 border border-orange-600 hover:bg-orange-50'
                              }`}
                            >
                              Late
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'half-day')}
                              disabled={saving}
                              className={`px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 text-xs sm:text-xs md:text-sm rounded transition-colors sm:hidden ${
                                currentStatus === 'half-day'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              S.L.
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="border border-gray-200 px-2 sm:px-3 md:px-4 py-4 sm:py-6 md:py-8 text-center text-gray-500 text-xs sm:text-sm">
                      No staff members found matching your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          }
          cardView={
            <CardGrid>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff, index) => {
                  const currentStatus = attendanceRecords[staff.id]
                  return (
                    <DataCard key={staff.id}>
                      <CardHeader
                        srNumber={index + 1}
                        photo={staff.photo_url || `${staff.first_name?.charAt(0)}${staff.last_name?.charAt(0)}`}
                        name={`${staff.first_name} ${staff.last_name}`}
                        subtitle={staff.employee_number || 'N/A'}
                      />
                      <CardInfoGrid>
                        <CardRow label="Father" value={staff.father_name || 'N/A'} />
                        <CardRow label="Comp." value={staff.employee_number || 'N/A'} />
                      </CardInfoGrid>
                      <div className="grid grid-cols-2 gap-1 pt-1.5 mt-1.5 border-t border-gray-100">
                        <button
                          onClick={() => markAttendance(staff, 'present')}
                          disabled={saving}
                          className={`px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
                            currentStatus === 'present'
                              ? 'bg-green-600 text-white'
                              : 'bg-white text-green-600 border border-green-600'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance(staff, 'absent')}
                          disabled={saving}
                          className={`px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
                            currentStatus === 'absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-white text-red-600 border border-red-600'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => markAttendance(staff, 'half-day')}
                          disabled={saving}
                          className={`px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
                            currentStatus === 'half-day'
                              ? 'bg-orange-600 text-white'
                              : 'bg-white text-orange-600 border border-orange-600'
                          }`}
                        >
                          Short
                        </button>
                        <button
                          onClick={() => markAttendance(staff, 'late')}
                          disabled={saving}
                          className={`px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
                            currentStatus === 'late'
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-purple-600 border border-purple-600'
                          }`}
                        >
                          Late
                        </button>
                      </div>
                    </DataCard>
                  )
                })
              ) : (
                <div className="p-4 text-center text-gray-500 text-xs">
                  No staff members found matching your search criteria
                </div>
              )}
            </CardGrid>
          }
          loading={loading}
          empty={filteredStaff.length === 0}
          emptyMessage="No staff members found matching your search criteria"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-5 lg:p-6 text-center text-gray-500 text-xs sm:text-sm">
          Please select a date and click "Load Attendance" to view staff list
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/80 sm:bg-black/50 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in" onClick={handleCancel}>
            <div
              className="w-full sm:w-auto sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 sm:p-4 md:p-5 bg-red-600 text-white rounded-t-lg">
                <h3 className="text-sm sm:text-base font-semibold">{confirmDialog.title}</h3>
                <button onClick={handleCancel} className="text-white hover:text-gray-200">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="p-3 sm:p-4 md:p-5">
                <p className="text-gray-600 text-xs sm:text-sm">{confirmDialog.message}</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 border-t bg-gray-50">
                <button
                  onClick={handleCancel}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 text-white bg-red-600 rounded hover:bg-red-700 text-xs sm:text-sm w-full sm:w-auto"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-[9999] space-y-2 max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] md:max-w-sm lg:max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg min-w-[180px] sm:min-w-[250px] md:min-w-[300px] text-xs sm:text-sm ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200 flex-shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        ))}
      </div>

      {saving && (
        <div className="fixed bottom-2 sm:bottom-4 right-2 sm:right-4 bg-blue-600 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded shadow-lg z-50 text-xs sm:text-sm">
          Saving attendance...
        </div>
      )}
    </div>
  )
}

export default function StaffAttendancePage() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const user = getUserFromCookie()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="attendance_staff_view"
      pageName="Staff Attendance"
    >
      <StaffAttendanceContent />
    </PermissionGuard>
  )
}