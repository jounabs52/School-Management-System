'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, X, Eye, Trash2, Users, FileText, TrendingUp, RefreshCw, ArrowLeft, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

export default function ClassListPage() {
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFeeIncrementModal, setShowFeeIncrementModal] = useState(false)
  const [showStudentEditModal, setShowStudentEditModal] = useState(false)
  const [showStudentDeleteModal, setShowStudentDeleteModal] = useState(false)

  // Lock/unlock body scroll when modals open/close
  useEffect(() => {
    const isAnyModalOpen = showModal || showEditModal || showDeleteModal ||
                          showFeeIncrementModal || showStudentEditModal || showStudentDeleteModal

    if (isAnyModalOpen) {
      // Get current scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

      // Prevent body scroll and add padding to prevent layout shift
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      // Restore body scroll and remove padding
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showModal, showEditModal, showDeleteModal, showFeeIncrementModal, showStudentEditModal, showStudentDeleteModal])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [viewMode, setViewMode] = useState(false)
  const [activeTab, setActiveTab] = useState('students')
  const [selectedClass, setSelectedClass] = useState(null)
  const [classToDelete, setClassToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState([])
  const [classes, setClasses] = useState([])
  const [studentFormData, setStudentFormData] = useState({
    name: '',
    father: '',
    section: '',
    rollNo: '',
    fee: '',
    discount: ''
  })
  const [feeIncrementData, setFeeIncrementData] = useState({
    mode: '',
    type: '',
    amount: ''
  })
  const [formData, setFormData] = useState({
    incharge: '',
    className: '',
    classFee: '',
    markingSystem: ''
  })

  // Sample students data - will be replaced with real data later
  const studentsData = [
    { id: 1, name: 'ejaz', father: 'Nauman', section: 'A', rollNo: 1, fee: 'Free', discount: '6,000', avatar: '👦' },
    { id: 2, name: 'Zainab', father: 'Tariq', section: 'A', rollNo: 2, fee: '5,000', discount: '1,000', avatar: '👧', badge: 'Active student' },
    { id: 3, name: 'Salman Hassan', father: 'Ali Hassan', section: 'A', rollNo: 3, fee: '2,000', discount: '4,000', avatar: '👦' },
    { id: 4, name: 'saima', father: 'iqbal', section: 'A', rollNo: 4, fee: '2,500', discount: '3,500', avatar: '👧' },
    { id: 5, name: 'wali', father: 'wasi', section: 'A', rollNo: 5, fee: '3,000', discount: '3,000', avatar: '👦' },
    { id: 6, name: 'asdf', father: 'dfdf', section: 'A', rollNo: 6, fee: '5,000', discount: '1,000', avatar: '👦' },
    { id: 7, name: 'Zafar', father: 'Shaheer', section: 'A', rollNo: 7, fee: '5,050', discount: '950', avatar: '👦', badge: 'ASAD SPONSER' },
  ]

  // Sample fee policy data
  const feePolicyData = [
    { id: 1, feeHead: 'Security Fee', title: 'Sec fee', amount: '1,000' },
    { id: 2, feeHead: 'Arrears', title: 'arrears', amount: '4,800' },
    { id: 3, feeHead: 'Admission Fee', title: 'Admission fee', amount: '15,000' },
  ]

  // Fetch staff and classes data
  useEffect(() => {
    fetchStaff()
    fetchClasses()
  }, [])

  const fetchStaff = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        return
      }

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', user.school_id)
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

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      // Get classes with student count and total discount
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, class_name, standard_fee, incharge, exam_marking_system')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('class_name', { ascending: true })

      if (error) {
        console.error('Error fetching classes:', error)
        setClasses([])
      } else {
        // For each class, get student count and total discount
        const classesWithStats = await Promise.all(
          (classes || []).map(async (cls) => {
            // Get total students
            const { count: totalStudents } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', user.school_id)
              .eq('current_class_id', cls.id)
              .eq('status', 'active')

            // Get total discount
            const { data: discountData } = await supabase
              .from('students')
              .select('discount_amount')
              .eq('school_id', user.school_id)
              .eq('current_class_id', cls.id)
              .eq('status', 'active')

            const totalDiscount = (discountData || []).reduce(
              (sum, student) => sum + (parseFloat(student.discount_amount) || 0),
              0
            )

            return {
              ...cls,
              total_students: totalStudents || 0,
              total_discount: totalDiscount
            }
          })
        )

        setClasses(classesWithStats)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = classes.filter(cls =>
    cls.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSave = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .insert([{
          school_id: user.school_id,
          created_by: user.id,
          class_name: formData.className,
          standard_fee: parseFloat(formData.classFee) || 0,
          incharge: formData.incharge,
          exam_marking_system: formData.markingSystem,
          status: 'active'
        }])
        .select()

      if (error) {
        console.error('Error creating class:', error)
        alert('Failed to create class: ' + error.message)
      } else {
        setShowModal(false)
        setFormData({ incharge: '', className: '', classFee: '', markingSystem: '' })
        fetchClasses() // Refresh the list
      }
    } catch (error) {
      console.error('Error saving class:', error)
      alert('Error saving class')
    }
  }

  const handleEdit = (cls) => {
    setSelectedClass(cls)
    setFormData({
      incharge: cls.incharge || '',
      className: cls.class_name,
      classFee: cls.standard_fee || '',
      markingSystem: cls.exam_marking_system || ''
    })
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .update({
          class_name: formData.className,
          standard_fee: parseFloat(formData.classFee) || 0,
          incharge: formData.incharge,
          exam_marking_system: formData.markingSystem,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedClass.id)
        .eq('school_id', user.school_id)
        .select()

      if (error) {
        console.error('Error updating class:', error)
        alert('Failed to update class: ' + error.message)
      } else {
        setShowEditModal(false)
        setFormData({ incharge: '', className: '', classFee: '', markingSystem: '' })
        setSelectedClass(null)
        fetchClasses() // Refresh the list
      }
    } catch (error) {
      console.error('Error updating class:', error)
      alert('Error updating class')
    }
  }

  const handleView = (cls) => {
    setSelectedClass(cls)
    setActiveTab('students')
    setViewMode(true)
  }

  const handleDelete = (cls) => {
    setClassToDelete(cls)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      const { error } = await supabase
        .from('classes')
        .update({ status: 'inactive' })
        .eq('id', classToDelete.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting class:', error)
        alert('Failed to delete class: ' + error.message)
      } else {
        setShowDeleteModal(false)
        setClassToDelete(null)
        fetchClasses() // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Error deleting class')
    }
  }

  const handleFeeIncrement = () => {
    setShowFeeIncrementModal(true)
  }

  const applyFeeIncrement = () => {
    console.log('Fee Increment Data:', feeIncrementData)
    setShowFeeIncrementModal(false)
    setFeeIncrementData({ mode: '', type: '', amount: '' })
  }

  const handleGoBack = () => {
    setViewMode(false)
    setSelectedClass(null)
  }

  const handleStudentEdit = (student) => {
    setSelectedStudent(student)
    setStudentFormData({
      name: student.name,
      father: student.father,
      section: student.section,
      rollNo: student.rollNo,
      fee: student.fee,
      discount: student.discount
    })
    setShowStudentEditModal(true)
  }

  const handleStudentUpdate = () => {
    console.log('Updated Student Data:', studentFormData)
    setShowStudentEditModal(false)
    setSelectedStudent(null)
    setStudentFormData({ name: '', father: '', section: '', rollNo: '', fee: '', discount: '' })
  }

  const handleStudentDelete = (student) => {
    setSelectedStudent(student)
    setShowStudentDeleteModal(true)
  }

  const confirmStudentDelete = () => {
    console.log('Delete Student:', selectedStudent)
    setShowStudentDeleteModal(false)
    setSelectedStudent(null)
  }

  // If in view mode, show the class details page
  if (viewMode && selectedClass) {
    return (
      <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
              activeTab === 'students'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Users size={16} />
            Class Students
          </button>
          <button
            onClick={() => setActiveTab('feePolicy')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
              activeTab === 'feePolicy'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FileText size={16} />
            Admission Fee Policy
          </button>
          <button
            onClick={() => setActiveTab('feeIncrement')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
              activeTab === 'feeIncrement'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <TrendingUp size={16} />
            Fee Increment
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition ${
              activeTab === 'recurring'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <RefreshCw size={16} />
            Recurring Charges
          </button>
          <button
            onClick={handleGoBack}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>

        {/* Tab Content */}
        {/* Class Students Tab */}
        {activeTab === 'students' && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Students enrolled in the <span className="text-blue-600">{selectedClass.class_name}</span> session <span className="font-bold">2024-2025</span>
              </h2>

              <div className="flex flex-col md:flex-row gap-4">
                <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white md:w-48">
                  <option>Select Section</option>
                  <option>A</option>
                  <option>B</option>
                </select>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2">
                  <Search size={18} />
                  Search
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">
                        <input type="checkbox" className="rounded mr-2" />
                        Sr.
                      </th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Father Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Section</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Roll No</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fee</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Discount</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsData.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 border border-gray-200">
                          <input type="checkbox" className="rounded mr-2" />
                          {student.id}
                        </td>
                        <td className="px-4 py-3 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{student.avatar}</span>
                            <span className="text-blue-600 font-medium">{student.name}</span>
                            {student.badge && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                student.badge === 'Active student'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-orange-500 text-white'
                              }`}>
                                {student.badge}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border border-gray-200">{student.father}</td>
                        <td className="px-4 py-3 border border-gray-200">{student.section}</td>
                        <td className="px-4 py-3 border border-gray-200 text-blue-600">{student.rollNo}</td>
                        <td className="px-4 py-3 border border-gray-200 text-blue-600">{student.fee}</td>
                        <td className="px-4 py-3 border border-gray-200">{student.discount}</td>
                        <td className="px-4 py-3 border border-gray-200">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStudentEdit(student)}
                              className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleStudentDelete(student)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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
            </div>
          </div>
        )}

        {/* Admission Fee Policy Tab */}
        {activeTab === 'feePolicy' && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Admission fee policy for the class <span className="text-blue-600">{selectedClass.class_name}</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Fee Head</label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-red-500">
                    <option>Select Fee Head</option>
                    <option>Security Fee</option>
                    <option>Admission Fee</option>
                    <option>Arrears</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="Fee Title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Enter Amount</label>
                  <input
                    type="text"
                    placeholder="Enter here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                  />
                </div>
                <div className="flex items-end">
                  <button className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2">
                    Save
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fee Head</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Title</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feePolicyData.map((fee, index) => (
                      <tr key={fee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 border border-gray-200">{fee.id}</td>
                        <td className="px-4 py-3 border border-gray-200">{fee.feeHead}</td>
                        <td className="px-4 py-3 border border-gray-200">{fee.title}</td>
                        <td className="px-4 py-3 border border-gray-200">{fee.amount}</td>
                        <td className="px-4 py-3 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition">
                              <Edit2 size={18} />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Fee Increment Tab */}
        {activeTab === 'feeIncrement' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Fee Increment for <span className="text-blue-600">{selectedClass.class_name}</span>
            </h2>
            <p className="text-gray-600 mb-6">Click the button below to apply fee increment to all students in this class.</p>
            <button
              onClick={handleFeeIncrement}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2"
            >
              <TrendingUp size={18} />
              Apply Fee Increment
            </button>
          </div>
        )}

        {/* Recurring Charges Tab */}
        {activeTab === 'recurring' && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Recurring charges for the class <span className="text-blue-600">{selectedClass.class_name}</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Fee Head</label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-red-500">
                    <option>Select Fee Head</option>
                    <option>Monthly Fee</option>
                    <option>Transport Fee</option>
                    <option>Lab Fee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="Fee Title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Enter Amount</label>
                  <input
                    type="text"
                    placeholder="Enter here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                  />
                </div>
                <div className="flex items-end">
                  <button className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2">
                    Save
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fee Head</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Title</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-4 py-3 border border-gray-200">1</td>
                      <td className="px-4 py-3 border border-gray-200">Monthly Fee</td>
                      <td className="px-4 py-3 border border-gray-200">Monthly Tuition</td>
                      <td className="px-4 py-3 border border-gray-200">{selectedClass.standard_fee?.toLocaleString()}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition">
                            <Edit2 size={18} />
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Fee Increment Modal - in view mode */}
        {showFeeIncrementModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowFeeIncrementModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Fee Increment</h3>
                    <button
                      onClick={() => setShowFeeIncrementModal(false)}
                      className="text-white hover:bg-white/10 p-1 rounded-full transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Mode</label>
                    <select
                      value={feeIncrementData.mode}
                      onChange={(e) => setFeeIncrementData({ ...feeIncrementData, mode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Mode</option>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Type</label>
                    <select
                      value={feeIncrementData.type}
                      onChange={(e) => setFeeIncrementData({ ...feeIncrementData, type: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Type</option>
                      <option value="increase">Increase</option>
                      <option value="decrease">Decrease</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Enter Increment Amount</label>
                    <input
                      type="text"
                      placeholder="Enter amount..."
                      value={feeIncrementData.amount}
                      onChange={(e) => setFeeIncrementData({ ...feeIncrementData, amount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowFeeIncrementModal(false)}
                      className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                    >
                      Close
                    </button>
                    <button
                      onClick={applyFeeIncrement}
                      className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Student Edit Sidebar */}
        {showStudentEditModal && selectedStudent && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowStudentEditModal(false)}
            />
            <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">Edit Student</h3>
                    <p className="text-blue-200 text-sm mt-1">Update student details</p>
                  </div>
                  <button
                    onClick={() => setShowStudentEditModal(false)}
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
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentFormData.name}
                      onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Father Name
                    </label>
                    <input
                      type="text"
                      value={studentFormData.father}
                      onChange={(e) => setStudentFormData({ ...studentFormData, father: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Section
                    </label>
                    <select
                      value={studentFormData.section}
                      onChange={(e) => setStudentFormData({ ...studentFormData, section: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    >
                      <option value="">Select Section</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Roll No
                    </label>
                    <input
                      type="text"
                      value={studentFormData.rollNo}
                      onChange={(e) => setStudentFormData({ ...studentFormData, rollNo: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Fee
                    </label>
                    <input
                      type="text"
                      value={studentFormData.fee}
                      onChange={(e) => setStudentFormData({ ...studentFormData, fee: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Discount
                    </label>
                    <input
                      type="text"
                      value={studentFormData.discount}
                      onChange={(e) => setStudentFormData({ ...studentFormData, discount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 px-6 py-5 bg-white">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStudentEditModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStudentUpdate}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <Edit2 size={18} />
                    Update Student
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Student Delete Confirmation Modal */}
        {showStudentDeleteModal && selectedStudent && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setShowStudentDeleteModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-bold">Confirm Delete</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to delete student <span className="font-bold text-red-600">{selectedStudent.name}</span>? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowStudentDeleteModal(false)}
                      className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmStudentDelete}
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

  // Main class list view
  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Top Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          Add New Class
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Search Classes</h2>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2">
            <Search size={20} />
            Search
          </button>
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
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Standard Fee</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Students</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Total Fee</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Discount</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Budget</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    Loading classes...
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, index) => {
                  const totalStudents = cls.total_students || 0
                  const standardFee = parseFloat(cls.standard_fee) || 0
                  const totalFee = standardFee * totalStudents
                  const discount = parseFloat(cls.total_discount) || 0
                  const budget = totalFee - discount

                  return (
                    <tr
                      key={cls.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition`}
                    >
                      <td className="px-4 py-3 border border-gray-200">{index + 1}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                          {cls.class_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {standardFee.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">{totalStudents}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        {totalFee.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {discount > 0 ? discount.toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        {budget.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(cls)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(cls)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(cls)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
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
      </div>

      {/* Add New Class Sidebar */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Create New Class</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the details below</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
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
                    Incharge
                  </label>
                  <select
                    value={formData.incharge}
                    onChange={(e) => setFormData({ ...formData, incharge: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Incharge</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={`${staff.first_name} ${staff.last_name || ''}`.trim()}>
                        {staff.first_name} {staff.last_name || ''} - {staff.designation || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grade 5, Nursery A"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.classFee}
                      onChange={(e) => setFormData({ ...formData, classFee: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Exam Marking System
                  </label>
                  <select
                    value={formData.markingSystem}
                    onChange={(e) => setFormData({ ...formData, markingSystem: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Marking System</option>
                    <option value="percentage">Percentage</option>
                    <option value="grade">Grade</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Plus size={18} />
                  Save Class
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Class Sidebar */}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowEditModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Class</h3>
                  <p className="text-blue-200 text-sm mt-1">Update class details</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
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
                    Incharge
                  </label>
                  <select
                    value={formData.incharge}
                    onChange={(e) => setFormData({ ...formData, incharge: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Incharge</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={`${staff.first_name} ${staff.last_name || ''}`.trim()}>
                        {staff.first_name} {staff.last_name || ''} - {staff.designation || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grade 5, Nursery A"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Class Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.classFee}
                      onChange={(e) => setFormData({ ...formData, classFee: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Exam Marking System
                  </label>
                  <select
                    value={formData.markingSystem}
                    onChange={(e) => setFormData({ ...formData, markingSystem: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Marking System</option>
                    <option value="percentage">Percentage</option>
                    <option value="grade">Grade</option>
                    <option value="cgpa">CGPA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Edit2 size={18} />
                  Update Class
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && classToDelete && (
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
                  Are you sure you want to delete <span className="font-bold text-red-600">{classToDelete.class_name}</span>? This action cannot be undone.
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

      {/* Fee Increment Modal */}
      {showFeeIncrementModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowFeeIncrementModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Fee Increment</h3>
                  <button
                    onClick={() => setShowFeeIncrementModal(false)}
                    className="text-white hover:bg-white/10 p-1 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Mode</label>
                  <select
                    value={feeIncrementData.mode}
                    onChange={(e) => setFeeIncrementData({ ...feeIncrementData, mode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Mode</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Type</label>
                  <select
                    value={feeIncrementData.type}
                    onChange={(e) => setFeeIncrementData({ ...feeIncrementData, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Type</option>
                    <option value="increase">Increase</option>
                    <option value="decrease">Decrease</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Enter Increment Amount</label>
                  <input
                    type="text"
                    placeholder="Enter amount..."
                    value={feeIncrementData.amount}
                    onChange={(e) => setFeeIncrementData({ ...feeIncrementData, amount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowFeeIncrementModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={applyFeeIncrement}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                  >
                    Apply
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
