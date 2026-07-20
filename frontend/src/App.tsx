import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Login } from '@/pages/auth/Login'
import { Dashboard } from '@/pages/dashboard/Dashboard'
import { Students } from '@/pages/students/Students'
import { Payments } from '@/pages/payments/Payments'
import { Expenses } from '@/pages/expenses/Expenses'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<div className="p-4 bg-card rounded-xl shadow-sm border">Laporan (WIP)</div>} />
            <Route path="/settings" element={<div className="p-4 bg-card rounded-xl shadow-sm border">Pengaturan (WIP)</div>} />
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
