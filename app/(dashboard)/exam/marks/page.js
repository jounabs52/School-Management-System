'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Plus, Search, Save, AlertCircle, CheckCircle, XCircle, FileText, Printer, Eye } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ExamMarksPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [datesheets, setDatesheets] = useState([])
  const [completedDatesheets, setCompletedDatesheets] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const [activeTab, setActiveTab] = useState('enter') // 'enter', 'view', or 'result'

  // Enter Marks States
  const [selectedDatesheet, setSelectedDatesheet] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [totalMarks, setTotalMarks] = useState(0)
  const [marksData, setMarksData] = useState({})
  const [existingMarks, setExistingMarks] = useState({})

  // View Results States
  const [viewDatesheet, setViewDatesheet] = useState('')
  const [viewClass, setViewClass] = useState('')
  const [viewSubject, setViewSubject] = useState('')
  const [viewMarks, setViewMarks] = useState([])

  // Result Card States
  const [resultExam, setResultExam] = useState('')
  const [resultClass, setResultClass] = useState('')
  const [resultStudent, setResultStudent] = useState('')
  const [resultStudents, setResultStudents] = useState([])
  const [resultCardData, setResultCardData] = useState(null)

  const showToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
    }

    const userData = getCookie('user-data')
    if (userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData))
        setCurrentUser(user)
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchDatesheets()
      fetchCompletedDatesheets()
    }
  }, [currentUser])

  useEffect(() => {
    if (selectedDatesheet && currentUser?.school_id) {
      fetchClassesForDatesheet()
      setSelectedClass('')
      setSelectedSection('')
      setSelectedSubject('')
    } else {
      setClasses([])
      setSelectedClass('')
    }
  }, [selectedDatesheet])

  useEffect(() => {
    if (selectedDatesheet && selectedClass && currentUser?.school_id) {
      fetchSections()
      fetchSubjects()
    } else {
      setSections([])
      setSubjects([])
      setSelectedSection('')
      setSelectedSubject('')
    }
  }, [selectedDatesheet, selectedClass])

  useEffect(() => {
    if (selectedDatesheet && selectedClass && selectedSubject && currentUser?.school_id) {
      fetchStudents()
      fetchExistingMarks()
      fetchTotalMarks()
    } else {
      setStudents([])
      setMarksData({})
    }
  }, [selectedDatesheet, selectedClass, selectedSection, selectedSubject])

  // View Results Effects
  useEffect(() => {
    if (viewDatesheet && currentUser?.school_id) {
      fetchClassesForViewDatesheet()
      setViewClass('')
      setViewSubject('')
    } else {
      setClasses([])
      setViewClass('')
    }
  }, [viewDatesheet])

  useEffect(() => {
    if (viewDatesheet && viewClass && currentUser?.school_id) {
      fetchViewSubjects()
    } else {
      setSubjects([])
    }
  }, [viewDatesheet, viewClass])

  useEffect(() => {
    if (viewDatesheet && viewClass && viewSubject && currentUser?.school_id) {
      fetchExamResults()
    } else {
      setViewMarks([])
    }
  }, [viewDatesheet, viewClass, viewSubject])

  // Result Card Effects
  useEffect(() => {
    if (resultExam && currentUser?.school_id) {
      fetchResultClasses()
      setResultClass('')
      setResultStudent('')
    } else {
      setResultClass('')
    }
  }, [resultExam])

  useEffect(() => {
    if (resultExam && resultClass && currentUser?.school_id) {
      fetchResultStudents()
      setResultStudent('')
    } else {
      setResultStudents([])
    }
  }, [resultExam, resultClass])

  useEffect(() => {
    if (resultExam && resultClass && resultStudent && currentUser?.school_id) {
      fetchResultCardData()
    } else {
      setResultCardData(null)
    }
  }, [resultExam, resultClass, resultStudent])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('class_name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchClassesForDatesheet = async () => {
    try {
      // Get the exam details to find its class
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('class_id')
        .eq('id', selectedDatesheet)
        .single()

      if (examError) throw examError

      if (examData?.class_id) {
        // Fetch the class details
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('id', examData.class_id)
          .eq('school_id', currentUser.school_id)
          .eq('status', 'active')
          .order('class_name')

        if (error) throw error
        setClasses(data || [])
      } else {
        setClasses([])
      }
    } catch (error) {
      console.error('Error fetching classes for exam:', error)
      setClasses([])
    }
  }

  const fetchClassesForViewDatesheet = async () => {
    try {
      // Get the exam details to find its class
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('class_id')
        .eq('id', viewDatesheet)
        .single()

      if (examError) throw examError

      if (examData?.class_id) {
        // Fetch the class details
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('id', examData.class_id)
          .eq('school_id', currentUser.school_id)
          .eq('status', 'active')
          .order('class_name')

        if (error) throw error
        setClasses(data || [])
      } else {
        setClasses([])
      }
    } catch (error) {
      console.error('Error fetching classes for view exam:', error)
      setClasses([])
    }
  }

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('section_name')

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Error fetching sections:', error)
    }
  }

  const fetchDatesheets = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'scheduled')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDatesheets(data || [])
    } catch (error) {
      console.error('Error fetching exams:', error)
    }
  }

  const fetchCompletedDatesheets = async () => {
    try {
      // Fetch exams that have marks entered
      const { data: marksData, error: marksError } = await supabase
        .from('exam_marks')
        .select('exam_id')
        .eq('school_id', currentUser.school_id)

      if (marksError) throw marksError

      const examIds = [...new Set(marksData?.map(m => m.exam_id) || [])]

      if (examIds.length === 0) {
        setCompletedDatesheets([])
        return
      }

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .in('id', examIds)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCompletedDatesheets(data || [])
    } catch (error) {
      console.error('Error fetching completed exams:', error)
    }
  }

  const fetchSubjects = async () => {
    try {
      // Fetch subjects from exam_schedules for the selected exam and class
      const { data, error } = await supabase
        .from('exam_schedules')
        .select(`
          subject_id,
          subjects (
            id,
            subject_name,
            subject_code
          )
        `)
        .eq('school_id', currentUser.school_id)
        .eq('exam_id', selectedDatesheet)
        .eq('class_id', selectedClass)

      if (error) throw error

      // Get unique subjects (in case there are duplicates)
      const uniqueSubjects = []
      const seenIds = new Set()
      data?.forEach(item => {
        if (item.subjects && !seenIds.has(item.subjects.id)) {
          seenIds.add(item.subjects.id)
          uniqueSubjects.push(item.subjects)
        }
      })

      setSubjects(uniqueSubjects)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const fetchViewSubjects = async () => {
    try {
      // Fetch subjects from exam_schedules for the selected exam and class
      const { data, error } = await supabase
        .from('exam_schedules')
        .select(`
          subject_id,
          subjects (
            id,
            subject_name,
            subject_code
          )
        `)
        .eq('school_id', currentUser.school_id)
        .eq('exam_id', viewDatesheet)
        .eq('class_id', viewClass)

      if (error) throw error

      // Get unique subjects (in case there are duplicates)
      const uniqueSubjects = []
      const seenIds = new Set()
      data?.forEach(item => {
        if (item.subjects && !seenIds.has(item.subjects.id)) {
          seenIds.add(item.subjects.id)
          uniqueSubjects.push(item.subjects)
        }
      })

      setSubjects(uniqueSubjects)
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const fetchTotalMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('total_marks')
        .eq('id', selectedDatesheet)
        .single()

      if (error) {
        // If no exam found, default to 100
        setTotalMarks(100)
      } else {
        setTotalMarks(data?.total_marks || 100)
      }
    } catch (error) {
      console.error('Error fetching total marks:', error)
      setTotalMarks(100)
    }
  }

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('current_class_id', selectedClass)
        .eq('status', 'active')
        .order('roll_number')

      // Add section filter only if section is selected
      if (selectedSection) {
        query = query.eq('current_section_id', selectedSection)
      }

      const { data, error } = await query

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchExistingMarks = async () => {
    try {
      let query = supabase
        .from('exam_marks')
        .select('*')
        .eq('exam_id', selectedDatesheet)
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)

      // Add section filter only if section is selected
      if (selectedSection) {
        query = query.eq('section_id', selectedSection)
      }

      const { data, error } = await query

      if (error) throw error

      const marksMap = {}
      data?.forEach(mark => {
        marksMap[mark.student_id] = {
          obtained_marks: mark.obtained_marks,
          is_absent: mark.obtained_marks === null,
          remarks: mark.remarks || '',
          id: mark.id
        }
      })
      setExistingMarks(marksMap)
      setMarksData(marksMap)
    } catch (error) {
      console.error('Error fetching existing marks:', error)
    }
  }

  const fetchExamResults = async () => {
    try {
      const { data: marksData, error: marksError } = await supabase
        .from('exam_marks')
        .select(`
          *,
          students (
            id,
            admission_number,
            first_name,
            last_name,
            father_name,
            roll_number,
            current_section_id
          )
        `)
        .eq('exam_id', viewDatesheet)
        .eq('class_id', viewClass)
        .eq('subject_id', viewSubject)
        .order('students(roll_number)')

      if (marksError) throw marksError

      setViewMarks(marksData || [])
    } catch (error) {
      console.error('Error fetching exam results:', error)
      showToast('Failed to fetch exam results', 'error')
    }
  }

  // Result Card Fetch Functions
  const fetchResultClasses = async () => {
    try {
      // Get the exam details to find its class
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('class_id')
        .eq('id', resultExam)
        .single()

      if (examError) throw examError

      if (examData?.class_id) {
        // Fetch the class details
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('id', examData.class_id)
          .eq('school_id', currentUser.school_id)
          .eq('status', 'active')

        if (error) throw error
        setClasses(data || [])

        // Auto-select if only one class
        if (data?.length === 1) {
          setResultClass(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching result classes:', error)
      setClasses([])
    }
  }

  const fetchResultStudents = async () => {
    try {
      // Get students who have exam marks for this exam and class
      const { data: marksData, error: marksError } = await supabase
        .from('exam_marks')
        .select(`
          student_id,
          students (
            id,
            admission_number,
            first_name,
            last_name,
            father_name,
            roll_number
          )
        `)
        .eq('exam_id', resultExam)
        .eq('class_id', resultClass)
        .eq('school_id', currentUser.school_id)

      if (marksError) throw marksError

      // Get unique students
      const uniqueStudents = []
      const seenIds = new Set()
      marksData?.forEach(item => {
        if (item.students && !seenIds.has(item.students.id)) {
          seenIds.add(item.students.id)
          uniqueStudents.push(item.students)
        }
      })

      // Sort by roll number
      uniqueStudents.sort((a, b) => {
        const rollA = parseInt(a.roll_number) || 0
        const rollB = parseInt(b.roll_number) || 0
        return rollA - rollB
      })

      setResultStudents(uniqueStudents)
    } catch (error) {
      console.error('Error fetching result students:', error)
      setResultStudents([])
    }
  }

  const fetchResultCardData = async () => {
    try {
      // Fetch all marks for this student in this exam
      const { data: marksData, error: marksError } = await supabase
        .from('exam_marks')
        .select(`
          *,
          subjects (
            id,
            subject_name,
            subject_code
          )
        `)
        .eq('exam_id', resultExam)
        .eq('student_id', resultStudent)
        .eq('school_id', currentUser.school_id)
        .order('subjects(subject_name)')

      if (marksError) throw marksError

      // Fetch student details
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', resultStudent)
        .single()

      if (studentError) throw studentError

      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', resultExam)
        .single()

      if (examError) throw examError

      // Fetch class details
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', resultClass)
        .single()

      if (classError) throw classError

      // Calculate statistics
      let totalObtained = 0
      let totalMax = 0
      let subjectsPassed = 0
      let subjectsFailed = 0
      let absences = 0

      const subjects = marksData.map(mark => {
        const isAbsent = mark.obtained_marks === null
        const percentage = isAbsent ? 0 : ((mark.obtained_marks / mark.total_marks) * 100)
        const isPassing = percentage >= 40

        if (isAbsent) {
          absences++
        } else {
          totalObtained += parseFloat(mark.obtained_marks) || 0
          if (isPassing) {
            subjectsPassed++
          } else {
            subjectsFailed++
          }
        }
        totalMax += parseFloat(mark.total_marks) || 0

        // Calculate grade
        let grade = 'F'
        if (isAbsent) {
          grade = 'Abs'
        } else if (percentage >= 90) {
          grade = 'A+'
        } else if (percentage >= 80) {
          grade = 'A'
        } else if (percentage >= 70) {
          grade = 'B'
        } else if (percentage >= 60) {
          grade = 'C'
        } else if (percentage >= 50) {
          grade = 'D'
        } else if (percentage >= 40) {
          grade = 'E'
        }

        return {
          subject_name: mark.subjects?.subject_name || 'N/A',
          subject_code: mark.subjects?.subject_code || 'N/A',
          total_marks: mark.total_marks,
          obtained_marks: mark.obtained_marks,
          percentage: percentage.toFixed(2),
          grade: grade,
          is_absent: isAbsent,
          is_passing: isPassing
        }
      })

      const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0
      const overallGrade =
        overallPercentage >= 90 ? 'A+' :
        overallPercentage >= 80 ? 'A' :
        overallPercentage >= 70 ? 'B' :
        overallPercentage >= 60 ? 'C' :
        overallPercentage >= 50 ? 'D' :
        overallPercentage >= 40 ? 'E' : 'F'

      const result = subjectsFailed === 0 && absences === 0 ? 'PASS' : 'FAIL'

      setResultCardData({
        student: studentData,
        exam: examData,
        class: classData,
        subjects: subjects,
        statistics: {
          totalObtained,
          totalMax,
          overallPercentage,
          overallGrade,
          subjectsPassed,
          subjectsFailed,
          absences,
          result
        }
      })
    } catch (error) {
      console.error('Error fetching result card data:', error)
      showToast('Failed to fetch result card data', 'error')
      setResultCardData(null)
    }
  }

  const handleMarksChange = (studentId, field, value) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const handleSaveMarks = async () => {
    if (!currentUser || !currentUser.school_id) {
      showToast('User session not found. Please refresh and try again.', 'error')
      return
    }

    if (!selectedDatesheet || !selectedClass || !selectedSubject || students.length === 0) {
      showToast('Please select exam, class, subject and ensure students are loaded', 'error')
      return
    }

    setLoading(true)
    try {
      // Validate marks
      for (const studentId in marksData) {
        const marks = marksData[studentId]
        if (!marks.is_absent && marks.obtained_marks) {
          if (parseFloat(marks.obtained_marks) > parseFloat(totalMarks)) {
            showToast(`Obtained marks cannot exceed total marks (${totalMarks})`, 'error')
            setLoading(false)
            return
          }
        }
      }

      // Prepare data for upsert
      const marksToSave = students.map(student => {
        const marks = marksData[student.id] || {}
        return {
          school_id: currentUser.school_id,
          exam_id: selectedDatesheet,
          student_id: student.id,
          class_id: selectedClass,
          section_id: selectedSection || student.current_section_id,
          subject_id: selectedSubject,
          total_marks: parseFloat(totalMarks),
          obtained_marks: marks.is_absent ? null : (marks.obtained_marks ? parseFloat(marks.obtained_marks) : null),
          entered_by: currentUser.id,
          entry_date: new Date().toISOString().split('T')[0]
        }
      })

      console.log('Saving marks data:', {
        count: marksToSave.length,
        sample: marksToSave[0],
        school_id: currentUser.school_id,
        exam_id: selectedDatesheet
      })

      const { error } = await supabase
        .from('exam_marks')
        .upsert(marksToSave, {
          onConflict: 'school_id,exam_id,student_id,subject_id'
        })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      showToast('Marks saved successfully', 'success')
      fetchExistingMarks()
      fetchCompletedDatesheets()
    } catch (error) {
      console.error('Error saving marks:', error)
      showToast('Failed to save marks', 'error')
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = () => {
    if (!viewDatesheet || !viewClass || !viewSubject || viewMarks.length === 0) {
      showToast('No data to generate PDF', 'error')
      return
    }

    try {
      const datesheet = completedDatesheets.find(d => d.id === viewDatesheet)
      const classData = classes.find(c => c.id === viewClass)
      const subject = subjects.find(s => s.id === viewSubject)

      if (!datesheet || !classData || !subject) {
        showToast('Exam, class or subject data not found', 'error')
        return
      }

      console.log('Generating PDF for:', { datesheet, classData, subject, marksCount: viewMarks.length })

      const doc = new jsPDF()

      // School Header
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const schoolName = 'School Management System'
      doc.text(schoolName, doc.internal.pageSize.width / 2, 15, { align: 'center' })

      doc.setFontSize(14)
      doc.text('Exam Marks Report', doc.internal.pageSize.width / 2, 25, { align: 'center' })

      // Exam Details
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      doc.text(`Exam: ${datesheet.exam_name || 'N/A'}`, 14, 35)
      doc.text(`Class: ${classData.class_name || 'N/A'}`, 14, 42)
      doc.text(`Subject: ${subject.subject_name || 'N/A'}`, 120, 35)
      doc.text(`Total Students: ${viewMarks.length}`, 120, 42)

      // Draw line
      doc.setLineWidth(0.5)
      doc.line(14, 48, 196, 48)

      // Get total marks from first record
      const examTotalMarks = viewMarks[0]?.total_marks || 100

      // Prepare table data with percentage and status
      const tableData = viewMarks.map((mark, index) => {
        const student = mark.students || {}
        const isAbsent = mark.obtained_marks === null
        const percentage = isAbsent ? 0 : ((mark.obtained_marks / examTotalMarks) * 100).toFixed(2)
        const isPassing = percentage >= 40

        let status = 'Pass'
        if (isAbsent) {
          status = 'Absent'
        } else if (!isPassing) {
          status = 'Fail'
        }

        return [
          (index + 1).toString(),
          student.roll_number || 'N/A',
          student.admission_number || 'N/A',
          `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A',
          student.father_name || 'N/A',
          examTotalMarks.toString(),
          isAbsent ? 'Absent' : (mark.obtained_marks?.toString() || '0'),
          isAbsent ? '-' : `${percentage}%`,
          status
        ]
      })

      console.log('Table data prepared:', tableData.length, 'rows')

      // Generate table
      autoTable(doc, {
        startY: 54,
        head: [['Sr.', 'Roll No', 'Adm. No', 'Student Name', 'Father Name', 'Total', 'Obtained', 'Percentage', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 15 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'left', cellWidth: 35 },
          4: { halign: 'left', cellWidth: 32 },
          5: { halign: 'center', cellWidth: 15 },
          6: { halign: 'center', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 20 },
          8: { halign: 'center', cellWidth: 17 }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        didParseCell: function(data) {
          // Color code status column
          if (data.column.index === 8 && data.section === 'body') {
            const status = data.cell.raw
            if (status === 'Pass') {
              data.cell.styles.textColor = [34, 197, 94] // green-500
              data.cell.styles.fontStyle = 'bold'
            } else if (status === 'Fail') {
              data.cell.styles.textColor = [239, 68, 68] // red-500
              data.cell.styles.fontStyle = 'bold'
            } else if (status === 'Absent') {
              data.cell.styles.textColor = [107, 114, 128] // gray-500
              data.cell.styles.fontStyle = 'bold'
            }
          }
        }
      })

      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        const footerText = `Generated on: ${new Date().toLocaleDateString('en-GB')} | Page ${i} of ${pageCount}`
        doc.text(footerText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' })
      }

      // Save PDF with sanitized filename
      const examTitle = datesheet.exam_name || 'Exam'
      const subjectName = subject.subject_name || 'Subject'
      const fileName = `${examTitle}_${classData.class_name}_${subjectName}_Marks.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_')

      console.log('Saving PDF as:', fileName)
      doc.save(fileName)

      showToast('PDF generated successfully', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast(`Failed to generate PDF: ${error.message}`, 'error')
    }
  }

  const generateResultCardPDF = () => {
    if (!resultCardData) {
      showToast('No result card data available', 'error')
      return
    }

    try {
      const doc = new jsPDF()
      const { student, exam, class: classData, subjects, statistics } = resultCardData

      // Header with border
      doc.setDrawColor(30, 58, 138)
      doc.setLineWidth(1)
      doc.rect(10, 10, 190, 30)

      // School Name
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 58, 138)
      doc.text('School Management System', doc.internal.pageSize.width / 2, 20, { align: 'center' })

      // Title
      doc.setFontSize(14)
      doc.text('EXAMINATION RESULT CARD', doc.internal.pageSize.width / 2, 32, { align: 'center' })

      // Student Information Section
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)

      let yPos = 50

      // Student Details - Left Column
      doc.setFont('helvetica', 'bold')
      doc.text('Student Name:', 15, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${student.first_name} ${student.last_name}`, 55, yPos)

      doc.setFont('helvetica', 'bold')
      doc.text('Father Name:', 15, yPos + 7)
      doc.setFont('helvetica', 'normal')
      doc.text(student.father_name || 'N/A', 55, yPos + 7)

      doc.setFont('helvetica', 'bold')
      doc.text('Roll Number:', 15, yPos + 14)
      doc.setFont('helvetica', 'normal')
      doc.text(student.roll_number?.toString() || 'N/A', 55, yPos + 14)

      doc.setFont('helvetica', 'bold')
      doc.text('Admission No:', 15, yPos + 21)
      doc.setFont('helvetica', 'normal')
      doc.text(student.admission_number || 'N/A', 55, yPos + 21)

      // Student Details - Right Column
      doc.setFont('helvetica', 'bold')
      doc.text('Class:', 120, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(classData.class_name || 'N/A', 150, yPos)

      doc.setFont('helvetica', 'bold')
      doc.text('Exam:', 120, yPos + 7)
      doc.setFont('helvetica', 'normal')
      doc.text(exam.exam_name || 'N/A', 150, yPos + 7)

      doc.setFont('helvetica', 'bold')
      doc.text('Exam Date:', 120, yPos + 14)
      doc.setFont('helvetica', 'normal')
      const examDate = exam.start_date
        ? new Date(exam.start_date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : 'N/A'
      doc.text(examDate, 150, yPos + 14)

      doc.setFont('helvetica', 'bold')
      doc.text('Result Date:', 120, yPos + 21)
      doc.setFont('helvetica', 'normal')
      const resultDate = exam.result_declaration_date
        ? new Date(exam.result_declaration_date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : 'N/A'
      doc.text(resultDate, 150, yPos + 21)

      // Divider line
      yPos += 28
      doc.setLineWidth(0.5)
      doc.line(15, yPos, 195, yPos)

      // Marks Table
      yPos += 5
      const tableData = subjects.map((subject, index) => {
        return [
          (index + 1).toString(),
          subject.subject_name,
          subject.total_marks.toString(),
          subject.is_absent ? 'Absent' : subject.obtained_marks?.toString() || '0',
          subject.is_absent ? '-' : `${subject.percentage}%`,
          subject.grade,
          subject.is_absent ? 'Absent' : (subject.is_passing ? 'Pass' : 'Fail')
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Sr.', 'Subject', 'Total', 'Obtained', 'Percentage', 'Grade', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'left', cellWidth: 60 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 25 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'center', cellWidth: 20 }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        didParseCell: function(data) {
          // Color code grade column
          if (data.column.index === 5 && data.section === 'body') {
            const grade = data.cell.raw
            if (grade === 'A+' || grade === 'A') {
              data.cell.styles.textColor = [34, 197, 94] // green
              data.cell.styles.fontStyle = 'bold'
            } else if (grade === 'F') {
              data.cell.styles.textColor = [239, 68, 68] // red
              data.cell.styles.fontStyle = 'bold'
            } else if (grade === 'Abs') {
              data.cell.styles.textColor = [107, 114, 128] // gray
              data.cell.styles.fontStyle = 'bold'
            }
          }
          // Color code status column
          if (data.column.index === 6 && data.section === 'body') {
            const status = data.cell.raw
            if (status === 'Pass') {
              data.cell.styles.textColor = [34, 197, 94] // green
              data.cell.styles.fontStyle = 'bold'
            } else if (status === 'Fail') {
              data.cell.styles.textColor = [239, 68, 68] // red
              data.cell.styles.fontStyle = 'bold'
            } else if (status === 'Absent') {
              data.cell.styles.textColor = [107, 114, 128] // gray
              data.cell.styles.fontStyle = 'bold'
            }
          }
        },
        // Add total row
        foot: [[
          '',
          'Total',
          statistics.totalMax.toString(),
          statistics.totalObtained.toString(),
          `${statistics.overallPercentage}%`,
          statistics.overallGrade,
          statistics.result
        ]],
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        }
      })

      // Final Result Box
      const finalY = doc.lastAutoTable.finalY + 10
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')

      // Result status with colored background
      const resultText = `Final Result: ${statistics.result}`
      const resultColor = statistics.result === 'PASS' ? [34, 197, 94] : [239, 68, 68]

      doc.setFillColor(resultColor[0], resultColor[1], resultColor[2])
      doc.setTextColor(255, 255, 255)
      const textWidth = doc.getTextWidth(resultText)
      doc.rect(doc.internal.pageSize.width / 2 - textWidth / 2 - 5, finalY - 5, textWidth + 10, 10, 'F')
      doc.text(resultText, doc.internal.pageSize.width / 2, finalY + 2, { align: 'center' })

      // Grading Scale
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Grading Scale:', 15, finalY + 15)
      doc.setFont('helvetica', 'normal')
      doc.text('A+ (90-100%)  |  A (80-89%)  |  B (70-79%)  |  C (60-69%)  |  D (50-59%)  |  E (40-49%)  |  F (<40%)', 15, finalY + 21)

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      const footerY = doc.internal.pageSize.height - 15
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })}`, doc.internal.pageSize.width / 2, footerY, { align: 'center' })

      // Save PDF
      const fileName = `ResultCard_${student.first_name}_${student.last_name}_${exam.exam_name}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_')
      doc.save(fileName)

      showToast('Result card PDF generated successfully', 'success')
    } catch (error) {
      console.error('Error generating result card PDF:', error)
      showToast(`Failed to generate result card PDF: ${error.message}`, 'error')
    }
  }

  const selectedDatesheetData = datesheets.find(d => d.id === selectedDatesheet)
  const selectedClassData = classes.find(c => c.id === selectedClass)
  const selectedSectionData = sections.find(s => s.id === selectedSection)
  const selectedSubjectData = subjects.find(s => s.id === selectedSubject)

  const viewDatesheetData = completedDatesheets.find(d => d.id === viewDatesheet)
  const viewClassData = classes.find(c => c.id === viewClass)
  const viewSubjectData = subjects.find(s => s.id === viewSubject)

  return (
    <div className="p-1">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-green-600 text-white min-w-[300px]"
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="hover:bg-white/20 p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Exam Marks Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('enter')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'enter'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Enter Marks
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'view'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              View Results
            </button>
            <button
              onClick={() => setActiveTab('result')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'result'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Result Card
            </button>
          </div>
        </div>

        {activeTab === 'enter' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Exam <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDatesheet}
                  onChange={(e) => setSelectedDatesheet(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Exam</option>
                  {datesheets.map(datesheet => (
                    <option key={datesheet.id} value={datesheet.id}>
                      {datesheet.exam_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Section <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">All Sections</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.section_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedDatesheet && selectedClass && selectedSection && selectedSubject && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Exam:</span>
                    <span className="ml-2 text-gray-900">{selectedDatesheetData?.exam_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Class:</span>
                    <span className="ml-2 text-gray-900">{selectedClassData?.class_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Total Marks:</span>
                    <span className="ml-2 text-gray-900">{totalMarks}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Students:</span>
                    <span className="ml-2 text-gray-900">{students.length}</span>
                  </div>
                </div>
              </div>
            )}

            {students.length > 0 && selectedSubject && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-900 text-white sticky top-0 z-10">
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Roll No</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Admission No</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Student Name</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Father Name</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800 w-32">
                          Marks Obtained <span className="text-red-300">*</span>
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800 w-24">Absent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const marks = marksData[student.id] || {}
                        return (
                          <tr key={student.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                            <td className="px-3 py-2.5 border border-gray-200">{index + 1}</td>
                            <td className="px-3 py-2.5 border border-gray-200">{student.roll_number || 'N/A'}</td>
                            <td className="px-3 py-2.5 border border-gray-200">{student.admission_number}</td>
                            <td className="px-3 py-2.5 border border-gray-200 font-medium">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200">{student.father_name}</td>
                            <td className="px-3 py-2.5 border border-gray-200">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={totalMarks}
                                value={marks.obtained_marks || ''}
                                onChange={(e) => handleMarksChange(student.id, 'obtained_marks', e.target.value)}
                                disabled={marks.is_absent}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200 text-center">
                              <input
                                type="checkbox"
                                checked={marks.is_absent || false}
                                onChange={(e) => handleMarksChange(student.id, 'is_absent', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setMarksData(existingMarks)
                      showToast('Changes reset', 'info')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSaveMarks}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Marks'}
                  </button>
                </div>
              </div>
            )}

            {selectedDatesheet && selectedClass && selectedSubject && students.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No students found for the selected class{selectedSection ? '/section' : ''}</p>
              </div>
            )}

            {(!selectedDatesheet || !selectedClass || !selectedSubject) && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Please select exam, class, and subject to enter marks</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'view' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Exam <span className="text-red-500">*</span>
                </label>
                <select
                  value={viewDatesheet}
                  onChange={(e) => {
                    setViewDatesheet(e.target.value)
                    setViewClass('')
                    setViewSubject('')
                    setViewMarks([])
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Exam</option>
                  {completedDatesheets.map(datesheet => (
                    <option key={datesheet.id} value={datesheet.id}>
                      {datesheet.exam_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={viewClass}
                  onChange={(e) => setViewClass(e.target.value)}
                  disabled={!viewDatesheet}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={viewSubject}
                  onChange={(e) => setViewSubject(e.target.value)}
                  disabled={!viewClass}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generatePDF}
                  disabled={!viewDatesheet || !viewClass || !viewSubject || viewMarks.length === 0}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Print PDF
                </button>
              </div>
            </div>

            {viewDatesheet && viewClass && viewSubject && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Exam:</span>
                    <span className="ml-2 text-gray-900">{viewDatesheetData?.exam_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Class:</span>
                    <span className="ml-2 text-gray-900">{viewClassData?.class_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Subject:</span>
                    <span className="ml-2 text-gray-900">{viewSubjectData?.subject_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Total Students:</span>
                    <span className="ml-2 text-gray-900">{viewMarks.length}</span>
                  </div>
                </div>
              </div>
            )}

            {viewMarks.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-900 text-white sticky top-0 z-10">
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Roll No</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Admission No</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Student Name</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Father Name</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Total Marks</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Obtained Marks</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Percentage</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewMarks.map((mark, index) => {
                        const student = mark.students
                        const isAbsent = mark.obtained_marks === null
                        const percentage = isAbsent ? 0 : ((mark.obtained_marks / mark.total_marks) * 100).toFixed(2)
                        const isPassing = percentage >= 40

                        return (
                          <tr key={mark.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                            <td className="px-3 py-2.5 border border-gray-200">{index + 1}</td>
                            <td className="px-3 py-2.5 border border-gray-200">{student.roll_number || 'N/A'}</td>
                            <td className="px-3 py-2.5 border border-gray-200">{student.admission_number}</td>
                            <td className="px-3 py-2.5 border border-gray-200 font-medium">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200">{student.father_name}</td>
                            <td className="px-3 py-2.5 border border-gray-200 text-center">{mark.total_marks}</td>
                            <td className="px-3 py-2.5 border border-gray-200 text-center font-medium">
                              {isAbsent ? (
                                <span className="text-red-600">Absent</span>
                              ) : (
                                mark.obtained_marks || 0
                              )}
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200 text-center">
                              {isAbsent ? '-' : `${percentage}%`}
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200">
                              {isAbsent ? (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                  Absent
                                </span>
                              ) : isPassing ? (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  Pass
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  Fail
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewDatesheet && viewClass && viewSubject && viewMarks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No marks found for the selected exam, class, and subject</p>
              </div>
            )}

            {(!viewDatesheet || !viewClass || !viewSubject) && (
              <div className="text-center py-12 text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Please select exam, class, and subject to view results</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'result' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Exam <span className="text-red-500">*</span>
                </label>
                <select
                  value={resultExam}
                  onChange={(e) => {
                    setResultExam(e.target.value)
                    setResultClass('')
                    setResultStudent('')
                    setResultCardData(null)
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Exam</option>
                  {completedDatesheets.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.exam_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={resultClass}
                  onChange={(e) => {
                    setResultClass(e.target.value)
                    setResultStudent('')
                    setResultCardData(null)
                  }}
                  disabled={!resultExam}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student <span className="text-red-500">*</span>
                </label>
                <select
                  value={resultStudent}
                  onChange={(e) => setResultStudent(e.target.value)}
                  disabled={!resultClass}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select Student</option>
                  {resultStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.roll_number} - {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {resultCardData && (
              <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 text-center">
                  <h1 className="text-2xl font-bold mb-1">School Management System</h1>
                  <h2 className="text-lg font-semibold">EXAMINATION RESULT CARD</h2>
                </div>

                {/* Student & Exam Info */}
                <div className="p-6 border-b border-gray-300 bg-gray-50">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="font-semibold w-36 text-gray-700">Student Name:</span>
                        <span className="text-gray-900">{resultCardData.student.first_name} {resultCardData.student.last_name}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold w-36 text-gray-700">Father Name:</span>
                        <span className="text-gray-900">{resultCardData.student.father_name}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold w-36 text-gray-700">Roll Number:</span>
                        <span className="text-gray-900">{resultCardData.student.roll_number}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold w-36 text-gray-700">Admission No:</span>
                        <span className="text-gray-900">{resultCardData.student.admission_number}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="font-semibold w-36 text-gray-700">Class:</span>
                        <span className="text-gray-900">{resultCardData.class.class_name}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold w-36 text-gray-700">Exam:</span>
                        <span className="text-gray-900">{resultCardData.exam.exam_name}</span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold w-36 text-gray-700">Exam Date:</span>
                        <span className="text-gray-900">
                          {resultCardData.exam.start_date
                            ? new Date(resultCardData.exam.start_date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex">
                        <span className="font-semibold w-36 text-gray-700">Result Date:</span>
                        <span className="text-gray-900">
                          {resultCardData.exam.result_declaration_date
                            ? new Date(resultCardData.exam.result_declaration_date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Marks Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Sr.</th>
                        <th className="px-3 py-2.5 text-left font-semibold border border-blue-800">Subject</th>
                        <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Total Marks</th>
                        <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Obtained Marks</th>
                        <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Percentage</th>
                        <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Grade</th>
                        <th className="px-3 py-2.5 text-center font-semibold border border-blue-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultCardData.subjects.map((subject, index) => (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                          <td className="px-3 py-2.5 border border-gray-200">{index + 1}</td>
                          <td className="px-3 py-2.5 border border-gray-200 font-medium">{subject.subject_name}</td>
                          <td className="px-3 py-2.5 border border-gray-200 text-center">{subject.total_marks}</td>
                          <td className="px-3 py-2.5 border border-gray-200 text-center font-medium">
                            {subject.is_absent ? (
                              <span className="text-red-600">Absent</span>
                            ) : (
                              subject.obtained_marks
                            )}
                          </td>
                          <td className="px-3 py-2.5 border border-gray-200 text-center">
                            {subject.is_absent ? '-' : `${subject.percentage}%`}
                          </td>
                          <td className="px-3 py-2.5 border border-gray-200 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              subject.grade === 'A+' ? 'bg-green-100 text-green-800' :
                              subject.grade === 'A' ? 'bg-green-100 text-green-700' :
                              subject.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              subject.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              subject.grade === 'D' || subject.grade === 'E' ? 'bg-orange-100 text-orange-800' :
                              subject.grade === 'Abs' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {subject.grade}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 border border-gray-200 text-center">
                            {subject.is_absent ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                Absent
                              </span>
                            ) : subject.is_passing ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                Pass
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                Fail
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-900 border-t-2 border-blue-800">
                      <tr>
                        <td colSpan="2" className="px-3 py-3 text-right font-bold text-white border border-blue-800">Total:</td>
                        <td className="px-3 py-3 text-center font-bold text-white border border-blue-800">{resultCardData.statistics.totalMax}</td>
                        <td className="px-3 py-3 text-center font-bold text-white border border-blue-800">{resultCardData.statistics.totalObtained}</td>
                        <td className="px-3 py-3 text-center font-bold text-white border border-blue-800">{resultCardData.statistics.overallPercentage}%</td>
                        <td className="px-3 py-3 text-center border border-blue-800">
                          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            resultCardData.statistics.overallGrade === 'A+' ? 'bg-green-100 text-green-800' :
                            resultCardData.statistics.overallGrade === 'A' ? 'bg-green-100 text-green-700' :
                            resultCardData.statistics.overallGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                            resultCardData.statistics.overallGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            resultCardData.statistics.overallGrade === 'D' || resultCardData.statistics.overallGrade === 'E' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {resultCardData.statistics.overallGrade}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center border border-blue-800">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                            resultCardData.statistics.result === 'PASS'
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}>
                            {resultCardData.statistics.result}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Download Button */}
                <div className="p-4 bg-gray-50 border-t border-gray-300 flex justify-center">
                  <button
                    onClick={generateResultCardPDF}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Download Result Card PDF
                  </button>
                </div>
              </div>
            )}

            {!resultCardData && resultExam && resultClass && resultStudent && (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Loading result card data...</p>
              </div>
            )}

            {(!resultExam || !resultClass || !resultStudent) && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Please select exam, class, and student to generate result card</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
