-- Create active sessions for each school (multi-user system)

-- Step 1: Check current users and schools
SELECT
    u.id as user_id,
    u.email,
    u.school_id,
    s.name as school_name
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
ORDER BY u.created_at;

-- Step 2: Check existing sessions
SELECT
    sess.id,
    sess.name as session_name,
    sess.start_date,
    sess.end_date,
    sess.status,
    sess.is_current,
    sess.school_id,
    sess.user_id,
    s.name as school_name
FROM sessions sess
LEFT JOIN schools s ON sess.school_id = s.id
ORDER BY sess.created_at DESC;

-- Step 3: Create an active session for EACH school that doesn't have one
INSERT INTO sessions (school_id, user_id, name, start_date, end_date, status, is_current, created_by, created_at)
SELECT
    u.school_id,
    u.id as user_id,
    '2025-2026' as name,
    '2025-11-28'::date as start_date,
    '2026-06-29'::date as end_date,
    'active' as status,
    true as is_current,
    u.id as created_by,
    NOW() as created_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.school_id = u.school_id
    AND s.status = 'active'
)
GROUP BY u.school_id, u.id;

-- Step 4: Verify - Each school should have an active session
SELECT
    s.name as school_name,
    s.id as school_id,
    u.email as user_email,
    sess.id as session_id,
    sess.name as session_name,
    sess.start_date,
    sess.end_date,
    sess.status,
    sess.is_current,
    CASE
        WHEN sess.id IS NULL THEN '❌ No active session'
        ELSE '✅ Has active session'
    END as session_status
FROM schools s
LEFT JOIN users u ON s.id = u.school_id
LEFT JOIN sessions sess ON s.id = sess.school_id AND sess.status = 'active'
ORDER BY s.name;
