'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, Search, ChevronDown, Download, Edit, Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { createClient } from '@supabase/supabase-js';

/* --------------------------------------------------------------
   TOAST NOTIFICATION
   -------------------------------------------------------------- */
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X size={16} />
      </button>
    </div>
  );
};

/* --------------------------------------------------------------
   SUPABASE CLIENT
   -------------------------------------------------------------- */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* --------------------------------------------------------------
   API WRAPPERS
   -------------------------------------------------------------- */
const treatmentPlansAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      console.error('❌ Exception in getAll:', e);
      return { data: [], error: e };
    }
  },
  
  create: async (payload) => {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .insert([payload])
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  },
  
  update: async (id, payload) => {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  },
  
  delete: async (id) => {
    try {
      const { error } = await supabase.from('treatment_plans').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  },
};

const treatmentPlanItemsAPI = {
  getByPlan: async (planId) => {
    try {
      const { data, error } = await supabase
        .from('treatment_plan_items')
        .select('*')
        .eq('treatment_plan_id', planId)
        .order('sequence_number');
      
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      return { data: [], error: e };
    }
  },
  
  createMultiple: async (items) => {
    try {
      const cleanedItems = items.map(item => ({
        treatment_plan_id: item.treatment_plan_id,
        item_references: item.item_references,
        treatment: item.treatment,
        details: item.details,
        treatment_date: item.treatment_date,
        amount: item.amount,
        discount: item.discount,
        paid: item.paid,
        sequence_number: item.sequence_number,
      }));
      
      const { error } = await supabase
        .from('treatment_plan_items')
        .insert(cleanedItems);
      
      if (error) throw error;
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  },
  
  deleteByPlan: async (planId) => {
    try {
      const { error } = await supabase
        .from('treatment_plan_items')
        .delete()
        .eq('treatment_plan_id', planId);
      if (error) throw error;
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  },
};

const patientsAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      console.log('👤 Patients loaded:', data?.length, data?.[0]);
      return { data: data || [], error: null };
    } catch (e) {
      console.error('❌ Error loading patients:', e);
      return { data: [], error: e };
    }
  },
};

const doctorsAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('status', 'Active')
        .order('name');
      
      if (error) throw error;
      console.log('👨‍⚕️ Doctors loaded:', data?.length, data?.[0]);
      return { data: data || [], error: null };
    } catch (e) {
      console.error('❌ Error loading doctors:', e);
      return { data: [], error: e };
    }
  },
};

const servicesAPI = {
  getAll: async () => {
    const { data, error } = await supabase.from('services').select('*').order('name');
    return { data: data || [], error };
  },
};

/* --------------------------------------------------------------
   DATE FORMATTER
   -------------------------------------------------------------- */
const formatDate = (date, fmt = 'MM/dd/yyyy') => {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  const map = {
    'MM/dd/yyyy': `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`,
    'yyyy-MM-dd': `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    'dd/MM/yyyy': `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
  };
  return map[fmt] || d.toLocaleDateString();
};

/* --------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------- */
export default function TreatmentPlanPage() {
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [realtimeStatus, setRealtimeStatus] = useState('Connecting...');
  const [toast, setToast] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [editId, setEditId] = useState(null);

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const emptyForm = {
    planDate: formatDate(new Date(), 'MM/dd/yyyy'),
    title: '',
    patientId: '',
    patientName: '',
    mrNumber: '',
    phone: '',
    doctorId: '',
    doctorName: '',
    toothChart: false,
    treatments: [{
      references: '',
      treatmentId: '',
      treatmentName: '',
      details: '',
      date: formatDate(new Date(), 'yyyy-MM-dd'),
      amount: '',
      discount: '',
      paid: '',
    }],
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDD, setShowPatientDD] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorDD, setShowDoctorDD] = useState(false);

  /* ---------- LOAD MASTER DATA ---------- */
  useEffect(() => {
    (async () => {
      const [patientsRes, doctorsRes, servicesRes] = await Promise.all([
        patientsAPI.getAll(),
        doctorsAPI.getAll(),
        servicesAPI.getAll(),
      ]);
      
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
      setServices(servicesRes.data);
      
      console.log('✅ Master data loaded');
    })();
  }, []);

  /* ---------- DEBUG: Log patients when they change ---------- */
  useEffect(() => {
    console.log('📋 Current patients state:', patients.length, patients);
  }, [patients]);

  /* ---------- LOAD PLANS ---------- */
  const loadPlans = async () => {
    const { data, error } = await treatmentPlansAPI.getAll();
    if (error) {
      showToast('Error loading treatment plans', 'error');
    } else {
      setPlans(data);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  /* ---------- REALTIME SUBSCRIPTION ---------- */
  useEffect(() => {
    const channel = supabase
      .channel('treatment_plans_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'treatment_plans' }, (payload) => {
        setPlans(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'treatment_plans' }, (payload) => {
        setPlans(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'treatment_plans' }, (payload) => {
        setPlans(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe((status) => {
        setRealtimeStatus(status === 'SUBSCRIBED' ? 'Live' : 'Connecting...');
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ---------- FILTERING ---------- */
  const filteredPatients = patients.filter(p =>
    (p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mr_number?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone?.includes(patientSearch))
  );

  const filteredDoctors = doctors.filter(d =>
    (d.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.license_number?.includes(doctorSearch))
  );

  const selectPatient = p => {
    console.log('✅ Patient selected:', p);
    
    // Try multiple possible field names
    const patientId = p.patient_id || p.id || p.patientId;
    const patientName = p.name || p.patient_name || p.patientName;
    const mrNumber = p.mr_number || p.mrNumber || p.mr;
    const phone = p.phone || p.contact || p.phone_number;
    
    console.log('Extracted values:', { patientId, patientName, mrNumber, phone });
    
    setForm(f => ({
      ...f,
      patientId,
      patientName,
      mrNumber,
      phone,
    }));
    setShowPatientDD(false);
    setPatientSearch('');
  };

  const selectDoctor = d => {
    console.log('✅ Doctor selected:', d);
    
    const doctorId = d.doctor_id || d.id || d.doctorId;
    const doctorName = d.name || d.doctor_name || d.doctorName;
    
    setForm(f => ({
      ...f,
      doctorId,
      doctorName,
    }));
    setShowDoctorDD(false);
    setDoctorSearch('');
  };

  /* ---------- handleTreatmentChange ---------- */
  const handleTreatmentChange = (idx, field, value) => {
    setForm(prev => {
      const treatments = [...prev.treatments];
      const row = { ...treatments[idx] };

      if (['amount', 'discount', 'paid'].includes(field)) {
        if (value === '' || value === null) {
          row[field] = '';
        } else {
          const num = parseFloat(value);
          row[field] = isNaN(num) ? '' : num;
        }

        if (field === 'discount' && row.discount !== '' && row.amount !== '' && row.discount > row.amount) {
          showToast(`Discount cannot exceed Amount! Max: Rs. ${row.amount}`, 'error');
          row.discount = row.amount;
        }
        
        if (field === 'amount' && row.amount !== '' && row.discount !== '' && row.discount > row.amount) {
          row.discount = row.amount;
        }
      } else {
        row[field] = value;
      }

      treatments[idx] = row;
      return { ...prev, treatments };
    });
  };

  const handleInput = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const addTreatment = () => setForm(f => ({
    ...f,
    treatments: [...f.treatments, {
      references: '',
      treatmentId: '',
      treatmentName: '',
      details: '',
      date: formatDate(new Date(), 'yyyy-MM-dd'),
      amount: '',
      discount: '',
      paid: '',
    }],
  }));

  const removeTreatment = idx => {
    if (form.treatments.length === 1) return;
    setForm(f => ({ ...f, treatments: f.treatments.filter((_, i) => i !== idx) }));
  };

  /* ---------- CALCULATIONS ---------- */
  const subTotal = () => form.treatments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const discountTotal = () => form.treatments.reduce((s, t) => s + (Number(t.discount) || 0), 0);
  const grandTotal = () => subTotal() - discountTotal();
  const paidTotal = () => form.treatments.reduce((s, t) => s + (Number(t.paid) || 0), 0);
  const unpaid = () => grandTotal() - paidTotal();

  /* ---------- VALIDATION ---------- */
  const validateDiscount = () => {
    for (let i = 0; i < form.treatments.length; i++) {
      const t = form.treatments[i];
      const amount = Number(t.amount) || 0;
      const discount = Number(t.discount) || 0;
      if (discount > amount) {
        showToast(`Error in row ${i + 1}: Discount > Amount`, 'error');
        return false;
      }
    }
    return true;
  };

  /* ---------- SAVE ---------- */
  const save = async () => {
    const missingFields = [];
    if (!form.patientId) missingFields.push('Patient');
    if (!form.doctorId) missingFields.push('Doctor');
    if (!form.title?.trim()) missingFields.push('Title');
    
    if (missingFields.length > 0) {
      showToast(`Required: ${missingFields.join(', ')}`, 'error');
      return;
    }

    if (!validateDiscount()) return;

    const payload = {
      patient_id: form.patientId,
      patient_name: form.patientName,
      mr_number: form.mrNumber,
      patient_phone: form.phone,
      doctor_id: form.doctorId,
      doctor_name: form.doctorName,
      title: form.title.trim(),
      plan_date: formatDate(form.planDate, 'yyyy-MM-dd'),
      tooth_chart: form.toothChart,
      sub_total: subTotal(),
      discount: discountTotal(),
      grand_total: grandTotal(),
      paid: paidTotal(),
      unpaid: unpaid(),
      status: unpaid() === 0 ? 'Completed' : 'Pending',
      notes: form.notes,
      location: locationFilter === 'All' ? 'Clinic' : locationFilter,
    };

    try {
      let plan;
      if (mode === 'create') {
        const res = await treatmentPlansAPI.create(payload);
        if (res.error) {
          showToast(`Error: ${res.error.message}`, 'error');
          return;
        }
        plan = res.data;
      } else {
        const res = await treatmentPlansAPI.update(editId, payload);
        if (res.error) {
          showToast(`Error: ${res.error.message}`, 'error');
          return;
        }
        plan = res.data;
      }

      const items = form.treatments.map((t, i) => ({
        treatment_plan_id: plan.id,
        item_references: t.references,
        treatment: t.treatmentName,
        details: t.details,
        treatment_date: t.date,
        amount: Number(t.amount) || 0,
        discount: Number(t.discount) || 0,
        paid: Number(t.paid) || 0,
        sequence_number: i + 1,
      }));

      if (mode === 'edit') {
        await treatmentPlanItemsAPI.deleteByPlan(editId);
      }
      
      const itemsRes = await treatmentPlanItemsAPI.createMultiple(items);
      if (itemsRes.error) {
        showToast(`Error saving items`, 'error');
        return;
      }

      closeModal();
      await loadPlans();
      showToast('Treatment plan saved!', 'success');
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  /* ---------- SERVICE PICKER ---------- */
  const ServicePicker = ({ idx }) => {
    const [open, setOpen] = useState(false);
    const [svcSearch, setSvcSearch] = useState('');
    const row = form.treatments[idx];

    const filtered = services.filter(s =>
      s.name?.toLowerCase().includes(svcSearch.toLowerCase())
    );

    const pick = svc => {
      handleTreatmentChange(idx, 'treatmentId', svc.id);
      handleTreatmentChange(idx, 'treatmentName', svc.name);
      handleTreatmentChange(idx, 'amount', svc.fee || 0);
      setOpen(false);
      setSvcSearch('');
    };

    return (
      <div className="relative">
        <input
          type="text"
          placeholder="Type or select"
          value={row.treatmentName}
          onChange={e => {
            const val = e.target.value;
            setSvcSearch(val);
            handleTreatmentChange(idx, 'treatmentName', val);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full px-2 py-1 border rounded text-sm"
          autoComplete="off"
        />
        {open && (
          <div className="absolute z-30 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-2 text-center text-gray-500 text-sm">No services</div>
            ) : (
              filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => pick(s)}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 text-sm"
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-600">Rs. {s.fee}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  /* ---------- PDF FROM MODAL ---------- */
  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('TREATMENT PLAN', pageWidth / 2, 25, { align: 'center' });

    let y = 60;

    doc.setFillColor(240, 240, 255);
    doc.roundedRect(15, y, 85, 40, 3, 3, 'F');
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFO', 20, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${form.patientName}`, 20, y + 18);
    doc.text(`MR: ${form.mrNumber}`, 20, y + 26);
    doc.text(`${form.phone}`, 20, y + 34);

    doc.setFillColor(240, 255, 240);
    doc.roundedRect(pageWidth - 100, y, 85, 40, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DOCTOR', pageWidth - 95, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dr. ${form.doctorName}`, pageWidth - 95, y + 18);
    doc.text(`Date: ${form.planDate}`, pageWidth - 95, y + 26);

    y += 50;

    const tableData = form.treatments.map(t => [
      t.references || '-',
      t.treatmentName || '-',
      t.details || '-',
      t.date ? formatDate(t.date, 'dd/MM/yyyy') : '-',
      `Rs. ${(Number(t.amount) || 0).toFixed(2)}`,
      `Rs. ${(Number(t.discount) || 0).toFixed(2)}`,
      `Rs. ${(Number(t.paid) || 0).toFixed(2)}`,
    ]);

    doc.autoTable({
      head: [['REF', 'TREATMENT', 'DETAILS', 'DATE', 'AMOUNT', 'DISCOUNT', 'PAID']],
      body: tableData,
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    y = doc.lastAutoTable.finalY + 15;

    const boxX = pageWidth - 80;
    doc.setFillColor(200, 255, 200);
    doc.roundedRect(boxX, y, 65, 50, 3, 3, 'F');
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', boxX + 5, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Sub: Rs. ${subTotal().toFixed(2)}`, boxX + 5, y + 18);
    doc.text(`Disc: Rs. ${discountTotal().toFixed(2)}`, boxX + 5, y + 26);
    doc.text(`Total: Rs. ${grandTotal().toFixed(2)}`, boxX + 5, y + 34);
    doc.text(`Paid: Rs. ${paidTotal().toFixed(2)}`, boxX + 5, y + 42);

    doc.save(`Plan_${form.mrNumber}.pdf`);
    showToast('PDF generated!', 'success');
  };

  /* ---------- PDF FROM TABLE ---------- */
  const generatePlanPDF = async (plan) => {
    const { data: items } = await treatmentPlanItemsAPI.getByPlan(plan.id);
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('TREATMENT PLAN', pageWidth / 2, 25, { align: 'center' });

    let y = 60;

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Patient: ${plan.patient_name}`, 20, y);
    doc.text(`MR: ${plan.mr_number}`, 20, y + 8);
    doc.text(`Doctor: Dr. ${plan.doctor_name}`, 20, y + 16);
    doc.text(`Date: ${formatDate(plan.plan_date, 'dd/MM/yyyy')}`, 20, y + 24);

    y += 35;

    const tableData = items.map(t => [
      t.item_references || '-',
      t.treatment || '-',
      t.details || '-',
      `Rs. ${Number(t.amount).toFixed(2)}`,
      `Rs. ${Number(t.discount).toFixed(2)}`,
      `Rs. ${Number(t.paid).toFixed(2)}`,
    ]);

    doc.autoTable({
      head: [['REF', 'TREATMENT', 'DETAILS', 'AMOUNT', 'DISCOUNT', 'PAID']],
      body: tableData,
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] },
    });

    doc.save(`Plan_${plan.mr_number}.pdf`);
    showToast('PDF generated!', 'success');
  };

  /* ---------- MODAL CONTROLS ---------- */
  const openCreate = () => {
    setMode('create');
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = async plan => {
    setMode('edit');
    setEditId(plan.id);

    const { data: items } = await treatmentPlanItemsAPI.getByPlan(plan.id);
    const mapped = items.map(i => ({
      references: i.item_references || '',
      treatmentId: '',
      treatmentName: i.treatment || '',
      details: i.details || '',
      date: i.treatment_date?.split('T')[0] || '',
      amount: Number(i.amount) || '',
      discount: Number(i.discount) || '',
      paid: Number(i.paid) || '',
    }));

    setForm({
      planDate: formatDate(plan.plan_date, 'MM/dd/yyyy'),
      title: plan.title,
      patientId: plan.patient_id,
      patientName: plan.patient_name,
      mrNumber: plan.mr_number,
      phone: plan.patient_phone,
      doctorId: plan.doctor_id,
      doctorName: plan.doctor_name,
      toothChart: plan.tooth_chart || false,
      treatments: mapped.length ? mapped : emptyForm.treatments,
      notes: plan.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setShowPatientDD(false);
    setShowDoctorDD(false);
  };

  const deletePlan = async id => {
    if (!confirm('Delete this plan?')) return;
    await treatmentPlanItemsAPI.deleteByPlan(id);
    await treatmentPlansAPI.delete(id);
    showToast('Plan deleted', 'success');
  };

  const filteredPlans = plans.filter(p =>
    (p.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.mr_number?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (locationFilter === 'All' || p.location === locationFilter)
  );

  /* ---------- RENDER ---------- */
  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-4 border">
          <div className="flex justify-between items-center">
            <div>
              <label className="block font-medium mb-1">Location</label>
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="px-3 py-1 border rounded w-64"
              >
                <option>All</option>
                <option>Clinic</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Status:</span>
              <span className={realtimeStatus === 'Live' ? 'text-green-600 font-bold' : 'text-yellow-600'}>
                {realtimeStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Treatment Plan List</h2>
            <button
              onClick={openCreate}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4py-2 rounded flex items-center gap-2 hover:shadow-lg transition"
            >
              <Plus size={18} /> Create Treatment Plan
            </button>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Patient, MR#, Title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Patient', 'MR Number', 'Title', 'Doctor', 'Cost', 'Paid', 'Created', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPlans.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-500">No records</td></tr>
                ) : (
                  filteredPlans.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{p.patient_name}</td>
                      <td className="px-4 py-2 text-sm text-purple-600 font-medium">{p.mr_number}</td>
                      <td className="px-4 py-2 text-sm">{p.title}</td>
                      <td className="px-4 py-2 text-sm">{p.doctor_name}</td>
                      <td className="px-4 py-2 text-sm font-medium">Rs. {Number(p.grand_total).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-green-600 font-medium">Rs. {Number(p.paid).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">{formatDate(p.created_at, 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${p.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 flex gap-2">
                        <button onClick={() => generatePlanPDF(p)} title="Print" className="text-green-600 hover:text-green-800">
                          <Printer size={16} />
                        </button>
                        <button onClick={() => openEdit(p)} title="Edit" className="text-blue-600 hover:text-blue-800">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deletePlan(p.id)} title="Delete" className="text-red-600 hover:text-red-800">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold">{mode === 'create' ? 'Create' : 'Edit'} Treatment Plan</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient Dropdown */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <label className="block font-medium mb-2">Select Patient *</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      console.log('Opening patient dropdown. Patients count:', patients.length);
                      setShowPatientDD(!showPatientDD);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:shadow-lg"
                  >
                    {form.patientName || 'Choose Patient'} <ChevronDown size={18} />
                  </button>
                  {showPatientDD && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded shadow-lg max-h-96 overflow-y-auto">
                      {/* Debug Info */}
                      <div className="p-2 bg-blue-50 text-xs border-b">
                        <div>Total patients: {patients.length}</div>
                        <div>Filtered: {filteredPatients.length}</div>
                      </div>
                      
                      <input
                        type="text"
                        placeholder="Search patient..."
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                        className="w-full px-3 py-2 border-b sticky top-0 bg-white"
                        autoFocus
                      />
                      <div className="max-h-64 overflow-y-auto">
                        {patients.length === 0 ? (
                          <div className="p-4 text-center text-red-500">
                            No patients in database. Please add patients first.
                          </div>
                        ) : filteredPatients.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No patients match "{patientSearch}"
                          </div>
                        ) : (
                          filteredPatients.map((p, index) => (
                            <button
                              key={p.patient_id || p.id || index}
                              onClick={() => selectPatient(p)}
                              className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b last:border-b-0"
                            >
                              <div className="font-medium text-sm">{p.name}</div>
                              <div className="text-xs text-gray-600">
                                MR: {p.mr_number} | Phone: {p.phone}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {form.patientName && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div><strong>Name:</strong> {form.patientName}</div>
                    <div><strong>MR:</strong> {form.mrNumber}</div>
                    <div><strong>Phone:</strong> {form.phone}</div>
                  </div>
                )}
              </div>

              {/* Doctor Dropdown */}
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <label className="block font-medium mb-2">Select Doctor *</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      console.log('Opening doctor dropdown. Doctors count:', doctors.length);
                      setShowDoctorDD(!showDoctorDD);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded hover:shadow-lg"
                  >
                    {form.doctorName || 'Choose Doctor'} <ChevronDown size={18} />
                  </button>
                  {showDoctorDD && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded shadow-lg max-h-96 overflow-y-auto">
                      <div className="p-2 bg-blue-50 text-xs border-b">
                        <div>Total doctors: {doctors.length}</div>
                        <div>Filtered: {filteredDoctors.length}</div>
                      </div>
                      
                      <input
                        type="text"
                        placeholder="Search doctor..."
                        value={doctorSearch}
                        onChange={e => setDoctorSearch(e.target.value)}
                        className="w-full px-3 py-2 border-b sticky top-0 bg-white"
                        autoFocus
                      />
                      <div className="max-h-64 overflow-y-auto">
                        {doctors.length === 0 ? (
                          <div className="p-4 text-center text-red-500">
                            No doctors in database. Please add doctors first.
                          </div>
                        ) : filteredDoctors.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No doctors match "{doctorSearch}"
                          </div>
                        ) : (
                          filteredDoctors.map((d, index) => (
                            <button
                              key={d.doctor_id || d.id || index}
                              onClick={() => selectDoctor(d)}
                              className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b last:border-b-0"
                            >
                              <div className="font-medium text-sm">{d.name}</div>
                              <div className="text-xs text-gray-600">
                                License: {d.license_number}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Date</label>
                  <input
                    type="text"
                    value={form.planDate}
                    readOnly
                    className="w-full px-3 py-2 border rounded bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    placeholder="Treatment name"
                    value={form.title}
                    onChange={e => handleInput('title', e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Treatments Table */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Treatments</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.toothChart}
                      onChange={e => handleInput('toothChart', e.target.checked)}
                    />
                    <span className="text-sm">Tooth Chart</span>
                  </label>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        {['Ref', 'Treatment', 'Details', 'Date', 'Amount', 'Discount', 'Paid', ''].map(h => (
                          <th key={h} className="px-2 py-2 text-left text-xs font-medium text-gray-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.treatments.map((t, i) => {
                        const isDiscountDisabled = t.amount === '' || t.amount === 0;
                        return (
                          <tr key={i} className="border-b">
                            <td className="p-1">
                              <input
                                type="text"
                                value={t.references}
                                onChange={e => handleTreatmentChange(i, 'references', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-xs"
                                placeholder="Ref"
                              />
                            </td>
                            <td className="p-1">
                              <ServicePicker idx={i} />
                            </td>
                            <td className="p-1">
                              <textarea
                                rows={1}
                                value={t.details}
                                onChange={e => handleTreatmentChange(i, 'details', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-xs"
                                placeholder="Details"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="date"
                                value={t.date}
                                onChange={e => handleTreatmentChange(i, 'date', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                value={t.amount}
                                onChange={e => handleTreatmentChange(i, 'amount', e.target.value)}
                                onFocus={e => e.target.value === '0' && (e.target.value = '')}
                                className="w-full px-2 py-1 border rounded text-xs"
                                min="0"
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                value={t.discount}
                                onChange={e => handleTreatmentChange(i, 'discount', e.target.value)}
                                onFocus={e => e.target.value === '0' && (e.target.value = '')}
                                className="w-full px-2 py-1 border rounded text-xs disabled:bg-gray-100"
                                min="0"
                                step="0.01"
                                disabled={isDiscountDisabled}
                                placeholder="0"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                value={t.paid}
                                onChange={e => handleTreatmentChange(i, 'paid', e.target.value)}
                                onFocus={e => e.target.value === '0' && (e.target.value = '')}
                                className="w-full px-2 py-1 border rounded text-xs"
                                min="0"
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <button
                                disabled={form.treatments.length === 1}
                                onClick={() => removeTreatment(i)}
                                className="text-red-600 hover:text-red-800 disabled:opacity-30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={addTreatment}
                  className="mt-3 flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  <Plus size={16} /> Add Treatment
                </button>
              </div>

              {/* Notes & Totals */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium mb-1">Notes</label>
                  <textarea
                    rows={5}
                    placeholder="Additional notes..."
                    value={form.notes}
                    onChange={e => handleInput('notes', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border space-y-2">
                  <h3 className="font-semibold mb-3 text-purple-700">Financial Summary</h3>
                  <div className="flex justify-between text-sm">
                    <span>Sub Total:</span>
                    <span className="font-semibold">Rs. {subTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount:</span>
                    <span className="font-semibold">Rs. {discountTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 text-purple-700">
                    <span>Grand Total:</span>
                    <span>Rs. {grandTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid:</span>
                    <span className="font-semibold">Rs. {paidTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 text-red-700">
                    <span>Unpaid:</span>
                    <span className="font-semibold">Rs. {unpaid().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end sticky bottom-0 bg-white pt-4 border-t">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 border rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={generatePDF}
                  className="px-6 py-2 bg-green-600 text-white rounded flex items-center gap-2 hover:bg-green-700"
                >
                  <Download size={18} /> PDF
                </button>
                <button
                  onClick={save}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:shadow-lg"
                >
                  {mode === 'create' ? 'Save Plan' : 'Update Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}