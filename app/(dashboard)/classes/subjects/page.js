'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Edit2, Trash2, X, BookOpen, ChevronDown, CheckCircle } from 'lucide-react'
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

export default function SubjectsPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showEditSidebar, setShowEditSidebar] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [formData, setFormData] = useState({
    classId: '',
    subjects: [{ subjectName: '', subjectCode: '' }]
  })
  const [editFormData, setEditFormData] = useState({
    classId: '',
    subjects: []
  })
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [user, setUser] = useState(null)
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

  // Fetch user and classes data on component mount
  useEffect(() => {
    const initializeUser = () => {
      try {
        const userData = getUserFromCookie()

        if (userData) {
          console.log('User authenticated:', userData)
          setUser(userData)
        } else {
          console.error('No user found in localStorage or cookies')
          setLoadingClasses(false)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setLoadingClasses(false)
        setLoading(false)
      }
    }

    initializeUser()
  }, [])

  // Fetch classes and subjects when user is available
  useEffect(() => {
    if (user && user.school_id) {
      console.log('User loaded, fetching data for school_id:', user.school_id)
      fetchClasses()
      fetchSubjects()
    } else if (user) {
      console.error('User found but school_id is missing:', user)
      setLoadingClasses(false)
      setLoading(false)
    }
  }, [user])

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true)

      if (!user || !user.school_id) {
        console.error('Cannot fetch classes: user or school_id not available')
        setClasses([])
        return
      }

      console.log('Fetching classes for school_id:', user.school_id)

      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name, incharge, exam_marking_system, standard_fee, order_number, status')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) {
        console.error('Error fetching classes:', error)
        setClasses([])
      } else {
        console.log('Fetched classes:', data)

        if (!data || data.length === 0) {
          console.warn('No classes found in database for school_id:', user.school_id)
          setClasses([])
        } else {
          const transformedClasses = data.map(cls => ({
            id: cls.id,
            name: cls.class_name,
            incharge: cls.incharge,
            examMarkingSystem: cls.exam_marking_system,
            standardFee: cls.standard_fee,
            orderNumber: cls.order_number,
            status: cls.status
          }))
          setClasses(transformedClasses)
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      setClasses([])
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchSubjects = async () => {
    try {
      setLoading(true)

      if (!user || !user.school_id) {
        console.error('Cannot fetch subjects: user or school_id not available')
        return
      }

      console.log('Fetching subjects for school_id:', user.school_id)

      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          id,
          is_compulsory,
          classes:class_id (id, class_name),
          subjects:subject_id (id, subject_name, subject_code)
        `)
        .eq('school_id', user.school_id)
        .order('id', { ascending: true })

      if (error) {
        console.error('Error fetching subjects:', error)
        setSubjects([])
      } else {
        console.log('Fetched subjects:', data)
        const transformedData = data.map((item, index) => ({
          id: item.id,
          sr: index + 1,
          classId: item.classes?.id || '',
          className: item.classes?.class_name || '',
          subjectId: item.subjects?.id || '',
          subjectName: item.subjects?.subject_name || '',
          subjectCode: item.subjects?.subject_code || '',
          teacher: '-',
          isCompulsory: item.is_compulsory
        }))
        setSubjects(transformedData)
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.className.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = !selectedClass || subject.className === selectedClass
    return matchesSearch && matchesClass
  })

  // Group subjects by class
  const groupedSubjects = filteredSubjects.reduce((acc, subject) => {
    const classKey = `${subject.classId}_${subject.className}`
    if (!acc[classKey]) {
      acc[classKey] = {
        classId: subject.classId,
        className: subject.className,
        subjects: []
      }
    }
    acc[classKey].subjects.push({
      id: subject.id,
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode
    })
    return acc
  }, {})

  const groupedSubjectsArray = Object.values(groupedSubjects)

  // Pagination logic
  const totalPages = Math.ceil(groupedSubjectsArray.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedSubjects = groupedSubjectsArray.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedClass])

  const handleSave = async () => {
    try {
      if (!formData.classId) {
        showToast('Please select a class', 'error')
        return
      }

      const validSubjects = formData.subjects.filter(s => s.subjectName.trim())
      if (validSubjects.length === 0) {
        showToast('Please enter at least one subject name', 'error')
        return
      }

      if (!user || !user.school_id || !user.id) {
        showToast('User authentication error', 'error')
        return
      }

      const subjectsToProcess = [...validSubjects]
      const classId = formData.classId

      // Close sidebar immediately
      setShowSidebar(false)
      setFormData({ classId: '', subjects: [{ subjectName: '', subjectCode: '' }] })

      const newSubjectsData = []

      for (const subject of subjectsToProcess) {
        let subjectId = null

        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('subject_name', subject.subjectName)
          .maybeSingle()

        if (existingSubject) {
          subjectId = existingSubject.id
        } else {
          const { data: newSubject, error: subjectError } = await supabase
            .from('subjects')
            .insert({
              school_id: user.school_id,
              subject_name: subject.subjectName,
              subject_code: subject.subjectCode || null,
              created_by: user.id
            })
            .select('id')
            .single()

          if (subjectError) {
            console.error('Error creating subject:', subjectError)
            showToast(`Failed to create subject: ${subject.subjectName}`, 'error')
            continue
          }

          subjectId = newSubject.id
        }

        const { data: existingRelation } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
          .maybeSingle()

        if (!existingRelation) {
          const { data, error: classSubjectError } = await supabase
            .from('class_subjects')
            .insert({
              school_id: user.school_id,
              class_id: classId,
              subject_id: subjectId,
              is_compulsory: true,
              created_by: user.id
            })
            .select('id')

          if (classSubjectError) {
            console.error('Error creating class-subject relationship:', classSubjectError)
            showToast(`Failed to assign subject: ${subject.subjectName}`, 'error')
          } else if (data && data[0]) {
            newSubjectsData.push({
              id: data[0].id,
              classId: classId,
              className: classes.find(c => c.id === classId)?.name || '',
              subjectId: subjectId,
              subjectName: subject.subjectName,
              subjectCode: subject.subjectCode
            })
          }
        }
      }

      // Update subjects state in real-time
      if (newSubjectsData.length > 0) {
        setSubjects(prev => [...prev, ...newSubjectsData.map((item, idx) => ({
          id: item.id,
          sr: prev.length + idx + 1,
          classId: item.classId,
          className: item.className,
          subjectId: item.subjectId,
          subjectName: item.subjectName,
          subjectCode: item.subjectCode,
          teacher: '-',
          isCompulsory: true
        }))])
      }

      showToast('Subjects added successfully!', 'success')
    } catch (error) {
      console.error('Error saving subjects:', error)
      showToast('An error occurred while saving', 'error')
    }
  }

  const addSubjectField = () => {
    setFormData({
      ...formData,
      subjects: [...formData.subjects, { subjectName: '', subjectCode: '' }]
    })
  }

  const removeSubjectField = (index) => {
    if (formData.subjects.length > 1) {
      const newSubjects = formData.subjects.filter((_, i) => i !== index)
      setFormData({ ...formData, subjects: newSubjects })
    }
  }

  const updateSubjectField = (index, field, value) => {
    const newSubjects = [...formData.subjects]
    newSubjects[index][field] = value
    setFormData({ ...formData, subjects: newSubjects })
  }

  const addEditSubjectField = () => {
    setEditFormData({
      ...editFormData,
      subjects: [...editFormData.subjects, { subjectName: '', subjectCode: '' }]
    })
  }

  const removeEditSubjectField = (index) => {
    if (editFormData.subjects.length > 1) {
      const newSubjects = editFormData.subjects.filter((_, i) => i !== index)
      setEditFormData({ ...editFormData, subjects: newSubjects })
    }
  }

  const updateEditSubjectField = (index, field, value) => {
    const newSubjects = [...editFormData.subjects]
    newSubjects[index][field] = value
    setEditFormData({ ...editFormData, subjects: newSubjects })
  }

  const handleUpdate = async () => {
    try {
      if (!editFormData.classId) {
        showToast('Please select a class', 'error')
        return
      }

      const validSubjects = editFormData.subjects.filter(s => s.subjectName.trim())
      if (validSubjects.length === 0) {
        showToast('Please enter at least one subject name', 'error')
        return
      }

      if (!user || !user.school_id || !user.id) {
        showToast('User authentication error', 'error')
        return
      }

      const subjectsToDelete = selectedSubject.subjects
        .filter(s => !editFormData.subjects.find(es => es.id === s.id))
      const subjectsToProcess = [...validSubjects]
      const classId = editFormData.classId
      const className = selectedSubject.className

      // Close sidebar immediately
      setShowEditSidebar(false)
      setSelectedSubject(null)
      setEditFormData({ classId: '', subjects: [] })

      // Process deletions
      const deletedIds = []
      for (const subject of subjectsToDelete) {
        const { error } = await supabase
          .from('class_subjects')
          .delete()
          .eq('id', subject.id)

        if (!error) {
          deletedIds.push(subject.id)
        }
      }

      const newSubjectsData = []

      for (const subject of subjectsToProcess) {
        if (subject.id && subject.subjectId) {
          // Update existing subject
          await supabase
            .from('subjects')
            .update({
              subject_name: subject.subjectName,
              subject_code: subject.subjectCode || null
            })
            .eq('id', subject.subjectId)
        } else {
          // Create new subject
          let subjectId = null

          const { data: existingSubject } = await supabase
            .from('subjects')
            .select('id')
            .eq('school_id', user.school_id)
            .eq('subject_name', subject.subjectName)
            .maybeSingle()

          if (existingSubject) {
            subjectId = existingSubject.id
          } else {
            const { data: newSubject, error: subjectError } = await supabase
              .from('subjects')
              .insert({
                school_id: user.school_id,
                subject_name: subject.subjectName,
                subject_code: subject.subjectCode || null,
                created_by: user.id
              })
              .select('id')
              .single()

            if (subjectError) {
              console.error('Error creating subject:', subjectError)
              showToast(`Failed to create subject: ${subject.subjectName}`, 'error')
              continue
            }

            subjectId = newSubject.id
          }

          const { data: existingRelation } = await supabase
            .from('class_subjects')
            .select('id')
            .eq('school_id', user.school_id)
            .eq('class_id', classId)
            .eq('subject_id', subjectId)
            .maybeSingle()

          if (!existingRelation) {
            const { data, error: classSubjectError } = await supabase
              .from('class_subjects')
              .insert({
                school_id: user.school_id,
                class_id: classId,
                subject_id: subjectId,
                is_compulsory: true,
                created_by: user.id
              })
              .select('id')

            if (!classSubjectError && data && data[0]) {
              newSubjectsData.push({
                id: data[0].id,
                classId: classId,
                className: classes.find(c => c.id === classId)?.name || className,
                subjectId: subjectId,
                subjectName: subject.subjectName,
                subjectCode: subject.subjectCode
              })
            }
          }
        }
      }

      // Update subjects state in real-time
      setSubjects(prev => {
        // Remove deleted subjects
        let updated = prev.filter(s => !deletedIds.includes(s.id))

        // Update existing subjects
        updated = updated.map(s => {
          const editedSubject = validSubjects.find(es => es.id === s.id)
          if (editedSubject) {
            return {
              ...s,
              subjectName: editedSubject.subjectName,
              subjectCode: editedSubject.subjectCode
            }
          }
          return s
        })

        // Add new subjects
        if (newSubjectsData.length > 0) {
          updated = [...updated, ...newSubjectsData.map((item, idx) => ({
            id: item.id,
            sr: updated.length + idx + 1,
            classId: item.classId,
            className: item.className,
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            subjectCode: item.subjectCode,
            teacher: '-',
            isCompulsory: true
          }))]
        }

        return updated
      })

      showToast('Subjects updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating subjects:', error)
      showToast('An error occurred while updating', 'error')
    }
  }

  const confirmDelete = async () => {
    try {
      const deletedIds = []
      const deletedClassName = selectedSubject.className

      for (const subject of selectedSubject.subjects) {
        const { error } = await supabase
          .from('class_subjects')
          .delete()
          .eq('id', subject.id)

        if (error) {
          console.error('Error deleting subject:', error)
          showToast(`Failed to delete subject: ${subject.subjectName}`, 'error')
        } else {
          deletedIds.push(subject.id)
        }
      }

      setShowDeleteModal(false)
      setSelectedSubject(null)

      // Update subjects state in real-time
      setSubjects(prev => prev.filter(s => !deletedIds.includes(s.id)))

      showToast(`Subjects from "${deletedClassName}" deleted successfully!`, 'success')
    } catch (error) {
      console.error('Error deleting subjects:', error)
      showToast('An error occurred while deleting', 'error')
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
          Add Subject
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Search Subjects</h2>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Class Filter */}
          <div className="md:w-48">
            <label className="block text-gray-600 text-sm mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1">
            <label className="block text-gray-600 text-sm mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by subject name or code"
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
                <th className="px-4 py-3 text-left font-semibold border border-blue-800 w-16">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800 w-32">Class Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Subjects</th>
                <th className="px-4 py-3 text-center font-semibold border border-blue-800 w-24">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                    Loading subjects...
                  </td>
                </tr>
              ) : groupedSubjectsArray.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                    No subjects found
                  </td>
                </tr>
              ) : (
                paginatedSubjects.map((classGroup, index) => (
                  <tr
                    key={classGroup.classId}
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition`}
                  >
                    <td className="px-4 py-3 border border-gray-200 text-blue-600 align-top w-16">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 border border-gray-200 font-medium align-top w-32">{classGroup.className}</td>
                    <td className="px-4 py-3 border border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {classGroup.subjects.map((subject) => (
                          <div key={subject.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                            <BookOpen size={14} className="text-blue-600" />
                            <span className="font-medium text-sm">{subject.subjectName}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 align-top w-24">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSubject({
                              classId: classGroup.classId,
                              className: classGroup.className,
                              subjects: classGroup.subjects
                            })
                            setEditFormData({
                              classId: classGroup.classId,
                              subjects: classGroup.subjects.map(s => ({
                                id: s.id,
                                subjectId: s.subjectId,
                                subjectName: s.subjectName,
                                subjectCode: s.subjectCode
                              }))
                            })
                            setShowEditSidebar(true)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Subjects"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSubject({
                              classId: classGroup.classId,
                              className: classGroup.className,
                              subjects: classGroup.subjects
                            })
                            setShowDeleteModal(true)
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Subjects"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {groupedSubjectsArray.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, groupedSubjectsArray.length)} of {groupedSubjectsArray.length} classes
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

      {/* Add Subject Sidebar */}
      {showSidebar && (
        <ModalOverlay onClose={() => setShowSidebar(false)}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Add New Subject</h3>
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

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 appearance-none"
                      disabled={loadingClasses}
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                  {loadingClasses && (
                    <p className="text-xs text-gray-500 mt-2">Loading classes...</p>
                  )}
                  {!loadingClasses && classes.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">⚠️ No classes found! Please add classes first in Classes section.</p>
                  )}
                  {!loadingClasses && classes.length > 0 && (
                    <p className="text-xs text-green-600 mt-2">✓ {classes.length} classes loaded</p>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-gray-800 font-semibold text-sm uppercase tracking-wide">
                      Subjects <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addSubjectField}
                      className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add More
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.subjects.map((subject, index) => (
                      <div key={index} className="relative p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-gray-600">Subject {index + 1}</span>
                          {formData.subjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSubjectField(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <input
                            type="text"
                            value={subject.subjectName}
                            onChange={(e) => updateSubjectField(index, 'subjectName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                            placeholder="Subject name (e.g., Mathematics)"
                          />

                          <input
                            type="text"
                            value={subject.subjectCode}
                            onChange={(e) => updateSubjectField(index, 'subjectCode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                            placeholder="Subject code (e.g., MTH-01)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSidebar(false)}
                  className="flex-1 px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
                >
                  <Plus size={16} />
                  Save Subjects
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Edit Subject Sidebar */}
      {showEditSidebar && (
        <ModalOverlay onClose={() => setShowEditSidebar(false)}>
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Subjects</h3>
                  <p className="text-blue-200 text-sm mt-1">Update subject details</p>
                </div>
                <button
                  onClick={() => setShowEditSidebar(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={editFormData.classId}
                      onChange={(e) => setEditFormData({ ...editFormData, classId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 appearance-none"
                      disabled={loadingClasses}
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-gray-800 font-semibold text-sm uppercase tracking-wide">
                      Subjects <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addEditSubjectField}
                      className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add More
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editFormData.subjects.map((subject, index) => (
                      <div key={index} className="relative p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-gray-600">Subject {index + 1}</span>
                          {editFormData.subjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditSubjectField(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <input
                            type="text"
                            value={subject.subjectName}
                            onChange={(e) => updateEditSubjectField(index, 'subjectName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                            placeholder="Subject name (e.g., Mathematics)"
                          />

                          <input
                            type="text"
                            value={subject.subjectCode}
                            onChange={(e) => updateEditSubjectField(index, 'subjectCode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                            placeholder="Subject code (e.g., MTH-01)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditSidebar(false)}
                  className="flex-1 px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
                >
                  <Edit2 size={16} />
                  Update Subjects
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSubject && (
        <ModalOverlay onClose={() => setShowDeleteModal(false)}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete all subjects from <span className="font-bold">{selectedSubject.className}</span>?
                </p>
                <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-semibold text-red-800 mb-2">Subjects to be deleted:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {selectedSubject.subjects.map((subject) => (
                      <li key={subject.id}>• {subject.subjectName} {subject.subjectCode && `(${subject.subjectCode})`}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-3">⚠️ This action cannot be undone.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition border border-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Trash2 size={16} />
                    Delete All
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