'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

function StudentAttendanceContent() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [studentList, setStudentList] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('default')
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

  // Fetch classes
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchClasses()
    }
  }, [currentUser])

  // Fetch sections when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSections(selectedClass)
    } else {
      setSections([])
      setSelectedSection('')
    }
  }, [selectedClass])

  // Auto-search when search query changes
  useEffect(() => {
    if (studentList.length > 0) {
      handleSearch()
    }
  }, [searchQuery, studentList])

  const fetchClasses = async () => {
    if (!currentUser?.school_id) return

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', currentUser.id)          // ✅ Filter by user
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('order_number')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
      showToast('Error fetching classes', 'error')
    }
  }

  const fetchSections = async (classId) => {
    if (!currentUser?.school_id || !classId) return

    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('user_id', currentUser.id)          // ✅ Filter by user
        .eq('school_id', currentUser.school_id)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('section_name')

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Error fetching sections:', error)
      showToast('Error fetching sections', 'error')
    }
  }

  // Load students and attendance for selected class/section
  const handleLoadAttendance = async () => {
    if (!currentUser?.school_id) {
      showToast('User not found', 'error')
      return
    }

    if (!selectedClass) {
      showToast('Please select a class', 'warning')
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('user_id', currentUser.id)          // ✅ Filter by user
        .eq('school_id', currentUser.school_id)
        .eq('current_class_id', selectedClass)
        .eq('status', 'active')
        .order('roll_number')

      if (selectedSection) {
        query = query.eq('current_section_id', selectedSection)
      }

      const { data: students, error: studentsError } = await query

      if (studentsError) throw studentsError

      setStudentList(students || [])
      setFilteredStudents(students || [])

      // Fetch existing attendance records for selected date
      let attendanceQuery = supabase
        .from('student_attendance')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('class_id', selectedClass)
        .eq('attendance_date', selectedDate)

      if (selectedSection) {
        attendanceQuery = attendanceQuery.eq('section_id', selectedSection)
      }

      const { data: attendance, error: attendanceError } = await attendanceQuery

      if (attendanceError) throw attendanceError

      // Convert attendance array to object with student_id as key
      const attendanceMap = {}
      if (attendance) {
        attendance.forEach(record => {
          attendanceMap[record.student_id] = record.status
        })
      }
      setAttendanceRecords(attendanceMap)
      showToast(`Loaded ${students?.length || 0} students successfully`, 'success')

    } catch (error) {
      console.error('Error loading attendance:', error)
      showToast('Failed to load attendance data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Search and filter students (auto-search)
  const handleSearch = () => {
    let filtered = [...studentList]

    if (searchQuery.trim()) {
      filtered = filtered.filter(student => {
        const fullName = `${student.first_name} ${student.last_name || ''}`.toLowerCase()
        const fatherName = (student.father_name || '').toLowerCase()
        const admissionNumber = (student.admission_number || '').toLowerCase()
        const rollNumber = (student.roll_number || '').toString().toLowerCase()

        const query = searchQuery.toLowerCase()

        return fullName.includes(query) ||
               fatherName.includes(query) ||
               admissionNumber.includes(query) ||
               rollNumber.includes(query)
      })
    }

    setFilteredStudents(filtered)
  }

  // Mark attendance for a single student
  const markAttendance = async (student, status) => {
    if (!currentUser?.school_id) return

    setSaving(true)
    try {
      // Check if attendance record exists
      const { data: existing } = await supabase
        .from('student_attendance')
        .select('id')
        .eq('school_id', currentUser.school_id)
        .eq('student_id', student.id)
        .eq('attendance_date', selectedDate)
        .single()

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('student_attendance')
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
          .from('student_attendance')
          .insert({
            user_id: currentUser.id,
            school_id: currentUser.school_id,
            student_id: student.id,
            class_id: student.current_class_id,
            section_id: student.current_section_id,
            attendance_date: selectedDate,
            status: status,
            marked_by: currentUser.id
          })

        if (error) throw error
      }

      // Update local state
      setAttendanceRecords(prev => ({
        ...prev,
        [student.id]: status
      }))

    } catch (error) {
      console.error('Error marking attendance:', error)
      showToast('Failed to mark attendance', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Mark all students attendance
  const handleMarkAll = async (status) => {
    if (!status || status === '') return
    if (!currentUser?.school_id) return
    if (filteredStudents.length === 0) {
      showToast('Please load student list first', 'warning')
      return
    }

    showConfirmDialog(
      'Mark All Attendance',
      `Are you sure you want to mark all ${filteredStudents.length} students as ${status}?`,
      async () => {
        setSaving(true)
        try {
          for (const student of filteredStudents) {
            await markAttendance(student, status)
          }
          showToast('Attendance marked for all students successfully', 'success')
        } catch (error) {
          console.error('Error marking all attendance:', error)
          showToast('Failed to mark all attendance', 'error')
        } finally {
          setSaving(false)
        }
      }
    )
  }

  // Get class name by ID
  const getClassName = (classId) => {
    const classObj = classes.find(c => c.id === classId)
    return classObj?.class_name || 'N/A'
  }

  // Get section name by ID
  const getSectionName = (sectionId) => {
    if (!sectionId) return ''
    const sectionObj = sections.find(s => s.id === sectionId)
    return sectionObj?.section_name || ''
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-bold mb-4">Student Attendance</h1>

      {/* Fetch Students Section */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
        <h2 className="text-lg font-semibold mb-3">Fetch Students for Attendance</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value)
                setStudentList([])
                setFilteredStudents([])
                setAttendanceRecords({})
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.class_name}</option>
              ))}
            </select>
          </div>

          {sections.length > 0 && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value)
                  setStudentList([])
                  setFilteredStudents([])
                  setAttendanceRecords({})
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Sections</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.section_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleLoadAttendance}
            disabled={loading}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium transition-colors"
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      {studentList.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="default">Default Search</option>
                <option value="name">By Name</option>
                <option value="admission">By Admission Number</option>
                <option value="roll">By Roll Number</option>
              </select>
            </div>

            <div className="flex-1">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Members</option>
              </select>
            </div>

            <div className="flex-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex-1">
              <select
                onChange={(e) => handleMarkAll(e.target.value)}
                value=""
                disabled={saving}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* Students Table */}
      {studentList.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Sr.</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Name</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Father Name</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">ADM</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Class</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Roll.No</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, index) => {
                    const currentStatus = attendanceRecords[student.id]
                    return (
                      <tr key={student.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{index + 1}</td>
                        <td className="border border-gray-200 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {student.photo_url ? (
                              <img 
                                src={student.photo_url} 
                                alt={student.first_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {student.first_name} {student.last_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{student.father_name || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{student.admission_number || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-700">
                          {getClassName(student.current_class_id)}
                          {getSectionName(student.current_section_id) && `(${getSectionName(student.current_section_id)})`}
                        </td>
                        <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{student.roll_number || '-'}</td>
                        <td className="border border-gray-200 px-3 py-2.5">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <button
                              onClick={() => markAttendance(student, 'present')}
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
                              onClick={() => markAttendance(student, 'absent')}
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
                              onClick={() => markAttendance(student, 'half-day')}
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
                              onClick={() => markAttendance(student, 'on-leave')}
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
                              onClick={() => markAttendance(student, 'late')}
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
                    <td colSpan="7" className="border border-gray-200 px-3 py-6 text-center text-gray-500">
                      No students found matching your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
          Please select a class and click "Load" to view students
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
              <div className="flex items-center justify-between p-4 bg-red-600 text-white rounded-t-lg">
                <h3 className="text-lg font-semibold">{confirmDialog.title}</h3>
                <button onClick={handleCancel} className="text-white hover:text-gray-200">
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

export default function StudentAttendancePage() {
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
      permissionKey="attendance_student_view"
      pageName="Student Attendance"
    >
      <StudentAttendanceContent />
    </PermissionGuard>
  )
}