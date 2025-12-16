'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  BookOpen, Plus, Edit, Trash2, X, Save, Search,
  Users, BookCopy, RotateCcw, AlertCircle, CheckCircle,
  XCircle, Calendar, DollarSign, Filter, FileText, Eye
} from 'lucide-react'

export default function LibraryPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('books') // books, issue, return, members, reports
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

  // Return Book States
  const [issuedBooks, setIssuedBooks] = useState([])
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [returnForm, setReturnForm] = useState({
    return_date: new Date().toISOString().split('T')[0],
    fine_amount: 0,
    fine_paid: false,
    remarks: ''
  })

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

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

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

  // Apply blur effect to sidebar when modals are open
  useEffect(() => {
    if (showBookModal || showMemberModal || selectedIssue) {
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
  }, [showBookModal, showMemberModal, selectedIssue])

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

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('school_id', currentUser.school_id)
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
      const { data, error } = await supabase
        .from('students')
        .select('id, admission_number, first_name, last_name, roll_number, current_class_id, classes(class_name)')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('first_name')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, employee_id, first_name, last_name, designation')
        .eq('school_id', currentUser.school_id)
        .eq('status', 'active')
        .order('first_name')

      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('library_members')
        .select('*')
        .eq('school_id', currentUser.school_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMembers(data || [])
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
        .in('status', ['issued', 'overdue'])
        .order('issue_date', { ascending: false })

      if (error) throw error
      setIssuedBooks(data || [])
    } catch (error) {
      console.error('Error fetching issued books:', error)
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

      if (updateError) throw updateError

      // Update book available copies
      const book = books.find(b => b.id === selectedIssue.book_id)
      if (book) {
        const { error: bookError } = await supabase
          .from('books')
          .update({ available_copies: book.available_copies + 1 })
          .eq('id', selectedIssue.book_id)

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

  const handleDeleteBook = async (bookId) => {
    if (!confirm('Are you sure you want to delete this book?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId)

      if (error) throw error
      showToast('Book deleted successfully', 'success')
      fetchBooks()
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
      return diffDays * 5 // $5 per day fine
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
  }

  const resetReturnForm = () => {
    setReturnForm({
      return_date: new Date().toISOString().split('T')[0],
      fine_amount: 0,
      fine_paid: false,
      remarks: ''
    })
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
    <div className="p-1">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            } text-white min-w-[300px]`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="hover:bg-white/20 p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Library Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('books')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'books'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Books
            </button>
            <button
              onClick={() => setActiveTab('issue')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'issue'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BookCopy className="w-4 h-4" />
              Issue Book
            </button>
            <button
              onClick={() => setActiveTab('return')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'return'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Return Book
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Members
            </button>
          </div>
        </div>

        {/* Books Tab */}
        {activeTab === 'books' && (
          <div>
            {/* Filters and Add Button */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search books by title, author, or book number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button
                onClick={() => {
                  resetBookForm()
                  setShowBookModal(true)
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Book
              </button>
            </div>

            {/* Books Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Book #</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Title</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Author</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">ISBN</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Category</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Rack</th>
                      <th className="px-3 py-2 text-center text-sm font-semibold">Total</th>
                      <th className="px-3 py-2 text-center text-sm font-semibold">Available</th>
                      <th className="px-3 py-2 text-center text-sm font-semibold">Status</th>
                      <th className="px-3 py-2 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book, index) => (
                      <tr key={book.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-medium">{book.book_number}</td>
                        <td className="px-3 py-2 text-sm">{book.book_title}</td>
                        <td className="px-3 py-2 text-sm">{book.author || 'N/A'}</td>
                        <td className="px-3 py-2 text-sm">{book.isbn || 'N/A'}</td>
                        <td className="px-3 py-2 text-sm">{book.category || 'N/A'}</td>
                        <td className="px-3 py-2 text-sm">{book.rack_number || 'N/A'}</td>
                        <td className="px-3 py-2 text-sm text-center">{book.total_copies}</td>
                        <td className="px-3 py-2 text-sm text-center">
                          <span className={`font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {book.available_copies}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            book.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {book.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setCurrentBook(book)
                                setEditMode(true)
                                setShowBookModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBook(book.id)}
                              className="text-red-600 hover:text-red-800"
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

            {filteredBooks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No books found</p>
              </div>
            )}
          </div>
        )}

        {/* Issue Book Tab */}
        {activeTab === 'issue' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Book <span className="text-red-500">*</span>
                </label>
                <select
                  value={issueForm.book_id}
                  onChange={(e) => setIssueForm({...issueForm, book_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Borrower Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={issueForm.borrower_type}
                  onChange={(e) => setIssueForm({...issueForm, borrower_type: e.target.value, borrower_id: ''})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select {issueForm.borrower_type === 'student' ? 'Student' : 'Staff'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={issueForm.borrower_id}
                  onChange={(e) => setIssueForm({...issueForm, borrower_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select {issueForm.borrower_type === 'student' ? 'Student' : 'Staff'}</option>
                  {issueForm.borrower_type === 'student' ? (
                    students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.admission_number} - {student.first_name} {student.last_name} ({student.classes?.class_name})
                      </option>
                    ))
                  ) : (
                    staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.employee_id} - {s.first_name} {s.last_name} ({s.designation})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueForm.issue_date}
                  onChange={(e) => setIssueForm({...issueForm, issue_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueForm.due_date}
                  onChange={(e) => setIssueForm({...issueForm, due_date: e.target.value})}
                  min={issueForm.issue_date}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={issueForm.remarks}
                  onChange={(e) => setIssueForm({...issueForm, remarks: e.target.value})}
                  rows="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Optional remarks"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleIssueBook}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
              >
                <BookCopy className="w-4 h-4" />
                {loading ? 'Issuing...' : 'Issue Book'}
              </button>
            </div>
          </div>
        )}

        {/* Return Book Tab */}
        {activeTab === 'return' && (
          <div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Book #</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Title</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Borrower</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Issue Date</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Due Date</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Days Late</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Status</th>
                      <th className="px-3 py-2 text-center text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedBooks.map(issue => {
                      const daysLate = Math.ceil((new Date() - new Date(issue.due_date)) / (1000 * 60 * 60 * 24))
                      const isOverdue = daysLate > 0

                      return (
                        <tr key={issue.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium">{issue.books?.book_number}</td>
                          <td className="px-3 py-2 text-sm">{issue.books?.book_title}</td>
                          <td className="px-3 py-2 text-sm">{issue.borrower_type}</td>
                          <td className="px-3 py-2 text-sm">
                            {new Date(issue.issue_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {new Date(issue.due_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {isOverdue ? (
                              <span className="text-red-600 font-medium">{daysLate} days</span>
                            ) : (
                              <span className="text-green-600">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {isOverdue ? 'Overdue' : 'Issued'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-center">
                            <button
                              onClick={() => {
                                setSelectedIssue(issue)
                                setReturnForm({
                                  ...returnForm,
                                  fine_amount: calculateFine(issue.due_date)
                                })
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                            >
                              Return
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {issuedBooks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <RotateCcw className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No books currently issued</p>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowMemberModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Membership #</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Type</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Member ID</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Join Date</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold">Expiry Date</th>
                      <th className="px-3 py-2 text-center text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-medium">{member.membership_number}</td>
                        <td className="px-3 py-2 text-sm capitalize">{member.member_type}</td>
                        <td className="px-3 py-2 text-sm">{member.member_id}</td>
                        <td className="px-3 py-2 text-sm">
                          {new Date(member.membership_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.status === 'active' ? 'bg-green-100 text-green-800' :
                            member.status === 'suspended' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {members.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No library members found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Book Modal */}
      {showBookModal && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowBookModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editMode ? 'Edit Book' : 'Add New Book'}
                  </h2>
                  <button
                    onClick={() => setShowBookModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Book Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentBook.book_title}
                      onChange={(e) => setCurrentBook({...currentBook, book_title: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter book title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Book Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentBook.book_number}
                      onChange={(e) => setCurrentBook({...currentBook, book_number: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter book number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ISBN</label>
                    <input
                      type="text"
                      value={currentBook.isbn}
                      onChange={(e) => setCurrentBook({...currentBook, isbn: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter ISBN"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                    <input
                      type="text"
                      value={currentBook.author}
                      onChange={(e) => setCurrentBook({...currentBook, author: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter author name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Publisher</label>
                    <input
                      type="text"
                      value={currentBook.publisher}
                      onChange={(e) => setCurrentBook({...currentBook, publisher: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="p-6">
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
                    <p className="text-xs text-gray-500 mt-1">Calculated: ${calculateFine(selectedIssue.due_date)}</p>
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
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
              <div className="p-6">
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
                            {s.employee_id} - {s.first_name} {s.last_name}
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
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
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
    </div>
  )
}
