import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet, PiggyBank, Users, TrendingDown, Receipt, ArrowRight } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const response = await api.get('/dashboard');
      return response.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Ringkasan keuangan kelas saat ini.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50 rounded-t-xl" />
              <CardContent className="h-16" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
        Gagal memuat data dashboard. Silakan coba lagi nanti.
      </div>
    );
  }

  const statCards = [
    {
      title: "Saldo Kas",
      value: formatRupiah(data?.cash_balance || 0),
      subtitle: `Pemasukan Hari Ini: ${formatRupiah(data?.today_cash || 0)}`,
      icon: Wallet,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Saldo Tabungan",
      value: formatRupiah(data?.saving_balance || 0),
      subtitle: `Pemasukan Hari Ini: ${formatRupiah(data?.today_saving || 0)}`,
      icon: PiggyBank,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total Pengeluaran",
      value: formatRupiah((data?.cash_expense || 0) + (data?.saving_expense || 0)),
      subtitle: "Dari Kas & Tabungan",
      icon: TrendingDown,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
    {
      title: "Siswa Aktif",
      value: data?.student_count || 0,
      subtitle: `${data?.unpaid_count || 0} belum bayar bulan ini`,
      icon: Users,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Ringkasan keuangan kelas saat ini.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <div className={`p-2 rounded-xl ${stat.bgColor} transition-transform group-hover:scale-110`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
                <span className="text-xs text-muted-foreground mt-2 font-medium">
                  {stat.subtitle}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border shadow-sm">
          <CardHeader>
            <CardTitle>Progress Pembayaran Bulan Ini</CardTitle>
            <CardDescription>
              Persentase siswa yang sudah membayar kas bulan ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <span className="text-5xl font-bold tracking-tighter">
                  {data?.payment_progress || 0}%
                </span>
                <span className="text-sm font-medium text-muted-foreground mb-1">
                  dari {data?.student_count || 0} Siswa
                </span>
              </div>
              <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${data?.payment_progress || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Pengeluaran Terakhir</CardTitle>
            </div>
            <Link to="/expenses" className="text-sm font-medium text-primary hover:underline flex items-center">
              Lihat Semua <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1">
            {data?.recent_expenses?.length > 0 ? (
              <div className="space-y-4">
                {data.recent_expenses.slice(0, 4).map((expense: any) => (
                  <div key={expense.id} className="flex items-center">
                    <div className="bg-rose-500/10 p-2 rounded-full mr-4">
                      <Receipt className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none line-clamp-1">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.expense_date} • {expense.category || 'Umum'}
                      </p>
                    </div>
                    <div className="font-semibold text-sm text-rose-600">
                      -{formatRupiah(expense.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <Receipt className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Belum ada pengeluaran.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
