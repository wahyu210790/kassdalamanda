<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\PaymentMonth;
use App\Enums\ExpenseSource;
use App\Enums\PaymentType;
use Illuminate\Support\Facades\DB;
use Exception;

class ExpenseService
{
    public function getCurrentBalance(string $source, int $academicYearId): int
    {
        $paymentType = $source === ExpenseSource::Cash->value ? PaymentType::Cash : PaymentType::Saving;
        
        $totalIncome = PaymentMonth::where('academic_year_id', $academicYearId)
            ->where('payment_type', $paymentType)
            ->sum('amount');
            
        $totalExpense = Expense::where('academic_year_id', $academicYearId)
            ->where('source', $source)
            ->sum('amount');
            
        return $totalIncome - $totalExpense;
    }

    public function createExpense(array $data, int $adminId): Expense
    {
        return DB::transaction(function () use ($data, $adminId) {
            $balance = $this->getCurrentBalance($data['source'], $data['academic_year_id']);
            
            if ($data['amount'] > $balance) {
                throw new Exception("Saldo tidak mencukupi. Saldo tersisa: Rp " . number_format($balance, 0, ',', '.'));
            }

            $expense = Expense::create([
                'academic_year_id' => $data['academic_year_id'],
                'category_id' => $data['category_id'],
                'admin_id' => $adminId,
                'source' => $data['source'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'amount' => $data['amount'],
                'expense_date' => $data['expense_date'],
            ]);

            activity()
                ->performedOn($expense)
                ->causedBy($adminId)
                ->log("Admin mencatat pengeluaran: " . $expense->title);

            return $expense;
        });
    }

    public function deleteExpense(Expense $expense, int $adminId): void
    {
        DB::transaction(function () use ($expense, $adminId) {
            $expense->delete();
            
            activity()
                ->performedOn($expense)
                ->causedBy($adminId)
                ->log("Admin menghapus pengeluaran: " . $expense->title);
        });
    }
}
