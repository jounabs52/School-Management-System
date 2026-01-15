'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Printer, Info, Trash2, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'
import {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  getLogoSize,
  applyPdfSettings
} from '@/lib/pdfSettings'

import { convertImageToBase64 } from '@/lib/pdfUtils'
import PDFPreviewModal from '@/components/PDFPreviewModal'


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

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

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
      console.log('🔍 Fetching school details for school_id:', currentUser.school_id)

      const { data, error} = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }

      console.log('✅ School data fetched from database:', data)

      if (!data) {
        console.error('❌ No school data returned')
        toast.error('No school data found')
        return
      }

      // Convert logo URL to base64 if it exists
      console.log('📸 Logo from database:', data.logo_url)
      console.log('📸 Logo type:', typeof data.logo_url)

      let logoBase64 = data.logo_url
      if (data.logo_url && typeof data.logo_url === 'string') {
        if (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://')) {
          console.log('🔄 Converting logo URL to base64...')
          logoBase64 = await convertImageToBase64(data.logo_url)
          console.log('✅ Logo converted to base64:', logoBase64 ? 'Success' : 'Failed')
        } else if (data.logo_url.startsWith('data:image')) {
          console.log('✅ Logo is already base64, using as-is')
        } else {
          console.log('⚠️ Logo format not recognized:', data.logo_url.substring(0, 50))
        }
      } else {
        console.log('❌ No logo found or logo is not a string')
      }

      // Map to expected format
      const schoolData = {
        school_name: data.name,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        logo: logoBase64,
        tagline: data.tagline,
        principal_name: data.principal_name,
        established_date: data.established_date
      }

      console.log('✅ Mapped school data:', schoolData)
      setSchoolDetails(schoolData)
      console.log('✅ School details state updated')
    } catch (error) {
      console.error('❌ Error fetching school details:', error)
      toast.error('Failed to load school data: ' + error.message)
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

    if (!schoolDetails) {
      toast.error('School data not loaded. Please wait and try again.')
      return
    }

    console.log('School Details for PDF:', schoolDetails)

    try {
      // Get PDF settings
      const pdfSettings = getPdfSettings()

      // Create PDF with settings from Settings page
      // Note: Salary slips work best in landscape for 4-copy layout
      const orientation = 'landscape' // Fixed for salary slip layout
      const pageSize = pdfSettings.pageSize || 'a4'
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pageSize
      })

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Get colors from settings
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      const textColor = hexToRgb(pdfSettings.textColor)
      const margins = getMarginValues(pdfSettings.margin)

      // Get employee details
      const staffName = `${payment.staff?.first_name || ''} ${payment.staff?.last_name || ''}`.trim() || 'N/A'
      const employeeNumber = payment.staff?.employee_number || 'N/A'
      const designation = payment.staff?.designation || 'N/A'
      const department = payment.staff?.department || 'N/A'
      const paymentMonth = getMonthName(payment.payment_month)
      const paymentYear = payment.payment_year

      // Payment date calculation
      const paymentDate = payment.payment_date ? new Date(payment.payment_date) : new Date()
      const formatDate = (date) => {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}-${month}-${year}`
      }
      const paymentDateStr = formatDate(paymentDate)

      // School info
      const schoolName = (pdfSettings.includeSchoolName && (schoolDetails?.school_name || schoolDetails?.name))
        ? (schoolDetails?.school_name || schoolDetails?.name).toUpperCase()
        : 'SCHOOL MANAGEMENT SYSTEM'
      const bankName = schoolDetails?.bank_name || 'Bank Name Not Set'

      // Amounts
      const basicSalary = parseFloat(payment.basic_salary || 0)
      const totalAllowances = parseFloat(payment.total_allowances || 0)
      const grossSalary = parseFloat(payment.gross_salary || 0)
      const totalDeductions = parseFloat(payment.total_deductions || 0)
      const netSalary = parseFloat(payment.net_salary || 0)

      // Convert number to words
      const numberToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

        if (num === 0) return 'Zero'
        if (num < 10) return ones[num]
        if (num < 20) return teens[num - 10]
        if (num < 100) {
          const tensDigit = Math.floor(num / 10)
          const onesDigit = num % 10
          return tens[tensDigit] + (onesDigit !== 0 ? ' ' + ones[onesDigit] : '')
        }
        if (num < 1000) {
          const hundreds = Math.floor(num / 100)
          const remainder = num % 100
          return ones[hundreds] + ' Hundred' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '')
        }
        if (num < 100000) {
          const thousands = Math.floor(num / 1000)
          const remainder = num % 1000
          return numberToWords(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '')
        }
        if (num < 10000000) {
          const lakhs = Math.floor(num / 100000)
          const remainder = num % 100000
          return numberToWords(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '')
        }
        return num.toString()
      }

      const amountInWords = numberToWords(Math.round(netSalary)) + ' Only'

      // Four copies layout - same as transport slip
      const copies = [
        { title: 'Copy of Employee', x: 8 },
        { title: 'Copy of Department', x: 81 },
        { title: 'Copy of Accounts', x: 154 },
        { title: 'Copy of Finance', x: 227 }
      ]

      copies.forEach((copy, index) => {
        const startX = copy.x
        const startY = 8
        const copyWidth = 68

        // Header
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...textColor)
        doc.text(schoolName, startX + copyWidth / 2, startY + 3, { align: 'center' })

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(bankName, startX + copyWidth / 2, startY + 8, { align: 'center' })

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'italic')
        doc.text(copy.title, startX + copyWidth / 2, startY + 12, { align: 'center' })

        // Salary Slip Title
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        let currentY = startY + 18
        doc.text('Salary Slip', startX + 1, currentY)

        // Details section
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        const lineHeight = 4.5
        currentY += 6

        // Employee Name
        doc.text('Employee Name', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        const maxNameLength = 35
        const displayName = staffName.length > maxNameLength ? staffName.substring(0, maxNameLength) + '...' : staffName
        doc.text(displayName, startX + 26, currentY)

        // Employee No
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Employee No', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(employeeNumber, startX + 26, currentY)

        // Designation
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Designation', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(designation, startX + 26, currentY)

        // Department
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Department', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(department, startX + 26, currentY)

        // Payment Date
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Payment Date', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(paymentDateStr, startX + 26, currentY)

        // Salary Period
        currentY += lineHeight
        doc.setFont('helvetica', 'bold')
        doc.text('Salary Period', startX + 1, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(`${paymentMonth} ${paymentYear}`, startX + 26, currentY)

        // Table
        currentY += 7
        const tableStartY = currentY

        // Table header - use settings background color
        doc.setFillColor(...headerBgColor)
        doc.setDrawColor(...textColor)
        doc.rect(startX + 1, tableStartY, 9, 5, 'FD')
        doc.rect(startX + 10, tableStartY, 42, 5, 'FD')
        doc.rect(startX + 52, tableStartY, 15, 5, 'FD')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('No', startX + 5.5, tableStartY + 3.5, { align: 'center' })
        doc.text('Particulars', startX + 31, tableStartY + 3.5, { align: 'center' })
        doc.text('Amount', startX + 59.5, tableStartY + 3.5, { align: 'center' })

        // Table row 1 - Basic Salary
        currentY = tableStartY + 5
        doc.setTextColor(...textColor)
        doc.setFont('helvetica', 'normal')
        doc.setDrawColor(0, 0, 0)
        doc.rect(startX + 1, currentY, 9, 6, 'S')
        doc.rect(startX + 10, currentY, 42, 6, 'S')
        doc.rect(startX + 52, currentY, 15, 6, 'S')

        doc.setFontSize(6.5)
        doc.text('1', startX + 5.5, currentY + 3.8, { align: 'center' })
        doc.text('Basic Salary', startX + 31, currentY + 3.8, { align: 'center' })
        doc.text(basicSalary.toLocaleString(), startX + 59.5, currentY + 3.8, { align: 'center' })

        // Table row 2 - Allowances
        currentY += 6
        doc.rect(startX + 1, currentY, 9, 6, 'S')
        doc.rect(startX + 10, currentY, 42, 6, 'S')
        doc.rect(startX + 52, currentY, 15, 6, 'S')

        doc.text('2', startX + 5.5, currentY + 3.8, { align: 'center' })
        doc.text('Total Allowances', startX + 31, currentY + 3.8, { align: 'center' })
        doc.text(totalAllowances.toLocaleString(), startX + 59.5, currentY + 3.8, { align: 'center' })

        // Table row 3 - Gross Salary
        currentY += 6
        doc.rect(startX + 1, currentY, 9, 6, 'S')
        doc.rect(startX + 10, currentY, 42, 6, 'S')
        doc.rect(startX + 52, currentY, 15, 6, 'S')

        doc.text('3', startX + 5.5, currentY + 3.8, { align: 'center' })
        doc.text('Gross Salary', startX + 31, currentY + 3.8, { align: 'center' })
        doc.text(grossSalary.toLocaleString(), startX + 59.5, currentY + 3.8, { align: 'center' })

        // Table row 4 - Deductions
        currentY += 6
        doc.rect(startX + 1, currentY, 9, 6, 'S')
        doc.rect(startX + 10, currentY, 42, 6, 'S')
        doc.rect(startX + 52, currentY, 15, 6, 'S')

        doc.text('4', startX + 5.5, currentY + 3.8, { align: 'center' })
        doc.text('Total Deductions', startX + 31, currentY + 3.8, { align: 'center' })
        doc.text(`-${totalDeductions.toLocaleString()}`, startX + 59.5, currentY + 3.8, { align: 'center' })

        // Net Salary row
        currentY += 6
        doc.setDrawColor(0, 0, 0)
        doc.rect(startX + 1, currentY, 51, 5.5, 'S')
        doc.rect(startX + 52, currentY, 15, 5.5, 'S')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.text('Net Salary', startX + 26.5, currentY + 3.8, { align: 'center' })
        doc.text(netSalary.toLocaleString(), startX + 59.5, currentY + 3.8, { align: 'center' })

        // Amount in words
        currentY += 8
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(amountInWords, startX + copyWidth / 2, currentY, { align: 'center' })

        // Footer note
        currentY += 6
        doc.setFontSize(5.5)
        doc.setFont('helvetica', 'italic')
        doc.text('This is a computer-generated salary slip', startX + copyWidth / 2, currentY, { align: 'center' })

        // Vertical separator line (except for last copy)
        if (index < 3) {
          doc.setDrawColor(180, 180, 180)
          doc.setLineDash([3, 2])
          doc.line(startX + copyWidth + 2.5, 5, startX + copyWidth + 2.5, 95)
          doc.setLineDash([])
        }
      })

      // Generate PDF blob for preview
      const fileName = `Salary_Slip_${staffName.replace(/\s+/g, '_')}_${paymentMonth}_${paymentYear}.pdf`
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      toast.success('Salary slip generated successfully. Preview opened.')
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
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)

      // Then delete the payment
      const { error } = await supabase
        .from('salary_payments')
        .delete()
        .eq('id', paymentToDelete.id)
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)

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

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
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
      <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
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
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
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

        <p className="text-sm text-gray-600">
          There are <span className="font-semibold text-red-600">{filteredPayments.length}</span> salary slips.
        </p>
      </div>

      {/* Salary Slips Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading salary slips...</div>
        ) : filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Sr.</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Staff Name</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Narration</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-right font-semibold">Total</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-right font-semibold">Balance</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Status</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => {
                  const balance = calculateBalance(payment)

                  return (
                    <tr key={payment.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                      <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{index + 1}</td>
                      <td className="border border-gray-200 px-3 py-2.5">
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
                      <td className="border border-gray-200 px-3 py-2.5 text-gray-700">
                        Salary Slip ({getMonthName(payment.payment_month)} - {payment.payment_year})
                      </td>
                      <td className="border border-gray-200 px-3 py-2.5 text-right font-semibold text-gray-800">
                        Rs{parseFloat(payment.net_salary || 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-200 px-3 py-2.5 text-right font-semibold text-gray-800">
                        Rs{balance.toLocaleString()}
                      </td>
                      <td className="border border-gray-200 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            payment.status === 'paid'
                              ? 'bg-green-500'
                              : payment.status === 'pending'
                              ? 'bg-orange-500'
                              : payment.status === 'partial'
                              ? 'bg-yellow-500'
                              : 'bg-gray-500'
                          }`}></span>
                          <span className="text-xs font-medium text-gray-700">
                            {payment.status === 'paid'
                              ? 'Full Paid'
                              : payment.status === 'pending'
                              ? 'Pending'
                              : payment.status === 'partial'
                              ? 'Partial'
                              : payment.status
                            }
                          </span>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-3 py-2.5">
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
                      <tr className="bg-blue-900 text-white">
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
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete the salary payment for <span className="font-bold text-red-600">{paymentToDelete.staff?.first_name} {paymentToDelete.staff?.last_name}</span> ({getMonthName(paymentToDelete.payment_month)} {paymentToDelete.payment_year})? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setPaymentToDelete(null)
                    }}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePayment}
                    disabled={deleting}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
        isOpen={showPdfPreview}
        onClose={handleClosePdfPreview}
      />
    </div>
  )
}
