import { supabase } from './supabase'

/**
 * Get user permissions from staff_permissions table
 * @param {string} userId - The user's ID
 * @param {string} schoolId - The school's ID
 * @returns {Promise<Object>} The permissions object
 */
export async function getUserPermissions(userId, schoolId) {
  try {
    const { data, error } = await supabase
      .from('staff_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .single()

    if (error) {
      console.error('Error fetching permissions:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserPermissions:', error)
    return null
  }
}

/**
 * Check if user has a specific permission
 * @param {Object} permissions - The permissions object
 * @param {string} permissionKey - The permission key to check (e.g., 'dashboard_view_stats')
 * @returns {boolean} Whether the user has the permission
 */
export function hasPermission(permissions, permissionKey) {
  if (!permissions) return false
  return permissions[permissionKey] === true
}

/**
 * Check if user has permission to view Dashboard
 * @param {Object} permissions - The permissions object
 * @returns {boolean}
 */
export function canViewDashboard(permissions) {
  return hasPermission(permissions, 'dashboard_view')
}

/**
 * Check if user has permission to view Students
 * @param {Object} permissions - The permissions object
 * @returns {boolean}
 */
export function canViewStudents(permissions) {
  return hasPermission(permissions, 'students_view')
}

/**
 * Check if user has permission to add Students
 * @param {Object} permissions - The permissions object
 * @returns {boolean}
 */
export function canAddStudents(permissions) {
  return hasPermission(permissions, 'students_add')
}

/**
 * Check if user has permission to edit Students
 * @param {Object} permissions - The permissions object
 * @returns {boolean}
 */
export function canEditStudents(permissions) {
  return hasPermission(permissions, 'students_edit')
}

/**
 * Check if user has permission to delete Students
 * @param {Object} permissions - The permissions object
 * @returns {boolean}
 */
export function canDeleteStudents(permissions) {
  return hasPermission(permissions, 'students_delete')
}

// Fee Management Permissions
export function canViewFeeSetup(permissions) {
  return hasPermission(permissions, 'fee_setup_view')
}

export function canViewFeeGenerate(permissions) {
  return hasPermission(permissions, 'fee_generate_view')
}

export function canViewLateFee(permissions) {
  return hasPermission(permissions, 'fee_late_fee_view')
}

export function canViewFeeReports(permissions) {
  return hasPermission(permissions, 'fee_reports_view')
}

export function canViewAdmissionFee(permissions) {
  return hasPermission(permissions, 'fee_admission_fee_view')
}

export function canViewFeeCreate(permissions) {
  return hasPermission(permissions, 'fee_create_view')
}

export function canViewFeeChallans(permissions) {
  return hasPermission(permissions, 'fee_challans_view')
}

export function canViewFeeCollect(permissions) {
  return hasPermission(permissions, 'fee_collect_view')
}

// Transport Management Permissions
export function canViewTransportVehicles(permissions) {
  return hasPermission(permissions, 'transport_vehicles_view')
}

export function canViewTransportRoutes(permissions) {
  return hasPermission(permissions, 'transport_routes_view')
}

export function canViewTransportPassengers(permissions) {
  return hasPermission(permissions, 'transport_passengers_view')
}

// Exam Management Permissions
export function canViewExamMarks(permissions) {
  return hasPermission(permissions, 'exam_marks_view')
}

export function canViewExamReports(permissions) {
  return hasPermission(permissions, 'exam_reports_view')
}

// Payroll Management Permissions
export function canViewPayrollExpenses(permissions) {
  return hasPermission(permissions, 'payroll_expenses_view')
}

export function canViewPayrollPay(permissions) {
  return hasPermission(permissions, 'payroll_pay_view')
}

export function canViewPayrollSlips(permissions) {
  return hasPermission(permissions, 'payroll_slips_view')
}

export function canViewPayrollReports(permissions) {
  return hasPermission(permissions, 'payroll_reports_view')
}

export function canViewSalaryRegister(permissions) {
  return hasPermission(permissions, 'payroll_salary_register_view')
}

export function canViewSalaryPaid(permissions) {
  return hasPermission(permissions, 'payroll_salary_paid_view')
}

// Other Pages Permissions
export function canViewDebug(permissions) {
  return hasPermission(permissions, 'debug_view')
}

export function canViewLibrary(permissions) {
  return hasPermission(permissions, 'library_view')
}

export function canViewReports(permissions) {
  return hasPermission(permissions, 'reports_view')
}

// Timetable Permissions
export function canViewTimetable(permissions) {
  return hasPermission(permissions, 'timetable_timetable_view')
}

export function canAddTimetable(permissions) {
  return hasPermission(permissions, 'timetable_timetable_add')
}

export function canEditTimetable(permissions) {
  return hasPermission(permissions, 'timetable_timetable_edit')
}

export function canDeleteTimetable(permissions) {
  return hasPermission(permissions, 'timetable_timetable_delete')
}

// Date Sheet Permissions
export function canViewDateSheet(permissions) {
  return hasPermission(permissions, 'timetable_datesheet_view')
}

export function canAddDateSheet(permissions) {
  return hasPermission(permissions, 'timetable_datesheet_add')
}

export function canEditDateSheet(permissions) {
  return hasPermission(permissions, 'timetable_datesheet_edit')
}

export function canDeleteDateSheet(permissions) {
  return hasPermission(permissions, 'timetable_datesheet_delete')
}

// Settings Permissions
export function canViewBasicSettings(permissions) {
  return hasPermission(permissions, 'settings_basic_view')
}

export function canEditBasicSettings(permissions) {
  return hasPermission(permissions, 'settings_basic_edit')
}

export function canViewPdfSettings(permissions) {
  return hasPermission(permissions, 'settings_pdf_view')
}

export function canEditPdfSettings(permissions) {
  return hasPermission(permissions, 'settings_pdf_edit')
}

export function canViewManageAccess(permissions) {
  return hasPermission(permissions, 'settings_manage_access_view') || hasPermission(permissions, 'settings_access_view')
}

export function canManageAccess(permissions) {
  return hasPermission(permissions, 'settings_access_manage')
}
