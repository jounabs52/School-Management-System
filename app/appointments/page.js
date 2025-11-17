// app/appointments/page.js
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar, Grid, Clock, FileSpreadsheet, FileText,
  Plus, X, AlertCircle, Edit, Trash2, Printer, Eye, ChevronLeft, ChevronRight,
  User, Stethoscope, DollarSign, Search // Added Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- THEME CONSTANTS ---
const PRIMARY_BG_CLASS = 'bg-purple-600';
const PRIMARY_COLOR_CLASS = 'text-purple-600';
const GRADIENT_BG_CLASS = 'bg-gradient-to-r from-purple-500 to-purple-600';
const GRADIENT_HOVER_BG_CLASS = 'hover:from-purple-600 hover:to-purple-700';

// Convert 24h to 12h with AM/PM
const formatTime12 = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${m} ${ampm}`;
};

// --- HELPER COMPONENT for Cleaner Layout ---
const DetailItem = ({ label, value, icon: Icon, span }) => (
    <div className={`flex flex-col ${span === 2 ? 'md:col-span-2' : ''}`}>
        <p className="block text-sm font-medium text-gray-600 mb-0.5 flex items-center gap-1">
            {Icon && <Icon className="w-4 h-4 text-gray-400" />} {label}
        </p>
        <p className="text-base font-semibold text-gray-900 break-words">{value}</p>
    </div>
);

// --- VIEW MODAL COMPONENT (STYLED) ---
const ViewAppointmentModal = ({ isOpen, onClose, appointment, onEdit, onDelete, onPrint, formatTime12 }) => {
    if (!isOpen || !appointment) return null;

    const {
        patient_name,
        doctor_name,
        reason,
        appointment_datetime,
        start_time,
        end_time,
        status,
        fee,
        notes,
        phone,
    } = appointment;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const datePart = dateString.split('T')[0];
        return new Date(datePart).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formattedFee = fee ? `PKR ${Number(fee).toLocaleString()}` : 'N/A';

    const statusColors = {
        'Scheduled': 'text-purple-700 bg-purple-100 border-purple-300',
        'Completed': 'text-green-700 bg-green-100 border-green-300',
        'Cancelled': 'text-red-700 bg-red-100 border-red-300',
        'No Show': 'text-yellow-700 bg-yellow-100 border-yellow-300',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header: Purple-600 background */}
                <div className={`flex items-center justify-between p-6 ${PRIMARY_BG_CLASS} text-white border-b-4 border-purple-400`}>
                    <h3 className="text-2xl font-extrabold flex items-center gap-3">
                        <Calendar className="w-6 h-6" />
                        Appointment Details
                    </h3>
                    <button onClick={onClose} className="text-white opacity-90 hover:opacity-100 transition p-1 rounded-full bg-white/10">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Appointment Status */}
                    <div className={`w-full p-4 rounded-xl border-l-4 ${statusColors[status] || 'text-gray-700 bg-gray-100 border-gray-300'} font-semibold flex justify-between items-center shadow-sm`}>
                        <span>Status:</span>
                        <span className="text-xl">{status}</span>
                    </div>

                    {/* Date & Time Group */}
                    <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                        <h4 className={`text-xl font-bold mb-4 flex items-center gap-2 ${PRIMARY_COLOR_CLASS}`}>
                            <Clock className="w-5 h-5" />
                            Time & Scheduling
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem label="Date" value={formatDate(appointment_datetime)} icon={Calendar} />
                            <DetailItem label="Time" value={`${formatTime12(start_time)} - ${formatTime12(end_time)}`} icon={Clock} />
                            <DetailItem label="Type/Reason" value={reason || 'Standard'} span={2} />
                        </div>
                    </div>

                    {/* Patient and Doctor Information Group */}
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                        <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-600">
                            <User className="w-5 h-5" />
                            Parties Involved
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem label="Patient Name" value={patient_name} icon={User} />
                            <DetailItem label="Patient Phone" value={phone || 'N/A'} />
                            <DetailItem label="Doctor Name" value={doctor_name} icon={Stethoscope} span={2} />
                        </div>
                    </div>

                    {/* Financials & Notes Group */}
                    <div className="p-4 rounded-xl border border-green-200 bg-green-50/50">
                        <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-600">
                            <DollarSign className="w-5 h-5" />
                            Financials & Notes
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                            <DetailItem label="Consultation Fee" value={formattedFee} icon={DollarSign} />
                            <DetailItem label="Notes" value={notes || 'None'} span={2} />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={onPrint}
                        className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition font-medium shadow-sm flex items-center gap-2"
                    >
                        <Printer className="w-5 h-5" /> Print
                    </button>
                    <button
                        onClick={onEdit}
                        className={`px-6 py-2.5 text-white ${GRADIENT_BG_CLASS} rounded-xl ${GRADIENT_HOVER_BG_CLASS} transition font-semibold shadow-lg flex items-center gap-2`}
                    >
                        <Edit className="w-5 h-5" /> Edit
                    </button>
                    <button
                        onClick={onDelete} // This now triggers the delete confirmation modal
                        className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold shadow-lg flex items-center gap-2"
                    >
                        <Trash2 className="w-5 h-5" /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- DELETE CONFIRMATION MODAL ---
const DeleteConfirmationModal = ({ isOpen, onClose, appointment, onConfirm }) => {
    if (!isOpen || !appointment) return null;

    const handleDelete = () => {
        onConfirm(appointment.appointment_id);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-3xl w-full max-w-sm overflow-hidden">
                <div className="p-6 text-center">
                    <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4 p-2 bg-red-100 rounded-full" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
                    <p className="text-sm text-gray-600 mb-6">
                        Are you sure you want to delete the appointment for **{appointment.patient_name}** with **{appointment.doctor_name}**?
                        This action **cannot be undone** (soft delete).
                    </p>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold shadow-md"
                        >
                            <Trash2 className="w-4 h-4 mr-1 inline-block" /> Yes, Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- BOOKING MODAL STEPS COMPONENTS ---

const StepIndicator = ({ currentStep, totalSteps, title }) => (
  <div className="flex flex-col items-center w-1/3">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-all duration-300 ${
      currentStep === totalSteps ? 'bg-purple-600' : 'bg-gray-300'
    } ${currentStep > totalSteps ? 'bg-purple-400' : ''}`}>
      {totalSteps}
    </div>
    <p className={`mt-2 text-sm text-center transition-colors duration-300 ${
      currentStep === totalSteps ? 'text-purple-600 font-semibold' : 'text-gray-500'
    }`}>{title}</p>
  </div>
);

// --- UPDATED Step1Content with reliable patient search/selection logic ---
const Step1Content = ({ booking, setBooking, doctors, patients, nextStep, isEdit }) => {
    // Search logic for patients
    const [patientSearch, setPatientSearch] = useState('');
    
    const filteredPatients = useMemo(() => {
        if (!patientSearch) return patients;
        const searchLower = patientSearch.toLowerCase();
        return patients.filter(p => 
            p.name.toLowerCase().includes(searchLower) || 
            p.phone?.includes(searchLower) ||
            p.mr_number?.toLowerCase().includes(searchLower) // Assuming mr_number is part of patient data
        );
    }, [patientSearch, patients]);

    const handleSelectPatient = (e) => {
        setBooking(p => ({ ...p, patient_id: e.target.value }));
        // IMPORTANT FIX: Clear the search input after selecting a patient
        setPatientSearch(''); 
    };

    const isStepValid = booking.doctor_id && booking.patient_id;
    
    // Find the currently selected patient object for display
    const selectedPatient = useMemo(() => 
        patients.find(p => p.patient_id === booking.patient_id)
    , [booking.patient_id, patients]);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">1. Select Doctor & Patient</h3>
            
            {/* Select Doctor */}
            <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="select-doctor">Select Doctor *</label>
                <select
                    id="select-doctor"
                    value={booking.doctor_id}
                    onChange={e => setBooking(p => ({ ...p, doctor_id: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">-- Choose a Doctor --</option>
                    {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.name}</option>)}
                </select>
            </div>

            {/* Search & Select Patient */}
            <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="search-patient">Search & Select Patient *</label>
                <div className="relative">
                    <input
                        id="search-patient"
                        type="text"
                        placeholder="Search by Name, Phone, or MR No."
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                
                {/* Conditional Display of Selection Dropdown */}
                {patientSearch && filteredPatients.length > 0 && (
                    <div className="max-h-36 overflow-y-auto border rounded-lg bg-white shadow-inner mt-2">
                        <select
                            value={booking.patient_id}
                            onChange={handleSelectPatient}
                            className="w-full px-4 py-3 border-none focus:outline-none"
                            size={Math.min(filteredPatients.length, 5)}
                        >
                            <option value="">-- Select Patient Below --</option>
                            {filteredPatients.map(p => (
                                <option key={p.patient_id} value={p.patient_id}>
                                    {p.name} ({p.phone}) {p.mr_number ? `[MR: ${p.mr_number}]` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                {/* Display of Selected Patient (when search is empty) */}
                {!patientSearch && selectedPatient && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm font-medium mt-2">
                        Patient Selected: **{selectedPatient.name}** ({selectedPatient.phone})
                    </div>
                )}
                
                {/* No Patient Found Message */}
                {patientSearch && filteredPatients.length === 0 && (
                     <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mt-2">
                        No patient found for "{patientSearch}". Please check spelling or register the patient.
                    </div>
                )}

            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={nextStep}
                    disabled={!isStepValid}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition font-semibold"
                >
                    Next <ChevronRight className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};


const Step2Content = ({ booking, setBooking, availableSlots, loadAvailableSlots, add30Minutes, formatTime12, nextStep, prevStep, isEdit }) => {
    
    // Load slots when component mounts or dependencies change
    useEffect(() => {
        if (booking.doctor_id && booking.appointment_date) {
            loadAvailableSlots();
        }
    }, [booking.doctor_id, booking.appointment_date, loadAvailableSlots]);

    const isStepValid = booking.appointment_date && booking.start_time;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">2. Schedule & Time Slot</h3>

            {/* Appointment Date */}
            <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="appointment-date">Appointment Date *</label>
                <input
                    id="appointment-date"
                    type="date"
                    value={booking.appointment_date}
                    onChange={e => {
                        setBooking(p => ({ 
                            ...p, 
                            appointment_date: e.target.value,
                            start_time: '', // Reset time when date changes
                            end_time: ''
                        }));
                    }}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
            </div>
            
            {/* Availability Schedule */}
            {booking.doctor_id && booking.appointment_date && (
                <div>
                    <label className="block text-sm font-semibold mb-2">Available Time Slots (9 AM - 9 PM)</label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                        {availableSlots.length > 0 ? (
                            availableSlots.map(slot => (
                                <button
                                    key={slot}
                                    type="button"
                                    onClick={() => setBooking(p => ({ 
                                        ...p, 
                                        start_time: slot, 
                                        end_time: add30Minutes(slot) 
                                    }))}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                        booking.start_time === slot
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                                    }`}
                                >
                                    {formatTime12(slot)}
                                </button>
                            ))
                        ) : (
                            <p className="col-span-4 text-center text-gray-500 py-4">
                                {isEdit ? 'Current appointment time is pre-selected or no other slots available.' : 'No slots available for this doctor/date.'}
                            </p>
                        )}
                    </div>
                </div>
            )}
            
            {/* Start Time / End Time */}
            <div className="grid grid-cols-2 gap-4">
                {/* Start Time */}
                <div>
                    <label className="block text-sm font-semibold mb-2">Start Time *</label>
                    <input
                        type="time"
                        value={booking.start_time}
                        onChange={e => setBooking(p => ({ ...p, start_time: e.target.value, end_time: add30Minutes(e.target.value) }))}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                {/* End Time (Read Only) */}
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

            {/* Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5"/>
                <p className="text-sm text-yellow-800">
                    The database will check for time slot conflicts (double-booking the doctor) upon final submission.
                </p>
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={prevStep}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition font-semibold"
                >
                    <ChevronLeft className="w-5 h-5"/> Back
                </button>
                <button
                    onClick={nextStep}
                    disabled={!isStepValid}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition font-semibold"
                >
                    Next <ChevronRight className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};

const Step3Content = ({ booking, setBooking, saveAppointment, prevStep, loading, isEdit, doctors, patients, formatTime12 }) => {
    
    const patient = patients.find(p => p.patient_id === booking.patient_id) || {};
    const doctor = doctors.find(d => d.doctor_id === booking.doctor_id) || {};

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">3. Details & Confirmation</h3>
            
            {/* Appointment Type / Status */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-2" htmlFor="appointment-type">Appointment Type *</label>
                    <select
                        id="appointment-type"
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
                    <label className="block text-sm font-semibold mb-2" htmlFor="appointment-status">Appointment Status *</label>
                    <select
                        id="appointment-status"
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

            {/* Fee */}
            <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="fee">Fee (PKR) *</label>
                <input
                    id="fee"
                    type="number"
                    value={booking.fee}
                    onChange={e => setBooking(p => ({ ...p, fee: e.target.value }))}
                    placeholder="e.g., 2000"
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
            </div>

            {/* Notes / Reason for Visit */}
            <div>
                <label className="block text-sm font-semibold mb-2" htmlFor="notes">Notes / Reason for Visit</label>
                <textarea
                    id="notes"
                    value={booking.notes}
                    onChange={e => setBooking(p => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    placeholder="Enter any additional notes or reason for the appointment..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
            </div>
            
            {/* Final Summary */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="text-md font-bold text-purple-800 mb-2">Final Summary:</h4>
                <div className="text-sm space-y-1">
                    <p><strong>Doctor:</strong> {doctor.name}</p>
                    <p><strong>Patient:</strong> {patient.name} ({patient.phone})</p>
                    <p><strong>Date & Time:</strong> {booking.appointment_date} @ {formatTime12(booking.start_time)}</p>
                    <p><strong>Type:</strong> {booking.appointment_type}</p>
                    <p><strong>Status:</strong> {booking.status}</p>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={prevStep}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition font-semibold"
                >
                    <ChevronLeft className="w-5 h-5"/> Back
                </button>
                <button
                    onClick={saveAppointment}
                    disabled={loading || !booking.fee}
                    className="ml-auto px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition font-semibold"
                >
                    {loading ? 'Saving...' : isEdit ? 'Update Appointment' : 'Confirm Booking'}
                </button>
            </div>
        </div>
    );
};


const BookingModal = ({ 
    isOpen, onClose, 
    onSaveSuccess, selectedAppointment, formatTime12, 
    add30Minutes, doctors, patients 
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
        appointment_type: selectedAppointment?.reason || 'Standard' // Maps to DB reason
    });

    const [booking, setBooking] = useState(getInitialBooking);
    const [loading, setLoading] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [step, setStep] = useState(1); // 1, 2, or 3

    useEffect(() => {
        if (isOpen) {
            setBooking(getInitialBooking());
            setStep(1); // Reset to first step on open
        }
    }, [isOpen, selectedAppointment]);


    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);
    
    
    const loadAvailableSlots = useCallback(async () => {
        const date = booking.appointment_date;
        const doctorId = booking.doctor_id;

        if (!date || !doctorId) {
            setAvailableSlots([]);
            return;
        }

        const { data: booked, error } = await supabase
            .from('appointments')
            .select('appointment_datetime')
            .eq('doctor_id', doctorId)
            .gte('appointment_datetime', `${date}T00:00:00`)
            .lt('appointment_datetime', `${date}T23:59:59`)
            .is('deleted_at', null);

        if (error) {
            console.error(error);
            return;
        }

        const bookedTimes = booked.map(b => b.appointment_datetime.split('T')[1].slice(0, 5));
        
        // Exclude the currently editing appointment's time slot
        const currentEditTime = isEdit && selectedAppointment.appointment_datetime.split('T')[0] === date
            ? selectedAppointment.start_time : null;
        
        const slots = [];
        const startHour = 9;
        const endHour = 21; // 9 PM

        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += 30) {
                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                
                if (bookedTimes.includes(time) && time !== currentEditTime) {
                    continue;
                }
                slots.push(time);
            }
        }

        setAvailableSlots(slots);
    }, [booking.appointment_date, booking.doctor_id, isEdit, selectedAppointment]);
    
    // Load available slots when doctor + date selected (Step 2)
    useEffect(() => {
        if (step === 2 && booking.doctor_id && booking.appointment_date) {
            loadAvailableSlots();
        } else {
            setAvailableSlots([]);
        }
    }, [step, booking.doctor_id, booking.appointment_date, loadAvailableSlots]);


    const saveAppointment = async () => {
        if (!booking.doctor_id || !booking.patient_id || !booking.appointment_date || !booking.start_time || !booking.fee) {
            alert('Please fill all required fields in all steps.');
            return;
        }
        
        setLoading(true);
        const datetime = `${booking.appointment_date}T${booking.start_time}:00`;

        try {
            const payload = {
                patient_id: booking.patient_id,
                doctor_id: booking.doctor_id,
                appointment_datetime: datetime,
                status: booking.status,
                notes: booking.notes,
                fee: parseInt(booking.fee, 10),
                reason: booking.appointment_type // Mapped 'Appointment Type' to DB 'reason'
            };

            let result;
            if (isEdit) {
                result = await supabase
                    .from('appointments')
                    .update(payload)
                    .eq('appointment_id', selectedAppointment.appointment_id);
            } else {
                result = await supabase
                    .from('appointments')
                    .insert(payload);
            }

            if (result.error) {
                if (result.error.code === '23505' || result.error.message.includes('unique')) {
                    alert('Conflict: This time slot is already booked for the selected doctor.');
                } else {
                    alert('Error: ' + result.error.message);
                }
                setLoading(false);
                return;
            }

            onSaveSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Unexpected error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const currentContent = () => {
        switch(step) {
            case 1:
                return <Step1Content {...{ booking, setBooking, doctors, patients, nextStep, isEdit }} />;
            case 2:
                return <Step2Content {...{ booking, setBooking, availableSlots, loadAvailableSlots, add30Minutes, formatTime12, nextStep, prevStep, isEdit }} />;
            case 3:
                return <Step3Content {...{ booking, setBooking, saveAppointment, prevStep, loading, isEdit, doctors, patients, formatTime12 }} />;
            default:
                return null;
        }
    };

    const stepTitles = [
        'Select Doctor & Patient', 
        'Schedule & Time Slot', 
        'Details & Confirmation'
    ];


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-purple-600"/>
                        {isEdit ? 'Edit Appointment' : 'Book New Appointment'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex justify-around p-6 pt-8 pb-4 border-b">
                    {stepTitles.map((title, index) => (
                        <StepIndicator 
                            key={index}
                            currentStep={step}
                            totalSteps={index + 1}
                            title={title}
                        />
                    ))}
                </div>

                <div className="p-6">
                    {currentContent()}
                </div>
            </div>
        </div>
    );
};


// --- MAIN APPOINTMENTS PAGE COMPONENT ---
export default function AppointmentsPage() {
  const [view, setView] = useState('week');
  const [events, setEvents] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  
  const calendarRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [appointmentsRes, doctorsRes, patientsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            appointment_id,
            doctor_id,
            patient_id,
            appointment_datetime,
            reason,
            status,
            notes,
            fee,
            created_at,
            deleted_at,
            patients (name, phone),
            doctors (name)
          `) 
          .is('deleted_at', null),
        supabase.from('doctors').select('doctor_id, name').is('deleted_at', null),
        supabase.from('patients').select('patient_id, name, phone').is('deleted_at', null)
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (doctorsRes.error) throw doctorsRes.error;
      if (patientsRes.error) throw patientsRes.error;

      const formattedEvents = appointmentsRes.data.map(apt => {
        const date = apt.appointment_datetime.split('T')[0];
        const time = apt.appointment_datetime.split('T')[1].slice(0, 5);
        const endTime = add30Minutes(time); 
        
        return {
          id: apt.appointment_id,
          title: `${apt.patients.name} - ${apt.doctors.name}`,
          start: `${date}T${time}:00`,
          end: `${date}T${endTime}:00`,
          extendedProps: {
            ...apt,
            patient_name: apt.patients.name,
            doctor_name: apt.doctors.name,
            phone: apt.patients.phone,
            fee: apt.fee || 0,
            notes: apt.notes || '',
            status: apt.status,
            start_time: time,
            end_time: endTime,
            reason: apt.reason || 'Standard' 
          }
        };
      });

      setEvents(formattedEvents);
      setDoctors(doctorsRes.data);
      setPatients(patientsRes.data);
    } catch (err) {
      console.error(err);
      alert('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const add30Minutes = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m);
    date.setMinutes(date.getMinutes() + 30);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const changeCalendarView = (newView) => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(newView);
    }
  };

  // Export functions (kept as is)
  const exportToExcel = () => {
    const csv = [
      ['Patient', 'Phone', 'Doctor', 'Date', 'Time', 'Status', 'Fee', 'Type', 'Notes'],
      ...events.map(e => [
        e.extendedProps.patient_name,
        e.extendedProps.phone,
        e.extendedProps.doctor_name,
        new Date(e.start).toLocaleDateString(),
        `${formatTime12(e.extendedProps.start_time)} - ${formatTime12(e.extendedProps.end_time)}`,
        e.extendedProps.status,
        e.extendedProps.fee,
        e.extendedProps.reason, 
        e.extendedProps.notes
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments.csv';
    a.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const head = [['Patient', 'Doctor', 'Date', 'Time', 'Status', 'Fee', 'Type']];
    const body = events.map(e => [
      e.extendedProps.patient_name,
      e.extendedProps.doctor_name,
      new Date(e.start).toLocaleDateString(),
      `${formatTime12(e.extendedProps.start_time)} - ${formatTime12(e.extendedProps.end_time)}`,
      e.extendedProps.status,
      e.extendedProps.fee,
      e.extendedProps.reason 
    ]);

    doc.autoTable({ head, body, theme: 'grid' });
    doc.save('appointments.pdf');
  };

  // --- UPDATED printReceipt FUNCTION FOR PROFESSIONAL PDF ---
  const printReceipt = (apt) => {
    const doc = new jsPDF();
    const primaryColor = [109, 40, 217]; // Purple-700

    // Header: Title and Clinic Info
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Appointment Receipt', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('MS Clinic - Your Health Partner', 14, 25);

    // Separator line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);

    // Section: Appointment Summary (as main table)
    const tableData = [
        ['Doctor', apt.doctor_name],
        ['Patient', apt.patient_name],
        ['Phone', apt.phone || 'N/A'],
        ['Date', new Date(apt.appointment_datetime).toLocaleDateString()],
        ['Time Slot', `${formatTime12(apt.start_time)} - ${formatTime12(apt.end_time)}`],
        ['Reason/Type', apt.reason || 'Standard'],
        ['Status', apt.status],
        ['Fee', `PKR ${Number(apt.fee).toLocaleString()}`],
    ];
    
    // Add notes to the table data if available
    if (apt.notes) {
        tableData.push(['Notes', apt.notes]);
    }

    doc.autoTable({
        startY: 35,
        head: [['Field', 'Value']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
            fillColor: primaryColor, 
            textColor: 255,
            fontSize: 10 
        },
        bodyStyles: { fontSize: 10, textColor: 50 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 }, 
        },
        styles: { cellPadding: 2, lineWidth: 0.1, lineColor: 200 }
    });

    let finalY = doc.autoTable.previous.finalY;

    // Footer
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 10, 196, finalY + 10);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Receipt ID: #${apt.appointment_id}`, 14, finalY + 18);
    doc.text('Thank you for choosing MS Clinic!', 196, finalY + 18, { align: 'right' });


    doc.save(`receipt_${apt.patient_name.replace(/\s+/g, '_')}_${apt.appointment_id}.pdf`);
  };

  const openEdit = (event) => {
    setSelectedAppointment(event.extendedProps);
    setShowBookingModal(true);
  };
  
  const openViewModal = (eventInfo) => {
    setSelectedAppointment(eventInfo.event.extendedProps);
    setShowViewModal(true);
  };
  
  // --- DELETE LOGIC (FOR POPUP) ---
  const handleOpenDeleteModal = (appointment) => {
    setSelectedAppointment(appointment); 
    setShowViewModal(false); 
    setShowDeleteModal(true); 
  };

  const softDeleteAppointment = async (id) => {
    try {
      await supabase.from('appointments').update({ deleted_at: new Date().toISOString() }).eq('appointment_id', id);
      await loadData();
      alert('Appointment soft-deleted successfully!');
      setShowDeleteModal(false); 
    } catch (err) {
      console.error(err);
      alert('Error deleting appointment');
    }
  };

  const deleteAppointment = async (id) => {
    const apt = events.find(e => e.id === id)?.extendedProps;
    if (apt) {
        setSelectedAppointment(apt);
        setShowDeleteModal(true);
    } 
  };


  const resetBookingForm = () => {
    setSelectedAppointment(null);
  };

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(quickSearch.toLowerCase()) ||
    e.extendedProps.phone?.includes(quickSearch)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header (View controls and New Booking button) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${view === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Grid className="w-4 h-4"/> List
            </button>
            <button onClick={() => { setView('month'); changeCalendarView('dayGridMonth'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${view === 'month' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Calendar className="w-4 h-4"/> Monthly
            </button>
            <button onClick={() => { setView('week'); changeCalendarView('timeGridWeek'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${view === 'week' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Calendar className="w-4 h-4"/> Weekly
            </button>
            <button onClick={() => { setView('day'); changeCalendarView('timeGridDay'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${view === 'day' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Clock className="w-4 h-4"/> Daily
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100">
              <FileSpreadsheet className="w-4 h-4"/> Excel
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100">
              <FileText className="w-4 h-4"/> PDF
            </button>
            <input
              type="text"
              placeholder="Quick search..."
              value={quickSearch}
              onChange={e => setQuickSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-56"
            />
            <button
              onClick={() => {
                resetBookingForm();
                setShowBookingModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg"
            >
              <Plus className="w-4 h-4"/> Book New
            </button>
          </div>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEvents.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{e.extendedProps.patient_name}</td>
                    <td className="px-6 py-4 text-sm">{e.extendedProps.doctor_name}</td>
                    <td className="px-6 py-4 text-sm">{e.extendedProps.reason || 'Standard'}</td>
                    <td className="px-6 py-4 text-sm">{new Date(e.start).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{formatTime12(e.extendedProps.start_time)} - {formatTime12(e.extendedProps.end_time)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        e.extendedProps.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        e.extendedProps.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {e.extendedProps.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => { setShowViewModal(true); setSelectedAppointment(e.extendedProps); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4"/></button>
                        <button onClick={() => openEdit(e)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Edit className="w-4 h-4"/></button>
                        <button onClick={() => printReceipt(e.extendedProps)} className="p-1 text-purple-600 hover:bg-purple-50 rounded"><Printer className="w-4 h-4"/></button>
                        <button onClick={() => deleteAppointment(e.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar Views */}
      {view !== 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            titleFormat={{ year: 'numeric', month: 'long', day: 'numeric' }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric', month: 'short' }}
            events={filteredEvents}
            dateClick={(arg) => {
              setSelectedAppointment({
                appointment_datetime: `${arg.dateStr}T00:00:00`, 
                start_time: '',
                end_time: '',
              });
              setShowBookingModal(true);
            }}
            eventClick={openViewModal} 
            
            height="750px"
            slotMinTime="00:00:00"
            slotMaxTime="23:59:59"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            nowIndicator={true}
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              meridiem: 'short'
            }}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              meridiem: 'short'
            }}
            eventContent={(eventInfo) => {
              return (
                <div className="p-2 bg-purple-50 rounded-lg border border-purple-200 text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="font-bold text-purple-700">
                      {formatTime12(eventInfo.event.extendedProps.start_time)}
                    </span>
                  </div>
                  <div className="font-semibold text-purple-900">{eventInfo.event.extendedProps.patient_name}</div>
                  <div className="text-purple-700">{eventInfo.event.extendedProps.doctor_name}</div>
                  <div className={`inline-block px-2 py-0.5 rounded-full text-xs mt-1 font-medium ${
                    eventInfo.event.extendedProps.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    eventInfo.event.extendedProps.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {eventInfo.event.extendedProps.status}
                  </div>
                </div>
              );
            }}
            eventBackgroundColor="transparent"
            eventBorderColor="transparent"
          />
        </div>
      )}

      {/* Booking Modal (Multi-step) */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => { setShowBookingModal(false); resetBookingForm(); }}
        onSaveSuccess={loadData}
        selectedAppointment={selectedAppointment}
        formatTime12={formatTime12}
        add30Minutes={add30Minutes}
        doctors={doctors}
        patients={patients}
      />


      {/* View Modal (STYLED) */}
      <ViewAppointmentModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        appointment={selectedAppointment}
        onEdit={() => { setShowViewModal(false); openEdit({ extendedProps: selectedAppointment }); }}
        onDelete={() => handleOpenDeleteModal(selectedAppointment)} 
        onPrint={() => printReceipt(selectedAppointment)}
        formatTime12={formatTime12}
      />

      {/* Delete Confirmation Modal (POPUP) */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        appointment={selectedAppointment}
        onConfirm={softDeleteAppointment}
      />
    </>
  );
}