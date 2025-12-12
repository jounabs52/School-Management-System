'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

    } catch (error) {
      console.error('Error loading attendance:', error)
      alert('Failed to load attendance data')
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
      alert('Failed to mark attendance')
    } finally {
      setSaving(false)
    }
  }

  // Mark all staff attendance
  const handleMarkAll = async (status) => {
    if (!status || status === '') return
    if (!currentUser?.school_id) return
    if (filteredStaff.length === 0) {
      alert('Please load staff list first')
      return
    }

    const confirmed = confirm(`Mark all ${filteredStaff.length} staff members as ${status}?`)
    if (!confirmed) return

    setSaving(true)
    try {
      for (const staff of filteredStaff) {
        await markAttendance(staff.id, status)
      }
      alert('Attendance marked for all staff successfully')
    } catch (error) {
      console.error('Error marking all attendance:', error)
      alert('Failed to mark all attendance')
    } finally {
      setSaving(false)
    }
  }

  // Get unique departments for filter
  const departments = ['all', ...new Set(staffList.map(s => s.department).filter(d => d))]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Staff Attendance</h1>

      {/* Date Picker and Load Button */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fetch Staff List for Attendance
            </label>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              />
              <button
                onClick={handleLoadAttendance}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Load Attendance'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      {staffList.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
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
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <select
                onChange={(e) => handleMarkAll(e.target.value)}
                value=""
                disabled={saving}
                className="w-full border border-gray-300 rounded px-3 py-2"
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sr.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Father Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Comp.</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff, index) => {
                    const currentStatus = attendanceRecords[staff.id]
                    return (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {staff.first_name} {staff.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{staff.employee_number}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{staff.father_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{staff.department || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2 flex-wrap">
                            <button
                              onClick={() => markAttendance(staff.id, 'present')}
                              disabled={saving}
                              className={`px-3 py-1 text-xs rounded ${
                                currentStatus === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'absent')}
                              disabled={saving}
                              className={`px-3 py-1 text-xs rounded ${
                                currentStatus === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'half-day')}
                              disabled={saving}
                              className={`px-3 py-1 text-xs rounded ${
                                currentStatus === 'half-day'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              Short Leave
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'on-leave')}
                              disabled={saving}
                              className={`px-3 py-1 text-xs rounded ${
                                currentStatus === 'on-leave'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              Leave
                            </button>
                            <button
                              onClick={() => markAttendance(staff.id, 'late')}
                              disabled={saving}
                              className={`px-3 py-1 text-xs rounded ${
                                currentStatus === 'late'
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
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
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      No staff members found matching your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Please select a date and click "Load Attendance" to view staff list
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">
          Saving attendance...
        </div>
      )}
    </div>
  )
}
