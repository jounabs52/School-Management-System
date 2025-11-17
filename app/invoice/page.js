'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Eye, Edit, Download, Trash2, Search, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month', active: true },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

/* -------------------------------------------------------------------------- */
/*                     HIDDEN PDF TEMPLATE (FOR DOWNLOAD ONLY)               */
/* -------------------------------------------------------------------------- */
const PdfTemplate = React.forwardRef(({ invoice }, ref) => {
  if (!invoice) return null;
  const services = invoice.services || [];
  const payments = invoice.payments || [];
  const paid = payments.reduce((a, p) => a + (p.amount || 0), 0);
  const total = invoice.total_amount || 0;
  const due = total - paid;

  return (
    <div
      ref={ref}
      style={{
        padding: '40px',
        background: 'white',
        width: '210mm',
        minHeight: '297mm',
        fontFamily: 'Arial, sans-serif',
        position: 'absolute',
        left: '-9999px',
        top: 0,
      }}
    >
      {/* Gradient Header */}
      <div style={{ height: '15mm', position: 'relative', overflow: 'hidden' }}>
        {Array.from({ length: 20 }).map((_, i) => {
          const ratio = i / 19;
          const r = Math.round(139 + ratio * (236 - 139));
          const g = Math.round(92 + ratio * (45 - 92));
          const b = Math.round(246 + ratio * (237 - 246));
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '0.75mm',
                backgroundColor: `rgb(${r}, ${g}, ${b})`,
              }}
            />
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '10px' }}>
        <h1 style={{ color: '#8b5cf6', fontSize: '24px', margin: 0 }}>Medical Clinic</h1>
        <p style={{ fontSize: '12px', margin: '2px 0' }}>123 Healthcare Street, Medical District</p>
        <p style={{ fontSize: '12px', margin: '2px 0' }}>Phone: +92 300 1234567 • Email: info@medicalclinic.com</p>
        <p style={{ fontSize: '12px', margin: '2px 0' }}>License No: MC-2024-001</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ color: '#8b5cf6', fontSize: '20px', margin: 0 }}>INVOICE</h2>
          <p style={{ fontSize: '14px' }}><strong>#INV {invoice.invoice_number}</strong></p>
          <p style={{ fontSize: '14px' }}>Date: {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</p>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor:
                invoice.status === 'Paid' ? '#f3e8ff' :
                due > 0 && paid > 0 ? '#fef3c7' : '#fee2e2',
              color:
                invoice.status === 'Paid' ? '#7c3aed' :
                due > 0 && paid > 0 ? '#92400e' : '#991b1b',
            }}
          >
            {invoice.status}
          </span>
        </div>
      </div>

      <hr style={{ borderColor: '#8b5cf6', margin: '20px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ border: '2px solid #8b5cf6', borderRadius: '8px', padding: '12px', backgroundColor: '#f5f3ff' }}>
          <h3 style={{ color: '#8b5cf6', margin: '0 0 8px', fontWeight: 'bold' }}>PATIENT INFORMATION</h3>
          <table style={{ width: '100%', fontSize: '13px' }}>
            <tbody>
              <tr><td style={{ fontWeight: '500' }}>Name:</td><td>{invoice.patient_name}</td></tr>
              <tr><td style={{ fontWeight: '500' }}>MR Number:</td><td>{invoice.patient_id}</td></tr>
              <tr><td style={{ fontWeight: '500' }}>Phone:</td><td>N/A</td></tr>
              <tr><td style={{ fontWeight: '500' }}>Email:</td><td>N/A</td></tr>
              <tr><td style={{ fontWeight: '500' }}>Address:</td><td>N/A</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ border: '2px solid #8b5cf6', borderRadius: '8px', padding: '12px', backgroundColor: '#f5f3ff' }}>
          <h3 style={{ color: '#8b5cf6', margin: '0 0 8px', fontWeight: 'bold' }}>DOCTOR INFORMATION</h3>
          <table style={{ width: '100%', fontSize: '13px' }}>
            <tbody>
              <tr><td style={{ fontWeight: '500' }}>Name:</td><td>{invoice.doctor_name || 'N/A'}</td></tr>
              <tr><td style={{ fontWeight: '500' }}>Specialization:</td><td>N/A</td></tr>
              <tr><td style={{ fontWeight: '500' }}>License No:</td><td>N/A</td></tr>
              <tr><td style={{ fontWeight: '500' }}>Phone:</td><td>N/A</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '8px' }}>Services & Charges</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
              <th style={{ border: '1px solid #8b5cf6', padding: '8px', textAlign: 'left' }}>#</th>
              <th style={{ border: '1px solid #8b5cf6', padding: '8px', textAlign: 'left' }}>DESCRIPTION</th>
              <th style={{ border: '1px solid #8b5cf6', padding: '8px', textAlign: 'center' }}>QTY</th>
              <th style={{ border: '1px solid #8b5cf6', padding: '8px', textAlign: 'right' }}>UNIT PRICE</th>
              <th style={{ border: '1px solid #8b5cf6', padding: '8px', textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>{i + 1}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>{s.treatment}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'center' }}>1</td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                  Rs. {(s.amount || 0).toFixed(2)}
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>
                  Rs. {((s.amount || 0) - (s.discount || 0)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ width: '300px' }}>
          <table style={{ width: '100%', fontSize: '13px' }}>
            <tbody>
              <tr><td style={{ padding: '4px 0', fontWeight: '500' }}>Subtotal:</td><td style={{ textAlign: 'right' }}>Rs. {invoice.services_total?.toFixed(2) || '0.00'}</td></tr>
              <tr><td style={{ padding: '4px 0', fontWeight: '500' }}>Tax (0%):</td><td style={{ textAlign: 'right' }}>Rs. 0.00</td></tr>
              <tr><td style={{ padding: '4px 0', color: '#dc2626', fontWeight: '500' }}>Discount:</td><td style={{ textAlign: 'right', color: '#dc2626' }}>- Rs. {invoice.discount?.toFixed(2) || '0.00'}</td></tr>
              <tr style={{ borderTop: '2px solid #8b5cf6' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#8b5cf6' }}>Total Amount:</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#8b5cf6' }}>Rs. {total.toFixed(2)}</td>
              </tr>
              <tr><td style={{ padding: '4px 0', color: '#8b5cf6', fontWeight: '500' }}>Paid Amount:</td><td style={{ textAlign: 'right', color: '#8b5cf6' }}>Rs. {paid.toFixed(2)}</td></tr>
              <tr style={{ backgroundColor: '#fef2f2' }}>
                <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#dc2626' }}>Pending:</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>Rs. {due.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {invoice.notes && (
        <div style={{ marginBottom: '20px', fontSize: '13px' }}>
          <p style={{ fontWeight: '500', color: '#8b5cf6' }}>Notes:</p>
          <p>{invoice.notes}</p>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '40px' }}>
        <p>Printed on {format(new Date(), 'dd/MM/yyyy, hh:mm a')} | This is a computer generated invoice and does not require a signature.</p>
      </div>
    </div>
  );
});
PdfTemplate.displayName = 'PdfTemplate';

/* -------------------------------------------------------------------------- */
/*                     VISIBLE INVOICE PREVIEW (FOR MODAL)                   */
/* -------------------------------------------------------------------------- */
const InvoicePreview = ({ invoice }) => {
  if (!invoice) return null;
  const services = invoice.services || [];
  const payments = invoice.payments || [];
  const paid = payments.reduce((a, p) => a + (p.amount || 0), 0);
  const total = invoice.total_amount || 0;
  const due = total - paid;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm text-sm">
      {/* Gradient Header */}
      <div className="h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-lg -m-6 mb-6"></div>

      {/* Header */}
      <div className="text-center mb-6 -mt-8">
        <h1 className="text-2xl font-bold text-purple-600">Medical Clinic</h1>
        <p className="text-xs text-gray-600">123 Healthcare Street, Medical District</p>
        <p className="text-xs text-gray-600">Phone: +92 300 1234567 • Email: info@medicalclinic.com</p>
        <p className="text-xs text-gray-600">License No: MC-2024-001</p>
      </div>

      {/* Invoice Info */}
      <div className="flex justify-end mb-4">
        <div className="text-right">
          <h2 className="text-xl font-bold text-purple-600">INVOICE</h2>
          <p><strong>#INV {invoice.invoice_number}</strong></p>
          <p>Date: {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</p>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            invoice.status === 'Paid' ? 'bg-purple-100 text-purple-800' :
            due > 0 && paid > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
          }`}>
            {invoice.status}
          </span>
        </div>
      </div>

      <hr className="border-purple-600 mb-6" />

      {/* Patient & Doctor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border-2 border-purple-600 rounded-lg p-4 bg-purple-50">
          <h3 className="font-bold text-purple-600 mb-2">PATIENT INFORMATION</h3>
          <table className="w-full text-xs">
            <tbody>
              <tr><td className="font-medium">Name:</td><td>{invoice.patient_name}</td></tr>
              <tr><td className="font-medium">MR Number:</td><td>{invoice.patient_id}</td></tr>
              <tr><td className="font-medium">Phone:</td><td>N/A</td></tr>
              <tr><td className="font-medium">Email:</td><td>N/A</td></tr>
              <tr><td className="font-medium">Address:</td><td>N/A</td></tr>
            </tbody>
          </table>
        </div>
        <div className="border-2 border-purple-600 rounded-lg p-4 bg-purple-50">
          <h3 className="font-bold text-purple-600 mb-2">DOCTOR INFORMATION</h3>
          <table className="w-full text-xs">
            <tbody>
              <tr><td className="font-medium">Name:</td><td>{invoice.doctor_name || 'N/A'}</td></tr>
              <tr><td className="font-medium">Specialization:</td><td>N/A</td></tr>
              <tr><td className="font-medium">License No:</td><td>N/A</td></tr>
              <tr><td className="font-medium">Phone:</td><td>N/A</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Services */}
      <div className="mb-6">
        <h3 className="font-bold text-purple-600 mb-2">Services & Charges</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-purple-600 text-white">
                <th className="border border-purple-600 p-2 text-left">#</th>
                <th className="border border-purple-600 p-2 text-left">DESCRIPTION</th>
                <th className="border border-purple-600 p-2 text-center">QTY</th>
                <th className="border border-purple-600 p-2 text-right">UNIT PRICE</th>
                <th className="border border-purple-600 p-2 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 p-2">{i + 1}</td>
                  <td className="border border-gray-300 p-2">{s.treatment}</td>
                  <td className="border border-gray-300 p-2 text-center">1</td>
                  <td className="border border-gray-300 p-2 text-right">Rs. {(s.amount || 0).toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-right">
                    Rs. {((s.amount || 0) - (s.discount || 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-full max-w-xs">
          <table className="w-full text-xs">
            <tbody>
              <tr><td className="py-1 font-medium">Subtotal:</td><td className="text-right">Rs. {invoice.services_total?.toFixed(2) || '0.00'}</td></tr>
              <tr><td className="py-1 font-medium">Tax (0%):</td><td className="text-right">Rs. 0.00</td></tr>
              <tr><td className="py-1 text-red-600 font-medium">Discount:</td><td className="text-right text-red-600">- Rs. {invoice.discount?.toFixed(2) || '0.00'}</td></tr>
              <tr className="border-t-2 border-purple-600">
                <td className="py-2 font-bold text-purple-600">Total Amount:</td>
                <td className="text-right font-bold text-purple-600">Rs. {total.toFixed(2)}</td>
              </tr>
              <tr><td className="py-1 text-purple-600 font-medium">Paid Amount:</td><td className="text-right text-purple-600">Rs. {paid.toFixed(2)}</td></tr>
              <tr className="bg-red-50">
                <td className="py-2 font-bold text-red-600">Pending:</td>
                <td className="text-right font-bold text-red-600">Rs. {due.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {invoice.notes && (
        <div className="mb-6 text-xs">
          <p className="font-medium text-purple-600">Notes:</p>
          <p>{invoice.notes}</p>
        </div>
      )}

      <div className="text-center text-xs text-gray-500 mt-8">
        <p>Printed on {format(new Date(), 'dd/MM/yyyy, hh:mm a')} | This is a computer generated invoice and does not require a signature.</p>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              MAIN PAGE COMPONENT                           */
/* -------------------------------------------------------------------------- */
export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('month');
  const [totalInvoices, setTotalInvoices] = useState(0);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);

  const pdfRef = useRef();

  /* ------------------------------- FETCH ---------------------------------- */
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error, count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .order('invoice_date', { ascending: false });
      if (error) console.error(error);
      else {
        setInvoices(data || []);
        setTotalInvoices(count || 0);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  /* ----------------------------- REALTIME -------------------------------- */
  useEffect(() => {
    const channel = supabase
      .channel('invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setInvoices((prev) => [payload.new, ...prev]);
          setTotalInvoices((prev) => prev + 1);
        }
        if (payload.eventType === 'UPDATE') {
          setInvoices((prev) => prev.map((i) => (i.id === payload.new.id ? payload.new : i)));
        }
        if (payload.eventType === 'DELETE') {
          setInvoices((prev) => prev.filter((i) => i.id !== payload.old.id));
          setTotalInvoices((prev) => prev - 1);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  /* ------------------------------ FILTERS -------------------------------- */
  const filteredByDate = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      const d = new Date(inv.invoice_date);
      switch (activeFilter) {
        case 'today': return d.toDateString() === now.toDateString();
        case 'week': {
          const s = new Date(now);
          s.setDate(now.getDate() - now.getDay());
          return d >= s;
        }
        case 'month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case 'year': return d.getFullYear() === now.getFullYear();
        default: return true;
      }
    });
  }, [invoices, activeFilter]);

  const filteredInvoices = useMemo(() => {
    return filteredByDate.filter(
      (inv) =>
        (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filteredByDate, searchTerm]);

  /* ------------------------------ DELETE --------------------------------- */
  const openDeleteModal = (inv) => {
    setCurrentInvoice(inv);
    setDeleteModalOpen(true);
  };
  const confirmDelete = async () => {
    if (!currentInvoice) return;
    const { error } = await supabase.from('invoices').delete().eq('id', currentInvoice.id);
    if (error) alert('Failed to delete: ' + error.message);
    setDeleteModalOpen(false);
    setCurrentInvoice(null);
  };

  /* ------------------------------- VIEW ---------------------------------- */
  const openViewModal = (inv) => {
    setCurrentInvoice(inv);
    setViewModalOpen(true);
  };

  /* ------------------------------- EDIT ---------------------------------- */
  const openEditModal = (inv) => {
    setCurrentInvoice(inv);
    setEditModalOpen(true);
  };

  /* ------------------------------ DOWNLOAD ------------------------------- */
  const downloadPDF = async () => {
    if (!currentInvoice) return;
    await new Promise((r) => setTimeout(r, 100));
    const node = pdfRef.current;
    if (!node) return;
    try {
      const canvas = await html2canvas(node, { scale: 2 });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save(`Invoice_${currentInvoice.invoice_number}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF generation failed');
    }
  };

  const triggerDownload = (inv) => {
    setCurrentInvoice(inv);
    setTimeout(downloadPDF, 150);
  };

  /* ----------------------------- STATUS BADGE ---------------------------- */
  const getStatusBadge = (status) => {
    const map = {
      Paid: 'bg-purple-100 text-purple-800',
      'Partially Paid': 'bg-yellow-100 text-yellow-800',
      Unpaid: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <>
      {/* PAGE CONTENT */}
      <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 via-pink-50 to-teal-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Invoice Management</h1>
            <p className="text-sm text-gray-600">Total Invoices: {totalInvoices}</p>
          </div>
          <Link
            href="/invoice/create"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg"
          >
            <Plus size={18} /> Create New Invoice
          </Link>
        </div>

        {/* Filters + Search */}
        <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-sm p-4 border border-white/40 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
              <Filter size={16} /> Filter Period:
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    activeFilter === f.value
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-600" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-xl border border-white/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">INVOICE NO.</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">PATIENT</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">DATE</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">NET PAYABLE</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">BALANCE DUE</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">STATUS</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="bg-white/90 divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">Loading...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No invoices found</td></tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const paid = inv.paid || 0;
                    const total = inv.total_amount || 0;
                    const due = total - paid;
                    return (
                      <tr key={inv.id} className="hover:bg-purple-50/50">
                        <td className="px-4 py-3 text-sm font-medium text-purple-600">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{inv.patient_name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {format(new Date(inv.invoice_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">Rs. {total.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600">
                          Rs. {due > 0 ? due.toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(
                            inv.status || (due <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid')
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openViewModal(inv)} className="text-purple-600 hover:text-purple-800">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => openEditModal(inv)} className="text-pink-600 hover:text-pink-800">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => triggerDownload(inv)} className="text-purple-600 hover:text-purple-800">
                              <Download size={16} />
                            </button>
                            <button onClick={() => openDeleteModal(inv)} className="text-red-600 hover:text-red-800">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* HIDDEN PDF AREA */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <PdfTemplate ref={pdfRef} invoice={currentInvoice} />
      </div>

      {/* DELETE MODAL */}
      <Transition show={deleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setDeleteModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">Confirm Delete</Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete invoice <strong>{currentInvoice?.invoice_number}</strong>? This action cannot be undone.
                    </p>
                  </div>
                  <div className="mt-4 flex justify-end gap-3">
                    <button className="px-4 py-2 bg-gray-200 rounded-lg" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg" onClick={confirmDelete}>Delete</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* VIEW MODAL */}
      <Transition show={viewModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setViewModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Invoice: {currentInvoice?.invoice_number}</h3>
                    <button onClick={() => setViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="max-h-screen overflow-y-auto">
                    <InvoicePreview invoice={currentInvoice} />
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button onClick={() => setViewModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* EDIT MODAL */}
      <Transition show={editModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setEditModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-bold text-gray-900">Edit Invoice</Dialog.Title>
                  {currentInvoice && (
                    <div className="mt-4 space-y-2 text-sm">
                      <p><strong>Invoice:</strong> {currentInvoice.invoice_number}</p>
                      <p><strong>Patient:</strong> {currentInvoice.patient_name}</p>
                      <p><strong>Date:</strong> {currentInvoice.invoice_date}</p>
                      <p><strong>Status:</strong> {currentInvoice.status}</p>
                    </div>
                  )}
                  <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                    <Link href={`/invoice/create?id=${currentInvoice?.id}`} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg">
                      Open Editor
                    </Link>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}