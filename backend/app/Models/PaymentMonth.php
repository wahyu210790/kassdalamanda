<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\PaymentType;

class PaymentMonth extends Model
{
    public $timestamps = false; // Karena tabel payment_months tidak punya timestamps di migration

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'month' => 'integer',
            'amount' => 'integer',
            'payment_type' => PaymentType::class,
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }
}
