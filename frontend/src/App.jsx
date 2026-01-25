import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/dashboard-layout/DashboardLayout'
import { AdminSidebarData } from './data/sidebar-data/AdminSidebarData'
import AdminPanel from './pages/AdminPage'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import ReceptionPage from './pages/ReceptionPage'
import { ReceptionSidebarData } from './data/sidebar-data/ReceptionSidebarData'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/dashboard/login" element={<Login />} />
        <Route
          path="/admin/:slug"
          element={
            <ProtectedRoute>
              <DashboardLayout sidebarData={AdminSidebarData} profilePath="/admin" title="Admin Panel">
                <AdminPanel />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/reception/:slug" element={<ProtectedRoute>
          <DashboardLayout sidebarData={ReceptionSidebarData} profilePath="/reception" title="Reception Panel">
            <ReceptionPage />
          </DashboardLayout>
        </ProtectedRoute>
        }
        />
        <Route path="/" element={<Navigate to="/dashboard/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}