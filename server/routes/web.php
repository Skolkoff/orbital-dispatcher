<?php

use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

Route::get('/{path?}', function (): BinaryFileResponse {
    abort_unless(is_file(public_path('app/index.html')), 503, 'Build the frontend with npm run build.');

    return response()->file(public_path('app/index.html'));
})->where('path', '(?!api(?:/|$)|sanctum(?:/|$)|app/assets(?:/|$)).*');
