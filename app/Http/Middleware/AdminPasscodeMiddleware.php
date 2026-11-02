<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminPasscodeMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Allow access to gate verification endpoints
        if ($request->routeIs('admin.gate', 'admin.gate.verify')) {
            return $next($request);
        }

        if ($request->session()->get('admin_passcode_verified') !== true) {
            // Save intended URL for post-verification redirect
            $request->session()->put('url.intended', $request->fullUrl());
            return redirect()->route('admin.gate');
        }

        return $next($request);
    }
}
