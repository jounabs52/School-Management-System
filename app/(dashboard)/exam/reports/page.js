'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, FileText, Download, Users, TrendingUp, Calendar, BookOpen, Award } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'
import {
  getPdfSettings,
  hexToRgb,
  getMarginValues,
  getLogoSize,
  applyPdfSettings,
  getAutoTableStyles
} from '@/lib/pdfSettings'
import { convertImageToBase64 } from '@/lib/pdfUtils'
import PDFPreviewModal from '@/components/PDFPreviewModal'
import PermissionGuard from '@/components/PermissionGuard'
import { getUserFromCookie } from '@/lib/clientAuth'

function ExamReportsPageContent() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [schoolDetails, setSchoolDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  // Data states
  const [tests, setTests] = useState([])
  const [testMarks, setTestMarks] = useState([])
  const [exams, setExams] = useState([])
  const [examMarks, setExamMarks] = useState([])
  const [combinedAssessments, setCombinedAssessments] = useState([]) // Combined tests + exams
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])

  // Filter states
  const [activeTab, setActiveTab] = useState('test-results') // test-results, class-summary, subject-summary, top-performers
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedTest, setSelectedTest] = useState('')
  const [selectedType, setSelectedType] = useState('') // 'test' or 'exam'

  // Report data
  const [reportData, setReportData] = useState(null)
  const [stats, setStats] = useState({})

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchData()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser && (tests.length > 0 || exams.length > 0)) {
      generateReport()
    }
  }, [activeTab, selectedClass, selectedSubject, selectedTest, selectedType, tests, testMarks, exams, examMarks, combinedAssessments])

  const checkAuth = async () => {
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-data='))

    if (!userCookie) {
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]))
      setCurrentUser(user)

      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user.school_id)
        .single()

      // Convert logo URL to base64 if needed
      if (schoolData?.logo_url && (schoolData.logo_url.startsWith('http://') || schoolData.logo_url.startsWith('https://'))) {
        try {
          schoolData.logo_url = await convertImageToBase64(schoolData.logo_url)
        } catch (error) {
          console.error('Error converting logo:', error)
        }
      }

      setSchoolDetails(schoolData)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('=== STARTING DATA FETCH ===')
      console.log('Current user:', currentUser)
      console.log('School ID:', currentUser?.school_id)

      if (!currentUser?.school_id) {
        console.error('No school_id found!')
        toast.error('User session invalid. Please login again.')
        setLoading(false)
        return
      }

      // Fetch tests
      console.log('Fetching tests...')
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)
        .order('test_date', { ascending: false })

      console.log('Tests response:', { data: testsData, error: testsError })

      if (testsError) {
        console.error('Tests error:', testsError)
        toast.error('Failed to load tests: ' + testsError.message)
        setLoading(false)
        return
      }

      if (!testsData || testsData.length === 0) {
        console.warn('No tests found in database')
        toast.info('No tests found. Please create tests first.')
        setTests([])
        setLoading(false)
        return
      }

      console.log(`✓ Found ${testsData.length} tests`)

      // Fetch classes
      console.log('Fetching classes...')
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('class_name')

      console.log('Classes response:', { data: classesData, error: classesError })

      if (classesError) {
        console.error('Classes error:', classesError)
        toast.error('Failed to load classes: ' + classesError.message)
      }

      console.log(`✓ Found ${classesData?.length || 0} classes`)
      setClasses(classesData || [])

      // Fetch sections
      console.log('Fetching sections...')
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('section_name')

      console.log('Sections response:', { data: sectionsData, error: sectionsError })

      if (sectionsError) {
        console.error('Sections error:', sectionsError)
        toast.error('Failed to load sections: ' + sectionsError.message)
      }

      console.log(`✓ Found ${sectionsData?.length || 0} sections`)
      setSections(sectionsData || [])

      // Fetch subjects
      console.log('Fetching subjects...')
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('subject_name')

      console.log('Subjects response:', { data: subjectsData, error: subjectsError })

      if (subjectsError) {
        console.error('Subjects error:', subjectsError)
        toast.error('Failed to load subjects: ' + subjectsError.message)
      }

      console.log(`✓ Found ${subjectsData?.length || 0} subjects`)
      setSubjects(subjectsData || [])

      // Fetch test marks
      console.log('Fetching test marks...')
      const { data: marksData, error: marksError } = await supabase
        .from('test_marks')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)

      console.log('Marks response:', { data: marksData, error: marksError })

      if (marksError) {
        console.error('Marks error:', marksError)
        toast.error('Failed to load test marks: ' + marksError.message)
      }

      console.log(`✓ Found ${marksData?.length || 0} test marks`)

      // Fetch students
      console.log('Fetching students...')
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', currentUser.school_id)

      console.log('Students response:', { data: studentsData, error: studentsError })

      if (studentsError) {
        console.error('Students error:', studentsError)
      }

      console.log(`✓ Found ${studentsData?.length || 0} students`)

      // Manual joins
      console.log('Performing manual joins...')

      const testsWithRelations = testsData.map(test => {
        const classData = classesData?.find(c => c.id === test.class_id)
        const sectionData = sectionsData?.find(s => s.id === test.section_id)
        const subjectData = subjectsData?.find(s => s.id === test.subject_id)

        console.log(`Test ${test.id}: class=${classData?.class_name}, section=${sectionData?.section_name}, subject=${subjectData?.subject_name}`)

        return {
          ...test,
          classes: classData,
          sections: sectionData,
          subjects: subjectData
        }
      })

      setTests(testsWithRelations)
      console.log(`✓ Created ${testsWithRelations.length} tests with relations`)

      // Join marks with students
      if (marksData && marksData.length > 0) {
        const marksWithRelations = marksData.map(mark => ({
          ...mark,
          students: studentsData?.find(s => s.id === mark.student_id),
          tests: testsData?.find(t => t.id === mark.test_id),
          subjects: subjectsData?.find(s => s.id === mark.subject_id)
        }))

        setTestMarks(marksWithRelations)
        console.log(`✓ Created ${marksWithRelations.length} marks with relations`)
      } else {
        setTestMarks([])
        console.log('No marks to join')
      }

      // Fetch exams from exams table
      console.log('Fetching exams...')
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      console.log('Exams response:', { data: examsData, error: examsError })

      if (examsError) {
        console.error('Exams error:', examsError)
      }

      const examsWithRelations = (examsData || []).map(exam => {
        const classData = classesData?.find(c => c.id === exam.class_id)
        const sectionData = sectionsData?.find(s => s.id === exam.section_id)

        return {
          ...exam,
          classes: classData,
          sections: sectionData
        }
      })

      setExams(examsWithRelations)
      console.log(`✓ Found ${examsWithRelations.length} exams`)

      // Fetch exam marks
      console.log('Fetching exam marks...')
      const { data: examMarksData, error: examMarksError } = await supabase
        .from('exam_marks')
        .select('*')
        .eq('school_id', currentUser.school_id)

      console.log('Exam marks response:', { data: examMarksData, error: examMarksError })

      if (examMarksError) {
        console.error('Exam marks error:', examMarksError)
      }

      // Join exam marks with students
      if (examMarksData && examMarksData.length > 0) {
        const examMarksWithRelations = examMarksData.map(mark => ({
          ...mark,
          students: studentsData?.find(s => s.id === mark.student_id),
          exams: examsData?.find(e => e.id === mark.exam_id),
          subjects: subjectsData?.find(s => s.id === mark.subject_id)
        }))

        setExamMarks(examMarksWithRelations)
        console.log(`✓ Created ${examMarksWithRelations.length} exam marks with relations`)
      } else {
        setExamMarks([])
        console.log('No exam marks to join')
      }

      // Create combined assessments list for dropdown
      const combined = [
        ...testsWithRelations.map(t => ({
          id: t.id,
          name: t.test_name,
          type: 'test',
          date: t.test_date,
          classes: t.classes,
          sections: t.sections,
          subjects: t.subjects,
          total_marks: t.total_marks,
          original: t
        })),
        ...examsWithRelations.map(e => ({
          id: e.id,
          name: e.exam_name,
          type: 'exam',
          date: e.exam_date || e.created_at,
          classes: e.classes,
          sections: e.sections,
          subjects: null, // Exams may have multiple subjects
          total_marks: e.total_marks,
          original: e
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))

      setCombinedAssessments(combined)
      console.log(`✓ Combined ${combined.length} assessments (${testsWithRelations.length} tests + ${examsWithRelations.length} exams)`)

      console.log('=== DATA FETCH COMPLETE ===')
      toast.success(`Loaded ${testsWithRelations.length} tests and ${examsWithRelations.length} exams`)

    } catch (error) {
      console.error('=== ERROR FETCHING DATA ===')
      console.error('Error details:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = () => {
    switch (activeTab) {
      case 'test-results':
        generateTestResults()
        break
      case 'class-summary':
        generateClassSummary()
        break
      case 'subject-summary':
        generateSubjectSummary()
        break
      case 'top-performers':
        generateTopPerformers()
        break
      default:
        setReportData(null)
    }
  }

  const generateTestResults = () => {
    if (!selectedTest) {
      setReportData(null)
      setStats({})
      return
    }

    // Find the assessment in combined list to determine type
    const assessment = combinedAssessments.find(a => a.id === selectedTest)
    const isExam = assessment?.type === 'exam'

    let marks, assessmentData, totalMarks, assessmentName

    if (isExam) {
      // Handle exam
      marks = examMarks.filter(m => m.exam_id === selectedTest)
      assessmentData = exams.find(e => e.id === selectedTest)
      totalMarks = assessmentData?.total_marks || 100
      assessmentName = assessmentData?.exam_name || 'Exam'
    } else {
      // Handle test
      marks = testMarks.filter(m => m.test_id === selectedTest)
      assessmentData = tests.find(t => t.id === selectedTest)
      totalMarks = assessmentData?.total_marks || 100
      assessmentName = assessmentData?.test_name || 'Test'
    }

    if (!assessmentData || !marks.length) {
      setReportData(null)
      setStats({})
      return
    }

    const passThreshold = totalMarks * 0.33
    const presentMarks = marks.filter(m => !m.is_absent)

    const statsData = {
      totalStudents: marks.length,
      presentStudents: presentMarks.length,
      absentStudents: marks.filter(m => m.is_absent).length,
      passedStudents: presentMarks.filter(m => m.obtained_marks >= passThreshold).length,
      failedStudents: presentMarks.filter(m => m.obtained_marks < passThreshold).length,
      passPercentage: presentMarks.length > 0
        ? ((presentMarks.filter(m => m.obtained_marks >= passThreshold).length / presentMarks.length) * 100).toFixed(1)
        : 0,
      averageMarks: presentMarks.length > 0
        ? (presentMarks.reduce((sum, m) => sum + m.obtained_marks, 0) / presentMarks.length).toFixed(1)
        : 0,
      highestMarks: presentMarks.length > 0 ? Math.max(...presentMarks.map(m => m.obtained_marks)) : 0,
      lowestMarks: presentMarks.length > 0 ? Math.min(...presentMarks.map(m => m.obtained_marks)) : 0,
      passThreshold,
      testName: assessmentName,
      totalMarks: totalMarks,
      isExam: isExam
    }

    setStats(statsData)
    setReportData(marks.sort((a, b) => (b.obtained_marks || 0) - (a.obtained_marks || 0)))
  }

  const generateClassSummary = () => {
    let filteredTests = tests
    let filteredTestMarks = testMarks
    let filteredExams = exams
    let filteredExamMarks = examMarks

    if (selectedClass !== 'all') {
      filteredTests = filteredTests.filter(t => t.class_id === selectedClass)
      filteredTestMarks = filteredTestMarks.filter(m => {
        const test = tests.find(t => t.id === m.test_id)
        return test && test.class_id === selectedClass
      })
      filteredExams = filteredExams.filter(e => e.class_id === selectedClass)
      filteredExamMarks = filteredExamMarks.filter(m => {
        const exam = exams.find(e => e.id === m.exam_id)
        return exam && exam.class_id === selectedClass
      })
    }

    const classData = {}

    // Process tests
    filteredTests.forEach(test => {
      const className = `${test.classes?.class_name || 'N/A'} ${test.sections?.section_name || ''}`.trim()

      if (!classData[className]) {
        classData[className] = {
          className,
          totalTests: 0,
          totalExams: 0,
          totalStudents: 0,
          passedStudents: 0,
          failedStudents: 0,
          absentStudents: 0
        }
      }

      const testMarksForTest = filteredTestMarks.filter(m => m.test_id === test.id)
      const passThreshold = test.total_marks * 0.33

      classData[className].totalTests++
      classData[className].totalStudents += testMarksForTest.length
      classData[className].passedStudents += testMarksForTest.filter(m => !m.is_absent && m.obtained_marks >= passThreshold).length
      classData[className].failedStudents += testMarksForTest.filter(m => !m.is_absent && m.obtained_marks < passThreshold).length
      classData[className].absentStudents += testMarksForTest.filter(m => m.is_absent).length
    })

    // Process exams
    filteredExams.forEach(exam => {
      const className = `${exam.classes?.class_name || 'N/A'} ${exam.sections?.section_name || ''}`.trim()

      if (!classData[className]) {
        classData[className] = {
          className,
          totalTests: 0,
          totalExams: 0,
          totalStudents: 0,
          passedStudents: 0,
          failedStudents: 0,
          absentStudents: 0
        }
      }

      const examMarksForExam = filteredExamMarks.filter(m => m.exam_id === exam.id)
      const passThreshold = (exam.total_marks || 100) * 0.33

      classData[className].totalExams++
      classData[className].totalStudents += examMarksForExam.length
      classData[className].passedStudents += examMarksForExam.filter(m => !m.is_absent && m.obtained_marks >= passThreshold).length
      classData[className].failedStudents += examMarksForExam.filter(m => !m.is_absent && m.obtained_marks < passThreshold).length
      classData[className].absentStudents += examMarksForExam.filter(m => m.is_absent).length
    })

    const report = Object.values(classData).map(item => ({
      ...item,
      totalAssessments: item.totalTests + item.totalExams,
      passPercentage: item.totalStudents > 0 ? ((item.passedStudents / item.totalStudents) * 100).toFixed(1) : 0
    })).sort((a, b) => b.passPercentage - a.passPercentage)

    const totalStudents = report.reduce((sum, cls) => sum + cls.totalStudents, 0)
    const totalPassed = report.reduce((sum, cls) => sum + cls.passedStudents, 0)

    setStats({
      totalClasses: report.length,
      totalTests: filteredTests.length,
      totalExams: filteredExams.length,
      totalStudents,
      totalPassed,
      overallPassPercentage: totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0
    })

    setReportData(report)
  }

  const generateSubjectSummary = () => {
    let filteredTestMarks = testMarks
    let filteredExamMarks = examMarks

    if (selectedSubject !== 'all') {
      filteredTestMarks = filteredTestMarks.filter(m => m.subject_id === selectedSubject)
      filteredExamMarks = filteredExamMarks.filter(m => m.subject_id === selectedSubject)
    }

    const subjectData = {}

    // Group test marks by subject
    filteredTestMarks.forEach(mark => {
      const subject = subjects.find(s => s.id === mark.subject_id)
      const subjectName = subject?.subject_name || 'N/A'
      const test = tests.find(t => t.id === mark.test_id)

      if (!test) return

      if (!subjectData[mark.subject_id]) {
        subjectData[mark.subject_id] = {
          subjectName,
          totalTests: new Set(),
          totalExams: new Set(),
          totalStudents: 0,
          passedStudents: 0,
          failedStudents: 0,
          totalMarksObtained: 0,
          totalMaxMarks: 0
        }
      }

      const passThreshold = test.total_marks * 0.33

      // Track unique tests
      subjectData[mark.subject_id].totalTests.add(mark.test_id)
      subjectData[mark.subject_id].totalStudents++

      if (!mark.is_absent) {
        if (mark.obtained_marks >= passThreshold) {
          subjectData[mark.subject_id].passedStudents++
        } else {
          subjectData[mark.subject_id].failedStudents++
        }
        subjectData[mark.subject_id].totalMarksObtained += mark.obtained_marks
        subjectData[mark.subject_id].totalMaxMarks += test.total_marks
      }
    })

    // Group exam marks by subject
    filteredExamMarks.forEach(mark => {
      const subject = subjects.find(s => s.id === mark.subject_id)
      const subjectName = subject?.subject_name || 'N/A'
      const exam = exams.find(e => e.id === mark.exam_id)

      if (!exam) return

      if (!subjectData[mark.subject_id]) {
        subjectData[mark.subject_id] = {
          subjectName,
          totalTests: new Set(),
          totalExams: new Set(),
          totalStudents: 0,
          passedStudents: 0,
          failedStudents: 0,
          totalMarksObtained: 0,
          totalMaxMarks: 0
        }
      }

      const totalMarks = exam.total_marks || 100
      const passThreshold = totalMarks * 0.33

      // Track unique exams
      subjectData[mark.subject_id].totalExams.add(mark.exam_id)
      subjectData[mark.subject_id].totalStudents++

      if (!mark.is_absent) {
        if (mark.obtained_marks >= passThreshold) {
          subjectData[mark.subject_id].passedStudents++
        } else {
          subjectData[mark.subject_id].failedStudents++
        }
        subjectData[mark.subject_id].totalMarksObtained += mark.obtained_marks
        subjectData[mark.subject_id].totalMaxMarks += totalMarks
      }
    })

    // Convert Sets to counts and calculate totals
    const report = Object.values(subjectData).map(item => ({
      ...item,
      totalTests: item.totalTests.size,
      totalExams: item.totalExams.size,
      totalAssessments: item.totalTests.size + item.totalExams.size,
      passPercentage: item.totalStudents > 0 ? ((item.passedStudents / item.totalStudents) * 100).toFixed(1) : 0,
      averagePercentage: item.totalMaxMarks > 0 ? ((item.totalMarksObtained / item.totalMaxMarks) * 100).toFixed(1) : 0
    })).sort((a, b) => b.averagePercentage - a.averagePercentage)

    const totalStudents = report.reduce((sum, subj) => sum + subj.totalStudents, 0)
    const totalPassed = report.reduce((sum, subj) => sum + subj.passedStudents, 0)
    const uniqueTests = new Set(filteredTestMarks.map(m => m.test_id)).size
    const uniqueExams = new Set(filteredExamMarks.map(m => m.exam_id)).size

    setStats({
      totalSubjects: report.length,
      totalTests: uniqueTests,
      totalExams: uniqueExams,
      totalStudents,
      overallPassPercentage: totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0
    })

    setReportData(report)
  }

  const generateTopPerformers = () => {
    const studentPerformance = {}

    // Process test marks
    testMarks.forEach(mark => {
      if (mark.is_absent) return

      const studentId = mark.student_id
      const student = mark.students
      const test = mark.tests

      if (!student || !test) return

      if (!studentPerformance[studentId]) {
        studentPerformance[studentId] = {
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          roll_number: student.roll_number,
          totalMarksObtained: 0,
          totalMaxMarks: 0,
          testCount: 0,
          examCount: 0,
          passCount: 0
        }
      }

      const passThreshold = test.total_marks * 0.33

      studentPerformance[studentId].totalMarksObtained += mark.obtained_marks
      studentPerformance[studentId].totalMaxMarks += test.total_marks
      studentPerformance[studentId].testCount++

      if (mark.obtained_marks >= passThreshold) {
        studentPerformance[studentId].passCount++
      }
    })

    // Process exam marks
    examMarks.forEach(mark => {
      if (mark.is_absent) return

      const studentId = mark.student_id
      const student = mark.students
      const exam = mark.exams

      if (!student || !exam) return

      if (!studentPerformance[studentId]) {
        studentPerformance[studentId] = {
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          roll_number: student.roll_number,
          totalMarksObtained: 0,
          totalMaxMarks: 0,
          testCount: 0,
          examCount: 0,
          passCount: 0
        }
      }

      const totalMarks = exam.total_marks || 100
      const passThreshold = totalMarks * 0.33

      studentPerformance[studentId].totalMarksObtained += mark.obtained_marks
      studentPerformance[studentId].totalMaxMarks += totalMarks
      studentPerformance[studentId].examCount++

      if (mark.obtained_marks >= passThreshold) {
        studentPerformance[studentId].passCount++
      }
    })

    const studentsWithPercentage = Object.values(studentPerformance)
      .map(student => ({
        ...student,
        assessmentCount: student.testCount + student.examCount,
        averagePercentage: student.totalMaxMarks > 0
          ? ((student.totalMarksObtained / student.totalMaxMarks) * 100).toFixed(2)
          : 0
      }))
      .filter(student => student.assessmentCount > 0)
      .sort((a, b) => b.averagePercentage - a.averagePercentage)

    const topPerformers = studentsWithPercentage.slice(0, 10)
    const needsAttention = studentsWithPercentage.filter(s => s.averagePercentage < 40).slice(0, 10)

    setStats({
      totalStudents: studentsWithPercentage.length,
      topPerformersCount: topPerformers.length,
      needsAttentionCount: needsAttention.length,
      averageScore: studentsWithPercentage.length > 0
        ? (studentsWithPercentage.reduce((sum, s) => sum + parseFloat(s.averagePercentage), 0) / studentsWithPercentage.length).toFixed(1)
        : 0
    })

    setReportData({ topPerformers, needsAttention })
  }

  const exportToPDF = async () => {
    if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
      toast.error('No data to export')
      return
    }

    try {
      const pdfSettings = getPdfSettings()

      // Create PDF with settings from Settings page
      const orientation = pdfSettings.orientation === 'portrait' ? 'p' : 'l'
      const pageSize = pdfSettings.pageSize || 'a4'
      const pdf = new jsPDF(orientation, 'mm', pageSize)
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margins = getMarginValues(pdfSettings.margin)

      // Apply PDF settings (font, etc.)
      applyPdfSettings(pdf, pdfSettings)

      // Get colors from settings
      const headerBgColor = hexToRgb(pdfSettings.headerBackgroundColor || pdfSettings.tableHeaderColor)
      const textColor = hexToRgb(pdfSettings.textColor)

      // Convert logo if needed
      let logoBase64 = null
      if (pdfSettings.includeLogo && schoolDetails?.logo_url) {
        try {
          if (schoolDetails.logo_url.startsWith('http://') || schoolDetails.logo_url.startsWith('https://')) {
            logoBase64 = await convertImageToBase64(schoolDetails.logo_url)
          } else {
            logoBase64 = schoolDetails.logo_url
          }
        } catch (error) {
          console.error('Error converting logo:', error)
        }
      }

      // Header Section with blue background box
      const headerHeight = 45
      let yPos = 10

      // Draw blue background rectangle
      pdf.setFillColor(...headerBgColor)
      pdf.rect(0, 0, pageWidth, headerHeight, 'F')

      // Add "Generated" date in top right corner
      if (pdfSettings.includeGeneratedDate) {
        const generatedDate = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(255, 255, 255)
        pdf.text(`Generated: ${generatedDate}`, pageWidth - 10, 8, { align: 'right' })
      }

      // Add logo in white box on the left if enabled
      if (pdfSettings.includeLogo && logoBase64) {
        try {
          const logoSize = getLogoSize(pdfSettings.logoSize)
          const logoBoxSize = logoSize.width + 8
          const logoBoxX = 15
          const logoBoxY = (headerHeight - logoBoxSize) / 2 + 5

          // Draw white box for logo
          pdf.setFillColor(255, 255, 255)
          pdf.roundedRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 3, 3, 'F')

          // Add logo centered in white box
          const logoX = logoBoxX + 4
          const logoY = logoBoxY + 4
          pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoSize.width, logoSize.height)
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // Center section with school name and title
      yPos = 18

      // School name
      if (pdfSettings.includeSchoolName && schoolDetails?.name) {
        pdf.setFontSize(pdfSettings.schoolNameFontSize || 18)
        pdf.setFont(pdfSettings.fontFamily?.toLowerCase() || 'helvetica', 'bold')
        pdf.setTextColor(255, 255, 255)
        pdf.text(schoolDetails.name, pageWidth / 2, yPos, { align: 'center' })
        yPos += 8
      }

      // Title
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(255, 255, 255)
      pdf.text('EXAMINATION REPORT', pageWidth / 2, yPos, { align: 'center' })
      yPos += 6

      // Subtitle with report type
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(255, 255, 255)
      pdf.text(getReportTitle(), pageWidth / 2, yPos, { align: 'center' })

      // Reset y position to start content after header
      yPos = headerHeight + 8

      // Add stats summary box
      if (Object.keys(stats).length > 0) {
        pdf.setFillColor(245, 245, 245)
        const boxHeight = Math.min(Object.keys(stats).length * 6 + 10, 40)
        pdf.rect(15, yPos, pageWidth - 30, boxHeight, 'F')

        pdf.setDrawColor(...textColor)
        pdf.setLineWidth(0.5)
        pdf.rect(15, yPos, pageWidth - 30, boxHeight, 'S')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.setTextColor(...textColor)
        pdf.text('SUMMARY STATISTICS', 20, yPos + 8)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(...textColor)

        let statYPos = yPos + 16
        Object.entries(stats).forEach(([key, value]) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
          pdf.text(`${label}: ${value}`, 20, statYPos)
          statYPos += 5
        })

        yPos += boxHeight + 10
      }

      // Get autoTable styles from centralized settings
      const autoTableStyles = getAutoTableStyles(pdfSettings)

      // Generate table based on active tab
      if (activeTab === 'test-results' && Array.isArray(reportData)) {
        const tableData = reportData.map((mark, index) => {
          const percentage = !mark.is_absent ? ((mark.obtained_marks / stats.totalMarks) * 100).toFixed(1) : '-'
          const status = !mark.is_absent
            ? (mark.obtained_marks >= stats.passThreshold ? 'Pass' : 'Fail')
            : 'Absent'

          return [
            index + 1,
            mark.students?.roll_number || 'N/A',
            `${mark.students?.first_name} ${mark.students?.last_name}`,
            !mark.is_absent ? mark.obtained_marks : '-',
            stats.totalMarks,
            percentage !== '-' ? percentage + '%' : '-',
            status
          ]
        })

        autoTable(pdf, {
          startY: yPos,
          head: [['#', 'Roll No.', 'Student Name', 'Obtained', 'Total', 'Percentage', 'Status']],
          body: tableData,
          ...autoTableStyles,
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'left', cellWidth: 50 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 25 },
            6: { halign: 'center', cellWidth: 25 }
          }
        })
      } else if (activeTab === 'class-summary' && Array.isArray(reportData)) {
        autoTable(pdf, {
          startY: yPos,
          head: [['Class', 'Assessments', 'Students', 'Passed', 'Failed', 'Absent', 'Pass %']],
          body: reportData.map(item => [
            item.className,
            item.totalAssessments,
            item.totalStudents,
            item.passedStudents,
            item.failedStudents,
            item.absentStudents,
            `${item.passPercentage}%`
          ]),
          ...autoTableStyles,
          columnStyles: {
            0: { halign: 'left', cellWidth: 50 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 20 },
            6: { halign: 'center', cellWidth: 25 }
          }
        })
      } else if (activeTab === 'subject-summary' && Array.isArray(reportData)) {
        autoTable(pdf, {
          startY: yPos,
          head: [['Subject', 'Assessments', 'Students', 'Passed', 'Failed', 'Pass %', 'Avg %']],
          body: reportData.map(item => [
            item.subjectName,
            item.totalAssessments,
            item.totalStudents,
            item.passedStudents,
            item.failedStudents,
            `${item.passPercentage}%`,
            `${item.averagePercentage}%`
          ]),
          ...autoTableStyles,
          columnStyles: {
            0: { halign: 'left', cellWidth: 50 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 25 },
            6: { halign: 'center', cellWidth: 25 }
          }
        })
      } else if (activeTab === 'top-performers' && reportData.topPerformers) {
        // Top performers - use green header for top performers
        autoTable(pdf, {
          startY: yPos,
          head: [['Rank', 'Roll No.', 'Student Name', 'Assessments', 'Pass', 'Average %']],
          body: reportData.topPerformers.map((student, idx) => [
            idx + 1,
            student.roll_number,
            student.student_name,
            student.assessmentCount,
            student.passCount,
            `${student.averagePercentage}%`
          ]),
          ...autoTableStyles,
          headStyles: {
            ...autoTableStyles.headStyles,
            fillColor: [34, 197, 94] // Green for top performers
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'left', cellWidth: 60 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 30 }
          }
        })

        if (reportData.needsAttention.length > 0) {
          yPos = pdf.lastAutoTable.finalY + 15

          // Check if we need a new page
          if (yPos > pageHeight - 50) {
            pdf.addPage()
            yPos = headerHeight + 15
          }

          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
          pdf.setTextColor(...textColor)
          pdf.text('Students Needing Attention (Below 40%)', 15, yPos)
          yPos += 7

          autoTable(pdf, {
            startY: yPos,
            head: [['Roll No.', 'Student Name', 'Assessments', 'Pass', 'Average %']],
            body: reportData.needsAttention.map(student => [
              student.roll_number,
              student.student_name,
              student.assessmentCount,
              student.passCount,
              `${student.averagePercentage}%`
            ]),
            ...autoTableStyles,
            headStyles: {
              ...autoTableStyles.headStyles,
              fillColor: [239, 68, 68] // Red for needs attention
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 25 },
              1: { halign: 'left', cellWidth: 70 },
              2: { halign: 'center', cellWidth: 25 },
              3: { halign: 'center', cellWidth: 25 },
              4: { halign: 'center', cellWidth: 35 }
            }
          })
        }
      }

      // Add footer to all pages if enabled
      if (pdfSettings.includeFooter && pdfSettings.footerText) {
        const pageCount = pdf.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i)
          const footerY = pageHeight - margins.bottom + 5
          pdf.setFontSize(8)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(...textColor)
          pdf.text(pdfSettings.footerText, pageWidth / 2, footerY, { align: 'center' })
        }
      }

      // Generate blob and show preview
      const fileName = `${getReportTitle()}.pdf`
      const pdfBlob = pdf.output('blob')
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      setPdfUrl(pdfBlobUrl)
      setPdfFileName(fileName)
      setShowPdfPreview(true)
      toast.success('PDF generated successfully')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export PDF')
    }
  }

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false)
    setPdfUrl(null)
    setPdfFileName('')
  }

  const getReportTitle = () => {
    const titles = {
      'test-results': 'Test Results Report',
      'class-summary': 'Class-wise Summary Report',
      'subject-summary': 'Subject-wise Summary Report',
      'top-performers': 'Top Performers Report'
    }
    return titles[activeTab] || 'Exam Report'
  }

  const getGrade = (marks, totalMarks) => {
    const percentage = (marks / totalMarks) * 100
    if (percentage >= 90) return 'A+'
    if (percentage >= 80) return 'A'
    if (percentage >= 70) return 'B'
    if (percentage >= 60) return 'C'
    if (percentage >= 50) return 'D'
    if (percentage >= 33) return 'E'
    return 'F'
  }

  if (loading && !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-1">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          {reportData && (
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <button
            onClick={() => {
              setActiveTab('test-results')
              setSelectedTest('')
            }}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              activeTab === 'test-results'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <FileText className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold text-sm">Test Results</div>
              <div className="text-xs text-gray-500">View individual test</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('class-summary')}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              activeTab === 'class-summary'
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <Users className="w-6 h-6 text-purple-600" />
            <div className="text-left">
              <div className="font-semibold text-sm">Class Summary</div>
              <div className="text-xs text-gray-500">Pass/fail by class</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('subject-summary')}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              activeTab === 'subject-summary'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <BookOpen className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <div className="font-semibold text-sm">Subject Summary</div>
              <div className="text-xs text-gray-500">Performance by subject</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('top-performers')}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              activeTab === 'top-performers'
                ? 'border-yellow-600 bg-yellow-50'
                : 'border-gray-200 hover:border-yellow-300'
            }`}
          >
            <Award className="w-6 h-6 text-yellow-600" />
            <div className="text-left">
              <div className="font-semibold text-sm">Top Performers</div>
              <div className="text-xs text-gray-500">Best & struggling students</div>
            </div>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <h2 className="text-sm font-semibold mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activeTab === 'test-results' && (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Test/Exam *
              </label>
              <select
                value={selectedTest}
                onChange={(e) => {
                  const value = e.target.value
                  setSelectedTest(value)
                  // Find the type of selected assessment
                  const assessment = combinedAssessments.find(a => a.id === value)
                  setSelectedType(assessment?.type || '')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a test or exam...</option>
                {combinedAssessments.length > 0 && (
                  <>
                    {/* Tests Section */}
                    {tests.length > 0 && (
                      <optgroup label="Tests">
                        {combinedAssessments.filter(a => a.type === 'test').map((assessment) => (
                          <option key={`test-${assessment.id}`} value={assessment.id}>
                            {assessment.name} - {assessment.classes?.class_name || 'N/A'} {assessment.sections?.section_name || ''} - {assessment.subjects?.subject_name || 'N/A'} ({new Date(assessment.date).toLocaleDateString()})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {/* Exams Section */}
                    {exams.length > 0 && (
                      <optgroup label="Exams">
                        {combinedAssessments.filter(a => a.type === 'exam').map((assessment) => (
                          <option key={`exam-${assessment.id}`} value={assessment.id}>
                            {assessment.name} - {assessment.classes?.class_name || 'All Classes'} {assessment.sections?.section_name || ''} ({new Date(assessment.date).toLocaleDateString()})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            </div>
          )}

          {activeTab === 'class-summary' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'subject-summary' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Subjects</option>
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                    {subj.subject_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {Object.entries(stats).slice(0, 4).map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
            const isPercentage = key.toLowerCase().includes('percentage')

            let bgColor = 'bg-blue-50'
            let textColor = 'text-blue-600'

            if (key.includes('pass') || key.includes('Pass')) {
              bgColor = 'bg-green-50'
              textColor = 'text-green-600'
            } else if (key.includes('topper') || key.includes('Topper')) {
              bgColor = 'bg-yellow-50'
              textColor = 'text-yellow-600'
            } else if (key.includes('attention') || key.includes('Attention')) {
              bgColor = 'bg-orange-50'
              textColor = 'text-orange-600'
            }

            return (
              <div key={key} className={`${bgColor} rounded-lg p-6 shadow-md`}>
                <div className={`text-3xl font-bold ${textColor} mb-1`}>
                  {value}{isPercentage ? '%' : ''}
                </div>
                <div className="text-sm text-gray-600">{label}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Report Content */}
      {reportData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">{getReportTitle()}</h2>

          {/* Test Results Table */}
          {activeTab === 'test-results' && Array.isArray(reportData) && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="px-4 py-3 text-left font-semibold border border-blue-800">#</th>
                    <th className="px-4 py-3 text-left font-semibold border border-blue-800">Roll No.</th>
                    <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Obtained</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Total</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Percentage</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Grade</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((mark, index) => {
                    const percentage = !mark.is_absent ? ((mark.obtained_marks / stats.totalMarks) * 100).toFixed(1) : '-'
                    const grade = !mark.is_absent ? getGrade(mark.obtained_marks, stats.totalMarks) : '-'
                    const isPass = !mark.is_absent && mark.obtained_marks >= stats.passThreshold

                    return (
                      <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                        <td className="px-4 py-3 border border-gray-200">{index + 1}</td>
                        <td className="px-4 py-3 border border-gray-200 font-medium">{mark.students?.roll_number || 'N/A'}</td>
                        <td className="px-4 py-3 border border-gray-200">{mark.students?.first_name} {mark.students?.last_name}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center font-semibold">
                          {!mark.is_absent ? mark.obtained_marks : '-'}
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-center">{stats.totalMarks}</td>
                        <td className="px-4 py-3 border border-gray-200 text-center font-medium">
                          {percentage !== '-' ? percentage + '%' : '-'}
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            grade === 'A+' || grade === 'A' ? 'bg-green-100 text-green-800' :
                            grade === 'B' || grade === 'C' ? 'bg-blue-100 text-blue-800' :
                            grade === 'D' || grade === 'E' ? 'bg-yellow-100 text-yellow-800' :
                            grade === 'F' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            mark.is_absent ? 'bg-gray-100 text-gray-800' :
                            isPass ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {mark.is_absent ? 'Absent' : isPass ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Class Summary Table */}
          {activeTab === 'class-summary' && Array.isArray(reportData) && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="px-4 py-3 text-left font-semibold border border-blue-800">Class</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Assessments</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Students</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Passed</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Failed</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Absent</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                      <td className="px-4 py-3 border border-gray-200 font-medium">{item.className}</td>
                      <td className="px-4 py-3 border border-gray-200 text-center">{item.totalAssessments}</td>
                      <td className="px-4 py-3 border border-gray-200 text-center">{item.totalStudents}</td>
                      <td className="px-4 py-3 border border-gray-200 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          {item.passedStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200 text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                          {item.failedStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200 text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                          {item.absentStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200 text-center font-bold">{item.passPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subject Summary Table */}
          {activeTab === 'subject-summary' && Array.isArray(reportData) && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="px-4 py-3 text-left font-semibold border border-blue-800">Subject</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Assessments</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Students</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Passed</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Failed</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Pass %</th>
                    <th className="px-4 py-3 text-center font-semibold border border-blue-800">Avg %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                      <td className="px-4 py-3 border border-gray-200 font-medium">{item.subjectName}</td>
                      <td className="px-4 py-3 border border-gray-200 text-center">{item.totalAssessments}</td>
                      <td className="px-4 py-3 border border-gray-200 text-center">{item.totalStudents}</td>
                      <td className="px-4 py-3 border border-gray-200 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          {item.passedStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200 text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                          {item.failedStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-200 text-center font-bold">{item.passPercentage}%</td>
                      <td className="px-4 py-3 border border-gray-200 text-center font-bold">{item.averagePercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top Performers Tables */}
          {activeTab === 'top-performers' && reportData.topPerformers && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top 10 Performers
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Rank</th>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Roll No.</th>
                        <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                        <th className="px-4 py-3 text-center font-semibold border border-blue-800">Assessments</th>
                        <th className="px-4 py-3 text-center font-semibold border border-blue-800">Pass</th>
                        <th className="px-4 py-3 text-center font-semibold border border-blue-800">Average %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topPerformers.map((student, idx) => (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                          <td className="px-4 py-3 border border-gray-200 font-bold">{idx + 1}</td>
                          <td className="px-4 py-3 border border-gray-200">{student.roll_number}</td>
                          <td className="px-4 py-3 border border-gray-200 font-medium">{student.student_name}</td>
                          <td className="px-4 py-3 border border-gray-200 text-center">{student.assessmentCount}</td>
                          <td className="px-4 py-3 border border-gray-200 text-center">{student.passCount}</td>
                          <td className="px-4 py-3 border border-gray-200 text-center font-bold text-green-700">
                            {student.averagePercentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {reportData.needsAttention.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 rotate-180" />
                    Students Needing Attention (Below 40%)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-blue-900 text-white">
                          <th className="px-4 py-3 text-left font-semibold border border-blue-800">Roll No.</th>
                          <th className="px-4 py-3 text-left font-semibold border border-blue-800">Student Name</th>
                          <th className="px-4 py-3 text-center font-semibold border border-blue-800">Assessments</th>
                          <th className="px-4 py-3 text-center font-semibold border border-blue-800">Pass</th>
                          <th className="px-4 py-3 text-center font-semibold border border-blue-800">Average %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.needsAttention.map((student, idx) => (
                          <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                            <td className="px-4 py-3 border border-gray-200">{student.roll_number}</td>
                            <td className="px-4 py-3 border border-gray-200 font-medium">{student.student_name}</td>
                            <td className="px-4 py-3 border border-gray-200 text-center">{student.assessmentCount}</td>
                            <td className="px-4 py-3 border border-gray-200 text-center">{student.passCount}</td>
                            <td className="px-4 py-3 border border-gray-200 text-center font-bold text-red-700">
                              {student.averagePercentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No Data Message */}
      {!reportData && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {activeTab === 'test-results' ? 'Select a Test' : 'No Data Available'}
          </h3>
          <p className="text-gray-500">
            {activeTab === 'test-results'
              ? 'Please select a test from the dropdown to view results'
              : 'Adjust your filters or add test data to see results'
            }
          </p>
        </div>
      )}

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
        isOpen={showPdfPreview}
        onClose={handleClosePdfPreview}
      />
    </div>
  )
}

export default function ExamReportsPage() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const user = getUserFromCookie()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="exam_reports_view"
      pageName="Exam Reports"
    >
      <ExamReportsPageContent />
    </PermissionGuard>
  )
}
