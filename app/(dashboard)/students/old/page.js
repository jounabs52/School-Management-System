// app/(dashboard)/students/old/page.js
'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Eye, Edit2, Trash2, Loader2, AlertCircle, X, ToggleLeft, ToggleRight, Printer, CheckCircle, Download } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'

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

    try {
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
      // Toggle to active status
      const { error: updateError } = await supabase
        .from('students')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', student.id)

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

  const handlePrintStudent = () => {
    if (!selectedStudent) return

    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Student Information', 105, 20, { align: 'center' })

    // Line
    doc.setDrawColor(200, 200, 200)
    doc.line(20, 25, 190, 25)

    let yPos = 35
    const lineHeight = 7
    const leftMargin = 20

    // Helper function to add field
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

    // Basic Information Section
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Basic Information', leftMargin, yPos)
    yPos += lineHeight + 2

    addField('Admission No', selectedStudent.fullData?.admission_number || selectedStudent.admNo)
    addField('Full Name', selectedStudent.name)
    addField('Gender', selectedStudent.fullData?.gender)
    addField('Date of Birth', selectedStudent.fullData?.date_of_birth)
    addField('Blood Group', selectedStudent.fullData?.blood_group)
    addField('Religion', selectedStudent.fullData?.religion)
    addField('Caste', selectedStudent.fullData?.caste)
    addField('Nationality', selectedStudent.fullData?.nationality)

    yPos += 5

    // Academic Information
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Academic Information', leftMargin, yPos)
    yPos += lineHeight + 2

    addField('Class', getClassName(selectedStudent.class))
    addField('Section', selectedStudent.fullData?.current_section_id)
    addField('Roll Number', selectedStudent.fullData?.roll_number)
    addField('House', selectedStudent.fullData?.house)
    addField('Admission Date', selectedStudent.fullData?.admission_date)
    addField('Status', 'Inactive')

    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    } else {
      yPos += 5
    }

    // Father Information
    if (selectedStudent.father || selectedStudent.fullData?.father_name) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Father Information', leftMargin, yPos)
      yPos += lineHeight + 2

      addField('Father Name', selectedStudent.father || selectedStudent.fullData?.father_name)
      addField('Father CNIC', selectedStudent.fullData?.father_cnic)
      addField('Father Mobile', selectedStudent.fullData?.father_mobile)
      addField('Father Email', selectedStudent.fullData?.father_email)
      addField('Qualification', selectedStudent.fullData?.father_qualification)
      addField('Occupation', selectedStudent.fullData?.father_occupation)
      addField('Annual Income', selectedStudent.fullData?.father_annual_income)

      yPos += 5
    }

    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    // Mother Information
    if (selectedStudent.fullData?.mother_name) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Mother Information', leftMargin, yPos)
      yPos += lineHeight + 2

      addField('Mother Name', selectedStudent.fullData?.mother_name)
      addField('Mother CNIC', selectedStudent.fullData?.mother_cnic)
      addField('Mother Mobile', selectedStudent.fullData?.mother_mobile)
      addField('Mother Email', selectedStudent.fullData?.mother_email)
      addField('Qualification', selectedStudent.fullData?.mother_qualification)
      addField('Occupation', selectedStudent.fullData?.mother_occupation)
      addField('Annual Income', selectedStudent.fullData?.mother_annual_income)

      yPos += 5
    }

    // Fee Information
    if (selectedStudent.fullData?.base_fee || selectedStudent.fullData?.discount_amount) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Fee Information', leftMargin, yPos)
      yPos += lineHeight + 2

      addField('Base Fee', selectedStudent.fullData?.base_fee)
      addField('Discount', selectedStudent.fullData?.discount_amount)
      addField('Final Fee', selectedStudent.fullData?.final_fee)
      addField('Discount Note', selectedStudent.fullData?.discount_note, true)
    }

    // Save the PDF
    doc.save(`Student_${selectedStudent.admNo}_${selectedStudent.name.replace(/\s+/g, '_')}.pdf`)

    showToast('PDF generated successfully!', 'success')
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
                {/* Student Header */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl overflow-hidden">
                    {selectedStudent.fullData?.photo_url || selectedStudent.photo_url ? (
                      <img
                        src={selectedStudent.fullData?.photo_url || selectedStudent.photo_url}
                        alt={selectedStudent.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedStudent.avatar
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h4>
                    <p className="text-gray-600">Admission No: <span className="font-semibold">{selectedStudent.admNo}</span></p>
                    <p className="text-sm text-gray-500">Status: <span className="font-semibold text-red-600">Inactive</span></p>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Basic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedStudent.name && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">First Name</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.name}</p>
                      </div>
                    )}
                    {selectedStudent.gender && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Gender</p>
                        <p className="font-semibold text-gray-800 capitalize">{selectedStudent.gender}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.date_of_birth && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.date_of_birth}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.blood_group && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Blood Group</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.blood_group}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.religion && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Religion</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.religion}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.caste && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Caste</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.caste}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.nationality && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Nationality</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.nationality}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                <div className="mb-6">
                  <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Academic Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedStudent.class && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Class</p>
                        <p className="font-semibold text-gray-800">{getClassName(selectedStudent.class)}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.current_section_id && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Section</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.current_section_id}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.roll_number && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Roll Number</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.roll_number}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.admission_date && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Admission Date</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.admission_date}</p>
                      </div>
                    )}
                    {selectedStudent.fullData?.house && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">House</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.fullData.house}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Father Information */}
                {selectedStudent.father && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Father Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.father && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Name</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.father_cnic && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father CNIC</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.father_cnic}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.father_mobile && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Mobile</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.father_mobile}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.father_email && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Email</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.father_email}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.father_qualification && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Qualification</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.father_qualification}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.father_occupation && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Father Occupation</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.father_occupation}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.father_annual_income && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Father Annual Income</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.father_annual_income}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mother Information */}
                {selectedStudent.fullData?.mother_name && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Mother Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.fullData?.mother_name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Name</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.mother_name}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.mother_cnic && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother CNIC</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.mother_cnic}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.mother_mobile && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Mobile</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.mother_mobile}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.mother_email && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Email</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.mother_email}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.mother_qualification && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Qualification</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.mother_qualification}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.mother_occupation && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Mother Occupation</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.mother_occupation}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.mother_annual_income && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Mother Annual Income</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.mother_annual_income}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {(selectedStudent.fullData?.whatsapp_number || selectedStudent.fullData?.current_address || selectedStudent.fullData?.city || selectedStudent.fullData?.state || selectedStudent.fullData?.postal_code) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Contact Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.fullData?.whatsapp_number && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">WhatsApp Number</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.whatsapp_number}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.current_address && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Current Address</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.current_address}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.city && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">City</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.city}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.state && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">State/Province</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.state}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.postal_code && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Postal Code</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.postal_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fee Information */}
                {(selectedStudent.fullData?.base_fee || selectedStudent.fullData?.discount_amount) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Fee Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.fullData?.base_fee && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.base_fee}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.discount_amount && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Discount</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.discount_amount}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.final_fee && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Final Fee</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.final_fee}</p>
                        </div>
                      )}
                      {selectedStudent.fullData?.discount_note && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Discount Note</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.fullData.discount_note}</p>
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
                  Are you sure you want to delete student <span className="font-bold text-red-600">{selectedStudent.name}</span>? This action cannot be undone.
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
