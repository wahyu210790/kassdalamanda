<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\PaymentMonth;
use App\Models\Student;
use App\Models\Setting;
use App\Models\Admin;
use App\Enums\PaymentType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Exception;
use Throwable;

class PaymentService
{
    public function createPayment(array $data, int $adminId): Payment
    {
        // 1. Validasi: cek apakah ada bulan yang sudah pernah dibayar
        foreach ($data['months'] as $m) {
            $isPaid = PaymentMonth::where('student_id', $data['student_id'])
                ->where('academic_year_id', $data['academic_year_id'])
                ->where('month', $m['month'])
                ->where('payment_type', $m['payment_type'])
                ->exists();

            if ($isPaid) {
                $monthName = date("F", mktime(0, 0, 0, $m['month'], 10));
                $typeStr = $m['payment_type'] === 'cash' ? 'Uang Kas' : 'Uang Tabungan';
                throw ValidationException::withMessages([
                    'months' => "Bulan {$monthName} untuk {$typeStr} sudah pernah dibayar."
                ]);
            }
        }

        $payment = DB::transaction(function () use ($data, $adminId) {
            $cashNominal = (int) Setting::get('monthly_cash_amount', 10000);
            $savingNominal = (int) Setting::get('monthly_saving_amount', 5000);

            // Hitung total dari backend setting
            $totalAmount = 0;
            foreach ($data['months'] as $m) {
                $totalAmount += ($m['payment_type'] === 'cash') ? $cashNominal : $savingNominal;
            }

            $payment = Payment::create([
                'academic_year_id' => $data['academic_year_id'],
                'student_id' => $data['student_id'],
                'admin_id' => $adminId,
                'payment_date' => $data['payment_date'],
                'total_amount' => $totalAmount,
                'payment_type' => count($data['months']) > 1 ? 'both' : $data['months'][0]['payment_type'],
            ]);

            foreach ($data['months'] as $m) {
                PaymentMonth::create([
                    'academic_year_id' => $data['academic_year_id'],
                    'student_id' => $data['student_id'],
                    'payment_id' => $payment->id,
                    'payment_type' => $m['payment_type'],
                    'month' => $m['month'],
                    'amount' => $m['payment_type'] === 'cash' ? $cashNominal : $savingNominal,
                ]);
            }

            return $payment;
        });
        
        // Log activity outside of transaction
        try {
            $causer = Admin::find($adminId);
            activity()
                ->performedOn($payment)
                ->causedBy($causer ?: $adminId)
                ->log("Admin membuat pembayaran");
        } catch (Throwable $e) {
            Log::warning('Activity log failed: ' . $e->getMessage());
        }
        
        return $payment;
    }

    public function deletePayment(Payment $payment, int $adminId): void
    {
        DB::transaction(function () use ($payment, $adminId) {
            $payment->paymentMonths()->delete();
            $payment->delete();
            
            try {
                $causer = Admin::find($adminId);
                activity()
                    ->performedOn($payment)
                    ->causedBy($causer ?: $adminId)
                    ->log("Admin menghapus pembayaran");
            } catch (Throwable $e) {
                Log::warning('Activity log failed: ' . $e->getMessage());
            }
        });
    }
}
