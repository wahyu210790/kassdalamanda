<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\AdditionalIncome;
use App\Models\Expense;
use App\Models\PaymentMonth;
use App\Models\Student;
use App\Enums\PaymentType;
use App\Enums\ExpenseSource;
use App\Enums\StudentStatus;
use Carbon\Carbon;

class DashboardService
{
    public function __construct(private ExpenseService $expenseService) {}

    public function getSummary(int $academicYearId): array
    {
        $now = Carbon::now('Asia/Jakarta');
        $currentMonth = $now->month;

        $wallets = $this->expenseService->getWalletsSummary($academicYearId);

        $cashIncome = $wallets[ExpenseSource::Cash->value]['terkumpul'];
        $savingIncome = $wallets[ExpenseSource::Saving->value]['terkumpul'];
        $cashExpense = $wallets[ExpenseSource::Cash->value]['dipakai'];
        $savingExpense = $wallets[ExpenseSource::Saving->value]['dipakai'];
        $additionalIncomeExpense = $wallets[ExpenseSource::AdditionalIncome->value]['dipakai'];
        $totalExpense = $cashExpense + $savingExpense + $additionalIncomeExpense;

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
            'cash_balance' => $wallets[ExpenseSource::Cash->value]['sisa'],
            'saving_balance' => $wallets[ExpenseSource::Saving->value]['sisa'],
            'student_count' => $activeStudentsCount,
            'cash_income' => $cashIncome,
            'saving_income' => $savingIncome,
            'cash_expense' => $cashExpense,
            'saving_expense' => $savingExpense,
            'additional_income_expense' => $additionalIncomeExpense,
            'total_expense' => $totalExpense,
            'payment_progress' => $paymentProgress,
            'today_cash' => (int) ($todayIncome[PaymentType::Cash->value] ?? 0),
            'today_saving' => (int) ($todayIncome[PaymentType::Saving->value] ?? 0),
            'unpaid_count' => $activeStudentsCount - $paidStudentsCount,
        ];
    }

    public function getPublicSummary(AcademicYear $activeYear): array
    {
        $academicYearId = (int) $activeYear->id;
        $wallets = $this->expenseService->getWalletsSummary($academicYearId);

        $activeStudentsCount = Student::where('academic_year_id', $academicYearId)
            ->active()
            ->count();

        $addIncomeSummary = $wallets[ExpenseSource::AdditionalIncome->value];
        $additionalIncomeData = null;

        if ($addIncomeSummary['terkumpul'] !== 0 || $addIncomeSummary['dipakai'] !== 0) {
            $items = AdditionalIncome::where('academic_year_id', $academicYearId)
                ->orderByDesc('income_date')
                ->orderByDesc('id')
                ->get()
                ->map(fn(AdditionalIncome $item) => [
                    'id' => $item->id,
                    'income_date' => $item->income_date instanceof \DateTimeInterface
                        ? $item->income_date->format('Y-m-d')
                        : (string) $item->income_date,
                    'description' => $item->description,
                    'amount' => (int) $item->amount,
                ])
                ->values()
                ->all();

            $additionalIncomeData = [
                'terkumpul' => $addIncomeSummary['terkumpul'],
                'dipakai' => $addIncomeSummary['dipakai'],
                'sisa' => $addIncomeSummary['sisa'],
                'items' => $items,
            ];
        }

        $expenseItems = Expense::where('academic_year_id', $academicYearId)
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn(Expense $expense) => [
                'id' => $expense->id,
                'expense_date' => $expense->expense_date instanceof \DateTimeInterface
                    ? $expense->expense_date->format('Y-m-d')
                    : (string) $expense->expense_date,
                'title' => $expense->title,
                'amount' => (int) $expense->amount,
                'source' => $expense->source instanceof \BackedEnum
                    ? $expense->source->value
                    : (string) $expense->source,
                'description' => $expense->description,
            ])
            ->values()
            ->all();

        $totalExpense = $wallets[ExpenseSource::Cash->value]['dipakai']
            + $wallets[ExpenseSource::Saving->value]['dipakai']
            + $wallets[ExpenseSource::AdditionalIncome->value]['dipakai'];

        return [
            'academic_year' => [
                'name' => $activeYear->name,
                'start_date' => $activeYear->start_date instanceof \DateTimeInterface
                    ? $activeYear->start_date->format('Y-m-d')
                    : (string) $activeYear->start_date,
                'end_date' => $activeYear->end_date instanceof \DateTimeInterface
                    ? $activeYear->end_date->format('Y-m-d')
                    : (string) $activeYear->end_date,
            ],
            'student_count' => $activeStudentsCount,
            'cash' => $wallets[ExpenseSource::Cash->value],
            'saving' => $wallets[ExpenseSource::Saving->value],
            'additional_income' => $additionalIncomeData,
            'expenses' => [
                'total' => $totalExpense,
                'items' => $expenseItems,
            ],
            'cash_balance' => $wallets[ExpenseSource::Cash->value]['sisa'],
            'saving_balance' => $wallets[ExpenseSource::Saving->value]['sisa'],
            'total_expense' => $totalExpense,
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
