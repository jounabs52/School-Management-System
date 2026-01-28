'use client'

import { useState, useEffect } from 'react'
import {
  AlertCircle, Save, Edit2, Trash2, Plus, Loader2, Check, X
} from 'lucide-react'
import { getUserFromCookie } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'
import PermissionGuard from '@/components/PermissionGuard'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-5 py-3 rounded-full shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`}>
      {type === 'success' && <Check size={20} />}
      {type === 'error' && <X size={20} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  )
}

// Main Content Component
function LateFeeConfigContent() {
  const [sessions, setSessions] = useState([])
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: '' })
  const [editingConfig, setEditingConfig] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({
    session_id: '',
    calculation_type: 'fixed',
    fixed_amount: 0,
    daily_rate: 0,
    weekly_rate: 0,
    percentage_rate: 0,
    grace_days: 0,
    max_late_fee: null,
    is_active: true
  })

  // User state to track when user is loaded
  const [currentUser, setCurrentUser] = useState(null)

  // Load user on mount
  useEffect(() => {
    const user = getUserFromCookie()
    setCurrentUser(user)
  }, [])

  // Fetch data when user is available
  useEffect(() => {
    if (currentUser) {
      loadData()
    }
  }, [currentUser])

  const loadData = async () => {
    if (!currentUser) return

    setLoading(true)
    try {

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('start_date', { ascending: false })

      if (sessionsError) throw sessionsError
      setSessions(sessionsData || [])

      // Load late fee configs
      const { data: configsData, error: configsError } = await supabase
        .from('late_fee_config')
        .select(`
          *,
          sessions (session_name)
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })

      if (configsError) throw configsError
      setConfigs(configsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error loading data: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const user = currentUser
      const dataToSave = {
        ...formData,
        user_id: user.id,
        school_id: user.school_id,
        created_by: user.id,
        session_id: formData.session_id || null,
        max_late_fee: formData.max_late_fee || null
      }

      if (editingConfig) {
        // Update
        const { error } = await supabase
          .from('late_fee_config')
          .update(dataToSave)
          .eq('id', editingConfig.id)
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)

        if (error) throw error
        showToast('Late fee configuration updated successfully!')
      } else {
        // Insert
        const { error } = await supabase
          .from('late_fee_config')
          .insert([dataToSave])

        if (error) throw error
        showToast('Late fee configuration created successfully!')
      }

      setShowForm(false)
      setEditingConfig(null)
      resetForm()
      await loadData()
    } catch (error) {
      console.error('Error saving config:', error)
      showToast('Error saving configuration: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (config) => {
    setEditingConfig(config)
    setFormData({
      session_id: config.session_id || '',
      calculation_type: config.calculation_type,
      fixed_amount: config.fixed_amount || 0,
      daily_rate: config.daily_rate || 0,
      weekly_rate: config.weekly_rate || 0,
      percentage_rate: config.percentage_rate || 0,
      grace_days: config.grace_days || 0,
      max_late_fee: config.max_late_fee || null,
      is_active: config.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (configId) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return

    try {
      const user = currentUser
      const { error } = await supabase
        .from('late_fee_config')
        .delete()
        .eq('id', configId)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)

      if (error) throw error
      showToast('Configuration deleted successfully!')
      await loadData()
    } catch (error) {
      console.error('Error deleting config:', error)
      showToast('Error deleting configuration: ' + error.message, 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      session_id: '',
      calculation_type: 'fixed',
      fixed_amount: 0,
      daily_rate: 0,
      weekly_rate: 0,
      percentage_rate: 0,
      grace_days: 0,
      max_late_fee: null,
      is_active: true
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingConfig(null)
    resetForm()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Late Fee Configuration</h1>
        <p className="text-sm sm:text-base text-gray-600">Configure automatic late fee calculation rules</p>
      </div>

      {/* Add Button */}
      {!showForm && (
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center sm:justify-start gap-2 font-medium text-sm sm:text-base"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            Add Late Fee Configuration
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
            {editingConfig ? 'Edit Configuration' : 'New Configuration'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Selection */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Session (Optional)
              </label>
              <select
                value={formData.session_id}
                onChange={(e) => setFormData({...formData, session_id: e.target.value})}
                className="w-full max-w-md px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sessions (Default)</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.session_name} {session.status === 'active' ? '(Active)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Leave blank to apply to all sessions</p>
            </div>

            {/* Calculation Type */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Calculation Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { value: 'fixed', label: 'Fixed Amount', desc: 'One-time fixed late fee' },
                  { value: 'daily', label: 'Daily Rate', desc: 'Charge per day overdue' },
                  { value: 'weekly', label: 'Weekly Rate', desc: 'Charge per week overdue' },
                  { value: 'percentage', label: 'Percentage', desc: '% of total amount' }
                ].map(type => (
                  <label
                    key={type.value}
                    className={`flex flex-col p-3 border-2 rounded-lg cursor-pointer transition ${
                      formData.calculation_type === type.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      checked={formData.calculation_type === type.value}
                      onChange={(e) => setFormData({...formData, calculation_type: e.target.value})}
                      className="w-4 h-4 text-blue-600 mb-2"
                    />
                    <span className="text-sm font-medium text-gray-900">{type.label}</span>
                    <span className="text-xs text-gray-500 mt-1">{type.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Amount Fields Based on Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {formData.calculation_type === 'fixed' && (
                <div>
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Fixed Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="number"
                      value={formData.fixed_amount}
                      onChange={(e) => setFormData({...formData, fixed_amount: parseFloat(e.target.value) || 0})}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              )}

              {formData.calculation_type === 'daily' && (
                <div>
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Daily Rate <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="number"
                      value={formData.daily_rate}
                      onChange={(e) => setFormData({...formData, daily_rate: parseFloat(e.target.value) || 0})}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Per day after due date</p>
                </div>
              )}

              {formData.calculation_type === 'weekly' && (
                <div>
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Weekly Rate <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="number"
                      value={formData.weekly_rate}
                      onChange={(e) => setFormData({...formData, weekly_rate: parseFloat(e.target.value) || 0})}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Per week after due date</p>
                </div>
              )}

              {formData.calculation_type === 'percentage' && (
                <div>
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Percentage Rate <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.percentage_rate}
                      onChange={(e) => setFormData({...formData, percentage_rate: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Percentage of total fee amount</p>
                </div>
              )}

              {/* Grace Days */}
              <div>
                <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                  Grace Days
                </label>
                <input
                  type="number"
                  value={formData.grace_days}
                  onChange={(e) => setFormData({...formData, grace_days: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Days after due date before late fee applies</p>
              </div>

              {/* Maximum Late Fee */}
              <div>
                <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                  Maximum Late Fee (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                  <input
                    type="number"
                    value={formData.max_late_fee || ''}
                    onChange={(e) => setFormData({...formData, max_late_fee: e.target.value ? parseFloat(e.target.value) : null})}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="No limit"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Maximum late fee that can be charged</p>
              </div>
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="text-sm text-gray-700 font-medium">Active Configuration</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Configurations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Existing Configurations</h2>

        <div className="space-y-3 sm:space-y-4">
          {configs.map(config => (
            <div key={config.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {config.sessions?.session_name || 'All Sessions (Default)'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      config.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium capitalize">{config.calculation_type}</span>
                    </div>

                    {config.calculation_type === 'fixed' && (
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <span className="ml-2 font-medium">Rs. {config.fixed_amount}</span>
                      </div>
                    )}

                    {config.calculation_type === 'daily' && (
                      <div>
                        <span className="text-gray-500">Daily Rate:</span>
                        <span className="ml-2 font-medium">Rs. {config.daily_rate}/day</span>
                      </div>
                    )}

                    {config.calculation_type === 'weekly' && (
                      <div>
                        <span className="text-gray-500">Weekly Rate:</span>
                        <span className="ml-2 font-medium">Rs. {config.weekly_rate}/week</span>
                      </div>
                    )}

                    {config.calculation_type === 'percentage' && (
                      <div>
                        <span className="text-gray-500">Percentage:</span>
                        <span className="ml-2 font-medium">{config.percentage_rate}%</span>
                      </div>
                    )}

                    <div>
                      <span className="text-gray-500">Grace Days:</span>
                      <span className="ml-2 font-medium">{config.grace_days} days</span>
                    </div>

                    {config.max_late_fee && (
                      <div>
                        <span className="text-gray-500">Max Late Fee:</span>
                        <span className="ml-2 font-medium">Rs. {config.max_late_fee}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 sm:ml-4 justify-end sm:justify-start">
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {configs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle size={48} className="mx-auto mb-3 opacity-30" />
              <p>No late fee configurations found</p>
              <p className="text-sm">Click "Add Late Fee Configuration" to create one</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: '' })}
        />
      )}
    </div>
  )
}

// Main Page Component with Permission Guard
export default function LateFeePage() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const user = getUserFromCookie()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="fee_late_fee_view"
      pageName="Late Fee"
    >
      <LateFeeConfigContent />
    </PermissionGuard>
  )
}
