'use client'

import { useState, useEffect } from 'react'
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
  GraduationCap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ReportsPage() {
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

  const [selectedMonth, setSelectedMonth] = useState('12')
  const [selectedYear, setSelectedYear] = useState('2025')
  const [monthlyFeeData, setMonthlyFeeData] = useState([])
  const [monthlyPayrollData, setMonthlyPayrollData] = useState([])
  const [allYearData, setAllYearData] = useState([])
  const [allPayrollData, setAllPayrollData] = useState([])
  const [visibleBars, setVisibleBars] = useState({
    total: true,
    paid: true,
    pending: true,
    overdue: true
  })
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

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

  const years = ['2025', '2024', '2023', '2022', '2021', '2020']

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

    return () => {
      supabase.removeChannel(salarySubscription)
      supabase.removeChannel(feeSubscription)
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
  }, [selectedMonth, selectedYear, allYearData, allPayrollData])

  const fetchAllData = async () => {
    if (!currentUser?.school_id || !supabase) return

    setLoading(true)

    try {
      // Fetch fee challans
      const { data: feeChallans, error: feeError } = await supabase
        .from('fee_challans')
        .select('total_amount, status, created_at')
        .eq('school_id', currentUser.school_id)

      if (!feeError && feeChallans) {
        setAllYearData(feeChallans)
      }

      // Fetch salary payments
      const { data: salaries, error: payrollError } = await supabase
        .from('salary_payments')
        .select('net_salary, status, created_at')
        .eq('school_id', currentUser.school_id)

      if (!payrollError && salaries) {
        setAllPayrollData(salaries)
      }

      // Fetch student stats
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('status')
        .eq('school_id', currentUser.school_id)

      if (!studentError && students) {
        setStudentStats({
          total: students.length,
          active: students.filter(s => s.status === 'active').length,
          inactive: students.filter(s => s.status === 'inactive').length
        })
      }

      // Fetch teacher stats
      const { data: teachers, error: teacherError } = await supabase
        .from('teachers')
        .select('status')
        .eq('school_id', currentUser.school_id)

      if (!teacherError && teachers) {
        setTeacherStats({
          total: teachers.length,
          active: teachers.filter(t => t.status === 'active').length,
          inactive: teachers.filter(t => t.status === 'inactive').length
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPayrollDataRealtime = async () => {
    if (!currentUser?.school_id || !supabase) return

    try {
      const { data: salaries, error } = await supabase
        .from('salary_payments')
        .select('net_salary, status, created_at')
        .eq('school_id', currentUser.school_id)

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

      if (!error && feeChallans) {
        setAllYearData(feeChallans)
      }
    } catch (error) {
      console.error('Error fetching fee data:', error)
    }
  }

  const calculateMonthData = () => {
    if (allYearData.length === 0) return

    let yearFilteredData = allYearData
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear)
      yearFilteredData = allYearData.filter(challan => {
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

    let yearFilteredData = allPayrollData
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear)
      yearFilteredData = allPayrollData.filter(salary => {
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

  const handleManualRefresh = async () => {
    setIsRealTimeActive(true)
    setLastUpdated(new Date())
    await fetchAllData()
    setTimeout(() => setIsRealTimeActive(false), 2000)
  }

  const toggleBarVisibility = (barType) => {
    setVisibleBars(prev => ({
      ...prev,
      [barType]: !prev[barType]
    }))
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 bg-gray-50 min-h-screen overflow-x-hidden">
      {/* Header */}
      <div className="mb-2">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-800 mb-0.5 leading-tight">Reports & Analytics</h1>
            <p className="text-xs text-gray-600 leading-tight">Comprehensive financial insights and operational data</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors shadow-sm text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRealTimeActive ? 'animate-spin text-blue-500' : 'text-gray-600'}`} />
              <span className="font-medium text-gray-700">Refresh</span>
            </button>
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-[10px] text-gray-600">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button
          onClick={() => setActiveSection('overview')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded font-semibold text-xs transition-all ${
            activeSection === 'overview'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-indigo-300 shadow-sm'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveSection('fee-analytics')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded font-semibold text-xs transition-all ${
            activeSection === 'fee-analytics'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-blue-300 shadow-sm'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Fee Analytics</span>
        </button>
        <button
          onClick={() => setActiveSection('payroll-analytics')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded font-semibold text-xs transition-all ${
            activeSection === 'payroll-analytics'
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-green-300 shadow-sm'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payroll Analytics</span>
        </button>
        <button
          onClick={() => setActiveSection('earning-report')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded font-semibold text-xs transition-all ${
            activeSection === 'earning-report'
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-purple-300 shadow-sm'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Earning Report</span>
        </button>
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-2">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded p-3 text-white shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <DollarSign className="w-5 h-5" />
                <div className="bg-white/20 rounded p-1">
                  <TrendingUp className="w-3 h-3" />
                </div>
              </div>
              <p className="text-blue-100 text-[10px] font-medium mb-0.5">Total Revenue</p>
              <p className="text-xl font-bold">PKR {feeData.totalAmount.toLocaleString()}</p>
              <p className="text-blue-100 text-[10px] mt-0.5">From fee collections</p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded p-3 text-white shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <CreditCard className="w-5 h-5" />
                <div className="bg-white/20 rounded p-1">
                  <TrendingDown className="w-3 h-3" />
                </div>
              </div>
              <p className="text-red-100 text-[10px] font-medium mb-0.5">Total Expenses</p>
              <p className="text-xl font-bold">PKR {payrollData.totalAmount.toLocaleString()}</p>
              <p className="text-red-100 text-[10px] mt-0.5">From payroll</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded p-3 text-white shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <BarChart3 className="w-5 h-5" />
                <div className="bg-white/20 rounded p-1">
                  <TrendingUp className="w-3 h-3" />
                </div>
              </div>
              <p className="text-green-100 text-[10px] font-medium mb-0.5">Net Profit</p>
              <p className="text-xl font-bold">
                PKR {(feeData.paidAmount - payrollData.paidAmount).toLocaleString()}
              </p>
              <p className="text-green-100 text-[10px] mt-0.5">Revenue - Expenses</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded p-3 text-white shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <FileText className="w-5 h-5" />
                <div className="bg-white/20 rounded p-1">
                  <BarChart3 className="w-3 h-3" />
                </div>
              </div>
              <p className="text-purple-100 text-[10px] font-medium mb-0.5">Profit Margin</p>
              <p className="text-xl font-bold">
                {feeData.paidAmount > 0
                  ? (((feeData.paidAmount - payrollData.paidAmount) / feeData.paidAmount) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-purple-100 text-[10px] mt-0.5">Of total revenue</p>
            </div>
          </div>

          {/* Students & Teachers Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Students</h3>
                  <p className="text-sm text-gray-600">Total enrollment statistics</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-gray-700 font-medium">Total Students</span>
                  <span className="text-2xl font-bold text-blue-600">{studentStats.total}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <span className="text-gray-700 font-medium">Active Students</span>
                  <span className="text-2xl font-bold text-green-600">{studentStats.active}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-gray-700 font-medium">Inactive Students</span>
                  <span className="text-2xl font-bold text-gray-600">{studentStats.inactive}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Teachers</h3>
                  <p className="text-sm text-gray-600">Faculty members overview</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                  <span className="text-gray-700 font-medium">Total Teachers</span>
                  <span className="text-2xl font-bold text-purple-600">{teacherStats.total}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <span className="text-gray-700 font-medium">Active Teachers</span>
                  <span className="text-2xl font-bold text-green-600">{teacherStats.active}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-gray-700 font-medium">Inactive Teachers</span>
                  <span className="text-2xl font-bold text-gray-600">{teacherStats.inactive}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fee & Payroll Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Fee Collection Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-sm text-gray-700">Total Challans</span>
                  <span className="font-bold text-blue-600">{feeData.total}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <span className="text-sm text-gray-700">Paid Challans</span>
                  <span className="font-bold text-green-600">{feeData.paid}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <span className="text-sm text-gray-700">Pending Challans</span>
                  <span className="font-bold text-yellow-600">{feeData.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <span className="text-sm text-gray-700">Overdue Challans</span>
                  <span className="font-bold text-red-600">{feeData.overdue}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Payroll Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-sm text-gray-700">Total Payments</span>
                  <span className="font-bold text-blue-600">{payrollData.total}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <span className="text-sm text-gray-700">Paid Salaries</span>
                  <span className="font-bold text-green-600">{payrollData.paid}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <span className="text-sm text-gray-700">Pending Salaries</span>
                  <span className="font-bold text-yellow-600">{payrollData.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <span className="text-sm text-gray-700">Cancelled Payments</span>
                  <span className="font-bold text-red-600">{payrollData.cancelled}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Analytics Section */}
      {activeSection === 'fee-analytics' && (
        <div className="space-y-3">
            {/* Filters */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded p-2 border border-gray-200">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-700" />
                <h3 className="text-xs font-semibold text-gray-800">Filter Reports</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded p-3 text-white shadow hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <BarChart3 className="w-5 h-5" />
                  <div className="bg-white/20 rounded p-1">
                    <BarChart3 className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-blue-100 text-[10px] font-medium mb-0.5">Total Challans</p>
                <p className="text-xl font-bold">{feeData.total}</p>
                <p className="text-blue-100 text-[10px] mt-0.5">PKR {feeData.totalAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded p-3 text-white shadow hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <TrendingUp className="w-5 h-5" />
                  <div className="bg-white/20 rounded p-1">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-green-100 text-[10px] font-medium mb-0.5">Paid</p>
                <p className="text-xl font-bold">{feeData.paid}</p>
                <p className="text-green-100 text-[10px] mt-0.5">PKR {feeData.paidAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded p-3 text-white shadow hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <TrendingUp className="w-5 h-5" />
                  <div className="bg-white/20 rounded p-1">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-yellow-100 text-[10px] font-medium mb-0.5">Pending</p>
                <p className="text-xl font-bold">{feeData.pending}</p>
                <p className="text-yellow-100 text-[10px] mt-0.5">PKR {feeData.pendingAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded p-3 text-white shadow hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <TrendingDown className="w-5 h-5" />
                  <div className="bg-white/20 rounded p-1">
                    <TrendingDown className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-red-100 text-[10px] font-medium mb-0.5">Overdue</p>
                <p className="text-xl font-bold">{feeData.overdue}</p>
                <p className="text-red-100 text-[10px] mt-0.5">PKR {feeData.overdueAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded border border-gray-200 p-3 shadow-sm">
              <div className="mb-2">
                <h3 className="text-xs font-bold text-gray-900 text-center mb-0.5">
                  {selectedMonth !== 'all'
                    ? `${months[parseInt(selectedMonth)].label} ${selectedYear} - Fee Collection Analysis`
                    : `Fee Collection Analysis - ${selectedYear}`}
                </h3>
                <p className="text-[10px] text-gray-500 text-center">
                  {selectedMonth !== 'all' ? 'Daily breakdown for selected month' : 'Monthly overview for selected year'}
                </p>
              </div>

              <div className="h-48 flex items-end justify-around gap-0.5 px-1 overflow-x-auto">
                {monthlyFeeData.map((data, index) => {
                  const maxValue = Math.max(...monthlyFeeData.map(d => d.total), 1)
                  const minHeight = 8
                  const totalHeight = maxValue > 0 ? Math.max((data.total / maxValue) * 100, data.total > 0 ? minHeight : 0) : 0
                  const paidHeight = maxValue > 0 ? Math.max((data.paid / maxValue) * 100, data.paid > 0 ? minHeight : 0) : 0
                  const overdueHeight = maxValue > 0 ? Math.max((data.overdue / maxValue) * 100, data.overdue > 0 ? minHeight : 0) : 0
                  const pendingHeight = maxValue > 0 ? Math.max((data.pending / maxValue) * 100, data.pending > 0 ? minHeight : 0) : 0

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      <div className="w-full flex justify-center items-end gap-px h-44">
                        {visibleBars.total && (
                          <div
                            className="w-1.5 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 hover:to-blue-500 transition-all cursor-pointer"
                            style={{ height: `${totalHeight}%` }}
                            title={`Total: ${data.total}`}
                          ></div>
                        )}
                        {visibleBars.paid && (
                          <div
                            className="w-1.5 bg-gradient-to-t from-green-600 to-green-400 rounded-t hover:from-green-700 hover:to-green-500 transition-all cursor-pointer"
                            style={{ height: `${paidHeight}%` }}
                            title={`Paid: ${data.paid}`}
                          ></div>
                        )}
                        {visibleBars.overdue && (
                          <div
                            className="w-1.5 bg-gradient-to-t from-red-600 to-red-400 rounded-t hover:from-red-700 hover:to-red-500 transition-all cursor-pointer"
                            style={{ height: `${overdueHeight}%` }}
                            title={`Overdue: ${data.overdue}`}
                          ></div>
                        )}
                        {visibleBars.pending && (
                          <div
                            className="w-1.5 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t hover:from-yellow-700 hover:to-yellow-500 transition-all cursor-pointer"
                            style={{ height: `${pendingHeight}%` }}
                            title={`Pending: ${data.pending}`}
                          ></div>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-600 font-medium truncate w-full text-center">
                        {selectedMonth !== 'all' ? data.month : data.month.substring(0, 3)}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {[
                  { key: 'total', label: 'Total', color: 'blue' },
                  { key: 'paid', label: 'Paid', color: 'green' },
                  { key: 'pending', label: 'Pending', color: 'yellow' },
                  { key: 'overdue', label: 'Overdue', color: 'red' }
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleBarVisibility(key)}
                    className={`flex items-center gap-1 px-2 py-1 rounded transition-all text-[10px] font-medium shadow-sm ${
                      visibleBars[key]
                        ? `bg-${color}-100 border border-${color}-500 text-${color}-900`
                        : 'bg-gray-100 border border-gray-300 text-gray-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${visibleBars[key] ? `bg-${color}-500` : 'bg-gray-400'}`}></div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
        </div>
      )}

      {/* Payroll Analytics Section */}
      {activeSection === 'payroll-analytics' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Payroll Analytics</h2>
                  <p className="text-green-100 text-sm">Monitor salary payments and disbursements</p>
                </div>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium shadow-md"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Filters */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-800">Filter Reports</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition-all"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition-all"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8" />
                  <div className="bg-white/20 rounded-lg p-2">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Payments</p>
                <p className="text-3xl font-bold">{payrollData.total}</p>
                <p className="text-blue-100 text-xs mt-2">PKR {payrollData.totalAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8" />
                  <div className="bg-white/20 rounded-lg p-2">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-green-100 text-sm font-medium mb-1">Paid</p>
                <p className="text-3xl font-bold">{payrollData.paid}</p>
                <p className="text-green-100 text-xs mt-2">PKR {payrollData.paidAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8" />
                  <div className="bg-white/20 rounded-lg p-2">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-yellow-100 text-sm font-medium mb-1">Pending</p>
                <p className="text-3xl font-bold">{payrollData.pending}</p>
                <p className="text-yellow-100 text-xs mt-2">PKR {payrollData.pendingAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <TrendingDown className="w-8 h-8" />
                  <div className="bg-white/20 rounded-lg p-2">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-red-100 text-sm font-medium mb-1">Cancelled</p>
                <p className="text-3xl font-bold">{payrollData.cancelled}</p>
                <p className="text-red-100 text-xs mt-2">PKR {payrollData.cancelledAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 p-6 shadow-inner">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
                  {selectedMonth !== 'all'
                    ? `${months[parseInt(selectedMonth)].label} ${selectedYear} - Payroll Analysis`
                    : `Payroll Analysis - ${selectedYear}`}
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  {selectedMonth !== 'all' ? 'Daily breakdown for selected month' : 'Monthly overview for selected year'}
                </p>
              </div>

              <div className="h-80 flex items-end justify-around gap-1 px-2">
                {monthlyPayrollData.map((data, index) => {
                  const maxValue = Math.max(...monthlyPayrollData.map(d => d.total), 1)
                  const minHeight = 8
                  const totalHeight = maxValue > 0 ? Math.max((data.total / maxValue) * 100, data.total > 0 ? minHeight : 0) : 0
                  const paidHeight = maxValue > 0 ? Math.max((data.paid / maxValue) * 100, data.paid > 0 ? minHeight : 0) : 0
                  const cancelledHeight = maxValue > 0 ? Math.max((data.cancelled / maxValue) * 100, data.cancelled > 0 ? minHeight : 0) : 0
                  const pendingHeight = maxValue > 0 ? Math.max((data.pending / maxValue) * 100, data.pending > 0 ? minHeight : 0) : 0

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                      <div className="w-full flex justify-center items-end gap-1 h-72">
                        {visibleBars.total && (
                          <div
                            className="w-3 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-700 hover:to-blue-500 transition-all cursor-pointer shadow-md"
                            style={{ height: `${totalHeight}%` }}
                            title={`Total: ${data.total}`}
                          ></div>
                        )}
                        {visibleBars.paid && (
                          <div
                            className="w-3 bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg hover:from-green-700 hover:to-green-500 transition-all cursor-pointer shadow-md"
                            style={{ height: `${paidHeight}%` }}
                            title={`Paid: ${data.paid}`}
                          ></div>
                        )}
                        {visibleBars.overdue && (
                          <div
                            className="w-3 bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg hover:from-red-700 hover:to-red-500 transition-all cursor-pointer shadow-md"
                            style={{ height: `${cancelledHeight}%` }}
                            title={`Cancelled: ${data.cancelled}`}
                          ></div>
                        )}
                        {visibleBars.pending && (
                          <div
                            className="w-3 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg hover:from-yellow-700 hover:to-yellow-500 transition-all cursor-pointer shadow-md"
                            style={{ height: `${pendingHeight}%` }}
                            title={`Pending: ${data.pending}`}
                          ></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 font-medium truncate w-full text-center">
                        {selectedMonth !== 'all' ? data.month : data.month.substring(0, 3)}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {[
                  { key: 'total', label: 'Total', color: 'blue' },
                  { key: 'paid', label: 'Paid', color: 'green' },
                  { key: 'pending', label: 'Pending', color: 'yellow' },
                  { key: 'overdue', label: 'Cancelled', color: 'red' }
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleBarVisibility(key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg ${
                      visibleBars[key]
                        ? `bg-${color}-100 border-2 border-${color}-500 text-${color}-900`
                        : 'bg-gray-100 border-2 border-gray-300 text-gray-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full shadow-inner ${visibleBars[key] ? `bg-${color}-500` : 'bg-gray-400'}`}></div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Earning Report Section */}
      {activeSection === 'earning-report' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Earning Report</h2>
                <p className="text-purple-100 text-sm">Comprehensive profit and loss statement</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <div className="bg-green-600 rounded-lg p-2">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-green-700 mb-1">Total Income</p>
                <p className="text-xs text-green-600 mb-2">From fee collections</p>
                <p className="text-2xl font-bold text-green-900">PKR {feeData.paidAmount.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-6 h-6 text-red-600" />
                  <div className="bg-red-600 rounded-lg p-2">
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-red-700 mb-1">Total Expense</p>
                <p className="text-xs text-red-600 mb-2">From salary payments</p>
                <p className="text-2xl font-bold text-red-900">PKR {payrollData.paidAmount.toLocaleString()}</p>
              </div>

              <div className={`rounded-xl p-6 border-2 hover:shadow-lg transition-shadow ${
                (feeData.paidAmount - payrollData.paidAmount) >= 0
                  ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
                  : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className={`w-6 h-6 ${
                    (feeData.paidAmount - payrollData.paidAmount) >= 0 ? 'text-purple-600' : 'text-orange-600'
                  }`} />
                  <div className={`rounded-lg p-2 ${
                    (feeData.paidAmount - payrollData.paidAmount) >= 0 ? 'bg-purple-600' : 'bg-orange-600'
                  }`}>
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className={`text-sm font-medium mb-1 ${
                  (feeData.paidAmount - payrollData.paidAmount) >= 0 ? 'text-purple-700' : 'text-orange-700'
                }`}>Net Earning</p>
                <p className={`text-xs mb-2 ${
                  (feeData.paidAmount - payrollData.paidAmount) >= 0 ? 'text-purple-600' : 'text-orange-600'
                }`}>(Income - Expense)</p>
                <p className={`text-2xl font-bold ${
                  (feeData.paidAmount - payrollData.paidAmount) >= 0 ? 'text-purple-900' : 'text-orange-900'
                }`}>
                  PKR {(feeData.paidAmount - payrollData.paidAmount).toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  <div className="bg-blue-600 rounded-lg p-2">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-blue-700 mb-1">Profit Margin</p>
                <p className="text-xs text-blue-600 mb-2">Percentage of income</p>
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
        </div>
      )}
    </div>
  )
}
