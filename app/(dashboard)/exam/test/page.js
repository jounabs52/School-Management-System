'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Plus, Edit, Trash2, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react'

export default function TestsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [tests, setTests] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const [activeTab, setActiveTab] = useState('list')

  // Form States
  const [testName, setTestName] = useState('')
  const [testDate, setTestDate] = useState('')
  const [resultDate, setResultDate] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [totalMarks, setTotalMarks] = useState('')
  const [details, setDetails] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [editingTest, setEditingTest] = useState(null)

  // Filter States
  const [filterClass, setFilterClass] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [testToDelete, setTestToDelete] = useState(null)

  const showToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
    }

    const userData = getCookie('user-data')
    if (userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData))
        setCurrentUser(user)
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchTests()
      fetchClasses()
      fetchAllSubjects()
    }
  }, [currentUser])

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          classes (class_name),
          sections (section_name),
          test_subjects (
            subjects (
              id,
              subject_name,
              subject_code
            )
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('test_date', { ascending: false })

      if (error) throw error
      setTests(data || [])
    } catch (error) {
      console.error('Error fetching tests:', error)
      showToast('Failed to fetch tests', 'error')
    }
  }

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('class_name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchAllSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('subject_name')

      if (error) throw error
      setAllSubjects(data || [])
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  useEffect(() => {
    if (selectedClass && currentUser?.school_id) {
      fetchSections()
      fetchSubjectsForClass()
    } else {
      setSections([])
      setSubjects([])
      setSelectedSection('')
      setSelectedSubjects([])
    }
  }, [selectedClass])

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('section_name')

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Error fetching sections:', error)
    }
  }

  const fetchSubjectsForClass = async () => {
    try {
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          subject_id,
          subjects (
            id,
            subject_name,
            subject_code
          )
        `)
        .eq('school_id', currentUser.school_id)
        .eq('class_id', selectedClass)

      if (error) throw error
      setSubjects(data?.map(cs => cs.subjects) || [])
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const toggleSubjectSelection = (subjectId) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId)
      } else {
        return [...prev, subjectId]
      }
    })
  }

  const handleSaveTest = async () => {
    if (!testName || !testDate || !selectedClass || !totalMarks || selectedSubjects.length === 0) {
      showToast('Please fill all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      if (editingTest) {
        const { error: testError } = await supabase
          .from('tests')
          .update({
            test_name: testName,
            test_date: testDate,
            result_date: resultDate || null,
            class_id: selectedClass,
            section_id: selectedSection || null,
            total_marks: parseFloat(totalMarks),
            details: details || null
          })
          .eq('id', editingTest.id)

        if (testError) throw testError

        await supabase.from('test_subjects').delete().eq('test_id', editingTest.id)

        const testSubjects = selectedSubjects.map(subjectId => ({
          test_id: editingTest.id,
          subject_id: subjectId,
          school_id: currentUser.school_id
        }))

        const { error: subjectsError } = await supabase
          .from('test_subjects')
          .insert(testSubjects)

        if (subjectsError) throw subjectsError

        showToast('Test updated successfully', 'success')
      } else {
        const { data: newTest, error: testError } = await supabase
          .from('tests')
          .insert({
            school_id: currentUser.school_id,
            created_by: currentUser.id,
            test_name: testName,
            test_date: testDate,
            result_date: resultDate || null,
            class_id: selectedClass,
            section_id: selectedSection || null,
            total_marks: parseFloat(totalMarks),
            details: details || null,
            status: 'opened'
          })
          .select()
          .single()

        if (testError) throw testError

        const testSubjects = selectedSubjects.map(subjectId => ({
          test_id: newTest.id,
          subject_id: subjectId,
          school_id: currentUser.school_id
        }))

        const { error: subjectsError } = await supabase
          .from('test_subjects')
          .insert(testSubjects)

        if (subjectsError) throw subjectsError

        showToast('Test created successfully', 'success')
      }

      resetForm()
      fetchTests()
      setActiveTab('list')
    } catch (error) {
      console.error('Error saving test:', error)
      showToast('Failed to save test', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEditTest = async (test) => {
    setEditingTest(test)
    setTestName(test.test_name)
    setTestDate(test.test_date)
    setResultDate(test.result_date || '')
    setSelectedClass(test.class_id)
    setTotalMarks(test.total_marks.toString())
    setDetails(test.details || '')
    setSelectedSection(test.section_id || '')

    const { data: testSubjects } = await supabase
      .from('test_subjects')
      .select('subject_id')
      .eq('test_id', test.id)

    setSelectedSubjects(testSubjects?.map(ts => ts.subject_id) || [])
    setActiveTab('add')
  }

  const handleDeleteTest = async () => {
    if (!testToDelete) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testToDelete.id)

      if (error) throw error

      showToast('Test deleted successfully', 'success')
      fetchTests()
      setShowDeleteModal(false)
      setTestToDelete(null)
    } catch (error) {
      console.error('Error deleting test:', error)
      showToast('Failed to delete test', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (testId, newStatus) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('tests')
        .update({ status: newStatus })
        .eq('id', testId)

      if (error) throw error

      showToast(`Test status changed to ${newStatus}`, 'success')
      fetchTests()
    } catch (error) {
      console.error('Error updating test status:', error)
      showToast('Failed to update test status', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTestName('')
    setTestDate('')
    setResultDate('')
    setSelectedClass('')
    setSelectedSection('')
    setTotalMarks('')
    setDetails('')
    setSelectedSubjects([])
    setEditingTest(null)
  }

  const filteredTests = tests.filter(test => {
    if (filterClass && test.class_id !== filterClass) return false
    if (filterSection && test.section_id !== filterSection) return false
    if (filterSubject) {
      const hasSubject = test.test_subjects?.some(ts => ts.subjects?.id === filterSubject)
      if (!hasSubject) return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return test.test_name.toLowerCase().includes(query)
    }
    return true
  })

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            } text-white min-w-[300px]`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="hover:bg-white/20 p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Exam Tests</h1>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setActiveTab('list')
                resetForm()
              }}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FileText className="w-5 h-5" />
              Tests List
            </button>
            <button
              onClick={() => {
                setActiveTab('add')
                resetForm()
              }}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                activeTab === 'add'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Plus className="w-5 h-5" />
              Add New Test
            </button>
          </div>
        </div>

        {activeTab === 'list' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                ))}
              </select>

              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Sections</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>{section.section_name}</option>
                ))}
              </select>

              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Subjects</option>
                {allSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                ))}
              </select>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 w-full"
                />
                <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg whitespace-nowrap">
                  Search
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Sr.</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Class</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Subject</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Test Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total Marks</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Students</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Result Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((test, index) => (
                      <tr key={test.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm">{test.classes?.class_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          {test.test_subjects?.map(ts => ts.subjects?.subject_name).join(', ') || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{test.test_name}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(test.test_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm">{test.total_marks}</td>
                        <td className="px-4 py-3 text-sm">0</td>
                        <td className="px-4 py-3 text-sm">
                          {test.result_date
                            ? new Date(test.result_date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'N/A'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <select
                            value={test.status}
                            onChange={(e) => handleStatusChange(test.id, e.target.value)}
                            disabled={loading}
                            className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${
                              test.status === 'opened' ? 'bg-green-100 text-green-800' :
                              test.status === 'closed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <option value="opened">opened</option>
                            <option value="closed">closed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditTest(test)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setTestToDelete(test)
                                setShowDeleteModal(true)
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredTests.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No tests found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Result Date</label>
                <input
                  type="date"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={!selectedClass}
                >
                  <option value="">All Section</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.section_name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Test Name"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder="Enter Total Marks"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subjects / Courses <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded p-4 max-h-60 overflow-y-auto">
                {subjects.length === 0 ? (
                  <p className="text-gray-500 text-sm">Please select a class first</p>
                ) : (
                  <div className="space-y-2">
                    {subjects.map(subject => (
                      <label key={subject.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={() => toggleSubjectSelection(subject.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">{subject.subject_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="About test..."
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveTest}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Delete Test</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the test "{testToDelete?.test_name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setTestToDelete(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTest}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
