'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, CreditCard, Calendar, User, Hash, Trash2, X, TrendingUp, Award, RefreshCw, Search, Download, CheckCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import jsPDF from 'jspdf'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

export default function StudentReportsPage() {
  const [activeTab, setActiveTab] = useState('certificates') // 'certificates' or 'cards'
  const [certificates, setCertificates] = useState([])
  const [idCards, setIdCards] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  // Real-time subscriptions
  const certificatesChannel = useRef(null)
  const idCardsChannel = useRef(null)

  // Statistics
  const [stats, setStats] = useState({
    totalCertificates: 0,
    totalCards: 0,
    activeCards: 0,
    expiredCards: 0
  })

  useEffect(() => {
    fetchClasses()
    fetchCertificates()
    fetchIdCards()
    setupRealtimeSubscriptions()

    return () => {
      // Cleanup subscriptions
      if (certificatesChannel.current) {
        supabase.removeChannel(certificatesChannel.current)
      }
      if (idCardsChannel.current) {
        supabase.removeChannel(idCardsChannel.current)
      }
    }
  }, [])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [activeTab, selectedClass, searchName, searchAdmissionNo, certificates, idCards])

  useEffect(() => {
    calculateStats()
  }, [certificates, idCards])

  const setupRealtimeSubscriptions = () => {
    // Subscribe to certificates changes
    certificatesChannel.current = supabase
      .channel('certificates-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'student_certificates' },
        (payload) => {
          console.log('Certificate change detected:', payload)
          fetchCertificates()
          showToast('Data updated in real-time!', 'success')
        }
      )
      .subscribe()

    // Subscribe to ID cards changes
    idCardsChannel.current = supabase
      .channel('id-cards-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'student_id_cards' },
        (payload) => {
          console.log('ID card change detected:', payload)
          fetchIdCards()
          showToast('Data updated in real-time!', 'success')
        }
      )
      .subscribe()
  }

  const calculateStats = () => {
    const totalCertificates = certificates.length
    const totalCards = idCards.length
    const activeCards = idCards.filter(card => card.status === 'active').length
    const expiredCards = idCards.filter(card => card.status !== 'active').length

    setStats({
      totalCertificates,
      totalCards,
      activeCards,
      expiredCards
    })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchCertificates(), fetchIdCards()])
    showToast('Data refreshed successfully!', 'success')
    setTimeout(() => setIsRefreshing(false), 500)
  }

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
    }, 4000)
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
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
    <div className="p-3 sm:p-4 lg:p-6 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 transform hover:scale-105 transition-transform flex-shrink-0">
              <Award className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent truncate">
                Student Reports
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate">Real-time certificates and ID cards management</p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 disabled:opacity-50 w-full md:w-auto"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="font-medium text-sm sm:text-base">Refresh</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="text-white" size={20} />
              </div>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.totalCertificates}</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Certificates</p>
            <div className="mt-1 sm:mt-2 flex items-center gap-1 text-xs text-green-600">
              <TrendingUp size={12} className="flex-shrink-0" />
              <span className="truncate">All time</span>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="text-white" size={20} />
              </div>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.totalCards}</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total ID Cards</p>
            <div className="mt-1 sm:mt-2 flex items-center gap-1 text-xs text-green-600">
              <TrendingUp size={12} className="flex-shrink-0" />
              <span className="truncate">All time</span>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Award className="text-white" size={20} />
              </div>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.activeCards}</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active Cards</p>
            <div className="mt-1 sm:mt-2 flex items-center gap-1 text-xs text-green-600">
              <TrendingUp size={12} className="flex-shrink-0" />
              <span className="truncate">Currently valid</span>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="text-white" size={20} />
              </div>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stats.expiredCards}</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Expired Cards</p>
            <div className="mt-1 sm:mt-2 flex items-center gap-1 text-xs text-orange-600">
              <Calendar size={12} className="flex-shrink-0" />
              <span className="truncate">Need renewal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl border border-white/20">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-2 p-3 sm:p-4">
            <button
              onClick={() => setActiveTab('certificates')}
              className={`flex items-center justify-center sm:justify-start gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-semibold transition-all transform text-sm sm:text-base ${
                activeTab === 'certificates'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
              }`}
            >
              <FileText size={18} className="flex-shrink-0" />
              <span className="truncate">Certificates</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'certificates' ? 'bg-white/20' : 'bg-gray-300'
              }`}>
                {certificates.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center justify-center sm:justify-start gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-semibold transition-all transform text-sm sm:text-base ${
                activeTab === 'cards'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
              }`}
            >
              <CreditCard size={18} className="flex-shrink-0" />
              <span className="truncate">ID Cards</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'cards' ? 'bg-white/20' : 'bg-gray-300'
              }`}>
                {idCards.length}
              </span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 lg:mb-5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Search size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-800 text-base sm:text-lg truncate">Search & Filter</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Class Filter */}
            <div className="group">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Filter by Class
              </label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all group-hover:border-gray-300 appearance-none cursor-pointer font-medium text-sm"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Name Search */}
            <div className="group">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Search by Name
              </label>
              <div className="relative">
                <User className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" size={18} />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter student name..."
                  className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-gray-300 font-medium text-sm"
                />
              </div>
            </div>

            {/* Admission Number Search */}
            <div className="group">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Search by Admission No
              </label>
              <div className="relative">
                <Hash className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" size={18} />
                <input
                  type="text"
                  value={searchAdmissionNo}
                  onChange={(e) => setSearchAdmissionNo(e.target.value)}
                  placeholder="Enter admission number..."
                  className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-gray-300 font-medium text-sm"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(selectedClass || searchName || searchAdmissionNo) && (
            <div className="mt-3 sm:mt-4 lg:mt-5">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-semibold transition-all text-xs sm:text-sm"
              >
                <X size={14} className="flex-shrink-0" />
                <span>Clear all filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">
                {activeTab === 'certificates' ? 'Certificates List' : 'ID Cards List'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
                {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'} found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="text-gray-600 font-medium mt-6">Loading data...</p>
              <p className="text-gray-400 text-sm mt-1">Please wait</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                {activeTab === 'certificates' ? (
                  <FileText size={48} className="text-gray-400" />
                ) : (
                  <CreditCard size={48} className="text-gray-400" />
                )}
              </div>
              <p className="text-gray-600 text-xl font-semibold mb-2">
                {(selectedClass || searchName || searchAdmissionNo)
                  ? 'No results found'
                  : `No ${activeTab} issued yet`}
              </p>
              <p className="text-gray-400 text-sm">
                {(selectedClass || searchName || searchAdmissionNo)
                  ? 'Try adjusting your filters to find what you\'re looking for'
                  : `${activeTab === 'certificates' ? 'Certificates' : 'ID cards'} will appear here once issued`}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-max">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Sr.</th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Student Name</th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Father Name</th>
                      <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Class</th>
                    {activeTab === 'certificates' ? (
                      <>
                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Type</th>
                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Issue Date</th>
                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Remarks</th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Issue Date</th>
                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Expiry Date</th>
                        <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Status</th>
                      </>
                    )}
                    <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-center font-bold border border-gray-300 text-xs sm:text-sm whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200 text-xs sm:text-sm">{startIndex + index + 1}</td>
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.photo_url ? (
                              <img src={item.photo_url} alt={item.student_first_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm sm:text-base lg:text-lg font-bold">
                                {item.student_first_name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="text-blue-600 font-medium hover:underline cursor-pointer text-xs sm:text-sm truncate">
                            {item.student_first_name} {item.student_last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200 text-xs sm:text-sm">{item.father_name}</td>
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                        <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap">
                          {item.class_name}
                        </span>
                      </td>
                      {activeTab === 'certificates' ? (
                        <>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                            <span className="inline-block px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs sm:text-sm font-semibold capitalize shadow-sm whitespace-nowrap">
                              {item.certificate_type}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                            <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm whitespace-nowrap">
                                {new Date(item.issue_date).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                            <span className="text-gray-600 text-xs sm:text-sm">
                              {item.remarks || '-'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                            <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm whitespace-nowrap">
                                {new Date(item.issue_date).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                            <div className="flex items-center gap-1 sm:gap-2 text-gray-700">
                              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm whitespace-nowrap">
                                {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                            <span className={`inline-block px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm capitalize whitespace-nowrap ${
                              item.status === 'active'
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 border border-gray-200">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          <button
                            onClick={() => handlePrint(item)}
                            className="p-1.5 sm:p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
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
              <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-gray-50">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
                </div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition text-xs sm:text-sm ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1E3A8A] text-white hover:bg-blue-900'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1 sm:gap-2">
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
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium transition text-xs sm:text-sm ${
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
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition text-xs sm:text-sm ${
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
        <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-5 py-3 rounded-full shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle size={20} strokeWidth={2.5} />}
          {toast.type === 'error' && <X size={20} strokeWidth={2.5} />}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={hideToast} className="ml-1 hover:opacity-80 transition-opacity">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[99998]"
            style={{
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)'
            }}
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg sm:rounded-t-xl">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Trash2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold truncate">Confirm Deletion</h3>
                    <p className="text-red-100 text-xs mt-0.5 truncate">This action cannot be undone</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <p className="text-gray-700 text-center text-sm sm:text-base">
                    Are you sure you want to delete this {activeTab === 'certificates' ? 'certificate' : 'ID card'} for
                  </p>
                  <p className="text-center mt-2">
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {itemToDelete.student_first_name} {itemToDelete.student_last_name}
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 text-center mt-1">
                    Admission No: {itemToDelete.admission_number}
                  </p>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setItemToDelete(null)
                    }}
                    className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-all border border-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Trash2 size={16} />
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

