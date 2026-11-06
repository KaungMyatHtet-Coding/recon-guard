<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PaymentSlip>
 */
class PaymentSlipFactory extends Factory
{
    protected $model = PaymentSlip::class;

    public function definition(): array
    {
        return [
            'invoice_id'               => Invoice::factory(),
            'user_id'                  => User::factory(),
            'payment_channel'          => fake()->randomElement(['kbzpay', 'wavepay', 'cbpay', 'ayapay']),
            'image_path'               => 'payment_slips/' . Str::random(40) . '.jpg',
            'image_hash'               => hash('sha256', Str::random(64)),
            'extracted_transaction_id' => strtoupper(Str::random(12)),
            'extracted_amount'         => fake()->randomFloat(2, 10000, 500000),
            'extracted_datetime'       => null,
            'sender_phone'             => '09' . fake()->numerify('#########'),
            'sender_name'              => fake()->name(),
            'ocr_confidence'           => fake()->numberBetween(60, 99),
            'exif_tamper_flag'         => false,
            'exif_metadata'            => null,
            'verification_status'      => 'pending_recon',
        ];
    }
}
