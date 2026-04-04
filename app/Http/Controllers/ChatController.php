<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(private ChatService $chatService) {}

    public function history(): JsonResponse
    {
        $messages = ChatMessage::where('user_id', auth()->id())
            ->orderBy('created_at')
            ->get(['role', 'content', 'action_result', 'created_at']);

        return response()->json($messages);
    }

    public function send(Request $request): JsonResponse
    {
        $request->validate(['message' => 'required|string|max:1000']);

        $result = $this->chatService->send(auth()->id(), trim($request->message));

        return response()->json($result);
    }

    public function clear(): JsonResponse
    {
        ChatMessage::where('user_id', auth()->id())->delete();

        return response()->json(['ok' => true]);
    }
}
