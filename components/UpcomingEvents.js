// components/UpcomingEvents.js
'use client'
import { Calendar, Clock } from 'lucide-react'

export default function UpcomingEvents({ events }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Upcoming Events</h3>
        <Calendar className="w-4 h-4 text-gray-400" />
      </div>
      <div className="space-y-2">
        {events.map((event, index) => (
          <div key={index} className={`${colorClasses[event.color]} border rounded-lg p-2`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-xs font-semibold">{event.title}</h4>
                <p className="text-xs opacity-80 mt-0.5">{event.description}</p>
              </div>
              <span className="text-xs font-medium whitespace-nowrap ml-2">{event.date}</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <Clock className="w-3 h-3 opacity-70" />
              <span className="text-xs opacity-80">{event.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}