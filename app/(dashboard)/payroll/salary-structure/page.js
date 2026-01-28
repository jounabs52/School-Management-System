'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import PermissionGuard from '@/components/PermissionGuard'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardInfoGrid } from '@/components/DataCard'

export default function SalaryStructurePage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [searchEmployeeNumber, setSearchEmployeeNumber] = useState('')
  const [searchGeneralData, setSearchGeneralData] = useState('')
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [existingStructure, setExistingStructure] = useState(null)
  const [saving, setSaving] = useState(false)
  const [staffSalaryStructures, setStaffSalaryStructures] = useState({})

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Salary structure form state
  const [basicSalary, setBasicSalary] = useState(0)
  const [houseAllowance, setHouseAllowance] = useState(0)
  const [medicalAllowance, setMedicalAllowance] = useState(0)
  const [transportAllowance, setTransportAllowance] = useState(0)
  const [otherAllowances, setOtherAllowances] = useState(0)
  const [providentFund, setProvidentFund] = useState(0)
  const [taxDeduction, setTaxDeduction] = useState(0)
  const [otherDeductions, setOtherDeductions] = useState(0)
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0])
  const [effectiveTo, setEffectiveTo] = useState('')

  useEffect(() => {
    const userData = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-data='))

    if (userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData.split('=')[1]))
        setCurrentUser(user)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (currentUser?.school_id) {
      loadStaffList()
    }
  }, [currentUser, searchEmployeeNumber, searchGeneralData])

  // Apply blur effect to sidebar when modals are open
  useEffect(() => {
    const anyModalOpen = showDeleteModal || showUpdateConfirmModal

    if (anyModalOpen) {
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
  }, [showDeleteModal, showUpdateConfirmModal])

  const loadStaffList = async () => {
    if (!currentUser?.school_id) return

    setLoading(true)
    try {
      let query = supabase
        .from('staff')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('first_name')

      if (searchEmployeeNumber) {
        query = query.eq('employee_number', searchEmployeeNumber)
      }

      if (searchGeneralData) {
        query = query.or(`first_name.ilike.%${searchGeneralData}%,last_name.ilike.%${searchGeneralData}%,employee_number.ilike.%${searchGeneralData}%,father_name.ilike.%${searchGeneralData}%`)
      }

      const { data, error } = await query

      if (error) throw error

      setStaffList(data || [])

      // Load salary structures for all staff members
      if (data && data.length > 0) {
        const { data: structures } = await supabase
          .from('salary_structures')
          .select('staff_id')
          .eq('school_id', currentUser.school_id)
          .eq('status', 'active')

        const structuresMap = {}
        if (structures) {
          structures.forEach(s => {
            structuresMap[s.staff_id] = true
          })
        }
        setStaffSalaryStructures(structuresMap)
      }
    } catch (error) {
      console.error('Error loading staff:', error)
      toast.error('Failed to load staff list')
    } finally {
      setLoading(false)
    }
  }

  const handleStaffButtonClick = (staff) => {
    if (staffSalaryStructures[staff.id]) {
      // Staff has existing structure, show confirmation modal
      setSelectedStaff(staff)
      setShowUpdateConfirmModal(true)
    } else {
      // No existing structure, load normally
      loadStaffSalaryStructure(staff)
    }
  }

  const handleConfirmUpdate = () => {
    setShowUpdateConfirmModal(false)
    if (selectedStaff) {
      loadStaffSalaryStructure(selectedStaff)
    }
  }

  const loadStaffSalaryStructure = async (staff) => {
    setSelectedStaff(staff)

    try {
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .eq('staff_id', staff.id)
        .eq('status', 'active')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setExistingStructure(data)
        setBasicSalary(parseFloat(data.basic_salary) || 0)
        setHouseAllowance(parseFloat(data.house_allowance) || 0)
        setMedicalAllowance(parseFloat(data.medical_allowance) || 0)
        setTransportAllowance(parseFloat(data.transport_allowance) || 0)
        setOtherAllowances(parseFloat(data.other_allowances) || 0)
        setProvidentFund(parseFloat(data.provident_fund) || 0)
        setTaxDeduction(parseFloat(data.tax_deduction) || 0)
        setOtherDeductions(parseFloat(data.other_deductions) || 0)
        setEffectiveFrom(data.effective_from || new Date().toISOString().split('T')[0])
        setEffectiveTo(data.effective_to || '')
      } else {
        resetForm()
      }
    } catch (error) {
      console.error('Error loading salary structure:', error)
      resetForm()
    }
  }

  const resetForm = () => {
    setExistingStructure(null)
    setBasicSalary(0)
    setHouseAllowance(0)
    setMedicalAllowance(0)
    setTransportAllowance(0)
    setOtherAllowances(0)
    setProvidentFund(0)
    setTaxDeduction(0)
    setOtherDeductions(0)
    setEffectiveFrom(new Date().toISOString().split('T')[0])
    setEffectiveTo('')
  }

  const calculateGrossSalary = () => {
    return (
      parseFloat(basicSalary || 0) +
      parseFloat(houseAllowance || 0) +
      parseFloat(medicalAllowance || 0) +
      parseFloat(transportAllowance || 0) +
      parseFloat(otherAllowances || 0)
    )
  }

  const calculateTotalDeductions = () => {
    return (
      parseFloat(providentFund || 0) +
      parseFloat(taxDeduction || 0) +
      parseFloat(otherDeductions || 0)
    )
  }

  const calculateNetSalary = () => {
    return calculateGrossSalary() - calculateTotalDeductions()
  }

  const handleSaveSalaryStructure = async () => {
    if (!selectedStaff) {
      toast.error('Please select a staff member')
      return
    }

    if (basicSalary <= 0) {
      toast.error('Please enter a valid basic salary')
      return
    }

    setSaving(true)
    try {
      const salaryData = {
        user_id: currentUser.id,
        school_id: currentUser.school_id,
        staff_id: selectedStaff.id,
        basic_salary: parseFloat(basicSalary),
        house_allowance: parseFloat(houseAllowance || 0),
        medical_allowance: parseFloat(medicalAllowance || 0),
        transport_allowance: parseFloat(transportAllowance || 0),
        other_allowances: parseFloat(otherAllowances || 0),
        provident_fund: parseFloat(providentFund || 0),
        tax_deduction: parseFloat(taxDeduction || 0),
        other_deductions: parseFloat(otherDeductions || 0),
        gross_salary: calculateGrossSalary(),
        net_salary: calculateNetSalary(),
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        created_by: currentUser.id,
        status: 'active'
      }

      if (existingStructure) {
        // Update existing structure
        const { error } = await supabase
          .from('salary_structures')
          .update(salaryData)
          .eq('id', existingStructure.id)
          .eq('user_id', currentUser.id)
          .eq('school_id', currentUser.school_id)

        if (error) throw error

        toast.success('Salary structure updated successfully!')
      } else {
        // Create new structure
        console.log('=== Creating New Salary Structure ===')
        const { error } = await supabase
          .from('salary_structures')
          .insert(salaryData)

        if (error) throw error
        console.log('Salary structure created successfully')

        // Auto-create pending payment for current month
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth() + 1
        const currentYear = currentDate.getFullYear()

        console.log('=== Auto-creating Pending Payment ===')
        console.log('Current Month:', currentMonth, 'Current Year:', currentYear)

        // Check if payment already exists for current month
        const { data: existingPayment } = await supabase
          .from('salary_payments')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('school_id', currentUser.school_id)
          .eq('staff_id', selectedStaff.id)
          .eq('payment_month', currentMonth)
          .eq('payment_year', currentYear)
          .single()

        console.log('Existing payment check:', existingPayment)

        if (!existingPayment) {
          console.log('No existing payment found, creating pending payment...')

          // Create pending payment record
          const paymentDataToInsert = {
            user_id: currentUser.id,
            school_id: currentUser.school_id,
            staff_id: selectedStaff.id,
            payment_month: currentMonth,
            payment_year: currentYear,
            basic_salary: parseFloat(basicSalary),
            total_allowances:
              parseFloat(houseAllowance || 0) +
              parseFloat(medicalAllowance || 0) +
              parseFloat(transportAllowance || 0) +
              parseFloat(otherAllowances || 0),
            total_deductions:
              parseFloat(providentFund || 0) +
              parseFloat(taxDeduction || 0) +
              parseFloat(otherDeductions || 0),
            gross_salary: calculateGrossSalary(),
            net_salary: calculateNetSalary(),
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'pending',
            user_id: currentUser.id,
            status: 'pending',
            remarks: `Pending salary slip for ${getMonthName(currentMonth)} ${currentYear}`
          }

          console.log('Payment data to insert:', paymentDataToInsert)

          const { data: paymentData, error: paymentError } = await supabase
            .from('salary_payments')
            .insert(paymentDataToInsert)
            .select()
            .single()

          console.log('Payment creation result:', { paymentData, paymentError })

          if (!paymentError && paymentData) {
            console.log('Payment created successfully, now creating salary slip record...')

            const slipDataToInsert = {
              user_id: currentUser.id,
              school_id: currentUser.school_id,
              staff_id: selectedStaff.id,
              payment_id: paymentData.id,
              slip_number: `SLP-${currentYear}-${String(currentMonth).padStart(2, '0')}-${selectedStaff.employee_number || selectedStaff.id}`,
              month: currentMonth,
              year: currentYear,
              generated_by: currentUser.id,
              generated_date: new Date().toISOString().split('T')[0],
              file_path: null,
              status: 'pending'
            }

            console.log('Slip data to insert:', slipDataToInsert)

            const { data: slipData, error: slipError } = await supabase
              .from('salary_slips')
              .insert(slipDataToInsert)

            console.log('Slip creation result:', { slipData, slipError })

            if (slipError) {
              console.error('Error creating salary slip:', slipError)
            } else {
              console.log('Salary slip created successfully!')
            }
          } else {
            console.error('Payment creation failed or paymentData is null')
          }
        } else {
          console.log('Payment already exists for this month, skipping creation')
        }

        toast.success('Salary structure created successfully! Unpaid slip generated for current month.')
      }

      // Reload the structure
      await loadStaffSalaryStructure(selectedStaff)

      // Reload staff list to update button states
      loadStaffList()
    } catch (error) {
      console.error('Error saving salary structure:', error)
      toast.error('Failed to save salary structure')
    } finally {
      setSaving(false)
    }
  }

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const handleDeleteSalaryStructure = async () => {
    if (!existingStructure) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('salary_structures')
        .delete()
        .eq('id', existingStructure.id)
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)

      if (error) throw error

      toast.success('Salary structure deleted successfully')
      setShowDeleteModal(false)
      resetForm()
      setSelectedStaff(null)
    } catch (error) {
      console.error('Error deleting salary structure:', error)
      toast.error('Failed to delete salary structure')
    } finally {
      setDeleting(false)
    }
  }

  const clearScreen = () => {
    setSearchEmployeeNumber('')
    setSearchGeneralData('')
    setSelectedStaff(null)
    resetForm()
  }

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <PermissionGuard
      permissionKey="payroll_create_view"
      currentUser={currentUser}
      pageName="Create Salary"
    >
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
        }}
      />

      {/* Search Section - Only show when no staff is selected */}
      {!selectedStaff && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-5 lg:p-6 mb-2 sm:mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-5 mb-2 sm:mb-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Employee Number</label>
              <input
                type="text"
                placeholder="Employee Number"
                value={searchEmployeeNumber}
                onChange={(e) => setSearchEmployeeNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">OR General Data</label>
              <input
                type="text"
                placeholder="Search by name, father name or employee number"
                value={searchGeneralData}
                onChange={(e) => setSearchGeneralData(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Click on <span className="text-blue-600 font-medium underline cursor-pointer" onClick={clearScreen}>clear screen</span> or press <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Shift+Esc</kbd> to clear the screen.
          </p>
        </div>
      )}

      {/* Staff List */}
      {!selectedStaff && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-5 lg:p-6">
          {loading ? (
            <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm">Loading staff...</div>
          ) : staffList.length > 0 ? (
            <ResponsiveTableWrapper
              loading={loading}
              empty={staffList.length === 0}
              emptyMessage="No staff found"
              tableView={
              <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap">Staff Name</th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap hidden sm:table-cell">Employee Number</th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap hidden md:table-cell">Designation</th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap hidden lg:table-cell">Department</th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-center font-semibold whitespace-nowrap">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((staff, index) => {
                    const hasStructure = staffSalaryStructures[staff.id]
                    return (
                      <tr key={staff.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-800 whitespace-nowrap">{staff.first_name} {staff.last_name}</td>
                        <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-800 whitespace-nowrap hidden sm:table-cell">{staff.employee_number || 'N/A'}</td>
                        <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-800 whitespace-nowrap hidden md:table-cell">{staff.designation || 'N/A'}</td>
                        <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-800 whitespace-nowrap hidden lg:table-cell">{staff.department || 'N/A'}</td>
                        <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleStaffButtonClick(staff)}
                            className={`${
                              hasStructure
                                ? 'bg-blue-900 hover:bg-blue-800'
                                : 'bg-red-600 hover:bg-red-700'
                            } text-white px-3 sm:px-4 md:px-6 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-medium transition-colors`}
                          >
                            {hasStructure ? 'Created' : 'Create Salary'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              }
              cardView={
                <div className="space-y-2">
                  {staffList.map((staff) => {
                    const hasStructure = staffSalaryStructures[staff.id]
                    return (
                      <DataCard key={staff.id}>
                        <CardHeader
                          name={`${staff.first_name} ${staff.last_name}`}
                          subtitle={`Emp#: ${staff.employee_number || 'N/A'}`}
                          badge={
                            <button onClick={() => handleStaffButtonClick(staff)} className={`${hasStructure ? 'bg-blue-900 hover:bg-blue-800' : 'bg-red-600 hover:bg-red-700'} text-white px-2 py-1 rounded text-[10px] font-medium transition-colors`}>{hasStructure ? 'Created' : 'Create'}</button>
                          }
                        />
                        <CardInfoGrid>
                          <CardRow label="Designation" value={staff.designation || 'N/A'} />
                          <CardRow label="Department" value={staff.department || 'N/A'} />
                        </CardInfoGrid>
                      </DataCard>
                    )
                  })}
                </div>
              }
            />
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm">No active staff found. Please adjust your search criteria.</div>
          )}
        </div>
      )}

      {/* Salary Structure Form */}
      {selectedStaff && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-5 lg:p-6">
          {/* Staff Info Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3 pb-2 sm:pb-3 border-b">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm sm:text-base">👨‍💼</span>
            </div>
            <div className="flex-1">
              <h2 className="text-sm sm:text-base font-bold text-blue-600">
                {selectedStaff.first_name} {selectedStaff.last_name}
              </h2>
              <div className="flex flex-wrap gap-1 sm:gap-2 md:gap-3 text-xs sm:text-sm text-gray-600 mt-1">
                <span>Employee No: {selectedStaff.employee_number || 'N/A'}</span>
                <span className="hidden sm:inline">|</span>
                <span>Designation: {selectedStaff.designation || 'N/A'}</span>
                <span className="hidden md:inline">|</span>
                <span className="hidden md:inline">Department: {selectedStaff.department || 'N/A'}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedStaff(null)}
              className="text-gray-500 hover:text-gray-700 absolute top-2 right-2 sm:static"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Badge */}
          {existingStructure && (
            <div className="mb-2 sm:mb-3">
              <span className="bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                ✓ Salary Structure Exists
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-5">
            {/* Basic Salary & Allowances */}
            <div className="bg-green-50 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6">
              <h3 className="text-xs sm:text-sm font-semibold text-green-700 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="text-sm sm:text-base">💰</span> Basic Salary & Allowances
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Basic Salary <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">House Allowance</label>
                  <input
                    type="number"
                    value={houseAllowance}
                    onChange={(e) => setHouseAllowance(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Medical Allowance</label>
                  <input
                    type="number"
                    value={medicalAllowance}
                    onChange={(e) => setMedicalAllowance(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Transport Allowance</label>
                  <input
                    type="number"
                    value={transportAllowance}
                    onChange={(e) => setTransportAllowance(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Other Allowances</label>
                  <input
                    type="number"
                    value={otherAllowances}
                    onChange={(e) => setOtherAllowances(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-red-50 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6">
              <h3 className="text-xs sm:text-sm font-semibold text-red-700 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="text-sm sm:text-base">➖</span> Deductions
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Provident Fund</label>
                  <input
                    type="number"
                    value={providentFund}
                    onChange={(e) => setProvidentFund(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tax Deduction</label>
                  <input
                    type="number"
                    value={taxDeduction}
                    onChange={(e) => setTaxDeduction(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Other Deductions</label>
                  <input
                    type="number"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="pt-1 sm:pt-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Effective From</label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 sm:px-3 py-2 sm:py-2.5 text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6">
              <h3 className="text-xs sm:text-sm font-semibold text-blue-700 mb-2 sm:mb-3 flex items-center gap-2">
                <span className="text-sm sm:text-base">📊</span> Salary Summary
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <div className="p-2 sm:p-3 bg-white rounded-lg border border-blue-200">
                  <div className="text-xs sm:text-sm text-gray-600">Gross Salary</div>
                  <div className="text-sm sm:text-base font-bold text-blue-600">{calculateGrossSalary().toLocaleString()} PKR</div>
                  <div className="text-xs text-gray-500">Basic + All Allowances</div>
                </div>

                <div className="p-2 sm:p-3 bg-white rounded-lg border border-red-200">
                  <div className="text-xs sm:text-sm text-gray-600">Total Deductions</div>
                  <div className="text-sm sm:text-base font-bold text-red-600">{calculateTotalDeductions().toLocaleString()} PKR</div>
                  <div className="text-xs text-gray-500">All Deductions</div>
                </div>

                <div className="p-2 sm:p-3 bg-green-100 rounded-lg border-2 border-green-400">
                  <div className="text-xs sm:text-sm text-gray-700 font-medium">Net Salary (Take Home)</div>
                  <div className="text-sm sm:text-base font-bold text-green-700">{calculateNetSalary().toLocaleString()} PKR</div>
                  <div className="text-xs text-gray-600">Gross - Deductions</div>
                </div>

                <div className="pt-2 sm:pt-3 space-y-2 sm:space-y-3">
                  <button
                    onClick={handleSaveSalaryStructure}
                    disabled={saving || basicSalary <= 0}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : existingStructure ? 'Update Salary Structure' : 'Create Salary Structure'}
                  </button>

                  {existingStructure && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg font-semibold transition-colors"
                    >
                      Delete Salary Structure
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedStaff(null)}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg font-semibold transition-colors"
                  >
                    Back to Staff List
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6 overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold whitespace-nowrap">Component</th>
                  <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold whitespace-nowrap">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 font-medium whitespace-nowrap">Basic Salary</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right whitespace-nowrap">{parseFloat(basicSalary || 0).toLocaleString()}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 pl-4 sm:pl-6 text-green-700 whitespace-nowrap">+ House Allowance</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-green-700 whitespace-nowrap">{parseFloat(houseAllowance || 0).toLocaleString()}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 pl-4 sm:pl-6 text-green-700 whitespace-nowrap">+ Medical Allowance</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-green-700 whitespace-nowrap">{parseFloat(medicalAllowance || 0).toLocaleString()}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 pl-4 sm:pl-6 text-green-700 whitespace-nowrap">+ Transport Allowance</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-green-700 whitespace-nowrap">{parseFloat(transportAllowance || 0).toLocaleString()}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 pl-4 sm:pl-6 text-green-700 whitespace-nowrap">+ Other Allowances</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-green-700 whitespace-nowrap">{parseFloat(otherAllowances || 0).toLocaleString()}</td>
                </tr>
                <tr className="bg-blue-100 font-bold">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">= Gross Salary</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-blue-700 whitespace-nowrap">{calculateGrossSalary().toLocaleString()}</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 pl-4 sm:pl-6 text-red-700 whitespace-nowrap">- Provident Fund</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-red-700 whitespace-nowrap">{parseFloat(providentFund || 0).toLocaleString()}</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 pl-4 sm:pl-6 text-red-700 whitespace-nowrap">- Tax Deduction</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-red-700 whitespace-nowrap">{parseFloat(taxDeduction || 0).toLocaleString()}</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 pl-4 sm:pl-6 text-red-700 whitespace-nowrap">- Other Deductions</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-red-700 whitespace-nowrap">{parseFloat(otherDeductions || 0).toLocaleString()}</td>
                </tr>
                <tr className="bg-green-200 font-bold">
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">= Net Salary</td>
                  <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-right text-green-800 whitespace-nowrap">{calculateNetSalary().toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Update Confirmation Modal */}
      {showUpdateConfirmModal && selectedStaff && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowUpdateConfirmModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95%] sm:max-w-md md:max-w-lg">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 sm:px-4 py-2 sm:py-3 md:py-4 rounded-t-xl">
                <h3 className="text-sm sm:text-base font-bold">Salary Structure Already Exists</h3>
              </div>
              <div className="p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">
                      <span className="font-bold">{selectedStaff.first_name} {selectedStaff.last_name}</span> already has a salary structure created.
                    </p>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      Do you want to update the existing salary structure?
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button
                    onClick={() => {
                      setShowUpdateConfirmModal(false)
                      setSelectedStaff(null)
                    }}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 text-xs sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmUpdate}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white font-semibold hover:bg-blue-700 rounded-lg transition text-xs sm:text-sm"
                  >
                    Yes, Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && existingStructure && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 sm:px-3 sm:px-4 py-2 sm:py-4 rounded-t-xl">
                <h3 className="text-base font-bold">Confirm Delete</h3>
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete the salary structure for <span className="font-bold text-red-600">{selectedStaff.first_name} {selectedStaff.last_name}</span>? This action cannot be undone.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="flex-1 px-4 sm:px-3 sm:px-4 py-2 sm:py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteSalaryStructure}
                    disabled={deleting}
                    className="flex-1 px-4 sm:px-3 sm:px-4 py-2 sm:py-3 bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </PermissionGuard>
  )
}
