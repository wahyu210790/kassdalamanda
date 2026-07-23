<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:test-payment')]
#[Description('Command description')]
class TestPayment extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $student = \App\Models\Student::first();
        if (!$student) {
            $this->error('No students found');
            return;
        }

        $data = [
            'student_id' => $student->id,
            'academic_year_id' => $student->academic_year_id,
            'payment_date' => '2026-07-23',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash']
            ]
        ];
        
        $validator = \Illuminate\Support\Facades\Validator::make($data, [
            'student_id' => ['required', 'exists:students,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'payment_date' => ['required', 'date'],
            'note' => ['nullable', 'string'],
            'months' => ['required', 'array', 'min:1'],
            'months.*.month' => ['required', 'integer', 'between:1,12'],
            'months.*.year' => ['required', 'integer'],
            'months.*.payment_type' => ['required', 'in:cash,saving'],
        ]);
        
        if ($validator->fails()) {
            $this->error('Validation Error: ' . json_encode($validator->errors()->all()));
            return;
        }
        
        $this->info('Validation OK');
        
        try {
            $service = app(\App\Services\PaymentService::class);
            $service->createPayment($data, 1);
            $this->info('Success');
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage() . ' File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        }
    }
}
