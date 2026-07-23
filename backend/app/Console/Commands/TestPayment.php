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
        $data = [
            'student_id' => 1,
            'academic_year_id' => 1,
            'payment_date' => '2026-07-23',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash']
            ]
        ];
        
        try {
            $service = app(\App\Services\PaymentService::class);
            $service->createPayment($data, 1);
            $this->info('Success');
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage() . ' File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        }
    }
}
