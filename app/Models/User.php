<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\AiAnalysis;
use App\Models\Budget;
use App\Models\Category;
use App\Models\ChatMessage;
use App\Models\SavingsGoal;
use App\Models\Transaction;
use App\Models\Wallet;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'two_factor_secret',
        'two_factor_confirmed_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
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
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function hasTwoFactorEnabled(): bool
    {
        return ! is_null($this->two_factor_secret) && ! is_null($this->two_factor_confirmed_at);
    }

    public function twoFactorQrCodeUrl(): string
    {
        $google2fa = new \PragmaRX\Google2FA\Google2FA();

        return $google2fa->getQRCodeUrl(
            config('app.name'),
            $this->email,
            $this->two_factor_secret
        );
    }

    public function wallets()
    {
        return $this->hasMany(Wallet::class);
    }

    public function categories()
    {
        return $this->hasMany(Category::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }

    public function chatMessages()
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function aiAnalyses()
    {
        return $this->hasMany(AiAnalysis::class);
    }

    public function savingsGoals()
    {
        return $this->hasMany(SavingsGoal::class);
    }
}
