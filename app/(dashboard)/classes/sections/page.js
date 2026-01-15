'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Edit2, Trash2, X, CheckCircle, XCircle, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

// Modal Overlay Component - Uses Portal to render at document body level
const ModalOverlay = ({ children, onClose }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[99998]"
        style={{
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
        onClick={onClose}
      />
      {children}
    </>,
    document.body
  )
}

// Toast Component - Matches screenshot design with pill/rounded shape
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-5 py-3 rounded-full shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}
    style={{
      animation: 'slideIn 0.3s ease-out'
    }}>
      {type === 'success' && <CheckCircle size={20} strokeWidth={2.5} />}
      {type === 'error' && <X size={20} strokeWidth={2.5} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-80 transition-opacity">
        <X size={18} strokeWidth={2.5} />
      </button>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

// Helper to get logged-in user
const getLoggedInUser = () => {
  if (typeof window === 'undefined') return { id: null, school_id: null }
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return { id: user?.id, school_id: user?.school_id }
  } catch {
    return { id: null, school_id: null }
  }
}

export default function SectionsPage() {
  // Debug: Check Supabase initialization
  useEffect(() => {
    console.log('📋 SectionsPage mounted')
    console.log('🔌 Supabase client:', supabase ? 'Initialized' : 'NOT INITIALIZED')
    const user = getUserFromCookie()
    console.log('👤 User from storage:', user)
    console.log('🔑 User properties:', user ? Object.keys(user) : 'No user')
    console.log('🏫 School ID check:', {
      'user.school_id': user?.school_id,
      'user.schoolId': user?.schoolId,
      'user.school': user?.school,
      'Full user': JSON.stringify(user, null, 2)
    })
  }, [])

  const [showSidebar, setShowSidebar] = useState(false)
  const [showEditSidebar, setShowEditSidebar] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSection, setSelectedSection] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [loading, setLoading] = useState(true)
  const [classList, setClassList] = useState([])
  const [staffList, setStaffList] = useState([])
  const [sections, setSections] = useState([])
  const [formData, setFormData] = useState({
    class: '',
    section: '',
    incharge: '',
    roomNumber: '',
    capacity: '',
    orderBy: ''
  })
  const [editFormData, setEditFormData] = useState({
    class: '',
    section: '',
    incharge: '',
    roomNumber: '',
    capacity: '',
    orderBy: ''
  })
  const [inchargeSearchTerm, setInchargeSearchTerm] = useState('')
  const [showInchargeDropdown, setShowInchargeDropdown] = useState(false)
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(10)

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchClasses()
    fetchStaff()
    fetchSections()
  }, [])

  // Real-time subscription for sections
  useEffect(() => {
    const { id: userId, school_id: schoolId } = getLoggedInUser()
    if (!userId || !schoolId || !supabase) return

    console.log('🔴 Setting up real-time subscription for sections')

    const channel = supabase
      .channel('sections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sections',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log('🔴 Real-time event received:', payload.eventType, payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            fetchSections()
          } else if (payload.eventType === 'DELETE') {
            setSections(prev => prev.filter(s => s.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      console.log('🔴 Unsubscribing from sections real-time')
      supabase.removeChannel(channel)
    }
  }, [])

  // Real-time subscription for students (to update section counts)
  useEffect(() => {
    const { id: userId, school_id: schoolId} = getLoggedInUser()
    if (!userId || !schoolId || !supabase) return

    console.log('🔴 Setting up real-time subscription for students in sections')

    const channel = supabase
      .channel('students-sections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          console.log('🔴 Student real-time event received:', payload.eventType)
          // Refetch sections to update student counts
          fetchSections()
        }
      )
      .subscribe()

    return () => {
      console.log('🔴 Unsubscribing from students real-time')
      supabase.removeChannel(channel)
    }
  }, [])

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showSidebar || showEditSidebar || showDeleteModal) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showSidebar, showEditSidebar, showDeleteModal])

  const fetchClasses = async () => {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        return
      }

      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('❌ No user found')
        return
      }

      console.log('✅ Fetching classes for school_id:', schoolId)

      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) {
        console.error('Error fetching classes:', error)
      } else {
        setClassList(data || [])
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchStaff = async () => {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        return
      }

      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('❌ No user found')
        return
      }

      console.log('✅ Fetching staff for school_id:', schoolId)

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .eq('department', 'TEACHING')
        .order('first_name', { ascending: true })

      if (error) {
        console.error('Error fetching staff:', error)
      } else {
        setStaffList(data || [])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchSections = async () => {
    try {
      setLoading(true)

      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        setLoading(false)
        return
      }

      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        console.error('❌ No user found')
        setLoading(false)
        return
      }

      console.log('✅ Fetching sections for school_id:', schoolId)

      // Get sections with class name and standard_fee from classes table
      const { data: sections, error } = await supabase
        .from('sections')
        .select(`
          id,
          section_name,
          class_id,
          class_teacher_id,
          room_number,
          capacity,
          status,
          classes(class_name, standard_fee)
        `)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .in('status', ['active', 'inactive'])

      if (error) {
        console.error('Error fetching sections:', error)
        console.error('Error details:', error)
        setSections([])
      } else {
        console.log('✅ Fetched sections:', sections)
        // Get teacher names and student counts for sections
        const sectionsWithDetails = await Promise.all(
          (sections || []).map(async (section) => {
            let teacherName = null

            if (section.class_teacher_id) {
              const { data: teacher, error: teacherError } = await supabase
                .from('staff')
                .select('first_name, last_name')
                .eq('id', section.class_teacher_id)
                .eq('user_id', userId)
                .eq('school_id', schoolId)
                .maybeSingle()

              if (!teacherError && teacher) {
                teacherName = `${teacher.first_name} ${teacher.last_name || ''}`.trim()
              }
            }

            // Get current student count for this section
            const { count: studentCount } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('current_section_id', section.id)
              .eq('user_id', userId)
              .eq('school_id', schoolId)
              .eq('status', 'active')

            return {
              id: section.id,
              section_name: section.section_name,
              class_id: section.class_id,
              class_name: section.classes?.class_name,
              standard_fee: section.classes?.standard_fee || 0,
              class_teacher_id: section.class_teacher_id,
              teacher_name: teacherName,
              room_number: section.room_number,
              capacity: section.capacity,
              current_students: studentCount || 0,
              status: section.status
            }
          })
        )

        console.log('✅ Sections with details:', sectionsWithDetails)
        setSections(sectionsWithDetails)
      }
    } catch (error) {
      console.error('❌ Error fetching sections:', error)
      setSections([])
    } finally {
      setLoading(false)
    }
  }

  // Get unique section names for filter
  const uniqueSectionNames = [...new Set(sections.map(s => s.section_name))].sort()

  const filteredSections = sections
    .filter(section => {
      const matchesSearch = section.section_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           section.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesClass = !selectedClass || section.class_id === selectedClass
      const matchesSection = !selectedSectionFilter || section.section_name === selectedSectionFilter
      return matchesSearch && matchesClass && matchesSection
    })
    .sort((a, b) => {
      // Sort by standard_fee (low to high), then by section_name
      const feeA = parseFloat(a.standard_fee) || 0
      const feeB = parseFloat(b.standard_fee) || 0
      if (feeA !== feeB) {
        return feeA - feeB
      }
      return a.section_name.localeCompare(b.section_name)
    })

  const exportToCSV = () => {
    if (sections.length === 0) {
      showToast('No data to export', 'error')
      return
    }

    // Export ALL sections (not just filtered) sorted by fee
    const sortedSections = [...sections].sort((a, b) => {
      const feeA = parseFloat(a.standard_fee) || 0
      const feeB = parseFloat(b.standard_fee) || 0
      if (feeA !== feeB) {
        return feeA - feeB
      }
      return a.section_name.localeCompare(b.section_name)
    })

    const csvData = sortedSections.map((section, index) => ({
      'Sr.': index + 1,
      'Class Name': section.class_name || 'N/A',
      'Section Name': section.section_name || 'N/A',
      'Incharge Name': section.teacher_name || 'N/A',
      'Room Number': section.room_number || 'N/A',
      'Capacity': section.capacity || 'N/A'
    }))

    const headers = Object.keys(csvData[0])
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    a.download = `sections-${date}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    showToast('Excel exported successfully!', 'success')
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredSections.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedSections = filteredSections.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedClass, selectedSectionFilter])

  const handleSave = async () => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
        return
      }

      // Check if room number is already taken
      if (formData.roomNumber && formData.roomNumber.trim()) {
        const { data: existingRoom, error: roomCheckError } = await supabase
          .from('sections')
          .select('id, section_name, classes!inner(class_name)')
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .eq('room_number', formData.roomNumber.trim())
          .eq('status', 'active')
          .limit(1)

        if (roomCheckError) {
          console.error('Error checking room number:', roomCheckError)
        } else if (existingRoom && existingRoom.length > 0) {
          const existing = existingRoom[0]
          const className = existing.classes?.class_name || 'Unknown Class'
          showToast(`Room number ${formData.roomNumber} is already assigned to ${className} - ${existing.section_name}`, 'error')
          return
        }
      }

      const { data, error } = await supabase
        .from('sections')
        .insert([{
          user_id: userId,
          school_id: schoolId,
          class_id: formData.class,
          section_name: formData.section,
          class_teacher_id: formData.incharge || null,
          room_number: formData.roomNumber || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          created_by: userId,
          status: 'active'
        }])
        .select()

      if (error) {
        console.error('Error creating section:', error)
        showToast(`Failed to create section: ${error.message}`, 'error')
      } else {
        setShowSidebar(false)
        setFormData({ class: '', section: '', incharge: '', roomNumber: '', capacity: '', orderBy: '' })
        setInchargeSearchTerm('')
        setShowInchargeDropdown(false)
        showToast('Section created successfully!', 'success')

        // Update sections state without reloading
        const newSection = data[0]
        const className = classList.find(c => c.id === newSection.class_id)?.class_name
        let teacherName = null
        if (newSection.class_teacher_id) {
          const teacher = staffList.find(s => s.id === newSection.class_teacher_id)
          if (teacher) {
            teacherName = `${teacher.first_name} ${teacher.last_name || ''}`.trim()
          }
        }
        setSections(prev => [...prev, {
          ...newSection,
          class_name: className,
          teacher_name: teacherName,
          current_students: 0
        }])
      }
    } catch (error) {
      console.error('Error saving section:', error)
      showToast('Error saving section: ' + error.message, 'error')
    }
  }

  const handleEdit = (section) => {
    setSelectedSection(section)
    setEditFormData({
      class: section.class_id || '',
      section: section.section_name,
      incharge: section.class_teacher_id || '',
      roomNumber: section.room_number || '',
      capacity: section.capacity || '',
      orderBy: section.order_by || ''
    })
    setInchargeSearchTerm('')
    setShowEditSidebar(true)
  }

  const handleUpdate = async () => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
        return
      }

      // Check if room number is already taken (excluding current section)
      if (editFormData.roomNumber && editFormData.roomNumber.trim()) {
        const { data: existingRoom, error: roomCheckError } = await supabase
          .from('sections')
          .select('id, section_name, classes!inner(class_name)')
          .eq('user_id', userId)
          .eq('school_id', schoolId)
          .eq('room_number', editFormData.roomNumber.trim())
          .eq('status', 'active')
          .neq('id', selectedSection.id)
          .limit(1)

        if (roomCheckError) {
          console.error('Error checking room number:', roomCheckError)
        } else if (existingRoom && existingRoom.length > 0) {
          const existing = existingRoom[0]
          const className = existing.classes?.class_name || 'Unknown Class'
          showToast(`Room number ${editFormData.roomNumber} is already assigned to ${className} - ${existing.section_name}`, 'error')
          return
        }
      }

      const { data, error } = await supabase
        .from('sections')
        .update({
          class_id: editFormData.class,
          section_name: editFormData.section,
          class_teacher_id: editFormData.incharge || null,
          room_number: editFormData.roomNumber || null,
          capacity: editFormData.capacity ? parseInt(editFormData.capacity) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSection.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .select()

      if (error) {
        console.error('Error updating section:', error)
        showToast('Failed to update section: ' + error.message, 'error')
      } else {
        setShowEditSidebar(false)
        setInchargeSearchTerm('')
        setShowInchargeDropdown(false)
        const updatedSectionId = selectedSection.id
        setSelectedSection(null)
        setEditFormData({ class: '', section: '', incharge: '', roomNumber: '', capacity: '', orderBy: '' })
        showToast('Section updated successfully!', 'success')

        // Update sections state without reloading
        const updatedSection = data[0]
        const className = classList.find(c => c.id === updatedSection.class_id)?.class_name
        let teacherName = null
        if (updatedSection.class_teacher_id) {
          const teacher = staffList.find(s => s.id === updatedSection.class_teacher_id)
          if (teacher) {
            teacherName = `${teacher.first_name} ${teacher.last_name || ''}`.trim()
          }
        }
        setSections(prev => prev.map(s =>
          s.id === updatedSectionId
            ? { ...updatedSection, class_name: className, teacher_name: teacherName, current_students: s.current_students }
            : s
        ))
      }
    } catch (error) {
      console.error('Error updating section:', error)
      showToast('Error updating section', 'error')
    }
  }

  const handleDelete = (section) => {
    setSelectedSection(section)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
        return
      }

      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', selectedSection.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)

      if (error) {
        console.error('Error deleting section:', error)
        showToast('Failed to delete section: ' + error.message, 'error')
      } else {
        setShowDeleteModal(false)
        const deletedSectionName = selectedSection.section_name
        const deletedId = selectedSection.id
        setSelectedSection(null)
        showToast(`Section "${deletedSectionName}" deleted successfully!`, 'success')

        // Remove section from state completely
        setSections(prev => prev.filter(s => s.id !== deletedId))
      }
    } catch (error) {
      console.error('Error deleting section:', error)
      showToast('Error deleting section', 'error')
    }
  }

  const handleToggleStatus = async (section) => {
    try {
      const { id: userId, school_id: schoolId } = getLoggedInUser()
      if (!userId || !schoolId) {
        showToast('Unauthorized', 'error')
        return
      }

      const newStatus = section.status === 'active' ? 'inactive' : 'active'

      const { data, error } = await supabase
        .from('sections')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', section.id)
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .select()

      if (error) {
        console.error('Error updating status:', error)
        showToast('Failed to update status: ' + error.message, 'error')
      } else {
        const statusText = newStatus === 'active' ? 'activated' : 'deactivated'
        showToast(`Section ${statusText} successfully!`, 'success')

        // Update sections state without reloading
        setSections(prev => prev.map(s =>
          s.id === section.id ? { ...s, status: newStatus } : s
        ))
      }
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Error updating status', 'error')
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
      {/* Top Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowSidebar(true)}
          className="bg-[#DC2626] text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          Assign Section
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Search Sections</h2>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Download size={18} />
            Export to Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Class Dropdown */}
          <div>
            <label className="block text-gray-600 text-sm mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Classes</option>
              {classList.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Dropdown */}
          <div>
            <label className="block text-gray-600 text-sm mb-2">Section</label>
            <select
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Sections</option>
              {uniqueSectionNames.map((sectionName) => (
                <option key={sectionName} value={sectionName}>
                  {sectionName}
                </option>
              ))}
            </select>
          </div>

          {/* General Search */}
          <div>
            <label className="block text-gray-600 text-sm mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Section Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Incharge Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Room Number</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Capacity</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Loading sections...
                  </td>
                </tr>
              ) : filteredSections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No sections found
                  </td>
                </tr>
              ) : (
                paginatedSections.map((section, index) => {
                  const currentStudents = section.current_students || 0
                  const capacity = section.capacity || 0
                  const isFull = capacity > 0 && currentStudents >= capacity

                  return (
                    <tr
                      key={section.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-4 py-3 border border-gray-200 text-blue-600">{startIndex + index + 1}</td>
                      <td className="px-4 py-3 border border-gray-200 font-medium">{section.class_name}</td>
                      <td className="px-4 py-3 border border-gray-200">{section.section_name}</td>
                      <td className="px-4 py-3 border border-gray-200">{section.teacher_name || '-'}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        {section.room_number || '-'}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {capacity > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isFull ? 'text-red-600' : 'text-blue-600'}`}>
                              {currentStudents} / {capacity}
                            </span>
                            {isFull && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                Full
                              </span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(section)}
                          className={`p-2 rounded-lg transition ${
                            section.status === 'active'
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={section.status === 'active' ? 'Active - Click to Deactivate' : 'Inactive - Click to Activate'}
                        >
                          {section.status === 'active' ? (
                            <CheckCircle size={18} />
                          ) : (
                            <XCircle size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(section)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(section)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
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

        {/* Pagination Controls */}
        {filteredSections.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredSections.length)} of {filteredSections.length} sections
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
                  const maxVisiblePages = 5
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1)
                  }

                  const pages = []
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i)
                  }

                  return pages.map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-medium transition ${
                        currentPage === page
                          ? 'bg-[#1E3A8A] text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))
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

      {/* Add Section Sidebar */}
      {showSidebar && (
        <ModalOverlay onClose={() => setShowSidebar(false)}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Add New Section</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the details below</p>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                {/* Class */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.class}
                    onChange={(e) => {
                      const selectedClassId = e.target.value
                      const selectedClass = classList.find(cls => cls.id === selectedClassId)

                      if (selectedClass && selectedClass.incharge) {
                        const matchingStaff = staffList.find(staff =>
                          `${staff.first_name} ${staff.last_name || ''}`.trim() === selectedClass.incharge
                        )
                        setFormData({
                          ...formData,
                          class: selectedClassId,
                          incharge: matchingStaff ? matchingStaff.id : ''
                        })
                      } else {
                        setFormData({ ...formData, class: selectedClassId })
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Class</option>
                    {classList.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Section Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., A, B, Green, Blue"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>

                {/* Section Incharge */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Section Incharge
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search incharge..."
                      value={inchargeSearchTerm}
                      onChange={(e) => {
                        setInchargeSearchTerm(e.target.value)
                        setShowInchargeDropdown(true)
                      }}
                      onFocus={() => {
                        setShowInchargeDropdown(true)
                        if (formData.incharge && !inchargeSearchTerm) {
                          setInchargeSearchTerm('')
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowInchargeDropdown(false), 200)
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:border-[#1E3A8A] outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                    {showInchargeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {staffList
                          .filter(staff => {
                            if (!inchargeSearchTerm) return true
                            const fullName = `${staff.first_name} ${staff.last_name || ''}`.trim().toLowerCase()
                            return fullName.includes(inchargeSearchTerm.toLowerCase())
                          })
                          .map((staff) => (
                            <div
                              key={staff.id}
                              onClick={() => {
                                const fullName = `${staff.first_name} ${staff.last_name || ''}`.trim()
                                setFormData({ ...formData, incharge: staff.id })
                                setInchargeSearchTerm(fullName)
                                setShowInchargeDropdown(false)
                              }}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            >
                              {staff.first_name} {staff.last_name || ''} - {staff.designation || 'Staff'}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Room Number */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 101, A-12"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>

                {/* Capacity */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 40"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSidebar(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Plus size={16} />
                  Save
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Edit Section Sidebar */}
      {showEditSidebar && (
        <ModalOverlay onClose={() => setShowEditSidebar(false)}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Section</h3>
                  <p className="text-blue-200 text-sm mt-1">Update section details</p>
                </div>
                <button
                  onClick={() => setShowEditSidebar(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                {/* Class */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.class}
                    onChange={(e) => {
                      const selectedClassId = e.target.value
                      const selectedClass = classList.find(cls => cls.id === selectedClassId)

                      if (selectedClass && selectedClass.incharge) {
                        const matchingStaff = staffList.find(staff =>
                          `${staff.first_name} ${staff.last_name || ''}`.trim() === selectedClass.incharge
                        )
                        setEditFormData({
                          ...editFormData,
                          class: selectedClassId,
                          incharge: matchingStaff ? matchingStaff.id : ''
                        })
                      } else {
                        setEditFormData({ ...editFormData, class: selectedClassId })
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Class</option>
                    {classList.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Section Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.section}
                    onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    placeholder="e.g., A, B, Green, Blue"
                  />
                </div>

                {/* Section Incharge */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Section Incharge
                  </label>
                  <select
                    value={editFormData.incharge}
                    onChange={(e) => {
                      setEditFormData({ ...editFormData, incharge: e.target.value })
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Teacher</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name || ''} - {staff.designation || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room Number */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 101, A-12"
                    value={editFormData.roomNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, roomNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>

                {/* Capacity */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 40"
                    value={editFormData.capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditSidebar(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Edit2 size={16} />
                  Update
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSection && (
        <ModalOverlay onClose={() => setShowDeleteModal(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full my-8" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete section <span className="font-bold text-red-600">{selectedSection.section_name}</span> from <span className="font-bold">{selectedSection.class_name || 'Unknown Class'}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
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
        </ModalOverlay>
      )}
    </div>
  )
}