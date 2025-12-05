<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AppSettingsController extends Controller
{
    public function edit(): Response
    {
        $settings = AppSetting::query()->latest('id')->first();

        return Inertia::render('settings/app', [
            'settings' => [
                'app_name' => $settings?->app_name ?? null,
                'logo_file' => $settings?->logo_file ? Storage::disk('public')->url($settings->logo_file) : null,
                'favicon_file' => $settings?->favicon_file ? Storage::disk('public')->url($settings->favicon_file) : null,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'app_name' => ['nullable', 'string', 'max:255'],
            'logo' => ['nullable', 'file', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
            'favicon' => ['nullable', 'file', 'mimes:ico,png,jpg,gif,svg', 'max:1024'],
            'remove_logo' => ['nullable', 'boolean'],
            'remove_favicon' => ['nullable', 'boolean'],
        ]);

        $settings = AppSetting::query()->latest('id')->first();
        if (! $settings) {
            $settings = new AppSetting();
        }

        // Handle logo upload or removal
        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($settings->logo_file && Storage::disk('public')->exists($settings->logo_file)) {
                Storage::disk('public')->delete($settings->logo_file);
            }
            
            $file = $request->file('logo');
            $originalFilename = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            
            // Generate unique filename
            $filename = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)) . '_' . Str::random(8) . '.' . $extension;
            
            // Store file in app-settings directory
            $path = 'app-settings';
            $filePath = $file->storeAs($path, $filename, 'public');
            
            $validated['logo_file'] = $filePath;
        } elseif ($request->boolean('remove_logo') && $settings->logo_file) {
            // Remove existing logo
            if (Storage::disk('public')->exists($settings->logo_file)) {
                Storage::disk('public')->delete($settings->logo_file);
            }
            $validated['logo_file'] = null;
        }

        // Handle favicon upload or removal
        if ($request->hasFile('favicon')) {
            // Delete old favicon if exists
            if ($settings->favicon_file && Storage::disk('public')->exists($settings->favicon_file)) {
                Storage::disk('public')->delete($settings->favicon_file);
            }
            
            $file = $request->file('favicon');
            $originalFilename = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            
            // Generate unique filename
            $filename = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)) . '_' . Str::random(8) . '.' . $extension;
            
            // Store file in app-settings directory
            $path = 'app-settings';
            $filePath = $file->storeAs($path, $filename, 'public');
            
            $validated['favicon_file'] = $filePath;
        } elseif ($request->boolean('remove_favicon') && $settings->favicon_file) {
            // Remove existing favicon
            if (Storage::disk('public')->exists($settings->favicon_file)) {
                Storage::disk('public')->delete($settings->favicon_file);
            }
            $validated['favicon_file'] = null;
        }

        $settings->fill($validated);
        $settings->save();

        return to_route('settings.app.edit');
    }
}



