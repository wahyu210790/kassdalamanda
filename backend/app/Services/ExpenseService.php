<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Expense;
use App\Models\PaymentMonth;
use App\Models\AdditionalIncome;
use App\Models\Admin;
use App\Enums\ExpenseSource;
use App\Enums\PaymentType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class ExpenseService
{
    public function kunciTahunAjaran(int $academicYearId): void
    {
        AcademicYear::whereKey($academicYearId)->lockForUpdate()->first();
    }

    public function getWalletSummary(string $source, int $academicYearId): array
    {
        if ($source === ExpenseSource::AdditionalIncome->value) {
            $terkumpul = (int) AdditionalIncome::where('academic_year_id', $academicYearId)
                ->sum('amount');
        } else {
            $paymentType = $source === ExpenseSource::Cash->value ? PaymentType::Cash : PaymentType::Saving;
            $terkumpul = (int) PaymentMonth::where('academic_year_id', $academicYearId)
                ->where('payment_type', $paymentType)
                ->sum('amount');
        }

        $dipakai = (int) Expense::where('academic_year_id', $academicYearId)
            ->where('source', $source)
            ->sum('amount');

        return [
            'terkumpul' => $terkumpul,
            'dipakai' => $dipakai,
            'sisa' => $terkumpul - $dipakai,
        ];
    }

    public function getWalletsSummary(int $academicYearId): array
    {
        return [
            'cash' => $this->getWalletSummary(ExpenseSource::Cash->value, $academicYearId),
            'saving' => $this->getWalletSummary(ExpenseSource::Saving->value, $academicYearId),
            'additional_income' => $this->getWalletSummary(ExpenseSource::AdditionalIncome->value, $academicYearId),
        ];
    }

    public function getCurrentBalance(string $source, int $academicYearId): int
    {
        return $this->getWalletSummary($source, $academicYearId)['sisa'];
    }

    public function createExpense(array $data, int $adminId): Expense
    {
        return DB::transaction(function () use ($data, $adminId) {
            $academicYearId = (int) $data['academic_year_id'];
            $this->kunciTahunAjaran($academicYearId);

            $balance = $this->getCurrentBalance($data['source'], $academicYearId);

            if ((int) $data['amount'] > $balance) {
                throw ValidationException::withMessages([
                    'amount' => 'Nominal melebihi Sisa.',
                ]);
            }

            $expense = Expense::create([
                'academic_year_id' => $data['academic_year_id'],
                'category_id' => $data['category_id'] ?? null,
                'admin_id' => $adminId,
                'source' => $data['source'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'amount' => $data['amount'],
                'expense_date' => $data['expense_date'],
            ]);

            try {
                $causer = Admin::find($adminId);
                activity()
                    ->performedOn($expense)
                    ->causedBy($causer ?: $adminId)
                    ->log("Admin mencatat pengeluaran: " . $expense->title);
            } catch (Throwable $e) {
                Log::warning('Activity log failed: ' . $e->getMessage());
            }

            return $expense;
        });
    }

    public function updateExpense(Expense $expense, array $data, int $adminId): Expense
    {
        return DB::transaction(function () use ($expense, $data, $adminId) {
            $academicYearId = (int) $expense->academic_year_id;
            $this->kunciTahunAjaran($academicYearId);

            $newSource = $data['source'];
            $oldSource = $expense->source instanceof ExpenseSource
                ? $expense->source->value
                : (string) $expense->source;

            $newAmount = (int) $data['amount'];
            $oldAmount = (int) $expense->amount;

            if (!($newSource === $oldSource && $newAmount <= $oldAmount)) {
                $targetSisa = $this->getCurrentBalance($newSource, $academicYearId);
                $allowedBalance = ($newSource === $oldSource)
                    ? $targetSisa + $oldAmount
                    : $targetSisa;

                if ($newAmount > $allowedBalance) {
                    throw ValidationException::withMessages([
                        'amount' => 'Nominal melebihi Sisa.',
                    ]);
                }
            }

            $expense->update([
                'category_id' => array_key_exists('category_id', $data) ? $data['category_id'] : $expense->category_id,
                'source' => $newSource,
                'title' => $data['title'],
                'description' => array_key_exists('description', $data) ? $data['description'] : $expense->description,
                'amount' => $data['amount'],
                'expense_date' => $data['expense_date'],
            ]);

            try {
                $causer = Admin::find($adminId);
                activity()
                    ->performedOn($expense)
                    ->causedBy($causer ?: $adminId)
                    ->log("Admin mengubah pengeluaran: " . $expense->title);
            } catch (Throwable $e) {
                Log::warning('Activity log failed: ' . $e->getMessage());
            }

            return $expense->fresh();
        });
    }

    public function deleteExpense(Expense $expense, int $adminId): void
    {
        DB::transaction(function () use ($expense, $adminId) {
            $expense->delete();

            try {
                $causer = Admin::find($adminId);
                activity()
                    ->performedOn($expense)
                    ->causedBy($causer ?: $adminId)
                    ->log("Admin menghapus pengeluaran: " . $expense->title);
            } catch (Throwable $e) {
                Log::warning('Activity log failed: ' . $e->getMessage());
            }
        });
    }
}
