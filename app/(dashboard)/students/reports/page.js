'use client'

import { useState, useEffect } from 'react'
import { FileText, CreditCard, Filter, Calendar, User, Hash, Loader2, Printer, Trash2, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

export default function StudentReportsPage() {
  const [activeTab, setActiveTab] = useState('certificates') // 'certificates' or 'cards'
  const [certificates, setCertificates] = useState([])
  const [idCards, setIdCards] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [selectedClass, setSelectedClass] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchAdmissionNo, setSearchAdmissionNo] = useState('')

  // Filtered data
  const [filteredData, setFilteredData] = useState([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(10)

  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  useEffect(() => {
    fetchClasses()
    fetchCertificates()
    fetchIdCards()
  }, [])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [activeTab, selectedClass, searchName, searchAdmissionNo, certificates, idCards])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const fetchCertificates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_certificates')
        .select(`
          id,
          issue_date,
          certificate_type,
          remarks,
          student_id,
          students (
            id,
            first_name,
            last_name,
            admission_number,
            father_name,
            current_class_id,
            photo_url
          )
        `)
        .order('issue_date', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Fetched certificates:', data)

      // Fetch class names separately
      let classMap = {}
      if (data && data.length > 0) {
        const classIds = [...new Set(data.map(cert => cert.students?.current_class_id).filter(Boolean))]

        if (classIds.length > 0) {
          const { data: classesData } = await supabase
            .from('classes')
            .select('id, class_name')
            .in('id', classIds)

          classesData?.forEach(cls => {
            classMap[cls.id] = cls.class_name
          })

          console.log('Class map:', classMap)
        }
      }

      // Flatten the nested structure
      const flattenedData = (data || []).map(cert => ({
        id: cert.id,
        type: 'certificate',
        issue_date: cert.issue_date,
        certificate_type: cert.certificate_type,
        remarks: cert.remarks,
        student_id: cert.student_id,
        student_first_name: cert.students?.first_name || 'N/A',
        student_last_name: cert.students?.last_name || '',
        admission_number: cert.students?.admission_number || 'N/A',
        father_name: cert.students?.father_name || 'N/A',
        class_id: cert.students?.current_class_id || '',
        class_name: classMap[cert.students?.current_class_id] || 'N/A',
        photo_url: cert.students?.photo_url || null
      }))

      console.log('Flattened certificates:', flattenedData)
      setCertificates(flattenedData)
    } catch (err) {
      console.error('Error fetching certificates:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchIdCards = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_id_cards')
        .select(`
          id,
          card_number,
          issue_date,
          expiry_date,
          status,
          student_id,
          students (
            id,
            first_name,
            last_name,
            admission_number,
            father_name,
            current_class_id,
            photo_url
          )
        `)
        .order('issue_date', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Fetched ID cards:', data)
      console.log('Total ID cards found:', data?.length || 0)

      // Fetch class names separately
      let classMap = {}
      if (data && data.length > 0) {
        const classIds = [...new Set(data.map(card => card.students?.current_class_id).filter(Boolean))]

        if (classIds.length > 0) {
          const { data: classesData } = await supabase
            .from('classes')
            .select('id, class_name')
            .in('id', classIds)

          classesData?.forEach(cls => {
            classMap[cls.id] = cls.class_name
          })

          console.log('Class map for cards:', classMap)
        }
      }

      // Flatten the nested structure
      const flattenedData = (data || []).map(card => {
        console.log('Processing card:', {
          id: card.id,
          student_id: card.student_id,
          students: card.students,
          has_student: !!card.students
        })

        return {
          id: card.id,
          type: 'card',
          card_number: card.card_number,
          issue_date: card.issue_date,
          expiry_date: card.expiry_date,
          status: card.status,
          student_id: card.student_id,
          student_first_name: card.students?.first_name || 'N/A',
          student_last_name: card.students?.last_name || '',
          admission_number: card.students?.admission_number || 'N/A',
          father_name: card.students?.father_name || 'N/A',
          class_id: card.students?.current_class_id || '',
          class_name: classMap[card.students?.current_class_id] || 'N/A',
          photo_url: card.students?.photo_url || null
        }
      })

      console.log('Flattened ID cards:', flattenedData)
      console.log('Setting idCards state with', flattenedData.length, 'cards')
      setIdCards(flattenedData)
    } catch (err) {
      console.error('Error fetching ID cards:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    const dataToFilter = activeTab === 'certificates' ? certificates : idCards

    let filtered = [...dataToFilter]

    // Filter by class
    if (selectedClass) {
      filtered = filtered.filter(item => item.class_id === selectedClass)
    }

    // Filter by name
    if (searchName.trim()) {
      filtered = filtered.filter(item => {
        const fullName = `${item.student_first_name} ${item.student_last_name}`.toLowerCase()
        return fullName.includes(searchName.toLowerCase())
      })
    }

    // Filter by admission number
    if (searchAdmissionNo.trim()) {
      filtered = filtered.filter(item =>
        item.admission_number?.toLowerCase().includes(searchAdmissionNo.toLowerCase())
      )
    }

    setFilteredData(filtered)
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' })
    }, 3000)
  }

  const clearFilters = () => {
    setSelectedClass('')
    setSearchName('')
    setSearchAdmissionNo('')
  }

  const handlePrint = async (item) => {
    try {
      if (activeTab === 'certificates') {
        // Generate certificate PDF
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        })

        const fullName = `${item.student_first_name} ${item.student_last_name}`

        // Certificate Border
        doc.setLineWidth(1)
        doc.rect(10, 10, 190, 277)
        doc.setLineWidth(0.5)
        doc.rect(12, 12, 186, 273)

        // Title
        doc.setFontSize(28)
        doc.setFont('helvetica', 'bold')
        doc.text('CHARACTER CERTIFICATE', 105, 40, { align: 'center' })

        // Body
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')

        const issueDate = new Date(item.issue_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })

        let yPos = 70
        doc.text(`This is to certify that ${fullName}, S/O ${item.father_name},`, 20, yPos)
        yPos += 10
        doc.text(`Admission Number: ${item.admission_number}, was a student of Class ${item.class_name}`, 20, yPos)
        yPos += 10
        doc.text(`in this institution.`, 20, yPos)
        yPos += 15
        doc.text(`During his/her stay in the school, his/her conduct and character`, 20, yPos)
        yPos += 10
        doc.text(`remained ${item.certificate_type || 'good'}.`, 20, yPos)

        if (item.remarks) {
          yPos += 15
          doc.text(`Remarks: ${item.remarks}`, 20, yPos)
        }

        // Date and signature
        yPos = 250
        doc.setFontSize(11)
        doc.text(`Date: ${issueDate}`, 20, yPos)
        doc.text('Principal/Head', 160, yPos)
        doc.text('Signature & Stamp', 160, yPos + 10)

        const fileName = `certificate_${item.admission_number}_${new Date().getTime()}.pdf`
        doc.save(fileName)
      } else {
        // Generate ID Card PDF
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [54, 86] // Standard CR80 ID card size
        })

        const fullName = `${item.student_first_name} ${item.student_last_name}`

        // Card background
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, 54, 86, 'F')

        // Header with school name
        doc.setFillColor(59, 130, 246) // Blue
        doc.rect(0, 0, 54, 15, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('SCHOOL NAME', 27, 6, { align: 'center' })
        doc.setFontSize(7)
        doc.text('STUDENT ID CARD', 27, 11, { align: 'center' })

        // Photo placeholder
        doc.setFillColor(200, 200, 200)
        doc.rect(17, 18, 20, 25, 'F')
        doc.setTextColor(100, 100, 100)
        doc.setFontSize(6)
        doc.text('PHOTO', 27, 30, { align: 'center' })

        // Student details
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(fullName, 27, 47, { align: 'center' })

        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        let yPos = 52
        doc.text(`Class: ${item.class_name}`, 27, yPos, { align: 'center' })
        yPos += 5
        doc.text(`Admission: ${item.admission_number}`, 27, yPos, { align: 'center' })
        yPos += 5
        doc.text(`Card No: ${item.card_number}`, 27, yPos, { align: 'center' })

        // Dates
        yPos += 8
        doc.setFontSize(6)
        const issueDate = new Date(item.issue_date).toLocaleDateString('en-GB')
        const expiryDate = new Date(item.expiry_date).toLocaleDateString('en-GB')
        doc.text(`Issue: ${issueDate}`, 27, yPos, { align: 'center' })
        yPos += 4
        doc.text(`Valid Until: ${expiryDate}`, 27, yPos, { align: 'center' })

        const fileName = `id_card_${item.admission_number}_${new Date().getTime()}.pdf`
        doc.save(fileName)
      }

      showToast('PDF generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Failed to generate PDF. Please try again.', 'error')
    }
  }

  const handleDeleteClick = (item) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const tableName = activeTab === 'certificates' ? 'student_certificates' : 'student_id_cards'

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw error

      // Refresh data
      if (activeTab === 'certificates') {
        await fetchCertificates()
      } else {
        await fetchIdCards()
      }

      showToast(`${activeTab === 'certificates' ? 'Certificate' : 'ID card'} deleted successfully!`, 'success')
      setShowDeleteModal(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('Error deleting record:', error)
      showToast('Failed to delete. Please try again.', 'error')
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
            <FileText className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Student Reports</h1>
            <p className="text-sm text-gray-600">View all certificates and ID cards issued</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-lg">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab('certificates')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'certificates'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText size={18} />
              Certificates ({certificates.length})
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CreditCard size={18} />
              ID Cards ({idCards.length})
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-600" />
            <h3 className="font-semibold text-gray-800">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter student name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Admission Number Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Admission No
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchAdmissionNo}
                  onChange={(e) => setSearchAdmissionNo(e.target.value)}
                  placeholder="Enter admission number..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(selectedClass || searchName || searchAdmissionNo) && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {activeTab === 'certificates' ? 'Certificates' : 'ID Cards'} ({filteredData.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'certificates' ? (
                  <FileText size={40} className="text-gray-400" />
                ) : (
                  <CreditCard size={40} className="text-gray-400" />
                )}
              </div>
              <p className="text-gray-500 text-lg mb-2">
                {(selectedClass || searchName || searchAdmissionNo)
                  ? 'No results found'
                  : `No ${activeTab} issued yet`}
              </p>
              <p className="text-gray-400 text-sm">
                {(selectedClass || searchName || searchAdmissionNo)
                  ? 'Try adjusting your filters'
                  : `${activeTab === 'certificates' ? 'Certificates' : 'ID cards'} will appear here once issued`}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Father Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class</th>
                    {activeTab === 'certificates' ? (
                      <>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Type</th>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Issue Date</th>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Remarks</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Issue Date</th>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Expiry Date</th>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Status</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 border border-gray-200 text-blue-600">{startIndex + index + 1}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-3">
                          {item.photo_url ? (
                            <img
                              src={item.photo_url}
                              alt={item.student_first_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                              {item.student_first_name.charAt(0)}
                            </div>
                          )}
                          <span className="text-blue-600 font-medium">
                            {item.student_first_name} {item.student_last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border border-gray-200">{item.father_name}</td>
                      <td className="px-4 py-3 border border-gray-200">{item.class_name}</td>
                      {activeTab === 'certificates' ? (
                        <>
                          <td className="px-4 py-3 border border-gray-200">
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm capitalize">
                              {item.certificate_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 border border-gray-200">
                            {new Date(item.issue_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3 border border-gray-200">
                            {item.remarks || '-'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 border border-gray-200">
                            {new Date(item.issue_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3 border border-gray-200">
                            {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3 border border-gray-200">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              item.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handlePrint(item)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="Print"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} students
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1E3A8A] text-white hover:bg-blue-900'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const pages = []
                      const maxVisiblePages = 4
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                      // Adjust startPage if we're near the end
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1)
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-10 h-10 rounded-lg font-medium transition ${
                              currentPage === i
                                ? 'bg-[#1E3A8A] text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                          >
                            {i}
                          </button>
                        )
                      }
                      return pages
                    })()}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1E3A8A] text-white hover:bg-blue-900'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete this {activeTab === 'certificates' ? 'certificate' : 'ID card'} for <span className="font-bold text-red-600">{itemToDelete.student_first_name} {itemToDelete.student_last_name}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setItemToDelete(null)
                    }}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete
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
