// app/(dashboard)/students/old/page.js
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

export default function InactiveStudentsPage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditSidebar, setShowEditSidebar] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showOtherDetails, setShowOtherDetails] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    admissionNo: '',
    class: '',
    admissionDate: new Date().toISOString().split('T')[0],
    discount: '',
    baseFee: '',
    discountNote: '',
    studentName: '',
    fatherName: '',
    fatherMobile: '',
    fatherOccupation: '',
    whatsappNumber: '',
    dateOfBirth: '',
    gender: 'male',
    currentAddress: '',
    motherName: '',
    motherMobile: '',
    bloodGroup: '',
    religion: '',
    nationality: 'Pakistan'
  })

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses()
  }, [])

  // Fetch students on component mount and when filters change
  useEffect(() => {
    fetchStudents()
  }, [selectedClass])

  // Prevent body scroll when sidebar or modals are open
  useEffect(() => {
    if (showEditSidebar || showViewModal || showDeleteModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showEditSidebar, showViewModal, showDeleteModal])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, status')
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

  const fetchStudents = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('status', 'inactive')
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

  const handleView = async (student) => {
    setShowViewModal(true)

    try {
      // Fetch full student details from database
      const { data: fullStudent, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .single()

      if (error) throw error

      // Fetch student contacts (father, mother, guardian info)
      const { data: contacts, error: contactsError } = await supabase
        .from('student_contacts')
        .select('*')
        .eq('student_id', student.id)

      // Process contacts data
      let contactsData = {}
      if (!contactsError && contacts) {
        contacts.forEach(contact => {
          const prefix = contact.contact_type // 'father', 'mother', 'guardian'
          contactsData[`${prefix}_mobile`] = contact.phone
          contactsData[`${prefix}_email`] = contact.email
          contactsData[`${prefix}_cnic`] = contact.cnic
          contactsData[`${prefix}_occupation`] = contact.occupation
          contactsData[`${prefix}_annual_income`] = contact.annual_income
          contactsData[`${prefix}_qualification`] = contact.qualification
          if (contact.contact_type === 'father') {
            contactsData.whatsapp_number = contact.alternate_phone
            contactsData.current_address = contact.address
            contactsData.city = contact.city
            contactsData.state = contact.state
            contactsData.postal_code = contact.postal_code
          }
          if (contact.contact_type === 'guardian') {
            contactsData.guardian_name = contact.name
            contactsData.guardian_relation = contact.relation
          }
        })
      }

      // Set the complete student data
      setSelectedStudent({
        ...student,
        fullData: {
          ...fullStudent,
          ...contactsData
        }
      })
    } catch (err) {
      console.error('Error fetching full student details:', err)
      setSelectedStudent(student)
    }
  }

  const handleDelete = (student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      // Permanent delete from database
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', selectedStudent.id)

      if (deleteError) throw deleteError

      setSuccess('Student permanently deleted successfully!')
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
      // Toggle to active status
      const { error: updateError } = await supabase
        .from('students')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', student.id)

      if (updateError) throw updateError

      setSuccess('Student activated successfully!')
      fetchStudents() // Refresh the list

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update student status')
      console.error('Toggle status error:', err)
    }
  }

  const handleEdit = async (student) => {
    // Open sidebar immediately without loading state
    setShowEditSidebar(true)

    try {
      // Fetch full student details in background
      const { data: fullStudent, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .single()

      if (error) throw error

      // Fetch student contacts (father, mother, guardian, emergency, student info)
      const { data: contacts } = await supabase
        .from('student_contacts')
        .select('*')
        .eq('student_id', student.id)

      // Process contacts data for all contact types
      let fatherData = {}
      let motherData = {}
      let guardianData = {}
      let emergencyData = {}
      let studentData = {}

      if (contacts) {
        const fatherContact = contacts.find(c => c.contact_type === 'father')
        const motherContact = contacts.find(c => c.contact_type === 'mother')
        const guardianContact = contacts.find(c => c.contact_type === 'guardian')
        const emergencyContact = contacts.find(c => c.contact_type === 'emergency')
        const studentContact = contacts.find(c => c.contact_type === 'student')

        if (fatherContact) {
          fatherData = {
            fatherMobile: fatherContact.phone || '',
            fatherEmail: fatherContact.email || '',
            fatherCnic: fatherContact.cnic || '',
            fatherOccupation: fatherContact.occupation || '',
            fatherAnnualIncome: fatherContact.annual_income || '',
            whatsappNumber: fatherContact.alternate_phone || '',
            currentAddress: fatherContact.address || ''
          }
        }

        if (motherContact) {
          motherData = {
            motherMobile: motherContact.phone || '',
            motherEmail: motherContact.email || '',
            motherCnic: motherContact.cnic || '',
            motherQualification: motherContact.qualification || '',
            motherOccupation: motherContact.occupation || '',
            motherAnnualIncome: motherContact.annual_income || ''
          }
        }

        if (guardianContact) {
          guardianData = {
            guardianName: guardianContact.name || '',
            guardianRelation: guardianContact.relation || '',
            guardianMobile: guardianContact.phone || '',
            guardianEmail: guardianContact.email || ''
          }
        }

        if (emergencyContact) {
          emergencyData = {
            emergencyContactName: emergencyContact.name || '',
            emergencyRelation: emergencyContact.relation || '',
            emergencyPhone: emergencyContact.phone || '',
            emergencyMobile: emergencyContact.alternate_phone || '',
            emergencyAddress: emergencyContact.address || ''
          }
        }

        if (studentContact) {
          studentData = {
            studentCnic: studentContact.cnic || '',
            studentMobile: studentContact.phone || ''
          }
        }
      }

      // Find the class to get base fee
      const selectedClass = classes.find(c => c.id === fullStudent.current_class_id)

      setFormData({
        id: fullStudent.id,
        admissionNo: fullStudent.admission_number || '',
        class: fullStudent.current_class_id || '',
        admissionDate: fullStudent.admission_date || '',
        discount: fullStudent.discount_amount || '',
        baseFee: fullStudent.base_fee || selectedClass?.standard_fee || '',
        discountNote: fullStudent.discount_note || '',
        studentName: `${fullStudent.first_name}${fullStudent.last_name ? ' ' + fullStudent.last_name : ''}`,
        fatherName: fullStudent.father_name || '',
        dateOfBirth: fullStudent.date_of_birth || '',
        gender: fullStudent.gender || 'male',
        bloodGroup: fullStudent.blood_group || '',
        casteRace: fullStudent.caste_race || '',
        birthPlace: fullStudent.birth_place || '',
        city: fullStudent.city || '',
        state: fullStudent.state_province || '',
        postalCode: fullStudent.postal_code || '',
        motherName: fullStudent.mother_name || '',
        religion: fullStudent.religion || '',
        nationality: fullStudent.nationality || 'Pakistan',
        previousSchool: fullStudent.previous_school || '',
        previousClass: fullStudent.previous_class || '',
        permanentAddress: fullStudent.permanent_address || '',
        medicalProblem: fullStudent.medical_problem || '',
        ...fatherData,
        ...motherData,
        ...guardianData,
        ...emergencyData,
        ...studentData
      })
    } catch (err) {
      setError(err.message || 'Failed to load student details')
      console.error('Edit error:', err)
      setShowEditSidebar(false)
    }
  }

  const handleClassChange = (classId) => {
    const selectedClass = classes.find(c => c.id === classId)
    setFormData({
      ...formData,
      class: classId,
      baseFee: selectedClass?.standard_fee || ''
    })
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

      // Update student table with basic and extended student info
      const { error: updateError } = await supabase
        .from('students')
        .update({
          admission_number: formData.admissionNo,
          first_name: firstName,
          last_name: lastName,
          father_name: formData.fatherName,
          mother_name: formData.motherName || null,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender,
          blood_group: formData.bloodGroup || null,
          caste_race: formData.casteRace || null,
          birth_place: formData.birthPlace || null,
          city: formData.city || null,
          state_province: formData.state || null,
          postal_code: formData.postalCode || null,
          religion: formData.religion || null,
          nationality: formData.nationality || 'Pakistan',
          previous_school: formData.previousSchool || null,
          previous_class: formData.previousClass || null,
          permanent_address: formData.permanentAddress || null,
          medical_problem: formData.medicalProblem || null,
          admission_date: formData.admissionDate,
          current_class_id: formData.class || null,
          base_fee: parseFloat(formData.baseFee) || 0,
          discount_amount: parseFloat(formData.discount) || 0,
          discount_note: formData.discountNote || null,
          final_fee: (parseFloat(formData.baseFee) || 0) - (parseFloat(formData.discount) || 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id)

      if (updateError) throw updateError

      // Update or insert contact records for father, mother, guardian, emergency, and student
      const contactUpdates = []

      // Father contact
      if (formData.fatherMobile || formData.fatherEmail || formData.fatherCnic || formData.fatherOccupation || formData.fatherAnnualIncome || formData.whatsappNumber || formData.currentAddress) {
        contactUpdates.push({
          student_id: formData.id,
          contact_type: 'father',
          name: formData.fatherName,
          phone: formData.fatherMobile || null,
          email: formData.fatherEmail || null,
          cnic: formData.fatherCnic || null,
          occupation: formData.fatherOccupation || null,
          annual_income: formData.fatherAnnualIncome ? parseFloat(formData.fatherAnnualIncome) : null,
          alternate_phone: formData.whatsappNumber || null,
          address: formData.currentAddress || null
        })
      }

      // Mother contact
      if (formData.motherMobile || formData.motherEmail || formData.motherCnic || formData.motherQualification || formData.motherOccupation || formData.motherAnnualIncome) {
        contactUpdates.push({
          student_id: formData.id,
          contact_type: 'mother',
          name: formData.motherName,
          phone: formData.motherMobile || null,
          email: formData.motherEmail || null,
          cnic: formData.motherCnic || null,
          qualification: formData.motherQualification || null,
          occupation: formData.motherOccupation || null,
          annual_income: formData.motherAnnualIncome ? parseFloat(formData.motherAnnualIncome) : null
        })
      }

      // Guardian contact
      if (formData.guardianName || formData.guardianMobile || formData.guardianEmail) {
        contactUpdates.push({
          student_id: formData.id,
          contact_type: 'guardian',
          name: formData.guardianName || null,
          relation: formData.guardianRelation || null,
          phone: formData.guardianMobile || null,
          email: formData.guardianEmail || null
        })
      }

      // Emergency contact
      if (formData.emergencyContactName || formData.emergencyPhone || formData.emergencyMobile) {
        contactUpdates.push({
          student_id: formData.id,
          contact_type: 'emergency',
          name: formData.emergencyContactName || null,
          relation: formData.emergencyRelation || null,
          phone: formData.emergencyPhone || null,
          alternate_phone: formData.emergencyMobile || null,
          address: formData.emergencyAddress || null
        })
      }

      // Student contact
      if (formData.studentCnic || formData.studentMobile) {
        contactUpdates.push({
          student_id: formData.id,
          contact_type: 'student',
          name: formData.studentName,
          cnic: formData.studentCnic || null,
          phone: formData.studentMobile || null
        })
      }

      // Delete existing contacts for this student
      await supabase
        .from('student_contacts')
        .delete()
        .eq('student_id', formData.id)

      // Insert new contact records
      if (contactUpdates.length > 0) {
        const { error: contactError } = await supabase
          .from('student_contacts')
          .insert(contactUpdates)

        if (contactError) throw contactError
      }

      setSuccess('Student updated successfully!')
      setShowEditSidebar(false)
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
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Inactive Students</h2>

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
          There are <span className="text-red-600 font-bold">{filteredStudents.length}</span> inactive students{selectedClass ? ' in this class' : ''}.
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
                      No inactive students found.
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
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                            title="Activate Student"
                          >
                            <ToggleLeft size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(student)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Permanently Delete"
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
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Student Complete Information</h3>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Student Header */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl">
                    {selectedStudent.avatar}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h4>
                    <p className="text-gray-600">Admission No: <span className="font-semibold">{selectedStudent.admNo}</span></p>
                    <p className="text-red-600 text-sm font-semibold">Status: Inactive</p>
                  </div>
                </div>

                {/* Academic Data */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-green-600 mb-3">ACADEMIC DATA</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Admission/GR No</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.admNo}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Class</p>
                      <p className="font-semibold text-gray-800">{getClassName(selectedStudent.class)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Section</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.current_section_id || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Admission Date</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.admission_date || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Roll Number</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.roll_number || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">House</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.house || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.base_fee || '0'} PKR</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Discount</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.discount_amount || '0'} PKR</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Discount Note</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.discount_note || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Student Picture */}
                {selectedStudent.fullData?.photo_url && (
                  <div className="mb-6">
                    <h5 className="text-sm font-bold text-indigo-600 mb-3">STUDENT PICTURE</h5>
                    <div className="bg-gray-50 p-4 rounded-lg flex justify-center">
                      <img
                        src={selectedStudent.fullData.photo_url}
                        alt={selectedStudent.name}
                        className="max-w-xs rounded-lg shadow-md"
                      />
                    </div>
                  </div>
                )}

                {/* Student & Father Information */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-blue-600 mb-3">STUDENT & FATHER INFORMATION</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Student Name</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.name}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Father Name</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.father}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Father Mobile</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.father_mobile || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Father Email</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.father_email || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Father CNIC</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.father_cnic || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Father Occupation</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.father_occupation || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Father Annual Income</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.father_annual_income ? `${selectedStudent.fullData.father_annual_income} PKR` : 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">WhatsApp Number</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.whatsapp_number || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.date_of_birth || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Gender</p>
                      <p className="font-semibold text-gray-800 capitalize">{selectedStudent.gender}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Student CNIC (if applicable)</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.student_cnic || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Student Mobile</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.student_mobile || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Blood Group</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.blood_group || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Caste/Race</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.caste || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Birth Place</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.birth_place || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Current Address</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.current_address || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">City</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.city || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">State/Province</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.state || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Postal Code</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.postal_code || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Mother Information */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-purple-600 mb-3">MOTHER INFORMATION</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Mother Name</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.mother_name || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Mother CNIC</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.mother_cnic || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Mother Mobile</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.mother_mobile || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Mother Email</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.mother_email || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Mother Qualification</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.mother_qualification || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Mother Occupation</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.mother_occupation || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Mother Annual Income</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.mother_annual_income || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Guardian Information */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-orange-600 mb-3">GUARDIAN INFORMATION</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Guardian Name</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.guardian_name || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Guardian Relation</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.guardian_relation || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Guardian Mobile</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.guardian_mobile || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Guardian Email</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.guardian_email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-red-600 mb-3">EMERGENCY CONTACT</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Emergency Contact Name</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.emergency_contact_name || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Emergency Relation</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.emergency_relation || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Emergency Phone</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.emergency_phone || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Emergency Mobile</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.emergency_mobile || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Emergency Address</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.emergency_address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Other Information */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-teal-600 mb-3">OTHER INFORMATION</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Religion</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.religion || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Nationality</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.nationality || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Previous School</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.previous_school || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Previous Class</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.previous_class || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Permanent Address</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.permanent_address || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Medical Problem / Special Needs</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.fullData?.medical_problem || 'N/A'}</p>
                    </div>
                    {selectedStudent.fullData?.created_at && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Record Created</p>
                        <p className="font-semibold text-gray-800">{new Date(selectedStudent.fullData.created_at).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.updated_at && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                        <p className="font-semibold text-gray-800">{new Date(selectedStudent.fullData.updated_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      handleEdit(selectedStudent)
                    }}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} />
                    Edit
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
                <h3 className="text-lg font-bold">Confirm Permanent Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to permanently delete <span className="font-bold text-red-600">{selectedStudent.name}</span>? This action cannot be undone.
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
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Delete Permanently
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Student Sidebar */}
      {showEditSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => !saving && setShowEditSidebar(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Student</h3>
                  <p className="text-blue-200 text-sm mt-1">Update student details</p>
                </div>
                <button
                  onClick={() => !saving && setShowEditSidebar(false)}
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
                <h4 className="text-sm font-bold text-green-600 mb-4">ACADEMIC DATA</h4>
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
                          {cls.class_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Admission Date</label>
                    <input
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Base Fee</label>
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
                <h4 className="text-sm font-bold text-blue-600 mb-4">STUDENT & FATHER INFORMATION</h4>
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
                      placeholder="xxxxx-xxxxxxx-x"
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
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
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
                      placeholder="xxxxx-xxxxxxx-x"
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
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold flex justify-between items-center"
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
                          placeholder="xxxxx-xxxxxxx-x"
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
                          placeholder="Enter any medical problems or special needs"
                          value={formData.medicalProblem}
                          onChange={(e) => setFormData({ ...formData, medicalProblem: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                          rows="3"
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
                  onClick={() => setShowEditSidebar(false)}
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
