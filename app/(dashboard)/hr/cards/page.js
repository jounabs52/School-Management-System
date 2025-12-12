'use client'

import { useState, useEffect } from 'react'
import { CreditCard, ChevronDown, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import JsBarcode from 'jsbarcode'

export default function StaffIDCardsPage() {
  const [validityUpto, setValidityUpto] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#2c5282')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [staffData, setStaffData] = useState(null)
  const [schoolData, setSchoolData] = useState(null)
  const [allStaff, setAllStaff] = useState([])
  const [filteredStaff, setFilteredStaff] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])

  // Background color options
  const colorOptions = [
    { name: 'Navy Blue', value: '#2c5282' },
    { name: 'Dark Blue', value: '#1e3a8a' },
    { name: 'Teal', value: '#0f766e' },
    { name: 'Purple', value: '#6b21a8' },
    { name: 'Green', value: '#065f46' },
    { name: 'Red', value: '#991b1b' }
  ]

  // Toast notification
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

  // Get current user
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

  // Fetch school and staff data
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchSchoolData()
      fetchAllStaff()
    }
  }, [currentUser])

  // Filter staff
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

  // Fetch all staff
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

  // Generate Barcode as Base64
  const generateBarcode = (text) => {
    try {
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 14,
        margin: 0
      })
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error generating barcode:', error)
      return null
    }
  }

  // Convert image URL to base64
  const getImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error converting image:', error)
      return null
    }
  }

  // Create circular image from base64
  const createCircularImage = (base64Image, size) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Set canvas size
      canvas.width = size
      canvas.height = size
      
      // Create circular clipping path
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      
      // Draw image
      const img = new Image()
      img.onload = () => {
        // Calculate dimensions to cover the circle (crop to fit)
        const scale = Math.max(size / img.width, size / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (size - scaledWidth) / 2
        const y = (size - scaledHeight) / 2
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = base64Image
    })
  }

  // Generate ID Card PDF
  const generateIDCardPDF = async () => {
    if (!staffData || !schoolData) {
      showToast('Missing required data', 'error')
      return
    }

    try {
      setSaving(true)

      // Create PDF - ID Card size (85.6mm x 53.98mm / 3.375" x 2.125")
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98]
      })

      const cardWidth = 85.6
      const cardHeight = 53.98

      // Background color with rounded corners effect
      doc.setFillColor(backgroundColor)
      doc.rect(0, 0, cardWidth, cardHeight, 'F')

      // Header section with school name
      doc.setFillColor(backgroundColor)
      doc.roundedRect(2, 2, cardWidth - 4, 15, 2, 2, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      const schoolName = schoolData.name?.toUpperCase() || 'SCHOOL NAME'
      doc.text(schoolName, cardWidth / 2, 8, { align: 'center' })
      
      // "STAFF ID CARD" text in gold/yellow
      doc.setTextColor(218, 165, 32) // Gold color
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('STAFF ID CARD', cardWidth / 2, 14, { align: 'center' })

      // White background for content area
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(2, 18, cardWidth - 4, cardHeight - 20, 2, 2, 'F')

      // Photo circle with gold border
      const photoX = 10
      const photoY = 23
      const photoSize = 18
      const photoRadius = photoSize / 2
      const photoCenterX = photoX + photoRadius
      const photoCenterY = photoY + photoRadius

      // Add staff photo if available with circular clipping
      if (staffData.photo_url) {
        try {
          const photoBase64 = await getImageAsBase64(staffData.photo_url)
          if (photoBase64) {
            // Create circular version of the image
            const circularPhoto = await createCircularImage(photoBase64, 200) // High res for quality
            
            // Add the circular image
            doc.addImage(circularPhoto, 'PNG', photoX, photoY, photoSize, photoSize)
          }
        } catch (error) {
          console.log('Could not load photo, using placeholder')
        }
      }

      // Gold circle border (drawn after photo to create clean edge)
      doc.setDrawColor(184, 134, 11) // Dark gold
      doc.setLineWidth(1.8)
      doc.circle(photoCenterX, photoCenterY, photoRadius, 'S')

      // Staff Name below photo in gold
      doc.setTextColor(184, 134, 11) // Gold
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const staffName = `${staffData.first_name} ${staffData.last_name || ''}`.toUpperCase()
      doc.text(staffName, photoX + photoSize / 2, photoY + photoSize + 4, { align: 'center' })

      // Right side information
      const infoX = 32
      let infoY = 24

      doc.setTextColor(100, 100, 100)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')

      // ID Number
      doc.text('ID Number:', infoX, infoY)
      doc.setTextColor(30, 58, 138) // Dark blue
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(staffData.employee_number, infoX + 20, infoY)

      // Father's Name
      infoY += 6
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text("Father's Name:", infoX, infoY)
      doc.setTextColor(30, 58, 138)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const fatherName = staffData.father_name || 'N/A'
      doc.text(fatherName, infoX + 20, infoY)

      // Issue Date
      infoY += 6
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text('Issue Date:', infoX, infoY)
      doc.setTextColor(30, 58, 138)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const issueDate = new Date().toLocaleDateString('en-GB')
      doc.text(issueDate, infoX + 20, infoY)

      // Expiry Date
      infoY += 6
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text('Expiry Date:', infoX, infoY)
      doc.setTextColor(30, 58, 138)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const expiryDate = validityUpto ? new Date(validityUpto).toLocaleDateString('en-GB') : 'N/A'
      doc.text(expiryDate, infoX + 20, infoY)

      // Generate and add barcode
      const barcodeBase64 = generateBarcode(staffData.employee_number)
      if (barcodeBase64) {
        doc.addImage(barcodeBase64, 'PNG', 7, cardHeight - 12, 30, 8)
      }

      // Principal's Signature text
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'italic')
      doc.text("Principal's Signature", cardWidth - 5, cardHeight - 3, { align: 'right' })

      // Save PDF
      const fileName = `Staff_ID_Card_${staffData.employee_number}_${Date.now()}.pdf`
      doc.save(fileName)

      // Save to database
      await saveIDCardRecord()

      showToast('ID Card generated successfully!', 'success')
    } catch (error) {
      console.error('Error generating ID card:', error)
      showToast('Error generating ID card: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Save ID card record to database
  const saveIDCardRecord = async () => {
    try {
      const cardNumber = `ID-${staffData.employee_number}-${Date.now()}`
      
      const { error } = await supabase
        .from('staff_id_cards')
        .insert({
          staff_id: staffData.id,
          school_id: currentUser.school_id,
          card_number: cardNumber,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: validityUpto,
          status: 'active',
          issued_by: currentUser.id
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving ID card record:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Staff ID Cards</h1>
            <p className="text-sm text-gray-500">Generate staff identification cards</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          
          {/* Configuration Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            
            {/* Staff Search */}
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

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

            {/* Background Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Card Background Color
              </label>
              <select
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {colorOptions.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Validity Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Valid Until
              </label>
              <input
                type="date"
                value={validityUpto}
                onChange={(e) => setValidityUpto(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Staff Information Display */}
          {staffData && (
            <>
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
                  Staff Information
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={`${staffData.first_name} ${staffData.last_name || ''}`}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Employee Number
                    </label>
                    <input
                      type="text"
                      value={staffData.employee_number}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      value={staffData.father_name || 'N/A'}
                      readOnly
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 text-gray-700 text-sm"
                    />
                  </div>

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
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-start pt-2">
                <button
                  onClick={generateIDCardPDF}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <CreditCard className="w-5 h-5" />
                  {saving ? 'Generating...' : 'Generate ID Card PDF'}
                </button>
              </div>
            </>
          )}

          {/* No Data Message */}
          {!staffData && !loading && allStaff.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Select a staff member to generate ID card</p>
              <p className="text-xs mt-1.5">Total Staff: {allStaff.length}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
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