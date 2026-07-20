import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Receipt,
  Settings,
  FileText
} from "lucide-react"

export const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Siswa", href: "/admin/students", icon: Users },
  { name: "Pembayaran Kas & Tabungan", href: "/admin/payments", icon: Wallet },
  { name: "Pengeluaran", href: "/admin/expenses", icon: Receipt },
  { name: "Laporan", href: "/admin/reports", icon: FileText },
  { name: "Pengaturan", href: "/admin/settings", icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex-col transition-transform duration-300">
      <div className="flex h-16 shrink-0 items-center px-6 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-1 rounded-lg">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Kas Alamanda</span>
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-1 px-4 py-6 overflow-y-auto">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-2 uppercase tracking-wider">
          Menu Utama
        </div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-200", 
                isActive ? "text-primary" : "text-muted-foreground group-hover:scale-110"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground text-center">
        v1.0 &copy; 2026 Kas Alamanda
      </div>
    </aside>
  )
}
