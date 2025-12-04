'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Printer, Download, ArrowLeft } from 'lucide-react'

export default function SalaryRegisterReport() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [salaryStructures, setSalaryStructures] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Notification states
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const showToast = (message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message)
      setTimeout(() => setSuccess(null), 5000)
    } else if (type === 'error' || type === 'warning') {
      setError(message)
      setTimeout(() => setError(null), 5000)
    }
  }

  useEffect(() => {
    const userData = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-data='))

    if (userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData.split('=')[1]))
        setCurrentUser(user)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (currentUser?.school_id) {
      loadSalaryStructures()
    }
  }, [currentUser, selectedMonth, selectedYear])

  const loadSalaryStructures = async () => {
    console.log('=== Loading Salary Structures ===')
    console.log('Current User:', currentUser)
    console.log('School ID:', currentUser?.school_id)

    if (!currentUser?.school_id) {
      console.log('No school_id found, returning early')
      return
    }

    setLoading(true)
    try {
      console.log('Executing Supabase query...')
      const { data, error } = await supabase
        .from('salary_structures')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            employee_number,
            designation,
            department
          )
        `)
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      console.log('Query Result:', { data, error })
      console.log('Number of structures found:', data?.length || 0)

      if (error) throw error

      setSalaryStructures(data || [])
      console.log('Salary structures state updated')
    } catch (error) {
      console.error('Error loading salary structures:', error)
      console.error('Error details:', error.message, error.code)
      showToast('Failed to load salary register', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    showToast('Export functionality coming soon!', 'success')
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative print:hidden">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center gap-2 print:hidden">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 print:mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/payroll/reports')}
              className="print:hidden bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition-colors"
              title="Back to Reports"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 print:text-2xl">Staff Salary Register</h1>
              <p className="text-gray-600 text-sm mt-1">
                Report Criteria [Month: {getMonthName(selectedMonth)} | Year: {selectedYear}]
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Month/Year Filter */}
        <div className="flex gap-4 mb-4 print:hidden">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Salary Register Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden print:shadow-none">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading salary register...</div>
        ) : salaryStructures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-900 to-blue-800 text-white print:bg-gray-800">
                  <th className="px-2 py-2 text-left font-semibold text-xs">#</th>
                  <th className="px-2 py-2 text-left font-semibold text-xs">Name</th>
                  <th className="px-2 py-2 text-left font-semibold text-xs">Role</th>
                  <th className="px-2 py-2 text-center font-semibold text-xs">Comp</th>
                  <th className="px-2 py-2 text-center font-semibold text-xs">J.Date</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Prov Fund</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Basic</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">House</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Medical</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Transport</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Other Allow</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs bg-blue-700">Gross</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Tax</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs">Other Ded</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs bg-green-700">Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {salaryStructures.map((structure, index) => (
                  <tr key={structure.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-2 text-xs">{index + 1}</td>
                    <td className="px-2 py-2 text-xs font-medium">
                      {structure.staff?.first_name} {structure.staff?.last_name}
                    </td>
                    <td className="px-2 py-2 text-xs">{structure.staff?.designation || 'N/A'}</td>
                    <td className="px-2 py-2 text-xs text-center">{structure.staff?.employee_number || 'N/A'}</td>
                    <td className="px-2 py-2 text-xs text-center">
                      {structure.staff?.date_of_joining
                        ? new Date(structure.staff.date_of_joining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.provident_fund || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right font-medium">{parseFloat(structure.basic_salary || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.house_allowance || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.medical_allowance || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.transport_allowance || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right">{parseFloat(structure.other_allowances || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right font-semibold bg-blue-50">{parseFloat(structure.gross_salary || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right text-red-600">{parseFloat(structure.tax_deduction || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right text-red-600">{parseFloat(structure.other_deductions || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-right font-bold text-green-700 bg-green-50">{parseFloat(structure.net_salary || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan="6" className="px-2 py-2 text-xs text-right">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.basic_salary || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.house_allowance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.medical_allowance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.transport_allowance || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_allowances || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right bg-blue-100">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.gross_salary || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right text-red-600">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.tax_deduction || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right text-red-600">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.other_deductions || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-xs text-right text-green-700 bg-green-100">
                    {salaryStructures.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No salary structures found for the selected period.
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 text-xs text-gray-600 text-center">
        <p>Print time: {new Date().toLocaleString('en-GB')}</p>
        <p className="mt-1">skoolzoom demo software</p>
      </div>
    </div>
  )
}
