'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'
import PermissionGuard from '@/components/PermissionGuard'
import ResponsiveTableWrapper from '@/components/ResponsiveTableWrapper'
import DataCard, { CardHeader, CardRow, CardActions, CardGrid, CardInfoGrid } from '@/components/DataCard'
import {
  BookOpen, Plus, Edit, Trash2, X, Save, Search,
  Users, BookCopy, RotateCcw, AlertCircle, CheckCircle,
  Calendar, DollarSign, Filter, FileText, Eye, History
} from 'lucide-react'

function LibraryPageContent() {
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('books') // books, issue, return, members, history
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])

  // Books Management States
  const [books, setBooks] = useState([])
  const [showBookModal, setShowBookModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentBook, setCurrentBook] = useState({
    book_title: '',
    isbn: '',
    author: '',
    publisher: '',
    edition: '',
    publication_year: '',
    category: '',
    book_number: '',
    rack_number: '',
    price: '',
    total_copies: 1,
    available_copies: 1
  })

  // Issue Book States
  const [availableBooks, setAvailableBooks] = useState([])
  const [students, setStudents] = useState([])
  const [staff, setStaff] = useState([])
  const [issueForm, setIssueForm] = useState({
    book_id: '',
    borrower_type: 'student',
    borrower_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    remarks: ''
  })

  // Search states for Issue Book
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [staffSearchTerm, setStaffSearchTerm] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)

  // Return Book States
  const [issuedBooks, setIssuedBooks] = useState([])
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [returnForm, setReturnForm] = useState({
    return_date: new Date().toISOString().split('T')[0],
    fine_amount: 0,
    fine_paid: false,
    remarks: ''
  })

  // History States
  const [historyRecords, setHistoryRecords] = useState([])
  const [historyFilter, setHistoryFilter] = useState('all') // all, issued, returned, paid, unpaid

  // Library Members States
  const [members, setMembers] = useState([])
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [memberForm, setMemberForm] = useState({
    member_type: 'student',
    member_id: '',
    membership_number: '',
    membership_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    status: 'active'
  })

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [bookToDelete, setBookToDelete] = useState(null)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const showToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 3000)
  }

  // Apply blur effect to sidebar when modals are open
  useEffect(() => {
    if (showBookModal || showMemberModal || selectedIssue || showDeleteModal) {
      document.body.style.overflow = 'hidden'
      const sidebar = document.querySelector('aside') || document.querySelector('nav') || document.querySelector('[role="navigation"]')
      if (sidebar) {
        sidebar.style.filter = 'blur(4px)'
        sidebar.style.pointerEvents = 'none'
      }
    } else {
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
  }, [showBookModal, showMemberModal, selectedIssue, showDeleteModal])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStudentDropdown && !event.target.closest('.relative')) {
        setShowStudentDropdown(false)
      }
      if (showStaffDropdown && !event.target.closest('.relative')) {
        setShowStaffDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStudentDropdown, showStaffDropdown])

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
      fetchBooks()
      fetchStudents()
      fetchStaff()
      fetchMembers()
      fetchIssuedBooks()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser?.school_id && activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab, currentUser])

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBooks(data || [])
      setAvailableBooks(data?.filter(book => book.available_copies > 0) || [])
    } catch (error) {
      console.error('Error fetching books:', error)
      showToast('Failed to fetch books', 'error')
    }
  }

  const fetchStudents = async () => {
    try {
      if (!currentUser?.school_id) {
        console.error('❌ No school_id available')
        return
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, admission_number, first_name, last_name, roll_number, current_class_id')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('first_name')

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }
      console.log('✅ Fetched students:', data?.length || 0)
      setStudents(data || [])
    } catch (error) {
      console.error('❌ Error fetching students:', error)
      showToast('Failed to fetch students', 'error')
    }
  }

  const fetchStaff = async () => {
    try {
      if (!currentUser?.school_id) {
        console.error('❌ No school_id available')
        return
      }

      const { data, error } = await supabase
        .from('staff')
        .select('id, computer_no, first_name, last_name, designation, department')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('first_name')

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }
      console.log('✅ Fetched staff:', data?.length || 0)
      setStaff(data || [])
    } catch (error) {
      console.error('❌ Error fetching staff:', error)
      showToast('Failed to fetch staff', 'error')
    }
  }

  const fetchMembers = async () => {
    try {
      // Fetch library members
      const { data: membersData, error: membersError } = await supabase
        .from('library_members')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (membersError) throw membersError

      if (!membersData || membersData.length === 0) {
        setMembers([])
        return
      }

      // Get unique student and staff IDs
      const studentIds = membersData.filter(m => m.member_type === 'student').map(m => m.member_id)
      const staffIds = membersData.filter(m => m.member_type === 'staff').map(m => m.member_id)

      // Fetch students
      let studentsMap = {}
      if (studentIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name, admission_number')
          .in('id', studentIds)

        if (!studentsError && studentsData) {
          studentsMap = Object.fromEntries(studentsData.map(s => [s.id, s]))
        }
      }

      // Fetch staff
      let staffMap = {}
      if (staffIds.length > 0) {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, computer_no')
          .in('id', staffIds)

        if (!staffError && staffData) {
          staffMap = Object.fromEntries(staffData.map(s => [s.id, s]))
        }
      }

      // Merge data
      const enrichedMembers = membersData.map(member => ({
        ...member,
        students: member.member_type === 'student' ? studentsMap[member.member_id] : null,
        staff: member.member_type === 'staff' ? staffMap[member.member_id] : null
      }))

      setMembers(enrichedMembers)
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchIssuedBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('book_issues')
        .select(`
          *,
          books(book_title, author, book_number)
        `)
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)
        .in('status', ['issued', 'overdue'])
        .order('issue_date', { ascending: false })

      if (error) throw error
      setIssuedBooks(data || [])
    } catch (error) {
      console.error('Error fetching issued books:', error)
    }
  }

  const fetchHistory = async () => {
    try {
      if (!currentUser?.school_id) {
        console.error('❌ No school_id available for history')
        return
      }

      setLoading(true)

      // Fetch book issues first
      const { data: issuesData, error: issuesError } = await supabase
        .from('book_issues')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (issuesError) {
        console.error('❌ Error fetching issues:', issuesError)
        throw issuesError
      }

      // Fetch books
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('id, book_title, author, book_number')
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)

      if (booksError) {
        console.error('❌ Error fetching books:', booksError)
      }

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, admission_number')
        .eq('school_id', currentUser.school_id)

      if (studentsError) {
        console.error('❌ Error fetching students:', studentsError)
      }

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, first_name, last_name, computer_no')
        .eq('school_id', currentUser.school_id)

      if (staffError) {
        console.error('❌ Error fetching staff:', staffError)
      }

      // Manually join the data
      const enrichedData = issuesData.map(issue => {
        const book = booksData?.find(b => b.id === issue.book_id)
        const student = issue.borrower_type === 'student'
          ? studentsData?.find(s => s.id === issue.borrower_id)
          : null
        const staff = issue.borrower_type === 'staff'
          ? staffData?.find(s => s.id === issue.borrower_id)
          : null

        return {
          ...issue,
          books: book || null,
          students: student || null,
          staff: staff || null
        }
      })

      console.log('✅ Fetched history records:', enrichedData.length)
      setHistoryRecords(enrichedData || [])
    } catch (error) {
      console.error('❌ Error fetching history:', error)
      showToast('Failed to fetch history', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBook = async () => {
    if (!currentBook.book_title || !currentBook.book_number) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      const bookData = {
        ...currentBook,
        school_id: currentUser.school_id,
        user_id: currentUser.id,
        created_by: currentUser.id,
        available_copies: parseInt(currentBook.available_copies) || 1,
        total_copies: parseInt(currentBook.total_copies) || 1,
        price: parseFloat(currentBook.price) || 0,
        publication_year: currentBook.publication_year ? parseInt(currentBook.publication_year) : null
      }

      if (editMode) {
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', currentBook.id)
          .eq('school_id', currentUser.school_id)

        if (error) throw error
        showToast('Book updated successfully', 'success')
      } else {
        const { error } = await supabase
          .from('books')
          .insert([bookData])

        if (error) throw error
        showToast('Book added successfully', 'success')
      }

      fetchBooks()
      setShowBookModal(false)
      resetBookForm()
    } catch (error) {
      console.error('Error saving book:', error)
      showToast(error.message || 'Failed to save book', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleIssueBook = async () => {
    if (!issueForm.book_id || !issueForm.borrower_id || !issueForm.due_date) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      // Check if book is available
      const book = availableBooks.find(b => b.id === issueForm.book_id)
      if (!book || book.available_copies < 1) {
        showToast('Book is not available', 'error')
        return
      }

      // Create issue record
      const { error: issueError } = await supabase
        .from('book_issues')
        .insert([{
          school_id: currentUser.school_id,
          user_id: currentUser.id,
          book_id: issueForm.book_id,
          borrower_type: issueForm.borrower_type,
          borrower_id: issueForm.borrower_id,
          issue_date: issueForm.issue_date,
          due_date: issueForm.due_date,
          issued_by: currentUser.id,
          remarks: issueForm.remarks,
          status: 'issued'
        }])

      if (issueError) throw issueError

      // Update book available copies
      const { error: updateError } = await supabase
        .from('books')
        .update({ available_copies: book.available_copies - 1 })
        .eq('id', issueForm.book_id)
        .eq('school_id', currentUser.school_id)

      if (updateError) throw updateError

      showToast('Book issued successfully', 'success')
      fetchBooks()
      fetchIssuedBooks()
      resetIssueForm()
    } catch (error) {
      console.error('Error issuing book:', error)
      showToast(error.message || 'Failed to issue book', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleReturnBook = async () => {
    if (!selectedIssue) return

    setLoading(true)
    try {
      // Update issue record
      const { error: updateError } = await supabase
        .from('book_issues')
        .update({
          return_date: returnForm.return_date,
          fine_amount: parseFloat(returnForm.fine_amount) || 0,
          fine_paid: returnForm.fine_paid,
          status: 'returned',
          remarks: returnForm.remarks
        })
        .eq('id', selectedIssue.id)
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)

      if (updateError) throw updateError

      // Update book available copies
      const book = books.find(b => b.id === selectedIssue.book_id)
      if (book) {
        const { error: bookError } = await supabase
          .from('books')
          .update({ available_copies: book.available_copies + 1 })
          .eq('id', selectedIssue.book_id)
          .eq('school_id', currentUser.school_id)

        if (bookError) throw bookError
      }

      showToast('Book returned successfully', 'success')
      fetchBooks()
      fetchIssuedBooks()
      setSelectedIssue(null)
      resetReturnForm()
    } catch (error) {
      console.error('Error returning book:', error)
      showToast(error.message || 'Failed to return book', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBook = (book) => {
    setBookToDelete(book)
    setShowDeleteModal(true)
  }

  const confirmDeleteBook = async () => {
    if (!bookToDelete) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookToDelete.id)
        .eq('school_id', currentUser.school_id)

      if (error) throw error
      showToast('Book deleted successfully', 'success')
      fetchBooks()
      setShowDeleteModal(false)
      setBookToDelete(null)
    } catch (error) {
      console.error('Error deleting book:', error)
      showToast(error.message || 'Failed to delete book', 'error')
    } finally {
      setLoading(false)
    }
  }

  const calculateFine = (dueDate) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = today - due
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 0) {
      return diffDays * 5 // Rs. 5 per day fine
    }
    return 0
  }

  const resetBookForm = () => {
    setCurrentBook({
      book_title: '',
      isbn: '',
      author: '',
      publisher: '',
      edition: '',
      publication_year: '',
      category: '',
      book_number: '',
      rack_number: '',
      price: '',
      total_copies: 1,
      available_copies: 1
    })
    setEditMode(false)
  }

  const resetIssueForm = () => {
    setIssueForm({
      book_id: '',
      borrower_type: 'student',
      borrower_id: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      remarks: ''
    })
    setStudentSearchTerm('')
    setStaffSearchTerm('')
    setShowStudentDropdown(false)
    setShowStaffDropdown(false)
  }

  const resetReturnForm = () => {
    setReturnForm({
      return_date: new Date().toISOString().split('T')[0],
      fine_amount: 0,
      fine_paid: false,
      remarks: ''
    })
  }

  const handleMarkFinePaid = async (issueId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('book_issues')
        .update({ fine_paid: true })
        .eq('id', issueId)
        .eq('school_id', currentUser.school_id)
        .eq('user_id', currentUser.id)

      if (error) throw error

      showToast('Fine marked as paid successfully', 'success')

      // Update the history records state
      setHistoryRecords(prevRecords =>
        prevRecords.map(record =>
          record.id === issueId
            ? { ...record, fine_paid: true }
            : record
        )
      )
    } catch (error) {
      console.error('Error marking fine as paid:', error)
      showToast(error.message || 'Failed to mark fine as paid', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredBooks = books.filter(book => {
    const matchesSearch = searchQuery ? (
      book.book_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.book_number?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true

    const matchesCategory = categoryFilter ? book.category === categoryFilter : true
    const matchesStatus = statusFilter ? book.status === statusFilter : true

    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = [...new Set(books.map(book => book.category).filter(Boolean))]

  return (
    <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 xl:p-6">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[10001] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-xl border animate-slideIn max-w-[90vw] sm:max-w-sm ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
            )}
            <span className="font-medium text-xs sm:text-sm flex-1">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-3 md:p-4 lg:p-6 mb-3 sm:mb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Library Management</h1>
          <div className="flex flex-wrap gap-1 sm:gap-2 md:gap-3">
            <button
              onClick={() => setActiveTab('books')}
              className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'books'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span>Books</span>
            </button>
            <button
              onClick={() => setActiveTab('issue')}
              className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'issue'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BookCopy className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Issue Book</span>
              <span className="sm:hidden">Issue</span>
            </button>
            <button
              onClick={() => setActiveTab('return')}
              className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'return'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Return Book</span>
              <span className="sm:hidden">Return</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span>Members</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <History className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Books Tab */}
        {activeTab === 'books' && (
          <div>
            {/* Filters and Add Button */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search books..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm"
                  />
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs sm:text-sm flex-1 sm:flex-none"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs sm:text-sm flex-1 sm:flex-none"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  resetBookForm()
                  setShowBookModal(true)
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Add Book</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>

            {/* Books Table */}
            <ResponsiveTableWrapper
              loading={loading}
              empty={filteredBooks.length === 0}
              emptyMessage="No books found"
              emptyIcon={<BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />}
              tableView={
                <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Book #</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Title</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden md:table-cell">Author</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden lg:table-cell">ISBN</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden sm:table-cell">Category</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden lg:table-cell">Rack</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden sm:table-cell">Total</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Avail.</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Status</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book, index) => (
                      <tr
                        key={book.id}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-blue-50 transition`}
                      >
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 font-medium whitespace-nowrap">{book.book_number}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 max-w-[120px] sm:max-w-none truncate">{book.book_title}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 hidden md:table-cell whitespace-nowrap">{book.author || 'N/A'}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 hidden lg:table-cell whitespace-nowrap">{book.isbn || 'N/A'}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 hidden sm:table-cell whitespace-nowrap">{book.category || 'N/A'}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 hidden lg:table-cell whitespace-nowrap">{book.rack_number || 'N/A'}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 hidden sm:table-cell whitespace-nowrap">{book.total_copies}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap">
                          <span className={`font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {book.available_copies}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap">
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold ${
                            book.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {book.status}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setCurrentBook(book)
                                setEditMode(true)
                                setShowBookModal(true)
                              }}
                              className="p-1 sm:p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBook(book)}
                              className="p-1 sm:p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
              cardView={
                <CardGrid>
                  {filteredBooks.map((book, index) => (
                    <DataCard key={book.id}>
                      <CardHeader
                        srNumber={index + 1}
                        name={book.book_title}
                        subtitle={`${book.book_number} • ${book.author || 'N/A'}`}
                        badge={
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            book.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {book.status}
                          </span>
                        }
                      />
                      <CardInfoGrid>
                        <CardRow label="ISBN" value={book.isbn || 'N/A'} />
                        <CardRow label="Category" value={book.category || 'N/A'} />
                        <CardRow label="Rack" value={book.rack_number || 'N/A'} />
                        <CardRow label="Publisher" value={book.publisher || 'N/A'} />
                        <CardRow label="Total Copies" value={book.total_copies} />
                        <CardRow
                          label="Available"
                          value={book.available_copies}
                          valueClassName={book.available_copies > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}
                        />
                      </CardInfoGrid>
                      <CardActions>
                        <button
                          onClick={() => {
                            setCurrentBook(book)
                            setEditMode(true)
                            setShowBookModal(true)
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white p-1 rounded transition"
                          title="Edit Book"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book)}
                          className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition"
                          title="Delete Book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </CardActions>
                    </DataCard>
                  ))}
                </CardGrid>
              }
            />
          </div>
        )}

        {/* Issue Book Tab */}
        {activeTab === 'issue' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Select Book <span className="text-red-500">*</span>
                </label>
                <select
                  value={issueForm.book_id}
                  onChange={(e) => setIssueForm({...issueForm, book_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                >
                  <option value="">Select Book</option>
                  {availableBooks.map(book => (
                    <option key={book.id} value={book.id}>
                      {book.book_number} - {book.book_title} (Available: {book.available_copies})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Borrower Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={issueForm.borrower_type}
                  onChange={(e) => {
                    setIssueForm({...issueForm, borrower_type: e.target.value, borrower_id: ''})
                    setStudentSearchTerm('')
                    setStaffSearchTerm('')
                    setShowStudentDropdown(false)
                    setShowStaffDropdown(false)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Select {issueForm.borrower_type === 'student' ? 'Student' : 'Staff'} <span className="text-red-500">*</span>
                </label>
                {issueForm.borrower_type === 'student' ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => {
                        setStudentSearchTerm(e.target.value)
                        setShowStudentDropdown(true)
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      placeholder="Search by name or admission number..."
                      className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                    />
                    {showStudentDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 sm:max-h-60 overflow-y-auto">
                        {students.filter(student => {
                          if (!studentSearchTerm.trim()) return true
                          const searchLower = studentSearchTerm.toLowerCase()
                          const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
                          const admissionNumber = student.admission_number?.toLowerCase() || ''
                          return fullName.includes(searchLower) || admissionNumber.includes(searchLower)
                        }).length > 0 ? (
                          students.filter(student => {
                            if (!studentSearchTerm.trim()) return true
                            const searchLower = studentSearchTerm.toLowerCase()
                            const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
                            const admissionNumber = student.admission_number?.toLowerCase() || ''
                            return fullName.includes(searchLower) || admissionNumber.includes(searchLower)
                          }).map(student => (
                            <div
                              key={student.id}
                              onClick={() => {
                                setIssueForm({...issueForm, borrower_id: student.id})
                                setStudentSearchTerm(`${student.first_name} ${student.last_name} - ${student.admission_number}`)
                                setShowStudentDropdown(false)
                              }}
                              className="px-2 sm:px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-xs sm:text-sm">{student.first_name} {student.last_name}</div>
                              <div className="text-xs text-gray-600">Admission No: {student.admission_number}</div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-3 sm:py-4 text-center text-gray-500 text-xs sm:text-sm">
                            No students found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={staffSearchTerm}
                      onChange={(e) => {
                        setStaffSearchTerm(e.target.value)
                        setShowStaffDropdown(true)
                      }}
                      onFocus={() => setShowStaffDropdown(true)}
                      placeholder="Search by name or computer number..."
                      className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                    />
                    {showStaffDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 sm:max-h-60 overflow-y-auto">
                        {staff.filter(staffMember => {
                          if (!staffSearchTerm.trim()) return true
                          const searchLower = staffSearchTerm.toLowerCase()
                          const fullName = `${staffMember.first_name} ${staffMember.last_name}`.toLowerCase()
                          const computerNo = staffMember.computer_no?.toLowerCase() || ''
                          const designation = staffMember.designation?.toLowerCase() || ''
                          return fullName.includes(searchLower) || computerNo.includes(searchLower) || designation.includes(searchLower)
                        }).length > 0 ? (
                          staff.filter(staffMember => {
                            if (!staffSearchTerm.trim()) return true
                            const searchLower = staffSearchTerm.toLowerCase()
                            const fullName = `${staffMember.first_name} ${staffMember.last_name}`.toLowerCase()
                            const computerNo = staffMember.computer_no?.toLowerCase() || ''
                            const designation = staffMember.designation?.toLowerCase() || ''
                            return fullName.includes(searchLower) || computerNo.includes(searchLower) || designation.includes(searchLower)
                          }).map(staffMember => (
                            <div
                              key={staffMember.id}
                              onClick={() => {
                                setIssueForm({...issueForm, borrower_id: staffMember.id})
                                setStaffSearchTerm(`${staffMember.first_name} ${staffMember.last_name} - ${staffMember.computer_no}`)
                                setShowStaffDropdown(false)
                              }}
                              className="px-2 sm:px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-xs sm:text-sm">{staffMember.first_name} {staffMember.last_name}</div>
                              <div className="text-xs text-gray-600">
                                Computer No: {staffMember.computer_no}
                                {staffMember.designation && ` • ${staffMember.designation}`}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-3 sm:py-4 text-center text-gray-500 text-xs sm:text-sm">
                            No staff found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueForm.issue_date}
                  onChange={(e) => setIssueForm({...issueForm, issue_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueForm.due_date}
                  onChange={(e) => setIssueForm({...issueForm, due_date: e.target.value})}
                  min={issueForm.issue_date}
                  className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Remarks</label>
                <textarea
                  value={issueForm.remarks}
                  onChange={(e) => setIssueForm({...issueForm, remarks: e.target.value})}
                  rows="1"
                  className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                  placeholder="Optional remarks"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleIssueBook}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 sm:px-5 md:px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium w-full sm:w-auto justify-center"
              >
                <BookCopy className="w-4 h-4 sm:w-5 sm:h-5" />
                {loading ? 'Issuing...' : 'Issue Book'}
              </button>
            </div>
          </div>
        )}

        {/* Return Book Tab */}
        {activeTab === 'return' && (
          <div>
            <ResponsiveTableWrapper
              loading={loading}
              empty={issuedBooks.length === 0}
              emptyMessage="No books currently issued"
              emptyIcon={<RotateCcw className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />}
              tableView={
                <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Book #</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Title</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden sm:table-cell">Borrower</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden md:table-cell">Issue Date</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Due Date</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden lg:table-cell">Days Late</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Status</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedBooks.map((issue, index) => {
                      const daysLate = Math.ceil((new Date() - new Date(issue.due_date)) / (1000 * 60 * 60 * 24))
                      const isOverdue = daysLate > 0

                      return (
                        <tr
                          key={issue.id}
                          className={`${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } hover:bg-blue-50 transition`}
                        >
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 font-medium whitespace-nowrap">{issue.books?.book_number}</td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 max-w-[100px] sm:max-w-none truncate">{issue.books?.book_title}</td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap hidden sm:table-cell">{issue.borrower_type}</td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap hidden md:table-cell">
                            {new Date(issue.issue_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap">
                            {new Date(issue.due_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap hidden lg:table-cell">
                            {isOverdue ? (
                              <span className="text-red-600 font-medium">{daysLate} days</span>
                            ) : (
                              <span className="text-green-600">-</span>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap">
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold ${
                              isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {isOverdue ? 'Overdue' : 'Issued'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200">
                            <button
                              onClick={() => {
                                setSelectedIssue(issue)
                                setReturnForm({
                                  ...returnForm,
                                  fine_amount: calculateFine(issue.due_date)
                                })
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1 rounded text-xs transition"
                            >
                              Return
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              }
              cardView={
                <CardGrid>
                  {issuedBooks.map((issue, index) => {
                    const daysLate = Math.ceil((new Date() - new Date(issue.due_date)) / (1000 * 60 * 60 * 24))
                    const isOverdue = daysLate > 0

                    return (
                      <DataCard key={issue.id}>
                        <CardHeader
                          srNumber={index + 1}
                          name={issue.books?.book_title}
                          subtitle={`${issue.books?.book_number} • ${issue.borrower_type}`}
                          badge={
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {isOverdue ? 'Overdue' : 'Issued'}
                            </span>
                          }
                        />
                        <CardInfoGrid>
                          <CardRow label="Issue Date" value={new Date(issue.issue_date).toLocaleDateString('en-GB')} />
                          <CardRow label="Due Date" value={new Date(issue.due_date).toLocaleDateString('en-GB')} />
                          <CardRow
                            label="Days Late"
                            value={isOverdue ? `${daysLate} days` : '-'}
                            valueClassName={isOverdue ? 'text-red-600 font-semibold' : 'text-green-600'}
                          />
                        </CardInfoGrid>
                        <CardActions>
                          <button
                            onClick={() => {
                              setSelectedIssue(issue)
                              setReturnForm({
                                ...returnForm,
                                fine_amount: calculateFine(issue.due_date)
                              })
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs transition w-full"
                          >
                            Return Book
                          </button>
                        </CardActions>
                      </DataCard>
                    )
                  })}
                </CardGrid>
              }
            />
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            <div className="flex justify-end mb-3 sm:mb-4">
              <button
                onClick={() => setShowMemberModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Member
              </button>
            </div>

            <ResponsiveTableWrapper
              loading={loading}
              empty={members.length === 0}
              emptyMessage="No library members found"
              emptyIcon={<Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />}
              tableView={
                <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Membership #</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Name</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden sm:table-cell">Type</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden md:table-cell">Join Date</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden lg:table-cell">Expiry Date</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, index) => {
                      const memberName = member.member_type === 'student'
                        ? `${member.students?.first_name || ''} ${member.students?.last_name || ''}`
                        : `${member.staff?.first_name || ''} ${member.staff?.last_name || ''}`

                      const memberId = member.member_type === 'student'
                        ? member.students?.admission_number
                        : member.staff?.computer_no

                      return (
                        <tr
                          key={member.id}
                          className={`${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } hover:bg-blue-50 transition`}
                        >
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 font-medium whitespace-nowrap">{member.membership_number}</td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200">
                            <div className="font-medium text-xs sm:text-sm">{memberName}</div>
                            <div className="text-xs text-gray-500">{memberId}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 capitalize whitespace-nowrap hidden sm:table-cell">{member.member_type}</td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap hidden md:table-cell">
                            {new Date(member.membership_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap hidden lg:table-cell">
                            {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-GB') : 'N/A'}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap">
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold ${
                              member.status === 'active' ? 'bg-green-100 text-green-700' :
                              member.status === 'suspended' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              }
              cardView={
                <CardGrid>
                  {members.map((member, index) => {
                    const memberName = member.member_type === 'student'
                      ? `${member.students?.first_name || ''} ${member.students?.last_name || ''}`
                      : `${member.staff?.first_name || ''} ${member.staff?.last_name || ''}`

                    const memberId = member.member_type === 'student'
                      ? member.students?.admission_number
                      : member.staff?.computer_no

                    return (
                      <DataCard key={member.id}>
                        <CardHeader
                          srNumber={index + 1}
                          name={memberName}
                          subtitle={`${member.membership_number} • ${member.member_type}`}
                          badge={
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              member.status === 'active' ? 'bg-green-100 text-green-800' :
                              member.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {member.status}
                            </span>
                          }
                        />
                        <CardInfoGrid>
                          <CardRow label="Member ID" value={memberId} />
                          <CardRow label="Type" value={member.member_type} />
                          <CardRow label="Join Date" value={new Date(member.membership_date).toLocaleDateString('en-GB')} />
                          <CardRow label="Expiry" value={member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-GB') : 'N/A'} />
                        </CardInfoGrid>
                      </DataCard>
                    )
                  })}
                </CardGrid>
              }
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {/* Filter buttons */}
            <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4 flex-wrap">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  historyFilter === 'all'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setHistoryFilter('issued')}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  historyFilter === 'issued'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Issued
              </button>
              <button
                onClick={() => setHistoryFilter('returned')}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  historyFilter === 'returned'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Returned
              </button>
              <button
                onClick={() => setHistoryFilter('paid')}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  historyFilter === 'paid'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Fine Paid
              </button>
              <button
                onClick={() => setHistoryFilter('unpaid')}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  historyFilter === 'unpaid'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Unpaid
              </button>
            </div>

            {/* History Table */}
            {(() => {
              const filteredHistoryRecords = historyRecords.filter(record => {
                if (historyFilter === 'all') return true
                if (historyFilter === 'issued') return record.status === 'issued' || record.status === 'overdue'
                if (historyFilter === 'returned') return record.status === 'returned'
                if (historyFilter === 'paid') return record.fine_paid === true && record.fine_amount > 0
                if (historyFilter === 'unpaid') return record.fine_paid === false && record.fine_amount > 0
                return true
              })

              return (
                <ResponsiveTableWrapper
                  loading={loading}
                  empty={filteredHistoryRecords.length === 0}
                  emptyMessage="No library history found"
                  emptyIcon={<FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />}
                  tableView={
                    <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
                      <thead>
                        <tr className="bg-blue-900 text-white">
                          <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Book</th>
                          <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden sm:table-cell">Borrower</th>
                          <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden md:table-cell">Type</th>
                          <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden lg:table-cell">Issue Date</th>
                          <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Due Date</th>
                          <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden md:table-cell">Return Date</th>
                          <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap hidden sm:table-cell">Fine</th>
                          <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-semibold border border-blue-800 whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistoryRecords.map((record, index) => {
                          const borrowerName = record.borrower_type === 'student'
                            ? `${record.students?.first_name || ''} ${record.students?.last_name || ''}`
                            : `${record.staff?.first_name || ''} ${record.staff?.last_name || ''}`

                          const borrowerId = record.borrower_type === 'student'
                            ? record.students?.admission_number
                            : record.staff?.computer_no

                          return (
                            <tr
                              key={record.id}
                              className={`${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              } hover:bg-blue-50 transition`}
                            >
                              <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200">
                                <div className="font-medium text-xs sm:text-sm max-w-[100px] sm:max-w-none truncate">{record.books?.book_title}</div>
                                <div className="text-xs text-gray-500">{record.books?.book_number}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 hidden sm:table-cell">
                                <div className="font-medium text-xs sm:text-sm">{borrowerName}</div>
                                <div className="text-xs text-gray-500">{borrowerId}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 hidden md:table-cell">
                                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  record.borrower_type === 'student'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {record.borrower_type}
                                </span>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap hidden lg:table-cell">
                                {new Date(record.issue_date).toLocaleDateString('en-GB')}
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap">
                                {new Date(record.due_date).toLocaleDateString('en-GB')}
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap hidden md:table-cell">
                                {record.return_date ? new Date(record.return_date).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 hidden sm:table-cell">
                                {record.fine_amount > 0 ? (
                                  <div>
                                    <div className="font-medium text-xs sm:text-sm">Rs. {record.fine_amount}</div>
                                    <div className="flex items-center gap-1 sm:gap-2 mt-1">
                                      <div className={`text-xs ${record.fine_paid ? 'text-green-600' : 'text-red-600'}`}>
                                        {record.fine_paid ? 'Paid' : 'Unpaid'}
                                      </div>
                                      {!record.fine_paid && (
                                        <button
                                          onClick={() => handleMarkFinePaid(record.id)}
                                          disabled={loading}
                                          className="px-1.5 sm:px-2 py-0.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                                        >
                                          Pay
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-200 whitespace-nowrap">
                                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  record.status === 'returned' ? 'bg-green-100 text-green-700' :
                                  record.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  }
                  cardView={
                    <CardGrid>
                      {filteredHistoryRecords.map((record, index) => {
                        const borrowerName = record.borrower_type === 'student'
                          ? `${record.students?.first_name || ''} ${record.students?.last_name || ''}`
                          : `${record.staff?.first_name || ''} ${record.staff?.last_name || ''}`

                        const borrowerId = record.borrower_type === 'student'
                          ? record.students?.admission_number
                          : record.staff?.computer_no

                        return (
                          <DataCard key={record.id}>
                            <CardHeader
                              srNumber={index + 1}
                              name={record.books?.book_title}
                              subtitle={`${record.books?.book_number} • ${borrowerName}`}
                              badge={
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  record.status === 'returned' ? 'bg-green-100 text-green-800' :
                                  record.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {record.status}
                                </span>
                              }
                            />
                            <CardInfoGrid>
                              <CardRow label="Borrower" value={borrowerName} />
                              <CardRow label="Type" value={record.borrower_type} />
                              <CardRow label="Issue Date" value={new Date(record.issue_date).toLocaleDateString('en-GB')} />
                              <CardRow label="Due Date" value={new Date(record.due_date).toLocaleDateString('en-GB')} />
                              <CardRow label="Return Date" value={record.return_date ? new Date(record.return_date).toLocaleDateString('en-GB') : '-'} />
                              {record.fine_amount > 0 && (
                                <CardRow
                                  label="Fine"
                                  value={`Rs. ${record.fine_amount} (${record.fine_paid ? 'Paid' : 'Unpaid'})`}
                                  valueClassName={record.fine_paid ? 'text-green-600' : 'text-red-600'}
                                />
                              )}
                            </CardInfoGrid>
                            {record.fine_amount > 0 && !record.fine_paid && (
                              <CardActions>
                                <button
                                  onClick={() => handleMarkFinePaid(record.id)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs transition w-full disabled:opacity-50"
                                >
                                  Mark Fine as Paid
                                </button>
                              </CardActions>
                            )}
                          </DataCard>
                        )
                      })}
                    </CardGrid>
                  }
                />
              )
            })()}
          </div>
        )}
      </div>

      {/* Add/Edit Book Modal */}
      {showBookModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowBookModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-[95%] sm:max-w-md md:max-w-lg xl:max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                    {editMode ? 'Edit Book' : 'Add New Book'}
                  </h2>
                  <button
                    onClick={() => setShowBookModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Book Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentBook.book_title}
                      onChange={(e) => setCurrentBook({...currentBook, book_title: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                      placeholder="Enter book title"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Book Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentBook.book_number}
                      onChange={(e) => setCurrentBook({...currentBook, book_number: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                      placeholder="Enter book number"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">ISBN</label>
                    <input
                      type="text"
                      value={currentBook.isbn}
                      onChange={(e) => setCurrentBook({...currentBook, isbn: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                      placeholder="Enter ISBN"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Author</label>
                    <input
                      type="text"
                      value={currentBook.author}
                      onChange={(e) => setCurrentBook({...currentBook, author: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                      placeholder="Enter author name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Publisher</label>
                    <input
                      type="text"
                      value={currentBook.publisher}
                      onChange={(e) => setCurrentBook({...currentBook, publisher: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm"
                      placeholder="Enter publisher"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Edition</label>
                    <input
                      type="text"
                      value={currentBook.edition}
                      onChange={(e) => setCurrentBook({...currentBook, edition: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter edition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Publication Year</label>
                    <input
                      type="number"
                      value={currentBook.publication_year}
                      onChange={(e) => setCurrentBook({...currentBook, publication_year: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter year"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <input
                      type="text"
                      value={currentBook.category}
                      onChange={(e) => setCurrentBook({...currentBook, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g., Fiction, Science, History"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rack Number</label>
                    <input
                      type="text"
                      value={currentBook.rack_number}
                      onChange={(e) => setCurrentBook({...currentBook, rack_number: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter rack number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentBook.price}
                      onChange={(e) => setCurrentBook({...currentBook, price: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter price"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Copies</label>
                    <input
                      type="number"
                      value={currentBook.total_copies}
                      onChange={(e) => setCurrentBook({...currentBook, total_copies: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter total copies"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Available Copies</label>
                    <input
                      type="number"
                      value={currentBook.available_copies}
                      onChange={(e) => setCurrentBook({...currentBook, available_copies: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter available copies"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowBookModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBook}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : (editMode ? 'Update Book' : 'Add Book')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Return Book Modal */}
      {selectedIssue && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setSelectedIssue(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Return Book</h2>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Book:</span> {selectedIssue.books?.book_title}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-semibold">Due Date:</span> {new Date(selectedIssue.due_date).toLocaleDateString('en-GB')}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Return Date</label>
                    <input
                      type="date"
                      value={returnForm.return_date}
                      onChange={(e) => setReturnForm({...returnForm, return_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fine Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={returnForm.fine_amount}
                      onChange={(e) => setReturnForm({...returnForm, fine_amount: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Calculated: Rs. {calculateFine(selectedIssue.due_date)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="fine_paid"
                      checked={returnForm.fine_paid}
                      onChange={(e) => setReturnForm({...returnForm, fine_paid: e.target.checked})}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <label htmlFor="fine_paid" className="text-sm font-medium text-gray-700">
                      Fine Paid
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                    <textarea
                      value={returnForm.remarks}
                      onChange={(e) => setReturnForm({...returnForm, remarks: e.target.value})}
                      rows="2"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Optional remarks"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReturnBook}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {loading ? 'Processing...' : 'Return Book'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowMemberModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Add Library Member</h2>
                  <button
                    onClick={() => setShowMemberModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Member Type</label>
                    <select
                      value={memberForm.member_type}
                      onChange={(e) => setMemberForm({...memberForm, member_type: e.target.value, member_id: ''})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="student">Student</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select {memberForm.member_type === 'student' ? 'Student' : 'Staff'}
                    </label>
                    <select
                      value={memberForm.member_id}
                      onChange={(e) => setMemberForm({...memberForm, member_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select {memberForm.member_type}</option>
                      {memberForm.member_type === 'student' ? (
                        students.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.admission_number} - {student.first_name} {student.last_name}
                          </option>
                        ))
                      ) : (
                        staff.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.computer_no} - {s.first_name} {s.last_name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Membership Number</label>
                    <input
                      type="text"
                      value={memberForm.membership_number}
                      onChange={(e) => setMemberForm({...memberForm, membership_number: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter membership number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Membership Date</label>
                    <input
                      type="date"
                      value={memberForm.membership_date}
                      onChange={(e) => setMemberForm({...memberForm, membership_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                    <input
                      type="date"
                      value={memberForm.expiry_date}
                      onChange={(e) => setMemberForm({...memberForm, expiry_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowMemberModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!memberForm.member_id || !memberForm.membership_number) {
                        showToast('Please fill in all required fields', 'error')
                        return
                      }

                      setLoading(true)
                      try {
                        const { error } = await supabase
                          .from('library_members')
                          .insert([{
                            ...memberForm,
                            school_id: currentUser.school_id,
                            user_id: currentUser.id,
                            created_by: currentUser.id
                          }])

                        if (error) throw error
                        showToast('Member added successfully', 'success')
                        fetchMembers()
                        setShowMemberModal(false)
                        setMemberForm({
                          member_type: 'student',
                          member_id: '',
                          membership_number: '',
                          membership_date: new Date().toISOString().split('T')[0],
                          expiry_date: '',
                          status: 'active'
                        })
                      } catch (error) {
                        console.error('Error adding member:', error)
                        showToast(error.message || 'Failed to add member', 'error')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Add Member'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && bookToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={() => setShowDeleteModal(false)}
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Confirm Delete</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete this book?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="font-semibold text-gray-800">{bookToDelete.book_title}</p>
                  <p className="text-sm text-gray-600">Book #: {bookToDelete.book_number}</p>
                </div>
                <p className="text-sm text-red-600">This action cannot be undone.</p>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition border border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteBook}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default function LibraryPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = getUserFromCookie()
    setCurrentUser(user)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="library_view"
      pageName="Library"
    >
      <LibraryPageContent />
    </PermissionGuard>
  )
}
