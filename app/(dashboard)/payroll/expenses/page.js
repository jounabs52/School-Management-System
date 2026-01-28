'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Filter, Download, Printer, Edit, Trash2, X, DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'
import {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  getLogoSize,
  applyPdfSettings,
  getAutoTableStyles,
  getCellPadding,
  getLineWidth
} from '@/lib/pdfSettings'
import { convertImageToBase64 } from '@/lib/pdfUtils'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardInfoGrid } from '@/components/DataCard'

function ExpensesPageContent() {
  const [currentUser, setCurrentUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [schoolDetails, setSchoolDetails] = useState(null)

  // Tab state
  const [activeTab, setActiveTab] = useState('expenses')

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Expense Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)

  // Category Modals
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false)
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Expense Form data
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

  // Category Form data
  const [categoryFormData, setCategoryFormData] = useState({
    category_name: '',
    description: '',
    status: 'active'
  })

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
    const anyModalOpen = showAddModal || showEditModal || showDeleteModal ||
                        showAddCategoryModal || showEditCategoryModal || showDeleteCategoryModal

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
  }, [showAddModal, showEditModal, showDeleteModal, showAddCategoryModal, showEditCategoryModal, showDeleteCategoryModal])

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
        logoBase64 = await convertImageToBase64(data.logo_url)
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
        principal_name: data.principal_name,
        established_date: data.established_date,
        code: data.code
      }

      setSchoolDetails(schoolData)
    } catch (error) {
      console.error('Error fetching school details:', error)
      toast.error('Failed to load school details')
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

      // Always set categories, even if empty array
      setCategories(data || [])

      // Only show error if there's an actual error AND no data was retrieved
      if (error && !data) {
        throw error
      }
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
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .order('expense_date', { ascending: false })

      // Always set expenses, even if empty array
      setExpenses(data || [])

      // Only show error if there's an actual error AND no data was retrieved
      if (error && !data) {
        throw error
      }
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
          user_id: currentUser.id,
          ...formData,
          paid_by: currentUser.id
        })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      toast.success('Expense added successfully!')
      setShowAddModal(false)
      resetForm()
      await loadExpenses()
    } catch (error) {
      console.error('Error adding expense:', error)
      toast.error(`Failed to add expense: ${error.message}`)
    }
  }

  const handleEditExpense = async () => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update(formData)
        .eq('id', selectedExpense.id)
        .eq('school_id', currentUser.school_id)

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
        .eq('school_id', currentUser.school_id)

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
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      toast.success('Expense approved successfully!')
      await loadExpenses()
    } catch (error) {
      console.error('Error approving expense:', error)
      toast.error('Failed to approve expense')
    }
  }

  // Category Management Functions
  const handleAddCategory = async () => {
    if (!categoryFormData.category_name) {
      toast.error('Category name is required')
      return
    }

    try {
      const { error } = await supabase
        .from('expense_categories')
        .insert({
          ...categoryFormData,
          school_id: currentUser.school_id,
          user_id: currentUser.id
        })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      toast.success('Category added successfully!')
      setShowAddCategoryModal(false)
      resetCategoryForm()
      await loadCategories()
    } catch (error) {
      console.error('Error adding category:', error)
      toast.error(`Failed to add category: ${error.message}`)
    }
  }

  const handleEditCategory = async () => {
    if (!categoryFormData.category_name) {
      toast.error('Category name is required')
      return
    }

    try {
      const { error } = await supabase
        .from('expense_categories')
        .update(categoryFormData)
        .eq('id', selectedCategory.id)
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      toast.success('Category updated successfully!')
      setShowEditCategoryModal(false)
      setSelectedCategory(null)
      resetCategoryForm()
      await loadCategories()
    } catch (error) {
      console.error('Error updating category:', error)
      toast.error('Failed to update category')
    }
  }

  const handleDeleteCategory = async () => {
    try {
      // Check if category is being used by any expenses
      const { data: expensesUsingCategory, error: checkError } = await supabase
        .from('expenses')
        .select('id')
        .eq('expense_category_id', selectedCategory.id)
        .eq('school_id', currentUser.school_id)
        .limit(1)

      if (checkError) throw checkError

      if (expensesUsingCategory && expensesUsingCategory.length > 0) {
        toast.error('Cannot delete category. It is being used by expenses.')
        return
      }

      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', selectedCategory.id)
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      toast.success('Category deleted successfully!')
      setShowDeleteCategoryModal(false)
      setSelectedCategory(null)
      await loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  const openEditCategoryModal = (category) => {
    setSelectedCategory(category)
    setCategoryFormData({
      category_name: category.category_name,
      description: category.description || '',
      status: category.status
    })
    setShowEditCategoryModal(true)
  }

  const openDeleteCategoryModal = (category) => {
    setSelectedCategory(category)
    setShowDeleteCategoryModal(true)
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

  const resetCategoryForm = () => {
    setCategoryFormData({
      category_name: '',
      description: '',
      status: 'active'
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

  const handlePrint = async () => {
    if (filteredExpenses.length === 0) {
      toast.error('No data to print')
      return
    }

    if (!schoolDetails) {
      toast.error('School data not loaded. Please wait and try again.')
      return
    }

    try {
      const pdfSettings = getPdfSettings()

      // Create PDF with settings from Settings page
      const orientation = pdfSettings.orientation === 'portrait' ? 'p' : 'l'
      const pageSize = pdfSettings.pageSize || 'a4'
      const pdf = new jsPDF(orientation, 'mm', pageSize)
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margins = getMarginValues(pdfSettings.margin)

      // Apply PDF settings (font, etc.)
      applyPdfSettings(pdf, pdfSettings)

      // Get colors from settings
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      const textColor = hexToRgb(pdfSettings.textColor)
      const alternateRowColor = hexToRgb(pdfSettings.alternateRowColor)

      // Header Section with blue background box
      const headerHeight = 45
      let yPos = 10

      // Draw blue background rectangle
      pdf.setFillColor(...headerBgColor)
      pdf.rect(0, 0, pageWidth, headerHeight, 'F')

      // Add "Generated" date in top right corner
      if (pdfSettings.includeGeneratedDate) {
        const generatedDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(255, 255, 255)
        pdf.text(`Generated: ${generatedDate}`, pageWidth - 10, 8, { align: 'right' })
      }

      // Add logo in white box on the left if enabled
      if (pdfSettings.includeLogo && schoolDetails.logo) {
        try {
          const logoSize = getLogoSize(pdfSettings.logoSize)
          const logoBoxSize = logoSize.width + 8
          const logoBoxX = 15
          const logoBoxY = (headerHeight - logoBoxSize) / 2 + 5

          // Draw white box for logo
          pdf.setFillColor(255, 255, 255)
          pdf.roundedRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 3, 3, 'F')

          // Add logo centered in white box
          const logoX = logoBoxX + 4
          const logoY = logoBoxY + 4
          pdf.addImage(schoolDetails.logo, 'PNG', logoX, logoY, logoSize.width, logoSize.height)
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // Center section with school name and title
      yPos = 18

      // School name
      if (pdfSettings.includeSchoolName && (schoolDetails.school_name || schoolDetails.name)) {
        const schoolName = schoolDetails.school_name || schoolDetails.name
        pdf.setFontSize(pdfSettings.schoolNameFontSize || 18)
        pdf.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
        pdf.setTextColor(255, 255, 255)
        pdf.text(schoolName, pageWidth / 2, yPos, { align: 'center' })
        yPos += 8
      }

      // Title
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(255, 255, 255)
      pdf.text('EXPENSE REPORT', pageWidth / 2, yPos, { align: 'center' })
      yPos += 6

      // Subtitle with date range
      const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
      const subtitle = startDate && endDate
        ? `${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`
        : 'All Expenses'

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(255, 255, 255)
      pdf.text(subtitle, pageWidth / 2, yPos, { align: 'center' })

      // Reset y position to start content after header
      yPos = headerHeight + 8

      // Summary information below header
      pdf.setTextColor(...textColor)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Total Expenses: ${filteredExpenses.length} | Total Amount: Rs ${totalAmount.toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 8

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

      // Get autoTable styles from centralized settings
      const autoTableStyles = getAutoTableStyles(pdfSettings)

      autoTable(pdf, {
        startY: yPos,
        head: [['#', 'Date', 'Category', 'Vendor', 'Invoice#', 'Amount (Rs)', 'Payment', 'Status']],
        body: [...tableData, totals],
        ...autoTableStyles,
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
            // Total row styling
            data.cell.styles.fillColor = headerBgColor
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      })

      // Add footer if enabled
      if (pdfSettings.includeFooter && pdfSettings.footerText) {
        const footerY = pageHeight - margins.bottom + 5
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...textColor)
        pdf.text(pdfSettings.footerText, pageWidth / 2, footerY, { align: 'center' })
      }

      // Generate blob and show preview
      const fileName = `Expense-Report-${new Date().toLocaleDateString('en-GB')}.pdf`
      const pdfBlob = pdf.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF: ' + error.message)
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
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
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
        }}
      />

      {/* Tabs */}
      <div className="mb-2 bg-white rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2 p-2 sm:p-4">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'expenses'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-2 sm:px-3 py-1.5 sm:py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'categories'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Categories
          </button>
        </div>
      </div>

      {/* Expenses Tab Content */}
      {activeTab === 'expenses' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-2">
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
      <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 lg:p-4 mb-2">
        <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 items-stretch lg:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by vendor, invoice, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Filter size={16} />
              <span className="sm:inline">Filters</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              <span className="sm:inline">Print</span>
            </button>
            <button
              onClick={handleExport}
              className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} />
              <span className="sm:inline">Export</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span className="sm:inline">Add Expense</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <ResponsiveTableWrapper
            loading={loading}
            empty={filteredExpenses.length === 0}
            emptyMessage="No expenses found"
            tableView={
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
            }
            cardView={
              <div className="space-y-2">
                {filteredExpenses.map((expense) => (
                  <DataCard key={expense.id}>
                    <CardHeader
                      name={expense.vendor_name || 'N/A'}
                      subtitle={`${new Date(expense.expense_date).toLocaleDateString('en-GB')} • Invoice: ${expense.invoice_number || 'N/A'}`}
                      badge={
                        <div className="flex gap-1">
                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{expense.category?.category_name || 'N/A'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${expense.status === 'paid' ? 'bg-green-100 text-green-700' : expense.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}</span>
                        </div>
                      }
                    />
                    <CardInfoGrid>
                      <CardRow label="Amount" value={`Rs ${parseFloat(expense.amount || 0).toLocaleString()}`} />
                      <CardRow label="Payment" value={expense.payment_method?.toUpperCase() || 'N/A'} />
                    </CardInfoGrid>
                    <CardActions>
                      {expense.status === 'pending' && (
                        <button onClick={() => handleApproveExpense(expense.id)} className="text-green-600 hover:text-green-800 p-1" title="Approve"><CheckCircle size={14} /></button>
                      )}
                      <button onClick={() => openEditModal(expense)} className="text-blue-900 hover:text-blue-700 p-1" title="Edit"><Edit size={14} /></button>
                      <button onClick={() => { setSelectedExpense(expense); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-800 p-1" title="Delete"><Trash2 size={14} /></button>
                    </CardActions>
                  </DataCard>
                ))}
              </div>
            }
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No expenses found</p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Category Actions */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Expense Categories</h2>
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 shadow-md"
              >
                <Plus size={16} />
                Add Category
              </button>
            </div>
          </div>

          {/* Categories Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading categories...</div>
            ) : categories.length > 0 ? (
              <ResponsiveTableWrapper
                loading={loading}
                empty={categories.length === 0}
                emptyMessage="No categories found"
                tableView={
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="border border-blue-800 px-4 py-3 text-left font-semibold">#</th>
                      <th className="border border-blue-800 px-4 py-3 text-left font-semibold">Category Name</th>
                      <th className="border border-blue-800 px-4 py-3 text-left font-semibold">Description</th>
                      <th className="border border-blue-800 px-4 py-3 text-center font-semibold">Status</th>
                      <th className="border border-blue-800 px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, index) => (
                      <tr key={category.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                        <td className="border border-gray-200 px-4 py-3">{index + 1}</td>
                        <td className="border border-gray-200 px-4 py-3 font-medium">{category.category_name}</td>
                        <td className="border border-gray-200 px-4 py-3">{category.description || '-'}</td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            category.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {category.status}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditCategoryModal(category)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit category"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => openDeleteCategoryModal(category)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete category"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                }
                cardView={
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <DataCard key={category.id}>
                        <CardHeader
                          name={category.category_name}
                          subtitle={category.description || '-'}
                          badge={
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${category.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{category.status}</span>
                          }
                        />
                        <CardActions>
                          <button onClick={() => openEditCategoryModal(category)} className="text-blue-600 hover:text-blue-800 p-1" title="Edit category"><Edit size={14} /></button>
                          <button onClick={() => openDeleteCategoryModal(category)} className="text-red-600 hover:text-red-800 p-1" title="Delete category"><Trash2 size={14} /></button>
                        </CardActions>
                      </DataCard>
                    ))}
                  </div>
                }
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No categories found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full sm:max-w-lg lg:max-w-2xl h-[95vh] sm:h-auto sm:max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-800">Add New Expense</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.expense_category_id}
                    onChange={(e) => setFormData({ ...formData, expense_category_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="INV-001"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
                  <input
                    type="text"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter vendor name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="3"
                    placeholder="Enter expense details..."
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="w-full sm:w-auto px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full sm:max-w-lg lg:max-w-2xl h-[95vh] sm:h-auto sm:max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-800">Edit Expense</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.expense_category_id}
                    onChange={(e) => setFormData({ ...formData, expense_category_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="INV-001"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
                  <input
                    type="text"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter vendor name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="3"
                    placeholder="Enter expense details..."
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedExpense(null)
                  resetForm()
                }}
                className="w-full sm:w-auto px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditExpense}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                Update Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => {
              setShowDeleteModal(false)
              setSelectedExpense(null)
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
                  Are you sure you want to delete this expense? This action cannot be undone.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setSelectedExpense(null)
                    }}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteExpense}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h2 className="text-sm sm:text-base font-bold text-gray-800">Add New Category</h2>
              <button onClick={() => { setShowAddCategoryModal(false); resetCategoryForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={categoryFormData.category_name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, category_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Utilities, Salaries, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter category description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={categoryFormData.status}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-gray-50">
              <button
                onClick={() => { setShowAddCategoryModal(false); resetCategoryForm(); }}
                className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h2 className="text-sm sm:text-base font-bold text-gray-800">Edit Category</h2>
              <button onClick={() => { setShowEditCategoryModal(false); setSelectedCategory(null); resetCategoryForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={categoryFormData.category_name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, category_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Utilities, Salaries, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter category description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={categoryFormData.status}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-gray-50">
              <button
                onClick={() => { setShowEditCategoryModal(false); setSelectedCategory(null); resetCategoryForm(); }}
                className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCategory}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                Update Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {showDeleteCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
              <h3 className="text-lg font-bold">Confirm Delete</h3>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
                Are you sure you want to delete the category "<strong>{selectedCategory?.category_name}</strong>"? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => { setShowDeleteCategoryModal(false); setSelectedCategory(null); }}
                  className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
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

export default function ExpensesPage() {
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
      permissionKey="payroll_expenses_view"
      currentUser={currentUser}
      pageName="Payroll Expenses"
    >
      <ExpensesPageContent />
    </PermissionGuard>
  )
}
