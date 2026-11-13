<?php

namespace App\Services;

use App\Models\AdditionalIncome;
use App\Models\Admin;
use App\Enums\ExpenseSource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdditionalIncomeService
{
    public function __construct(private ExpenseService $expenseService) {}

    public function create(array $data, int $adminId): AdditionalIncome
    {
        return DB::transaction(function () use ($data, $adminId) {
            $income = AdditionalIncome::create([
                'academic_year_id' => $data['academic_year_id'],
                'admin_id' => $adminId,
                'income_date' => $data['income_date'],
                'description' => $data['description'],
                'amount' => $data['amount'],
            ]);

            try {
                $causer = Admin::find($adminId);
                activity()
                    ->performedOn($income)
                    ->causedBy($causer ?: $adminId)
                    ->log("Admin mencatat pemasukan tambahan: " . $income->description);
            } catch (Throwable $e) {
                Log::warning('Activity log failed: ' . $e->getMessage());
            }

            return $income;
        });
    }

    public function update(AdditionalIncome $income, array $data, int $adminId): AdditionalIncome
    {
        return DB::transaction(function () use ($income, $data, $adminId) {
            $academicYearId = (int) $income->academic_year_id;
            $this->expenseService->kunciTahunAjaran($academicYearId);

            $summary = $this->expenseService->getWalletSummary(
                ExpenseSource::AdditionalIncome->value,
                $academicYearId
            );

            $newTerkumpul = $summary['terkumpul'] - (int) $income->amount + (int) $data['amount'];

            if ($newTerkumpul < $summary['dipakai']) {
                throw ValidationException::withMessages([
                    'amount' => 'Sisa tidak cukup.',
                ]);
            }

            $income->update([
                'income_date' => $data['income_date'],
                'description' => $data['description'],
                'amount' => $data['amount'],
            ]);

            try {
                $causer = Admin::find($adminId);
                activity()
                    ->performedOn($income)
                    ->causedBy($causer ?: $adminId)
                    ->log("Admin mengubah pemasukan tambahan: " . $income->description);
            } catch (Throwable $e) {
                Log::warning('Activity log failed: ' . $e->getMessage());
            }

            return $income->fresh();
        });
    }

    public function delete(AdditionalIncome $income, int $adminId): void
    {
        DB::transaction(function () use ($income, $adminId) {
            $academicYearId = (int) $income->academic_year_id;
            $this->expenseService->kunciTahunAjaran($academicYearId);

            $summary = $this->expenseService->getWalletSummary(
                ExpenseSource::AdditionalIncome->value,
                $academicYearId
            );

            $newTerkumpul = $summary['terkumpul'] - (int) $income->amount;

            if ($newTerkumpul < $summary['dipakai']) {
                throw ValidationException::withMessages([
                    'amount' => 'Sisa tidak cukup.',
                ]);
            }

            $income->delete();

            try {
                $causer = Admin::find($adminId);
                activity()
                    ->performedOn($income)
                    ->causedBy($causer ?: $adminId)
                    ->log("Admin menghapus pemasukan tambahan: " . $income->description);
            } catch (Throwable $e) {
                Log::warning('Activity log failed: ' . $e->getMessage());
            }
        });
    }
}
