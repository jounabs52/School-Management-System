// app/(dashboard)/students/active/page.js
'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Edit2, Trash2, Loader2, AlertCircle, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

export default function ActiveStudentsPage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingSections, setLoadingSections] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showOtherDetails, setShowOtherDetails] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    admissionNo: '',
    class: '',
    section: '',
    admissionDate: new Date().toISOString().split('T')[0],
    discount: '',
    baseFee: '',
    discountNote: '',
    photoUrl: '',
    rollNumber: '',
    house: '',
    studentName: '',
    fatherName: '',
    fatherMobile: '',
    fatherEmail: '',
    fatherCnic: '',
    fatherOccupation: '',
    fatherQualification: '',
    fatherAnnualIncome: '',
    whatsappNumber: '',
    dateOfBirth: '',
    studentCnic: '',
    studentMobile: '',
    casteRace: '',
    gender: 'male',
    birthPlace: '',
    currentAddress: '',
    city: '',
    state: '',
    postalCode: '',
    motherName: '',
    motherCnic: '',
    motherMobile: '',
    motherEmail: '',
    motherQualification: '',
    motherOccupation: '',
    motherAnnualIncome: '',
    guardianName: '',
    guardianRelation: '',
    guardianMobile: '',
    guardianEmail: '',
    emergencyContactName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    emergencyMobile: '',
    emergencyAddress: '',
    religion: '',
    nationality: 'Pakistan',
    previousSchool: '',
    previousClass: '',
    permanentAddress: '',
    medicalProblem: '',
    bloodGroup: ''
  })

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses()
  }, [])

  // Fetch students on component mount and when filters change
  useEffect(() => {
    fetchStudents()
  }, [selectedClass])

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showEditModal || showViewModal || showDeleteModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showEditModal, showViewModal, showDeleteModal])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, standard_fee, status')
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) throw error

      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError('Failed to load classes')
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSections = async (classId) => {
    if (!classId) {
      setSections([])
      return
    }

    setLoadingSections(true)
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, section_name, status')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (error) throw error

      setSections(data || [])
    } catch (err) {
      console.error('Error fetching sections:', err)
      setSections([])
    } finally {
      setLoadingSections(false)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // Apply class filter if selected
      if (selectedClass) {
        query = query.eq('current_class_id', selectedClass)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }

      if (!data) {
        setStudents([])
        return
      }

      const formattedStudents = data.map((student, index) => ({
        id: student.id,
        sr: index + 1,
        admNo: student.admission_number,
        name: `${student.first_name}${student.last_name ? ' ' + student.last_name : ''}`,
        father: student.father_name || 'N/A',
        class: student.current_class_id,
        session: '2024-2025',
        gender: student.gender,
        avatar: student.gender === 'female' ? '👧' : (student.gender === 'male' ? '👦' : '🧑'),
        dateOfBirth: student.date_of_birth,
        admissionDate: student.admission_date,
        status: student.status,
        cnic: student.admission_number // Using admission number as CNIC for search
      }))

      setStudents(formattedStudents)
    } catch (err) {
      console.error('Error fetching students:', err)
      setError(`Failed to load students: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getClassName = (classId) => {
    const classObj = classes.find(c => c.id === classId)
    return classObj?.class_name || classId || 'N/A'
  }

  // Filter students based on search query
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      student.name.toLowerCase().includes(query) ||
      student.father.toLowerCase().includes(query) ||
      student.admNo.toString().toLowerCase().includes(query) ||
      student.cnic.toString().toLowerCase().includes(query)
    )
  })

  const handleView = (student) => {
    setSelectedStudent(student)
    setShowViewModal(true)
  }

  const handleDelete = (student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      // Soft delete - update status to inactive
      const { error: deleteError } = await supabase
        .from('students')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', selectedStudent.id)

      if (deleteError) throw deleteError

      setSuccess('Student marked as inactive successfully!')
      setShowDeleteModal(false)
      setSelectedStudent(null)
      fetchStudents() // Refresh the list

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to delete student')
      console.error('Delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = async (student) => {
    setError(null)
    setSuccess(null)

    try {
      // Toggle between active and inactive
      const newStatus = student.status === 'active' ? 'inactive' : 'active'

      const { error: updateError } = await supabase
        .from('students')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', student.id)

      if (updateError) throw updateError

      const statusText = newStatus === 'active' ? 'activated' : 'deactivated'
      setSuccess(`Student ${statusText} successfully!`)
      fetchStudents() // Refresh the list

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update student status')
      console.error('Toggle status error:', err)
    }
  }

  const handleEdit = async (student) => {
    // Open modal immediately without loading state
    setShowEditModal(true)

    try {
      // Fetch full student details in background
      const { data: fullStudent, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .single()

      if (error) throw error

      // Fetch sections for the student's class
      if (fullStudent.current_class_id) {
        await fetchSections(fullStudent.current_class_id)
      }

      // Find the class to get base fee
      const selectedClass = classes.find(c => c.id === fullStudent.current_class_id)

      setFormData({
        id: fullStudent.id,
        admissionNo: fullStudent.admission_number || '',
        class: fullStudent.current_class_id || '',
        section: fullStudent.current_section_id || '',
        admissionDate: fullStudent.admission_date || '',
        discount: fullStudent.discount_amount || '',
        baseFee: fullStudent.base_fee || selectedClass?.standard_fee || '',
        discountNote: fullStudent.discount_note || '',
        photoUrl: fullStudent.photo_url || '',
        rollNumber: fullStudent.roll_number || '',
        house: fullStudent.house || '',
        studentName: `${fullStudent.first_name}${fullStudent.last_name ? ' ' + fullStudent.last_name : ''}`,
        fatherName: fullStudent.father_name || '',
        fatherMobile: fullStudent.father_phone || '',
        fatherEmail: fullStudent.father_email || '',
        fatherCnic: fullStudent.father_cnic || '',
        fatherOccupation: fullStudent.father_occupation || '',
        fatherQualification: fullStudent.father_qualification || '',
        fatherAnnualIncome: fullStudent.father_annual_income || '',
        whatsappNumber: fullStudent.whatsapp_number || '',
        dateOfBirth: fullStudent.date_of_birth || '',
        studentCnic: fullStudent.student_cnic || '',
        studentMobile: fullStudent.student_mobile || '',
        casteRace: fullStudent.caste || '',
        gender: fullStudent.gender || 'male',
        birthPlace: fullStudent.birth_place || '',
        currentAddress: fullStudent.current_address || '',
        city: fullStudent.city || '',
        state: fullStudent.state || '',
        postalCode: fullStudent.postal_code || '',
        motherName: fullStudent.mother_name || '',
        motherCnic: fullStudent.mother_cnic || '',
        motherMobile: fullStudent.mother_phone || '',
        motherEmail: fullStudent.mother_email || '',
        motherQualification: fullStudent.mother_qualification || '',
        motherOccupation: fullStudent.mother_occupation || '',
        motherAnnualIncome: fullStudent.mother_annual_income || '',
        guardianName: fullStudent.guardian_name || '',
        guardianRelation: fullStudent.guardian_relation || '',
        guardianMobile: fullStudent.guardian_phone || '',
        guardianEmail: fullStudent.guardian_email || '',
        emergencyContactName: fullStudent.emergency_contact_name || '',
        emergencyRelation: fullStudent.emergency_relation || '',
        emergencyPhone: fullStudent.emergency_phone || '',
        emergencyMobile: fullStudent.emergency_mobile || '',
        emergencyAddress: fullStudent.emergency_address || '',
        religion: fullStudent.religion || '',
        nationality: fullStudent.nationality || 'Pakistan',
        previousSchool: fullStudent.previous_school || '',
        previousClass: fullStudent.previous_class || '',
        permanentAddress: fullStudent.permanent_address || '',
        medicalProblem: fullStudent.medical_problem || '',
        bloodGroup: fullStudent.blood_group || ''
      })
    } catch (err) {
      setError(err.message || 'Failed to load student details')
      console.error('Edit error:', err)
      setShowEditModal(false)
    }
  }

  const handleClassChange = (classId) => {
    const selectedClass = classes.find(c => c.id === classId)
    setFormData({
      ...formData,
      class: classId,
      section: '', // Reset section when class changes
      baseFee: selectedClass?.standard_fee || ''
    })
    // Fetch sections for the selected class
    fetchSections(classId)
  }

  const handleSaveStudent = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Split student name
      const nameParts = formData.studentName.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || null

      // Update student
      const { error: updateError } = await supabase
        .from('students')
        .update({
          admission_number: formData.admissionNo,
          first_name: firstName,
          last_name: lastName,
          father_name: formData.fatherName,
          father_phone: formData.fatherMobile || null,
          father_email: formData.fatherEmail || null,
          father_cnic: formData.fatherCnic || null,
          father_occupation: formData.fatherOccupation || null,
          father_qualification: formData.fatherQualification || null,
          father_annual_income: parseFloat(formData.fatherAnnualIncome) || null,
          mother_name: formData.motherName || null,
          mother_phone: formData.motherMobile || null,
          mother_email: formData.motherEmail || null,
          mother_cnic: formData.motherCnic || null,
          mother_occupation: formData.motherOccupation || null,
          mother_qualification: formData.motherQualification || null,
          mother_annual_income: parseFloat(formData.motherAnnualIncome) || null,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender,
          student_cnic: formData.studentCnic || null,
          student_mobile: formData.studentMobile || null,
          blood_group: formData.bloodGroup || null,
          caste: formData.casteRace || null,
          birth_place: formData.birthPlace || null,
          religion: formData.religion || null,
          nationality: formData.nationality || 'Pakistan',
          current_address: formData.currentAddress || null,
          city: formData.city || null,
          state: formData.state || null,
          postal_code: formData.postalCode || null,
          permanent_address: formData.permanentAddress || null,
          whatsapp_number: formData.whatsappNumber || null,
          guardian_name: formData.guardianName || null,
          guardian_relation: formData.guardianRelation || null,
          guardian_phone: formData.guardianMobile || null,
          guardian_email: formData.guardianEmail || null,
          emergency_contact_name: formData.emergencyContactName || null,
          emergency_relation: formData.emergencyRelation || null,
          emergency_phone: formData.emergencyPhone || null,
          emergency_mobile: formData.emergencyMobile || null,
          emergency_address: formData.emergencyAddress || null,
          previous_school: formData.previousSchool || null,
          previous_class: formData.previousClass || null,
          medical_problem: formData.medicalProblem || null,
          admission_date: formData.admissionDate,
          current_class_id: formData.class || null,
          current_section_id: formData.section || null,
          roll_number: formData.rollNumber || null,
          house: formData.house || null,
          photo_url: formData.photoUrl || null,
          base_fee: parseFloat(formData.baseFee) || 0,
          discount_amount: parseFloat(formData.discount) || 0,
          discount_note: formData.discountNote || null,
          final_fee: (parseFloat(formData.baseFee) || 0) - (parseFloat(formData.discount) || 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id)

      if (updateError) throw updateError

      setSuccess('Student updated successfully!')
      setShowEditModal(false)
      fetchStudents() // Refresh the list

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update student')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSearch = () => {
    // Search is reactive, no need to do anything here
    // The filteredStudents already handles the search
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Active Students</h2>

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-6">
          {/* Class Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              disabled={loadingClasses}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, father name, admission number, or CNIC"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              onClick={handleSearch}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              <Search size={20} />
              Search
            </button>
          </div>
        </div>

        {/* Student Count */}
        <p className="text-gray-600 mb-4">
          There are <span className="text-red-600 font-bold">{filteredStudents.length}</span> active students{selectedClass ? ' in this class' : ''}.
        </p>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={40} className="animate-spin text-red-600" />
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                  <th className="px-4 py-3 text-left font-semibold border border-blue-800">Session</th>
                  <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class</th>
                  <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                  <th className="px-4 py-3 text-left font-semibold border border-blue-800">Father Name</th>
                  <th className="px-4 py-3 text-left font-semibold border border-blue-800">Adm.No</th>
                  <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No active students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-4 py-3 border border-gray-200">{student.sr}</td>
                      <td className="px-4 py-3 border border-gray-200">{student.session}</td>
                      <td className="px-4 py-3 border border-gray-200">{getClassName(student.class)}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{student.avatar}</span>
                          <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                            {student.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border border-gray-200">{student.father}</td>
                      <td className="px-4 py-3 border border-gray-200">{student.admNo}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(student)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(student)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(student)}
                            className={`p-2 rounded-lg transition ${
                              student.status === 'active'
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            title={student.status === 'active' ? 'Deactivate Student' : 'Activate Student'}
                          >
                            {student.status === 'active' ? (
                              <ToggleRight size={18} />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(student)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Mark as Inactive"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">Showing {filteredStudents.length} entries</p>
        </div>
      </div>

      {/* View Student Modal */}
      {showViewModal && selectedStudent && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowViewModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Student Information</h3>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl">
                    {selectedStudent.avatar}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h4>
                    <p className="text-gray-600">Admission No: <span className="font-semibold">{selectedStudent.admNo}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Session</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.session}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Class</p>
                    <p className="font-semibold text-gray-800">{getClassName(selectedStudent.class)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Father Name</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.father}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Gender</p>
                    <p className="font-semibold text-gray-800 capitalize">{selectedStudent.gender}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Action</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to mark <span className="font-bold text-red-600">{selectedStudent.name}</span> as inactive? This student will be moved to inactive students list.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Mark Inactive
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => !saving && setShowEditModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Student</h3>
                  <p className="text-blue-200 text-sm mt-1">Update student details</p>
                </div>
                <button
                  onClick={() => !saving && setShowEditModal(false)}
                  disabled={saving}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition disabled:opacity-50"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Academic Data Section */}
              <div className="mb-6">
                  <h4 className="text-sm font-bold text-green-600 mb-4">📚 ACADEMIC DATA</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">
                        Admission/GR No <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.admissionNo}
                        onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Class</label>
                      <select
                        value={formData.class}
                        onChange={(e) => handleClassChange(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name} - Fee: {cls.standard_fee}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Section</label>
                      <select
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        disabled={loadingSections || !formData.class}
                      >
                        <option value="">Select Section</option>
                        {sections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.section_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Admission Date</label>
                      <input
                        type="date"
                        value={formData.admissionDate}
                        onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Roll Number</label>
                      <input
                        type="text"
                        placeholder="Enter Roll Number"
                        value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">House</label>
                      <select
                        value={formData.house}
                        onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select House</option>
                        <option value="Red">Red</option>
                        <option value="Blue">Blue</option>
                        <option value="Green">Green</option>
                        <option value="Yellow">Yellow</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Base Fee (Auto-filled)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.baseFee}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Discount</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Discount Note</label>
                      <input
                        type="text"
                        placeholder="Optional note"
                        value={formData.discountNote}
                        onChange={(e) => setFormData({ ...formData, discountNote: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Student & Father Information */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-blue-600 mb-4">👨‍👦 STUDENT & FATHER INFORMATION</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">
                        Student Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Student Name"
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">
                        Father Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Father Name"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Father Mobile</label>
                      <input
                        type="text"
                        placeholder="Enter Father Mobile"
                        value={formData.fatherMobile}
                        onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Father Email</label>
                      <input
                        type="email"
                        placeholder="Enter Father Email"
                        value={formData.fatherEmail}
                        onChange={(e) => setFormData({ ...formData, fatherEmail: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Father CNIC</label>
                      <input
                        type="text"
                        placeholder="XXXXX-XXXXXXX-X"
                        value={formData.fatherCnic}
                        onChange={(e) => setFormData({ ...formData, fatherCnic: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Father Occupation</label>
                      <select
                        value={formData.fatherOccupation}
                        onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select Occupation</option>
                        <option value="Business">Business</option>
                        <option value="Government Job">Government Job</option>
                        <option value="Private Job">Private Job</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Father Annual Income</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.fatherAnnualIncome}
                        onChange={(e) => setFormData({ ...formData, fatherAnnualIncome: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">WhatsApp Number</label>
                      <input
                        type="text"
                        placeholder="Enter WhatsApp Number"
                        value={formData.whatsappNumber}
                        onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Date Of Birth</label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Student CNIC (if applicable)</label>
                      <input
                        type="text"
                        placeholder="XXXXX-XXXXXXX-X"
                        value={formData.studentCnic}
                        onChange={(e) => setFormData({ ...formData, studentCnic: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Student Mobile</label>
                      <input
                        type="text"
                        placeholder="Enter Student Mobile"
                        value={formData.studentMobile}
                        onChange={(e) => setFormData({ ...formData, studentMobile: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Blood Group</label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="">Select Blood Group</option>
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
                      <label className="block text-gray-700 text-sm mb-2">Caste/Race</label>
                      <input
                        type="text"
                        placeholder="Enter Caste/Race"
                        value={formData.casteRace}
                        onChange={(e) => setFormData({ ...formData, casteRace: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Birth Place</label>
                      <input
                        type="text"
                        placeholder="Enter Birth Place"
                        value={formData.birthPlace}
                        onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm mb-2">Current Address</label>
                      <input
                        type="text"
                        placeholder="Enter Current Address"
                        value={formData.currentAddress}
                        onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">City</label>
                      <input
                        type="text"
                        placeholder="Enter City"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">State/Province</label>
                      <input
                        type="text"
                        placeholder="Enter State/Province"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Postal Code</label>
                      <input
                        type="text"
                        placeholder="Enter Postal Code"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Student Other Details - Collapsible */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowOtherDetails(!showOtherDetails)}
                    className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold flex justify-between items-center hover:bg-purple-700 transition"
                  >
                    <span>Student Other Details</span>
                    <span>{showOtherDetails ? '▲ Toggle Details' : '▼ Toggle Details'}</span>
                  </button>

                  {showOtherDetails && (
                    <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-bold text-purple-600 mb-4">MOTHER INFORMATION</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Mother Name</label>
                          <input
                            type="text"
                            placeholder="Mother Name"
                            value={formData.motherName}
                            onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Mother CNIC</label>
                          <input
                            type="text"
                            placeholder="XXXXX-XXXXXXX-X"
                            value={formData.motherCnic}
                            onChange={(e) => setFormData({ ...formData, motherCnic: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Mother Mobile</label>
                          <input
                            type="text"
                            placeholder="Enter Mother Mobile"
                            value={formData.motherMobile}
                            onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Mother Email</label>
                          <input
                            type="email"
                            placeholder="Enter Mother Email"
                            value={formData.motherEmail}
                            onChange={(e) => setFormData({ ...formData, motherEmail: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Mother Qualification</label>
                          <input
                            type="text"
                            placeholder="Enter Qualification"
                            value={formData.motherQualification}
                            onChange={(e) => setFormData({ ...formData, motherQualification: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Mother Occupation</label>
                          <input
                            type="text"
                            placeholder="Enter Occupation"
                            value={formData.motherOccupation}
                            onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Mother Annual Income</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={formData.motherAnnualIncome}
                            onChange={(e) => setFormData({ ...formData, motherAnnualIncome: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-orange-600 mb-4">GUARDIAN INFORMATION</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Guardian Name</label>
                          <input
                            type="text"
                            placeholder="Enter Guardian Name"
                            value={formData.guardianName}
                            onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Guardian Relation</label>
                          <input
                            type="text"
                            placeholder="e.g., Uncle, Aunt"
                            value={formData.guardianRelation}
                            onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Guardian Mobile</label>
                          <input
                            type="text"
                            placeholder="Guardian Mobile"
                            value={formData.guardianMobile}
                            onChange={(e) => setFormData({ ...formData, guardianMobile: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Guardian Email</label>
                          <input
                            type="email"
                            placeholder="Enter Guardian Email"
                            value={formData.guardianEmail}
                            onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-red-600 mb-4">EMERGENCY CONTACT</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Emergency Contact Name</label>
                          <input
                            type="text"
                            placeholder="Emergency Contact Name"
                            value={formData.emergencyContactName}
                            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Emergency Relation</label>
                          <input
                            type="text"
                            placeholder="Relation"
                            value={formData.emergencyRelation}
                            onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Emergency Phone</label>
                          <input
                            type="text"
                            placeholder="Emergency Phone"
                            value={formData.emergencyPhone}
                            onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Emergency Mobile</label>
                          <input
                            type="text"
                            placeholder="Emergency Mobile"
                            value={formData.emergencyMobile}
                            onChange={(e) => setFormData({ ...formData, emergencyMobile: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-gray-700 text-sm mb-2">Emergency Address</label>
                          <input
                            type="text"
                            placeholder="Emergency Address"
                            value={formData.emergencyAddress}
                            onChange={(e) => setFormData({ ...formData, emergencyAddress: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-green-600 mb-4">OTHER INFORMATION</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Religion</label>
                          <select
                            value={formData.religion}
                            onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                            <option value="">Select Religion</option>
                            <option value="Islam">Islam</option>
                            <option value="Christianity">Christianity</option>
                            <option value="Hinduism">Hinduism</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Nationality</label>
                          <input
                            type="text"
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Previous School</label>
                          <input
                            type="text"
                            placeholder="Enter Previous School"
                            value={formData.previousSchool}
                            onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm mb-2">Previous Class</label>
                          <input
                            type="text"
                            placeholder="Enter Previous Class"
                            value={formData.previousClass}
                            onChange={(e) => setFormData({ ...formData, previousClass: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-gray-700 text-sm mb-2">Permanent Address</label>
                          <input
                            type="text"
                            placeholder="Enter Permanent Address"
                            value={formData.permanentAddress}
                            onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-gray-700 text-sm mb-2">Medical Problem / Special Needs</label>
                          <textarea
                            rows="3"
                            placeholder="Enter any medical problems or special needs"
                            value={formData.medicalProblem}
                            onChange={(e) => setFormData({ ...formData, medicalProblem: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStudent}
                  disabled={saving || !formData.studentName || !formData.fatherName || !formData.admissionNo}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Update Student'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
