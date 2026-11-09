<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Blacklist extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'phone_number',
        'reason',
        'blacklisted_by',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function blacklistedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blacklisted_by');
    }

    /**
     * Check if a phone number or user is actively blacklisted.
     */
    public static function isPhoneOrUserBlacklisted(?string $phone, ?int $userId = null): bool
    {
        if ($userId && static::where('user_id', $userId)->exists()) {
            return true;
        }

        if ($userId && User::where('id', $userId)->where('is_blacklisted', true)->exists()) {
            return true;
        }

        if (!empty($phone)) {
            $cleanPhone = trim($phone);
            if (static::where('phone_number', $cleanPhone)->exists()) {
                return true;
            }
            if (BlacklistRecommendation::where('customer_phone', $cleanPhone)->where('status', 'approved')->exists()) {
                return true;
            }
            if (User::where('phone', $cleanPhone)->where('is_blacklisted', true)->exists()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the recorded audit reason for the restriction.
     */
    public static function getReasonFor(?string $phone, ?int $userId = null): string
    {
        if ($userId) {
            $rec = static::where('user_id', $userId)->first();
            if ($rec && !empty($rec->reason)) return $rec->reason;

            $user = User::find($userId);
            if ($user && !empty($user->blacklist_reason)) return $user->blacklist_reason;
        }

        if (!empty($phone)) {
            $cleanPhone = trim($phone);
            $rec = static::where('phone_number', $cleanPhone)->first();
            if ($rec && !empty($rec->reason)) return $rec->reason;

            $approvedRec = BlacklistRecommendation::where('customer_phone', $cleanPhone)->where('status', 'approved')->first();
            if ($approvedRec && !empty($approvedRec->reason)) return $approvedRec->reason;

            $user = User::where('phone', $cleanPhone)->first();
            if ($user && !empty($user->blacklist_reason)) return $user->blacklist_reason;
        }

        return 'This phone number has been flagged and suspended due to compliance violations or suspicious slip activity.';
    }
}
