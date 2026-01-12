'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, Users, DollarSign, AlertTriangle, Download,
  Filter, Calendar, Loader2, FileText, Phone, Mail, Eye, CheckCircle, X
} from 'lucide-react'
import { getUserFromCookie } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'
import { getPdfSettings, hexToRgb, getMarginValues, getLogoSize, getAutoTableStyles } from '@/lib/pdfSettings'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[10001] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={20} />}
      {type === 'error' && <X size={20} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  )
}

export default function FeeReportsPage() {
  const [activeTab, setActiveTab] = useState('defaulters')
  const [loading, setLoading] = useState(true)
  const [defaulters, setDefaulters] = useState([])
  const [classSummary, setClassSummary] = useState([])
  const [sessions, setSessions] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [minDaysOverdue, setMinDaysOverdue] = useState(0)

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedSession) {
      loadReports()
    }
  }, [selectedSession, selectedClass, minDaysOverdue])

  const loadData = async () => {
    setLoading(true)
    try {
      const user = getUserFromCookie()

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('start_date', { ascending: false })

      if (sessionsError) throw sessionsError
      setSessions(sessionsData || [])

      // Set active session
      const activeSession = sessionsData?.find(s => s.status === 'active') || sessionsData?.[0]
      if (activeSession) {
        setSelectedSession(activeSession.id)
      }

      // Load classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('class_name')

      if (classesError) throw classesError
      setClasses(classesData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReports = async () => {
    setLoading(true)
    try {
      const user = getUserFromCookie()

      // Load defaulters from view
      let defaultersQuery = supabase
        .from('v_fee_defaulters')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)

      if (minDaysOverdue > 0) {
        defaultersQuery = defaultersQuery.gte('days_since_first_due', minDaysOverdue)
      }

      if (selectedClass) {
        defaultersQuery = defaultersQuery.eq('class_name', selectedClass)
      }

      const { data: defaultersData, error: defaultersError } = await defaultersQuery
        .order('days_since_first_due', { ascending: false })

      if (defaultersError) throw defaultersError
      setDefaulters(defaultersData || [])

      // Load class summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('v_class_fee_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('class_name')

      if (summaryError) throw summaryError
      setClassSummary(summaryData || [])

    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportDefaultersPDF = async () => {
    try {
      if (defaulters.length === 0) {
        showToast('No defaulters data to export', 'error')
        return
      }

      const user = getUserFromCookie()

      // Get PDF settings
      const pdfSettings = getPdfSettings()

      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF(
        pdfSettings.orientation === 'landscape' ? 'l' : 'p',
        'mm',
        pdfSettings.pageSize.toLowerCase()
      )

      // Fetch school data
      let schoolData = { name: '', address: '', phone: '', logo_url: '' }
      if (user?.school_id) {
        const { data, error } = await supabase
          .from('schools')
          .select('name, address, phone, logo_url')
          .eq('id', user.school_id)
          .single()

        if (!error && data) {
          schoolData = data
        }
      }

      const margins = getMarginValues(pdfSettings.margin)
      const pageWidth = doc.internal.pageSize.getWidth()
      const headerHeight = 35
      const logoSize = pdfSettings.includeLogo ? getLogoSize(pdfSettings.logoSize) : 25

      // Add decorative header background
      if (pdfSettings.includeHeader) {
        const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor)
        doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2])
        doc.rect(0, 0, pageWidth, headerHeight, 'F')
      }

      // Add school logo if available
      if (pdfSettings.includeLogo && schoolData.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = schoolData.logo_url

          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const logoY = (headerHeight - logoSize) / 2
                let logoX = 10

                if (pdfSettings.logoPosition === 'right') {
                  logoX = pageWidth - logoSize - 10
                }

                // Add logo with style
                if (pdfSettings.logoStyle === 'circle' || pdfSettings.logoStyle === 'rounded') {
                  const canvas = document.createElement('canvas')
                  const ctx = canvas.getContext('2d')
                  const size = 200
                  canvas.width = size
                  canvas.height = size

                  ctx.beginPath()
                  if (pdfSettings.logoStyle === 'circle') {
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                  } else {
                    const radius = size * 0.15
                    ctx.moveTo(radius, 0)
                    ctx.lineTo(size - radius, 0)
                    ctx.quadraticCurveTo(size, 0, size, radius)
                    ctx.lineTo(size, size - radius)
                    ctx.quadraticCurveTo(size, size, size - radius, size)
                    ctx.lineTo(radius, size)
                    ctx.quadraticCurveTo(0, size, 0, size - radius)
                    ctx.lineTo(0, radius)
                    ctx.quadraticCurveTo(0, 0, radius, 0)
                  }
                  ctx.closePath()
                  ctx.clip()
                  ctx.drawImage(img, 0, 0, size, size)

                  const clippedImage = canvas.toDataURL('image/png')
                  doc.addImage(clippedImage, 'PNG', logoX, logoY, logoSize, logoSize)
                } else {
                  doc.addImage(img, 'PNG', logoX, logoY, logoSize, logoSize)
                }
                resolve()
              } catch (e) {
                console.warn('Could not add logo to PDF:', e)
                resolve()
              }
            }
            img.onerror = () => {
              console.warn('Could not load logo image')
              resolve()
            }
          })
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // School name and title in white
      if (pdfSettings.includeHeader) {
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(parseInt(pdfSettings.fontSize) + 8)
        doc.setFont('helvetica', 'bold')
        doc.text(schoolData.name || 'School Management System', pageWidth / 2, 15, { align: 'center' })

        doc.setFontSize(parseInt(pdfSettings.fontSize) + 2)
        doc.setFont('helvetica', 'normal')
        doc.text('Fee Defaulters Report', pageWidth / 2, 22, { align: 'center' })
      }

      // Generated date
      doc.setFontSize(parseInt(pdfSettings.fontSize) - 1)
      doc.setTextColor(220, 220, 220)
      const now = new Date()
      const genDate = `Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

      const dateAlign = pdfSettings.logoPosition === 'right' ? 'left' : 'right'
      const dateX = pdfSettings.logoPosition === 'right' ? margins.left : pageWidth - margins.right
      doc.text(genDate, dateX, 30, { align: dateAlign })

      // Prepare table data
      const tableData = defaulters.map(defaulter => [
        defaulter.admission_number || '',
        defaulter.student_name || '',
        defaulter.father_name || '',
        `${defaulter.class_name}${defaulter.section_name ? ` - ${defaulter.section_name}` : ''}`,
        defaulter.contact_phone || 'N/A',
        defaulter.pending_periods || 0,
        `Rs. ${(defaulter.total_due || 0).toLocaleString()}`,
        `${defaulter.days_since_first_due || 0} days`,
        new Date(defaulter.oldest_due_date).toLocaleDateString()
      ])

      // Get autoTable styles
      const autoTableStyles = getAutoTableStyles(pdfSettings)

      // Add table
      autoTable(doc, {
        head: [[
          'Adm. No',
          'Student Name',
          'Father Name',
          'Class',
          'Contact',
          'Pending Periods',
          'Total Due',
          'Days Overdue',
          'Since'
        ]],
        body: tableData,
        startY: headerHeight + 5,
        ...autoTableStyles,
        styles: {
          ...autoTableStyles.styles,
          fontSize: parseInt(pdfSettings.fontSize) - 1,
          halign: 'left'
        },
        columnStyles: {
          5: { halign: 'center' },
          6: { halign: 'right', fontStyle: 'bold' },
          7: { halign: 'right' },
          8: { halign: 'center', fontSize: parseInt(pdfSettings.fontSize) - 2 }
        }
      })

      // Add footer with summary
      const finalY = doc.lastAutoTable.finalY || headerHeight + 5
      const summaryY = finalY + 10

      doc.setFontSize(parseInt(pdfSettings.fontSize) + 1)
      doc.setTextColor(...hexToRgb(pdfSettings.textColor))
      doc.setFont('helvetica', 'bold')

      const totalDefaulters = defaulters.length
      const totalDue = defaulters.reduce((sum, d) => sum + (d.total_due || 0), 0)

      doc.text(`Total Defaulters: ${totalDefaulters}`, margins.left, summaryY)
      doc.text(`Total Amount Due: Rs. ${totalDue.toLocaleString()}`, margins.left, summaryY + 7)

      if (minDaysOverdue > 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(parseInt(pdfSettings.fontSize))
        doc.text(`(Filtered: Overdue by ${minDaysOverdue}+ days)`, margins.left, summaryY + 14)
      }

      // Save PDF
      const filename = `fee-defaulters-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)

      showToast('Fee defaulters PDF exported successfully!', 'success')
    } catch (error) {
      console.error('Error exporting defaulters PDF:', error)
      showToast('Failed to export PDF', 'error')
    }
  }

  const exportClassSummaryPDF = async () => {
    try {
      if (classSummary.length === 0) {
        showToast('No class summary data to export', 'error')
        return
      }

      const user = getUserFromCookie()

      // Get PDF settings
      const pdfSettings = getPdfSettings()

      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF(
        pdfSettings.orientation === 'landscape' ? 'l' : 'p',
        'mm',
        pdfSettings.pageSize.toLowerCase()
      )

      // Fetch school data
      let schoolData = { name: '', address: '', phone: '', logo_url: '' }
      if (user?.school_id) {
        const { data, error } = await supabase
          .from('schools')
          .select('name, address, phone, logo_url')
          .eq('id', user.school_id)
          .single()

        if (!error && data) {
          schoolData = data
        }
      }

      const margins = getMarginValues(pdfSettings.margin)
      const pageWidth = doc.internal.pageSize.getWidth()
      const headerHeight = 35
      const logoSize = pdfSettings.includeLogo ? getLogoSize(pdfSettings.logoSize) : 25

      // Add decorative header background
      if (pdfSettings.includeHeader) {
        const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor)
        doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2])
        doc.rect(0, 0, pageWidth, headerHeight, 'F')
      }

      // Add school logo if available
      if (pdfSettings.includeLogo && schoolData.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = schoolData.logo_url

          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const logoY = (headerHeight - logoSize) / 2
                let logoX = 10

                if (pdfSettings.logoPosition === 'right') {
                  logoX = pageWidth - logoSize - 10
                }

                // Add logo with style
                if (pdfSettings.logoStyle === 'circle' || pdfSettings.logoStyle === 'rounded') {
                  const canvas = document.createElement('canvas')
                  const ctx = canvas.getContext('2d')
                  const size = 200
                  canvas.width = size
                  canvas.height = size

                  ctx.beginPath()
                  if (pdfSettings.logoStyle === 'circle') {
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                  } else {
                    const radius = size * 0.15
                    ctx.moveTo(radius, 0)
                    ctx.lineTo(size - radius, 0)
                    ctx.quadraticCurveTo(size, 0, size, radius)
                    ctx.lineTo(size, size - radius)
                    ctx.quadraticCurveTo(size, size, size - radius, size)
                    ctx.lineTo(radius, size)
                    ctx.quadraticCurveTo(0, size, 0, size - radius)
                    ctx.lineTo(0, radius)
                    ctx.quadraticCurveTo(0, 0, radius, 0)
                  }
                  ctx.closePath()
                  ctx.clip()
                  ctx.drawImage(img, 0, 0, size, size)

                  const clippedImage = canvas.toDataURL('image/png')
                  doc.addImage(clippedImage, 'PNG', logoX, logoY, logoSize, logoSize)
                } else {
                  doc.addImage(img, 'PNG', logoX, logoY, logoSize, logoSize)
                }
                resolve()
              } catch (e) {
                console.warn('Could not add logo to PDF:', e)
                resolve()
              }
            }
            img.onerror = () => {
              console.warn('Could not load logo image')
              resolve()
            }
          })
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // School name and title in white
      if (pdfSettings.includeHeader) {
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(parseInt(pdfSettings.fontSize) + 8)
        doc.setFont('helvetica', 'bold')
        doc.text(schoolData.name || 'School Management System', pageWidth / 2, 15, { align: 'center' })

        doc.setFontSize(parseInt(pdfSettings.fontSize) + 2)
        doc.setFont('helvetica', 'normal')
        doc.text('Class-wise Fee Summary', pageWidth / 2, 22, { align: 'center' })
      }

      // Generated date
      doc.setFontSize(parseInt(pdfSettings.fontSize) - 1)
      doc.setTextColor(220, 220, 220)
      const now = new Date()
      const genDate = `Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

      const dateAlign = pdfSettings.logoPosition === 'right' ? 'left' : 'right'
      const dateX = pdfSettings.logoPosition === 'right' ? margins.left : pageWidth - margins.right
      doc.text(genDate, dateX, 30, { align: dateAlign })

      // Prepare table data
      const tableData = classSummary.map(summary => [
        summary.class_name || '',
        summary.period_name || '',
        summary.total_students || 0,
        summary.paid_students || 0,
        summary.pending_students || 0,
        summary.overdue_students || 0,
        `Rs. ${(summary.total_amount || 0).toLocaleString()}`,
        `Rs. ${(summary.collected_amount || 0).toLocaleString()}`,
        `Rs. ${(summary.remaining_amount || 0).toLocaleString()}`,
        `${(summary.collection_percentage || 0).toFixed(1)}%`
      ])

      // Get autoTable styles
      const autoTableStyles = getAutoTableStyles(pdfSettings)

      // Add table
      autoTable(doc, {
        head: [[
          'Class',
          'Period',
          'Total Students',
          'Paid',
          'Pending',
          'Overdue',
          'Total Amount',
          'Collected',
          'Remaining',
          'Collection %'
        ]],
        body: tableData,
        startY: headerHeight + 5,
        ...autoTableStyles,
        styles: {
          ...autoTableStyles.styles,
          fontSize: parseInt(pdfSettings.fontSize) - 1,
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
          1: { halign: 'left' },
          6: { halign: 'right' },
          7: { halign: 'right', textColor: [22, 163, 74] },
          8: { halign: 'right', textColor: [220, 38, 38] },
          9: { halign: 'center', fontStyle: 'bold' }
        }
      })

      // Add footer with summary
      const finalY = doc.lastAutoTable.finalY || headerHeight + 5
      const summaryY = finalY + 10

      doc.setFontSize(parseInt(pdfSettings.fontSize) + 1)
      doc.setTextColor(...hexToRgb(pdfSettings.textColor))
      doc.setFont('helvetica', 'bold')

      const totalAmount = classSummary.reduce((sum, s) => sum + (s.total_amount || 0), 0)
      const totalCollected = classSummary.reduce((sum, s) => sum + (s.collected_amount || 0), 0)
      const totalRemaining = classSummary.reduce((sum, s) => sum + (s.remaining_amount || 0), 0)
      const overallPercentage = totalAmount > 0 ? ((totalCollected / totalAmount) * 100).toFixed(1) : 0

      doc.text(`Total Amount: Rs. ${totalAmount.toLocaleString()}`, margins.left, summaryY)
      doc.setTextColor(22, 163, 74)
      doc.text(`Total Collected: Rs. ${totalCollected.toLocaleString()}`, margins.left, summaryY + 7)
      doc.setTextColor(220, 38, 38)
      doc.text(`Total Remaining: Rs. ${totalRemaining.toLocaleString()}`, margins.left, summaryY + 14)
      doc.setTextColor(...hexToRgb(pdfSettings.textColor))
      doc.text(`Overall Collection: ${overallPercentage}%`, margins.left, summaryY + 21)

      // Save PDF
      const filename = `class-fee-summary-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)

      showToast('Class fee summary PDF exported successfully!', 'success')
    } catch (error) {
      console.error('Error exporting class summary PDF:', error)
      showToast('Failed to export PDF', 'error')
    }
  }

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fee Reports & Analytics</h1>
        <p className="text-gray-600">View fee collection status, defaulters, and summaries</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-xs uppercase tracking-wide">
              Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.session_name} {session.status === 'active' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-xs uppercase tracking-wide">
              Class Filter
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.class_name}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-xs uppercase tracking-wide">
              Min Days Overdue
            </label>
            <input
              type="number"
              value={minDaysOverdue}
              onChange={(e) => setMinDaysOverdue(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              placeholder="0"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadReports}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
            >
              <Filter size={16} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('defaulters')}
            className={`flex-1 px-6 py-4 font-medium transition ${
              activeTab === 'defaulters'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle size={20} />
              Fee Defaulters ({defaulters.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('class-summary')}
            className={`flex-1 px-6 py-4 font-medium transition ${
              activeTab === 'class-summary'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp size={20} />
              Class-wise Summary
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'defaulters' && (
            <div>
              {/* Export Buttons */}
              <div className="mb-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total Defaulters: <span className="font-bold text-red-600">{defaulters.length}</span>
                  {minDaysOverdue > 0 && ` (overdue by ${minDaysOverdue}+ days)`}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToCSV(defaulters, `fee-defaulters-${new Date().toISOString().split('T')[0]}.csv`)}
                    className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
                    disabled={defaulters.length === 0}
                  >
                    <Download size={16} />
                    Download CSV
                  </button>
                  <button
                    onClick={exportDefaultersPDF}
                    className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
                    disabled={defaulters.length === 0}
                  >
                    <FileText size={16} />
                    Download PDF
                  </button>
                </div>
              </div>

              {/* Defaulters Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-red-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold border border-red-800">Adm. No</th>
                      <th className="px-4 py-3 text-left font-semibold border border-red-800">Student Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-red-800">Father Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-red-800">Class</th>
                      <th className="px-4 py-3 text-left font-semibold border border-red-800">Contact</th>
                      <th className="px-4 py-3 text-right font-semibold border border-red-800">Pending Periods</th>
                      <th className="px-4 py-3 text-right font-semibold border border-red-800">Total Due</th>
                      <th className="px-4 py-3 text-right font-semibold border border-red-800">Days Overdue</th>
                      <th className="px-4 py-3 text-right font-semibold border border-red-800">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaulters.map((defaulter, index) => (
                      <tr key={defaulter.student_id} className={index % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-4 py-3 border border-gray-200">{defaulter.admission_number}</td>
                        <td className="px-4 py-3 border border-gray-200 font-medium">{defaulter.student_name}</td>
                        <td className="px-4 py-3 border border-gray-200">{defaulter.father_name}</td>
                        <td className="px-4 py-3 border border-gray-200">
                          {defaulter.class_name}
                          {defaulter.section_name && ` - ${defaulter.section_name}`}
                        </td>
                        <td className="px-4 py-3 border border-gray-200">
                          {defaulter.contact_phone ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Phone size={14} />
                              <span className="text-xs">{defaulter.contact_phone}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No contact</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-right">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            {defaulter.pending_periods}
                          </span>
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-right">
                          <span className="font-bold text-red-600">Rs. {defaulter.total_due?.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-right">
                          <span className={`font-semibold ${
                            defaulter.days_since_first_due > 60 ? 'text-red-600' :
                            defaulter.days_since_first_due > 30 ? 'text-orange-600' :
                            'text-yellow-600'
                          }`}>
                            {defaulter.days_since_first_due} days
                          </span>
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-right text-xs text-gray-600">
                          {new Date(defaulter.oldest_due_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {defaulters.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <AlertTriangle size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No fee defaulters found</p>
                    <p className="text-sm">All students are up to date with their fee payments</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'class-summary' && (
            <div>
              {/* Export Buttons */}
              <div className="mb-4 flex justify-end gap-2">
                <button
                  onClick={() => exportToCSV(classSummary, `class-fee-summary-${new Date().toISOString().split('T')[0]}.csv`)}
                  className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
                  disabled={classSummary.length === 0}
                >
                  <Download size={16} />
                  Download CSV
                </button>
                <button
                  onClick={exportClassSummaryPDF}
                  className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
                  disabled={classSummary.length === 0}
                >
                  <FileText size={16} />
                  Download PDF
                </button>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {classSummary.map(summary => {
                  const collectionPercentage = summary.collection_percentage || 0

                  return (
                    <div key={`${summary.class_id}-${summary.period_name}`} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{summary.class_name}</h3>
                          <p className="text-xs text-gray-500">{summary.period_name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          collectionPercentage >= 90 ? 'bg-green-100 text-green-700' :
                          collectionPercentage >= 70 ? 'bg-blue-100 text-blue-700' :
                          collectionPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {collectionPercentage.toFixed(1)}%
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Students:</span>
                          <span className="font-semibold">{summary.total_students}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Paid:</span>
                          <span className="font-semibold text-green-600">{summary.paid_students}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pending:</span>
                          <span className="font-semibold text-yellow-600">{summary.pending_students}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Overdue:</span>
                          <span className="font-semibold text-red-600">{summary.overdue_students}</span>
                        </div>
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="font-bold">Rs. {summary.total_amount?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Collected:</span>
                          <span className="font-bold text-green-600">Rs. {summary.collected_amount?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Remaining:</span>
                          <span className="font-bold text-red-600">Rs. {summary.remaining_amount?.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              collectionPercentage >= 90 ? 'bg-green-600' :
                              collectionPercentage >= 70 ? 'bg-blue-600' :
                              collectionPercentage >= 50 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${collectionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {classSummary.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No class summary data available</p>
                  <p className="text-sm">Generate fee periods and challans to see summary</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
