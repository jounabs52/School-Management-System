'use client'

import { useState, useEffect } from 'react'
import { FileText, ChevronDown, CheckCircle, XCircle, AlertCircle, X, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'

export default function HRCertificatesPage() {
  const [certificateType, setCertificateType] = useState('experience')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [staffData, setStaffData] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [allStaff, setAllStaff] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const [showAddNewType, setShowAddNewType] = useState(false)
  const [newCertificateType, setNewCertificateType] = useState('')
  const [certificateTypes, setCertificateTypes] = useState([
    { value: 'experience', label: 'Experience Certificate', dbSafe: true },
    { value: 'relieving', label: 'Relieving Certificate', dbSafe: true },
    { value: 'appreciation', label: 'Appreciation Certificate', dbSafe: true }
  ])

  // Toast notification function
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

  // Get current user from cookie
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

  // Fetch school and staff data when user is loaded
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchSchoolData()
      fetchAllStaff()
    }
  }, [currentUser])

  // Filter staff based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStaff(allStaff)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = allStaff.filter(staff => {
        const fullName = `${staff.first_name} ${staff.last_name || ''}`.toLowerCase()
        const empNumber = staff.employee_number.toLowerCase()
        return fullName.includes(query) || empNumber.includes(query)
      })
      setFilteredStaff(filtered)
    }
  }, [searchQuery, allStaff])

  // Fetch school data
  const fetchSchoolData = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      if (error) throw error
      setSchoolData(data)
    } catch (error) {
      console.error('Error fetching school data:', error)
      showToast('Error loading school data', 'error')
    }
  }

  // Fetch all staff from database
  const fetchAllStaff = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('first_name', { ascending: true })

      if (error) throw error
      setAllStaff(data || [])
      setFilteredStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
      showToast('Error loading staff data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle staff selection
  const handleStaffSelect = (staff) => {
    setStaffData(staff)
    setSelectedStaffId(staff.id)
    setSearchQuery(`${staff.first_name} ${staff.last_name || ''} (${staff.employee_number})`)
    setShowDropdown(false)
  }

  // Handle adding new certificate type
  const handleAddNewType = () => {
    if (newCertificateType.trim()) {
      const value = newCertificateType.toLowerCase().replace(/\s+/g, '_')
      const newType = {
        value: value,
        label: newCertificateType.trim(),
        dbSafe: false // Custom types won't be saved to database
      }
      setCertificateTypes([...certificateTypes, newType])
      setCertificateType(value)
      setNewCertificateType('')
      setShowAddNewType(false)
      showToast('New certificate type added successfully', 'success')
    }
  }

  // Generate PDF Certificate
  const generatePDFCertificate = () => {
    if (!staffData || !schoolData) return

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - (2 * margin)

    // Draw decorative border
    doc.setLineWidth(1)
    doc.setDrawColor(139, 69, 19) // Brown color
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S')
    
    doc.setLineWidth(0.5)
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S')

    // Draw corner decorations (simple ornamental corners)
    const drawCornerDecoration = (x, y, flipX = 1, flipY = 1) => {
      doc.setDrawColor(139, 69, 19)
      doc.setLineWidth(0.3)
      
      // Curved corner design
      for (let i = 0; i < 3; i++) {
        const offset = i * 2
        doc.line(x, y + (offset * flipY), x + (10 * flipX), y + (offset * flipY))
        doc.line(x + (offset * flipX), y, x + (offset * flipX), y + (10 * flipY))
      }
    }

    drawCornerDecoration(15, 15, 1, 1)
    drawCornerDecoration(pageWidth - 15, 15, -1, 1)
    drawCornerDecoration(15, pageHeight - 15, 1, -1)
    drawCornerDecoration(pageWidth - 15, pageHeight - 15, -1, -1)

    // Header - Certificate Title
    doc.setFont('times', 'bold')
    doc.setFontSize(28)
    doc.setTextColor(139, 69, 19)
    const certificateTypeLabel = certificateTypes.find(ct => ct.value === certificateType)?.label || certificateType
    doc.text('Certificate', pageWidth / 2, 35, { align: 'center' })

    // School Name
    doc.setFontSize(18)
    doc.setTextColor(0, 0, 0)
    doc.text(schoolData.name || 'YOUR SCHOOL NAME HERE', pageWidth / 2, 48, { align: 'center' })

    // School Details
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const schoolDetails = []
    if (schoolData.address) schoolDetails.push(schoolData.address)
    if (schoolData.phone) schoolDetails.push(`Phone: ${schoolData.phone}`)
    if (schoolData.email) schoolDetails.push(`Email: ${schoolData.email}`)
    
    if (schoolDetails.length > 0) {
      doc.text(schoolDetails.join(' | '), pageWidth / 2, 55, { align: 'center' })
    }

    // Divider line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margin + 10, 60, pageWidth - margin - 10, 60)

    // Certificate Type
    doc.setFont('times', 'italic')
    doc.setFontSize(16)
    doc.setTextColor(139, 69, 19)
    doc.text(certificateTypeLabel, pageWidth / 2, 70, { align: 'center' })

    // Main Content
    const startY = 85
    doc.setFont('times', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)

    // Certificate text with actual data
    const joiningDate = staffData.joining_date 
      ? new Date(staffData.joining_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A'
    
    const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

    let certificateText = ''
    
    if (certificateType === 'experience') {
      certificateText = `This is to certify that ${staffData.first_name} ${staffData.last_name || ''}, ${staffData.father_name ? `S/o ${staffData.father_name}` : ''} has worked with ${schoolData.name} as ${staffData.designation || 'Staff Member'} in the ${staffData.department || 'General'} department from ${joiningDate} to ${currentDate}.`
    } else if (certificateType === 'relieving') {
      certificateText = `This is to certify that ${staffData.first_name} ${staffData.last_name || ''}, Employee Number: ${staffData.employee_number}, has been relieved from their duties as ${staffData.designation || 'Staff Member'} at ${schoolData.name} effective ${currentDate}. During their tenure from ${joiningDate}, they have cleared all dues and obligations.`
    } else if (certificateType === 'appreciation') {
      certificateText = `This certificate is presented to ${staffData.first_name} ${staffData.last_name || ''} in recognition of their outstanding contribution and dedicated service as ${staffData.designation || 'Staff Member'} at ${schoolData.name}. Their commitment and excellence have significantly contributed to our institution's success.`
    } else {
      // For custom certificate types
      certificateText = `This is to certify that ${staffData.first_name} ${staffData.last_name || ''} has been associated with ${schoolData.name} as ${staffData.designation || 'Staff Member'}. This ${certificateTypeLabel} is issued as per their request and in recognition of their valuable contribution to our institution.`
    }

    // Text wrapping
    const lines = doc.splitTextToSize(certificateText, contentWidth - 40)
    doc.text(lines, pageWidth / 2, startY, { align: 'center', maxWidth: contentWidth - 40 })

    // Staff Information in Paragraph Format with Underlined Data
    const infoY = startY + (lines.length * 7) + 15
    doc.setFontSize(11)
    doc.setFont('times', 'normal')
    doc.setTextColor(0, 0, 0)
    
    // Line 1: Name and Father Name
    let currentY = infoY
    const leftMargin = margin + 20
    
    doc.text('Name: ', leftMargin, currentY)
    const nameX = leftMargin + doc.getTextWidth('Name: ')
    const staffName = `${staffData.first_name} ${staffData.last_name || ''}`
    doc.text(staffName, nameX, currentY)
    // Underline name
    doc.line(nameX, currentY + 1, nameX + doc.getTextWidth(staffName), currentY + 1)
    
    // Father name on same line
    const fatherLabelX = nameX + doc.getTextWidth(staffName) + 15
    doc.text("Father's Name: ", fatherLabelX, currentY)
    const fatherNameX = fatherLabelX + doc.getTextWidth("Father's Name: ")
    const fatherName = staffData.father_name || 'N/A'
    doc.text(fatherName, fatherNameX, currentY)
    // Underline father name
    doc.line(fatherNameX, currentY + 1, fatherNameX + doc.getTextWidth(fatherName), currentY + 1)
    
    // Line 2: Designation and Department
    currentY += 8
    doc.text('Designation: ', leftMargin, currentY)
    const desigX = leftMargin + doc.getTextWidth('Designation: ')
    const designation = staffData.designation || 'N/A'
    doc.text(designation, desigX, currentY)
    // Underline designation
    doc.line(desigX, currentY + 1, desigX + doc.getTextWidth(designation), currentY + 1)
    
    // Department on same line
    const deptLabelX = desigX + doc.getTextWidth(designation) + 15
    doc.text('Department: ', deptLabelX, currentY)
    const deptX = deptLabelX + doc.getTextWidth('Department: ')
    const department = staffData.department || 'N/A'
    doc.text(department, deptX, currentY)
    // Underline department
    doc.line(deptX, currentY + 1, deptX + doc.getTextWidth(department), currentY + 1)
    
    // Line 3: Employee Number and Joining Date
    currentY += 8
    doc.text('Employee Number: ', leftMargin, currentY)
    const empX = leftMargin + doc.getTextWidth('Employee Number: ')
    const empNumber = staffData.employee_number
    doc.text(empNumber, empX, currentY)
    // Underline employee number
    doc.line(empX, currentY + 1, empX + doc.getTextWidth(empNumber), currentY + 1)
    
    // Joining Date on same line
    const joinLabelX = empX + doc.getTextWidth(empNumber) + 15
    doc.text('Joining Date: ', joinLabelX, currentY)
    const joinX = joinLabelX + doc.getTextWidth('Joining Date: ')
    doc.text(joiningDate, joinX, currentY)
    // Underline joining date
    doc.line(joinX, currentY + 1, joinX + doc.getTextWidth(joiningDate), currentY + 1)
    
    // Line 4: Issue Date
    currentY += 8
    doc.text('Issue Date: ', leftMargin, currentY)
    const issueX = leftMargin + doc.getTextWidth('Issue Date: ')
    doc.text(currentDate, issueX, currentY)
    // Underline issue date
    doc.line(issueX, currentY + 1, issueX + doc.getTextWidth(currentDate), currentY + 1)

    
    // Signature Section
    const sigY = currentY + 25  // Position after the paragraph info
    doc.setFont('times', 'normal')
    doc.setFontSize(10)

    // Date
    doc.text(`Date: ${currentDate}`, margin + 20, sigY)

    // Signature line and Principal info
    const sigX = pageWidth - margin - 70
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(sigX, sigY - 2, sigX + 50, sigY - 2)
    
    doc.setFont('times', 'bold')
    doc.text("Principal's Signature", sigX + 5, sigY + 5)
    
    if (schoolData.principal_name) {
      doc.setFont('times', 'normal')
      doc.text(schoolData.principal_name, sigX + 5, sigY + 10)
    }

    // Footer
    doc.setFontSize(8)
    doc.setFont('times', 'italic')
    doc.setTextColor(150, 150, 150)
    doc.text('This is a computer-generated certificate and does not require a physical signature.', 
      pageWidth / 2, pageHeight - 15, { align: 'center' })

    // Certificate Number (rotated text on side)
    const certNumber = `CERT-${Date.now()}-${staffData.employee_number}`
    doc.setFontSize(7)
    doc.text(certNumber, 8, pageHeight / 2, { angle: 90, align: 'center' })

    // Save PDF
    const fileName = `${certificateTypeLabel.replace(/\s+/g, '_')}_${staffData.first_name}_${staffData.last_name}_${Date.now()}.pdf`
    doc.save(fileName)
  }

  // Save certificate to database and generate PDF
  const handleGenerateCertificate = async () => {
    if (!staffData) {
      showToast('Please select a staff member first', 'warning')
      return
    }

    if (!schoolData) {
      showToast('School data not loaded', 'error')
      return
    }

    // Check if the selected certificate type can be saved to database
    const currentType = certificateTypes.find(ct => ct.value === certificateType)
    const isDbSafe = currentType?.dbSafe || false

    try {
      setSaving(true)

      // Generate certificate number
      const certificateNumber = `CERT-${Date.now()}-${staffData.employee_number}`

      // Only save to database if it's a valid database type
      if (isDbSafe) {
        const { error } = await supabase
          .from('staff_certificates')
          .insert({
            staff_id: staffData.id,
            school_id: currentUser.school_id,
            certificate_type: certificateType, // Only 'experience', 'relieving', 'appreciation'
            issue_date: new Date().toISOString().split('T')[0],
            issued_by: currentUser.username || currentUser.email,
            certificate_number: certificateNumber,
            created_by: currentUser.id
          })

        if (error) throw error
        showToast('Certificate saved to database successfully!', 'success')
      } else {
        // For custom types, just show a message
        showToast('Custom certificate type - PDF only (not saved to database)', 'info')
      }
      
      // Generate PDF for all types (including custom)
      generatePDFCertificate()
      
      showToast('PDF certificate generated successfully!', 'success')
    } catch (error) {
      console.error('Error saving certificate:', error)
      showToast('Error saving certificate: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Staff Certificates</h1>
            <p className="text-sm text-gray-500">Generate and manage staff certificates</p>
          </div>
        </div>
      </div>

      {/* Main Content - Compact */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          
          {/* Certificate Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            
            {/* Certificate Type Dropdown with Add New */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Certificate Type
              </label>
              <div className="flex gap-2">
                <select
                  value={certificateType}
                  onChange={(e) => {
                    if (e.target.value === 'add_new') {
                      setShowAddNewType(true)
                    } else {
                      setCertificateType(e.target.value)
                    }
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  {certificateTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                  <option value="add_new">+ Add New Type</option>
                </select>
              </div>

              {/* Add New Type Input */}
              {showAddNewType && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter new certificate type"
                      value={newCertificateType}
                      onChange={(e) => setNewCertificateType(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewType()}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleAddNewType}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowAddNewType(false)
                        setNewCertificateType('')
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Custom types will generate PDF only (not saved to database)
                  </p>
                </div>
              )}
            </div>

            {/* Staff Search Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Staff Member
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or employee number"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                {/* Dropdown List */}
                {showDropdown && filteredStaff.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                    {filteredStaff.map((staff) => (
                      <button
                        key={staff.id}
                        onClick={() => handleStaffSelect(staff)}
                        className="w-full px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900 text-sm">
                          {staff.first_name} {staff.last_name || ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          {staff.employee_number} • {staff.designation || 'N/A'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && searchQuery && filteredStaff.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm z-50">
                    No staff member found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Certificate Information - Compact Grid */}
          {staffData && (
            <>
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
                  Certificate Information
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={`${staffData.first_name} ${staffData.last_name || ''}`}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Father Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Father Name
                    </label>
                    <input
                      type="text"
                      value={staffData.father_name || 'N/A'}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={staffData.designation || 'N/A'}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={staffData.department || 'N/A'}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Employee Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employee #
                    </label>
                    <input
                      type="text"
                      value={staffData.employee_number}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="text"
                      value={
                        staffData.joining_date
                          ? new Date(staffData.joining_date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'N/A'
                      }
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  {/* Issue Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="text"
                      value={new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Generate Button - Red */}
              <div className="flex justify-start pt-2">
                <button
                  onClick={handleGenerateCertificate}
                  disabled={saving}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <FileText className="w-5 h-5" />
                  {saving ? 'Generating...' : 'Generate Certificate PDF'}
                </button>
              </div>
            </>
          )}

          {/* No Data Message */}
          {!staffData && !loading && allStaff.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Select a staff member to generate certificate</p>
              <p className="text-xs mt-1.5">Total Staff: {allStaff.length}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
              <p className="text-sm">Loading staff data...</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 min-w-[300px] max-w-md px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' :
              toast.type === 'warning' ? 'bg-amber-600' :
              'bg-blue-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}