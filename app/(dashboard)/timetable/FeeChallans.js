'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Eye, Printer, Search, Calendar, DollarSign, CheckCircle, XCircle, AlertCircle, X, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getPdfSettings, hexToRgb, getMarginValues, formatCurrency, generateChallanNumber, getMonthName, getFeePeriodLabel, calculateDueDate } from '@/lib/pdfSettings'

export default function FeeChallans({ user, classes, schoolData, showToast }) {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const [generateForm, setGenerateForm] = useState({
    classId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    dueInDays: 15,
    generateFor: 'class' // 'class' or 'individual'
  })

  useEffect(() => {
    if (user && user.school_id) {
      fetchChallans()
    }
  }, [user, statusFilter, classFilter])

  const fetchChallans = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('fee_challans')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            admission_number,
            current_class_id,
            base_fee,
            discount_percent,
            final_fee,
            fee_plan
          ),
          classes:students(current_class_id(id, class_name))
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      if (classFilter) {
        query = query.eq('students.current_class_id', classFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching challans:', error)
        showToast('Error loading challans', 'error')
      } else {
        setChallans(data || [])
      }
    } catch (error) {
      console.error('Error fetching challans:', error)
      showToast('Error loading challans', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateChallan = async () => {
    try {
      if (!generateForm.classId) {
        showToast('Please select a class', 'error')
        return
      }

      setLoading(true)

      // Fetch students for the selected class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('current_class_id', generateForm.classId)
        .eq('status', 'active')

      if (studentsError) {
        console.error('Error fetching students:', error)
        showToast('Error fetching students', 'error')
        return
      }

      if (!students || students.length === 0) {
        showToast('No active students found in this class', 'error')
        return
      }

      // Generate challans for all students
      const issueDate = new Date()
      const dueDate = calculateDueDate(issueDate, parseInt(generateForm.dueInDays))

      const challansToInsert = students.map(student => {
        const periodLabel = getFeePeriodLabel(
          student.fee_plan || 'monthly',
          parseInt(generateForm.month),
          parseInt(generateForm.year)
        )

        return {
          school_id: user.school_id,
          student_id: student.id,
          challan_number: generateChallanNumber(schoolData.code || 'SCH'),
          fee_month: getMonthName(parseInt(generateForm.month)),
          fee_year: generateForm.year.toString(),
          issue_date: issueDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          total_amount: student.final_fee || student.base_fee || 0,
          paid_amount: 0,
          fee_plan: student.fee_plan || 'monthly',
          period_label: periodLabel,
          status: 'pending',
          created_by: user.id
        }
      })

      const { data, error } = await supabase
        .from('fee_challans')
        .insert(challansToInsert)
        .select()

      if (error) {
        console.error('Error creating challans:', error)
        showToast('Error generating challans', 'error')
      } else {
        showToast(`Successfully generated ${data.length} challans`, 'success')
        setShowGenerateModal(false)
        fetchChallans()

        // Generate PDFs for all challans
        if (generateForm.generateFor === 'class') {
          await generateClassPDF(data)
        }
      }
    } catch (error) {
      console.error('Error generating challans:', error)
      showToast('Error generating challans', 'error')
    } finally {
      setLoading(false)
    }
  }

  const generateClassPDF = async (challansData) => {
    try {
      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')

      const pdfSettings = getPdfSettings()
      const margins = getMarginValues(pdfSettings.margin)

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pdfSettings.pageSize
      })

      // Get page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      for (let i = 0; i < challansData.length; i++) {
        const challan = challansData[i]

        // Fetch student data
        const { data: student } = await supabase
          .from('students')
          .select('*, classes(class_name)')
          .eq('id', challan.student_id)
          .single()

        if (i > 0) doc.addPage()

        // Header with logo
        let yPos = margins.top

        if (pdfSettings.includeLogo && schoolData.logo_url) {
          try {
            const logoSize = 25
            doc.addImage(schoolData.logo_url, 'PNG', margins.left, yPos - 10, logoSize, logoSize)
          } catch (e) {
            console.warn('Could not add logo to PDF')
          }
        }

        // School name and title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(schoolData.name || 'School Name', pageWidth / 2, yPos, { align: 'center' })

        yPos += 8
        doc.setFontSize(14)
        doc.setTextColor(...hexToRgb(pdfSettings.primaryColor))
        doc.text('FEE CHALLAN', pageWidth / 2, yPos, { align: 'center' })

        yPos += 10
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')

        // Challan details box
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 30)

        // Left column
        let xPos = margins.left + 5
        yPos += 7
        doc.setFont('helvetica', 'bold')
        doc.text('Challan No:', xPos, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(challan.challan_number, xPos + 25, yPos)

        yPos += 6
        doc.setFont('helvetica', 'bold')
        doc.text('Student Name:', xPos, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(`${student.first_name} ${student.last_name || ''}`, xPos + 25, yPos)

        yPos += 6
        doc.setFont('helvetica', 'bold')
        doc.text('Admission No:', xPos, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(student.admission_number || '-', xPos + 25, yPos)

        // Right column
        xPos = pageWidth / 2 + 10
        yPos -= 12
        doc.setFont('helvetica', 'bold')
        doc.text('Issue Date:', xPos, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(new Date(challan.issue_date).toLocaleDateString(), xPos + 20, yPos)

        yPos += 6
        doc.setFont('helvetica', 'bold')
        doc.text('Due Date:', xPos, yPos)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(220, 38, 38)
        doc.text(new Date(challan.due_date).toLocaleDateString(), xPos + 20, yPos)
        doc.setTextColor(0, 0, 0)

        yPos += 6
        doc.setFont('helvetica', 'bold')
        doc.text('Class:', xPos, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(student.classes?.class_name || '-', xPos + 20, yPos)

        // Fee details table
        yPos += 15
        const tableData = [
          ['Tuition Fee', formatCurrency(student.base_fee || 0)],
          ['Discount', `${student.discount_percent || 0}%`],
          ['Total Amount', formatCurrency(challan.total_amount)]
        ]

        doc.autoTable({
          startY: yPos,
          head: [['Description', 'Amount']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: hexToRgb(pdfSettings.tableHeaderColor),
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 9,
            cellPadding: 3
          },
          margin: { left: margins.left, right: margins.right },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { halign: 'right', fontStyle: 'bold' }
          }
        })

        // Footer
        yPos = pageHeight - margins.bottom - 20
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text('Please pay before the due date to avoid late fee charges.', margins.left, yPos)
        yPos += 5
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margins.left, yPos)
      }

      // Save PDF
      const selectedClass = classes.find(c => c.id === generateForm.classId)
      doc.save(`Fee_Challans_${selectedClass?.class_name || 'Class'}_${generateForm.month}_${generateForm.year}.pdf`)

      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Error generating PDF', 'error')
    }
  }

  const handleViewChallan = async (challan) => {
    // Generate individual PDF for viewing
    try {
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')

      const { data: student } = await supabase
        .from('students')
        .select('*, classes(class_name)')
        .eq('id', challan.student_id)
        .single()

      const pdfSettings = getPdfSettings()
      const margins = getMarginValues(pdfSettings.margin)

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pdfSettings.pageSize
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // [Same PDF generation code as in generateClassPDF but for single challan]
      // Header with logo
      let yPos = margins.top

      if (pdfSettings.includeLogo && schoolData.logo_url) {
        try {
          const logoSize = 25
          doc.addImage(schoolData.logo_url, 'PNG', margins.left, yPos - 10, logoSize, logoSize)
        } catch (e) {
          console.warn('Could not add logo to PDF')
        }
      }

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(schoolData.name || 'School Name', pageWidth / 2, yPos, { align: 'center' })

      yPos += 8
      doc.setFontSize(14)
      doc.setTextColor(...hexToRgb(pdfSettings.primaryColor))
      doc.text('FEE CHALLAN', pageWidth / 2, yPos, { align: 'center' })

      yPos += 10
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')

      // Challan details
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 30)

      let xPos = margins.left + 5
      yPos += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Challan No:', xPos, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(challan.challan_number, xPos + 25, yPos)

      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Student Name:', xPos, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${student.first_name} ${student.last_name || ''}`, xPos + 25, yPos)

      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Admission No:', xPos, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(student.admission_number || '-', xPos + 25, yPos)

      xPos = pageWidth / 2 + 10
      yPos -= 12
      doc.setFont('helvetica', 'bold')
      doc.text('Issue Date:', xPos, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(challan.issue_date).toLocaleDateString(), xPos + 20, yPos)

      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Due Date:', xPos, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(220, 38, 38)
      doc.text(new Date(challan.due_date).toLocaleDateString(), xPos + 20, yPos)
      doc.setTextColor(0, 0, 0)

      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Class:', xPos, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(student.classes?.class_name || '-', xPos + 20, yPos)

      yPos += 15
      const tableData = [
        ['Tuition Fee', formatCurrency(student.base_fee || 0)],
        ['Discount', `${student.discount_percent || 0}%`],
        ['Total Amount', formatCurrency(challan.total_amount)]
      ]

      doc.autoTable({
        startY: yPos,
        head: [['Description', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: hexToRgb(pdfSettings.tableHeaderColor),
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        margin: { left: margins.left, right: margins.right },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: 'right', fontStyle: 'bold' }
        }
      })

      yPos = pageHeight - margins.bottom - 20
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Please pay before the due date to avoid late fee charges.', margins.left, yPos)
      yPos += 5
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margins.left, yPos)

      // Open in new window
      window.open(doc.output('bloburl'), '_blank')

      showToast('Challan opened successfully!', 'success')
    } catch (error) {
      console.error('Error viewing challan:', error)
      showToast('Error viewing challan', 'error')
    }
  }

  const handlePrintChallan = async (challan) => {
    if (challan.status !== 'paid') {
      showToast('Can only print paid challans', 'error')
      return
    }

    await handleViewChallan(challan)
  }

  const handleStatusChange = async (challanId, newStatus) => {
    try {
      const { error } = await supabase
        .from('fee_challans')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', challanId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error updating status:', error)
        showToast('Error updating status', 'error')
      } else {
        showToast('Status updated successfully!', 'success')
        fetchChallans()
      }
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Error updating status', 'error')
    }
  }

  // Filter and paginate challans
  const filteredChallans = challans.filter(challan => {
    const studentName = `${challan.students?.first_name} ${challan.students?.last_name || ''}`.toLowerCase()
    const challanNumber = challan.challan_number.toLowerCase()
    const search = searchTerm.toLowerCase()

    return studentName.includes(search) || challanNumber.includes(search)
  })

  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const currentChallans = filteredChallans.slice(startIndex, startIndex + rowsPerPage)

  return (
    <div className="space-y-3">
      {/* Header Actions */}
      <div className="bg-white rounded-lg shadow p-2">
        <div className="flex flex-col md:flex-row gap-1.5 items-center">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-2.5 py-1.5 rounded font-medium transition flex items-center gap-1 text-xs whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
          >
            <Plus size={12} />
            Generate Challans
          </button>

          <div className="md:w-32">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="md:w-32">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 relative w-full">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              placeholder="Search by student name or challan number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Challans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Challan No</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Student Name</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Class</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Period</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Amount</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Due Date</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-3 py-6 text-center text-gray-500">
                    Loading challans...
                  </td>
                </tr>
              ) : currentChallans.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-3 py-6 text-center text-gray-500">
                    No challans found
                  </td>
                </tr>
              ) : (
                currentChallans.map((challan, index) => {
                  const studentName = `${challan.students?.first_name} ${challan.students?.last_name || ''}`.trim()
                  const isDue = new Date(challan.due_date) < new Date() && challan.status === 'pending'

                  return (
                    <tr
                      key={challan.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-3 py-2.5 border border-gray-200">{startIndex + index + 1}</td>
                      <td className="px-3 py-2.5 border border-gray-200 font-mono text-xs">
                        {challan.challan_number}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className="text-blue-600 font-medium">{studentName}</span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {challan.students?.classes?.class_name || '-'}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        {challan.period_label || `${challan.fee_month} ${challan.fee_year}`}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200 font-semibold text-green-600">
                        {formatCurrency(challan.total_amount)}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <span className={isDue ? 'text-red-600 font-semibold' : ''}>
                          {new Date(challan.due_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <select
                          value={challan.status}
                          onChange={(e) => handleStatusChange(challan.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-semibold border ${
                            challan.status === 'paid'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : challan.status === 'overdue'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : challan.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-800 border-gray-300'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewChallan(challan)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                            title="View Challan"
                          >
                            <Eye size={16} />
                          </button>
                          {challan.status === 'paid' && (
                            <button
                              onClick={() => handlePrintChallan(challan)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded transition"
                              title="Print Challan"
                            >
                              <Printer size={16} />
                            </button>
                          )}
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
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-xs text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredChallans.length)} of {filteredChallans.length} challans
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 py-1 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Challan Modal */}
      {showGenerateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowGenerateModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-[10000] w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Generate Fee Challans</h3>
                  <p className="text-blue-200 text-xs mt-1">Create challans for students</p>
                </div>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={generateForm.classId}
                  onChange={(e) => setGenerateForm({ ...generateForm, classId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Choose a class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    value={generateForm.month}
                    onChange={(e) => setGenerateForm({ ...generateForm, month: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={generateForm.year}
                    onChange={(e) => setGenerateForm({ ...generateForm, year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due in Days
                </label>
                <input
                  type="number"
                  value={generateForm.dueInDays}
                  onChange={(e) => setGenerateForm({ ...generateForm, dueInDays: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  min="1"
                  max="90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generate For
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="class"
                      checked={generateForm.generateFor === 'class'}
                      onChange={(e) => setGenerateForm({ ...generateForm, generateFor: e.target.value })}
                      className="mr-2"
                    />
                    <span className="text-sm">Entire Class</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="individual"
                      checked={generateForm.generateFor === 'individual'}
                      onChange={(e) => setGenerateForm({ ...generateForm, generateFor: e.target.value })}
                      className="mr-2"
                    />
                    <span className="text-sm">Individual PDFs</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateChallan}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
