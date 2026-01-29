'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { Search, Users, Phone, Mail, Building, MessageCircle, Filter, ChevronDown, Plus, X, Edit, Trash2 } from 'lucide-react'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardGrid, CardInfoGrid } from '@/components/DataCard'

// Modal Overlay Component - Uses Portal to render at document body level
const ModalOverlay = ({ children, onClose }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[99998]"
        style={{
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
        onClick={onClose}
      />
      {children}
    </>,
    document.body
  )
}

function DirectoryContent() {
  const [currentUser, setCurrentUser] = useState(null)
  const [contacts, setContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('Via General Data')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [filteredContacts, setFilteredContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [toasts, setToasts] = useState([])
  const [activeTab, setActiveTab] = useState('directory')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [groupForm, setGroupForm] = useState({
    group_name: '',
    description: ''
  })
  const [contactForm, setContactForm] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    company: '',
    group_id: ''
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [personToDelete, setPersonToDelete] = useState(null)
  const [deleteType, setDeleteType] = useState('') // 'contact' or 'group'

  const searchOptions = ['Via General Data', 'Via Name', 'Via Mobile', 'Via Company', 'Via Group']

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

  useEffect(() => {
    filterContacts()
  }, [searchQuery, selectedGroup, contacts])

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('group_name')

      if (error) throw error
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_groups (
            id,
            group_name
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('name')

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    let filtered = [...contacts]

    // Filter by group
    if (selectedGroup && selectedGroup !== '') {
      filtered = filtered.filter(contact => contact.group_id === selectedGroup)
    }

    // Filter by search query based on search type
    if (searchQuery) {
      const query = searchQuery.toLowerCase()

      switch (searchType) {
        case 'Via Name':
          filtered = filtered.filter(contact =>
            contact.name?.toLowerCase().includes(query)
          )
          break
        case 'Via Mobile':
          filtered = filtered.filter(contact =>
            contact.mobile?.toLowerCase().includes(query)
          )
          break
        case 'Via Company':
          filtered = filtered.filter(contact =>
            contact.company?.toLowerCase().includes(query)
          )
          break
        case 'Via Group':
          filtered = filtered.filter(contact =>
            contact.contact_groups?.group_name?.toLowerCase().includes(query)
          )
          break
        default: // Via General Data
          filtered = filtered.filter(contact =>
            contact.name?.toLowerCase().includes(query) ||
            contact.mobile?.toLowerCase().includes(query) ||
            contact.company?.toLowerCase().includes(query) ||
            contact.contact_groups?.group_name?.toLowerCase().includes(query)
          )
      }
    }

    setFilteredContacts(filtered)
  }

  const filterContacts = () => {
    handleSearch()
  }

  const handleWhatsApp = (number) => {
    if (number) {
      const cleanNumber = number.replace(/\D/g, '')
      window.open(`https://wa.me/${cleanNumber}`, '_blank')
    }
  }

  const handleCall = (number) => {
    if (number) {
      window.location.href = `tel:${number}`
    }
  }

  const showToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3000)
  }

  const removeToast = (id) => setToasts(prev => prev.filter(toast => toast.id !== id))

  const handleSaveContact = async () => {
    if (!contactForm.name || !contactForm.mobile) {
      showToast('Please fill required fields (Name and Mobile)', 'error')
      return
    }

    try {
      const contactData = {
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        name: contactForm.name,
        mobile: contactForm.mobile,
        whatsapp: contactForm.whatsapp || contactForm.mobile,
        company: contactForm.company,
        group_id: contactForm.group_id || null
      }

      if (editingContact) {
        const { error } = await supabase.from('contacts').update(contactData).eq('id', editingContact.id).eq('school_id', currentUser.school_id)
        if (error) throw error
        showToast('Contact updated successfully', 'success')
      } else {
        const { error } = await supabase.from('contacts').insert(contactData)
        if (error) throw error
        showToast('Contact added successfully', 'success')
      }

      setShowAddModal(false)
      setEditingContact(null)
      setContactForm({ name: '', mobile: '', whatsapp: '', company: '', group_id: '' })
      fetchContacts()
    } catch (error) {
      console.error('Error saving contact:', error)
      showToast('Failed to save contact: ' + error.message, 'error')
    }
  }

  const handleEditContact = (contact) => {
    setEditingContact(contact)
    setContactForm({ name: contact.name || '', mobile: contact.mobile || '', whatsapp: contact.whatsapp || '', company: contact.company || '', group_id: contact.group_id || '' })
    setShowAddModal(true)
  }

  const handleDeleteContact = (contact) => {
    setPersonToDelete(contact)
    setDeleteType('contact')
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!personToDelete) return

    try {
      if (deleteType === 'contact') {
        const { error } = await supabase.from('contacts').delete().eq('id', personToDelete.id).eq('school_id', currentUser.school_id)
        if (error) throw error
        showToast('Contact deleted successfully', 'success')
        fetchContacts()
      } else if (deleteType === 'group') {
        const { error } = await supabase.from('contact_groups').delete().eq('id', personToDelete.id).eq('school_id', currentUser.school_id)
        if (error) throw error
        showToast('Group deleted successfully', 'success')
        fetchGroups()
      }
    } catch (error) {
      console.error('Error deleting:', error)
      showToast('Failed to delete: ' + error.message, 'error')
    } finally {
      setShowDeleteModal(false)
      setPersonToDelete(null)
      setDeleteType('')
    }
  }

  const handleSaveGroup = async () => {
    if (!groupForm.group_name) {
      showToast('Please enter a group name', 'error')
      return
    }

    try {
      const groupData = {
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        group_name: groupForm.group_name,
        description: groupForm.description || null,
        created_by: currentUser.id
      }

      if (editingGroup) {
        const { error } = await supabase.from('contact_groups').update(groupData).eq('id', editingGroup.id).eq('school_id', currentUser.school_id)
        if (error) throw error
        showToast('Group updated successfully', 'success')
      } else {
        const { error } = await supabase.from('contact_groups').insert(groupData)
        if (error) throw error
        showToast('Group added successfully', 'success')
      }

      setShowGroupModal(false)
      setEditingGroup(null)
      setGroupForm({
        group_name: '',
        description: ''
      })
      fetchGroups()
    } catch (error) {
      console.error('Error saving group:', error)
      showToast('Failed to save group: ' + error.message, 'error')
    }
  }

  const handleEditGroup = (group) => {
    setEditingGroup(group)
    setGroupForm({ group_name: group.group_name || '', description: group.description || '' })
    setShowGroupModal(true)
  }

  const handleDeleteGroup = (group) => {
    setPersonToDelete(group)
    setDeleteType('group')
    setShowDeleteModal(true)
  }
  const groupedContacts = filteredContacts.reduce((acc, contact) => {
    const firstLetter = contact.name?.charAt(0).toUpperCase() || '#'
    if (!acc[firstLetter]) {
      acc[firstLetter] = []
    }
    acc[firstLetter].push(contact)
    return acc
  }, {})

  const sortedLetters = Object.keys(groupedContacts).sort()

  return (
    <div className="p-1 sm:p-2 md:p-3 lg:p-4">
      <div className="fixed top-4 right-4 z-[9999] space-y-2 sm:space-y-3 w-[calc(100%-2rem)] sm:w-auto">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-lg min-w-0 sm:min-w-[280px] ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <span className="flex-1 text-xs sm:text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 md:p-4 mb-2 sm:mb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-black flex items-center gap-2 sm:gap-3">
            <Users className="text-red-600 w-4 h-4 sm:w-5 sm:h-5" />
            People Directory
          </h1>
          <button
            onClick={() => {
              if (activeTab === 'directory') {
                setEditingContact(null)
                setContactForm({ name: '', mobile: '', whatsapp: '', company: '', group_id: '' })
                setShowAddModal(true)
              } else {
                setEditingGroup(null)
                setGroupForm({ group_name: '', description: '' })
                setShowGroupModal(true)
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 bg-red-600 text-white py-1.5 sm:py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            {activeTab === 'directory' ? 'Add Contact' : 'Add Group'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4">
          <button
            onClick={() => setActiveTab('directory')}
            className={`py-1.5 sm:py-2 px-3 font-medium text-xs sm:text-sm transition-colors rounded-lg ${
              activeTab === 'directory'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Directory
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-1.5 sm:py-2 px-3 font-medium text-xs sm:text-sm transition-colors rounded-lg ${
              activeTab === 'groups'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Groups
          </button>
        </div>
      </div>

      {activeTab === 'directory' && (
        <>
          <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 md:p-4 mb-2 sm:mb-3">
        <div className="flex flex-col gap-2 sm:gap-3 mb-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="appearance-none py-1.5 sm:py-2 px-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white cursor-pointer text-xs sm:text-sm"
              >
                {searchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder={`Search ${searchType.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
            <button
              onClick={handleSearch}
              className="py-1.5 sm:py-2 px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-medium text-xs sm:text-sm"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              Search
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Filter className="text-gray-400 w-4 h-4 sm:w-5 sm:h-5 hidden sm:block" />
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full sm:w-auto appearance-none py-1.5 sm:py-2 px-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white cursor-pointer text-xs sm:text-sm"
              >
                <option value="">All Groups</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.group_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-5 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm text-gray-600">Total:</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">{contacts.length}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm text-gray-600">Showing:</span>
            <span className="text-xs sm:text-sm font-semibold text-red-600">{filteredContacts.length} of {contacts.length}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm text-gray-600">Groups:</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">{groups.length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 sm:py-8">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-red-600"></div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 text-center">
          <Users className="mx-auto mb-2 sm:mb-3 text-gray-300 w-8 h-8 sm:w-10 sm:h-10" />
          <p className="text-gray-500 text-xs sm:text-sm">{searchQuery || selectedGroup ? 'No matching contacts' : 'No contacts available'}</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {sortedLetters.map(letter => (
            <div key={letter}>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm sm:text-base font-bold shadow-sm">
                  {letter}
                </div>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {groupedContacts[letter].map(contact => (
                  <div key={contact.id} className="bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 sm:p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1">
                        <h3 className="text-xs sm:text-sm font-semibold text-black mb-1">{contact.name}</h3>
                        <span className="inline-block px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                          {contact.contact_groups?.group_name || 'No Group'}
                        </span>
                      </div>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm">
                        {contact.name?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      {contact.company && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                          <Building className="text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>{contact.company}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                        <Phone className="text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{contact.mobile}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t">
                      <div className="btn-row-mobile">
                        <button onClick={() => handleCall(contact.mobile)} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                          <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="text-[10px] sm:text-xs font-medium">Call</span>
                        </button>
                        {contact.whatsapp && (
                          <button onClick={() => handleWhatsApp(contact.whatsapp)} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors">
                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="text-[10px] sm:text-xs font-medium">WhatsApp</span>
                          </button>
                        )}
                      </div>
                      <div className="btn-row-mobile">
                        <button onClick={() => handleEditContact(contact)} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="text-[10px] sm:text-xs font-medium">Edit</span>
                        </button>
                        <button onClick={() => handleDeleteContact(contact)} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="text-[10px] sm:text-xs font-medium">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

          {filteredContacts.length > 0 && (
            <div className="fixed right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg p-1 sm:p-1.5 hidden lg:block xl:block">
              <div className="flex flex-col gap-0.5 sm:gap-1">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
                  const hasContacts = groupedContacts[letter]
                  return (
                    <a
                      key={letter}
                      href={hasContacts ? `#${letter}` : undefined}
                      className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-medium rounded transition-colors ${
                        hasContacts
                          ? 'text-blue-600 hover:bg-blue-50 cursor-pointer'
                          : 'text-gray-300 cursor-default'
                      }`}
                      onClick={(e) => {
                        if (hasContacts) {
                          e.preventDefault()
                          const element = document.querySelector(`[data-letter="${letter}"]`)
                          element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      }}
                    >
                      {letter}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'groups' && (
        <div className="bg-white rounded-lg shadow-sm p-2 sm:p-3 md:p-4">
          {groups.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Users className="mx-auto mb-2 sm:mb-3 text-gray-300 w-8 h-8 sm:w-10 sm:h-10" />
              <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">No groups found</p>
              <button onClick={() => { setEditingGroup(null); setGroupForm({ group_name: '', description: '' }); setShowGroupModal(true) }} className="inline-flex items-center gap-1.5 sm:gap-2 bg-red-600 text-white py-1.5 sm:py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Group
              </button>
            </div>
          ) : (
            <ResponsiveTableWrapper
              tableContent={
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] border-collapse">
                    <thead>
                      <tr className="bg-blue-900 text-white text-xs sm:text-sm">
                        <th className="border border-blue-800 text-left py-1.5 sm:py-2 px-3 text-xs sm:text-sm font-semibold border-r border-blue-800 whitespace-nowrap">Group Name</th>
                        <th className="border border-blue-800 text-left py-1.5 sm:py-2 px-3 text-xs sm:text-sm font-semibold border-r border-blue-800 whitespace-nowrap">Description</th>
                        <th className="border border-blue-800 text-left py-1.5 sm:py-2 px-3 text-xs sm:text-sm font-semibold border-r border-blue-800 whitespace-nowrap">Created</th>
                        <th className="border border-blue-800 text-right py-1.5 sm:py-2 px-3 text-xs sm:text-sm font-semibold whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group, index) => (
                        <tr key={group.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="border border-gray-200 py-1.5 sm:py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
                              </div>
                              <span className="font-medium text-black text-xs sm:text-sm">{group.group_name}</span>
                            </div>
                          </td>
                          <td className="border border-gray-200 py-1.5 sm:py-2 px-3 text-xs sm:text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">
                            {group.description || 'No description'}
                          </td>
                          <td className="border border-gray-200 py-1.5 sm:py-2 px-3 text-xs sm:text-sm text-gray-500 border-r border-gray-200 whitespace-nowrap">
                            {new Date(group.created_at).toLocaleDateString()}
                          </td>
                          <td className="border border-gray-200 py-1.5 sm:py-2 px-3 whitespace-nowrap">
                            <div className="btn-row-mobile">
                              <button onClick={() => handleEditGroup(group)} className="p-1.5 sm:p-2 text-black hover:bg-gray-100 rounded-lg transition-colors" title="Edit group">
                                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button onClick={() => handleDeleteGroup(group)} className="p-1.5 sm:p-2 text-black hover:bg-gray-100 rounded-lg transition-colors" title="Delete group">
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
              cardContent={
                <CardGrid>
                  {groups.map((group, index) => (
                    <DataCard key={group.id}>
                      <CardHeader
                        srNo={index + 1}
                        title={group.group_name}
                        subtitle={group.description || 'No description'}
                        iconSize="w-5 h-5"
                      />
                      <CardInfoGrid>
                        <CardRow
                          label="Created"
                          value={new Date(group.created_at).toLocaleDateString()}
                          className="text-[10px]"
                        />
                      </CardInfoGrid>
                      <CardActions>
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </CardActions>
                    </DataCard>
                  ))}
                </CardGrid>
              }
            />
          )}
        </div>
      )}

      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-[95%] sm:max-w-md md:max-w-lg xl:max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="bg-blue-900 text-white px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-sm sm:text-base font-semibold">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h2>
              <button onClick={() => setShowAddModal(false)} className="hover:bg-blue-800 p-1.5 sm:p-2 rounded">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Name <span className="text-black">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter contact name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-1.5 sm:py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Mobile <span className="text-black">*</span></label>
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({...contactForm, mobile: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-1.5 sm:py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Enter WhatsApp number"
                    value={contactForm.whatsapp}
                    onChange={(e) => setContactForm({...contactForm, whatsapp: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-1.5 sm:py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Company</label>
                  <input
                    type="text"
                    placeholder="Enter company name"
                    value={contactForm.company}
                    onChange={(e) => setContactForm({...contactForm, company: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-1.5 sm:py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Group</label>
                  <select
                    value={contactForm.group_id}
                    onChange={(e) => setContactForm({...contactForm, group_id: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-1.5 sm:py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-sm sm:text-base"
                  >
                    <option value="">Select Group</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.group_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-3 sm:px-4 lg:px-6 pb-4 sm:pb-5 border-t border-gray-200 pt-3 sm:pt-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full sm:w-auto py-1.5 sm:py-2 px-3 text-gray-700 hover:text-gray-900 font-medium text-xs sm:text-sm"
              >
                Close
              </button>
              <button
                onClick={handleSaveContact}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition text-xs sm:text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

      {showGroupModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowGroupModal(false)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-[95%] sm:max-w-md md:max-w-lg bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="bg-blue-900 text-white px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-sm sm:text-base font-semibold">{editingGroup ? 'Edit Group' : 'Add New Group'}</h2>
              <button onClick={() => setShowGroupModal(false)} className="hover:bg-blue-800 p-1.5 sm:p-2 rounded">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Group Name <span className="text-black">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Teachers, Parents, Vendors"
                    value={groupForm.group_name}
                    onChange={(e) => setGroupForm({...groupForm, group_name: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-1.5 sm:py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Description</label>
                  <textarea
                    placeholder="Brief description of this group (optional)"
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
                    rows="3"
                    className="w-full border border-black rounded-lg px-3 py-1.5 sm:py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none resize-none text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>
            <div className="px-3 sm:px-4 lg:px-6 pb-4 sm:pb-5 border-t border-gray-200 pt-3 sm:pt-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowGroupModal(false)}
                className="w-full sm:w-auto py-1.5 sm:py-2 px-3 text-gray-700 hover:text-gray-900 font-medium text-xs sm:text-sm"
              >
                Close
              </button>
              <button
                onClick={handleSaveGroup}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition text-xs sm:text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && personToDelete && (
        <ModalOverlay onClose={() => setShowDeleteModal(false)}>
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full sm:max-w-md bg-white rounded-lg shadow-2xl z-[99999]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 sm:px-4 py-3 sm:py-4 rounded-t-lg">
              <h3 className="text-sm sm:text-base font-semibold">Confirm Delete</h3>
            </div>
            <div className="p-3 sm:p-4">
              <p className="text-gray-700 text-xs sm:text-sm">
                {deleteType === 'contact' ? (
                  <>Are you sure you want to delete the contact <strong>{personToDelete.name}</strong>? This action cannot be undone.</>
                ) : (
                  <>Are you sure you want to delete the group <strong>{personToDelete.group_name}</strong>? Contacts in this group will not be deleted.</>
                )}
              </p>
            </div>
            <div className="px-3 sm:px-4 lg:px-6 pb-4 sm:pb-5 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:w-auto py-1.5 sm:py-2 px-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="w-full sm:w-auto py-1.5 sm:py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

export default function DirectoryPage() {
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
      permissionKey="frontdesk_directory_view"
      pageName="Directory"
    >
      <DirectoryContent />
    </PermissionGuard>
  )
}
