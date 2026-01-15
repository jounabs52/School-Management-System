'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileText, UserPlus, Upload, Search, Eye, Edit2, Trash2, X, Plus, ChevronDown, ChevronUp, Loader2, AlertCircle, ToggleLeft, ToggleRight, Printer, CheckCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'
import { getPdfSettings, hexToRgb, getMarginValues, getLogoSize, getLineWidth, applyPdfSettings, getAutoTableStyles, addPDFFooter } from '@/lib/pdfSettings'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create Supabase client with custom auth
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

export default function AdmissionRegisterPage() {
  const [activeTab, setActiveTab] = useState('register')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [showRegisterSidebar, setShowRegisterSidebar] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showOtherDetails, setShowOtherDetails] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [importExpanded, setImportExpanded] = useState(true)
  const [admissions, setAdmissions] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingSections, setLoadingSections] = useState(false)
  const [importing, setImporting] = useState(false)
  const [classSearchTerm, setClassSearchTerm] = useState('')
  const [sectionSearchTerm, setSectionSearchTerm] = useState('')
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [showSectionDropdown, setShowSectionDropdown] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(10)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [admissionNoExists, setAdmissionNoExists] = useState(false)
  const [checkingAdmissionNo, setCheckingAdmissionNo] = useState(false)

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const [importData, setImportData] = useState({
    classId: '',
    className: '',
    sectionId: '',
    sectionName: '',
    category: 'Active Student'
  })
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
    selectFamily: '',
    fatherCnic: '',
    familyNo: '',
    studentName: '',
    fatherName: '',
    fatherMobile: '',
    fatherEmail: '',
    fatherQualification: '',
    fatherOccupation: '',
    fatherAnnualIncome: '',
    guardianMobile: '',
    whatsappNumber: '',
    category: '',
    dateOfBirth: '',
    studentCnic: '',
    casteRace: '',
    gender: 'male',
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
    guardianEmail: '',
    emergencyRelation: '',
    emergencyContactName: '',
    emergencyPhone: '',
    emergencyMobile: '',
    emergencyAddress: '',
    utmSource: '',
    admissionFormNo: '',
    registerSerialNo: '',
    previousClass: '',
    previousSchool: '',
    region: '',
    bloodGroup: '',
    studentMobile: '',
    birthPlace: '',
    religion: '',
    nationality: 'Pakistan',
    permanentAddress: '',
    medicalProblem: '',
    feePlan: 'monthly',
    startingMonth: new Date().getMonth() + 1, // Current month (1-12)
    discountType: 'fixed' // 'fixed' or 'percentage'
  })

  // Fee schedule preview state
  const [feeSchedulePreview, setFeeSchedulePreview] = useState([])

  // Calculate actual discount amount based on type
  const calculateDiscount = (baseFee, discount, discountType) => {
    const base = parseFloat(baseFee) || 0
    const discountValue = parseFloat(discount) || 0
    if (discountType === 'percentage') {
      return Math.round((base * discountValue) / 100)
    }
    return discountValue
  }

  // Generate fee schedule based on fee plan and starting month
  const generateFeeSchedule = (feePlan, startingMonth, baseFee, discount, discountType) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December']
    const currentYear = new Date().getFullYear()
    const actualDiscount = calculateDiscount(baseFee, discount, discountType)
    const monthlyFee = (parseFloat(baseFee) || 0) - actualDiscount
    const schedule = []

    if (feePlan === 'monthly') {
      // Generate 12 monthly challans from starting month
      for (let i = 0; i < 12; i++) {
        const monthIndex = ((startingMonth - 1) + i) % 12
        const year = currentYear + Math.floor(((startingMonth - 1) + i) / 12)
        schedule.push({
          period: monthNames[monthIndex],
          months: [monthNames[monthIndex]],
          amount: monthlyFee,
          dueDate: new Date(year, monthIndex, 10), // Due on 10th of each month
          year: year
        })
      }
    } else if (feePlan === 'quarterly') {
      // Generate 4 quarterly challans (3 months each)
      for (let i = 0; i < 4; i++) {
        const startMonthIndex = ((startingMonth - 1) + (i * 3)) % 12
        const endMonthIndex = ((startingMonth - 1) + (i * 3) + 2) % 12
        const year = currentYear + Math.floor(((startingMonth - 1) + (i * 3)) / 12)
        const months = []
        for (let j = 0; j < 3; j++) {
          months.push(monthNames[((startingMonth - 1) + (i * 3) + j) % 12])
        }
        schedule.push({
          period: `${monthNames[startMonthIndex]} - ${monthNames[endMonthIndex]}`,
          months: months,
          amount: monthlyFee * 3,
          dueDate: new Date(year, startMonthIndex, 10), // Due on 10th of first month
          year: year
        })
      }
    } else if (feePlan === 'semi-annual') {
      // Generate 2 semi-annual challans (6 months each)
      for (let i = 0; i < 2; i++) {
        const startMonthIndex = ((startingMonth - 1) + (i * 6)) % 12
        const endMonthIndex = ((startingMonth - 1) + (i * 6) + 5) % 12
        const year = currentYear + Math.floor(((startingMonth - 1) + (i * 6)) / 12)
        const months = []
        for (let j = 0; j < 6; j++) {
          months.push(monthNames[((startingMonth - 1) + (i * 6) + j) % 12])
        }
        schedule.push({
          period: `${monthNames[startMonthIndex]} - ${monthNames[endMonthIndex]}`,
          months: months,
          amount: monthlyFee * 6,
          dueDate: new Date(year, startMonthIndex, 10), // Due on 10th of first month
          year: year
        })
      }
    } else if (feePlan === 'annual') {
      // Generate 1 annual challan (12 months)
      const startMonthIndex = startingMonth - 1
      const endMonthIndex = ((startingMonth - 1) + 11) % 12
      const months = []
      for (let j = 0; j < 12; j++) {
        months.push(monthNames[((startingMonth - 1) + j) % 12])
      }
      schedule.push({
        period: `${monthNames[startMonthIndex]} - ${monthNames[endMonthIndex]}`,
        months: months,
        amount: monthlyFee * 12,
        dueDate: new Date(currentYear, startMonthIndex, 10), // Due on 10th of first month
        year: currentYear
      })
    }

    return schedule
  }

  // Update fee schedule preview when relevant fields change
  useEffect(() => {
    if (formData.baseFee && formData.feePlan && formData.startingMonth) {
      const schedule = generateFeeSchedule(
        formData.feePlan,
        parseInt(formData.startingMonth),
        formData.baseFee,
        formData.discount,
        formData.discountType
      )
      setFeeSchedulePreview(schedule)
    } else {
      setFeeSchedulePreview([])
    }
  }, [formData.feePlan, formData.startingMonth, formData.baseFee, formData.discount, formData.discountType])

  // Fetch classes when sidebar opens
  useEffect(() => {
    if (showRegisterSidebar) {
      fetchClasses()
    }
  }, [showRegisterSidebar])

  // Fetch classes on component mount for filter dropdown
  useEffect(() => {
    fetchClasses()
  }, [])

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents()
  }, [])

  // Refresh when class filter changes
  useEffect(() => {
    fetchStudents()
  }, [selectedOption])

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Check admission number uniqueness with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.admissionNo && showRegisterSidebar) {
        checkAdmissionNumberExists(formData.admissionNo)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.admissionNo, showRegisterSidebar, isEditMode])

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showRegisterSidebar || showViewModal || showDeleteModal) {
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
  }, [showRegisterSidebar, showViewModal, showDeleteModal])

  const fetchStudents = async () => {
    setLoading(true)
    setError(null)
    try {
      // ✅ Get logged-in user
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
      const userId = user?.id
      const schoolId = user?.school_id

      if (!userId || !schoolId) {
        setError('User not logged in')
        setLoading(false)
        return
      }

      let query = supabase
        .from('students')
        .select('*')
        .eq('user_id', userId)          // ✅ Filter by user
        .eq('school_id', schoolId)      // ✅ Filter by school
        .in('status', ['active', 'inactive'])
        .order('created_at', { ascending: false })

      // Apply class filter if selected
      if (selectedOption) {
        query = query.eq('current_class_id', selectedOption)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }

      if (!data) {
        setAdmissions([])
        return
      }

      const formattedStudents = data.map((student, index) => ({
        id: student.id,
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
        sr: index + 1
      }))

      setAdmissions(formattedStudents)
    } catch (err) {
      console.error('Error fetching students:', err)
      setError(`Failed to load students: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkAdmissionNumberExists = async (admissionNo) => {
    if (!admissionNo || admissionNo.trim() === '') {
      setAdmissionNoExists(false)
      return
    }

    setCheckingAdmissionNo(true)
    try {
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('id', currentUser.school_id)
        .single()

      if (schoolError) {
        console.error('Error fetching school:', schoolError)
        return
      }

      let query = supabase
        .from('students')
        .select('id, admission_number')
        .eq('school_id', schools.id)
        .eq('admission_number', admissionNo.trim())

      if (isEditMode && formData.id) {
        query = query.neq('id', formData.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error checking admission number:', error)
        return
      }

      setAdmissionNoExists(data && data.length > 0)
    } catch (err) {
      console.error('Error checking admission number:', err)
    } finally {
      setCheckingAdmissionNo(false)
    }
  }

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      // ✅ Get logged-in user
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
      const userId = user?.id
      const schoolId = user?.school_id

      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, standard_fee, fee_plan, status')
        .eq('user_id', userId)          // ✅ Filter by user
        .eq('school_id', schoolId)      // ✅ Filter by school
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
      // ✅ Get logged-in user
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
      const userId = user?.id
      const schoolId = user?.school_id

      const { data, error } = await supabase
        .from('sections')
        .select('id, section_name, status, capacity')
        .eq('class_id', classId)
        .eq('user_id', userId)          // ✅ Filter by user
        .eq('school_id', schoolId)      // ✅ Filter by school
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (error) throw error

      // Get student counts for all sections in a single query
      const sectionIds = (data || []).map(section => section.id)

      if (sectionIds.length === 0) {
        setSections([])
        return
      }

      const { data: studentCounts, error: countError } = await supabase
        .from('students')
        .select('current_section_id')
        .in('current_section_id', sectionIds)
        .eq('status', 'active')

      if (countError) {
        console.error('Error counting students:', countError)
        setSections(data.map(section => ({ ...section, current_count: 0 })))
        return
      }

      // Count students per section
      const countMap = {}
      studentCounts.forEach(student => {
        const sectionId = student.current_section_id
        countMap[sectionId] = (countMap[sectionId] || 0) + 1
      })

      // Add counts to sections
      const sectionsWithCount = data.map(section => ({
        ...section,
        current_count: countMap[section.id] || 0
      }))

      setSections(sectionsWithCount)
    } catch (err) {
      console.error('Error fetching sections:', err)
      // Don't show error if sections table doesn't exist yet
      setSections([])
    } finally {
      setLoadingSections(false)
    }
  }

  const handleClassChange = (classId) => {
    const selectedClass = classes.find(c => c.id === classId)

    // Validate fee_plan - only allow valid values from CHECK constraint
    const validFeePlans = ['monthly', 'quarterly', 'semi-annual', 'annual']
    const classFeePlan = selectedClass?.fee_plan
    const validatedFeePlan = validFeePlans.includes(classFeePlan) ? classFeePlan : 'monthly'

    setFormData({
      ...formData,
      class: classId,
      section: '', // Reset section when class changes
      baseFee: selectedClass?.standard_fee || '',
      feePlan: validatedFeePlan // Get fee plan from class with validation
    })
    // Fetch sections for the selected class
    fetchSections(classId)
  }

  const handleSectionChange = (sectionId) => {
    if (!sectionId) {
      setFormData({ ...formData, section: sectionId })
      return
    }

    // Find the selected section
    const selectedSection = sections.find(s => s.id === sectionId)

    if (selectedSection) {
      const capacity = selectedSection.capacity || 0
      const currentCount = selectedSection.current_count || 0

      // Check if we're editing an existing student
      if (isEditMode) {
        // Allow section change when editing
        setFormData({ ...formData, section: sectionId })
      } else {
        // For new admission, check capacity
        if (currentCount >= capacity) {
          showToast(`Section ${selectedSection.section_name} is full! Capacity: ${capacity}/${capacity}`, 'error')
          setFormData({ ...formData, section: '' })
        } else {
          setFormData({ ...formData, section: sectionId })
        }
      }
    } else {
      setFormData({ ...formData, section: sectionId })
    }
  }

  const getClassName = (classId) => {
    const classObj = classes.find(c => c.id === classId)
    return classObj?.class_name || classId || 'N/A'
  }

  const filteredAdmissions = admissions.filter(adm => {
    const matchesSearch = adm.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      adm.father.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      adm.admNo.toString().includes(debouncedSearchTerm)

    const matchesClass = !selectedOption || adm.class === selectedOption

    return matchesSearch && matchesClass
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredAdmissions.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedAdmissions = filteredAdmissions.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedOption])

  const resetForm = () => {
    setFormData({
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
      selectFamily: '',
      fatherCnic: '',
      familyNo: '',
      studentName: '',
      fatherName: '',
      fatherMobile: '',
      fatherEmail: '',
      fatherQualification: '',
      fatherOccupation: '',
      fatherAnnualIncome: '',
      guardianMobile: '',
      whatsappNumber: '',
      category: '',
      dateOfBirth: '',
      studentCnic: '',
      casteRace: '',
      gender: 'male',
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
      guardianEmail: '',
      emergencyRelation: '',
      emergencyContactName: '',
      emergencyPhone: '',
      emergencyMobile: '',
      emergencyAddress: '',
      utmSource: '',
      admissionFormNo: '',
      registerSerialNo: '',
      previousClass: '',
      previousSchool: '',
      region: '',
      bloodGroup: '',
      studentMobile: '',
      birthPlace: '',
      religion: '',
      nationality: 'Pakistan',
      permanentAddress: '',
      medicalProblem: '',
      feePlan: 'monthly',
      startingMonth: new Date().getMonth() + 1,
      discountType: 'fixed'
    })
    setIsEditMode(false)
    setShowOtherDetails(false)
    setSections([])
    setFeeSchedulePreview([])
  }

  const handleRegisterNewStudent = () => {
    resetForm()
    setShowRegisterSidebar(true)
  }

  const handleSaveStudent = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // ✅ Validate mandatory fields
      if (!formData.class) {
        showToast('Class is mandatory', 'error')
        setSaving(false)
        return
      }

      if (!formData.section) {
        showToast('Section is mandatory', 'error')
        setSaving(false)
        return
      }

      if (!formData.rollNumber || !formData.rollNumber.trim()) {
        showToast('Roll Number is mandatory', 'error')
        setSaving(false)
        return
      }

      if (!formData.feePlan) {
        showToast('Fee Plan (Mode) is mandatory', 'error')
        setSaving(false)
        return
      }

      // ✅ Get logged-in user
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
      const userId = user?.id
      const schoolId = user?.school_id

      if (!userId || !schoolId) {
        throw new Error('User not logged in. Please login again.')
      }

      // Split student name
      const nameParts = formData.studentName.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || null

      // Handle image upload to Supabase bucket
      let photoUrl = formData.photoUrl || null
      if (imageFile) {
        try {
          const fileExt = imageFile.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `student-photos/${fileName}`

          console.log('Uploading file:', fileName, 'to bucket: student-images')

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('student-images')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Upload error details:', uploadError)
            throw new Error(`Failed to upload image: ${uploadError.message}`)
          }

          console.log('Upload successful:', uploadData)

          const { data: urlData } = supabase.storage
            .from('student-images')
            .getPublicUrl(filePath)

          photoUrl = urlData.publicUrl
          console.log('Public URL:', photoUrl)
        } catch (imgError) {
          console.error('Image upload error:', imgError)
          showToast('Image upload failed. Student will be saved without photo.', 'error')
          photoUrl = formData.photoUrl || null
        }
      }

      // schoolId is already set from user at the top of the function
      // No need to fetch from schools table anymore

      // Validate fee_plan before database operation
      const validFeePlans = ['monthly', 'quarterly', 'semi-annual', 'annual']
      const safeFeePlan = validFeePlans.includes(formData.feePlan) ? formData.feePlan : 'monthly'

      if (isEditMode) {
        // Update existing student
        const { error: updateError } = await supabase
          .from('students')
          .update({
            admission_number: formData.admissionNo,
            first_name: firstName,
            last_name: lastName,
            father_name: formData.fatherName,
            photo_url: photoUrl,
            mother_name: formData.motherName || null,
            date_of_birth: formData.dateOfBirth || null,
            gender: formData.gender,
            blood_group: formData.bloodGroup || null,
            religion: formData.religion || null,
            caste: formData.casteRace || null,
            nationality: formData.nationality || 'Pakistan',
            admission_date: formData.admissionDate,
            current_class_id: formData.class || null,
            current_section_id: formData.section || null,
            roll_number: formData.rollNumber || null,
            house: formData.house || null,
            whatsapp_number: formData.whatsappNumber || null,
            base_fee: parseFloat(formData.baseFee) || 0,
            discount_type: formData.discountType || 'fixed',
            discount_value: parseFloat(formData.discount) || 0,
            discount_amount: calculateDiscount(formData.baseFee, formData.discount, formData.discountType),
            discount_note: formData.discountNote || null,
            final_fee: (parseFloat(formData.baseFee) || 0) - calculateDiscount(formData.baseFee, formData.discount, formData.discountType),
            fee_plan: safeFeePlan,
            starting_month: parseInt(formData.startingMonth) || new Date().getMonth() + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id)

        if (updateError) throw updateError

        // Update state without reloading
        setAdmissions(prev => prev.map(adm =>
          adm.id === formData.id
            ? { ...adm, name: `${firstName} ${lastName || ''}`, father: formData.fatherName, admNo: formData.admissionNo, photo_url: photoUrl }
            : adm
        ))

        showToast('Student updated successfully!', 'success')
      } else {
        // Create new student
        const { data: insertedStudent, error: insertError } = await supabase
          .from('students')
          .insert([{
            user_id: userId,                // ✅ Add user_id
            school_id: schoolId,
            admission_number: formData.admissionNo,
            first_name: firstName,
            last_name: lastName,
            father_name: formData.fatherName,
            photo_url: photoUrl,
            mother_name: formData.motherName || null,
            date_of_birth: formData.dateOfBirth || null,
            gender: formData.gender,
            blood_group: formData.bloodGroup || null,
            religion: formData.religion || null,
            caste: formData.casteRace || null,
            nationality: formData.nationality || 'Pakistan',
            admission_date: formData.admissionDate,
            current_class_id: formData.class || null,
            current_section_id: formData.section || null,
            roll_number: formData.rollNumber || null,
            house: formData.house || null,
            whatsapp_number: formData.whatsappNumber || null,
            base_fee: parseFloat(formData.baseFee) || 0,
            discount_type: formData.discountType || 'fixed',
            discount_value: parseFloat(formData.discount) || 0,
            discount_amount: calculateDiscount(formData.baseFee, formData.discount, formData.discountType),
            discount_note: formData.discountNote || null,
            final_fee: (parseFloat(formData.baseFee) || 0) - calculateDiscount(formData.baseFee, formData.discount, formData.discountType),
            fee_plan: safeFeePlan,
            starting_month: parseInt(formData.startingMonth) || new Date().getMonth() + 1,
            status: 'active'
          }])
          .select()
          .single()

        if (insertError) throw insertError

        // Create student contacts if provided
        const contacts = []

        if (formData.fatherName && formData.fatherMobile) {
          contacts.push({
            user_id: userId,                // ✅ Add user_id
            student_id: insertedStudent.id,
            school_id: schoolId,
            contact_type: 'father',
            name: formData.fatherName,
            phone: formData.fatherMobile,
            alternate_phone: formData.whatsappNumber || null,
            email: formData.fatherEmail || null,
            occupation: formData.fatherOccupation || null,
            annual_income: parseFloat(formData.fatherAnnualIncome) || null,
            address: formData.currentAddress || null,
            city: formData.city || null,
            state: formData.state || null,
            postal_code: formData.postalCode || null,
            is_primary: true
          })
        }

        if (formData.motherName && formData.motherMobile) {
          contacts.push({
            user_id: userId,                // ✅ Add user_id
            student_id: insertedStudent.id,
            school_id: schoolId,
            contact_type: 'mother',
            name: formData.motherName,
            phone: formData.motherMobile,
            email: formData.motherEmail || null,
            occupation: formData.motherOccupation || null,
            annual_income: parseFloat(formData.motherAnnualIncome) || null,
            address: formData.currentAddress || null,
            city: formData.city || null,
            state: formData.state || null,
            postal_code: formData.postalCode || null,
            is_primary: false
          })
        }

        if (formData.guardianName && formData.guardianMobile) {
          contacts.push({
            user_id: userId,                // ✅ Add user_id
            student_id: insertedStudent.id,
            school_id: schoolId,
            contact_type: 'guardian',
            name: formData.guardianName,
            phone: formData.guardianMobile,
            email: formData.guardianEmail || null,
            address: formData.currentAddress || null,
            city: formData.city || null,
            state: formData.state || null,
            postal_code: formData.postalCode || null,
            is_primary: false
          })
        }

        if (contacts.length > 0) {
          await supabase.from('student_contacts').insert(contacts)
        }

        // Generate and create ONE fee challan with complete fee schedule
        if (formData.baseFee && formData.feePlan && formData.startingMonth) {
          const feeSchedule = generateFeeSchedule(
            formData.feePlan,
            parseInt(formData.startingMonth),
            formData.baseFee,
            formData.discount,
            formData.discountType
          )

          // Get current session
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('id')
            .eq('school_id', schoolId)
            .eq('is_current', true)
            .single()

          const sessionId = sessionData?.id || null

          // Calculate total amount for the year
          const totalYearlyAmount = feeSchedule.reduce((sum, item) => sum + item.amount, 0)
          const actualDiscount = calculateDiscount(formData.baseFee, formData.discount, formData.discountType)

          // Create ONE fee challan with complete schedule stored in fee_schedule JSON
          const challanNumber = `CH-${insertedStudent.admission_number}-${new Date().getFullYear()}`
          const challanToInsert = {
            user_id: userId,                // ✅ Add user_id
            school_id: schoolId,
            session_id: sessionId,
            student_id: insertedStudent.id,
            challan_number: challanNumber,
            fee_month: feeSchedule[0]?.months[0] || 'January', // Starting month
            fee_year: feeSchedule[0]?.year?.toString() || new Date().getFullYear().toString(),
            issue_date: new Date().toISOString().split('T')[0],
            due_date: feeSchedule[0]?.dueDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            total_amount: totalYearlyAmount,
            paid_amount: 0,
            status: 'pending',
            fee_plan: formData.feePlan,
            period_label: `${feeSchedule[0]?.period} - ${feeSchedule[feeSchedule.length - 1]?.period}`,
            base_fee: parseFloat(formData.baseFee) || 0,
            discount_amount: actualDiscount,
            discount_type: formData.discountType || 'fixed',
            fee_schedule: feeSchedule.map(item => ({
              period: item.period,
              months: item.months,
              amount: item.amount,
              dueDate: item.dueDate.toISOString().split('T')[0],
              year: item.year,
              status: 'pending'
            }))
          }

          const { error: challanError } = await supabase
            .from('fee_challans')
            .insert([challanToInsert])

          if (challanError) {
            console.error('Error creating fee challan:', challanError)
            // Don't throw - student is already created, just log the error
          }
        }

        // Add to state without reloading
        fetchStudents()

        showToast('Student created successfully with fee schedule!', 'success')
      }

      setShowRegisterSidebar(false)
      resetForm()
      setImageFile(null)
      setImagePreview(null)
    } catch (err) {
      showToast(err.message || 'Failed to save student', 'error')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
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
      const studentId = selectedStudent.id
      const studentName = selectedStudent.name

      // Close modal immediately
      setShowDeleteModal(false)
      setSelectedStudent(null)

      // Permanently delete from database
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (deleteError) throw deleteError

      // Update state without reloading
      setAdmissions(prev => prev.filter(adm => adm.id !== studentId))

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
      // Toggle between active and inactive
      const newStatus = student.status === 'active' ? 'inactive' : 'active'

      const { error: updateError } = await supabase
        .from('students')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', student.id)

      if (updateError) throw updateError

      // Update state without page reload
      setAdmissions(prev => prev.map(adm =>
        adm.id === student.id ? { ...adm, status: newStatus } : adm
      ))

      const statusText = newStatus === 'active' ? 'activated' : 'deactivated'
      showToast(`Student ${statusText} successfully!`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update student status', 'error')
      console.error('Toggle status error:', err)
    }
  }

  const handleEdit = async (student) => {
    // Open sidebar immediately without affecting page loading state
    setShowRegisterSidebar(true)
    setIsEditMode(true)

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

      // Set image preview if exists
      if (fullStudent.photo_url) {
        setImagePreview(null) // Don't set preview for existing URL, show the saved image
      }

      // Validate fee_plan from database
      const validFeePlans = ['monthly', 'quarterly', 'semi-annual', 'annual']
      const dbFeePlan = fullStudent.fee_plan
      const validatedDbFeePlan = validFeePlans.includes(dbFeePlan) ? dbFeePlan : 'monthly'

      setFormData({
        id: fullStudent.id,
        admissionNo: fullStudent.admission_number || '',
        class: fullStudent.current_class_id || '',
        section: fullStudent.current_section_id || '',
        admissionDate: fullStudent.admission_date || '',
        discount: fullStudent.discount_amount || '',
        baseFee: fullStudent.base_fee || '',
        discountNote: fullStudent.discount_note || '',
        photoUrl: fullStudent.photo_url || '',
        rollNumber: fullStudent.roll_number || '',
        house: fullStudent.house || '',
        selectFamily: '',
        fatherCnic: '',
        familyNo: '',
        studentName: `${fullStudent.first_name}${fullStudent.last_name ? ' ' + fullStudent.last_name : ''}`,
        fatherName: fullStudent.father_name || '',
        fatherMobile: '',
        fatherEmail: '',
        fatherQualification: '',
        fatherOccupation: '',
        fatherAnnualIncome: '',
        guardianMobile: '',
        whatsappNumber: fullStudent.whatsapp_number || '',
        category: '',
        dateOfBirth: fullStudent.date_of_birth || '',
        studentCnic: '',
        casteRace: fullStudent.caste || '',
        gender: fullStudent.gender || 'male',
        currentAddress: '',
        city: '',
        state: '',
        postalCode: '',
        motherName: fullStudent.mother_name || '',
        motherCnic: '',
        motherMobile: '',
        motherEmail: '',
        motherQualification: '',
        motherOccupation: '',
        motherAnnualIncome: '',
        guardianName: '',
        guardianRelation: '',
        guardianEmail: '',
        emergencyRelation: '',
        emergencyContactName: '',
        emergencyPhone: '',
        emergencyMobile: '',
        emergencyAddress: '',
        utmSource: '',
        admissionFormNo: '',
        registerSerialNo: '',
        previousClass: '',
        previousSchool: '',
        region: '',
        bloodGroup: fullStudent.blood_group || '',
        studentMobile: '',
        birthPlace: '',
        religion: fullStudent.religion || '',
        nationality: fullStudent.nationality || 'Pakistan',
        permanentAddress: '',
        medicalProblem: '',
        feePlan: validatedDbFeePlan,
        startingMonth: fullStudent.starting_month || new Date().getMonth() + 1,
        discountType: fullStudent.discount_type || 'fixed',
        discount: fullStudent.discount_value || fullStudent.discount_amount || ''
      })
    } catch (err) {
      setError(err.message || 'Failed to load student details')
      console.error('Edit error:', err)
      setShowRegisterSidebar(false)
      setIsEditMode(false)
    }
  }

  const handleView = async (student) => {
    try {
      // Fetch complete student data from Supabase
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

      // Fetch class and section details
      let className = 'N/A'
      let sectionName = 'N/A'
      let classFeePlan = null

      if (data.current_class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('class_name, fee_plan')
          .eq('id', data.current_class_id)
          .single()

        if (classData) {
          className = classData.class_name
          classFeePlan = classData.fee_plan
        }
      }

      if (data.current_section_id) {
        const { data: sectionData } = await supabase
          .from('sections')
          .select('section_name')
          .eq('id', data.current_section_id)
          .single()

        if (sectionData) sectionName = sectionData.section_name
      }

      // Set complete student data - use class fee_plan if available, otherwise student's fee_plan
      setSelectedStudent({
        ...data,
        className,
        sectionName,
        fee_plan: classFeePlan || data.fee_plan, // Prioritize class fee_plan
        avatar: data.gender === 'female' ? '👧' : (data.gender === 'male' ? '👦' : '🧑')
      })
      setShowViewModal(true)
    } catch (err) {
      console.error('Error in handleView:', err)
      showToast('An error occurred while loading student details', 'error')
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
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single()

      if (schoolError) {
        console.error('Error fetching school data:', schoolError)
      }

      console.log('School data fetched:', schoolData)
      console.log('School logo URL:', schoolData?.logo_url)

      // Create PDF with settings - respect user's orientation choice
      const orientation = pdfSettings.orientation || 'portrait'
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pdfSettings.pageSize?.toLowerCase() || 'a4'
      })

      console.log('PDF created with orientation:', orientation)

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

      // Helper to convert image URL to base64
      const convertToBase64 = async (url) => {
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch (error) {
          console.error('Error converting image:', error)
          return null
        }
      }

      const primaryRgb = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.primaryColor || '#1E3A8A')
      const secondaryRgb = hexToRgb(pdfSettings.secondaryColor || '#3B82F6')
      const textRgb = hexToRgb(pdfSettings.textColor || '#000000')

      console.log('Color settings:')
      console.log('  Primary RGB:', primaryRgb, 'from', pdfSettings.headerBackgroundColor || pdfSettings.primaryColor)
      console.log('  Secondary RGB:', secondaryRgb, 'from', pdfSettings.secondaryColor)
      console.log('  Text RGB:', textRgb, 'from', pdfSettings.textColor)
      console.log('  Table Header:', pdfSettings.tableHeaderColor)
      console.log('  Alt Row:', pdfSettings.alternateRowColor)

      // ============ MODERN HEADER WITH LOGO ============
      let yPos = 0
      const headerHeight = 35

      // Full width header background - SETTINGS COLOR
      const headerBgRgb = hexToRgb(pdfSettings.headerBackgroundColor || '#1E3A8A')
      doc.setFillColor(...headerBgRgb)
      doc.rect(0, yPos, pageWidth, headerHeight, 'F')

      // Add subtle accent line at bottom of header - SETTINGS PRIMARY COLOR
      doc.setDrawColor(...primaryRgb)
      doc.setLineWidth(0.8)
      doc.line(0, headerHeight, pageWidth, headerHeight)

      // Logo on the left side
      if (pdfSettings.includeLogo && schoolData?.logo_url) {
        try {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'

          const logoBase64 = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Logo load timeout')), 8000)

            logoImg.onload = () => {
              clearTimeout(timeout)
              try {
                const canvas = document.createElement('canvas')
                const logoSize = 28
                canvas.width = logoImg.width
                canvas.height = logoImg.height
                const ctx = canvas.getContext('2d')

                // Apply logo style from settings
                if (pdfSettings.logoStyle === 'circle') {
                  ctx.beginPath()
                  ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2)
                  ctx.closePath()
                  ctx.clip()
                } else if (pdfSettings.logoStyle === 'rounded') {
                  const radius = Math.min(canvas.width, canvas.height) * 0.1
                  ctx.beginPath()
                  ctx.moveTo(radius, 0)
                  ctx.lineTo(canvas.width - radius, 0)
                  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
                  ctx.lineTo(canvas.width, canvas.height - radius)
                  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
                  ctx.lineTo(radius, canvas.height)
                  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
                  ctx.lineTo(0, radius)
                  ctx.quadraticCurveTo(0, 0, radius, 0)
                  ctx.closePath()
                  ctx.clip()
                }

                ctx.drawImage(logoImg, 0, 0)
                resolve(canvas.toDataURL('image/png'))
              } catch (err) {
                reject(err)
              }
            }

            logoImg.onerror = () => {
              clearTimeout(timeout)
              reject(new Error('Failed to load logo'))
            }

            logoImg.src = schoolData.logo_url
          })

          if (logoBase64) {
            const logoSize = 28
            const logoX = margins.left + 5
            const logoY = yPos + 3.5

            // Add the logo image (already clipped in canvas)
            doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize)

            // Add white border around logo for modern look
            doc.setDrawColor(255, 255, 255)
            doc.setLineWidth(1.2)
            if (pdfSettings.logoStyle === 'circle') {
              doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'S')
            } else {
              doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, 'S')
            }
          }
        } catch (err) {
          console.error('Logo loading error:', err)
        }
      }

      // School name and title - centered layout
      const textStartX = pageWidth / 2

      // School name - white, centered, medium size, SETTINGS FONT
      if (pdfSettings.includeSchoolName && schoolData?.name) {
        doc.setFontSize(11)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(schoolData.name.toUpperCase(), textStartX, yPos + 12, { align: 'center' })
      }

      // Title text - white, centered, SETTINGS FONT
      doc.setFontSize(parseInt(pdfSettings.sectionTextSize || 14))
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('STUDENT INFORMATION RECORD', textStartX, yPos + 20, { align: 'center' })

      // Tagline if enabled - white, centered, smaller, SETTINGS FONT
      if (pdfSettings.includeTagline && schoolData?.tagline) {
        doc.setFontSize(7)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
        doc.setTextColor(240, 240, 240)
        doc.text(schoolData.tagline, textStartX, yPos + 26, { align: 'center' })
      }

      // Generated date - top right, white, small, SETTINGS FONT
      if (pdfSettings.includeGeneratedDate) {
        doc.setFontSize(7)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
        doc.setTextColor(240, 240, 240)
        const dateStr = `Generated: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`
        doc.text(dateStr, pageWidth - margins.right - 5, yPos + 10, { align: 'right' })
      }

      yPos = headerHeight + 4

      // ============ MODERN STUDENT CARD SECTION ============
      const cardHeight = 26
      const cardY = yPos

      // Card background with shadow effect - SETTINGS ALTERNATE ROW COLOR
      const cardBgRgb = hexToRgb(pdfSettings.alternateRowColor || '#F3F4F6')
      doc.setFillColor(...cardBgRgb)
      doc.roundedRect(margins.left, cardY, pageWidth - margins.left - margins.right, cardHeight, 3, 3, 'F')

      // Card border with rounded corners - SETTINGS TABLE HEADER COLOR & LINE WIDTH
      const borderRgb = hexToRgb(pdfSettings.tableHeaderColor || '#1E3A8A')
      doc.setDrawColor(...borderRgb)
      const borderWidth = getLineWidth(pdfSettings.lineWidth || 'thin')
      doc.setLineWidth(borderWidth)
      doc.roundedRect(margins.left, cardY, pageWidth - margins.left - margins.right, cardHeight, 3, 3, 'S')

      // Decorative accent bar on left - SETTINGS PRIMARY COLOR
      doc.setFillColor(...primaryRgb)
      doc.roundedRect(margins.left, cardY, 2, cardHeight, 1.5, 1.5, 'F')

      // Student Photo with modern circular style
      const photoSize = 22
      const photoX = margins.left + 5
      const photoY = cardY + 2

      if (selectedStudent.photo_url) {
        try {
          console.log('Loading student photo from:', selectedStudent.photo_url)

          // Better image loading with canvas - clip to circle
          const img = new Image()
          img.crossOrigin = 'anonymous'

          const photoBase64 = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Image load timeout')), 10000)

            img.onload = () => {
              clearTimeout(timeout)
              try {
                const canvas = document.createElement('canvas')
                const size = Math.min(img.width, img.height)
                canvas.width = size
                canvas.height = size
                const ctx = canvas.getContext('2d')

                // Create circular clipping path
                ctx.beginPath()
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()

                // Draw image centered
                const offsetX = (img.width - size) / 2
                const offsetY = (img.height - size) / 2
                ctx.drawImage(img, -offsetX, -offsetY, img.width, img.height)

                const dataUrl = canvas.toDataURL('image/png', 0.9)
                console.log('Photo converted successfully, size:', dataUrl.length)
                resolve(dataUrl)
              } catch (err) {
                console.error('Canvas error:', err)
                reject(err)
              }
            }

            img.onerror = (err) => {
              clearTimeout(timeout)
              console.error('Image load failed:', err)
              reject(err)
            }

            // Handle both absolute and relative URLs
            const photoUrl = selectedStudent.photo_url.startsWith('http')
              ? selectedStudent.photo_url
              : `${window.location.origin}${selectedStudent.photo_url.startsWith('/') ? '' : '/'}${selectedStudent.photo_url}`

            console.log('Final photo URL:', photoUrl)
            img.src = photoUrl
          })

          if (photoBase64 && photoBase64.length > 100) {
            // Add circular photo
            doc.addImage(photoBase64, 'PNG', photoX, photoY, photoSize, photoSize)
            console.log('Student photo added to PDF successfully')

            // Modern circular photo border with primary color
            doc.setDrawColor(...primaryRgb)
            doc.setLineWidth(1)
            doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'S')
          } else {
            throw new Error('Invalid photo data')
          }
        } catch (e) {
          console.error('❌ Error loading student photo:', e.message)
          console.error('Photo URL was:', selectedStudent.photo_url)
          console.error('Full error:', e)
          // Fallback to modern circular avatar placeholder
          doc.setFillColor(226, 232, 240)
          doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'F')
          doc.setDrawColor(...primaryRgb)
          doc.setLineWidth(1)
          doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'S')
          doc.setFontSize(14)
          doc.setTextColor(...textRgb)
          doc.text(selectedStudent.avatar || '👤', photoX + photoSize/2, photoY + photoSize/2 + 3, { align: 'center' })
        }
      } else {
        console.log('⚠️ No photo URL for student:', selectedStudent.first_name)
        console.log('Student object:', selectedStudent)
        // Modern circular photo placeholder
        doc.setFillColor(226, 232, 240)
        doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'F')
        doc.setDrawColor(...primaryRgb)
        doc.setLineWidth(1)
        doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'S')
        doc.setFontSize(14)
        doc.setTextColor(...textRgb)
        doc.text(selectedStudent.avatar || '👤', photoX + photoSize/2, photoY + photoSize/2 + 3, { align: 'center' })
      }

      // Student info next to photo with modern layout
      const infoX = photoX + photoSize + 6

      // Student Name - SETTINGS PRIMARY COLOR & FONT (larger, more prominent)
      doc.setFontSize(13)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
      doc.setTextColor(...primaryRgb)
      doc.text(`${selectedStudent.first_name} ${selectedStudent.last_name || ''}`, infoX, cardY + 9)

      // Admission Number - SETTINGS TEXT COLOR & FONT with icon-like label
      doc.setFontSize(7.5)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      doc.text('ID:', infoX, cardY + 15)
      doc.setTextColor(...textRgb)
      doc.text(selectedStudent.admission_number, infoX + 6, cardY + 15)

      // Class info with modern styling - SETTINGS TEXT COLOR & FONT
      doc.setTextColor(120, 120, 120)
      doc.text('Class:', infoX, cardY + 20)
      doc.setTextColor(...textRgb)
      doc.text(`${selectedStudent.className || 'N/A'}`, infoX + 11, cardY + 20)

      doc.setTextColor(120, 120, 120)
      doc.text('Section:', infoX + 30, cardY + 20)
      doc.setTextColor(...textRgb)
      doc.text(`${selectedStudent.sectionName || 'N/A'}`, infoX + 43, cardY + 20)

      // Modern status badge - top right with better styling
      const status = selectedStudent.status || 'active'
      const statusBgColor = status === 'active' ? [34, 197, 94] : status === 'inactive' ? [239, 68, 68] : [156, 163, 175]
      doc.setFillColor(...statusBgColor)
      doc.roundedRect(pageWidth - margins.right - 28, cardY + 5, 26, 7, 3, 3, 'F')
      doc.setFontSize(7.5)
      doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(status.toUpperCase(), pageWidth - margins.right - 15, cardY + 9.5, { align: 'center' })

      yPos = cardY + cardHeight + 3

      // Helper function for COMPACT section headers with professional styling
      const addSectionHeader = (title) => {
        // Reserve space for footer
        const footerReservedSpace = 20
        const maxContentY = pageHeight - footerReservedSpace

        // Check if we need a new page for the section header
        if (yPos + 10 > maxContentY) {
          doc.addPage()
          yPos = margins.top || 15
        }

        // Blue gradient-like header - REDUCED HEIGHT
        const tableHeaderRgb = hexToRgb(pdfSettings.tableHeaderColor || pdfSettings.secondaryColor || '#3B82F6')
        doc.setFillColor(...tableHeaderRgb)
        doc.roundedRect(margins.left, yPos, pageWidth - margins.left - margins.right, 6, 1, 1, 'F')

        doc.setFontSize(parseInt(pdfSettings.fontSize || '10') - 1)
        doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(title, margins.left + 3, yPos + 4)
        yPos += 7.5
      }

      // Helper function for responsive multi-column fields - adapts to orientation
      const addTwoColumnFields = (fields) => {
        // Use 3 columns for landscape, 2 for portrait
        const numColumns = orientation === 'landscape' ? 3 : 2
        const gapSize = 2
        const totalGaps = (numColumns - 1) * gapSize
        const colWidth = (pageWidth - margins.left - margins.right - totalGaps) / numColumns

        let col = 0
        let rowY = yPos

        // Professional color scheme
        const fieldBgRgb = [249, 250, 251] // Very light gray
        const labelColorRgb = [107, 114, 128] // Gray-500
        const borderRgb = [229, 231, 235] // Gray-200

        // Reserve space for footer (footer area starts at pageHeight - 20)
        const footerReservedSpace = 20
        const maxContentY = pageHeight - footerReservedSpace

        // COMPACT field height
        const fieldHeight = 7.5

        fields.forEach(([label, value]) => {
          if (value && value !== 'N/A' && value !== null && value !== undefined && value !== '') {
            // Check if we need a new page
            if (rowY + 10 > maxContentY) {
              doc.addPage()
              rowY = margins.top || 15
              col = 0
            }

            const xPos = margins.left + (col * (colWidth + gapSize))

            // Card background with subtle shadow effect
            doc.setFillColor(...fieldBgRgb)
            doc.roundedRect(xPos, rowY, colWidth, fieldHeight, 1, 1, 'F')

            // Subtle border for definition
            doc.setDrawColor(...borderRgb)
            doc.setLineWidth(0.2)
            doc.roundedRect(xPos, rowY, colWidth, fieldHeight, 1, 1, 'S')

            // Label - small gray uppercase
            doc.setFontSize(5.5)
            doc.setFont(pdfSettings.fontFamily || 'helvetica', 'normal')
            doc.setTextColor(...labelColorRgb)
            doc.text(label.toUpperCase(), xPos + 1.5, rowY + 3)

            // Value - larger and bold with proper text fitting
            doc.setFontSize(7.5)
            doc.setFont(pdfSettings.fontFamily || 'helvetica', 'bold')
            doc.setTextColor(31, 41, 55) // Gray-800

            // Smart truncation based on column width
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
      ['Caste', selectedStudent.caste_race],
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
        ['Status', selectedStudent.status]
      ])

      yPos += orientation === 'landscape' ? 1.5 : 2

      // Father Information
      if (selectedStudent.father_name) {
        addSectionHeader('FATHER INFORMATION')
        addTwoColumnFields([
          ['Father Name', selectedStudent.father_name],
          ['Father CNIC', selectedStudent.father_cnic],
          ['Mobile', selectedStudent.father_mobile],
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
          ['Mobile', selectedStudent.mother_mobile],
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

      // Footer (using centralized footer function)
      addPDFFooter(doc, pdfSettings)

      // Save the PDF
      doc.save(`Student_${selectedStudent.admission_number}_${selectedStudent.first_name}.pdf`)

      // Close the modal
      setShowViewModal(false)

      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to generate PDF. Please try again.', 'error')
    }
  }

  const handleImportClassSelect = (classId, className) => {
    setImportData({
      ...importData,
      classId,
      className,
      sectionId: '',
      sectionName: ''
    })
    setClassSearchTerm(className)
    setShowClassDropdown(false)
    fetchSections(classId)
  }

  const handleImportSectionSelect = (sectionId, sectionName) => {
    setImportData({
      ...importData,
      sectionId,
      sectionName
    })
    setSectionSearchTerm(sectionName)
    setShowSectionDropdown(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
      const isValid = validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

      if (isValid) {
        setSelectedFile(file)
        setError(null)
      } else {
        setError('Please select a valid CSV or Excel file')
        setSelectedFile(null)
        e.target.value = null
      }
    }
  }

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const students = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const student = {}

      headers.forEach((header, index) => {
        student[header] = values[index] || ''
      })

      students.push(student)
    }

    return students
  }

  const handleBulkImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import')
      return
    }

    if (!importData.classId) {
      setError('Please select a class')
      return
    }

    setImporting(true)
    setError(null)
    setSuccess(null)

    try {
      // Read file
      const text = await selectedFile.text()
      const parsedStudents = parseCSV(text)

      if (parsedStudents.length === 0) {
        throw new Error('No valid student data found in file')
      }

      // Fetch school_id
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('id', currentUser.school_id)
        .single()

      if (schoolError) {
        throw new Error('Unable to fetch school information')
      }

      const schoolId = schools?.id

      // Get the selected class to fetch base fee
      const selectedClass = classes.find(c => c.id === importData.classId)
      const classBaseFee = parseFloat(selectedClass?.standard_fee || 0)

      // Prepare bulk insert data
      const studentsToInsert = []
      const contactsToInsert = []
      const errors = []

      parsedStudents.forEach((student, index) => {
        const rowNum = index + 2 // +2 because index starts at 0 and row 1 is headers

        // Validate mandatory fields - support multiple column name formats
        const admissionNo = student['admission number'] ||
                           student['admission_number'] ||
                           student['admissionno'] ||
                           student['admission/cnic no'] ||
                           student['admission no'] ||
                           student['gr no'] ||
                           student['gr number'] || ''

        const studentName = student['student name'] ||
                           student['studentname'] ||
                           student['name'] || ''

        const fatherName = student['father name'] ||
                          student['fathername'] || ''

        if (!admissionNo) {
          errors.push(`Row ${rowNum}: Missing admission number`)
          return
        }

        if (!studentName) {
          errors.push(`Row ${rowNum}: Missing student name`)
          return
        }

        if (!fatherName) {
          errors.push(`Row ${rowNum}: Missing father name`)
          return
        }

        // Extract data with multiple possible column name formats
        const motherName = student['mother name'] || student['mothername'] || ''
        const dateOfBirth = student['date of birth'] ||
                           student['dob'] ||
                           student['dateofbirth'] ||
                           student['birth date'] || null
        const gender = (student['gender'] || 'male').toLowerCase()
        const fatherMobile = student['father mobile'] ||
                            student['fathermobile'] ||
                            student['mobile'] ||
                            student['father phone'] ||
                            student['contact'] || ''
        const motherMobile = student['mother mobile'] ||
                            student['mothermobile'] ||
                            student['mother phone'] || ''
        const bloodGroup = student['blood group'] || student['bloodgroup'] || ''
        const religion = student['religion'] || ''
        const address = student['address'] ||
                       student['current address'] ||
                       student['currentaddress'] || ''
        // Use class base fee instead of reading from CSV
        const baseFee = classBaseFee
        const discount = parseFloat(student['discount'] || 0)

        // Split student name
        const nameParts = studentName.trim().split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || null

        // Determine status based on category
        let studentStatus = 'active'
        if (importData.category === 'Old Student') {
          studentStatus = 'inactive'
        } else if (importData.category === 'Orphan Student') {
          studentStatus = 'active' // Orphan students are still active
        }

        const studentData = {
          school_id: schoolId,
          admission_number: admissionNo,
          first_name: firstName,
          last_name: lastName,
          father_name: fatherName,
          mother_name: motherName || null,
          date_of_birth: dateOfBirth,
          gender: gender,
          blood_group: bloodGroup || null,
          religion: religion || null,
          nationality: 'Pakistan',
          admission_date: new Date().toISOString().split('T')[0],
          current_class_id: importData.classId,
          current_section_id: importData.sectionId || null,
          base_fee: baseFee,
          discount_amount: discount,
          final_fee: baseFee - discount,
          status: studentStatus
        }

        studentsToInsert.push(studentData)

        // Prepare contact data (will be inserted after students)
        if (fatherName && fatherMobile) {
          contactsToInsert.push({
            contact_type: 'father',
            name: fatherName,
            phone: fatherMobile,
            address: address || null,
            is_primary: true
          })
        } else {
          contactsToInsert.push(null)
        }

        if (motherName && motherMobile) {
          contactsToInsert.push({
            contact_type: 'mother',
            name: motherName,
            phone: motherMobile,
            address: address || null,
            is_primary: false
          })
        } else {
          contactsToInsert.push(null)
        }
      })

      if (errors.length > 0) {
        throw new Error(`Validation errors:\n${errors.join('\n')}`)
      }

      if (studentsToInsert.length === 0) {
        throw new Error('No valid students to import')
      }

      // Insert students in bulk
      const { data: insertedStudents, error: insertError } = await supabase
        .from('students')
        .insert(studentsToInsert)
        .select()

      if (insertError) throw insertError

      // Insert contacts
      const contactsWithStudentIds = []
      insertedStudents.forEach((student, index) => {
        const fatherContact = contactsToInsert[index * 2]
        const motherContact = contactsToInsert[index * 2 + 1]

        if (fatherContact) {
          contactsWithStudentIds.push({
            ...fatherContact,
            student_id: student.id,
            school_id: schoolId
          })
        }

        if (motherContact) {
          contactsWithStudentIds.push({
            ...motherContact,
            student_id: student.id,
            school_id: schoolId
          })
        }
      })

      if (contactsWithStudentIds.length > 0) {
        const { error: contactError } = await supabase.from('student_contacts').insert(contactsWithStudentIds)
        if (contactError) {
          console.error('Error inserting contacts:', contactError)
        }
      }

      setSuccess(`Successfully imported ${insertedStudents.length} students!`)
      setSelectedFile(null)
      setImportData({
        classId: '',
        className: '',
        sectionId: '',
        sectionName: '',
        category: 'Active Student'
      })
      setClassSearchTerm('')
      setSectionSearchTerm('')

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = null

      fetchStudents() // Refresh the list

      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('Import error:', err)
      setError(err.message || 'Failed to import students')
    } finally {
      setImporting(false)
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

      {/* Top Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab('register')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'register'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FileText size={20} />
          Admission Register
        </button>

        <button
          onClick={handleRegisterNewStudent}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all bg-white text-gray-700 hover:bg-gray-100"
        >
          <UserPlus size={20} />
          Register New Student
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'import'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Upload size={20} />
          Import Students
        </button>
      </div>

      {/* Main Content - Admission Register */}
      {activeTab === 'register' && (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Admission Register</h2>

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
          <div className="md:col-span-3">
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-9">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, father name, or admission number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-sm text-gray-600 mb-3">
          There are <span className="text-red-600 font-bold">{admissions.length}</span> admissions saved in the system.
        </p>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={40} className="animate-spin text-red-600" />
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-3 py-2.5 text-left text-sm font-semibold border border-blue-800">Sr.</th>
                  <th className="px-3 py-2.5 text-left text-sm font-semibold border border-blue-800">Session</th>
                  <th className="px-3 py-2.5 text-left text-sm font-semibold border border-blue-800">Class</th>
                  <th className="px-3 py-2.5 text-left text-sm font-semibold border border-blue-800">Student Name</th>
                  <th className="px-3 py-2.5 text-left text-sm font-semibold border border-blue-800">Father Name</th>
                  <th className="px-3 py-2.5 text-left text-sm font-semibold border border-blue-800">Adm.No</th>
                  <th className="px-3 py-2.5 text-left text-sm font-semibold border border-blue-800">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmissions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-6 text-center text-sm text-gray-500">
                      No students found. Click "Register New Student" to add one.
                    </td>
                  </tr>
                ) : (
                  paginatedAdmissions.map((admission, index) => (
                    <tr
                      key={admission.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-3 py-2.5 border border-gray-200 text-sm">{startIndex + index + 1}</td>
                      <td className="px-3 py-2.5 border border-gray-200 text-sm">{admission.session}</td>
                      <td className="px-3 py-2.5 border border-gray-200 text-sm">{getClassName(admission.class)}</td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {admission.photo_url ? (
                              <img src={admission.photo_url} alt={admission.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{admission.avatar}</span>
                            )}
                          </div>
                          <span className="text-blue-600 text-sm font-medium hover:underline cursor-pointer">
                            {admission.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200 text-sm">{admission.father}</td>
                      <td className="px-3 py-2.5 border border-gray-200 text-sm">{admission.admNo}</td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(admission)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(admission)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(admission)}
                            className={`p-1.5 rounded-lg transition ${
                              admission.status === 'active'
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            title={admission.status === 'active' ? 'Deactivate Student' : 'Activate Student'}
                          >
                            {admission.status === 'active' ? (
                              <ToggleRight size={16} />
                            ) : (
                              <ToggleLeft size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(admission)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredAdmissions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
              <div className="text-xs text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAdmissions.length)} of {filteredAdmissions.length} entries
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
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
                          className={`w-8 h-8 text-sm font-medium rounded-lg transition ${
                            currentPage === i
                              ? 'bg-blue-800 text-white'
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
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Import Students Section */}
      {activeTab === 'import' && (
        <div className="mt-6">
          <div
            onClick={() => setImportExpanded(!importExpanded)}
            className="text-white px-6 py-4 rounded-t-xl flex justify-between items-center cursor-pointer"
            style={{ backgroundColor: '#1E3A8A' }}
          >
            <h3 className="font-semibold">Import Bulk Students</h3>
            {importExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {importExpanded && (
            <div className="bg-white p-6 border-x border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Class Selection with Search */}
                <div className="relative">
                  <label className="block text-gray-700 font-semibold text-sm mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search and select class..."
                      value={classSearchTerm}
                      onChange={(e) => setClassSearchTerm(e.target.value)}
                      onFocus={() => setShowClassDropdown(true)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                  {showClassDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowClassDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loadingClasses ? (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            <Loader2 size={20} className="animate-spin inline-block" />
                            <span className="ml-2">Loading classes...</span>
                          </div>
                        ) : classes.filter(cls =>
                          cls.class_name.toLowerCase().includes(classSearchTerm.toLowerCase())
                        ).length > 0 ? (
                          classes
                            .filter(cls => cls.class_name.toLowerCase().includes(classSearchTerm.toLowerCase()))
                            .map(cls => (
                              <div
                                key={cls.id}
                                onClick={() => handleImportClassSelect(cls.id, cls.class_name)}
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-800">{cls.class_name}</div>
                                {cls.standard_fee && (
                                  <div className="text-sm text-gray-500">Standard Fee: {cls.standard_fee}</div>
                                )}
                              </div>
                            ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            No classes found
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {importData.className && (
                    <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center justify-between">
                      <span>Selected: <strong>{importData.className}</strong></span>
                      <button
                        onClick={() => {
                          setImportData({ ...importData, classId: '', className: '', sectionId: '', sectionName: '' })
                          setClassSearchTerm('')
                          setSections([])
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-gray-700 font-semibold text-sm mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={importData.category}
                    onChange={(e) => setImportData({ ...importData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Active Student">Active Student</option>
                    <option value="Old Student">Old Student</option>
                    <option value="Orphan Student">Orphan Student</option>
                  </select>
                </div>

                {/* Section Selection with Search - Only show if class is selected */}
                {importData.classId && (
                  <div className="relative">
                    <label className="block text-gray-700 font-semibold text-sm mb-2">
                      Section (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search and select section..."
                        value={sectionSearchTerm}
                        onChange={(e) => setSectionSearchTerm(e.target.value)}
                        onFocus={() => setShowSectionDropdown(true)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                    {showSectionDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowSectionDropdown(false)}
                        />
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {loadingSections ? (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              <Loader2 size={20} className="animate-spin inline-block" />
                              <span className="ml-2">Loading sections...</span>
                            </div>
                          ) : sections.filter(sec =>
                            sec.section_name.toLowerCase().includes(sectionSearchTerm.toLowerCase())
                          ).length > 0 ? (
                            sections
                              .filter(sec => sec.section_name.toLowerCase().includes(sectionSearchTerm.toLowerCase()))
                              .map(sec => (
                                <div
                                  key={sec.id}
                                  onClick={() => handleImportSectionSelect(sec.id, sec.section_name)}
                                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-800">{sec.section_name}</div>
                                </div>
                              ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              No sections found for this class
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {importData.sectionName && (
                      <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center justify-between">
                        <span>Selected: <strong>{importData.sectionName}</strong></span>
                        <button
                          onClick={() => {
                            setImportData({ ...importData, sectionId: '', sectionName: '' })
                            setSectionSearchTerm('')
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload size={20} className="text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">UPLOAD CSV/EXCEL FILE</span>
                  </div>
                  <p className="text-xs text-gray-500 italic mb-3">Select CSV or Excel file (.csv, .xlsx, .xls)</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {selectedFile && (
                    <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                      <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </div>
                  )}
                </div>
              </div>

              {/* CSV Format Information */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle size={18} />
                  CSV File Format Requirements
                </h4>
                <div className="text-sm text-blue-800">
                  <p className="mb-2"><strong>Mandatory columns (any format accepted):</strong></p>
                  <ul className="list-disc list-inside mb-3 ml-2 text-xs">
                    <li><strong>Admission Number:</strong> "Admission/CNIC No", "Admission Number", "Admission No", "GR No", etc.</li>
                    <li><strong>Student Name:</strong> "Student Name", "Name", etc.</li>
                    <li><strong>Father Name:</strong> "Father Name", etc.</li>
                  </ul>
                  <p className="mb-2"><strong>Optional columns:</strong></p>
                  <ul className="list-disc list-inside ml-2 text-xs">
                    <li>Mother Name, Date of Birth (or DOB, Birth Date), Gender</li>
                    <li>Father Mobile (or Contact, Mobile), Mother Mobile, Blood Group</li>
                    <li>Religion, Address (or Current Address), Fee, Discount</li>
                  </ul>
                  <p className="mt-3 text-xs italic">
                    <strong>Example 1:</strong> Admission/CNIC No,Student Name,Father Name,Date Of Birth,Current Address<br/>
                    <strong>Example 2:</strong> admission number,student name,father name,mother name,gender,dob,father mobile,fee
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-b-xl border border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => {
                setImportData({
                  classId: '',
                  className: '',
                  sectionId: '',
                  sectionName: '',
                  category: 'Active Student'
                })
                setClassSearchTerm('')
                setSectionSearchTerm('')
                setSelectedFile(null)
                const fileInput = document.querySelector('input[type="file"]')
                if (fileInput) fileInput.value = null
              }}
              className="px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
            >
              Clear All
            </button>
            <button
              onClick={handleBulkImport}
              disabled={importing || !importData.classId || !selectedFile}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Import Students
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Register New Student Sidebar */}
      {showRegisterSidebar && (
        <ModalOverlay onClose={() => !saving && setShowRegisterSidebar(false)} disabled={saving}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{isEditMode ? 'Edit Student' : 'Register New Student'}</h3>
                  <p className="text-blue-200 text-sm mt-1">{isEditMode ? 'Update student details' : 'Fill in the student details'}</p>
                </div>
                <button
                  onClick={() => !saving && setShowRegisterSidebar(false)}
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
                <h4 className="text-sm font-bold text-green-600 mb-4 flex items-center gap-2">
                  <FileText size={16} />
                  ACADEMIC DATA
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Admission/GR No <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.admissionNo}
                        onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none bg-white ${
                          admissionNoExists
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        required
                      />
                      {checkingAdmissionNo && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 size={16} className="animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {admissionNoExists && (
                      <p className="text-red-500 text-xs mt-1">This admission number already exists</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.class}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      disabled={loadingClasses}
                      required
                    >
                      <option value="">
                        {loadingClasses ? 'Loading classes...' : 'Select Class'}
                      </option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.class_name} {cls.standard_fee ? `- Fee: ${cls.standard_fee}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.section}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      disabled={loadingSections || !formData.class}
                      required
                    >
                      <option value="">
                        {loadingSections ? 'Loading sections...' : formData.class ? 'Select Section' : 'Select Class First'}
                      </option>
                      {sections.map((sec) => {
                        const isFull = (sec.current_count || 0) >= (sec.capacity || 0)
                        return (
                          <option key={sec.id} value={sec.id} disabled={isFull && !isEditMode}>
                            {sec.section_name} - {sec.current_count || 0}/{sec.capacity || 0} {isFull ? '(Full)' : ''}
                          </option>
                        )
                      })}
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
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Roll Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Roll Number"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Father WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter WhatsApp Number"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Base Fee <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.baseFee}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Fee Plan (Mode) <span className="text-red-500">*</span> <span className="text-blue-600">(From Class)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.feePlan ? formData.feePlan.charAt(0).toUpperCase() + formData.feePlan.slice(1) : 'Monthly'}
                      readOnly
                      required
                      className="w-full px-4 py-3 border border-blue-200 bg-blue-50 rounded-lg font-semibold text-blue-800 capitalize outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Starting Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.startingMonth}
                      onChange={(e) => setFormData({ ...formData, startingMonth: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>
                </div>

                {/* Discount Section */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Discount Type</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="fixed">Fixed Amount (Rs.)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      {formData.discountType === 'percentage' ? 'Discount (%)' : 'Discount (Rs.)'}
                    </label>
                    <input
                      type="number"
                      placeholder={formData.discountType === 'percentage' ? 'e.g., 10' : '0.00'}
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

                {/* Calculated Discount Display */}
                {formData.baseFee && formData.discount && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Base Fee:</span>
                      <span className="font-medium">Rs. {parseFloat(formData.baseFee).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">
                        - Rs. {formData.discountType === 'percentage'
                          ? Math.round((parseFloat(formData.baseFee) * parseFloat(formData.discount)) / 100).toLocaleString()
                          : parseFloat(formData.discount).toLocaleString()
                        }
                        {formData.discountType === 'percentage' && ` (${formData.discount}%)`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1 pt-1 border-t border-green-300">
                      <span className="text-gray-800 font-semibold">Final Fee:</span>
                      <span className="font-bold text-green-700">
                        Rs. {formData.discountType === 'percentage'
                          ? (parseFloat(formData.baseFee) - Math.round((parseFloat(formData.baseFee) * parseFloat(formData.discount)) / 100)).toLocaleString()
                          : (parseFloat(formData.baseFee) - parseFloat(formData.discount)).toLocaleString()
                        }
                      </span>
                    </div>
                  </div>
                )}

              </div>

              {/* Student & Father Information */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-600 mb-4 flex items-center gap-2">
                  <UserPlus size={16} />
                  STUDENT & FATHER INFORMATION
                </h4>
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
                    <label className="block text-gray-700 text-sm mb-2">
                      Student Photo
                    </label>
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
                    <label className="block text-gray-700 text-sm mb-2">Date Of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
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
                  onClick={() => setShowRegisterSidebar(false)}
                  disabled={saving}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStudent}
                  disabled={saving || !formData.studentName || !formData.fatherName || !formData.admissionNo || admissionNoExists}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {isEditMode ? 'Update' : 'Save'}
                      <Plus size={18} />
                    </>
                  )}
                </button>
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
                    {selectedStudent.student_cnic && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Student CNIC/B-Form</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.student_cnic}</p>
                      </div>
                    )}
                    {selectedStudent.caste_race && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Caste/Race</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.caste_race}</p>
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
                    {selectedStudent.house && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">House</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.house}</p>
                      </div>
                    )}
                    {selectedStudent.category && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Category</p>
                        <p className="font-semibold text-gray-800">{selectedStudent.category}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Father Information */}
                {(selectedStudent.father_name || selectedStudent.father_cnic || selectedStudent.father_mobile || selectedStudent.father_email || selectedStudent.father_qualification || selectedStudent.father_occupation || selectedStudent.father_annual_income) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Father Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Father Annual Income</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.father_annual_income}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mother Information */}
                {(selectedStudent.mother_name || selectedStudent.mother_cnic || selectedStudent.mother_mobile || selectedStudent.mother_email || selectedStudent.mother_qualification || selectedStudent.mother_occupation || selectedStudent.mother_annual_income) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Mother Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Mother Annual Income</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.mother_annual_income}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {(selectedStudent.whatsapp_number || selectedStudent.guardian_mobile || selectedStudent.current_address || selectedStudent.city || selectedStudent.state || selectedStudent.postal_code) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Contact Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.whatsapp_number && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">WhatsApp Number</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.whatsapp_number}</p>
                        </div>
                      )}
                      {selectedStudent.guardian_mobile && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Guardian Mobile</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.guardian_mobile}</p>
                        </div>
                      )}
                      {selectedStudent.current_address && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
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

                {/* Guardian Information */}
                {(selectedStudent.guardian_name || selectedStudent.guardian_email || selectedStudent.guardian_relation) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Guardian Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.guardian_name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Guardian Name</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.guardian_name}</p>
                        </div>
                      )}
                      {selectedStudent.guardian_relation && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Guardian Relation</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.guardian_relation}</p>
                        </div>
                      )}
                      {selectedStudent.guardian_email && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Guardian Email</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.guardian_email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {(selectedStudent.emergency_contact_name || selectedStudent.emergency_contact_number || selectedStudent.emergency_relation) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Emergency Contact</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.emergency_contact_name && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Contact Name</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.emergency_contact_name}</p>
                        </div>
                      )}
                      {selectedStudent.emergency_contact_number && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.emergency_contact_number}</p>
                        </div>
                      )}
                      {selectedStudent.emergency_relation && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Relation</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.emergency_relation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fee Information */}
                {(selectedStudent.base_fee || selectedStudent.discount_amount || selectedStudent.final_fee || selectedStudent.fee_plan || selectedStudent.discount_note) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Fee Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.base_fee && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                          <p className="font-semibold text-gray-800">Rs. {parseFloat(selectedStudent.base_fee).toLocaleString()}</p>
                        </div>
                      )}
                      {(selectedStudent.discount_amount || selectedStudent.discount_value) && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Discount ({selectedStudent.discount_type === 'percentage' ? '%' : 'Fixed'})</p>
                          <p className="font-semibold text-red-600">
                            {selectedStudent.discount_type === 'percentage'
                              ? `${selectedStudent.discount_value}% (Rs. ${parseFloat(selectedStudent.discount_amount || 0).toLocaleString()})`
                              : `Rs. ${parseFloat(selectedStudent.discount_amount || selectedStudent.discount_value || 0).toLocaleString()}`
                            }
                          </p>
                        </div>
                      )}
                      {selectedStudent.final_fee !== undefined && (
                        <div className="bg-green-50 p-3 rounded-lg border-2 border-green-200">
                          <p className="text-xs text-gray-500 mb-1">Final Fee</p>
                          <p className="font-bold text-green-700 text-lg">Rs. {parseFloat(selectedStudent.final_fee || 0).toLocaleString()}</p>
                        </div>
                      )}
                      {selectedStudent.fee_plan && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Fee Plan</p>
                          <p className="font-semibold text-blue-800 capitalize">{selectedStudent.fee_plan}</p>
                        </div>
                      )}
                      {selectedStudent.discount_note && (
                        <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Discount Note</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.discount_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {(selectedStudent.family_number || selectedStudent.select_family) && (
                  <div className="mb-6">
                    <h5 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Family Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.family_number && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Family Number</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.family_number}</p>
                        </div>
                      )}
                      {selectedStudent.select_family && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Select Family</p>
                          <p className="font-semibold text-gray-800">{selectedStudent.select_family}</p>
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
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      handleEdit({
                        id: selectedStudent.id,
                        admNo: selectedStudent.admission_number,
                        name: `${selectedStudent.first_name} ${selectedStudent.last_name || ''}`,
                        father: selectedStudent.father_name,
                        class: selectedStudent.current_class_id,
                        session: '2024-2025',
                        gender: selectedStudent.gender,
                        avatar: selectedStudent.avatar
                      })
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
        </ModalOverlay>
      )}
    </div>
  )
}
