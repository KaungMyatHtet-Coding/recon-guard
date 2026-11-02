<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotBlacklisted
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->is_blacklisted) {
            $reason = $user->blacklist_reason ?: 'Suspicious fraudulent payment activities or altered receipts detected.';

            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'Account restricted by Compliance.',
                    'reason' => $reason,
                ], 403);
            }

            return Inertia::render('Errors/AccountSuspended', [
                'blacklist_reason' => $reason,
                'hotline' => '09-770001122',
                'email' => 'disputes@reconguard.test',
            ])->toResponse($request)->setStatusCode(403);
        }

        return $next($request);
    }
}
