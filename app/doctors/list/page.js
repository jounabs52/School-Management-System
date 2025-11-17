'use client'

import { Stethoscope, Search, Plus, Trash2, Edit, X, Eye, Printer, FileText, FileDown, Table, ChevronDown } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ====================================================================
// === CONFIGURATION AND CONSTANTS ====================================
// ====================================================================

const DOCTOR_TABLE = 'doctors'
const ROWS_PER_PAGE_OPTIONS = [8, 10, 15, 20, 30, 40, 50]
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const CORE_DB_FIELDS = [
  'name', 'license_number', 'specialization', 'email', 'phone', 'consultation_fee'
]

// Note: Mandatory flag still marks fields that are highly recommended or required by database schema, 
// but form submission logic will prioritize group mandates.
const MASTER_DOCTOR_FIELDS = [
  // Personal Information (REQUIRED)
  { id: 'name', label: 'Full Name', mandatory: true, type: 'text' },
  { id: 'phone', label: 'Phone Number', mandatory: true, type: 'tel' },
  { id: 'email', label: 'Email Address', mandatory: true, type: 'email' },
  { id: 'date_of_birth', label: 'Date of Birth', mandatory: true, type: 'date' },
  { id: 'gender', label: 'Gender', mandatory: true, type: 'select', options: ['Female', 'Male', 'Other'] },

  // Professional Information (MANDATORY per DB schema)
  { id: 'specialization', label: 'Specialty/Area of Expertise', mandatory: true, type: 'text' },
  { id: 'license_number', label: 'License ID', mandatory: true, type: 'text' },
  { id: 'pmdc_number', label: 'PMDC Number', mandatory: true, type: 'text' },
  { id: 'qualification', label: 'Qualification', mandatory: true, type: 'text' },
  { id: 'years_of_experience', label: 'Years of Experience', mandatory: true, type: 'number' },
  { id: 'consultation_fee', label: 'Consultation Fee (PKR)', mandatory: true, type: 'number' },

  // Emergency Contact (OPTIONAL)
  { id: 'emergency_contact_name', label: 'Emergency Contact Name', mandatory: true, type: 'text' },
  { id: 'emergency_contact_phone', label: 'Emergency Contact Phone', mandatory: true, type: 'tel' },
  
  // Availability Schedule (REQUIRED)
  { id: 'available_days', label: 'Available Days', mandatory: true, type: 'checkboxes', options: ALL_DAYS },
  { id: 'start_time', label: 'Start Time', mandatory: true, type: 'time' },
  { id: 'end_time', label: 'End Time', mandatory: true, type: 'time' },
  
  // Address & Contact (OPTIONAL)
  { id: 'street_address', label: 'Street Address', mandatory: true, type: 'textarea' },
  { id: 'city', label: 'City', mandatory: true, type: 'text' },
  { id: 'state_province', label: 'State/Province', mandatory: true, type: 'text' },
]

// UPDATED GROUPING LOGIC (Professional Information is required for 'license_number' NOT NULL fix)
const FIELD_GROUPS = [
  {
    title: 'Personal Information',
    fields: ['name', 'phone', 'email', 'date_of_birth', 'gender'],
    color: 'purple',
    required: true, // Required
  },
  {
    title: 'Availability Schedule',
    fields: ['available_days', 'start_time', 'end_time'],
    color: 'green',
    required: true, // Required
  },
  {
    title: 'Professional Information',
    fields: ['specialization', 'license_number', 'pmdc_number', 'qualification', 'years_of_experience', 'consultation_fee'],
    color: 'blue',
    required: true, // FIX: Changed to TRUE to mandate license_number input
  },
  {
    title: 'Emergency Contact',
    fields: ['emergency_contact_name', 'emergency_contact_phone'],
    color: 'red',
    required: false, // Optional
  },
  {
    title: 'Address & Contact',
    fields: ['street_address', 'city', 'state_province'],
    color: 'orange',
    required: false, // Optional
  },
]

// Default columns for the table, based on user request for the dropdown
const INITIAL_VISIBLE_COLUMNS = [
  { id: 'name', label: 'FULL NAME', defaultVisible: true },
  { id: 'phone', label: 'PHONE NUMBER', defaultVisible: true },
  { id: 'specialization', label: 'SPECIALTY/AREA OF EXPERTISE', defaultVisible: true },
  { id: 'license_number', label: 'LICENSE ID / PMDC NO', defaultVisible: true },
  // Adding a few more available columns for visibility management
  { id: 'email', label: 'EMAIL ADDRESS', defaultVisible: false },
  { id: 'consultation_fee', label: 'FEE (PKR)', defaultVisible: false },
]

// ====================================================================
// === PDF EXPORT HOOK (PURE JS - NO TYPES) ===========================
// ====================================================================

const usePdfExport = () => {
    // Dynamically load jspdf and jspdf-autotable to keep initial bundle small
    const loadPdfLibs = async () => {
        if (typeof window === 'undefined') return null

        try {
            // Note: Canvas provides these libraries globally, but dynamic import is safer in a Next.js environment.
            // If running in Canvas, these imports might resolve globally.
            const autoTable = await import('jspdf-autotable')
            const { default: jsPDF } = await import('jspdf')

            if (typeof jsPDF.prototype.autoTable !== 'function') {
                jsPDF.prototype.autoTable = autoTable.default || autoTable
            }

            return jsPDF
        } catch (error) {
            console.error("PDF Library Load Error:", error)
            // Use a custom modal or message box instead of alert in production
            if (typeof document !== 'undefined') {
              document.getElementById('root').insertAdjacentHTML('beforeend', `<div id="error-msg" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"><div class="bg-white p-6 rounded-lg shadow-xl"><p>PDF export failed. Please try again.</p><button onclick="document.getElementById('error-msg').remove()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Close</button></div></div>`)
            }
            return null
        }
    }

    const exportToPDF = async (data, filename, columns) => {
        if (!data || data.length === 0) {
            // Use a custom modal or message box instead of alert
            console.warn("No data to export.")
            return
        }

        const jsPDF = await loadPdfLibs()
        if (!jsPDF) return

        const doc = new jsPDF()

        const head = [columns.map(col => col.label)]
        const body = data.map(item => {
            return columns.map(col => {
                let value = item[col.id]
                if (value === null || value === undefined) return '—'
                if (typeof value === 'object') return JSON.stringify(value)
                return String(value)
            })
        })

        doc.autoTable({
            head: head,
            body: body,
            startY: 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [99, 102, 241] },
            didDrawPage: function (data) {
                doc.setFontSize(14)
                doc.text(`Doctor List Report - ${filename}`, data.settings.margin.left, 15)
            },
        })

        doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`)
    }

    const printDoctorDetails = async (doctor) => {
        const jsPDF = await loadPdfLibs()
        if (!jsPDF) return

        const doc = new jsPDF()
        const margin = 15
        let y = margin

        doc.setFontSize(18)
        doc.text(`Doctor Information: ${doctor.name}`, margin, y)
        y += 10

        const merged = { ...doctor, ...(doctor.additional_data || {}) }

        const printGroups = FIELD_GROUPS.map(group => {
            const fields = group.fields.map(fieldId => {
                const field = MASTER_DOCTOR_FIELDS.find(f => f.id === fieldId)
                let value = merged[fieldId]

                if (fieldId === 'available_days' && typeof value === 'string') {
                    value = value.replace(/,/g, ', ')
                }

                return {
                    label: field?.label || fieldId,
                    value: String(value || 'N/A'),
                    id: fieldId,
                }
            }).filter(f => f.value !== 'N/A')
            return { title: group.title, fields }
        })

        printGroups.forEach(group => {
            if (group.fields.length > 0) {
                doc.setFontSize(12)
                doc.setTextColor(50)
                doc.text(group.title, margin, y)
                y += 2
                doc.line(margin, y, doc.internal.pageSize.width - margin, y)
                y += 2

                const body = group.fields.map(f => [f.label, f.value])

                doc.autoTable({
                    body: body,
                    startY: y,
                    theme: 'plain',
                    styles: { fontSize: 10, cellPadding: 2, textColor: [0, 0, 0] },
                    columnStyles: {
                        0: { fontStyle: 'bold', fillColor: [240], cellWidth: 50 },
                        1: { cellWidth: 'auto' }
                    },
                    margin: { left: margin, right: margin },
                    didDrawPage: (data) => { y = data.cursor.y },
                })
                y = doc.autoTable.previous.finalY + 5
            }
        })

        doc.save(`Doctor-Details-${doctor.name.replace(/\s/g, '_')}.pdf`)
    }

    return { exportToPDF, printDoctorDetails }
}

const exportToCSV = (data, filename, columns) => {
    if (!data || data.length === 0) {
        // Use a custom modal or message box instead of alert
        console.warn("No data to export.")
        return
    }

    const headers = columns.map(col => col.label).join(',')
    const rows = data.map(item => {
        return columns.map(col => {
            let value = item[col.id]
            if (value === null || value === undefined) {
                value = ''
            } else if (typeof value === 'object') {
                // Ensure array fields like available_days are properly formatted/escaped
                value = Array.isArray(value) ? value.join(';') : JSON.stringify(value).replace(/"/g, '""')
            }
            return `"${value}"`
        }).join(',')
    }).join('\n')

    const csvContent = headers + '\n' + rows
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// ====================================================================
// === TABLE COMPONENTS ===============================================
// ====================================================================

const ColumnVisibilityDropdown = ({ columns, setColumns }) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useMemo(() => ({ current: null }), [])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [dropdownRef])

    const handleToggle = (id) => {
        setColumns(prev => prev.map(col => 
            col.id === id ? { ...col, isVisible: !col.isVisible } : col
        ))
    }

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
            >
                <Table className="w-4 h-4 text-blue-600" />
                Columns
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 p-2">
                    <div className="p-2 border-b mb-1">
                        <p className="text-sm font-semibold text-gray-800">Toggle Visible Columns</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {columns.map(col => (
                            <div key={col.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50">
                                <input
                                    id={`column-toggle-${col.id}`}
                                    type="checkbox"
                                    checked={col.isVisible}
                                    onChange={() => handleToggle(col.id)}
                                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                />
                                <label 
                                    htmlFor={`column-toggle-${col.id}`} 
                                    className="ml-3 text-sm font-medium text-gray-700 cursor-pointer select-none"
                                >
                                    {col.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ====================================================================
// === MODALS =========================================================
// ====================================================================

const AddEditDoctorModal = ({ isOpen, onClose, doctorData, onSaveSuccess }) => {
  const isEdit = !!doctorData
  // Get fields that are mandatory based on the group requirement
  const mandatoryFields = useMemo(() => {
    const requiredGroupFields = FIELD_GROUPS
      .filter(g => g.required)
      .flatMap(g => g.fields)
    
    return MASTER_DOCTOR_FIELDS.filter(f => requiredGroupFields.includes(f.id))
  }, []) // mandatoryFields now correctly includes fields from Professional Information
  
  // State for collapse/expand
  const [openGroups, setOpenGroups] = useState(FIELD_GROUPS.map(g => g.title))

  const toggleGroup = (title) => {
    setOpenGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title) 
        : [...prev, title]
    )
  }

  const getInitialData = useCallback(() => {
    return MASTER_DOCTOR_FIELDS.reduce((acc, field) => {
      let defaultValue = field.type === 'checkboxes' ? [] : ''
      
      const value = doctorData
        ? (CORE_DB_FIELDS.includes(field.id) ? doctorData[field.id] : doctorData.additional_data?.[field.id]) || defaultValue
        : defaultValue
        
      acc[field.id] = (field.type === 'checkboxes' && typeof value === 'string' && value)
        ? value.split(',').filter(Boolean) // Filter(Boolean) removes empty strings
        : value

      return acc
    }, {})
  }, [doctorData])

  const [formData, setFormData] = useState(getInitialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialData())
      setError(null)
      // Open all required groups by default
      setOpenGroups(FIELD_GROUPS.filter(g => g.required).map(g => g.title))
    }
  }, [isOpen, getInitialData])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
        setFormData(prev => {
            const currentArray = Array.isArray(prev[name]) ? prev[name] : []
            if (checked) {
                return { ...prev, [name]: [...currentArray, value] }
            } else {
                return { ...prev, [name]: currentArray.filter(v => v !== value) }
            }
        })
    } else {
        setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Check only mandatory fields defined by the groups (Personal, Availability, and now Professional)
    const missing = mandatoryFields.filter(f => 
      (f.type === 'checkboxes' ? (!formData[f.id] || formData[f.id].length === 0) : !formData[f.id])
    )
    
    if (missing.length > 0) {
      setError(`Please fill all mandatory fields (in required groups): ${missing.map(m => m.label).join(', ')}`)
      setLoading(false)
      // Ensure the first failing group is open
      const firstMissingFieldId = missing[0].id
      const groupOfMissingField = FIELD_GROUPS.find(g => g.fields.includes(firstMissingFieldId))
      if (groupOfMissingField && !openGroups.includes(groupOfMissingField.title)) {
        toggleGroup(groupOfMissingField.title)
      }
      return
    }

    // FIX: Initialize coreData and additionalData here to prevent ReferenceError
    const coreData = {}
    const additionalData = {}
    
    // FIX: Add placeholder for `registration_date` to satisfy DB NOT NULL constraint for new records
    // This MUST happen after coreData is initialized.
    if (!isEdit) {
        // The original fields config didn't include 'registration_date'. 
        // Since the DB requires it, we must supply today's date for a new doctor.
        coreData.registration_date = new Date().toISOString().split('T')[0]
    }
    
    // ------------------------------------------------------------------------------------
    
    // Map formData to coreData and additionalData
    Object.keys(formData).forEach(key => {
      let value = formData[key]

      if (MASTER_DOCTOR_FIELDS.find(f => f.id === key)?.type === 'checkboxes') {
          // Convert array back to comma-separated string for DB storage
          value = Array.isArray(value) ? value.join(',') : null
      }
      
      if (CORE_DB_FIELDS.includes(key)) {
        coreData[key] = value || null
      } else {
        additionalData[key] = value || null
      }
    })
    
    // Removed redundant registration_date check as it's handled above
    
    const dataToSave = { ...coreData, additional_data: additionalData }

    try {
      let result
      if (isEdit) {
        // Remove registration_date from update payload if it was auto-added, as it's a fixed date
        delete dataToSave.registration_date
        
        result = await supabase
          .from(DOCTOR_TABLE)
          .update(dataToSave)
          .eq('doctor_id', doctorData.doctor_id)
      } else {
        result = await supabase
          .from(DOCTOR_TABLE)
          .insert(dataToSave)
      }

      if (result.error) throw result.error

      onSaveSuccess()
      onClose()
    } catch (err) {
      // Improved error message for DB NOT NULL constraint issues
      const dbError = err.message.includes('violates not-null constraint') 
        ? `A mandatory field is missing, likely due to a database constraint (e.g., 'registration_date' or 'license_number'). Details: ${err.message}`
        : err.message

      setError(`Failed to save: ${dbError}`)
    } finally {
      setLoading(false)
    }
  }
  
  const getColorClasses = (colorName) => {
    switch(colorName) {
      case 'purple': return 'text-purple-600 border-purple-200 bg-purple-50/50'
      case 'blue': return 'text-blue-600 border-blue-200 bg-blue-50/50'
      case 'red': return 'text-red-600 border-red-200 bg-red-50/50'
      case 'green': return 'text-green-600 border-green-200 bg-green-50/50'
      case 'orange': return 'text-orange-600 border-orange-200 bg-orange-50/50'
      default: return 'text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 bg-purple-600 text-white border-b-4 border-pink-400">
          <h3 className="text-2xl font-extrabold flex items-center gap-3">
            <Stethoscope className="w-6 h-6" />
            {isEdit ? 'Edit Doctor Profile' : 'Register New Doctor'}
          </h3>
          <button onClick={onClose} className="text-white opacity-90 hover:opacity-100 transition p-1 rounded-full bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {error && (
            <div className="my-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm font-medium">
                <p className="font-bold mb-1">Validation Error:</p>
                {error}
            </div>
          )}

          <form id="doctor-form" onSubmit={handleSubmit} className="space-y-4 pt-4">
            {FIELD_GROUPS.map(group => {
              const groupClasses = getColorClasses(group.color)
              const dotClass = `w-2 h-2 rounded-full bg-${group.color}-600`
              const isGroupOpen = openGroups.includes(group.title)
              
              const groupFields = group.fields.map(fieldId => MASTER_DOCTOR_FIELDS.find(f => f.id === fieldId)).filter(f => f)
              
              return (
                <div key={group.title} className={`border rounded-xl transition-all duration-300 overflow-hidden ${groupClasses.split(' ').filter(c => c.startsWith('border-')).join(' ')}`}>
                  <button 
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    className={`flex justify-between items-center w-full p-4 font-bold text-left transition-all duration-300 ${groupClasses.split(' ').filter(c => c.startsWith('bg-')).join(' ')} hover:bg-opacity-70`}
                  >
                    <h4 className={`text-lg flex items-center gap-2 ${groupClasses.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                      <span className={dotClass}></span>
                      {group.title}
                      <span className="text-xs font-normal opacity-70 ml-2">
                        ({group.required ? 'REQUIRED' : 'Optional'})
                      </span>
                    </h4>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isGroupOpen ? 'rotate-180' : 'rotate-0'}`} />
                  </button>

                  <div className={`p-4 transition-all duration-300 ${isGroupOpen ? 'max-h-full opacity-100' : 'max-h-0 p-0 opacity-0'}`} style={{ 
                      maxHeight: isGroupOpen ? '1000px' : '0', 
                      padding: isGroupOpen ? '1rem' : '0 1rem' 
                    }}>
                    <div className={`grid grid-cols-1 gap-4 ${group.fields.length > 2 ? 'md:grid-cols-2' : ''}`}>
                      {groupFields.map(field => {
                        // Check if the individual field is mandatory based on the group
                        const isMandatory = mandatoryFields.some(f => f.id === field.id)

                        let placeholderText = `e.g., ${field.label}`
                        let inputType = field.type
                        
                        if (field.id === 'specialization') placeholderText = 'e.g., Cardiology, Pediatrics'
                        if (field.id === 'license_number') placeholderText = 'e.g., pmd-127'
                        if (field.type === 'date') placeholderText = 'mm/dd/yyyy'
                        if (field.type === 'time') placeholderText = '--:-- --'
                        if (field.type === 'tel') placeholderText = '03001234567'

                        return (
                          <div key={field.id} className={field.id === 'street_address' ? 'md:col-span-2' : ''}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label}
                              {isMandatory && <span className="text-red-500 ml-1">*</span>}
                            </label>

                            {field.type === 'select' ? (
                              <select
                                name={field.id}
                                value={formData[field.id] || ''}
                                onChange={handleChange}
                                required={isMandatory}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition appearance-none"
                              >
                                <option value="" disabled>Select {field.label}</option>
                                {field.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.type === 'checkboxes' ? (
                              <div className="flex flex-wrap gap-x-4 gap-y-2 max-h-24 overflow-y-auto p-2 border rounded-lg bg-white">
                                  {field.options.map(day => (
                                      <div key={day} className="flex items-center">
                                          <input
                                              type="checkbox"
                                              id={`${field.id}-${day}`}
                                              name={field.id}
                                              value={day}
                                              checked={formData[field.id]?.includes(day) || false}
                                              onChange={handleChange}
                                              className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                                          />
                                          <label htmlFor={`${field.id}-${day}`} className="ml-2 text-sm font-medium text-gray-700 select-none">{day}</label>
                                      </div>
                                  ))}
                              </div>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                name={field.id}
                                value={formData[field.id] || ''}
                                onChange={handleChange}
                                rows={field.id === 'street_address' ? 2 : 3} 
                                required={isMandatory}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                              />
                            ) : (
                              <input
                                type={inputType}
                                name={field.id}
                                value={formData[field.id] || ''}
                                onChange={handleChange}
                                required={isMandatory}
                                placeholder={placeholderText}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </form>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition font-medium shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="doctor-form"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition font-semibold shadow-lg w-[160px]"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
            ) : (
              <>{isEdit ? 'Save Changes' : 'Add Doctor'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const ViewDoctorModal = ({ isOpen, onClose, doctorData }) => {
  if (!isOpen || !doctorData) return null

  const merged = useMemo(() => ({ 
      ...doctorData, 
      ...(doctorData.additional_data || {}) 
  }), [doctorData])

  const renderValue = (key, value) => {
    if (value === null || value === undefined || value === '' || value === 'null') {
      return <span className="text-gray-400 font-normal italic">N/A</span>
    }
    
    if ((key.includes('date') || key.includes('birth')) && value.length === 10) {
        // Simple date format for display
        return new Date(value + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    
    if (key === 'available_days' && typeof value === 'string') {
        return value.replace(/,/g, ', ')
    }

    return String(value)
  }

  const getColorClasses = (colorName) => {
    switch(colorName) {
      case 'purple': return 'text-purple-600 border-purple-200 bg-purple-50/50'
      case 'blue': return 'text-blue-600 border-blue-200 bg-blue-50/50'
      case 'red': return 'text-red-600 border-red-200 bg-red-50/50'
      case 'green': return 'text-green-600 border-green-200 bg-green-50/50'
      case 'orange': return 'text-orange-600 border-orange-200 bg-orange-50/50'
      default: return 'text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 bg-purple-600 text-white border-b-4 border-pink-400">
          <h3 className="text-2xl font-extrabold flex items-center gap-3">
            <Eye className="w-6 h-6" />
            Doctor Profile: {doctorData.name}
          </h3>
          <button onClick={onClose} className="text-white opacity-90 hover:opacity-100 transition p-1 rounded-full bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-6 space-y-6">
            {FIELD_GROUPS.map(group => {
              const groupClasses = getColorClasses(group.color)
              const dotClass = `w-2 h-2 rounded-full bg-${group.color}-600`
              
              const groupFields = group.fields
                .map(fieldId => {
                    const field = MASTER_DOCTOR_FIELDS.find(f => f.id === fieldId)
                    const value = merged[fieldId]

                    return { 
                        id: fieldId, 
                        label: field?.label.replace(/\s\([^)]+\)/, '') || fieldId, 
                        value: renderValue(fieldId, value)
                    }
                })
                .filter(f => f)

              // Only render groups that have actual data recorded (excluding N/A)
              const hasData = groupFields.some(f => f.value !== 'N/A')

              return hasData && (
                <div key={group.title} className={`p-4 rounded-xl border ${groupClasses.split(' ').filter(c => c.startsWith('border-')).join(' ')} ${groupClasses.split(' ').filter(c => c.startsWith('bg-')).join(' ')}`}>
                  <h4 className={`text-xl font-bold mb-4 flex items-center gap-2 ${groupClasses.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                    <span className={dotClass}></span>
                    {group.title}
                  </h4>
                  
                  <div className={`grid grid-cols-1 gap-x-6 gap-y-4 ${group.fields.length > 2 ? 'md:grid-cols-2' : ''}`}>
                    {groupFields.map(field => (
                        <div key={field.id} className={(field.id === 'street_address') ? 'md:col-span-2' : ''}>
                            <p className="block text-sm font-medium text-gray-600 mb-0.5">
                                {field.label}
                            </p>
                            <p className="text-base font-semibold text-gray-900 break-words">{field.value}</p>
                        </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
        
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition font-medium shadow-sm">Close</button>
        </div>
      </div>
    </div>
  )
}

const DeleteConfirmationModal = ({ isOpen, onClose, doctor, onDeleteConfirm }) => {
  if (!isOpen || !doctor) return null
  
  const [loading, setLoading] = useState(false)

  const handleDelete = async (id) => {
    setLoading(true)
    await onDeleteConfirm(id)
    setLoading(false)
    // Note: onClose is called inside handleDelete only after success to ensure UI state is correct
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="bg-red-100 p-3 rounded-full w-fit mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-800">Confirm Doctor Deletion</h3>
        <p className="text-sm text-gray-600 mb-6">Are you sure you want to perform a soft-delete for <strong>{doctor.name}</strong>? The record will be hidden from the list.</p>
        <div className="flex justify-center gap-3">
          <button onClick={onClose} disabled={loading} className="px-5 py-2.5 bg-gray-200 rounded-xl hover:bg-gray-300 transition font-medium">Cancel</button>
          <button onClick={() => handleDelete(doctor.doctor_id)} disabled={loading} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-md">
            {loading ? 'Deleting...' : 'Confirm Soft Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// === MAIN PAGE ======================================================
// ====================================================================

export default function DoctorListPage() {
  const [doctors, setDoctors] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDoctor, setEditDoctor] = useState(null)
  const [viewDoctor, setViewDoctor] = useState(null)
  const [deleteDoctor, setDeleteDoctor] = useState(null)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  
  // State for Column Visibility (New)
  const [columnConfig, setColumnConfig] = useState(() => 
    INITIAL_VISIBLE_COLUMNS.map(col => ({ 
      ...col, 
      isVisible: col.defaultVisible 
    }))
  )

  const { exportToPDF, printDoctorDetails } = usePdfExport()
  
  // Compute currently visible columns
  const visibleColumns = useMemo(() => 
    columnConfig.filter(col => col.isVisible)
  , [columnConfig])

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    
    // Simple search filter (case-insensitive name or specialization match)
    let query = supabase
      .from(DOCTOR_TABLE)
      .select('*', { count: 'exact' }) 
      .is('deleted_at', null)

    if (search) {
        // This performs a case-insensitive search on 'name' or 'specialization'
        query = query.or(`name.ilike.%${search}%,specialization.ilike.%${search}%`)
    }

    const { data, count, error } = await query
      .range((page - 1) * rowsPerPage, page * rowsPerPage - 1)
      .limit(rowsPerPage)
      
    if (error) {
        console.error("Error fetching doctors:", error)
        setDoctors([])
        setTotalCount(0)
    } else if (data) {
      const transformed = data.map(d => ({ 
          ...d, 
          ...(d.additional_data || {}),
      }))
      setDoctors(transformed)
      setTotalCount(count)
    }
    setLoading(false)
  }, [page, rowsPerPage, search]) // Depend on search state

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(+e.target.value)
    setPage(1)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from(DOCTOR_TABLE).update({ deleted_at: new Date().toISOString() }).eq('doctor_id', id)

    if (error) {
      console.error("Delete failed:", error)
    } else {
      // Refresh list
      fetchDoctors()
      // Close modal
      setDeleteDoctor(null)
    }
  }

  const totalPages = Math.ceil(totalCount / rowsPerPage)

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-800">
          <Stethoscope className="w-8 h-8 text-purple-600" />
          Doctor Management
        </h1>
        <div className="flex items-center gap-4">
          <span className="px-4 py-2 bg-purple-100 text-purple-700 font-semibold rounded-lg text-sm shadow-inner">
            {totalCount} Total Doctors
          </span>
          <button
            onClick={() => { setEditDoctor(null); setModalOpen(true) }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 transition font-semibold transform hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" /> Add Doctor
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div className="relative flex-1 w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or specialty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-sm focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white shadow-sm"
            >
              {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={() => exportToCSV(doctors, 'doctor_list', visibleColumns)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm font-medium shadow-sm"
          >
            <FileDown className="w-4 h-4 text-green-600" /> Export CSV
          </button>

          <button
            onClick={async () => {
              if (doctors.length === 0) {
                console.warn("No data to export.")
                return
              }
              await exportToPDF(doctors, 'doctor_list', visibleColumns)
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm font-medium shadow-sm"
          >
            <FileText className="w-4 h-4 text-red-600" /> Export PDF
          </button>

          <ColumnVisibilityDropdown 
            columns={columnConfig} 
            setColumns={setColumnConfig} 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-x-auto mt-6 border border-gray-100">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {visibleColumns.map(col => (
                <th key={col.id} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{col.label}</th>
              ))}
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={visibleColumns.length + 1} className="text-center py-12 text-gray-500">
                <div className="flex justify-center items-center gap-3">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></span>
                    Loading Doctor Data...
                </div>
              </td></tr>
            ) : doctors.length === 0 ? (
              <tr><td colSpan={visibleColumns.length + 1} className="text-center py-8 text-gray-500">No doctors found. Try refining your search.</td></tr>
            ) : doctors.map(d => (
              <tr key={d.doctor_id} className="hover:bg-purple-50/20 transition duration-150">
                {visibleColumns.map(col => (
                  <td key={col.id} className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{d[col.id] || '—'}</td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setViewDoctor(d)} title="View Details" className="p-2 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition shadow-sm transform hover:scale-105"><Eye className="w-5 h-5" /></button>
                    <button onClick={() => { setEditDoctor(d); setModalOpen(true) }} title="Edit Doctor" className="p-2 rounded-full text-purple-600 bg-purple-50 hover:bg-purple-100 transition shadow-sm transform hover:scale-105"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => setDeleteDoctor(d)} title="Delete Doctor" className="p-2 rounded-full text-red-600 bg-red-50 hover:bg-red-100 transition shadow-sm transform hover:scale-105"><Trash2 className="w-5 h-5" /></button>
                    <button title="Print" onClick={async () => await printDoctorDetails(d)} className="p-2 rounded-full text-gray-600 bg-gray-50 hover:bg-gray-100 transition shadow-sm transform hover:scale-105"><Printer className="w-5 h-5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-between items-center bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
        <p className="text-sm text-gray-600">
          Showing <strong>{(page - 1) * rowsPerPage + (doctors.length > 0 ? 1 : 0)}</strong> to <strong>{Math.min(page * rowsPerPage, totalCount)}</strong> of <strong>{totalCount}</strong> results
        </p>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-purple-50 rounded-lg text-sm font-medium text-purple-700 shadow-inner">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition font-medium shadow-sm">
            Previous
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition font-medium shadow-md">
            Next
          </button>
        </div>
      </div>

      <AddEditDoctorModal 
        isOpen={modalOpen} 
        onClose={() => { setModalOpen(false); setEditDoctor(null) }} 
        doctorData={editDoctor} 
        onSaveSuccess={fetchDoctors} 
      />
      <ViewDoctorModal isOpen={!!viewDoctor} onClose={() => setViewDoctor(null)} doctorData={viewDoctor} />
      <DeleteConfirmationModal isOpen={!!deleteDoctor} onClose={() => setDeleteDoctor(null)} doctor={deleteDoctor} onDeleteConfirm={handleDelete} />
    </div>
  )
}