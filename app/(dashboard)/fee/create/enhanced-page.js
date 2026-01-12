'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckCircle, X, Users, CreditCard, Calendar, DollarSign, Percent, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={16} />}
      {type === 'error' && <X size={16} />}
      {type === 'warning' && <AlertCircle size={16} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={14} />
      </button>
    </div>
  )
}

export default function EnhancedCreateChallanPage() {
  const [classes, setClasses] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [formData, setFormData] = useState({
    sessionId: '',
    classId: '',
    feePlan: 'monthly', // monthly, quarterly, semi-annual, annual
    monthlyFee: '',
    discountType: 'none', // none, percentage, fixed
    discountValue: '',
    startMonth: new Date().getMonth() + 1,
    startYear: new Date().getFullYear()
  })

  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    fetchInitialData()
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) return

      const [classesResult, sessionsResult] = await Promise.all([
        supabase
          .from('classes')
          .select('id, class_name')
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .order('order_number', { ascending: true }),

        supabase
          .from('sessions')
          .select('id, session_name, is_active')
          .eq('school_id', user.school_id)
          .order('start_date', { ascending: false })
      ])

      if (classesResult.data) setClasses(classesResult.data)
      if (sessionsResult.data) {
        setSessions(sessionsResult.data)
        const activeSession = sessionsResult.data.find(s => s.is_active)
        if (activeSession) {
          setFormData(prev => ({ ...prev, sessionId: activeSession.id }))
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      showToast('Failed to load data', 'error')
      setLoading(false)
    }
  }

  const calculateDiscount = (monthlyFee, discountType, discountValue) => {
    if (discountType === 'percentage') {
      return (monthlyFee * discountValue) / 100
    } else if (discountType === 'fixed') {
      return discountValue
    }
    return 0
  }

  const calculateInstallmentDetails = () => {
    const monthlyFee = parseFloat(formData.monthlyFee) || 0
    const discountAmount = calculateDiscount(
      monthlyFee,
      formData.discountType,
      parseFloat(formData.discountValue) || 0
    )
    const finalMonthlyFee = monthlyFee - discountAmount

    let installmentsCount = 0
    let installmentAmount = 0
    let monthsPerInstallment = 0

    switch (formData.feePlan) {
      case 'monthly':
        installmentsCount = 12
        installmentAmount = finalMonthlyFee
        monthsPerInstallment = 1
        break
      case 'quarterly':
        installmentsCount = 4
        installmentAmount = finalMonthlyFee * 3
        monthsPerInstallment = 3
        break
      case 'semi-annual':
        installmentsCount = 2
        installmentAmount = finalMonthlyFee * 6
        monthsPerInstallment = 6
        break
      case 'annual':
        installmentsCount = 1
        installmentAmount = finalMonthlyFee * 12
        monthsPerInstallment = 12
        break
    }

    return {
      monthlyFee,
      discountAmount,
      finalMonthlyFee,
      installmentsCount,
      installmentAmount,
      monthsPerInstallment,
      totalAnnualFee: finalMonthlyFee * 12
    }
  }

  const generateInstallments = (studentId, classId, details) => {
    const installments = []
    const { installmentsCount, installmentAmount, monthsPerInstallment, finalMonthlyFee, discountAmount } = details

    let currentMonth = parseInt(formData.startMonth)
    let currentYear = parseInt(formData.startYear)

    for (let i = 1; i <= installmentsCount; i++) {
      const monthsCovered = []
      const startMonthOfPeriod = currentMonth

      for (let j = 0; j < monthsPerInstallment; j++) {
        monthsCovered.push(months[currentMonth - 1])
        currentMonth++
        if (currentMonth > 12) {
          currentMonth = 1
          currentYear++
        }
      }

      let periodLabel = ''
      if (formData.feePlan === 'monthly') {
        periodLabel = `${monthsCovered[0]} ${currentYear}`
      } else if (formData.feePlan === 'quarterly') {
        periodLabel = `Q${i} (${monthsCovered[0]}-${monthsCovered[monthsCovered.length - 1]}) ${currentYear}`
      } else if (formData.feePlan === 'semi-annual') {
        periodLabel = `H${i} (${monthsCovered[0]}-${monthsCovered[monthsCovered.length - 1]}) ${currentYear}`
      } else if (formData.feePlan === 'annual') {
        periodLabel = `Annual ${currentYear}`
      }

      const dueDate = new Date(currentYear, startMonthOfPeriod - 1, 10)

      installments.push({
        student_id: studentId,
        session_id: formData.sessionId,
        class_id: classId,
        installment_number: i,
        period_type: formData.feePlan,
        period_label: periodLabel,
        fee_month: formData.feePlan === 'monthly' ? startMonthOfPeriod : null,
        fee_year: currentYear,
        months_covered: monthsCovered,
        base_amount: installmentAmount + (discountAmount * monthsPerInstallment),
        discount_amount: discountAmount * monthsPerInstallment,
        late_fee: 0,
        total_amount: installmentAmount,
        paid_amount: 0,
        balance_amount: installmentAmount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending'
      })
    }

    return installments
  }

  const handleGenerateChallans = async () => {
    if (!formData.sessionId) {
      showToast('Please select a session', 'warning')
      return
    }

    if (!formData.classId) {
      showToast('Please select a class', 'warning')
      return
    }

    if (!formData.monthlyFee || parseFloat(formData.monthlyFee) <= 0) {
      showToast('Please enter a valid monthly fee', 'warning')
      return
    }

    try {
      setGenerating(true)
      const user = getUserFromCookie()
      if (!user) {
        showToast('User not found', 'error')
        return
      }

      // Fetch students in selected class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, current_class_id')
        .eq('school_id', user.school_id)
        .eq('current_class_id', formData.classId)
        .eq('status', 'active')

      if (studentsError) throw studentsError

      if (!students || students.length === 0) {
        showToast('No active students found in this class', 'warning')
        setGenerating(false)
        return
      }

      const details = calculateInstallmentDetails()

      // Check if students already enrolled for this session
      const { data: existingEnrollments } = await supabase
        .from('fee_enrollments')
        .select('student_id')
        .eq('session_id', formData.sessionId)
        .in('student_id', students.map(s => s.id))

      const alreadyEnrolledIds = new Set(existingEnrollments?.map(e => e.student_id) || [])
      const studentsToEnroll = students.filter(s => !alreadyEnrolledIds.has(s.id))

      if (studentsToEnroll.length === 0) {
        showToast('All students in this class are already enrolled for this session', 'warning')
        setGenerating(false)
        return
      }

      // Create enrollments
      const enrollments = studentsToEnroll.map(student => ({
        school_id: user.school_id,
        student_id: student.id,
        session_id: formData.sessionId,
        class_id: student.current_class_id,
        fee_plan: formData.feePlan,
        monthly_fee: details.monthlyFee,
        discount_type: formData.discountType,
        discount_value: parseFloat(formData.discountValue) || 0,
        discount_amount: details.discountAmount,
        final_monthly_fee: details.finalMonthlyFee,
        start_month: parseInt(formData.startMonth),
        start_year: parseInt(formData.startYear),
        total_installments: details.installmentsCount,
        total_annual_fee: details.totalAnnualFee,
        status: 'active',
        enrolled_by: user.id
      }))

      const { error: enrollError } = await supabase
        .from('fee_enrollments')
        .insert(enrollments)

      if (enrollError) throw enrollError

      // Generate installments for all students
      const allInstallments = []
      studentsToEnroll.forEach(student => {
        const studentInstallments = generateInstallments(student.id, student.current_class_id, details)
        studentInstallments.forEach(inst => {
          inst.school_id = user.school_id
          inst.created_by = user.id
        })
        allInstallments.push(...studentInstallments)
      })

      // Insert all installments
      const { error: installmentError } = await supabase
        .from('fee_installments')
        .insert(allInstallments)

      if (installmentError) throw installmentError

      showToast(
        `Successfully generated ${details.installmentsCount} installments for ${studentsToEnroll.length} student(s)!`,
        'success'
      )

      // Reset form
      setFormData({
        ...formData,
        classId: '',
        monthlyFee: '',
        discountType: 'none',
        discountValue: ''
      })

      setGenerating(false)
    } catch (error) {
      console.error('Error generating challans:', error)
      showToast(`Failed: ${error.message}`, 'error')
      setGenerating(false)
    }
  }

  const details = calculateInstallmentDetails()

  return (
    <div className="p-2 lg:p-4 bg-gray-50 min-h-screen">
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Create Fee Challans</h1>
        <p className="text-gray-600 text-sm">Generate fee installments for entire class</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Configuration Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} />
              Class Fee Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Session */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Session <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.sessionId}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Session</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.session_name} {session.is_active && '(Active)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>

              {/* Fee Plan */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Payment Plan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.feePlan}
                  onChange={(e) => setFormData({ ...formData, feePlan: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="monthly">Monthly (12 installments)</option>
                  <option value="quarterly">Quarterly (4 installments)</option>
                  <option value="semi-annual">Semi-Annual (2 installments)</option>
                  <option value="annual">Annual (1 installment)</option>
                </select>
              </div>

              {/* Monthly Fee */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Monthly Fee (Rs.) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    placeholder="Enter monthly fee"
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Discount Type
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value, discountValue: '' })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="none">No Discount</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rs.)</option>
                </select>
              </div>

              {/* Discount Value */}
              {formData.discountType !== 'none' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                    Discount Value {formData.discountType === 'percentage' ? '(%)' : '(Rs.)'}
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="number"
                      placeholder={formData.discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Start Month */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Start Month
                </label>
                <select
                  value={formData.startMonth}
                  onChange={(e) => setFormData({ ...formData, startMonth: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>

              {/* Start Year */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">
                  Start Year
                </label>
                <input
                  type="number"
                  value={formData.startYear}
                  onChange={(e) => setFormData({ ...formData, startYear: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary & Generate Button */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              Fee Summary
            </h2>

            {formData.monthlyFee ? (
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Fee:</span>
                      <span className="font-bold">Rs. {details.monthlyFee.toLocaleString()}</span>
                    </div>
                    {details.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-bold text-green-600">- Rs. {details.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="text-gray-600">Final Monthly:</span>
                      <span className="font-bold text-blue-900">Rs. {details.finalMonthlyFee.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Installments:</span>
                      <span className="font-bold">{details.installmentsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Per Installment:</span>
                      <span className="font-bold">Rs. {details.installmentAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 mt-2 border-t border-gray-300">
                      <span className="text-gray-600">Annual Total:</span>
                      <span className="font-bold text-lg">Rs. {details.totalAnnualFee.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateChallans}
                  disabled={generating || !formData.classId || !formData.sessionId}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${
                    generating || !formData.classId || !formData.sessionId
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Generate Challans for Class
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  This will create {details.installmentsCount} installments for all active students in the selected class
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
                <p>Enter monthly fee to see summary</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
