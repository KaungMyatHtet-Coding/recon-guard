<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentSlip extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'user_id',
        'payment_channel',
        'image_path',
        'image_hash',
        'extracted_transaction_id',
        'extracted_amount',
        'extracted_datetime',
        'sender_phone',
        'sender_name',
        'ocr_confidence',
        'exif_tamper_flag',
        'exif_metadata',
        'verification_status',
    ];

    protected function casts(): array
    {
        return [
            'extracted_amount' => 'decimal:2',
            'extracted_datetime' => 'datetime',
            'ocr_confidence' => 'integer',
            'exif_tamper_flag' => 'boolean',
            'exif_metadata' => 'array',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reconciliationMatches(): HasMany
    {
        return $this->hasMany(ReconciliationMatch::class);
    }
}
