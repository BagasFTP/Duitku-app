<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionTest extends TestCase
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

    private function makeCategory(User $user, string $type = 'expense'): Category
    {
        return Category::factory()->create([
            'user_id' => $user->id,
            'type'    => $type,
        ]);
    }

    // -----------------------------------------------------------------------
    // store — income
    // -----------------------------------------------------------------------

    public function test_income_transaction_increases_wallet_balance(): void
    {
        $user     = $this->makeUser();
        $wallet   = $this->makeWallet($user, 500_000);
        $category = $this->makeCategory($user, 'income');

        $this->actingAs($user)->post('/transactions', [
            'amount'      => 200_000,
            'type'        => 'income',
            'description' => 'Gaji',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ])->assertRedirect('/transactions');

        $this->assertDatabaseHas('transactions', [
            'user_id'   => $user->id,
            'wallet_id' => $wallet->id,
            'amount'    => 200_000,
            'type'      => 'income',
        ]);

        $this->assertEqualsWithDelta(700_000, $wallet->fresh()->balance, 0.01);
    }

    // -----------------------------------------------------------------------
    // store — expense
    // -----------------------------------------------------------------------

    public function test_expense_transaction_decreases_wallet_balance(): void
    {
        $user     = $this->makeUser();
        $wallet   = $this->makeWallet($user, 1_000_000);
        $category = $this->makeCategory($user, 'expense');

        $this->actingAs($user)->post('/transactions', [
            'amount'      => 150_000,
            'type'        => 'expense',
            'description' => 'Makan siang',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ])->assertRedirect('/transactions');

        $this->assertEqualsWithDelta(850_000, $wallet->fresh()->balance, 0.01);
    }

    // -----------------------------------------------------------------------
    // store — validation
    // -----------------------------------------------------------------------

    public function test_store_requires_mandatory_fields(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user)
            ->post('/transactions', [])
            ->assertSessionHasErrors(['amount', 'type', 'date', 'category_id', 'wallet_id']);
    }

    public function test_store_rejects_negative_amount(): void
    {
        $user     = $this->makeUser();
        $wallet   = $this->makeWallet($user);
        $category = $this->makeCategory($user);

        $this->actingAs($user)->post('/transactions', [
            'amount'      => -100,
            'type'        => 'expense',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ])->assertSessionHasErrors('amount');
    }

    public function test_store_rejects_category_belonging_to_another_user(): void
    {
        $user      = $this->makeUser();
        $otherUser = $this->makeUser();
        $wallet    = $this->makeWallet($user);
        $category  = $this->makeCategory($otherUser); // belongs to someone else

        $this->actingAs($user)->post('/transactions', [
            'amount'      => 50_000,
            'type'        => 'expense',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ])->assertSessionHasErrors('category_id');
    }

    public function test_store_rejects_wallet_belonging_to_another_user(): void
    {
        $user      = $this->makeUser();
        $otherUser = $this->makeUser();
        $wallet    = $this->makeWallet($otherUser); // belongs to someone else
        $category  = $this->makeCategory($user);

        $this->actingAs($user)->post('/transactions', [
            'amount'      => 50_000,
            'type'        => 'expense',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ])->assertSessionHasErrors('wallet_id');
    }

    // -----------------------------------------------------------------------
    // store — recurring
    // -----------------------------------------------------------------------

    public function test_recurring_transaction_stores_next_occurrence(): void
    {
        $user     = $this->makeUser();
        $wallet   = $this->makeWallet($user);
        $category = $this->makeCategory($user, 'expense');

        $this->actingAs($user)->post('/transactions', [
            'amount'       => 100_000,
            'type'         => 'expense',
            'date'         => '2026-04-01',
            'category_id'  => $category->id,
            'wallet_id'    => $wallet->id,
            'is_recurring' => true,
            'recur_type'   => 'monthly',
        ])->assertRedirect('/transactions');

        $tx = Transaction::where('user_id', $user->id)->firstOrFail();
        $this->assertTrue($tx->is_recurring);
        $this->assertSame('monthly', $tx->recur_type);
        $this->assertSame('2026-05-01', $tx->next_occurrence_at->toDateString());
    }

    public function test_recurring_transaction_requires_recur_type(): void
    {
        $user     = $this->makeUser();
        $wallet   = $this->makeWallet($user);
        $category = $this->makeCategory($user);

        $this->actingAs($user)->post('/transactions', [
            'amount'       => 100_000,
            'type'         => 'expense',
            'date'         => '2026-04-01',
            'category_id'  => $category->id,
            'wallet_id'    => $wallet->id,
            'is_recurring' => true,
            // recur_type intentionally omitted
        ])->assertSessionHasErrors('recur_type');
    }

    // -----------------------------------------------------------------------
    // update — balance reversal
    // -----------------------------------------------------------------------

    public function test_update_corrects_wallet_balance_on_amount_change(): void
    {
        $user     = $this->makeUser();
        $wallet   = $this->makeWallet($user, 500_000);
        $category = $this->makeCategory($user, 'expense');

        // Create via controller so balance is already decremented
        $this->actingAs($user)->post('/transactions', [
            'amount'      => 100_000,
            'type'        => 'expense',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ]);

        $transaction = Transaction::where('user_id', $user->id)->first();
        // Balance should now be 400_000
        $this->assertEqualsWithDelta(400_000, $wallet->fresh()->balance, 0.01);

        // Update amount to 200_000
        $this->actingAs($user)->put("/transactions/{$transaction->id}", [
            'amount'      => 200_000,
            'type'        => 'expense',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ])->assertRedirect('/transactions');

        // Revert 100_000, apply 200_000 → 500_000 - 200_000 = 300_000
        $this->assertEqualsWithDelta(300_000, $wallet->fresh()->balance, 0.01);
    }

    public function test_update_rejects_transaction_belonging_to_another_user(): void
    {
        $user      = $this->makeUser();
        $otherUser = $this->makeUser();
        $wallet    = $this->makeWallet($otherUser);
        $category  = $this->makeCategory($otherUser);

        $transaction = Transaction::factory()->create([
            'user_id'     => $otherUser->id,
            'wallet_id'   => $wallet->id,
            'category_id' => $category->id,
        ]);

        $this->actingAs($user)
            ->put("/transactions/{$transaction->id}", [
                'amount'      => 50_000,
                'type'        => 'expense',
                'date'        => '2026-04-01',
                'category_id' => $category->id,
                'wallet_id'   => $wallet->id,
            ])->assertForbidden();
    }

    // -----------------------------------------------------------------------
    // destroy
    // -----------------------------------------------------------------------

    public function test_deleting_income_transaction_decreases_wallet_balance(): void
    {
        $user     = $this->makeUser();
        $wallet   = $this->makeWallet($user, 1_000_000);
        $category = $this->makeCategory($user, 'income');

        $this->actingAs($user)->post('/transactions', [
            'amount'      => 300_000,
            'type'        => 'income',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ]);

        $transaction = Transaction::where('user_id', $user->id)->first();
        $this->assertEqualsWithDelta(1_300_000, $wallet->fresh()->balance, 0.01);

        $this->actingAs($user)
            ->delete("/transactions/{$transaction->id}")
            ->assertRedirect('/transactions');

        $this->assertEqualsWithDelta(1_000_000, $wallet->fresh()->balance, 0.01);
        $this->assertModelMissing($transaction);
    }

    public function test_deleting_expense_transaction_increases_wallet_balance(): void
    {
        $user     = $this->makeUser();
        $wallet   = $this->makeWallet($user, 1_000_000);
        $category = $this->makeCategory($user, 'expense');

        $this->actingAs($user)->post('/transactions', [
            'amount'      => 250_000,
            'type'        => 'expense',
            'date'        => '2026-04-01',
            'category_id' => $category->id,
            'wallet_id'   => $wallet->id,
        ]);

        $transaction = Transaction::where('user_id', $user->id)->first();
        $this->assertEqualsWithDelta(750_000, $wallet->fresh()->balance, 0.01);

        $this->actingAs($user)
            ->delete("/transactions/{$transaction->id}")
            ->assertRedirect('/transactions');

        $this->assertEqualsWithDelta(1_000_000, $wallet->fresh()->balance, 0.01);
        $this->assertModelMissing($transaction);
    }

    public function test_delete_rejects_transaction_belonging_to_another_user(): void
    {
        $user      = $this->makeUser();
        $otherUser = $this->makeUser();
        $wallet    = $this->makeWallet($otherUser);
        $category  = $this->makeCategory($otherUser);

        $transaction = Transaction::factory()->create([
            'user_id'     => $otherUser->id,
            'wallet_id'   => $wallet->id,
            'category_id' => $category->id,
            'type'        => 'expense',
            'amount'      => 50_000,
        ]);

        $this->actingAs($user)
            ->delete("/transactions/{$transaction->id}")
            ->assertForbidden();
    }

    // -----------------------------------------------------------------------
    // Authentication guard
    // -----------------------------------------------------------------------

    public function test_unauthenticated_user_is_redirected_from_transactions(): void
    {
        $this->get('/transactions')->assertRedirect('/login');
    }
}
