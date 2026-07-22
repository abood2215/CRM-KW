<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Conversation;
use App\Policies\ContactPolicy;
use App\Policies\ConversationPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    private const LIMIT = 5;

    public function __invoke(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return response()->json(['contacts' => [], 'conversations' => [], 'campaigns' => []]);
        }

        $contacts = ContactPolicy::scopeVisibleTo(Contact::query(), $request->user())
            ->where(fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%"))
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'phone'])
            ->map(fn (Contact $c) => ['id' => $c->id, 'title' => $c->name, 'subtitle' => $c->phone]);

        $conversations = ConversationPolicy::scopeVisibleTo(Conversation::with('contact:id,name,phone'), $request->user())
            ->whereHas('contact', fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('phone', 'like', "%{$term}%"))
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Conversation $c) => ['id' => $c->id, 'title' => $c->contact?->name ?? '—', 'subtitle' => $c->contact?->phone]);

        // A sandboxed test account must not find real campaigns through the side door of
        // search either — see CampaignController::index for the same restriction on the list.
        $campaigns = $request->user()->isSandboxed()
            ? collect()
            : Campaign::where('name', 'like', "%{$term}%")
                ->limit(self::LIMIT)
                ->get(['id', 'name', 'status'])
                ->map(fn (Campaign $c) => ['id' => $c->id, 'title' => $c->name, 'subtitle' => $c->status]);

        return response()->json([
            'contacts' => $contacts,
            'conversations' => $conversations,
            'campaigns' => $campaigns,
        ]);
    }
}
