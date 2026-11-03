<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'not_blacklisted' => \App\Http\Middleware\EnsureNotBlacklisted::class,
            'admin_passcode' => \App\Http\Middleware\AdminPasscodeMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function (\Symfony\Component\HttpFoundation\Response $response, \Throwable $exception, \Illuminate\Http\Request $request) {
            if (in_array($response->getStatusCode(), [403, 404]) && !$request->wantsJson()) {
                if ($response instanceof \Illuminate\Http\Response && str_contains($response->headers->get('Content-Type') ?? '', 'text/html') && str_contains($response->getContent() ?: '', 'data-page')) {
                    return $response;
                }

                return \Inertia\Inertia::render('Errors/Error', [
                    'status' => $response->getStatusCode(),
                    'message' => $exception->getMessage() ?: ($response->getStatusCode() === 403 ? 'You do not have administrative permission to view this resource.' : 'The requested resource could not be found.'),
                ])->toResponse($request)->setStatusCode($response->getStatusCode());
            }

            return $response;
        });
    })->create();
