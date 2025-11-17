// components/QuickStats.js
'use client'

export default function QuickStats({ stats }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-orange-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Statistics</h3>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="text-center">
              <div className={`w-10 h-10 bg-gradient-to-br ${colorClasses[stat.color]} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-lg font-bold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}