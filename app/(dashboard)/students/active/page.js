'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Eye, Edit2, Trash2, Loader2, AlertCircle, X, ToggleLeft, ToggleRight, Printer, CheckCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// Modal Overlay Component - Uses Portal to render at document body level
const ModalOverlay = ({ children, onClose, disabled = false }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[99998]"
        style={{
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
        onClick={disabled ? undefined : onClose}
      />
      {children}
    </>,
    document.body
  )
}

// Toast Component - Matches screenshot design with pill/rounded shape
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-5 py-3 rounded-full shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}
    style={{
      animation: 'slideIn 0.3s ease-out'
    }}>
      {type === 'success' && <CheckCircle size={20} strokeWidth={2.5} />}
      {type === 'error' && <X size={20} strokeWidth={2.5} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-80 transition-opacity">
        <X size={18} strokeWidth={2.5} />
      </button>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

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
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showOtherDetails, setShowOtherDetails] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(10)

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

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

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [selectedClass])

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showEditModal || showViewModal || showDeleteModal) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
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
        photo_url: student.photo_url,
        cnic: student.admission_number
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

  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedClass])

  const handleView = async (student) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .single()

      if (error) {
        console.error('Error fetching student details:', error)
        showToast('Failed to load student details', 'error')
        return
      }

      let className = 'N/A'
      let sectionName = 'N/A'

      if (data.current_class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('class_name')
          .eq('id', data.current_class_id)
          .single()

        if (classData) className = classData.class_name
      }

      if (data.current_section_id) {
        const { data: sectionData } = await supabase
          .from('sections')
          .select('section_name')
          .eq('id', data.current_section_id)
          .single()

        if (sectionData) sectionName = sectionData.section_name
      }

      setSelectedStudent({
        ...data,
        className,
        sectionName,
        avatar: data.gender === 'female' ? '👧' : (data.gender === 'male' ? '👦' : '🧑')
      })
      setShowViewModal(true)
    } catch (err) {
      console.error('Error in handleView:', err)
      showToast('An error occurred while loading student details', 'error')
    }
  }

  const handlePrintStudent = () => {
    if (!selectedStudent) return

    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Student Information', 105, 20, { align: 'center' })

    doc.setDrawColor(200, 200, 200)
    doc.line(20, 25, 190, 25)

    let yPos = 35
    const lineHeight = 7
    const leftMargin = 20

    const addField = (label, value, isFullWidth = false) => {
      if (value && value !== 'N/A' && value !== null && value !== undefined && value !== '') {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(label + ':', leftMargin, yPos)
        doc.setFont('helvetica', 'normal')
        const text = String(value)
        if (isFullWidth) {
          doc.text(text, leftMargin + 50, yPos)
        } else {
          doc.text(text, leftMargin + 45, yPos)
        }
        yPos += lineHeight
      }
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Basic Information', leftMargin, yPos)
    yPos += lineHeight + 2

    addField('Admission No', selectedStudent.admission_number)
    addField('Full Name', `${selectedStudent.first_name} ${selectedStudent.last_name || ''}`)
    addField('Gender', selectedStudent.gender)
    addField('Date of Birth', selectedStudent.date_of_birth)
    addField('Blood Group', selectedStudent.blood_group)
    addField('Religion', selectedStudent.religion)
    addField('Caste', selectedStudent.caste)
    addField('Nationality', selectedStudent.nationality)

    yPos += 5

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Academic Information', leftMargin, yPos)
    yPos += lineHeight + 2

    addField('Class', selectedStudent.className)
    addField('Section', selectedStudent.sectionName)
    addField('Roll Number', selectedStudent.roll_number)
    addField('House', selectedStudent.house)
    addField('Admission Date', selectedStudent.admission_date)
    addField('Status', selectedStudent.status)

    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    } else {
      yPos += 5
    }

    if (selectedStudent.father_name) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Father Information', leftMargin, yPos)
      yPos += lineHeight + 2

      addField('Father Name', selectedStudent.father_name)
      addField('Father CNIC', selectedStudent.father_cnic)
      addField('Father Mobile', selectedStudent.father_phone)
      addField('Father Email', selectedStudent.father_email)
      addField('Qualification', selectedStudent.father_qualification)
      addField('Occupation', selectedStudent.father_occupation)
      addField('Annual Income', selectedStudent.father_annual_income)

      yPos += 5
    }

    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    if (selectedStudent.mother_name) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Mother Information', leftMargin, yPos)
      yPos += lineHeight + 2

      addField('Mother Name', selectedStudent.mother_name)
      addField('Mother CNIC', selectedStudent.mother_cnic)
      addField('Mother Mobile', selectedStudent.mother_phone)
      addField('Mother Email', selectedStudent.mother_email)
      addField('Qualification', selectedStudent.mother_qualification)
      addField('Occupation', selectedStudent.mother_occupation)
      addField('Annual Income', selectedStudent.mother_annual_income)

      yPos += 5
    }

    if (selectedStudent.base_fee || selectedStudent.discount_amount) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Fee Information', leftMargin, yPos)
      yPos += lineHeight + 2

      addField('Base Fee', selectedStudent.base_fee)
      addField('Discount', selectedStudent.discount_amount)
      addField('Final Fee', selectedStudent.final_fee)
      addField('Discount Note', selectedStudent.discount_note, true)
    }

    doc.save(`Student_${selectedStudent.admission_number}_${selectedStudent.first_name}.pdf`)

    setShowViewModal(false)

    showToast('PDF generated successfully!', 'success')
  }

  const handleDelete = (student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const studentId = selectedStudent.id
      const studentName = selectedStudent.name

      setShowDeleteModal(false)
      setSelectedStudent(null)

      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (deleteError) throw deleteError

      setStudents(prev => prev.filter(std => std.id !== studentId))

      showToast(`Student "${studentName}" deleted successfully!`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to delete student', 'error')
      console.error('Delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = async (student) => {
    try {
      const newStatus = student.status === 'active' ? 'inactive' : 'active'

      const { error: updateError } = await supabase
        .from('students')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', student.id)

      if (updateError) throw updateError

      if (newStatus === 'inactive') {
        setStudents(prev => prev.filter(std => std.id !== student.id))
      } else {
        setStudents(prev => prev.map(std =>
          std.id === student.id ? { ...std, status: newStatus } : std
        ))
      }

      const statusText = newStatus === 'active' ? 'activated' : 'deactivated'
      showToast(`Student ${statusText} successfully!`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update student status', 'error')
      console.error('Toggle status error:', err)
    }
  }

  const handleEdit = async (student) => {
    setShowEditModal(true)

    try {
      const { data: fullStudent, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .single()

      if (error) throw error

      if (fullStudent.current_class_id) {
        await fetchSections(fullStudent.current_class_id)
      }

      const selectedClass = classes.find(c => c.id === fullStudent.current_class_id)

      if (fullStudent.photo_url) {
        setImagePreview(null)
      }

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
        currentAddress: fullStudent.current_address || '',
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
      section: '',
      baseFee: selectedClass?.standard_fee || ''
    })
    fetchSections(classId)
  }

  const handleSaveStudent = async () => {
    setSaving(true)
    setError(null)

    try {
      const nameParts = formData.studentName.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || null

      let photoUrl = formData.photoUrl || null
      if (imageFile) {
        try {
          const fileExt = imageFile.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `student-photos/${fileName}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('student-images')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            throw new Error(`Failed to upload image: ${uploadError.message}`)
          }

          const { data: urlData } = supabase.storage
            .from('student-images')
            .getPublicUrl(filePath)

          photoUrl = urlData.publicUrl
        } catch (imgError) {
          console.error('Image upload error:', imgError)
          showToast('Image upload failed. Student will be saved without photo.', 'error')
          photoUrl = formData.photoUrl || null
        }
      }

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
          caste: formData.casteRace || null,
          religion: formData.religion || null,
          nationality: formData.nationality || 'Pakistan',
          photo_url: photoUrl,
          admission_date: formData.admissionDate,
          current_class_id: formData.class || null,
          current_section_id: formData.section || null,
          roll_number: formData.rollNumber || null,
          house: formData.house || null,
          base_fee: parseFloat(formData.baseFee) || 0,
          discount_amount: parseFloat(formData.discount) || 0,
          discount_note: formData.discountNote || null,
          final_fee: (parseFloat(formData.baseFee) || 0) - (parseFloat(formData.discount) || 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id)

      if (updateError) throw updateError

      setStudents(prev => prev.map(std =>
        std.id === formData.id
          ? { ...std, name: `${firstName} ${lastName || ''}`, father: formData.fatherName, admNo: formData.admissionNo, photo_url: photoUrl }
          : std
      ))

      setShowEditModal(false)
      setImageFile(null)
      setImagePreview(null)

      showToast('Student updated successfully!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update student', 'error')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Error Message */}
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

          <div className="md:col-span-7 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, father name, admission number, or CNIC"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          There are <span className="text-red-600 font-bold">{filteredStudents.length}</span> active students{selectedClass ? ' in this class' : ''}.
        </p>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={40} className="animate-spin text-red-600" />
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
                    paginatedStudents.map((student, index) => (
                      <tr
                        key={student.id}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50 transition`}
                      >
                        <td className="px-4 py-3 border border-gray-200">{startIndex + index + 1}</td>
                        <td className="px-4 py-3 border border-gray-200">{student.session}</td>
                        <td className="px-4 py-3 border border-gray-200">{getClassName(student.class)}</td>
                        <td className="px-4 py-3 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                              {student.photo_url ? (
                                <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl">{student.avatar}</span>
                              )}
                            </div>
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
                              title="Delete"
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

            {filteredStudents.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1E3A8A] text-white hover:bg-blue-900'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const pages = []
                      const maxVisiblePages = 4
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1)
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-10 h-10 rounded-lg font-medium transition ${
                              currentPage === i
                                ? 'bg-[#1E3A8A] text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                          >
                            {i}
                          </button>
                        )
                      }
                      return pages
                    })()}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1E3A8A] text-white hover:bg-blue-900'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Student Modal */}
      {showViewModal && selectedStudent && (
        <ModalOverlay onClose={() => setShowViewModal(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Student Information</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintStudent}
                      className="text-white hover:bg-white/10 p-2 rounded-full transition"
                      title="Print Student Information"
                    >
                      <Printer size={20} />
                    </button>
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="text-white hover:bg-white/10 p-2 rounded-full transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl overflow-hidden">
                    {selectedStudent.photo_url ? (
                      <img src={selectedStudent.photo_url} alt={selectedStudent.first_name} className="w-full h-full object-cover" />
                    ) : (
                      selectedStudent.avatar
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">
                      {selectedStudent.first_name} {selectedStudent.last_name || ''}
                    </h4>
                    <p className="text-gray-600">Admission No: <span className="font-semibold">{selectedStudent.admission_number}</span></p>
                    <p className="text-sm text-gray-500">Status: <span className={`font-semibold ${selectedStudent.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{selectedStudent.status || 'N/A'}</span></p>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Basic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedStudent.first_name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">First Name</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.first_name}</p>
                      </div>
                    )}
                    {selectedStudent.last_name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Last Name</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.last_name}</p>
                      </div>
                    )}
                    {selectedStudent.gender && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Gender</p>
                        <p className="font-semibold text-gray-800 capitalize">{selectedStudent.gender}</p>
                      </div>
                    )}
                    {selectedStudent.date_of_birth && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.date_of_birth}</p>
                      </div>
                    )}
                    {selectedStudent.blood_group && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Blood Group</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.blood_group}</p>
                      </div>
                    )}
                    {selectedStudent.religion && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Religion</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.religion}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Academic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedStudent.className && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Class</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.className}</p>
                      </div>
                    )}
                    {selectedStudent.sectionName && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Section</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.sectionName}</p>
                      </div>
                    )}
                    {selectedStudent.roll_number && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Roll Number</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.roll_number}</p>
                      </div>
                    )}
                    {selectedStudent.admission_date && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Admission Date</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.admission_date}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Father Information */}
                {selectedStudent.father_name && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Father Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Father Name</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.father_name}</p>
                      </div>
                      {selectedStudent.father_phone && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Mobile</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <ModalOverlay onClose={() => !deleting && setShowDeleteModal(false)} disabled={deleting}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Action</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <span className="font-bold text-red-600">{selectedStudent.name}</span>? This action cannot be undone.
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
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <ModalOverlay onClose={() => !saving && setShowEditModal(false)} disabled={saving}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm mb-2">Student Photo</label>
                    <div className="flex items-center gap-4">
                      {imagePreview && (
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null)
                              setImagePreview(null)
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      {formData.photoUrl && !imagePreview && (
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300">
                          <img src={formData.photoUrl} alt="Current" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            setImageFile(file)
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setImagePreview(reader.result)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
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
                        <label className="block text-gray-700 text-sm mb-2">Mother Mobile</label>
                        <input
                          type="text"
                          placeholder="Enter Mother Mobile"
                          value={formData.motherMobile}
                          onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
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
        </ModalOverlay>
      )}
    </div>
  )
}