<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class ChatwootService
{
    protected string $baseUrl;
    protected string $apiToken;
    protected int $accountId;

    public function __construct()
    {
        $this->baseUrl = config('services.chatwoot.base_url');
        $this->apiToken = config('services.chatwoot.api_token');
        $this->accountId = (int) config('services.chatwoot.account_id');
    }

    protected function request()
    {
        return Http::baseUrl("{$this->baseUrl}/api/v1/accounts/{$this->accountId}")
            ->withHeaders([
                'api_access_token' => $this->apiToken,
                'Content-Type' => 'application/json',
            ]);
    }

    public function getConversations(array $params = []): array
    {
        $response = $this->request()->get('/conversations', $params);
        return $response->json() ?? [];
    }

    public function getMessages(int $conversationId, array $params = []): array
    {
        $response = $this->request()->get("/conversations/{$conversationId}/messages", $params);
        return $response->json() ?? [];
    }

    public function sendMessage(int $conversationId, string $content, bool $isPrivate = false): array
    {
        $response = $this->request()->post("/conversations/{$conversationId}/messages", [
            'content' => $content,
            'message_type' => $isPrivate ? 'activity' : 'outgoing',
            'private' => $isPrivate,
        ]);
        return $response->json() ?? [];
    }

    public function assignConversation(int $conversationId, ?int $assigneeId): array
    {
        $response = $this->request()->post("/conversations/{$conversationId}/assignments", [
            'assignee_id' => $assigneeId,
        ]);
        return $response->json() ?? [];
    }

    public function toggleStatus(int $conversationId, string $status): array
    {
        $response = $this->request()->post("/conversations/{$conversationId}/toggle_status", [
            'status' => $status,
        ]);
        return $response->json() ?? [];
    }

    public function searchContact(string $query): array
    {
        $response = $this->request()->get('/search', [
            'q' => $query,
            'page' => 1,
        ]);
        return $response->json() ?? [];
    }
}
