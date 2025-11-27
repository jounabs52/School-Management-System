'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Plus, Edit, Trash2, Search, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState('subjects')
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  // Subjects State
  const [subjects, setSubjects] = useState([])
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [subjectName, setSubjectName] = useState('')

  // Departments State
  const [departments, setDepartments] = useState([])

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
    subjects: '',
    experienceLevel: ''
  })

  // Interviews State
  const [interviews, setInterviews] = useState([])

  // Search States
  const [jobSearchQuery, setJobSearchQuery] = useState('')
  const [appSearchQuery, setAppSearchQuery] = useState('')

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  })

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
      fetchSubjects(),
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
          department:departments(department_name)
        `)
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get applicant counts for each job
      const jobsWithCounts = await Promise.all(data.map(async (job) => {
        const { count } = await supabase
          .from('job_applications')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id)

        return { ...job, applicant_count: count || 0 }
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
            candidate_name,
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

  // Add Subject
  const handleAddSubject = async () => {
    if (!subjectName.trim()) {
      showToast('Please enter subject name', 'warning')
      return
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .insert({
          school_id: currentUser.school_id,
          subject_name: subjectName,
          created_by: currentUser.id
        })

      if (error) throw error

      showToast('Subject added successfully!', 'success')
      setSubjectName('')
      setShowSubjectModal(false)
      fetchSubjects()
    } catch (error) {
      console.error('Error adding subject:', error)
      showToast('Error adding subject: ' + error.message, 'error')
    }
  }

  // Add Job
  const handleAddJob = async () => {
    if (!jobForm.title || !jobForm.departmentId) {
      showToast('Please fill required fields', 'warning')
      return
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .insert({
          school_id: currentUser.school_id,
          department_id: jobForm.departmentId,
          title: jobForm.title,
          salary: jobForm.salary || null,
          deadline: jobForm.deadline || null,
          description: jobForm.description,
          created_by: currentUser.id
        })

      if (error) throw error

      showToast('Job added successfully!', 'success')
      setJobForm({
        departmentId: '',
        title: '',
        salary: '',
        deadline: '',
        description: ''
      })
      setShowJobModal(false)
      fetchJobs()
    } catch (error) {
      console.error('Error adding job:', error)
      showToast('Error adding job: ' + error.message, 'error')
    }
  }

  // Add Application
  const handleAddApplication = async () => {
    if (!applicationForm.jobId || !applicationForm.candidateName) {
      showToast('Please fill required fields', 'warning')
      return
    }

    try {
      const { error } = await supabase
        .from('job_applications')
        .insert({
          school_id: currentUser.school_id,
          job_id: applicationForm.jobId,
          candidate_name: applicationForm.candidateName,
          father_name: applicationForm.fatherName,
          email: applicationForm.email,
          mobile_number: applicationForm.mobileNumber,
          cnic_number: applicationForm.cnicNumber,
          subjects: applicationForm.subjects,
          experience_level: applicationForm.experienceLevel,
          created_by: currentUser.id
        })

      if (error) throw error

      showToast('Application added successfully!', 'success')
      setApplicationForm({
        jobId: '',
        candidateName: '',
        cnicNumber: '',
        fatherName: '',
        email: '',
        mobileNumber: '',
        subjects: '',
        experienceLevel: ''
      })
      setShowApplicationModal(false)
      fetchApplications()
      fetchJobs() // Refresh to update applicant counts
    } catch (error) {
      console.error('Error adding application:', error)
      showToast('Error adding application: ' + error.message, 'error')
    }
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
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      showToast('Status updated successfully!', 'success')
      fetchApplications()
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('Error updating status', 'error')
    }
  }

  // Filtered Jobs
  const filteredJobs = jobs.filter(job =>
    job.title?.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
    job.department?.department_name?.toLowerCase().includes(jobSearchQuery.toLowerCase())
  )

  // Filtered Applications
  const filteredApplications = applications.filter(app =>
    app.candidate_name?.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
    app.job?.title?.toLowerCase().includes(appSearchQuery.toLowerCase())
  )

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 rounded-lg">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Recruitment</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {['subjects', 'jobs', 'applications', 'interviews'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* SUBJECTS TAB */}
      {activeTab === 'subjects' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowSubjectModal(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add New Subject
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="border border-gray-300 rounded-lg px-4 py-2 pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-3 text-left">Sr.</th>
                  <th className="px-4 py-3 text-left">Subject Name</th>
                  <th className="px-4 py-3 text-center">Options</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject, index) => (
                  <tr key={subject.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3">{subject.subject_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button className="text-blue-500 hover:text-blue-600 p-1" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(subject.id)}
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

      {/* JOBS TAB */}
      {activeTab === 'jobs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowJobModal(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add New Job
            </button>

            <div className="flex gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition">
                Search
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-3 text-left">Sr.</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Job Title</th>
                  <th className="px-4 py-3 text-left">Salary</th>
                  <th className="px-4 py-3 text-left">Deadline</th>
                  <th className="px-4 py-3 text-center">Applicants</th>
                  <th className="px-4 py-3 text-center">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, index) => (
                  <tr key={job.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3">{job.department?.department_name || 'N/A'}</td>
                    <td className="px-4 py-3">{job.title}</td>
                    <td className="px-4 py-3">{job.salary ? `${job.salary}` : 'N/A'}</td>
                    <td className="px-4 py-3">
                      {job.deadline ? new Date(job.deadline).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-center">{job.applicant_count || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button className="text-blue-500 hover:text-blue-600 p-1" title="Edit">
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
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowApplicationModal(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add New Applications
            </button>

            <div className="flex gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition">
                Search
              </button>
              <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition">
                Advance Search
              </button>
            </div>
          </div>

          <p className="text-gray-600 mb-4">
            There are <span className="text-red-600 font-semibold">{filteredApplications.length}</span> records found in data bank
          </p>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-900 text-white text-sm">
                  <th className="px-4 py-3 text-left">Sr.</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Job</th>
                  <th className="px-4 py-3 text-left">Applicant</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Docs</th>
                  <th className="px-4 py-3 text-center">Options</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app, index) => (
                  <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3">{app.job?.department?.department_name || 'N/A'}</td>
                    <td className="px-4 py-3">{app.job?.title || 'N/A'}</td>
                    <td className="px-4 py-3">{app.candidate_name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className={`px-3 py-1 rounded text-xs font-medium text-white ${
                          app.status === 'hired' ? 'bg-green-500' :
                          app.status === 'qualified' ? 'bg-orange-500' :
                          app.status === 'schedule' ? 'bg-blue-500' :
                          'bg-orange-500'
                        }`}
                      >
                        <option value="short-listed">Short Listed</option>
                        <option value="qualified">Qualified</option>
                        <option value="schedule">Schedule</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(app.application_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {app.cv_url ? (
                        <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs rounded">CV</span>
                      ) : (
                        <span className="text-gray-400 text-xs">No CV</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button className="text-blue-500 hover:text-blue-600 p-1" title="View Details">
                          <Plus className="w-4 h-4" />
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
          <div className="flex justify-between items-center mb-4">
            <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
              <Plus className="w-4 h-4" />
              Schedule Interview
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-3 text-left">Sr.</th>
                  <th className="px-4 py-3 text-left">Candidate</th>
                  <th className="px-4 py-3 text-left">Job</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Options</th>
                </tr>
              </thead>
              <tbody>
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      No interviews scheduled yet
                    </td>
                  </tr>
                ) : (
                  interviews.map((interview, index) => (
                    <tr key={interview.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">{interview.application?.candidate_name || 'N/A'}</td>
                      <td className="px-4 py-3">{interview.application?.job?.title || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {new Date(interview.interview_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3">{interview.interview_time}</td>
                      <td className="px-4 py-3 capitalize">{interview.interview_type || 'N/A'}</td>
                      <td className="px-4 py-3 capitalize">{interview.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button className="text-blue-500 hover:text-blue-600 p-1" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-500 hover:text-red-600 p-1" title="Delete">
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

      {/* ADD SUBJECT MODAL */}
      {showSubjectModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSubjectModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">Add New Subject</h2>
              <button onClick={() => setShowSubjectModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">GENERAL INFORMATION</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Subject Name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowSubjectModal(false)}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleAddSubject}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
              >
                Save <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADD JOB MODAL */}
      {showJobModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowJobModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">Add New Job</h2>
              <button onClick={() => setShowJobModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">GENERAL INFORMATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jobForm.departmentId}
                    onChange={(e) => setJobForm({...jobForm, departmentId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select an option</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Job title"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                  <input
                    type="number"
                    placeholder="Salary"
                    value={jobForm.salary}
                    onChange={(e) => setJobForm({...jobForm, salary: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={(e) => setJobForm({...jobForm, deadline: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="px-6 pb-6 border-t border-gray-200 pt-4 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowJobModal(false)}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleAddJob}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
              >
                Save <span className="text-xl">→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADD APPLICATION MODAL */}
      {showApplicationModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowApplicationModal(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-semibold">Add New Application</h2>
              <button onClick={() => setShowApplicationModal(false)} className="hover:bg-blue-800 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">GENERAL INFORMATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Job <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={applicationForm.jobId}
                    onChange={(e) => setApplicationForm({...applicationForm, jobId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    placeholder="Candidate Name"
                    value={applicationForm.candidateName}
                    onChange={(e) => setApplicationForm({...applicationForm, candidateName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Number</label>
                  <input
                    type="text"
                    placeholder="CNIC Number"
                    value={applicationForm.cnicNumber}
                    onChange={(e) => setApplicationForm({...applicationForm, cnicNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Father Name</label>
                  <input
                    type="text"
                    placeholder="Father Name"
                    value={applicationForm.fatherName}
                    onChange={(e) => setApplicationForm({...applicationForm, fatherName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={applicationForm.email}
                    onChange={(e) => setApplicationForm({...applicationForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={applicationForm.mobileNumber}
                    onChange={(e) => setApplicationForm({...applicationForm, mobileNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
                  <input
                    type="text"
                    placeholder="Subjects"
                    value={applicationForm.subjects}
                    onChange={(e) => setApplicationForm({...applicationForm, subjects: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
                  <select
                    value={applicationForm.experienceLevel}
                    onChange={(e) => setApplicationForm({...applicationForm, experienceLevel: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                onClick={() => setShowApplicationModal(false)}
                className="px-6 py-2 text-blue-500 hover:text-blue-600 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleAddApplication}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
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
          <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center" onClick={handleCancel}>
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold">{confirmDialog.title}</h3>
              </div>
              <div className="p-6">
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
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
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
            className={`flex items-center gap-3 min-w-[320px] max-w-md px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-blue-500' :
              toast.type === 'error' ? 'bg-blue-600' :
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
