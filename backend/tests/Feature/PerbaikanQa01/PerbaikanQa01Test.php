<?php

namespace Tests\Feature\PerbaikanQa01;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use App\Models\Admin;
use App\Models\AcademicYear;
use App\Models\Student;
use App\Models\ExpenseCategory;
use App\Models\Setting;
use App\Models\Expense;
use App\Services\PaymentService;

class PerbaikanQa01Test extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): Admin
    {
        return Admin::create([
            'name' => 'Admin Fiktif',
            'email' => 'admin.fiktif@contoh.test',
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

    public function test_01_b1_batalkan_pembayaran_ditolak_422_jika_membuat_sisa_minus(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Andi Fiktif',
            'parent_name' => 'Wali Andi Fiktif',
            'phone' => '081200009001',
            'status' => 'active',
        ]);

        $payment1 = app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        $payment2 = app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-08-10',
            'months' => [
                ['month' => 8, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        $category = ExpenseCategory::create(['name' => 'Operasional']);

        Sanctum::actingAs($admin);

        // Pengeluaran kas 20.000 -> Sisa Kas jadi 0
        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Beli Alat Kelas',
            'amount' => 20000,
            'expense_date' => '2026-08-12',
        ])->assertStatus(201);

        // DELETE salah satu pembayaran -> 422 "Sisa tidak cukup."
        $delRes = $this->deleteJson("/api/payments/{$payment1->id}");
        $delRes->assertStatus(422);
        $delRes->assertJsonPath('message', 'Sisa tidak cukup.');
        $delRes->assertJsonPath('errors.payment.0', 'Sisa tidak cukup.');

        // Pembayaran dan payment_months masih ada
        $this->assertDatabaseHas('payments', [
            'id' => $payment1->id,
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('payment_months', [
            'payment_id' => $payment1->id,
            'month' => 7,
        ]);
        $this->assertDatabaseHas('payments', [
            'id' => $payment2->id,
            'deleted_at' => null,
        ]);

        // cash.sisa tetap 0
        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertJsonPath('data.cash.sisa', 0);
    }

    public function test_02_b1_batalkan_pembayaran_berhasil_jika_sisa_cukup(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Bela Fiktif',
            'parent_name' => 'Wali Bela Fiktif',
            'phone' => '081200009002',
            'status' => 'active',
        ]);

        $payment1 = app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-08-10',
            'months' => [
                ['month' => 8, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ], $admin->id);

        $category = ExpenseCategory::create(['name' => 'Kebersihan']);

        Sanctum::actingAs($admin);

        // Pakai 5.000 dari 20.000 (Sisa 15.000 >= 10.000)
        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Beli Kemoceng',
            'amount' => 5000,
            'expense_date' => '2026-08-12',
        ])->assertStatus(201);

        $this->deleteJson("/api/payments/{$payment1->id}")
            ->assertStatus(200);

        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertJsonPath('data.cash.terkumpul', 10000)
            ->assertJsonPath('data.cash.dipakai', 5000)
            ->assertJsonPath('data.cash.sisa', 5000);
    }

    public function test_03_b1_batalkan_pembayaran_both_ditolak_jika_salah_satu_dompet_tidak_cukup(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Citra Fiktif',
            'parent_name' => 'Wali Citra Fiktif',
            'phone' => '081200009003',
            'status' => 'active',
        ]);

        // Pembayaran both: kas 10.000 + tabungan 5.000
        $paymentBoth = app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 7, 'year' => 2026, 'payment_type' => 'saving'],
            ],
        ], $admin->id);

        $category = ExpenseCategory::create(['name' => 'Kegiatan']);

        Sanctum::actingAs($admin);

        // Pakai tabungan 4.000 (Sisa Tabungan tinggal 1.000, Sisa Kas masih 10.000)
        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'saving',
            'title' => 'Keperluan Tabungan',
            'amount' => 4000,
            'expense_date' => '2026-07-15',
        ])->assertStatus(201);

        // Batalkan paymentBoth -> Sisa Tabungan tidak cukup (1.000 - 5.000 < 0) -> 422
        $res = $this->deleteJson("/api/payments/{$paymentBoth->id}");
        $res->assertStatus(422);
        $res->assertJsonPath('message', 'Sisa tidak cukup.');

        // Tidak ada yang terhapus (baik bulan kas maupun tabungan masih utuh)
        $this->assertEquals(2, $paymentBoth->paymentMonths()->count());
        $this->assertNull($paymentBoth->fresh()->deleted_at);
    }

    public function test_04_b1_poin_2e_dompet_sudah_minus_tetap_bisa_diubah_jika_nominal_tidak_bertambah(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $category = ExpenseCategory::create(['name' => 'Lainnya']);

        // Buat pengeluaran langsung di DB tanpa pemasukan sehingga dompet minus (-30.000)
        $expense = Expense::create([
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'admin_id' => $admin->id,
            'source' => 'cash',
            'title' => 'Pengeluaran Lama',
            'amount' => 30000,
            'expense_date' => '2026-07-20',
        ]);

        Sanctum::actingAs($admin);

        // PUT dengan amount sama (30.000) -> 200
        $this->putJson("/api/expenses/{$expense->id}", [
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Pengeluaran Lama Revisi Judul',
            'amount' => 30000,
            'expense_date' => '2026-07-20',
        ])->assertStatus(200);

        // PUT dengan amount lebih kecil (20.000) -> 200
        $this->putJson("/api/expenses/{$expense->id}", [
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Pengeluaran Lama Dikurangi',
            'amount' => 20000,
            'expense_date' => '2026-07-20',
        ])->assertStatus(200);

        // PUT dengan amount lebih besar (25.000 > 20.000 saat dompet masih minus) -> 422
        $this->putJson("/api/expenses/{$expense->id}", [
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Pengeluaran Lama Dinaikkan',
            'amount' => 25000,
            'expense_date' => '2026-07-20',
        ])->assertStatus(422)
          ->assertJsonPath('message', 'Nominal melebihi Sisa.');
    }

    public function test_05_v3_total_pengeluaran_dashboard_admin_sama_dengan_publik_dari_tiga_dompet(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Damar Fiktif',
            'parent_name' => 'Wali Damar Fiktif',
            'phone' => '081200009005',
            'status' => 'active',
        ]);

        // Kas 10.000, Tabungan 5.000
        app(PaymentService::class)->createPayment([
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 7, 'year' => 2026, 'payment_type' => 'saving'],
            ],
        ], $admin->id);

        $category = ExpenseCategory::create(['name' => 'Umum']);

        Sanctum::actingAs($admin);

        // Pemasukan tambahan 20.000
        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Donasi Kelas',
            'amount' => 20000,
        ])->assertStatus(201);

        // Pengeluaran dari 3 dompet: cash 4.000, saving 2.000, additional_income 7.000 -> total 13.000
        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'cash',
            'title' => 'Pengeluaran Kas',
            'amount' => 4000,
            'expense_date' => '2026-08-02',
        ])->assertStatus(201);

        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'saving',
            'title' => 'Pengeluaran Tabungan',
            'amount' => 2000,
            'expense_date' => '2026-08-03',
        ])->assertStatus(201);

        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Pengeluaran Tambahan',
            'amount' => 7000,
            'expense_date' => '2026-08-04',
        ])->assertStatus(201);

        $adminDash = $this->getJson("/api/dashboard?academic_year_id={$ay->id}");
        $adminDash->assertStatus(200);

        $pubDash = $this->getJson('/api/public/dashboard/summary');
        $pubDash->assertStatus(200);

        $this->assertEquals(13000, $adminDash->json('data.total_expense'));
        $this->assertEquals(
            $pubDash->json('data.expenses.total'),
            $adminDash->json('data.total_expense')
        );
        $this->assertEquals(7000, $adminDash->json('data.additional_income_expense'));
        // cash_balance tetap sisa kas murni (10.000 - 4.000 = 6.000)
        $this->assertEquals(6000, $adminDash->json('data.cash_balance'));
    }

    public function test_06_l1_pencarian_publik_aman_dari_karakter_wildcard(): void
    {
        $ay = $this->createAcademicYear();

        Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Bima Fiktif',
            'parent_name' => 'Wali Bima Fiktif',
            'phone' => '081200009006',
            'status' => 'active',
        ]);

        // "%%%" dan "___" -> 400 dan tidak mengembalikan data siswa
        $resPercent = $this->getJson('/api/public/students/search?query=' . urlencode('%%%'));
        $resPercent->assertStatus(400)
            ->assertJsonPath('message', 'Masukkan minimal 3 huruf nama siswa.');
        $this->assertNull($resPercent->json('data'));

        $resUnderscore = $this->getJson('/api/public/students/search?query=' . urlencode('___'));
        $resUnderscore->assertStatus(400)
            ->assertJsonPath('message', 'Masukkan minimal 3 huruf nama siswa.');
        $this->assertNull($resUnderscore->json('data'));

        // "%a%" (hanya 1 huruf) -> 400
        $this->getJson('/api/public/students/search?query=' . urlencode('%a%'))
            ->assertStatus(400)
            ->assertJsonPath('message', 'Masukkan minimal 3 huruf nama siswa.');

        // 2 huruf -> 400 dengan pesan lama
        $this->getJson('/api/public/students/search?query=Bi')
            ->assertStatus(400)
            ->assertJsonPath('message', 'Masukkan minimal 3 huruf nama siswa.');

        // "Bim%" dan "Bim_" -> 200 dengan data kosong (tidak membocorkan "Bima Fiktif")
        $this->getJson('/api/public/students/search?query=' . urlencode('Bim%'))
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/public/students/search?query=' . urlencode('Bim_'))
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');

        // Nama biasa "Bima" -> 200 dan menemukan "Bima Fiktif" beserta parent_name
        $resValid = $this->getJson('/api/public/students/search?query=Bima');
        $resValid->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.student_name', 'Bima Fiktif')
            ->assertJsonPath('data.0.parent_name', 'Wali Bima Fiktif');
    }

    public function test_07_b4_batas_nominal_maksimal_satu_miliar_dan_ringkasan_tetap_200(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $category = ExpenseCategory::create(['name' => 'Besar']);

        Sanctum::actingAs($admin);

        // 1.000.000.001 -> 422 dengan pesan "Nominal maksimal Rp 1.000.000.000."
        $overIncome = $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Dana Terlalu Besar',
            'amount' => 1000000001,
        ]);
        $overIncome->assertStatus(422)
            ->assertJsonPath('errors.amount.0', 'Nominal maksimal Rp 1.000.000.000.');

        $overExpense = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Pengeluaran Terlalu Besar',
            'amount' => 1000000001,
            'expense_date' => '2026-08-02',
        ]);
        $overExpense->assertStatus(422)
            ->assertJsonPath('errors.amount.0', 'Nominal maksimal Rp 1.000.000.000.');

        // 1.000.000.000 diterima (beberapa baris besar yang sah)
        for ($i = 1; $i <= 3; $i++) {
            $this->postJson('/api/additional-incomes', [
                'academic_year_id' => $ay->id,
                'income_date' => '2026-08-01',
                'description' => "Dana Besar Sah {$i}",
                'amount' => 1000000000,
            ])->assertStatus(201);
        }

        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Pengeluaran Besar Sah',
            'amount' => 1000000000,
            'expense_date' => '2026-08-02',
        ])->assertStatus(201);

        // GET /api/wallets/summary dan GET /api/public/dashboard/summary tetap 200
        $this->getJson("/api/wallets/summary?academic_year_id={$ay->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.additional_income.terkumpul', 3000000000)
            ->assertJsonPath('data.additional_income.dipakai', 1000000000)
            ->assertJsonPath('data.additional_income.sisa', 2000000000);

        $this->getJson('/api/public/dashboard/summary')
            ->assertStatus(200)
            ->assertJsonPath('data.additional_income.sisa', 2000000000);
    }

    public function test_08_dan_09_b8_b3_minimal_nominal_dan_pesan_validasi_bahasa_indonesia(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $category = ExpenseCategory::create(['name' => 'Kecil']);

        Sanctum::actingAs($admin);

        // B3: description kosong pada pemasukan tambahan -> pesan Bahasa Indonesia
        $emptyDesc = $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => '',
            'amount' => 1000,
        ]);
        $emptyDesc->assertStatus(422)
            ->assertJsonPath('errors.description.0', 'Keterangan wajib diisi.');

        // B8: amount 0 ditolak dengan pesan Bahasa Indonesia "Nominal harus lebih dari 0."
        $zeroIncome = $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Tes Nol',
            'amount' => 0,
        ]);
        $zeroIncome->assertStatus(422)
            ->assertJsonPath('errors.amount.0', 'Nominal harus lebih dari 0.');

        $zeroExpense = $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Pengeluaran Nol',
            'amount' => 0,
            'expense_date' => '2026-08-02',
        ]);
        $zeroExpense->assertStatus(422)
            ->assertJsonPath('errors.amount.0', 'Nominal harus lebih dari 0.');

        // B8: amount 1 diterima (pemasukan tambahan dan pengeluaran)
        $this->postJson('/api/additional-incomes', [
            'academic_year_id' => $ay->id,
            'income_date' => '2026-08-01',
            'description' => 'Satu Rupiah Masuk',
            'amount' => 1,
        ])->assertStatus(201);

        $this->postJson('/api/expenses', [
            'academic_year_id' => $ay->id,
            'category_id' => $category->id,
            'source' => 'additional_income',
            'title' => 'Satu Rupiah Keluar',
            'amount' => 1,
            'expense_date' => '2026-08-02',
        ])->assertStatus(201);
    }

    public function test_10_l2_bulan_sama_dipilih_dua_kali_dalam_satu_kiriman_ditolak_422(): void
    {
        $admin = $this->createAdmin();
        $ay = $this->createAcademicYear();
        $this->initSettings();

        $student = Student::create([
            'academic_year_id' => $ay->id,
            'student_name' => 'Eka Fiktif',
            'parent_name' => 'Wali Eka Fiktif',
            'phone' => '081200009010',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $res = $this->postJson('/api/payments', [
            'student_id' => $student->id,
            'academic_year_id' => $ay->id,
            'payment_date' => '2026-07-10',
            'months' => [
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
                ['month' => 7, 'year' => 2026, 'payment_type' => 'cash'],
            ],
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('message', 'Bulan yang sama dipilih dua kali.');
    }
}
