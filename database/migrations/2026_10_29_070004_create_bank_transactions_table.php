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
        Schema::create('bank_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('bank_statement_batches')->cascadeOnDelete();
            $table->string('payment_channel'); // kbzpay, wavepay, cbpay, ayapay
            $table->string('bank_transaction_id');
            $table->dateTime('transaction_datetime');
            $table->string('sender_phone')->nullable();
            $table->string('sender_name')->nullable();
            $table->decimal('gross_amount', 15, 2);
            $table->decimal('fee_amount', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2);
            $table->string('reference_note')->nullable();
            $table->json('raw_payload')->nullable();
            $table->string('match_status')->default('unmatched'); // unmatched, matched, fuzzy_matched, suspense, disputed
            $table->timestamps();

            // Unique bank_transaction_id per payment channel
            $table->unique(['payment_channel', 'bank_transaction_id']);

            // Composite index for fast 3-way reconciliation lookups
            $table->index(['payment_channel', 'bank_transaction_id', 'match_status'], 'bt_channel_tx_status_idx');
            $table->index(['payment_channel', 'transaction_datetime']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_transactions');
    }
};
