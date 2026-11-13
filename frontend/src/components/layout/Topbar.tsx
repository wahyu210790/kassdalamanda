import { LogOut, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { navItems } from "./Sidebar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile Menu */}
      <div className="flex lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 text-muted-foreground">
              <span className="sr-only">Buka menu sidebar</span>
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="p-6 border-b text-left flex flex-row items-center gap-3 space-y-0">
              <div className="bg-primary/10 p-1 rounded-lg">
                <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
              </div>
              <SheetTitle className="text-lg tracking-tight">Kas Alamanda</SheetTitle>
            </SheetHeader>
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
                      "flex items-center min-h-[44px] gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
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
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <div className="flex items-center gap-x-3">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="hidden sm:flex flex-col gap-0.5">
              <span className="text-sm font-semibold leading-tight text-foreground">
                {user?.name || "Admin"}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {user?.email || "admin@alamanda.id"}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive transition-colors" 
              title="Keluar"
              aria-label="Keluar"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
