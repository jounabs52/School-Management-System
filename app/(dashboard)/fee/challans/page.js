'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Printer, CheckCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

export default function FeeChallanPage() {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [classes, setClasses] = useState([])
  const [selectedChallan, setSelectedChallan] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [challanItems, setChallanItems] = useState([])
  const [schoolName, setSchoolName] = useState('SMART SCHOOL PRO')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (showViewModal) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = ''
    }
  }, [showViewModal])

  useEffect(() => {
    fetchChallans()
    fetchSchoolName()
    fetchAllClasses()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, classFilter])

  const fetchSchoolName = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('schools')
        .select('school_name')
        .eq('id', user.school_id)
        .single()

      if (!error && data) {
        setSchoolName(data.school_name)
      }
    } catch (error) {
      console.error('Error fetching school name:', error)
    }
  }

  const fetchAllClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: allClasses, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('school_id', user.school_id)
        .order('class_name', { ascending: true })

      if (!error && allClasses) {
        setClasses(allClasses)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchChallans = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      const { data: challansData, error: challansError } = await supabase
        .from('fee_challans')
        .select(`
          *,
          students!student_id (
            id,
            admission_number,
            first_name,
            last_name,
            current_class_id,
            current_section_id
          )
        `)
        .eq('school_id', user.school_id)
        .order('issue_date', { ascending: false })

      if (challansError) {
        console.error('Query error:', challansError)
        showToast(`Database Error: ${challansError.message}`, 'error')
        setLoading(false)
        return
      }

      const classIds = [...new Set(challansData?.map(c => c.students?.current_class_id).filter(Boolean))]
      const sectionIds = [...new Set(challansData?.map(c => c.students?.current_section_id).filter(Boolean))]

      let classesMap = {}
      let sectionsMap = {}

      if (classIds.length > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, class_name')
          .in('id', classIds)

        if (classesData) {
          classesData.forEach(cls => {
            classesMap[cls.id] = cls
          })
        }
      }

      if (sectionIds.length > 0) {
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, section_name')
          .in('id', sectionIds)

        if (sectionsData) {
          sectionsData.forEach(sec => {
            sectionsMap[sec.id] = sec
          })
        }
      }

      const enrichedChallans = challansData?.map(challan => ({
        ...challan,
        students: challan.students ? {
          ...challan.students,
          classes: challan.students.current_class_id ? classesMap[challan.students.current_class_id] : null,
          sections: challan.students.current_section_id ? sectionsMap[challan.students.current_section_id] : null
        } : null
      }))

      setChallans(enrichedChallans || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching challans:', error)
      showToast(`Unexpected Error: ${error.message}`, 'error')
      setLoading(false)
    }
  }

  const fetchChallanItems = async (challanId) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_challan_items')
        .select(`
          *,
          fee_types!fee_type_id (
            fee_name
          )
        `)
        .eq('school_id', user.school_id)
        .eq('challan_id', challanId)

      if (error) {
        console.error('Error fetching challan items:', error)
        setChallanItems([])
        return
      }

      setChallanItems(data || [])
    } catch (error) {
      console.error('Error:', error)
      setChallanItems([])
    }
  }

  const handleViewChallan = async (challan) => {
    setSelectedChallan(challan)
    await fetchChallanItems(challan.id)
    setShowViewModal(true)
  }

  const handleDirectDownloadPDF = async (challan) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_challan_items')
        .select(`
          *,
          fee_types!fee_type_id (
            fee_name
          )
        `)
        .eq('school_id', user.school_id)
        .eq('challan_id', challan.id)

      if (error) {
        console.error('Error fetching challan items:', error)
      }

      await downloadChallanPDF(challan, data || [])
      showToast('PDF downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      showToast(`Failed to download PDF: ${error.message}`, 'error')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return badges[status] || badges.pending
  }

  const downloadChallanPDF = async (challan = null, items = null) => {
    const challanToUse = challan || selectedChallan
    const itemsToUse = items || challanItems

    if (!challanToUse) return

    try {
      const student = challanToUse.students
      const doc = new jsPDF('landscape', 'mm', 'a4')

      const copyTypes = ['Bank', 'School', 'Student']
      const pageWidth = 297
      const copyWidth = pageWidth / 3

      copyTypes.forEach((copyType, index) => {
        const xOffset = index * copyWidth
        const margin = 3

        doc.setDrawColor(200)
        doc.setLineWidth(0.3)
        doc.rect(xOffset + 1, 5, copyWidth - 2, 200)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(schoolName, xOffset + copyWidth / 2, 12, { align: 'center' })

        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text('The Bank of Punjab', xOffset + copyWidth / 2, 17, { align: 'center' })
        doc.text(`Copy of ${copyType}`, xOffset + copyWidth / 2, 21, { align: 'center' })

        let yPos = 28

        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.text('Challan#', xOffset + margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(challanToUse.challan_number.substring(0, 15), xOffset + margin + 12, yPos)

        yPos += 4
        doc.setFont('helvetica', 'bold')
        doc.text('Collection A/C#', xOffset + margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text('6580252791800018', xOffset + margin + 16, yPos)

        yPos += 4
        doc.setFont('helvetica', 'bold')
        doc.text('Student Name', xOffset + margin, yPos)
        doc.setFont('helvetica', 'normal')
        const studentName = student ? `${student.first_name} ${student.last_name || ''}`.substring(0, 18) : 'N/A'
        doc.text(studentName, xOffset + margin + 16, yPos)

        yPos += 4
        doc.setFont('helvetica', 'bold')
        doc.text('Admission No', xOffset + margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(student?.admission_number || 'N/A', xOffset + margin + 16, yPos)

        yPos += 4
        doc.setFont('helvetica', 'bold')
        doc.text('Class', xOffset + margin, yPos)
        doc.setFont('helvetica', 'normal')
        const className = student?.classes?.class_name || 'N/A'
        doc.text(className, xOffset + margin + 16, yPos)

        yPos += 4
        doc.setFont('helvetica', 'bold')
        doc.text('Due Date', xOffset + margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(new Date(challanToUse.due_date).toLocaleDateString(), xOffset + margin + 16, yPos)

        yPos += 4
        doc.setFont('helvetica', 'bold')
        doc.text('Fee Type', xOffset + margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text('Self Support', xOffset + margin + 16, yPos)

        yPos += 6

        const tableData = []
        let totalAmount = 0

        if (itemsToUse && itemsToUse.length > 0) {
          itemsToUse.forEach((item, idx) => {
            const amount = parseFloat(item.amount)
            totalAmount += amount
            const feeDescription = item.fee_types?.fee_name || item.description || 'Fee'
            tableData.push([
              (idx + 1).toString(),
              feeDescription,
              amount.toLocaleString()
            ])
          })
          tableData.push(['', 'Total', totalAmount.toLocaleString()])
        } else {
          totalAmount = parseFloat(challanToUse.total_amount)
          tableData.push([
            '1',
            'Total Fee',
            totalAmount.toLocaleString()
          ])
          tableData.push(['', 'Total', totalAmount.toLocaleString()])
        }

        autoTable(doc, {
          startY: yPos,
          margin: { left: xOffset + margin, right: pageWidth - (xOffset + copyWidth - margin) },
          head: [['No', 'Particulars', 'Amount']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [0, 0, 0],
            textColor: [255, 255, 255],
            fontSize: 6,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 5,
            cellPadding: 1
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: copyWidth - 30, halign: 'left' },
            2: { cellWidth: 16, halign: 'right' }
          },
          tableWidth: copyWidth - 6,
          didParseCell: function(data) {
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fontStyle = 'bold'
            }
          }
        })

        const finalY = doc.lastAutoTable.finalY + 3
        doc.setFontSize(5)
        doc.setFont('helvetica', 'italic')
        const words = numberToWords(totalAmount)
        doc.text(`${words} Only`, xOffset + margin, finalY, { maxWidth: copyWidth - 6 })

        const barcodeY = finalY + 8
        doc.setFontSize(8)
        doc.text('|||||||||||||||||||||||', xOffset + copyWidth / 2, barcodeY, { align: 'center' })
        doc.setFontSize(6)
        doc.text(challanToUse.challan_number.substring(0, 15), xOffset + copyWidth / 2, barcodeY + 4, { align: 'center' })

        doc.setFontSize(5)
        doc.text('Cashier', xOffset + copyWidth - margin - 10, barcodeY + 4)
      })

      doc.save(`Challan_${challanToUse.challan_number}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast(`Failed to generate PDF: ${error.message}`, 'error')
    }
  }

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

    if (num === 0) return 'Zero'

    let words = ''

    if (num >= 1000) {
      const thousands = Math.floor(num / 1000)
      words += ones[thousands] + ' Thousand '
      num %= 1000
    }

    if (num >= 100) {
      words += ones[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }

    if (num >= 20) {
      words += tens[Math.floor(num / 10)] + ' '
      num %= 10
    } else if (num >= 10) {
      words += teens[num - 10] + ' '
      return words.trim()
    }

    if (num > 0) {
      words += ones[num] + ' '
    }

    return words.trim()
  }

  const filteredChallans = challans.filter(challan => {
    const searchLower = searchTerm.toLowerCase()
    const student = challan.students
    const fullName = student ? `${student.first_name} ${student.last_name || ''}`.toLowerCase() : ''

    const matchesSearch =
      challan.challan_number.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      (student?.admission_number || '').toLowerCase().includes(searchLower)

    const matchesStatus = statusFilter === 'all' || challan.status === statusFilter
    const matchesClass = classFilter === 'all' || challan.students?.classes?.id === classFilter

    return matchesSearch && matchesStatus && matchesClass
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Generate page numbers to display (max 4 visible)
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 4
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 2) {
        for (let i = 1; i <= maxVisiblePages; i++) pages.push(i)
      } else if (currentPage >= totalPages - 1) {
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        for (let i = currentPage - 1; i <= currentPage + 2; i++) {
          if (i >= 1 && i <= totalPages) pages.push(i)
        }
      }
    }
    return pages
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">View Challans</h1>
        <p className="text-gray-600">View and manage fee challans</p>
      </div>

      {/* Search & Filter Section - REORDERED: Status, Classes, Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="md:w-48">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by challan number, student name, or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <p className="text-gray-600">
            Total: <span className="font-bold text-blue-600">{filteredChallans.length}</span>
          </p>
          <p className="text-gray-600">
            Pending: <span className="font-bold text-yellow-600">{filteredChallans.filter(c => c.status === 'pending').length}</span>
          </p>
          <p className="text-gray-600">
            Paid: <span className="font-bold text-green-600">{filteredChallans.filter(c => c.status === 'paid').length}</span>
          </p>
          <p className="text-gray-600">
            Overdue: <span className="font-bold text-red-600">{filteredChallans.filter(c => c.status === 'overdue').length}</span>
          </p>
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Sr.</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Student Name</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Admission No.</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Class</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Issue Date</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Due Date</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Amount</th>
                <th className="px-4 py-4 text-left font-semibold text-sm border border-blue-800">Status</th>
                <th className="px-4 py-4 text-center font-semibold text-sm border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedChallans.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    No challans found
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan, index) => {
                  const student = challan.students
                  return (
                    <tr key={challan.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                      <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">{startIndex + index + 1}</td>
                      <td className="px-4 py-4 text-blue-600 font-medium text-sm border border-gray-200">
                        {student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">{student?.admission_number || 'N/A'}</td>
                      <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">
                        {student?.classes?.class_name || 'N/A'}{student?.sections?.section_name ? ` - ${student.sections.section_name}` : ''}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">
                        {new Date(challan.issue_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm border border-gray-200">
                        {new Date(challan.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-gray-900 font-bold text-sm border border-gray-200">
                        Rs. {parseFloat(challan.total_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 border border-gray-200">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(challan.status)}`}>
                          {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 border border-gray-200">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleViewChallan(challan)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDirectDownloadPDF(challan)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Print Challan"
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredChallans.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length} challans
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === 1
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
              >
                Previous
              </button>
              
              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof page === 'number' && goToPage(page)}
                  className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition ${
                    page === currentPage
                      ? 'bg-blue-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === totalPages
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
            Loading...
          </div>
        ) : paginatedChallans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
            No challans found
          </div>
        ) : (
          <>
            {paginatedChallans.map((challan, index) => {
              const student = challan.students
              return (
                <div key={challan.id} className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Challan #{startIndex + index + 1}</div>
                      <div className="font-bold text-blue-600 text-sm">
                        {student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'Student Info Not Available'}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(challan.status)}`}>
                      {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Admission No:</span>
                      <span className="font-semibold text-gray-900">{student?.admission_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Class:</span>
                      <span className="font-semibold text-gray-900">
                        {student?.classes?.class_name || 'N/A'} {student?.sections?.section_name ? `- ${student.sections.section_name}` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issue Date:</span>
                      <span className="text-gray-900">{new Date(challan.issue_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="text-gray-900">{new Date(challan.due_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-gray-600 font-semibold">Amount:</span>
                      <span className="text-red-600 font-bold text-lg">
                        Rs. {parseFloat(challan.total_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewChallan(challan)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                      >
                        <Eye size={18} />
                        View
                      </button>
                      <button
                        onClick={() => handleDirectDownloadPDF(challan)}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                      >
                        <Printer size={18} />
                        Print
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Mobile Pagination */}
            {filteredChallans.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {startIndex + 1}-{Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      currentPage === 1
                        ? 'bg-blue-300 text-white cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      currentPage === totalPages
                        ? 'bg-blue-300 text-white cursor-not-allowed'
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Challan Modal */}
      {showViewModal && selectedChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowViewModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Challan Details</h3>
                  <p className="text-blue-200 text-sm mt-1">{selectedChallan.challan_number}</p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Student Info */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-800 mb-3">Student Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedChallan.students ? `${selectedChallan.students.first_name} ${selectedChallan.students.last_name || ''}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admission No:</span>
                    <span className="font-semibold text-gray-900">{selectedChallan.students?.admission_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Class:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedChallan.students?.classes?.class_name || 'N/A'} {selectedChallan.students?.sections?.section_name ? `- ${selectedChallan.students.sections.section_name}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Challan Info */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-800 mb-3">Challan Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issue Date:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(selectedChallan.issue_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(selectedChallan.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedChallan.status)}`}>
                      {selectedChallan.status.charAt(0).toUpperCase() + selectedChallan.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fee Items */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-800 mb-3">Fee Breakdown</h4>
                <div className="space-y-2">
                  {challanItems.length === 0 ? (
                    <p className="text-sm text-gray-500">No fee items found</p>
                  ) : (
                    challanItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <div>
                          <p className="font-medium text-gray-800">{item.fee_types?.fee_name || 'Fee'}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500">{item.description}</p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">
                          Rs. {parseFloat(item.amount).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 text-lg">Total Amount:</span>
                  <span className="font-bold text-red-600 text-2xl">
                    Rs. {parseFloat(selectedChallan.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    downloadChallanPDF()
                    showToast('PDF downloaded successfully!', 'success')
                  }}
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <Printer size={14} />
                  Print
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}