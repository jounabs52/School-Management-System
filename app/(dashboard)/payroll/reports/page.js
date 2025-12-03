'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Eye } from 'lucide-react'

export default function PayrollReportsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const router = useRouter()

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

  const reports = [
    {
      id: 1,
      title: 'Salary Register',
      description: 'View complete salary register with allowances and deductions',
      href: '/payroll/reports/salary-register',
      icon: FileText
    },
    {
      id: 2,
      title: 'Salary Paid Report',
      description: 'View all salary payment transactions',
      href: '/payroll/reports/salary-paid',
      icon: FileText
    },
    {
      id: 3,
      title: 'Salary Slips',
      description: 'View and print individual salary slips',
      href: '/payroll/slips',
      icon: FileText
    }
  ]

  const handleViewReport = (href) => {
    router.push(href)
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Payroll Reports</h1>
        <p className="text-gray-600">Generate and view various payroll reports</p>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-4">
          <h2 className="text-xl font-bold">Payroll Reports</h2>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-20">
                Sr.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Report Name
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report, index) => {
              const Icon = report.icon
              return (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{report.title}</div>
                        <div className="text-xs text-gray-500">{report.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleViewReport(report.href)}
                      className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">About Payroll Reports</h3>
            <p className="text-xs text-blue-700">
              These reports provide comprehensive insights into your payroll operations. You can view salary registers,
              payment history, and generate individual salary slips for staff members.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
