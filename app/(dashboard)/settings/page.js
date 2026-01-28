'use client'

import { useState, useEffect } from 'react'
import { Settings, CheckCircle, XCircle, AlertCircle, X, Building2, Upload, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import Image from 'next/image'
import StaffManagement from '@/components/StaffManagement'
import PermissionGuard from '@/components/PermissionGuard'

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [userPermissions, setUserPermissions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState(null) // Will be set based on permissions
  const [imageError, setImageError] = useState(false)
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
  const [pdfSettings, setPdfSettings] = useState({
    // Default settings matching timetable page
    pageSize: 'A4',
    orientation: 'landscape', // Timetable uses landscape
    margin: 'narrow', // Timetable uses { top: 40, left: 8, right: 8, bottom: 25 }
    fontSize: '8', // Timetable uses fontSize: 8
    fontFamily: 'Helvetica', // jsPDF default
    primaryColor: '#dc2626',
    secondaryColor: '#1f2937',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    headerBackgroundColor: '#1E3A8A', // RGB(30, 58, 138) from timetable
    tableHeaderColor: '#1E3A8A', // RGB(30, 58, 138) from timetable
    alternateRowColor: '#F8FAFC', // RGB(248, 250, 252) from timetable
    includeHeader: true,
    includeFooter: true,
    includeLogo: true,
    logoPosition: 'left',
    logoSize: 'medium',
    logoStyle: 'circle', // Timetable uses circle
    headerText: '',
    footerText: '',
    includePageNumbers: true,
    includeDate: true,
    includeGeneratedDate: true,
    borderStyle: 'thin', // lineWidth: 0.3 from timetable
    tableStyle: 'grid', // theme: 'grid' from timetable
    cellPadding: 'normal', // cellPadding: 2.5 from timetable
    lineWidth: 'thin', // lineWidth: 0.3 from timetable
    includeSectionText: true, // Show section text in header
    sectionTextSize: '14' ,// Font size for section text
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
    try {
      const user = getUserFromCookie()
      if (user) {
        setCurrentUser(user)
        console.log('✅ User loaded:', user.id, 'School:', user.school_id)
        // Load user permissions
        loadUserPermissions(user)
      } else {
        console.error('❌ No user found in cookie')
        showToast('Please log in again', 'error')
      }
    } catch (e) {
      console.error('Error loading user data:', e)
      showToast('Error loading user data', 'error')
    }
  }, [])

  // Load user permissions
  const loadUserPermissions = async (user) => {
    try {
      // Admin has all permissions (case-insensitive check)
      const userRole = user.role?.toLowerCase().trim() || ''
      if (userRole === 'admin' || userRole === 'owner') {
        const allPermissions = {
          settings_basic_view: true,
          settings_pdf_view: true,
          settings_manage_access_view: true
        }
        setUserPermissions(allPermissions)
        // Set first available tab
        setActiveTab('basic')
        return
      }

      // Load staff permissions from database
      const { data, error } = await supabase
        .from('staff_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .single()

      if (error) {
        console.error('Error loading permissions:', error)
        setUserPermissions({})
        return
      }

      setUserPermissions(data || {})

      // Set default active tab based on available permissions
      if (data?.settings_basic_view) {
        setActiveTab('basic')
      } else if (data?.settings_pdf_view) {
        setActiveTab('pdf')
      } else if (data?.settings_manage_access_view || data?.settings_access_view) {
        setActiveTab('access')
      } else {
        // No permissions, default to basic
        setActiveTab('basic')
      }
    } catch (e) {
      console.error('Error loading permissions:', e)
      setUserPermissions({})
    }
  }

  // Load PDF settings for current school from localStorage
  useEffect(() => {
    if (currentUser?.school_id) {
      // Load school-specific PDF settings
      const schoolPdfSettingsKey = `pdfSettings_${currentUser.school_id}`
      const saved = localStorage.getItem(schoolPdfSettingsKey)
      if (saved) {
        try {
          const loadedSettings = JSON.parse(saved)
          setPdfSettings(loadedSettings)
          console.log('✅ Loaded PDF settings for school:', currentUser.school_id)
        } catch (e) {
          console.error('Error parsing saved PDF settings:', e)
        }
      } else {
        // Check for global settings for backward compatibility
        const globalSaved = localStorage.getItem('pdfSettings')
        if (globalSaved) {
          try {
            const loadedSettings = JSON.parse(globalSaved)
            setPdfSettings(loadedSettings)
            console.log('✅ Loaded global PDF settings (will save as school-specific on next save)')
          } catch (e) {
            console.error('Error parsing global PDF settings:', e)
          }
        }
      }
    }
  }, [currentUser?.school_id])

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
        setImageError(false) // Reset image error when new data is loaded
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
      setImageError(false) // Reset image error state
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

  // Handle PDF settings changes
  const handlePdfSettingChange = (field, value) => {
    setPdfSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle PDF settings save
  const handlePdfSettingsSave = async () => {
    try {
      setSaving(true)

      // Save to localStorage with school-specific key
      const schoolPdfSettingsKey = `pdfSettings_${currentUser.school_id}`
      localStorage.setItem(schoolPdfSettingsKey, JSON.stringify(pdfSettings))

      // Also save to the global key for backward compatibility
      localStorage.setItem('pdfSettings', JSON.stringify(pdfSettings))

      console.log('✅ Saved PDF settings for school:', currentUser.school_id)
      showToast('PDF settings saved successfully! All users in this school will use these settings.', 'success')
    } catch (error) {
      console.error('Error saving PDF settings:', error)
      showToast('Error saving PDF settings: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Wait for currentUser to be loaded
  if (!currentUser || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Debug logging
  console.log('🔍 Settings Page Check:', {
    currentUser: currentUser?.email,
    role: currentUser?.role,
    roleType: typeof currentUser?.role,
    userPermissions,
    activeTab,
    isAdmin: currentUser?.role === 'admin'
  })

  // Admin users always have access - skip permission check (case-insensitive)
  const userRole = currentUser?.role?.toLowerCase().trim() || ''
  if (userRole === 'admin' || userRole === 'owner') {
    console.log('👑 Admin/Owner user detected - granting full access')
    // Admin has full access, no permission check needed - continue to render
  } else {
    // For non-admin users, check if they have any settings permission
    // Wait for permissions to load before checking
    if (userPermissions === null) {
      console.log('⏳ Waiting for permissions to load...')
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )
    }

    const hasAnySettingsPermission =
      userPermissions?.settings_basic_view ||
      userPermissions?.settings_pdf_view ||
      userPermissions?.settings_manage_access_view ||
      userPermissions?.settings_access_view

    console.log('🔐 Staff user permissions check:', { hasAnySettingsPermission, userPermissions })

    if (!hasAnySettingsPermission) {
      console.log('❌ Access denied - no settings permissions')
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access Settings.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6 bg-gray-50 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-800 leading-tight">School Settings</h1>
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

      {/* Tab Navigation */}
      <div className="mb-3 flex flex-wrap gap-2">
        {/* Show Basic Settings tab only if user has permission */}
        {(userRole === 'admin' || userRole === 'owner' || userPermissions?.settings_basic_view) && (
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'basic'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Settings size={16} />
            Basic Settings
          </button>
        )}

        {/* Show PDF Settings tab only if user has permission */}
        {(userRole === 'admin' || userRole === 'owner' || userPermissions?.settings_pdf_view) && (
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'pdf'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Settings size={16} />
            PDF Settings
          </button>
        )}

        {/* Show Manage Access tab only if user has permission */}
        {(userRole === 'admin' || userRole === 'owner' || userPermissions?.settings_manage_access_view || userPermissions?.settings_access_view) && (
          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'access'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Users size={16} />
            Manage Access
          </button>
        )}
      </div>

      {/* Warning message if not active */}
      {schoolData.status !== 'active' && activeTab === 'basic' && (
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

      {/* Basic Settings Form */}
      {activeTab === 'basic' && (
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-2 sm:p-3">
          {/* Logo Section */}
          <div className="mb-3 pb-3 border-b border-gray-200">
            <h3 className="text-xs font-semibold mb-2 text-gray-700">SCHOOL LOGO</h3>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-shrink-0">
                {schoolData.logo_url && !imageError ? (
                  <div className="relative w-24 h-24 border-2 border-gray-300 rounded overflow-hidden bg-white">
                    <Image
                      src={schoolData.logo_url}
                      alt="School Logo"
                      fill
                      className="object-contain p-1"
                      unoptimized
                      onError={() => {
                        console.error('Failed to load logo image')
                        setImageError(true)
                      }}
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
        <div className="px-2 sm:px-3 pb-3 border-t border-gray-200 pt-3 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={fetchSchoolData}
            disabled={saving}
            className="px-4 sm:px-6 py-2 sm:py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50 text-sm"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving || schoolData.status !== 'active'}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Update Settings
              </>
            )}
          </button>
        </div>
      </form>
      )}

      {/* PDF Settings Form */}
      {activeTab === 'pdf' && (
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-2 sm:p-3">
          {/* Page Settings */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700">PAGE SETTINGS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Page Size
              </label>
              <select
                value={pdfSettings.pageSize}
                onChange={(e) => handlePdfSettingChange('pageSize', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
                <option value="A3">A3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Orientation
              </label>
              <select
                value={pdfSettings.orientation}
                onChange={(e) => handlePdfSettingChange('orientation', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Margin
              </label>
              <select
                value={pdfSettings.margin}
                onChange={(e) => handlePdfSettingChange('margin', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="none">None</option>
                <option value="narrow">Narrow</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
              </select>
            </div>
          </div>

          {/* Font Settings */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700 pt-2 border-t border-gray-200">FONT SETTINGS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Font Family
              </label>
              <select
                value={pdfSettings.fontFamily}
                onChange={(e) => handlePdfSettingChange('fontFamily', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Courier">Courier</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Calibri">Calibri</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Palatino">Palatino</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Font Size (pt)
              </label>
              <select
                value={pdfSettings.fontSize}
                onChange={(e) => handlePdfSettingChange('fontSize', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="8">8 pt</option>
                <option value="10">10 pt</option>
                <option value="12">12 pt</option>
                <option value="14">14 pt</option>
                <option value="16">16 pt</option>
                <option value="18">18 pt</option>
              </select>
            </div>
          </div>

          {/* Color Settings */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700 pt-2 border-t border-gray-200">COLOR SETTINGS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Primary Color (Headers, Borders)
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={pdfSettings.primaryColor}
                  onChange={(e) => handlePdfSettingChange('primaryColor', e.target.value)}
                  className="h-9 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfSettings.primaryColor}
                  onChange={(e) => handlePdfSettingChange('primaryColor', e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="#dc2626"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Secondary Color (Accents)
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={pdfSettings.secondaryColor}
                  onChange={(e) => handlePdfSettingChange('secondaryColor', e.target.value)}
                  className="h-9 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfSettings.secondaryColor}
                  onChange={(e) => handlePdfSettingChange('secondaryColor', e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="#1f2937"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Text Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={pdfSettings.textColor}
                  onChange={(e) => handlePdfSettingChange('textColor', e.target.value)}
                  className="h-9 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfSettings.textColor}
                  onChange={(e) => handlePdfSettingChange('textColor', e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Background Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={pdfSettings.backgroundColor}
                  onChange={(e) => handlePdfSettingChange('backgroundColor', e.target.value)}
                  className="h-9 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfSettings.backgroundColor}
                  onChange={(e) => handlePdfSettingChange('backgroundColor', e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="#ffffff"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Header Background Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={pdfSettings.headerBackgroundColor}
                  onChange={(e) => handlePdfSettingChange('headerBackgroundColor', e.target.value)}
                  className="h-9 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfSettings.headerBackgroundColor}
                  onChange={(e) => handlePdfSettingChange('headerBackgroundColor', e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="#1E3A8A"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Table Header Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={pdfSettings.tableHeaderColor}
                  onChange={(e) => handlePdfSettingChange('tableHeaderColor', e.target.value)}
                  className="h-9 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfSettings.tableHeaderColor}
                  onChange={(e) => handlePdfSettingChange('tableHeaderColor', e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="#1E3A8A"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Alternate Row Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={pdfSettings.alternateRowColor}
                  onChange={(e) => handlePdfSettingChange('alternateRowColor', e.target.value)}
                  className="h-9 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={pdfSettings.alternateRowColor}
                  onChange={(e) => handlePdfSettingChange('alternateRowColor', e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="#F8FAFC"
                />
              </div>
            </div>
          </div>

          {/* Logo Settings */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700 pt-2 border-t border-gray-200">LOGO SETTINGS</h3>
          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeLogo"
                checked={pdfSettings.includeLogo}
                onChange={(e) => handlePdfSettingChange('includeLogo', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeLogo" className="text-xs font-medium text-gray-700">
                Include School Logo in PDF
              </label>
            </div>
            {pdfSettings.includeLogo && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 ml-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Logo Position
                  </label>
                  <select
                    value={pdfSettings.logoPosition}
                    onChange={(e) => handlePdfSettingChange('logoPosition', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Logo Size
                  </label>
                  <select
                    value={pdfSettings.logoSize}
                    onChange={(e) => handlePdfSettingChange('logoSize', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Logo Style
                  </label>
                  <select
                    value={pdfSettings.logoStyle}
                    onChange={(e) => handlePdfSettingChange('logoStyle', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                    <option value="rounded">Rounded</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Header & Footer Settings */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700 pt-2 border-t border-gray-200">HEADER & FOOTER</h3>
          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeSchoolName"
                checked={pdfSettings.includeSchoolName}
                onChange={(e) => handlePdfSettingChange('includeSchoolName', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeSchoolName" className="text-xs font-medium text-gray-700">
                Include School Name in PDF
              </label>
            </div>
            {pdfSettings.includeSchoolName && (
              <div className="ml-6">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  School Name Font Size
                </label>
                <select
                  value={pdfSettings.schoolNameFontSize || 16}
                  onChange={(e) => handlePdfSettingChange('schoolNameFontSize', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="12">12pt</option>
                  <option value="14">14pt</option>
                  <option value="16">16pt</option>
                  <option value="18">18pt</option>
                  <option value="20">20pt</option>
                  <option value="22">22pt</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeTagline"
                checked={pdfSettings.includeTagline}
                onChange={(e) => handlePdfSettingChange('includeTagline', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeTagline" className="text-xs font-medium text-gray-700">
                Include School Tagline in PDF
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeContactInfo"
                checked={pdfSettings.includeContactInfo}
                onChange={(e) => handlePdfSettingChange('includeContactInfo', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeContactInfo" className="text-xs font-medium text-gray-700">
                Include Contact Information (Address, Phone, Email)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeHeader"
                checked={pdfSettings.includeHeader}
                onChange={(e) => handlePdfSettingChange('includeHeader', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeHeader" className="text-xs font-medium text-gray-700">
                Include Header
              </label>
            </div>
            {pdfSettings.includeHeader && (
              <div className="ml-6">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Header Text
                </label>
                <input
                  type="text"
                  value={pdfSettings.headerText}
                  onChange={(e) => handlePdfSettingChange('headerText', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter header text (e.g., School Name)"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeFooter"
                checked={pdfSettings.includeFooter}
                onChange={(e) => handlePdfSettingChange('includeFooter', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeFooter" className="text-xs font-medium text-gray-700">
                Include Footer
              </label>
            </div>
            {pdfSettings.includeFooter && (
              <div className="ml-6">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={pdfSettings.footerText}
                  onChange={(e) => handlePdfSettingChange('footerText', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter footer text (e.g., Contact Information)"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includePageNumbers"
                checked={pdfSettings.includePageNumbers}
                onChange={(e) => handlePdfSettingChange('includePageNumbers', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includePageNumbers" className="text-xs font-medium text-gray-700">
                Include Page Numbers
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeDate"
                checked={pdfSettings.includeDate}
                onChange={(e) => handlePdfSettingChange('includeDate', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeDate" className="text-xs font-medium text-gray-700">
                Include Print Date
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeGeneratedDate"
                checked={pdfSettings.includeGeneratedDate}
                onChange={(e) => handlePdfSettingChange('includeGeneratedDate', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeGeneratedDate" className="text-xs font-medium text-gray-700">
                Include Generated Date in Header
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeSectionText"
                checked={pdfSettings.includeSectionText}
                onChange={(e) => handlePdfSettingChange('includeSectionText', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeSectionText" className="text-xs font-medium text-gray-700">
                Include Section Text in Header
              </label>
            </div>
            {pdfSettings.includeSectionText && (
              <div className="ml-6">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Section Text Font Size
                </label>
                <select
                  value={pdfSettings.sectionTextSize}
                  onChange={(e) => handlePdfSettingChange('sectionTextSize', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="10">10pt - Very Small</option>
                  <option value="11">11pt - Small</option>
                  <option value="12">12pt - Regular</option>
                  <option value="13">13pt - Medium</option>
                  <option value="14">14pt - Large</option>
                  <option value="16">16pt - Very Large</option>
                  <option value="18">18pt - Extra Large</option>
                </select>
              </div>
            )}
          </div>

          {/* Table & Border Settings */}
          <h3 className="text-xs font-semibold mb-2 text-gray-700 pt-2 border-t border-gray-200">TABLE & BORDER SETTINGS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Table Style
              </label>
              <select
                value={pdfSettings.tableStyle}
                onChange={(e) => handlePdfSettingChange('tableStyle', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="striped">Striped Rows</option>
                <option value="bordered">Bordered</option>
                <option value="minimal">Minimal</option>
                <option value="modern">Modern</option>
                <option value="grid">Grid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Border Style
              </label>
              <select
                value={pdfSettings.borderStyle}
                onChange={(e) => handlePdfSettingChange('borderStyle', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="none">None</option>
                <option value="thin">Thin</option>
                <option value="medium">Medium</option>
                <option value="thick">Thick</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cell Padding
              </label>
              <select
                value={pdfSettings.cellPadding}
                onChange={(e) => handlePdfSettingChange('cellPadding', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="comfortable">Comfortable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Line Width
              </label>
              <select
                value={pdfSettings.lineWidth}
                onChange={(e) => handlePdfSettingChange('lineWidth', e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="thin">Thin (0.3)</option>
                <option value="normal">Normal (0.5)</option>
                <option value="thick">Thick (0.8)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-3 pb-3 border-t border-gray-200 pt-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              const defaults = {
                pageSize: 'A4',
                orientation: 'landscape',
                margin: 'narrow',
                fontSize: '8',
                fontFamily: 'Helvetica',
                primaryColor: '#dc2626',
                secondaryColor: '#1f2937',
                textColor: '#000000',
                backgroundColor: '#ffffff',
                headerBackgroundColor: '#1E3A8A',
                tableHeaderColor: '#1E3A8A',
                alternateRowColor: '#F8FAFC',
                includeHeader: true,
                includeFooter: true,
                includeLogo: true,
                logoPosition: 'left',
                logoSize: 'medium',
                logoStyle: 'circle',
                headerText: '',
                footerText: '',
                includePageNumbers: true,
                includeDate: true,
                includeGeneratedDate: true,
                borderStyle: 'thin',
                tableStyle: 'grid',
                cellPadding: 'normal',
                lineWidth: 'thin'
              }
              setPdfSettings(defaults)
              localStorage.setItem('pdfSettings', JSON.stringify(defaults))
              showToast('PDF settings reset to defaults', 'success')
            }}
            disabled={saving}
            className="px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handlePdfSettingsSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Save PDF Settings
              </>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Manage Access Tab */}
      {activeTab === 'access' && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <StaffManagement currentUser={currentUser} showToast={showToast} />
        </div>
      )}

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
