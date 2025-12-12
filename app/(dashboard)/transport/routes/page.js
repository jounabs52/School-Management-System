'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, X, Trash2, MapPin, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

// Toast Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-6 right-6 z-[10001] animate-slideIn">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-xl border ${
        type === 'success' 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        {type === 'success' ? (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        )}
        <span className="font-medium">{message}</span>
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
    fare: '',
    stationsList: [],
    vehicles: '',
    passengers: ''
  })

  const [tempStationName, setTempStationName] = useState('')

  useEffect(() => {
    fetchRoutes()
  }, [])

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
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
        setRoutes([])
      } else {
        // For each route, get counts
        const routesWithStats = await Promise.all(
          (data || []).map(async (route) => {
            // Get stations count
            const { count: stationsCount } = await supabase
              .from('stations')
              .select('*', { count: 'exact', head: true })
              .eq('route_id', route.id)
              .eq('status', 'active')

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
              stations_count: stationsCount || 0,
              vehicles_count: vehiclesCount || 0,
              passengers_count: passengersCount || 0
            }
          })
        )

        setRoutes(routesWithStats)
      }
    } catch (error) {
      console.error('Error fetching routes:', error)
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
          school_id: user.school_id,
          created_by: user.id,
          route_name: formData.routeName,
          fare: parseFloat(formData.fare) || 0,
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

        const stationsToInsert = formData.stationsList.map((stationName, index) => ({
          school_id: user.school_id,
          created_by: user.id,
          route_id: newRouteId,
          station_name: stationName,
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
      setFormData({ routeName: '', fare: '', stationsList: [], vehicles: '', passengers: '' })
      setTempStationName('')
      showToast('Route added successfully!', 'success')
    } catch (error) {
      console.error('Error saving route:', error)
      showToast('Error saving route', 'error')
    }
  }

  // Add station to temporary list in form
  const handleAddStationToForm = () => {
    if (!tempStationName.trim()) {
      showToast('Please enter station name', 'error')
      return
    }
    setFormData({
      ...formData,
      stationsList: [...formData.stationsList, tempStationName.trim()]
    })
    setTempStationName('')
  }

  // Remove station from temporary list in form
  const handleRemoveStationFromForm = (index) => {
    const newStationsList = formData.stationsList.filter((_, i) => i !== index)
    setFormData({ ...formData, stationsList: newStationsList })
  }

  const handleEdit = (route) => {
    setSelectedRoute(route)
    setFormData({
      routeName: route.route_name || '',
      fare: route.fare || '',
      stationsList: [],
      vehicles: route.vehicles_count || '',
      passengers: route.passengers_count || ''
    })
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
          fare: parseFloat(formData.fare) || 0,
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

        const stationsToInsert = formData.stationsList.map((stationName, index) => ({
          school_id: user.school_id,
          created_by: user.id,
          route_id: selectedRoute.id,
          station_name: stationName,
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
              fare: parseFloat(formData.fare) || 0,
              stations_count: (route.stations_count || 0) + additionalStations
            }
          : route
      ))

      setShowEditModal(false)
      setFormData({ routeName: '', fare: '', stationsList: [], vehicles: '', passengers: '' })
      setTempStationName('')
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

      // Get the next order number
      const maxOrder = stations.length > 0
        ? Math.max(...stations.map(s => s.station_order || 0))
        : 0

      const { data, error } = await supabase
        .from('stations')
        .insert([{
          school_id: user.school_id,
          created_by: user.id,
          route_id: selectedRoute.id,
          station_name: newStationName.trim(),
          station_order: maxOrder + 1,
          status: 'active'
        }])
        .select()

      if (error) {
        console.error('Error adding station:', error)
        showToast('Failed to add station', 'error')
      } else {
        // Add station to local state
        setStations([...stations, data[0]])
        
        // Update route's station count in routes state
        setRoutes(routes.map(route => 
          route.id === selectedRoute.id 
            ? { ...route, stations_count: (route.stations_count || 0) + 1 }
            : route
        ))
        
        setNewStationName('')
        showToast('Station added successfully!', 'success')
      }
    } catch (error) {
      console.error('Error adding station:', error)
      showToast('Error adding station', 'error')
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
        setStations(stations.filter(station => station.id !== stationId))
        
        // Update route's station count in routes state
        setRoutes(routes.map(route => 
          route.id === selectedRoute.id 
            ? { ...route, stations_count: Math.max(0, (route.stations_count || 0) - 1) }
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
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          Add New Route
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Search route</h2>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
              setFormData({ routeName: '', fare: '', stationsList: [], vehicles: '', passengers: '' })
              setTempStationName('')
            }}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Add New Route</h3>
                  <p className="text-blue-200 text-sm mt-1">Fill in the route details</p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ routeName: '', fare: '', stationsList: [], vehicles: '', passengers: '' })
                    setTempStationName('')
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Fare
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.fare}
                      onChange={(e) => setFormData({ ...formData, fare: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>

                {/* Stations Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Stations (Optional)
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Enter station name"
                      value={tempStationName}
                      onChange={(e) => setTempStationName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddStationToForm()}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddStationToForm}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1 text-sm"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>

                  {/* Stations List */}
                  {formData.stationsList.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Added Stations ({formData.stationsList.length})</p>
                      {formData.stationsList.map((station, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-sm text-gray-700">{station}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStationFromForm(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition"
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
                    setFormData({ routeName: '', fare: '', stationsList: [], vehicles: '', passengers: '' })
                    setTempStationName('')
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
              setFormData({ routeName: '', fare: '', stationsList: [], vehicles: '', passengers: '' })
              setTempStationName('')
              setSelectedRoute(null)
            }}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Edit Route</h3>
                  <p className="text-blue-200 text-sm mt-1">Update route details</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setFormData({ routeName: '', fare: '', stationsList: [], vehicles: '', passengers: '' })
                    setTempStationName('')
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Fare
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={formData.fare}
                      onChange={(e) => setFormData({ ...formData, fare: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                    />
                  </div>
                </div>

                {/* Stations Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                    Stations (Optional)
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Enter station name"
                      value={tempStationName}
                      onChange={(e) => setTempStationName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddStationToForm()}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddStationToForm}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1 text-sm"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>

                  {/* Stations List */}
                  {formData.stationsList.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Added Stations ({formData.stationsList.length})</p>
                      {formData.stationsList.map((station, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-sm text-gray-700">{station}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStationFromForm(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition"
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
                    setFormData({ routeName: '', fare: '', stationsList: [], vehicles: '', passengers: '' })
                    setTempStationName('')
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
            }}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
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
                  }}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Add New Station */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <label className="block text-gray-800 font-semibold mb-3 text-sm uppercase tracking-wide">
                  Add New Station
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Station Name"
                    value={newStationName}
                    onChange={(e) => setNewStationName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddStation()}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 transition-all hover:border-gray-300"
                  />
                  <button
                    onClick={handleAddStation}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>
              </div>

              {/* Stations List */}
              <div className="space-y-2">
                <h4 className="text-gray-700 font-semibold text-sm uppercase tracking-wide mb-3">
                  Stations ({stations.length})
                </h4>
                {stations.length === 0 ? (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                    <MapPin className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500">No stations added yet</p>
                    <p className="text-gray-400 text-sm mt-1">Add your first station above</p>
                  </div>
                ) : (
                  stations.map((station, index) => (
                    <div
                      key={station.id}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium">{station.station_name}</p>
                          <p className="text-gray-400 text-xs">Order: {station.station_order}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteStation(station.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Station"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-3 bg-white">
              <button
                onClick={() => {
                  setShowStationsModal(false)
                  setSelectedRoute(null)
                  setStations([])
                  setNewStationName('')
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
              >
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