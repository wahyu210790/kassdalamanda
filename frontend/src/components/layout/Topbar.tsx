import { Bell, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
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
