'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, FileText, Download, Users, TrendingUp, Calendar, BookOpen, Award } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast, { Toaster } from 'react-hot-toast'

export default function ExamReportsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [schoolDetails, setSchoolDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  // Data states
  const [tests, setTests] = useState([])
  const [testMarks, setTestMarks] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])

  // Filter states
  const [activeTab, setActiveTab] = useState('test-results') // test-results, class-summary, subject-summary, top-performers
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedTest, setSelectedTest] = useState('')

  // Report data
  const [reportData, setReportData] = useState(null)
  const [stats, setStats] = useState({})

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchData()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser && tests.length > 0) {
      generateReport()
    }
  }, [activeTab, selectedClass, selectedSubject, selectedTest, tests, testMarks])

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
        .eq('school_id', user.school_id)
        .single()

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
        const classData = classesData?.find(c => c.class_id === test.class_id)
        const subjectData = subjectsData?.find(s => s.subject_id === test.subject_id)

        console.log(`Test ${test.test_id}: class=${classData?.class_name}, subject=${subjectData?.subject_name}`)

        return {
          ...test,
          classes: classData,
          subjects: subjectData
        }
      })

      setTests(testsWithRelations)
      console.log(`✓ Created ${testsWithRelations.length} tests with relations`)

      // Join marks with students
      if (marksData && marksData.length > 0) {
        const marksWithRelations = marksData.map(mark => ({
          ...mark,
          students: studentsData?.find(s => s.student_id === mark.student_id),
          tests: testsData?.find(t => t.test_id === mark.test_id),
          subjects: subjectsData?.find(s => s.subject_id === mark.subject_id)
        }))

        setTestMarks(marksWithRelations)
        console.log(`✓ Created ${marksWithRelations.length} marks with relations`)
      } else {
        setTestMarks([])
        console.log('No marks to join')
      }

      console.log('=== DATA FETCH COMPLETE ===')
      toast.success(`Loaded ${testsWithRelations.length} tests successfully`)

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

    const marks = testMarks.filter(m => m.test_id === selectedTest)
    const test = tests.find(t => t.test_id === selectedTest)

    if (!test || !marks.length) {
      setReportData(null)
      setStats({})
      return
    }

    const passThreshold = test.total_marks * 0.33
    const presentMarks = marks.filter(m => m.status === 'present')

    const statsData = {
      totalStudents: marks.length,
      presentStudents: presentMarks.length,
      absentStudents: marks.filter(m => m.status === 'absent').length,
      passedStudents: presentMarks.filter(m => m.marks_obtained >= passThreshold).length,
      failedStudents: presentMarks.filter(m => m.marks_obtained < passThreshold).length,
      passPercentage: presentMarks.length > 0
        ? ((presentMarks.filter(m => m.marks_obtained >= passThreshold).length / presentMarks.length) * 100).toFixed(1)
        : 0,
      averageMarks: presentMarks.length > 0
        ? (presentMarks.reduce((sum, m) => sum + m.marks_obtained, 0) / presentMarks.length).toFixed(1)
        : 0,
      highestMarks: presentMarks.length > 0 ? Math.max(...presentMarks.map(m => m.marks_obtained)) : 0,
      lowestMarks: presentMarks.length > 0 ? Math.min(...presentMarks.map(m => m.marks_obtained)) : 0,
      passThreshold,
      testName: test.test_name,
      totalMarks: test.total_marks
    }

    setStats(statsData)
    setReportData(marks.sort((a, b) => (b.marks_obtained || 0) - (a.marks_obtained || 0)))
  }

  const generateClassSummary = () => {
    let filteredTests = tests
    let filteredMarks = testMarks

    if (selectedClass !== 'all') {
      filteredTests = filteredTests.filter(t => t.class_id === selectedClass)
      filteredMarks = filteredMarks.filter(m => {
        const test = tests.find(t => t.test_id === m.test_id)
        return test && test.class_id === selectedClass
      })
    }

    const classData = {}

    filteredTests.forEach(test => {
      const className = `${test.classes?.class_name || 'N/A'} ${test.classes?.section || ''}`.trim()

      if (!classData[className]) {
        classData[className] = {
          className,
          totalTests: 0,
          totalStudents: 0,
          passedStudents: 0,
          failedStudents: 0,
          absentStudents: 0
        }
      }

      const testMarksForTest = filteredMarks.filter(m => m.test_id === test.test_id)
      const passThreshold = test.total_marks * 0.33

      classData[className].totalTests++
      classData[className].totalStudents += testMarksForTest.length
      classData[className].passedStudents += testMarksForTest.filter(m => m.status === 'present' && m.marks_obtained >= passThreshold).length
      classData[className].failedStudents += testMarksForTest.filter(m => m.status === 'present' && m.marks_obtained < passThreshold).length
      classData[className].absentStudents += testMarksForTest.filter(m => m.status === 'absent').length
    })

    const report = Object.values(classData).map(item => ({
      ...item,
      passPercentage: item.totalStudents > 0 ? ((item.passedStudents / item.totalStudents) * 100).toFixed(1) : 0
    })).sort((a, b) => b.passPercentage - a.passPercentage)

    const totalStudents = report.reduce((sum, cls) => sum + cls.totalStudents, 0)
    const totalPassed = report.reduce((sum, cls) => sum + cls.passedStudents, 0)

    setStats({
      totalClasses: report.length,
      totalTests: filteredTests.length,
      totalStudents,
      totalPassed,
      overallPassPercentage: totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0
    })

    setReportData(report)
  }

  const generateSubjectSummary = () => {
    let filteredTests = tests
    let filteredMarks = testMarks

    if (selectedSubject !== 'all') {
      filteredTests = filteredTests.filter(t => t.subject_id === selectedSubject)
      filteredMarks = filteredMarks.filter(m => m.subject_id === selectedSubject)
    }

    const subjectData = {}

    filteredTests.forEach(test => {
      const subjectName = test.subjects?.subject_name || 'N/A'

      if (!subjectData[subjectName]) {
        subjectData[subjectName] = {
          subjectName,
          totalTests: 0,
          totalStudents: 0,
          passedStudents: 0,
          failedStudents: 0,
          totalMarksObtained: 0,
          totalMaxMarks: 0
        }
      }

      const testMarksForTest = filteredMarks.filter(m => m.test_id === test.test_id)
      const passThreshold = test.total_marks * 0.33
      const presentMarks = testMarksForTest.filter(m => m.status === 'present')

      subjectData[subjectName].totalTests++
      subjectData[subjectName].totalStudents += testMarksForTest.length
      subjectData[subjectName].passedStudents += presentMarks.filter(m => m.marks_obtained >= passThreshold).length
      subjectData[subjectName].failedStudents += presentMarks.filter(m => m.marks_obtained < passThreshold).length
      subjectData[subjectName].totalMarksObtained += presentMarks.reduce((sum, m) => sum + m.marks_obtained, 0)
      subjectData[subjectName].totalMaxMarks += presentMarks.length * test.total_marks
    })

    const report = Object.values(subjectData).map(item => ({
      ...item,
      passPercentage: item.totalStudents > 0 ? ((item.passedStudents / item.totalStudents) * 100).toFixed(1) : 0,
      averagePercentage: item.totalMaxMarks > 0 ? ((item.totalMarksObtained / item.totalMaxMarks) * 100).toFixed(1) : 0
    })).sort((a, b) => b.averagePercentage - a.averagePercentage)

    const totalStudents = report.reduce((sum, subj) => sum + subj.totalStudents, 0)
    const totalPassed = report.reduce((sum, subj) => sum + subj.passedStudents, 0)

    setStats({
      totalSubjects: report.length,
      totalTests: filteredTests.length,
      totalStudents,
      overallPassPercentage: totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0
    })

    setReportData(report)
  }

  const generateTopPerformers = () => {
    const studentPerformance = {}

    testMarks.forEach(mark => {
      if (mark.status !== 'present') return

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
          passCount: 0
        }
      }

      const passThreshold = test.total_marks * 0.33

      studentPerformance[studentId].totalMarksObtained += mark.marks_obtained
      studentPerformance[studentId].totalMaxMarks += test.total_marks
      studentPerformance[studentId].testCount++

      if (mark.marks_obtained >= passThreshold) {
        studentPerformance[studentId].passCount++
      }
    })

    const studentsWithPercentage = Object.values(studentPerformance)
      .map(student => ({
        ...student,
        averagePercentage: student.totalMaxMarks > 0
          ? ((student.totalMarksObtained / student.totalMaxMarks) * 100).toFixed(2)
          : 0
      }))
      .filter(student => student.testCount > 0)
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

  const exportToPDF = () => {
    if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
      toast.error('No data to export')
      return
    }

    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      let yPos = 20

      // School header
      if (schoolDetails?.logo_url) {
        try {
          pdf.addImage(schoolDetails.logo_url, 'PNG', 15, 10, 20, 20)
        } catch (error) {
          console.log('Could not add logo')
        }
      }

      pdf.setFontSize(18)
      pdf.setFont(undefined, 'bold')
      pdf.text(schoolDetails?.school_name || 'School', 40, yPos)

      pdf.setFontSize(14)
      pdf.text(getReportTitle(), 40, yPos + 8)

      pdf.setFontSize(10)
      pdf.setFont(undefined, 'normal')
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, yPos + 15)

      yPos += 25

      // Add stats
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'bold')
      pdf.text('Summary Statistics:', 15, yPos)
      yPos += 6

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      Object.entries(stats).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        pdf.text(`${label}: ${value}`, 15, yPos)
        yPos += 5
      })

      yPos += 5

      // Generate table based on active tab
      if (activeTab === 'test-results' && Array.isArray(reportData)) {
        const tableData = reportData.map((mark, index) => {
          const percentage = mark.status === 'present' ? ((mark.marks_obtained / stats.totalMarks) * 100).toFixed(1) : '-'
          const status = mark.status === 'present'
            ? (mark.marks_obtained >= stats.passThreshold ? 'Pass' : 'Fail')
            : 'Absent'

          return [
            index + 1,
            mark.students?.roll_number || 'N/A',
            `${mark.students?.first_name} ${mark.students?.last_name}`,
            mark.status === 'present' ? mark.marks_obtained : '-',
            stats.totalMarks,
            percentage !== '-' ? percentage + '%' : '-',
            status
          ]
        })

        autoTable(pdf, {
          startY: yPos,
          head: [['#', 'Roll No.', 'Student Name', 'Obtained', 'Total', 'Percentage', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 }
        })
      } else if (activeTab === 'class-summary' && Array.isArray(reportData)) {
        autoTable(pdf, {
          startY: yPos,
          head: [['Class', 'Tests', 'Students', 'Passed', 'Failed', 'Absent', 'Pass %']],
          body: reportData.map(item => [
            item.className,
            item.totalTests,
            item.totalStudents,
            item.passedStudents,
            item.failedStudents,
            item.absentStudents,
            `${item.passPercentage}%`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 }
        })
      } else if (activeTab === 'subject-summary' && Array.isArray(reportData)) {
        autoTable(pdf, {
          startY: yPos,
          head: [['Subject', 'Tests', 'Students', 'Passed', 'Failed', 'Pass %', 'Avg %']],
          body: reportData.map(item => [
            item.subjectName,
            item.totalTests,
            item.totalStudents,
            item.passedStudents,
            item.failedStudents,
            `${item.passPercentage}%`,
            `${item.averagePercentage}%`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 }
        })
      } else if (activeTab === 'top-performers' && reportData.topPerformers) {
        // Top performers
        autoTable(pdf, {
          startY: yPos,
          head: [['Rank', 'Roll No.', 'Student Name', 'Tests', 'Pass', 'Average %']],
          body: reportData.topPerformers.map((student, idx) => [
            idx + 1,
            student.roll_number,
            student.student_name,
            student.testCount,
            student.passCount,
            `${student.averagePercentage}%`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 8 }
        })

        if (reportData.needsAttention.length > 0) {
          yPos = pdf.lastAutoTable.finalY + 15
          pdf.setFontSize(11)
          pdf.setFont(undefined, 'bold')
          pdf.text('Students Needing Attention (Below 40%)', 15, yPos)
          yPos += 7

          autoTable(pdf, {
            startY: yPos,
            head: [['Roll No.', 'Student Name', 'Tests', 'Pass', 'Average %']],
            body: reportData.needsAttention.map(student => [
              student.roll_number,
              student.student_name,
              student.testCount,
              student.passCount,
              `${student.averagePercentage}%`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 8 }
          })
        }
      }

      pdf.save(`${getReportTitle()}.pdf`)
      toast.success('PDF exported successfully')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export PDF')
    }
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
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Exam Reports</h1>
              <p className="text-gray-600">Comprehensive test performance analysis</p>
            </div>
          </div>
          {reportData && (
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeTab === 'test-results' && (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Test *
              </label>
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a test...</option>
                {tests.map((test) => (
                  <option key={test.test_id} value={test.test_id}>
                    {test.test_name} - {test.classes?.class_name} {test.classes?.section} - {test.subjects?.subject_name} ({new Date(test.test_date).toLocaleDateString()})
                  </option>
                ))}
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
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name} {cls.section}
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
                  <option key={subj.subject_id} value={subj.subject_id}>
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
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Roll No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Obtained</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Percentage</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Grade</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((mark, index) => {
                    const percentage = mark.status === 'present' ? ((mark.marks_obtained / stats.totalMarks) * 100).toFixed(1) : '-'
                    const grade = mark.status === 'present' ? getGrade(mark.marks_obtained, stats.totalMarks) : '-'
                    const isPass = mark.status === 'present' && mark.marks_obtained >= stats.passThreshold

                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{mark.students?.roll_number || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{mark.students?.first_name} {mark.students?.last_name}</td>
                        <td className="px-4 py-3 text-sm text-center font-semibold">
                          {mark.status === 'present' ? mark.marks_obtained : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">{stats.totalMarks}</td>
                        <td className="px-4 py-3 text-sm text-center font-medium">
                          {percentage !== '-' ? percentage + '%' : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            grade === 'A+' || grade === 'A' ? 'bg-green-100 text-green-800' :
                            grade === 'B' || grade === 'C' ? 'bg-blue-100 text-blue-800' :
                            grade === 'D' || grade === 'E' ? 'bg-yellow-100 text-yellow-800' :
                            grade === 'F' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            mark.status === 'absent' ? 'bg-gray-100 text-gray-800' :
                            isPass ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {mark.status === 'absent' ? 'Absent' : isPass ? 'Pass' : 'Fail'}
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
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Class</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Tests</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Students</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Passed</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Failed</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Absent</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium">{item.className}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.totalTests}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.totalStudents}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          {item.passedStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                          {item.failedStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                          {item.absentStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold">{item.passPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subject Summary Table */}
          {activeTab === 'subject-summary' && Array.isArray(reportData) && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Subject</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Tests</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Students</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Passed</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Failed</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Pass %</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Avg %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium">{item.subjectName}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.totalTests}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.totalStudents}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          {item.passedStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                          {item.failedStudents}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold">{item.passPercentage}%</td>
                      <td className="px-4 py-3 text-sm text-center font-bold">{item.averagePercentage}%</td>
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
                  <table className="min-w-full">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Roll No.</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Tests</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Pass</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Average %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topPerformers.map((student, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                          <td className="px-4 py-3 text-sm font-bold">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm">{student.roll_number}</td>
                          <td className="px-4 py-3 text-sm font-medium">{student.student_name}</td>
                          <td className="px-4 py-3 text-sm text-center">{student.testCount}</td>
                          <td className="px-4 py-3 text-sm text-center">{student.passCount}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-green-700">
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
                    <table className="min-w-full">
                      <thead className="bg-red-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Roll No.</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Tests</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Pass</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Average %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.needsAttention.map((student, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                            <td className="px-4 py-3 text-sm">{student.roll_number}</td>
                            <td className="px-4 py-3 text-sm font-medium">{student.student_name}</td>
                            <td className="px-4 py-3 text-sm text-center">{student.testCount}</td>
                            <td className="px-4 py-3 text-sm text-center">{student.passCount}</td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-red-700">
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
    </div>
  )
}
