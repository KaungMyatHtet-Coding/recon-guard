<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
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
