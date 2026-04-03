<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferTest extends TestCase
{
    use RefreshDatabase;

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function makeUser(): User
    {
        return User::factory()->create();
    }

    private function makeWallet(User $user, float $balance = 1_000_000): Wallet
    {
        return Wallet::factory()->create([
            'user_id' => $user->id,
            'balance' => $balance,
        ]);
    }

    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    public function test_transfer_moves_balance_between_wallets(): void
    {
        $user = $this->makeUser();
        $from = $this->makeWallet($user, 1_000_000);
        $to   = $this->makeWallet($user, 200_000);

        $this->actingAs($user)
            ->post('/wallets/transfer', [
                'from_wallet_id' => $from->id,
                'to_wallet_id'   => $to->id,
                'amount'         => 300_000,
                'note'           => 'Tabungan',
            ])->assertRedirect('/wallets');

        $this->assertEqualsWithDelta(700_000, $from->fresh()->balance, 0.01);
        $this->assertEqualsWithDelta(500_000, $to->fresh()->balance, 0.01);
    }

    public function test_transfer_creates_two_adjustment_transactions(): void
    {
        $user = $this->makeUser();
        $from = $this->makeWallet($user, 500_000);
        $to   = $this->makeWallet($user, 0);

        $this->actingAs($user)->post('/wallets/transfer', [
            'from_wallet_id' => $from->id,
            'to_wallet_id'   => $to->id,
            'amount'         => 100_000,
        ]);

        $this->assertDatabaseCount('transactions', 2);

        $this->assertDatabaseHas('transactions', [
            'user_id'   => $user->id,
            'wallet_id' => $from->id,
            'amount'    => 100_000,
            'type'      => 'adjustment',
        ]);

        $this->assertDatabaseHas('transactions', [
            'user_id'   => $user->id,
            'wallet_id' => $to->id,
            'amount'    => 100_000,
            'type'      => 'adjustment',
        ]);
    }

    public function test_transfer_descriptions_include_wallet_names(): void
    {
        $user = $this->makeUser();
        $from = Wallet::factory()->create(['user_id' => $user->id, 'name' => 'BCA', 'balance' => 500_000]);
        $to   = Wallet::factory()->create(['user_id' => $user->id, 'name' => 'GoPay', 'balance' => 0]);

        $this->actingAs($user)->post('/wallets/transfer', [
            'from_wallet_id' => $from->id,
            'to_wallet_id'   => $to->id,
            'amount'         => 50_000,
        ]);

        $this->assertDatabaseHas('transactions', ['description' => 'Transfer ke GoPay']);
        $this->assertDatabaseHas('transactions', ['description' => 'Transfer dari BCA']);
    }

    public function test_transfer_note_is_appended_to_description(): void
    {
        $user = $this->makeUser();
        $from = Wallet::factory()->create(['user_id' => $user->id, 'name' => 'BCA', 'balance' => 500_000]);
        $to   = Wallet::factory()->create(['user_id' => $user->id, 'name' => 'GoPay', 'balance' => 0]);

        $this->actingAs($user)->post('/wallets/transfer', [
            'from_wallet_id' => $from->id,
            'to_wallet_id'   => $to->id,
            'amount'         => 50_000,
            'note'           => 'Beli saham',
        ]);

        $this->assertDatabaseHas('transactions', ['description' => 'Transfer ke GoPay — Beli saham']);
        $this->assertDatabaseHas('transactions', ['description' => 'Transfer dari BCA — Beli saham']);
    }

    // -----------------------------------------------------------------------
    // Insufficient balance
    // -----------------------------------------------------------------------

    public function test_transfer_fails_when_source_wallet_has_insufficient_balance(): void
    {
        $user = $this->makeUser();
        $from = $this->makeWallet($user, 50_000);
        $to   = $this->makeWallet($user, 0);

        $response = $this->actingAs($user)->post('/wallets/transfer', [
            'from_wallet_id' => $from->id,
            'to_wallet_id'   => $to->id,
            'amount'         => 200_000,
        ]);

        $response->assertSessionHas('error');

        // Balances must be unchanged
        $this->assertEqualsWithDelta(50_000, $from->fresh()->balance, 0.01);
        $this->assertEqualsWithDelta(0, $to->fresh()->balance, 0.01);

        $this->assertDatabaseCount('transactions', 0);
    }

    // -----------------------------------------------------------------------
    // Same wallet guard
    // -----------------------------------------------------------------------

    public function test_transfer_to_same_wallet_is_rejected(): void
    {
        $user   = $this->makeUser();
        $wallet = $this->makeWallet($user, 500_000);

        $response = $this->actingAs($user)->post('/wallets/transfer', [
            'from_wallet_id' => $wallet->id,
            'to_wallet_id'   => $wallet->id,
            'amount'         => 100_000,
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseCount('transactions', 0);
    }

    // -----------------------------------------------------------------------
    // Cross-user isolation
    // -----------------------------------------------------------------------

    public function test_transfer_rejects_wallet_belonging_to_another_user(): void
    {
        $user      = $this->makeUser();
        $otherUser = $this->makeUser();

        $ownWallet   = $this->makeWallet($user, 500_000);
        $otherWallet = $this->makeWallet($otherUser, 0);

        // from = own, to = other user's wallet → validation must fail
        $this->actingAs($user)->post('/wallets/transfer', [
            'from_wallet_id' => $ownWallet->id,
            'to_wallet_id'   => $otherWallet->id,
            'amount'         => 100_000,
        ])->assertSessionHasErrors('to_wallet_id');

        $this->assertEqualsWithDelta(500_000, $ownWallet->fresh()->balance, 0.01);
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    public function test_transfer_requires_positive_amount(): void
    {
        $user = $this->makeUser();
        $from = $this->makeWallet($user, 500_000);
        $to   = $this->makeWallet($user, 0);

        $this->actingAs($user)->post('/wallets/transfer', [
            'from_wallet_id' => $from->id,
            'to_wallet_id'   => $to->id,
            'amount'         => 0,
        ])->assertSessionHasErrors('amount');
    }

    public function test_transfer_requires_mandatory_fields(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user)
            ->post('/wallets/transfer', [])
            ->assertSessionHasErrors(['from_wallet_id', 'to_wallet_id', 'amount']);
    }

    // -----------------------------------------------------------------------
    // Authentication guard
    // -----------------------------------------------------------------------

    public function test_unauthenticated_user_cannot_transfer(): void
    {
        $this->post('/wallets/transfer', [])->assertRedirect('/login');
    }
}
