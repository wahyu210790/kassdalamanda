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
            
            $paymentType = PaymentType::from($data['payment_type']);
            $months = $data['months'];
            $totalAmount = 0;
            
            // Cek pembayaran ganda
            $existing = PaymentMonth::where('student_id', $data['student_id'])
                ->where('academic_year_id', $data['academic_year_id'])
                ->whereIn('month', $months)
                ->when($paymentType !== PaymentType::Both, function($q) use ($paymentType) {
                    return $q->where('payment_type', $paymentType);
                })
                ->exists();

            if ($existing) {
                throw new Exception("Salah satu bulan yang dipilih sudah lunas.");
            }

            // Hitung total amount
            $monthCount = count($months);
            if ($paymentType === PaymentType::Cash) {
                $totalAmount = $monthCount * $cashNominal;
            } elseif ($paymentType === PaymentType::Saving) {
                $totalAmount = $monthCount * $savingNominal;
            } else {
                $totalAmount = $monthCount * ($cashNominal + $savingNominal);
            }

            $payment = Payment::create([
                'student_id' => $data['student_id'],
                'admin_id' => $adminId,
                'payment_type' => $paymentType,
                'payment_date' => $data['payment_date'],
                'note' => $data['note'] ?? null,
                'total_amount' => $totalAmount,
            ]);

            // Insert payment months
            foreach ($months as $month) {
                if ($paymentType === PaymentType::Cash || $paymentType === PaymentType::Both) {
                    PaymentMonth::create([
                        'payment_id' => $payment->id,
                        'student_id' => $data['student_id'],
                        'academic_year_id' => $data['academic_year_id'],
                        'payment_type' => PaymentType::Cash,
                        'month' => $month,
                        'amount' => $cashNominal,
                    ]);
                }
                
                if ($paymentType === PaymentType::Saving || $paymentType === PaymentType::Both) {
                    PaymentMonth::create([
                        'payment_id' => $payment->id,
                        'student_id' => $data['student_id'],
                        'academic_year_id' => $data['academic_year_id'],
                        'payment_type' => PaymentType::Saving,
                        'month' => $month,
                        'amount' => $savingNominal,
                    ]);
                }
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
