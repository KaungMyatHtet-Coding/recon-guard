<?php

namespace App\Http\Controllers;

use App\Models\AccountNotification;
use App\Models\SupportAppeal;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SupportAppealController extends Controller
{
    /**
     * Submit a customer compliance / blacklist appeal.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
        ], [
            'subject.required' => 'Please enter an appeal subject.',
            'message.required' => 'Please explain your situation or transaction context in detail.',
            'message.min' => 'The appeal explanation must be at least 10 characters.',
        ]);

        $phone = $request->input('contact_phone') ?: $request->user()?->phone;
        $targetUser = $request->user() ?: (!empty($phone) ? User::where('phone', $phone)->first() : null);

        $appeal = SupportAppeal::create([
            'user_id' => $targetUser?->id,
            'subject' => $request->input('subject'),
            'message' => $request->input('message'),
            'contact_phone' => $phone,
            'status' => 'pending',
        ]);

        // Dispatch notification to all Chief Auditors (role:admin)
        $admins = User::role('admin')->get();
        foreach ($admins as $admin) {
            AccountNotification::create([
                'user_id'    => $admin->id,
                'title'      => 'New Compliance Dispute Appeal / အယူခံလွှာအသစ် ရောက်ရှိပါသည်',
                'message'    => "Customer submitted an appeal ticket: '{$appeal->subject}'.",
                'type'       => 'info',
                'action_url' => '/admin/blacklist',
            ]);
        }

        return back()->with('success', 'Your compliance appeal has been submitted successfully. Our Chief Auditor & Dispute Desk will review your explanation.');
    }

    /**
     * Mark all unread account notifications as read.
     */
    public function markNotificationsRead(Request $request): RedirectResponse
    {
        $request->user()->accountNotifications()->whereNull('read_at')->update(['read_at' => now()]);
        return back()->with('success', 'Notifications marked as read.');
    }
}
