'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Download, FileText, Calendar, Users, Stethoscope, BarChart3, Eye, Printer } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportType, setReportType] = useState('appointments');
  const [selectedItem, setSelectedItem] = useState(null);
  const modalRef = useRef(null);

  // Data
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pktTime, setPktTime] = useState('');

  // Live PKT Clock
  useEffect(() => {
    const updatePKT = () => {
      const now = new Date();
      setPktTime(
        new Intl.DateTimeFormat('en-PK', {
          timeZone: 'Asia/Karachi',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
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

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [{ data: appts }, { data: docs }, { data: pats }] = await Promise.all([
          supabase.from('appointments').select('*').order('appointment_datetime', { ascending: false }),
          supabase.from('doctors').select('*'),
          supabase.from('patients').select('*')
        ]);
        setAppointments(appts || []);
        setDoctors(docs || []);
        setPatients(pats || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Realtime Updates
  useEffect(() => {
    const channel = supabase
      .channel('reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, p => {
        if (p.eventType === 'INSERT') setAppointments(prev => [p.new, ...prev]);
        if (p.eventType === 'UPDATE') setAppointments(prev => prev.map(a => a.appointment_id === p.new.appointment_id ? p.new : a));
        if (p.eventType === 'DELETE') setAppointments(prev => prev.filter(a => a.appointment_id !== p.old.appointment_id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, p => {
        if (p.eventType === 'INSERT') setDoctors(prev => [p.new, ...prev]);
        if (p.eventType === 'UPDATE') setDoctors(prev => prev.map(d => d.doctor_id === p.new.doctor_id ? p.new : d));
        if (p.eventType === 'DELETE') setDoctors(prev => prev.filter(d => d.doctor_id !== p.old.doctor_id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, p => {
        if (p.eventType === 'INSERT') setPatients(prev => [p.new, ...prev]);
        if (p.eventType === 'UPDATE') setPatients(prev => prev.map(pt => pt.patient_id === p.new.patient_id ? p.new : pt));
        if (p.eventType === 'DELETE') setPatients(prev => prev.filter(pt => pt.patient_id !== p.old.patient_id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Unified Report Data
  const allReportData = useMemo(() => {
    const data = [];

    if (reportType === 'all' || reportType === 'appointments') {
      appointments.forEach(a => {
        const pat = patients.find(p => p.patient_id === a.patient_id);
        const doc = doctors.find(d => d.doctor_id === a.doctor_id);
        data.push({
          type: 'appointment',
          name: pat?.name || 'Unknown',
          with: doc?.name || 'Unknown',
          contact: pat?.phone || '-',
          details: `${a.reason || '-'} - ${a.status}`,
          datetime: a.appointment_datetime,
          id: a.appointment_id,
          raw: a
        });
      });
    }

    if (reportType === 'all' || reportType === 'doctors') {
      doctors.forEach(d => {
        data.push({
          type: 'doctor',
          name: d.name,
          with: d.specialization || 'N/A',
          contact: d.phone || '-',
          details: `License: ${d.license_number || '-'} | Fee: ${d.consultation_fee || 0} PKR`,
          datetime: d.created_at || new Date(),
          id: d.doctor_id,
          raw: d
        });
      });
    }

    if (reportType === 'all' || reportType === 'patients') {
      patients.forEach(p => {
        data.push({
          type: 'patient',
          name: p.name,
          with: `MR: ${p.mr_number || '-'}`,
          contact: p.phone || '-',
          details: `Email: ${p.email || '-'} | Age: ${p.age ?? '-'}`,
          datetime: p.created_at || new Date(),
          id: p.patient_id,
          raw: p
        });
      });
    }

    return data;
  }, [appointments, doctors, patients, reportType]);

  // Search Filter
  const filteredData = useMemo(() => {
    return allReportData.filter(i => {
      const s = searchTerm.toLowerCase();
      return (
        i.name.toLowerCase().includes(s) ||
        i.contact.includes(s) ||
        i.with.toLowerCase().includes(s) ||
        i.details.toLowerCase().includes(s)
      );
    });
  }, [allReportData, searchTerm]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Export to Excel
  const exportToExcel = () => {
    const rows = filteredData.map(i => ({
      NAME: i.name,
      WITH: i.with,
      CONTACT: i.contact,
      DETAILS: i.details,
      'DATE/TIME': new Date(i.datetime).toLocaleString('en-GB'),
      TYPE: i.type.charAt(0).toUpperCase() + i.type.slice(1)
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF – FULL COLOR MATCH
  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
    const generated = `Generated on: ${pktTime}`;

    // Gradient Header (purple-600 → pink-600)
    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const r = Math.round(139 + ratio * (236 - 139));
      const g = Math.round(92 + ratio * (45 - 92));
      const b = Math.round(246 + ratio * (237 - 246));
      doc.setFillColor(r, g, b);
      doc.rect(0, i * (15 / gradientSteps), pageWidth, 15 / gradientSteps, 'F');
    }

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, 11);

    // Generated Time
    doc.setFontSize(9);
    doc.setTextColor(220, 220, 220);
    doc.text(generated, pageWidth - margin - doc.getTextWidth(generated), 11);

    // Footer
    const addFooter = (pageNum) => {
      doc.setFillColor(240, 240, 240);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      doc.setTextColor(100);
      doc.setFontSize(9);
      doc.text(`Page ${pageNum}`, pageWidth - margin - doc.getTextWidth(`Page ${pageNum}`), pageHeight - 6);
    };

    const tableData = filteredData.map(i => [
      i.name,
      i.type.charAt(0).toUpperCase() + i.type.slice(1),
      i.contact,
      i.details,
      new Date(i.datetime).toLocaleString('en-GB')
    ]);

    doc.autoTable({
      head: [['NAME', 'TYPE', 'CONTACT', 'DETAILS', 'DATE/TIME']],
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: {
        fillColor: [139, 92, 246], // purple-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [200, 200, 200],
      },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 24 },
        2: { cellWidth: 30 },
        3: { cellWidth: 52 },
        4: { cellWidth: 36 },
      },
      margin: { top: 25, left: margin, right: margin },
      didDrawPage: (data) => {
        addFooter(data.pageNumber);
      },
    });

    doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Print Single Item PDF – COLOR MATCHED
  const printItemPDF = (item) => {
    const doc = new jsPDF();
    const dt = new Date(item.datetime);

    // Gradient Header
    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const r = Math.round(139 + ratio * (236 - 139));
      const g = Math.round(92 + ratio * (45 - 92));
      const b = Math.round(246 + ratio * (237 - 246));
      doc.setFillColor(r, g, b);
      doc.rect(0, i * (20 / gradientSteps), 210, 20 / gradientSteps, 'F');
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Details`, 14, 14);

    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${item.name}`, 14, 35);
    doc.text(`With: ${item.with}`, 14, 45);
    doc.text(`Contact: ${item.contact}`, 14, 55);
    doc.text(`Details: ${item.details}`, 14, 65);
    doc.text(`Date/Time: ${dt.toLocaleString('en-GB')}`, 14, 75);
    doc.text(`Generated: ${pktTime}`, 14, 90);

    doc.setFillColor(240, 240, 240);
    doc.rect(0, 280, 210, 20, 'F');
    doc.setTextColor(100);
    doc.setFontSize(9);
    doc.text('Clinic Management System', 14, 290);

    doc.save(`${item.type}_${item.name.replace(/\s+/g, '_')}.pdf`);
  };

  // Close Modal
  useEffect(() => {
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setSelectedItem(null);
      }
    };
    if (selectedItem) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedItem]);

  // Stats
  const stats = {
    all: appointments.length + doctors.length + patients.length,
    doctors: doctors.length,
    patients: new Set(appointments.map(a => a.patient_id)).size,
    appointments: appointments.length,
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-teal-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="text-center sm:text-left mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Clinic Reports
            </h1>
            <p className="text-gray-600 mt-2">View, export, and print reports</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { type: 'all', icon: BarChart3, label: 'All Reports', count: stats.all },
              { type: 'doctors', icon: Stethoscope, label: 'Doctors', count: stats.doctors },
              { type: 'patients', icon: Users, label: 'Patients', count: stats.patients },
              { type: 'appointments', icon: Calendar, label: 'Appointments', count: stats.appointments },
            ].map(c => (
              <div
                key={c.type}
                onClick={() => { setReportType(c.type); setCurrentPage(1); }}
                className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-5 cursor-pointer transition-all hover:shadow-2xl ${
                  reportType === c.type ? 'ring-2 ring-purple-600' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
                    <c.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-800">{c.count}</div>
                    <div className="text-sm text-gray-600">{c.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-600" />
              <input
                type="text"
                placeholder="Search by name, phone, specialty, MR number..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Export + Rows */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex gap-3">
              <button onClick={exportToExcel} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
                <Download className="w-5 h-5" /> Export Excel
              </button>
              <button onClick={exportToPDF} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
                <FileText className="w-5 h-5" /> Export PDF
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={e => { setRowsPerPage(+e.target.value); setCurrentPage(1); }}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600"
              >
                {[5, 10, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-purple-600 to-pink-600">
                  <tr>
                    {['NAME', 'TYPE', 'CONTACT', 'DETAILS', 'DATE/TIME', 'ACTIONS'].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white/90 divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">Loading...</td></tr>
                  ) : paginatedData.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">No data found</td></tr>
                  ) : (
                    paginatedData.map(item => {
                      const dt = new Date(item.datetime);
                      return (
                        <tr key={`${item.type}-${item.id}`} className="hover:bg-purple-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-purple-800">{item.name}</div>
                            <div className="text-xs text-gray-600">with {item.with}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                              item.type === 'appointment' ? 'bg-blue-100 text-blue-800' :
                              item.type === 'doctor' ? 'bg-purple-100 text-purple-800' :
                              'bg-pink-100 text-pink-800'
                            }`}>
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.contact}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{item.details}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {dt.toLocaleDateString('en-GB')} {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                            <button onClick={() => setSelectedItem(item)} className="text-purple-600 hover:text-purple-800">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button onClick={() => printItemPDF(item)} className="text-pink-600 hover:text-pink-800">
                              <Printer className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-purple-100">
              <div className="text-sm text-purple-700 mb-2 sm:mb-0">
                Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex space-x-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-4 py-2 border border-purple-300 rounded-xl text-purple-700 disabled:opacity-50 hover:bg-purple-100 transition-all">
                  Previous
                </button>
                <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium">
                  Page {currentPage} of {totalPages || 1}
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-purple-300 rounded-xl text-purple-700 disabled:opacity-50 hover:bg-purple-100 transition-all">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Modal */}
          {selectedItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div ref={modalRef} className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/40">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)} Details
                  </h3>
                  <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-red-600">
                    ×
                  </button>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
                  <div><strong>Name:</strong> {selectedItem.name}</div>
                  <div><strong>With:</strong> {selectedItem.with}</div>
                  <div><strong>Contact:</strong> {selectedItem.contact}</div>
                  <div><strong>Details:</strong> {selectedItem.details}</div>
                  <div><strong>Date/Time:</strong> {new Date(selectedItem.datetime).toLocaleString('en-GB')}</div>
                  <div className="pt-2 text-xs text-purple-600">Generated: {pktTime}</div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => { printItemPDF(selectedItem); setSelectedItem(null); }}
                    className="px-5 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg flex items-center gap-2">
                    <Printer className="w-5 h-5" /> Print PDF
                  </button>
                  <button onClick={() => setSelectedItem(null)}
                    className="px-5 py-3 border border-purple-300 rounded-xl text-purple-700 hover:bg-purple-50">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}