<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AnalysisController;
use App\Http\Controllers\ReceiptController;

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Transactions
    Route::resource('transactions', TransactionController::class);
    Route::post('transactions/sync-offline', [TransactionController::class, 'syncOffline'])->name('transactions.sync-offline');

    // Categories
    Route::resource('categories', CategoryController::class);

    // Wallets
    Route::resource('wallets', WalletController::class);
    Route::post('wallets/{wallet}/adjust', [WalletController::class, 'adjust'])->name('wallets.adjust');

    // Budget
    Route::get('/budget', [BudgetController::class, 'index'])->name('budget.index');
    Route::post('/budget', [BudgetController::class, 'store'])->name('budget.store');

    // Chat
    Route::get('/chat/history', [ChatController::class, 'history'])->name('chat.history');
    Route::post('/chat/send', [ChatController::class, 'send'])->name('chat.send');
    Route::post('/chat/clear', [ChatController::class, 'clear'])->name('chat.clear');

    // AI Analysis
    Route::get('/analysis', [AnalysisController::class, 'index'])->name('analysis.index');
    Route::post('/analysis/generate', [AnalysisController::class, 'generate'])->name('analysis.generate');

    // Receipt Scanner
    Route::post('/receipt/scan', [ReceiptController::class, 'scan'])->name('receipt.scan')->middleware('throttle:10,1');
});

require __DIR__.'/auth.php';
