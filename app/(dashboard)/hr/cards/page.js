'use client'

import { useState, useEffect } from 'react'
import { CreditCard, ChevronDown, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { convertImageToBase64 } from '@/lib/pdfUtils'

export default function StaffIDCardsPage() {
  const [validityUpto, setValidityUpto] = useState('')
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

      canvas.width = size
      canvas.height = size

      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      const img = new Image()
      img.onload = () => {
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

  // Generate QR Code
  const generateQRCode = async (text) => {
    try {
      return await QRCode.toDataURL(text, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      return null
    }
  }

  // Generate ID Card PDF
  const generateIDCardPDF = async () => {
    if (!staffData || !schoolData) {
      showToast('Missing required data', 'error')
      return
    }

    try {
      setSaving(true)

      // Load school logo if available
      let logoBase64 = null
      if (schoolData.logo) {
        logoBase64 = await convertImageToBase64(schoolData.logo)
      }

      // Create PDF - ID Card size (85.6mm x 53.98mm / 3.375" x 2.125")
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98]
      })

      const cardWidth = 85.6
      const cardHeight = 53.98

      // ========== FRONT SIDE ==========

      // White background
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, cardWidth, cardHeight, 'F')

      // Teal header background
      doc.setFillColor(0, 102, 102) // Teal color matching the image
      doc.rect(0, 0, cardWidth, 12, 'F')

      // School logo circle - left side of header
      if (logoBase64) {
        try {
          // White circle background for logo
          doc.setFillColor(255, 255, 255)
          doc.circle(6, 6, 4, 'F')

          // Add logo inside the circle
          const logoSize = 7
          const logoX = 6 - logoSize/2
          const logoY = 6 - logoSize/2

          let format = 'PNG'
          if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
            format = 'JPEG'
          }

          doc.addImage(logoBase64, format, logoX, logoY, logoSize, logoSize)
        } catch (error) {
          console.log('Could not add logo:', error)
          // Fallback to white circle
          doc.setFillColor(255, 255, 255)
          doc.circle(6, 6, 4, 'F')
        }
      } else {
        // Placeholder circle if no logo
        doc.setFillColor(255, 255, 255)
        doc.circle(6, 6, 4, 'F')
      }

      // School name in header
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const schoolName = schoolData.name?.toUpperCase() || 'SCHOOL NAME'
      doc.text(schoolName, cardWidth / 2, 7, { align: 'center' })

      // "STAFF ID CARD" subtitle
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('STAFF ID CARD', cardWidth / 2, 10.5, { align: 'center' })

      // Left side - Staff information
      const leftMargin = 5
      let yPos = 18

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')

      // Name
      doc.text('Name', leftMargin, yPos)
      doc.text(':', leftMargin + 20, yPos)
      doc.setFont('helvetica', 'bold')
      const staffName = `${staffData.first_name} ${staffData.last_name || ''}`
      doc.text(staffName, leftMargin + 22, yPos)

      // Employee No
      yPos += 5
      doc.setFont('helvetica', 'normal')
      doc.text('Employee No', leftMargin, yPos)
      doc.text(':', leftMargin + 20, yPos)
      doc.setFont('helvetica', 'bold')
      doc.text(staffData.employee_number || 'N/A', leftMargin + 22, yPos)

      // Designation
      yPos += 5
      doc.setFont('helvetica', 'normal')
      doc.text('Designation', leftMargin, yPos)
      doc.text(':', leftMargin + 20, yPos)
      doc.setFont('helvetica', 'bold')
      doc.text(staffData.designation || 'Staff', leftMargin + 22, yPos)

      // Joining Date (if available)
      if (staffData.joining_date) {
        yPos += 5
        doc.setFont('helvetica', 'normal')
        doc.text('Joining', leftMargin, yPos)
        doc.text(':', leftMargin + 20, yPos)
        doc.setFont('helvetica', 'bold')
        const joiningDate = new Date(staffData.joining_date).getFullYear()
        doc.text(joiningDate.toString(), leftMargin + 22, yPos)
      }

      // Right side - Photo (circular)
      const photoX = 60
      const photoY = 17
      const photoSize = 20

      if (staffData.photo_url) {
        try {
          const photoBase64 = await getImageAsBase64(staffData.photo_url)
          if (photoBase64) {
            const circularPhoto = await createCircularImage(photoBase64, 200)
            doc.addImage(circularPhoto, 'PNG', photoX, photoY, photoSize, photoSize)
          }
        } catch (error) {
          console.log('Could not load photo')
        }
      } else {
        // Placeholder circle
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.circle(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 'S')
      }

      // Expiry badge at bottom left
      doc.setFillColor(255, 140, 0) // Orange color
      doc.roundedRect(5, cardHeight - 10, 25, 6, 1, 1, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      const expiryDate = validityUpto ? new Date(validityUpto).toLocaleDateString('en-GB').replace(/\//g, '-') : '01-01-25'
      doc.text(`Expiry: ${expiryDate}`, 17.5, cardHeight - 6, { align: 'center' })

      // Issuing Authority text at bottom right
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text('Issuing Authority', cardWidth - 5, cardHeight - 3, { align: 'right' })

      // ========== BACK SIDE ==========
      doc.addPage()

      // White background
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, cardWidth, cardHeight, 'F')

      // Teal header background
      doc.setFillColor(0, 102, 102)
      doc.rect(0, 0, cardWidth, 12, 'F')

      // School logo circle - left side of header
      if (logoBase64) {
        try {
          // White circle background for logo
          doc.setFillColor(255, 255, 255)
          doc.circle(6, 6, 4, 'F')

          // Add logo inside the circle
          const logoSize = 7
          const logoX = 6 - logoSize/2
          const logoY = 6 - logoSize/2

          let format = 'PNG'
          if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
            format = 'JPEG'
          }

          doc.addImage(logoBase64, format, logoX, logoY, logoSize, logoSize)
        } catch (error) {
          console.log('Could not add logo on back:', error)
          // Fallback to white circle
          doc.setFillColor(255, 255, 255)
          doc.circle(6, 6, 4, 'F')
        }
      } else {
        // Placeholder circle if no logo
        doc.setFillColor(255, 255, 255)
        doc.circle(6, 6, 4, 'F')
      }

      // School name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(schoolName, cardWidth / 2, 8.5, { align: 'center' })

      // TERMS & CONDITIONS title
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('TERMS & CONDITIONS', cardWidth / 2, 18, { align: 'center' })

      // Terms bullets
      const termsX = 8
      let termsY = 24
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')

      const terms = [
        'This card is property of the institution.',
        'If found, should be returned posted to following',
        'address:',
        `Incharge: Institution Address,  ${schoolData.address || 'SCHOOL ADDRESS'}`,
        `Ph: ${schoolData.phone || '092341-407986'} Email: ${schoolData.email || 'info@institution.edu.pk'}`
      ]

      terms.forEach((term, index) => {
        if (index === 0 || index === 1) {
          doc.text('•', termsX, termsY)
          doc.text(term, termsX + 3, termsY)
          termsY += 4
        } else if (index === 2) {
          doc.text('•', termsX, termsY)
          doc.text(term, termsX + 3, termsY)
          termsY += 4
        } else {
          doc.setFontSize(5.5)
          doc.text(term, termsX + 3, termsY)
          termsY += 3.5
        }
      })

      // QR Code
      const qrData = `Staff ID: ${staffData.employee_number}\nName: ${staffName}\nSchool: ${schoolName}`
      const qrCode = await generateQRCode(qrData)

      if (qrCode) {
        const qrSize = 22
        const qrX = cardWidth - qrSize - 8
        const qrY = 20
        doc.addImage(qrCode, 'PNG', qrX, qrY, qrSize, qrSize)
      }

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
            <p className="text-sm text-gray-500">Generate professional staff identification cards</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">

          {/* Configuration Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

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
