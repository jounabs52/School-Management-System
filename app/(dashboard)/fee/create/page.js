'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, X, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

export default function FeeCreatePage() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [feeTypes, setFeeTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [showChallanModal, setShowChallanModal] = useState(false)

  const [challanData, setChallanData] = useState({
    dueDate: '',
    feeItems: []
  })

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (showChallanModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showChallanModal])

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('order_number', { ascending: true })

      if (classesError) throw classesError
      setClasses(classesData || [])

      // Fetch fee types
      const { data: feeTypesData, error: feeTypesError } = await supabase
        .from('fee_types')
        .select('id, fee_name, fee_code')
        .eq('school_id', user.school_id)
        .eq('status', 'active')

      if (feeTypesError) throw feeTypesError
      setFeeTypes(feeTypesData || [])

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          current_class_id,
          classes:current_class_id (
            id,
            class_name
          ),
          sections:current_section_id (
            section_name
          )
        `)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('admission_number', { ascending: true })

      if (studentsError) throw studentsError
      setStudents(studentsData || [])

      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSelectStudent = (student) => {
    if (selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents(selectedStudents.filter(s => s.id !== student.id))
    } else {
      setSelectedStudents([...selectedStudents, student])
    }
  }

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents([...filteredStudents])
    }
  }

  const handleCreateChallan = () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student')
      return
    }
    setShowChallanModal(true)
    setChallanData({
      dueDate: '',
      feeItems: feeTypes.length > 0 ? [{ feeTypeId: feeTypes[0].id, amount: '' }] : []
    })
  }

  const addFeeItem = () => {
    setChallanData({
      ...challanData,
      feeItems: [...challanData.feeItems, { feeTypeId: feeTypes[0]?.id || '', amount: '' }]
    })
  }

  const removeFeeItem = (index) => {
    setChallanData({
      ...challanData,
      feeItems: challanData.feeItems.filter((_, i) => i !== index)
    })
  }

  const updateFeeItem = (index, field, value) => {
    const updatedItems = [...challanData.feeItems]
    updatedItems[index][field] = value
    setChallanData({ ...challanData, feeItems: updatedItems })
  }

  const calculateTotal = () => {
    return challanData.feeItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  }

  const handleSaveChallan = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('User not found')
        return
      }

      if (!challanData.dueDate) {
        alert('Please select due date')
        return
      }

      if (challanData.feeItems.length === 0) {
        alert('Please add at least one fee item')
        return
      }

      if (challanData.feeItems.some(item => !item.amount || parseFloat(item.amount) <= 0)) {
        alert('Please enter valid amounts for all fee items')
        return
      }

      const totalAmount = calculateTotal()

      // Get current session
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('is_current', true)
        .single()

      if (!sessionData) {
        alert('No active session found')
        return
      }

      // Create challans for each selected student
      for (const student of selectedStudents) {
        // Generate challan number
        const challanNumber = `CH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        // Insert challan
        const { data: challan, error: challanError } = await supabase
          .from('fee_challans')
          .insert([{
            school_id: user.school_id,
            session_id: sessionData.id,
            student_id: student.id,
            challan_number: challanNumber,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: challanData.dueDate,
            total_amount: totalAmount,
            status: 'pending',
            created_by: user.id
          }])
          .select()
          .single()

        if (challanError) throw challanError

        // Insert challan items
        const challanItems = challanData.feeItems.map(item => ({
          school_id: user.school_id,
          challan_id: challan.id,
          fee_type_id: item.feeTypeId,
          amount: parseFloat(item.amount)
        }))

        const { error: itemsError } = await supabase
          .from('fee_challan_items')
          .insert(challanItems)

        if (itemsError) throw itemsError
      }

      alert(`Successfully created ${selectedStudents.length} challans`)
      setShowChallanModal(false)
      setSelectedStudents([])
      setChallanData({ dueDate: '', feeItems: [] })
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to create challans')
    }
  }

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${student.first_name} ${student.last_name || ''}`.toLowerCase()

    const matchesSearch =
      fullName.includes(searchLower) ||
      student.admission_number.toLowerCase().includes(searchLower)

    const matchesClass = !selectedClass || student.current_class_id === selectedClass

    return matchesSearch && matchesClass
  })

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Fee Challan</h1>
          <p className="text-gray-600">Select students and create fee challans</p>
        </div>
        <button
          onClick={handleCreateChallan}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={20} />
          Create Challan ({selectedStudents.length})
        </button>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.class_name}</option>
            ))}
          </select>
          <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2">
            <Search size={20} />
            Search
          </button>
        </div>

        <p className="text-gray-600 mt-4 text-sm">
          Found <span className="font-bold text-red-600">{filteredStudents.length}</span> students |
          Selected <span className="font-bold text-green-600"> {selectedStudents.length}</span> students
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-6 py-4 text-left font-semibold">Sr.</th>
                <th className="px-6 py-4 text-left font-semibold">Admission No.</th>
                <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                <th className="px-6 py-4 text-left font-semibold">Class</th>
                <th className="px-6 py-4 text-left font-semibold">Section</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.some(s => s.id === student.id)}
                        onChange={() => handleSelectStudent(student)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4 text-gray-700">{index + 1}</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{student.admission_number}</td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {student.classes?.class_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {student.sections?.section_name || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Challan Modal */}
      {showChallanModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowChallanModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Create Fee Challan</h3>
                  <p className="text-blue-200 text-sm mt-1">For {selectedStudents.length} student(s)</p>
                </div>
                <button
                  onClick={() => setShowChallanModal(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Due Date */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={challanData.dueDate}
                  onChange={(e) => setChallanData({ ...challanData, dueDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                />
              </div>

              {/* Fee Items */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-800">Fee Items</h4>
                  <button
                    onClick={addFeeItem}
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {challanData.feeItems.map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-semibold text-gray-700">Item {index + 1}</span>
                        {challanData.feeItems.length > 1 && (
                          <button
                            onClick={() => removeFeeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-gray-700 font-medium mb-2 text-sm">Fee Type</label>
                          <select
                            value={item.feeTypeId}
                            onChange={(e) => updateFeeItem(index, 'feeTypeId', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                          >
                            {feeTypes.map(type => (
                              <option key={type.id} value={type.id}>{type.fee_name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 font-medium mb-2 text-sm">Amount</label>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={item.amount}
                            onChange={(e) => updateFeeItem(index, 'amount', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">Total Amount:</span>
                  <span className="font-bold text-red-600 text-xl">
                    Rs. {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowChallanModal(false)}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChallan}
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <Plus size={14} />
                  Create Challan
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
