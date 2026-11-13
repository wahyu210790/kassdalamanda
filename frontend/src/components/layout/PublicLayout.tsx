import { Outlet, Link } from "react-router-dom"

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-1 rounded-lg">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Kas Alamanda</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground hidden sm:block">
            Portal Transparansi Orang Tua
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors min-h-[44px] sm:min-h-0"
          >
            Masuk
          </Link>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
        <Outlet />
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground border-t bg-background">
        &copy; 2026 Kas SD Kelas 1 Alamanda
      </footer>
    </div>
  )
}
