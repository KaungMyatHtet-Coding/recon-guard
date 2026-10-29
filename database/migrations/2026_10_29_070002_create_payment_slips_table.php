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
        Schema::create('payment_slips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('payment_channel'); // kbzpay, wavepay, cbpay, ayapay
            $table->string('image_path');
            $table->string('image_hash', 64)->index(); // SHA-256 hash of file
            $table->string('extracted_transaction_id')->nullable()->index();
            $table->decimal('extracted_amount', 15, 2)->nullable();
            $table->dateTime('extracted_datetime')->nullable();
            $table->string('sender_phone')->nullable();
            $table->string('sender_name')->nullable();
            $table->unsignedTinyInteger('ocr_confidence')->default(0);
            $table->boolean('exif_tamper_flag')->default(false);
            $table->json('exif_metadata')->nullable();
            $table->string('verification_status')->default('pending_recon'); // pending_recon, matched, fuzzy_matched, tampered_fraud, duplicate_fraud, unmatched
            $table->timestamps();

            $table->index(['payment_channel', 'verification_status']);
            $table->index(['invoice_id', 'verification_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_slips');
    }
};
