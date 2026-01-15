# Security Checklist for School Management System

## 🚨 CRITICAL - Must Fix Immediately

### 1. Enable Row Level Security (RLS) on ALL Tables

Run this SQL in your Supabase SQL Editor for EVERY table:

```sql
-- For staff_attendance
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_isolation_policy" ON staff_attendance
FOR ALL USING (
  school_id IN (
    SELECT school_id FROM users WHERE id = auth.uid()
  )
);

-- For contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_isolation_policy" ON contacts
FOR ALL USING (
  school_id IN (
    SELECT school_id FROM users WHERE id = auth.uid()
  )
);

-- For contact_groups
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_isolation_policy" ON contact_groups
FOR ALL USING (
  school_id IN (
    SELECT school_id FROM users WHERE id = auth.uid()
  )
);

-- Repeat for ALL tables: staff, students, classes, etc.
```

### 2. Replace Cookie Authentication with Supabase Auth

**Current (INSECURE)**:
```javascript
const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}
const userData = getCookie('user-data')
const user = JSON.parse(decodeURIComponent(userData))
```

**Should be (SECURE)**:
```javascript
// Get authenticated user from Supabase
const { data: { session }, error } = await supabase.auth.getSession()

if (!session) {
  // Redirect to login
  window.location.href = '/login'
  return
}

const user = session.user

// Get user's school_id from database
const { data: userData } = await supabase
  .from('users')
  .select('school_id, role')
  .eq('id', user.id)
  .single()
```

### 3. Add Server-Side API Routes (Optional but Recommended)

Create Next.js API routes for sensitive operations:

```javascript
// app/api/mark-attendance/route.js
export async function POST(request) {
  const session = await getServerSession()

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Validate user has permission
  // Then update database
}
```

## ⚠️ HIGH PRIORITY

### 4. Input Validation & Sanitization

Add validation to all forms:

```javascript
// Install validator library
npm install validator

import validator from 'validator'

// Validate inputs
if (!validator.isEmail(email)) {
  showToast('Invalid email', 'error')
  return
}

if (!validator.isMobilePhone(mobile)) {
  showToast('Invalid phone number', 'error')
  return
}

// Sanitize strings to prevent XSS
const sanitizedName = validator.escape(name)
```

### 5. Add Role-Based Access Control (RBAC)

Check user roles before allowing operations:

```javascript
const checkPermission = (user, action) => {
  const permissions = {
    'admin': ['create', 'read', 'update', 'delete'],
    'teacher': ['read', 'update'],
    'staff': ['read']
  }

  return permissions[user.role]?.includes(action)
}

// Before any sensitive operation
if (!checkPermission(currentUser, 'delete')) {
  showToast('You do not have permission', 'error')
  return
}
```

## 📋 MEDIUM PRIORITY

### 6. Enable HTTPS Only

Ensure your application only runs on HTTPS in production.

### 7. Add Rate Limiting

Prevent abuse by limiting API calls:

```javascript
// In your API routes
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
```

### 8. Audit Logging

Log all sensitive operations:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  school_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### 9. Environment Variables

Never expose sensitive keys in code:

```javascript
// .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

// In code
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
```

## 🔒 Security Best Practices

1. **Never trust client-side data**
2. **Always validate on server-side**
3. **Use RLS for ALL tables**
4. **Implement proper authentication**
5. **Add audit logs for sensitive operations**
6. **Regular security updates**
7. **Limit error message details in production**

## Testing Your Security

### Test 1: Can users access other schools' data?
1. Open browser console
2. Try to query another school's data directly
3. If you can access it, RLS is not working

### Test 2: Can you modify authentication?
1. Modify the user cookie in browser
2. Change school_id to another value
3. If you can access other data, authentication is broken

### Test 3: SQL Injection
1. Try entering: `' OR '1'='1` in form fields
2. If it causes errors or unexpected behavior, you need better validation

## Summary

**Current Risk Level**: 🔴 **HIGH**

Your system is vulnerable because:
- ❌ No Row Level Security
- ❌ Cookie-based auth can be tampered
- ❌ All validation is client-side
- ❌ No role-based permissions

**After Fixes**: 🟢 **LOW**

Once you implement:
- ✅ RLS on all tables
- ✅ Supabase Auth
- ✅ Input validation
- ✅ Role checks
