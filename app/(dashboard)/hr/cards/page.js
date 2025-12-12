'use client'

import { useState, useEffect } from 'react'
import { CreditCard, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function StaffIDCardsPage() {
  const [template, setTemplate] = useState('Frontside (Portrait)')
  const [validityUpto, setValidityUpto] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#3b82f6')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [staffData, setStaffData] = useState(null)
  const [allStaff, setAllStaff] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Template options
  const templateOptions = [
    'Frontside (Portrait)',
    'Frontside (Landscape)',
    'Both Side (Portrait)',
    'Both Side (Landscape)'
  ]

  // Background color options
  const colorOptions = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Teal', value: '#14b8a6' }
  ]

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

    // Set default validity date to 1 year from now
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    setValidityUpto(nextYear.toISOString().split('T')[0])
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
        .eq('status', 'active')
        .order('first_name', { ascending: true })

      if (error) throw error
      setAllStaff(data || [])
      setFilteredStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
      alert('Error loading staff data')
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

  // Save ID card to database and print
  const handlePrint = async () => {
    if (!staffData) {
      alert('Please select a staff member first')
      return
    }

    if (!validityUpto) {
      alert('Please select validity date')
      return
    }

    try {
      setSaving(true)

      // Generate card number
      const cardNumber = `ID-${Date.now()}-${staffData.employee_number}`

      // Generate barcode
      const barcode = `${staffData.school_id}-${staffData.employee_number}-${Date.now()}`

      // Save to database
      const { error } = await supabase
        .from('staff_id_cards')
        .insert({
          staff_id: staffData.id,
          school_id: currentUser.school_id,
          card_number: cardNumber,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: validityUpto,
          status: 'active',
          barcode: barcode,
          issued_by: currentUser.id
        })

      if (error) throw error

      // Print the ID card
      printIDCard()
    } catch (error) {
      console.error('Error saving ID card:', error)
      alert('Error saving ID card: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Print ID card
  const printIDCard = () => {
    const printContent = `
      <html>
        <head>
          <title>Staff ID Card</title>
          <style>
            @page {
              margin: 0;
              size: 3.375in 2.125in; /* Standard CR80 card size */
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            .id-card {
              width: 3.375in;
              height: 2.125in;
              background: ${backgroundColor};
              position: relative;
              overflow: hidden;
              page-break-after: always;
            }
            .card-header {
              background: rgba(255, 255, 255, 0.95);
              padding: 10px;
              text-align: center;
              border-bottom: 3px solid rgba(0, 0, 0, 0.1);
            }
            .school-name {
              font-size: 14px;
              font-weight: bold;
              color: #1f2937;
              margin: 0;
            }
            .card-title {
              font-size: 10px;
              color: #6b7280;
              margin: 2px 0 0 0;
            }
            .card-body {
              padding: 15px;
              color: white;
            }
            .photo-section {
              float: left;
              width: 70px;
              height: 70px;
              background: white;
              border-radius: 5px;
              margin-right: 15px;
              overflow: hidden;
              border: 2px solid white;
            }
            .photo-section img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #e5e7eb;
              color: #9ca3af;
              font-size: 10px;
            }
            .info-section {
              overflow: hidden;
            }
            .info-row {
              margin-bottom: 5px;
            }
            .info-label {
              font-size: 8px;
              opacity: 0.8;
              text-transform: uppercase;
            }
            .info-value {
              font-size: 11px;
              font-weight: bold;
              margin-top: 2px;
            }
            .card-footer {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              background: rgba(0, 0, 0, 0.3);
              padding: 5px 10px;
              text-align: center;
            }
            .validity {
              font-size: 8px;
              color: white;
              margin: 0;
            }
            .barcode {
              font-family: 'Courier New', monospace;
              font-size: 8px;
              letter-spacing: 1px;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="card-header">
              <h1 class="school-name">School Management System</h1>
              <p class="card-title">STAFF IDENTITY CARD</p>
            </div>

            <div class="card-body">
              <div class="photo-section">
                ${staffData.photo_url
                  ? `<img src="${staffData.photo_url}" alt="Staff Photo" />`
                  : `<div class="photo-placeholder">NO PHOTO</div>`
                }
              </div>

              <div class="info-section">
                <div class="info-row">
                  <div class="info-label">Name</div>
                  <div class="info-value">${staffData.first_name} ${staffData.last_name || ''}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Employee ID</div>
                  <div class="info-value">${staffData.employee_number}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Designation</div>
                  <div class="info-value">${staffData.designation || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <p class="validity">Valid Until: ${new Date(validityUpto).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p class="barcode">${staffData.school_id}-${staffData.employee_number}</p>
            </div>
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
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Identity Cards</h1>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Staff Selection */}
        <div className="mb-6">
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
                      {staff.employee_number} " {staff.designation || 'N/A'}
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

        {/* ID Card Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template <span className="text-red-500">*</span>
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {templateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Validity Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validity Upto
            </label>
            <input
              type="date"
              value={validityUpto}
              onChange={(e) => setValidityUpto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background
            </label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBackgroundColor(color.value)}
                  className={`w-10 h-10 rounded border-2 transition-all ${
                    backgroundColor === color.value
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Staff Information Preview */}
        {staffData && (
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              SELECTED STAFF MEMBER
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </div>
        )}

        {/* Print Button */}
        <div className="flex justify-start">
          <button
            onClick={handlePrint}
            disabled={saving || !staffData}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-5 h-5" />
            {saving ? 'Saving & Printing...' : 'Print'}
          </button>
        </div>

        {/* No Data Message */}
        {!staffData && !loading && allStaff.length > 0 && (
          <div className="text-center py-12 text-gray-500 mt-6">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Select a staff member to generate ID card</p>
            <p className="text-sm mt-2">Total Active Staff: {allStaff.length}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg">Loading staff data...</p>
          </div>
        )}
      </div>
    </div>
  )
}
