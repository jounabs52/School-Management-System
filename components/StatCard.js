// components/StatCard.js
'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ title, value, change, trend, icon: Icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-orange-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
        {trend === 'neutral' && <Minus className="w-4 h-4 text-gray-400" />}
      </div>
      <h3 className="text-xs text-gray-600 mb-1">{title}</h3>
      <div className="flex items-baseline justify-between">
        <p className="text-xl font-bold text-gray-800">{value}</p>
        {change !== 0 && (
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  )
}