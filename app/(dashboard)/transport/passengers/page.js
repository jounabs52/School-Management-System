'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, X, Trash2, Printer, CheckCircle, AlertCircle, ArrowRightLeft, RefreshCw } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { getUserFromCookie } from '@/lib/clientAuth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getPdfSettings,
  hexToRgb,
  applyPdfSettings,
  getLogoSize,
  getMarginValues
} from '@/lib/pdfSettings'

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

// Toast Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-[10001] animate-slideIn">
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl border ${
        type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        {type === 'success' ? (
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
        )}
        <span className="font-medium text-sm">{message}</span>
      </div>
    </div>
  )
}

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
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('')
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false)
  const [filteredStudents, setFilteredStudents] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [filteredVehicles, setFilteredVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [routeFilter, setRouteFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('') // Filter by STUDENT or STAFF
  const [selectedPassenger, setSelectedPassenger] = useState(null)
  const [passengerToDelete, setPassengerToDelete] = useState(null)
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [staffSearchTerm, setStaffSearchTerm] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)
  const [activeButton, setActiveButton] = useState(null) // Track which button is active ('STUDENT' or 'STAFF')

  // Toast state
  const [toast, setToast] = useState(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Show toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

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
    station: '',
    vehicle: '',
    due_date: ''
  })

  // Station and fare calculation states
  const [routeStations, setRouteStations] = useState([])
  const [selectedStation, setSelectedStation] = useState(null)
  const [fareCalculation, setFareCalculation] = useState({
    baseFare: 0,
    discountPercent: 0,
    discountAmount: 0,
    finalFare: 0
  })

  // Vehicle seat availability tracking
  const [vehicleSeatAvailability, setVehicleSeatAvailability] = useState({})

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
        // Calculate max fare from stations for each route
        const routesWithFare = await Promise.all(
          (data || []).map(async (route) => {
            const { data: stationsData } = await supabase
              .from('stations')
              .select('fare')
              .eq('route_id', route.id)
              .eq('status', 'active')

            const maxFare = stationsData && stationsData.length > 0
              ? Math.max(...stationsData.map(s => s.fare || 0))
              : 0

            return {
              ...route,
              fare: maxFare
            }
          })
        )

        console.log('✅ Successfully fetched routes:', routesWithFare?.length || 0, routesWithFare)
        setRoutes(routesWithFare || [])
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
        .select('id, registration_number, driver_name, driver_mobile, route_id, seating_capacity')
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

  // Filter departments based on search term
  const getFilteredDepartments = () => {
    if (!departmentSearchTerm.trim()) {
      return departments
    }
    const searchLower = departmentSearchTerm.toLowerCase()
    return departments.filter(dept => dept.toLowerCase().includes(searchLower))
  }

  // Handle department selection from dropdown
  const handleDepartmentSelect = (department) => {
    setFormData({ ...formData, departmentId: department, staffId: '', identifier: '' })
    setDepartmentSearchTerm(department)
    setShowDepartmentDropdown(false)
    handleDepartmentChange(department)
  }

  // Calculate seat availability for vehicles
  const calculateVehicleSeatAvailability = async (vehicleIds) => {
    if (!vehicleIds || vehicleIds.length === 0) return {}

    const availability = {}

    for (const vehicleId of vehicleIds) {
      const vehicle = vehicles.find(v => v.id === vehicleId)
      if (!vehicle) continue

      // Count current passengers for this vehicle
      const { data: currentPassengers } = await supabase
        .from('passengers')
        .select('id', { count: 'exact' })
        .eq('vehicle_id', vehicleId)
        .eq('status', 'active')

      const currentOccupancy = currentPassengers?.length || 0
      const capacity = vehicle.seating_capacity || 0
      const available = capacity > 0 ? Math.max(0, capacity - currentOccupancy) : 999 // Show large number for unlimited
      const isFull = capacity > 0 ? currentOccupancy >= capacity : false // Only full if capacity is set

      availability[vehicleId] = {
        capacity,
        occupied: currentOccupancy,
        available,
        isFull
      }
    }

    return availability
  }

  // Reset add passenger modal state
  const resetAddModalState = () => {
    setShowModal(false)
    setActiveButton(null) // Reset active button
    setFormData({ type: 'STUDENT', classId: '', studentId: '', departmentId: '', staffId: '', identifier: '', route: '', station: '', vehicle: '', due_date: '' })
    setFilteredStudents([])
    setFilteredStaff([])
    setStudentSearchTerm('')
    setStaffSearchTerm('')
    setDepartmentSearchTerm('')
    setShowStudentDropdown(false)
    setShowStaffDropdown(false)
    setShowDepartmentDropdown(false)
    setRouteStations([])
    setSelectedStation(null)
    setFareCalculation({ baseFare: 0, discountPercent: 0, discountAmount: 0, finalFare: 0 })
  }

  // Fetch stations for selected route
  const fetchStationsForRoute = async (routeId) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('route_id', routeId)
        .eq('status', 'active')
        .order('station_order', { ascending: true })

      if (error) {
        console.error('Error fetching stations:', error)
        setRouteStations([])
      } else {
        console.log('✅ Fetched stations for route:', data)
        setRouteStations(data || [])
      }
    } catch (error) {
      console.error('Error fetching stations:', error)
      setRouteStations([])
    }
  }

  // Calculate fare based on station and passenger type
  const calculateFare = (station, passengerType) => {
    if (!station || !station.fare) {
      setFareCalculation({ baseFare: 0, discountPercent: 0, discountAmount: 0, finalFare: 0 })
      return
    }

    const baseFare = parseInt(station.fare) || 0
    const discountPercent = 0  // Start with 0% discount - user can manually adjust

    const discountAmount = 0
    const finalFare = baseFare

    setFareCalculation({
      baseFare,
      discountPercent,
      discountAmount,
      finalFare
    })

    console.log('💰 Fare Calculation:', {
      station: station.station_name,
      baseFare,
      discountPercent,
      discountAmount,
      finalFare
    })
  }

  // Handle station selection
  const handleStationChange = (stationId) => {
    const station = routeStations.find(s => s.id === stationId)
    setSelectedStation(station)
    setFormData({ ...formData, station: stationId })

    if (station) {
      calculateFare(station, formData.type)
    }
  }

  // Handle route selection - Filter vehicles based on route
  const handleRouteChange = async (routeId) => {
    setFormData({ ...formData, route: routeId, station: '', vehicle: '' }) // Reset station and vehicle when route changes
    setRouteStations([])
    setSelectedStation(null)
    setFareCalculation({ baseFare: 0, discountPercent: 0, discountAmount: 0, finalFare: 0 })

    if (routeId) {
      console.log('🚗 Selected route ID:', routeId)

      // Fetch stations for this route
      await fetchStationsForRoute(routeId)

      // Filter vehicles to show only those assigned to this specific route
      const vehiclesForRoute = vehicles.filter(v => v.route_id === routeId)
      console.log('🚗 Filtered vehicles for this route:', vehiclesForRoute)

      setFilteredVehicles(vehiclesForRoute)

      // Calculate seat availability for these vehicles
      const vehicleIds = vehiclesForRoute.map(v => v.id)
      const availability = await calculateVehicleSeatAvailability(vehicleIds)
      setVehicleSeatAvailability(availability)

      // Auto-select the vehicle if only one is available
      if (vehiclesForRoute.length === 1) {
        setFormData(prev => ({ ...prev, route: routeId, station: '', vehicle: vehiclesForRoute[0].id }))
      }
    } else {
      // If no route selected, reset to show all vehicles
      setFilteredVehicles([])
      setVehicleSeatAvailability({})
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
        showToast('Please login to view passengers', 'error')
        setLoading(false)
        return
      }

      if (!user.school_id) {
        showToast('User data incomplete - missing school_id', 'error')
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
          stations (
            station_name,
            fare
          ),
          vehicles (
            registration_number,
            driver_name,
            driver_mobile,
            seating_capacity
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

      if (error) {
        console.error('Error fetching passengers:', error)
        showToast(`Error fetching passengers: ${error.message}`, 'error')
        setPassengers([])
      } else {
        setPassengers(data || [])
      }
    } catch (error) {
      console.error('Error in fetchPassengers:', error)
      showToast('Failed to fetch passengers', 'error')
      setPassengers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      if (formData.type === 'STUDENT' && !formData.studentId) {
        showToast('Please select a student', 'error')
        return
      }

      if (formData.type === 'STAFF' && !formData.staffId) {
        showToast('Please select a staff member', 'error')
        return
      }

      if (!formData.route) {
        showToast('Please select a route', 'error')
        return
      }

      if (!formData.vehicle) {
        showToast('Please select a vehicle', 'error')
        return
      }

      if (!formData.due_date) {
        showToast('Please select a due date', 'error')
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

      // Check if this student/staff is already registered in transport
      const { data: existingPassenger, error: checkError } = await supabase
        .from('passengers')
        .select('id, student_id, staff_id, routes(route_name), students(first_name, last_name), staff(first_name, last_name)')
        .eq('school_id', user.school_id)
        .eq('status', 'active')

      if (checkError) {
        console.error('Error checking existing passengers:', checkError)
        showToast('Error checking passenger status', 'error')
        return
      }

      // Filter to find if this specific student/staff already exists
      const duplicate = existingPassenger?.find(p => {
        if (formData.type === 'STUDENT') {
          return p.student_id === studentId
        } else {
          return p.staff_id === staffId
        }
      })

      if (duplicate) {
        const name = formData.type === 'STUDENT'
          ? `${duplicate.students?.first_name} ${duplicate.students?.last_name}`
          : `${duplicate.staff?.first_name} ${duplicate.staff?.last_name}`
        const routeName = duplicate.routes?.route_name || 'Unknown Route'

        showToast(`${name} is already registered on ${routeName}. Cannot add same person twice!`, 'error')
        return
      }

      // Check vehicle seat capacity if vehicle is selected
      if (formData.vehicle) {
        const selectedVehicle = vehicles.find(v => v.id === formData.vehicle)

        if (selectedVehicle) {
          const vehicleCapacity = selectedVehicle.seating_capacity || 0

          // Only check capacity if it's set (greater than 0)
          if (vehicleCapacity > 0) {
            // Count current passengers assigned to this vehicle
            const { data: currentPassengers, error: countError } = await supabase
              .from('passengers')
              .select('id', { count: 'exact' })
              .eq('vehicle_id', formData.vehicle)
              .eq('status', 'active')

            if (countError) {
              console.error('Error counting passengers:', countError)
              showToast('Error checking seat availability', 'error')
              return
            }

            const currentOccupancy = currentPassengers?.length || 0

            console.log('🚗 Seat Capacity Check:', {
              vehicle: selectedVehicle.registration_number,
              capacity: vehicleCapacity,
              currentOccupancy,
              availableSeats: vehicleCapacity - currentOccupancy,
              wouldBeAfterAdd: currentOccupancy + 1
            })

            // Block if adding this passenger would exceed or equal capacity
            if (currentOccupancy >= vehicleCapacity) {
              console.error('❌ CAPACITY EXCEEDED:', {
                vehicle: selectedVehicle.registration_number,
                capacity: vehicleCapacity,
                current: currentOccupancy,
                trying_to_add: 1
              })
              showToast(`Vehicle ${selectedVehicle.registration_number} is full! Capacity: ${vehicleCapacity}, Current: ${currentOccupancy}`, 'error')
              return
            }

            console.log('✅ Capacity check passed, seat available')
          } else {
            console.log('🚗 Vehicle has no capacity limit set, allowing passenger')
          }
        }
      }

      // studentId and staffId already declared above for duplicate checking

      const { data, error } = await supabase
        .from('passengers')
        .insert([{
          user_id: user.id,
          school_id: user.school_id,
          created_by: user.id,
          type: formData.type,
          student_id: studentId,
          staff_id: staffId,
          route_id: formData.route,
          station_id: formData.station || null,
          vehicle_id: formData.vehicle || null,
          base_fare: fareCalculation.baseFare,
          discount_percent: fareCalculation.discountPercent,
          final_fare: fareCalculation.finalFare,
          due_date: formData.due_date,
          status: 'active'
        }])
        .select()

      if (error) {
        console.error('Error creating passenger:', error)
        showToast('Failed to add passenger', 'error')
      } else {
        // Get related data for display
        let studentInfo = null
        let staffInfo = null
        let routeInfo = null
        let vehicleInfo = null

        if (formData.type === 'STUDENT' && studentId) {
          const student = filteredStudents.find(s => s.id === studentId)
          if (student) {
            studentInfo = {
              first_name: student.first_name,
              last_name: student.last_name,
              admission_number: student.admission_number
            }
          }
        } else if (formData.type === 'STAFF' && staffId) {
          const staff = filteredStaff.find(s => s.id === staffId)
          if (staff) {
            staffInfo = {
              first_name: staff.first_name,
              last_name: staff.last_name,
              computer_no: staff.computer_no
            }
          }
        }

        if (formData.route) {
          const route = routes.find(r => r.id === formData.route)
          if (route) {
            routeInfo = {
              route_name: route.route_name,
              fare: route.fare
            }
          }
        }

        if (formData.vehicle) {
          const vehicle = vehicles.find(v => v.id === formData.vehicle)
          if (vehicle) {
            vehicleInfo = {
              registration_number: vehicle.registration_number,
              driver_name: vehicle.driver_name,
              driver_mobile: vehicle.driver_mobile
            }
          }
        }

        // Add new passenger to state
        const newPassenger = {
          ...data[0],
          students: studentInfo,
          staff: staffInfo,
          routes: routeInfo,
          vehicles: vehicleInfo
        }

        setPassengers([newPassenger, ...passengers])
        resetAddModalState()
        showToast('Passenger added successfully!', 'success')
      }
    } catch (error) {
      console.error('Error saving passenger:', error)
      showToast('Error saving passenger', 'error')
    }
  }

  const handleEdit = async (passenger) => {
    setSelectedPassenger(passenger)

    // Format due_date to YYYY-MM-DD for HTML date input
    let formattedDueDate = ''
    if (passenger.due_date) {
      const date = new Date(passenger.due_date)
      formattedDueDate = date.toISOString().split('T')[0]
    }

    // Set form data with passenger's current values
    setFormData({
      type: passenger.type || 'STUDENT',
      studentId: passenger.student_id || '',
      staffId: passenger.staff_id || '',
      classId: passenger.students?.current_class_id || '',
      departmentId: passenger.staff?.department || '',
      identifier: passenger.type === 'STUDENT'
        ? passenger.students?.admission_number || ''
        : passenger.staff?.computer_no || '',
      route: passenger.route_id || '',
      station: passenger.station_id || '',
      vehicle: passenger.vehicle_id || '',
      due_date: formattedDueDate
    })

    // Load stations for the route if route exists
    if (passenger.route_id) {
      await fetchStationsForRoute(passenger.route_id)

      // Filter vehicles based on the passenger's current route
      const vehiclesForRoute = vehicles.filter(v => v.route_id === passenger.route_id)
      setFilteredVehicles(vehiclesForRoute)

      // Calculate seat availability for these vehicles
      const vehicleIds = vehiclesForRoute.map(v => v.id)
      const availability = await calculateVehicleSeatAvailability(vehicleIds)
      setVehicleSeatAvailability(availability)
    }

    // Set fare calculation with existing values
    setFareCalculation({
      baseFare: passenger.base_fare || 0,
      discountPercent: passenger.discount_percent || 0,
      discountAmount: Math.round(((passenger.base_fare || 0) * (passenger.discount_percent || 0)) / 100),
      finalFare: passenger.final_fare || 0
    })

    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      if (!formData.route) {
        showToast('Route is required', 'error')
        return
      }

      if (!formData.due_date) {
        showToast('Please select a due date', 'error')
        return
      }

      // Check vehicle seat capacity if vehicle is selected AND it's different from current vehicle
      if (formData.vehicle && formData.vehicle !== selectedPassenger.vehicle_id) {
        const selectedVehicle = vehicles.find(v => v.id === formData.vehicle)

        if (selectedVehicle) {
          // Count current passengers assigned to this vehicle
          const { data: currentPassengers, error: countError } = await supabase
            .from('passengers')
            .select('id', { count: 'exact' })
            .eq('vehicle_id', formData.vehicle)
            .eq('status', 'active')

          if (countError) {
            console.error('Error counting passengers:', countError)
            showToast('Error checking seat availability', 'error')
            return
          }

          const currentOccupancy = currentPassengers?.length || 0
          const vehicleCapacity = selectedVehicle.seating_capacity || 0

          console.log('🚗 Seat Capacity Check (Edit):', {
            vehicle: selectedVehicle.registration_number,
            capacity: vehicleCapacity,
            currentOccupancy,
            availableSeats: vehicleCapacity - currentOccupancy
          })

          // Only check capacity if it's set (greater than 0)
          if (vehicleCapacity > 0) {
            if (currentOccupancy >= vehicleCapacity) {
              showToast(`Vehicle ${selectedVehicle.registration_number} is full! Capacity: ${vehicleCapacity}, Current: ${currentOccupancy}`, 'error')
              return
            }
          } else {
            console.log('🚗 Vehicle has no capacity limit set, allowing passenger update')
          }
        }
      }

      const { error } = await supabase
        .from('passengers')
        .update({
          route_id: formData.route,
          station_id: formData.station || null,
          vehicle_id: formData.vehicle || null,
          base_fare: fareCalculation.baseFare,
          discount_percent: fareCalculation.discountPercent,
          final_fare: fareCalculation.finalFare,
          due_date: formData.due_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPassenger.id)
        .eq('school_id', user.school_id)
        .select()

      if (error) {
        console.error('Error updating passenger:', error)
        showToast('Failed to update passenger', 'error')
      } else {
        // Get updated route, station, and vehicle info
        let routeInfo = null
        let stationInfo = null
        let vehicleInfo = null

        if (formData.route) {
          const route = routes.find(r => r.id === formData.route)
          if (route) {
            routeInfo = {
              route_name: route.route_name,
              fare: route.fare
            }
          }
        }

        if (formData.station) {
          const station = routeStations.find(s => s.id === formData.station)
          if (station) {
            stationInfo = {
              station_name: station.station_name,
              fare: station.fare
            }
          }
        }

        if (formData.vehicle) {
          const vehicle = vehicles.find(v => v.id === formData.vehicle)
          if (vehicle) {
            vehicleInfo = {
              registration_number: vehicle.registration_number,
              driver_name: vehicle.driver_name,
              driver_mobile: vehicle.driver_mobile
            }
          }
        }

        // Update passenger in state
        setPassengers(passengers.map(passenger =>
          passenger.id === selectedPassenger.id
            ? {
                ...passenger,
                route_id: formData.route,
                station_id: formData.station || null,
                vehicle_id: formData.vehicle || null,
                base_fare: fareCalculation.baseFare,
                discount_percent: fareCalculation.discountPercent,
                final_fare: fareCalculation.finalFare,
                due_date: formData.due_date,
                routes: routeInfo,
                stations: stationInfo,
                vehicles: vehicleInfo
              }
            : passenger
        ))

        setShowEditModal(false)
        setFormData({ type: 'STUDENT', classId: '', studentId: '', departmentId: '', staffId: '', identifier: '', route: '', station: '', vehicle: '', due_date: '' })
        setSelectedPassenger(null)
        showToast('Passenger updated successfully!', 'success')
      }
    } catch (error) {
      console.error('Error updating passenger:', error)
      showToast('Error updating passenger', 'error')
    }
  }

  const handleDelete = (passenger) => {
    setPassengerToDelete(passenger)
    setShowDeleteModal(true)
  }

  const handleStatusChange = async (passengerId, currentStatus) => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      // Toggle between pending and paid
      const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'

      const { error } = await supabase
        .from('passengers')
        .update({
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', passengerId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error updating payment status:', error)
        showToast('Failed to update payment status', 'error')
      } else {
        // Update passenger in state
        setPassengers(passengers.map(passenger =>
          passenger.id === passengerId
            ? { ...passenger, payment_status: newStatus }
            : passenger
        ))
        showToast(`Payment status updated to ${newStatus}!`, 'success')
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      showToast('Error updating payment status', 'error')
    }
  }

  const handleTransferPassenger = (passenger) => {
    // Open edit modal with transfer mode
    handleEdit(passenger)
    showToast('Update route, station, or vehicle to transfer passenger', 'info')
  }

  const confirmDelete = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      const { error } = await supabase
        .from('passengers')
        .update({ status: 'inactive' })
        .eq('id', passengerToDelete.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting passenger:', error)
        showToast('Failed to delete passenger', 'error')
      } else {
        // Remove passenger from state
        setPassengers(passengers.filter(passenger => passenger.id !== passengerToDelete.id))
        setShowDeleteModal(false)
        setPassengerToDelete(null)
        showToast('Passenger deleted successfully!', 'success')
      }
    } catch (error) {
      console.error('Error deleting passenger:', error)
      showToast('Error deleting passenger', 'error')
    }
  }

  const handlePrintChallan = async (passenger) => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      // Fetch school details from database
      const { data: schoolData } = await supabase
        .from('schools')
        .select('school_name, bank_name, bank_account_number')
        .eq('id', user.school_id)
        .single()

      // Fetch station details
      let stationName = 'N/A'
      let stationFare = 0
      if (passenger.station_id) {
        const { data: stationData } = await supabase
          .from('stations')
          .select('station_name, fare')
          .eq('id', passenger.station_id)
          .single()

        if (stationData) {
          stationName = stationData.station_name
          stationFare = stationData.fare || 0
        }
      }

      // Get passenger details
      const name = passenger.type === 'STUDENT'
        ? `${passenger.students?.first_name || ''} ${passenger.students?.last_name || ''}`
        : `${passenger.staff?.first_name || ''} ${passenger.staff?.last_name || ''}`

      const identifier = passenger.type === 'STUDENT'
        ? passenger.students?.admission_number || ''
        : passenger.staff?.computer_no || ''

      const route = passenger.routes?.route_name || ''

      // Use saved fare details from passenger record
      const baseFare = passenger.base_fare || stationFare || passenger.routes?.fare || 0
      const discountPercent = passenger.discount_percent || 0
      const finalFare = passenger.final_fare || baseFare

      const feeType = 'Transport Fee (Monthly)'

      // Use stored due date from passenger record
      let dueDate
      let dueDateStr = ''
      let dayName = ''

      if (passenger.due_date) {
        // Parse the date as UTC to avoid timezone issues
        const dateParts = passenger.due_date.split('-')
        dueDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])

        const formatDate = (date) => {
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}-${month}-${year}`
        }

        dueDateStr = formatDate(dueDate)
        dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dueDate.getDay()]
      } else {
        // Fallback to current date if no due_date is set
        dueDate = new Date()
        const formatDate = (date) => {
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}-${month}-${year}`
        }
        dueDateStr = formatDate(dueDate)
        dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dueDate.getDay()]
      }

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

      const amountInWords = numberToWords(finalFare) + ' Only'

      // Get PDF settings
      const pdfSettings = getPdfSettings()

      // Create PDF with settings from PAGE SETTINGS
      const doc = new jsPDF({
        orientation: pdfSettings.orientation || 'portrait',
        unit: 'mm',
        format: pdfSettings.pageSize?.toLowerCase() || 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Get colors from settings
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      const textColor = hexToRgb(pdfSettings.textColor)

      // Get margin values from settings
      const margins = getMarginValues(pdfSettings.margin)
      const leftMargin = margins.left
      const rightMargin = pageWidth - margins.right
      const topMargin = margins.top
      const bottomMargin = margins.bottom

      let yPos = topMargin
      const centerX = pageWidth / 2

      // Header Section (if enabled)
      if (pdfSettings.includeHeader) {
        // Header Background with color from settings
        const headerHeight = 40
        doc.setFillColor(...headerBgColor)
        doc.rect(0, 0, pageWidth, headerHeight, 'F')

        // Add school logo if available
        if (pdfSettings.includeLogo) {
          try {
            // Fetch school logo from supabase
            const { data: schoolLogoData } = await supabase
              .from('schools')
              .select('logo_url')
              .eq('id', user.school_id)
              .single()

            if (schoolLogoData?.logo_url) {
              const img = new Image()
              img.crossOrigin = 'anonymous'
              img.src = schoolLogoData.logo_url

              await new Promise((resolve) => {
                img.onload = () => {
                  try {
                    const logoSizeObj = getLogoSize(pdfSettings.logoSize)
                    const currentLogoSize = logoSizeObj.width // Use width property
                    // Center logo vertically in header
                    const logoY = (headerHeight - currentLogoSize) / 2
                    let logoX = 10 // Default to left with 10mm margin

                    // Position logo based on settings
                    if (pdfSettings.logoPosition === 'center') {
                      // Center logo - but this will overlap with text, so skip if center
                      logoX = 10 // Keep on left
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
                      ctx.drawImage(img, 0, 0, size, size)

                      // Convert canvas to data URL and add to PDF
                      const clippedImage = canvas.toDataURL('image/png')
                      doc.addImage(clippedImage, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)

                      // Add border based on logo style from PDF settings
                      const borderRgb = pdfSettings.logoBorderColor ? hexToRgb(pdfSettings.logoBorderColor) : [255, 255, 255]
                      if (pdfSettings.logoStyle === 'circle') {
                        doc.setDrawColor(...borderRgb)
                        doc.setLineWidth(0.5)
                        doc.circle(logoX + currentLogoSize/2, logoY + currentLogoSize/2, currentLogoSize/2, 'S')
                      } else if (pdfSettings.logoStyle === 'rounded') {
                        doc.setDrawColor(...borderRgb)
                        doc.setLineWidth(0.5)
                        doc.roundedRect(logoX, logoY, currentLogoSize, currentLogoSize, 3, 3, 'S')
                      }
                    } else {
                      // Square logo
                      doc.addImage(img, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
                    }

                    resolve()
                  } catch (e) {
                    console.warn('Could not add logo to PDF:', e)
                    resolve()
                  }
                }
                img.onerror = () => {
                  console.warn('Could not load logo image')
                  resolve()
                }
              })
            }
          } catch (error) {
            console.error('Error adding logo:', error)
          }
        }

        // Header Text (from settings) or School Name
        yPos = 18
        const headerTextToShow = pdfSettings.headerText || schoolName.toUpperCase()

        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(headerTextToShow, centerX, yPos, { align: 'center' })
        yPos += 8

        // Transport Fee Challan - Hardcoded text
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('TRANSPORT FEE CHALLAN', centerX, yPos, { align: 'center' })

        // Generated date in header
        if (pdfSettings.includeGeneratedDate) {
          doc.setFontSize(7)
          doc.setTextColor(220, 220, 220)

          // If logo is on right, put date on left to avoid overlap
          const dateAlign = pdfSettings.logoPosition === 'right' ? 'left' : 'right'
          const dateX = pdfSettings.logoPosition === 'right' ? leftMargin : rightMargin

          doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`, dateX, 35, { align: dateAlign })
        }

        yPos = 50
      } else {
        yPos = 15
      }

      // Get base font size from settings
      const baseFontSize = parseInt(pdfSettings.fontSize) || 9

      // Student/Staff Information Section
      doc.setFontSize(baseFontSize + 5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColor)
      doc.text('STUDENT INFORMATION', leftMargin, yPos)
      yPos += 8

      // Student details in a table format
      const studentInfoData = [
        ['Student Name:', name, 'Student Roll#:', identifier],
        ['Route:', route, 'Drop Station:', stationName],
        ['Due Date:', `${dueDateStr} ${dayName}`, 'Fee Type:', feeType]
      ]

      autoTable(doc, {
        startY: yPos,
        body: studentInfoData,
        theme: 'plain',
        styles: {
          fontSize: baseFontSize + 2,
          cellPadding: 3,
          fontStyle: 'bold',
          textColor: textColor
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, textColor: [80, 80, 80] },
          1: { fontStyle: 'bold', cellWidth: 60, textColor: textColor },
          2: { fontStyle: 'bold', cellWidth: 35, textColor: [80, 80, 80] },
          3: { fontStyle: 'bold', cellWidth: 'auto', textColor: textColor }
        },
        margin: { left: leftMargin, right: leftMargin }
      })

      yPos = doc.lastAutoTable.finalY + 12

      // Fee Breakdown Section
      doc.setFontSize(baseFontSize + 2)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColor)
      doc.text('FEE BREAKDOWN', leftMargin, yPos)
      yPos += 5

      const discountAmount = Math.round((baseFare * discountPercent) / 100)

      // Fee breakdown table
      const feeData = [
        ['Transport Fee (Base)', `Rs. ${baseFare.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        [`Discount (${discountPercent}%)`, `Rs. -${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ]

      autoTable(doc, {
        startY: yPos,
        head: [['Particulars', 'Amount']],
        body: feeData,
        theme: 'grid',
        headStyles: {
          fillColor: headerBgColor,
          textColor: [255, 255, 255],
          fontSize: baseFontSize + 1,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: baseFontSize,
          cellPadding: 4,
          textColor: textColor
        },
        columnStyles: {
          0: { cellWidth: 130, fontStyle: 'normal' },
          1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          // Color discount red
          if (data.row.index === 1 && data.section === 'body' && data.column.index === 1) {
            data.cell.styles.textColor = [198, 40, 40]
          }
        },
        margin: { left: leftMargin, right: leftMargin }
      })

      yPos = doc.lastAutoTable.finalY

      // TOTAL FEE PAYABLE - Highlighted section
      const totalFeeData = [
        ['TOTAL FEE PAYABLE', `Rs. ${finalFare.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ]

      autoTable(doc, {
        startY: yPos,
        body: totalFeeData,
        theme: 'grid',
        styles: {
          fontSize: baseFontSize + 2,
          cellPadding: 5,
          fontStyle: 'bold',
          fillColor: [232, 245, 233],
          textColor: [27, 94, 32]
        },
        columnStyles: {
          0: { cellWidth: 130, halign: 'left' },
          1: { cellWidth: 'auto', halign: 'right' }
        },
        margin: { left: leftMargin, right: leftMargin }
      })

      yPos = doc.lastAutoTable.finalY + 10

      // Amount in words
      doc.setFontSize(baseFontSize)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColor)
      doc.text('Amount in Words:', leftMargin, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
      doc.text(amountInWords, leftMargin, yPos)
      yPos += 10

      // Payment Status
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColor)
      doc.text('Payment Status:', leftMargin, yPos)

      const paymentStatus = passenger.payment_status === 'paid' ? 'Paid' : 'Pending'
      const statusColor = passenger.payment_status === 'paid' ? [27, 94, 32] : [255, 152, 0]

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...statusColor)
      doc.text(paymentStatus, leftMargin + 35, yPos)

      // Footer section
      if (pdfSettings.includeFooter) {
        let footerY = pageHeight - 20

        // Horizontal line above footer
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.line(leftMargin, footerY, rightMargin, footerY)

        footerY += 4

        // Page numbers (if enabled)
        if (pdfSettings.includePageNumbers) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(120, 120, 120)
          doc.text('Page 1 of 1', leftMargin, footerY, { align: 'left' })
        }

        // Print date (if enabled)
        if (pdfSettings.includeDate) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(120, 120, 120)
          const printDate = new Date().toLocaleDateString('en-GB')
          doc.text(`Printed: ${printDate}`, rightMargin, footerY, { align: 'right' })
        }

        footerY += 4

        // Footer text from settings or default
        const footerTextToShow = pdfSettings.footerText || 'Developed by: airoxlab.com'
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(120, 120, 120)
        doc.text(footerTextToShow, centerX, footerY, { align: 'center' })
      }

      // Save PDF
      doc.save(`Transport_Fee_${name.replace(/\s+/g, '_')}_${dueDateStr}.pdf`)
      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to generate PDF', 'error')
    }
  }

  const filteredPassengers = passengers.filter(passenger => {
    const matchesRoute = !routeFilter || passenger.route_id === routeFilter
    const matchesType = !typeFilter || passenger.type === typeFilter

    const name = passenger.type === 'STUDENT'
      ? `${passenger.students?.first_name || ''} ${passenger.students?.last_name || ''}`.toLowerCase()
      : `${passenger.staff?.first_name || ''} ${passenger.staff?.last_name || ''}`.toLowerCase()

    const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
      passenger.routes?.route_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesRoute && matchesType && matchesSearch
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredPassengers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPassengers = filteredPassengers.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [routeFilter, typeFilter, searchTerm])

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close student dropdown
      if (showStudentDropdown) {
        const studentContainer = document.querySelector('.student-dropdown-container')
        if (studentContainer && !studentContainer.contains(event.target)) {
          setShowStudentDropdown(false)
        }
      }
      // Close staff dropdown
      if (showStaffDropdown) {
        const staffContainer = document.querySelector('.staff-dropdown-container')
        if (staffContainer && !staffContainer.contains(event.target)) {
          setShowStaffDropdown(false)
        }
      }
      // Close department dropdown
      if (showDepartmentDropdown) {
        const deptContainer = document.querySelector('.department-dropdown-container')
        if (deptContainer && !deptContainer.contains(event.target)) {
          setShowDepartmentDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStudentDropdown, showStaffDropdown, showDepartmentDropdown])

  return (
    <div className="p-2 bg-gray-50 min-h-screen">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-2 mb-2">
        <div className="flex flex-col md:flex-row gap-1.5 items-center">
          <button
            onClick={() => {
              setShowModal(true);
              setActiveButton('STUDENT');
              setFormData({ type: 'STUDENT', classId: '', studentId: '', departmentId: '', staffId: '', identifier: '', route: '', station: '', vehicle: '' });
              setFilteredStudents([]);
              setFilteredStaff([]);
              setStudentSearchTerm('');
              setStaffSearchTerm('');
              setDepartmentSearchTerm('');
              setShowStudentDropdown(false);
              setShowStaffDropdown(false);
              setShowDepartmentDropdown(false);
            }}
            className="px-2.5 py-1.5 rounded font-medium transition flex items-center gap-1 text-xs whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
          >
            <Plus size={12} />
            Add Student
          </button>
          <button
            onClick={() => {
              setShowModal(true);
              setActiveButton('STAFF');
              setFormData({ type: 'STAFF', classId: '', studentId: '', departmentId: '', staffId: '', identifier: '', route: '', station: '', vehicle: '' });
              setFilteredStudents([]);
              setFilteredStaff([]);
              setStudentSearchTerm('');
              setStaffSearchTerm('');
              setDepartmentSearchTerm('');
              setShowStudentDropdown(false);
              setShowStaffDropdown(false);
              setShowDepartmentDropdown(false);
            }}
            className="px-2.5 py-1.5 rounded font-medium transition flex items-center gap-1 text-xs whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
          >
            <Plus size={12} />
            Add Staff
          </button>
          <div className="md:w-28">
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.route_name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:w-28">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Types</option>
              <option value="STUDENT">Students</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>
          <div className="flex-1 relative w-full">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Name</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Route</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Station</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Vehicle</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Base Fare</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Discount</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Final Fare</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Type</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-3 py-6 text-center text-gray-500">
                    Loading passengers...
                  </td>
                </tr>
              ) : currentPassengers.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-3 py-6 text-center text-gray-500">
                    No passengers found
                  </td>
                </tr>
              ) : (
                currentPassengers.map((passenger, index) => {
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
                      <td className="px-3 py-2.5 border border-gray-200">{startIndex + index + 1}</td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="text-blue-600 font-medium">
                          {name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {passenger.routes?.route_name || '-'}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="text-gray-700">
                          {passenger.stations?.station_name || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {passenger.vehicles?.registration_number || '-'}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="font-semibold text-gray-700">
                          PKR {passenger.base_fare ? passenger.base_fare.toLocaleString() : '0'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="text-green-600 font-semibold">
                          {passenger.discount_percent || 0}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="font-bold text-blue-700">
                          PKR {passenger.final_fare ? passenger.final_fare.toLocaleString() : '0'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          passenger.type === 'STUDENT'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {passenger.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          passenger.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {passenger.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-1">
                          {passenger.payment_status === 'paid' ? (
                            <button
                              onClick={() => handlePrintChallan(passenger)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Print Challan"
                            >
                              <Printer size={16} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStatusChange(passenger.id, passenger.payment_status)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Mark as Paid"
                              >
                                <RefreshCw size={16} />
                              </button>
                              <button
                                onClick={() => handlePrintChallan(passenger)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Print Challan"
                              >
                                <Printer size={16} />
                              </button>
                              <button
                                onClick={() => handleEdit(passenger)}
                                className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(passenger)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredPassengers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
            <div className="text-xs text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredPassengers.length)} of {filteredPassengers.length} entries
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm font-medium rounded-lg transition ${
                          currentPage === pageNum
                            ? 'bg-blue-800 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="px-1">...</span>
                  }
                  return null
                })}
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

      {/* Add Passenger Sidebar */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={resetAddModalState}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Add {formData.type === 'STUDENT' ? 'Student' : 'Staff'}</h3>
                <p className="text-blue-200 text-xs mt-0.5">Add passenger details</p>
              </div>
              <button
                onClick={resetAddModalState}
                className="text-white hover:bg-white/10 p-1.5 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="space-y-4">
              {formData.type === 'STUDENT' ? (
                <>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Select Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.classId}
                      onChange={(e) => {
                        console.log('Class dropdown changed to:', e.target.value);
                        handleClassChange(e.target.value);
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    >
                      <option value="">Select a class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.class_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Select Student <span className="text-red-500">*</span>
                    </label>
                    <div className="relative student-dropdown-container">
                      <input
                        type="text"
                        value={studentSearchTerm}
                        onChange={(e) => {
                          setStudentSearchTerm(e.target.value)
                          if (formData.classId) {
                            setShowStudentDropdown(true)
                          }
                        }}
                        onFocus={() => {
                          if (formData.classId) {
                            setShowStudentDropdown(true)
                          }
                        }}
                        disabled={!formData.classId}
                        placeholder={formData.classId ? 'Search by name or admission number...' : 'First select a class'}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {showStudentDropdown && formData.classId && (
                        <>
                          {getFilteredStudentsForSearch().length > 0 ? (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {getFilteredStudentsForSearch().map((student) => (
                                <div
                                  key={student.id}
                                  onClick={() => handleStudentSelect(student)}
                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                                >
                                  <div className="font-medium text-gray-800 text-sm">
                                    {student.first_name} {student.last_name}
                                  </div>
                                  <div className="text-xs text-gray-600">
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
                    <div className="relative department-dropdown-container">
                      <input
                        type="text"
                        value={departmentSearchTerm}
                        onChange={(e) => {
                          setDepartmentSearchTerm(e.target.value)
                          setShowDepartmentDropdown(true)
                        }}
                        onFocus={() => setShowDepartmentDropdown(true)}
                        placeholder="Search or select department..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                      />
                      {showDepartmentDropdown && (
                        <>
                          {getFilteredDepartments().length > 0 ? (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {getFilteredDepartments().map((dept, index) => (
                                <div
                                  key={index}
                                  onClick={() => handleDepartmentSelect(dept)}
                                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                                >
                                  <div className="font-medium text-gray-800">{dept}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                              <div className="text-center text-gray-500">
                                {departmentSearchTerm
                                  ? `No departments found matching "${departmentSearchTerm}"`
                                  : 'No departments available'
                                }
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
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

              {/* Station Selection */}
              {formData.route && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Select Drop Station <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.station}
                    onChange={(e) => handleStationChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    disabled={routeStations.length === 0}
                  >
                    <option value="">
                      {routeStations.length === 0 ? 'No stations available for this route' : 'Select your drop station'}
                    </option>
                    {routeStations.map((station, index) => (
                      <option key={station.id} value={station.id}>
                        {index + 1}. {station.station_name} - PKR {station.fare?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {routeStations.length === 0 && (
                    <p className="mt-2 text-xs text-yellow-600">
                      Please add stations to this route first
                    </p>
                  )}
                </div>
              )}

              {/* Fare Calculation Display */}
              {fareCalculation.baseFare > 0 && (
                <div className="bg-white border-2 border-blue-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">₨</span>
                    </div>
                    <h4 className="font-bold text-blue-900">Fare Calculation</h4>
                  </div>

                  <div className="space-y-2.5">
                    {/* Base Fare */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Base Fare:</span>
                      <span className="text-lg font-bold text-gray-900">
                        PKR {fareCalculation.baseFare.toLocaleString()}
                      </span>
                    </div>

                    {/* Discount Input */}
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <label className="text-xs font-medium text-green-700 mb-1.5 block">Discount Percentage:</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={fareCalculation.discountPercent}
                            onChange={(e) => {
                              const newPercent = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                              const discountAmount = Math.round((fareCalculation.baseFare * newPercent) / 100)
                              const finalFare = fareCalculation.baseFare - discountAmount
                              setFareCalculation({
                                ...fareCalculation,
                                discountPercent: newPercent,
                                discountAmount,
                                finalFare
                              })
                            }}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 pr-10 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white font-bold text-green-700"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">%</span>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-xs text-green-600 font-bold whitespace-nowrap">
                            - PKR {fareCalculation.discountAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Final Fare */}
                    <div className="flex justify-between items-center bg-blue-600 -mx-4 -mb-4 px-4 py-3 rounded-b-lg mt-3">
                      <span className="text-white font-bold">Final Fare:</span>
                      <span className="text-2xl font-bold text-white">
                        PKR {fareCalculation.finalFare.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                  Select Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vehicle}
                  onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                  disabled={!formData.route}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a vehicle</option>
                  {filteredVehicles.map((vehicle) => {
                    const seatInfo = vehicleSeatAvailability[vehicle.id]
                    const capacity = seatInfo?.capacity ?? vehicle.seating_capacity ?? 0
                    const occupied = seatInfo?.occupied ?? 0
                    const available = seatInfo?.available ?? (capacity > 0 ? capacity - occupied : 999)
                    const isFull = seatInfo?.isFull ?? (capacity > 0 && occupied >= capacity)
                    const hasCapacityLimit = capacity > 0

                    return (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                        disabled={isFull}
                      >
                        {vehicle.registration_number} - {
                          isFull
                            ? 'FULL'
                            : hasCapacityLimit
                              ? `${available}/${capacity} seats available`
                              : 'Unlimited seats'
                        }
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 px-6 py-3 bg-white">
            <div className="flex gap-2 justify-end">
              <button
                onClick={resetAddModalState}
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
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowEditModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
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
                  Select Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vehicle}
                  onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                  disabled={!formData.route}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a vehicle</option>
                  {filteredVehicles.map((vehicle) => {
                    const seatInfo = vehicleSeatAvailability[vehicle.id]
                    const capacity = seatInfo?.capacity ?? vehicle.seating_capacity ?? 0
                    const occupied = seatInfo?.occupied ?? 0
                    const available = seatInfo?.available ?? (capacity > 0 ? capacity - occupied : 999)
                    const isFull = seatInfo?.isFull ?? (capacity > 0 && occupied >= capacity)
                    const hasCapacityLimit = capacity > 0

                    return (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                        disabled={isFull}
                      >
                        {vehicle.registration_number} - {
                          isFull
                            ? 'FULL'
                            : hasCapacityLimit
                              ? `${available}/${capacity} seats available`
                              : 'Unlimited seats'
                        }
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Station Selection */}
              {routeStations.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Select Drop Station <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.station}
                    onChange={handleStationChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select a station</option>
                    {routeStations.map((station, index) => (
                      <option key={station.id} value={station.id}>
                        {index + 1}. {station.station_name} - PKR {station.fare?.toLocaleString() || '0'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fare Calculation Display */}
              {formData.station && fareCalculation.baseFare > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-600 text-white p-2 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-blue-900 font-bold text-base">Fare Calculation</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                      <span className="text-gray-700 font-medium">Base Fare:</span>
                      <span className="text-gray-900 font-bold text-lg">PKR {fareCalculation.baseFare.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-gray-700 font-medium min-w-[140px]">Discount Percentage:</label>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={fareCalculation.discountPercent}
                            onChange={(e) => {
                              const newPercent = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                              const discountAmount = Math.round((fareCalculation.baseFare * newPercent) / 100)
                              const finalFare = fareCalculation.baseFare - discountAmount
                              setFareCalculation({
                                ...fareCalculation,
                                discountPercent: newPercent,
                                discountAmount,
                                finalFare
                              })
                            }}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 pr-10 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white font-bold text-green-700"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">%</span>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-xs text-green-600 font-bold whitespace-nowrap">
                            - PKR {fareCalculation.discountAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t-2 border-blue-300 bg-blue-600 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                      <span className="text-white font-bold text-base">Final Fare:</span>
                      <span className="text-white font-black text-2xl">PKR {fareCalculation.finalFare.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                />
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
                Update Passenger
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
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowDeleteModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
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

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}