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
        Schema::table('invoices', function (Blueprint $table) {
            $table->index(['created_at', 'status', 'customer_phone'], 'invoices_created_status_phone_idx');
        });

        Schema::table('payment_slips', function (Blueprint $table) {
            $table->index(['created_at', 'verification_status', 'sender_phone'], 'slips_created_status_phone_idx');
        });

        Schema::table('reconciliation_matches', function (Blueprint $table) {
            $table->index(['created_at', 'match_type', 'status'], 'recon_matches_created_type_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_created_status_phone_idx');
        });

        Schema::table('payment_slips', function (Blueprint $table) {
            $table->dropIndex('slips_created_status_phone_idx');
        });

        Schema::table('reconciliation_matches', function (Blueprint $table) {
            $table->dropIndex('recon_matches_created_type_status_idx');
        });
    }
};
