<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AnalysisController;
use App\Http\Controllers\ReceiptController;
use App\Http\Controllers\SavingsGoalController;

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Transactions
    Route::get('transactions/export', [TransactionController::class, 'export'])->name('transactions.export');
    Route::resource('transactions', TransactionController::class);
    Route::post('transactions/sync-offline', [TransactionController::class, 'syncOffline'])->name('transactions.sync-offline');

    // Categories
    Route::resource('categories', CategoryController::class);

    // Wallets
    Route::post('wallets/transfer', [WalletController::class, 'transfer'])->name('wallets.transfer');
    Route::resource('wallets', WalletController::class);
    Route::post('wallets/{wallet}/adjust', [WalletController::class, 'adjust'])->name('wallets.adjust');

    // Budget
    Route::get('/budget', [BudgetController::class, 'index'])->name('budget.index');
    Route::post('/budget', [BudgetController::class, 'store'])->name('budget.store');

    // Savings Goals
    Route::get('/savings', [SavingsGoalController::class, 'index'])->name('savings.index');
    Route::post('/savings', [SavingsGoalController::class, 'store'])->name('savings.store');
    Route::put('/savings/{saving}', [SavingsGoalController::class, 'update'])->name('savings.update');
    Route::post('/savings/{saving}/contribute', [SavingsGoalController::class, 'contribute'])->name('savings.contribute');
    Route::delete('/savings/{saving}', [SavingsGoalController::class, 'destroy'])->name('savings.destroy');

    // Chat
    Route::get('/chat/history', [ChatController::class, 'history'])->name('chat.history');
    Route::post('/chat/send', [ChatController::class, 'send'])->name('chat.send')->middleware('throttle:30,1');
    Route::post('/chat/clear', [ChatController::class, 'clear'])->name('chat.clear');

    // AI Analysis
    Route::get('/analysis', [AnalysisController::class, 'index'])->name('analysis.index');
    Route::post('/analysis/generate', [AnalysisController::class, 'generate'])->name('analysis.generate');

    // Receipt Scanner
    Route::post('/receipt/scan', [ReceiptController::class, 'scan'])->name('receipt.scan')->middleware('throttle:10,1');
    Route::get('/receipt/history', [ReceiptController::class, 'history'])->name('receipt.history');
    Route::post('/receipt/{scan}/transaction', [ReceiptController::class, 'saveToTransaction'])->name('receipt.save-transaction');
    Route::delete('/receipt/{scan}', [ReceiptController::class, 'destroy'])->name('receipt.destroy');
});

require __DIR__.'/auth.php';
