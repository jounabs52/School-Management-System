'use client'

import { Search, Download, Plus, Trash2, Edit, X, Eye, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase' 
import * as XLSX from 'xlsx'

let jsPDF;
let autoTable;
if (typeof window !== 'undefined') {
  if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.autoTable !== 'undefined') {
      jsPDF = window.jspdf;
      autoTable = window.jspdf.autoTable;
  } else {
      import('jspdf').then(mod => { jsPDF = mod.default });
      import('jspdf-autotable').then(mod => { autoTable = mod.default || mod });
  }
}

// --- YOUR PROJECT'S EXACT COLORS ---
const PURPLE_600_RGB = [147, 51, 234]   // #9333EA
const PINK_600_RGB = [236, 72, 153]    // #EC4899

const GRADIENT_BG_CLASS = 'bg-gradient-to-r from-purple-600 to-pink-600'
const GRADIENT_HOVER_BG_CLASS = 'hover:from-purple-700 hover:to-pink-700'
const PRIMARY_TEXT_CLASS = 'text-purple-600'
const PRIMARY_BG_CLASS = 'bg-purple-600'
const HOVER_BG_CLASS = 'hover:bg-purple-700'
const FOCUS_RING_CLASS = 'focus:ring-purple-600 focus:border-purple-600'

const PDF_HEADER_RGB = PURPLE_600_RGB
const PDF_ACCENT_RGB = PINK_600_RGB

const PATIENT_TABLE = 'patients'
const LOCAL_STORAGE_KEY = 'patient-form-config' 
const CORE_DB_FIELDS = ['name', 'phone', 'cnic', 'registration_date', 'email', 'gender', 'dob', 'bmi', 'blood_group', 'location']
const DEFAULT_ROWS_PER_PAGE = 10

const MASTER_PATIENT_FIELDS = [
  { id: 'patient_id', label: 'ID', isListDefault: false, mandatory: false, type: 'number', isReadOnly: true },
  { id: 'mr_number', label: 'MR NUMBER', isListDefault: true, mandatory: false, type: 'text', isReadOnly: true }, 
  { id: 'name', label: 'FULL NAME', isListDefault: true, mandatory: true, type: 'text' },
  { id: 'phone', label: 'PHONE NUMBER', isListDefault: true, mandatory: true, type: 'tel' },
  { id: 'cnic', label: 'CNIC', isListDefault: false, mandatory: false, type: 'text' },
  { id: 'registration_date', label: 'REGISTRATION DATE', isListDefault: true, mandatory: true, type: 'date' },
  { id: 'gender', label: 'GENDER', isListDefault: true, mandatory: true, type: 'select', options: ['Female', 'Male', 'Other'] },
  { id: 'height', label: 'Height (cm)', isListDefault: false, mandatory: false, type: 'number' },
  { id: 'marital_status', label: 'Marital Status', isListDefault: false, mandatory: true, type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
  { id: 'date_of_birth', label: 'DOB', isListDefault: false, mandatory: false, type: 'date' },
  { id: 'address', label: 'ADDRESS', isListDefault: false, mandatory: false, type: 'text' }, 
  { id: 'email', label: 'EMAIL', isListDefault: false, mandatory: false, type: 'email' },
  { id: 'bmi', label: 'BMI', isListDefault: false, mandatory: false, type: 'text' },
  { id: 'blood_group', label: 'Blood Group', isListDefault: false, mandatory: false, type: 'text' },
  { id: 'age', label: 'AGE', isListDefault: false, mandatory: false, type: 'number' },
  { id: 'assign_doctor', label: 'Assign Doctor', isListDefault: false, mandatory: false, type: 'select', options: ['Shafqat', 'Dr. Ali', 'Unassigned'] },
]

const getMRNumber = (p) => p.cnic ? `MR#${p.cnic}` : `MR#${String(p.patient_id).padStart(3, '0')}`

const getActiveFields = () => {
  try {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY)
    let activeFields = MASTER_PATIENT_FIELDS.filter(f => f.mandatory)
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      const enabledFields = MASTER_PATIENT_FIELDS.filter(f => 
        !f.mandatory && config[f.id] === true
      )
      activeFields = [...activeFields, ...enabledFields]
    }
    return activeFields.filter(f => f.id !== 'mr_number')
  } catch (e) {
    console.error('Error reading form config:', e)
    return MASTER_PATIENT_FIELDS.filter(f => f.mandatory && f.id !== 'mr_number')
  }
}

const getDefaultVisibleColumnIds = () => ['name', 'phone', 'gender', 'registration_date'] 
const saveVisibleColumnIds = (ids) => localStorage.setItem('VISIBLE_PATIENT_COLUMNS', JSON.stringify(ids))
const loadVisibleColumnIds = () => {
  try {
    const saved = localStorage.getItem('VISIBLE_PATIENT_COLUMNS')
    return saved ? JSON.parse(saved) : getDefaultVisibleColumnIds()
  } catch {
    return getDefaultVisibleColumnIds()
  }
}

// --- COMPONENTS ---
const Backdrop = ({ onClick, children }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClick}>
    <div onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
)

const AddEditPatientModal = ({ isOpen, onClose, patientData, onSaveSuccess }) => {
  const isEdit = !!patientData
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visibleFields, setVisibleFields] = useState([])

  useEffect(() => {
    if (isOpen) {
      const fields = getActiveFields()
      setVisibleFields(fields)
      const initial = {}
      fields.forEach(f => {
        if (f.id === 'patient_id' || f.id === 'mr_number') return
        const dbKey = f.id === 'date_of_birth' ? 'dob' : f.id === 'address' ? 'location' : f.id
        initial[f.id] = patientData
          ? (patientData[f.id] || patientData[dbKey] || patientData.additional_data?.[f.id] || '')
          : ''
        if (f.id === 'registration_date' && !patientData) initial[f.id] = new Date().toISOString().split('T')[0]
        if (f.id === 'registration_date' && patientData && patientData.registration_date) {
            initial[f.id] = new Date(patientData.registration_date).toISOString().split('T')[0]
        }
      })
      setFormData(initial)
      setError('')
    }
  }, [isOpen, patientData])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')
    
    const coreData = {}, additionalData = {}
    for (const field of visibleFields.filter(f => f.mandatory && f.id !== 'patient_id')) {
      if (!formData[field.id] || String(formData[field.id]).trim() === '') {
        setError(`Please fill: ${field.label}`)
        setLoading(false)
        return
      }
    }

    Object.keys(formData).forEach(key => {
      if (key === 'patient_id' || key === 'mr_number') return
      const dbName = key === 'date_of_birth' ? 'dob' : key === 'address' ? 'location' : key
      if (CORE_DB_FIELDS.includes(dbName)) coreData[dbName] = formData[key] || null
      else additionalData[key] = formData[key] || null
    })
    
    Object.keys(coreData).forEach(key => {
        if (coreData[key] === '') coreData[key] = null
    })

    const payload = { 
        ...coreData, 
        additional_data: Object.keys(additionalData).length > 0 ? additionalData : null,
        updated_at: new Date().toISOString(),
    }
    
    if (!isEdit) {
        payload.created_at = new Date().toISOString()
    }

    try {
      const { error } = isEdit
        ? await supabase.from(PATIENT_TABLE).update(payload).eq('patient_id', patientData.patient_id)
        : await supabase.from(PATIENT_TABLE).insert(payload)

      if (error) throw error
      onSaveSuccess()
      onClose()
    } catch (err) {
      setError(err.message.includes('cnic') ? 'MR Number / CNIC already exists!' : err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Backdrop onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{isEdit ? 'Edit' : 'Add New'} Patient</h2>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-500 hover:text-gray-700" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-6">Fill in the patient details below</p>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleFields.filter(f => f.id !== 'patient_id').map(f => (
              <div key={f.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {f.label} {f.mandatory && <span className="text-red-500">*</span>}
                </label>
                {f.type === 'select' ? (
                  <select
                    value={formData[f.id] || ''}
                    onChange={e => setFormData({ ...formData, [f.id]: e.target.value })}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${FOCUS_RING_CLASS} focus:border-transparent`}
                    required={f.mandatory}
                    disabled={f.isReadOnly}
                  >
                    <option value="">Select {f.label}</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'number' ? 'number' : 'text'}
                    value={formData[f.id] || ''}
                    onChange={e => setFormData({ ...formData, [f.id]: e.target.value })}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 ${FOCUS_RING_CLASS} focus:border-transparent`}
                    required={f.mandatory}
                    readOnly={f.isReadOnly}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 ${GRADIENT_BG_CLASS} text-white rounded-xl font-medium ${GRADIENT_HOVER_BG_CLASS} shadow-md disabled:opacity-70`}
            >
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </Backdrop>
  )
}

const ViewPatientModal = ({ isOpen, onClose, patientData, masterFields }) => {
  if (!isOpen || !patientData) return null
  
  const merged = useMemo(() => ({ 
    ...patientData, 
    ...(patientData.additional_data || {}),
    date_of_birth: patientData.dob,
    address: patientData.location,
    mr_number: getMRNumber(patientData),
  }), [patientData]);

  const fields = useMemo(() => {
    const all = masterFields.map(f => {
      const value = merged[f.id] || merged[f.id === 'address' ? 'location' : f.id === 'date_of_birth' ? 'dob' : f.id];
      if (!value) return null
      let displayValue = String(value);
      if (f.type === 'date' && value) displayValue = new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
      return { id: f.id, label: f.label, value: displayValue, mandatory: f.mandatory };
    }).filter(Boolean);

    const mrField = { id: 'mr_number', label: 'MR NUMBER', value: merged.mr_number, mandatory: false };
    const sortedFields = all
      .sort((a, b) => (b.mandatory ? 1 : 0) - (a.mandatory ? 1 : 0))
      .filter(f => f.id !== 'patient_id');
    return [mrField, ...sortedFields.filter(f => f.id !== 'mr_number')];
  }, [merged, masterFields]);

  const handleDownloadPDF = async () => {
    if (!jsPDF || !autoTable) return alert('PDF library not loaded yet.')
    try {
      const doc = new jsPDF()
      const name = merged.name || 'Patient Record'
      doc.setFontSize(18)
      doc.setTextColor(...PDF_ACCENT_RGB) 
      doc.text("Patient Full Record", 14, 20)
      doc.line(14, 22, 196, 22)
      const body = fields.map(f => [f.label, f.value])
      autoTable(doc, { 
        head: [['Field', 'Value']], 
        body, 
        startY: 25, 
        theme: 'striped', 
        headStyles: { fillColor: PDF_ACCENT_RGB }, 
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      })
      doc.save(`${name.replace(/\s/g, '_')}_Record.pdf`)
    } catch (err) {
      alert('PDF Export Error: ' + err.message)
    }
  }

  return (
    <Backdrop onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div className='flex items-center gap-3'>
            <div className={`w-12 h-12 ${GRADIENT_BG_CLASS} rounded-xl flex items-center justify-center shadow-lg`}>
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Patient View</h2>
              <p className="text-sm text-gray-500">{merged.mr_number}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button onClick={handleDownloadPDF} className={`flex items-center gap-1 px-4 py-2 ${PRIMARY_BG_CLASS} text-white rounded-lg text-sm font-medium ${HOVER_BG_CLASS} shadow-md`}>
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={onClose} className='p-2 rounded-full hover:bg-gray-100'><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 shadow-inner">
              <p className={`font-medium ${PRIMARY_TEXT_CLASS} text-sm`}>{f.label}</p>
              <p className="text-gray-900 font-semibold mt-1 break-words">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Backdrop>
  )
}

const DeleteConfirmationModal = ({ isOpen, onClose, patient, onDeleteConfirm }) => {
  if (!isOpen || !patient) return null
  return (
    <Backdrop onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
        <Trash2 className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <p className="text-xl font-bold">Soft-Delete {patient.name}?</p>
        <p className="text-gray-600 mb-6">Are you sure you want to mark this record as deleted? {getMRNumber(patient)}</p>
        <div className="flex gap-4 justify-center">
          <button onClick={onClose} className="px-6 py-3 bg-gray-200 rounded-xl hover:bg-gray-300">Cancel</button>
          <button onClick={() => onDeleteConfirm(patient.patient_id)} className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-md">Confirm Delete</button>
        </div>
      </div>
    </Backdrop>
  )
}

const ColumnsSelectionModal = ({ isOpen, onClose, allFields, visibleIds, setVisibleIds }) => {
  if (!isOpen) return null
  const toggle = (id) => {
    const defaultColumns = getDefaultVisibleColumnIds(); 
    if (defaultColumns.includes(id)) return 
    const newIds = visibleIds.includes(id) ? visibleIds.filter(x => x !== id) : [...visibleIds, id]
    setVisibleIds(newIds)
    saveVisibleColumnIds(newIds)
  }
  const allListFields = MASTER_PATIENT_FIELDS.filter(f => f.id !== 'patient_id')
  return (
    <Backdrop onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-6">Select Columns</h3>
        <div className="space-y-3">
          {allListFields.map(f => (
            <label key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
              <span>{f.label} {getDefaultVisibleColumnIds().includes(f.id) && <span className={`text-xs ${PRIMARY_TEXT_CLASS} font-bold`}>(Default)</span>}</span>
              <input 
                type="checkbox" 
                checked={visibleIds.includes(f.id)} 
                onChange={() => toggle(f.id)} 
                disabled={getDefaultVisibleColumnIds().includes(f.id)} 
                className={`w-5 h-5 text-purple-600 rounded focus:ring-purple-500`}
              />
            </label>
          ))}
        </div>
        <button onClick={onClose} className={`mt-8 w-full py-4 ${PRIMARY_BG_CLASS} text-white rounded-xl font-bold ${HOVER_BG_CLASS} shadow-md`}>Done ({visibleIds.length})</button>
      </div>
    </Backdrop>
  )
}

export default function PatientListPage() {
  const [patients, setPatients] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [custom, setCustom] = useState({ start: '', end: '' })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [visibleColumnIds, setVisibleColumnIds] = useState(loadVisibleColumnIds())
  const [activeFields, setActiveFields] = useState(getActiveFields())
  const perPage = DEFAULT_ROWS_PER_PAGE
  const [showAddEdit, setShowAddEdit] = useState(false)
  const [editPatient, setEditPatient] = useState(null)
  const [showView, setShowView] = useState(false)
  const [viewPatient, setViewPatient] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deletePatient, setDeletePatient] = useState(null)
  const [showColumns, setShowColumns] = useState(false)

  const fetchPatients = async () => {
    setLoading(true)
    const offset = (page - 1) * perPage
    const fields = ['patient_id', 'name', 'phone', 'cnic', 'registration_date', 'email', 'gender', 'bmi', 'blood_group', 'dob', 'location', 'additional_data', 'created_at', 'updated_at']
    let q = supabase.from(PATIENT_TABLE).select(fields.join(','), { count: 'exact' }).is('deleted_at', null)
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,cnic.ilike.%${search}%`)
    const { data, count, error } = await q.order('registration_date', { ascending: false }).range(offset, offset + perPage - 1)
    if (error) {
      alert('Error fetching patients: ' + error.message)
      setPatients([])
    } else {
      const mapped = data.map(p => ({ 
        ...p, 
        mr_number: getMRNumber(p), 
        date_of_birth: p.dob, 
        address: p.location, 
      }))
      setPatients(mapped)
      setTotal(count || 0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchPatients() }, [search, dateFilter, custom, page])
  useEffect(() => { if(showAddEdit) setActiveFields(getActiveFields()) }, [showAddEdit])

  const softDeletePatient = async (patientId) => {
    try {
      const { error } = await supabase.from(PATIENT_TABLE).update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('patient_id', patientId)
      if (error) throw error
      fetchPatients()
      setShowDelete(false)
    } catch (err) {
      alert('Deletion Error: ' + err.message)
    }
  }

  const downloadSinglePatientPDF = async (patient) => { 
    if (!jsPDF || !autoTable) return alert('PDF library not loaded yet.')
    try {
      const doc = new jsPDF()
      const merged = { ...patient, ...(patient.additional_data || {}) }
      const name = patient.name || 'Patient'
      const mrNumber = getMRNumber(patient)
      doc.setFontSize(18)
      doc.text(`Patient Record: ${name}`, 14, 20)
      doc.setFontSize(10)
      doc.text(mrNumber, 14, 28)
      const body = MASTER_PATIENT_FIELDS
        .filter(f => f.id !== 'patient_id' && merged[f.id] != null)
        .map(f => {
          const displayValue = f.type === 'date' ? new Date(merged[f.id]).toLocaleDateString() : String(merged[f.id])
          return [f.label, displayValue]
        })
      autoTable(doc, { 
        head: [['Field', 'Value']], 
        body, 
        startY: 35, 
        theme: 'striped', 
        headStyles: { fillColor: PDF_ACCENT_RGB }
      })
      doc.save(`${name.replace(/\s/g, '_')}_Record.pdf`)
    } catch (err) {
      alert('PDF Download Error: ' + err.message)
    }
  }

  const exportPDF = async () => {
    if (!jsPDF || !autoTable) return alert('PDF library not loaded yet.')
    try {
      const doc = new jsPDF('l', 'mm', 'a4', true)
      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
      const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      doc.setFillColor(...PDF_HEADER_RGB)
      doc.rect(0, 0, 297, 30, 'F')
      doc.setFontSize(18)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('Gynecology Clinic', 14, 15)
      doc.setFontSize(12)
      doc.text('Patient List Report', 14, 23)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(`Generated: ${currentDate}, ${currentTime}`, 283, 15, { align: 'right' })
      doc.text(`Total Patients: ${total}`, 283, 23, { align: 'right' })
      doc.setFontSize(14)
      doc.setTextColor(55, 65, 81)
      doc.text('PATIENT LIST REPORT', 14, 40)
      const columns = MASTER_PATIENT_FIELDS.filter(f => visibleColumnIds.includes(f.id) && f.id !== 'patient_id')
      const head = [columns.map(f => f.label)]
      const body = patients.map((p) => {
        const merged = { ...p, ...p.additional_data }
        return columns.map(f => {
          if (f.id === 'mr_number') return p.mr_number
          if (f.id === 'registration_date' && merged[f.id]) return new Date(merged[f.id]).toLocaleDateString()
          if (f.id === 'date_of_birth' && merged[f.id]) return new Date(merged[f.id]).toLocaleDateString()
          return merged[f.id] ?? '—'
        })
      })
      autoTable(doc, { 
        head, 
        body, 
        startY: 50, 
        theme: 'striped', 
        headStyles: { fillColor: PDF_ACCENT_RGB, fontStyle: 'bold', textColor: [255, 255, 255], fontSize: 8 }, 
        styles: { fontSize: 8, cellPadding: 1 },
        margin: { left: 14, right: 14 }
      })
      doc.save('PatientListReport.pdf')
    } catch (e) {
      alert('PDF export failed: ' + e.message)
    }
  }

  const exportExcel = async () => {
    const ws = XLSX.utils.json_to_sheet(patients.map(p => {
      const merged = { ...p, ...p.additional_data }
      const row = {}
      MASTER_PATIENT_FIELDS
        .filter(f => visibleColumnIds.includes(f.id) && f.id !== 'patient_id')
        .forEach(f => {
            if (f.id === 'mr_number') row[f.label] = p.mr_number
            else row[f.label] = merged[f.id] ?? ''
        })
      return row
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Patients')
    XLSX.writeFile(wb, 'Patients.xlsx')
  }

  const totalPages = Math.ceil(total / perPage)
  const columnsToShow = MASTER_PATIENT_FIELDS.filter(f => visibleColumnIds.includes(f.id) && f.id !== 'patient_id')

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-teal-50">
        <div className="max-w-7xl mx-auto p-6">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
              <div className={`w-8 h-8 ${PRIMARY_BG_CLASS} rounded-lg flex items-center justify-center shadow-md`}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              Patient Management
            </h1>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 bg-purple-100 ${PRIMARY_TEXT_CLASS} rounded-full text-sm font-medium`}>
                {total} Total Patients
              </span>
              <button
                onClick={() => { setEditPatient(null); setShowAddEdit(true) }}
                className={`flex items-center gap-2 px-4 py-2 ${GRADIENT_BG_CLASS} text-white rounded-full font-medium ${GRADIENT_HOVER_BG_CLASS} shadow-lg transition duration-200`}
              >
                <Plus className="w-5 h-5" /> Add Patient
              </button>
            </div>
          </div>

          {/* SEARCH & ACTIONS */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  placeholder="Search patients by Name, Phone, or CNIC..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  className={`w-full pl-12 pr-5 py-3 rounded-xl border border-purple-200 focus:ring-2 ${FOCUS_RING_CLASS} text-base`}
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium transition duration-150 text-sm whitespace-nowrap border border-green-200">
                  <Download className="w-4 h-4" /> Export Excel
                </button>
                <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition duration-150 text-sm whitespace-nowrap border border-red-200">
                  <Download className="w-4 h-4" /> Export PDF
                </button>
                <button onClick={() => setShowColumns(true)} className={`flex items-center gap-1 px-3 py-2 bg-purple-50 ${PRIMARY_TEXT_CLASS} rounded-lg hover:bg-purple-100 font-medium transition duration-150 text-sm whitespace-nowrap border border-purple-200`}>
                  <Filter className="w-4 h-4" /> Columns
                </button>
              </div>
            </div>
          </div>

          {loading && <div className="text-center py-10 text-xl font-bold text-purple-600">Loading Patients...</div>}
          {!loading && patients.length === 0 && <div className="text-center py-10 text-xl font-bold text-purple-600">No patients found.</div>}

          {patients.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-purple-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${GRADIENT_BG_CLASS} text-white`}>
                    <tr>
                      {columnsToShow.map(f => (
                        <th key={f.id} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">{f.label}</th>
                      ))}
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {patients.map((p) => {
                      const merged = { ...p, ...p.additional_data }
                      return (
                        <tr key={p.patient_id} className="hover:bg-purple-50 transition duration-100">
                          {columnsToShow.map(f => (
                            <td key={f.id} className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {f.id === 'mr_number' ? p.mr_number : merged[f.id] || '—'}
                            </td>
                          ))}
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex gap-3 justify-center">
                              <button onClick={() => { setViewPatient(p); setShowView(true) }} title='View' className="p-2 text-purple-600 hover:text-purple-800 bg-purple-50 rounded-full"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => { setEditPatient(p); setShowAddEdit(true) }} title='Edit' className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-full"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => downloadSinglePatientPDF(p)} title='PDF' className={`p-2 ${PRIMARY_TEXT_CLASS} hover:text-pink-800 bg-pink-50 rounded-full`}><Download className="w-4 h-4" /></button>
                              <button onClick={() => { setDeletePatient(p); setShowDelete(true) }} title='Delete' className="p-2 text-red-600 hover:text-red-800 bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-purple-50">
                  <p className="text-sm text-purple-700">
                    Showing <span className='font-bold'>{(page - 1) * perPage + 1}</span> to <span className='font-bold'>{Math.min(page * perPage, total)}</span> of <span className='font-bold'>{total}</span> records
                  </p>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p-1))} 
                        disabled={page === 1} 
                        className="px-4 py-2 border border-purple-300 rounded-xl disabled:opacity-50 bg-white hover:bg-purple-50 text-purple-700 flex items-center gap-1 shadow-sm"
                    >
                        <ChevronLeft className='w-4 h-4' /> Previous
                    </button>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p+1))} 
                        disabled={page === totalPages} 
                        className={`px-4 py-2 border rounded-xl disabled:opacity-50 ${PRIMARY_BG_CLASS} text-white ${HOVER_BG_CLASS} flex items-center gap-1 shadow-sm`}
                    >
                        Next <ChevronRight className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddEditPatientModal isOpen={showAddEdit} onClose={() => { setShowAddEdit(false); setEditPatient(null); fetchPatients(); }} patientData={editPatient} onSaveSuccess={fetchPatients} />
      <ViewPatientModal isOpen={showView} onClose={() => setShowView(false)} patientData={viewPatient} masterFields={MASTER_PATIENT_FIELDS} />
      <DeleteConfirmationModal isOpen={showDelete} onClose={() => setShowDelete(false)} patient={deletePatient} onDeleteConfirm={softDeletePatient} />
      <ColumnsSelectionModal isOpen={showColumns} onClose={() => setShowColumns(false)} allFields={MASTER_PATIENT_FIELDS} visibleIds={visibleColumnIds} setVisibleIds={setVisibleColumnIds} />
    </>
  )
}