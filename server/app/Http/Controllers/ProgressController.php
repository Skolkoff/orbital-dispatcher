<?php

namespace App\Http\Controllers;

use App\Http\Requests\Progress\SaveProgressRequest;
use App\Services\LearningProgressStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function show(Request $request, LearningProgressStore $store): JsonResponse
    {
        $this->ensureExpectedOwner($request);

        return response()->json($store->load($request->user()));
    }

    public function update(SaveProgressRequest $request, LearningProgressStore $store): JsonResponse
    {
        $this->ensureExpectedOwner($request);

        return response()->json($store->save($request->user(), $request->document()));
    }

    private function ensureExpectedOwner(Request $request): void
    {
        $expectedOwner = $request->header('X-Progress-Owner');

        abort_if($expectedOwner !== null && $expectedOwner !== (string) $request->user()->getAuthIdentifier(), 409, 'The authenticated account has changed.');
    }
}
