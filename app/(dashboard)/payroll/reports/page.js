'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Eye } from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions } from '@/components/DataCard'

function PayrollReportsPageContent() {
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
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6">
      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <ResponsiveTableWrapper
          loading={false}
          empty={reports.length === 0}
          emptyMessage="No reports available"
          tableView={
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold w-20">
                  Sr.
                </th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold">
                  Report Name
                </th>
                <th className="border border-blue-800 px-2 sm:px-3 py-1.5 sm:py-2 text-center font-semibold w-32">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => {
                const Icon = report.icon
                return (
                  <tr key={report.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-700">
                      {index + 1}
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{report.title}</div>
                          <div className="text-xs text-gray-500">{report.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-center">
                      <button
                        onClick={() => handleViewReport(report.href)}
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-colors"
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
          }
          cardView={
            <div className="space-y-2">
              {reports.map((report) => {
                const Icon = report.icon
                return (
                  <DataCard key={report.id}>
                    <CardHeader
                      photo={<div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center"><Icon className="w-3.5 h-3.5 text-blue-600" /></div>}
                      name={report.title}
                      subtitle={report.description}
                    />
                    <CardActions>
                      <button onClick={() => handleViewReport(report.href)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-medium transition-colors"><Eye size={12} />View</button>
                    </CardActions>
                  </DataCard>
                )
              })}
            </div>
          }
        />
      </div>
    </div>
  )
}

export default function PayrollReportsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getUserFromCookie()
    setCurrentUser(user)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      permissionKey="payroll_reports_view"
      currentUser={currentUser}
      pageName="Payroll Reports"
    >
      <PayrollReportsPageContent />
    </PermissionGuard>
  )
}
