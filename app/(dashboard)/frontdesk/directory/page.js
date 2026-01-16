'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Users, Phone, Mail, Building, MessageCircle, Filter, ChevronDown, Plus, X, Edit, Trash2 } from 'lucide-react'

export default function DirectoryPage() {
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
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

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

  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm()
    }
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

  const handleCancel = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

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

  const handleDeleteContact = (id) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Contact',
      message: 'Are you sure you want to delete this contact? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('contacts').delete().eq('id', id).eq('school_id', currentUser.school_id)
          if (error) throw error
          showToast('Contact deleted successfully', 'success')
          fetchContacts()
        } catch (error) {
          console.error('Error deleting contact:', error)
          showToast('Failed to delete contact: ' + error.message, 'error')
        }
      }
    })
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

  const handleDeleteGroup = (id) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? Contacts in this group will not be deleted.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('contact_groups').delete().eq('id', id).eq('school_id', currentUser.school_id)
          if (error) throw error
          showToast('Group deleted successfully', 'success')
          fetchGroups()
        } catch (error) {
          console.error('Error deleting group:', error)
          showToast('Failed to delete group: ' + error.message, 'error')
        }
      }
    })
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
    <div className="p-1">
      <div className="fixed top-4 right-4 z-[9999] space-y-1.5">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg min-w-[250px] ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <span className="flex-1 text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-black flex items-center gap-2">
            <Users className="text-red-600 w-5 h-5" />
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
            className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'directory' ? 'Add Contact' : 'Add Group'}
          </button>
        </div>
        <div className="flex gap-1.5 mt-2.5">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 font-medium text-xs transition-colors rounded-lg ${
              activeTab === 'directory'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Directory
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-3 py-1.5 font-medium text-xs transition-colors rounded-lg ${
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
          <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <div className="flex flex-col lg:flex-row gap-1.5 mb-2">
          <div className="flex-1 flex gap-1.5">
            <div className="relative">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="appearance-none px-2.5 py-1.5 pr-7 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white cursor-pointer text-xs"
              >
                {searchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-3.5 h-3.5" />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder={`Search ${searchType.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1.5 font-medium text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="text-gray-400 w-3.5 h-3.5" />
            <div className="relative">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="appearance-none px-2.5 py-1.5 pr-7 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white cursor-pointer text-xs"
              >
                <option value="">All Groups</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.group_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-600">Total:</span>
            <span className="text-xs font-semibold text-gray-900">{contacts.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-600">Showing:</span>
            <span className="text-xs font-semibold text-red-600">{filteredContacts.length} of {contacts.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-600">Groups:</span>
            <span className="text-xs font-semibold text-gray-900">{groups.length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <Users className="mx-auto mb-1.5 text-gray-300 w-8 h-8" />
          <p className="text-gray-500 text-xs">{searchQuery || selectedGroup ? 'No matching contacts' : 'No contacts available'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedLetters.map(letter => (
            <div key={letter}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-base font-bold shadow-sm">
                  {letter}
                </div>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {groupedContacts[letter].map(contact => (
                  <div key={contact.id} className="bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow p-2.5 border border-gray-200">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-black mb-0.5">{contact.name}</h3>
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700">
                          {contact.contact_groups?.group_name || 'No Group'}
                        </span>
                      </div>
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {contact.name?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {contact.company && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Building className="text-gray-400 w-3 h-3" />
                          <span>{contact.company}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Phone className="text-gray-400 w-3 h-3" />
                        <span>{contact.mobile}</span>
                      </div>
                    </div>
                    <div className="space-y-1 mt-1.5 pt-1.5 border-t">
                      <div className="flex gap-1">
                        <button onClick={() => handleCall(contact.mobile)} className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                          <Phone className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Call</span>
                        </button>
                        {contact.whatsapp && (
                          <button onClick={() => handleWhatsApp(contact.whatsapp)} className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors">
                            <MessageCircle className="w-3 h-3" />
                            <span className="text-[10px] font-medium">WhatsApp</span>
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditContact(contact)} className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                          <Edit className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Edit</span>
                        </button>
                        <button onClick={() => handleDeleteContact(contact.id)} className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Delete</span>
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
            <div className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg p-1 hidden lg:block">
              <div className="flex flex-col gap-0.5">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
                  const hasContacts = groupedContacts[letter]
                  return (
                    <a
                      key={letter}
                      href={hasContacts ? `#${letter}` : undefined}
                      className={`w-4 h-4 flex items-center justify-center text-[10px] font-medium rounded transition-colors ${
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
        <div className="bg-white rounded-lg shadow-sm p-4">
          {groups.length === 0 ? (
            <div className="text-center py-6">
              <Users className="mx-auto mb-1.5 text-gray-300 w-8 h-8" />
              <p className="text-gray-500 text-xs mb-2">No groups found</p>
              <button onClick={() => { setEditingGroup(null); setGroupForm({ group_name: '', description: '' }); setShowGroupModal(true) }} className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs">
                <Plus className="w-3.5 h-3.5" />
                Add Group
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="text-left py-2 px-3 text-xs font-semibold border-r border-blue-800">Group Name</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold border-r border-blue-800">Description</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold border-r border-blue-800">Created</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => (
                    <tr key={group.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="py-2 px-3 border-r border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Users className="w-3 h-3 text-black" />
                          </div>
                          <span className="font-medium text-black text-xs">{group.group_name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600 border-r border-gray-200">
                        {group.description || 'No description'}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500 border-r border-gray-200">
                        {new Date(group.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleEditGroup(group)} className="p-1.5 text-black hover:bg-gray-100 rounded-lg transition-colors" title="Edit group">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 text-black hover:bg-gray-100 rounded-lg transition-colors" title="Delete group">
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-blue-900 text-white px-4 py-3 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-base font-semibold">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h2>
              <button onClick={() => setShowAddModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-black">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter contact name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile <span className="text-black">*</span></label>
                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({...contactForm, mobile: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Enter WhatsApp number"
                    value={contactForm.whatsapp}
                    onChange={(e) => setContactForm({...contactForm, whatsapp: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="Enter company name"
                    value={contactForm.company}
                    onChange={(e) => setContactForm({...contactForm, company: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Group</label>
                  <select
                    value={contactForm.group_id}
                    onChange={(e) => setContactForm({...contactForm, group_id: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-xs"
                  >
                    <option value="">Select Group</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.group_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4 border-t border-gray-200 pt-3 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-1.5 text-gray-700 hover:text-gray-900 font-medium text-xs"
              >
                Close
              </button>
              <button
                onClick={handleSaveContact}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition text-xs"
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
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-blue-900 text-white px-4 py-3 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-base font-semibold">{editingGroup ? 'Edit Group' : 'Add New Group'}</h2>
              <button onClick={() => setShowGroupModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Group Name <span className="text-black">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Teachers, Parents, Vendors"
                    value={groupForm.group_name}
                    onChange={(e) => setGroupForm({...groupForm, group_name: e.target.value})}
                    className="w-full border border-black rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    placeholder="Brief description of this group (optional)"
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
                    rows="3"
                    className="w-full border border-black rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none resize-none text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="px-4 pb-4 border-t border-gray-200 pt-3 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-1.5 text-gray-700 hover:text-gray-900 font-medium text-xs"
              >
                Close
              </button>
              <button
                onClick={handleSaveGroup}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center" onClick={handleCancel}>
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-sm mx-4 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-red-600 text-white px-4 py-3 rounded-t-lg">
                <h3 className="text-base font-semibold">{confirmDialog.title}</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-700 text-xs">{confirmDialog.message}</p>
              </div>
              <div className="px-4 pb-4 flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition text-xs"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
