<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('nrc_number')->nullable()->after('phone');
            $table->text('address')->nullable()->after('nrc_number');
            $table->string('emergency_contact')->nullable()->after('address');
        });

        Schema::table('bank_statement_batches', function (Blueprint $table) {
            $table->boolean('rollback_requested')->default(false)->after('status');
            $table->text('rollback_reason')->nullable()->after('rollback_requested');
            $table->timestamp('rollback_requested_at')->nullable()->after('rollback_reason');
            $table->foreignId('rollback_requested_by')->nullable()->after('rollback_requested_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bank_statement_batches', function (Blueprint $table) {
            $table->dropForeign(['rollback_requested_by']);
            $table->dropColumn(['rollback_requested', 'rollback_reason', 'rollback_requested_at', 'rollback_requested_by']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['nrc_number', 'address', 'emergency_contact']);
        });
    }
};
