<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('elmapi:refresh', function() {
    Artisan::call('route:clear');
    $this->info('Route cache cleared!');

    Artisan::call('cache:clear');
    $this->info('Application cache cleared!');

    Artisan::call('config:clear');
    $this->info('Configuration cache cleared!');

    Artisan::call('view:clear');
    $this->info('Compiled views cleared!');

})->describe('Clear logs, sessions, route, cache, config and view');