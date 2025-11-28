'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, BookOpen, ChevronDown, MoreVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

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
    subjectName: '',
    subjectCode: ''
  })
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [user, setUser] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)

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
        .order('class_name', { ascending: true })

      if (error) {
        console.error('Error fetching classes:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        setClasses([])
      } else {
        console.log('Fetched classes:', data)
        console.log('Number of classes:', data?.length || 0)

        if (!data || data.length === 0) {
          console.warn('No classes found in database for school_id:', user.school_id)
          setClasses([])
        } else {
          // Transform data to have 'name' property for consistency
          const transformedClasses = data.map(cls => ({
            id: cls.id,
            name: cls.class_name,
            incharge: cls.incharge,
            examMarkingSystem: cls.exam_marking_system,
            standardFee: cls.standard_fee,
            orderNumber: cls.order_number,
            status: cls.status
          }))
          console.log('Transformed classes:', transformedClasses)
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

      // Fetch from class_subjects junction table with joins
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
        // Transform data to match the expected format
        const transformedData = data.map((item, index) => ({
          id: item.id,
          sr: index + 1,
          classId: item.classes?.id || '',
          className: item.classes?.class_name || '',
          subjectId: item.subjects?.id || '',
          subjectName: item.subjects?.subject_name || '',
          subjectCode: item.subjects?.subject_code || '',
          teacher: '-', // TODO: Add teacher relationship
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

  const handleSave = async () => {
    try {
      if (!formData.classId) {
        alert('Please select a class')
        return
      }

      // Validate at least one subject has a name
      const validSubjects = formData.subjects.filter(s => s.subjectName.trim())
      if (validSubjects.length === 0) {
        alert('Please enter at least one subject name')
        return
      }

      if (!user || !user.school_id || !user.id) {
        alert('User authentication error')
        return
      }

      // Process each subject
      for (const subject of validSubjects) {
        let subjectId = null

        // Check if subject already exists
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('subject_name', subject.subjectName)
          .eq('subject_code', subject.subjectCode || '')
          .single()

        if (existingSubject) {
          subjectId = existingSubject.id
        } else {
          // Create new subject
          const { data: newSubject, error: subjectError } = await supabase
            .from('subjects')
            .insert({
              school_id: user.school_id,
              subject_name: subject.subjectName,
              subject_code: subject.subjectCode || '',
              created_by: user.id
            })
            .select('id')
            .single()

          if (subjectError) {
            console.error('Error creating subject:', subjectError)
            alert(`Failed to create subject: ${subject.subjectName}`)
            continue
          }

          subjectId = newSubject.id
        }

        // Check if this class-subject relationship already exists
        const { data: existingRelation } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('class_id', formData.classId)
          .eq('subject_id', subjectId)
          .single()

        if (!existingRelation) {
          // Create class_subject relationship
          const { error: classSubjectError } = await supabase
            .from('class_subjects')
            .insert({
              school_id: user.school_id,
              class_id: formData.classId,
              subject_id: subjectId,
              is_compulsory: true,
              created_by: user.id
            })

          if (classSubjectError) {
            console.error('Error creating class-subject relationship:', classSubjectError)
            alert(`Failed to assign subject: ${subject.subjectName}`)
          }
        }
      }

      // Refresh subjects list
      await fetchSubjects()
      setShowSidebar(false)
      setFormData({ classId: '', subjects: [{ subjectName: '', subjectCode: '' }] })
    } catch (error) {
      console.error('Error saving subjects:', error)
      alert('An error occurred while saving')
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

  const handleEdit = (subject) => {
    setSelectedSubject(subject)
    setEditFormData({
      classId: subject.classId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode
    })
    setShowEditSidebar(true)
  }

  const handleUpdate = async () => {
    try {
      if (!editFormData.classId || !editFormData.subjectName) {
        alert('Please select a class and enter a subject name')
        return
      }

      // Update the subject in the subjects table
      const { error: subjectError } = await supabase
        .from('subjects')
        .update({
          subject_name: editFormData.subjectName,
          subject_code: editFormData.subjectCode
        })
        .eq('id', selectedSubject.subjectId)

      if (subjectError) {
        console.error('Error updating subject:', subjectError)
        alert('Failed to update subject')
        return
      }

      // Update class relationship if changed
      if (editFormData.classId !== selectedSubject.classId) {
        const { error: classSubjectError } = await supabase
          .from('class_subjects')
          .update({
            class_id: editFormData.classId
          })
          .eq('id', selectedSubject.id)

        if (classSubjectError) {
          console.error('Error updating class relationship:', classSubjectError)
          alert('Failed to update class relationship')
          return
        }
      }

      // Refresh subjects list
      await fetchSubjects()
      setShowEditSidebar(false)
      setSelectedSubject(null)
      setEditFormData({ classId: '', subjectName: '', subjectCode: '' })
    } catch (error) {
      console.error('Error updating subject:', error)
      alert('An error occurred while updating')
    }
  }

  const handleDelete = (subject) => {
    setSelectedSubject(subject)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      // Delete from class_subjects table
      const { error } = await supabase
        .from('class_subjects')
        .delete()
        .eq('id', selectedSubject.id)

      if (error) {
        console.error('Error deleting subject:', error)
        alert('Failed to delete subject')
        return
      }

      // Refresh subjects list
      await fetchSubjects()
      setShowDeleteModal(false)
      setSelectedSubject(null)
    } catch (error) {
      console.error('Error deleting subject:', error)
      alert('An error occurred while deleting')
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
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
            <label className="block text-gray-600 text-sm mb-2 invisible">Search</label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by subject name or code"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button className="bg-[#DC2626] text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2">
                <Search size={20} />
                Search
              </button>
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
                groupedSubjectsArray.map((classGroup, index) => (
                  <tr
                    key={classGroup.classId}
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition`}
                  >
                    <td className="px-4 py-3 border border-gray-200 text-blue-600 align-top w-16">{index + 1}</td>
                    <td className="px-4 py-3 border border-gray-200 font-medium align-top w-32">{classGroup.className}</td>
                    <td className="px-4 py-3 border border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {classGroup.subjects.map((subject, idx) => (
                          <div key={subject.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                            <BookOpen size={14} className="text-blue-600" />
                            <span className="font-medium text-sm">{subject.subjectName}</span>
                            {subject.subjectCode && (
                              <span className="text-gray-500 text-xs">({subject.subjectCode})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 align-top w-24">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === classGroup.classId ? null : classGroup.classId)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition mx-auto block"
                        >
                          <MoreVertical size={20} />
                        </button>

                        {openMenuId === classGroup.classId && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                              {classGroup.subjects.map((subject, idx) => (
                                <div key={subject.id} className={`${idx !== 0 ? 'border-t border-gray-100' : ''}`}>
                                  <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600">
                                    {subject.subjectName}
                                  </div>
                                  <button
                                    onClick={() => {
                                      handleEdit({
                                        id: subject.id,
                                        classId: classGroup.classId,
                                        className: classGroup.className,
                                        subjectId: subject.subjectId,
                                        subjectName: subject.subjectName,
                                        subjectCode: subject.subjectCode
                                      })
                                      setOpenMenuId(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                  >
                                    <Edit2 size={14} className="text-blue-600" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDelete({
                                        id: subject.id,
                                        classId: classGroup.classId,
                                        className: classGroup.className,
                                        subjectId: subject.subjectId,
                                        subjectName: subject.subjectName,
                                        subjectCode: subject.subjectCode
                                      })
                                      setOpenMenuId(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 size={14} className="text-red-600" />
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subject Sidebar */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
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
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Plus size={18} />
                  Save Subjects
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Subject Sidebar */}
      {showEditSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowEditSidebar(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Subject</h3>
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
                  {loadingClasses && (
                    <p className="text-xs text-gray-500 mt-2">Loading classes...</p>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.subjectName}
                    onChange={(e) => setEditFormData({ ...editFormData, subjectName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    placeholder="e.g., Mathematics, English"
                  />
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={editFormData.subjectCode}
                    onChange={(e) => setEditFormData({ ...editFormData, subjectCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    placeholder="e.g., MTH-01, ENG-01"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditSidebar(false)}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Edit2 size={18} />
                  Update Subject
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSubject && (
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
                  Are you sure you want to delete subject <span className="font-bold text-red-600">{selectedSubject.subjectName}</span> from <span className="font-bold">{selectedSubject.className}</span>? This action cannot be undone.
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
        </>
      )}
    </div>
  )
}
