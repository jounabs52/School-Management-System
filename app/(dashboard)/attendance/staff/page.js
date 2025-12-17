'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'

export default function StaffAttendancePage() {
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
      const { data: existing } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('school_id', currentUser.school_id)
        .eq('staff_id', staffId)
        .eq('attendance_date', selectedDate)
        .single()

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
            marked_by: currentUser.id
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
      showToast('Failed to mark attendance', 'error')
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
    <div className="p-1">
      <h1 className="text-2xl font-bold mb-4">Staff Attendance</h1>

      {/* Date Picker and Load Button */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fetch Staff List for Attendance
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleLoadAttendance}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Loading...' : 'Load Attendance'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      {staffList.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Members</option>
                {departments.filter(d => d !== 'all').map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, father name, or employee number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <select
                onChange={(e) => handleMarkAll(e.target.value)}
                value=""
                disabled={saving}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Sr.</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Name</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Father Name</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Comp.</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff, index) => {
                    const currentStatus = attendanceRecords[staff.id]
                    return (
                      <tr key={staff.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{index + 1}</td>
                        <td className="border border-gray-200 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {staff.photo_url ? (
                              <img
                                src={staff.photo_url}
                                alt={staff.first_name}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {staff.first_name} {staff.last_name}
                              </div>
                              <div className="text-xs text-gray-500">{staff.employee_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{staff.father_name || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{staff.department || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2.5">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <button
                              onClick={() => markAttendance(staff.id, 'present')}
                              disabled={saving}
                              className={`px-2 py-1 text-xs rounded ${
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
                              className={`px-2 py-1 text-xs rounded ${
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
                              className={`px-2 py-1 text-xs rounded ${
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
                              className={`px-2 py-1 text-xs rounded ${
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
                              className={`px-2 py-1 text-xs rounded ${
                                currentStatus === 'late'
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-white text-orange-600 border border-orange-600 hover:bg-orange-50'
                              }`}
                            >
                              Late
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="border border-gray-200 px-3 py-6 text-center text-gray-500">
                      No staff members found matching your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
          Please select a date and click "Load Attendance" to view staff list
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center" onClick={handleCancel}>
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3>
                <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-gray-600">{confirmDialog.message}</p>
              </div>
              <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
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
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50">
          Saving attendance...
        </div>
      )}
    </div>
  )
}