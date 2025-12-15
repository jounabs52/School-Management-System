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
    <div className="p-1">
      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-blue-600">
              <th className="px-3 py-2 text-left text-sm font-semibold text-white w-20">
                Sr.
              </th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-white">
                Report Name
              </th>
              <th className="px-3 py-2 text-center text-sm font-semibold text-white w-32">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report, index) => {
              const Icon = report.icon
              return (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{report.title}</div>
                        <div className="text-xs text-gray-500">{report.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleViewReport(report.href)}
                      className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg font-medium text-sm transition-colors"
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
    </div>
  )
}
