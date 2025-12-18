// PDF Generator for Datesheets using jsPDF
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  addPDFHeader,
  addPDFFooter,
  addPDFWatermark,
  PDF_COLORS,
  PDF_FONTS
} from './pdfUtils'

export const generateDatesheetPDF = (datesheet, schedules, classes, subjects, schoolData = null) => {
  const doc = new jsPDF('landscape')

  // Add professional header with logo
  const headerOptions = {
    subtitle: datesheet.title,
    session: datesheet.session
  }
  let yPosition = addPDFHeader(doc, schoolData, 'EXAMINATION DATE SHEET', headerOptions)

  // Add watermark
  if (schoolData) {
    addPDFWatermark(doc, schoolData)
  }

  yPosition += 5

  // Group schedules by class
  const uniqueClassIds = [...new Set(schedules.map(s => s.class_id))]

  uniqueClassIds.forEach((classId, index) => {
    const className = classes.find(c => c.id === classId)?.class_name || 'Unknown Class'
    const classSchedules = schedules.filter(s => s.class_id === classId && s.subject_id)

    if (classSchedules.length === 0) return

    // Add class header
    doc.setFontSize(13)
    doc.setFont(PDF_FONTS.primary, 'bold')
    doc.setTextColor(...PDF_COLORS.primary)
    doc.text(`Class: ${className}`, 14, yPosition)
    yPosition += 7

    // Prepare table data
    const tableData = classSchedules.map((schedule, idx) => {
      const subjectName = subjects.find(s => s.id === schedule.subject_id)?.subject_name || 'N/A'
      const examDate = new Date(schedule.exam_date).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        weekday: 'short'
      })
      const startTime = formatTime(schedule.start_time)
      const endTime = formatTime(schedule.end_time)

      return [
        idx + 1,
        subjectName,
        examDate,
        `${startTime} - ${endTime}`,
        schedule.room_number || '-'
      ]
    })

    // Add table
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Subject', 'Exam Date & Day', 'Time', 'Room']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.headerBg,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 100, halign: 'left' },
        2: { cellWidth: 60, fontStyle: 'bold' },
        3: { cellWidth: 50 },
        4: { cellWidth: 40 }
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      }
    })

    yPosition = doc.lastAutoTable.finalY + 10

    // Check if we need a new page
    if (yPosition > 170 && index < uniqueClassIds.length - 1) {
      doc.addPage('landscape')

      // Add header on new page
      yPosition = addPDFHeader(doc, schoolData, 'EXAMINATION DATE SHEET', headerOptions)
      if (schoolData) {
        addPDFWatermark(doc, schoolData)
      }
      yPosition += 5
    }
  })

  // Add professional footer to all pages
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    addPDFFooter(doc, i, pageCount)
  }

  // Save the PDF
  const fileName = `${datesheet.title.replace(/\s+/g, '_')}_${datesheet.session}.pdf`
  doc.save(fileName)
}

// Helper function to format time
const formatTime = (timeString) => {
  if (!timeString) return ''
  try {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return timeString
  }
}
