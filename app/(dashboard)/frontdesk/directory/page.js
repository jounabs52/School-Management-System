'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Users, Phone, Mail, Building, MessageCircle, Filter, ChevronDown } from 'lucide-react'

export default function DirectoryPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [contacts, setContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('Via General Data')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [filteredContacts, setFilteredContacts] = useState([])
  const [loading, setLoading] = useState(false)

  // Search options
  const searchOptions = [
    'Via General Data',
    'Via Name',
    'Via Mobile',
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

  // Group contacts by first letter
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <Users className="text-blue-600 w-6 h-6" />
          People Directory
        </h1>
        <p className="text-gray-600 text-sm">Search and browse contact information</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-2 mb-3">
          <div className="flex-1 flex gap-2">
            <div className="relative">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="appearance-none px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer text-sm"
              >
                {searchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Search ${searchType.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 font-medium text-sm"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-4 h-4" />
            <div className="relative">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="appearance-none px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer text-sm"
              >
                <option value="">All Groups</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.group_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="text-sm font-semibold text-gray-900">{contacts.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Showing:</span>
            <span className="text-sm font-semibold text-blue-600">{filteredContacts.length} of {contacts.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Groups:</span>
            <span className="text-sm font-semibold text-gray-900">{groups.length}</span>
          </div>
        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Loading directory...</p>
          </div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Users className="mx-auto mb-3 text-gray-300 w-12 h-12" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No contacts found</h3>
          <p className="text-gray-500 text-sm">
            {searchQuery || selectedGroup
              ? 'Try adjusting your search filters'
              : 'No contacts available in the directory'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedLetters.map(letter => (
            <div key={letter}>
              {/* Letter Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xl font-bold shadow-lg">
                  {letter}
                </div>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Contact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupedContacts[letter].map(contact => (
                  <div
                    key={contact.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100"
                  >
                    {/* Contact Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-800 mb-1">
                          {contact.name}
                        </h3>
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {contact.contact_groups?.group_name || 'No Group'}
                        </span>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {contact.name?.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1.5">
                      {contact.company && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building className="text-gray-400 w-4 h-4" />
                          <span>{contact.company}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="text-gray-400 w-4 h-4" />
                        <span>{contact.mobile}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <button
                        onClick={() => handleCall(contact.mobile)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="text-sm font-medium">Call</span>
                      </button>
                      {contact.whatsapp && (
                        <button
                          onClick={() => handleWhatsApp(contact.whatsapp)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alphabetical Index */}
      {filteredContacts.length > 0 && (
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg p-1.5 hidden lg:block">
          <div className="flex flex-col gap-0.5">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
              const hasContacts = groupedContacts[letter]
              return (
                <a
                  key={letter}
                  href={hasContacts ? `#${letter}` : undefined}
                  className={`w-5 h-5 flex items-center justify-center text-xs font-medium rounded transition-colors ${
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
    </div>
  )
}
