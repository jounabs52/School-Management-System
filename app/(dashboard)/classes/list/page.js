// Copy this into ANY page file
// Example: app/(dashboard)/students/active/page.js

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
            <span className="text-5xl">🚀</span>
          </div>
        </div>
        
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          Classes List Page Coming Soon
        </h1>
        
        <p className="text-xl text-gray-600 mb-6">
          This feature is under development
        </p>
        
        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-6 py-3 rounded-full font-semibold">
          <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
          In Development
        </div>
      </div>
    </div>
  )
}