'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, Download, FileText, CheckCircle, X, Loader2,
  Eye, Filter, TrendingUp, AlertCircle, CreditCard
} from 'lucide-react'
import { getUserFromCookie } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'
import { getPdfSettings, hexToRgb, getMarginValues, getLogoSize, getAutoTableStyles, applyPdfSettings } from '@/lib/pdfSettings'
import { convertImageToBase64 } from '@/lib/pdfUtils'
import PermissionGuard from '@/components/PermissionGuard'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardInfoGrid } from '@/components/DataCard'
import PDFPreviewModal from '@/components/PDFPreviewModal'

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-2 sm:top-4 right-2 sm:right-4 left-2 sm:left-auto z-[10001] flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />}
      {type === 'error' && <X size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />}
      <span className="font-medium text-sm sm:text-base flex-1">{message}</span>
      <button onClick={onClose} className="ml-1 sm:ml-2 hover:opacity-80">
        <X size={16} className="sm:w-[18px] sm:h-[18px]" />
      </button>
    </div>
  )
}

// Student Details Modal
const StudentDetailsModal = ({ student, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [challans, setChallans] = useState([])

  useEffect(() => {
    loadStudentDetails()
  }, [student])

  const loadStudentDetails = async () => {
    try {
      const user = getUserFromCookie()

      // Get all payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id,
          challan_id,
          payment_date,
          amount_paid,
          payment_method,
          receipt_number,
          transaction_id,
          months_paid,
          remarks
        `)
        .eq('student_id', student.student_id)
        .eq('school_id', user.school_id)
        .order('payment_date', { ascending: false })

      if (paymentsError) throw paymentsError

      // Get all challans
      const { data: challansData, error: challansError } = await supabase
        .from('fee_challans')
        .select(`
          id,
          challan_number,
          issue_date,
          due_date,
          total_amount,
          status,
          session_id
        `)
        .eq('student_id', student.student_id)
        .eq('school_id', user.school_id)
        .order('issue_date', { ascending: false })

      if (challansError) throw challansError

      // Get session names separately
      let sessionsMap = {}
      if (challansData && challansData.length > 0) {
        const sessionIds = [...new Set(challansData.map(c => c.session_id).filter(Boolean))]
        if (sessionIds.length > 0) {
          const { data: sessionsData } = await supabase
            .from('sessions')
            .select('id, name')
            .in('id', sessionIds)

          sessionsData?.forEach(s => {
            sessionsMap[s.id] = s.name
          })
        }
      }

      // Calculate paid amount for each challan
      const challansWithPayments = (challansData || []).map(challan => {
        const challanPayments = (paymentsData || []).filter(p => p.challan_id === challan.id)
        const paidAmount = challanPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
        return {
          ...challan,
          session_name: sessionsMap[challan.session_id] || 'N/A',
          paid_amount: paidAmount,
          balance_due: parseFloat(challan.total_amount) - paidAmount
        }
      })

      setPayments(paymentsData || [])
      setChallans(challansWithPayments)
    } catch (error) {
      console.error('Error loading student details:', error)
      console.error('Error details:', error.message)
      setPayments([])
      setChallans([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 sm:p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">{student.student_name}</h2>
            <p className="text-blue-100 text-sm">Admission No: {student.admission_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded-lg p-2 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={48} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Total Challans</div>
                  <div className="text-2xl font-bold text-gray-900">{student.total_challans}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Total Billed</div>
                  <div className="text-2xl font-bold text-gray-900">Rs. {student.total_billed?.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-green-700 mb-1">Total Paid</div>
                  <div className="text-2xl font-bold text-green-700">Rs. {student.total_paid?.toLocaleString()}</div>
                </div>
                <div className={`rounded-lg p-4 border ${
                  student.balance_due > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className={`text-sm mb-1 ${student.balance_due > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    Balance Due
                  </div>
                  <div className={`text-2xl font-bold ${student.balance_due > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    Rs. {student.balance_due?.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Payment History</h3>
                <ResponsiveTableWrapper
                  tableView={
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-900 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Date</th>
                            <th className="px-4 py-3 text-left font-semibold">Receipt No</th>
                            <th className="px-4 py-3 text-left font-semibold">Challan No</th>
                            <th className="px-4 py-3 text-right font-semibold">Amount</th>
                            <th className="px-4 py-3 text-center font-semibold">Method</th>
                            <th className="px-4 py-3 text-left font-semibold">Months Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment, index) => {
                            const challan = challans.find(c => c.id === payment.challan_id)
                            let monthsText = 'N/A'

                            if (payment.months_paid) {
                              if (Array.isArray(payment.months_paid)) {
                                monthsText = payment.months_paid.length > 0 ? payment.months_paid.join(', ') : 'N/A'
                              } else if (typeof payment.months_paid === 'string') {
                                monthsText = payment.months_paid
                              }
                            }

                            return (
                              <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                <td className="px-4 py-3 border-t">
                                  {new Date(payment.payment_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 border-t font-medium">
                                  {payment.receipt_number || 'N/A'}
                                </td>
                                <td className="px-4 py-3 border-t text-xs text-gray-600">
                                  {challan?.challan_number || 'N/A'}
                                </td>
                                <td className="px-4 py-3 border-t text-right font-bold text-green-600">
                                  Rs. {parseFloat(payment.amount_paid).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 border-t text-center">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                    {payment.payment_method || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 border-t text-xs text-gray-700">
                                  {monthsText}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  }
                  cardView={payments.map((payment) => {
                    const challan = challans.find(c => c.id === payment.challan_id)
                    let monthsText = 'N/A'

                    if (payment.months_paid) {
                      if (Array.isArray(payment.months_paid)) {
                        monthsText = payment.months_paid.length > 0 ? payment.months_paid.join(', ') : 'N/A'
                      } else if (typeof payment.months_paid === 'string') {
                        monthsText = payment.months_paid
                      }
                    }

                    return (
                      <DataCard key={payment.id}>
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-green-600 text-base sm:text-lg">
                                Rs. {parseFloat(payment.amount_paid).toLocaleString()}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                {new Date(payment.payment_date).toLocaleDateString()}
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {payment.payment_method || 'N/A'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                            <div>
                              <span className="text-gray-500">Receipt No:</span>
                              <div className="font-medium text-gray-900">{payment.receipt_number || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Challan No:</span>
                              <div className="font-medium text-gray-900">{challan?.challan_number || 'N/A'}</div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Months Paid:</span>
                              <div className="font-medium text-gray-900">{monthsText}</div>
                            </div>
                          </div>
                        </div>
                      </DataCard>
                    )
                  })}
                  loading={false}
                  empty={payments.length === 0}
                  emptyMessage="No payment history found"
                />
              </div>

              {/* Challan History */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Challan History</h3>
                <ResponsiveTableWrapper
                  tableView={
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-900 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Challan No</th>
                            <th className="px-4 py-3 text-left font-semibold">Session</th>
                            <th className="px-4 py-3 text-left font-semibold">Issue Date</th>
                            <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                            <th className="px-4 py-3 text-right font-semibold">Amount</th>
                            <th className="px-4 py-3 text-right font-semibold">Paid</th>
                            <th className="px-4 py-3 text-right font-semibold">Balance</th>
                            <th className="px-4 py-3 text-center font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {challans.map((challan, index) => (
                            <tr key={challan.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 border-t font-medium">
                                {challan.challan_number}
                              </td>
                              <td className="px-4 py-3 border-t text-xs">
                                {challan.session_name}
                              </td>
                              <td className="px-4 py-3 border-t">
                                {new Date(challan.issue_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 border-t">
                                {new Date(challan.due_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 border-t text-right font-semibold">
                                Rs. {parseFloat(challan.total_amount).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 border-t text-right text-green-600 font-semibold">
                                Rs. {challan.paid_amount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 border-t text-right">
                                <span className={`font-semibold ${
                                  challan.balance_due > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  Rs. {challan.balance_due.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-4 py-3 border-t text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  challan.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  challan.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {challan.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  }
                  cardView={challans.map((challan) => (
                    <DataCard key={challan.id}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-gray-900 text-base">
                              {challan.challan_number}
                            </div>
                            <div className="text-xs text-gray-500">{challan.session_name}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            challan.status === 'paid' ? 'bg-green-100 text-green-700' :
                            challan.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {challan.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                          <div>
                            <span className="text-gray-500">Issue Date:</span>
                            <div className="font-medium text-gray-900">
                              {new Date(challan.issue_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Due Date:</span>
                            <div className="font-medium text-gray-900">
                              {new Date(challan.due_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Amount:</span>
                            <div className="font-semibold text-gray-900">
                              Rs. {parseFloat(challan.total_amount).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Paid:</span>
                            <div className="font-semibold text-green-600">
                              Rs. {challan.paid_amount.toLocaleString()}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">Balance Due:</span>
                            <div className={`font-bold text-base ${
                              challan.balance_due > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              Rs. {challan.balance_due.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DataCard>
                  ))}
                  loading={false}
                  empty={challans.length === 0}
                  emptyMessage="No challan history found"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Content Component
function FeeHistoryContent() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Summary totals
  const [summary, setSummary] = useState({
    totalStudents: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalDue: 0
  })

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }
    setPdfUrl(null)
    setPdfFileName('')
  }

  // Load user on mount
  useEffect(() => {
    const user = getUserFromCookie()
    setCurrentUser(user)
  }, [])

  // Load initial data
  useEffect(() => {
    if (currentUser) {
      loadInitialData()
    }
  }, [currentUser])

  // Load sections when class changes
  useEffect(() => {
    if (selectedClass && currentUser) {
      loadSections()
    } else {
      setSections([])
      setSelectedSection('')
    }
  }, [selectedClass, currentUser])

  const loadInitialData = async () => {
    try {
      const user = currentUser

      if (!user || !user.id || !user.school_id) {
        console.error('User not properly loaded:', user)
        showToast('User authentication error. Please refresh the page.', 'error')
        return
      }

      console.log('Loading initial data for user:', user.id)

      // Load classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('class_name')

      if (classesError) {
        console.error('Error loading classes:', classesError)
        throw new Error(`Failed to load classes: ${classesError.message}`)
      }

      console.log('Classes loaded:', classesData?.length || 0)
      setClasses(classesData || [])

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, name, status')
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('start_date', { ascending: false })

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError)
        throw new Error(`Failed to load sessions: ${sessionsError.message}`)
      }

      console.log('Sessions loaded:', sessionsData?.length || 0)
      setSessions(sessionsData || [])

      // Set active session as default
      const activeSession = sessionsData?.find(s => s.status === 'active')
      if (activeSession) {
        setSelectedSession(activeSession.id)
        console.log('Active session set:', activeSession.name)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      console.error('Error details:', error.message)
      showToast(`Failed to load data: ${error.message}`, 'error')
    }
  }

  const loadSections = async () => {
    try {
      const user = currentUser

      const { data: sectionsData, error } = await supabase
        .from('sections')
        .select('id, section_name')
        .eq('class_id', selectedClass)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .order('section_name')

      if (error) throw error
      setSections(sectionsData || [])
    } catch (error) {
      console.error('Error loading sections:', error)
    }
  }

  const loadStudents = async () => {
    if (!selectedClass) {
      showToast('Please select a class', 'error')
      return
    }

    setLoading(true)
    try {
      const user = currentUser

      // Build query for students
      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          father_name,
          status,
          base_fee,
          discount_amount
        `)
        .eq('current_class_id', selectedClass)
        .eq('user_id', user.id)
        .eq('school_id', user.school_id)
        .eq('status', 'active')

      if (selectedSection) {
        studentsQuery = studentsQuery.eq('current_section_id', selectedSection)
      }

      const { data: studentsData, error: studentsError } = await studentsQuery.order('admission_number')

      if (studentsError) throw studentsError

      if (!studentsData || studentsData.length === 0) {
        setStudents([])
        showToast('No students found in selected class', 'error')
        return
      }

      // For each student, calculate fee history
      const studentIds = studentsData.map(s => s.id)

      // Get all challans for these students
      let challansQuery = supabase
        .from('fee_challans')
        .select('id, student_id, total_amount')
        .in('student_id', studentIds)
        .eq('school_id', user.school_id)

      if (selectedSession) {
        challansQuery = challansQuery.eq('session_id', selectedSession)
      }

      const { data: challansData, error: challansError } = await challansQuery

      if (challansError) throw challansError

      // Get all payments for these students
      let paymentsQuery = supabase
        .from('fee_payments')
        .select('id, student_id, amount_paid, challan_id')
        .in('student_id', studentIds)
        .eq('school_id', user.school_id)

      const { data: paymentsData, error: paymentsError } = await paymentsQuery

      if (paymentsError) throw paymentsError

      // Calculate totals for each student
      const studentsWithHistory = studentsData.map(student => {
        const studentChallans = challansData?.filter(c => c.student_id === student.id) || []
        const studentPayments = paymentsData?.filter(p => p.student_id === student.id) || []

        // If session is selected, only count payments for challans in that session
        let totalPaid = 0
        if (selectedSession) {
          const sessionChallanIds = studentChallans.map(c => c.id)
          totalPaid = studentPayments
            .filter(p => sessionChallanIds.includes(p.challan_id))
            .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
        } else {
          totalPaid = studentPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
        }

        const totalBilled = studentChallans.reduce((sum, c) => sum + parseFloat(c.total_amount || 0), 0)
        const balanceDue = totalBilled - totalPaid

        return {
          student_id: student.id,
          admission_number: student.admission_number,
          student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          father_name: student.father_name,
          base_fee: parseFloat(student.base_fee || 0),
          discount_amount: parseFloat(student.discount_amount || 0),
          total_challans: studentChallans.length,
          total_billed: totalBilled,
          total_paid: totalPaid,
          balance_due: balanceDue,
          status: student.status
        }
      })

      // Calculate overall summary
      const totalStudents = studentsWithHistory.length
      const totalBilled = studentsWithHistory.reduce((sum, s) => sum + s.total_billed, 0)
      const totalPaid = studentsWithHistory.reduce((sum, s) => sum + s.total_paid, 0)
      const totalDue = totalBilled - totalPaid

      setSummary({ totalStudents, totalBilled, totalPaid, totalDue })
      setStudents(studentsWithHistory)

    } catch (error) {
      console.error('Error loading students:', error)
      console.error('Error details:', error.message)
      console.error('Error code:', error.code)
      showToast(`Failed to load students: ${error.message}`, 'error')
      setStudents([])
      setSummary({
        totalStudents: 0,
        totalBilled: 0,
        totalPaid: 0,
        totalDue: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    try {
      if (students.length === 0) {
        showToast('No data to export', 'error')
        return
      }

      const data = students.map(student => ({
        'Admission No': student.admission_number,
        'Student Name': student.student_name,
        'Father Name': student.father_name || 'N/A',
        'Base Fee': student.base_fee,
        'Discount': student.discount_amount,
        'Total Challans': student.total_challans,
        'Total Billed': student.total_billed,
        'Total Paid': student.total_paid,
        'Balance Due': student.balance_due,
        'Status': student.status
      }))

      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        }).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fee-history-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      showToast('CSV exported successfully!', 'success')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      showToast('Failed to export CSV', 'error')
    }
  }

  const exportToPDF = async () => {
    try {
      if (students.length === 0) {
        showToast('No data to export', 'error')
        return
      }

      const user = currentUser
      const pdfSettings = getPdfSettings()

      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const orientation = 'l' // Landscape for wide table
      const pageSize = pdfSettings.pageSize || 'a4'
      const doc = new jsPDF(orientation, 'mm', pageSize)
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margins = getMarginValues(pdfSettings.margin)

      // Apply PDF settings (font, etc.)
      applyPdfSettings(doc, pdfSettings)

      // Fetch school data
      let schoolData = { name: '', address: '', phone: '', logo_url: '' }
      if (user?.school_id) {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('id', user.school_id)
          .single()

        if (error) throw error

        // Convert logo URL to base64 if it exists
        let logoBase64 = data.logo_url
        if (data.logo_url && (data.logo_url.startsWith('http://') || data.logo_url.startsWith('https://'))) {
          console.log('🔄 Converting logo URL to base64...')
          logoBase64 = await convertImageToBase64(data.logo_url)
          console.log('✅ Logo converted to base64:', logoBase64 ? 'Success' : 'Failed')
        }

        schoolData = {
          school_name: data.name,
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          logo: logoBase64,
          tagline: data.tagline,
          principal_name: data.principal_name,
          established_date: data.established_date
        }
      }

      // Get colors from settings
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      const textColor = hexToRgb(pdfSettings.textColor)

      // Header Section with background box
      const headerHeight = 45
      let yPos = 10

      // Draw background rectangle
      doc.setFillColor(...headerBgColor)
      doc.rect(0, 0, pageWidth, headerHeight, 'F')

      // Add "Generated" date in top right corner
      if (pdfSettings.includeGeneratedDate) {
        const generatedDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(255, 255, 255)
        doc.text(`Generated: ${generatedDate}`, pageWidth - 10, 8, { align: 'right' })
      }

      // Add logo in white box on the left if enabled
      if (pdfSettings.includeLogo && schoolData.logo) {
        try {
          const logoSize = getLogoSize(pdfSettings.logoSize)
          const logoBoxSize = logoSize.width + 8
          const logoBoxX = 15
          const logoBoxY = (headerHeight - logoBoxSize) / 2 + 5

          // Draw white box for logo
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 3, 3, 'F')

          // Add logo centered in white box
          const logoX = logoBoxX + 4
          const logoY = logoBoxY + 4
          doc.addImage(schoolData.logo, 'PNG', logoX, logoY, logoSize.width, logoSize.height)
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // Center section with school name and title
      yPos = 18

      // School name
      if (pdfSettings.includeSchoolName && (schoolData.school_name || schoolData.name)) {
        const schoolName = schoolData.school_name || schoolData.name
        doc.setFontSize(pdfSettings.schoolNameFontSize || 18)
        doc.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' })
        yPos += 8
      }

      // Title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('STUDENT FEE HISTORY REPORT', pageWidth / 2, yPos, { align: 'center' })
      yPos += 6

      // Subtitle with class info
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(255, 255, 255)
      const className = classes.find(c => c.id === selectedClass)?.class_name || 'All Classes'
      const sectionName = sections.find(s => s.id === selectedSection)?.section_name || ''
      const subtitle = sectionName ? `Class: ${className} - ${sectionName}` : `Class: ${className}`
      doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' })

      // Reset y position to start content after header
      yPos = headerHeight + 8

      // Summary information below header
      doc.setTextColor(...textColor)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Students: ${summary.totalStudents} | Total Billed: Rs. ${summary.totalBilled.toLocaleString()} | Total Paid: Rs. ${summary.totalPaid.toLocaleString()} | Total Due: Rs. ${summary.totalDue.toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 8

      // Prepare table data
      const tableData = students.map((student, index) => [
        index + 1,
        student.admission_number,
        student.student_name,
        student.father_name || 'N/A',
        student.total_challans,
        parseFloat(student.total_billed || 0).toLocaleString(),
        parseFloat(student.total_paid || 0).toLocaleString(),
        parseFloat(student.balance_due || 0).toLocaleString()
      ])

      // Add totals row
      const totals = [
        '',
        '',
        'TOTAL',
        '',
        students.reduce((sum, s) => sum + parseInt(s.total_challans || 0), 0),
        students.reduce((sum, s) => sum + parseFloat(s.total_billed || 0), 0).toLocaleString(),
        students.reduce((sum, s) => sum + parseFloat(s.total_paid || 0), 0).toLocaleString(),
        students.reduce((sum, s) => sum + parseFloat(s.balance_due || 0), 0).toLocaleString()
      ]

      // Get autoTable styles from centralized settings
      const autoTableStyles = getAutoTableStyles(pdfSettings)

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Adm. No', 'Student Name', 'Father Name', 'Challans', 'Total Billed', 'Total Paid', 'Balance Due']],
        body: [...tableData, totals],
        ...autoTableStyles,
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 45 },
          3: { cellWidth: 40 },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 30, halign: 'right' },
          6: { cellWidth: 30, halign: 'right', fillColor: [232, 245, 233] },
          7: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          // Highlight totals row with header color
          if (data.row.index === tableData.length && data.section === 'body') {
            data.cell.styles.fillColor = headerBgColor
            data.cell.styles.textColor = [255, 255, 255]
            data.cell.styles.fontStyle = 'bold'
          }
          // Color code balance due
          if (data.section === 'body' && data.column.index === 7 && data.row.index < tableData.length) {
            const balance = students[data.row.index].balance_due
            if (balance > 0) {
              data.cell.styles.textColor = [220, 38, 38]
            } else {
              data.cell.styles.textColor = [34, 197, 94]
            }
          }
        }
      })

      // Generate PDF blob for preview
      const fileName = `Fee-History-${new Date().toISOString().split('T')[0]}.pdf`
      const pdfBlob = doc.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)

      showToast('PDF generated successfully. Preview opened.', 'success')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      showToast('Failed to export PDF: ' + error.message, 'error')
    }
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
        isOpen={showPdfPreview}
        onClose={handleClosePdfPreview}
      />

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Fee History</h1>
        <p className="text-sm sm:text-base text-gray-600">View complete fee payment history for all students</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-xs uppercase tracking-wide">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-xs uppercase tracking-wide">
              Section (Optional)
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClass || sections.length === 0}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">All Sections</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>
                  {sec.section_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-xs uppercase tracking-wide">
              Session (Optional)
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Sessions</option>
              {sessions.map(sess => (
                <option key={sess.id} value={sess.id}>
                  {sess.name} {sess.status === 'active' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadStudents}
              disabled={loading || !selectedClass}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Filter size={16} />
              )}
              Load Students
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Students</div>
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalStudents}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Billed</div>
              <FileText size={20} className="text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">Rs. {summary.totalBilled.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Paid</div>
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">Rs. {summary.totalPaid.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Due</div>
              <AlertCircle size={20} className={summary.totalDue > 0 ? 'text-red-600' : 'text-green-600'} />
            </div>
            <div className={`text-2xl font-bold ${summary.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Rs. {summary.totalDue.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">Student Fee History</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportToCSV}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
                >
                  <Download size={14} />
                  CSV
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
                >
                  <FileText size={14} />
                  PDF
                </button>
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-4">
            <ResponsiveTableWrapper
              tableView={
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Adm. No</th>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Father Name</th>
                        <th className="px-4 py-3 text-center font-semibold border border-blue-800">Challans</th>
                        <th className="px-4 py-3 text-right font-semibold border border-blue-800">Total Billed</th>
                        <th className="px-4 py-3 text-right font-semibold border border-blue-800">Total Paid</th>
                        <th className="px-4 py-3 text-right font-semibold border border-blue-800">Balance Due</th>
                        <th className="px-4 py-3 text-center font-semibold border border-blue-800">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr key={student.student_id} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                          <td className="px-4 py-3 border border-gray-200 font-medium">
                            {student.admission_number}
                          </td>
                          <td className="px-4 py-3 border border-gray-200 font-semibold">
                            {student.student_name}
                          </td>
                          <td className="px-4 py-3 border border-gray-200">
                            {student.father_name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 border border-gray-200 text-center">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {student.total_challans}
                            </span>
                          </td>
                          <td className="px-4 py-3 border border-gray-200 text-right font-semibold">
                            Rs. {student.total_billed.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 border border-gray-200 text-right">
                            <span className="font-semibold text-green-600">
                              Rs. {student.total_paid.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 border border-gray-200 text-right">
                            <span className={`font-bold ${
                              student.balance_due > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              Rs. {student.balance_due.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 border border-gray-200 text-center">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs font-medium inline-flex items-center gap-1"
                            >
                              <Eye size={14} />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
              cardView={students.map((student) => (
                <DataCard key={student.student_id}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate mb-1">
                        {student.student_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-0.5">
                        Empl: {student.admission_number}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
                        <span className="text-gray-600">
                          <span className="font-medium">Father:</span> {student.father_name || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 transition text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
                    >
                      View
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-500">Total Challans:</span>
                      <span className="ml-1 font-semibold text-gray-900">{student.total_challans}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Department:</span>
                      <span className="ml-1 font-semibold text-gray-900">TEACHING</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Billed:</span>
                      <span className="ml-1 font-semibold text-gray-900">Rs. {student.total_billed.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Total Paid:</span>
                      <span className="ml-1 font-semibold text-green-600">Rs. {student.total_paid.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Balance Due:</span>
                      <span className={`ml-1 font-bold text-sm sm:text-base ${student.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs. {student.balance_due.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </DataCard>
              ))}
              loading={loading}
              empty={false}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && students.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CreditCard size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Class to View History</h3>
          <p className="text-gray-600">
            Choose a class from the filters above and click "Load Students" to view their complete fee history
          </p>
        </div>
      )}
    </div>
  )
}

// Main Page Component with Permission Guard
export default function FeeHistoryPage() {
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
      permissionKey="fee_reports_view"
      pageName="Fee History"
    >
      <FeeHistoryContent />
    </PermissionGuard>
  )
}
