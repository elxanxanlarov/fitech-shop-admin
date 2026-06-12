import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/dashboard-layout/DashboardLayout'
import { AdminSidebarData } from './data/sidebar-data/AdminSidebarData'
import AdminPanel from './pages/AdminPage'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import ReceptionPage from './pages/ReceptionPage'
import { ReceptionSidebarData } from './data/sidebar-data/ReceptionSidebarData'
import { AuthProvider } from './context/AuthContext'
import { BranchProvider } from './context/BranchContext'
import SyncCenter from './pages/SyncCenter'
import SellerLayout from './components/seller-layout/SellerLayout'
import SellerPage from './pages/SellerPage'
import ExcelToFirmaProduct from './pages/testExcel/ExcelToFirmaProduct'

export default function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <Routes>
          <Route path="/dashboard/login" element={<Login />} />

          {/* Admin Routes */}
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

          {/* Sync Center Route */}
          <Route
            path="/sync-center"
            element={
              <ProtectedRoute requiredRole="SUPERADMIN">
                <DashboardLayout sidebarData={AdminSidebarData} profilePath="/admin" title="Sinxronizasiya">
                  <SyncCenter />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Reception Routes */}
          <Route
            path="/reception/:slug"
            element={
              <ProtectedRoute>
                <DashboardLayout sidebarData={ReceptionSidebarData} profilePath="/reception" title="Reception Panel">
                  <ReceptionPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Seller (POS) Routes */}
          <Route
            path="/seller"
            element={<Navigate to="/seller/pos" replace />}
          />
          <Route
            path="/seller/:slug"
            element={
              <ProtectedRoute>
                <SellerLayout>
                  <SellerPage />
                </SellerLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/test-excel" element={<ExcelToFirmaProduct />} />
          <Route path="/" element={<Navigate to="/dashboard/login" replace />} />
        </Routes>
      </BranchProvider>
    </AuthProvider>
  )
}