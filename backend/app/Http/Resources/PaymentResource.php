<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student' => new StudentResource($this->whenLoaded('student')),
            'payment_type' => $this->payment_type,
            'payment_date' => $this->payment_date?->format('Y-m-d'),
            'total_amount' => $this->total_amount,
            'note' => $this->note,
            'months' => PaymentMonthResource::collection($this->whenLoaded('paymentMonths')),
        ];
    }
}
