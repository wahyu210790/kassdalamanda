<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
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
            'category' => $this->whenLoaded('category', fn() => $this->category->name),
            'title' => $this->title,
            'source' => $this->source,
            'amount' => $this->amount,
            'expense_date' => $this->expense_date?->format('Y-m-d'),
            'description' => $this->description,
        ];
    }
}
