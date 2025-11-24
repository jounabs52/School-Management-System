'use client'

import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'

export default function SectionsPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [formData, setFormData] = useState({
    class: '',
    section: '',
    incharge: ''
  })

  const sections = [
    { id: 1, sr: 1, className: 'Playgroup', sectionName: 'Green', displayOrder: '2.00', incharge: 'Ahsan' },
    { id: 2, sr: 2, className: 'Nursery', sectionName: 'Zahra', displayOrder: '1.00', incharge: 'SAIMA' },
    { id: 3, sr: 3, className: '10th', sectionName: 'black', displayOrder: '1.00', incharge: 'SAMINA' },
    { id: 4, sr: 4, className: 'Playgroup', sectionName: 'A', displayOrder: '4.00', incharge: 'Ali Ahmad' },
    { id: 5, sr: 5, className: '', sectionName: 'z', displayOrder: '2.00', incharge: 'Shabana' },
    { id: 6, sr: 6, className: 'Playgroup', sectionName: 'black', displayOrder: '3.00', incharge: 'Ali' },
    { id: 7, sr: 7, className: 'Five', sectionName: 'blue', displayOrder: '1.00', incharge: '' },
    { id: 8, sr: 8, className: 'Five', sectionName: 'black', displayOrder: '2.00', incharge: '' },
    { id: 9, sr: 9, className: 'Five', sectionName: 'Green', displayOrder: '3.00', incharge: '' },
    { id: 10, sr: 10, className: 'Five', sectionName: 'Red', displayOrder: '4.00', incharge: '' },
    { id: 11, sr: 11, className: 'Five', sectionName: 'YELLOW', displayOrder: '5.00', incharge: '' },
    { id: 12, sr: 12, className: 'K.G A', sectionName: 'A', displayOrder: '1.00', incharge: 'Abdullah' },
    { id: 13, sr: 13, className: 'Nursery', sectionName: 'A', displayOrder: '2.00', incharge: 'Ali' },
  ]

  const filteredSections = sections.filter(section => {
    const matchesSearch = section.sectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         section.className.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = !selectedClass || section.className === selectedClass
    return matchesSearch && matchesClass
  })

  const handleSave = () => {
    console.log('Form Data:', formData)
    setShowSidebar(false)
    setFormData({ class: '', section: '', incharge: '' })
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Top Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowSidebar(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 shadow-lg"
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
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 transition flex items-center gap-2">
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
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Display Order</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Incharge Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {filteredSections.map((section, index) => (
                <tr
                  key={section.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50 transition`}
                >
                  <td className="px-4 py-3 border border-gray-200 text-blue-600">{section.sr}</td>
                  <td className="px-4 py-3 border border-gray-200 font-medium">{section.className}</td>
                  <td className="px-4 py-3 border border-gray-200">{section.sectionName}</td>
                  <td className="px-4 py-3 border border-gray-200">{section.displayOrder}</td>
                  <td className="px-4 py-3 border border-gray-200">{section.incharge}</td>
                  <td className="px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
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

      {/* Right Sidebar */}
      {showSidebar && (
        <>
          {/* Backdrop with blur */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
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
                    Class
                  </label>
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">All Classes</option>
                    <option value="playgroup">Playgroup</option>
                    <option value="nursery">Nursery</option>
                    <option value="kga">K.G A</option>
                    <option value="five">Five</option>
                    <option value="10th">10th</option>
                  </select>
                </div>

                {/* Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  >
                    <option value="">Select a section</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="Green">Green</option>
                    <option value="Blue">Blue</option>
                    <option value="Red">Red</option>
                    <option value="Yellow">Yellow</option>
                    <option value="Black">Black</option>
                  </select>
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
                    <option value="">Select incharge</option>
                    <option value="ahsan">Ahsan</option>
                    <option value="saima">SAIMA</option>
                    <option value="samina">SAMINA</option>
                    <option value="ali">Ali</option>
                    <option value="abdullah">Abdullah</option>
                    <option value="shabana">Shabana</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sidebar Footer */}
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
                  Save Section
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
