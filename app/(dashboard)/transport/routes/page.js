'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, X, Trash2, MapPin, DollarSign, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { getUserFromCookie } from '@/lib/clientAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create Supabase client with custom auth
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// Toast Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-[10001] animate-slideIn">
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl border ${
        type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        {type === 'success' ? (
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
        )}
        <span className="font-medium text-sm">{message}</span>
      </div>
    </div>
  )
}

export default function RoutesPage() {
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStationsModal, setShowStationsModal] = useState(false)
  const [routes, setRoutes] = useState([])
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [routeToDelete, setRouteToDelete] = useState(null)
  const [newStationName, setNewStationName] = useState('')
  const [newStationFare, setNewStationFare] = useState('')

  // Multiple stations state for bulk add
  const [multipleStations, setMultipleStations] = useState([{ name: '', fare: '' }])

  // Edit station state
  const [editingStationId, setEditingStationId] = useState(null)
  const [editStationData, setEditStationData] = useState({ name: '', fare: '' })

  // Toast state
  const [toast, setToast] = useState(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Show toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Lock/unlock body scroll when modals open/close
  useEffect(() => {
    const isAnyModalOpen = showModal || showEditModal || showDeleteModal || showStationsModal

    if (isAnyModalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [showModal, showEditModal, showDeleteModal, showStationsModal])

  const [formData, setFormData] = useState({
    routeName: '',
    stationsList: [],
    vehicles: '',
    passengers: ''
  })

  const [tempStation, setTempStation] = useState({ name: '', fare: '' })

  useEffect(() => {
    fetchRoutes()
  }, [])

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()

      if (!user) {
        showToast('Please login to view routes', 'error')
        setLoading(false)
        return
      }

      if (!user.school_id) {
        showToast('User data incomplete - missing school_id', 'error')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('route_name', { ascending: true })

      if (error) {
        console.error('Error fetching routes:', error)
        showToast(`Error fetching routes: ${error.message}`, 'error')
        setRoutes([])
      } else {
        // For each route, get counts and max fare
        const routesWithStats = await Promise.all(
          (data || []).map(async (route) => {
            // Get stations count and max fare
            const { data: stationsData, count: stationsCount } = await supabase
              .from('stations')
              .select('fare', { count: 'exact' })
              .eq('route_id', route.id)
              .eq('status', 'active')

            // Calculate max fare from stations
            const maxFare = stationsData && stationsData.length > 0
              ? Math.max(...stationsData.map(s => s.fare || 0))
              : 0

            // Get vehicles count
            const { count: vehiclesCount } = await supabase
              .from('vehicles')
              .select('*', { count: 'exact', head: true })
              .eq('route_id', route.id)
              .eq('status', 'active')

            // Get passengers count
            const { count: passengersCount } = await supabase
              .from('passengers')
              .select('*', { count: 'exact', head: true })
              .eq('route_id', route.id)
              .eq('status', 'active')

            return {
              ...route,
              fare: maxFare, // Override with max fare from stations
              stations_count: stationsCount || 0,
              vehicles_count: vehiclesCount || 0,
              passengers_count: passengersCount || 0
            }
          })
        )

        setRoutes(routesWithStats)
      }
    } catch (error) {
      console.error('Error in fetchRoutes:', error)
      showToast('Failed to fetch routes', 'error')
      setRoutes([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      if (!formData.routeName.trim()) {
        showToast('Please enter route name', 'error')
        return
      }

      // First, create the route
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .insert([{
          user_id: user.id,
          school_id: user.school_id,
          created_by: user.id,
          route_name: formData.routeName,
          fare: 0,
          status: 'active'
        }])
        .select()

      if (routeError) {
        console.error('Error creating route:', routeError)
        showToast('Failed to create route', 'error')
        return
      }

      let stationsCount = 0

      // Then, create stations if any
      if (routeData && routeData.length > 0 && formData.stationsList.length > 0) {
        const newRouteId = routeData[0].id

        const stationsToInsert = formData.stationsList.map((station, index) => ({
          user_id: user.id,
          school_id: user.school_id,
          created_by: user.id,
          route_id: newRouteId,
          station_name: typeof station === 'string' ? station : station.name,
          fare: typeof station === 'object' ? parseInt(station.fare) || 0 : 0,
          station_order: index + 1,
          status: 'active'
        }))

        const { error: stationsError } = await supabase
          .from('stations')
          .insert(stationsToInsert)

        if (stationsError) {
          console.error('Error creating stations:', stationsError)
          showToast('Route created but some stations failed to save', 'error')
        } else {
          stationsCount = stationsToInsert.length
        }
      }

      // Add new route to state with counts
      const newRoute = {
        ...routeData[0],
        stations_count: stationsCount,
        vehicles_count: 0,
        passengers_count: 0
      }

      setRoutes([newRoute, ...routes])
      setShowModal(false)
      setFormData({ routeName: '', stationsList: [], vehicles: '', passengers: '' })
      setTempStation({ name: '', fare: '' })
      showToast('Route added successfully!', 'success')
    } catch (error) {
      console.error('Error saving route:', error)
      showToast('Error saving route', 'error')
    }
  }

  // Add station to temporary list in form
  const handleAddStationToForm = () => {
    if (!tempStation.name.trim()) {
      showToast('Please enter station name', 'error')
      return
    }
    if (!tempStation.fare || parseFloat(tempStation.fare) <= 0) {
      showToast('Please enter a valid fare amount', 'error')
      return
    }
    setFormData({
      ...formData,
      stationsList: [...formData.stationsList, { name: tempStation.name.trim(), fare: tempStation.fare }]
    })
    setTempStation({ name: '', fare: '' })
  }

  // Remove station from temporary list in form
  const handleRemoveStationFromForm = (index) => {
    const newStationsList = formData.stationsList.filter((_, i) => i !== index)
    setFormData({ ...formData, stationsList: newStationsList })
  }

  const handleEdit = async (route) => {
    setSelectedRoute(route)

    // Fetch existing stations for this route
    const { data: existingStations } = await supabase
      .from('stations')
      .select('*')
      .eq('route_id', route.id)
      .eq('status', 'active')
      .order('station_order', { ascending: true })

    setFormData({
      routeName: route.route_name || '',
      stationsList: [],
      vehicles: route.vehicles_count || '',
      passengers: route.passengers_count || ''
    })

    // Set existing stations to display them
    setStations(existingStations || [])

    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      if (!formData.routeName.trim()) {
        showToast('Please enter route name', 'error')
        return
      }

      // First, update the route
      const { data, error } = await supabase
        .from('routes')
        .update({
          route_name: formData.routeName,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRoute.id)
        .eq('school_id', user.school_id)
        .select()

      if (error) {
        console.error('Error updating route:', error)
        showToast('Failed to update route', 'error')
        return
      }

      let additionalStations = 0

      // Then, add new stations if any
      if (formData.stationsList.length > 0) {
        // Get existing stations count for proper ordering
        const { data: existingStations } = await supabase
          .from('stations')
          .select('station_order')
          .eq('route_id', selectedRoute.id)
          .eq('status', 'active')
          .order('station_order', { ascending: false })
          .limit(1)

        const maxOrder = existingStations && existingStations.length > 0
          ? existingStations[0].station_order
          : 0

        const stationsToInsert = formData.stationsList.map((station, index) => ({
          user_id: user.id,
          school_id: user.school_id,
          created_by: user.id,
          route_id: selectedRoute.id,
          station_name: typeof station === 'string' ? station : station.name,
          fare: typeof station === 'object' ? parseInt(station.fare) || 0 : 0,
          station_order: maxOrder + index + 1,
          status: 'active'
        }))

        const { error: stationsError } = await supabase
          .from('stations')
          .insert(stationsToInsert)

        if (stationsError) {
          console.error('Error adding stations:', stationsError)
          showToast('Route updated but some stations failed to save', 'error')
        } else {
          additionalStations = stationsToInsert.length
        }
      }

      // Update route in state
      setRoutes(routes.map(route =>
        route.id === selectedRoute.id
          ? {
              ...route,
              route_name: formData.routeName,
              stations_count: (route.stations_count || 0) + additionalStations
            }
          : route
      ))

      setShowEditModal(false)
      setFormData({ routeName: '', stationsList: [], vehicles: '', passengers: '' })
      setTempStation({ name: '', fare: '' })
      setSelectedRoute(null)
      showToast('Route updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating route:', error)
      showToast('Error updating route', 'error')
    }
  }

  const handleDelete = (route) => {
    setRouteToDelete(route)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      const { error } = await supabase
        .from('routes')
        .update({ status: 'inactive' })
        .eq('id', routeToDelete.id)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting route:', error)
        showToast('Failed to delete route', 'error')
      } else {
        // Remove route from state
        setRoutes(routes.filter(route => route.id !== routeToDelete.id))
        setShowDeleteModal(false)
        setRouteToDelete(null)
        showToast('Route deleted successfully!', 'success')
      }
    } catch (error) {
      console.error('Error deleting route:', error)
      showToast('Error deleting route', 'error')
    }
  }

  // Stations Management Functions
  const handleManageStations = async (route) => {
    setSelectedRoute(route)
    setShowStationsModal(true)
    await fetchStations(route.id)
  }

  const fetchStations = async (routeId) => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('route_id', routeId)
        .eq('status', 'active')
        .order('station_order', { ascending: true })

      if (error) {
        console.error('Error fetching stations:', error)
        setStations([])
      } else {
        setStations(data || [])
      }
    } catch (error) {
      console.error('Error fetching stations:', error)
      setStations([])
    }
  }

  const handleAddStation = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      if (!newStationName.trim()) {
        showToast('Please enter station name', 'error')
        return
      }

      if (!newStationFare || parseFloat(newStationFare) <= 0) {
        showToast('Please enter a valid fare amount', 'error')
        return
      }

      // Get the next order number
      const maxOrder = stations.length > 0
        ? Math.max(...stations.map(s => s.station_order || 0))
        : 0

      const { data, error } = await supabase
        .from('stations')
        .insert([{
          user_id: user.id,
          school_id: user.school_id,
          created_by: user.id,
          route_id: selectedRoute.id,
          station_name: newStationName.trim(),
          fare: parseInt(newStationFare) || 0,
          station_order: maxOrder + 1,
          status: 'active'
        }])
        .select()

      if (error) {
        console.error('Error adding station:', error)
        showToast('Failed to add station', 'error')
      } else {
        // Add station to local state
        const updatedStations = [...stations, data[0]]
        setStations(updatedStations)

        // Recalculate max fare with new station
        const maxFare = updatedStations.length > 0
          ? Math.max(...updatedStations.map(s => s.fare || 0))
          : 0

        // Update route's station count and fare in routes state
        setRoutes(routes.map(route =>
          route.id === selectedRoute.id
            ? {
                ...route,
                stations_count: (route.stations_count || 0) + 1,
                fare: maxFare
              }
            : route
        ))

        setNewStationName('')
        setNewStationFare('')
        showToast('Station added successfully!', 'success')
      }
    } catch (error) {
      console.error('Error adding station:', error)
      showToast('Error adding station', 'error')
    }
  }

  // Add a new row to the multiple stations form
  const handleAddStationRow = () => {
    setMultipleStations([...multipleStations, { name: '', fare: '' }])
  }

  // Remove a row from the multiple stations form
  const handleRemoveStationRow = (index) => {
    if (multipleStations.length > 1) {
      setMultipleStations(multipleStations.filter((_, i) => i !== index))
    }
  }

  // Update a station row
  const handleUpdateStationRow = (index, field, value) => {
    const updatedStations = [...multipleStations]
    updatedStations[index][field] = value
    setMultipleStations(updatedStations)
  }

  // Handle adding multiple stations at once
  const handleAddMultipleStations = async () => {
    // Validate that all rows have both name and fare
    const validStations = multipleStations.filter(station => station.name.trim() && station.fare)

    if (validStations.length === 0) {
      showToast('Please add at least one complete station', 'error')
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      // Get the next order number
      const maxOrder = stations.length > 0
        ? Math.max(...stations.map(s => s.station_order || 0))
        : 0

      const stationsToInsert = validStations.map((station, index) => ({
        user_id: user.id,
        school_id: user.school_id,
        created_by: user.id,
        route_id: selectedRoute.id,
        station_name: station.name.trim(),
        fare: parseInt(station.fare) || 0,
        station_order: maxOrder + index + 1,
        status: 'active'
      }))

      const { data, error } = await supabase
        .from('stations')
        .insert(stationsToInsert)
        .select()

      if (error) {
        console.error('Error adding stations:', error)
        showToast('Failed to add stations', 'error')
        return
      }

      // Add stations to local state
      const updatedStations = [...stations, ...data]
      setStations(updatedStations)

      // Recalculate max fare with new stations
      const maxFare = updatedStations.length > 0
        ? Math.max(...updatedStations.map(s => s.fare || 0))
        : 0

      // Update route's station count and fare in routes state
      setRoutes(routes.map(route =>
        route.id === selectedRoute.id
          ? {
              ...route,
              stations_count: (route.stations_count || 0) + data.length,
              fare: maxFare
            }
          : route
      ))

      // Reset form
      setMultipleStations([{ name: '', fare: '' }])
      showToast(`${data.length} station${data.length > 1 ? 's' : ''} added successfully!`, 'success')
    } catch (error) {
      console.error('Error adding stations:', error)
      showToast('Error adding stations', 'error')
    }
  }

  const handleEditStation = (station) => {
    setEditingStationId(station.id)
    setEditStationData({ name: station.station_name, fare: station.fare })
  }

  const handleCancelEdit = () => {
    setEditingStationId(null)
    setEditStationData({ name: '', fare: '' })
  }

  const handleUpdateStation = async (stationId) => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      if (!editStationData.name.trim()) {
        showToast('Please enter station name', 'error')
        return
      }

      if (!editStationData.fare || parseFloat(editStationData.fare) <= 0) {
        showToast('Please enter a valid fare amount', 'error')
        return
      }

      const { error } = await supabase
        .from('stations')
        .update({
          station_name: editStationData.name.trim(),
          fare: parseInt(editStationData.fare) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', stationId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error updating station:', error)
        showToast('Failed to update station', 'error')
      } else {
        // Update station in local state
        const updatedStations = stations.map(station =>
          station.id === stationId
            ? { ...station, station_name: editStationData.name.trim(), fare: parseInt(editStationData.fare) || 0 }
            : station
        )
        setStations(updatedStations)

        // Recalculate max fare and update routes state
        const maxFare = updatedStations.length > 0
          ? Math.max(...updatedStations.map(s => s.fare || 0))
          : 0

        setRoutes(routes.map(route =>
          route.id === selectedRoute.id
            ? { ...route, fare: maxFare }
            : route
        ))

        setEditingStationId(null)
        setEditStationData({ name: '', fare: '' })
        showToast('Station updated successfully!', 'success')
      }
    } catch (error) {
      console.error('Error updating station:', error)
      showToast('Error updating station', 'error')
    }
  }

  const handleDeleteStation = async (stationId) => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('Unauthorized', 'error')
        return
      }

      const { error } = await supabase
        .from('stations')
        .update({ status: 'inactive' })
        .eq('id', stationId)
        .eq('school_id', user.school_id)

      if (error) {
        console.error('Error deleting station:', error)
        showToast('Failed to delete station', 'error')
      } else {
        // Remove station from local state
        const updatedStations = stations.filter(station => station.id !== stationId)
        setStations(updatedStations)

        // Recalculate max fare from remaining stations
        const maxFare = updatedStations.length > 0
          ? Math.max(...updatedStations.map(s => s.fare || 0))
          : 0

        // Update route's station count and fare in routes state
        setRoutes(routes.map(route =>
          route.id === selectedRoute.id
            ? {
                ...route,
                stations_count: Math.max(0, (route.stations_count || 0) - 1),
                fare: maxFare
              }
            : route
        ))

        showToast('Station deleted successfully!', 'success')
      }
    } catch (error) {
      console.error('Error deleting station:', error)
      showToast('Error deleting station', 'error')
    }
  }

  const filteredRoutes = routes.filter(route => {
    return route.route_name?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const exportToCSV = () => {
    if (filteredRoutes.length === 0) {
      showToast('No data to export', 'error')
      return
    }

    const csvData = filteredRoutes.map((route, index) => ({
      'Sr.': index + 1,
      'Route Name': route.route_name || 'N/A',
      'Total Stations': route.station_count || 0,
      'Fare Range': route.fare_range || 'N/A'
    }))

    const headers = Object.keys(csvData[0])
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    a.download = `transport-routes-${date}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    showToast('CSV exported successfully!', 'success')
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRoutes = filteredRoutes.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  return (
    <div className="p-2 bg-gray-50 min-h-screen">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-2 mb-2">
        <div className="flex flex-col md:flex-row gap-1.5 items-center">
          <button
            onClick={() => setShowModal(true)}
            className="px-2.5 py-1.5 rounded font-medium transition flex items-center gap-1 text-xs whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
          >
            <Plus size={12} />
            Add Route
          </button>
          <button
            onClick={exportToCSV}
            className="px-2.5 py-1.5 rounded font-medium transition flex items-center gap-1 text-xs whitespace-nowrap bg-[#DC2626] text-white hover:bg-red-700"
          >
            <Download size={12} />
            Export to Excel
          </button>
          <div className="flex-1 relative w-full">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Name</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Fare</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Stations</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Vehicles</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Passengers</th>
                <th className="px-4 py-3 text-left font-semibold border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Loading routes...
                  </td>
                </tr>
              ) : currentRoutes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No routes found
                  </td>
                </tr>
              ) : (
                currentRoutes.map((route, index) => (
                  <tr
                    key={route.id}
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition`}
                  >
                    <td className="px-4 py-3 border border-gray-200">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 border border-gray-200">
                      <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                        {route.route_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      {route.fare ? route.fare.toLocaleString() : '0'}
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      {route.stations_count || 0}
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      {route.vehicles_count || 0}
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      {route.passengers_count || 0}
                    </td>
                    <td className="px-4 py-3 border border-gray-200">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleManageStations(route)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Manage Stations"
                        >
                          <MapPin size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(route)}
                          className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(route)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredRoutes.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredRoutes.length)} of {filteredRoutes.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 text-sm font-medium rounded-lg transition ${
                          currentPage === pageNum
                            ? 'bg-blue-800 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="px-2">...</span>
                  }
                  return null
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Route Sidebar */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => {
              setShowModal(false)
              setFormData({ routeName: '', stationsList: [], vehicles: '', passengers: '' })
              setTempStation({ name: '', fare: '' })
            }}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Add New Route</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the route details</p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ routeName: '', stationsList: [], vehicles: '', passengers: '' })
                    setTempStation({ name: '', fare: '' })
                  }}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Route Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Main Street Route"
                    value={formData.routeName}
                    onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>

                {/* Stations Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Add Stations with Fares
                  </label>
                  <p className="text-xs text-gray-500 mb-4">Add intermediate stations and final destination with their respective fares</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Station name (e.g., Station 1)"
                      value={tempStation.name}
                      onChange={(e) => setTempStation({ ...tempStation, name: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddStationToForm()}
                      className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Fare (e.g., 1500)"
                        value={tempStation.fare}
                        onChange={(e) => setTempStation({ ...tempStation, fare: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddStationToForm()}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 text-sm"
                        min="0"
                      />
                      <button
                        type="button"
                        onClick={handleAddStationToForm}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1 text-sm font-medium"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Stations List */}
                  {formData.stationsList.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Added Stations ({formData.stationsList.length})</p>
                      {formData.stationsList.map((station, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-800">
                                {typeof station === 'string' ? station : station.name}
                              </span>
                              {typeof station === 'object' && station.fare && (
                                <div className="text-xs text-green-600 font-semibold mt-0.5">
                                  PKR {parseFloat(station.fare).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStationFromForm(index)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ routeName: '', stationsList: [], vehicles: '', passengers: '' })
                    setTempStation({ name: '', fare: '' })
                  }}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <Plus size={14} />
                  Save Route
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Route Sidebar */}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => {
              setShowEditModal(false)
              setFormData({ routeName: '', stationsList: [], vehicles: '', passengers: '' })
              setTempStation({ name: '', fare: '' })
              setSelectedRoute(null)
            }}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Route</h3>
                  <p className="text-blue-200 text-sm mt-1">Update route details</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setFormData({ routeName: '', stationsList: [], vehicles: '', passengers: '' })
                    setTempStation({ name: '', fare: '' })
                    setSelectedRoute(null)
                  }}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Route Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Main Street Route"
                    value={formData.routeName}
                    onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                </div>

                {/* Existing Stations */}
                {stations.length > 0 && (
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                      Existing Stations ({stations.length})
                    </label>
                    <div className="space-y-2">
                      {stations.map((station, index) => (
                        <div
                          key={station.id}
                          className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200 group hover:border-green-300"
                        >
                          {editingStationId === station.id ? (
                            // Edit mode
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    STATION NAME
                                  </label>
                                  <input
                                    type="text"
                                    value={editStationData.name}
                                    onChange={(e) => setEditStationData({ ...editStationData, name: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    FARE AMOUNT
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs">Rs.</span>
                                    <input
                                      type="number"
                                      value={editStationData.fare}
                                      onChange={(e) => setEditStationData({ ...editStationData, fare: e.target.value })}
                                      className="w-full pl-12 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                      min="0"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded transition border border-gray-300"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStation(station.id)}
                                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-800">
                                    {station.station_name}
                                  </span>
                                  {station.fare > 0 && (
                                    <div className="text-xs text-green-600 font-semibold mt-0.5">
                                      PKR {station.fare.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => handleEditStation(station)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"
                                  title="Edit Station"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStation(station.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"
                                  title="Delete Station"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stations Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Add More Stations with Fares
                  </label>
                  <p className="text-xs text-gray-500 mb-4">Add intermediate stations and final destination with their respective fares</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Station name (e.g., Station 1)"
                      value={tempStation.name}
                      onChange={(e) => setTempStation({ ...tempStation, name: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddStationToForm()}
                      className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Fare (e.g., 1500)"
                        value={tempStation.fare}
                        onChange={(e) => setTempStation({ ...tempStation, fare: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddStationToForm()}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 text-sm"
                        min="0"
                      />
                      <button
                        type="button"
                        onClick={handleAddStationToForm}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1 text-sm font-medium"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Stations List */}
                  {formData.stationsList.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Added Stations ({formData.stationsList.length})</p>
                      {formData.stationsList.map((station, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-800">
                                {typeof station === 'string' ? station : station.name}
                              </span>
                              {typeof station === 'object' && station.fare && (
                                <div className="text-xs text-green-600 font-semibold mt-0.5">
                                  PKR {parseFloat(station.fare).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStationFromForm(index)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setFormData({ routeName: '', stationsList: [], vehicles: '', passengers: '' })
                    setTempStation({ name: '', fare: '' })
                    setSelectedRoute(null)
                  }}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <Plus size={14} />
                  Update Route
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && routeToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowDeleteModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete route <span className="font-bold text-red-600">{routeToDelete.route_name}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manage Stations Modal */}
      {showStationsModal && selectedRoute && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => {
              setShowStationsModal(false)
              setSelectedRoute(null)
              setStations([])
              setNewStationName('')
              setNewStationFare('')
              setMultipleStations([{ name: '', fare: '' }])
            }}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Manage Stations</h3>
                  <p className="text-blue-200 text-sm mt-1">{selectedRoute.route_name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowStationsModal(false)
                    setSelectedRoute(null)
                    setStations([])
                    setNewStationName('')
                    setNewStationFare('')
                    setMultipleStations([{ name: '', fare: '' }])
                  }}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Add Multiple Stations */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-gray-800 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    Add New Station
                  </label>
                  <button
                    onClick={handleAddStationRow}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add More
                  </button>
                </div>

                {/* Multiple Station Rows */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {multipleStations.map((station, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              STATION NAME <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., Jhan Khan"
                              value={station.name}
                              onChange={(e) => handleUpdateStationRow(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">
                              FARE AMOUNT <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs">Rs.</span>
                              <input
                                type="number"
                                placeholder="1500"
                                value={station.fare}
                                onChange={(e) => handleUpdateStationRow(index, 'fare', e.target.value)}
                                className="w-full pl-12 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Delete Button */}
                        {multipleStations.length > 1 && (
                          <button
                            onClick={() => handleRemoveStationRow(index)}
                            className="mt-7 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Button */}
                <div className="mt-4">
                  <button
                    onClick={handleAddMultipleStations}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg"
                  >
                    <Plus size={18} />
                    Add {multipleStations.filter(s => s.name && s.fare).length > 1 ? 'Stations' : 'Station'}
                  </button>
                </div>
              </div>

              {/* Stations List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-gray-800 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    All Stations
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {stations.length}
                    </span>
                  </h4>
                </div>

                {stations.length === 0 ? (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-12 rounded-xl border-2 border-dashed border-gray-300 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="text-gray-400" size={32} />
                    </div>
                    <p className="text-gray-600 font-semibold mb-1">No stations added yet</p>
                    <p className="text-gray-400 text-sm">Add your first station using the form above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stations.map((station, index) => (
                      <div
                        key={station.id}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h5 className="text-gray-900 font-semibold text-base">{station.station_name}</h5>
                                {station.fare > 0 && (
                                  <div className="px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                                    <span className="text-green-700 font-bold text-sm">
                                      PKR {station.fare.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <p className="text-gray-400 text-xs flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                Order: {station.station_order}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteStation(station.id)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                            title="Delete Station"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
              <button
                onClick={() => {
                  setShowStationsModal(false)
                  setSelectedRoute(null)
                  setStations([])
                  setNewStationName('')
                  setNewStationFare('')
                  setMultipleStations([{ name: '', fare: '' }])
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <X size={18} />
                Close
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}