'use client'

import { useState, useEffect } from 'react'
import { FileText, UserPlus, Upload, Search, Eye, Edit2, Trash2, X, Plus, ChevronDown, ChevronUp, Image, Loader2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

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

export default function AdmissionRegisterPage() {
  const [activeTab, setActiveTab] = useState('register')
  const [searchTerm, setSearchTerm] = useState('')
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
    medicalProblem: ''
  })

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

  // Prevent body scroll when any popup is open
  useEffect(() => {
    if (showRegisterSidebar || showDeleteModal || showViewModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to ensure scroll is re-enabled when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showRegisterSidebar, showDeleteModal, showViewModal])

  const fetchStudents = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('students')
        .select('*')
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
      // Don't show error if sections table doesn't exist yet
      setSections([])
    } finally {
      setLoadingSections(false)
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

  const getClassName = (classId) => {
    const classObj = classes.find(c => c.id === classId)
    return classObj?.class_name || classId || 'N/A'
  }

  const filteredAdmissions = admissions.filter(adm => {
    const matchesSearch = adm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.father.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.admNo.toString().includes(searchTerm)

    const matchesClass = !selectedOption || adm.class === selectedOption

    return matchesSearch && matchesClass
  })

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
      medicalProblem: ''
    })
    setIsEditMode(false)
    setShowOtherDetails(false)
    setSections([])
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
      // Split student name
      const nameParts = formData.studentName.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || null

      // Fetch the first school_id if we're creating a new student
      let schoolId = null
      if (!isEditMode) {
        const { data: schools, error: schoolError } = await supabase
          .from('schools')
          .select('id')
          .limit(1)
          .single()

        if (schoolError) {
          throw new Error('Unable to fetch school information. Please ensure schools table has data.')
        }

        schoolId = schools?.id
      }

      if (isEditMode) {
        // Update existing student
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
            religion: formData.religion || null,
            caste: formData.casteRace || null,
            nationality: formData.nationality || 'Pakistan',
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

        setSuccess('Student updated successfully!')
      } else {
        // Create new student
        const { data: insertedStudent, error: insertError } = await supabase
          .from('students')
          .insert([{
            school_id: schoolId,
            admission_number: formData.admissionNo,
            first_name: firstName,
            last_name: lastName,
            father_name: formData.fatherName,
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
            base_fee: parseFloat(formData.baseFee) || 0,
            discount_amount: parseFloat(formData.discount) || 0,
            discount_note: formData.discountNote || null,
            final_fee: (parseFloat(formData.baseFee) || 0) - (parseFloat(formData.discount) || 0),
            status: 'active'
          }])
          .select()
          .single()

        if (insertError) throw insertError

        // Create student contacts if provided
        const contacts = []

        if (formData.fatherName && formData.fatherMobile) {
          contacts.push({
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

        setSuccess('Student created successfully!')
      }

      setShowRegisterSidebar(false)
      resetForm()
      fetchStudents() // Refresh the list

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save student')
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
      // Soft delete - update status to inactive
      const { error: deleteError } = await supabase
        .from('students')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', selectedStudent.id)

      if (deleteError) throw deleteError

      setSuccess('Student deleted successfully!')
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
        whatsappNumber: '',
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
        medicalProblem: ''
      })
    } catch (err) {
      setError(err.message || 'Failed to load student details')
      console.error('Edit error:', err)
      setShowRegisterSidebar(false)
      setIsEditMode(false)
    }
  }

  const handleView = (student) => {
    setSelectedStudent(student)
    setShowViewModal(true)
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
        .limit(1)
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
            student_id: student.id
          })
        }

        if (motherContact) {
          contactsWithStudentIds.push({
            ...motherContact,
            student_id: student.id
          })
        }
      })

      if (contactsWithStudentIds.length > 0) {
        await supabase.from('student_contacts').insert(contactsWithStudentIds)
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Admission Register</h2>

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-6">
          <div className="md:col-span-3">
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, father name, or admission number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              onClick={() => {}}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              <Search size={20} />
              Search
            </button>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-gray-600 mb-4">
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
                {filteredAdmissions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No students found. Click "Register New Student" to add one.
                    </td>
                  </tr>
                ) : (
                  filteredAdmissions.map((admission, index) => (
                    <tr
                      key={admission.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-4 py-3 border border-gray-200">{admission.sr}</td>
                      <td className="px-4 py-3 border border-gray-200">{admission.session}</td>
                      <td className="px-4 py-3 border border-gray-200">{getClassName(admission.class)}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{admission.avatar}</span>
                          <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                            {admission.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border border-gray-200">{admission.father}</td>
                      <td className="px-4 py-3 border border-gray-200">{admission.admNo}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(admission)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(admission)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(admission)}
                            className={`p-2 rounded-lg transition ${
                              admission.status === 'active'
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            title={admission.status === 'active' ? 'Deactivate Student' : 'Activate Student'}
                          >
                            {admission.status === 'active' ? (
                              <ToggleRight size={18} />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(admission)}
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
        )}

        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">Showing {filteredAdmissions.length} entries</p>
        </div>
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
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => !saving && setShowRegisterSidebar(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
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
                      disabled={loadingClasses}
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
                    <label className="block text-gray-700 text-sm mb-2">Section</label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      disabled={loadingSections || !formData.class}
                    >
                      <option value="">
                        {loadingSections ? 'Loading sections...' : formData.class ? 'Select Section' : 'Select Class First'}
                      </option>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                      <option value="red">Red</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="yellow">Yellow</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 border border-dashed border-gray-300 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">UPLOAD STUDENT PICTURE</p>
                  <p className="text-xs text-gray-500 italic mb-2">Select image file</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-xs"
                  />
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
                  onClick={() => setShowRegisterSidebar(false)}
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
                    <>
                      {isEditMode ? 'Update' : 'Save'}
                      <Plus size={18} />
                    </>
                  )}
                </button>
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
        </>
      )}

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
    </div>
  )
}
