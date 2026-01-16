'use client'

import { useState, useEffect } from 'react'
import { Users, UserCheck, Home, DollarSign, Calendar, AlertCircle, TrendingUp, Cake, School, BookOpen, Bus, Phone, MessageSquare, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createClient } from '@supabase/supabase-js'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

function DashboardContent() {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    students: { active: 0, total: 0 },
    staff: { active: 0, total: 0 },
    families: { active: 0, total: 0 },
    classes: 0,
    fee: {
      currentMonth: { posted: 0, received: 0, receivable: 0, percentage: 0 },
      totalReceivable: 0,
      byMonth: {},
      todayCollection: 0
    },
    expenses: { currentMonth: 0, today: 0 },
    salary: {
      lastMonth: { total: 0, paid: 0, payable: 0 },
      totalPayables: 0
    },
    birthdays: { today: 0 },
    library: { totalBooks: 0 },
    transport: { totalStudents: 0 },
    charts: {
      cashInOut: [],
      admissions: [],
      totalAdmissions: 0,
      totalWithdrawals: 0,
      totalCashIn: 0,
      totalCashOut: 0
    },
    currentMonth: '',
    lastMonth: ''
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // ✅ Get logged-in user
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
      const userId = user?.id
      const schoolId = user?.school_id

      if (!userId || !schoolId) {
        console.error('User not logged in')
        setLoading(false)
        return
      }

      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      const today = now.toISOString().split('T')[0]
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

      // Fetch all data in parallel - ✅ NOW FILTERED BY USER_ID
      const [
        studentsResult,
        staffResult,
        classesResult,
        feesResult,
        collectionsResult,
        expensesResult,
        salariesResult,
        libraryResult
      ] = await Promise.all([
        supabase.from('students').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('staff').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('fee_challans').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('fee_collections').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('expenses').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('salaries').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('library_books').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('school_id', schoolId)
      ])

      // Process students
      const allStudents = studentsResult.data || []
      const activeStudents = allStudents.filter(s => s.status === 'active')
      const totalStudents = allStudents.length
      const activeStudentsCount = activeStudents.length

      // Process staff
      const allStaff = staffResult.data || []
      const activeStaff = allStaff.filter(s => s.status === 'active')
      const totalStaff = allStaff.length
      const activeStaffCount = activeStaff.length

      // Process families (unique parent_id)
      const uniqueFamilies = new Set(allStudents.map(s => s.parent_id).filter(Boolean))
      const totalFamilies = uniqueFamilies.size
      const activeFamilies = new Set(activeStudents.map(s => s.parent_id).filter(Boolean)).size

      // Classes
      const totalClasses = classesResult.count || 0

      // Fee calculations
      const feeChallans = feesResult.data || []
      const currentMonthChallans = feeChallans.filter(f => {
        if (!f.created_at) return false
        const challanDate = new Date(f.created_at)
        return challanDate.getMonth() + 1 === currentMonth && challanDate.getFullYear() === currentYear
      })

      const feePostedCurrentMonth = currentMonthChallans.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0)
      const feeReceivedCurrentMonth = currentMonthChallans.reduce((sum, f) => sum + (parseFloat(f.paid_amount) || 0), 0)
      const feeReceivableCurrentMonth = feePostedCurrentMonth - feeReceivedCurrentMonth

      const totalReceivable = feeChallans.reduce((sum, f) => {
        const unpaid = (parseFloat(f.amount) || 0) - (parseFloat(f.paid_amount) || 0)
        return sum + (unpaid > 0 ? unpaid : 0)
      }, 0)

      // Fee by month
      const feeReceivableByMonth = {}
      months.forEach(month => { feeReceivableByMonth[month] = 0 })

      feeChallans.forEach(f => {
        if (!f.created_at) return
        const unpaid = (parseFloat(f.amount) || 0) - (parseFloat(f.paid_amount) || 0)
        if (unpaid > 0) {
          const challanDate = new Date(f.created_at)
          const monthName = months[challanDate.getMonth()]
          feeReceivableByMonth[monthName] += unpaid
        }
      })

      // Collections
      const collectionsData = collectionsResult.data || []
      const todayCollection = collectionsData
        .filter(c => c.created_at && c.created_at.startsWith(today))
        .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)

      // Expenses
      const expensesData = expensesResult.data || []
      const currentMonthExpenses = expensesData
        .filter(e => {
          if (!e.created_at) return false
          const expenseDate = new Date(e.created_at)
          return expenseDate.getMonth() + 1 === currentMonth && expenseDate.getFullYear() === currentYear
        })
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

      const todayExpenses = expensesData
        .filter(e => e.created_at && e.created_at.startsWith(today))
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

      // Salary
      const salariesData = salariesResult.data || []
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear

      const lastMonthSalaries = salariesData.filter(s => {
        return s.month === lastMonth && s.year === lastMonthYear
      })

      const totalSalaryLastMonth = lastMonthSalaries.reduce((sum, s) => sum + (parseFloat(s.total_salary) || 0), 0)
      const paidSalaryLastMonth = lastMonthSalaries
        .filter(s => s.status === 'paid')
        .reduce((sum, s) => sum + (parseFloat(s.total_salary) || 0), 0)

      const totalPayables = salariesData
        .filter(s => s.status !== 'paid')
        .reduce((sum, s) => sum + (parseFloat(s.total_salary) || 0), 0)

      // Birthdays today
      const todayBirthdays = allStudents.filter(s => {
        if (!s.date_of_birth) return false
        const dob = new Date(s.date_of_birth)
        return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate()
      }).length

      // Library
      const libraryBooks = libraryResult.count || 0

      // Transport
      const transportStudents = allStudents.filter(s => s.transport === true).length

      // Cash In/Out chart data
      const cashInOutData = []
      let totalCashIn = 0
      let totalCashOut = 0

      for (let day = 1; day <= 29; day += 2) {
        const dayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        const dayCashIn = collectionsData
          .filter(c => c.created_at && c.created_at.startsWith(dayStr))
          .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)

        const dayCashOut = expensesData
          .filter(e => e.created_at && e.created_at.startsWith(dayStr))
          .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

        totalCashIn += dayCashIn
        totalCashOut += dayCashOut

        cashInOutData.push({ day, cashIn: dayCashIn, cashOut: dayCashOut })
      }

      // Admission/Withdrawal chart data
      const admissionChartData = []
      let totalAdmissions = 0
      let totalWithdrawals = 0

      for (let day = 1; day <= 29; day += 2) {
        const dayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        const dayAdmissions = allStudents.filter(s => s.admission_date && s.admission_date.startsWith(dayStr)).length
        const dayWithdrawals = allStudents.filter(s => s.withdrawal_date && s.withdrawal_date.startsWith(dayStr)).length

        totalAdmissions += dayAdmissions
        totalWithdrawals += dayWithdrawals

        admissionChartData.push({ day, admissions: dayAdmissions, withdrawals: dayWithdrawals })
      }

      setDashboardData({
        students: { active: activeStudentsCount, total: totalStudents },
        staff: { active: activeStaffCount, total: totalStaff },
        families: { active: activeFamilies, total: totalFamilies },
        classes: totalClasses,
        fee: {
          currentMonth: {
            posted: feePostedCurrentMonth,
            received: feeReceivedCurrentMonth,
            receivable: feeReceivableCurrentMonth,
            percentage: feePostedCurrentMonth > 0 ? Math.round((feeReceivedCurrentMonth / feePostedCurrentMonth) * 100) : 0
          },
          totalReceivable: totalReceivable,
          byMonth: feeReceivableByMonth,
          todayCollection: todayCollection
        },
        expenses: { currentMonth: currentMonthExpenses, today: todayExpenses },
        salary: {
          lastMonth: {
            total: totalSalaryLastMonth,
            paid: paidSalaryLastMonth,
            payable: totalSalaryLastMonth - paidSalaryLastMonth
          },
          totalPayables: totalPayables
        },
        birthdays: { today: todayBirthdays },
        library: { totalBooks: libraryBooks },
        transport: { totalStudents: transportStudents },
        charts: {
          cashInOut: cashInOutData,
          admissions: admissionChartData,
          totalAdmissions: totalAdmissions,
          totalWithdrawals: totalWithdrawals,
          totalCashIn: totalCashIn,
          totalCashOut: totalCashOut
        },
        currentMonth: months[currentMonth - 1],
        lastMonth: months[lastMonth - 1]
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT SIDE - 15 CARDS + CHARTS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Row 1 - Student, Staff, Families */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.students.active}</p>
                  <p className="text-sm mt-1">Active Students</p>
                  <p className="text-xs opacity-80">Total Students: {dashboardData.students.total}</p>
                </div>
                <Users className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.staff.active}</p>
                  <p className="text-sm mt-1">Active Staff</p>
                  <p className="text-xs opacity-80">Total Staff: {dashboardData.staff.total}</p>
                </div>
                <UserCheck className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.families.active}</p>
                  <p className="text-sm mt-1">Active Families</p>
                  <p className="text-xs opacity-80">Total Families: {dashboardData.families.total}</p>
                </div>
                <Home className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* Row 2 - Fee Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-red-700 to-red-900 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.fee.currentMonth.posted.toLocaleString()}</p>
                  <p className="text-sm mt-1">Fee {dashboardData.currentMonth}-2025</p>
                  <p className="text-xs opacity-80">Fee Posted: {dashboardData.fee.currentMonth.posted.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl relative">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.fee.currentMonth.received.toLocaleString()}</p>
                  <p className="text-sm mt-1">Received ({dashboardData.currentMonth}-2025)</p>
                  <p className="text-xs opacity-80">Total Fee Posted: {dashboardData.fee.currentMonth.posted.toLocaleString()}</p>
                </div>
                <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-bold">{dashboardData.fee.currentMonth.percentage}%</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.fee.currentMonth.receivable.toLocaleString()}</p>
                  <p className="text-sm mt-1">Receivable {dashboardData.currentMonth}-2025</p>
                  <p className="text-xs opacity-80">Total Receivable: {dashboardData.fee.totalReceivable.toLocaleString()}</p>
                </div>
                <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-bold">{100 - dashboardData.fee.currentMonth.percentage}%</div>
              </div>
            </div>
          </div>

          {/* Row 3 - Salary Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.salary.lastMonth.total.toLocaleString()}</p>
                  <p className="text-sm mt-1">Salary {dashboardData.lastMonth}-2025</p>
                  <p className="text-xs opacity-80">Total salary of {dashboardData.lastMonth}-2025</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.salary.lastMonth.paid.toLocaleString()}</p>
                  <p className="text-sm mt-1">Paid ({dashboardData.lastMonth}-2025)</p>
                  <p className="text-xs opacity-80">Total paid in month: {dashboardData.salary.lastMonth.paid.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-800 to-black rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.salary.lastMonth.payable.toLocaleString()}</p>
                  <p className="text-sm mt-1">Payable {dashboardData.lastMonth}-2025</p>
                  <p className="text-xs opacity-80">Total Payables: {dashboardData.salary.totalPayables.toLocaleString()}</p>
                </div>
                <AlertCircle className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* Row 4 - Today's Data */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-pink-600 to-red-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold text-yellow-300">{dashboardData.fee.todayCollection.toLocaleString()}</p>
                  <p className="text-sm mt-1">Today Collection</p>
                  <p className="text-xs opacity-80">Today Fee Postings: {dashboardData.fee.todayCollection.toLocaleString()}</p>
                </div>
                <Calendar className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-600 to-pink-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold text-yellow-300">{dashboardData.expenses.today.toLocaleString()}</p>
                  <p className="text-sm mt-1">Today Expenses</p>
                  <p className="text-xs opacity-80">Expenses {dashboardData.currentMonth}-2025: {dashboardData.expenses.currentMonth.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.birthdays.today}</p>
                  <p className="text-sm mt-1">Student Birthday</p>
                  <p className="text-xs opacity-80">{dashboardData.birthdays.today > 0 ? `${dashboardData.birthdays.today} birthday${dashboardData.birthdays.today > 1 ? 's' : ''} today` : 'No birthdays today'}</p>
                </div>
                <Cake className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* Row 5 - School Resources */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.classes}</p>
                  <p className="text-sm mt-1">Total Classes</p>
                </div>
                <School className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-800 to-cyan-900 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.library.totalBooks}</p>
                  <p className="text-sm mt-1">Library Books</p>
                </div>
                <BookOpen className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.transport.totalStudents}</p>
                  <p className="text-sm mt-1">Transportee</p>
                </div>
                <Bus className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="space-y-6">
            {/* Cash In/Out Summary Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Cash In / Out Summary</h2>
              <p className="text-center text-gray-600 text-sm mb-6">For Month {dashboardData.currentMonth}, 2025</p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardData.charts.cashInOut} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={{ stroke: '#9ca3af' }} />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} axisLine={{ stroke: '#9ca3af' }} />
                  <Tooltip formatter={(value) => value.toLocaleString()} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar dataKey="cashIn" fill="#4f46e5" name="Cash IN" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="cashOut" fill="#84cc16" name="Cash Out" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm flex items-center justify-start gap-4">
                <span className="text-orange-600 font-semibold">Total Cash In:</span>
                <span className="text-orange-600">{dashboardData.charts.totalCashIn.toLocaleString()}</span>
                <span className="text-red-600 font-semibold ml-4">Total Cash Out:</span>
                <span className="text-red-600">{dashboardData.charts.totalCashOut.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Note:- including bank transactions</p>
            </div>

            {/* Students Admission/Withdrawal Summary Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Students Admission/Withdrawl Summary</h2>
              <p className="text-center text-gray-600 text-sm mb-6">For Month {dashboardData.currentMonth}, 2025</p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardData.charts.admissions} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={{ stroke: '#9ca3af' }} />
                  <YAxis domain={[0, Math.max(1.25, Math.ceil(Math.max(...dashboardData.charts.admissions.map(d => Math.max(d.admissions, d.withdrawals))) * 1.25))]} tick={{ fontSize: 12 }} axisLine={{ stroke: '#9ca3af' }} label={{ value: 'Students', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar dataKey="admissions" fill="#06b6d4" name="Admissions" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="withdrawals" fill="#84cc16" name="Withdrawls" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm flex items-center justify-start gap-4">
                <span className="text-orange-600 font-semibold">Total Admissions:</span>
                <span className="text-orange-600">{dashboardData.charts.totalAdmissions}</span>
                <span className="text-red-600 font-semibold ml-4">Total Withdrawls:</span>
                <span className="text-red-600">{dashboardData.charts.totalWithdrawals}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Reports */}
        <div className="space-y-6">

          {/* Fee Receivable Report */}
          <div className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-2xl">
            <div className="text-center mb-4">
              <span className="bg-blue-600 px-6 py-2 rounded-full text-sm font-bold">Fee Receivable Report</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1"><span>Previous Balance</span><span className="font-medium">0</span></div>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => {
                const amount = dashboardData.fee.byMonth[month] || 0
                const isCurrentMonth = month === dashboardData.currentMonth
                return (
                  <div key={month} className={`flex justify-between py-1 ${isCurrentMonth ? 'border-t border-white/30 pt-2 font-bold' : ''}`}>
                    <span className={isCurrentMonth ? 'font-bold' : ''}>{month}</span>
                    <span className={isCurrentMonth ? 'font-bold' : 'font-medium'}>{amount.toLocaleString()}</span>
                  </div>
                )
              })}
              <div className="flex justify-between py-1"><span>Next Year Balance</span><span className="font-medium">0</span></div>
              <div className="flex justify-between border-t-2 border-white pt-3 mt-2">
                <span className="font-bold">Total Receivable</span>
                <span className="text-xl font-bold">{dashboardData.fee.totalReceivable.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Student Attendance Report */}
          <div className="bg-gradient-to-b from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Student Attendance Report</h3>
              <div className="bg-white/20 rounded-full p-2">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-center text-sm opacity-90 mb-4">21-Nov-2025</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span>Present - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/20 pb-3">
                <span>Absent - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Late Arrival - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Short Leave - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>On Leave - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between border-t-2 border-white/40 pt-3 mt-3">
                <span className="font-bold text-yellow-300">Without Attendance - {dashboardData.students.active}</span>
                <span className="font-bold">100%</span>
              </div>
            </div>
          </div>

          {/* Staff Attendance Report */}
          <div className="bg-gradient-to-b from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Staff Attendance Report</h3>
              <div className="bg-white/20 rounded-full p-2">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
            <p className="text-center text-sm opacity-90 mb-4">21-Nov-2025</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span>Present - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/20 pb-3">
                <span>Absent - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Late Arrival - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Short Leave - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>On Leave - 0</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between border-t-2 border-white/40 pt-3 mt-3">
                <span className="font-bold text-yellow-300">Without Attendance - {dashboardData.staff.active}</span>
                <span className="font-bold">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const user = getUserFromCookie()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="dashboard_view"
      pageName="Dashboard"
    >
      <DashboardContent />
    </PermissionGuard>
  )
}