<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\PaymentSlip;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    /**
     * Display the Admin Staff & User Management portal.
     */
    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'all');
        $search = $request->query('search', '');

        $query = User::with('roles')
            ->withCount(['invoices', 'paymentSlips']);

        // Tab filter
        if ($tab === 'accountants') {
            $query->role('accountant');
        } elseif ($tab === 'customers') {
            $query->role('customer');
        } elseif ($tab === 'blacklisted') {
            $query->where('is_blacklisted', true);
        }

        // Search filter
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('nrc_number', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%");
            });
        }

        $users = $query->latest('id')->paginate(15)->withQueryString();

        // Calculate summary metrics
        $stats = [
            'total_users'        => User::count(),
            'senior_accountants' => User::role('accountant')->count(),
            'customers'          => User::role('customer')->count(),
            'blacklisted'        => User::where('is_blacklisted', true)->count(),
        ];

        return Inertia::render('Admin/Users/Index', [
            'users'      => $users,
            'stats'      => $stats,
            'currentTab' => $tab,
            'search'     => $search,
        ]);
    }

    /**
     * Create a new Senior Accountant.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'phone'      => ['required', 'string', 'max:30'],
            'nrc_number' => ['required', 'string', 'max:50'],
            'password'   => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name'              => $validated['name'],
            'email'             => $validated['email'],
            'phone'             => $validated['phone'],
            'nrc_number'        => $validated['nrc_number'],
            'password'          => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('accountant');

        return redirect()->back()
            ->with('success', "Senior Accountant '{$user->name}' created successfully with operational access privileges.");
    }

    /**
     * Retrieve full KYC and financial dossier for a specific user.
     */
    public function show(User $user): JsonResponse
    {
        $user->load('roles');

        $invoices = Invoice::where('user_id', $user->id)
            ->latest('id')
            ->limit(10)
            ->get(['id', 'invoice_number', 'amount', 'status', 'created_at']);

        $paymentSlips = PaymentSlip::where('user_id', $user->id)
            ->latest('id')
            ->limit(10)
            ->get(['id', 'payment_channel', 'extracted_transaction_id', 'extracted_amount', 'verification_status', 'ocr_confidence', 'exif_tamper_flag', 'created_at']);

        $appeals = $user->supportAppeals()
            ->latest('id')
            ->limit(5)
            ->get(['id', 'subject', 'status', 'admin_response', 'created_at']);

        $totalInvoiced = (float) Invoice::where('user_id', $user->id)->sum('amount');
        $totalPaid = (float) PaymentSlip::where('user_id', $user->id)->whereIn('verification_status', ['matched', 'verified_clean'])->sum('extracted_amount');

        return response()->json([
            'user' => [
                'id'                => $user->id,
                'name'              => $user->name,
                'email'             => $user->email,
                'phone'             => $user->phone,
                'nrc_number'        => $user->nrc_number,
                'address'           => $user->address,
                'emergency_contact' => $user->emergency_contact,
                'company_name'      => $user->company_name,
                'avatar_url'        => $user->avatar_url,
                'is_blacklisted'    => $user->is_blacklisted,
                'blacklist_reason'  => $user->blacklist_reason,
                'roles'             => $user->getRoleNames(),
                'created_at'        => $user->created_at->format('Y-m-d H:i:s'),
            ],
            'financials' => [
                'total_invoiced_mmk' => $totalInvoiced,
                'total_paid_mmk'     => $totalPaid,
                'invoices_count'     => Invoice::where('user_id', $user->id)->count(),
                'slips_count'        => PaymentSlip::where('user_id', $user->id)->count(),
                'flagged_slips'      => PaymentSlip::where('user_id', $user->id)->whereIn('verification_status', ['tampered_fraud', 'duplicate_fraud'])->count(),
            ],
            'invoices'     => $invoices,
            'paymentSlips' => $paymentSlips,
            'appeals'      => $appeals,
        ]);
    }
}
