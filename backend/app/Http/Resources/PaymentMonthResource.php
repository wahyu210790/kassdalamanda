<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentMonthResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'academic_year_id' => $this->academic_year_id,
            'payment_type' => $this->payment_type,
            'month' => $this->month,
            'amount' => $this->amount,
        ];
    }
}
