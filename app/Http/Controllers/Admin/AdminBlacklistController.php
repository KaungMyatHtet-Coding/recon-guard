<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccountNotification;
use App\Models\Blacklist;
use App\Models\BlacklistRecommendation;
use App\Models\Invoice;
use App\Models\PaymentSlip;
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
        // 1. Unified Blacklist Registry: both registered users and walk-in guests
        $blacklistRecords = Blacklist::with(['user', 'blacklistedBy'])->latest('id')->get();

        // Sync any users with is_blacklisted = true missing from blacklists table (fallback synchronization)
        $syncedUserIds = $blacklistRecords->pluck('user_id')->filter()->all();
        $missingBlacklistedUsers = User::where('is_blacklisted', true)
            ->whereNotIn('id', $syncedUserIds)
            ->get();

        foreach ($missingBlacklistedUsers as $mUser) {
            $newRec = Blacklist::create([
                'user_id'        => $mUser->id,
                'phone_number'   => $mUser->phone ?? '',
                'reason'         => $mUser->blacklist_reason ?? 'Administrative restriction',
                'blacklisted_by' => $request->user()?->id ?? 1,
            ]);
            $blacklistRecords->prepend($newRec->load('user', 'blacklistedBy'));
        }

        // Format unified blacklisted entries for frontend registry
        $blacklistedUsers = $blacklistRecords->map(function ($record) {
            $phone = $record->phone_number ?: ($record->user?->phone ?? null);
            $guestName = !empty($phone)
                ? (BlacklistRecommendation::where('customer_phone', $phone)->latest('id')->value('customer_name')
                    ?? Invoice::where('customer_phone', $phone)->latest('id')->value('customer_name')
                    ?? 'Walk-in Guest')
                : 'Walk-in Guest';

            $name = $record->user?->name ?? $guestName;
            $email = $record->user?->email ?? 'N/A (Walk-in Guest)';
            $slipsCount = $record->user
                ? $record->user->paymentSlips()->count()
                : (!empty($phone) ? PaymentSlip::where('sender_phone', $phone)->count() : 0);

            return [
                'id'                  => $record->id,
                'user_id'             => $record->user_id,
                'name'                => $name,
                'email'               => $email,
                'phone'               => $phone,
                'type'                => $record->user_id ? 'Registered' : 'Walk-in Guest',
                'is_blacklisted'      => true,
                'blacklist_reason'    => $record->reason,
                'created_at'          => $record->created_at?->toISOString() ?? now()->toISOString(),
                'updated_at'          => $record->updated_at?->toISOString() ?? now()->toISOString(),
                'payment_slips_count' => $slipsCount,
                'blacklisted_by_name' => $record->blacklistedBy?->name ?? 'Chief Auditor',
            ];
        });

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

        // 5. Four-Eyes Blacklist Recommendations queue with eager-loaded evidence dossier
        $recommendations = BlacklistRecommendation::with([
            'recommender:id,name,email',
            'targetUser:id,name,email,phone',
            'invoice:id,invoice_number,amount,status,description,created_at',
            'invoice.paymentSlips',
            'reviewer:id,name,email',
        ])->latest('id')->get();

        $recommendations->each(function ($rec) {
            if ($rec->target_user_id) {
                $rec->total_invoices_count = Invoice::where('user_id', $rec->target_user_id)->count();
                $rec->total_slips_count = PaymentSlip::where('user_id', $rec->target_user_id)->count();
            } elseif (!empty($rec->customer_phone)) {
                $rec->total_invoices_count = Invoice::where('customer_phone', $rec->customer_phone)->count();
                $rec->total_slips_count = PaymentSlip::where('sender_phone', $rec->customer_phone)->count();
            } else {
                $rec->total_invoices_count = 0;
                $rec->total_slips_count = 0;
            }
        });

        return Inertia::render('Admin/Blacklist', [
            'blacklistedUsers'   => $blacklistedUsers,
            'recentFraudMatches' => $recentFraudMatches,
            'customers'          => $customers,
            'appeals'            => $appeals,
            'recommendations'    => $recommendations,
        ]);
    }

    /**
     * Unblock a customer or guest phone from the fraud blacklist.
     */
    public function unblock(Request $request, Blacklist $blacklist): RedirectResponse
    {
        $phone = $blacklist->phone_number;
        $userId = $blacklist->user_id;

        $blacklist->delete();

        if ($userId) {
            User::where('id', $userId)->update([
                'is_blacklisted'   => false,
                'blacklist_reason' => null,
            ]);

            Blacklist::where('user_id', $userId)->delete();
            BlacklistRecommendation::where('target_user_id', $userId)->update(['status' => 'dismissed']);

            AccountNotification::create([
                'user_id' => $userId,
                'type'    => 'account_restored',
                'title'   => 'Account Restriction Lifted',
                'message' => 'Your account restriction has been cleared by Chief Auditor.',
            ]);
        }

        if (!empty($phone)) {
            User::where('phone', $phone)->update([
                'is_blacklisted'   => false,
                'blacklist_reason' => null,
            ]);

            Blacklist::where('phone_number', $phone)->delete();
            BlacklistRecommendation::where('customer_phone', $phone)->update(['status' => 'dismissed']);
        }

        return back()->with('success', "Restriction cleared and customer unblocked successfully.");
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

            Blacklist::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'phone_number'   => $user->phone ?? '',
                    'reason'         => $reasonText,
                    'blacklisted_by' => $request->user()->id,
                ]
            );

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

            Blacklist::where('user_id', $user->id)->delete();
            if ($user->phone) {
                Blacklist::where('phone_number', $user->phone)->delete();
                BlacklistRecommendation::where('customer_phone', $user->phone)->update(['status' => 'dismissed']);
            }

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

            Blacklist::where('user_id', $appeal->user_id)->delete();
            if ($appeal->user->phone) {
                Blacklist::where('phone_number', $appeal->user->phone)->delete();
                BlacklistRecommendation::where('customer_phone', $appeal->user->phone)->update(['status' => 'dismissed']);
            }

            AccountNotification::create([
                'user_id' => $appeal->user_id,
                'type' => 'account_restored',
                'title' => 'Account Restored',
                'message' => 'Your account restriction has been lifted following compliance appeal review: ' . $responseNote,
            ]);
        }

        if ($appeal->contact_phone) {
            Blacklist::where('phone_number', $appeal->contact_phone)->delete();
            BlacklistRecommendation::where('customer_phone', $appeal->contact_phone)->update(['status' => 'dismissed']);
        }

        return back()->with('success', "Appeal #{$appeal->id} has been resolved and {$appeal->user?->name} is now unblocked.");
    }

    /**
     * Approve and enforce a staff blacklist recommendation (Four-Eyes principle).
     */
    public function approveRecommendation(Request $request, BlacklistRecommendation $recommendation): RedirectResponse
    {
        $recommendation->update([
            'status'      => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $reason = $recommendation->reason;

        // If registered user was identified or phone matches a registered user
        $targetUser = $recommendation->targetUser;
        if (!$targetUser && !empty($recommendation->customer_phone)) {
            $targetUser = User::where('phone', $recommendation->customer_phone)->first();
        }

        if ($targetUser) {
            $targetUser->update([
                'is_blacklisted'   => true,
                'blacklist_reason' => $reason,
            ]);

            AccountNotification::create([
                'user_id' => $targetUser->id,
                'type'    => 'security_restriction',
                'title'   => 'Account Restricted by Chief Auditor',
                'message' => 'Your account has been suspended following a fraud investigation: ' . $reason,
            ]);
        }

        // Persist in blacklists table (enforces both registered users and unregistered guests)
        $phoneToBlacklist = $recommendation->customer_phone ?: ($targetUser?->phone ?? '');
        if (!empty($phoneToBlacklist) || $targetUser) {
            Blacklist::updateOrCreate(
                ['phone_number' => $phoneToBlacklist],
                [
                    'user_id'        => $targetUser?->id,
                    'reason'         => $reason,
                    'blacklisted_by' => $request->user()->id,
                ]
            );
        }

        // Notify the recommending accountant
        AccountNotification::create([
            'user_id'    => $recommendation->recommended_by,
            'title'      => 'Blacklist Recommendation Approved / အတည်ပြုပြီးပါပြီ',
            'message'    => "Chief Auditor approved and enforced your blacklist recommendation for '{$recommendation->customer_name}' ({$recommendation->customer_phone}).",
            'type'       => 'success',
            'action_url' => '/admin/blacklist',
        ]);

        return back()->with('success', "Blacklist recommendation for '{$recommendation->customer_name}' approved and enforced.");
    }

    /**
     * Dismiss / reject a staff blacklist recommendation.
     */
    public function dismissRecommendation(Request $request, BlacklistRecommendation $recommendation): RedirectResponse
    {
        $recommendation->update([
            'status'      => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Notify the recommending accountant
        AccountNotification::create([
            'user_id'    => $recommendation->recommended_by,
            'title'      => 'Blacklist Recommendation Dismissed / ပယ်ချခံရပါသည်',
            'message'    => "Chief Auditor reviewed and dismissed your blacklist recommendation for '{$recommendation->customer_name}'.",
            'type'       => 'info',
            'action_url' => '/reconciliation',
        ]);

        return back()->with('success', "Blacklist recommendation for '{$recommendation->customer_name}' was dismissed.");
    }
}
