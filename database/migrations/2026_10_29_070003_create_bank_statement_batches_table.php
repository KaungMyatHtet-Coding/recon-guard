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
        Schema::create('bank_statement_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('payment_channel'); // kbzpay, wavepay, cbpay, ayapay
            $table->string('original_filename');
            $table->date('statement_date');
            $table->integer('total_records')->default(0);
            $table->decimal('total_credit_amount', 15, 2)->default(0);
            $table->string('status')->default('uploaded'); // uploaded, processed, reconciled
            $table->timestamps();

            $table->index(['payment_channel', 'statement_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_statement_batches');
    }
};
