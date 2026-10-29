<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankStatementBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'uploaded_by',
        'payment_channel',
        'original_filename',
        'statement_date',
        'total_records',
        'total_credit_amount',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'statement_date' => 'date',
            'total_records' => 'integer',
            'total_credit_amount' => 'decimal:2',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(BankTransaction::class, 'batch_id');
    }
}
