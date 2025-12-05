<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;
use Illuminate\Support\Facades\Storage;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $branding = (function () {
            $settings = AppSetting::query()->latest('id')->first();
            return [
                'app_name' => $settings?->app_name ?? config('app.name'),
                'logo_url' => $settings?->logo_file ? Storage::disk('public')->url($settings->logo_file) : '/logo.svg',
                'favicon_url' => $settings?->favicon_file ? Storage::disk('public')->url($settings->favicon_file) : '/favicon.svg',
            ];
        })();

        return [
            ...parent::share($request),
            'name' => $branding['app_name'],
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'branding' => $branding,
            'userCan' => $request->user() ? (function() use ($request) {
               $map = [];
               foreach ($request->user()->getAllPermissions()->pluck('name') as $perm) {
                   $map[$perm] = true;
               }
               return $map;
           })() : [],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            // Automatically close the main sidebar on project-specific pages to give more room to the project workspace.
            // The explicit query string parameter is kept for flexibility and the cookie still controls the sidebar on other pages.
            'sidebarOpen' => $request->routeIs('projects.*') || $request->routeIs('assets.*')
                ? false
                : (! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true'),

            'awsCredentialsConfigured' => env('AWS_ACCESS_KEY_ID') && env('AWS_SECRET_ACCESS_KEY'),
        ];
    }
}
