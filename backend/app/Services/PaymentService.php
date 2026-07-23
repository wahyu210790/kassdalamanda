<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\PaymentMonth;
use App\Models\Setting;
use App\Enums\PaymentType;
use Illuminate\Support\Facades\DB;
use Exception;

class PaymentService
{
    public function createPayment(array $data, int $adminId): Payment
    {
        return DB::transaction(function () use ($data, $adminId) {
            $cashNominal = (int) Setting::get('monthly_cash_amount', 10000);
            $savingNominal = (int) Setting::get('monthly_saving_amount', 5000);
            
            $monthsData = $data['months'];
            $totalAmount = 0;
            
            // Check existing
            foreach ($monthsData as $m) {
                $existing = PaymentMonth::where('student_id', $data['student_id'])
                    ->where('academic_year_id', $data['academic_year_id'])
                    ->where('month', $m['month'])
                    ->where('payment_type', $m['payment_type'])
                    ->exists();
                if ($existing) throw new Exception("Bulan " . $m['month'] . " (" . $m['payment_type'] . ") sudah lunas.");
                
                if ($m['payment_type'] === 'cash') $totalAmount += $cashNominal;
                if ($m['payment_type'] === 'saving') $totalAmount += $savingNominal;
            }

            // Determine overall payment type
            $hasCash = collect($monthsData)->contains('payment_type', 'cash');
            $hasSaving = collect($monthsData)->contains('payment_type', 'saving');
            $overallType = ($hasCash && $hasSaving) ? PaymentType::Both : ($hasCash ? PaymentType::Cash : PaymentType::Saving);

            $payment = Payment::create([
                'student_id' => $data['student_id'],
                'admin_id' => $adminId,
                'payment_type' => $overallType,
                'payment_date' => $data['payment_date'],
                'note' => $data['note'] ?? null,
                'total_amount' => $totalAmount,
            ]);

            foreach ($monthsData as $m) {
                PaymentMonth::create([
                    'payment_id' => $payment->id,
                    'student_id' => $data['student_id'],
                    'academic_year_id' => $data['academic_year_id'],
                    'payment_type' => PaymentType::from($m['payment_type']),
                    'month' => $m['month'],
                    'amount' => $m['payment_type'] === 'cash' ? $cashNominal : $savingNominal,
                ]);
            }

            activity()
                ->performedOn($payment)
                ->causedBy($adminId)
                ->log("Admin membuat pembayaran");

            return $payment;
        });
    }

    public function deletePayment(Payment $payment, int $adminId): void
    {
        DB::transaction(function () use ($payment, $adminId) {
            $payment->paymentMonths()->delete();
            $payment->delete();
            
            activity()
                ->performedOn($payment)
                ->causedBy($adminId)
                ->log("Admin menghapus pembayaran");
        });
    }
}
