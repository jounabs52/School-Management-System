'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

export default function SectionsPage() {
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

  // Fetch data on component mount
  useEffect(() => {
    fetchClasses()
    fetchStaff()
    fetchSections()
  }, [])

  const fetchClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('school_id', user.school_id)
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

  const fetchSections = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      // Get sections with class name and teacher name
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
          classes!inner(class_name)
        `)
        .eq('school_id', user.school_id)
        .in('status', ['active', 'inactive'])
        .order('section_name', { ascending: true })

      if (error) {
        console.error('Error fetching sections:', error)
        setSections([])
      } else {
        // Get teacher names for sections
        const sectionsWithDetails = await Promise.all(
          (sections || []).map(async (section) => {
            let teacherName = null

            if (section.class_teacher_id) {
              const { data: teacher } = await supabase
                .from('staff')
                .select('first_name, last_name')
                .eq('id', section.class_teacher_id)
                .single()

              if (teacher) {
                teacherName = `${teacher.first_name} ${teacher.last_name || ''}`.trim()
              }
            }

            return {
              id: section.id,
              section_name: section.section_name,
              class_id: section.class_id,
              class_name: section.classes?.class_name,
              class_teacher_id: section.class_teacher_id,
              teacher_name: teacherName,
              room_number: section.room_number,
              capacity: section.capacity,
              status: section.status
            }
          })
        )

        setSections(sectionsWithDetails)
      }
    } catch (error) {
      console.error('Error fetching sections:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSections = sections
    .filter(section => {
      const matchesSearch = section.section_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           section.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesClass = !selectedClass || section.class_id === selectedClass
      return matchesSearch && matchesClass
    })
    .sort((a, b) => a.section_name.localeCompare(b.section_name))

  const handleSave = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
      }

      const { data, error } = await supabase
        .from('sections')
        .insert([{
          school_id: user.school_id,
          class_id: formData.class,
          section_name: formData.section,
          class_teacher_id: formData.incharge || null,
          room_number: formData.roomNumber || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          created_by: user.id,
          status: 'active'
        }])
        .select()

      if (error) {
        console.error('Error creating section:', error)
        alert(`Failed to create section: ${error.message}`)
      } else {
        setShowSidebar(false)
        setFormData({ class: '', section: '', incharge: '', roomNumber: '', capacity: '', orderBy: '' })
        fetchSections()
      }
    } catch (error) {
      console.error('Error saving section:', error)
      alert('Error saving section: ' + error.message)
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
    setShowEditSidebar(true)
  }

  const handleUpdate = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
        return
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
        .eq('school_id', user.school_id)
        .select()

      if (error) {
        console.error('Error updating section:', error)
        alert('Failed to update section: ' + error.message)
      } else {
        setShowEditSidebar(false)
        setSelectedSection(null)
        setEditFormData({ class: '', section: '', incharge: '', roomNumber: '', capacity: '', orderBy: '' })
        fetchSections()
      }
    } catch (error) {
      console.error('Error updating section:', error)
      alert('Error updating section')
    }
  }

  const handleDelete = (section) => {
    setSelectedSection(section)
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
        .from('sections')
        .update({ status: 'inactive' })
        .eq('id', selectedSection.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting section:', error)
        alert('Failed to delete section: ' + error.message)
      } else {
        setShowDeleteModal(false)
        setSelectedSection(null)
        fetchSections()
      }
    } catch (error) {
      console.error('Error deleting section:', error)
      alert('Error deleting section')
    }
  }

  const handleToggleStatus = async (section) => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        alert('Unauthorized')
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
        .eq('school_id', user.school_id)
        .select()

      if (error) {
        console.error('Error updating status:', error)
        alert('Failed to update status: ' + error.message)
      } else {
        fetchSections()
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    }
  }

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (showSidebar || showEditSidebar || showDeleteModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showSidebar, showEditSidebar, showDeleteModal])

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
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
        <h2 className="text-xl font-bold text-gray-800 mb-4">Search Sections</h2>

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
              {classList.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
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
                  placeholder="Search"
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
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Section Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Incharge Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    Loading sections...
                  </td>
                </tr>
              ) : filteredSections.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No sections found
                  </td>
                </tr>
              ) : (
                filteredSections.map((section, index) => (
                  <tr
                    key={section.id}
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition`}
                  >
                    <td className="px-4 py-3 border border-gray-200 text-blue-600">{index + 1}</td>
                    <td className="px-4 py-3 border border-gray-200 font-medium">{section.class_name}</td>
                    <td className="px-4 py-3 border border-gray-200">{section.section_name}</td>
                    <td className="px-4 py-3 border border-gray-200">{section.teacher_name || '-'}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Sidebar */}
      {showSidebar && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setShowSidebar(false)}
          />

          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
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

                      // Auto-fill incharge if class has one
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
                  <select
                    value={formData.incharge}
                    onChange={(e) => setFormData({ ...formData, incharge: e.target.value })}
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
        </>
      )}

      {/* Edit Section Sidebar */}
      {showEditSidebar && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setShowEditSidebar(false)}
          />

          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
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

                      // Auto-fill incharge if class has one
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
                    onChange={(e) => setEditFormData({ ...editFormData, incharge: e.target.value })}
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
                  Update
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSection && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full my-8">
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
        </>
      )}
    </div>
  )
}
