<?php

namespace App\Http\Controllers;

use App\Models\SupportAppeal;
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

        SupportAppeal::create([
            'user_id' => $request->user()->id,
            'subject' => $request->input('subject'),
            'message' => $request->input('message'),
            'contact_phone' => $request->input('contact_phone') ?: $request->user()->phone,
            'status' => 'pending',
        ]);

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
