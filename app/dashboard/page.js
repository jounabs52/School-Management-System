// app/dashboard/page.js
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, Users, DollarSign, Clock, TrendingUp, Activity,
  Plus, X, Edit, Trash2, ChevronLeft, ChevronRight,
  Search, AlertCircle, User, Stethoscope
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';

// ---------------------------------------------------
// 1. Supabase client
// ---------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------
// 2. Helper functions
// ---------------------------------------------------
const formatTime12 = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${m} ${ampm}`;
};

const add30Minutes = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  d.setMinutes(d.getMinutes() + 30);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// ---------------------------------------------------
// 3. StatCard component
// ---------------------------------------------------
function StatCard({ title, value, change, icon: Icon, color }) {
  const colors = {
    blue: 'bg-gradient-to-r from-blue-500 to-purple-600',
    green: 'bg-gradient-to-r from-green-500 to-teal-500',
    purple: 'bg-gradient-to-r from-purple-500 to-pink-600',
    orange: 'bg-gradient-to-r from-orange-500 to-red-500',
  };
  const txt = change > 0 ? `+${change}%` : `${change}%`;
  const txtCls = change >= 0 ? 'text-green-200' : 'text-red-200';
  return (
    <div className={`p-4 rounded-xl text-white shadow-lg ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="w-6 h-6 opacity-80" />
      </div>
      <p className={`text-xs mt-1 ${txtCls}`}>{txt}</p>
    </div>
  );
}

// ---------------------------------------------------
// 4. FULL BOOKING MODAL (Your Original – Enhanced)
// ---------------------------------------------------
const BookingModal = ({
  isOpen, onClose, onSaveSuccess,
  selectedAppointment, doctors, patients
}) => {
  const isEdit = !!selectedAppointment?.appointment_id;
  const getInitialBooking = () => ({
    doctor_id: selectedAppointment?.doctor_id || '',
    patient_id: selectedAppointment?.patient_id || '',
    appointment_date: selectedAppointment?.appointment_datetime?.split('T')[0] || '',
    start_time: selectedAppointment?.start_time || '',
    end_time: selectedAppointment?.end_time || '',
    fee: selectedAppointment?.fee || '',
    notes: selectedAppointment?.notes || '',
    status: selectedAppointment?.status || 'Scheduled',
    appointment_type: selectedAppointment?.reason || 'Standard',
  });

  const [booking, setBooking] = useState(getInitialBooking);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setBooking(getInitialBooking());
      setStep(1);
      setPatientSearch('');
    }
  }, [isOpen, selectedAppointment]);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients;
    const lower = patientSearch.toLowerCase();
    return patients.filter(p =>
      p.name?.toLowerCase().includes(lower) ||
      p.phone?.includes(lower) ||
      p.mr_number?.toLowerCase().includes(lower)
    );
  }, [patientSearch, patients]);

  const selectedPatient = useMemo(() =>
    patients.find(p => p.patient_id === booking.patient_id),
    [booking.patient_id, patients]
  );

  const loadAvailableSlots = useCallback(async () => {
    const { doctor_id, appointment_date } = booking;
    if (!doctor_id || !appointment_date) {
      setAvailableSlots([]);
      return;
    }

    const { data: booked, error } = await supabase
      .from('appointments')
      .select('appointment_datetime')
      .eq('doctor_id', doctor_id)
      .gte('appointment_datetime', `${appointment_date}T00:00:00`)
      .lt('appointment_datetime', `${appointment_date}T23:59:59`)
      .is('deleted_at', null);

    if (error) {
      toast.error('Failed to load slots');
      return;
    }

    const bookedTimes = booked?.map(b => b.appointment_datetime.split('T')[1].slice(0, 5)) || [];
    const currentEditTime = isEdit && selectedAppointment.appointment_datetime.split('T')[0] === appointment_date
      ? selectedAppointment.start_time : null;

    const slots = [];
    for (let h = 9; h < 21; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if (!bookedTimes.includes(time) || time === currentEditTime) slots.push(time);
      }
    }
    setAvailableSlots(slots);
  }, [booking.doctor_id, booking.appointment_date, isEdit, selectedAppointment]);

  useEffect(() => {
    if (step === 2 && booking.doctor_id && booking.appointment_date) loadAvailableSlots();
  }, [step, booking.doctor_id, booking.appointment_date, loadAvailableSlots]);

  const saveAppointment = async () => {
    if (!booking.doctor_id || !booking.patient_id || !booking.appointment_date || !booking.start_time || !booking.fee) {
      toast.error('Please fill all required fields.');
      return;
    }

    setLoading(true);
    const datetime = `${booking.appointment_date}T${booking.start_time}:00`;
    const payload = {
      patient_id: booking.patient_id,
      doctor_id: booking.doctor_id,
      appointment_datetime: datetime,
      status: booking.status,
      notes: booking.notes,
      fee: parseInt(booking.fee, 10),
      reason: booking.appointment_type,
    };

    try {
      const { error } = isEdit
        ? await supabase.from('appointments').update(payload).eq('appointment_id', selectedAppointment.appointment_id)
        : await supabase.from('appointments').insert(payload);

      if (error) throw error;

      toast.success(isEdit ? 'Appointment updated!' : 'Appointment booked!');
      onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const Step1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">1. Select Doctor & Patient</h3>
      <div>
        <label className="block text-sm font-semibold mb-2">Select Doctor *</label>
        <select
          value={booking.doctor_id}
          onChange={e => setBooking(p => ({ ...p, doctor_id: e.target.value }))}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="">-- Choose a Doctor --</option>
          {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-2">Search & Select Patient *</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Name, Phone, MR No."
            value={patientSearch}
            onChange={e => setPatientSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {patientSearch && filteredPatients.length > 0 && (
          <div className="max-h-36 overflow-y-auto border rounded-lg bg-white shadow mt-2">
            <select
              value={booking.patient_id}
              onChange={e => { setBooking(p => ({ ...p, patient_id: e.target.value })); setPatientSearch(''); }}
              className="w-full px-4 py-3 border-none focus:outline-none"
              size={Math.min(filteredPatients.length, 5)}
            >
              <option value="">-- Select Patient --</option>
              {filteredPatients.map(p => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.name} ({p.phone}) {p.mr_number ? `[MR: ${p.mr_number}]` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        {!patientSearch && selectedPatient && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm font-medium mt-2">
            Selected: <strong>{selectedPatient.name}</strong> ({selectedPatient.phone})
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          onClick={nextStep}
          disabled={!booking.doctor_id || !booking.patient_id}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
        >
          Next <ChevronRight className="w-5 h-5"/>
        </button>
      </div>
    </div>
  );

  const Step2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">2. Schedule & Time Slot</h3>
      <div>
        <label className="block text-sm font-semibold mb-2">Appointment Date *</label>
        <input
          type="date"
          value={booking.appointment_date}
          onChange={e => setBooking(p => ({ ...p, appointment_date: e.target.value, start_time: '', end_time: '' }))}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
        />
      </div>
      {booking.doctor_id && booking.appointment_date && (
        <div>
          <label className="block text-sm font-semibold mb-2">Available Slots (9 AM - 9 PM)</label>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
            {availableSlots.length > 0 ? availableSlots.map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => setBooking(p => ({ ...p, start_time: slot, end_time: add30Minutes(slot) }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  booking.start_time === slot ? 'bg-purple-600 text-white' : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                }`}
              >
                {formatTime12(slot)}
              </button>
            )) : (
              <p className="col-span-4 text-center text-gray-500 py-4">
                {isEdit ? 'Current slot selected.' : 'No slots available.'}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Start Time *</label>
          <input
            type="time"
            value={booking.start_time}
            onChange={e => setBooking(p => ({ ...p, start_time: e.target.value, end_time: add30Minutes(e.target.value) }))}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">End Time (Auto +30m)</label>
          <input
            type="time"
            value={booking.end_time}
            readOnly
            className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-600"
          />
        </div>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5"/>
        <p className="text-sm text-yellow-800">Double-booking will be blocked on save.</p>
      </div>
      <div className="flex justify-between">
        <button onClick={prevStep} className="flex items-center gap-2 px-6 py-3 border rounded-xl text-gray-700 hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5"/> Back
        </button>
        <button
          onClick={nextStep}
          disabled={!booking.appointment_date || !booking.start_time}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
        >
          Next <ChevronRight className="w-5 h-5"/>
        </button>
      </div>
    </div>
  );

  const Step3 = () => {
    const patient = patients.find(p => p.patient_id === booking.patient_id) || {};
    const doctor = doctors.find(d => d.doctor_id === booking.doctor_id) || {};
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold">3. Details & Confirmation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Appointment Type *</label>
            <select
              value={booking.appointment_type}
              onChange={e => setBooking(p => ({ ...p, appointment_type: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option>Standard</option>
              <option>Emergency</option>
              <option>Follow-up</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Status *</label>
            <select
              value={booking.status}
              onChange={e => setBooking(p => ({ ...p, status: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option>Scheduled</option>
              <option>Completed</option>
              <option>Cancelled</option>
              <option>No Show</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Fee (PKR) *</label>
          <input
            type="number"
            value={booking.fee}
            onChange={e => setBooking(p => ({ ...p, fee: e.target.value }))}
            placeholder="e.g., 2000"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Notes / Reason</label>
          <textarea
            value={booking.notes}
            onChange={e => setBooking(p => ({ ...p, notes: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-bold text-purple-800 mb-2">Summary:</h4>
          <div className="text-sm space-y-1">
            <p><strong>Doctor:</strong> {doctor.name}</p>
            <p><strong>Patient:</strong> {patient.name} ({patient.phone})</p>
            <p><strong>Date & Time:</strong> {booking.appointment_date} @ {formatTime12(booking.start_time)}</p>
            <p><strong>Type:</strong> {booking.appointment_type}</p>
            <p><strong>Status:</strong> {booking.status}</p>
          </div>
        </div>
        <div className="flex justify-between">
          <button onClick={prevStep} className="flex items-center gap-2 px-6 py-3 border rounded-xl text-gray-700 hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5"/> Back
          </button>
          <button
            onClick={saveAppointment}
            disabled={loading || !booking.fee}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Book'}
          </button>
        </div>
      </div>
    );
  };

  const stepTitles = ['Doctor & Patient', 'Schedule', 'Confirm'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600"/>
            {isEdit ? 'Edit Appointment' : 'New Appointment'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="flex justify-around p-6 pt-8 pb-4 border-b">
          {stepTitles.map((t, i) => (
            <div key={i} className="flex flex-col items-center w-1/3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${step === i + 1 ? 'bg-purple-600' : 'bg-gray-300'}`}>
                {i + 1}
              </div>
              <p className={`mt-2 text-sm ${step === i + 1 ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>{t}</p>
            </div>
          ))}
        </div>
        <div className="p-6">
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------
// 5. Main Dashboard component (Your Layout – Improved)
// ---------------------------------------------------
export default function DashboardPage() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    todayRevenue: 0,
    pendingAppointments: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchPatients(),
        fetchRevenue(),
        fetchDoctors(),
        fetchPatientsList(),
      ]);
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*');
    const todayAppts = data?.filter(a => a.appointment_datetime?.startsWith(todayStr)) || [];
    const pending = data?.filter(a => a.status === 'Scheduled') || [];
    setAppointments(data || []);
    setStats(s => ({
      ...s,
      todayAppointments: todayAppts.length,
      pendingAppointments: pending.length,
    }));
  };

  const fetchPatients = async () => {
    const { count } = await supabase.from('patients').select('*', { count: 'exact', head: true });
    setStats(s => ({ ...s, totalPatients: count || 0 }));
  };

  const fetchRevenue = async () => {
    const { data } = await supabase.from('appointments').select('fee').ilike('appointment_datetime', `${todayStr}%`);
    const sum = data?.reduce((a, b) => a + (b.fee || 0), 0) || 0;
    setStats(s => ({ ...s, todayRevenue: sum }));
  };

  const fetchDoctors = async () => {
    const { data } = await supabase.from('doctors').select('*');
    setDoctors(data || []);
  };

  const fetchPatientsList = async () => {
    const { data } = await supabase.from('patients').select('patient_id, name, phone, mr_number');
    setPatients(data || []);
  };

  useEffect(() => {
    refreshAll();

    const channels = [
      supabase.channel('appointments').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, refreshAll).subscribe(),
      supabase.channel('patients').on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, refreshAll).subscribe(),
      supabase.channel('doctors').on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, fetchDoctors).subscribe(),
    ];

    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-3 sm:space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Dashboard Overview</h2>
            <p className="text-xs sm:text-sm text-gray-600">Monitor your clinic's daily operations</p>
          </div>
          <button
            onClick={() => { setSelectedAppointment(null); setShowBookingModal(true); }}
            className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Today's Appointments" value={stats.todayAppointments} change={12} icon={Calendar} color="blue" />
          <StatCard title="Total Patients" value={stats.totalPatients} change={0} icon={Users} color="green" />
          <StatCard title="Today's Revenue" value={`PKR ${stats.todayRevenue.toLocaleString()}`} change={8} icon={DollarSign} color="purple" />
          <StatCard title="Pending Appointments" value={stats.pendingAppointments} change={0} icon={Clock} color="orange" />
        </div>

        {/* Quick Stats + Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" /> Quick Statistics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Consultation Rate', value: '87%', icon: Activity, color: 'blue' },
                { label: 'Patient Satisfaction', value: '94%', icon: TrendingUp, color: 'green' },
                { label: 'New Patients This Month', value: '45', icon: Users, color: 'purple' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <s.icon className={`w-8 h-8 mx-auto mb-1 text-${s.color}-600`} />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-gray-600">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold mb-3">Upcoming Events</h3>
            <div className="space-y-3">
              {[
                { title: 'Staff Meeting', description: 'Discuss monthly performance', time: '2:00 PM - 3:00 PM', date: 'Today', color: 'blue' },
                { title: 'Equipment Maintenance', description: 'Ultrasound machine servicing', time: '10:00 AM - 12:00 PM', date: 'Tomorrow', color: 'orange' },
              ].map((e, i) => (
                <div key={i} className={`p-2 rounded-lg bg-${e.color}-50`}>
                  <p className="font-medium text-sm">{e.title}</p>
                  <p className="text-xs text-gray-600">{e.description}</p>
                  <p className="text-xs mt-1">{e.time} • {e.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Quick Actions</h3>
              <Activity className="w-4 h-4 text-purple-500" />
            </div>
            <div className="space-y-1.5">
              <button onClick={() => { setSelectedAppointment(null); setShowBookingModal(true); }} className="w-full text-left px-3 py-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-xs">
                New Appointment
              </button>
              <button className="w-full text-left px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-xs">Add Patient</button>
              <button className="w-full text-left px-3 py-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 text-xs">Generate Report</button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">System Status</h3>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span>Server</span><span className="text-green-600">Online</span></div>
              <div className="flex justify-between"><span>Database</span><span className="text-green-600">Connected</span></div>
              <div className="flex justify-between"><span>Last Backup</span><span>2 hrs ago</span></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Recent Activity</h3>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xs space-y-2">
              <div><p className="text-gray-600">New patient registered</p><p className="text-gray-400">5 min ago</p></div>
              <div><p className="text-gray-600">Appointment confirmed</p><p className="text-gray-400">15 min ago</p></div>
              <div><p className="text-gray-600">Report generated</p><p className="text-gray-400">1 hr ago</p></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:col-span-1">
            <h3 className="text-sm font-semibold mb-2">Today's Appointments</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {appointments
                .filter(a => a.appointment_datetime?.startsWith(todayStr))
                .map(ap => (
                  <div key={ap.appointment_id} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium">{ap.reason || 'Consultation'}</p>
                      <p className="text-gray-500">
                        {new Date(ap.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedAppointment(ap); setShowBookingModal(true); }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              {appointments.filter(a => a.appointment_datetime?.startsWith(todayStr)).length === 0 && (
                <p className="text-gray-400 text-xs">No appointments today</p>
              )}
            </div>
          </div>
        </div>

        {/* BOOKING MODAL */}
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => { setShowBookingModal(false); setSelectedAppointment(null); }}
          onSaveSuccess={refreshAll}
          selectedAppointment={selectedAppointment}
          doctors={doctors}
          patients={patients}
        />
      </div>
    </>
  );
}