import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-6 lg:p-8 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
