'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Filter, Download, Printer, Edit, Trash2, X, DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'
import {
  addPDFHeader,
  addPDFFooter,
  addPDFWatermark,
  formatCurrency,
  convertImageToBase64,
  PDF_COLORS
} from '@/lib/pdfUtils'

export default function ExpensesPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [schoolDetails, setSchoolDetails] = useState(null)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)

  // Form data
  const [formData, setFormData] = useState({
    expense_category_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'cash',
    invoice_number: '',
    vendor_name: '',
    description: '',
    status: 'pending'
  })

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
      loadExpenses()
      loadCategories()
      fetchSchoolDetails()
    }
  }, [currentUser])

  useEffect(() => {
    filterExpenses()
  }, [expenses, searchQuery, categoryFilter, statusFilter, paymentMethodFilter, startDate, endDate])

  // Apply blur effect to sidebar when modals are open
  useEffect(() => {
    const anyModalOpen = showAddModal || showEditModal || showDeleteModal

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
  }, [showAddModal, showEditModal, showDeleteModal])

  const fetchSchoolDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error

      // Convert logo URL to base64 if it exists
      let logoBase64 = data.logo_url
      if (data.logo_url && (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://'))) {
        console.log('🔄 Converting logo URL to base64...')
        logoBase64 = await convertImageToBase64(data.logo_url)
        console.log('✅ Logo converted to base64:', logoBase64 ? 'Success' : 'Failed')
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

      setSchoolDetails(schoolData)
    } catch (error) {
      console.error('Error fetching school details:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('category_name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load expense categories')
    }
  }

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          category:expense_category_id (
            id,
            category_name
          ),
          paid_by_user:paid_by (
            id,
            username
          ),
          approved_by_user:approved_by (
            id,
            username
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error loading expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const filterExpenses = () => {
    let filtered = [...expenses]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(expense =>
        expense.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.expense_category_id === categoryFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.status === statusFilter)
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(expense => expense.payment_method === paymentMethodFilter)
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(expense => expense.expense_date >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter(expense => expense.expense_date <= endDate)
    }

    setFilteredExpenses(filtered)
  }

  const handleAddExpense = async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          school_id: currentUser.school_id,
          ...formData,
          paid_by: currentUser.id
        })

      if (error) throw error

      toast.success('Expense added successfully!')
      setShowAddModal(false)
      resetForm()
      await loadExpenses()
    } catch (error) {
      console.error('Error adding expense:', error)
      toast.error('Failed to add expense')
    }
  }

  const handleEditExpense = async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update(formData)
        .eq('id', selectedExpense.id)

      if (error) throw error

      toast.success('Expense updated successfully!')
      setShowEditModal(false)
      setSelectedExpense(null)
      resetForm()
      await loadExpenses()
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Failed to update expense')
    }
  }

  const handleDeleteExpense = async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', selectedExpense.id)

      if (error) throw error

      toast.success('Expense deleted successfully!')
      setShowDeleteModal(false)
      setSelectedExpense(null)
      await loadExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const handleApproveExpense = async (expenseId) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_by: currentUser.id
        })
        .eq('id', expenseId)

      if (error) throw error

      toast.success('Expense approved successfully!')
      await loadExpenses()
    } catch (error) {
      console.error('Error approving expense:', error)
      toast.error('Failed to approve expense')
    }
  }

  const resetForm = () => {
    setFormData({
      expense_category_id: '',
      expense_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_method: 'cash',
      invoice_number: '',
      vendor_name: '',
      description: '',
      status: 'pending'
    })
  }

  const openEditModal = (expense) => {
    setSelectedExpense(expense)
    setFormData({
      expense_category_id: expense.expense_category_id,
      expense_date: expense.expense_date,
      amount: expense.amount,
      payment_method: expense.payment_method,
      invoice_number: expense.invoice_number || '',
      vendor_name: expense.vendor_name || '',
      description: expense.description || '',
      status: expense.status
    })
    setShowEditModal(true)
  }

  const handlePrint = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No data to print')
      return
    }

    if (!schoolDetails) {
      toast.error('School data not loaded. Please wait and try again.')
      return
    }

    try {
      const pdf = new jsPDF('l', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()

      // Add professional header
      const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
      const headerOptions = {
        subtitle: startDate && endDate
          ? `${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`
          : 'All Expenses',
        info: `Total Expenses: ${filteredExpenses.length} | Amount: ${formatCurrency(totalAmount)}`
      }
      let yPos = addPDFHeader(pdf, schoolDetails, 'EXPENSE REPORT', headerOptions)

      // Add watermark
      addPDFWatermark(pdf, schoolDetails, 'CONFIDENTIAL')

      yPos += 5

      // Prepare table data
      const tableData = filteredExpenses.map((expense, index) => [
        index + 1,
        new Date(expense.expense_date).toLocaleDateString('en-GB'),
        expense.category?.category_name || 'N/A',
        expense.vendor_name || 'N/A',
        expense.invoice_number || 'N/A',
        parseFloat(expense.amount || 0).toLocaleString(),
        expense.payment_method?.toUpperCase() || 'N/A',
        expense.status.charAt(0).toUpperCase() + expense.status.slice(1)
      ])

      // Add total row
      const total = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
      const totals = ['', '', '', '', 'TOTAL', total.toLocaleString(), '', '']

      autoTable(pdf, {
        startY: yPos,
        head: [['#', 'Date', 'Category', 'Vendor', 'Invoice#', 'Amount (Rs)', 'Payment', 'Status']],
        body: [...tableData, totals],
        theme: 'grid',
        headStyles: {
          fillColor: PDF_COLORS.headerBg,
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 40 },
          3: { cellWidth: 45 },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 25, halign: 'center' },
          7: { cellWidth: 25, halign: 'center' }
        },
        didParseCell: function(data) {
          if (data.row.index === tableData.length && data.section === 'body') {
            data.cell.styles.fillColor = [220, 220, 220]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      })

      // Add professional footer
      addPDFFooter(pdf, 1, 1)

      pdf.save(`Expense-Report-${new Date().toLocaleDateString('en-GB')}.pdf`)
      toast.success('Expense report downloaded successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF: ' + error.message)
    }
  }

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No data to export')
      return
    }

    try {
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }

      const headers = ['#', 'Date', 'Category', 'Vendor', 'Invoice Number', 'Amount', 'Payment Method', 'Status', 'Description']

      const rows = filteredExpenses.map((expense, index) => [
        index + 1,
        new Date(expense.expense_date).toLocaleDateString('en-GB'),
        expense.category?.category_name || 'N/A',
        expense.vendor_name || 'N/A',
        expense.invoice_number || 'N/A',
        parseFloat(expense.amount || 0),
        expense.payment_method || 'N/A',
        expense.status,
        expense.description || ''
      ])

      const total = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
      const totals = ['', '', '', '', 'TOTAL', total, '', '', '']

      let csvContent = headers.map(escapeCSV).join(',') + '\n'
      rows.forEach(row => {
        csvContent += row.map(escapeCSV).join(',') + '\n'
      })
      csvContent += totals.map(escapeCSV).join(',') + '\n'

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `Expense-Report-${new Date().toLocaleDateString('en-GB')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Expense report exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    }
  }

  const calculateStats = () => {
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
    const pendingExpenses = filteredExpenses.filter(exp => exp.status === 'pending')
    const approvedExpenses = filteredExpenses.filter(exp => exp.status === 'approved')
    const paidExpenses = filteredExpenses.filter(exp => exp.status === 'paid')

    return {
      total: totalExpenses,
      pending: pendingExpenses.length,
      approved: approvedExpenses.length,
      paid: paidExpenses.length
    }
  }

  const stats = calculateStats()

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Expenses</p>
              <p className="text-base font-bold">Rs {stats.total.toLocaleString()}</p>
            </div>
            <DollarSign size={40} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm mb-1">Pending</p>
              <p className="text-base font-bold">{stats.pending}</p>
            </div>
            <Clock size={40} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Approved</p>
              <p className="text-base font-bold">{stats.approved}</p>
            </div>
            <CheckCircle size={40} className="opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Paid</p>
              <p className="text-base font-bold">{stats.paid}</p>
            </div>
            <TrendingUp size={40} className="opacity-80" />
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-2">
        <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by vendor, invoice, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Filter size={16} />
              Filters
            </button>
            <button
              onClick={handlePrint}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleExport}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add Expense
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading expenses...</div>
        ) : filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">#</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Date</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Category</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Vendor</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-left font-semibold">Invoice#</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Payment</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Status</th>
                  <th className="border border-blue-800 px-3 py-2.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, index) => (
                  <tr key={expense.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                    <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{index + 1}</td>
                    <td className="border border-gray-200 px-3 py-2.5 text-gray-700">
                      {new Date(expense.expense_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                        {expense.category?.category_name || 'N/A'}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{expense.vendor_name || 'N/A'}</td>
                    <td className="border border-gray-200 px-3 py-2.5 text-gray-700">{expense.invoice_number || 'N/A'}</td>
                    <td className="border border-gray-200 px-3 py-2.5 text-right font-semibold text-gray-900">
                      Rs {parseFloat(expense.amount || 0).toLocaleString()}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-center">
                      <span className="text-gray-600 text-xs">
                        {expense.payment_method?.toUpperCase() || 'N/A'}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        expense.status === 'paid' ? 'bg-green-100 text-green-700' :
                        expense.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        {expense.status === 'pending' && (
                          <button
                            onClick={() => handleApproveExpense(expense.id)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(expense)}
                          className="text-blue-900 hover:text-blue-700 transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExpense(expense)
                            setShowDeleteModal(true)
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No expenses found</p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-base font-bold text-gray-800">Add New Expense</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={formData.expense_category_id}
                  onChange={(e) => setFormData({ ...formData, expense_category_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="INV-001"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
                <input
                  type="text"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter expense details..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-base font-bold text-gray-800">Edit Expense</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={formData.expense_category_id}
                  onChange={(e) => setFormData({ ...formData, expense_category_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="INV-001"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
                <input
                  type="text"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter expense details..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedExpense(null)
                  resetForm()
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditExpense}
                className="px-6 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors"
              >
                Update Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-3">
              <h3 className="text-base font-bold text-gray-900 mb-2">Delete Expense</h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this expense? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedExpense(null)
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExpense}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
