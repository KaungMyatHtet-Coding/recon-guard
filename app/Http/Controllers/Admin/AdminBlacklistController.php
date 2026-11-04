<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccountNotification;
use App\Models\ReconciliationMatch;
use App\Models\SupportAppeal;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminBlacklistController extends Controller
{
    /**
     * Display the Dedicated Fraud Defense & Blacklist Management Center.
     */
    public function index(Request $request): Response
    {
        // 1. Blacklisted Customers
        $blacklistedUsers = User::where('is_blacklisted', true)
            ->withCount('paymentSlips')
            ->latest('updated_at')
            ->get();

        // 2. Recent Intercepted Fraud Slips
        $recentFraudMatches = ReconciliationMatch::with([
            'invoice.customer',
            'paymentSlip.user',
            'bankTransaction',
        ])->where(function ($q) {
            $q->where('status', 'rejected_fraud')
                ->orWhereIn('match_type', ['amount_mismatch_fraud', 'fake_slip_fraud', 'duplicate_id_fraud']);
        })->latest('id')->limit(20)->get();

        // 3. Customers list for manual blacklist modal
        $customers = User::role('customer')
            ->select('id', 'name', 'email', 'phone', 'is_blacklisted', 'blacklist_reason')
            ->latest('id')
            ->get();

        // 4. Compliance Appeals queue
        $appeals = SupportAppeal::with('user:id,name,email,phone')
            ->latest('id')
            ->limit(30)
            ->get();

        return Inertia::render('Admin/Blacklist', [
            'blacklistedUsers' => $blacklistedUsers,
            'recentFraudMatches' => $recentFraudMatches,
            'customers' => $customers,
            'appeals' => $appeals,
        ]);
    }

    /**
     * Toggle a user's fraud blacklist status.
     */
    public function toggleBlacklist(Request $request, User $user): RedirectResponse
    {
        $shouldBlacklist = $request->boolean('is_blacklisted', !$user->is_blacklisted);
        $reason = $request->input('reason');

        if ($shouldBlacklist) {
            $reasonText = $reason ?: 'Flagged for fraudulent payment slip submissions or altered bank receipts.';
            $user->update([
                'is_blacklisted' => true,
                'blacklist_reason' => $reasonText,
            ]);

            AccountNotification::create([
                'user_id' => $user->id,
                'type' => 'security_restriction',
                'title' => 'Account Restricted by Compliance',
                'message' => 'Your payment submission privileges have been suspended. Reason: ' . $reasonText,
            ]);

            $msg = "User {$user->name} has been added to the fraud blacklist.";
        } else {
            $user->update([
                'is_blacklisted' => false,
                'blacklist_reason' => null,
            ]);

            AccountNotification::create([
                'user_id' => $user->id,
                'type' => 'account_restored',
                'title' => 'Account Restored',
                'message' => 'Your account restriction has been lifted by Compliance.',
            ]);

            $msg = "User {$user->name} has been cleared and removed from the fraud blacklist.";
        }

        return back()->with('success', $msg);
    }

    /**
     * Resolve a customer appeal and restore account privileges.
     */
    public function resolveAppeal(Request $request, SupportAppeal $appeal): RedirectResponse
    {
        $appeal->load('user');
        $responseNote = $request->input('admin_response', 'Appeal approved by Chief Auditor. User restriction lifted.');

        $appeal->update([
            'status' => 'resolved',
            'admin_response' => $responseNote,
        ]);

        if ($appeal->user) {
            $appeal->user->update([
                'is_blacklisted' => false,
                'blacklist_reason' => null,
            ]);

            AccountNotification::create([
                'user_id' => $appeal->user_id,
                'type' => 'account_restored',
                'title' => 'Account Restored',
                'message' => 'Your account restriction has been lifted following compliance appeal review: ' . $responseNote,
            ]);
        }

        return back()->with('success', "Appeal #{$appeal->id} has been resolved and {$appeal->user?->name} is now unblocked.");
    }
}
