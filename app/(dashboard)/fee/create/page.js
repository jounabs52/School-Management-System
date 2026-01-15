'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, X, Eye, Edit2, Trash2, RefreshCw, Printer, CheckCircle, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  formatCurrency,
  getLogoSize,
  applyPdfSettings
} from '@/lib/pdfSettings'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-[100000] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={20} />}
      {type === 'error' && <X size={20} />}
      {type === 'warning' && <X size={20} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  )
}

export default function FeeCreatePage() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [classSections, setClassSections] = useState([])
  const [classStudents, setClassStudents] = useState([])
  const [feeHeads, setFeeHeads] = useState([])
  const [classFeeStructures, setClassFeeStructures] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [showChallanModal, setShowChallanModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdChallans, setCreatedChallans] = useState([])
  const [viewChallan, setViewChallan] = useState(null)
  const [editingChallan, setEditingChallan] = useState(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [schoolName, setSchoolName] = useState('SMART SCHOOL PRO')
  const rowsPerPage = 10

  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const [instantChallanForm, setInstantChallanForm] = useState({
    target: 'Single Student',
    category: 'Monthly Fee',
    classId: '',
    sectionId: '',
    studentId: '',
    loadedStudent: null,
    selectedFeeStructureId: '',
    selectedOtherFees: [],
    customAmount: '',
    classFee: 0,
    classDiscount: 0,
    dueDate: ''
  })

  const [bulkEntriesForm, setBulkEntriesForm] = useState({
    class: '',
    section: '',
    feeMonth: 'December',
    feeYear: '2025',
    feeHead: '',
    narration: '',
    amount: ''
  })

  const [monthlyChallanForm, setMonthlyChallanForm] = useState({
    class: '',
    section: '',
    feeMonth: 'December',
    feeYear: '2025',
    dueDate: '03-Dec-2025',
    applyConcession: false
  })

  useEffect(() => {
    if (showChallanModal || viewChallan || deleteConfirmModal) {
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
  }, [showChallanModal, viewChallan, deleteConfirmModal])

  useEffect(() => {
    fetchInitialData()
    fetchSchoolName()
  }, [])

  const fetchSchoolName = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('schools')
        .select('school_name')
        .eq('user_id', user.id)
        .eq('id', user.school_id)
        .single()

      if (!error && data) {
        setSchoolName(data.school_name)
      }
    } catch (error) {
      console.error('Error fetching school name:', error)
    }
  }

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      // Fetch challans immediately in parallel with other data - ✅ ALL FILTERED BY USER_ID
      const [classesResult, sectionsResult, feeTypesResult, studentsResult, challansResult] = await Promise.all([
        supabase
          .from('classes')
          .select('id, class_name')
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .order('order_number', { ascending: true }),

        supabase
          .from('sections')
          .select('id, section_name, class_id')
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .order('section_name', { ascending: true }),

        supabase
          .from('fee_types')
          .select('id, fee_name, fee_code')
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
          .eq('status', 'active'),

        supabase
          .from('students')
          .select(`
            id,
            admission_number,
            first_name,
            last_name,
            father_name,
            current_class_id,
            current_section_id
          `)
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .order('admission_number', { ascending: true }),

        // Fetch challans with optimized query
        supabase
          .from('fee_challans')
          .select(`
            *,
            students!student_id (
              id,
              admission_number,
              first_name,
              last_name,
              father_name,
              current_class_id,
              current_section_id,
              fee_plan,
              base_fee,
              discount_amount,
              discount_value,
              discount_type,
              final_fee
            )
          `)
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
          .order('created_at', { ascending: false })
      ])

      if (classesResult.error) throw classesResult.error
      const classesData = classesResult.data || []
      setClasses(classesData)

      if (sectionsResult.error) throw sectionsResult.error
      const sectionsData = sectionsResult.data || []
      setSections(sectionsData)

      if (feeTypesResult.error) throw feeTypesResult.error
      setFeeHeads(feeTypesResult.data || [])

      if (studentsResult.error) throw studentsResult.error
      setStudents(studentsResult.data || [])

      // Process challans with efficient mapping
      if (!challansResult.error && challansResult.data) {
        const classMap = {}
        classesData.forEach(c => { classMap[c.id] = c })

        const sectionMap = {}
        sectionsData.forEach(s => { sectionMap[s.id] = s })

        const enrichedData = challansResult.data.map((challan) => ({
          ...challan,
          students: {
            ...challan.students,
            classes: classMap[challan.students?.current_class_id] || { class_name: 'N/A' },
            sections: sectionMap[challan.students?.current_section_id] || { section_name: 'N/A' }
          }
        }))

        setCreatedChallans(enrichedData)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSelectStudent = (student) => {
    if (selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents(selectedStudents.filter(s => s.id !== student.id))
    } else {
      setSelectedStudents([...selectedStudents, student])
    }
  }

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents([...filteredStudents])
    }
  }

  const downloadCSV = () => {
    try {
      // Prepare CSV headers
      const headers = [
        'Sr.', 'Student Name', 'Admission No.', 'Class', 'Fee Plan',
        'Challan Number', 'Issue Date', 'Due Date', 'Total Amount',
        'Paid Amount', 'Remaining', 'Status'
      ]

      // Prepare CSV rows from filtered challans
      const rows = filteredChallans.map((challan, index) => {
        const studentName = `${challan.students?.first_name || ''} ${challan.students?.last_name || ''}`.trim() || 'N/A'
        const admissionNo = challan.students?.admission_number || 'N/A'
        const className = challan.students?.classes?.class_name || 'N/A'
        const sectionName = challan.students?.sections?.section_name || ''
        const classWithSection = sectionName ? `${className} - ${sectionName}` : className
        const feePlan = (challan.fee_plan || challan.students?.fee_plan || 'monthly')
        const challanNumber = challan.challan_number || 'N/A'

        // Format dates as text with tab prefix
        let issueDate = 'N/A'
        let dueDate = 'N/A'

        if (challan.issue_date) {
          const iDate = new Date(challan.issue_date)
          const day = String(iDate.getDate()).padStart(2, '0')
          const month = String(iDate.getMonth() + 1).padStart(2, '0')
          const year = iDate.getFullYear()
          issueDate = `\t${day}/${month}/${year}`
        }

        if (challan.due_date) {
          const dDate = new Date(challan.due_date)
          const day = String(dDate.getDate()).padStart(2, '0')
          const month = String(dDate.getMonth() + 1).padStart(2, '0')
          const year = dDate.getFullYear()
          dueDate = `\t${day}/${month}/${year}`
        }

        // Calculate amounts properly based on status
        const totalAmount = parseFloat(challan.total_amount || 0)
        let paidAmount = 0
        let remaining = 0

        if (challan.status === 'paid') {
          paidAmount = totalAmount
          remaining = 0
        } else {
          paidAmount = parseFloat(challan.paid_amount || 0)
          remaining = Math.max(0, totalAmount - paidAmount)
        }

        const status = (challan.status || 'N/A').toUpperCase()

        return [
          index + 1, studentName, admissionNo, classWithSection, feePlan,
          challanNumber, issueDate, dueDate,
          totalAmount.toFixed(0), paidAmount.toFixed(0), remaining.toFixed(0), status
        ]
      })

      // Combine headers and rows with proper CSV escaping
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return `"${cellStr}"`
        }).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      // Generate filename with current date and filters
      const date = new Date().toISOString().split('T')[0]
      let filename = `created_challans_${date}`
      if (selectedClass) {
        const selectedClassData = classes.find(c => c.id === selectedClass)
        if (selectedClassData) filename += `_${selectedClassData.class_name.replace(/\s+/g, '_')}`
      }
      if (selectedSection) {
        const selectedSectionData = sections.find(s => s.id === selectedSection)
        if (selectedSectionData) filename += `_${selectedSectionData.section_name.replace(/\s+/g, '_')}`
      }
      filename += '.csv'

      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast('CSV file downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error downloading CSV:', error)
      showToast('Failed to download CSV file', 'error')
    }
  }

  const handleCreateChallan = () => {
    setShowChallanModal(true)
    setSelectedCategory('instant')
    setEditingChallan(null)
  }

  const resetInstantChallanForm = () => {
    setInstantChallanForm({
      target: 'Single Student',
      category: 'Monthly Fee',
      classId: '',
      sectionId: '',
      studentId: '',
      loadedStudent: null,
      selectedFeeStructureId: '',
      selectedOtherFees: [],
      customAmount: '',
      classFee: 0,
      classDiscount: 0,
      dueDate: ''
    })
  }

  /**
   * Calculate fees and create fee items based on form data
   * @param {object} formData - Instant challan form data
   * @param {object} monthlyFeeType - Monthly fee type object with id
   * @param {number} studentDiscount - Student-specific discount amount
   * @param {string} challanId - Optional challan ID for existing challans
   * @returns {object} Object containing totalAmount and feeItems array
   */
  const calculateFeesAndItems = (formData, monthlyFeeType, studentDiscount = 0, challanId = null) => {
    const user = getUserFromCookie()
    let totalAmount = 0
    const feeItems = []

    // Calculate Monthly Fee
    if (formData.category === 'Monthly Fee') {
      if (formData.classFee && formData.classFee > 0) {
        const classFee = parseFloat(formData.classFee) || 0
        const classDiscount = parseFloat(formData.classDiscount) || 0
        const studentDiscountAmount = parseFloat(studentDiscount) || 0
        const monthlyFeeAmount = classFee - classDiscount - studentDiscountAmount

        if (monthlyFeeAmount > 0) {
          totalAmount += monthlyFeeAmount

          if (monthlyFeeType && monthlyFeeType.id) {
            const item = {
              user_id: user?.id,
              school_id: user?.school_id,
              fee_type_id: monthlyFeeType.id,
              description: 'Monthly Fee',
              amount: monthlyFeeAmount
            }
            if (challanId) item.challan_id = challanId
            feeItems.push(item)
          }
        }
      }
    }

    // Add Other Fees
    if (formData.selectedOtherFees && formData.selectedOtherFees.length > 0) {
      for (const fee of formData.selectedOtherFees) {
        if (!fee || !fee.fee_type_id || !fee.amount || fee.amount <= 0) {
          continue
        }
        const feeAmount = parseFloat(fee.amount) || 0
        if (feeAmount > 0) {
          totalAmount += feeAmount
          const item = {
            user_id: user?.id,
            school_id: user?.school_id,
            fee_type_id: fee.fee_type_id,
            description: fee.name || 'Other Fee',
            amount: feeAmount
          }
          if (challanId) item.challan_id = challanId
          feeItems.push(item)
        }
      }
    }

    return { totalAmount, feeItems }
  }

  const handleClassChange = async (classId) => {
    setInstantChallanForm({
      ...instantChallanForm,
      classId,
      sectionId: '',
      studentId: '',
      loadedStudent: null,
      selectedFeeStructureId: '',
      selectedOtherFees: [],
      customAmount: '',
      classFee: 0,
      classDiscount: 0
    })

    if (!classId) {
      setClassSections([])
      setClassStudents([])
      setClassFeeStructures([])
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .maybeSingle()

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (classError) {
        console.error('❌ Error fetching class:', classError)
      }

      const classFee = parseFloat(classData?.standard_fee || 0)
      const classDiscount = parseFloat(classData?.discount || 0)

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_name')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('section_name', { ascending: true })

      if (!sectionsError) {
        setClassSections(sectionsData || [])
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          father_name,
          base_fee,
          discount_amount
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('current_class_id', classId)
        .eq('status', 'active')
        .order('admission_number', { ascending: true })

      if (!studentsError) {
        setClassStudents(studentsData || [])
      }

      if (sessionData) {
        const { data: feeStructuresData, error: feeStructuresError } = await supabase
          .from('fee_structures')
          .select(`
            id,
            amount,
            fee_type_id,
            fee_types(fee_name)
          `)
          .eq('user_id', user.id)
        .eq('school_id', user.school_id)
          .eq('session_id', sessionData.id)
          .eq('class_id', classId)
          .eq('status', 'active')

        if (!feeStructuresError) {
          setClassFeeStructures(feeStructuresData || [])
        }
      }

      setInstantChallanForm(prev => ({
        ...prev,
        classFee: classFee,
        classDiscount: classDiscount
      }))
    } catch (error) {
      console.error('Error loading class data:', error)
    }
  }

  const handleSectionChange = async (sectionId) => {
    setInstantChallanForm({
      ...instantChallanForm,
      sectionId,
      studentId: '',
      loadedStudent: null
    })

    if (!sectionId || !instantChallanForm.classId) {
      return
    }

    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          father_name,
          discount_amount
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('current_class_id', instantChallanForm.classId)
        .eq('current_section_id', sectionId)
        .eq('status', 'active')
        .order('admission_number', { ascending: true })

      if (!studentsError) {
        setClassStudents(studentsData || [])
      }
    } catch (error) {
      console.error('Error loading section students:', error)
    }
  }

  const handleStudentChange = (studentId) => {
    const student = classStudents.find(s => s.id === studentId)
    setInstantChallanForm({
      ...instantChallanForm,
      studentId,
      loadedStudent: student || null
    })
  }

  const fetchCreatedChallans = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data, error } = await supabase
        .from('fee_challans')
        .select(`
          *,
          students!student_id (
            id,
            admission_number,
            first_name,
            last_name,
            father_name,
            current_class_id,
            current_section_id,
            fee_plan,
            base_fee,
            discount_amount,
            discount_value,
            discount_type,
            final_fee
          )
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        // Fetch all payments for these challans
        const challanIds = data.map(c => c.id).filter(Boolean)
        const { data: paymentsData } = await supabase
          .from('fee_payments')
          .select('challan_id, amount_paid')
          .in('challan_id', challanIds)
          .eq('school_id', user.school_id)

        // Calculate total paid amount for each challan
        const paymentMap = {}
        paymentsData?.forEach(payment => {
          if (!paymentMap[payment.challan_id]) {
            paymentMap[payment.challan_id] = 0
          }
          paymentMap[payment.challan_id] += parseFloat(payment.amount_paid || 0)
        })

        // Create lookup maps for efficient matching
        const classMap = {}
        classes.forEach(c => { classMap[c.id] = c })

        const sectionMap = {}
        sections.forEach(s => { sectionMap[s.id] = s })

        // Enrich with class and section data, payment data, and auto-calculate status
        const enrichedData = data.map((challan) => {
          // Use real-time student fee data if available
          const studentFinalFee = challan.students?.final_fee
          const studentBaseFee = challan.students?.base_fee
          const studentDiscountAmount = challan.students?.discount_amount

          // Calculate total amount
          const totalAmount = studentFinalFee !== null && studentFinalFee !== undefined ? studentFinalFee : challan.total_amount

          // Get paid amount from payment map
          const paidAmount = paymentMap[challan.id] || 0

          // Auto-calculate status based on payment and due date
          let autoStatus = challan.status // Default to existing status
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const dueDate = challan.due_date ? new Date(challan.due_date) : null
          if (dueDate) dueDate.setHours(0, 0, 0, 0)

          // Status logic:
          // 1. If fully paid, status = 'paid'
          // 2. If past due date and not fully paid, status = 'overdue'
          // 3. Otherwise, status = 'pending'
          if (paidAmount >= totalAmount) {
            autoStatus = 'paid'
          } else if (dueDate && dueDate < today) {
            autoStatus = 'overdue'
          } else {
            autoStatus = 'pending'
          }

          // Update status in database if it changed
          if (autoStatus !== challan.status) {
            supabase
              .from('fee_challans')
              .update({ status: autoStatus, updated_at: new Date().toISOString() })
              .eq('id', challan.id)
              .eq('user_id', user.id)
              .eq('school_id', user.school_id)
              .then(({ error: updateError }) => {
                if (updateError) {
                  console.error('Error auto-updating status:', updateError)
                }
              })
          }

          return {
            ...challan,
            // Override with current student fee data for real-time updates
            total_amount: totalAmount,
            base_fee: studentBaseFee !== null && studentBaseFee !== undefined ? studentBaseFee : challan.base_fee,
            discount_amount: studentDiscountAmount !== null && studentDiscountAmount !== undefined ? studentDiscountAmount : challan.discount_amount,
            paid_amount: paidAmount,
            status: autoStatus,
            students: {
              ...challan.students,
              classes: classMap[challan.students?.current_class_id] || { class_name: 'N/A' },
              sections: sectionMap[challan.students?.current_section_id] || { section_name: 'N/A' }
            }
          }
        })

        setCreatedChallans(enrichedData)
      } else if (error) {
        console.error('Error fetching challans:', error)
      }
    } catch (error) {
      console.error('Error fetching challans:', error)
    }
  }

  const numberToWords = (num) => {
    if (num === 0) return 'Zero'

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

    const convertLessThanThousand = (n) => {
      if (n === 0) return ''
      if (n < 10) return ones[n]
      if (n < 20) return teens[n - 10]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '')
    }

    const integerPart = Math.floor(num)

    if (integerPart < 1000) {
      return convertLessThanThousand(integerPart) + ' Only'
    }

    if (integerPart < 100000) {
      const thousands = Math.floor(integerPart / 1000)
      const remainder = integerPart % 1000
      return convertLessThanThousand(thousands) + ' Thousand' +
             (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '') + ' Only'
    }

    if (integerPart < 10000000) {
      const lakhs = Math.floor(integerPart / 100000)
      const remainder = integerPart % 100000
      const thousands = Math.floor(remainder / 1000)
      const hundreds = remainder % 1000

      let result = convertLessThanThousand(lakhs) + ' Lakh'
      if (thousands > 0) result += ' ' + convertLessThanThousand(thousands) + ' Thousand'
      if (hundreds > 0) result += ' ' + convertLessThanThousand(hundreds)
      return result + ' Only'
    }

    const crores = Math.floor(integerPart / 10000000)
    const remainder = integerPart % 10000000
    const lakhs = Math.floor(remainder / 100000)
    const thousands = Math.floor((remainder % 100000) / 1000)
    const hundreds = remainder % 1000

    let result = convertLessThanThousand(crores) + ' Crore'
    if (lakhs > 0) result += ' ' + convertLessThanThousand(lakhs) + ' Lakh'
    if (thousands > 0) result += ' ' + convertLessThanThousand(thousands) + ' Thousand'
    if (hundreds > 0) result += ' ' + convertLessThanThousand(hundreds)
    return result + ' Only'
  }

  const handlePrintChallan = async (challan) => {
    if (!challan) return

    try {
      // Get user for authentication
      const user = getUserFromCookie()
      if (!user) {
        showToast('User not found', 'error')
        return
      }

      // Fetch school data
      const schoolResult = await supabase
        .from('schools')
        .select('name, address, phone, email, logo_url, code')
        .eq('id', user.school_id)
        .single()

      const schoolData = schoolResult.data || {}

      // Fetch challan items
      const { data: items } = await supabase
        .from('fee_challan_items')
        .select(`
          *,
          fee_types!fee_type_id (
            fee_name
          )
        `)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('challan_id', challan.id)

      const itemsToUse = items || []
      const student = challan.students
      const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim()
      const className = student?.classes?.class_name || 'N/A'

      // Fetch class data for fee plan
      const { data: classData } = await supabase
        .from('classes')
        .select('fee_plan')
        .eq('id', student?.current_class_id)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .single()

      const feePlan = classData?.fee_plan || 'Monthly'

      // Get PDF settings
      const pdfSettings = getPdfSettings(user.id)

      // Create PDF with settings from PAGE SETTINGS
      const doc = new jsPDF({
        orientation: pdfSettings.orientation || 'portrait',
        unit: 'mm',
        format: pdfSettings.pageSize?.toLowerCase() || 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Get margin values from settings
      const margins = getMarginValues(pdfSettings.margin)
      const leftMargin = margins.left
      const rightMargin = pageWidth - margins.right

      // Calculate color values from settings for reuse
      const textColorRgb = hexToRgb(pdfSettings.textColor)
      const secondaryColorRgb = hexToRgb(pdfSettings.secondaryColor)
      const primaryColorRgb = hexToRgb(pdfSettings.primaryColor)
      const lineWidthValue = pdfSettings.lineWidth === 'thick' ? 0.3 : pdfSettings.lineWidth === 'normal' ? 0.2 : 0.1

      // Header background with header background color from settings
      const headerHeight = 40
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      doc.setFillColor(...headerBgColor)
      doc.rect(0, 0, pageWidth, headerHeight, 'F')

      // Logo in header
      let yPos = 18
      if (pdfSettings.includeLogo && schoolData.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = schoolData.logo_url

          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const logoSizeObj = getLogoSize(pdfSettings.logoSize)
                const currentLogoSize = logoSizeObj.width // Use width property
                const logoY = (headerHeight - currentLogoSize) / 2
                let logoX = 10

                if (pdfSettings.logoPosition === 'right') {
                  logoX = pageWidth - currentLogoSize - 10
                }

                if (pdfSettings.logoStyle === 'circle' || pdfSettings.logoStyle === 'rounded') {
                  const canvas = document.createElement('canvas')
                  const ctx = canvas.getContext('2d')
                  const size = 200
                  canvas.width = size
                  canvas.height = size

                  ctx.beginPath()
                  if (pdfSettings.logoStyle === 'circle') {
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
                  } else {
                    const radius = size * 0.15
                    ctx.moveTo(radius, 0)
                    ctx.lineTo(size - radius, 0)
                    ctx.quadraticCurveTo(size, 0, size, radius)
                    ctx.lineTo(size, size - radius)
                    ctx.quadraticCurveTo(size, size, size - radius, size)
                    ctx.lineTo(radius, size)
                    ctx.quadraticCurveTo(0, size, 0, size - radius)
                    ctx.lineTo(0, radius)
                    ctx.quadraticCurveTo(0, 0, radius, 0)
                  }
                  ctx.closePath()
                  ctx.clip()

                  ctx.drawImage(img, 0, 0, size, size)

                  const clippedImage = canvas.toDataURL('image/png')
                  doc.addImage(clippedImage, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)

                  // Add border based on logo style from PDF settings
                  const borderRgb = pdfSettings.logoBorderColor ? hexToRgb(pdfSettings.logoBorderColor) : [255, 255, 255]
                  if (pdfSettings.logoStyle === 'circle') {
                    doc.setDrawColor(...borderRgb)
                    doc.setLineWidth(0.5)
                    doc.circle(logoX + currentLogoSize/2, logoY + currentLogoSize/2, currentLogoSize/2, 'S')
                  } else if (pdfSettings.logoStyle === 'rounded') {
                    doc.setDrawColor(...borderRgb)
                    doc.setLineWidth(0.5)
                    doc.roundedRect(logoX, logoY, currentLogoSize, currentLogoSize, 3, 3, 'S')
                  }
                } else {
                  doc.addImage(img, 'PNG', logoX, logoY, currentLogoSize, currentLogoSize)
                }

                resolve()
              } catch (e) {
                console.warn('Could not add logo to PDF:', e)
                resolve()
              }
            }
            img.onerror = () => {
              console.warn('Could not load logo image')
              resolve()
            }
          })
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // School name and subtitle in white
      if (pdfSettings.includeHeader !== false) {
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(parseInt(pdfSettings.fontSize) + 8)
        doc.setFont('helvetica', 'bold')
        doc.text(schoolData.name || schoolName, pageWidth / 2, yPos + 5, { align: 'center' })

        doc.setFontSize(parseInt(pdfSettings.fontSize) + 1)
        doc.setFont('helvetica', 'normal')
        const headerText = pdfSettings.headerText || 'Student FEE CHALLAN'
        doc.text(headerText, pageWidth / 2, yPos + 12, { align: 'center' })
      }

      // Generated date
      doc.setFontSize(parseInt(pdfSettings.fontSize) - 1)
      doc.setTextColor(220, 220, 220)
      const now = new Date()
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const genDate = `Generated: ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`

      const dateAlign = pdfSettings.logoPosition === 'right' ? 'left' : 'right'
      const dateX = pdfSettings.logoPosition === 'right' ? leftMargin : rightMargin
      doc.text(genDate, dateX, yPos + 18, { align: dateAlign })

      // Reset to text color from settings
      doc.setTextColor(...textColorRgb)
      yPos = headerHeight + 10

      // STUDENT INFORMATION Section
      doc.setFontSize(parseInt(pdfSettings.fontSize) + 2)
      doc.setFont('helvetica', 'bold')
      doc.text('STUDENT INFORMATION', leftMargin, yPos)
      yPos += 7

      const labelWidth = 35
      let xPos = leftMargin

      // Row 1: Student Name and Student Roll#
      doc.setFontSize(parseInt(pdfSettings.fontSize))
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Student Name:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(studentName || 'N/A', xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Student Roll#:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(student?.admission_number || 'N/A', xPos + labelWidth, yPos)

      yPos += 6
      xPos = leftMargin

      // Row 2: Class and Father Name
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Class:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(className, xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Father Name:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(student?.father_name || 'N/A', xPos + labelWidth, yPos)

      yPos += 6
      xPos = leftMargin

      // Row 3: Due Date and Fee Type
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Due Date:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      const formattedDueDate = new Date(challan.due_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-')
      const dueDayName = days[new Date(challan.due_date).getDay()]
      doc.text(formattedDueDate + ' ' + dueDayName, xPos + labelWidth, yPos)

      xPos = pageWidth / 2 + 5
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Fee Type:', xPos, yPos)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text(`School Fee (${feePlan})`, xPos + labelWidth, yPos)

      yPos += 12

      // FEE BREAKDOWN Section
      doc.setFontSize(parseInt(pdfSettings.fontSize) + 2)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text('FEE BREAKDOWN', leftMargin, yPos)
      yPos += 2

      // Build detailed fee breakdown table
      const tableData = []

      // Calculate base fee from items (sum of all positive amounts)
      const baseFee = student?.base_fee || challan?.base_fee || 0
      const discountAmount = student?.discount_amount || challan?.discount_amount || 0

      // Add base fee row
      if (baseFee > 0) {
        tableData.push(['Base Fee', formatCurrency(baseFee)])
      }

      // Add other fee items
      if (itemsToUse && itemsToUse.length > 0) {
        itemsToUse.forEach(item => {
          const itemName = item.fee_types?.fee_name || item.description
          // Skip if it's labeled as "Monthly Fee" or "Base Fee" since we already added it
          if (itemName !== 'Monthly Fee' && itemName !== 'Base Fee') {
            tableData.push([itemName, formatCurrency(item.amount)])
          }
        })
      }

      // Add discount row if exists
      if (discountAmount > 0) {
        tableData.push(['Discount', `- ${formatCurrency(discountAmount)}`])
      }

      const cellPaddingValue = pdfSettings.cellPadding === 'comfortable' ? 5 : pdfSettings.cellPadding === 'normal' ? 4 : 3
      const alternateRowColorRgb = hexToRgb(pdfSettings.alternateRowColor || '#F8FAFC')

      if (tableData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Particulars', 'Amount']],
          body: tableData,
          theme: pdfSettings.tableStyle || 'grid',
          headStyles: {
            fillColor: hexToRgb(pdfSettings.tableHeaderColor),
            textColor: [255, 255, 255],
            fontSize: parseInt(pdfSettings.fontSize) + 1,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: { top: cellPaddingValue - 1, bottom: cellPaddingValue - 1, left: 5, right: 5 }
          },
          bodyStyles: {
            fontSize: parseInt(pdfSettings.fontSize) + 1,
            cellPadding: { top: cellPaddingValue, bottom: cellPaddingValue, left: 5, right: 5 },
            textColor: textColorRgb
          },
          alternateRowStyles: {
            fillColor: alternateRowColorRgb
          },
          columnStyles: {
            0: { cellWidth: 130, halign: 'left', fontStyle: 'normal' },
            1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: leftMargin, right: leftMargin },
          didParseCell: function(data) {
            data.cell.styles.lineColor = secondaryColorRgb
            data.cell.styles.lineWidth = lineWidthValue
          },
          didDrawCell: function(data) {
            if (data.column.index === 1 && data.section === 'body') {
              const amountText = data.cell.raw || ''
              if (amountText.includes('-') || amountText.toLowerCase().includes('discount')) {
                doc.setTextColor(220, 38, 38) // Red color for discount
              }
            }
          }
        })

        yPos = doc.lastAutoTable.finalY + 3
      }

      // TOTAL FEE PAYABLE
      const bgColorRgb = hexToRgb(pdfSettings.backgroundColor || '#F0FDF4')
      doc.setFillColor(...bgColorRgb)
      doc.rect(leftMargin, yPos, pageWidth - leftMargin - margins.right, 10, 'F')
      doc.setDrawColor(...secondaryColorRgb)
      doc.setLineWidth(lineWidthValue)
      doc.rect(leftMargin, yPos, pageWidth - leftMargin - margins.right, 10)

      doc.setFontSize(parseInt(pdfSettings.fontSize) + 2)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...textColorRgb)
      doc.text('TOTAL FEE PAYABLE', leftMargin + 5, yPos + 6.5)

      doc.setTextColor(...primaryColorRgb)
      doc.text(formatCurrency(challan.total_amount), rightMargin - 5, yPos + 6.5, { align: 'right' })

      yPos += 15

      // Amount in words
      doc.setFontSize(parseInt(pdfSettings.fontSize))
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Amount in Words:', margins.left, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textColorRgb)
      const amountInWords = numberToWords(challan.total_amount)
      doc.text(amountInWords, margins.left, yPos + 5)

      yPos += 12

      // Payment Status
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...secondaryColorRgb)
      doc.text('Payment Status:', margins.left, yPos)

      const statusColor = challan.status === 'paid' ? primaryColorRgb : challan.status === 'overdue' ? [220, 38, 38] : secondaryColorRgb
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...statusColor)
      doc.text(challan.status.charAt(0).toUpperCase() + challan.status.slice(1), margins.left + 32, yPos)

      // Footer
      if (pdfSettings.includeFooter !== false) {
        yPos = pageHeight - margins.bottom + 5

        doc.setDrawColor(...secondaryColorRgb)
        doc.setLineWidth(lineWidthValue)
        doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3)

        doc.setFontSize(parseInt(pdfSettings.fontSize) - 1)
        doc.setTextColor(...secondaryColorRgb)
        doc.setFont('helvetica', 'normal')

        const footerText = pdfSettings.footerText || schoolData.name || schoolName
        let footerContent = footerText

        if (pdfSettings.includePageNumbers) {
          footerContent = `${footerText} - Page 1`
        }

        doc.text(footerContent, pageWidth / 2, yPos, { align: 'center' })
      }

      // Download PDF
      const fileName = `Fee_Challan_${student?.admission_number || 'unknown'}_${new Date().getTime()}.pdf`
      doc.save(fileName)
      showToast('PDF downloaded successfully!', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast(`Failed to generate PDF: ${error.message}`, 'error')
    }
  }

  const handleCreateInstantChallan = async () => {
    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
        showToast('User not found', 'error')
        setSubmitting(false)
        return
      }

      if (editingChallan) {
        // Get Monthly Fee type
        const { data: monthlyFeeType } = await supabase
          .from('fee_types')
          .select('id')
          .eq('user_id', user.id)
        .eq('school_id', user.school_id)
          .eq('fee_code', 'MONTHLY_FEE')
          .maybeSingle()

        // Use helper function to calculate fees and items
        const studentDiscount = instantChallanForm.loadedStudent?.discount_amount || 0
        const { totalAmount, feeItems } = calculateFeesAndItems(
          instantChallanForm,
          monthlyFeeType,
          studentDiscount,
          editingChallan.id
        )

        if (totalAmount === 0) {
          showToast('Total amount cannot be zero', 'error')
          setSubmitting(false)
          return
        }

        // Use the due date from form if available, otherwise calculate
        const dueDate = instantChallanForm.dueDate || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]

        // Update challan with recalculated total
        const { error: updateError } = await supabase
          .from('fee_challans')
          .update({
            student_id: instantChallanForm.studentId,
            due_date: dueDate,
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingChallan.id)
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)

        if (updateError) throw updateError

        // Delete existing fee items and insert new ones
        const { error: deleteItemsError } = await supabase
          .from('fee_challan_items')
          .delete()
          .eq('challan_id', editingChallan.id)
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)

        if (deleteItemsError) throw deleteItemsError

        // Insert updated fee items
        if (feeItems.length > 0) {
          const { error: insertItemsError } = await supabase
            .from('fee_challan_items')
            .insert(feeItems)

          if (insertItemsError) throw insertItemsError
        }

        showToast('Challan updated successfully!', 'success')
        await fetchCreatedChallans()

        setShowChallanModal(false)
        setEditingChallan(null)
        resetInstantChallanForm()
        setSubmitting(false)
        return
      }

      if (instantChallanForm.target === 'Single Student') {
        if (!instantChallanForm.studentId) {
          showToast('Please select a student', 'warning')
          setSubmitting(false)
          return
        }
      } else {
        if (!instantChallanForm.classId) {
          showToast('Please select a class', 'warning')
          setSubmitting(false)
          return
        }
      }

      if (instantChallanForm.category !== 'Monthly Fee' && instantChallanForm.selectedOtherFees.length === 0) {
        showToast('Please select Monthly Fee or at least one Other Fee', 'warning')
        setSubmitting(false)
        return
      }

      if (!instantChallanForm.dueDate) {
        showToast('Please select a due date', 'warning')
        setSubmitting(false)
        return
      }

      console.log('🔍 Fetching session for school_id:', user.school_id)
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .maybeSingle()

      console.log('📊 Session query result:', { sessionData, sessionError })

      if (!sessionData) {
        console.error('❌ No active session found')
        showToast('No active session found. Please logout and login again to create a session.', 'error')
        setSubmitting(false)
        return
      }

      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        showToast('Error fetching session. Please try again.', 'error')
        setSubmitting(false)
        return
      }

      let createdCount = 0
      let skippedCount = 0
      const dueDate = instantChallanForm.dueDate

      let studentsToProcess = []
      if (instantChallanForm.target === 'Single Student') {
        // Fetch the complete student data for single student
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id, admission_number')
          .eq('id', instantChallanForm.studentId)
          .single()

        if (studentError) {
          console.error('Error fetching student:', studentError)
          throw studentError
        }

        studentsToProcess = [studentData]
      } else {
        let query = supabase
          .from('students')
          .select('id, admission_number')
          .eq('user_id', user.id)
        .eq('school_id', user.school_id)
          .eq('current_class_id', instantChallanForm.classId)
          .eq('status', 'active')

        if (instantChallanForm.sectionId) {
          query = query.eq('current_section_id', instantChallanForm.sectionId)
        }

        const { data: classStudentsData, error: studentsError } = await query
        if (studentsError) throw studentsError
        studentsToProcess = classStudentsData || []
      }

      // OPTIMIZATION: Batch fetch all required data upfront to eliminate N+1 queries
      const studentIds = studentsToProcess.map(s => s.id)

      // Validate we have students to process
      if (!studentIds || studentIds.length === 0) {
        showToast('No students found to process', 'warning')
        setSubmitting(false)
        return
      }

      const dueDateObj = new Date(dueDate)
      const monthStart = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), 1).toISOString().split('T')[0]
      const monthEnd = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth() + 1, 0).toISOString().split('T')[0]
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Batch fetch all data in parallel
      const [duplicateChallansResult, studentsDataResult, monthlyFeeTypeResult] = await Promise.all([
        // Fetch all duplicate challans for the month
        supabase
          .from('fee_challans')
          .select('id, student_id, due_date, status')
          .eq('user_id', user.id)
        .eq('school_id', user.school_id)
          .in('student_id', studentIds)
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd),

        // Fetch all student data
        supabase
          .from('students')
          .select('id, admission_number, base_fee, discount_amount, final_fee, current_class_id')
          .in('id', studentIds),

        // Fetch Monthly Fee type ONCE (not per student!)
        supabase
          .from('fee_types')
          .select('id')
          .eq('user_id', user.id)
        .eq('school_id', user.school_id)
          .eq('fee_code', 'MONTHLY_FEE')
          .maybeSingle()
      ])

      // Check for errors in batch queries
      if (duplicateChallansResult.error) {
        throw new Error(`Failed to check duplicate challans: ${duplicateChallansResult.error.message}`)
      }
      if (studentsDataResult.error) {
        throw new Error(`Failed to fetch student data: ${studentsDataResult.error.message}`)
      }
      if (monthlyFeeTypeResult.error) {
        throw new Error(`Failed to fetch monthly fee type: ${monthlyFeeTypeResult.error.message}`)
      }

      const duplicateChallans = duplicateChallansResult.data || []
      const studentsData = studentsDataResult.data || []
      const monthlyFeeType = monthlyFeeTypeResult.data

      // Validate student data was fetched
      if (!studentsData || studentsData.length === 0) {
        showToast('No student data found', 'error')
        setSubmitting(false)
        return
      }

      // Create lookup maps for O(1) access
      const duplicateChallansMap = new Map()
      duplicateChallans.forEach(challan => {
        if (!duplicateChallansMap.has(challan.student_id)) {
          duplicateChallansMap.set(challan.student_id, [])
        }
        duplicateChallansMap.get(challan.student_id).push(challan)
      })

      const studentsDataMap = new Map()
      studentsData.forEach(student => {
        studentsDataMap.set(student.id, student)
      })

      // Prepare batch insert arrays
      const challansToInsert = []
      const challanItemsToInsert = []
      const studentChallanMap = new Map() // Track which students get challans

      // Process each student using in-memory data
      for (const student of studentsToProcess) {
        // Check for duplicate challan using pre-fetched data
        const studentDuplicates = duplicateChallansMap.get(student.id) || []
        const hasDuplicateWithFutureDueDate = studentDuplicates.some(challan => {
          const existingDueDate = new Date(challan.due_date)
          return existingDueDate >= today
        })

        if (hasDuplicateWithFutureDueDate) {
          skippedCount++
          continue
        }

        const studentData = studentsDataMap.get(student.id)
        if (!studentData) {
          console.error(`Student data not found for ID: ${student.id}`)
          continue
        }

        const challanNumber = `CH-${Date.now()}-${student.admission_number || Math.random().toString(36).substring(2, 9).toUpperCase()}`

        // Use helper function to calculate fees and items
        const studentDiscount = studentData.discount_amount || 0
        const { totalAmount, feeItems } = calculateFeesAndItems(
          instantChallanForm,
          monthlyFeeType,
          studentDiscount
        )

        if (totalAmount === 0) {
          continue
        }

        // Add to batch insert array
        challansToInsert.push({
          user_id: user.id,
          school_id: user.school_id,
          session_id: sessionData.id,
          student_id: student.id,
          challan_number: challanNumber,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate,
          total_amount: totalAmount,
          status: 'pending',
          created_by: user.id
        })

        // Store fee items temporarily (we'll add challan_id after insert)
        studentChallanMap.set(student.id, { feeItems, challanNumber })
      }

      // Batch insert all challans at once
      if (challansToInsert.length > 0) {
        const { data: insertedChallans, error: challanError } = await supabase
          .from('fee_challans')
          .insert(challansToInsert)
          .select()

        if (challanError) {
          console.error('Error batch creating challans:', challanError)
          showToast('Error creating challans', 'error')
          return
        }

        createdCount = insertedChallans.length

        // Prepare fee items with challan IDs
        for (const challan of insertedChallans) {
          const studentChallanData = studentChallanMap.get(challan.student_id)
          if (studentChallanData && studentChallanData.feeItems.length > 0) {
            const items = studentChallanData.feeItems.map(item => ({
              ...item,
              challan_id: challan.id
            }))
            challanItemsToInsert.push(...items)
          }
        }

        // Batch insert all fee items at once
        if (challanItemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('fee_challan_items')
            .insert(challanItemsToInsert)

          if (itemsError) {
            console.error('Error batch creating fee items:', itemsError)
          }
        }
      }

      if (createdCount > 0 && skippedCount > 0) {
        showToast(`Successfully created ${createdCount} challan(s)! ${skippedCount} student(s) skipped (challan already exists for this month).`, 'success')
      } else if (createdCount > 0) {
        showToast(`Successfully created ${createdCount} challan(s)!`, 'success')
      } else if (skippedCount > 0) {
        showToast(`No challans created. ${skippedCount} student(s) already have a challan for this month. You can create next month's challan after the current due date passes.`, 'warning')
      } else {
        showToast('No challans were created.', 'warning')
      }

      // Refresh the challans list BEFORE closing modal
      await fetchCreatedChallans()

      setShowChallanModal(false)
      resetInstantChallanForm()
    } catch (error) {
      console.error('Error creating instant challan:', error)
      showToast('Failed to create challan: ' + error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditChallan = async (challan) => {
    try {
      setEditingChallan(challan)
      setShowChallanModal(true)
      setSelectedCategory('instant')

      const user = getUserFromCookie()
      if (!user) {
        showToast('User session not found', 'error')
        return
      }

      // Load ALL data first, then set state once
      let sectionsData = []
      let studentsData = []
      let feeStructuresData = []
      let challanItems = []
      let classFeeData = null

      if (challan.students?.current_class_id) {
        // Get active session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id')
          .eq('school_id', user.school_id)
          .eq('status', 'active')
          .maybeSingle()

        if (!sessionData) {
          showToast('No active session found. Please logout and login again to create a session.', 'error')
          return
        }

        if (sessionError) {
          showToast('Error fetching session. Please try again.', 'error')
          return
        }

        // Load all data in parallel for better performance
        const [sectionsResult, studentsResult, feeStructuresResult, challanItemsResult] = await Promise.all([
          // Load sections
          supabase
            .from('sections')
            .select('*')
            .eq('class_id', challan.students.current_class_id)
            .eq('session_id', sessionData.id)
            .order('section_name', { ascending: true }),

          // Load students
          supabase
            .from('students')
            .select('id, admission_number, first_name, last_name, father_name, discount_amount, base_fee, final_fee')
            .eq('user_id', user.id)
        .eq('school_id', user.school_id)
            .eq('current_class_id', challan.students.current_class_id)
            .eq('current_section_id', challan.students.current_section_id)
            .eq('status', 'active')
            .order('admission_number', { ascending: true }),

          // Load fee structures
          supabase
            .from('fee_structures')
            .select(`
              id,
              amount,
              fee_type_id,
              fee_types(fee_name)
            `)
            .eq('user_id', user.id)
        .eq('school_id', user.school_id)
            .eq('session_id', sessionData.id)
            .eq('class_id', challan.students.current_class_id)
            .eq('status', 'active'),

          // Load challan items
          supabase
            .from('fee_challan_items')
            .select(`
              *,
              fee_types:fee_type_id (
                fee_name
              )
            `)
            .eq('challan_id', challan.id)
        ])

        sectionsData = sectionsResult.data || []
        studentsData = studentsResult.data || []
        feeStructuresData = feeStructuresResult.data || []
        challanItems = challanItemsResult.data || []

        // Update state for dropdowns
        setClassSections(sectionsData)
        setClassStudents(studentsData)
        setClassFeeStructures(feeStructuresData)

        // Check if monthly fee exists
        const monthlyFeeItem = challanItems.find(item =>
          item.description === 'Monthly Fee' || item.fee_type_id === null
        )

        // If monthly fee exists, load class fee structure (monthly fee has null fee_type_id)
        if (monthlyFeeItem) {
          const { data: classFeeResult } = await supabase
            .from('fee_structures')
            .select('amount, discount')
            .eq('user_id', user.id)
        .eq('school_id', user.school_id)
            .eq('class_id', challan.students.current_class_id)
            .eq('session_id', sessionData.id)
            .eq('status', 'active')
            .is('fee_type_id', null)
            .maybeSingle()

          classFeeData = classFeeResult
        }
      }

      // Process challan items
      const monthlyFeeItem = challanItems.find(item =>
        item.description === 'Monthly Fee' || item.fee_type_id === null
      )
      const hasMonthlyFee = !!monthlyFeeItem

      const otherFees = challanItems
        .filter(item => item.description !== 'Monthly Fee' && item.fee_type_id !== null)
        .map(item => ({
          id: item.id,
          name: item.fee_types?.fee_name || item.description || 'Other Fee',
          amount: parseFloat(item.amount),
          fee_type_id: item.fee_type_id
        }))

      // Calculate the class fee from the challan items (reverse engineering)
      let calculatedClassFee = 0
      let calculatedClassDiscount = 0

      if (monthlyFeeItem && classFeeData) {
        // The monthly fee amount is: classFee - classDiscount - studentDiscount
        // So: classFee = monthlyFeeAmount + classDiscount + studentDiscount
        const monthlyFeeAmount = parseFloat(monthlyFeeItem.amount) || 0
        const studentDiscount = parseFloat(challan.students?.discount_amount) || 0
        const classFeeFromDb = parseFloat(classFeeData.amount) || 0
        const classDiscountFromDb = parseFloat(classFeeData.discount) || 0

        // Use the database values if available, otherwise calculate from challan
        calculatedClassFee = classFeeFromDb || (monthlyFeeAmount + classDiscountFromDb + studentDiscount)
        calculatedClassDiscount = classDiscountFromDb
      } else if (monthlyFeeItem) {
        // If no class fee structure exists, use the challan amount directly
        calculatedClassFee = parseFloat(monthlyFeeItem.amount) || 0
        const studentDiscount = parseFloat(challan.students?.discount_amount) || 0
        // Add back the student discount to get the original class fee
        calculatedClassFee += studentDiscount
      }

      // Set form state ONCE with all loaded data
      setInstantChallanForm({
        target: 'Single Student',
        category: hasMonthlyFee ? 'Monthly Fee' : 'Other Fee',
        classId: challan.students?.current_class_id || '',
        sectionId: challan.students?.current_section_id || '',
        studentId: challan.students?.id || '',
        loadedStudent: challan.students,
        selectedFeeStructureId: '',
        selectedOtherFees: otherFees,
        customAmount: '',
        classFee: calculatedClassFee,
        classDiscount: calculatedClassDiscount,
        dueDate: challan.due_date || ''
      })
    } catch (error) {
      showToast('Failed to load challan data', 'error')
    }
  }

  const handleDeleteChallan = (challanId) => {
    setDeleteConfirmModal(challanId)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmModal) return

    try {
      const user = getUserFromCookie()
      const { error } = await supabase
        .from('fee_challans')
        .delete()
        .eq('id', deleteConfirmModal)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)

      if (error) throw error

      setCreatedChallans(prevChallans =>
        prevChallans.filter(challan => challan.id !== deleteConfirmModal)
      )

      setDeleteConfirmModal(null)
      showToast('Challan deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting challan:', error)
      showToast('Failed to delete challan', 'error')
      setDeleteConfirmModal(null)
    }
  }

  const handleViewChallan = (challan) => {
    setViewChallan(challan)
  }

  const handleStatusToggle = async (challanId, currentStatus) => {
    const statusCycle = {
      'pending': 'paid',
      'paid': 'overdue',
      'overdue': 'pending'
    }
    const newStatus = statusCycle[currentStatus] || 'pending'

    try {
      const user = getUserFromCookie()
      const { error } = await supabase
        .from('fee_challans')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', challanId)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)

      if (error) throw error

      setCreatedChallans(prevChallans =>
        prevChallans.map(challan =>
          challan.id === challanId
            ? { ...challan, status: newStatus }
            : challan
        )
      )

      showToast(`Status updated to ${newStatus.toUpperCase()}`, 'success')
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Failed to update status', 'error')
    }
  }

  const handleAddArrear = async () => {
    if (!bulkEntriesForm.narration || !bulkEntriesForm.amount || !bulkEntriesForm.feeHead) {
      showToast('Please fill in all required fields', 'warning')
      return
    }

    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
        showToast('User not found', 'error')
        return
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .maybeSingle()

      if (!sessionData) {
        showToast('No active session found. Please logout and login again to create a session.', 'error')
        return
      }

      if (sessionError) {
        showToast('Error fetching session. Please try again.', 'error')
        return
      }

      let query = supabase
        .from('fee_challans')
        .select('id, student_id, students(current_class_id, current_section_id)')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionData.id)
        .eq('status', 'pending')

      if (bulkEntriesForm.class) {
        query = query.eq('students.current_class_id', bulkEntriesForm.class)
      }

      if (bulkEntriesForm.section) {
        query = query.eq('students.current_section_id', bulkEntriesForm.section)
      }

      const { data: challans, error: challansError } = await query

      if (challansError) throw challansError

      if (!challans || challans.length === 0) {
        showToast('No pending challans found for the selected criteria', 'warning')
        return
      }

      const arrearItems = challans.map(challan => ({
        user_id: user.id,
        school_id: user.school_id,
        challan_id: challan.id,
        fee_type_id: bulkEntriesForm.feeHead,
        description: bulkEntriesForm.narration,
        amount: parseFloat(bulkEntriesForm.amount)
      }))

      const { error: itemsError } = await supabase
        .from('fee_challan_items')
        .insert(arrearItems)

      if (itemsError) throw itemsError

      for (const challan of challans) {
        const { data: items } = await supabase
          .from('fee_challan_items')
          .select('amount')
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
          .eq('challan_id', challan.id)

        const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0)

        await supabase
          .from('fee_challans')
          .update({ total_amount: total })
          .eq('id', challan.id)
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
      }

      showToast(`Arrear added successfully to ${challans.length} challan(s)!`, 'success')

      setBulkEntriesForm({
        ...bulkEntriesForm,
        narration: '',
        amount: '',
        feeHead: ''
      })
    } catch (error) {
      console.error('Error adding arrear:', error)
      showToast('Failed to add arrear: ' + error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateMonthlyChallan = async () => {
    try {
      setSubmitting(true)
      const user = getUserFromCookie()
      if (!user) {
        showToast('User not found', 'error')
        return
      }

      if (!monthlyChallanForm.class) {
        showToast('Please select a class', 'warning')
        return
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .maybeSingle()

      if (!sessionData) {
        showToast('No active session found. Please logout and login again to create a session.', 'error')
        return
      }

      if (sessionError) {
        showToast('Error fetching session. Please try again.', 'error')
        return
      }

      let query = supabase
        .from('students')
        .select('id, admission_number, first_name, last_name, base_fee, discount_amount, final_fee')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .eq('current_class_id', monthlyChallanForm.class)

      if (monthlyChallanForm.section) {
        query = query.eq('current_section_id', monthlyChallanForm.section)
      }

      const { data: studentsData, error: studentsError } = await query

      if (studentsError) throw studentsError

      if (!studentsData || studentsData.length === 0) {
        showToast('No students found for the selected class/section', 'warning')
        return
      }

      const { data: feeStructures, error: feeError } = await supabase
        .from('fee_structures')
        .select('fee_type_id, amount, fee_types(id, fee_name)')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('session_id', sessionData.id)
        .eq('class_id', monthlyChallanForm.class)
        .eq('status', 'active')

      if (feeError) throw feeError

      let createdCount = 0

      for (const student of studentsData) {
        const challanNumber = `CH-${monthlyChallanForm.feeMonth.substring(0, 3).toUpperCase()}-${monthlyChallanForm.feeYear}-${student.admission_number}`

        const { data: existingChallan } = await supabase
          .from('fee_challans')
          .select('id')
          .eq('user_id', user.id)
        .eq('school_id', user.school_id)
          .eq('challan_number', challanNumber)
          .single()

        if (existingChallan) {
          continue
        }

        let totalAmount = student.final_fee || 0
        if (!totalAmount && feeStructures && feeStructures.length > 0) {
          totalAmount = feeStructures.reduce((sum, fs) => sum + parseFloat(fs.amount), 0)
        }

        if (monthlyChallanForm.applyConcession && student.discount_amount) {
          totalAmount -= parseFloat(student.discount_amount)
        }

        const { data: challan, error: challanError } = await supabase
          .from('fee_challans')
          .insert([{
            user_id: user.id,
            school_id: user.school_id,
            session_id: sessionData.id,
            student_id: student.id,
            challan_number: challanNumber,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: monthlyChallanForm.dueDate,
            total_amount: totalAmount,
            status: 'pending',
            created_by: user.id
          }])
          .select()
          .single()

        if (challanError) {
          console.error(`Error creating challan for student ${student.admission_number}:`, challanError)
          continue
        }

        if (feeStructures && feeStructures.length > 0) {
          const challanItems = feeStructures.map(fs => ({
            user_id: user.id,
            school_id: user.school_id,
            challan_id: challan.id,
            fee_type_id: fs.fee_type_id,
            description: fs.fee_types?.fee_name || 'Monthly Fee',
            amount: parseFloat(fs.amount)
          }))

          const { error: itemsError } = await supabase
            .from('fee_challan_items')
            .insert(challanItems)

          if (itemsError) {
            console.error('Error inserting challan items:', itemsError)
          }
        }

        createdCount++
      }

      showToast(`Successfully created ${createdCount} monthly fee challan(s)!`, 'success')
      setShowChallanModal(false)
      setMonthlyChallanForm({
        class: '',
        section: '',
        feeMonth: 'December',
        feeYear: '2025',
        dueDate: '03-Dec-2025',
        applyConcession: false
      })
    } catch (error) {
      console.error('Error creating monthly challans:', error)
      showToast('Failed to create monthly challans: ' + error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${student.first_name} ${student.last_name || ''}`.toLowerCase()

    const matchesSearch =
      fullName.includes(searchLower) ||
      student.admission_number.toLowerCase().includes(searchLower)

    const matchesClass = !selectedClass || student.current_class_id === selectedClass

    return matchesSearch && matchesClass
  })

  const filteredChallans = createdChallans.filter(challan => {
    const searchLower = searchTerm.toLowerCase()
    const student = challan.students
    const fullName = student ? `${student.first_name} ${student.last_name || ''}`.toLowerCase() : ''

    const matchesSearch =
      challan.challan_number?.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      (student?.admission_number || '').toLowerCase().includes(searchLower)

    const matchesClass = !selectedClass || challan.students?.current_class_id === selectedClass
    const matchesSection = !selectedSection || challan.students?.current_section_id === selectedSection

    return matchesSearch && matchesClass && matchesSection
  })

  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 4
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 2) {
        for (let i = 1; i <= maxVisiblePages; i++) pages.push(i)
      } else if (currentPage >= totalPages - 1) {
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        for (let i = currentPage - 1; i <= currentPage + 2; i++) {
          if (i >= 1 && i <= totalPages) pages.push(i)
        }
      }
    }
    return pages
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedClass])


  return (
    <div className="p-2 bg-gray-50 min-h-screen">
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Compact Filter Section */}
      <div className="bg-white rounded-lg shadow p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            onClick={handleCreateChallan}
            className="bg-red-600 text-white px-3 py-2 rounded text-xs font-semibold hover:bg-red-700 transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={14} />
            Create Challan
          </button>

          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value)
              setSelectedSection('') // Reset section when class changes
            }}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.class_name}
              </option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            disabled={!selectedClass}
          >
            <option value="">All Sections</option>
            {sections
              .filter(sec => !selectedClass || sec.class_id === selectedClass)
              .map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.section_name}
                </option>
              ))}
          </select>

          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by challan number, student name, or admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Download CSV Button */}
          <button
            onClick={downloadCSV}
            disabled={filteredChallans.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ml-auto"
            title="Download CSV"
          >
            <Download size={14} />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-gray-600">
            Total: <span className="font-bold text-blue-600">{filteredChallans.length}</span>
          </span>
          <span className="text-gray-600">
            Pending: <span className="font-bold text-yellow-600">{filteredChallans.filter(c => c.status === 'pending').length}</span>
          </span>
          <span className="text-gray-600">
            Paid: <span className="font-bold text-green-600">{filteredChallans.filter(c => c.status === 'paid').length}</span>
          </span>
          <span className="text-gray-600">
            Overdue: <span className="font-bold text-red-600">{filteredChallans.filter(c => c.status === 'overdue').length}</span>
          </span>
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Sr.</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Student Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Father Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Class</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Due Date</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Total Amount</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Already Paid</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Balance Due</th>
                <th className="px-3 py-2.5 text-left font-semibold text-xs border border-blue-800">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold text-xs border border-blue-800">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading skeleton rows
                [...Array(5)].map((_, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} animate-pulse`}>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-8"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="flex gap-1 justify-center">
                        {[...Array(5)].map((_, j) => (
                          <div key={j} className="h-6 w-6 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-3 py-8 text-center text-gray-500 text-xs">
                    {createdChallans.length === 0 ? 'No challans created yet. Click "Create Challan" to get started.' : 'No challans found for the selected class.'}
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan, index) => (
                  <tr key={challan.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                    <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">{startIndex + index + 1}</td>
                    <td className="px-3 py-2.5 text-blue-600 font-medium text-xs border border-gray-200">
                      {challan.students?.first_name} {challan.students?.last_name}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">
                      {challan.students?.father_name || 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">
                      {challan.students?.classes?.class_name || 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs border border-gray-200">
                      {new Date(challan.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-gray-900 font-bold text-xs border border-gray-200">
                      Rs. {(challan.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <span className="text-green-600 font-semibold text-xs">
                        Rs. {(challan.paid_amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <span className={`font-bold text-xs ${
                        (challan.total_amount - (challan.paid_amount || 0)) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        Rs. {Math.max(0, (challan.total_amount || 0) - (challan.paid_amount || 0)).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${
                        challan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        challan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border border-gray-200">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewChallan(challan)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition"
                          title="View Challan"
                        >
                          <Eye size={16} />
                        </button>
                        {((challan.paid_amount || 0) < (challan.total_amount || 0)) && (
                          <button
                            onClick={() => handleEditChallan(challan)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit Challan"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {((challan.paid_amount || 0) < (challan.total_amount || 0)) && (
                          <button
                            onClick={() => handleDeleteChallan(challan.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete Challan"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {((challan.paid_amount || 0) < (challan.total_amount || 0)) && (
                          <button
                            onClick={() => handleStatusToggle(challan.id, challan.status)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                            title="Toggle Status"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintChallan(challan)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                          title="Print Challan"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredChallans.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length} challans
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                  currentPage === 1
                    ? 'bg-blue-300 text-white cursor-not-allowed opacity-50'
                    : 'bg-blue-800 text-white hover:bg-blue-900'
                }`}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof page === 'number' && goToPage(page)}
                  className={`w-8 h-8 rounded text-xs font-medium transition ${
                    page === currentPage
                      ? 'bg-blue-800 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                  currentPage === totalPages
                    ? 'bg-blue-300 text-white cursor-not-allowed opacity-50'
                    : 'bg-blue-800 text-white hover:bg-blue-900'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showChallanModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => {
              setShowChallanModal(false)
              setEditingChallan(null)
              resetInstantChallanForm()
            }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            {/* Blue Header */}
            <div className="bg-[#2B5AA8] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{editingChallan ? 'Edit Fee Challan' : 'Create Fee Challan'}</h3>
                <p className="text-blue-100 text-sm mt-0.5">{editingChallan ? 'Update challan details' : 'Fill in the details below'}</p>
              </div>
              <button
                onClick={() => {
                  setShowChallanModal(false)
                  setEditingChallan(null)
                  resetInstantChallanForm()
                }}
                className="text-white hover:bg-white/20 p-1.5 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 text-sm">Target</label>
                    <select
                      value={instantChallanForm.target}
                      onChange={(e) => setInstantChallanForm({ ...instantChallanForm, target: e.target.value, classId: '', sectionId: '', studentId: '', loadedStudent: null })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Single Student">Single Student</option>
                      <option value="Class-Wise">Class-Wise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2 text-sm">Class <span className="text-red-500">*</span></label>
                    <select
                      value={instantChallanForm.classId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {instantChallanForm.classId && classSections.length > 0 && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 text-sm">Section</label>
                    <select
                      value={instantChallanForm.sectionId}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">All Sections</option>
                      {classSections.map(section => (
                        <option key={section.id} value={section.id}>{section.section_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {instantChallanForm.target === 'Single Student' && instantChallanForm.classId && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-2 text-sm">Student <span className="text-red-500">*</span></label>
                    <select
                      value={instantChallanForm.studentId}
                      onChange={(e) => handleStudentChange(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Student</option>
                      {classStudents.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.admission_number} - {student.first_name} {student.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {instantChallanForm.loadedStudent && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <h4 className="font-semibold text-gray-800 mb-1 text-xs">Selected Student</h4>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <p><span className="font-medium">Name:</span> {instantChallanForm.loadedStudent.first_name} {instantChallanForm.loadedStudent.last_name}</p>
                      <p><span className="font-medium">Father:</span> {instantChallanForm.loadedStudent.father_name}</p>
                      <p><span className="font-medium">Admission:</span> {instantChallanForm.loadedStudent.admission_number}</p>
                    </div>
                  </div>
                )}

                {instantChallanForm.studentId && instantChallanForm.loadedStudent && (
                  <div className={`rounded p-2 border ${instantChallanForm.category === 'Monthly Fee' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 text-xs">Monthly Fee</h4>
                      <label className={`flex items-center space-x-1 cursor-pointer px-2 py-1 rounded transition-all text-xs ${instantChallanForm.category === 'Monthly Fee' ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'}`}>
                        <input
                          type="checkbox"
                          checked={instantChallanForm.category === 'Monthly Fee'}
                          onChange={(e) => setInstantChallanForm({
                            ...instantChallanForm,
                            category: e.target.checked ? 'Monthly Fee' : 'Other Fee'
                          })}
                          className="w-3 h-3 text-green-600 focus:ring-1 focus:ring-green-500 rounded"
                        />
                        <span className="text-xs font-bold">
                          {instantChallanForm.category === 'Monthly Fee' ? '✓ Included' : 'Include'}
                        </span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium text-gray-700">Class Fee:</span>
                          <p className="text-sm font-bold text-gray-900">Rs. {instantChallanForm.classFee.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Class Discount:</span>
                          <p className="text-sm font-bold text-red-600">- Rs. {instantChallanForm.classDiscount.toLocaleString()}</p>
                        </div>
                      </div>
                      {instantChallanForm.loadedStudent.discount_amount > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded p-1">
                          <span className="text-xs font-medium text-orange-700">Student Discount:</span>
                          <p className="text-xs font-bold text-orange-600">- Rs. {parseFloat(instantChallanForm.loadedStudent.discount_amount || 0).toLocaleString()}</p>
                        </div>
                      )}
                      <div className="pt-1 border-t border-green-300">
                        <span className="font-medium text-gray-700 text-xs">Standard Fee:</span>
                        <p className="text-base font-bold text-green-700">Rs. {(instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent.discount_amount || 0)).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {instantChallanForm.classId && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <h4 className="font-semibold text-gray-800 mb-2 text-sm">Other Fee</h4>
                    {classFeeStructures.length > 0 ? (
                      <>
                        <label className="block text-gray-700 font-medium mb-2 text-sm">Select Fee Types</label>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedFee = classFeeStructures.find(f => f.id === e.target.value)
                              if (selectedFee && !instantChallanForm.selectedOtherFees.find(f => f.fee_type_id === selectedFee.fee_type_id)) {
                                setInstantChallanForm({
                                  ...instantChallanForm,
                                  selectedOtherFees: [...instantChallanForm.selectedOtherFees, {
                                    id: selectedFee.id,
                                    name: selectedFee.fee_types?.fee_name || 'Other Fee',
                                    amount: parseFloat(selectedFee.amount),
                                    fee_type_id: selectedFee.fee_type_id
                                  }]
                                })
                              }
                            }
                          }}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">+ Add Fee Type</option>
                          {classFeeStructures
                            .filter(fee => fee.fee_type_id && !instantChallanForm.selectedOtherFees.find(f => f.fee_type_id === fee.fee_type_id))
                            .map(fee => (
                              <option key={fee.id} value={fee.id}>
                                {fee.fee_types?.fee_name || 'N/A'} - Rs. {parseFloat(fee.amount).toLocaleString()}
                              </option>
                            ))}
                        </select>
                      </>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                        <p className="text-xs text-blue-800 font-medium">
                          {instantChallanForm.selectedOtherFees.length === 0
                            ? '⚠️ No other fee types are configured for this class. Please add fee types in Settings → Fee Structure first.'
                            : '✓ Showing existing fees below'}
                        </p>
                      </div>
                    )}

                    {instantChallanForm.selectedOtherFees.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-gray-700">Selected Fees:</p>
                        {instantChallanForm.selectedOtherFees.map((fee, index) => (
                          <div key={fee.id || `fee-${index}`} className="flex items-center justify-between bg-white border border-yellow-300 rounded p-2 gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 text-xs mb-1">{fee.name}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Rs.</span>
                                <input
                                  type="number"
                                  value={fee.amount}
                                  onChange={(e) => {
                                    const newAmount = parseFloat(e.target.value) || 0
                                    const updatedFees = [...instantChallanForm.selectedOtherFees]
                                    updatedFees[index] = { ...fee, amount: newAmount }
                                    setInstantChallanForm({
                                      ...instantChallanForm,
                                      selectedOtherFees: updatedFees
                                    })
                                  }}
                                  className="w-24 px-2 py-1 text-xs border border-yellow-400 rounded focus:ring-1 focus:ring-yellow-500 outline-none font-bold text-yellow-700"
                                  min="0"
                                  step="100"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newFees = instantChallanForm.selectedOtherFees.filter((_, i) => i !== index)
                                setInstantChallanForm({
                                  ...instantChallanForm,
                                  selectedOtherFees: newFees,
                                  category: newFees.length > 0 ? 'Other Fee' : instantChallanForm.category
                                })
                              }}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-all"
                              title="Remove"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="bg-white border border-yellow-400 rounded p-2">
                          <p className="text-xs font-medium text-gray-700">Total Other Fees:</p>
                          <p className="text-base font-bold text-yellow-700">
                            Rs. {instantChallanForm.selectedOtherFees.reduce((sum, fee) => sum + fee.amount, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {((instantChallanForm.target === 'Class-Wise' && instantChallanForm.classId) ||
                  (instantChallanForm.target === 'Single Student' && instantChallanForm.studentId)) &&
                 (instantChallanForm.category === 'Monthly Fee' || instantChallanForm.selectedOtherFees.length > 0) && (
                  <>
                    <div>
                      <label className="block text-gray-700 font-medium mb-2 text-sm">
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={instantChallanForm.dueDate}
                        onChange={(e) => setInstantChallanForm({ ...instantChallanForm, dueDate: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-400 rounded p-2 mt-2">
                      <h4 className="font-bold text-gray-800 mb-2 text-sm">Challan Summary</h4>
                    <div className="space-y-1">
                      {instantChallanForm.category === 'Monthly Fee' && (instantChallanForm.classFee > 0 || instantChallanForm.loadedStudent) && (
                        <div className="flex justify-between items-center bg-white rounded p-1.5 border border-green-300">
                          <span className="font-medium text-gray-700 text-xs">Monthly Fee (After Discounts)</span>
                          <span className="font-bold text-green-700 text-xs">Rs. {(instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent?.discount_amount || 0)).toLocaleString()}</span>
                        </div>
                      )}
                      {instantChallanForm.selectedOtherFees.map((fee) => (
                        <div key={fee.id} className="flex justify-between items-center bg-white rounded p-1.5 border border-yellow-300">
                          <span className="font-medium text-gray-700 text-xs">{fee.name}</span>
                          <span className="font-bold text-yellow-700 text-xs">Rs. {fee.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center bg-blue-600 text-white rounded p-2 mt-2">
                        <span className="font-bold text-sm">Grand Total</span>
                        <span className="font-bold text-base">
                          Rs. {(
                            (instantChallanForm.category === 'Monthly Fee'
                              ? instantChallanForm.classFee - instantChallanForm.classDiscount - parseFloat(instantChallanForm.loadedStudent?.discount_amount || 0)
                              : 0) +
                            instantChallanForm.selectedOtherFees.reduce((sum, fee) => sum + fee.amount, 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex gap-3 justify-between">
                <button
                  onClick={() => {
                    setShowChallanModal(false)
                    setEditingChallan(null)
                    resetInstantChallanForm()
                  }}
                  className="flex-1 px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInstantChallan}
                  disabled={submitting ||
                    !((instantChallanForm.target === 'Class-Wise' && instantChallanForm.classId) ||
                      (instantChallanForm.target === 'Single Student' && instantChallanForm.studentId)) ||
                    !(instantChallanForm.category === 'Monthly Fee' || instantChallanForm.selectedOtherFees.length > 0) ||
                    !instantChallanForm.dueDate
                  }
                  className="flex-1 bg-[#DC2626] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#B91C1C] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  {submitting ? (editingChallan ? 'Updating...' : 'Creating...') : (editingChallan ? 'Update Challan' : 'Save Challan')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {viewChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setViewChallan(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white shadow-2xl z-[10000] rounded-xl overflow-hidden">
            {/* Header - Blue Style with Print Icon */}
            <div className="bg-[#2B5AA8] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Student Information</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintChallan(viewChallan)}
                  className="text-white hover:bg-white/20 p-2 rounded transition"
                  title="Print"
                >
                  <Printer size={20} />
                </button>
                <button
                  onClick={() => setViewChallan(null)}
                  className="text-white hover:bg-white/20 p-1.5 rounded transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content - Clean Section Layout */}
            <div className="p-6 bg-white max-h-[70vh] overflow-y-auto">
              {/* Academic Information */}
              <div className="mb-6">
                <h4 className="text-base font-bold text-gray-900 mb-4">Academic Information</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Class</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewChallan.students?.classes?.class_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Section</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewChallan.students?.sections?.section_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Admission Date</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(viewChallan.issue_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Father Information */}
              <div className="mb-6 pt-6 border-t border-gray-200">
                <h4 className="text-base font-bold text-gray-900 mb-4">Father Information</h4>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Father Name</p>
                  <p className="text-base font-medium text-gray-900">
                    {viewChallan.students?.father_name || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Fee Information */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-base font-bold text-gray-900 mb-4">Fee Information</h4>
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Base Fee</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewChallan.students?.base_fee || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Discount</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewChallan.students?.discount_amount || '0'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Final Fee</p>
                  <p className="text-base font-medium text-gray-900">
                    {viewChallan.students?.final_fee || viewChallan.total_amount || '0'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {deleteConfirmModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[9999]"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setDeleteConfirmModal(null)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-2xl z-[10000] rounded-lg overflow-hidden">
            {/* Red Header */}
            <div className="bg-[#DC2626] px-6 py-3.5">
              <h3 className="text-xl font-bold text-white">Confirm Delete</h3>
            </div>

            {/* Content */}
            <div className="p-6 bg-white">
              <p className="text-gray-700 text-sm leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-[#DC2626]">this challan</span>? This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-8 py-2.5 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-8 py-2.5 bg-[#DC2626] text-white font-medium hover:bg-[#B91C1C] rounded-lg transition flex items-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}