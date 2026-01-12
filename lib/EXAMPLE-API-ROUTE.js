/**
 * EXAMPLE API ROUTE - Students
 *
 * This file shows how to use the multi-user database helpers
 * in your Next.js API routes
 *
 * Copy this pattern to all your API routes
 *
 * File: app/api/students/route.js
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  queryWithUser,
  queryOneWithUser,
  insertWithUser,
  updateWithUser,
  deleteWithUser,
  findByIdWithUser,
  transactionWithUser
} from '@/lib/db-multi-user';

// Helper to get authenticated user
async function getAuthenticatedUser() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return null;
  }

  return session.user;
}

// Helper to create error response
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Helper to create success response
function successResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * GET /api/students
 * Get all students for the current user
 */
export async function GET(request) {
  try {
    // 1. Check authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search');

    // 3. Build query based on filters
    let query = 'SELECT * FROM students WHERE status = $1';
    let params = [status];

    if (classId) {
      query += ' AND class_id = $2';
      params.push(classId);
    }

    if (search) {
      query += ` AND (name ILIKE $${params.length + 1} OR admission_no ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    // 4. Execute query with user context
    const students = await queryWithUser(user.id, query, params);

    // 5. Return response
    return successResponse({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('GET /api/students error:', error);
    return errorResponse('Failed to fetch students', 500);
  }
}

/**
 * POST /api/students
 * Create a new student
 */
export async function POST(request) {
  try {
    // 1. Check authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // 2. Parse request body
    const body = await request.json();

    // 3. Validate required fields
    if (!body.name || !body.admission_no || !body.class_id) {
      return errorResponse('Missing required fields: name, admission_no, class_id');
    }

    // 4. Check if admission number already exists
    const existingStudent = await queryOneWithUser(
      user.id,
      'SELECT id FROM students WHERE admission_no = $1',
      [body.admission_no]
    );

    if (existingStudent) {
      return errorResponse('Admission number already exists');
    }

    // 5. Prepare student data
    const studentData = {
      school_id: user.schoolId, // From user's session
      name: body.name,
      admission_no: body.admission_no,
      class_id: body.class_id,
      section_id: body.section_id || null,
      session_id: body.session_id || null,
      father_name: body.father_name || null,
      father_mobile: body.father_mobile || null,
      mother_name: body.mother_name || null,
      mother_mobile: body.mother_mobile || null,
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || null,
      blood_group: body.blood_group || null,
      address: body.address || null,
      status: 'active',
      // user_id will be set automatically by the trigger
    };

    // 6. Insert student
    const student = await insertWithUser(user.id, 'students', studentData);

    // 7. Return success response
    return successResponse({
      success: true,
      message: 'Student created successfully',
      data: student
    }, 201);

  } catch (error) {
    console.error('POST /api/students error:', error);
    return errorResponse('Failed to create student', 500);
  }
}

/**
 * PUT /api/students/[id]
 * Update a student
 *
 * File: app/api/students/[id]/route.js
 */
export async function PUT(request, { params }) {
  try {
    // 1. Check authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // 2. Get student ID from URL
    const studentId = params.id;

    // 3. Check if student exists and user has access
    const existingStudent = await findByIdWithUser(user.id, 'students', studentId);

    if (!existingStudent) {
      return errorResponse('Student not found or access denied', 404);
    }

    // 4. Parse request body
    const body = await request.json();

    // 5. Check if admission number is being changed and if it's unique
    if (body.admission_no && body.admission_no !== existingStudent.admission_no) {
      const duplicate = await queryOneWithUser(
        user.id,
        'SELECT id FROM students WHERE admission_no = $1 AND id != $2',
        [body.admission_no, studentId]
      );

      if (duplicate) {
        return errorResponse('Admission number already exists');
      }
    }

    // 6. Prepare update data (only include fields that are provided)
    const updateData = {};
    const allowedFields = [
      'name', 'admission_no', 'class_id', 'section_id', 'session_id',
      'father_name', 'father_mobile', 'mother_name', 'mother_mobile',
      'date_of_birth', 'gender', 'blood_group', 'address', 'status'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // 7. Update student
    const updatedStudent = await updateWithUser(
      user.id,
      'students',
      studentId,
      updateData
    );

    // 8. Return success response
    return successResponse({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });

  } catch (error) {
    console.error('PUT /api/students/[id] error:', error);
    return errorResponse('Failed to update student', 500);
  }
}

/**
 * DELETE /api/students/[id]
 * Delete a student
 *
 * File: app/api/students/[id]/route.js
 */
export async function DELETE(request, { params }) {
  try {
    // 1. Check authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // 2. Get student ID from URL
    const studentId = params.id;

    // 3. Delete student (RLS ensures user can only delete their own students)
    const deleted = await deleteWithUser(user.id, 'students', studentId);

    if (!deleted) {
      return errorResponse('Student not found or access denied', 404);
    }

    // 4. Return success response
    return successResponse({
      success: true,
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/students/[id] error:', error);
    return errorResponse('Failed to delete student', 500);
  }
}

/**
 * ADVANCED EXAMPLE: Transaction with multiple operations
 *
 * POST /api/students/admit
 * Admit a student (create student + admission history + fee enrollment)
 */
export async function POST_ADMIT(request) {
  try {
    // 1. Check authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // 2. Parse request body
    const body = await request.json();

    // 3. Use transaction to ensure all operations succeed or all fail
    const result = await transactionWithUser(user.id, async (client) => {
      // Step 1: Create student
      const studentResult = await client.query(
        `INSERT INTO students (
          school_id, name, admission_no, class_id, section_id,
          father_name, father_mobile, date_of_birth, gender, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          user.schoolId,
          body.name,
          body.admission_no,
          body.class_id,
          body.section_id,
          body.father_name,
          body.father_mobile,
          body.date_of_birth,
          body.gender,
          'active'
        ]
      );

      const student = studentResult.rows[0];

      // Step 2: Create admission history
      await client.query(
        `INSERT INTO student_admissions_history (
          school_id, student_id, class_id, section_id, session_id,
          admission_date, admission_fee, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.schoolId,
          student.id,
          body.class_id,
          body.section_id,
          body.session_id,
          new Date(),
          body.admission_fee || 0,
          'active'
        ]
      );

      // Step 3: Enroll in fee structure
      if (body.fee_structure_id) {
        await client.query(
          `INSERT INTO fee_enrollments (
            school_id, student_id, fee_structure_id, session_id, status
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            user.schoolId,
            student.id,
            body.fee_structure_id,
            body.session_id,
            'active'
          ]
        );
      }

      return student;
    });

    // 4. Return success response
    return successResponse({
      success: true,
      message: 'Student admitted successfully',
      data: result
    }, 201);

  } catch (error) {
    console.error('POST /api/students/admit error:', error);
    return errorResponse('Failed to admit student', 500);
  }
}

/**
 * EXAMPLE: Complex query with joins
 *
 * GET /api/students/with-class-info
 */
export async function GET_WITH_CLASS_INFO(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const students = await queryWithUser(
      user.id,
      `SELECT
        s.*,
        c.class_name,
        sec.section_name,
        sess.session_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN sessions sess ON s.session_id = sess.id
      WHERE s.status = $1
      ORDER BY s.created_at DESC`,
      ['active']
    );

    return successResponse({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('GET /api/students/with-class-info error:', error);
    return errorResponse('Failed to fetch students', 500);
  }
}

/**
 * PATTERN SUMMARY:
 *
 * 1. Always check authentication first
 * 2. Get user from session (server-side)
 * 3. Use helper functions from db-multi-user.js
 * 4. Pass user.id as first parameter
 * 5. Handle errors appropriately
 * 6. Return consistent response format
 *
 * SECURITY NOTES:
 *
 * ✅ User ID comes from session (secure)
 * ✅ RLS automatically filters by user_id
 * ✅ No way to access other users' data
 * ✅ Database enforces security policies
 *
 * COMMON MISTAKES TO AVOID:
 *
 * ❌ Don't take user_id from request body
 * ❌ Don't use pool.query() directly
 * ❌ Don't skip authentication check
 * ❌ Don't trust client-side data for authorization
 */
