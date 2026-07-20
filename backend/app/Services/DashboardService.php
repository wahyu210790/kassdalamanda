<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Expense;
use App\Models\PaymentMonth;
use App\Models\Student;
use App\Enums\PaymentType;
use App\Enums\ExpenseSource;
use App\Enums\StudentStatus;
use Carbon\Carbon;

class DashboardService
{
    public function getSummary(int $academicYearId): array
    {
        $now = Carbon::now();
        $currentMonth = $now->month;

        // Query 1: Total kas masuk, tabungan masuk
        $income = PaymentMonth::where('academic_year_id', $academicYearId)
            ->selectRaw('payment_type, SUM(amount) as total')
            ->groupBy('payment_type')
            ->pluck('total', 'payment_type');

        $cashIncome = $income[PaymentType::Cash->value] ?? 0;
        $savingIncome = $income[PaymentType::Saving->value] ?? 0;

        // Query 2: Total pengeluaran kas, pengeluaran tabungan
        $expenses = Expense::where('academic_year_id', $academicYearId)
            ->selectRaw('source, SUM(amount) as total')
            ->groupBy('source')
            ->pluck('total', 'source');

        $cashExpense = $expenses[ExpenseSource::Cash->value] ?? 0;
        $savingExpense = $expenses[ExpenseSource::Saving->value] ?? 0;

        // Query 3: Jumlah murid aktif & yang sudah bayar bulan ini
        $activeStudentsCount = Student::where('academic_year_id', $academicYearId)
            ->active()
            ->count();

        $paidStudentsCount = PaymentMonth::where('academic_year_id', $academicYearId)
            ->where('month', $currentMonth)
            ->where('payment_type', PaymentType::Cash) // Asumsi progress berdasarkan kas
            ->distinct('student_id')
            ->count();

        $paymentProgress = $activeStudentsCount > 0 
            ? round(($paidStudentsCount / $activeStudentsCount) * 100) 
            : 0;

        // Transaksi hari ini
        $todayIncome = PaymentMonth::whereHas('payment', function($q) use ($now) {
            $q->whereDate('payment_date', $now->toDateString());
        })
        ->where('academic_year_id', $academicYearId)
        ->selectRaw('payment_type, SUM(amount) as total')
        ->groupBy('payment_type')
        ->pluck('total', 'payment_type');

        return [
            'cash_balance' => $cashIncome - $cashExpense,
            'saving_balance' => $savingIncome - $savingExpense,
            'student_count' => $activeStudentsCount,
            'cash_income' => $cashIncome,
            'saving_income' => $savingIncome,
            'cash_expense' => $cashExpense,
            'saving_expense' => $savingExpense,
            'payment_progress' => $paymentProgress,
            'today_cash' => $todayIncome[PaymentType::Cash->value] ?? 0,
            'today_saving' => $todayIncome[PaymentType::Saving->value] ?? 0,
            'unpaid_count' => $activeStudentsCount - $paidStudentsCount,
        ];
    }

    public function getRecentExpenses(int $academicYearId, int $limit = 10)
    {
        return Expense::where('academic_year_id', $academicYearId)
            ->with('category')
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }
}
