<?php

use App\Http\Controllers\Admin\AdminBlacklistController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminRollbackController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AuditReportController;
use App\Http\Controllers\BankStatementController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvoicePaymentController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicPaymentController;
use App\Http\Controllers\ReconciliationController;
use App\Http\Controllers\SimulationStudioController;
use App\Http\Controllers\SupportAppealController;
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

// Public Guest Payment Portal (no auth required)
Route::get('/pay/{invoiceNumber}', [PublicPaymentController::class, 'show'])->name('public.pay.show');
Route::post('/pay/{invoiceNumber}/scan', [PublicPaymentController::class, 'scanSlip'])->middleware('throttle:5,1')->name('public.pay.scan');
Route::post('/pay/{invoiceNumber}/submit-slip', [PublicPaymentController::class, 'submitSlip'])->middleware('throttle:5,1')->name('public.pay.submit');

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

// Phase 3: Invoices & Payment Slip Portal (All authenticated roles)
Route::middleware(['auth', 'verified'])->prefix('invoices')->name('invoices.')->group(function () {
    Route::get('/', [InvoicePaymentController::class, 'index'])->name('index');
    Route::post('/', [InvoicePaymentController::class, 'store'])->name('store');
    Route::get('/{invoice}', [InvoicePaymentController::class, 'show'])->name('show');
    Route::post('/{invoice}/analyze-slip', [InvoicePaymentController::class, 'analyzeSlip'])->middleware('not_blacklisted')->name('analyzeSlip');
    Route::post('/{invoice}/submit-slip', [InvoicePaymentController::class, 'submitSlip'])->middleware('not_blacklisted')->name('submitSlip');
    Route::post('/{invoice}/settle-cash', [InvoicePaymentController::class, 'settleCash'])->name('settleCash');
});

// Phase 4: Multi-Bank Statement CSV Ingestion & Ledger (Admin & Accountant)
Route::middleware(['auth', 'verified', 'role:admin|accountant'])->prefix('bank-statements')->name('bank-statements.')->group(function () {
    Route::get('/', [BankStatementController::class, 'index'])->name('index');
    Route::post('/upload', [BankStatementController::class, 'upload'])->name('upload');
    Route::get('/{batch}', [BankStatementController::class, 'show'])->name('show');
    Route::post('/{batch}/request-rollback', [BankStatementController::class, 'requestRollback'])->name('request-rollback');
});

// Phase 8A: Batch Permanent Rollback & Deletion (Admin only - Maker-Checker Separation)
Route::middleware(['auth', 'verified', 'role:admin'])->prefix('bank-statements')->name('bank-statements.')->group(function () {
    Route::delete('/{batch}', [BankStatementController::class, 'destroy'])->name('destroy');
});

// Phase 5: 3-Way Automated Reconciliation Engine & Workbench (Admin & Accountant only)
Route::middleware(['auth', 'verified', 'role:admin|accountant'])->prefix('reconciliation')->name('reconciliation.')->group(function () {
    Route::get('/', [ReconciliationController::class, 'index'])->name('index');
    Route::post('/run', [ReconciliationController::class, 'run'])->name('run');
    Route::patch('/matches/{match}/approve', [ReconciliationController::class, 'approve'])->name('approve');
    Route::patch('/matches/{match}/reject', [ReconciliationController::class, 'reject'])->name('reject');
    Route::post('/recommend-blacklist', [ReconciliationController::class, 'recommendBlacklist'])->name('recommend-blacklist');
    Route::get('/audit-report', [ReconciliationController::class, 'auditReport'])->name('audit-report');
});

// Phase 6: Chief Auditor Passcode Gate (Admin only)
Route::middleware(['auth', 'verified', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/gate', [AdminDashboardController::class, 'showGate'])->name('gate');
    Route::post('/gate', [AdminDashboardController::class, 'verifyGate'])->name('gate.verify');
});

// Phase 6: Chief Auditor Governance Suite (Admin only with Passcode Verification)
Route::middleware(['auth', 'verified', 'role:admin', 'admin_passcode'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/governance', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::patch('/passcode', [AdminDashboardController::class, 'updatePasscode'])->name('passcode.update');

    // Dedicated Fraud Defense & Blacklist Management Center
    Route::get('/blacklist', [AdminBlacklistController::class, 'index'])->name('blacklist.index');
    Route::post('/blacklist/{user}', [AdminBlacklistController::class, 'toggleBlacklist'])->name('blacklist.toggle');
    Route::delete('/blacklist/{blacklist}/unblock', [AdminBlacklistController::class, 'unblock'])->name('blacklist.unblock');
    Route::post('/appeals/{appeal}/resolve', [AdminBlacklistController::class, 'resolveAppeal'])->name('appeals.resolve');

    // Phase 8B: Compliance Appeals Resolve via PATCH
    Route::patch('/appeals/{appeal}/resolve', [AdminBlacklistController::class, 'resolveAppeal'])->name('appeals.resolve.patch');

    // Phase 8B-2: Four-Eyes Blacklist Recommendations (Chief Auditor Review)
    Route::patch('/blacklist-recommendations/{recommendation}/approve', [AdminBlacklistController::class, 'approveRecommendation'])->name('blacklist-recommendations.approve');
    Route::patch('/blacklist-recommendations/{recommendation}/dismiss', [AdminBlacklistController::class, 'dismissRecommendation'])->name('blacklist-recommendations.dismiss');

    // Phase 8B: Pending Rollbacks Queue (Chief Auditor Approval)
    Route::get('/rollbacks', [AdminRollbackController::class, 'index'])->name('rollbacks.index');
    Route::delete('/rollbacks/{batch}/approve', [AdminRollbackController::class, 'approve'])->name('rollbacks.approve');
    Route::patch('/rollbacks/{batch}/dismiss', [AdminRollbackController::class, 'dismiss'])->name('rollbacks.dismiss');

    // Phase 8B: Staff & User Management (Chief Auditor Governance)
    Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
    Route::post('/users', [AdminUserController::class, 'store'])->name('users.store');
    Route::post('/users/accountant', [AdminUserController::class, 'store'])->name('users.accountant.store');
    Route::get('/users/{user}', [AdminUserController::class, 'show'])->name('users.show');
});

// Phase 6: Official Audit Report (Admin & Accountant)
Route::middleware(['auth', 'verified', 'role:admin|accountant'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/audit-report', [AuditReportController::class, 'index'])->name('audit-report');
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
    Route::post('/support/appeals', [SupportAppealController::class, 'store'])->name('support.appeals.store');
    Route::post('/notifications/mark-read', [SupportAppealController::class, 'markNotificationsRead'])->name('notifications.mark-read');

    // Phase 8B: Notifications mark all read (JSON endpoint)
    Route::post('/notifications/mark-all-read', [NotificationsController::class, 'markAllRead'])->name('notifications.mark-all-read');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    Route::delete('/profile/avatar', [ProfileController::class, 'destroyAvatar'])->name('profile.avatar.destroy');
});

require __DIR__.'/auth.php';

