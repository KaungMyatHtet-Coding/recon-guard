<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReconciliationMatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'payment_slip_id',
        'bank_transaction_id',
        'reconciled_by',
        'match_type',
        'confidence_score',
        'invoice_amount',
        'slip_amount',
        'bank_amount',
        'variance_amount',
        'notes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'confidence_score' => 'decimal:2',
            'invoice_amount' => 'decimal:2',
            'slip_amount' => 'decimal:2',
            'bank_amount' => 'decimal:2',
            'variance_amount' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function paymentSlip(): BelongsTo
    {
        return $this->belongsTo(PaymentSlip::class);
    }

    public function bankTransaction(): BelongsTo
    {
        return $this->belongsTo(BankTransaction::class);
    }

    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }
}
