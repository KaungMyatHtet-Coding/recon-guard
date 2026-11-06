<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        return [
            'user_id'          => User::factory(),
            'invoice_number'   => 'INV-' . date('Y') . '-' . strtoupper(Str::random(6)),
            'customer_name'    => fake()->name(),
            'customer_phone'   => '09' . fake()->numerify('#########'),
            'description'      => fake()->sentence(),
            'amount'           => fake()->randomFloat(2, 10000, 500000),
            'expected_channel' => fake()->randomElement(['kbzpay', 'wavepay', 'cbpay', 'ayapay', 'any']),
            'status'           => 'unpaid',
            'due_date'         => null,
        ];
    }
}
