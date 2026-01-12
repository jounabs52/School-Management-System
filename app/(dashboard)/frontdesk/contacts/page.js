'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  X, Plus, Search, Users, Upload, Mail, Phone, Edit, Trash2, MessageCircle,
  CheckCircle, XCircle, AlertCircle, FileSpreadsheet, Download, Filter, ChevronDown, User as UserIcon
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getPdfSettings, hexToRgb, getAutoTableStyles } from '@/lib/pdfSettings'
import PDFPreviewModal from '@/components/PDFPreviewModal'

export default function ContactsPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [contacts, setContacts] = useState([])
  const [filteredContacts, setFilteredContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('Via General Data')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [selectedContacts, setSelectedContacts] = useState([])
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    group_id: '',
    company: '',
    mobile: '',
    whatsapp: ''
  })

  // Group form state
  const [groupFormData, setGroupFormData] = useState({
    group_name: '',
    description: ''
  })

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm
    })
  }

  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm()
    }
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

  const handleCancelConfirm = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

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

  // Apply blur effect to sidebar when modals are open
  useEffect(() => {
    if (showAddModal || showGroupModal || showImportModal || confirmDialog.show) {
      document.body.style.overflow = 'hidden'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = 'blur(4px)'
        sidebar.style.pointerEvents = 'none'
      }
    } else {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }

    return () => {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }
  }, [showAddModal, showGroupModal, showImportModal, confirmDialog.show])

  // Search options
  const searchOptions = [
    'Via General Data',
    'Via Name',
    'Via Mobile',
    'Via WhatsApp',
    'Via Company',
    'Via Group'
  ]

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

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchGroups()
      fetchContacts()
    }
  }, [currentUser])

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .order('group_name')

      if (error) throw error
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('contacts')
        .select(`
          *,
          contact_groups (
            id,
            group_name
          )
        `)
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setContacts(data || [])
      setFilteredContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      showToast('Failed to fetch contacts', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Search functionality
  const handleSearch = () => {
    if (!searchQuery.trim() && !selectedGroup) {
      setFilteredContacts(contacts)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    let filtered = contacts

    // Apply group filter first
    if (selectedGroup && selectedGroup !== '') {
      filtered = filtered.filter(c => c.group_id === selectedGroup)
    }

    // Apply search filter
    if (query) {
      switch (searchType) {
        case 'Via Name':
          filtered = filtered.filter(c => c.name?.toLowerCase().includes(query))
          break
        case 'Via Mobile':
          filtered = filtered.filter(c => c.mobile?.toLowerCase().includes(query))
          break
        case 'Via WhatsApp':
          filtered = filtered.filter(c => c.whatsapp?.toLowerCase().includes(query))
          break
        case 'Via Company':
          filtered = filtered.filter(c => c.company?.toLowerCase().includes(query))
          break
        case 'Via Group':
          filtered = filtered.filter(c =>
            c.contact_groups?.group_name?.toLowerCase().includes(query)
          )
          break
        case 'Via General Data':
        default:
          filtered = filtered.filter(c =>
            c.name?.toLowerCase().includes(query) ||
            c.mobile?.toLowerCase().includes(query) ||
            c.whatsapp?.toLowerCase().includes(query) ||
            c.company?.toLowerCase().includes(query) ||
            c.contact_groups?.group_name?.toLowerCase().includes(query)
          )
          break
      }
    }

    setFilteredContacts(filtered)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      group_id: '',
      company: '',
      mobile: '',
      whatsapp: ''
    })
  }

  const resetGroupForm = () => {
    setGroupFormData({
      group_name: '',
      description: ''
    })
  }

  const handleSaveContact = async () => {
    if (!formData.name || !formData.mobile || !formData.group_id) {
      showToast('Please fill all required fields', 'error')
      return
    }

    setSaving(true)
    try {
      const contactData = {
        ...formData,
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        created_by: currentUser.id,
        whatsapp: formData.whatsapp || null,
        company: formData.company || null
      }

      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id)
          .eq('user_id', currentUser.id)
          .eq('school_id', currentUser.school_id)

        if (error) throw error
        showToast('Contact updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('contacts')
          .insert([contactData])

        if (error) throw error
        showToast('Contact added successfully', 'success')
      }

      setShowAddModal(false)
      setEditingContact(null)
      resetForm()
      fetchContacts()
    } catch (error) {
      console.error('Error saving contact:', error)
      showToast(error.message || 'Failed to save contact', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveGroup = async () => {
    if (!groupFormData.group_name) {
      showToast('Please enter group name', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('contact_groups')
        .insert([{
          ...groupFormData,
          user_id: currentUser.id,
          school_id: currentUser.school_id,
          created_by: currentUser.id
        }])

      if (error) throw error
      showToast('Group created successfully', 'success')
      setShowGroupModal(false)
      resetGroupForm()
      fetchGroups()
    } catch (error) {
      console.error('Error creating group:', error)
      showToast(error.message || 'Failed to create group', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditContact = (contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name || '',
      group_id: contact.group_id || '',
      company: contact.company || '',
      mobile: contact.mobile || '',
      whatsapp: contact.whatsapp || ''
    })
    setShowAddModal(true)
  }

  const handleDeleteContact = (id) => {
    showConfirmDialog(
      'Delete Contact',
      'Are you sure you want to delete this contact? This action cannot be undone.',
      async () => {
        try {
          const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id)
            .eq('school_id', currentUser.school_id)

          if (error) throw error
          showToast('Contact deleted successfully', 'success')
          fetchContacts()
        } catch (error) {
          console.error('Error deleting contact:', error)
          showToast('Failed to delete contact', 'error')
        }
      }
    )
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedContacts(filteredContacts.map(c => c.id))
    } else {
      setSelectedContacts([])
    }
  }

  const handleSelectContact = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    )
  }

  const handleWhatsApp = (number) => {
    if (number) {
      const cleanNumber = number.replace(/\D/g, '')
      window.open(`https://wa.me/${cleanNumber}`, '_blank')
    }
  }

  const exportToExcel = () => {
    try {
      const exportData = filteredContacts.map((contact, index) => ({
        'Sr.': index + 1,
        'Name': contact.name,
        'Group': contact.contact_groups?.group_name || 'N/A',
        'Company': contact.company || 'N/A',
        'Mobile': contact.mobile,
        'WhatsApp': contact.whatsapp || 'N/A'
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts')
      XLSX.writeFile(workbook, `Contacts_${new Date().toISOString().split('T')[0]}.xlsx`)
      showToast('Excel file exported successfully', 'success')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      showToast('Failed to export Excel file', 'error')
    }
  }

  const exportToPDF = () => {
    try {
      // Get PDF settings from localStorage
      const settings = getPdfSettings()
      console.log('📄 Using PDF settings for Contacts export:', settings)

      // Create PDF with settings
      const doc = new jsPDF({
        orientation: settings.orientation || 'portrait',
        unit: 'mm',
        format: settings.pageSize || 'A4'
      })

      // Apply font settings
      if (settings.fontFamily) {
        try {
          doc.setFont(settings.fontFamily.toLowerCase())
        } catch (e) {
          doc.setFont('helvetica')
        }
      }

      // Header section
      const headerColor = hexToRgb(settings.headerBackgroundColor)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...headerColor)
      doc.text('Contacts Directory', 14, 20)

      // Subheader info
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)

      if (settings.includeDate || settings.includeGeneratedDate) {
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28)
      }
      doc.text(`Total Contacts: ${filteredContacts.length}`, 14, 34)

      // Prepare table data
      const tableData = filteredContacts.map((contact, index) => [
        index + 1,
        contact.name,
        contact.contact_groups?.group_name || 'N/A',
        contact.company || 'N/A',
        contact.mobile,
        contact.whatsapp || 'N/A'
      ])

      // Get table styles from settings
      const tableStyles = getAutoTableStyles(settings)

      // Generate table with settings
      autoTable(doc, {
        startY: 40,
        head: [['Sr.', 'Name', 'Group', 'Company', 'Mobile', 'WhatsApp']],
        body: tableData,
        ...tableStyles,
        // Override specific styles for this table
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 }, // Sr.
          1: { halign: 'left', cellWidth: 35 },   // Name
          2: { halign: 'left', cellWidth: 30 },   // Group
          3: { halign: 'left', cellWidth: 35 },   // Company
          4: { halign: 'center', cellWidth: 30 }, // Mobile
          5: { halign: 'center', cellWidth: 30 }  // WhatsApp
        }
      })

      // Add page numbers if enabled
      if (settings.includePageNumbers) {
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.setFontSize(8)
          doc.setTextColor(128, 128, 128)
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          )
        }
      }

      // Generate PDF blob for preview
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)

      // Set state for preview modal
      const fileName = `Contacts_${new Date().toISOString().split('T')[0]}.pdf`
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('PDF generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      showToast('Failed to export PDF', 'error')
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
  }

  // Download sample CSV template
  const downloadSampleCSV = () => {
    const headers = ['name', 'group_name', 'company', 'mobile', 'whatsapp']
    const sampleData = [
      ['John Doe', 'Parents', 'ABC Company', '03001234567', '03001234567'],
      ['Jane Smith', 'Teachers', 'XYZ Corp', '03009876543', '03009876543']
    ]

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'contacts_import_template.csv'
    link.click()
  }

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImportFile(file)
    }
  }

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      showToast('Please select a file first', 'warning')
      return
    }

    if (!currentUser?.school_id) {
      showToast('Error: No school ID found. Please login again.', 'error')
      return
    }

    setImporting(true)

    try {
      const text = await importFile.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        showToast('File is empty or has no data rows', 'warning')
        setImporting(false)
        return
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
      const records = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/("([^"]*)"|[^,]+)/g) || []
        const cleanValues = values.map(v => v.replace(/"/g, '').trim())

        const row = {}
        headers.forEach((header, index) => {
          row[header] = cleanValues[index] || ''
        })

        // Find or create group
        let groupId = null
        if (row.group_name) {
          const { data: existingGroup } = await supabase
            .from('contact_groups')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('school_id', currentUser.school_id)
            .eq('group_name', row.group_name)
            .single()

          if (existingGroup) {
            groupId = existingGroup.id
          } else {
            const { data: newGroup, error: groupError } = await supabase
              .from('contact_groups')
              .insert([{
                user_id: currentUser.id,
                school_id: currentUser.school_id,
                created_by: currentUser.id,
                group_name: row.group_name
              }])
              .select()
              .single()

            if (!groupError && newGroup) {
              groupId = newGroup.id
            }
          }
        }

        const contactRecord = {
          user_id: currentUser.id,
          school_id: currentUser.school_id,
          created_by: currentUser.id,
          name: row.name || '',
          group_id: groupId,
          company: row.company || null,
          mobile: row.mobile || null,
          whatsapp: row.whatsapp || null
        }

        if (contactRecord.name && contactRecord.mobile) {
          records.push(contactRecord)
        }
      }

      if (records.length === 0) {
        showToast('No valid records found in file', 'warning')
        setImporting(false)
        return
      }

      const { error } = await supabase
        .from('contacts')
        .insert(records)

      if (error) throw error

      showToast(`Successfully imported ${records.length} contacts!`, 'success')
      setShowImportModal(false)
      setImportFile(null)
      fetchContacts()
      fetchGroups()
    } catch (error) {
      console.error('Import error:', error)
      showToast('Error importing data: ' + error.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-1">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => {
            resetForm()
            setEditingContact(null)
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
        <button
          onClick={() => setShowGroupModal(true)}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Users className="w-4 h-4" />
          Create Group
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Upload className="w-4 h-4" />
          Import Data
        </button>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel
        </button>
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Type Dropdown */}
          <div className="relative min-w-[180px]">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 bg-white"
            >
              {searchOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full border border-gray-300 rounded pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Search
            <Search className="w-4 h-4" />
          </button>

          {/* Group Filter */}
          <div className="min-w-[200px]">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All Groups</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.group_name}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Showing <span className="text-blue-600 font-semibold">{filteredContacts.length}</span> of <span className="text-blue-600 font-semibold">{contacts.length}</span> contacts
        </p>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No contacts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600 text-white text-sm">
                  <th className="px-3 py-2 text-left font-semibold">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                        className="w-4 h-4 rounded"
                      />
                      <span>Sr.</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Group</th>
                  <th className="px-3 py-2 text-left font-semibold">Company</th>
                  <th className="px-3 py-2 text-left font-semibold">Mobile</th>
                  <th className="px-3 py-2 text-left font-semibold">WhatsApp</th>
                  <th className="px-3 py-2 text-left font-semibold">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact, index) => (
                  <tr key={contact.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => handleSelectContact(contact.id)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-semibold">
                          {contact.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-blue-500 text-sm font-medium">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {contact.contact_groups?.group_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">{contact.company || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{contact.mobile}</td>
                    <td className="px-3 py-2">
                      {contact.whatsapp ? (
                        <button
                          onClick={() => handleWhatsApp(contact.whatsapp)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-700"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">{contact.whatsapp}</span>
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-500 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Contact Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-lg font-semibold">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h2>
              <button onClick={() => setShowAddModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Group <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Group</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.group_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Company</label>
                <input
                  type="text"
                  placeholder="Company Name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Mobile <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  placeholder="WhatsApp Number"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white z-10">
              <button
                onClick={() => setShowAddModal(false)}
                className="text-blue-500 hover:text-blue-600 font-medium px-4 py-2"
              >
                Close
              </button>
              <button
                onClick={handleSaveContact}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingContact ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Import Data Modal */}
      {showImportModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowImportModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Import Contact Data</h2>
              <button onClick={() => setShowImportModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Download {' '}
                <button
                  onClick={downloadSampleCSV}
                  className="text-blue-500 hover:underline font-medium"
                >
                  Sample CSV File
                </button>
                {' '} to see the required format.
              </p>

              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
                <div className="text-center">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">
                    {importFile ? importFile.name : 'Select a CSV file to import'}
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="inline-block px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 font-medium cursor-pointer"
                  >
                    Browse File
                  </label>
                </div>
              </div>

              {importFile && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <p className="text-blue-800 text-sm">
                    Selected: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importing...' : 'Upload & Save'}
                </button>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="text-blue-500 hover:text-blue-600 font-medium">
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowGroupModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Contact Group</h2>
              <button onClick={() => setShowGroupModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter group name"
                  value={groupFormData.group_name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, group_name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea
                  placeholder="Enter group description"
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  rows="3"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-blue-500 hover:text-blue-600 font-medium px-4 py-2"
              >
                Close
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center" onClick={handleCancelConfirm}>
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold">{confirmDialog.title}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700">{confirmDialog.message}</p>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-3">
                <button
                  onClick={handleCancelConfirm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
        isOpen={showPdfPreview}
        onClose={handleClosePdfPreview}
      />
    </div>
  )
}
