<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
            });

            DB::statement('ALTER TABLE expenses MODIFY COLUMN category_id BIGINT UNSIGNED NULL');

            Schema::table('expenses', function (Blueprint $table) {
                $table->foreign('category_id')
                    ->references('id')
                    ->on('expense_categories')
                    ->nullOnDelete();
            });
        } else {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
                $table->unsignedBigInteger('category_id')->nullable()->change();
                $table->foreign('category_id')
                    ->references('id')
                    ->on('expense_categories')
                    ->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('expenses')->whereNull('category_id')->exists()) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
            });

            DB::statement('ALTER TABLE expenses MODIFY COLUMN category_id BIGINT UNSIGNED NOT NULL');

            Schema::table('expenses', function (Blueprint $table) {
                $table->foreign('category_id')
                    ->references('id')
                    ->on('expense_categories')
                    ->cascadeOnDelete();
            });
        } else {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
                $table->unsignedBigInteger('category_id')->nullable(false)->change();
                $table->foreign('category_id')
                    ->references('id')
                    ->on('expense_categories')
                    ->cascadeOnDelete();
            });
        }
    }
};
