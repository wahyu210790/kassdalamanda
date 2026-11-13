<?php

namespace Tests\Feature\PerbaikanBug01;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use App\Models\Admin;
use App\Models\AcademicYear;
use App\Models\Student;
use App\Models\ExpenseCategory;
use App\Models\Setting;
use App\Models\Payment;
use App\Models\Expense;
use App\Enums\PaymentType;
use App\Services\PaymentService;

class PerbaikanBug01Test extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): Admin
    {
        return Admin::create([
            'name' => 'Admin Tes',
            'email' => 'admin.tes@contoh.test',
            'password' => Hash::make('password-tes-123'),
        ]);
    }

    private function createAcademicYear(): AcademicYear
    {
        return AcademicYear::create([
            'name' => '2026/2027',
            'start_date' => '2026-07-01',
            'end_date' => '2027-06-30',
            'is_active' => true,
        ]);
    }

    private function initSettings(): void
    {
        Setting::set('monthly_cash_amount', 10000);
        Setting::set('monthly_saving_amount', 5000);
    }

    public function test_01_alamat_dan_file_uji_test_payment_tidak_ada(): void
    {
        $response = $this->get('/api/test-payment');
        $response->assertStatus(404);

        $commands = Artisan::all();
        $this->assertFalse(array_key_exists('app:test-payment', $commands), 'Perintah app:test-payment tidak boleh terdaftar');

        $this->assertFileDoesNotExist(base_path('test_payment.php'));
        $this->assertFileDoesNotExist(base_path('app/Console/Commands/TestPayment.php'));
    }

    public function test_02_student_detail_berisi_bulan_lunas_dan_tolak_duplikat(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Budi Santoso',
            'parent_name' => 'Santoso',
            'phone' => '08123456789',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        // Bayar kas Juli (7) dan Agustus (8)
        $paymentData = [
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-20',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 8, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ];

        app(PaymentService::class)->createPayment($paymentData, $admin->id);

        // GET student detail
        $res = $this->getJson("/api/students/{$student->id}");
        $res->assertStatus(200);

        $payments = $res->json('data.payments');
        $this->assertNotEmpty($payments);

        $months = collect($payments)->flatMap(fn($p) => $p['months']);
        $cashMonths = $months->where('payment_type', 'cash')->pluck('month')->all();
        $this->assertContains(7, $cashMonths);
        $this->assertContains(8, $cashMonths);

        // POST payment untuk bulan yang sama harus 422
        $duplicateRes = $this->postJson('/api/payments', [
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-21',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ]);
        $duplicateRes->assertStatus(422);
    }

    public function test_03_post_expenses_memakai_category_id_dan_validasi_pesan(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        // Siapkan saldo kas lewat 1 pembayaran
        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Siswa Tes',
            'parent_name' => 'Wali Tes',
            'phone' => '08120000001',
            'status' => 'active',
        ]);

        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-05',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 8, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        $category = ExpenseCategory::create(['name' => 'Operasional']);

        Sanctum::actingAs($admin);

        // POST tanpa title dan source -> 422 dengan pesan Bahasa Indonesia
        $failedRes = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'expense_category_id' => $category->id,
            'amount' => 5000,
            'expense_date' => '2026-07-10',
        ]);
        $failedRes->assertStatus(422);
        $failedRes->assertJsonValidationErrors([
            'title' => 'Keterangan wajib diisi.',
            'source' => 'Diambil dari wajib dipilih.',
        ]);

        // POST tanpa category_id -> 201 (kategori opsional)
        $noCategoryRes = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'source' => 'cash',
            'title' => 'Beli Penghapus Papan',
            'amount' => 3000,
            'expense_date' => '2026-07-10',
        ]);
        $noCategoryRes->assertStatus(201);
        $this->assertDatabaseHas('expenses', [
            'title' => 'Beli Penghapus Papan',
            'category_id' => null,
            'amount' => 3000,
        ]);

        // POST dengan category_id yang sah -> 201
        $successRes = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Beli Spidol',
            'amount' => 5000,
            'expense_date' => '2026-07-10',
        ]);
        $successRes->assertStatus(201);
        $this->assertDatabaseHas('expenses', [
            'title' => 'Beli Spidol',
            'category_id' => $category->id,
            'amount' => 5000,
        ]);
    }

    public function test_04_dashboard_recent_expenses_berupa_teks_dan_format_tanggal(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $category = ExpenseCategory::create(['name' => 'Kebersihan']);

        Expense::create([
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'admin_id' => $admin->id,
            'source' => 'cash',
            'title' => 'Beli Sapu',
            'amount' => 15000,
            'expense_date' => '2026-07-15',
        ]);

        Sanctum::actingAs($admin);

        $res = $this->getJson("/api/dashboard?academic_year_id={$ay->id}");
        $res->assertStatus(200);

        $recentExpenses = $res->json('data.recent_expenses');
        $this->assertNotEmpty($recentExpenses);
        $firstExpense = $recentExpenses[0];

        $this->assertIsString($firstExpense['category']);
        $this->assertEquals('Kebersihan', $firstExpense['category']);
        $this->assertEquals('2026-07-15', $firstExpense['expense_date']);
    }

    public function test_05_payments_pagination_page_2_berisi_data(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        Sanctum::actingAs($admin);

        for ($i = 1; $i <= 21; $i++) {
            $student = Student::create([
                'academic_year_id' => $ay->id,
                'student_name' => "Siswa {$i}",
                'parent_name' => "Wali {$i}",
                'phone' => '0812' . str_pad((string)$i, 8, '0', STR_PAD_LEFT),
                'status' => 'active',
            ]);

            Payment::create([
                'student_id' => $student->id,
                'academic_year_id' => $ay->id,
                'admin_id' => $admin->id,
                'payment_date' => '2026-07-10',
                'payment_type' => 'cash',
                'total_amount' => 10000,
            ]);
        }

        $res = $this->getJson("/api/payments?academic_year_id={$ay->id}&page=2");
        $res->assertStatus(200);
        $res->assertJsonPath('meta.last_page', 2);
        $this->assertCount(1, $res->json('data'));
    }

    public function test_06_public_dashboard_summary_berisi_academic_year(): void
    {
        $ay = $this->createAcademicYear();

        $res = $this->getJson('/api/public/dashboard/summary');
        $res->assertStatus(200);

        $res->assertJsonStructure([
            'data' => [
                'cash_balance',
                'saving_balance',
                'total_expense',
                'student_count',
                'academic_year' => [
                    'name',
                    'start_date',
                    'end_date',
                ],
            ],
        ]);

        $this->assertEquals($ay->name, $res->json('data.academic_year.name'));
    }

    public function test_07_jenis_pembayaran_both_hanya_jika_kas_dan_tabungan_bersama(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();
        $service = app(PaymentService::class);

        Sanctum::actingAs($admin);

        // Murid 1: dua bulan kas saja -> payment_type = cash (bukan both)
        $student1 = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Murid Kas Dua Bulan',
            'parent_name' => 'Wali 1',
            'phone' => '081200000101',
            'status' => 'active',
        ]);

        $payment1 = $service->createPayment([
            'student_id' => $student1->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 8, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        $this->assertEquals(PaymentType::Cash, $payment1->fresh()->payment_type);
        $this->assertEquals(20000, $payment1->total_amount);
        $this->assertCount(2, $payment1->paymentMonths);
        foreach ($payment1->paymentMonths as $pm) {
            $this->assertEquals(PaymentType::Cash, $pm->payment_type);
        }

        // Murid 2: dua bulan tabungan saja -> payment_type = saving (bukan both)
        $student2 = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Murid Tabungan Dua Bulan',
            'parent_name' => 'Wali 2',
            'phone' => '081200000102',
            'status' => 'active',
        ]);

        $payment2 = $service->createPayment([
            'student_id' => $student2->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-11',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'saving'],
                ['month' => 8, 'year' => 2026, 'payment_type' => 'saving'],
            ],
        ], $admin->id);

        $this->assertEquals(PaymentType::Saving, $payment2->fresh()->payment_type);
        $this->assertEquals(10000, $payment2->total_amount);
        $this->assertCount(2, $payment2->paymentMonths);
        foreach ($payment2->paymentMonths as $pm) {
            $this->assertEquals(PaymentType::Saving, $pm->payment_type);
        }

        // Murid 3: satu bulan kas + satu bulan tabungan -> payment_type = both
        $student3 = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Murid Gabungan',
            'parent_name' => 'Wali 3',
            'phone' => '081200000103',
            'status' => 'active',
        ]);

        $payment3 = $service->createPayment([
            'student_id' => $student3->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-12',
            'note' => 'Catatan uji',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 7, 'year' => 2026, 'payment_type' => 'saving'],
            ],
        ], $admin->id);

        $this->assertEquals(PaymentType::Both, $payment3->fresh()->payment_type);
        $this->assertEquals(15000, $payment3->total_amount);
        $this->assertEquals('Catatan uji', $payment3->fresh()->note);
        $types3 = $payment3->paymentMonths->pluck('payment_type')->all();
        $this->assertContains(PaymentType::Cash, $types3);
        $this->assertContains(PaymentType::Saving, $types3);
        $this->assertNotContains(PaymentType::Both, $types3);

        // Murid 4: satu bulan kas saja -> payment_type = cash
        $student4 = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Murid Kas Satu Bulan',
            'parent_name' => 'Wali 4',
            'phone' => '081200000104',
            'status' => 'active',
        ]);

        $payment4 = $service->createPayment([
            'student_id' => $student4->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-13',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        $this->assertEquals(PaymentType::Cash, $payment4->fresh()->payment_type);

        // Percobaan bayar ulang bulan kas yang sama (bulan 7 pada murid 1) -> 422 & nama bulan Indonesia "Juli" (bukan "July")
        $duplicateRes = $this->postJson('/api/payments', [
            'student_id' => $student1->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-14',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ]);

        $duplicateRes->assertStatus(422);
        $message = $duplicateRes->json('message');
        $this->assertStringContainsString('Juli', $message);
        $this->assertStringNotContainsString('July', $message);
    }
}
