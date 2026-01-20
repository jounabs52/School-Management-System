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
  const [showCashInOutChart, setShowCashInOutChart] = useState(true)
  const [showAdmissionChart, setShowAdmissionChart] = useState(true)
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
      currentMonth: { total: 0, paid: 0, payable: 0 },
      totalPayables: 0
    },
    birthdays: { today: 0 },
    library: { totalBooks: 0 },
    transport: { totalStudents: 0 },
    frontdesk: {
      contacts: { total: 0, today: 0 },
      visitors: { total: 0, today: 0 },
      inquiries: { total: 0, today: 0, pending: 0 }
    },
    datesheets: { total: 0, upcoming: 0 },
    attendance: {
      students: {
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        onLeave: 0,
        withoutAttendance: 0,
        total: 0
      },
      staff: {
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        onLeave: 0,
        withoutAttendance: 0,
        total: 0
      }
    },
    charts: {
      cashInOut: [],
      admissions: [],
      totalAdmissions: 0,
      totalWithdrawals: 0,
      totalCashIn: 0,
      totalCashOut: 0
    },
    currentMonth: ''
  })

  useEffect(() => {
    fetchDashboardData()

    // Setup real-time subscriptions for automatic updates
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
    const userId = user?.id
    const schoolId = user?.school_id

    if (!userId || !schoolId) return

    // Subscribe to changes in key tables
    const subscriptions = []

    // Students subscription
    const studentsSubscription = supabase
      .channel('students_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'students', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(studentsSubscription)

    // Staff subscription
    const staffSubscription = supabase
      .channel('staff_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'staff', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(staffSubscription)

    // Contacts subscription
    const contactsSubscription = supabase
      .channel('contacts_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(contactsSubscription)

    // Visitors subscription
    const visitorsSubscription = supabase
      .channel('visitors_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'visitors', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(visitorsSubscription)

    // Admission Inquiries subscription
    const inquiriesSubscription = supabase
      .channel('inquiries_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'admission_inquiries', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(inquiriesSubscription)

    // Datesheets subscription
    const datesheetsSubscription = supabase
      .channel('datesheets_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'datesheets', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(datesheetsSubscription)

    // Expenses subscription
    const expensesSubscription = supabase
      .channel('expenses_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(expensesSubscription)

    // Fee Challans subscription
    const feeChallansSubscription = supabase
      .channel('fee_challans_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'fee_challans', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(feeChallansSubscription)

    // Fee Payments subscription
    const feePaymentsSubscription = supabase
      .channel('fee_payments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'fee_payments', filter: `school_id=eq.${schoolId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(feePaymentsSubscription)

    // Student Attendance subscription
    const studentAttendanceSubscription = supabase
      .channel('student_attendance_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'student_attendance', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(studentAttendanceSubscription)

    // Staff Attendance subscription
    const staffAttendanceSubscription = supabase
      .channel('staff_attendance_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'staff_attendance', filter: `user_id=eq.${userId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(staffAttendanceSubscription)

    // Salary Payments subscription
    const salaryPaymentsSubscription = supabase
      .channel('salary_payments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'salary_payments', filter: `school_id=eq.${schoolId}` },
        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(salaryPaymentsSubscription)

    // Transport Passengers subscription
    const transportPassengersSubscription = supabase
      .channel('passengers_changes')
      .on('postgres_changes',

        { event: '*', schema: 'public', table: 'passengers', filter: `user_id=eq.${userId}` },
        { event: '*', schema: 'public', table: 'transport_passengers', filter: `school_id=eq.${schoolId}` },

        () => fetchDashboardData()
      )
      .subscribe()
    subscriptions.push(transportPassengersSubscription)

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription)
      })
    }
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
        salaryPaymentsResult,
        libraryResult,
        contactsResult,
        visitorsResult,
        inquiriesResult,
        datesheetsResult,
        studentAttendanceResult,
        staffAttendanceResult,
        transportPassengersResult
      ] = await Promise.all([
        supabase.from('students').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('staff').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('fee_challans').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('fee_payments').select('*').eq('school_id', schoolId),
        supabase.from('expenses').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('salary_payments').select('*').eq('school_id', schoolId),
        supabase.from('books').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('contacts').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('visitors').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('admission_inquiries').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('datesheets').select('*').eq('user_id', userId).eq('school_id', schoolId),
        supabase.from('student_attendance').select('*').eq('user_id', userId).eq('school_id', schoolId).eq('attendance_date', today),
        supabase.from('staff_attendance').select('*').eq('user_id', userId).eq('school_id', schoolId).eq('attendance_date', today),

        supabase.from('passengers').select('student_id').eq('user_id', userId).eq('school_id', schoolId).eq('status', 'active'),

        supabase.from('transport_passengers').select('student_id').eq('school_id', schoolId).eq('status', 'active')

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
      const feePayments = collectionsResult.data || []

      // Calculate total paid amount per challan
      const challanPayments = {}
      feePayments.forEach(payment => {
        if (!challanPayments[payment.challan_id]) {
          challanPayments[payment.challan_id] = 0
        }
        challanPayments[payment.challan_id] += parseFloat(payment.amount_paid) || 0
      })

      const currentMonthChallans = feeChallans.filter(f => {
        if (!f.created_at) return false
        const challanDate = new Date(f.created_at)
        return challanDate.getMonth() + 1 === currentMonth && challanDate.getFullYear() === currentYear
      })

      const feePostedCurrentMonth = currentMonthChallans.reduce((sum, f) => sum + (parseFloat(f.total_amount) || 0), 0)
      const feeReceivedCurrentMonth = currentMonthChallans.reduce((sum, f) => {
        const paidAmount = challanPayments[f.id] || 0
        return sum + paidAmount
      }, 0)
      const feeReceivableCurrentMonth = feePostedCurrentMonth - feeReceivedCurrentMonth

      const totalReceivable = feeChallans.reduce((sum, f) => {
        const paidAmount = challanPayments[f.id] || 0
        const unpaid = (parseFloat(f.total_amount) || 0) - paidAmount
        return sum + (unpaid > 0 ? unpaid : 0)
      }, 0)

      // Fee by month
      const feeReceivableByMonth = {}
      months.forEach(month => { feeReceivableByMonth[month] = 0 })

      feeChallans.forEach(f => {
        if (!f.created_at) return

        const paidAmount = challanPayments[f.id] || 0
        const unpaid = (parseFloat(f.total_amount) || 0) - paidAmount

        if (unpaid > 0) {
          const challanDate = new Date(f.created_at)
          const monthName = months[challanDate.getMonth()]
          feeReceivableByMonth[monthName] += unpaid
        }
      })

      // Collections (Today's collections)
      const todayCollection = feePayments
        .filter(c => c.created_at && c.created_at.startsWith(today))
        .reduce((sum, c) => sum + (parseFloat(c.amount_paid) || 0), 0)

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

      // Salary Payments - Show current month instead of last month
      const salaryPaymentsData = salaryPaymentsResult.data || []

      // Filter for current month salaries
      const currentMonthSalaries = salaryPaymentsData.filter(s => {
        return s.payment_month === currentMonth && s.payment_year === currentYear
      })

      const totalSalaryCurrentMonth = currentMonthSalaries.reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0)
      const paidSalaryCurrentMonth = currentMonthSalaries
        .filter(s => s.status === 'paid')
        .reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0)

      const totalPayables = salaryPaymentsData
        .filter(s => s.status !== 'paid')
        .reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0)

      // Birthdays today
      const todayBirthdays = allStudents.filter(s => {
        if (!s.date_of_birth) return false
        const dob = new Date(s.date_of_birth)
        return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate()
      }).length

      // Library
      const libraryBooks = libraryResult.count || 0

      // Transport - Count unique students enrolled in transport
      const transportPassengersData = transportPassengersResult.data || []
      const uniqueTransportStudents = new Set(transportPassengersData.map(p => p.student_id).filter(Boolean))
      const transportStudents = uniqueTransportStudents.size

      // Contacts data
      const contactsData = contactsResult.data || []
      const totalContacts = contactsData.length
      const todayContacts = contactsData.filter(c => c.created_at && c.created_at.startsWith(today)).length

      // Visitors data
      const visitorsData = visitorsResult.data || []
      const totalVisitors = visitorsData.length
      const todayVisitors = visitorsData.filter(v => v.visit_date && v.visit_date === today).length

      // Admission Inquiries data
      const inquiriesData = inquiriesResult.data || []
      const totalInquiries = inquiriesData.length
      const todayInquiries = inquiriesData.filter(i => i.date && i.date === today).length
      const pendingInquiries = inquiriesData.filter(i => i.status === 'pending' || !i.status).length

      // Datesheets data
      const datesheetsData = datesheetsResult.data || []
      const totalDatesheets = datesheetsData.length
      const upcomingDatesheets = datesheetsData.filter(d => {
        if (!d.start_date) return false
        const startDate = new Date(d.start_date)
        return startDate >= now
      }).length

      // Student Attendance data (Today's attendance)
      const studentAttendanceData = studentAttendanceResult.data || []
      const totalActiveStudents = activeStudentsCount

      const studentPresent = studentAttendanceData.filter(a => a.status === 'present').length
      const studentAbsent = studentAttendanceData.filter(a => a.status === 'absent').length
      const studentLate = studentAttendanceData.filter(a => a.status === 'late').length
      const studentHalfDay = studentAttendanceData.filter(a => a.status === 'half-day').length
      const studentOnLeave = studentAttendanceData.filter(a => a.status === 'on-leave').length
      const studentWithoutAttendance = totalActiveStudents - studentAttendanceData.length

      // Staff Attendance data (Today's attendance)
      const staffAttendanceData = staffAttendanceResult.data || []
      const totalActiveStaff = activeStaffCount

      const staffPresent = staffAttendanceData.filter(a => a.status === 'present').length
      const staffAbsent = staffAttendanceData.filter(a => a.status === 'absent').length
      const staffLate = staffAttendanceData.filter(a => a.status === 'late').length
      const staffHalfDay = staffAttendanceData.filter(a => a.status === 'half-day').length
      const staffOnLeave = staffAttendanceData.filter(a => a.status === 'on-leave').length
      const staffWithoutAttendance = totalActiveStaff - staffAttendanceData.length

      // Cash In/Out chart data
      const cashInOutData = []
      let totalCashIn = 0
      let totalCashOut = 0

      // Get the number of days in the current month
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        const dayCashIn = feePayments
          .filter(c => c.created_at && c.created_at.startsWith(dayStr))
          .reduce((sum, c) => sum + (parseFloat(c.amount_paid) || 0), 0)

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

      for (let day = 1; day <= daysInMonth; day++) {
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
          currentMonth: {
            total: totalSalaryCurrentMonth,
            paid: paidSalaryCurrentMonth,
            payable: totalSalaryCurrentMonth - paidSalaryCurrentMonth
          },
          totalPayables: totalPayables
        },
        birthdays: { today: todayBirthdays },
        library: { totalBooks: libraryBooks },
        transport: { totalStudents: transportStudents },
        frontdesk: {
          contacts: { total: totalContacts, today: todayContacts },
          visitors: { total: totalVisitors, today: todayVisitors },
          inquiries: { total: totalInquiries, today: todayInquiries, pending: pendingInquiries }
        },
        datesheets: { total: totalDatesheets, upcoming: upcomingDatesheets },
        attendance: {
          students: {
            present: studentPresent,
            absent: studentAbsent,
            late: studentLate,
            halfDay: studentHalfDay,
            onLeave: studentOnLeave,
            withoutAttendance: studentWithoutAttendance,
            total: totalActiveStudents
          },
          staff: {
            present: staffPresent,
            absent: staffAbsent,
            late: staffLate,
            halfDay: staffHalfDay,
            onLeave: staffOnLeave,
            withoutAttendance: staffWithoutAttendance,
            total: totalActiveStaff
          }
        },
        charts: {
          cashInOut: cashInOutData,
          admissions: admissionChartData,
          totalAdmissions: totalAdmissions,
          totalWithdrawals: totalWithdrawals,
          totalCashIn: totalCashIn,
          totalCashOut: totalCashOut
        },
        currentMonth: months[currentMonth - 1]
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
                  <p className="text-4xl font-bold">{dashboardData.salary.currentMonth.total.toLocaleString()}</p>
                  <p className="text-sm mt-1">Salary {dashboardData.currentMonth}-{new Date().getFullYear()}</p>
                  <p className="text-xs opacity-80">Total salary of {dashboardData.currentMonth}-{new Date().getFullYear()}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.salary.currentMonth.paid.toLocaleString()}</p>
                  <p className="text-sm mt-1">Paid ({dashboardData.currentMonth}-{new Date().getFullYear()})</p>
                  <p className="text-xs opacity-80">Total paid in month: {dashboardData.salary.currentMonth.paid.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-800 to-black rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.salary.currentMonth.payable.toLocaleString()}</p>
                  <p className="text-sm mt-1">Payable {dashboardData.currentMonth}-{new Date().getFullYear()}</p>
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

          {/* Row 6 - Frontdesk Data */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.frontdesk.contacts.total}</p>
                  <p className="text-sm mt-1">Total Contacts</p>
                  <p className="text-xs opacity-80">Added Today: {dashboardData.frontdesk.contacts.today}</p>
                </div>
                <Phone className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-teal-700 to-green-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.frontdesk.visitors.total}</p>
                  <p className="text-sm mt-1">Total Visitors</p>
                  <p className="text-xs opacity-80">Today: {dashboardData.frontdesk.visitors.today}</p>
                </div>
                <Users className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-violet-700 to-purple-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.frontdesk.inquiries.total}</p>
                  <p className="text-sm mt-1">Admission Inquiries</p>
                  <p className="text-xs opacity-80">Pending: {dashboardData.frontdesk.inquiries.pending}</p>
                </div>
                <MessageSquare className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* Row 7 - Datesheets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-rose-600 to-pink-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">{dashboardData.datesheets.total}</p>
                  <p className="text-sm mt-1">Total Datesheets</p>
                  <p className="text-xs opacity-80">Upcoming: {dashboardData.datesheets.upcoming}</p>
                </div>
                <Calendar className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="space-y-6">
            {/* Cash In/Out Summary Chart */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-2xl border-2 border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">Cash In / Out Summary</span>
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">For Month {dashboardData.currentMonth}, {new Date().getFullYear()}</p>
                </div>
                <button
                  onClick={() => setShowCashInOutChart(!showCashInOutChart)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    showCashInOutChart
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {showCashInOutChart ? 'Hide Chart' : 'Show Chart'}
                </button>
              </div>

              {showCashInOutChart && (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dashboardData.charts.cashInOut} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="cashInGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.9}/>
                        </linearGradient>
                        <linearGradient id="cashOutGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#dc2626" stopOpacity={0.9}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        label={{ value: 'Day of Month', position: 'insideBottom', offset: -10, style: { fontSize: 12, fill: '#6b7280', fontWeight: 600 } }}
                      />
                      <YAxis
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        label={{ value: 'Amount (PKR)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280', fontWeight: 600 } }}
                      />
                      <Tooltip
                        formatter={(value) => [`PKR ${value.toLocaleString()}`, '']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          border: '2px solid #e5e7eb',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '30px' }}
                        iconType="circle"
                        iconSize={12}
                      />
                      <Bar dataKey="cashIn" fill="url(#cashInGradient)" name="Cash IN" radius={[8, 8, 0, 0]} barSize={16} />
                      <Bar dataKey="cashOut" fill="url(#cashOutGradient)" name="Cash Out" radius={[8, 8, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-around text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
                        <span className="text-gray-700 font-semibold">Total Cash In:</span>
                        <span className="text-green-700 font-bold text-lg">PKR {dashboardData.charts.totalCashIn.toLocaleString()}</span>
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-red-600"></div>
                        <span className="text-gray-700 font-semibold">Total Cash Out:</span>
                        <span className="text-red-700 font-bold text-lg">PKR {dashboardData.charts.totalCashOut.toLocaleString()}</span>
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-semibold">Net:</span>
                        <span className={`font-bold text-lg ${dashboardData.charts.totalCashIn - dashboardData.charts.totalCashOut >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          PKR {(dashboardData.charts.totalCashIn - dashboardData.charts.totalCashOut).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center italic">Note: Including bank transactions</p>
                </>
              )}
            </div>

            {/* Students Admission/Withdrawal Summary Chart */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-2xl border-2 border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-gradient-to-r from-cyan-600 to-blue-600 text-transparent bg-clip-text">Students Admission/Withdrawal Summary</span>
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">For Month {dashboardData.currentMonth}, {new Date().getFullYear()}</p>
                </div>
                <button
                  onClick={() => setShowAdmissionChart(!showAdmissionChart)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    showAdmissionChart
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {showAdmissionChart ? 'Hide Chart' : 'Show Chart'}
                </button>
              </div>

              {showAdmissionChart && (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dashboardData.charts.admissions} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="admissionsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#0891b2" stopOpacity={0.9}/>
                        </linearGradient>
                        <linearGradient id="withdrawalsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.9}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        label={{ value: 'Day of Month', position: 'insideBottom', offset: -10, style: { fontSize: 12, fill: '#6b7280', fontWeight: 600 } }}
                      />
                      <YAxis
                        domain={[0, Math.max(5, Math.ceil(Math.max(...dashboardData.charts.admissions.map(d => Math.max(d.admissions, d.withdrawals))) * 1.25))]}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        label={{ value: 'Number of Students', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280', fontWeight: 600 } }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(value, name) => [value, name === 'admissions' ? 'Admissions' : 'Withdrawals']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          border: '2px solid #e5e7eb',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '30px' }}
                        iconType="circle"
                        iconSize={12}
                      />
                      <Bar dataKey="admissions" fill="url(#admissionsGradient)" name="Admissions" radius={[8, 8, 0, 0]} barSize={16} />
                      <Bar dataKey="withdrawals" fill="url(#withdrawalsGradient)" name="Withdrawals" radius={[8, 8, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-around text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600"></div>
                        <span className="text-gray-700 font-semibold">Total Admissions:</span>
                        <span className="text-cyan-700 font-bold text-lg">{dashboardData.charts.totalAdmissions}</span>
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600"></div>
                        <span className="text-gray-700 font-semibold">Total Withdrawals:</span>
                        <span className="text-amber-700 font-bold text-lg">{dashboardData.charts.totalWithdrawals}</span>
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-semibold">Net Change:</span>
                        <span className={`font-bold text-lg ${dashboardData.charts.totalAdmissions - dashboardData.charts.totalWithdrawals >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {dashboardData.charts.totalAdmissions - dashboardData.charts.totalWithdrawals >= 0 ? '+' : ''}{dashboardData.charts.totalAdmissions - dashboardData.charts.totalWithdrawals}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
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
            <p className="text-center text-sm opacity-90 mb-4">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span>Present - {dashboardData.attendance.students.present}</span>
                <span className="font-medium">{dashboardData.attendance.students.total > 0 ? Math.round((dashboardData.attendance.students.present / dashboardData.attendance.students.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/20 pb-3">
                <span>Absent - {dashboardData.attendance.students.absent}</span>
                <span className="font-medium">{dashboardData.attendance.students.total > 0 ? Math.round((dashboardData.attendance.students.absent / dashboardData.attendance.students.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Late Arrival - {dashboardData.attendance.students.late}</span>
                <span className="font-medium">{dashboardData.attendance.students.total > 0 ? Math.round((dashboardData.attendance.students.late / dashboardData.attendance.students.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Half Day - {dashboardData.attendance.students.halfDay}</span>
                <span className="font-medium">{dashboardData.attendance.students.total > 0 ? Math.round((dashboardData.attendance.students.halfDay / dashboardData.attendance.students.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>On Leave - {dashboardData.attendance.students.onLeave}</span>
                <span className="font-medium">{dashboardData.attendance.students.total > 0 ? Math.round((dashboardData.attendance.students.onLeave / dashboardData.attendance.students.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between border-t-2 border-white/40 pt-3 mt-3">
                <span className="font-bold text-yellow-300">Without Attendance - {dashboardData.attendance.students.withoutAttendance}</span>
                <span className="font-bold">{dashboardData.attendance.students.total > 0 ? Math.round((dashboardData.attendance.students.withoutAttendance / dashboardData.attendance.students.total) * 100) : 0}%</span>
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
            <p className="text-center text-sm opacity-90 mb-4">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span>Present - {dashboardData.attendance.staff.present}</span>
                <span className="font-medium">{dashboardData.attendance.staff.total > 0 ? Math.round((dashboardData.attendance.staff.present / dashboardData.attendance.staff.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/20 pb-3">
                <span>Absent - {dashboardData.attendance.staff.absent}</span>
                <span className="font-medium">{dashboardData.attendance.staff.total > 0 ? Math.round((dashboardData.attendance.staff.absent / dashboardData.attendance.staff.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Late Arrival - {dashboardData.attendance.staff.late}</span>
                <span className="font-medium">{dashboardData.attendance.staff.total > 0 ? Math.round((dashboardData.attendance.staff.late / dashboardData.attendance.staff.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Half Day - {dashboardData.attendance.staff.halfDay}</span>
                <span className="font-medium">{dashboardData.attendance.staff.total > 0 ? Math.round((dashboardData.attendance.staff.halfDay / dashboardData.attendance.staff.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>On Leave - {dashboardData.attendance.staff.onLeave}</span>
                <span className="font-medium">{dashboardData.attendance.staff.total > 0 ? Math.round((dashboardData.attendance.staff.onLeave / dashboardData.attendance.staff.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between border-t-2 border-white/40 pt-3 mt-3">
                <span className="font-bold text-yellow-300">Without Attendance - {dashboardData.attendance.staff.withoutAttendance}</span>
                <span className="font-bold">{dashboardData.attendance.staff.total > 0 ? Math.round((dashboardData.attendance.staff.withoutAttendance / dashboardData.attendance.staff.total) * 100) : 0}%</span>
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