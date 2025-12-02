'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, X, Trash2, Printer } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { getUserFromCookie } from '@/lib/clientAuth'
import jsPDF from 'jspdf'

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

export default function PassengersPage() {
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [passengers, setPassengers] = useState([])
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [students, setStudents] = useState([])
  const [staff, setStaff] = useState([])
  const [classes, setClasses] = useState([])
  const [departments, setDepartments] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [filteredVehicles, setFilteredVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [routeFilter, setRouteFilter] = useState('')
  const [selectedPassenger, setSelectedPassenger] = useState(null)
  const [passengerToDelete, setPassengerToDelete] = useState(null)
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [staffSearchTerm, setStaffSearchTerm] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)

  // Lock/unlock body scroll when modals open/close
  useEffect(() => {
    const isAnyModalOpen = showModal || showEditModal || showDeleteModal

    if (isAnyModalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      setStudentSearchTerm('')
      setStaffSearchTerm('')
      setShowStudentDropdown(false)
      setShowStaffDropdown(false)
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showModal, showEditModal, showDeleteModal])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStudentDropdown && !event.target.closest('.student-dropdown-container')) {
        setShowStudentDropdown(false)
      }
      if (showStaffDropdown && !event.target.closest('.staff-dropdown-container')) {
        setShowStaffDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStudentDropdown, showStaffDropdown])

  const [formData, setFormData] = useState({
    type: 'STUDENT',
    classId: '',
    studentId: '',
    departmentId: '',
    staffId: '',
    identifier: '',
    route: '',
    vehicle: ''
  })

  useEffect(() => {
    fetchRoutes()
    fetchVehicles()
    fetchClasses()
    fetchDepartments()
    fetchStaff()
    fetchPassengers()
  }, [])

  const fetchClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) {
        console.error('Error fetching classes:', error)
        setClasses([])
      } else {
        setClasses(data || [])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchRoutes = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found in cookie')
        return
      }

      console.log('Fetching routes for school_id:', user.school_id)

      const { data, error } = await supabase
        .from('routes')
        .select('id, route_name, fare')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('route_name', { ascending: true })

      if (error) {
        console.error('❌ Error fetching routes:', error)
      } else {
        console.log('✅ Successfully fetched routes:', data?.length || 0, data)
        setRoutes(data || [])
      }
    } catch (error) {
      console.error('❌ Exception fetching routes:', error)
    }
  }

  const fetchVehicles = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration_number, driver_name, driver_mobile, route_id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('registration_number', { ascending: true })

      if (!error) {
        console.log('✅ Fetched vehicles:', data)
        setVehicles(data || [])
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error)
    }
  }

  const fetchStudents = async (classId = null) => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found in cookie')
        return []
      }

      console.log('Fetching students with school_id:', user.school_id, 'classId:', classId)

      let query = supabase
        .from('students')
        .select('id, admission_number, first_name, last_name, current_class_id, father_name')
        .eq('status', 'active')
        .order('first_name', { ascending: true })

      // Apply class filter if provided
      if (classId) {
        query = query.eq('current_class_id', classId)
      }

      const { data, error} = await query

      if (error) {
        console.error('❌ Supabase error fetching students:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return []
      } else {
        console.log('✅ Successfully fetched students:', data?.length || 0)
        return data || []
      }
    } catch (error) {
      console.error('❌ Exception fetching students:', error)
      return []
    }
  }

  // Filter students by selected class - Fetch from database dynamically
  const handleClassChange = async (classId) => {
    setFormData({ ...formData, classId, studentId: '', identifier: '' })
    setStudentSearchTerm('')

    if (classId) {
      // Fetch students for this specific class from database
      const studentsInClass = await fetchStudents(classId)

      console.log(`✅ Fetched ${studentsInClass.length} students for class ID: ${classId}`)
      if (studentsInClass.length > 0) {
        console.log('Students:', studentsInClass.map(s => `${s.first_name} ${s.last_name}`).join(', '))
      }

      setFilteredStudents(studentsInClass)
      // Automatically show dropdown when class is selected
      setShowStudentDropdown(true)
    } else {
      setFilteredStudents([])
      setShowStudentDropdown(false)
    }
  }

  // Filter staff by selected department - Fetch from database dynamically
  const handleDepartmentChange = async (department) => {
    setFormData({ ...formData, departmentId: department, staffId: '', identifier: '' })
    setStaffSearchTerm('')

    if (department) {
      // Fetch staff for this specific department from database
      const staffInDepartment = await fetchStaff(department)

      console.log(`✅ Fetched ${staffInDepartment.length} staff for department: ${department}`)

      setFilteredStaff(staffInDepartment)
      // Automatically show dropdown when department is selected
      setShowStaffDropdown(true)
    } else {
      setFilteredStaff([])
      setShowStaffDropdown(false)
    }
  }

  // Handle staff selection from dropdown
  const handleStaffSelect = (staffMember) => {
    setFormData({
      ...formData,
      staffId: staffMember.id,
      identifier: staffMember.computer_no || ''
    })
    setStaffSearchTerm(`${staffMember.first_name} ${staffMember.last_name} - ${staffMember.computer_no}`)
    setShowStaffDropdown(false)
  }

  // Filter staff based on search term
  const getFilteredStaffForSearch = () => {
    // If no search term, return all staff from selected department
    if (!staffSearchTerm.trim()) {
      return filteredStaff
    }

    const searchLower = staffSearchTerm.toLowerCase()
    return filteredStaff.filter(staffMember => {
      const fullName = `${staffMember.first_name} ${staffMember.last_name}`.toLowerCase()
      const computerNo = staffMember.computer_no?.toLowerCase() || ''
      const designation = staffMember.designation?.toLowerCase() || ''
      return fullName.includes(searchLower) || computerNo.includes(searchLower) || designation.includes(searchLower)
    })
  }

  // Handle route selection - Filter vehicles based on route
  const handleRouteChange = (routeId) => {
    setFormData({ ...formData, route: routeId, vehicle: '' }) // Reset vehicle when route changes

    if (routeId) {
      console.log('🚗 Selected route ID:', routeId)
      console.log('🚗 All vehicles:', vehicles)

      // Filter vehicles to show only those assigned to this specific route
      const vehiclesForRoute = vehicles.filter(v => v.route_id === routeId)
      console.log('🚗 Filtered vehicles for this route:', vehiclesForRoute)

      setFilteredVehicles(vehiclesForRoute)

      // Auto-select the vehicle if only one is available
      if (vehiclesForRoute.length === 1) {
        setFormData(prev => ({ ...prev, route: routeId, vehicle: vehiclesForRoute[0].id }))
      }
    } else {
      // If no route selected, reset to show all vehicles
      setFilteredVehicles([])
    }
  }

  // Handle student selection from dropdown
  const handleStudentSelect = (student) => {
    setFormData({
      ...formData,
      studentId: student.id,
      identifier: student.admission_number || ''
    })
    setStudentSearchTerm(`${student.first_name} ${student.last_name} - ${student.admission_number}`)
    setShowStudentDropdown(false)
  }

  // Filter students based on search term
  const getFilteredStudentsForSearch = () => {
    // If no search term, return all students from selected class
    if (!studentSearchTerm.trim()) {
      return filteredStudents
    }

    const searchLower = studentSearchTerm.toLowerCase()
    return filteredStudents.filter(student => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
      const admissionNumber = student.admission_number?.toLowerCase() || ''
      return fullName.includes(searchLower) || admissionNumber.includes(searchLower)
    })
  }

  const fetchDepartments = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      // Get unique departments from staff table
      const { data, error } = await supabase
        .from('staff')
        .select('department')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .not('department', 'is', null)

      if (!error && data) {
        // Get unique departments
        const uniqueDepts = [...new Set(data.map(s => s.department).filter(Boolean))]
        setDepartments(uniqueDepts.sort())
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchStaff = async (departmentId = null) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      let query = supabase
        .from('staff')
        .select('id, computer_no, first_name, last_name, department, designation')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('first_name', { ascending: true })

      // Apply department filter if provided
      if (departmentId) {
        query = query.eq('department', departmentId)
      }

      const { data, error } = await query

      if (!error) {
        setStaff(data || [])
        return data || []
      }
      return []
    } catch (error) {
      console.error('Error fetching staff:', error)
      return []
    }
  }

  const fetchPassengers = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('passengers')
        .select(`
          *,
          routes (
            route_name,
            fare
          ),
          vehicles (
            registration_number,
            driver_name,
            driver_mobile
          ),
          students (
            first_name,
            last_name,
            admission_number
          ),
          staff (
            first_name,
            last_name,
            computer_no
          )
        `)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!error) {
        setPassengers(data || [])
      }
    } catch (error) {
      console.error('Error fetching passengers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      if (formData.type === 'STUDENT' && !formData.studentId) {
        alert('Please select a student')
        return
      }

      if (formData.type === 'STAFF' && !formData.staffId) {
        alert('Please select a staff member')
        return
      }

      if (!formData.route) {
        alert('Please select a route')
        return
      }

      // Get the selected student or staff ID
      let studentId = null
      let staffId = null

      if (formData.type === 'STUDENT') {
        studentId = formData.studentId
      } else {
        staffId = formData.staffId
      }

      const { error } = await supabase
        .from('passengers')
        .insert([{
          school_id: user.school_id,
          created_by: user.id,
          type: formData.type,
          student_id: studentId,
          staff_id: staffId,
          route_id: formData.route,
          vehicle_id: formData.vehicle || null,
          status: 'active'
        }])
        .select()

      if (error) {
        console.error('Error creating passenger:', error)
        alert('Failed to add passenger: ' + error.message)
      } else {
        setShowModal(false)
        setFormData({ type: 'STUDENT', classId: '', studentId: '', departmentId: '', staffId: '', identifier: '', route: '', vehicle: '' })
        setFilteredStudents([])
        setFilteredStaff([])
        setStudentSearchTerm('')
        setStaffSearchTerm('')
        setShowStudentDropdown(false)
        setShowStaffDropdown(false)
        fetchPassengers()
      }
    } catch (error) {
      console.error('Error saving passenger:', error)
      alert('Error saving passenger')
    }
  }

  const handleEdit = (passenger) => {
    setSelectedPassenger(passenger)
    setFormData({
      type: passenger.type || 'STUDENT',
      identifier: passenger.type === 'STUDENT'
        ? passenger.students?.admission_number || ''
        : passenger.staff?.computer_no || '',
      route: passenger.route_id || '',
      vehicle: passenger.vehicle_id || ''
    })

    // Filter vehicles based on the passenger's current route
    if (passenger.route_id) {
      const vehiclesForRoute = vehicles.filter(v => v.route_id === passenger.route_id)
      setFilteredVehicles(vehiclesForRoute)
    }

    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      if (!formData.route) {
        alert('Route is required')
        return
      }

      const { error } = await supabase
        .from('passengers')
        .update({
          route_id: formData.route,
          vehicle_id: formData.vehicle || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPassenger.id)
        .eq('school_id', user.school_id)
        .select()

      if (error) {
        console.error('Error updating passenger:', error)
        alert('Failed to update passenger: ' + error.message)
      } else {
        setShowEditModal(false)
        setFormData({ type: 'STUDENT', identifier: '', route: '', vehicle: '' })
        setSelectedPassenger(null)
        fetchPassengers()
      }
    } catch (error) {
      console.error('Error updating passenger:', error)
      alert('Error updating passenger')
    }
  }

  const handleDelete = (passenger) => {
    setPassengerToDelete(passenger)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      const { error } = await supabase
        .from('passengers')
        .update({ status: 'inactive' })
        .eq('id', passengerToDelete.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting passenger:', error)
        alert('Failed to delete passenger: ' + error.message)
      } else {
        setShowDeleteModal(false)
        setPassengerToDelete(null)
        fetchPassengers()
      }
    } catch (error) {
      console.error('Error deleting passenger:', error)
      alert('Error deleting passenger')
    }
  }

  const handlePrintChallan = async (passenger) => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      // Fetch school details from database
      const { data: schoolData } = await supabase
        .from('schools')
        .select('school_name, bank_name, bank_account_number')
        .eq('id', user.school_id)
        .single()

      // Get passenger details
      const name = passenger.type === 'STUDENT'
        ? `${passenger.students?.first_name || ''} ${passenger.students?.last_name || ''}`
        : `${passenger.staff?.first_name || ''} ${passenger.staff?.last_name || ''}`

      const identifier = passenger.type === 'STUDENT'
        ? passenger.students?.admission_number || ''
        : passenger.staff?.computer_no || ''

      const route = passenger.routes?.route_name || ''
      const fare = passenger.routes?.fare || 0
      const feeType = '2nd Installment (Morning)'

      // Calculate due date (20 days from now)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 20)

      const formatDate = (date) => {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}-${month}-${year}`
      }

      const dueDateStr = formatDate(dueDate)
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dueDate.getDay()]

      // Use school's bank details from database
      const schoolName = schoolData?.school_name || 'School Management System'
      const bankName = schoolData?.bank_name || 'Bank Name Not Set'
      const collectionAC = schoolData?.bank_account_number || 'Account Number Not Set'

      // Convert number to words
      const numberToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

        if (num === 0) return 'Zero'
        if (num < 10) return ones[num]
        if (num < 20) return teens[num - 10]
        if (num < 100) {
          const tensDigit = Math.floor(num / 10)
          const onesDigit = num % 10
          return tens[tensDigit] + (onesDigit !== 0 ? ' ' + ones[onesDigit] : '')
        }
        if (num < 1000) {
          const hundreds = Math.floor(num / 100)
          const remainder = num % 100
          return ones[hundreds] + ' Hundred' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '')
        }
        if (num < 100000) {
          const thousands = Math.floor(num / 1000)
          const remainder = num % 1000
          return numberToWords(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '')
        }
        if (num < 10000000) {
          const lakhs = Math.floor(num / 100000)
          const remainder = num % 100000
          return numberToWords(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '')
        }
        return num.toString()
      }

      const amountInWords = numberToWords(fare) + ' Only'

      // Create PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const copies = [
        { title: 'Copy of Student', x: 8 },
        { title: 'Copy of Department', x: 81 },
        { title: 'Copy of Treasurer', x: 154 },
        { title: 'Copy of Bank', x: 227 }
      ]

      copies.forEach((copy, index) => {
        const startX = copy.x
        const startY = 8
        const copyWidth = 68

        // Header
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(schoolName.toUpperCase(), startX + copyWidth / 2, startY + 3, { align: 'center' })

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(bankName, startX + copyWidth / 2, startY + 8, { align: 'center' })

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'italic')
        doc.text(copy.title, startX + copyWidth / 2, startY + 12, { align: 'center' })

        // Bank Deposit Slip
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        let currentY = startY + 18
        doc.text('Bank Deposit Slip', startX + 1, currentY)

        // Details section with better alignment
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        const lineHeight = 4.5
        currentY += 6

        // Collection A/C#
        doc.text('Collection A/C#', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(collectionAC, startX + 26, currentY)

        // Due Date
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Due Date', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(`${dueDateStr} ${dayName}`, startX + 26, currentY)

        // Student/Staff Name
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Student Name', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        const maxNameLength = 40
        const displayName = name.length > maxNameLength ? name.substring(0, maxNameLength) + '...' : name
        doc.text(displayName, startX + 26, currentY)

        // Student Roll# / Staff ID
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Student Roll#', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(identifier, startX + 26, currentY)

        // Route
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Route', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(route, startX + 26, currentY)

        // Fee Type
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Fee Type:', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(feeType, startX + 26, currentY)

        // Table
        currentY += 7
        const tableStartY = currentY

        // Table header - black background
        doc.setFillColor(0, 0, 0)
        doc.setDrawColor(0, 0, 0)
        doc.rect(startX + 1, tableStartY, 9, 5, 'FD')
        doc.rect(startX + 10, tableStartY, 42, 5, 'FD')
        doc.rect(startX + 52, tableStartY, 15, 5, 'FD')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('No', startX + 5.5, tableStartY + 3.5, { align: 'center' })
        doc.text('Particulars', startX + 31, tableStartY + 3.5, { align: 'center' })
        doc.text('Amount', startX + 59.5, tableStartY + 3.5, { align: 'center' })

        // Table row - Transport Fee
        currentY = tableStartY + 5
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
        doc.setDrawColor(0, 0, 0)
        doc.rect(startX + 1, currentY, 9, 7, 'S')
        doc.rect(startX + 10, currentY, 42, 7, 'S')
        doc.rect(startX + 52, currentY, 15, 7, 'S')

        doc.setFontSize(7)
        doc.text('1', startX + 5.5, currentY + 4.5, { align: 'center' })
        doc.text('Transport Fee', startX + 31, currentY + 4.5, { align: 'center' })
        doc.text(fare.toLocaleString(), startX + 59.5, currentY + 4.5, { align: 'center' })

        // Total Fee row
        currentY += 7
        doc.setDrawColor(0, 0, 0)
        doc.rect(startX + 1, currentY, 51, 5.5, 'S')
        doc.rect(startX + 52, currentY, 15, 5.5, 'S')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.text('Total Fee', startX + 26.5, currentY + 3.8, { align: 'center' })
        doc.text(fare.toLocaleString(), startX + 59.5, currentY + 3.8, { align: 'center' })

        // Amount in words
        currentY += 8
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(amountInWords, startX + copyWidth / 2, currentY, { align: 'center' })

        // Urdu note at bottom
        currentY += 6
        doc.setFontSize(5.5)
        doc.setFont('helvetica', 'normal')
        doc.text('نوٹ: یہ رسید آپ کو اس وقت تک کسی بھی قسم کی فیس کی ادائیگی کے لیے محفوظ رکھیں جب تک', startX + copyWidth / 2, currentY, { align: 'center' })

        // Vertical separator line (except for last copy)
        if (index < 3) {
          doc.setDrawColor(180, 180, 180)
          doc.setLineDash([3, 2])
          doc.line(startX + copyWidth + 2.5, 5, startX + copyWidth + 2.5, 95)
          doc.setLineDash([])
        }
      })

      // Save PDF
      doc.save(`Transport_Fee_${name.replace(/\s+/g, '_')}_${dueDateStr}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF: ' + error.message)
    }
  }

  const filteredPassengers = passengers.filter(passenger => {
    const matchesTab = activeTab === 'all' || passenger.type === activeTab
    const matchesRoute = !routeFilter || passenger.route_id === routeFilter

    const name = passenger.type === 'STUDENT'
      ? `${passenger.students?.first_name || ''} ${passenger.students?.last_name || ''}`.toLowerCase()
      : `${passenger.staff?.first_name || ''} ${passenger.staff?.last_name || ''}`.toLowerCase()

    const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
      passenger.routes?.route_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesTab && matchesRoute && matchesSearch
  })

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Top Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Passengers
        </button>
        <button
          onClick={() => {
            setShowModal(true);
            setFormData({ type: 'STUDENT', classId: '', studentId: '', departmentId: '', staffId: '', identifier: '', route: '', vehicle: '' });
            setFilteredStudents([]);
            setFilteredStaff([]);
            setStudentSearchTerm('');
            setStaffSearchTerm('');
            setShowStudentDropdown(false);
            setShowStaffDropdown(false);
          }}
          className="px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Plus size={20} />
          Add Student
        </button>
        <button
          onClick={() => {
            setShowModal(true);
            setFormData({ type: 'STAFF', classId: '', studentId: '', departmentId: '', staffId: '', identifier: '', route: '', vehicle: '' });
            setFilteredStudents([]);
            setFilteredStaff([]);
            setStudentSearchTerm('');
            setStaffSearchTerm('');
            setShowStudentDropdown(false);
            setShowStaffDropdown(false);
          }}
          className="px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Plus size={20} />
          Add Staff
        </button>
      </div>

      {/* Search Section - Always visible */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Transport Register</h2>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-48">
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Select an option</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.route_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2">
            <Search size={20} />
            Search
          </button>
        </div>

        <p className="text-gray-600 mt-4 text-sm">
          There are <span className="font-bold text-red-600">{filteredPassengers.length}</span> routes registered in the routes data bank
        </p>
      </div>

      {/* Table - Always visible */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Route</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Vehicle</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Driver</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Driver Mobile</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fare</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Type</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    Loading passengers...
                  </td>
                </tr>
              ) : filteredPassengers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No passengers found
                  </td>
                </tr>
              ) : (
                filteredPassengers.map((passenger, index) => {
                  const name = passenger.type === 'STUDENT'
                    ? `${passenger.students?.first_name || ''} ${passenger.students?.last_name || ''}`.trim()
                    : `${passenger.staff?.first_name || ''} ${passenger.staff?.last_name || ''}`.trim()

                  return (
                    <tr
                      key={passenger.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-4 py-3 border border-gray-200">{index + 1}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <span className="text-blue-600 font-medium">
                          {name}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {passenger.routes?.route_name || '-'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {passenger.vehicles?.registration_number || '-'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {passenger.vehicles?.driver_name || '-'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {passenger.vehicles?.driver_mobile || '-'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {passenger.routes?.fare ? passenger.routes.fare.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          passenger.type === 'STUDENT'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {passenger.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePrintChallan(passenger)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Print Challan"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(passenger)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(passenger)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Passenger Sidebar */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Add {formData.type === 'STUDENT' ? 'Student' : 'Staff'}</h3>
                  <p className="text-blue-200 text-sm mt-1">Add passenger details</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                {formData.type === 'STUDENT' ? (
                  <>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                        Select Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.classId}
                        onChange={(e) => {
                          console.log('Class dropdown changed to:', e.target.value);
                          handleClassChange(e.target.value);
                        }}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                      >
                        <option value="">Select a class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                        Select Student <span className="text-red-500">*</span>
                      </label>
                      <div className="relative student-dropdown-container">
                        <input
                          type="text"
                          value={studentSearchTerm}
                          onChange={(e) => {
                            setStudentSearchTerm(e.target.value)
                            setShowStudentDropdown(true)
                          }}
                          onFocus={() => setShowStudentDropdown(true)}
                          disabled={!formData.classId}
                          placeholder={formData.classId ? 'Search by name or admission number...' : 'First select a class'}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {showStudentDropdown && formData.classId && (
                          <>
                            {getFilteredStudentsForSearch().length > 0 ? (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {getFilteredStudentsForSearch().map((student) => (
                                  <div
                                    key={student.id}
                                    onClick={() => handleStudentSelect(student)}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                                  >
                                    <div className="font-medium text-gray-800">
                                      {student.first_name} {student.last_name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Admission No: {student.admission_number}
                                      {student.father_name && ` • S/O ${student.father_name}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                                <div className="text-center text-gray-500">
                                  {studentSearchTerm
                                    ? `No students found matching "${studentSearchTerm}"`
                                    : 'No students found in this class'
                                  }
                                </div>
                                {!studentSearchTerm && (
                                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-gray-600">
                                    <p className="font-semibold text-yellow-800 mb-1">Possible reasons:</p>
                                    <ul className="list-disc list-inside space-y-1 text-left">
                                      <li>No students have been assigned to this class yet</li>
                                      <li>Students may need their class assignment updated</li>
                                      <li>Check student records to assign them to this class</li>
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                        Select Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.departmentId}
                        onChange={(e) => handleDepartmentChange(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                      >
                        <option value="">Select a department</option>
                        {departments.map((dept, index) => (
                          <option key={index} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                        Select Staff Member <span className="text-red-500">*</span>
                      </label>
                      <div className="relative staff-dropdown-container">
                        <input
                          type="text"
                          value={staffSearchTerm}
                          onChange={(e) => {
                            setStaffSearchTerm(e.target.value)
                            setShowStaffDropdown(true)
                          }}
                          onFocus={() => setShowStaffDropdown(true)}
                          disabled={!formData.departmentId}
                          placeholder={formData.departmentId ? 'Search by name or computer number...' : 'First select a department'}
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {showStaffDropdown && formData.departmentId && (
                          <>
                            {getFilteredStaffForSearch().length > 0 ? (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {getFilteredStaffForSearch().map((staffMember) => (
                                  <div
                                    key={staffMember.id}
                                    onClick={() => handleStaffSelect(staffMember)}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                                  >
                                    <div className="font-medium text-gray-800">
                                      {staffMember.first_name} {staffMember.last_name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Computer No: {staffMember.computer_no}
                                      {staffMember.designation && ` • ${staffMember.designation}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                                <div className="text-center text-gray-500">
                                  {staffSearchTerm
                                    ? `No staff found matching "${staffSearchTerm}"`
                                    : 'No staff found in this department'
                                  }
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Select Route <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.route}
                    onChange={(e) => handleRouteChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select a route</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.route_name} (Rs{route.fare})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Select Vehicle (Optional)
                  </label>
                  <select
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    disabled={!formData.route}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a vehicle</option>
                    {filteredVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.registration_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <Plus size={14} />
                  Add Passenger
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Passenger Sidebar */}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowEditModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Passenger</h3>
                  <p className="text-blue-200 text-sm mt-1">Update passenger details</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Passenger Name
                  </label>
                  <div className="px-4 py-3 bg-gray-100 rounded-lg text-gray-600">
                    {selectedPassenger?.type === 'STUDENT'
                      ? `${selectedPassenger?.students?.first_name || ''} ${selectedPassenger?.students?.last_name || ''}`
                      : `${selectedPassenger?.staff?.first_name || ''} ${selectedPassenger?.staff?.last_name || ''}`}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Type
                  </label>
                  <div className="px-4 py-3 bg-gray-100 rounded-lg text-gray-600">
                    {selectedPassenger?.type}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Select Route <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.route}
                    onChange={(e) => handleRouteChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select a route</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.route_name} (Rs{route.fare})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Select Vehicle (Optional)
                  </label>
                  <select
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    disabled={!formData.route}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a vehicle</option>
                    {filteredVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.registration_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <Plus size={14} />
                  Add Passenger
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && passengerToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete this passenger? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete
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
