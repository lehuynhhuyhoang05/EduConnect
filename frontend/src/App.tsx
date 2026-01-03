import { useState } from 'react'
import './App.css'
import LiveSessionDemo from './pages/LiveSessionDemo'

function App() {
  const [showDemo, setShowDemo] = useState(false)

  if (showDemo) {
    return (
      <div>
        <button
          onClick={() => setShowDemo(false)}
          className="fixed top-4 left-4 z-50 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          ← Về trang chính
        </button>
        <LiveSessionDemo />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">
          EduConnect 🚀
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Interactive Learning Management System
        </p>
        
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Frontend Setup Complete!
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={() => setShowDemo(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200"
            >
              🎓 Demo Live Session
            </button>
            
            <div className="text-left text-sm text-gray-600 space-y-2">
              <p>✅ React 18 + TypeScript</p>
              <p>✅ Vite 5 (Fast HMR)</p>
              <p>✅ TailwindCSS 3</p>
              <p>✅ React Router (Ready)</p>
              <p>✅ Zustand State Management</p>
              <p>✅ Socket.io Client (Ready)</p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-gray-500 text-sm">
          Nhóm 14 - Môn Lập Trình Mạng
        </p>
      </div>
    </div>
  )
}

export default App
