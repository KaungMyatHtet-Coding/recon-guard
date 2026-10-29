<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'payment_channel',
        'bank_transaction_id',
        'transaction_datetime',
        'sender_phone',
        'sender_name',
        'gross_amount',
        'fee_amount',
        'net_amount',
        'reference_note',
        'raw_payload',
        'match_status',
    ];

    protected function casts(): array
    {
        return [
            'transaction_datetime' => 'datetime',
            'gross_amount' => 'decimal:2',
            'fee_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'raw_payload' => 'array',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(BankStatementBatch::class, 'batch_id');
    }

    public function reconciliationMatches(): HasMany
    {
        return $this->hasMany(ReconciliationMatch::class);
    }
}
