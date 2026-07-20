<?php

namespace App\Services;

use App\Models\AcademicYear;
use Illuminate\Support\Facades\DB;

class AcademicYearService
{
    public function activate(AcademicYear $year): AcademicYear
    {
        DB::transaction(function () use ($year) {
            // Deactivate all others
            AcademicYear::where('id', '!=', $year->id)->update(['is_active' => false]);
            
            // Activate the selected one
            $year->update(['is_active' => true]);
        });
        
        return $year;
    }
}
