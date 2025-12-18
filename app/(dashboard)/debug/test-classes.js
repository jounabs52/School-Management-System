'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserFromCookie } from '@/lib/clientAuth'

export default function TestClassesPage() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    testDatabase()
  }, [])

  const testDatabase = async () => {
    const tests = {}

    try {
      // Test 1: Check Supabase connection
      tests.supabaseConnected = supabase !== null

      // Test 2: Check user authentication
      const user = getUserFromCookie()
      tests.userFound = user !== null
      tests.userId = user?.id || 'N/A'
      tests.schoolId = user?.school_id || 'N/A'

      if (!user) {
        setResults(tests)
        setLoading(false)
        return
      }

      // Test 3: Count all classes (no filters)
      const { count: totalClasses, error: countError } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })

      tests.totalClassesInDB = totalClasses
      tests.countError = countError?.message || null

      // Test 4: Count classes for this school
      const { count: schoolClasses, error: schoolError } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', user.school_id)

      tests.classesForSchool = schoolClasses
      tests.schoolError = schoolError?.message || null

      // Test 5: Get actual class data
      const { data: classData, error: dataError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', user.school_id)
        .limit(5)

      tests.sampleClasses = classData
      tests.dataError = dataError?.message || null

      // Test 6: Check columns
      if (classData && classData.length > 0) {
        tests.availableColumns = Object.keys(classData[0])
      }

      setResults(tests)
    } catch (error) {
      tests.criticalError = error.message
      setResults(tests)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading tests...</div>
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Database Connection Test</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(results, null, 2)}
        </pre>

        <div className="mt-6 space-y-2">
          <h2 className="font-bold text-lg">Quick Summary:</h2>
          <p>✓ Supabase Connected: {results?.supabaseConnected ? 'Yes' : 'No'}</p>
          <p>✓ User Found: {results?.userFound ? 'Yes' : 'No'}</p>
          <p>✓ School ID: {results?.schoolId}</p>
          <p>✓ Total Classes in Database: {results?.totalClassesInDB ?? 'Error'}</p>
          <p>✓ Classes for Your School: {results?.classesForSchool ?? 'Error'}</p>
          {results?.availableColumns && (
            <p>✓ Available Columns: {results.availableColumns.join(', ')}</p>
          )}
        </div>

        {results?.dataError && (
          <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded">
            <p className="text-red-800 font-bold">Error:</p>
            <p className="text-red-700">{results.dataError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
