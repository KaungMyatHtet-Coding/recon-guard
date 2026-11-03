<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'ReconGuard') }}</title>

        <!-- Google Fonts: Figtree + Noto Sans Myanmar & Padauk for Myanmar Unicode -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;500;600;700&family=Padauk:wght@400;700&display=swap" rel="stylesheet">

        <!-- Theme Initialization Script (Prevents Dark/Light Mode Flashing) -->
        <script>
            (function() {
                try {
                    var savedTheme = localStorage.getItem('reconguard_theme');
                    if (savedTheme === 'light') {
                        document.documentElement.classList.remove('dark');
                    } else {
                        document.documentElement.classList.add('dark');
                    }
                } catch (e) {
                    document.documentElement.classList.add('dark');
                }
            })();
        </script>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased bg-slate-50 text-slate-900 dark:bg-[#121212] dark:text-slate-100 transition-colors duration-200">
        @inertia
    </body>
</html>
