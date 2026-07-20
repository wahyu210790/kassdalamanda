<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\PaymentService;
use App\Http\Requests\Payment\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $service) {}

    public function index(Request $request)
    {
        $payments = Payment::with(['student', 'paymentMonths'])
            ->when($request->query('academic_year_id'), function($q, $id) {
                // Filter by academic year through student or payment months
                $q->whereHas('student', fn($q) => $q->where('academic_year_id', $id));
            })
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->paginate(20);
            
        return PaymentResource::collection($payments);
    }

    public function store(StorePaymentRequest $request)
    {
        $payment = $this->service->createPayment(
            $request->validated(), 
            $request->user()->id
        );
        
        return new PaymentResource($payment->load(['student', 'paymentMonths']));
    }

    public function show(Payment $payment)
    {
        return new PaymentResource($payment->load(['student', 'paymentMonths', 'admin']));
    }

    public function destroy(Request $request, Payment $payment)
    {
        $this->service->deletePayment($payment, $request->user()->id);
        return response()->json(['message' => 'Pembayaran berhasil dibatalkan']);
    }
}
