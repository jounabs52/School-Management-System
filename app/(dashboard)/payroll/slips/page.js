'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Printer, Info, Trash2, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'

export default function SalarySlipsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [salaryPayments, setSalaryPayments] = useState([])
  const [filteredPayments, setFilteredPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [schoolDetails, setSchoolDetails] = useState(null)

  // Modal states
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
      loadSalaryPayments()
      fetchSchoolDetails()
    }
  }, [currentUser])

  // Apply blur effect to sidebar when modals are open
  useEffect(() => {
    const anyModalOpen = showDetailsModal || showDeleteModal

    if (anyModalOpen) {
      document.body.style.overflow = 'hidden'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = 'blur(4px)'
        sidebar.style.pointerEvents = 'none'
      }
    } else {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }

    return () => {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }
  }, [showDetailsModal, showDeleteModal])

  const fetchSchoolDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('school_name, logo')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error
      setSchoolDetails(data)
    } catch (error) {
      console.error('Error fetching school details:', error)
    }
  }

  useEffect(() => {
    filterPayments()
  }, [salaryPayments, searchQuery, statusFilter, searchType])

  const loadSalaryPayments = async () => {
    console.log('=== Loading Salary Payments ===')
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
        .from('salary_payments')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            father_name,
            employee_number,
            designation,
            department,
            photo_url
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('payment_year', { ascending: false })
        .order('payment_month', { ascending: false })

      console.log('Query Result:', { data, error })
      console.log('Number of payments found:', data?.length || 0)

      if (error) throw error

      setSalaryPayments(data || [])
      console.log('Salary payments state updated')
    } catch (error) {
      console.error('Error loading salary payments:', error)
      toast.error('Failed to load salary slips')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = [...salaryPayments]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()

      filtered = filtered.filter(payment => {
        if (searchType === 'staff_name') {
          return (
            payment.staff?.first_name?.toLowerCase().includes(query) ||
            payment.staff?.last_name?.toLowerCase().includes(query)
          )
        } else if (searchType === 'employee_number') {
          return payment.staff?.employee_number?.toLowerCase().includes(query)
        } else if (searchType === 'month') {
          return getMonthName(payment.payment_month).toLowerCase().includes(query)
        } else {
          // Search all fields
          return (
            payment.staff?.first_name?.toLowerCase().includes(query) ||
            payment.staff?.last_name?.toLowerCase().includes(query) ||
            payment.staff?.employee_number?.toLowerCase().includes(query) ||
            getMonthName(payment.payment_month).toLowerCase().includes(query) ||
            payment.payment_year.toString().includes(query)
          )
        }
      })
    }

    setFilteredPayments(filtered)
  }

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const calculateBalance = (payment) => {
    // Balance = Net Salary - (if any partial payment made)
    if (payment.status === 'paid') {
      return 0
    } else if (payment.status === 'pending') {
      return parseFloat(payment.net_salary || 0)
    } else if (payment.status === 'partial') {
      // For partial payments, you might track actual amount paid separately
      // For now, show full amount as balance
      return parseFloat(payment.net_salary || 0)
    }
    return parseFloat(payment.net_salary || 0)
  }

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment)
    setShowDetailsModal(true)
  }

  const handlePrintSlip = async (payment) => {
    if (!payment) {
      toast.error('Invalid payment data')
      return
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPos = 20

      // Add school logo if available
      if (schoolDetails?.logo) {
        try {
          // Add logo centered at top
          const imgWidth = 25
          const imgHeight = 25
          const imgX = (pageWidth - imgWidth) / 2
          pdf.addImage(schoolDetails.logo, 'PNG', imgX, yPos, imgWidth, imgHeight)
          yPos += 30
        } catch (error) {
          console.error('Error adding logo:', error)
          toast.error('Could not load school logo, generating slip without logo...')
          yPos += 5
        }
      }

      // School Name
      if (schoolDetails?.school_name) {
        pdf.setFontSize(20)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(31, 78, 120)
        pdf.text(schoolDetails.school_name, pageWidth / 2, yPos, { align: 'center' })
        yPos += 10
      }

      // Title
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text('SALARY SLIP', pageWidth / 2, yPos, { align: 'center' })
      yPos += 8

      // Period
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 100, 100)
      pdf.text(`${getMonthName(payment.payment_month)} ${payment.payment_year}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 12

      // Divider line
      pdf.setDrawColor(200, 200, 200)
      pdf.line(15, yPos, pageWidth - 15, yPos)
      yPos += 10

      // Employee Information Section
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(31, 78, 120)
      pdf.text('Employee Information', 15, yPos)
      yPos += 8

      // Employee details table
      const employeeData = [
        ['Name:', `${payment.staff?.first_name || ''} ${payment.staff?.last_name || ''}`.trim() || 'N/A', 'Employee No:', payment.staff?.employee_number || 'N/A'],
        ['Designation:', payment.staff?.designation || 'N/A', 'Department:', payment.staff?.department || 'N/A'],
        ['Payment Date:', payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : 'N/A', 'Payment Method:', payment.payment_method?.replace('_', ' ').toUpperCase() || 'N/A']
      ]

      autoTable(pdf, {
        startY: yPos,
        body: employeeData,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35, textColor: [80, 80, 80] },
          1: { cellWidth: 60, textColor: [0, 0, 0] },
          2: { fontStyle: 'bold', cellWidth: 35, textColor: [80, 80, 80] },
          3: { cellWidth: 50, textColor: [0, 0, 0] }
        }
      })

      yPos = pdf.lastAutoTable.finalY + 12

      // Salary Breakdown Section
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(31, 78, 120)
      pdf.text('Salary Breakdown', 15, yPos)
      yPos += 5

      // Salary breakdown table
      const salaryData = [
        ['Basic Salary', `Rs ${parseFloat(payment.basic_salary || 0).toLocaleString()}`],
        ['Total Allowances', `Rs ${parseFloat(payment.total_allowances || 0).toLocaleString()}`],
        ['Gross Salary', `Rs ${parseFloat(payment.gross_salary || 0).toLocaleString()}`],
        ['Total Deductions', `Rs ${parseFloat(payment.total_deductions || 0).toLocaleString()}`],
        ['NET SALARY', `Rs ${parseFloat(payment.net_salary || 0).toLocaleString()}`]
      ]

      autoTable(pdf, {
        startY: yPos,
        head: [['Description', 'Amount']],
        body: salaryData,
        theme: 'grid',
        headStyles: {
          fillColor: [31, 78, 120],
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 130, fontStyle: 'normal' },
          1: { cellWidth: 50, halign: 'right', fontStyle: 'normal' }
        },
        didParseCell: function(data) {
          // Highlight gross salary row
          if (data.row.index === 2 && data.section === 'body') {
            data.cell.styles.fillColor = [227, 242, 253]
            data.cell.styles.fontStyle = 'bold'
          }
          // Highlight net salary row
          if (data.row.index === 4 && data.section === 'body') {
            data.cell.styles.fillColor = [232, 245, 233]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 12
            data.cell.styles.textColor = [27, 94, 32]
          }
          // Color deductions red
          if (data.row.index === 3 && data.section === 'body' && data.column.index === 1) {
            data.cell.styles.textColor = [198, 40, 40]
          }
          // Color allowances green
          if (data.row.index === 1 && data.section === 'body' && data.column.index === 1) {
            data.cell.styles.textColor = [27, 94, 32]
          }
        }
      })

      yPos = pdf.lastAutoTable.finalY + 10

      // Remarks if available
      if (payment.remarks) {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(80, 80, 80)
        pdf.text('Remarks:', 15, yPos)
        yPos += 5
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(0, 0, 0)
        const remarksLines = pdf.splitTextToSize(payment.remarks, pageWidth - 30)
        pdf.text(remarksLines, 15, yPos)
        yPos += remarksLines.length * 5 + 5
      }

      // Footer
      const footerY = pageHeight - 20
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'italic')
      pdf.setTextColor(150, 150, 150)
      pdf.text('This is a computer-generated salary slip. No signature required.', pageWidth / 2, footerY, { align: 'center' })
      pdf.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, footerY + 5, { align: 'center' })

      // Auto download PDF
      const fileName = `Salary-Slip-${payment.staff?.first_name || 'Staff'}-${payment.staff?.last_name || ''}-${getMonthName(payment.payment_month)}-${payment.payment_year}.pdf`
      pdf.save(fileName)
      toast.success('Salary slip downloaded successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      const errorMessage = error.message || 'Unknown error occurred'
      toast.error(`Failed to generate salary slip: ${errorMessage}`)
    }
  }

  const confirmDelete = (payment) => {
    setPaymentToDelete(payment)
    setShowDeleteModal(true)
  }

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return

    setDeleting(true)
    try {
      // First delete any associated salary slips
      await supabase
        .from('salary_slips')
        .delete()
        .eq('payment_id', paymentToDelete.id)

      // Then delete the payment
      const { error } = await supabase
        .from('salary_payments')
        .delete()
        .eq('id', paymentToDelete.id)

      if (error) throw error

      toast.success('Payment record deleted successfully')
      setShowDeleteModal(false)
      setPaymentToDelete(null)
      await loadSalaryPayments()
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast.error('Failed to delete payment record')
    } finally {
      setDeleting(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSearchType('all')
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="p-1">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-2 mb-2">
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          {/* Search Type Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Default Search</option>
              <option value="staff_name">Staff Name</option>
              <option value="employee_number">Employee Number</option>
              <option value="month">Month</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Advanced Search Toggle */}
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Filter size={18} />
            Advance Search
          </button>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="border-t pt-2 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 text-sm rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          There are <span className="font-bold text-blue-600">{filteredPayments.length}</span> salary slips.
        </p>
      </div>

      {/* Salary Slips Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading salary slips...</div>
        ) : filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-2 py-1 text-xs text-left font-semibold">Sr.</th>
                  <th className="px-2 py-1 text-xs text-left font-semibold">Staff Name</th>
                  <th className="px-2 py-1 text-xs text-left font-semibold">Narration</th>
                  <th className="px-2 py-1 text-xs text-right font-semibold">Total</th>
                  <th className="px-2 py-1 text-xs text-right font-semibold">Balance</th>
                  <th className="px-2 py-1 text-xs text-center font-semibold">Status</th>
                  <th className="px-2 py-1 text-xs text-center font-semibold">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => {
                  const balance = calculateBalance(payment)

                  return (
                    <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1 text-xs text-gray-700">{index + 1}</td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-2">
                          {payment.staff?.photo_url ? (
                            <img
                              src={payment.staff.photo_url}
                              alt={`${payment.staff.first_name} ${payment.staff.last_name}`}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold ${payment.staff?.photo_url ? 'hidden' : ''}`}>
                            {payment.staff?.first_name?.[0]}{payment.staff?.last_name?.[0]}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-800">
                              {payment.staff?.first_name} {payment.staff?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payment.staff?.employee_number || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-700">
                        Salary Slip ({getMonthName(payment.payment_month)} - {payment.payment_year})
                      </td>
                      <td className="px-2 py-1 text-xs text-right font-semibold text-gray-800">
                        Rs{parseFloat(payment.net_salary || 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-1 text-xs text-right font-semibold text-gray-800">
                        Rs{balance.toLocaleString()}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                          payment.status === 'paid'
                            ? 'bg-green-500 text-white'
                            : payment.status === 'pending'
                            ? 'bg-orange-500 text-white'
                            : payment.status === 'partial'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-500 text-white'
                        }`}>
                          {payment.status === 'paid'
                            ? 'Full Paid'
                            : payment.status === 'pending'
                            ? 'Pending'
                            : payment.status === 'partial'
                            ? 'Partial'
                            : payment.status
                          }
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetails(payment)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="View Details"
                          >
                            <Info size={18} />
                          </button>
                          <button
                            onClick={() => handlePrintSlip(payment)}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="Print Slip"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => confirmDelete(payment)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No salary slips found. {searchQuery && 'Try adjusting your search criteria.'}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPayment && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowDetailsModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-t-xl">
                <h3 className="text-sm font-bold">Salary Slip Details</h3>
                <p className="text-blue-100 text-xs">
                  {selectedPayment.staff?.first_name} {selectedPayment.staff?.last_name} - {getMonthName(selectedPayment.payment_month)} {selectedPayment.payment_year}
                </p>
              </div>
              <div className="p-2 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Staff Information */}
                <div className="mb-2">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Staff Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedPayment.staff?.first_name} {selectedPayment.staff?.last_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Employee No:</span>
                      <span className="ml-2 font-medium">{selectedPayment.staff?.employee_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Designation:</span>
                      <span className="ml-2 font-medium">{selectedPayment.staff?.designation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Department:</span>
                      <span className="ml-2 font-medium">{selectedPayment.staff?.department || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown */}
                <div className="mb-2">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Salary Breakdown</h4>
                  <table className="w-full border-collapse border border-gray-300">
                    <tbody>
                      <tr className="bg-gray-100">
                        <td className="border border-gray-300 px-2 py-1 text-xs font-medium">Basic Salary</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-right">Rs{parseFloat(selectedPayment.basic_salary || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-green-700">Total Allowances</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-right text-green-700">+Rs{parseFloat(selectedPayment.total_allowances || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="bg-blue-50 font-semibold">
                        <td className="border border-gray-300 px-2 py-1 text-xs">Gross Salary</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-right text-blue-600">Rs{parseFloat(selectedPayment.gross_salary || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-red-700">Total Deductions</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-right text-red-700">-Rs{parseFloat(selectedPayment.total_deductions || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="bg-green-100 font-bold">
                        <td className="border border-gray-300 px-2 py-1 text-xs">Net Salary</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-right text-green-700">Rs{parseFloat(selectedPayment.net_salary || 0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Payment Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Payment Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Payment Date:</span>
                      <span className="ml-2 font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="ml-2 font-medium capitalize">{selectedPayment.payment_method?.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="ml-2 font-medium">{selectedPayment.transaction_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 font-medium ${
                        selectedPayment.status === 'paid' ? 'text-green-600' :
                        selectedPayment.status === 'pending' ? 'text-orange-600' :
                        selectedPayment.status === 'partial' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {selectedPayment.status === 'paid' ? 'Full Paid' :
                         selectedPayment.status === 'pending' ? 'Pending' :
                         selectedPayment.status === 'partial' ? 'Partial' :
                         selectedPayment.status}
                      </span>
                    </div>
                  </div>
                  {selectedPayment.remarks && (
                    <div className="mt-2">
                      <span className="text-gray-600 text-xs">Remarks:</span>
                      <p className="mt-1 text-xs text-gray-700 bg-gray-50 p-2 rounded">{selectedPayment.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-3 py-2 flex justify-end gap-2">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 text-sm rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && paymentToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-t-xl">
                <h3 className="text-sm font-bold">Confirm Delete</h3>
              </div>
              <div className="p-2">
                <p className="text-gray-700 text-xs mb-2">
                  Are you sure you want to delete the salary payment for <span className="font-bold text-red-600">{paymentToDelete.staff?.first_name} {paymentToDelete.staff?.last_name}</span> ({getMonthName(paymentToDelete.payment_month)} {paymentToDelete.payment_year})? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setPaymentToDelete(null)
                    }}
                    disabled={deleting}
                    className="flex-1 px-4 py-1 text-sm text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePayment}
                    disabled={deleting}
                    className="flex-1 px-4 py-1 text-sm bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
