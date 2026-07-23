<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$request = Illuminate\Http\Request::create('/api/payments', 'POST', [
    'student_id' => 1,
    'academic_year_id' => 1,
    'payment_date' => '2026-07-23',
    'months' => [
        ['month' => 7, 'year' => 2026, 'payment_type' => 'cash']
    ]
]);

// Auth actingAs
$admin = \App\Models\Admin::first();
$request->setUserResolver(function () use ($admin) {
    return $admin;
});

$response = $kernel->handle($request);

echo "Status: " . $response->getStatusCode() . PHP_EOL;
echo "Content: " . $response->getContent() . PHP_EOL;

$kernel->terminate($request, $response);
