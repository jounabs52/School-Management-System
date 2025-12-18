'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, GraduationCap, Bus, Laptop, FileText, DollarSign, AlertCircle, Plus } from 'lucide-react'

// =====================================================
// MODAL OVERLAY COMPONENT
// =====================================================
export const ModalOverlay = ({ children, onClose }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Lock body scroll
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      setMounted(false)
      // Restore body scroll
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

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

// =====================================================
// FEE TYPE ICON SELECTOR
// =====================================================
export const FeeTypeIcon = ({ feeCode, size = 20 }) => {
  const icons = {
    TUITION: { Icon: GraduationCap, color: 'text-blue-600' },
    TRANSPORT: { Icon: Bus, color: 'text-green-600' },
    LAB: { Icon: Laptop, color: 'text-purple-600' },
    COMPUTER: { Icon: Laptop, color: 'text-purple-600' },
    EXAM: { Icon: FileText, color: 'text-orange-600' },
    LIBRARY: { Icon: FileText, color: 'text-teal-600' },
    DEFAULT: { Icon: DollarSign, color: 'text-gray-600' }
  }

  const { Icon, color } = icons[feeCode?.toUpperCase()] || icons.DEFAULT

  return <Icon size={size} className={color} />
}

// =====================================================
// PLAN AMOUNT CALCULATOR
// =====================================================
export const PlanAmountCalculator = ({ monthlyAmount, selectedPlan, discount = 0, discountType = 'fixed' }) => {
  const planMultipliers = {
    monthly: { months: 1, label: 'Monthly' },
    quarterly: { months: 3, label: 'Quarterly' },
    'semi-annual': { months: 6, label: 'Semi-Annual' },
    annual: { months: 12, label: 'Annual' }
  }

  const calculateAmount = (months) => {
    const base = parseFloat(monthlyAmount) || 0
    const total = base * months

    let discountAmount = 0
    if (discount) {
      if (discountType === 'percentage') {
        discountAmount = (total * parseFloat(discount)) / 100
      } else {
        discountAmount = parseFloat(discount)
      }
    }

    return {
      base: total,
      discount: discountAmount,
      final: total - discountAmount
    }
  }

  const renderPlanRow = (planKey) => {
    const plan = planMultipliers[planKey]
    const amounts = calculateAmount(plan.months)
    const isSelected = selectedPlan === planKey

    return (
      <div
        key={planKey}
        className={`flex justify-between items-center py-2 px-3 rounded ${
          isSelected ? 'bg-blue-100 border-l-4 border-blue-600' : 'bg-white'
        }`}
      >
        <div className="flex flex-col">
          <span className="font-medium text-sm text-gray-800">{plan.label}:</span>
          {plan.months > 1 && (
            <span className="text-xs text-gray-500">(Rs. {amounts.base.toLocaleString()} = {monthlyAmount} × {plan.months})</span>
          )}
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">
            Rs. {amounts.final.toLocaleString()}/{plan.label.toLowerCase()}
          </div>
          {amounts.discount > 0 && (
            <div className="text-xs text-green-600 font-medium">
              Save Rs. {amounts.discount.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
        Calculated Plan Amounts
      </div>
      {Object.keys(planMultipliers).map(renderPlanRow)}
    </div>
  )
}

// =====================================================
// FEE PLAN CONFIGURATION MODAL
// =====================================================
export const FeePlanConfigModal = ({
  isOpen,
  onClose,
  onSave,
  feeTypes = [],
  initialData = null
}) => {
  const [formData, setFormData] = useState({
    feeTypeId: '',
    planType: 'monthly',
    monthlyAmount: '',
    discount: '',
    discountType: 'fixed'
  })

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    } else {
      setFormData({
        feeTypeId: '',
        planType: 'monthly',
        monthlyAmount: '',
        discount: '',
        discountType: 'fixed'
      })
    }
  }, [initialData, isOpen])

  const handleSave = () => {
    // Validation
    if (!formData.feeTypeId || !formData.monthlyAmount) {
      alert('Please fill all required fields')
      return
    }

    const planMultipliers = { monthly: 1, quarterly: 3, 'semi-annual': 6, annual: 12 }
    const monthsPerPeriod = planMultipliers[formData.planType]
    const baseAmount = parseFloat(formData.monthlyAmount) * monthsPerPeriod

    let discountAmount = 0
    if (formData.discount) {
      if (formData.discountType === 'percentage') {
        discountAmount = (baseAmount * parseFloat(formData.discount)) / 100
      } else {
        discountAmount = parseFloat(formData.discount)
      }
    }

    const periodAmount = baseAmount - discountAmount

    onSave({
      ...formData,
      monthlyAmount: parseFloat(formData.monthlyAmount),
      monthsPerPeriod,
      periodAmount,
      discount: parseFloat(formData.discount) || 0
    })
  }

  if (!isOpen) return null

  const selectedFeeType = feeTypes.find(ft => ft.id === formData.feeTypeId)

  return (
    <ModalOverlay onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              {initialData ? 'Edit Fee Plan' : 'Add Fee Plan'}
            </h3>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Fee Type Selection */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Fee Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.feeTypeId}
                onChange={(e) => setFormData({ ...formData, feeTypeId: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Fee Type</option>
                {feeTypes.map(ft => (
                  <option key={ft.id} value={ft.id}>
                    {ft.fee_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Type Selection */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Plan Type <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {['monthly', 'quarterly', 'semi-annual', 'annual'].map(plan => (
                  <label key={plan} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="planType"
                      value={plan}
                      checked={formData.planType === plan}
                      onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {plan === 'semi-annual' ? 'Semi-Annual (6 months)' :
                       plan === 'quarterly' ? 'Quarterly (3 months)' :
                       plan === 'annual' ? 'Annual (12 months)' : 'Monthly (1 month)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Monthly Amount */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Monthly Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  Rs.
                </span>
                <input
                  type="number"
                  value={formData.monthlyAmount}
                  onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })}
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Plan Amount Calculator */}
            {formData.monthlyAmount && (
              <PlanAmountCalculator
                monthlyAmount={formData.monthlyAmount}
                selectedPlan={formData.planType}
                discount={formData.discount}
                discountType={formData.discountType}
              />
            )}

            {/* Discount Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-green-600" />
                <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                  Early Payment Discount (Optional)
                </span>
              </div>

              {/* Discount Type */}
              <div className="mb-3">
                <label className="block text-gray-700 font-medium mb-2 text-xs">
                  Discount Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      value="fixed"
                      checked={formData.discountType === 'fixed'}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Fixed (Rs.)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      value="percentage"
                      checked={formData.discountType === 'percentage'}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-4 h-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Percentage (%)</span>
                  </label>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-gray-700 font-medium mb-2 text-xs">
                  {formData.discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    {formData.discountType === 'percentage' ? '%' : 'Rs.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Save Plan
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}

// =====================================================
// FEE BREAKDOWN TABLE
// =====================================================
export const FeeBreakdownTable = ({ items = [] }) => {
  const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-blue-900 text-white">
            <th className="px-3 py-2 text-left font-semibold">Fee Type</th>
            <th className="px-3 py-2 text-left font-semibold">Period</th>
            <th className="px-3 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="3" className="px-3 py-4 text-center text-gray-500">
                No fee items
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="px-3 py-2 flex items-center gap-2">
                  <FeeTypeIcon feeCode={item.feeCode} size={16} />
                  <span className="font-medium text-gray-800">{item.feeName}</span>
                </td>
                <td className="px-3 py-2 text-gray-600">{item.period}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">
                  Rs. {parseFloat(item.amount || 0).toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr className="bg-blue-100 border-t-2 border-blue-200">
              <td colSpan="2" className="px-3 py-2 font-bold text-blue-900">
                Total
              </td>
              <td className="px-3 py-2 text-right font-bold text-blue-900">
                Rs. {total.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// =====================================================
// PERIOD STATUS BADGE
// =====================================================
export const PeriodStatusBadge = ({ status }) => {
  const statusConfig = {
    paid: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Paid',
      emoji: '✅'
    },
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Due',
      emoji: '⚠️'
    },
    overdue: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Overdue',
      emoji: '❌'
    },
    upcoming: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      label: 'Upcoming',
      emoji: '⏳'
    },
    partial: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      label: 'Partial',
      emoji: '⚡'
    }
  }

  const config = statusConfig[status] || statusConfig.upcoming

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}

// =====================================================
// PERIOD TIMELINE COMPONENT
// =====================================================
export const PeriodTimeline = ({
  periods = [],
  feeTypeName,
  planType,
  onSelectPeriod
}) => {
  const isMonthly = planType === 'monthly'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{feeTypeName}</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
            {planType}
          </span>
        </div>
      </div>

      <div className={`grid gap-2 ${isMonthly ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-12' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => onSelectPeriod && onSelectPeriod(period)}
            className={`
              relative p-3 rounded-lg border-2 transition-all
              ${period.selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}
              ${period.status === 'paid' ? 'opacity-60' : ''}
            `}
            disabled={period.status === 'paid'}
          >
            <div className="text-xs font-semibold text-gray-900 mb-1 truncate">
              {period.periodName}
            </div>
            <div className="text-sm font-bold text-gray-800 mb-2">
              Rs. {parseFloat(period.amount || 0).toLocaleString()}
            </div>
            <PeriodStatusBadge status={period.status} />
          </button>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// CLASS FEE SETUP MODAL (Right-side drawer)
// =====================================================
export const ClassFeeSetupModal = ({
  isOpen,
  onClose,
  selectedClass,
  feeStructures = [], // Grouped by fee type
  feeTypes = [],
  onAddPlan,
  onEditPlan,
  onDeletePlan
}) => {
  if (!isOpen) return null

  // Group fee structures by fee type
  const groupedStructures = feeStructures.reduce((acc, structure) => {
    const feeTypeId = structure.fee_type_id
    if (!acc[feeTypeId]) {
      acc[feeTypeId] = {
        feeType: structure.fee_types || {},
        plans: []
      }
    }
    acc[feeTypeId].plans.push(structure)
    return acc
  }, {})

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[99999] flex flex-col border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Class Fee Setup</h3>
            <p className="text-xs text-blue-200 mt-1">
              {selectedClass?.class_name || 'Configure fee types and plans'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-4">
          {/* Fee Type Sections */}
          {feeTypes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <AlertCircle size={48} className="text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No fee types available. Please add fee types first.</p>
            </div>
          ) : (
            feeTypes.map((feeType) => {
              const structureGroup = groupedStructures[feeType.id]
              const plans = structureGroup?.plans || []

              return (
                <div key={feeType.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Fee Type Header */}
                  <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b">
                    <div className="flex items-center gap-2">
                      <FeeTypeIcon feeCode={feeType.fee_code} size={20} />
                      <span className="font-bold text-gray-900">{feeType.fee_name}</span>
                      {plans.length > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onAddPlan(feeType)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Plan
                    </button>
                  </div>

                  {/* Plans Table */}
                  {plans.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No plans configured. Click "Add Plan" to create one.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Plan</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Duration</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-700">Status</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plans.map((plan, index) => {
                            const planLabels = {
                              monthly: { label: 'Monthly', duration: '1 month' },
                              quarterly: { label: 'Quarterly', duration: '3 months' },
                              'semi-annual': { label: 'Semi-Annual', duration: '6 months' },
                              annual: { label: 'Annual', duration: '12 months' }
                            }
                            const planInfo = planLabels[plan.frequency] || { label: plan.frequency, duration: '-' }

                            return (
                              <tr key={plan.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 font-medium text-gray-900">{planInfo.label}</td>
                                <td className="px-4 py-3 text-gray-600">{planInfo.duration}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="font-bold text-gray-900">
                                    Rs. {parseFloat(plan.period_amount || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Rs. {parseFloat(plan.monthly_amount || 0).toLocaleString()}/month
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    plan.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {plan.status === 'active' ? '✓ Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => onEditPlan(plan)}
                                      className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => onDeletePlan(plan)}
                                      className="text-red-600 hover:text-red-700 font-medium text-xs"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Add New Fee Type Button */}
          <button
            onClick={() => alert('Add new fee type functionality')}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            ADD NEW FEE TYPE
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// =====================================================
// PERIOD GENERATION MODAL
// =====================================================
export const PeriodGenerationModal = ({
  isOpen,
  onClose,
  onGenerate,
  sessions = []
}) => {
  const [formData, setFormData] = useState({
    sessionId: '',
    startDate: '',
    frequencies: {
      monthly: true,
      quarterly: true,
      'semi-annual': true,
      annual: true
    }
  })
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)

  const generatePreview = () => {
    if (!formData.startDate) return

    const startDate = new Date(formData.startDate)
    const previewData = []

    // Generate quarterly preview as example
    if (formData.frequencies.quarterly) {
      const quarters = []
      for (let i = 0; i < 4; i++) {
        const qStart = new Date(startDate)
        qStart.setMonth(startDate.getMonth() + (i * 3))

        const qEnd = new Date(qStart)
        qEnd.setMonth(qStart.getMonth() + 3)
        qEnd.setDate(qEnd.getDate() - 1)

        const dueDate = new Date(qStart)
        dueDate.setDate(10)

        quarters.push({
          name: `Q${i + 1} (${qStart.toLocaleString('default', { month: 'short' })}-${qEnd.toLocaleString('default', { month: 'short' })} ${qStart.getFullYear()})`,
          dueDate: dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        })
      }
      previewData.push({ frequency: 'Quarterly', periods: quarters })
    }

    setPreview(previewData)
  }

  useEffect(() => {
    if (formData.startDate) {
      generatePreview()
    }
  }, [formData.startDate, formData.frequencies])

  const handleGenerate = async () => {
    if (!formData.sessionId || !formData.startDate) {
      alert('Please select session and start date')
      return
    }

    const selectedFrequencies = Object.keys(formData.frequencies).filter(
      key => formData.frequencies[key]
    )

    if (selectedFrequencies.length === 0) {
      alert('Please select at least one frequency')
      return
    }

    setLoading(true)
    await onGenerate({
      sessionId: formData.sessionId,
      startDate: formData.startDate,
      frequencies: selectedFrequencies
    })
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <ModalOverlay onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Generate Fee Periods</h3>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Session Selection */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sessionId}
                onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Academic Year</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.session_name || `${session.start_year}-${session.end_year}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Frequency Selection */}
            <div>
              <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                Generate periods for:
              </label>
              <div className="space-y-2">
                {[
                  { key: 'monthly', label: 'Monthly (12 periods)' },
                  { key: 'quarterly', label: 'Quarterly (4 periods)' },
                  { key: 'semi-annual', label: 'Semi-Annual (2 periods)' },
                  { key: 'annual', label: 'Annual (1 period)' }
                ].map(freq => (
                  <label key={freq.key} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.frequencies[freq.key]}
                      onChange={(e) => setFormData({
                        ...formData,
                        frequencies: {
                          ...formData.frequencies,
                          [freq.key]: e.target.checked
                        }
                      })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">{freq.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">
                  Preview:
                </div>
                {preview.map((item, index) => (
                  <div key={index} className="mb-3">
                    <div className="font-medium text-blue-900 text-sm mb-2">{item.frequency} Periods:</div>
                    <ul className="space-y-1">
                      {item.periods.map((period, pIndex) => (
                        <li key={pIndex} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{period.name} - Due: {period.dueDate}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'GENERATE PERIODS'}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}

// =====================================================
// PAYMENT ALLOCATION MODAL
// =====================================================
export const PaymentAllocationModal = ({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  duePeriods = [] // Array of { id, feeTypeName, period, dueAmount, status }
}) => {
  const [allocations, setAllocations] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen && duePeriods.length > 0) {
      // Auto-allocate to oldest dues first
      const autoAllocations = {}
      let remaining = parseFloat(totalAmount) || 0

      for (const period of duePeriods) {
        if (remaining <= 0) break
        const dueAmount = parseFloat(period.dueAmount) || 0
        const allocateAmount = Math.min(remaining, dueAmount)
        autoAllocations[period.id] = allocateAmount
        remaining -= allocateAmount
      }

      setAllocations(autoAllocations)
    }
  }, [isOpen, totalAmount, duePeriods])

  const handleAllocationChange = (periodId, value) => {
    const newAllocations = { ...allocations }
    newAllocations[periodId] = parseFloat(value) || 0
    setAllocations(newAllocations)

    // Validate
    const period = duePeriods.find(p => p.id === periodId)
    const newErrors = { ...errors }

    if (newAllocations[periodId] > parseFloat(period.dueAmount)) {
      newErrors[periodId] = 'Cannot exceed due amount'
    } else {
      delete newErrors[periodId]
    }

    setErrors(newErrors)
  }

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0)
  const remaining = parseFloat(totalAmount) - totalAllocated
  const isValid = Math.abs(remaining) < 0.01 && Object.keys(errors).length === 0

  const handleConfirm = () => {
    if (!isValid) {
      alert('Please ensure total allocation matches payment amount')
      return
    }

    onConfirm(allocations)
  }

  if (!isOpen) return null

  return (
    <ModalOverlay onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-900 to-green-800 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Payment Allocation</h3>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Total Amount */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800 font-medium mb-1">Total Amount Paying:</div>
              <div className="text-2xl font-bold text-blue-900">
                Rs. {parseFloat(totalAmount).toLocaleString()}
              </div>
            </div>

            {/* Allocation Fields */}
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Allocate to:
              </div>
              <div className="space-y-3">
                {duePeriods.map((period) => {
                  const allocated = allocations[period.id] || 0
                  const dueAmount = parseFloat(period.dueAmount) || 0
                  const isFull = Math.abs(allocated - dueAmount) < 0.01
                  const isPartial = allocated > 0 && allocated < dueAmount

                  return (
                    <div key={period.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{period.feeTypeName}</div>
                          <div className="text-xs text-gray-600">{period.period}</div>
                          <div className="text-sm text-gray-700 mt-1">
                            Due: Rs. {dueAmount.toLocaleString()}
                          </div>
                        </div>
                        {isFull && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            ✅ Full
                          </span>
                        )}
                        {isPartial && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                            ⚡ Partial
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                          Rs.
                        </span>
                        <input
                          type="number"
                          value={allocated || ''}
                          onChange={(e) => handleAllocationChange(period.id, e.target.value)}
                          placeholder="0"
                          className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            errors[period.id] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[period.id] && (
                        <div className="text-xs text-red-600 mt-1">{errors[period.id]}</div>
                      )}
                      {isPartial && (
                        <div className="text-xs text-orange-600 mt-1">
                          Rs. {(dueAmount - allocated).toLocaleString()} remaining
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Remaining:</span>
                <span className={`text-xl font-bold ${
                  Math.abs(remaining) < 0.01 ? 'text-green-600' : 'text-red-600'
                }`}>
                  Rs. {remaining.toLocaleString()}
                </span>
              </div>
              <div className="mt-2">
                {isValid ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <span>✅</span>
                    <span className="font-medium">Fully allocated</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600 text-sm">
                    <span>⚠️</span>
                    <span className="font-medium">Adjust allocations to match total</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              disabled={!isValid}
            >
              CONFIRM PAYMENT
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}
