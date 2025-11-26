'use client'

import { useState } from 'react'
import { FileText, UserPlus, Upload, Search, Eye, Edit2, Trash2, X, Plus, ChevronDown, ChevronUp, Image } from 'lucide-react'

export default function AdmissionRegisterPage() {
  const [activeTab, setActiveTab] = useState('register')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [showRegisterSidebar, setShowRegisterSidebar] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showOtherDetails, setShowOtherDetails] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [importExpanded, setImportExpanded] = useState(true)
  const [importData, setImportData] = useState({
    class: 'Playgroup',
    section: '',
    category: 'ORPHAN sTUDENT'
  })
  const [formData, setFormData] = useState({
    // Academic Data
    admissionNo: '334',
    class: '',
    admissionDate: '24-Nov-2025',
    discount: '',
    // Student & Father Information
    selectFamily: '',
    fatherCnic: '',
    familyNo: '283',
    studentName: '',
    fatherName: '',
    fatherMobile: '',
    fatherQualification: '',
    fatherOccupation: '',
    guardianMobile: '',
    whatsappNumber: '',
    category: '',
    dateOfBirth: '',
    studentCnic: '',
    casteRace: '',
    gender: 'Male',
    currentAddress: '',
    // Mother Information
    motherName: '',
    motherCnic: '',
    motherMobile: '',
    motherQualification: '',
    // Guardian Information
    guardianName: '',
    guardianRelation: '',
    // Emergency Contact
    emergencyRelation: '',
    emergencyContactName: '',
    emergencyPhone: '',
    emergencyMobile: '',
    emergencyAddress: '',
    // Other Information
    utmSource: '',
    admissionFormNo: '',
    registerSerialNo: '',
    previousClass: '',
    previousSchool: '',
    region: '',
    bloodGroup: '',
    studentMobile: '',
    birthPlace: '',
    religion: '',
    nationality: '',
    permanentAddress: '',
    medicalProblem: ''
  })

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

  const handleRegisterNewStudent = () => {
    setShowRegisterSidebar(true)
  }

  const handleSaveStudent = () => {
    console.log('Form Data:', formData)
    setShowRegisterSidebar(false)
  }

  const handleDelete = (student) => {
    setSelectedStudent(student)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    console.log('Delete Student:', selectedStudent)
    setShowDeleteModal(false)
    setSelectedStudent(null)
  }

  const handleEdit = (student) => {
    setIsEditMode(true)
    setFormData({
      admissionNo: student.admNo.toString(),
      class: student.class,
      admissionDate: '24-Nov-2025',
      discount: '',
      selectFamily: '',
      fatherCnic: '',
      familyNo: '283',
      studentName: student.name,
      fatherName: student.father,
      fatherMobile: '',
      fatherQualification: '',
      fatherOccupation: '',
      guardianMobile: '',
      whatsappNumber: '',
      category: '',
      dateOfBirth: '',
      studentCnic: '',
      casteRace: '',
      gender: 'Male',
      currentAddress: '',
      motherName: '',
      motherCnic: '',
      motherMobile: '',
      motherQualification: '',
      guardianName: '',
      guardianRelation: '',
      emergencyRelation: '',
      emergencyContactName: '',
      emergencyPhone: '',
      emergencyMobile: '',
      emergencyAddress: '',
      utmSource: '',
      admissionFormNo: '',
      registerSerialNo: '',
      previousClass: '',
      previousSchool: '',
      region: '',
      bloodGroup: '',
      studentMobile: '',
      birthPlace: '',
      religion: '',
      nationality: '',
      permanentAddress: '',
      medicalProblem: ''
    })
    setShowRegisterSidebar(true)
  }

  const handleView = (student) => {
    setSelectedStudent(student)
    setShowViewModal(true)
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Top Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab('register')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'register'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FileText size={20} />
          Admission Register
        </button>

        <button
          onClick={() => {
            setIsEditMode(false)
            setFormData({
              admissionNo: '334',
              class: '',
              admissionDate: '24-Nov-2025',
              discount: '',
              selectFamily: '',
              fatherCnic: '',
              familyNo: '283',
              studentName: '',
              fatherName: '',
              fatherMobile: '',
              fatherQualification: '',
              fatherOccupation: '',
              guardianMobile: '',
              whatsappNumber: '',
              category: '',
              dateOfBirth: '',
              studentCnic: '',
              casteRace: '',
              gender: 'Male',
              currentAddress: '',
              motherName: '',
              motherCnic: '',
              motherMobile: '',
              motherQualification: '',
              guardianName: '',
              guardianRelation: '',
              emergencyRelation: '',
              emergencyContactName: '',
              emergencyPhone: '',
              emergencyMobile: '',
              emergencyAddress: '',
              utmSource: '',
              admissionFormNo: '',
              registerSerialNo: '',
              previousClass: '',
              previousSchool: '',
              region: '',
              bloodGroup: '',
              studentMobile: '',
              birthPlace: '',
              religion: '',
              nationality: '',
              permanentAddress: '',
              medicalProblem: ''
            })
            handleRegisterNewStudent()
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all bg-white text-gray-700 hover:bg-gray-100"
        >
          <UserPlus size={20} />
          Register New Student
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'import'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Upload size={20} />
          Import Students
        </button>
      </div>

      {/* Main Content - Admission Register */}
      {activeTab === 'register' && (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Admission Register</h2>

        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-6">
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
            <button className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2">
              <Search size={20} />
              Search
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(admission)}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(admission)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(admission)}
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

        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">Showing 1 to 10 of 158 entries</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
              Previous
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg">1</button>
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
      )}

      {/* Import Students Section */}
      {activeTab === 'import' && (
        <div className="mt-6">
          {/* Collapsible Header */}
          <div
            onClick={() => setImportExpanded(!importExpanded)}
            className="bg-gray-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center cursor-pointer"
          >
            <h3 className="font-semibold">Import Bulk Students</h3>
            {importExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {/* Collapsible Content */}
          {importExpanded && (
            <div className="bg-white p-6 border-x border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Class Dropdown */}
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Class</label>
                  <select
                    value={importData.class}
                    onChange={(e) => setImportData({ ...importData, class: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Class</option>
                    <option value="Playgroup">Playgroup</option>
                    <option value="Nursery">Nursery</option>
                    <option value="Prep1">Prep1</option>
                    <option value="One">One</option>
                    <option value="Three">Three</option>
                    <option value="Four">Four</option>
                    <option value="Five">Five</option>
                  </select>
                </div>

                {/* Section Dropdown */}
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Section</label>
                  <select
                    value={importData.section}
                    onChange={(e) => setImportData({ ...importData, section: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Section</option>
                    <option value="Green">Green</option>
                    <option value="A">A</option>
                    <option value="black">black</option>
                  </select>
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Category</label>
                  <select
                    value={importData.category}
                    onChange={(e) => setImportData({ ...importData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Category</option>
                    <option value="select an option">select an option</option>
                    <option value="ORPHAN sTUDENT">ORPHAN sTUDENT</option>
                    <option value="ASAD SPONSER">ASAD SPONSER</option>
                    <option value="Active student">Active student</option>
                    <option value="Free student">Free student</option>
                    <option value="Police child student">Police child student</option>
                    <option value="Doctor child">Doctor child</option>
                  </select>
                </div>

                {/* Upload Excel File */}
                <div className="border border-dashed border-red-400 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Image size={16} className="text-gray-600" />
                    <span className="text-xs font-semibold text-gray-700">UPLOAD EXCEL FILE</span>
                  </div>
                  <p className="text-xs text-gray-500 italic mb-2">Select excel file</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="w-full text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer with Save Button */}
          <div className="bg-white p-4 rounded-b-xl border border-gray-200 flex justify-end">
            <button className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2">
              Save
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 16 16 12 12 8"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Register New Student Sidebar */}
      {showRegisterSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowRegisterSidebar(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{isEditMode ? 'Edit Student' : 'Register New Student'}</h3>
                  <p className="text-blue-200 text-sm mt-1">{isEditMode ? 'Update student details' : 'Fill in the student details'}</p>
                </div>
                <button
                  onClick={() => setShowRegisterSidebar(false)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Sidebar Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Academic Data Section */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-green-600 mb-4 flex items-center gap-2">
                  <FileText size={16} />
                  ACADEMIC DATA
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Admission/GR No (Last:<span className="font-bold">333</span>) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.admissionNo}
                      onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Class</label>
                    <select
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Class</option>
                      <option value="Playgroup">Playgroup</option>
                      <option value="Nursery">Nursery</option>
                      <option value="Prep">Prep</option>
                      <option value="One">One</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Admission Date</label>
                    <input
                      type="text"
                      value={formData.admissionDate}
                      onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                </div>
                {/* Upload Student Picture */}
                <div className="mt-4 border border-dashed border-gray-300 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">UPLOAD STUDENT PICTURE</p>
                  <p className="text-xs text-gray-500 italic mb-2">Select image file</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-xs"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-gray-700 text-sm mb-2">Discount (if any)</label>
                  <input
                    type="text"
                    placeholder="Enter Discount Amount"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Student & Father Information */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-600 mb-4 flex items-center gap-2">
                  <UserPlus size={16} />
                  STUDENT & FATHER INFORMATION
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Select Family <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.selectFamily}
                      onChange={(e) => setFormData({ ...formData, selectFamily: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Search a family by name or family number</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Father C.N.I.C # <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Father C.N.I.C #"
                      value={formData.fatherCnic}
                      onChange={(e) => setFormData({ ...formData, fatherCnic: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Family No <span className="text-red-500">*</span> (Last FN:<span className="font-bold">282</span>)
                    </label>
                    <input
                      type="text"
                      value={formData.familyNo}
                      onChange={(e) => setFormData({ ...formData, familyNo: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Student Name"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Father Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Father Name"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Father Mobile</label>
                    <input
                      type="text"
                      placeholder="Enter Father Mobile"
                      value={formData.fatherMobile}
                      onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Father Qualification</label>
                    <input
                      type="text"
                      placeholder="Enter Father Qualification"
                      value={formData.fatherQualification}
                      onChange={(e) => setFormData({ ...formData, fatherQualification: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Father Occupation <span className="text-red-500">*</span>
                      <span className="text-blue-600 text-xs ml-1 cursor-pointer">Add New</span>
                    </label>
                    <select
                      value={formData.fatherOccupation}
                      onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select Occupation</option>
                      <option value="Business">Business</option>
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">
                      Guardian Mobile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Father Mobile"
                      value={formData.guardianMobile}
                      onChange={(e) => setFormData({ ...formData, guardianMobile: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">WhatsApp Number</label>
                    <input
                      type="text"
                      placeholder="Enter WhatsApp Number"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Select an option</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Date Of Birth</label>
                    <input
                      type="text"
                      placeholder="Date Of Birth"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Student C.N.I.C #</label>
                    <input
                      type="text"
                      placeholder="xxxxxxxxxxxxx"
                      value={formData.studentCnic}
                      onChange={(e) => setFormData({ ...formData, studentCnic: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Caste / Race</label>
                    <input
                      type="text"
                      placeholder="Caste / Race"
                      value={formData.casteRace}
                      onChange={(e) => setFormData({ ...formData, casteRace: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Current Address</label>
                    <input
                      type="text"
                      placeholder="Enter Current Address"
                      value={formData.currentAddress}
                      onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Student Other Details - Collapsible */}
              <div className="mb-6">
                <button
                  onClick={() => setShowOtherDetails(!showOtherDetails)}
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold flex justify-between items-center"
                >
                  <span>Student Other Details</span>
                  <span>{showOtherDetails ? '▲ Toggle Details' : '▼ Toggle Details'}</span>
                </button>

                {showOtherDetails && (
                  <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                    {/* Mother Information */}
                    <h4 className="text-sm font-bold text-purple-600 mb-4">MOTHER INFORMATION</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Mother Name</label>
                        <input
                          type="text"
                          placeholder="Mother Name"
                          value={formData.motherName}
                          onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Mother C.N.I.C #</label>
                        <input
                          type="text"
                          placeholder="Mother C.N.I.C #"
                          value={formData.motherCnic}
                          onChange={(e) => setFormData({ ...formData, motherCnic: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Mother Mobile</label>
                        <input
                          type="text"
                          placeholder="Enter Mother Mobile"
                          value={formData.motherMobile}
                          onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Mother Qualification</label>
                        <input
                          type="text"
                          placeholder="Enter Mother Qualification"
                          value={formData.motherQualification}
                          onChange={(e) => setFormData({ ...formData, motherQualification: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Guardian Information */}
                    <h4 className="text-sm font-bold text-orange-600 mb-4">GUARDIAN INFORMATION</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Guardian Name</label>
                        <input
                          type="text"
                          placeholder="Enter Guardian Name"
                          value={formData.guardianName}
                          onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Relation</label>
                        <select
                          value={formData.guardianRelation}
                          onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select Relation</option>
                          <option value="Uncle">Uncle</option>
                          <option value="Aunt">Aunt</option>
                          <option value="Grandparent">Grandparent</option>
                        </select>
                      </div>
                    </div>

                    {/* Emergency Contact Information */}
                    <h4 className="text-sm font-bold text-red-600 mb-4">EMERGENCY CONTACT INFORMATION</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Relation</label>
                        <select
                          value={formData.emergencyRelation}
                          onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select Relation</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Contact Name</label>
                        <input
                          type="text"
                          placeholder="Contact Name"
                          value={formData.emergencyContactName}
                          onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Phone(Landline)</label>
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Mobile Number</label>
                        <input
                          type="text"
                          placeholder="Mobile Number"
                          value={formData.emergencyMobile}
                          onChange={(e) => setFormData({ ...formData, emergencyMobile: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="block text-gray-700 text-sm mb-2">Address</label>
                      <input
                        type="text"
                        placeholder="Enter contact address"
                        value={formData.emergencyAddress}
                        onChange={(e) => setFormData({ ...formData, emergencyAddress: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Other Information */}
                    <h4 className="text-sm font-bold text-green-600 mb-4">OTHER INFORMATION</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">UTM Source</label>
                        <select
                          value={formData.utmSource}
                          onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select Source</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Admission Form Number</label>
                        <input
                          type="text"
                          placeholder="Admission Form No"
                          value={formData.admissionFormNo}
                          onChange={(e) => setFormData({ ...formData, admissionFormNo: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Register Serial No</label>
                        <input
                          type="text"
                          placeholder="Serial Number"
                          value={formData.registerSerialNo}
                          onChange={(e) => setFormData({ ...formData, registerSerialNo: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Previous Class</label>
                        <input
                          type="text"
                          placeholder="Class Name"
                          value={formData.previousClass}
                          onChange={(e) => setFormData({ ...formData, previousClass: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Previous School</label>
                        <select
                          value={formData.previousSchool}
                          onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select an option</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">
                          Region <span className="text-red-500">*</span>
                          <span className="text-blue-600 text-xs ml-1 cursor-pointer">Add New</span>
                        </label>
                        <select
                          value={formData.region}
                          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select Region</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Blood Group</label>
                        <select
                          value={formData.bloodGroup}
                          onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select an option</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Student Mobile</label>
                        <input
                          type="text"
                          placeholder="Student Mobile Number"
                          value={formData.studentMobile}
                          onChange={(e) => setFormData({ ...formData, studentMobile: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Birth Place</label>
                        <input
                          type="text"
                          placeholder="Birth Place"
                          value={formData.birthPlace}
                          onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Religion</label>
                        <select
                          value={formData.religion}
                          onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select Religion</option>
                          <option value="Islam">Islam</option>
                          <option value="Christianity">Christianity</option>
                          <option value="Hinduism">Hinduism</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Nationality</label>
                        <select
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select Nationality</option>
                          <option value="Pakistani">Pakistani</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm mb-2">Permanent Address</label>
                        <input
                          type="text"
                          placeholder="Enter Permanent Address"
                          value={formData.permanentAddress}
                          onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-2">Medical Problem</label>
                      <input
                        type="text"
                        placeholder="Enter Medical Problem"
                        value={formData.medicalProblem}
                        onChange={(e) => setFormData({ ...formData, medicalProblem: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-gray-200 px-6 py-5 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegisterSidebar(false)}
                  className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStudent}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {isEditMode ? 'Update' : 'Save'}
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
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
                  Are you sure you want to delete student <span className="font-bold text-red-600">{selectedStudent.name}</span>? This action cannot be undone.
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

      {/* View Student Modal */}
      {showViewModal && selectedStudent && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowViewModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Student Information</h3>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-white hover:bg-white/10 p-2 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Student Photo & Basic Info */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl">
                    {selectedStudent.avatar}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h4>
                    <p className="text-gray-600">Admission No: <span className="font-semibold">{selectedStudent.admNo}</span></p>
                  </div>
                </div>

                {/* Student Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Session</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.session}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Class</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.class}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Father Name</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.father}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Serial Number</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.sr}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      handleEdit(selectedStudent)
                    }}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 size={18} />
                    Edit
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
