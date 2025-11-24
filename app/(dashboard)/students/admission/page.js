'use client'

import { useState } from 'react'
import { FileText, UserPlus, Upload, Search, Filter, Eye, Edit2 } from 'lucide-react'

export default function AdmissionRegisterPage() {
  const [activeTab, setActiveTab] = useState('register')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOption, setSelectedOption] = useState('')

  const admissions = [
    { id: 1, sr: 1, session: '2024-2025', class: 'Playgroup', name: 'Qurat Ul Ain', father: 'Ansar Mehmood', admNo: 32, avatar: '👧' },
    { id: 2, sr: 2, session: '2024-2025', class: 'Playgroup', name: 'Iqra Hamid', father: 'Hamid Ali', admNo: 33, avatar: '👧' },
    { id: 3, sr: 3, session: '2024-2025', class: 'Playgroup', name: 'Aliza Khalid', father: 'Afzal', admNo: 37, avatar: '👧' },
    { id: 4, sr: 4, session: '2024-2025', class: 'Playgroup', name: 'Maryam Ibrar', father: 'Ibrar Hussain', admNo: 38, avatar: '👧' },
    { id: 5, sr: 5, session: '2024-2025', class: 'Playgroup', name: 'Malika Saif', father: 'Saif Ullah', admNo: 39, avatar: '👧' },
    { id: 6, sr: 6, session: '2024-2025', class: 'Playgroup', name: 'Ume Habiba', father: 'Mudasir Iqbal', admNo: 40, avatar: '👧' },
    { id: 7, sr: 7, session: '2024-2025', class: 'Playgroup', name: 'Narmeen Zahra', father: 'Muhammad Shareef', admNo: 41, avatar: '👧' },
    { id: 8, sr: 8, session: '2024-2025', class: 'Playgroup', name: 'Tehreem Zafar', father: 'Zafar Iqbal', admNo: 42, avatar: '👧' },
    { id: 9, sr: 9, session: '2024-2025', class: 'Playgroup', name: 'Aatika', father: 'Kashif Hayat', admNo: 43, avatar: '👧' },
    { id: 10, sr: 10, session: '2024-2025', class: 'Playgroup', name: 'Zainab Fatima', father: 'Muhammad Ashraf', admNo: 44, avatar: '👧' },
  ]

  const filteredAdmissions = admissions.filter(adm =>
    adm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.father.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.admNo.toString().includes(searchTerm)
  )

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Top Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab('register')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'register'
              ? 'bg-red-500 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FileText size={20} />
          Admission Register
        </button>
        
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'new'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <UserPlus size={20} />
          Register New Student
        </button>
        
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'import'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Upload size={20} />
          Import Students
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Admission Register</h2>

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          {/* Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select an option</option>
              <option value="playgroup">Playgroup</option>
              <option value="nursery">Nursery</option>
              <option value="prep">Prep</option>
              <option value="class1">Class 1</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button className="w-full bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition flex items-center justify-center gap-2">
              <Search size={20} />
              Search
            </button>
          </div>

          {/* Advance Search Button */}
          <div className="md:col-span-2">
            <button className="w-full bg-cyan-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-cyan-600 transition flex items-center justify-center gap-2">
              <Filter size={20} />
              Advance Search
            </button>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-gray-600 mb-4">
          There are <span className="text-red-600 font-bold">158</span> admissions saved in the system.
        </p>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Session</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Father Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Adm.No</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmissions.map((admission, index) => (
                <tr
                  key={admission.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50 transition`}
                >
                  <td className="px-4 py-3 border border-gray-200">{admission.sr}</td>
                  <td className="px-4 py-3 border border-gray-200">{admission.session}</td>
                  <td className="px-4 py-3 border border-gray-200">{admission.class}</td>
                  <td className="px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{admission.avatar}</span>
                      <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                        {admission.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border border-gray-200">{admission.father}</td>
                  <td className="px-4 py-3 border border-gray-200">{admission.admNo}</td>
                  <td className="px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination would go here */}
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">Showing 1 to 10 of 158 entries</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              Previous
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">1</button>
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
    </div>
  )
}