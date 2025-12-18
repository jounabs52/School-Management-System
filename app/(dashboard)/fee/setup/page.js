'use client'

import { useState, useEffect } from 'react'
import {
  Settings, DollarSign, Calendar, Plus, Edit2, Trash2,
  Save, X, Check, AlertCircle, Loader2, GraduationCap,
  Bus, FlaskConical, BookOpen, Building2, Calculator, Users
} from 'lucide-react'
import { getUserFromCookie } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'

// Fee Type Icon Mapper
const FeeTypeIcon = ({ feeCode, size = 20 }) => {
  const icons = {
    'TUITION': <GraduationCap size={size} className="text-blue-600" />,
    'ADMISSION': <Users size={size} className="text-green-600" />,
    'TRANSPORT': <Bus size={size} className="text-yellow-600" />,
    'LAB': <FlaskConical size={size} className="text-purple-600" />,
    'LIBRARY': <BookOpen size={size} className="text-teal-600" />,
    'MOSQUE': <Building2 size={size} className="text-orange-600" />,
    'EXAM': <Calculator size={size} className="text-pink-600" />,
    'COMPUTER': <Calculator size={size} className="text-indigo-600" />,
  }
  return icons[feeCode] || <DollarSign size={size} className="text-gray-600" />
}

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

// Fee Type Form Modal
const FeeTypeModal = ({ isOpen, onClose, feeType, onSave, sessions }) => {
  const [formData, setFormData] = useState({
    fee_name: '',
    fee_code: '',
    description: '',
    is_recurring: false,
    collection_frequency: 'monthly',
    is_admission_fee: false,
    display_order: 0,
    status: 'active'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (feeType) {
      setFormData(feeType)
    } else {
      setFormData({
        fee_name: '',
        fee_code: '',
        description: '',
        is_recurring: false,
        collection_frequency: 'monthly',
        is_admission_fee: false,
        display_order: 0,
        status: 'active'
      })
    }
  }, [feeType, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving fee type:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99998] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <DollarSign className="text-white" size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">
              {feeType ? 'Edit Fee Type' : 'Add New Fee Type'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            {/* Fee Name */}
            <div className="col-span-2">
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Fee Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fee_name}
                onChange={(e) => setFormData({...formData, fee_name: e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Monthly Tuition Fee"
                required
              />
            </div>

            {/* Fee Code */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Fee Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fee_code}
                onChange={(e) => setFormData({...formData, fee_code: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                placeholder="e.g., TUITION"
                required
              />
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="2"
                placeholder="Optional description"
              />
            </div>

            {/* Fee Type Flags */}
            <div className="col-span-2 bg-blue-50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Fee Type Configuration</h3>

              {/* Is Recurring */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Recurring Fee</span>
                  <p className="text-xs text-gray-500">This fee will be charged every period (e.g., monthly tuition)</p>
                </div>
              </label>

              {/* Is Admission Fee */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_admission_fee}
                  onChange={(e) => setFormData({...formData, is_admission_fee: e.target.checked})}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Admission Fee</span>
                  <p className="text-xs text-gray-500">Charged only once during student admission</p>
                </div>
              </label>
            </div>

            {/* Collection Frequency */}
            <div className="col-span-2">
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Collection Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['one-time', 'monthly', 'quarterly', 'semi-annual', 'annual'].map(freq => (
                  <label key={freq} className="flex items-center space-x-2 cursor-pointer p-2 border rounded-lg hover:bg-blue-50 transition">
                    <input
                      type="radio"
                      value={freq}
                      checked={formData.collection_frequency === freq}
                      onChange={(e) => setFormData({...formData, collection_frequency: e.target.value})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{freq.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="col-span-2">
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Status
              </label>
              <div className="flex gap-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Inactive</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Fee Type
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Class Fee Structure Modal
const ClassFeeStructureModal = ({ isOpen, onClose, classItem, feeTypes, sessions, onSave }) => {
  const [selectedSession, setSelectedSession] = useState('')
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingStructure, setEditingStructure] = useState(null)

  useEffect(() => {
    if (classItem && sessions.length > 0 && isOpen) {
      // Set first active session as default
      const activeSession = sessions.find(s => s.status === 'active') || sessions[0]
      setSelectedSession(activeSession?.id || '')
    }
  }, [classItem, sessions, isOpen])

  useEffect(() => {
    if (selectedSession && classItem) {
      loadClassFeeStructures()
    }
  }, [selectedSession, classItem])

  const loadClassFeeStructures = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('class_fee_structure')
        .select(`
          *,
          fee_types (
            fee_name,
            fee_code,
            is_recurring,
            is_admission_fee,
            collection_frequency
          )
        `)
        .eq('class_id', classItem.id)
        .eq('session_id', selectedSession)
        .order('fee_types(display_order)')

      if (error) throw error
      setStructures(data || [])
    } catch (error) {
      console.error('Error loading class fee structures:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFeeType = () => {
    setEditingStructure({
      fee_type_id: '',
      monthly_amount: 0,
      period_amount: 0,
      frequency: 'monthly',
      months_per_period: 1,
      is_mandatory: true,
      description: '',
      status: 'active'
    })
  }

  const handleSaveStructure = async (structureData) => {
    try {
      const user = getUserFromCookie()
      const dataToSave = {
        ...structureData,
        school_id: user.school_id,
        session_id: selectedSession,
        class_id: classItem.id,
        created_by: user.id
      }

      if (structureData.id) {
        // Update existing
        const { error } = await supabase
          .from('class_fee_structure')
          .update(dataToSave)
          .eq('id', structureData.id)
        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('class_fee_structure')
          .insert([dataToSave])
        if (error) throw error
      }

      await loadClassFeeStructures()
      setEditingStructure(null)
      onSave && onSave()
    } catch (error) {
      console.error('Error saving structure:', error)
      alert('Error saving fee structure: ' + error.message)
    }
  }

  const handleDeleteStructure = async (structureId) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return

    try {
      const { error } = await supabase
        .from('class_fee_structure')
        .delete()
        .eq('id', structureId)

      if (error) throw error
      await loadClassFeeStructures()
    } catch (error) {
      console.error('Error deleting structure:', error)
      alert('Error deleting fee structure: ' + error.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99998]">
      <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-white shadow-2xl z-[99999] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Settings className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Class Fee Structure</h2>
              <p className="text-blue-200 text-sm">{classItem?.class_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Session Selector */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <label className="block text-gray-700 font-semibold mb-2 text-xs uppercase tracking-wide">
            Select Session
          </label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.session_name} {session.status === 'active' ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Existing Structures */}
              <div className="space-y-4 mb-6">
                {structures.map(structure => (
                  <div key={structure.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FeeTypeIcon feeCode={structure.fee_types.fee_code} size={24} />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{structure.fee_types.fee_name}</h4>
                          <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                            <div>
                              <span className="text-gray-500">Monthly Amount:</span>
                              <span className="ml-2 font-medium text-gray-800">Rs. {structure.monthly_amount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Period Amount:</span>
                              <span className="ml-2 font-medium text-gray-800">Rs. {structure.period_amount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Frequency:</span>
                              <span className="ml-2 font-medium text-gray-800 capitalize">{structure.frequency}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {structure.fee_types.is_recurring && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Recurring</span>
                            )}
                            {structure.fee_types.is_admission_fee && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Admission</span>
                            )}
                            {structure.is_mandatory && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Mandatory</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingStructure(structure)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteStructure(structure.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Fee Type Button */}
              <button
                onClick={handleAddFeeType}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span className="font-medium">Add Fee Type to Class</span>
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Done
          </button>
        </div>
      </div>

      {/* Fee Structure Edit Modal */}
      {editingStructure && (
        <FeeStructureForm
          structure={editingStructure}
          feeTypes={feeTypes}
          onSave={handleSaveStructure}
          onClose={() => setEditingStructure(null)}
        />
      )}
    </div>
  )
}

// Fee Structure Form Component
const FeeStructureForm = ({ structure, feeTypes, onSave, onClose }) => {
  const [formData, setFormData] = useState(structure)

  const calculatePeriodAmount = (monthly, frequency, monthsPerPeriod) => {
    if (frequency === 'monthly') return monthly
    return monthly * monthsPerPeriod
  }

  const handleMonthlyChange = (value) => {
    const monthly = parseFloat(value) || 0
    setFormData({
      ...formData,
      monthly_amount: monthly,
      period_amount: calculatePeriodAmount(monthly, formData.frequency, formData.months_per_period)
    })
  }

  const handleFrequencyChange = (frequency) => {
    const monthsMap = {
      'monthly': 1,
      'quarterly': 3,
      'semi-annual': 6,
      'annual': 12
    }
    const months = monthsMap[frequency] || 1
    setFormData({
      ...formData,
      frequency,
      months_per_period: months,
      period_amount: calculatePeriodAmount(formData.monthly_amount, frequency, months)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {structure.id ? 'Edit Fee Structure' : 'Add Fee Structure'}
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Fee Type Selection */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Fee Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.fee_type_id}
                onChange={(e) => setFormData({...formData, fee_type_id: e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={structure.id} // Can't change fee type in edit mode
              >
                <option value="">Select Fee Type</option>
                {feeTypes.filter(ft => ft.status === 'active').map(ft => (
                  <option key={ft.id} value={ft.id}>
                    {ft.fee_name} ({ft.fee_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Monthly Amount */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Monthly Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                <input
                  type="number"
                  value={formData.monthly_amount}
                  onChange={(e) => handleMonthlyChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Collection Frequency
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['monthly', 'quarterly', 'semi-annual', 'annual'].map(freq => (
                  <label key={freq} className="flex items-center space-x-2 cursor-pointer p-3 border rounded-lg hover:bg-blue-50 transition">
                    <input
                      type="radio"
                      value={freq}
                      checked={formData.frequency === freq}
                      onChange={(e) => handleFrequencyChange(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 capitalize">{freq.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Period Amount (Auto-calculated) */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Period Amount ({formData.months_per_period} months):</span>
                <span className="text-lg font-bold text-blue-700">Rs. {formData.period_amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            {/* Is Mandatory */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({...formData, is_mandatory: e.target.checked})}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="text-sm text-gray-700">This is a mandatory fee</span>
            </label>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save Structure
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Page Component
export default function FeeSetupPage() {
  const [activeTab, setActiveTab] = useState('fee-types')
  const [feeTypes, setFeeTypes] = useState([])
  const [classes, setClasses] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ show: false, message: '', type: '' })
  const [showFeeTypeModal, setShowFeeTypeModal] = useState(false)
  const [selectedFeeType, setSelectedFeeType] = useState(null)
  const [showClassFeeModal, setShowClassFeeModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const user = getUserFromCookie()

      // Load fee types
      const { data: feeTypesData, error: feeTypesError } = await supabase
        .from('fee_types')
        .select('*')
        .eq('school_id', user.school_id)
        .order('display_order', { ascending: true })

      if (feeTypesError) throw feeTypesError
      setFeeTypes(feeTypesData || [])

      // Load classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('class_name')

      if (classesError) throw classesError
      setClasses(classesData || [])

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('school_id', user.school_id)
        .order('start_date', { ascending: false })

      if (sessionsError) throw sessionsError
      setSessions(sessionsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      showToastMessage('Error loading data: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToastMessage = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const handleSaveFeeType = async (feeTypeData) => {
    try {
      const user = getUserFromCookie()
      const dataToSave = {
        ...feeTypeData,
        school_id: user.school_id
      }

      if (feeTypeData.id) {
        // Update
        const { error } = await supabase
          .from('fee_types')
          .update(dataToSave)
          .eq('id', feeTypeData.id)
        if (error) throw error
        showToastMessage('Fee type updated successfully!')
      } else {
        // Insert
        const { error } = await supabase
          .from('fee_types')
          .insert([dataToSave])
        if (error) throw error
        showToastMessage('Fee type created successfully!')
      }

      await loadData()
    } catch (error) {
      console.error('Error saving fee type:', error)
      showToastMessage('Error saving fee type: ' + error.message, 'error')
      throw error
    }
  }

  const handleDeleteFeeType = async (feeTypeId) => {
    if (!confirm('Are you sure you want to delete this fee type?')) return

    try {
      const { error } = await supabase
        .from('fee_types')
        .delete()
        .eq('id', feeTypeId)

      if (error) throw error
      showToastMessage('Fee type deleted successfully!')
      await loadData()
    } catch (error) {
      console.error('Error deleting fee type:', error)
      showToastMessage('Error deleting fee type: ' + error.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fee Management Setup</h1>
        <p className="text-gray-600">Configure fee types and class fee structures</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('fee-types')}
            className={`flex-1 px-6 py-4 font-medium transition ${
              activeTab === 'fee-types'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <DollarSign size={20} />
              Fee Types
            </div>
          </button>
          <button
            onClick={() => setActiveTab('class-fees')}
            className={`flex-1 px-6 py-4 font-medium transition ${
              activeTab === 'class-fees'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Settings size={20} />
              Class Fee Structures
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'fee-types' && (
            <div>
              {/* Add Button */}
              <div className="mb-4">
                <button
                  onClick={() => {
                    setSelectedFeeType(null)
                    setShowFeeTypeModal(true)
                  }}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium"
                >
                  <Plus size={20} />
                  Add Fee Type
                </button>
              </div>

              {/* Fee Types Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fee Name</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Code</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Type</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Frequency</th>
                      <th className="px-4 py-3 text-left font-semibold border border-blue-800">Status</th>
                      <th className="px-4 py-3 text-center font-semibold border border-blue-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeTypes.map((ft, index) => (
                      <tr key={ft.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <FeeTypeIcon feeCode={ft.fee_code} />
                            <span className="font-medium">{ft.fee_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border border-gray-200">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{ft.fee_code}</span>
                        </td>
                        <td className="px-4 py-3 border border-gray-200">
                          <div className="flex gap-1">
                            {ft.is_recurring && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Recurring</span>
                            )}
                            {ft.is_admission_fee && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Admission</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border border-gray-200 capitalize">
                          {ft.collection_frequency?.replace('-', ' ')}
                        </td>
                        <td className="px-4 py-3 border border-gray-200">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            ft.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {ft.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 border border-gray-200">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedFeeType(ft)
                                setShowFeeTypeModal(true)
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteFeeType(ft.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {feeTypes.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No fee types configured yet</p>
                    <p className="text-sm">Click "Add Fee Type" to create your first fee type</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'class-fees' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map(classItem => (
                  <div key={classItem.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{classItem.class_name}</h3>
                    <button
                      onClick={() => {
                        setSelectedClass(classItem)
                        setShowClassFeeModal(true)
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Settings size={16} />
                      Configure Fees
                    </button>
                  </div>
                ))}
              </div>

              {classes.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Settings size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No classes found</p>
                  <p className="text-sm">Please create classes first</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FeeTypeModal
        isOpen={showFeeTypeModal}
        onClose={() => {
          setShowFeeTypeModal(false)
          setSelectedFeeType(null)
        }}
        feeType={selectedFeeType}
        onSave={handleSaveFeeType}
        sessions={sessions}
      />

      <ClassFeeStructureModal
        isOpen={showClassFeeModal}
        onClose={() => {
          setShowClassFeeModal(false)
          setSelectedClass(null)
        }}
        classItem={selectedClass}
        feeTypes={feeTypes}
        sessions={sessions}
        onSave={() => showToastMessage('Class fee structure updated successfully!')}
      />

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
