'use client'

import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, X, BookOpen } from 'lucide-react'

export default function SubjectsPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showEditSidebar, setShowEditSidebar] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [formData, setFormData] = useState({
    class: '',
    subjectName: '',
    subjectCode: '',
    teacher: ''
  })
  const [editFormData, setEditFormData] = useState({
    class: '',
    subjectName: '',
    subjectCode: '',
    teacher: ''
  })

  const subjects = [
    { id: 1, sr: 1, className: 'Playgroup', subjectName: 'English', subjectCode: 'ENG-01', teacher: 'Ahsan' },
    { id: 2, sr: 2, className: 'Playgroup', subjectName: 'Math', subjectCode: 'MTH-01', teacher: 'SAIMA' },
    { id: 3, sr: 3, className: 'Nursery', subjectName: 'English', subjectCode: 'ENG-02', teacher: 'SAMINA' },
    { id: 4, sr: 4, className: 'Nursery', subjectName: 'Urdu', subjectCode: 'URD-01', teacher: 'Ali Ahmad' },
    { id: 5, sr: 5, className: 'K.G A', subjectName: 'Math', subjectCode: 'MTH-02', teacher: 'Shabana' },
    { id: 6, sr: 6, className: 'K.G A', subjectName: 'Science', subjectCode: 'SCI-01', teacher: 'Ali' },
    { id: 7, sr: 7, className: 'Five', subjectName: 'English', subjectCode: 'ENG-05', teacher: 'Abdullah' },
    { id: 8, sr: 8, className: 'Five', subjectName: 'Math', subjectCode: 'MTH-05', teacher: 'SAIMA' },
    { id: 9, sr: 9, className: 'Five', subjectName: 'Science', subjectCode: 'SCI-05', teacher: 'Ahsan' },
    { id: 10, sr: 10, className: '10th', subjectName: 'Physics', subjectCode: 'PHY-10', teacher: 'SAMINA' },
    { id: 11, sr: 11, className: '10th', subjectName: 'Chemistry', subjectCode: 'CHM-10', teacher: 'Ali Ahmad' },
    { id: 12, sr: 12, className: '10th', subjectName: 'Biology', subjectCode: 'BIO-10', teacher: 'Shabana' },
  ]

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.className.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = !selectedClass || subject.className === selectedClass
    return matchesSearch && matchesClass
  })

  const handleSave = () => {
    console.log('Form Data:', formData)
    setShowSidebar(false)
    setFormData({ class: '', subjectName: '', subjectCode: '', teacher: '' })
  }

  const handleEdit = (subject) => {
    setSelectedSubject(subject)
    setEditFormData({
      class: subject.className,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      teacher: subject.teacher
    })
    setShowEditSidebar(true)
  }

  const handleUpdate = () => {
    console.log('Update Subject:', selectedSubject?.id, editFormData)
    setShowEditSidebar(false)
    setSelectedSubject(null)
    setEditFormData({ class: '', subjectName: '', subjectCode: '', teacher: '' })
  }

  const handleDelete = (subject) => {
    setSelectedSubject(subject)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    console.log('Delete Subject:', selectedSubject?.id)
    setShowDeleteModal(false)
    setSelectedSubject(null)
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
              <option value="Playgroup">Playgroup</option>
              <option value="Nursery">Nursery</option>
              <option value="K.G A">K.G A</option>
              <option value="Five">Five</option>
              <option value="10th">10th</option>
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
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Subject Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Subject Code</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Teacher</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject, index) => (
                <tr
                  key={subject.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50 transition`}
                >
                  <td className="px-4 py-3 border border-gray-200 text-blue-600">{subject.sr}</td>
                  <td className="px-4 py-3 border border-gray-200 font-medium">{subject.className}</td>
                  <td className="px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-blue-600" />
                      {subject.subjectName}
                    </div>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600">{subject.subjectCode}</td>
                  <td className="px-4 py-3 border border-gray-200">{subject.teacher}</td>
                  <td className="px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(subject)}
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
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Class</option>
                    <option value="Playgroup">Playgroup</option>
                    <option value="Nursery">Nursery</option>
                    <option value="K.G A">K.G A</option>
                    <option value="Five">Five</option>
                    <option value="10th">10th</option>
                  </select>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
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
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    placeholder="e.g., MTH-01, ENG-01"
                  />
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Subject Teacher
                  </label>
                  <select
                    value={formData.teacher}
                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Teacher</option>
                    <option value="Ahsan">Ahsan</option>
                    <option value="SAIMA">SAIMA</option>
                    <option value="SAMINA">SAMINA</option>
                    <option value="Ali">Ali</option>
                    <option value="Abdullah">Abdullah</option>
                    <option value="Shabana">Shabana</option>
                    <option value="Ali Ahmad">Ali Ahmad</option>
                  </select>
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
                  Save Subject
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
                  <select
                    value={editFormData.class}
                    onChange={(e) => setEditFormData({ ...editFormData, class: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Class</option>
                    <option value="Playgroup">Playgroup</option>
                    <option value="Nursery">Nursery</option>
                    <option value="K.G A">K.G A</option>
                    <option value="Five">Five</option>
                    <option value="10th">10th</option>
                  </select>
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

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Subject Teacher
                  </label>
                  <select
                    value={editFormData.teacher}
                    onChange={(e) => setEditFormData({ ...editFormData, teacher: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select Teacher</option>
                    <option value="Ahsan">Ahsan</option>
                    <option value="SAIMA">SAIMA</option>
                    <option value="SAMINA">SAMINA</option>
                    <option value="Ali">Ali</option>
                    <option value="Abdullah">Abdullah</option>
                    <option value="Shabana">Shabana</option>
                    <option value="Ali Ahmad">Ali Ahmad</option>
                  </select>
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
