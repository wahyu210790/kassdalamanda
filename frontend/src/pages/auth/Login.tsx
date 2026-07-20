import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Wallet, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const from = location.state?.from?.pathname || "/";

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError('');

    try {
      // Create CSRF cookie first for Sanctum
      await api.get('https://api.storytech.id/sanctum/csrf-cookie');
      
      const response = await api.post('/login', data);
      const { access_token, admin } = response.data;
      
      login(access_token, admin);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 422) {
        setError(err.response.data.message || 'Kredensial tidak valid');
      } else {
        setError('Terjadi kesalahan pada server. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Kiri: Form Login */}
      <div className="flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="mx-auto w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start items-center gap-3 mb-6">
              <div className="bg-primary/10 p-3 rounded-2xl">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Kas Alamanda
              </h1>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Selamat Datang</h2>
            <p className="text-sm text-muted-foreground">
              Masuk ke akun admin Anda untuk mengelola kas dan tabungan.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  placeholder="admin@alamanda.id"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...register('password')}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <Button className="w-full h-11 text-base font-semibold transition-all" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              )}
              {isLoading ? 'Sedang Masuk...' : 'Masuk'}
            </Button>
          </form>
          
          <div className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SD Kelas 1 Alamanda.
          </div>
        </div>
      </div>

      {/* Kanan: Cover Image/Pattern (Hanya muncul di desktop) */}
      <div className="hidden lg:flex flex-col justify-center items-center relative overflow-hidden bg-muted">
        <div className="absolute inset-0 bg-primary/5 pattern-dots" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-80" />
        
        <div className="relative z-10 max-w-lg p-12 backdrop-blur-sm bg-background/60 rounded-3xl border shadow-2xl mx-8 animate-in fade-in slide-in-from-right-8 duration-1000 delay-150">
          <h3 className="text-3xl font-bold mb-4 tracking-tight">Sistem Manajemen Terpadu</h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Kelola iuran bulanan kas dan tabungan kelas dengan mudah, transparan, dan akurat. Semua laporan tercatat secara otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}
