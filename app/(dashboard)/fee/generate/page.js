'use client'

import { useState, useEffect } from 'react'
import {
  Calendar, Users, DollarSign, Plus, FileText, Loader2,
  Check, X, AlertCircle, ChevronDown, Download, CheckCircle
} from 'lucide-react'
import { getUserFromCookie } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'
import PermissionGuard from '@/components/PermissionGuard'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-5 py-3 rounded-full shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}>
      {type === 'success' && <Check size={20} />}
      {type === 'error' && <X size={20} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  )
}

// Main Content Component
function FeeGenerateContent() {
  const [activeTab, setActiveTab] = useState('periods')
  const [sessions, setSessions] = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [feePeriods, setFeePeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  // Period Generation Form
  const [periodForm, setPeriodForm] = useState({
    session_id: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0]
  })
  const [generatingPeriods, setGeneratingPeriods] = useState(false)

  // Challan Generation Form
  const [challanForm, setChallanForm] = useState({
    session_id: '',
    class_id: '',
    fee_period_id: '',
    generate_for: 'all' // 'all' or 'selected'
  })
  const [selectedStudents, setSelectedStudents] = useState([])
  const [generatingChallans, setGeneratingChallans] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (challanForm.session_id && challanForm.class_id) {
      loadStudents()
    }
  }, [challanForm.session_id, challanForm.class_id])

  useEffect(() => {
    if (periodForm.session_id) {
      loadFeePeriods(periodForm.session_id)
    }
  }, [periodForm.session_id])

  useEffect(() => {
    if (challanForm.session_id) {
      loadFeePeriods(challanForm.session_id)
    }
  }, [challanForm.session_id])

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

      // Set active session as default
      const activeSession = sessionsData?.find(s => s.status === 'active') || sessionsData?.[0]
      if (activeSession) {
        setPeriodForm(prev => ({ ...prev, session_id: activeSession.id }))
        setChallanForm(prev => ({ ...prev, session_id: activeSession.id }))
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
      showToast('Error loading data: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadFeePeriods = async (sessionId) => {
    try {
      const user = getUserFromCookie()
      const { data, error } = await supabase
        .from('fee_periods')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionId)
        .order('period_number')

      if (error) throw error
      setFeePeriods(data || [])
    } catch (error) {
      console.error('Error loading fee periods:', error)
    }
  }

  const loadStudents = async () => {
    try {
      const user = getUserFromCookie()
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('current_class_id', challanForm.class_id)
        .eq('status', 'active')
        .order('first_name')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const handleGeneratePeriods = async () => {
    if (!periodForm.session_id || !periodForm.frequency || !periodForm.start_date) {
      showToast('Please fill all required fields', 'error')
      return
    }

    setGeneratingPeriods(true)
    try {
      const user = getUserFromCookie()

      // Call the generate_fee_periods function
      const { data, error } = await supabase.rpc('generate_fee_periods', {
        p_school_id: user.school_id,
        p_session_id: periodForm.session_id,
        p_frequency: periodForm.frequency,
        p_start_date: periodForm.start_date,
        p_created_by: user.id
      })

      if (error) throw error

      showToast(`Successfully generated ${data?.length || 0} fee periods!`, 'success')
      await loadFeePeriods(periodForm.session_id)
    } catch (error) {
      console.error('Error generating periods:', error)
      showToast('Error generating periods: ' + error.message, 'error')
    } finally {
      setGeneratingPeriods(false)
    }
  }

  const handleGenerateChallans = async () => {
    if (!challanForm.session_id || !challanForm.fee_period_id) {
      showToast('Please select session and fee period', 'error')
      return
    }

    const studentsToProcess = challanForm.generate_for === 'all'
      ? students
      : students.filter(s => selectedStudents.includes(s.id))

    if (studentsToProcess.length === 0) {
      showToast('No students selected', 'error')
      return
    }

    if (!confirm(`Generate challans for ${studentsToProcess.length} student(s)?`)) {
      return
    }

    setGeneratingChallans(true)
    setGenerationProgress({ current: 0, total: studentsToProcess.length })

    let successCount = 0
    let errorCount = 0
    const errors = []

    for (let i = 0; i < studentsToProcess.length; i++) {
      const student = studentsToProcess[i]
      setGenerationProgress({ current: i + 1, total: studentsToProcess.length })

      try {
        const user = getUserFromCookie()

        // Call generate_student_challan function
        const { data, error } = await supabase.rpc('generate_student_challan', {
          p_school_id: user.school_id,
          p_student_id: student.id,
          p_session_id: challanForm.session_id,
          p_fee_period_id: challanForm.fee_period_id,
          p_created_by: user.id
        })

        if (error) throw error
        successCount++
      } catch (error) {
        console.error(`Error generating challan for ${student.first_name}:`, error)
        errorCount++
        errors.push(`${student.first_name}: ${error.message}`)
      }
    }

    setGeneratingChallans(false)
    setGenerationProgress({ current: 0, total: 0 })

    if (successCount > 0) {
      showToast(`Successfully generated ${successCount} challan(s)! ${errorCount > 0 ? `(${errorCount} failed)` : ''}`, 'success')
    } else {
      showToast('Failed to generate any challans', 'error')
    }

    if (errors.length > 0 && errors.length <= 5) {
      console.log('Errors:', errors)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fee Generation</h1>
        <p className="text-gray-600">Generate fee periods and student challans</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('periods')}
            className={`flex-1 px-6 py-4 font-medium transition ${
              activeTab === 'periods'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar size={20} />
              Generate Fee Periods
            </div>
          </button>
          <button
            onClick={() => setActiveTab('challans')}
            className={`flex-1 px-6 py-4 font-medium transition ${
              activeTab === 'challans'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText size={20} />
              Generate Student Challans
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'periods' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Fee Periods</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Session */}
                  <div>
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Session <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={periodForm.session_id}
                      onChange={(e) => setPeriodForm({...periodForm, session_id: e.target.value})}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Session</option>
                      {sessions.map(session => (
                        <option key={session.id} value={session.id}>
                          {session.session_name} {session.status === 'active' ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Frequency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={periodForm.frequency}
                      onChange={(e) => setPeriodForm({...periodForm, frequency: e.target.value})}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monthly">Monthly (12 periods)</option>
                      <option value="quarterly">Quarterly (4 periods)</option>
                      <option value="quadrimester">Quadrimester (3 periods)</option>
                      <option value="semi-annual">Semi-Annual (2 periods)</option>
                      <option value="annual">Annual (1 period)</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={periodForm.start_date}
                      onChange={(e) => setPeriodForm({...periodForm, start_date: e.target.value})}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGeneratePeriods}
                  disabled={generatingPeriods}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generatingPeriods ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Generating Periods...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Generate Fee Periods
                    </>
                  )}
                </button>
              </div>

              {/* Show Existing Periods */}
              {feePeriods.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Existing Fee Periods</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {feePeriods.map(period => (
                      <div key={period.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-800 text-sm">{period.period_name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            period.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {period.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Due: {new Date(period.due_date).toLocaleDateString()}</div>
                          <div className="capitalize">Frequency: {period.frequency}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'challans' && (
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Generation Form */}
                <div className="lg:col-span-1">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Challans</h2>

                    <div className="space-y-4">
                      {/* Session */}
                      <div>
                        <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                          Session <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={challanForm.session_id}
                          onChange={(e) => setChallanForm({...challanForm, session_id: e.target.value})}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Session</option>
                          {sessions.map(session => (
                            <option key={session.id} value={session.id}>
                              {session.session_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Class */}
                      <div>
                        <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                          Class <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={challanForm.class_id}
                          onChange={(e) => setChallanForm({...challanForm, class_id: e.target.value})}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Class</option>
                          {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                              {cls.class_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Fee Period */}
                      <div>
                        <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                          Fee Period <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={challanForm.fee_period_id}
                          onChange={(e) => setChallanForm({...challanForm, fee_period_id: e.target.value})}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Period</option>
                          {feePeriods.map(period => (
                            <option key={period.id} value={period.id}>
                              {period.period_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Generate For */}
                      <div>
                        <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                          Generate For
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="all"
                              checked={challanForm.generate_for === 'all'}
                              onChange={(e) => setChallanForm({...challanForm, generate_for: e.target.value})}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">All Students ({students.length})</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="selected"
                              checked={challanForm.generate_for === 'selected'}
                              onChange={(e) => setChallanForm({...challanForm, generate_for: e.target.value})}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">Selected Only ({selectedStudents.length})</span>
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateChallans}
                        disabled={generatingChallans}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {generatingChallans ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            Generating... ({generationProgress.current}/{generationProgress.total})
                          </>
                        ) : (
                          <>
                            <FileText size={20} />
                            Generate Challans
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Student List */}
                <div className="lg:col-span-2">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        Students ({students.length})
                      </h3>
                      {challanForm.generate_for === 'selected' && students.length > 0 && (
                        <button
                          onClick={() => {
                            if (selectedStudents.length === students.length) {
                              setSelectedStudents([])
                            } else {
                              setSelectedStudents(students.map(s => s.id))
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    {students.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Users size={48} className="mx-auto mb-3 opacity-30" />
                        <p>No students found</p>
                        <p className="text-sm">Please select a class</p>
                      </div>
                    ) : (
                      <div className="max-h-[600px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-blue-900 text-white sticky top-0">
                            <tr>
                              {challanForm.generate_for === 'selected' && (
                                <th className="px-4 py-3 text-left font-semibold border border-blue-800 w-12">
                                  <input
                                    type="checkbox"
                                    checked={selectedStudents.length === students.length}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStudents(students.map(s => s.id))
                                      } else {
                                        setSelectedStudents([])
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                </th>
                              )}
                              <th className="px-4 py-3 text-left font-semibold border border-blue-800">Adm. No</th>
                              <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                              <th className="px-4 py-3 text-left font-semibold border border-blue-800">Father Name</th>
                              <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fee Plan</th>
                              <th className="px-4 py-3 text-left font-semibold border border-blue-800">Discount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((student, index) => (
                              <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {challanForm.generate_for === 'selected' && (
                                  <td className="px-4 py-3 border border-gray-200">
                                    <input
                                      type="checkbox"
                                      checked={selectedStudents.includes(student.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedStudents([...selectedStudents, student.id])
                                        } else {
                                          setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                                        }
                                      }}
                                      className="w-4 h-4"
                                    />
                                  </td>
                                )}
                                <td className="px-4 py-3 border border-gray-200">{student.admission_number}</td>
                                <td className="px-4 py-3 border border-gray-200 font-medium">
                                  {student.first_name} {student.last_name}
                                </td>
                                <td className="px-4 py-3 border border-gray-200">{student.father_name}</td>
                                <td className="px-4 py-3 border border-gray-200 capitalize">
                                  {student.fee_plan || 'monthly'}
                                </td>
                                <td className="px-4 py-3 border border-gray-200">
                                  {student.discount_value > 0 ? (
                                    <span className="text-green-600 font-medium">
                                      {student.discount_type === 'percentage' ? `${student.discount_value}%` : `Rs. ${student.discount_value}`}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">None</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: '' })}
        />
      )}
    </div>
  )
}

// Main Page Component with Permission Guard
export default function FeeGeneratePage() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const user = getUserFromCookie()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="fee_generate_view"
      pageName="Generate Fee"
    >
      <FeeGenerateContent />
    </PermissionGuard>
  )
}
