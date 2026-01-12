// app/(dashboard)/students/old/page.js
'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Eye, Edit2, Trash2, Loader2, AlertCircle, X, ToggleLeft, ToggleRight, Printer, CheckCircle, Download } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { getPdfSettings, hexToRgb, getMarginValues, getLogoSize, applyPdfSettings } from '@/lib/pdfSettings'
import { addPDFFooter } from '@/lib/pdfUtils'

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

// ✅ Helper to get logged-in user
const getLoggedInUser = () => {
  if (typeof window === 'undefined') return { id: null, school_id: null }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return { id: user?.id, school_id: user?.school_id }
  } catch {
    return { id: null, school_id: null }
  }
}

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
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(10)
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

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

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
    if (showEditSidebar || showViewModal || showDeleteModal) {
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
  }, [showEditSidebar, showViewModal, showDeleteModal])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, status')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      let query = supabase
        .from('students')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
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
        photo_url: student.photo_url,
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

  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      showToast('No data to export', 'error')
      return
    }

    const csvData = filteredStudents.map((student, index) => ({
      'Sr.': index + 1,
      'Session': student.session || 'N/A',
      'Class': student.class || 'N/A',
      'Student Name': student.name || 'N/A',
      'Father Name': student.father || 'N/A',
      'Admission No.': student.admNo || 'N/A',
      'CNIC': student.cnic || 'N/A',
      'Gender': student.gender || 'N/A',
      'Date of Birth': student.dateOfBirth || 'N/A',
      'Admission Date': student.admissionDate || 'N/A'
    }))

    const headers = Object.keys(csvData[0])
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    a.download = `old-students-${date}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    showToast('CSV exported successfully!', 'success')
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

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedClass])

  const handleView = async (student) => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      // Fetch complete student data from Supabase
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .single()

      if (error) {
        console.error('Error fetching student details:', error)
        showToast('Failed to load student details', 'error')
        return
      }

      // Fetch class and section details
      let className = 'N/A'
      let sectionName = 'N/A'

      if (data.current_class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('class_name')
          .eq('id', data.current_class_id)
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .single()

        if (classData) className = classData.class_name
      }

      if (data.current_section_id) {
        const { data: sectionData } = await supabase
          .from('sections')
          .select('section_name')
          .eq('id', data.current_section_id)
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .single()

        if (sectionData) sectionName = sectionData.section_name
      }

      // Set complete student data
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

  const handleDelete = (student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)

    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      const studentId = selectedStudent.id
      const studentName = selectedStudent.name

      // Close modal immediately
      setShowDeleteModal(false)
      setSelectedStudent(null)

      // Permanent delete from database
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (deleteError) throw deleteError

      // Update state without reloading
      setStudents(prev => prev.filter(std => std.id !== studentId))

      showToast(`Student "${studentName}" permanently deleted successfully!`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to delete student', 'error')
      console.error('Delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = async (student) => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      // Toggle to active status
      const { error: updateError } = await supabase
        .from('students')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', student.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (updateError) throw updateError

      // Remove from inactive list in real-time
      setStudents(prev => prev.filter(std => std.id !== student.id))

      showToast('Student activated successfully!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update student status', 'error')
      console.error('Toggle status error:', err)
    }
  }

  const handleEdit = async (student) => {
    // Open sidebar immediately without loading state
    setShowEditSidebar(true)

    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      // Fetch full student details in background
      const { data: fullStudent, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', student.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .single()

      if (error) throw error

      // Fetch student contacts (father, mother, guardian, emergency, student info)
      const { data: contacts } = await supabase
        .from('student_contacts')
        .select('*')
        .eq('student_id', student.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)

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

      const { id: userId, school_id: schoolId } = getLoggedInUser()
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
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (updateError) throw updateError

      // Update or insert contact records for father, mother, guardian, emergency, and student
      const contactUpdates = []

      // Father contact
      if (formData.fatherMobile || formData.fatherEmail || formData.fatherCnic || formData.fatherOccupation || formData.fatherAnnualIncome || formData.whatsappNumber || formData.currentAddress) {
        contactUpdates.push({
          user_id: userId,
          school_id: schoolId,
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
          user_id: userId,
          school_id: schoolId,
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
          user_id: userId,
          school_id: schoolId,
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
          user_id: userId,
          school_id: schoolId,
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
          user_id: userId,
          school_id: schoolId,
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
        .eq('user_id', userId)
        .eq('school_id', schoolId)

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

  const handlePrintStudent = async () => {
    if (!selectedStudent) return

    try {
      const loggedInUser = getLoggedInUser()

      // Check if user is logged in
      if (!loggedInUser || !loggedInUser.id || !loggedInUser.school_id) {
        console.error('User not logged in or missing data:', loggedInUser)
        showToast('User session not found. Please refresh the page.', 'error')
        return
      }

      const { id: userId, school_id: schoolId } = loggedInUser
      // Load PDF settings from centralized settings with user ID
      const pdfSettings = getPdfSettings(userId)

      console.log('PDF Settings loaded for user:', userId)
      console.log('User school_id:', schoolId)

      // Fetch school data for logo and name
      const { data: schoolData, error: schoolError} = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single()

      if (schoolError) {
        console.error('Error fetching school data:', schoolError)
      }

      // Create PDF with settings - respect user's orientation choice
      const orientation = pdfSettings.orientation || 'portrait'
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pdfSettings.pageSize?.toLowerCase() || 'a4'
      })

      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Set page background color
      const bgRgb = hexToRgb(pdfSettings.backgroundColor || '#ffffff')
      doc.setFillColor(...bgRgb)
      doc.rect(0, 0, pageWidth, pageHeight, 'F')

      // Calculate margins using centralized function
      const margins = getMarginValues(pdfSettings.margin)

      const primaryRgb = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.primaryColor || '#1E3A8A')
      const secondaryRgb = hexToRgb(pdfSettings.secondaryColor || '#3B82F6')
      const textRgb = hexToRgb(pdfSettings.textColor || '#000000')

      // Header (if enabled)
      if (pdfSettings.includeHeader !== false) {
        doc.setFillColor(...primaryRgb)
        doc.rect(0, 0, pageWidth, 40, 'F')

        // School Logo (if available) - WITH SETTINGS
        if (pdfSettings.includeLogo && schoolData?.logo_url) {
          try {
            const logoImg = new Image()
            logoImg.crossOrigin = 'anonymous'

            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Logo load timeout')), 10000)

              logoImg.onload = () => {
                clearTimeout(timeout)
                try {
                  const currentLogoSize = getLogoSize(pdfSettings.logoSize)
                  const headerHeight = 40
                  const logoY = (headerHeight - currentLogoSize) / 2
                  let logoX = 10 // Default to left with 10mm margin

                  // Position logo based on settings
                  if (pdfSettings.logoPosition === 'center') {
                    logoX = 10 // Keep on left even if center selected (to avoid text overlap)
                  } else if (pdfSettings.logoPosition === 'right') {
                    logoX = pageWidth - currentLogoSize - 10 // Right side with 10mm margin
                  }

                  // Add logo with style
                  if (pdfSettings.logoStyle === 'circle' || pdfSettings.logoStyle === 'rounded') {
                    // Create a canvas to clip the image
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    const size = 200 // Higher resolution for better quality
                    canvas.width = size
                    canvas.height = size

                    // Draw clipped image on canvas
                    ctx.beginPath()
                    if (pdfSettings.logoStyle === 'circle') {
                      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                    } else {
                      // Rounded corners
                      const radius = size * 0.15
                      ctx.moveTo(radius, 0)
                      ctx.lineTo(size - radius, 0)
                      ctx.quadraticCurveTo(size, 0, size, radius)
                      ctx.lineTo(size, size - radius)
                      ctx.quadraticCurveTo(size, size, size - radius, size)
                      ctx.lineTo(radius, size)
                      ctx.quadraticCurveTo(0, size, 0, size - radius)
                      ctx.lineTo(0, radius)
                      ctx.quadraticCurveTo(0, 0, radius, 0)
                    }
                    ctx.closePath()
                    ctx.clip()

                    // Draw image
                    ctx.drawImage(logoImg, 0, 0, size, size)

                    // Convert canvas to data URL and add to PDF
                    const clippedImage = canvas.toDataURL('image/png')
                    doc.addImage(clippedImage, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
                  } else {
                    // Square logo
                    doc.addImage(logoImg, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
                  }

                  resolve()
                } catch (err) {
                  console.error('Logo canvas error:', err)
                  resolve()
                }
              }

              logoImg.onerror = (err) => {
                clearTimeout(timeout)
                console.error('Logo load failed:', err)
                resolve()
              }

              const logoUrl = schoolData.logo_url.startsWith('http')
                ? schoolData.logo_url
                : `${window.location.origin}${schoolData.logo_url.startsWith('/') ? '' : '/'}${schoolData.logo_url}`

              logoImg.src = logoUrl
            })
          } catch (e) {
            console.error('Error adding school logo:', e.message)
          }
        }

        // Title
        doc.setFontSize(20)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(pdfSettings.headerText || 'STUDENT INFORMATION RECORD', pageWidth / 2, 18, { align: 'center' })

        // Subtitle - School Name
        doc.setFontSize(10)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
        doc.text(schoolData?.name || 'School Management System', pageWidth / 2, 28, { align: 'center' })

        // Date in header (if enabled)
        if (pdfSettings.includeDate || pdfSettings.includeGeneratedDate) {
          doc.setFontSize(8)
          doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 15, 35, { align: 'right' })
        }
      }

      let yPos = pdfSettings.includeHeader !== false ? 48 : 15

      // Student Header Card - COMPACT responsive height
      const headerCardHeight = orientation === 'landscape' ? 20 : 24

      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margins.left, yPos, pageWidth - margins.left - margins.right, headerCardHeight, 2, 2, 'F')

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.roundedRect(margins.left, yPos, pageWidth - margins.left - margins.right, headerCardHeight, 2, 2, 'S')

      // Student Photo (if available) - COMPACT
      const photoSize = orientation === 'landscape' ? 16 : 20
      const photoX = margins.left + 2
      const photoY = yPos + 2

      if (selectedStudent.photo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'

          const photoBase64 = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Image load timeout')), 10000)

            img.onload = () => {
              clearTimeout(timeout)
              try {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                resolve(dataUrl)
              } catch (err) {
                console.error('Canvas error:', err)
                reject(err)
              }
            }

            img.onerror = (err) => {
              clearTimeout(timeout)
              reject(err)
            }

            const photoUrl = selectedStudent.photo_url.startsWith('http')
              ? selectedStudent.photo_url
              : `${window.location.origin}${selectedStudent.photo_url.startsWith('/') ? '' : '/'}${selectedStudent.photo_url}`

            img.src = photoUrl
          })

          if (photoBase64 && photoBase64.length > 100) {
            doc.addImage(photoBase64, 'JPEG', photoX, photoY, photoSize, photoSize)

            doc.setDrawColor(203, 213, 225)
            doc.setLineWidth(0.5)
            doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, 'S')
          } else {
            throw new Error('Invalid photo data')
          }
        } catch (e) {
          console.error('Error loading student photo:', e.message)
          // Fallback to avatar
          doc.setFillColor(226, 232, 240)
          doc.rect(photoX, photoY, photoSize, photoSize, 'F')
          doc.setFontSize(14)
          doc.setTextColor(...textRgb)
          doc.text(selectedStudent.avatar || '👤', photoX + photoSize/2, photoY + photoSize/2 + 3, { align: 'center' })
        }
      } else {
        // Photo placeholder
        doc.setFillColor(226, 232, 240)
        doc.rect(photoX, photoY, photoSize, photoSize, 'F')
        doc.setFontSize(14)
        doc.setTextColor(...textRgb)
        doc.text(selectedStudent.avatar || '👤', photoX + photoSize/2, photoY + photoSize/2 + 3, { align: 'center' })
      }

      // Student name and key info - COMPACT
      const infoX = photoX + photoSize + 4

      doc.setFontSize(parseInt(pdfSettings.fontSize || '10') + 2)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
      doc.setTextColor(...primaryRgb)
      doc.text(`${selectedStudent.first_name} ${selectedStudent.last_name || ''}`, infoX, yPos + 7)

      doc.setFontSize(parseInt(pdfSettings.fontSize || '10') - 2)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
      doc.setTextColor(75, 85, 99)
      doc.text(`Admission No: ${selectedStudent.admission_number}`, infoX, yPos + 12)
      doc.text(`Class: ${selectedStudent.className || 'N/A'} | Section: ${selectedStudent.sectionName || 'N/A'}`, infoX, yPos + 16)

      // Status badge - INACTIVE
      const statusColor = [239, 68, 68]
      doc.setFillColor(...statusColor)
      doc.roundedRect(pageWidth - margins.right - 25, yPos + 4, 23, 6, 2, 2, 'F')
      doc.setFontSize(7)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('INACTIVE', pageWidth - margins.right - 13.5, yPos + 8, { align: 'center' })

      yPos += orientation === 'landscape' ? 20 : 25

      // Helper function for section headers
      const addSectionHeader = (title) => {
        const footerReservedSpace = 20
        const maxContentY = pageHeight - footerReservedSpace

        if (yPos + 10 > maxContentY) {
          doc.addPage()
          yPos = margins.top || 15
        }

        const tableHeaderRgb = hexToRgb(pdfSettings.tableHeaderColor || pdfSettings.secondaryColor || '#3B82F6')
        doc.setFillColor(...tableHeaderRgb)
        doc.roundedRect(margins.left, yPos, pageWidth - margins.left - margins.right, 6, 1, 1, 'F')

        doc.setFontSize(parseInt(pdfSettings.fontSize || '10') - 1)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(title, margins.left + 3, yPos + 4)
        yPos += 7.5
      }

      // Helper function for fields
      const addTwoColumnFields = (fields) => {
        const numColumns = orientation === 'landscape' ? 3 : 2
        const gapSize = 2
        const totalGaps = (numColumns - 1) * gapSize
        const colWidth = (pageWidth - margins.left - margins.right - totalGaps) / numColumns

        let col = 0
        let rowY = yPos

        const fieldBgRgb = [249, 250, 251]
        const labelColorRgb = [107, 114, 128]
        const borderRgb = [229, 231, 235]

        const footerReservedSpace = 20
        const maxContentY = pageHeight - footerReservedSpace
        const fieldHeight = 7.5

        fields.forEach(([label, value]) => {
          if (value && value !== 'N/A' && value !== null && value !== undefined && value !== '') {
            if (rowY + 10 > maxContentY) {
              doc.addPage()
              rowY = margins.top || 15
              col = 0
            }

            const xPos = margins.left + (col * (colWidth + gapSize))

            doc.setFillColor(...fieldBgRgb)
            doc.roundedRect(xPos, rowY, colWidth, fieldHeight, 1, 1, 'F')

            doc.setDrawColor(...borderRgb)
            doc.setLineWidth(0.2)
            doc.roundedRect(xPos, rowY, colWidth, fieldHeight, 1, 1, 'S')

            doc.setFontSize(5.5)
            doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
            doc.setTextColor(...labelColorRgb)
            doc.text(label.toUpperCase(), xPos + 1.5, rowY + 3)

            doc.setFontSize(7.5)
            doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
            doc.setTextColor(31, 41, 55)

            const maxChars = orientation === 'landscape' ? 28 : 35
            let valueText = String(value)
            if (valueText.length > maxChars) {
              valueText = valueText.substring(0, maxChars - 3) + '...'
            }

            doc.text(valueText, xPos + 1.5, rowY + 6, { maxWidth: colWidth - 3 })

            col++
            if (col >= numColumns) {
              col = 0
              rowY += fieldHeight + 1.5
            }
          }
        })

        yPos = col === 0 ? rowY : rowY + fieldHeight + 1.5
      }

      // Basic Information
      addSectionHeader('BASIC INFORMATION')
      addTwoColumnFields([
        ['First Name', selectedStudent.first_name],
        ['Last Name', selectedStudent.last_name],
        ['Gender', selectedStudent.gender],
        ['Date of Birth', selectedStudent.date_of_birth],
        ['Blood Group', selectedStudent.blood_group],
        ['Religion', selectedStudent.religion],
        ['Caste', selectedStudent.caste],
        ['Nationality', selectedStudent.nationality || 'Pakistan']
      ])

      yPos += orientation === 'landscape' ? 1.5 : 2

      // Academic Information
      addSectionHeader('ACADEMIC INFORMATION')
      addTwoColumnFields([
        ['Class', selectedStudent.className],
        ['Section', selectedStudent.sectionName],
        ['Roll Number', selectedStudent.roll_number],
        ['House', selectedStudent.house],
        ['Admission Date', selectedStudent.admission_date],
        ['Status', 'Inactive']
      ])

      yPos += orientation === 'landscape' ? 1.5 : 2

      // Father Information
      if (selectedStudent.father_name) {
        addSectionHeader('FATHER INFORMATION')
        addTwoColumnFields([
          ['Father Name', selectedStudent.father_name],
          ['Father CNIC', selectedStudent.father_cnic],
          ['Mobile', selectedStudent.father_phone],
          ['Email', selectedStudent.father_email],
          ['Qualification', selectedStudent.father_qualification],
          ['Occupation', selectedStudent.father_occupation],
          ['Annual Income', selectedStudent.father_annual_income]
        ])
        yPos += orientation === 'landscape' ? 1.5 : 2
      }

      // Mother Information
      if (selectedStudent.mother_name) {
        addSectionHeader('MOTHER INFORMATION')
        addTwoColumnFields([
          ['Mother Name', selectedStudent.mother_name],
          ['Mother CNIC', selectedStudent.mother_cnic],
          ['Mobile', selectedStudent.mother_phone],
          ['Email', selectedStudent.mother_email],
          ['Qualification', selectedStudent.mother_qualification],
          ['Occupation', selectedStudent.mother_occupation],
          ['Annual Income', selectedStudent.mother_annual_income]
        ])
        yPos += orientation === 'landscape' ? 1.5 : 2
      }

      // Contact Information
      if (selectedStudent.whatsapp_number || selectedStudent.current_address) {
        addSectionHeader('CONTACT INFORMATION')
        addTwoColumnFields([
          ['WhatsApp Number', selectedStudent.whatsapp_number],
          ['Guardian Mobile', selectedStudent.guardian_mobile],
          ['Address', selectedStudent.current_address],
          ['City', selectedStudent.city],
          ['State', selectedStudent.state],
          ['Postal Code', selectedStudent.postal_code]
        ])
        yPos += orientation === 'landscape' ? 1.5 : 2
      }

      // Fee Information
      if (selectedStudent.base_fee || selectedStudent.discount_amount) {
        addSectionHeader('FEE INFORMATION')
        addTwoColumnFields([
          ['Base Fee', selectedStudent.base_fee ? `PKR ${selectedStudent.base_fee}` : null],
          ['Discount Amount', selectedStudent.discount_amount ? `PKR ${selectedStudent.discount_amount}` : null],
          ['Final Fee', selectedStudent.final_fee ? `PKR ${selectedStudent.final_fee}` : null],
          ['Fee Plan', selectedStudent.fee_plan],
          ['Discount Note', selectedStudent.discount_note]
        ])
      }

      // Footer
      if (pdfSettings.includeFooter !== false) {
        addPDFFooter(doc, 1, 1, pdfSettings)
      }

      // Save the PDF
      doc.save(`Student_${selectedStudent.admission_number}_${selectedStudent.first_name}.pdf`)

      setShowViewModal(false)

      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      console.error('Error details:', error.message, error.stack)
      showToast(`Failed to generate PDF: ${error.message || 'Please try again'}`, 'error')
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

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

        {/* Student Count and Export Button */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">
            There are <span className="text-red-600 font-bold">{filteredStudents.length}</span> inactive students{selectedClass ? ' in this class' : ''}.
          </p>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Download size={18} />
            Export to Excel
          </button>
        </div>

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
                  paginatedStudents.map((student, index) => (
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
                        <div className="flex items-center gap-3">
                          {student.photo_url ? (
                            <img
                              src={student.photo_url}
                              alt={student.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                              {student.avatar}
                            </div>
                          )}
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

        {/* Pagination Controls */}
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

                  // Adjust startPage if we're near the end
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

      {/* View Student Modal */}
      {showViewModal && selectedStudent && (
        <ModalOverlay onClose={() => setShowViewModal(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl flex-shrink-0">
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
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                <style jsx>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                  }
                `}</style>
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
                    <p className="text-sm text-gray-500">Status: <span className="font-semibold text-red-600">Inactive</span></p>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Basic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {selectedStudent.student_cnic && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Student CNIC/B-Form</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.student_cnic}</p>
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
                    {selectedStudent.caste_race && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Caste/Race</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.caste_race}</p>
                      </div>
                    )}
                    {selectedStudent.nationality && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Nationality</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.nationality}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Academic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {selectedStudent.house && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">House</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.house}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Father Information */}
                {selectedStudent.father_name && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Father Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.father_name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Name</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_name}</p>
                        </div>
                      )}
                      {selectedStudent.father_cnic && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father CNIC</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_cnic}</p>
                        </div>
                      )}
                      {selectedStudent.father_mobile && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Mobile</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_mobile}</p>
                        </div>
                      )}
                      {selectedStudent.father_email && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Email</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_email}</p>
                        </div>
                      )}
                      {selectedStudent.father_qualification && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Qualification</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_qualification}</p>
                        </div>
                      )}
                      {selectedStudent.father_occupation && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Occupation</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_occupation}</p>
                        </div>
                      )}
                      {selectedStudent.father_annual_income && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Father Annual Income</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_annual_income}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mother Information */}
                {selectedStudent.mother_name && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Mother Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.mother_name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Name</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_name}</p>
                        </div>
                      )}
                      {selectedStudent.mother_cnic && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother CNIC</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_cnic}</p>
                        </div>
                      )}
                      {selectedStudent.mother_mobile && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Mobile</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_mobile}</p>
                        </div>
                      )}
                      {selectedStudent.mother_email && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Email</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_email}</p>
                        </div>
                      )}
                      {selectedStudent.mother_qualification && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Qualification</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_qualification}</p>
                        </div>
                      )}
                      {selectedStudent.mother_occupation && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Occupation</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_occupation}</p>
                        </div>
                      )}
                      {selectedStudent.mother_annual_income && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Mother Annual Income</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_annual_income}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {(selectedStudent.whatsapp_number || selectedStudent.current_address || selectedStudent.city || selectedStudent.state || selectedStudent.postal_code) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Contact Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.whatsapp_number && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">WhatsApp Number</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.whatsapp_number}</p>
                        </div>
                      )}
                      {selectedStudent.current_address && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Current Address</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.current_address}</p>
                        </div>
                      )}
                      {selectedStudent.city && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">City</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.city}</p>
                        </div>
                      )}
                      {selectedStudent.state && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">State/Province</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.state}</p>
                        </div>
                      )}
                      {selectedStudent.postal_code && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Postal Code</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.postal_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fee Information */}
                {(selectedStudent.base_fee || selectedStudent.discount_amount || selectedStudent.final_fee) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Fee Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.base_fee && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.base_fee}</p>
                        </div>
                      )}
                      {selectedStudent.discount_amount && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Discount</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.discount_amount}</p>
                        </div>
                      )}
                      {selectedStudent.final_fee && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Final Fee</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.final_fee}</p>
                        </div>
                      )}
                      {selectedStudent.discount_note && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Discount Note</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.discount_note}</p>
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
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete student <span className="font-bold text-red-600">{selectedStudent.first_name} {selectedStudent.last_name || ''}</span>? This action cannot be undone.
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

      {/* Edit Student Sidebar */}
      {showEditSidebar && (
        <ModalOverlay onClose={() => !saving && setShowEditSidebar(false)} disabled={saving}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
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
        </ModalOverlay>
      )}
    </div>
  )
}
