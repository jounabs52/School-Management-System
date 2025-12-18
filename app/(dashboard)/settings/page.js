'use client'

import { useState, useEffect } from 'react'
import { Settings, CheckCircle, XCircle, AlertCircle, X, Building2, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [schoolData, setSchoolData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
    established_date: '',
    principal_name: '',
    website: '',
    status: 'active'
  })

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

  // Fetch school data when user is loaded
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchSchoolData()
    }
  }, [currentUser])

  const fetchSchoolData = async () => {
    if (!currentUser?.school_id || !supabase) return

    setLoading(true)

    try {
      const startTime = performance.now()

      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', currentUser.school_id)
        .single()

      const endTime = performance.now()
      console.log(`Fetch took ${endTime - startTime}ms`)

      if (error) throw error

      if (data) {
        setSchoolData({
          name: data.name || '',
          code: data.code || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          logo_url: data.logo_url || '',
          established_date: data.established_date || '',
          principal_name: data.principal_name || '',
          website: data.website || '',
          status: data.status || 'active'
        })
      }
    } catch (error) {
      console.error('Error fetching school data:', error)
      showToast('Error loading school data: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle logo file upload to Supabase Storage
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'warning')
      return
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      showToast('Image size should be less than 1MB', 'warning')
      return
    }

    try {
      setUploading(true)
      console.log('🔄 Starting logo upload...')

      // Delete old logo if exists
      if (schoolData.logo_url && schoolData.logo_url.includes('school-logos/')) {
        const oldFileName = schoolData.logo_url.split('school-logos/')[1].split('?')[0]
        console.log('🗑️ Deleting old logo:', oldFileName)

        const { error: deleteError } = await supabase.storage
          .from('school-logos')
          .remove([oldFileName])

        if (deleteError) {
          console.warn('Warning: Could not delete old logo:', deleteError)
        }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.school_id}_${Date.now()}.${fileExt}`
      console.log('📤 Uploading new logo:', fileName)

      // Upload to Supabase Storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('school-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw uploadError
      }

      console.log('✅ Upload successful:', uploadData)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('school-logos')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl
      console.log('🔗 Public URL:', publicUrl)

      // Update the logo URL in the database
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          logo_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.school_id)

      if (updateError) {
        console.error('❌ Database update error:', updateError)
        throw updateError
      }

      console.log('✅ Database updated successfully')

      // Update local state
      setSchoolData(prev => ({ ...prev, logo_url: publicUrl }))
      showToast('Logo uploaded successfully!', 'success')

    } catch (error) {
      console.error('❌ Error uploading logo:', error)
      showToast('Error uploading logo: ' + error.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Check if school status is active
    if (schoolData.status !== 'active') {
      showToast('Cannot update school data. School status is not active.', 'error')
      return
    }

    // Validate required fields
    if (!schoolData.name || !schoolData.code) {
      showToast('School name and code are required', 'warning')
      return
    }

    try {
      setSaving(true)

      // Update school data
      const { error } = await supabase
        .from('schools')
        .update({
          name: schoolData.name,
          code: schoolData.code,
          address: schoolData.address,
          phone: schoolData.phone,
          email: schoolData.email,
          logo_url: schoolData.logo_url,
          established_date: schoolData.established_date || null,
          principal_name: schoolData.principal_name,
          website: schoolData.website
        })
        .eq('id', currentUser.school_id)
        .eq('status', 'active') // Only update if status is active

      if (error) throw error

      showToast('School settings updated successfully!', 'success')

      // Refresh data
      await fetchSchoolData()
    } catch (error) {
      console.error('Error updating school data:', error)
      showToast('Error updating school settings: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle input changes
  const handleInputChange = (field, value) => {
    setSchoolData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading school data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 bg-gray-50 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">School Settings</h1>
            <p className="text-xs text-gray-600 leading-tight">Update your school information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            schoolData.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {schoolData.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Warning message if not active */}
      {schoolData.status !== 'active' && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 text-xs">School Not Active</h3>
            <p className="text-xs text-red-700">
              This school is currently {schoolData.status}. You cannot update settings unless the school status is active.
            </p>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-3">
          {/* Logo Section */}
          <div className="mb-3 pb-3 border-b border-gray-200">
            <h3 className="text-xs font-semibold mb-2 text-gray-700">SCHOOL LOGO</h3>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {schoolData.logo_url ? (
                  <div className="relative w-24 h-24 border-2 border-gray-300 rounded overflow-hidden bg-white">
                    <Image
                      src={schoolData.logo_url}
                      alt="School Logo"
                      fill
                      className="object-contain p-1"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Upload Logo
                </label>
                <div className="flex items-center gap-2">
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={schoolData.status !== 'active' || uploading}
                      className="hidden"
                      id="logo-upload"
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                      <Upload className="w-4 h-4 text-gray-600" />
                      <span className="text-xs text-gray-600">
                        {uploading ? 'Uploading...' : 'Choose Image'}
                      </span>
                    </div>
                  </label>
                  {uploading && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload image file (PNG, JPG, GIF) - Max 1MB
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700">BASIC INFORMATION</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                School Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={schoolData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={schoolData.status !== 'active'}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter school name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                School Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={schoolData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                disabled={schoolData.status !== 'active'}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter school code"
              />
            </div>
          </div>

          {/* Contact Information */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700 pt-2 border-t border-gray-200">CONTACT INFORMATION</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={schoolData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={schoolData.status !== 'active'}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={schoolData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={schoolData.status !== 'active'}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={schoolData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              disabled={schoolData.status !== 'active'}
              rows={2}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter school address"
            />
          </div>

          {/* Additional Information */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700 pt-2 border-t border-gray-200">ADDITIONAL INFORMATION</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Principal Name
              </label>
              <input
                type="text"
                value={schoolData.principal_name}
                onChange={(e) => handleInputChange('principal_name', e.target.value)}
                disabled={schoolData.status !== 'active'}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter principal name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Established Date
              </label>
              <input
                type="date"
                value={schoolData.established_date}
                onChange={(e) => handleInputChange('established_date', e.target.value)}
                disabled={schoolData.status !== 'active'}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={schoolData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                disabled={schoolData.status !== 'active'}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-3 pb-3 border-t border-gray-200 pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={fetchSchoolData}
            disabled={saving}
            className="px-4 py-1.5 text-xs text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving || schoolData.status !== 'active'}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            {saving ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3" />
                Update Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 min-w-[280px] max-w-md px-3 py-2 rounded shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1 text-xs font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
