<?php

use App\Http\Controllers\BankStatementController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvoicePaymentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReconciliationController;
use App\Http\Controllers\SimulationStudioController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

// Phase 3: Invoices & Payment Slip Portal (All authenticated roles)
Route::middleware(['auth', 'verified'])->prefix('invoices')->name('invoices.')->group(function () {
    Route::get('/', [InvoicePaymentController::class, 'index'])->name('index');
    Route::post('/', [InvoicePaymentController::class, 'store'])->name('store');
    Route::get('/{invoice}', [InvoicePaymentController::class, 'show'])->name('show');
    Route::post('/{invoice}/analyze-slip', [InvoicePaymentController::class, 'analyzeSlip'])->name('analyzeSlip');
    Route::post('/{invoice}/submit-slip', [InvoicePaymentController::class, 'submitSlip'])->name('submitSlip');
});

// Phase 4: Multi-Bank Statement CSV Ingestion & Ledger (Admin & Accountant only)
Route::middleware(['auth', 'verified', 'role:admin|accountant'])->prefix('bank-statements')->name('bank-statements.')->group(function () {
    Route::get('/', [BankStatementController::class, 'index'])->name('index');
    Route::post('/upload', [BankStatementController::class, 'upload'])->name('upload');
    Route::get('/{batch}', [BankStatementController::class, 'show'])->name('show');
    Route::delete('/{batch}', [BankStatementController::class, 'destroy'])->name('destroy');
});

// Phase 5: 3-Way Automated Reconciliation Engine & Workbench (Admin & Accountant only)
Route::middleware(['auth', 'verified', 'role:admin|accountant'])->prefix('reconciliation')->name('reconciliation.')->group(function () {
    Route::get('/', [ReconciliationController::class, 'index'])->name('index');
    Route::post('/run', [ReconciliationController::class, 'run'])->name('run');
    Route::patch('/matches/{match}/approve', [ReconciliationController::class, 'approve'])->name('approve');
    Route::patch('/matches/{match}/reject', [ReconciliationController::class, 'reject'])->name('reject');
});

// Phase 2: Simulation & Dataset Studio (Admin & Accountant only)
Route::middleware(['auth', 'verified', 'role:admin|accountant'])->prefix('simulation-studio')->name('simulation-studio.')->group(function () {
    Route::get('/', [SimulationStudioController::class, 'index'])->name('index');
    Route::post('/generate-bulk', [SimulationStudioController::class, 'generateBulk'])->name('generate-bulk');
    Route::get('/download-csv/{channel}', [SimulationStudioController::class, 'downloadBankCsv'])->name('download-csv');
    Route::post('/preview-slip', [SimulationStudioController::class, 'generateSlipPreview'])->name('preview-slip');
    Route::post('/inject-slip', [SimulationStudioController::class, 'injectSlipAndBankRow'])->name('inject-slip');
    Route::post('/reset-demo', [SimulationStudioController::class, 'resetDemoEnvironment'])->name('reset-demo');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
