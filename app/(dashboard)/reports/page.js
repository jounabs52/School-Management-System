'use client'

import { useState, useEffect, useCallback } from 'react'
import { getUserFromCookie } from '@/lib/clientAuth'
import PermissionGuard from '@/components/PermissionGuard'
import {
  BarChart3,
  CreditCard,
  FileText,
  DollarSign,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  Users,
  GraduationCap,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Bus
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getPdfSettings, hexToRgb, getMarginValues, getCellPadding, getLineWidth, getLogoSize, getAutoTableStyles } from '@/lib/pdfSettings'

function ReportsPageContent() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')

  // Fee Data State
  const [feeData, setFeeData] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0
  })

  // Payroll Data State
  const [payrollData, setPayrollData] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    cancelled: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    cancelledAmount: 0
  })

  // Student & Teacher Stats
  const [studentStats, setStudentStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  })

  const [teacherStats, setTeacherStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  })

  // Transport Data State
  const [transportData, setTransportData] = useState({
    total: 0,
    students: 0,
    staff: 0,
    paid: 0,
    pending: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalVehicles: 0,
    totalRoutes: 0
  })

  const [selectedMonth, setSelectedMonth] = useState(() => (new Date().getMonth() + 1).toString())
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString())
  const [monthlyFeeData, setMonthlyFeeData] = useState([])
  const [monthlyPayrollData, setMonthlyPayrollData] = useState([])
  const [monthlyTransportData, setMonthlyTransportData] = useState([])
  const [allYearData, setAllYearData] = useState([])
  const [allPayrollData, setAllPayrollData] = useState([])
  const [allTransportData, setAllTransportData] = useState([])
  const [visibleBars, setVisibleBars] = useState({
    total: true,
    paid: true,
    pending: true,
    overdue: true
  })
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Date filter states for Overview and Earnings
  const [dateFilter, setDateFilter] = useState('all') // 'all', 'today', 'week', '15days', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ]

  const years = (() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => (currentYear - i).toString())
  })()

  // Helper function to get date range based on filter
  const getDateRange = () => {
    const now = new Date()
    let startDate = null
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        break
      case '15days':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 15)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        }
        break
      case 'all':
      default:
        return { startDate: null, endDate: null }
    }

    return { startDate, endDate }
  }

  // Filter data by date range
  const filterByDateRange = (data, dateField = 'created_at') => {
    const { startDate, endDate } = getDateRange()

    if (!startDate || !endDate) {
      return data
    }

    return data.filter(item => {
      const itemDate = new Date(item[dateField])
      return itemDate >= startDate && itemDate <= endDate
    })
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

  // Fetch all data on initial load
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchAllData()
    }
  }, [currentUser])

  // Real-time subscription
  useEffect(() => {
    if (!currentUser?.school_id || !supabase) return

    const salarySubscription = supabase
      .channel('salary_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'salary_payments',
          filter: `school_id=eq.${currentUser.school_id}`
        },
        () => {
          setIsRealTimeActive(true)
          setLastUpdated(new Date())
          fetchPayrollDataRealtime()
          setTimeout(() => setIsRealTimeActive(false), 2000)
        }
      )
      .subscribe()

    const feeSubscription = supabase
      .channel('fee_challans_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fee_challans',
          filter: `school_id=eq.${currentUser.school_id}`
        },
        () => {
          setIsRealTimeActive(true)
          setLastUpdated(new Date())
          fetchFeeDataRealtime()
          setTimeout(() => setIsRealTimeActive(false), 2000)
        }
      )
      .subscribe()

    const studentSubscription = supabase
      .channel('students_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `school_id=eq.${currentUser.school_id}`
        },
        () => {
          setIsRealTimeActive(true)
          setLastUpdated(new Date())
          fetchStudentDataRealtime()
          setTimeout(() => setIsRealTimeActive(false), 2000)
        }
      )
      .subscribe()

    const teacherSubscription = supabase
      .channel('staff_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff',
          filter: `school_id=eq.${currentUser.school_id}`
        },
        () => {
          setIsRealTimeActive(true)
          setLastUpdated(new Date())
          fetchTeacherDataRealtime()
          setTimeout(() => setIsRealTimeActive(false), 2000)
        }
      )
      .subscribe()

    const passengersSubscription = supabase
      .channel('passengers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'passengers',
          filter: `school_id=eq.${currentUser.school_id}`
        },
        () => {
          setIsRealTimeActive(true)
          setLastUpdated(new Date())
          fetchTransportDataRealtime()
          setTimeout(() => setIsRealTimeActive(false), 2000)
        }
      )
      .subscribe()

    const vehiclesSubscription = supabase
      .channel('vehicles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `school_id=eq.${currentUser.school_id}`
        },
        () => {
          setIsRealTimeActive(true)
          setLastUpdated(new Date())
          fetchTransportDataRealtime()
          setTimeout(() => setIsRealTimeActive(false), 2000)
        }
      )
      .subscribe()

    const routesSubscription = supabase
      .channel('routes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'routes',
          filter: `school_id=eq.${currentUser.school_id}`
        },
        () => {
          setIsRealTimeActive(true)
          setLastUpdated(new Date())
          fetchTransportDataRealtime()
          setTimeout(() => setIsRealTimeActive(false), 2000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(salarySubscription)
      supabase.removeChannel(feeSubscription)
      supabase.removeChannel(studentSubscription)
      supabase.removeChannel(teacherSubscription)
      supabase.removeChannel(passengersSubscription)
      supabase.removeChannel(vehiclesSubscription)
      supabase.removeChannel(routesSubscription)
    }
  }, [currentUser])

  // Recalculate when filters change
  useEffect(() => {
    if (allYearData.length > 0) {
      calculateMonthData()
    }
    if (allPayrollData.length > 0) {
      calculatePayrollMonthData()
    }
    if (allTransportData.length > 0) {
      calculateTransportMonthData()
    }
  }, [selectedMonth, selectedYear, allYearData, allPayrollData, allTransportData, dateFilter, customStartDate, customEndDate])

  const fetchAllData = useCallback(async (showLoader = true) => {
    if (!currentUser?.school_id || !supabase) {
      return
    }

    if (showLoader) {
      setLoading(true)
    }

    try {
      // Parallel fetch for better performance
      const [feeResult, salaryResult, studentResult, teacherResult, transportResult, vehiclesResult, routesResult] = await Promise.all([
        supabase
          .from('fee_challans')
          .select('total_amount, status, created_at')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id),
        supabase
          .from('salary_payments')
          .select('net_salary, status, created_at')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id),
        supabase
          .from('students')
          .select('status')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id),
        supabase
          .from('staff')
          .select('status')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id),
        supabase
          .from('passengers')
          .select('payment_status, student_id, staff_id, created_at, final_fare, type')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id)
          .eq('status', 'active'),
        supabase
          .from('vehicles')
          .select('id')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id)
          .eq('status', 'active'),
        supabase
          .from('routes')
          .select('id')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id)
          .eq('status', 'active')
      ])

      if (!feeResult.error && feeResult.data) {
        setAllYearData(feeResult.data)
      }

      if (!salaryResult.error && salaryResult.data) {
        setAllPayrollData(salaryResult.data)
      }

      if (!studentResult.error && studentResult.data) {
        setStudentStats({
          total: studentResult.data.length,
          active: studentResult.data.filter(s => s.status === 'active').length,
          inactive: studentResult.data.filter(s => s.status === 'inactive').length
        })
      }

      if (!teacherResult.error && teacherResult.data) {
        setTeacherStats({
          total: teacherResult.data.length,
          active: teacherResult.data.filter(t => t.status === 'active').length,
          inactive: teacherResult.data.filter(t => t.status === 'inactive').length
        })
      }

      if (transportResult.error) {
        console.error('Error fetching transport data:', transportResult.error)
      }

      if (!transportResult.error && transportResult.data) {
        setAllTransportData(transportResult.data)

        const totalPassengers = transportResult.data.length
        const studentPassengers = transportResult.data.filter(p => p.student_id).length
        const staffPassengers = transportResult.data.filter(p => p.staff_id).length
        const paidPassengers = transportResult.data.filter(p => p.payment_status === 'paid').length
        const pendingPassengers = transportResult.data.filter(p => p.payment_status === 'pending').length

        // Calculate amounts based on final_fare
        const paidAmount = transportResult.data
          .filter(p => p.payment_status === 'paid')
          .reduce((sum, p) => sum + (parseFloat(p.final_fare) || 0), 0)
        const pendingAmount = transportResult.data
          .filter(p => p.payment_status === 'pending')
          .reduce((sum, p) => sum + (parseFloat(p.final_fare) || 0), 0)
        const totalAmount = paidAmount + pendingAmount

        setTransportData({
          total: totalPassengers,
          students: studentPassengers,
          staff: staffPassengers,
          paid: paidPassengers,
          pending: pendingPassengers,
          totalAmount,
          paidAmount,
          pendingAmount,
          totalVehicles: vehiclesResult.data?.length || 0,
          totalRoutes: routesResult.data?.length || 0
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }, [currentUser])

  const fetchPayrollDataRealtime = async () => {
    if (!currentUser?.school_id || !supabase) return

    try {
      const { data: salaries, error } = await supabase
        .from('salary_payments')
        .select('net_salary, status, created_at')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)

      if (!error && salaries) {
        setAllPayrollData(salaries)
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error)
    }
  }

  const fetchFeeDataRealtime = async () => {
    if (!currentUser?.school_id || !supabase) return

    try {
      const { data: feeChallans, error } = await supabase
        .from('fee_challans')
        .select('total_amount, status, created_at')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)

      if (!error && feeChallans) {
        setAllYearData(feeChallans)
      }
    } catch (error) {
      console.error('Error fetching fee data:', error)
    }
  }

  const fetchStudentDataRealtime = async () => {
    if (!currentUser?.school_id || !supabase) return

    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('status')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)

      if (!error && students) {
        setStudentStats({
          total: students.length,
          active: students.filter(s => s.status === 'active').length,
          inactive: students.filter(s => s.status === 'inactive').length
        })
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
    }
  }

  const fetchTeacherDataRealtime = async () => {
    if (!currentUser?.school_id || !supabase) return

    try {
      const { data: teachers, error } = await supabase
        .from('staff')
        .select('status')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)

      if (!error && teachers) {
        setTeacherStats({
          total: teachers.length,
          active: teachers.filter(t => t.status === 'active').length,
          inactive: teachers.filter(t => t.status === 'inactive').length
        })
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error)
    }
  }

  const fetchTransportDataRealtime = async () => {
    if (!currentUser?.school_id || !supabase) return

    try {
      const [transportResult, vehiclesResult, routesResult] = await Promise.all([
        supabase
          .from('passengers')
          .select('payment_status, student_id, staff_id, created_at, final_fare, type')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id)
          .eq('status', 'active'),
        supabase
          .from('vehicles')
          .select('id')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id)
          .eq('status', 'active'),
        supabase
          .from('routes')
          .select('id')
          .eq('school_id', currentUser.school_id)
          .eq('user_id', currentUser.id)
          .eq('status', 'active')
      ])

      if (!transportResult.error && transportResult.data) {
        setAllTransportData(transportResult.data)

        const totalPassengers = transportResult.data.length
        const studentPassengers = transportResult.data.filter(p => p.student_id).length
        const staffPassengers = transportResult.data.filter(p => p.staff_id).length
        const paidPassengers = transportResult.data.filter(p => p.payment_status === 'paid').length
        const pendingPassengers = transportResult.data.filter(p => p.payment_status === 'pending').length

        const paidAmount = transportResult.data
          .filter(p => p.payment_status === 'paid')
          .reduce((sum, p) => sum + (parseFloat(p.final_fare) || 0), 0)
        const pendingAmount = transportResult.data
          .filter(p => p.payment_status === 'pending')
          .reduce((sum, p) => sum + (parseFloat(p.final_fare) || 0), 0)
        const totalAmount = paidAmount + pendingAmount

        setTransportData({
          total: totalPassengers,
          students: studentPassengers,
          staff: staffPassengers,
          paid: paidPassengers,
          pending: pendingPassengers,
          totalAmount,
          paidAmount,
          pendingAmount,
          totalVehicles: vehiclesResult.data?.length || 0,
          totalRoutes: routesResult.data?.length || 0
        })
      }
    } catch (error) {
      console.error('Error fetching transport data:', error)
    }
  }

  const calculateMonthData = () => {
    if (allYearData.length === 0) return

    // Apply date range filter first (applies to ALL sections)
    let dateFilteredData = filterByDateRange(allYearData)

    let yearFilteredData = dateFilteredData
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear)
      yearFilteredData = dateFilteredData.filter(challan => {
        const date = new Date(challan.created_at)
        return date.getFullYear() === year
      })
    }

    let filteredChallans = yearFilteredData
    if (selectedMonth !== 'all') {
      const monthNum = parseInt(selectedMonth)
      filteredChallans = yearFilteredData.filter(challan => {
        const date = new Date(challan.created_at)
        return date.getMonth() + 1 === monthNum
      })
    }

    const totalSlips = filteredChallans.length
    const paidSlips = filteredChallans.filter(c => c.status === 'paid').length
    const overdueSlips = filteredChallans.filter(c => c.status === 'overdue').length
    const pendingSlips = filteredChallans.filter(c => c.status === 'pending').length

    const totalAmount = filteredChallans.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0)
    const paidAmount = filteredChallans.filter(c => c.status === 'paid').reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0)
    const overdueAmount = filteredChallans.filter(c => c.status === 'overdue').reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0)
    const pendingAmount = filteredChallans.filter(c => c.status === 'pending').reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0)

    setFeeData({
      total: totalSlips,
      paid: paidSlips,
      pending: pendingSlips,
      overdue: overdueSlips,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount
    })

    if (selectedMonth !== 'all') {
      const monthNum = parseInt(selectedMonth)
      const year = parseInt(selectedYear)
      const daysInMonth = new Date(year, monthNum, 0).getDate()

      const dailyData = Array(daysInMonth).fill(0).map((_, i) => ({
        month: (i + 1).toString(),
        total: 0,
        paid: 0,
        overdue: 0,
        pending: 0
      }))

      filteredChallans.forEach(challan => {
        const date = new Date(challan.created_at)
        const day = date.getDate()
        const dayIndex = day - 1

        if (dayIndex >= 0 && dayIndex < daysInMonth) {
          dailyData[dayIndex].total += 1
          if (challan.status === 'paid') {
            dailyData[dayIndex].paid += 1
          } else if (challan.status === 'overdue') {
            dailyData[dayIndex].overdue += 1
          } else if (challan.status === 'pending') {
            dailyData[dayIndex].pending += 1
          }
        }
      })

      setMonthlyFeeData(dailyData)
    } else {
      const monthlyData = Array(12).fill(0).map((_, i) => ({
        month: months[i + 1].label,
        total: 0,
        paid: 0,
        overdue: 0,
        pending: 0
      }))

      yearFilteredData.forEach(challan => {
        const date = new Date(challan.created_at)
        const monthIndex = date.getMonth()
        monthlyData[monthIndex].total += 1
        if (challan.status === 'paid') {
          monthlyData[monthIndex].paid += 1
        } else if (challan.status === 'overdue') {
          monthlyData[monthIndex].overdue += 1
        } else if (challan.status === 'pending') {
          monthlyData[monthIndex].pending += 1
        }
      })

      setMonthlyFeeData(monthlyData)
    }
  }

  const calculatePayrollMonthData = () => {
    if (allPayrollData.length === 0) {
      setMonthlyPayrollData([])
      return
    }

    // Apply date range filter first (applies to ALL sections)
    let dateFilteredData = filterByDateRange(allPayrollData)

    let yearFilteredData = dateFilteredData
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear)
      yearFilteredData = dateFilteredData.filter(salary => {
        const date = new Date(salary.created_at)
        return date.getFullYear() === year
      })
    }

    let filteredSalaries = yearFilteredData
    if (selectedMonth !== 'all') {
      const monthNum = parseInt(selectedMonth)
      filteredSalaries = yearFilteredData.filter(salary => {
        const date = new Date(salary.created_at)
        return date.getMonth() + 1 === monthNum
      })
    }

    const totalPayments = filteredSalaries.length
    const paidPayments = filteredSalaries.filter(s => s.status === 'paid').length
    const cancelledPayments = filteredSalaries.filter(s => s.status === 'cancelled').length
    const pendingPayments = filteredSalaries.filter(s => s.status === 'pending').length

    const totalAmount = filteredSalaries.reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0)
    const paidAmount = filteredSalaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0)
    const cancelledAmount = filteredSalaries.filter(s => s.status === 'cancelled').reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0)
    const pendingAmount = filteredSalaries.filter(s => s.status === 'pending').reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0)

    setPayrollData({
      total: totalPayments,
      paid: paidPayments,
      pending: pendingPayments,
      cancelled: cancelledPayments,
      totalAmount,
      paidAmount,
      pendingAmount,
      cancelledAmount
    })

    if (selectedMonth !== 'all') {
      const monthNum = parseInt(selectedMonth)
      const year = parseInt(selectedYear)
      const daysInMonth = new Date(year, monthNum, 0).getDate()

      const dailyData = Array(daysInMonth).fill(0).map((_, i) => ({
        month: (i + 1).toString(),
        total: 0,
        paid: 0,
        cancelled: 0,
        pending: 0
      }))

      filteredSalaries.forEach(salary => {
        const date = new Date(salary.created_at)
        const day = date.getDate()
        const dayIndex = day - 1

        if (dayIndex >= 0 && dayIndex < daysInMonth) {
          dailyData[dayIndex].total += 1
          if (salary.status === 'paid') {
            dailyData[dayIndex].paid += 1
          } else if (salary.status === 'cancelled') {
            dailyData[dayIndex].cancelled += 1
          } else if (salary.status === 'pending') {
            dailyData[dayIndex].pending += 1
          }
        }
      })

      setMonthlyPayrollData(dailyData)
    } else {
      const monthlyData = Array(12).fill(0).map((_, i) => ({
        month: months[i + 1].label,
        total: 0,
        paid: 0,
        cancelled: 0,
        pending: 0
      }))

      yearFilteredData.forEach(salary => {
        const date = new Date(salary.created_at)
        const monthIndex = date.getMonth()
        monthlyData[monthIndex].total += 1
        if (salary.status === 'paid') {
          monthlyData[monthIndex].paid += 1
        } else if (salary.status === 'cancelled') {
          monthlyData[monthIndex].cancelled += 1
        } else if (salary.status === 'pending') {
          monthlyData[monthIndex].pending += 1
        }
      })

      setMonthlyPayrollData(monthlyData)
    }
  }

  const calculateTransportMonthData = () => {
    if (allTransportData.length === 0) {
      setMonthlyTransportData([])
      return
    }

    // Apply date range filter first (applies to ALL sections)
    let dateFilteredData = filterByDateRange(allTransportData)

    let yearFilteredData = dateFilteredData
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear)
      yearFilteredData = dateFilteredData.filter(passenger => {
        const date = new Date(passenger.created_at)
        return date.getFullYear() === year
      })
    }

    let filteredPassengers = yearFilteredData
    if (selectedMonth !== 'all') {
      const monthNum = parseInt(selectedMonth)
      filteredPassengers = yearFilteredData.filter(passenger => {
        const date = new Date(passenger.created_at)
        return date.getMonth() + 1 === monthNum
      })
    }

    const totalPassengers = filteredPassengers.length
    const paidPassengers = filteredPassengers.filter(p => p.payment_status === 'paid').length
    const pendingPassengers = filteredPassengers.filter(p => p.payment_status === 'pending').length
    const studentPassengers = filteredPassengers.filter(p => p.student_id).length
    const staffPassengers = filteredPassengers.filter(p => p.staff_id).length

    const paidAmount = filteredPassengers
      .filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + (parseFloat(p.final_fare) || 0), 0)
    const pendingAmount = filteredPassengers
      .filter(p => p.payment_status === 'pending')
      .reduce((sum, p) => sum + (parseFloat(p.final_fare) || 0), 0)
    const totalAmount = paidAmount + pendingAmount

    setTransportData(prev => ({
      ...prev,
      total: totalPassengers,
      students: studentPassengers,
      staff: staffPassengers,
      paid: paidPassengers,
      pending: pendingPassengers,
      totalAmount,
      paidAmount,
      pendingAmount
    }))

    if (selectedMonth !== 'all') {
      const monthNum = parseInt(selectedMonth)
      const year = parseInt(selectedYear)
      const daysInMonth = new Date(year, monthNum, 0).getDate()

      const dailyData = Array(daysInMonth).fill(0).map((_, i) => ({
        month: (i + 1).toString(),
        total: 0,
        paid: 0,
        pending: 0,
        students: 0,
        staff: 0
      }))

      filteredPassengers.forEach(passenger => {
        const date = new Date(passenger.created_at)
        const day = date.getDate()
        const dayIndex = day - 1

        if (dayIndex >= 0 && dayIndex < daysInMonth) {
          dailyData[dayIndex].total += 1
          if (passenger.payment_status === 'paid') {
            dailyData[dayIndex].paid += 1
          } else if (passenger.payment_status === 'pending') {
            dailyData[dayIndex].pending += 1
          }
          if (passenger.student_id) {
            dailyData[dayIndex].students += 1
          } else if (passenger.staff_id) {
            dailyData[dayIndex].staff += 1
          }
        }
      })

      setMonthlyTransportData(dailyData)
    } else {
      const monthlyData = Array(12).fill(0).map((_, i) => ({
        month: months[i + 1].label,
        total: 0,
        paid: 0,
        pending: 0,
        students: 0,
        staff: 0
      }))

      yearFilteredData.forEach(passenger => {
        const date = new Date(passenger.created_at)
        const monthIndex = date.getMonth()
        monthlyData[monthIndex].total += 1
        if (passenger.payment_status === 'paid') {
          monthlyData[monthIndex].paid += 1
        } else if (passenger.payment_status === 'pending') {
          monthlyData[monthIndex].pending += 1
        }
        if (passenger.student_id) {
          monthlyData[monthIndex].students += 1
        } else if (passenger.staff_id) {
          monthlyData[monthIndex].staff += 1
        }
      })

      setMonthlyTransportData(monthlyData)
    }
  }

  const handleManualRefresh = async () => {
    setIsRealTimeActive(true)
    setLastUpdated(new Date())
    await fetchAllData(false) // Don't show full page loader
    setTimeout(() => setIsRealTimeActive(false), 1000)
  }

  const toggleBarVisibility = (barType) => {
    setVisibleBars(prev => ({
      ...prev,
      [barType]: !prev[barType]
    }))
  }

  // Section-specific CSV export functions
  const exportOverviewCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Overview Report\n\n"
    csvContent += `Report Period: ${dateFilter === 'all' ? 'All Time' : dateFilter}\n\n`

    csvContent += "Student Statistics\n"
    csvContent += "Total,Active,Inactive\n"
    csvContent += `${studentStats.total},${studentStats.active},${studentStats.inactive}\n\n`

    csvContent += "Teacher Statistics\n"
    csvContent += "Total,Active,Inactive\n"
    csvContent += `${teacherStats.total},${teacherStats.active},${teacherStats.inactive}\n\n`

    csvContent += "Fee Summary\n"
    csvContent += "Status,Count,Amount\n"
    csvContent += `Total,${feeData.total},${feeData.totalAmount}\n`
    csvContent += `Paid,${feeData.paid},${feeData.paidAmount}\n`
    csvContent += `Pending,${feeData.pending},${feeData.pendingAmount}\n`
    csvContent += `Overdue,${feeData.overdue},${feeData.overdueAmount}\n\n`

    csvContent += "Payroll Summary\n"
    csvContent += "Status,Count,Amount\n"
    csvContent += `Total,${payrollData.total},${payrollData.totalAmount}\n`
    csvContent += `Paid,${payrollData.paid},${payrollData.paidAmount}\n`
    csvContent += `Pending,${payrollData.pending},${payrollData.pendingAmount}\n\n`

    csvContent += "Transport Summary\n"
    csvContent += "Category,Count,Amount\n"
    csvContent += `Total Passengers,${transportData.total},${transportData.totalAmount}\n`
    csvContent += `Paid,${transportData.paid},${transportData.paidAmount}\n`
    csvContent += `Pending,${transportData.pending},${transportData.pendingAmount}\n`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `overview-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportFeeAnalyticsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Fee Analytics Report\n\n"
    csvContent += `Report Period: ${dateFilter === 'all' ? 'All Time' : dateFilter}\n\n`
    csvContent += "Status,Count,Amount\n"
    csvContent += `Total,${feeData.total},${feeData.totalAmount}\n`
    csvContent += `Paid,${feeData.paid},${feeData.paidAmount}\n`
    csvContent += `Pending,${feeData.pending},${feeData.pendingAmount}\n`
    csvContent += `Overdue,${feeData.overdue},${feeData.overdueAmount}\n`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `fee-analytics-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportPayrollAnalyticsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Payroll Analytics Report\n\n"
    csvContent += `Report Period: ${dateFilter === 'all' ? 'All Time' : dateFilter}\n\n`
    csvContent += "Status,Count,Amount\n"
    csvContent += `Total,${payrollData.total},${payrollData.totalAmount}\n`
    csvContent += `Paid,${payrollData.paid},${payrollData.paidAmount}\n`
    csvContent += `Pending,${payrollData.pending},${payrollData.pendingAmount}\n`
    csvContent += `Cancelled,${payrollData.cancelled},${payrollData.cancelledAmount}\n`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `payroll-analytics-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportTransportAnalyticsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Transport Analytics Report\n\n"
    csvContent += `Report Period: ${dateFilter === 'all' ? 'All Time' : dateFilter}\n\n`
    csvContent += "Category,Count,Amount\n"
    csvContent += `Total Passengers,${transportData.total},${transportData.totalAmount}\n`
    csvContent += `Students,${transportData.students},-\n`
    csvContent += `Staff,${transportData.staff},-\n`
    csvContent += `Paid,${transportData.paid},${transportData.paidAmount}\n`
    csvContent += `Pending,${transportData.pending},${transportData.pendingAmount}\n\n`
    csvContent += "Infrastructure\n"
    csvContent += "Type,Count\n"
    csvContent += `Vehicles,${transportData.totalVehicles}\n`
    csvContent += `Routes,${transportData.totalRoutes}\n`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `transport-analytics-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportEarningsCSV = () => {
    const totalEarnings = feeData.paidAmount + transportData.paidAmount
    const totalExpenses = payrollData.paidAmount
    const netRevenue = totalEarnings - totalExpenses

    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Earnings Report\n\n"
    csvContent += `Report Period: ${dateFilter === 'all' ? 'All Time' : dateFilter}\n\n`
    csvContent += "Category,Amount\n"
    csvContent += `Fee Collection,${feeData.paidAmount}\n`
    csvContent += `Transport Revenue,${transportData.paidAmount}\n`
    csvContent += `Total Earnings,${totalEarnings}\n`
    csvContent += `Payroll Expenses,${totalExpenses}\n`
    csvContent += `Net Revenue,${netRevenue}\n`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `earnings-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper function to add logo and header to PDF
  const addPDFHeaderWithLogo = async (doc, schoolData, title, pdfSettings) => {
    const pageWidth = doc.internal.pageSize.getWidth()
    const headerHeight = 35
    let yPos = 10

    // Header background
    if (pdfSettings.includeHeader) {
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor)
      doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2])
      doc.rect(0, 0, pageWidth, headerHeight, 'F')
    }

    // Add logo
    if (pdfSettings.includeLogo && schoolData.logo_url) {
      try {
        const logoSizeObj = getLogoSize(pdfSettings.logoSize)
        const currentLogoSize = logoSizeObj.width
        const logoX = 10
        const logoY = (headerHeight - currentLogoSize) / 2

        // Load and convert image to base64
        const response = await fetch(schoolData.logo_url)
        const blob = await response.blob()
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })

        // Create canvas for clipping
        const canvas = document.createElement('canvas')
        canvas.width = currentLogoSize * 10
        canvas.height = currentLogoSize * 10
        const ctx = canvas.getContext('2d')

        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = base64
        })

        // Clip based on logo style
        if (pdfSettings.logoStyle === 'circle') {
          ctx.beginPath()
          ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
        } else if (pdfSettings.logoStyle === 'rounded') {
          const radius = 20
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

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const clippedImage = canvas.toDataURL('image/png')

        doc.addImage(clippedImage, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)

        // Add border
        const borderRgb = pdfSettings.logoBorderColor ? hexToRgb(pdfSettings.logoBorderColor) : [255, 255, 255]
        if (pdfSettings.logoStyle === 'circle') {
          doc.setDrawColor(...borderRgb)
          doc.setLineWidth(0.5)
          doc.circle(logoX + currentLogoSize/2, logoY + currentLogoSize/2, currentLogoSize/2, 'S')
        } else if (pdfSettings.logoStyle === 'rounded') {
          doc.setDrawColor(...borderRgb)
          doc.setLineWidth(0.5)
          doc.roundedRect(logoX, logoY, currentLogoSize, currentLogoSize, 3, 3, 'S')
        } else {
          doc.setDrawColor(...borderRgb)
          doc.setLineWidth(0.5)
          doc.rect(logoX, logoY, currentLogoSize, currentLogoSize, 'S')
        }
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // School name and title (white text on header background)
    yPos = 15
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(schoolData.name || 'School Management System', pageWidth / 2, yPos, { align: 'center' })

    yPos += 8
    doc.setFontSize(14)
    doc.text(title, pageWidth / 2, yPos, { align: 'center' })

    yPos += 7
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' })

    // Reset text color for content
    doc.setTextColor(0, 0, 0)

    return headerHeight + 10 // Return yPos for content start
  }

  // Section-specific PDF export functions
  const exportOverviewPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const pdfSettings = getPdfSettings()

      const doc = new jsPDF('p', 'mm', pdfSettings.pageSize.toLowerCase())

      let schoolData = { name: '', address: '', phone: '', logo_url: '' }
      if (currentUser?.school_id) {
        const { data } = await supabase
          .from('schools')
          .select('name, address, phone, logo_url')
          .eq('id', currentUser.school_id)
          .single()
        if (data) schoolData = data
      }

      // Add header with logo
      let yPos = await addPDFHeaderWithLogo(doc, schoolData, 'Overview Report', pdfSettings)

      // Student Stats
      autoTable(doc, {
        startY: yPos,
        head: [['Student Statistics', 'Count']],
        body: [
          ['Total Students', studentStats.total],
          ['Active Students', studentStats.active],
          ['Inactive Students', studentStats.inactive]
        ],
        ...getAutoTableStyles(pdfSettings)
      })

      yPos = doc.lastAutoTable.finalY + 10

      // Teacher Stats
      autoTable(doc, {
        startY: yPos,
        head: [['Teacher Statistics', 'Count']],
        body: [
          ['Total Teachers', teacherStats.total],
          ['Active Teachers', teacherStats.active],
          ['Inactive Teachers', teacherStats.inactive]
        ],
        ...getAutoTableStyles(pdfSettings)
      })

      yPos = doc.lastAutoTable.finalY + 10

      // Fee Summary
      autoTable(doc, {
        startY: yPos,
        head: [['Fee Summary', 'Count', 'Amount']],
        body: [
          ['Total', feeData.total, feeData.totalAmount.toFixed(2)],
          ['Paid', feeData.paid, feeData.paidAmount.toFixed(2)],
          ['Pending', feeData.pending, feeData.pendingAmount.toFixed(2)],
          ['Overdue', feeData.overdue, feeData.overdueAmount.toFixed(2)]
        ],
        ...getAutoTableStyles(pdfSettings)
      })

      doc.save(`overview-report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const exportFeeAnalyticsPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const pdfSettings = getPdfSettings()

      const doc = new jsPDF('p', 'mm', pdfSettings.pageSize.toLowerCase())

      let schoolData = { name: '', logo_url: '' }
      if (currentUser?.school_id) {
        const { data } = await supabase
          .from('schools')
          .select('name, logo_url')
          .eq('id', currentUser.school_id)
          .single()
        if (data) schoolData = data
      }

      // Add header with logo
      let yPos = await addPDFHeaderWithLogo(doc, schoolData, 'Fee Analytics Report', pdfSettings)

      autoTable(doc, {
        startY: yPos,
        head: [['Status', 'Count', 'Amount']],
        body: [
          ['Total', feeData.total, feeData.totalAmount.toFixed(2)],
          ['Paid', feeData.paid, feeData.paidAmount.toFixed(2)],
          ['Pending', feeData.pending, feeData.pendingAmount.toFixed(2)],
          ['Overdue', feeData.overdue, feeData.overdueAmount.toFixed(2)]
        ],
        ...getAutoTableStyles(pdfSettings)
      })

      doc.save(`fee-analytics-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const exportPayrollAnalyticsPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const pdfSettings = getPdfSettings()

      const doc = new jsPDF('p', 'mm', pdfSettings.pageSize.toLowerCase())

      let schoolData = { name: '', logo_url: '' }
      if (currentUser?.school_id) {
        const { data } = await supabase
          .from('schools')
          .select('name, logo_url')
          .eq('id', currentUser.school_id)
          .single()
        if (data) schoolData = data
      }

      // Add header with logo
      let yPos = await addPDFHeaderWithLogo(doc, schoolData, 'Payroll Analytics Report', pdfSettings)

      autoTable(doc, {
        startY: yPos,
        head: [['Status', 'Count', 'Amount']],
        body: [
          ['Total', payrollData.total, payrollData.totalAmount.toFixed(2)],
          ['Paid', payrollData.paid, payrollData.paidAmount.toFixed(2)],
          ['Pending', payrollData.pending, payrollData.pendingAmount.toFixed(2)],
          ['Cancelled', payrollData.cancelled, payrollData.cancelledAmount.toFixed(2)]
        ],
        ...getAutoTableStyles(pdfSettings)
      })

      doc.save(`payroll-analytics-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const exportTransportAnalyticsPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const pdfSettings = getPdfSettings()

      const doc = new jsPDF('p', 'mm', pdfSettings.pageSize.toLowerCase())

      let schoolData = { name: '', logo_url: '' }
      if (currentUser?.school_id) {
        const { data } = await supabase
          .from('schools')
          .select('name, logo_url')
          .eq('id', currentUser.school_id)
          .single()
        if (data) schoolData = data
      }

      // Add header with logo
      let yPos = await addPDFHeaderWithLogo(doc, schoolData, 'Transport Analytics Report', pdfSettings)

      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Count', 'Amount']],
        body: [
          ['Total Passengers', transportData.total, transportData.totalAmount.toFixed(2)],
          ['Students', transportData.students, '-'],
          ['Staff', transportData.staff, '-'],
          ['Paid', transportData.paid, transportData.paidAmount.toFixed(2)],
          ['Pending', transportData.pending, transportData.pendingAmount.toFixed(2)]
        ],
        ...getAutoTableStyles(pdfSettings)
      })

      yPos = doc.lastAutoTable.finalY + 10

      autoTable(doc, {
        startY: yPos,
        head: [['Infrastructure', 'Count']],
        body: [
          ['Vehicles', transportData.totalVehicles],
          ['Routes', transportData.totalRoutes]
        ],
        ...getAutoTableStyles(pdfSettings)
      })

      doc.save(`transport-analytics-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const exportEarningsPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const pdfSettings = getPdfSettings()

      const doc = new jsPDF('p', 'mm', pdfSettings.pageSize.toLowerCase())

      let schoolData = { name: '', logo_url: '' }
      if (currentUser?.school_id) {
        const { data } = await supabase
          .from('schools')
          .select('name, logo_url')
          .eq('id', currentUser.school_id)
          .single()
        if (data) schoolData = data
      }

      const totalEarnings = feeData.paidAmount + transportData.paidAmount
      const totalExpenses = payrollData.paidAmount
      const netRevenue = totalEarnings - totalExpenses

      // Add header with logo
      let yPos = await addPDFHeaderWithLogo(doc, schoolData, 'Earnings Report', pdfSettings)

      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Amount']],
        body: [
          ['Fee Collection', feeData.paidAmount.toFixed(2)],
          ['Transport Revenue', transportData.paidAmount.toFixed(2)],
          ['Total Earnings', totalEarnings.toFixed(2)],
          ['Payroll Expenses', totalExpenses.toFixed(2)],
          ['Net Revenue', netRevenue.toFixed(2)]
        ],
        ...getAutoTableStyles(pdfSettings)
      })

      doc.save(`earnings-report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"

    if (activeSection === 'fee-analytics') {
      csvContent += "Fee Analytics Report\n\n"
      csvContent += "Status,Count,Amount\n"
      csvContent += `Total,${feeData.total},${feeData.totalAmount}\n`
      csvContent += `Paid,${feeData.paid},${feeData.paidAmount}\n`
      csvContent += `Pending,${feeData.pending},${feeData.pendingAmount}\n`
      csvContent += `Overdue,${feeData.overdue},${feeData.overdueAmount}\n`
    } else if (activeSection === 'payroll-analytics') {
      csvContent += "Payroll Analytics Report\n\n"
      csvContent += "Status,Count,Amount\n"
      csvContent += `Total,${payrollData.total},${payrollData.totalAmount}\n`
      csvContent += `Paid,${payrollData.paid},${payrollData.paidAmount}\n`
      csvContent += `Pending,${payrollData.pending},${payrollData.pendingAmount}\n`
      csvContent += `Cancelled,${payrollData.cancelled},${payrollData.cancelledAmount}\n`
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${activeSection}-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export comprehensive report to PDF
  const handleExportPDF = async () => {
    try {
      console.log('Starting PDF export...')

      // Get PDF settings
      const pdfSettings = getPdfSettings()
      console.log('PDF Settings loaded:', pdfSettings)

      // Dynamically import jsPDF and autoTable
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF(
        pdfSettings.orientation === 'landscape' ? 'l' : 'p',
        'mm',
        pdfSettings.pageSize.toLowerCase()
      )
      console.log('jsPDF initialized')

      // Fetch school data
      let schoolData = { name: '', address: '', phone: '', logo_url: '' }
      if (currentUser?.school_id) {
        const { data, error } = await supabase
          .from('schools')
          .select('name, address, phone, logo_url')
          .eq('id', currentUser.school_id)
          .single()

        if (!error && data) {
          schoolData = data
        }
      }

      const headerHeight = 35
      const logoSize = pdfSettings.includeLogo ? getLogoSize(pdfSettings.logoSize) : 25

      // Add decorative header background
      if (pdfSettings.includeHeader) {
        const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor)
        doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2])
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), headerHeight, 'F')
      }

      // Add school logo if available
      if (pdfSettings.includeLogo && schoolData.logo_url) {
        try {
          const logoX = pdfSettings.logoPosition === 'left' ? 10 :
                       pdfSettings.logoPosition === 'right' ? doc.internal.pageSize.getWidth() - logoSize - 10 :
                       (doc.internal.pageSize.getWidth() - logoSize) / 2

          const logoY = (headerHeight - logoSize) / 2

          if (pdfSettings.logoStyle === 'circle') {
            doc.addImage(
              schoolData.logo_url,
              'PNG',
              logoX,
              logoY,
              logoSize,
              logoSize,
              undefined,
              'FAST',
              0
            )
            doc.setDrawColor(255, 255, 255)
            doc.setLineWidth(0.5)
            doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'S')
          } else {
            doc.addImage(
              schoolData.logo_url,
              'PNG',
              logoX,
              logoY,
              logoSize,
              logoSize,
              undefined,
              'FAST'
            )
          }
        } catch (error) {
          console.warn('Failed to add logo:', error)
        }
      }

      // Add school header info
      const pageWidth = doc.internal.pageSize.getWidth()
      const centerX = pageWidth / 2

      doc.setTextColor(255, 255, 255)
      doc.setFont(undefined, 'bold')
      doc.setFontSize(18)
      doc.text(schoolData.name || 'School Management System', centerX, 12, { align: 'center' })

      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      if (schoolData.address) {
        doc.text(schoolData.address, centerX, 18, { align: 'center' })
      }
      if (schoolData.phone) {
        doc.text(`Phone: ${schoolData.phone}`, centerX, 23, { align: 'center' })
      }

      // Report title
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('School Management Report', centerX, 30, { align: 'center' })

      // Reset colors for content
      const textColor = hexToRgb(pdfSettings.textColor)
      doc.setTextColor(textColor[0], textColor[1], textColor[2])

      let currentY = headerHeight + 10

      // Add date range/filter information
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      const dateRangeText = dateFilter === 'all' ? 'All Time' :
                           dateFilter === 'today' ? 'Today' :
                           dateFilter === 'week' ? 'Last 7 Days' :
                           dateFilter === '15days' ? 'Last 15 Days' :
                           dateFilter === 'month' ? 'Last 30 Days' :
                           dateFilter === 'custom' && customStartDate && customEndDate ?
                           `${customStartDate} to ${customEndDate}` : 'All Time'

      doc.text(`Report Period: ${dateRangeText}`, 10, currentY)
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 10, currentY, { align: 'right' })
      currentY += 10

      // Get autoTable styles
      const autoTableStyles = getAutoTableStyles(pdfSettings)
      const margins = getMarginValues(pdfSettings.margin)

      // Section 1: Fee Statistics
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Fee Statistics', 10, currentY)
      currentY += 7

      autoTable(doc, {
        startY: currentY,
        head: [['Status', 'Count', 'Amount (Rs.)']],
        body: [
          ['Total', feeData.total.toString(), feeData.totalAmount.toFixed(2)],
          ['Paid', feeData.paid.toString(), feeData.paidAmount.toFixed(2)],
          ['Pending', feeData.pending.toString(), feeData.pendingAmount.toFixed(2)],
          ['Overdue', feeData.overdue.toString(), feeData.overdueAmount.toFixed(2)]
        ],
        theme: autoTableStyles.theme,
        styles: autoTableStyles.styles,
        headStyles: autoTableStyles.headStyles,
        alternateRowStyles: autoTableStyles.alternateRowStyles,
        margin: { left: margins.left, right: margins.right }
      })

      currentY = doc.lastAutoTable.finalY + 10

      // Section 2: Payroll Statistics
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Payroll Statistics', 10, currentY)
      currentY += 7

      autoTable(doc, {
        startY: currentY,
        head: [['Status', 'Count', 'Amount (Rs.)']],
        body: [
          ['Total', payrollData.total.toString(), payrollData.totalAmount.toFixed(2)],
          ['Paid', payrollData.paid.toString(), payrollData.paidAmount.toFixed(2)],
          ['Pending', payrollData.pending.toString(), payrollData.pendingAmount.toFixed(2)],
          ['Cancelled', payrollData.cancelled.toString(), payrollData.cancelledAmount.toFixed(2)]
        ],
        theme: autoTableStyles.theme,
        styles: autoTableStyles.styles,
        headStyles: autoTableStyles.headStyles,
        alternateRowStyles: autoTableStyles.alternateRowStyles,
        margin: { left: margins.left, right: margins.right }
      })

      currentY = doc.lastAutoTable.finalY + 10

      // Section 3: Student & Teacher Statistics
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Student & Teacher Statistics', 10, currentY)
      currentY += 7

      autoTable(doc, {
        startY: currentY,
        head: [['Category', 'Total', 'Active', 'Inactive']],
        body: [
          ['Students', studentStats.total.toString(), studentStats.active.toString(), studentStats.inactive.toString()],
          ['Teachers', teacherStats.total.toString(), teacherStats.active.toString(), teacherStats.inactive.toString()]
        ],
        theme: autoTableStyles.theme,
        styles: autoTableStyles.styles,
        headStyles: autoTableStyles.headStyles,
        alternateRowStyles: autoTableStyles.alternateRowStyles,
        margin: { left: margins.left, right: margins.right }
      })

      currentY = doc.lastAutoTable.finalY + 10

      // Section 4: Transport Statistics
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Transport Statistics', 10, currentY)
      currentY += 7

      autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: [
          ['Total Passengers', transportData.total.toString()],
          ['Students', transportData.students.toString()],
          ['Staff', transportData.staff.toString()],
          ['Paid', transportData.paid.toString()],
          ['Pending', transportData.pending.toString()],
          ['Total Amount (Rs.)', transportData.totalAmount.toFixed(2)],
          ['Paid Amount (Rs.)', transportData.paidAmount.toFixed(2)],
          ['Pending Amount (Rs.)', transportData.pendingAmount.toFixed(2)],
          ['Total Vehicles', transportData.totalVehicles.toString()],
          ['Total Routes', transportData.totalRoutes.toString()]
        ],
        theme: autoTableStyles.theme,
        styles: autoTableStyles.styles,
        headStyles: autoTableStyles.headStyles,
        alternateRowStyles: autoTableStyles.alternateRowStyles,
        margin: { left: margins.left, right: margins.right }
      })

      // Add footer
      if (pdfSettings.includeFooter) {
        const pageCount = doc.internal.getNumberOfPages()
        const footerColor = hexToRgb(pdfSettings.headerBackgroundColor)

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)

          doc.setDrawColor(footerColor[0], footerColor[1], footerColor[2])
          doc.setLineWidth(0.5)
          doc.line(10, doc.internal.pageSize.getHeight() - 15, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 15)

          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.setFont(undefined, 'normal')

          const leftFooterText = pdfSettings.footerText || 'School Management Report'
          doc.text(
            leftFooterText,
            10,
            doc.internal.pageSize.getHeight() - 8
          )

          if (pdfSettings.includeDate) {
            doc.text(
              `Generated on ${new Date().toLocaleDateString()}`,
              doc.internal.pageSize.getWidth() / 2,
              doc.internal.pageSize.getHeight() - 8,
              { align: 'center' }
            )
          }

          if (pdfSettings.includePageNumbers) {
            doc.text(
              `Page ${i} of ${pageCount}`,
              doc.internal.pageSize.getWidth() - 10,
              doc.internal.pageSize.getHeight() - 8,
              { align: 'right' }
            )
          }
        }
      }

      // Save the PDF
      const filename = `school-report-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      console.log('PDF saved:', filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      console.error('Error details:', error.message, error.stack)
      alert(`Failed to generate PDF: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <BarChart3 className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Analytics</h3>
          <p className="text-sm text-gray-600">Preparing your comprehensive reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6 max-w-[1800px] mx-auto">
        {/* Enhanced Header */}
        <div className="mb-3">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Reports & Analytics</h1>
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Real-time insights
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <button
                  onClick={async () => {
                    try {
                      if (activeSection === 'overview') await exportOverviewPDF()
                      else if (activeSection === 'fee-analytics') await exportFeeAnalyticsPDF()
                      else if (activeSection === 'payroll-analytics') await exportPayrollAnalyticsPDF()
                      else if (activeSection === 'transport-analytics') await exportTransportAnalyticsPDF()
                      else if (activeSection === 'earning-report') await exportEarningsPDF()
                    } catch (error) {
                      console.error('Error exporting PDF:', error)
                      alert('Failed to generate PDF. Please try again.')
                    }
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm bg-[#DC2626] text-white hover:bg-red-700"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline text-xs">PDF</span>
                </button>
                <button
                  onClick={() => {
                    try {
                      if (activeSection === 'overview') exportOverviewCSV()
                      else if (activeSection === 'fee-analytics') exportFeeAnalyticsCSV()
                      else if (activeSection === 'payroll-analytics') exportPayrollAnalyticsCSV()
                      else if (activeSection === 'transport-analytics') exportTransportAnalyticsCSV()
                      else if (activeSection === 'earning-report') exportEarningsCSV()
                    } catch (error) {
                      console.error('Error exporting CSV:', error)
                      alert('Failed to generate CSV. Please try again.')
                    }
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm bg-[#DC2626] text-white hover:bg-red-700"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline text-xs">CSV</span>
                </button>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRealTimeActive}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm ${
                    isRealTimeActive
                      ? 'bg-blue-50 text-blue-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRealTimeActive ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline text-xs">{isRealTimeActive ? 'Updating...' : 'Refresh'}</span>
                </button>
                <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${isRealTimeActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs font-medium text-gray-700">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Navigation Tabs */}
        <div className="mb-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-1.5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-1.5">
              <button
                onClick={() => setActiveSection('overview')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                  activeSection === 'overview'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveSection('fee-analytics')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                  activeSection === 'fee-analytics'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Fee Analytics</span>
              </button>
              <button
                onClick={() => setActiveSection('payroll-analytics')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                  activeSection === 'payroll-analytics'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Payroll</span>
              </button>
              <button
                onClick={() => setActiveSection('transport-analytics')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                  activeSection === 'transport-analytics'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Bus className="w-4 h-4" />
                <span>Transport</span>
              </button>
              <button
                onClick={() => setActiveSection('earning-report')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-xs transition-all ${
                  activeSection === 'earning-report'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Earnings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Date Filter */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <Filter className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Date Filter</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'Last 7 Days' },
                  { value: '15days', label: 'Last 15 Days' },
                  { value: 'month', label: 'Last 30 Days' },
                  { value: 'custom', label: 'Custom Range' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setDateFilter(filter.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      dateFilter === filter.value
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {dateFilter === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <p className="text-xs text-gray-600 font-medium">Total Revenue</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  PKR {(feeData.totalAmount + transportData.totalAmount).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Fees: {feeData.totalAmount.toLocaleString()} + Transport: {transportData.totalAmount.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-red-600" />
                  <p className="text-xs text-gray-600 font-medium">Total Expenses (Paid)</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  PKR {payrollData.paidAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Pending: {payrollData.pendingAmount.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <p className="text-xs text-gray-600 font-medium">Net Profit</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  PKR {((feeData.paidAmount + transportData.paidAmount) - payrollData.paidAmount).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Revenue: {(feeData.paidAmount + transportData.paidAmount).toLocaleString()} - Expenses: {payrollData.paidAmount.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <p className="text-xs text-gray-600 font-medium">Profit Margin</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {(feeData.paidAmount + transportData.paidAmount) > 0
                    ? ((((feeData.paidAmount + transportData.paidAmount) - payrollData.paidAmount) / (feeData.paidAmount + transportData.paidAmount)) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>

            {/* Students & Teachers Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Students</h3>
                    <p className="text-sm text-gray-600">Total enrollment statistics</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-700 font-semibold">Total Students</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{studentStats.total}</span>
                  </div>
                  <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700 font-semibold">Active Students</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{studentStats.active}</span>
                  </div>
                  <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all border border-gray-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700 font-semibold">Inactive Students</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-600">{studentStats.inactive}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Teachers</h3>
                    <p className="text-sm text-gray-600">Faculty members overview</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-all border border-purple-200">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className="text-gray-700 font-semibold">Total Teachers</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-600">{teacherStats.total}</span>
                  </div>
                  <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700 font-semibold">Active Teachers</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{teacherStats.active}</span>
                  </div>
                  <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all border border-gray-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700 font-semibold">Inactive Teachers</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-600">{teacherStats.inactive}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee & Payroll Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  Fee Collection Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all border border-blue-200">
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Total Challans
                    </span>
                    <span className="text-lg font-bold text-blue-600">{feeData.total}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all border border-green-200">
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Paid Challans
                    </span>
                    <span className="text-lg font-bold text-green-600">{feeData.paid}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl hover:shadow-md transition-all border border-yellow-200">
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      Pending Challans
                    </span>
                    <span className="text-lg font-bold text-yellow-600">{feeData.pending}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl hover:shadow-md transition-all border border-red-200">
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      Overdue Challans
                    </span>
                    <span className="text-lg font-bold text-red-600">{feeData.overdue}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  Payroll Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all border border-blue-200">
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Total Payments
                    </span>
                    <span className="text-lg font-bold text-blue-600">{payrollData.total}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all border border-green-200">
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Paid Salaries
                    </span>
                    <span className="text-lg font-bold text-green-600">{payrollData.paid}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl hover:shadow-md transition-all border border-yellow-200">
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      Pending Salaries
                    </span>
                    <span className="text-lg font-bold text-yellow-600">{payrollData.pending}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl hover:shadow-md transition-all border border-red-200">
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Cancelled Payments
                    </span>
                    <span className="text-lg font-bold text-red-600">{payrollData.cancelled}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Analytics Section */}
        {activeSection === 'fee-analytics' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Filter className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Filter Reports</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all hover:border-blue-400"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all hover:border-blue-400"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5" />
                  <p className="text-blue-100 text-xs font-medium">Total Challans</p>
                </div>
                <p className="text-2xl font-bold">{feeData.total}</p>
                <p className="text-blue-100 text-xs mt-1">PKR {feeData.totalAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="text-green-100 text-xs font-medium">Paid</p>
                </div>
                <p className="text-2xl font-bold">{feeData.paid}</p>
                <p className="text-green-100 text-xs mt-1">PKR {feeData.paidAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  <p className="text-yellow-100 text-xs font-medium">Pending</p>
                </div>
                <p className="text-2xl font-bold">{feeData.pending}</p>
                <p className="text-yellow-100 text-xs mt-1">PKR {feeData.pendingAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-red-100 text-xs font-medium">Overdue</p>
                </div>
                <p className="text-2xl font-bold">{feeData.overdue}</p>
                <p className="text-red-100 text-xs mt-1">PKR {feeData.overdueAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-900 text-center mb-0.5">
                  {selectedMonth !== 'all'
                    ? `${months[parseInt(selectedMonth)].label} ${selectedYear} - Fee Collection Analysis`
                    : `Fee Collection Analysis - ${selectedYear}`}
                </h3>
                <p className="text-xs text-gray-600 text-center">
                  {selectedMonth !== 'all' ? 'Daily breakdown for selected month' : 'Monthly overview for selected year'}
                </p>
              </div>

              {/* Legend */}
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {[
                  { key: 'total', label: 'Total', color: 'blue' },
                  { key: 'paid', label: 'Paid', color: 'green' },
                  { key: 'pending', label: 'Pending', color: 'yellow' },
                  { key: 'overdue', label: 'Overdue', color: 'red' }
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleBarVisibility(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold shadow-sm ${
                      visibleBars[key]
                        ? color === 'blue' ? 'bg-blue-100 border-2 border-blue-500 text-blue-900' :
                          color === 'green' ? 'bg-green-100 border-2 border-green-500 text-green-900' :
                          color === 'yellow' ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-900' :
                          'bg-red-100 border-2 border-red-500 text-red-900'
                        : 'bg-gray-100 border-2 border-gray-300 text-gray-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      visibleBars[key]
                        ? color === 'blue' ? 'bg-blue-500' :
                          color === 'green' ? 'bg-green-500' :
                          color === 'yellow' ? 'bg-yellow-500' :
                          'bg-red-500'
                        : 'bg-gray-400'
                    }`}></div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Chart - No Scroll */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="h-80 flex items-end justify-between gap-1">
                  {monthlyFeeData.map((data, index) => {
                    const maxValue = Math.max(...monthlyFeeData.map(d => d.total), 1)
                    const minHeight = 5
                    const totalHeight = maxValue > 0 ? Math.max((data.total / maxValue) * 100, data.total > 0 ? minHeight : 0) : 0
                    const paidHeight = maxValue > 0 ? Math.max((data.paid / maxValue) * 100, data.paid > 0 ? minHeight : 0) : 0
                    const overdueHeight = maxValue > 0 ? Math.max((data.overdue / maxValue) * 100, data.overdue > 0 ? minHeight : 0) : 0
                    const pendingHeight = maxValue > 0 ? Math.max((data.pending / maxValue) * 100, data.pending > 0 ? minHeight : 0) : 0

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex justify-center items-end gap-0.5 h-72 relative">
                          {visibleBars.total && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md hover:from-blue-700 hover:to-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${totalHeight}%` }}
                              title={`Total: ${data.total}`}
                            ></div>
                          )}
                          {visibleBars.paid && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-green-600 to-green-400 rounded-t-md hover:from-green-700 hover:to-green-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${paidHeight}%` }}
                              title={`Paid: ${data.paid}`}
                            ></div>
                          )}
                          {visibleBars.overdue && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-red-600 to-red-400 rounded-t-md hover:from-red-700 hover:to-red-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${overdueHeight}%` }}
                              title={`Overdue: ${data.overdue}`}
                            ></div>
                          )}
                          {visibleBars.pending && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-md hover:from-yellow-700 hover:to-yellow-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${pendingHeight}%` }}
                              title={`Pending: ${data.pending}`}
                            ></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 font-medium text-center w-full truncate group-hover:text-blue-600 transition-colors">
                          {selectedMonth !== 'all' ? data.month : data.month.substring(0, 3)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payroll Analytics Section */}
        {activeSection === 'payroll-analytics' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <Filter className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Filter Reports</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition-all hover:border-green-400"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition-all hover:border-green-400"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5" />
                  <p className="text-blue-100 text-xs font-medium">Total Payments</p>
                </div>
                <p className="text-2xl font-bold">{payrollData.total}</p>
                <p className="text-blue-100 text-xs mt-1">PKR {payrollData.totalAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="text-green-100 text-xs font-medium">Paid</p>
                </div>
                <p className="text-2xl font-bold">{payrollData.paid}</p>
                <p className="text-green-100 text-xs mt-1">PKR {payrollData.paidAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  <p className="text-yellow-100 text-xs font-medium">Pending</p>
                </div>
                <p className="text-2xl font-bold">{payrollData.pending}</p>
                <p className="text-yellow-100 text-xs mt-1">PKR {payrollData.pendingAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5" />
                  <p className="text-red-100 text-xs font-medium">Cancelled</p>
                </div>
                <p className="text-2xl font-bold">{payrollData.cancelled}</p>
                <p className="text-red-100 text-xs mt-1">PKR {payrollData.cancelledAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-900 text-center mb-0.5">
                  {selectedMonth !== 'all'
                    ? `${months[parseInt(selectedMonth)].label} ${selectedYear} - Payroll Analysis`
                    : `Payroll Analysis - ${selectedYear}`}
                </h3>
                <p className="text-xs text-gray-600 text-center">
                  {selectedMonth !== 'all' ? 'Daily breakdown for selected month' : 'Monthly overview for selected year'}
                </p>
              </div>

              {/* Legend */}
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {[
                  { key: 'total', label: 'Total', color: 'blue' },
                  { key: 'paid', label: 'Paid', color: 'green' },
                  { key: 'pending', label: 'Pending', color: 'yellow' },
                  { key: 'overdue', label: 'Cancelled', color: 'red' }
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleBarVisibility(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold shadow-sm ${
                      visibleBars[key]
                        ? color === 'blue' ? 'bg-blue-100 border-2 border-blue-500 text-blue-900' :
                          color === 'green' ? 'bg-green-100 border-2 border-green-500 text-green-900' :
                          color === 'yellow' ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-900' :
                          'bg-red-100 border-2 border-red-500 text-red-900'
                        : 'bg-gray-100 border-2 border-gray-300 text-gray-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      visibleBars[key]
                        ? color === 'blue' ? 'bg-blue-500' :
                          color === 'green' ? 'bg-green-500' :
                          color === 'yellow' ? 'bg-yellow-500' :
                          'bg-red-500'
                        : 'bg-gray-400'
                    }`}></div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Chart - No Scroll */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="h-80 flex items-end justify-between gap-1">
                  {monthlyPayrollData.map((data, index) => {
                    const maxValue = Math.max(...monthlyPayrollData.map(d => d.total), 1)
                    const minHeight = 5
                    const totalHeight = maxValue > 0 ? Math.max((data.total / maxValue) * 100, data.total > 0 ? minHeight : 0) : 0
                    const paidHeight = maxValue > 0 ? Math.max((data.paid / maxValue) * 100, data.paid > 0 ? minHeight : 0) : 0
                    const cancelledHeight = maxValue > 0 ? Math.max((data.cancelled / maxValue) * 100, data.cancelled > 0 ? minHeight : 0) : 0
                    const pendingHeight = maxValue > 0 ? Math.max((data.pending / maxValue) * 100, data.pending > 0 ? minHeight : 0) : 0

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex justify-center items-end gap-0.5 h-72 relative">
                          {visibleBars.total && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md hover:from-blue-700 hover:to-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${totalHeight}%` }}
                              title={`Total: ${data.total}`}
                            ></div>
                          )}
                          {visibleBars.paid && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-green-600 to-green-400 rounded-t-md hover:from-green-700 hover:to-green-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${paidHeight}%` }}
                              title={`Paid: ${data.paid}`}
                            ></div>
                          )}
                          {visibleBars.overdue && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-red-600 to-red-400 rounded-t-md hover:from-red-700 hover:to-red-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${cancelledHeight}%` }}
                              title={`Cancelled: ${data.cancelled}`}
                            ></div>
                          )}
                          {visibleBars.pending && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-md hover:from-yellow-700 hover:to-yellow-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${pendingHeight}%` }}
                              title={`Pending: ${data.pending}`}
                            ></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 font-medium text-center w-full truncate group-hover:text-green-600 transition-colors">
                          {selectedMonth !== 'all' ? data.month : data.month.substring(0, 3)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Earning Report Section */}
        {activeSection === 'earning-report' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Date Filter */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Filter className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Date Filter</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'Last 7 Days' },
                  { value: '15days', label: 'Last 15 Days' },
                  { value: 'month', label: 'Last 30 Days' },
                  { value: 'custom', label: 'Custom Range' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setDateFilter(filter.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      dateFilter === filter.value
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {dateFilter === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <p className="text-xs font-medium text-green-700">Total Income</p>
                </div>
                <p className="text-2xl font-bold text-green-900">PKR {feeData.paidAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  <p className="text-xs font-medium text-red-700">Total Expense</p>
                </div>
                <p className="text-2xl font-bold text-red-900">PKR {payrollData.paidAmount.toLocaleString()}</p>
              </div>

              <div className={`rounded-xl p-4 border-2 ${
                (feeData.paidAmount - payrollData.paidAmount) >= 0
                  ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
                  : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={`w-5 h-5 ${
                    (feeData.paidAmount - payrollData.paidAmount) >= 0 ? 'text-purple-600' : 'text-orange-600'
                  }`} />
                  <p className={`text-xs font-medium ${
                    (feeData.paidAmount - payrollData.paidAmount) >= 0 ? 'text-purple-700' : 'text-orange-700'
                  }`}>Net Earning</p>
                </div>
                <p className={`text-2xl font-bold ${
                  (feeData.paidAmount - payrollData.paidAmount) >= 0 ? 'text-purple-900' : 'text-orange-900'
                }`}>
                  PKR {(feeData.paidAmount - payrollData.paidAmount).toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <p className="text-xs font-medium text-blue-700">Profit Margin</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {feeData.paidAmount > 0
                    ? (((feeData.paidAmount - payrollData.paidAmount) / feeData.paidAmount) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Income Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-100 hover:shadow-md transition-shadow">
                    <span className="text-sm font-medium text-gray-700">Paid Fee Challans</span>
                    <span className="text-lg font-bold text-green-600">{feeData.paid}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-100 hover:shadow-md transition-shadow">
                    <span className="text-sm font-medium text-gray-700">Total Paid Amount</span>
                    <span className="text-lg font-bold text-green-600">PKR {feeData.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100 hover:shadow-md transition-shadow">
                    <span className="text-sm font-medium text-gray-700">Pending Amount</span>
                    <span className="text-lg font-bold text-yellow-600">PKR {feeData.pendingAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-white rounded-xl border-2 border-red-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  Expense Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100 hover:shadow-md transition-shadow">
                    <span className="text-sm font-medium text-gray-700">Paid Salaries</span>
                    <span className="text-lg font-bold text-red-600">{payrollData.paid}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100 hover:shadow-md transition-shadow">
                    <span className="text-sm font-medium text-gray-700">Total Paid Amount</span>
                    <span className="text-lg font-bold text-red-600">PKR {payrollData.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100 hover:shadow-md transition-shadow">
                    <span className="text-sm font-medium text-gray-700">Pending Amount</span>
                    <span className="text-lg font-bold text-yellow-600">PKR {payrollData.pendingAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transport Analytics Section */}
        {activeSection === 'transport-analytics' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <Filter className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Filter Reports</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white transition-all hover:border-orange-400"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white transition-all hover:border-orange-400"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Bus className="w-5 h-5" />
                  <p className="text-orange-100 text-xs font-medium">Total Passengers</p>
                </div>
                <p className="text-2xl font-bold">{transportData.total}</p>
                <p className="text-orange-100 text-xs mt-1">PKR {transportData.totalAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="text-green-100 text-xs font-medium">Paid</p>
                </div>
                <p className="text-2xl font-bold">{transportData.paid}</p>
                <p className="text-green-100 text-xs mt-1">PKR {transportData.paidAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  <p className="text-yellow-100 text-xs font-medium">Pending</p>
                </div>
                <p className="text-2xl font-bold">{transportData.pending}</p>
                <p className="text-yellow-100 text-xs mt-1">PKR {transportData.pendingAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5" />
                  <p className="text-blue-100 text-xs font-medium">Students/Staff</p>
                </div>
                <p className="text-2xl font-bold">{transportData.students}/{transportData.staff}</p>
                <p className="text-blue-100 text-xs mt-1">{transportData.totalVehicles} Vehicles, {transportData.totalRoutes} Routes</p>
              </div>
            </div>

            {/* Passenger Type Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Student Passengers</h3>
                    <p className="text-sm text-gray-600">Using transport services</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all border border-blue-200">
                    <span className="text-gray-700 font-semibold">Total Students</span>
                    <span className="text-2xl font-bold text-blue-600">{transportData.students}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Staff Passengers</h3>
                    <p className="text-sm text-gray-600">Using transport services</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all border border-green-200">
                    <span className="text-gray-700 font-semibold">Total Staff</span>
                    <span className="text-2xl font-bold text-green-600">{transportData.staff}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transport Infrastructure */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Bus className="w-6 h-6 text-orange-600" />
                </div>
                Transport Infrastructure
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl hover:shadow-md transition-all border border-orange-200">
                  <span className="text-sm text-gray-700 font-semibold">Active Vehicles</span>
                  <span className="text-lg font-bold text-orange-600">{transportData.totalVehicles}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl hover:shadow-md transition-all border border-purple-200">
                  <span className="text-sm text-gray-700 font-semibold">Active Routes</span>
                  <span className="text-lg font-bold text-purple-600">{transportData.totalRoutes}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all border border-blue-200">
                  <span className="text-sm text-gray-700 font-semibold">Total Passengers</span>
                  <span className="text-lg font-bold text-blue-600">{transportData.total}</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-900 text-center mb-0.5">
                  {selectedMonth !== 'all'
                    ? `${months[parseInt(selectedMonth)].label} ${selectedYear} - Transport Payment Analysis`
                    : `Transport Payment Analysis - ${selectedYear}`}
                </h3>
                <p className="text-xs text-gray-600 text-center">
                  {selectedMonth !== 'all' ? 'Daily breakdown for selected month' : 'Monthly overview for selected year'}
                </p>
              </div>

              {/* Legend */}
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {[
                  { key: 'total', label: 'Total', color: 'orange' },
                  { key: 'paid', label: 'Paid', color: 'green' },
                  { key: 'pending', label: 'Pending', color: 'yellow' }
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleBarVisibility(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold shadow-sm ${
                      visibleBars[key]
                        ? color === 'orange' ? 'bg-orange-100 border-2 border-orange-500 text-orange-900' :
                          color === 'green' ? 'bg-green-100 border-2 border-green-500 text-green-900' :
                          'bg-yellow-100 border-2 border-yellow-500 text-yellow-900'
                        : 'bg-gray-100 border-2 border-gray-300 text-gray-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      visibleBars[key]
                        ? color === 'orange' ? 'bg-orange-500' :
                          color === 'green' ? 'bg-green-500' :
                          'bg-yellow-500'
                        : 'bg-gray-400'
                    }`}></div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Chart - No Scroll */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="h-80 flex items-end justify-between gap-1">
                  {monthlyTransportData.map((data, index) => {
                    const maxValue = Math.max(...monthlyTransportData.map(d => d.total), 1)
                    const minHeight = 5
                    const totalHeight = maxValue > 0 ? Math.max((data.total / maxValue) * 100, data.total > 0 ? minHeight : 0) : 0
                    const paidHeight = maxValue > 0 ? Math.max((data.paid / maxValue) * 100, data.paid > 0 ? minHeight : 0) : 0
                    const pendingHeight = maxValue > 0 ? Math.max((data.pending / maxValue) * 100, data.pending > 0 ? minHeight : 0) : 0

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex justify-center items-end gap-0.5 h-72 relative">
                          {visibleBars.total && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-md hover:from-orange-700 hover:to-orange-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${totalHeight}%` }}
                              title={`Total: ${data.total}`}
                            ></div>
                          )}
                          {visibleBars.paid && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-green-600 to-green-400 rounded-t-md hover:from-green-700 hover:to-green-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${paidHeight}%` }}
                              title={`Paid: ${data.paid}`}
                            ></div>
                          )}
                          {visibleBars.pending && (
                            <div
                              className="flex-1 max-w-[8px] bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-md hover:from-yellow-700 hover:to-yellow-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                              style={{ height: `${pendingHeight}%` }}
                              title={`Pending: ${data.pending}`}
                            ></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 font-medium text-center w-full truncate group-hover:text-orange-600 transition-colors">
                          {selectedMonth !== 'all' ? data.month : data.month.substring(0, 3)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = getUserFromCookie()
    setCurrentUser(user)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="reports_view"
      pageName="Reports"
    >
      <ReportsPageContent />
    </PermissionGuard>
  )
}
