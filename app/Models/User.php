<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'nrc_number',
        'address',
        'emergency_contact',
        'company_name',
        'avatar_path',
        'is_blacklisted',
        'blacklist_reason',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'avatar_url',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_blacklisted' => 'boolean',
        ];
    }

    public function getAvatarUrlAttribute(): ?string
    {
        if ($this->avatar_path) {
            return asset('storage/' . $this->avatar_path);
        }

        return null;
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'user_id');
    }

    public function accountNotifications(): HasMany
    {
        return $this->hasMany(AccountNotification::class);
    }

    public function supportAppeals(): HasMany
    {
        return $this->hasMany(SupportAppeal::class);
    }

    public function paymentSlips(): HasMany
    {
        return $this->hasMany(PaymentSlip::class, 'user_id');
    }

    public function uploadedBatches(): HasMany
    {
        return $this->hasMany(BankStatementBatch::class, 'uploaded_by');
    }

    public function auditedReconciliations(): HasMany
    {
        return $this->hasMany(ReconciliationMatch::class, 'reconciled_by');
    }
}
