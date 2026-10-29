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
        Schema::create('reconciliation_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('payment_slip_id')->nullable()->constrained('payment_slips')->nullOnDelete();
            $table->foreignId('bank_transaction_id')->nullable()->constrained('bank_transactions')->nullOnDelete();
            $table->foreignId('reconciled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('match_type'); // exact_match, fuzzy_match, fee_adjusted_match, amount_mismatch_fraud, fake_slip_fraud, duplicate_id_fraud, manual_override
            $table->decimal('confidence_score', 5, 2);
            $table->decimal('invoice_amount', 15, 2)->nullable();
            $table->decimal('slip_amount', 15, 2)->nullable();
            $table->decimal('bank_amount', 15, 2)->nullable();
            $table->decimal('variance_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('status')->default('pending_review'); // auto_approved, pending_review, approved_by_accountant, rejected_fraud
            $table->timestamps();

            $table->index(['match_type', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reconciliation_matches');
    }
};
