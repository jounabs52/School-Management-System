'use client'

import { useState, useEffect, useMemo } from 'react'
import { Briefcase, Plus, Edit, Trash2, Search, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState('jobs')
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  // Subjects State
  const [subjects, setSubjects] = useState([])
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [editingSubject, setEditingSubject] = useState(null)

  // Departments State
  const [departments, setDepartments] = useState([])
  const [showCustomDepartment, setShowCustomDepartment] = useState(false)
  const [customDepartmentName, setCustomDepartmentName] = useState('')

  // Predefined department options (same as staff page)
  const departmentOptions = [
    'ACADEMIC',
    'ACCOUNTS',
    'ADMIN',
    'POLITICAL',
    'SPORTS',
    'SUPPORTING STAFF',
    'TEACHING',
    'Other'
  ]

  // Jobs State
  const [jobs, setJobs] = useState([])
  const [showJobModal, setShowJobModal] = useState(false)
  const [jobForm, setJobForm] = useState({
    departmentId: '',
    title: '',
    salary: '',
    deadline: '',
    description: ''
  })
  const [editingJob, setEditingJob] = useState(null)

  // Applications State
  const [applications, setApplications] = useState([])
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [applicationForm, setApplicationForm] = useState({
    jobId: '',
    candidateName: '',
    cnicNumber: '',
    fatherName: '',
    email: '',
    mobileNumber: '',
    department: '',
    photo_url: '',
    experienceLevel: ''
  })
  const [editingApplication, setEditingApplication] = useState(null)

  // Interviews State
  const [interviews, setInterviews] = useState([])
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [interviewForm, setInterviewForm] = useState({
    applicationId: '',
    interviewDate: '',
    interviewTime: '',
    interviewType: '',
    location: '',
    notes: ''
  })
  const [editingInterview, setEditingInterview] = useState(null)

  // Search States
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('')
  const [jobSearchQuery, setJobSearchQuery] = useState('')
  const [appSearchQuery, setAppSearchQuery] = useState('')
  const [interviewSearchQuery, setInterviewSearchQuery] = useState('')

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

  // Check if any modal is open
  const isAnyModalOpen = showJobModal || showApplicationModal || showInterviewModal || confirmDialog.show

  // Apply blur effect to sidebar and disable background scrolling when modals are open
  useEffect(() => {
    if (isAnyModalOpen) {
      // Disable body scrolling
      document.body.style.overflow = 'hidden'

      // Blur only the sidebar
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = 'blur(4px)'
        sidebar.style.pointerEvents = 'none'
      }
    } else {
      // Remove blur and enable interactions
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }

    return () => {
      document.body.style.overflow = 'unset'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = ''
        sidebar.style.pointerEvents = ''
      }
    }
  }, [isAnyModalOpen])

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm
    })
  }

  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm()
    }
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

  const handleCancel = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
  }

  // Toast notification function
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

  // Get current user from cookie
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

  // Fetch data when user is loaded
  useEffect(() => {
    if (currentUser?.school_id) {
      fetchAllData()
    }
  }, [currentUser])

  const fetchAllData = async () => {
    await Promise.all([
      fetchDepartments(),
      fetchJobs(),
      fetchApplications(),
      fetchInterviews()
    ])
  }

  // Fetch Subjects
  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('subject_name', { ascending: true })

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  // Fetch Departments
  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .order('department_name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  // Fetch Jobs
  const fetchJobs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          department:departments(id, department_name),
          job_applications(count)
        `)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map the aggregated count to applicant_count
      const jobsWithCounts = data.map(job => ({
        ...job,
        applicant_count: job.job_applications?.[0]?.count || 0,
        department_name: job.department?.department_name
      }))

      setJobs(jobsWithCounts)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Applications
  const fetchApplications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs(title, department:departments(department_name))
        `)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })
        .limit(500) // Limit for performance

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Interviews
  const fetchInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('job_interviews')
        .select(`
          *,
          application:job_applications(
            applicant_name,
            job:jobs(title)
          )
        `)
        .eq('school_id', currentUser.school_id)
        .order('interview_date', { ascending: true })

      if (error) throw error
      setInterviews(data || [])
    } catch (error) {
      console.error('Error fetching interviews:', error)
    }
  }

  // Add/Edit Subject
  const handleAddSubject = async () => {
    if (!subjectName.trim()) {
      showToast('Please enter subject name', 'warning')
      return
    }

    try {
      if (editingSubject) {
        // Update existing subject
        const { error } = await supabase
          .from('subjects')
          .update({
            subject_name: subjectName
          })
          .eq('id', editingSubject.id)
          .eq('school_id', currentUser.school_id)

        if (error) throw error
        showToast('Subject updated successfully!', 'success')
      } else {
        // Add new subject
        const { error } = await supabase
          .from('subjects')
          .insert({
            school_id: currentUser.school_id,
            subject_name: subjectName,
            created_by: currentUser.id
          })

        if (error) throw error
        showToast('Subject added successfully!', 'success')
      }

      setSubjectName('')
      setEditingSubject(null)
      setShowSubjectModal(false)
      fetchSubjects()
    } catch (error) {
      console.error('Error saving subject:', error)
      showToast('Error saving subject: ' + error.message, 'error')
    }
  }

  // Open edit subject modal
  const handleEditSubject = (subject) => {
    setEditingSubject(subject)
    setSubjectName(subject.subject_name)
    setShowSubjectModal(true)
  }

  // Add/Edit Job
  const handleAddJob = async () => {
    if (!jobForm.title || !jobForm.departmentId) {
      showToast('Please fill required fields', 'warning')
      return
    }

    // Check if custom department is needed
    if (jobForm.departmentId === 'Other' && !customDepartmentName.trim()) {
      showToast('Please enter custom department name', 'warning')
      return
    }

    try {
      let departmentName = jobForm.departmentId

      // If "Other" is selected, use custom department name
      if (jobForm.departmentId === 'Other') {
        departmentName = customDepartmentName
      }

      // Find or create department
      let departmentId
      const { data: existingDept, error: findError } = await supabase
        .from('departments')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('school_id', currentUser.school_id)
        .eq('department_name', departmentName)
        .single()

      if (existingDept) {
        departmentId = existingDept.id
      } else {
        // Create new department
        const { data: newDept, error: createError } = await supabase
          .from('departments')
          .insert({
            user_id: currentUser.id,
            school_id: currentUser.school_id,
            department_name: departmentName,
            created_by: currentUser.id
          })
          .select('id')
          .single()

        if (createError) throw createError
        departmentId = newDept.id
      }

      if (editingJob) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update({
            department_id: departmentId,
            title: jobForm.title,
            salary: jobForm.salary || null,
            deadline: jobForm.deadline || null,
            description: jobForm.description
          })
          .eq('id', editingJob.id)
          .eq('school_id', currentUser.school_id)

        if (error) throw error
        showToast('Job updated successfully!', 'success')
      } else {
        // Add new job
        const { error } = await supabase
          .from('jobs')
          .insert({
            user_id: currentUser.id,
            school_id: currentUser.school_id,
            department_id: departmentId,
            title: jobForm.title,
            salary: jobForm.salary || null,
            deadline: jobForm.deadline || null,
            description: jobForm.description,
            created_by: currentUser.id
          })

        if (error) throw error
        showToast('Job added successfully!', 'success')
      }

      setJobForm({
        departmentId: '',
        title: '',
        salary: '',
        deadline: '',
        description: ''
      })
      setShowCustomDepartment(false)
      setCustomDepartmentName('')
      setEditingJob(null)
      setShowJobModal(false)
      fetchJobs()
    } catch (error) {
      console.error('Error saving job:', error)
      showToast('Error saving job: ' + error.message, 'error')
    }
  }

  // Open edit job modal
  const handleEditJob = (job) => {
    setEditingJob(job)
    setJobForm({
      departmentId: job.department_name || job.department?.department_name || '',
      title: job.title,
      salary: job.salary || '',
      deadline: job.deadline || '',
      description: job.description || ''
    })
    setShowJobModal(true)
  }

  // Add/Edit Application
  const handleAddApplication = async () => {
    // Validate required fields
    if (!applicationForm.jobId) {
      showToast('Please select a Job', 'warning')
      return
    }

    if (!applicationForm.candidateName || applicationForm.candidateName.trim() === '') {
      showToast('Please enter Candidate Name', 'warning')
      return
    }

    if (!applicationForm.email || applicationForm.email.trim() === '') {
      showToast('Please enter Email Address', 'warning')
      return
    }

    try {
      if (editingApplication) {
        // Update existing application
        const { error } = await supabase
          .from('job_applications')
          .update({
            job_id: applicationForm.jobId,
            applicant_name: (applicationForm.candidateName || '').trim(),
            email: (applicationForm.email || '').trim(),
            phone: applicationForm.mobileNumber || null,
            father_name: applicationForm.fatherName || null,
            mobile_number: applicationForm.mobileNumber || null,
            cnic_number: applicationForm.cnicNumber || null,
            subjects: applicationForm.department || null,
            experience_level: applicationForm.experienceLevel || null,
            photo_url: applicationForm.photo_url || null
          })
          .eq('id', editingApplication.id)
          .eq('school_id', currentUser.school_id)

        if (error) throw error
        showToast('Application updated successfully!', 'success')
      } else {
        // Add new application
        const { error } = await supabase
          .from('job_applications')
          .insert({
            school_id: currentUser.school_id,
            user_id: currentUser.id,
            job_id: applicationForm.jobId,
            applicant_name: (applicationForm.candidateName || '').trim(),
            email: (applicationForm.email || '').trim(),
            phone: applicationForm.mobileNumber || null,
            father_name: applicationForm.fatherName || null,
            mobile_number: applicationForm.mobileNumber || null,
            cnic_number: applicationForm.cnicNumber || null,
            subjects: applicationForm.department || null,
            experience_level: applicationForm.experienceLevel || null,
            status: 'pending',
            created_by: currentUser.id,
            photo_url: applicationForm.photo_url || null
          })

        if (error) throw error
        showToast('Application added successfully!', 'success')
      }

      setApplicationForm({
        jobId: '',
        candidateName: '',
        cnicNumber: '',
        fatherName: '',
        email: '',
        mobileNumber: '',
        department: '',
        photo_url: '',
        experienceLevel: ''
      })
      setEditingApplication(null)
      setShowApplicationModal(false)
      fetchApplications()
      fetchJobs() // Refresh to update applicant counts
    } catch (error) {
      console.error('Error saving application:', error)
      showToast('Error saving application: ' + error.message, 'error')
    }
  }

  // Open edit application modal
  const handleEditApplication = (app) => {
    setEditingApplication(app)
    setApplicationForm({
      jobId: app.job_id || '',
      candidateName: app.applicant_name || '',
      cnicNumber: app.cnic_number || '',
      fatherName: app.father_name || '',
      email: app.email || '',
      mobileNumber: app.mobile_number || '',
      department: app.subjects || '',
      experienceLevel: app.experience_level || '',
      photo_url: app.photo_url || ''
    })
    setShowApplicationModal(true)
  }

  // Add/Edit Interview
  const handleAddInterview = async () => {
    if (!interviewForm.applicationId || !interviewForm.interviewDate || !interviewForm.interviewTime) {
      showToast('Please fill required fields', 'warning')
      return
    }

    try {
      if (editingInterview) {
        // Update existing interview
        const { error } = await supabase
          .from('job_interviews')
          .update({
            application_id: interviewForm.applicationId,
            interview_date: interviewForm.interviewDate,
            interview_time: interviewForm.interviewTime,
            interview_type: interviewForm.interviewType || null,
            location: interviewForm.location || null,
            notes: interviewForm.notes || null
          })
          .eq('id', editingInterview.id)
          .eq('school_id', currentUser.school_id)

        if (error) throw error
        showToast('Interview updated successfully!', 'success')
      } else {
        // Add new interview
        const { error } = await supabase
          .from('job_interviews')
          .insert({
            school_id: currentUser.school_id,
            user_id: currentUser.id,
            application_id: interviewForm.applicationId,
            interview_date: interviewForm.interviewDate,
            interview_time: interviewForm.interviewTime,
            interview_type: interviewForm.interviewType || 'in-person',
            location: interviewForm.location || null,
            notes: interviewForm.notes || null,
            status: 'scheduled',
            created_by: currentUser.id
          })

        if (error) throw error
        showToast('Interview scheduled successfully!', 'success')
      }

      setInterviewForm({
        applicationId: '',
        interviewDate: '',
        interviewTime: '',
        interviewType: '',
        location: '',
        notes: ''
      })
      setEditingInterview(null)
      setShowInterviewModal(false)
      fetchInterviews()
    } catch (error) {
      console.error('Error saving interview:', error)
      showToast('Error saving interview: ' + error.message, 'error')
    }
  }

  // Open edit interview modal
  const handleEditInterview = (interview) => {
    setEditingInterview(interview)
    setInterviewForm({
      applicationId: interview.application_id || '',
      interviewDate: interview.interview_date || '',
      interviewTime: interview.interview_time || '',
      interviewType: interview.interview_type || '',
      location: interview.location || '',
      notes: interview.notes || ''
    })
    setShowInterviewModal(true)
  }

  // Delete Interview
  const handleDeleteInterview = (id) => {
    showConfirmDialog(
      'Delete Interview',
      'Are you sure you want to delete this interview?',
      async () => {
        try {
          const { error } = await supabase
            .from('job_interviews')
            .delete()
            .eq('id', id)
            .eq('school_id', currentUser.school_id)

          if (error) throw error
          showToast('Interview deleted successfully', 'success')
          fetchInterviews()
        } catch (error) {
          console.error('Error deleting interview:', error)
          showToast('Error deleting interview', 'error')
        }
      }
    )
  }

  // Hire candidate from interview
  const handleHireFromInterview = async (interviewId) => {
    showConfirmDialog(
      'Hire Candidate',
      'Are you sure you want to hire this candidate? This will create an active staff record.',
      async () => {
        try {
          // Get the interview and application details
          const { data: interview, error: interviewError } = await supabase
            .from('job_interviews')
            .select(`
              *,
              application:job_applications(*)
            `)
            .eq('id', interviewId)
            .single()

          if (interviewError) throw interviewError

          const application = interview.application

          // Create staff record
          const { error: staffError } = await supabase
            .from('staff')
            .insert({
              school_id: currentUser.school_id,
              created_by: currentUser.id,
              employee_number: `EMP-${Date.now()}`,
              first_name: application.applicant_name,
              father_name: application.father_name || null,
              phone: application.mobile_number || null,
              email: application.email || null,
              joining_date: new Date().toISOString().split('T')[0],
              department: application.subjects || null,
              status: 'active'
            })

          if (staffError) throw staffError

          // Update interview status to 'completed'
          const { error: updateInterviewError } = await supabase
            .from('job_interviews')
            .update({ status: 'completed' })
            .eq('id', interviewId)
            .eq('school_id', currentUser.school_id)

          if (updateInterviewError) throw updateInterviewError

          // Update application status to 'hired'
          const { error: updateAppError } = await supabase
            .from('job_applications')
            .update({ status: 'hired' })
            .eq('id', application.id)
            .eq('school_id', currentUser.school_id)

          if (updateAppError) throw updateAppError

          showToast('Candidate hired and added to staff successfully!', 'success')
          fetchInterviews()
          fetchApplications()
        } catch (error) {
          console.error('Error hiring candidate:', error)
          showToast('Error hiring candidate: ' + error.message, 'error')
        }
      }
    )
  }

  // Delete Subject
  const handleDeleteSubject = (id) => {
    showConfirmDialog(
      'Delete Subject',
      'Are you sure you want to delete this subject?',
      async () => {
        try {
          const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', id)
            .eq('school_id', currentUser.school_id)

          if (error) throw error
          showToast('Subject deleted successfully', 'success')
          fetchSubjects()
        } catch (error) {
          console.error('Error deleting subject:', error)
          showToast('Error deleting subject', 'error')
        }
      }
    )
  }

  // Delete Job
  const handleDeleteJob = (id) => {
    showConfirmDialog(
      'Delete Job',
      'Are you sure you want to delete this job?',
      async () => {
        try {
          const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', id)
            .eq('school_id', currentUser.school_id)

          if (error) throw error
          showToast('Job deleted successfully', 'success')
          fetchJobs()
        } catch (error) {
          console.error('Error deleting job:', error)
          showToast('Error deleting job', 'error')
        }
      }
    )
  }

  // Delete Application
  const handleDeleteApplication = (id) => {
    showConfirmDialog(
      'Delete Application',
      'Are you sure you want to delete this application?',
      async () => {
        try {
          const { error } = await supabase
            .from('job_applications')
            .delete()
            .eq('id', id)
            .eq('school_id', currentUser.school_id)

          if (error) throw error
          showToast('Application deleted successfully', 'success')
          fetchApplications()
          fetchJobs() // Refresh to update applicant counts
        } catch (error) {
          console.error('Error deleting application:', error)
          showToast('Error deleting application', 'error')
        }
      }
    )
  }

  // Update Application Status
  const handleStatusChange = async (id, newStatus) => {
    // Optimistic update - update UI immediately
    setApplications(prevApps => 
      prevApps.map(app => app.id === id ? { ...app, status: newStatus } : app)
    )

    try {
      // Update application status in database
      const { error: updateError } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('school_id', currentUser.school_id)

      if (updateError) throw updateError

      // Show success message based on status
      if (newStatus === 'scheduled') {
        showToast('Application marked as ready for interview scheduling', 'success')
      } else if (newStatus === 'rejected') {
        showToast('Application rejected', 'success')
      } else {
        showToast('Status updated successfully!', 'success')
      }

      // Refresh applications to update the list
      fetchApplications()
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Error updating status: ' + error.message, 'error')
      // Revert optimistic update on error
      fetchApplications()
    }
  }

  // Filtered Subjects
  // Memoized Filtered Subjects (only recalculate when dependencies change)
  const filteredSubjects = useMemo(() => 
    subjects.filter(subject =>
      subject.subject_name?.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    ),
    [subjects, subjectSearchQuery]
  )

  // Memoized Filtered Jobs
  const filteredJobs = useMemo(() =>
    jobs.filter(job =>
      job.title?.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
      job.department?.department_name?.toLowerCase().includes(jobSearchQuery.toLowerCase())
    ),
    [jobs, jobSearchQuery]
  )

  // Memoized Filtered Applications with sorting
  const filteredApplications = useMemo(() =>
    applications
      .filter(app =>
        app.applicant_name?.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
        app.job?.title?.toLowerCase().includes(appSearchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // Priority order: pending/new applications first, scheduled second, rejected last
        const statusPriority = {
          'pending': 1,
          'short-listed': 1,
          'scheduled': 2,
          'rejected': 3
        }
        return (statusPriority[a.status] || 1) - (statusPriority[b.status] || 1)
      }),
    [applications, appSearchQuery]
  )

  // Memoized Filtered Interviews
  const filteredInterviews = useMemo(() =>
    interviews.filter(interview =>
      interview.application?.applicant_name?.toLowerCase().includes(interviewSearchQuery.toLowerCase()) ||
      interview.application?.job?.title?.toLowerCase().includes(interviewSearchQuery.toLowerCase())
    ),
    [interviews, interviewSearchQuery]
  )

  return (
    <div className="p-1">
      {/* Main Content */}
      <div id="main-content">
        {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9997] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 font-medium">Loading...</p>
          </div>
        </div>
      )}

      {/* Tabs - Compact */}
      <div className="flex gap-1 mb-1">
        {['jobs', 'applications', 'interviews'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-all capitalize rounded-lg ${
              activeTab === tab
                ? 'bg-red-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* JOBS TAB */}
      {activeTab === 'jobs' && (
        <div>
          <div className="flex justify-end items-center gap-2 mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search jobs..."
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                className="border border-gray-300 rounded-lg px text-sm-3 py-1.5 pr-9 w-56"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={() => setShowJobModal(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Add New Job
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-3 py-2 text-left text-sm">Sr.</th>
                  <th className="px-3 py-2 text-left text-sm">Department</th>
                  <th className="px-3 py-2 text-left text-sm">Job Title</th>
                  <th className="px-3 py-2 text-left text-sm">Salary</th>
                  <th className="px-3 py-2 text-left text-sm">Deadline</th>
                  <th className="px-3 py-2 text-center text-sm">Applicants</th>
                  <th className="px-3 py-2 text-center text-sm">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, index) => (
                  <tr key={job.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{index + 1}</td>
                    <td className="px-3 py-2 text-sm">{job.department?.department_name || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{job.title}</td>
                    <td className="px-3 py-2 text-sm">{job.salary ? `${job.salary}` : 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">
                      {job.deadline ? new Date(job.deadline).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-center text-sm">{job.applicant_count || 0}</td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditJob(job)}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="text-red-500 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {activeTab === 'applications' && (
        <div>
          <div className="flex justify-end items-center gap-2 mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search applications..."
                value={appSearchQuery}
                onChange={(e) => setAppSearchQuery(e.target.value)}
                className="border border-gray-300 rounded-lg px text-sm-3 py-1.5 pr-9 w-56"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={() => setShowApplicationModal(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Add New Application
            </button>
          </div>

          <p className="text-gray-600 mb-4">
            There are <span className="text-red-600 font-semibold">{filteredApplications.length}</span> records found in data bank
          </p>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-900 text-white text-sm">
                  <th className="px-3 py-2 text-left text-sm">Sr.</th>
                  <th className="px-3 py-2 text-left text-sm">Department</th>
                  <th className="px-3 py-2 text-left text-sm">Job</th>
                  <th className="px-3 py-2 text-left text-sm">Applicant</th>
                  <th className="px-3 py-2 text-left text-sm">Status</th>
                  <th className="px-3 py-2 text-left text-sm">Date</th>
                  <th className="px-3 py-2 text-center text-sm">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app, index) => (
                  <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{index + 1}</td>
                    <td className="px-3 py-2 text-sm">{app.job?.department?.department_name || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{app.job?.title || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm">{app.applicant_name}</td>
                    <td className="px-3 py-2 text-sm">
                      <select
                        value={app.status === 'pending' || app.status === 'short-listed' ? 'pending' : app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className={`px-3 py-1 rounded text-xs font-medium text-white ${
                          app.status === 'scheduled' ? 'bg-blue-500' :
                          app.status === 'rejected' ? 'bg-red-500' :
                          'bg-orange-500'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="scheduled">Ready for Interview</option>
                        <option value="rejected">Reject</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {new Date(app.application_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditApplication(app)}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          className="text-red-500 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INTERVIEWS TAB */}
      {activeTab === 'interviews' && (
        <div>
          <div className="flex justify-end items-center gap-2 mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search interviews..."
                value={interviewSearchQuery}
                onChange={(e) => setInterviewSearchQuery(e.target.value)}
                className="border border-gray-300 rounded-lg px text-sm-3 py-1.5 pr-9 w-56"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={() => setShowInterviewModal(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Schedule Interview
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-3 py-2 text-left text-sm">Sr.</th>
                  <th className="px-3 py-2 text-left text-sm">Candidate</th>
                  <th className="px-3 py-2 text-left text-sm">Job</th>
                  <th className="px-3 py-2 text-left text-sm">Date</th>
                  <th className="px-3 py-2 text-left text-sm">Time</th>
                  <th className="px-3 py-2 text-left text-sm">Type</th>
                  <th className="px-3 py-2 text-left text-sm">Status</th>
                  <th className="px-3 py-2 text-center text-sm">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterviews.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      No interviews scheduled yet
                    </td>
                  </tr>
                ) : (
                  filteredInterviews.map((interview, index) => (
                    <tr key={interview.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm">{index + 1}</td>
                      <td className="px-3 py-2 text-sm">{interview.application?.applicant_name || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm">{interview.application?.job?.title || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm">
                        {new Date(interview.interview_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm">{interview.interview_time}</td>
                      <td className="px-3 py-2 capitalize">{interview.interview_type || 'N/A'}</td>
                      <td className="px-3 py-2 capitalize">{interview.status}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="flex justify-center gap-2">
                          {interview.status === 'scheduled' && (
                            <button
                              onClick={() => handleHireFromInterview(interview.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium"
                              title="Hire Candidate"
                            >
                              Hire
                            </button>
                          )}
                          <button
                            onClick={() => handleEditInterview(interview)}
                            className="text-blue-500 hover:text-blue-600 p-1"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInterview(interview.id)}
                            className="text-red-500 hover:text-red-600 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      {/* End of main-content div - Modals below won't be blurred */}

      {/* ADD/EDIT SUBJECT MODAL */}
      {showSubjectModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => {
            setShowSubjectModal(false)
            setEditingSubject(null)
            setSubjectName('')
          }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
              <button onClick={() => {
                setShowSubjectModal(false)
                setEditingSubject(null)
                setSubjectName('')
              }} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">GENERAL INFORMATION</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Subject Name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowSubjectModal(false)
                  setEditingSubject(null)
                  setSubjectName('')
                }}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleAddSubject}
                className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
              >
                Save <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADD/EDIT JOB MODAL */}
      {showJobModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => {
            setShowJobModal(false)
            setShowCustomDepartment(false)
            setCustomDepartmentName('')
            setEditingJob(null)
            setJobForm({ departmentId: '', title: '', salary: '', deadline: '', description: '' })
          }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">{editingJob ? 'Edit Job' : 'Add New Job'}</h2>
              <button onClick={() => {
                setShowJobModal(false)
                setShowCustomDepartment(false)
                setCustomDepartmentName('')
                setEditingJob(null)
                setJobForm({ departmentId: '', title: '', salary: '', deadline: '', description: '' })
              }} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">GENERAL INFORMATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jobForm.departmentId}
                    onChange={(e) => {
                      setJobForm({...jobForm, departmentId: e.target.value})
                      setShowCustomDepartment(e.target.value === 'Other')
                      if (e.target.value !== 'Other') {
                        setCustomDepartmentName('')
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select an option</option>
                    {departmentOptions.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                {showCustomDepartment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Department Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter department name"
                      value={customDepartmentName}
                      onChange={(e) => setCustomDepartmentName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Job title"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                  <input
                    type="number"
                    placeholder="Salary"
                    value={jobForm.salary}
                    onChange={(e) => setJobForm({...jobForm, salary: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={(e) => setJobForm({...jobForm, deadline: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  placeholder="Write job detail..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({...jobForm, description: e.target.value})}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowJobModal(false)
                  setShowCustomDepartment(false)
                  setCustomDepartmentName('')
                  setEditingJob(null)
                  setJobForm({ departmentId: '', title: '', salary: '', deadline: '', description: '' })
                }}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleAddJob}
                className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
              >
                Save <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADD/EDIT APPLICATION MODAL */}
      {showApplicationModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => {
            setShowApplicationModal(false)
            setEditingApplication(null)
            setApplicationForm({ jobId: '', candidateName: '', cnicNumber: '', fatherName: '', email: '', mobileNumber: '', department: '', photo_url: '', experienceLevel: '' })
          }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">{editingApplication ? 'Edit Application' : 'Add New Application'}</h2>
              <button onClick={() => {
                setShowApplicationModal(false)
                setEditingApplication(null)
                setApplicationForm({ jobId: '', candidateName: '', cnicNumber: '', fatherName: '', email: '', mobileNumber: '', department: '', photo_url: '', experienceLevel: '' })
              }} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">GENERAL INFORMATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Job <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={applicationForm.jobId}
                    onChange={(e) => setApplicationForm({...applicationForm, jobId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select job</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Candidate Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter candidate name (Required)"
                    value={applicationForm.candidateName}
                    onChange={(e) => setApplicationForm({...applicationForm, candidateName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Number</label>
                  <input
                    type="text"
                    placeholder="CNIC Number"
                    value={applicationForm.cnicNumber}
                    onChange={(e) => setApplicationForm({...applicationForm, cnicNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Father Name</label>
                  <input
                    type="text"
                    placeholder="Father Name"
                    value={applicationForm.fatherName}
                    onChange={(e) => setApplicationForm({...applicationForm, fatherName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address (Required)"
                    value={applicationForm.email}
                    onChange={(e) => setApplicationForm({...applicationForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={applicationForm.mobileNumber}
                    onChange={(e) => setApplicationForm({...applicationForm, mobileNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setApplicationForm({...applicationForm, photo_url: reader.result})
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={applicationForm.department}
                    onChange={(e) => setApplicationForm({...applicationForm, department: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.department_name}>{dept.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
                  <select
                    value={applicationForm.experienceLevel}
                    onChange={(e) => setApplicationForm({...applicationForm, experienceLevel: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select experience level</option>
                    <option value="fresher">Fresher</option>
                    <option value="1-2 years">1-2 Years</option>
                    <option value="3-5 years">3-5 Years</option>
                    <option value="5+ years">5+ Years</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowApplicationModal(false)
                  setEditingApplication(null)
                  setApplicationForm({ jobId: '', candidateName: '', cnicNumber: '', fatherName: '', email: '', mobileNumber: '', department: '', photo_url: '', experienceLevel: '' })
                }}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleAddApplication}
                className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
              >
                Save <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADD/EDIT INTERVIEW MODAL */}
      {showInterviewModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => {
            setShowInterviewModal(false)
            setEditingInterview(null)
            setInterviewForm({ applicationId: '', interviewDate: '', interviewTime: '', interviewType: '', location: '', notes: '' })
          }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">{editingInterview ? 'Edit Interview' : 'Schedule Interview'}</h2>
              <button onClick={() => {
                setShowInterviewModal(false)
                setEditingInterview(null)
                setInterviewForm({ applicationId: '', interviewDate: '', interviewTime: '', interviewType: '', location: '', notes: '' })
              }} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">INTERVIEW DETAILS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Application <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={interviewForm.applicationId}
                    onChange={(e) => setInterviewForm({...interviewForm, applicationId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={editingInterview}
                  >
                    <option value="">Select application</option>
                    {applications.filter(app => app.status !== 'rejected').map(app => (
                      <option key={app.id} value={app.id}>
                        {app.applicant_name} - {app.job?.title || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={interviewForm.interviewType}
                    onChange={(e) => setInterviewForm({...interviewForm, interviewType: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select type</option>
                    <option value="phone">Phone</option>
                    <option value="video">Video</option>
                    <option value="in-person">In-Person</option>
                    <option value="panel">Panel</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={interviewForm.interviewDate}
                    onChange={(e) => setInterviewForm({...interviewForm, interviewDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={interviewForm.interviewTime}
                    onChange={(e) => setInterviewForm({...interviewForm, interviewTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="Interview location"
                  value={interviewForm.location}
                  onChange={(e) => setInterviewForm({...interviewForm, location: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  placeholder="Additional notes..."
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm({...interviewForm, notes: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px text-sm-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowInterviewModal(false)
                  setEditingInterview(null)
                  setInterviewForm({ applicationId: '', interviewDate: '', interviewTime: '', interviewType: '', location: '', notes: '' })
                }}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleAddInterview}
                className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
              >
                Save <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center" onClick={handleCancel}>
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold">{confirmDialog.title}</h3>
              </div>
              <div className="p-2">
                <p className="text-gray-700">{confirmDialog.message}</p>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 min-w-[320px] max-w-md px-3 py-2 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-blue-500' :
              toast.type === 'error' ? 'bg-red-600' :
              toast.type === 'warning' ? 'bg-blue-500' :
              'bg-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}