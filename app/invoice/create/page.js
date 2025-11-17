'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoiceFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [pktTime, setPktTime] = useState('');

  // Live PKT Clock
  useEffect(() => {
    const updatePKT = () => {
      const now = new Date();
      setPktTime(
        new Intl.DateTimeFormat('en-PK', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now)
      );
    };
    updatePKT();
    const interval = setInterval(updatePKT, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
    if (editId) fetchInvoice(editId);
  }, [editId]);

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('patient_id, name');
    setPatients(data || []);
  };

  const fetchDoctors = async () => {
    const { data } = await supabase.from('doctors').select('doctor_id, name, consultation_fee');
    setDoctors(data || []);
  };

  const fetchInvoice = async (id) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Error loading invoice');
    } else if (data) {
      setPatientId(data.patient_id || '');
      setDoctorId(data.doctor_id || '');
      setInvoiceDate(data.invoice_date || invoiceDate);
      setServices(data.services || []);
      setPayments(data.payments || []);
      setNotes(data.notes || '');
    }
    setLoading(false);
  };

  const calculate = () => {
    const servicesTotal = services.reduce((a, s) => a + (Number(s.amount) || 0), 0);
    const discount = services.reduce((a, s) => a + (Number(s.discount) || 0), 0);
    const paid = payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
    const net = servicesTotal - discount;
    const due = net - paid;
    return { servicesTotal, discount, net, paid, due };
  };

  const { servicesTotal, discount, net, paid, due } = calculate();

  const saveInvoice = async () => {
    if (!patientId || !doctorId) {
      toast.error('Please select a patient and doctor.');
      return;
    }
    if (services.length === 0) {
      toast.error('Please add at least one service.');
      return;
    }

    setLoading(true);

    const doctor = doctors.find(d => d.doctor_id == doctorId);
    const patient = patients.find(p => p.patient_id === patientId);

    const payload = {
      patient_id: patientId,
      patient_name: patient?.name || '',
      doctor_id: doctorId,
      doctor_name: doctor?.name || '',
      doctor_fee: doctor?.consultation_fee || 0,

      services: services.length > 0 ? services : [],
      payments: payments.length > 0 ? payments : [],

      services_total: servicesTotal,
      discount: discount,
      total_amount: net,

      payment_method: payments[0]?.mode || 'Cash',
      status: due <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid',

      invoice_date: invoiceDate,
      notes: notes || null,
    };

    try {
      let error;

      if (editId) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update(payload)
          .eq('id', editId);
        error = updateError;
      } else {
        payload.invoice_number = `INV-${Date.now()}`;
        const { error: insertError } = await supabase
          .from('invoices')
          .insert([payload])
          .select();
        error = insertError;
      }

      if (error) throw error;

      toast.success(`Invoice ${editId ? 'updated' : 'created'} successfully!`, {
        duration: 5000,
      });

      router.push('/invoice');
    } catch (err) {
      console.error('Supabase error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-purple-50 via-pink-50 to-teal-50 min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-purple-100 shadow-lg mb-6">
        <div className="flex justify-between items-center p-4">
          <button
            onClick={() => router.push('/invoice')}
            className="flex items-center gap-2 text-purple-700 hover:text-purple-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Invoices
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {editId ? 'Edit' : 'Create New'} Invoice
            </h1>
            <p className="text-xs text-purple-600 mt-1">November 15, 2025 • {pktTime} PKT</p>
          </div>
          <div className="flex items-center gap-2 text-purple-700 font-medium">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="font-mono">{pktTime}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Full Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient & Doctor */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/40">
            <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Invoice Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-purple-700">Patient *</label>
                <select
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition"
                >
                  <option value="">Select Patient</option>
                  {patients.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name} (ID: {p.patient_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-purple-700">Attending Doctor *</label>
                <select
                  value={doctorId}
                  onChange={e => setDoctorId(e.target.value)}
                  className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map(d => (
                    <option key={d.doctor_id} value={d.doctor_id}>
                      {d.name} (Rs. {d.consultation_fee || 0})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-purple-700">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/40">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Services & Charges *
              </h3>
              <button
                onClick={() => setServices([...services, { treatment: '', amount: 0, discount: 0 }])}
                className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1 transition"
              >
                <Plus className="w-4 h-4" /> Add Service
              </button>
            </div>

            <div className="border border-purple-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <tr>
                    <th className="text-left p-3 font-bold">SERVICE / TREATMENT</th>
                    <th className="text-right p-3 font-bold">CHARGES</th>
                    <th className="text-right p-3 font-bold">DISCOUNT</th>
                    <th className="text-right p-3 font-bold">SUB TOTAL</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white/50">
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-purple-500 italic">
                        No services added. Click "Add Service" to begin.
                      </td>
                    </tr>
                  ) : (
                    services.map((s, i) => (
                      <tr key={i} className="border-b border-purple-100 hover:bg-purple-50/30 transition">
                        <td className="p-2">
                          <input
                            value={s.treatment || ''}
                            onChange={e => {
                              const ns = [...services];
                              ns[i].treatment = e.target.value;
                              setServices(ns);
                            }}
                            placeholder="e.g. Consultation, X-Ray"
                            className="w-full p-2 border border-purple-200 rounded-lg text-sm focus:ring-1 focus:ring-purple-600"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={s.amount || 0}
                            onChange={e => {
                              const ns = [...services];
                              ns[i].amount = Number(e.target.value) || 0;
                              setServices(ns);
                            }}
                            className="w-24 p-2 border border-purple-200 rounded-lg text-sm text-right focus:ring-1 focus:ring-purple-600"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={s.discount || 0}
                            onChange={e => {
                              const ns = [...services];
                              ns[i].discount = Number(e.target.value) || 0;
                              setServices(ns);
                            }}
                            className="w-24 p-2 border border-purple-200 rounded-lg text-sm text-right focus:ring-1 focus:ring-purple-600"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-purple-700">
                          Rs. {((s.amount || 0) - (s.discount || 0)).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setServices(services.filter((_, idx) => idx !== i))}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/40">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Record Payments
              </h3>
              <button
                onClick={() => setPayments([...payments, { date: invoiceDate, amount: 0, mode: 'Cash' }])}
                className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1 transition"
              >
                <Plus className="w-4 h-4" /> Add Payment
              </button>
            </div>

            <div className="border border-purple-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <tr>
                    <th className="text-left p-3 font-bold">DATE</th>
                    <th className="text-right p-3 font-bold">AMOUNT</th>
                    <th className="text-left p-3 font-bold">MODE</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white/50">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-purple-500 italic">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p, i) => (
                      <tr key={i} className="border-b border-purple-100 hover:bg-purple-50/30 transition">
                        <td className="p-2">
                          <input
                            type="date"
                            value={p.date || ''}
                            onChange={e => {
                              const np = [...payments];
                              np[i].date = e.target.value;
                              setPayments(np);
                            }}
                            className="w-full p-2 border border-purple-200 rounded-lg text-sm focus:ring-1 focus:ring-purple-600"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={p.amount || 0}
                            onChange={e => {
                              const np = [...payments];
                              np[i].amount = Number(e.target.value) || 0;
                              setPayments(np);
                            }}
                            className="w-28 p-2 border border-purple-200 rounded-lg text-sm text-right focus:ring-1 focus:ring-purple-600"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={p.mode || 'Cash'}
                            onChange={e => {
                              const np = [...payments];
                              np[i].mode = e.target.value;
                              setPayments(np);
                            }}
                            className="w-full p-2 border border-purple-200 rounded-lg text-sm focus:ring-1 focus:ring-purple-600"
                          >
                            <option>Cash</option>
                            <option>Card</option>
                            <option>Bank Transfer</option>
                            <option>UPI</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setPayments(payments.filter((_, idx) => idx !== i))}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/40">
            <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
              Additional Notes
            </h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special instructions, follow-ups, or remarks..."
              className="w-full p-3 border border-purple-200 rounded-xl h-28 resize-none focus:ring-2 focus:ring-purple-600 transition"
            />
          </div>
        </div>

        {/* Right: Financial Summary (Sticky) */}
        <div className="space-y-6">
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/40 sticky top-24">
            <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Financial Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-700 font-medium">Gross Total:</span>
                <span className="font-bold">Rs. {servicesTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span className="font-medium">Total Discount:</span>
                <span className="font-bold">- Rs. {discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-purple-200 pt-3">
                <span className="text-purple-700 font-medium">Sub Total:</span>
                <span className="font-bold">Rs. {net.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700 font-medium">Total Paid:</span>
                <span className="font-bold text-green-600">Rs. {paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-extrabold border-t border-purple-200 pt-4">
                <span className={due > 0 ? 'text-red-600' : 'text-green-600'}>
                  BALANCE DUE:
                </span>
                <span className={due > 0 ? 'text-red-600' : 'text-green-600'}>
                  Rs. {due.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={saveInvoice}
              disabled={loading || !patientId || !doctorId || services.length === 0}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all transform hover:scale-105 ${
                loading || !patientId || !doctorId || services.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                'Saving Invoice...'
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  {editId ? 'Update' : 'Create'} Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}