import { Bell, LogOut, User, Menu, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import { Link, useLocation } from "react-router-dom"
import { navItems } from "./Sidebar"
import { cn } from "@/lib/utils"

export function Topbar() {
  const location = useLocation()

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
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Button variant="ghost" size="icon" className="text-muted-foreground relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
          </Button>
          
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />
          
          <div className="flex items-center gap-x-4">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col hidden sm:block">
              <span className="text-sm font-semibold leading-none">Admin</span>
              <span className="text-xs text-muted-foreground mt-1">admin@alamanda.id</span>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive transition-colors" title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

