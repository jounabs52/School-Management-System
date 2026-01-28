'use client'

/**
 * ResponsiveTableWrapper Component
 * Handles switching between table and card views based on screen size
 *
 * Usage:
 * <ResponsiveTableWrapper
 *   tableView={<table>...</table>}
 *   cardView={<CardGrid>...</CardGrid>}
 *   loading={loading}
 *   empty={data.length === 0}
 *   emptyMessage="No data found"
 * />
 */
export default function ResponsiveTableWrapper({
  tableView,
  cardView,
  loading = false,
  empty = false,
  emptyMessage = 'No data found'
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <p className="text-center text-sm text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      {/* Table View - Hidden on mobile (< 640px), shown on tablet+ */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">{tableView}</div>
      </div>

      {/* Card View - Shown on mobile (< 640px), hidden on tablet+ */}
      <div className="block sm:hidden">{cardView}</div>
    </>
  )
}
