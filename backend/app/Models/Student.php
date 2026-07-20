<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Enums\StudentStatus;

class Student extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => StudentStatus::class,
        ];
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function paymentMonths(): HasMany
    {
        return $this->hasMany(PaymentMonth::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', StudentStatus::Active);
    }

    public function scopeInactive(Builder $query): Builder
    {
        return $query->where('status', StudentStatus::Inactive);
    }
}
