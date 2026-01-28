'use client'

/**
 * DataCard Component System for Mobile Dashboard Views
 * Provides reusable card components to replace table rows on mobile screens
 * Optimized for displaying many records in minimal space
 */

// Base card container - ULTRA COMPACT for showing many records
export default function DataCard({ children, onClick, className = '' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded border border-gray-200
        p-2 mb-1.5 active:bg-gray-50
        transition-colors duration-150 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

// Card header - ULTRA COMPACT horizontal layout
export function CardHeader({ photo, name, subtitle, badge, srNumber }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      {/* Serial Number Badge - smaller */}
      {srNumber && (
        <div className="flex-shrink-0 w-5 h-5 bg-blue-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
          {srNumber}
        </div>
      )}

      {/* Avatar/Photo - smaller */}
      {photo && (
        typeof photo === 'string' ? (
          <img
            src={photo}
            alt={name}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
            {photo}
          </div>
        )
      )}

      {/* Name and Subtitle - more compact */}
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-semibold text-gray-900 truncate leading-tight">{name}</h3>
        {subtitle && (
          <p className="text-[10px] text-gray-600 truncate leading-tight">{subtitle}</p>
        )}
      </div>

      {/* Optional Badge - smaller */}
      {badge && (
        <div className="flex-shrink-0 text-[10px]">
          {badge}
        </div>
      )}
    </div>
  )
}

// Key-value row - ULTRA COMPACT with inline layout
export function CardRow({ label, value, className = '' }) {
  return (
    <div className={`flex items-center gap-1 text-[10px] leading-tight ${className}`}>
      <span className="text-gray-600 font-medium">{label}:</span>
      <span className="text-gray-900 truncate flex-1">{value}</span>
    </div>
  )
}

// Action buttons - ULTRA COMPACT with smaller buttons
export function CardActions({ children, className = '' }) {
  return (
    <div className={`flex gap-1 pt-1.5 mt-1.5 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  )
}

// Container for multiple cards - minimal spacing
export function CardGrid({ children }) {
  return <div className="space-y-1.5">{children}</div>
}

// Compact info grid - shows 2 items per row
export function CardInfoGrid({ children }) {
  return <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-1">{children}</div>
}
