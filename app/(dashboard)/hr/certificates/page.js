'use client'

import { useState, useEffect } from 'react'
import { FileText, ChevronDown, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function HRCertificatesPage() {
  const [certificateType, setCertificateType] = useState('experience')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [staffData, setStaffData] = useState(null)
  const [allStaff, setAllStaff] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])

  // Certificate types matching database schema
  const certificateTypes = [
    { value: 'experience', label: 'Experience Certificate' },
    { value: 'relieving', label: 'Relieving Certificate' },
    { value: 'appreciation', label: 'Appreciation Certificate' }
  ]

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

  // Fetch all staff when user is loaded
  useEffect(() => {
    if (currentUser?.school_id) {
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

  // Save certificate to database and print
  const handlePrint = async () => {
    if (!staffData) {
      showToast('Please select a staff member first', 'warning')
      return
    }

    try {
      setSaving(true)

      // Generate certificate number
      const certificateNumber = `CERT-${Date.now()}-${staffData.employee_number}`

      // Save to database
      const { error } = await supabase
        .from('staff_certificates')
        .insert({
          staff_id: staffData.id,
          school_id: currentUser.school_id,
          certificate_type: certificateType,
          issue_date: new Date().toISOString().split('T')[0],
          issued_by: currentUser.username || currentUser.email,
          certificate_number: certificateNumber,
          created_by: currentUser.id
        })

      if (error) throw error

      showToast('Certificate saved successfully!', 'success')
      // Print the certificate
      printCertificate()
    } catch (error) {
      console.error('Error saving certificate:', error)
      showToast('Error saving certificate: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Print certificate
  const printCertificate = () => {
    const certificateTypeLabel = certificateTypes.find(ct => ct.value === certificateType)?.label || certificateType

    const printContent = `
      <html>
        <head>
          <title>${certificateTypeLabel}</title>
          <style>
            @page { margin: 40px; }
            body {
              font-family: 'Times New Roman', Times, serif;
              padding: 60px;
              line-height: 1.8;
            }
            .certificate {
              border: 15px solid #1e40af;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              position: relative;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .title {
              font-size: 32px;
              font-weight: bold;
              color: #1e40af;
              text-transform: uppercase;
              margin-bottom: 10px;
              letter-spacing: 2px;
            }
            .subtitle {
              font-size: 18px;
              color: #666;
              margin-bottom: 30px;
            }
            .content {
              font-size: 16px;
              text-align: justify;
              margin-bottom: 40px;
              color: #333;
            }
            .info {
              margin: 20px 0;
            }
            .info-label {
              font-weight: bold;
              display: inline-block;
              width: 150px;
            }
            .footer {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }
            .signature {
              text-align: center;
            }
            .signature-line {
              border-top: 2px solid #000;
              width: 200px;
              margin-top: 50px;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <div class="title">${certificateTypeLabel}</div>
              <div class="subtitle">This is to certify that</div>
            </div>

            <div class="content">
              <div class="info">
                <span class="info-label">Name:</span>
                <span>${staffData.first_name} ${staffData.last_name || ''}</span>
              </div>
              <div class="info">
                <span class="info-label">Father's Name:</span>
                <span>${staffData.father_name || 'N/A'}</span>
              </div>
              <div class="info">
                <span class="info-label">Employee Number:</span>
                <span>${staffData.employee_number}</span>
              </div>
              <div class="info">
                <span class="info-label">Designation:</span>
                <span>${staffData.designation || 'N/A'}</span>
              </div>
              <div class="info">
                <span class="info-label">Department:</span>
                <span>${staffData.department || 'N/A'}</span>
              </div>
              <div class="info">
                <span class="info-label">Joining Date:</span>
                <span>${staffData.joining_date ? new Date(staffData.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
              </div>
              <div class="info">
                <span class="info-label">Issue Date:</span>
                <span>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            <p style="margin-top: 30px; font-size: 16px; text-align: justify;">
              This is to certify that the above-mentioned person has been serving in our institution
              with utmost dedication and sincerity. During the tenure, the conduct and performance
              have been found satisfactory in all respects.
            </p>

            <p style="margin-top: 20px; font-size: 16px; text-align: justify;">
              We wish success in all future endeavors.
            </p>

            <div class="footer">
              <div class="signature">
                <div class="signature-line">
                  Authorized Signature
                </div>
              </div>
              <div class="signature">
                <div class="signature-line">
                  Principal/Director
                </div>
              </div>
            </div>

            <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
              Issued on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-600 rounded-lg">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Certificates</h1>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Search Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Certificate Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate Type
            </label>
            <select
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {certificateTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Selection Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

              {/* Dropdown List */}
              {showDropdown && filteredStaff.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                  {filteredStaff.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => handleStaffSelect(staff)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {staff.first_name} {staff.last_name || ''}
                      </div>
                      <div className="text-sm text-gray-500">
                        {staff.employee_number} • {staff.designation || 'N/A'}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && searchQuery && filteredStaff.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 z-50">
                  No staff member found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Certificate Information */}
        {staffData && (
          <>
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                CERTIFICATE INFORMATION
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={`${staffData.first_name} ${staffData.last_name || ''}`}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-700"
                  />
                </div>

                {/* Father Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Father Name
                  </label>
                  <input
                    type="text"
                    value={staffData.father_name || 'N/A'}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-700"
                  />
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-700"
                  />
                </div>

                {/* Issue Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-700"
                  />
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={staffData.designation || 'N/A'}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={staffData.department || 'N/A'}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Employee Number
                  </label>
                  <input
                    type="text"
                    value={staffData.employee_number}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Print Button */}
            <div className="flex justify-start">
              <button
                onClick={handlePrint}
                disabled={saving}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-5 h-5" />
                {saving ? 'Saving & Printing...' : 'Save & Print'}
              </button>
            </div>
          </>
        )}

        {/* No Data Message */}
        {!staffData && !loading && allStaff.length > 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Select a staff member to generate certificate</p>
            <p className="text-sm mt-2">Total Staff: {allStaff.length}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg">Loading staff data...</p>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 min-w-[320px] max-w-md px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-blue-500' :
              toast.type === 'error' ? 'bg-blue-600' :
              toast.type === 'warning' ? 'bg-blue-500' :
              'bg-blue-500'
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
