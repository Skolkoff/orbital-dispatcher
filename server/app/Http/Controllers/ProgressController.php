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
        return response()->json($store->load($request->user()));
    }

    public function update(SaveProgressRequest $request, LearningProgressStore $store): JsonResponse
    {
        return response()->json($store->save($request->user(), $request->document()));
    }
}
