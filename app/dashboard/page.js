'use client'

import { Users, UserCheck, Home, DollarSign, Calendar, AlertCircle, TrendingUp, Cake, School, BookOpen, Bus, Phone, MessageSquare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  // Cash In/Out data for November 2025
  const cashData = [
    { day: 1, cashIn: 108700, cashOut: 0 },
    { day: 3, cashIn: 0, cashOut: 0 },
    { day: 5, cashIn: 0, cashOut: 0 },
    { day: 7, cashIn: 0, cashOut: 0 },
    { day: 9, cashIn: 0, cashOut: 0 },
    { day: 11, cashIn: 0, cashOut: 0 },
    { day: 13, cashIn: 0, cashOut: 0 },
    { day: 15, cashIn: 0, cashOut: 70000 },
    { day: 17, cashIn: 0, cashOut: 0 },
    { day: 19, cashIn: 0, cashOut: 0 },
    { day: 21, cashIn: 0, cashOut: 0 },
    { day: 23, cashIn: 0, cashOut: 0 },
    { day: 25, cashIn: 0, cashOut: 0 },
    { day: 27, cashIn: 0, cashOut: 0 },
    { day: 29, cashIn: 0, cashOut: 0 },
  ]

  // Students Admission/Withdrawal data for November 2025
  const admissionData = [
    { day: 1, admissions: 0, withdrawals: 0 },
    { day: 3, admissions: 0, withdrawals: 0 },
    { day: 5, admissions: 0, withdrawals: 0 },
    { day: 7, admissions: 1, withdrawals: 0 },
    { day: 9, admissions: 0, withdrawals: 0 },
    { day: 11, admissions: 0, withdrawals: 0 },
    { day: 13, admissions: 0, withdrawals: 0 },
    { day: 15, admissions: 0, withdrawals: 0 },
    { day: 17, admissions: 0, withdrawals: 0 },
    { day: 19, admissions: 0, withdrawals: 0 },
    { day: 21, admissions: 0, withdrawals: 0 },
    { day: 23, admissions: 0, withdrawals: 0 },
    { day: 25, admissions: 0, withdrawals: 0 },
    { day: 27, admissions: 0, withdrawals: 0 },
    { day: 29, admissions: 0, withdrawals: 0 },
  ]

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
                  <p className="text-4xl font-bold">148</p>
                  <p className="text-sm mt-1">Active Students</p>
                  <p className="text-xs opacity-80">Total Students: 156</p>
                </div>
                <Users className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">26</p>
                  <p className="text-sm mt-1">Active Staff</p>
                  <p className="text-xs opacity-80">Total Staff: 61</p>
                </div>
                <UserCheck className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">123</p>
                  <p className="text-sm mt-1">Active Families</p>
                  <p className="text-xs opacity-80">Total Families: 155</p>
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
                  <p className="text-4xl font-bold">1,546,650</p>
                  <p className="text-sm mt-1">Fee Nov-2025</p>
                  <p className="text-xs opacity-80">Fee Bad Debts Nov-2025: 1,000</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl relative">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">79,000</p>
                  <p className="text-sm mt-1">Received (Nov-2025)</p>
                  <p className="text-xs opacity-80">Total Fee Posted: 108,700</p>
                </div>
                <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-bold">5%</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">1,467,650</p>
                  <p className="text-sm mt-1">Receivable Nov-2025</p>
                  <p className="text-xs opacity-80">Total Receivable: 9,116,833</p>
                </div>
                <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-bold">95%</div>
              </div>
            </div>
          </div>

          {/* Row 3 - Salary Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">1,746,686</p>
                  <p className="text-sm mt-1">Salary Oct-2025</p>
                  <p className="text-xs opacity-80">Total salary of Oct-2025</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">1,549,885</p>
                  <p className="text-sm mt-1">Paid (Oct-2025)</p>
                  <p className="text-xs opacity-80">Total paid in month: 70,000</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-800 to-black rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">196,801</p>
                  <p className="text-sm mt-1">Payable Oct-2025</p>
                  <p className="text-xs opacity-80">Total Payables: 9,387,881</p>
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
                  <p className="text-4xl font-bold text-yellow-300">0</p>
                  <p className="text-sm mt-1">Today Collection</p>
                  <p className="text-xs opacity-80">Today Fee Postings: 0</p>
                </div>
                <Calendar className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-600 to-pink-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold text-yellow-300">0</p>
                  <p className="text-sm mt-1">Today Expenses</p>
                  <p className="text-xs opacity-80">Expenses Nov-2025: 325,000</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">0</p>
                  <p className="text-sm mt-1">Student Birthday</p>
                  <p className="text-xs opacity-80">---------------</p>
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
                  <p className="text-4xl font-bold">26</p>
                  <p className="text-sm mt-1">Total Classes</p>
                </div>
                <School className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-800 to-cyan-900 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">33</p>
                  <p className="text-sm mt-1">Library Books</p>
                </div>
                <BookOpen className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-bold">20</p>
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
              <p className="text-center text-gray-600 text-sm mb-6">For Month November, 2025</p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={cashData} barGap={0}>
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
                <span className="text-orange-600">108,700</span>
                <span className="text-red-600 font-semibold ml-4">Total Cash Out:</span>
                <span className="text-red-600">110,000</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Note:- including bank transactions</p>
            </div>

            {/* Students Admission/Withdrawal Summary Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Students Admission/Withdrawl Summary</h2>
              <p className="text-center text-gray-600 text-sm mb-6">For Month November, 2025</p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={admissionData} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={{ stroke: '#9ca3af' }} />
                  <YAxis domain={[0, 1.25]} ticks={[0, 0.25, 0.5, 0.75, 1, 1.25]} tick={{ fontSize: 12 }} axisLine={{ stroke: '#9ca3af' }} label={{ value: 'Students', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar dataKey="admissions" fill="#06b6d4" name="Admissions" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="withdrawals" fill="#84cc16" name="Withdrawls" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm flex items-center justify-start gap-4">
                <span className="text-orange-600 font-semibold">Total Admissions:</span>
                <span className="text-orange-600">1</span>
                <span className="text-red-600 font-semibold ml-4">Total Withdrawls:</span>
                <span className="text-red-600">0</span>
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
              <div className="flex justify-between py-1"><span>January</span><span className="font-medium">564,265</span></div>
              <div className="flex justify-between py-1"><span>February</span><span className="font-medium">0</span></div>
              <div className="flex justify-between py-1"><span>March</span><span className="font-medium">0</span></div>
              <div className="flex justify-between py-1"><span>April</span><span className="font-medium">0</span></div>
              <div className="flex justify-between py-1"><span>May</span><span className="font-medium">701,605</span></div>
              <div className="flex justify-between py-1"><span>June</span><span className="font-medium">305,300</span></div>
              <div className="flex justify-between py-1"><span>July</span><span className="font-medium">764,111</span></div>
              <div className="flex justify-between py-1"><span>August</span><span className="font-medium">1,658,440</span></div>
              <div className="flex justify-between py-1"><span>September</span><span className="font-medium">2,231,732</span></div>
              <div className="flex justify-between py-1"><span>October</span><span className="font-medium">1,423,730</span></div>
              <div className="flex justify-between py-1 border-t border-white/30 pt-2"><span className="font-bold">November</span><span className="font-bold">1,467,650</span></div>
              <div className="flex justify-between py-1"><span>December</span><span className="font-medium">0</span></div>
              <div className="flex justify-between py-1"><span>Next Year Balance</span><span className="font-medium">0</span></div>
              <div className="flex justify-between border-t-2 border-white pt-3 mt-2">
                <span className="font-bold">Total Receivable</span>
                <span className="text-xl font-bold">9,116,833</span>
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
                <span className="font-bold text-yellow-300">Without Attendance - 148</span>
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
                <span className="font-bold text-yellow-300">Without Attendance - 26</span>
                <span className="font-bold">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}