'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, CheckCircle, X, Printer, Eye, Calendar, CreditCard, Building2, GraduationCap, Phone, Mail, MapPin } from 'lucide-react'
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
      'bg-blue-600 text-white'
    }`}>
      {type === 'success' && <CheckCircle size={16} />}
      {type === 'error' && <X size={16} />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={14} />
      </button>
    </div>
  )
}

// Modern Print Layout Component
const PrintChallan = ({ challan, school, onClose }) => {
  const printRef = useRef()
  const feeSchedule = challan?.fee_schedule || []

  const handlePrint = () => {
    const printContent = printRef.current
    const WinPrint = window.open('', '', 'width=900,height=650')
    WinPrint.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Challan - ${challan?.challan_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Inter', sans-serif;
              background: #f8fafc;
              padding: 20px;
            }

            .challan-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              overflow: hidden;
            }

            .header {
              background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
              color: white;
              padding: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .school-info h1 {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 4px;
            }

            .school-info p {
              font-size: 13px;
              opacity: 0.9;
            }

            .challan-badge {
              background: rgba(255,255,255,0.2);
              padding: 12px 20px;
              border-radius: 12px;
              text-align: center;
            }

            .challan-badge .label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              opacity: 0.8;
            }

            .challan-badge .number {
              font-size: 18px;
              font-weight: 700;
              margin-top: 4px;
            }

            .student-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              padding: 24px;
              background: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
            }

            .info-card {
              background: white;
              padding: 16px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }

            .info-card .title {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #64748b;
              margin-bottom: 12px;
              font-weight: 600;
            }

            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dashed #e2e8f0;
            }

            .info-row:last-child {
              border-bottom: none;
            }

            .info-row .label {
              color: #64748b;
              font-size: 13px;
            }

            .info-row .value {
              font-weight: 600;
              color: #1e293b;
              font-size: 13px;
            }

            .fee-schedule {
              padding: 24px;
            }

            .fee-schedule .title {
              font-size: 16px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .fee-schedule .title::before {
              content: '';
              width: 4px;
              height: 20px;
              background: #2563eb;
              border-radius: 2px;
            }

            .schedule-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }

            .schedule-table th {
              background: #1e3a5f;
              color: white;
              padding: 12px 16px;
              text-align: left;
              font-weight: 600;
            }

            .schedule-table th:first-child {
              border-radius: 8px 0 0 0;
            }

            .schedule-table th:last-child {
              border-radius: 0 8px 0 0;
            }

            .schedule-table td {
              padding: 12px 16px;
              border-bottom: 1px solid #e2e8f0;
            }

            .schedule-table tr:nth-child(even) {
              background: #f8fafc;
            }

            .schedule-table tr:last-child td:first-child {
              border-radius: 0 0 0 8px;
            }

            .schedule-table tr:last-child td:last-child {
              border-radius: 0 0 8px 0;
            }

            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
            }

            .status-pending {
              background: #fef3c7;
              color: #b45309;
            }

            .status-paid {
              background: #dcfce7;
              color: #166534;
            }

            .summary-section {
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              padding: 24px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
            }

            .summary-card {
              background: white;
              padding: 16px;
              border-radius: 12px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            }

            .summary-card .label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #64748b;
              margin-bottom: 8px;
            }

            .summary-card .amount {
              font-size: 22px;
              font-weight: 700;
              color: #1e293b;
            }

            .summary-card.highlight {
              background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
            }

            .summary-card.highlight .label,
            .summary-card.highlight .amount {
              color: white;
            }

            .footer {
              padding: 20px 24px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              color: #64748b;
            }

            .footer .terms {
              max-width: 400px;
            }

            .footer .signature {
              text-align: center;
            }

            .footer .signature-line {
              width: 150px;
              border-top: 1px solid #1e293b;
              margin-bottom: 8px;
            }

            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 100px;
              font-weight: 900;
              color: rgba(0,0,0,0.03);
              pointer-events: none;
              z-index: -1;
            }

            @media print {
              body {
                padding: 0;
                background: white;
              }

              .challan-container {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    WinPrint.document.close()
    WinPrint.focus()
    setTimeout(() => {
      WinPrint.print()
      WinPrint.close()
    }, 250)
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[9999]"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />
      <div className="fixed inset-4 md:inset-10 bg-white rounded-2xl z-[10000] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Fee Challan Preview</h3>
            <p className="text-blue-200 text-sm">Review and print the challan</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition font-medium"
            >
              <Printer size={18} />
              Print Challan
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/10 p-2 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div ref={printRef}>
            <div className="challan-container" style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: 'white', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>{school?.school_name || 'School Name'}</h1>
                  <p style={{ fontSize: '13px', opacity: '0.9' }}>{school?.address || 'School Address'}</p>
                  <p style={{ fontSize: '13px', opacity: '0.9' }}>{school?.phone && `Phone: ${school.phone}`} {school?.email && `| Email: ${school.email}`}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: '0.8' }}>Challan No.</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{challan?.challan_number}</div>
                </div>
              </div>

              {/* Student Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px', fontWeight: '600' }}>Student Information</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Name</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{challan?.student?.first_name} {challan?.student?.last_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Admission No.</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{challan?.student?.admission_number}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Class / Section</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{challan?.student?.class?.class_name || 'N/A'} {challan?.student?.section?.section_name ? `- ${challan?.student?.section?.section_name}` : ''}</span>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px', fontWeight: '600' }}>Challan Details</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Issue Date</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{new Date(challan?.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Fee Plan</span>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px', textTransform: 'capitalize' }}>{challan?.fee_plan || 'Monthly'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Status</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      background: challan?.status === 'paid' ? '#dcfce7' : '#fef3c7',
                      color: challan?.status === 'paid' ? '#166534' : '#b45309'
                    }}>{challan?.status || 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Fee Schedule */}
              <div style={{ padding: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '4px', height: '20px', background: '#2563eb', borderRadius: '2px', display: 'inline-block' }}></span>
                  Fee Schedule - Academic Year {challan?.fee_year || new Date().getFullYear()}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '12px 16px', textAlign: 'left', fontWeight: '600', borderRadius: '8px 0 0 0' }}>Sr.</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Period</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Months</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Due Date</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>Amount</th>
                      <th style={{ background: '#1e3a5f', color: 'white', padding: '12px 16px', textAlign: 'center', fontWeight: '600', borderRadius: '0 8px 0 0' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeSchedule.length > 0 ? feeSchedule.map((item, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>{item.period}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>{item.months?.join(', ') || '-'}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>{new Date(item.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600' }}>Rs. {parseFloat(item.amount).toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            background: item.status === 'paid' ? '#dcfce7' : '#fef3c7',
                            color: item.status === 'paid' ? '#166534' : '#b45309'
                          }}>{item.status || 'Pending'}</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                          No fee schedule available. This may be an older challan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Base Fee (Monthly)</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Rs. {parseFloat(challan?.base_fee || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Discount ({challan?.discount_type || 'fixed'})</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>Rs. {parseFloat(challan?.discount_amount || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Paid Amount</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Rs. {parseFloat(challan?.paid_amount || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Total Payable</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'white' }}>Rs. {parseFloat(challan?.total_amount || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px', color: '#64748b' }}>
                <div style={{ maxWidth: '400px' }}>
                  <strong style={{ color: '#1e293b' }}>Terms & Conditions:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
                    <li>Fee must be paid by the due date to avoid late fee charges.</li>
                    <li>This challan is computer generated and valid without signature.</li>
                    <li>Please retain this receipt for your records.</li>
                  </ul>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '150px', borderTop: '1px solid #1e293b', marginBottom: '8px' }}></div>
                  <span>Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function FeeCollectPage() {
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChallan, setSelectedChallan] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printChallan, setPrintChallan] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [classes, setClasses] = useState([])
  const [school, setSchool] = useState(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const hideToast = () => {
    setToast({ show: false, message: '', type: '' })
  }

  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'cash',
    amountPaid: '',
    chequeNumber: '',
    bankName: '',
    transactionId: '',
    remarks: ''
  })

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (showPaymentModal || showPrintModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showPaymentModal, showPrintModal])

  useEffect(() => {
    fetchAllChallans()
    fetchAllClasses()
    fetchSchoolInfo()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, classFilter])

  const fetchSchoolInfo = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user.school_id)
        .single()

      if (!error && schoolData) {
        setSchool(schoolData)
      }
    } catch (error) {
      console.error('Error fetching school:', error)
    }
  }

  const fetchAllClasses = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) return

      const { data: allClasses, error } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('school_id', user.school_id)
        .order('class_name', { ascending: true })

      if (!error && allClasses) {
        setClasses(allClasses)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchAllChallans = async () => {
    try {
      setLoading(true)
      const user = getUserFromCookie()
      if (!user) {
        console.error('No user found')
        setLoading(false)
        return
      }

      const { data: challansData, error: challansError } = await supabase
        .from('fee_challans')
        .select(`
          *,
          students!student_id (
            id,
            admission_number,
            first_name,
            last_name,
            current_class_id,
            current_section_id
          )
        `)
        .eq('school_id', user.school_id)
        .order('issue_date', { ascending: false })

      if (challansError) throw challansError

      const classIds = [...new Set(challansData?.map(c => c.students?.current_class_id).filter(Boolean))]
      const sectionIds = [...new Set(challansData?.map(c => c.students?.current_section_id).filter(Boolean))]

      const { data: classesData } = await supabase
        .from('classes')
        .select('id, class_name')
        .in('id', classIds)

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, section_name')
        .in('id', sectionIds)

      const classMap = {}
      classesData?.forEach(c => { classMap[c.id] = c })

      const sectionMap = {}
      sectionsData?.forEach(s => { sectionMap[s.id] = s })

      const challansWithDetails = (challansData || []).map(challan => ({
        ...challan,
        student: {
          ...challan.students,
          class: classMap[challan.students?.current_class_id],
          section: sectionMap[challan.students?.current_section_id]
        }
      }))

      setChallans(challansWithDetails)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleSelectChallan = async (challan) => {
    setSelectedChallan(challan)
    setShowPaymentModal(true)
    setPaymentData({
      paymentMethod: 'cash',
      amountPaid: challan.total_amount.toString(),
      chequeNumber: '',
      bankName: '',
      transactionId: '',
      remarks: ''
    })
  }

  const handleViewChallan = (challan) => {
    setPrintChallan(challan)
    setShowPrintModal(true)
  }

  const handlePayment = async () => {
    try {
      const user = getUserFromCookie()
      if (!user) {
        showToast('User not found', 'error')
        return
      }

      if (!paymentData.amountPaid || parseFloat(paymentData.amountPaid) <= 0) {
        showToast('Please enter a valid amount', 'error')
        return
      }

      const amountPaid = parseFloat(paymentData.amountPaid)
      const challanAmount = parseFloat(selectedChallan.total_amount)

      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      const { error: paymentError } = await supabase
        .from('fee_payments')
        .insert([{
          school_id: user.school_id,
          challan_id: selectedChallan.id,
          student_id: selectedChallan.student_id,
          payment_date: new Date().toISOString().split('T')[0],
          amount_paid: amountPaid,
          payment_method: paymentData.paymentMethod,
          transaction_id: paymentData.transactionId || null,
          cheque_number: paymentData.chequeNumber || null,
          bank_name: paymentData.bankName || null,
          received_by: user.id,
          receipt_number: receiptNumber,
          remarks: paymentData.remarks || null
        }])

      if (paymentError) throw paymentError

      const newStatus = amountPaid >= challanAmount ? 'paid' : 'pending'
      const newPaidAmount = parseFloat(selectedChallan.paid_amount || 0) + amountPaid

      const { error: updateError } = await supabase
        .from('fee_challans')
        .update({
          status: newStatus,
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedChallan.id)

      if (updateError) throw updateError

      showToast('Payment collected successfully!', 'success')
      setShowPaymentModal(false)

      // Update the challan status locally without reloading the entire page
      setChallans(prevChallans =>
        prevChallans.map(challan =>
          challan.id === selectedChallan.id
            ? { ...challan, status: newStatus, paid_amount: newPaidAmount, updated_at: new Date().toISOString() }
            : challan
        )
      )

      setSelectedChallan(null)
    } catch (error) {
      console.error('Error:', error)
      showToast('Failed to process payment', 'error')
    }
  }

  const filteredChallans = challans.filter(challan => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${challan.student?.first_name || ''} ${challan.student?.last_name || ''}`.toLowerCase()
    const matchesSearch = (
      fullName.includes(searchLower) ||
      (challan.student?.admission_number || '').toLowerCase().includes(searchLower) ||
      (challan.challan_number || '').toLowerCase().includes(searchLower) ||
      (challan.student?.class?.class_name || '').toLowerCase().includes(searchLower)
    )

    const matchesStatus = statusFilter === 'all' || challan.status === statusFilter
    const matchesClass = classFilter === 'all' || challan.student?.class?.id === classFilter

    return matchesSearch && matchesStatus && matchesClass
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredChallans.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Generate page numbers to display (max 4 visible)
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

  const getFeePlanLabel = (plan) => {
    const labels = {
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'semi-annual': 'Semi-Annual',
      'annual': 'Annual'
    }
    return labels[plan] || plan
  }

  return (
    <div className="p-2 lg:p-4 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* Print Modal */}
      {showPrintModal && printChallan && (
        <PrintChallan
          challan={printChallan}
          school={school}
          onClose={() => {
            setShowPrintModal(false)
            setPrintChallan(null)
          }}
        />
      )}

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Collect Fee</h1>
        <p className="text-gray-600 text-sm">Search students and collect pending fees</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="md:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="md:w-40">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, admission number, challan number, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <p className="text-gray-600">
            Total challans: <span className="font-bold text-blue-600">{filteredChallans.length}</span>
          </p>
          <p className="text-gray-600">
            Pending: <span className="font-bold text-yellow-600">{filteredChallans.filter(c => c.status === 'pending').length}</span>
          </p>
          <p className="text-gray-600">
            Paid: <span className="font-bold text-green-600">{filteredChallans.filter(c => c.status === 'paid').length}</span>
          </p>
          <p className="text-gray-600">
            Overdue: <span className="font-bold text-red-600">{filteredChallans.filter(c => c.status === 'overdue').length}</span>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Student Name</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Admission No.</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Class</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Fee Plan</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Amount</th>
                <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedChallans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center text-gray-500">
                    No challans found
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan, index) => (
                  <tr
                    key={challan.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition ${challan.status === 'paid' ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-3 py-2.5 text-gray-700 border border-gray-200">{startIndex + index + 1}</td>
                    <td className="px-3 py-2.5 text-gray-900 font-medium border border-gray-200">
                      {challan.student?.first_name} {challan.student?.last_name}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 border border-gray-200">{challan.student?.admission_number}</td>
                    <td className="px-3 py-2.5 text-gray-700 border border-gray-200">
                      {challan.student?.class?.class_name || 'N/A'}
                      {challan.student?.section?.section_name ? ` - ${challan.student.section.section_name}` : ''}
                    </td>
                    <td className="px-3 py-2.5 text-center border border-gray-200">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                        {getFeePlanLabel(challan.fee_plan)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-900 font-bold border border-gray-200">
                      Rs. {parseFloat(challan.total_amount).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-center border border-gray-200">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        challan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        challan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center border border-gray-200">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewChallan(challan)}
                          className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 transition"
                          title="View & Print"
                        >
                          <Eye size={14} />
                        </button>
                        {(challan.status === 'pending' || challan.status === 'overdue') && (
                          <button
                            onClick={() => handleSelectChallan(challan)}
                            className="bg-red-600 text-white px-2.5 py-1 rounded hover:bg-red-700 transition text-xs font-medium"
                          >
                            Collect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredChallans.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredChallans.length)} of {filteredChallans.length} challans
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  currentPage === 1
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof page === 'number' && goToPage(page)}
                  className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition ${
                    page === currentPage
                      ? 'bg-blue-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  currentPage === totalPages
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedChallan && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowPaymentModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[10000] flex flex-col border-l border-gray-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold">Collect Fee</h3>
                  <p className="text-blue-200 text-xs mt-0.5">
                    {selectedChallan.student?.first_name} {selectedChallan.student?.last_name} - {selectedChallan.student?.admission_number}
                  </p>
                  <p className="text-blue-300 text-xs">
                    Challan: {selectedChallan.challan_number}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white hover:bg-white/10 p-1.5 rounded-full transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {/* Challan Details */}
              <div className="mb-4">
                <h4 className="text-gray-800 font-bold mb-2 text-sm">Challan Details</h4>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Challan Number:</span>
                      <span className="font-semibold text-gray-800">{selectedChallan.challan_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee Plan:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">{selectedChallan.fee_plan || 'Monthly'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        selectedChallan.status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedChallan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedChallan.status.charAt(0).toUpperCase() + selectedChallan.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 text-sm">Total Amount:</span>
                    <span className="font-bold text-gray-800">
                      Rs. {parseFloat(selectedChallan.total_amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 text-sm">Already Paid:</span>
                    <span className="font-semibold text-green-600">
                      Rs. {parseFloat(selectedChallan.paid_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="font-bold text-gray-800 text-sm">Balance Due:</span>
                    <span className="font-bold text-red-600 text-base">
                      Rs. {(parseFloat(selectedChallan.total_amount) - parseFloat(selectedChallan.paid_amount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Amount to Pay <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentData.amountPaid}
                    onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  />
                </div>

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online Transfer</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                {paymentData.paymentMethod === 'cheque' && (
                  <>
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                        Cheque Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter cheque number"
                        value={paymentData.chequeNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, chequeNumber: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                      />
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter bank name"
                        value={paymentData.bankName}
                        onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                      />
                    </div>
                  </>
                )}

                {(paymentData.paymentMethod === 'online' || paymentData.paymentMethod === 'bank_transfer') && (
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                    <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter transaction ID"
                      value={paymentData.transactionId}
                      onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                    />
                  </div>
                )}

                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <label className="block text-gray-800 font-semibold mb-2 text-xs uppercase tracking-wide">
                    Remarks
                  </label>
                  <textarea
                    placeholder="Enter remarks (optional)"
                    value={paymentData.remarks}
                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-3 bg-white">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-1.5 text-gray-700 font-normal hover:bg-gray-100 rounded transition border border-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="px-4 py-1.5 bg-red-600 text-white font-normal rounded hover:bg-red-700 transition flex items-center gap-1.5 text-sm"
                >
                  <CheckCircle size={14} />
                  Collect Payment
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
