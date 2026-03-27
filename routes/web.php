<?php

use App\Http\Controllers\TransactionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AnalysisController;

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Transactions
    Route::resource('transactions', TransactionController::class);

    // Categories
    Route::resource('categories', CategoryController::class);

    // Wallets
    Route::resource('wallets', WalletController::class);
    Route::post('wallets/{wallet}/adjust', [WalletController::class, 'adjust'])->name('wallets.adjust');

    // Budget
    Route::get('/budget', [BudgetController::class, 'index'])->name('budget.index');
    Route::post('/budget', [BudgetController::class, 'store'])->name('budget.store');

    // AI Analysis
    Route::get('/analysis', [AnalysisController::class, 'index'])->name('analysis.index');
    Route::post('/analysis/generate', [AnalysisController::class, 'generate'])->name('analysis.generate');
});

require __DIR__.'/auth.php';
