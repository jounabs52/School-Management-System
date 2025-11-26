// app/(dashboard)/students/active/page.js
'use client'

import { useState } from 'react'
import { Search, Eye, Edit2, Trash2, FileText, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react'

export default function ActiveStudentsPage() {
  const [selectedOption, setSelectedOption] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Sample student data matching screenshot
  const students = [
    {
      id: 1,
      sr: 1,
      session: '2024-2025',
      class: 'Playgroup',
      name: 'Qurat Ul Ain',
      fatherName: 'Ansar Mehmood',
      admNo: 32,
      avatar: '👧',
      isActive: true
    },
    {
      id: 2,
      sr: 2,
      session: '2024-2025',
      class: 'Playgroup',
      name: 'Iqra Hamid',
      fatherName: 'Hamid Ali',
      admNo: 33,
      avatar: '👧',
      isActive: true
    },
    {
      id: 3,
      sr: 3,
      session: '2024-2025',
      class: 'Playgroup',
      name: 'Aliza Khalid',
      fatherName: 'Afzal',
      admNo: 37,
      avatar: '👧',
      isActive: true
    },
    {
      id: 4,
      sr: 4,
      session: '2024-2025',
      class: 'Playgroup',
      name: 'Maryam Ibrar',
      fatherName: 'Ibrar Hussain',
      admNo: 38,
      avatar: '👧',
      isActive: true
    },
    {
      id: 5,
      sr: 5,
      session: '2024-2025',
      class: 'Playgroup',
      name: 'Malika Saif',
      fatherName: 'Saif Ullah',
      admNo: 39,
      avatar: '👧',
      isActive: true
    },
    {
      id: 6,
      sr: 6,
      session: '2024-2025',
      class: 'Playgroup',
      name: 'Ume Habiba',
      fatherName: 'Mudasir Iqbal',
      admNo: 40,
      avatar: '👧',
      isActive: true
    }
  ]

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Admission Register</h2>

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-6">
          {/* Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Select an option</option>
              <option value="session">By Session</option>
              <option value="class">By Class</option>
              <option value="name">By Name</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2">
              <Search size={20} />
              Search
            </button>
          </div>
        </div>

        {/* Student Count */}
        <p className="text-gray-600 mb-4">
          There are <span className="text-red-600 font-bold">158</span> admissions saved in the system.
        </p>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold">Sr.</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Session</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Father Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Adm.No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Options</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr
                  key={student.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 text-blue-600 font-medium">{student.sr}</td>
                  <td className="px-4 py-3 text-gray-700">{student.session}</td>
                  <td className="px-4 py-3 text-gray-700">{student.class}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{student.avatar}</span>
                      <span className="text-cyan-600 hover:text-cyan-700 cursor-pointer font-medium">
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{student.fatherName}</td>
                  <td className="px-4 py-3 text-gray-700">{student.admNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* View Icon */}
                      <button className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition">
                        <Eye size={18} />
                      </button>
                      {/* Edit Icon */}
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Edit2 size={18} />
                      </button>
                      {/* Delete Icon */}
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

        {/* Pagination */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
            Previous
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            1
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
            2
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
            3
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
