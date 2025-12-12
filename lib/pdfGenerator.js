// PDF Generator for Datesheets using jsPDF
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export const generateDatesheetPDF = (datesheet, schedules, classes, subjects, schoolName = 'School Name') => {
  const doc = new jsPDF('landscape')

  // Add school header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(schoolName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' })

  // Add datesheet title
  doc.setFontSize(16)
  doc.text(`Date Sheet: ${datesheet.title}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' })

  // Add session info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Session: ${datesheet.session}`, doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' })

  // Group schedules by class
  const uniqueClassIds = [...new Set(schedules.map(s => s.class_id))]

  let yPosition = 40

  uniqueClassIds.forEach((classId, index) => {
    const className = classes.find(c => c.id === classId)?.class_name || 'Unknown Class'
    const classSchedules = schedules.filter(s => s.class_id === classId && s.subject_id)

    if (classSchedules.length === 0) return

    // Add class header
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Class: ${className}`, 14, yPosition)
    yPosition += 7

    // Prepare table data
    const tableData = classSchedules.map((schedule, idx) => {
      const subjectName = subjects.find(s => s.id === schedule.subject_id)?.subject_name || 'N/A'
      const examDate = new Date(schedule.exam_date).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
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
    doc.autoTable({
      startY: yPosition,
      head: [['#', 'Subject', 'Exam Date', 'Time', 'Room']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { cellWidth: 50 },
        3: { cellWidth: 60 },
        4: { cellWidth: 40 }
      }
    })

    yPosition = doc.lastAutoTable.finalY + 10

    // Check if we need a new page
    if (yPosition > 180 && index < uniqueClassIds.length - 1) {
      doc.addPage()
      yPosition = 20
    }
  })

  // Add footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
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
