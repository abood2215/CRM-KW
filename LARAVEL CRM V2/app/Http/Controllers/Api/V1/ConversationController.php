<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ConversationUpdatedEvent;
use App\Events\NewMessageEvent;
use App\Events\UserTypingEvent;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Jobs\SendSatisfactionSurveyJob;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Policies\ConversationPolicy;
use App\Services\ChatwootService;
use App\Services\Conversations\ConversationService;
use App\Services\Whatsapp\CloudApiWhatsAppSender;
use App\Services\Whatsapp\Contracts\WhatsAppSenderInterface;
use App\Services\Whatsapp\HeaderMediaResolver;
use App\Services\Whatsapp\TemplateSendValidator;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use App\ValueObjects\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ConversationController extends Controller
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly ChatwootService $chatwoot,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = ConversationPolicy::scopeVisibleTo(
            Conversation::with(['contact', 'assignedUser'])->withCount('messages'),
            $request->user(),
        );

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->user()->hasPermission('conversations.view_all') && $request->has('assigned_user_id')) {
            $query->where('assigned_user_id', $request->assigned_user_id);
        }

        if ($request->has('source')) {
            $query->where('source', $request->source);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            // Matches either the contact (name/phone) or the conversation's own message
            // content — previously only the contact matched, so finding a conversation by
            // something the customer actually said meant scrolling the whole list by hand.
            $query->where(function ($q) use ($search) {
                $q->whereHas('contact', function ($cq) use ($search) {
                    $cq->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%");
                })->orWhereHas('messages', function ($mq) use ($search) {
                    $mq->where('type', 'text')->where('is_private', false)->where('content', 'like', "%{$search}%");
                });
            });
        }

        $conversations = $query->orderBy('last_message_at', 'desc')->paginate($request->per_page ?? 20);

        return response()->json([
            'conversations' => ConversationResource::collection($conversations),
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'name' => 'nullable|string|max:255',
            'message' => 'required|string',
            'template_name' => 'nullable|string',
            'template_language' => 'nullable|string',
            'variables' => 'nullable|array',
        ]);

        $contact = Contact::firstOrCreate(
            ['phone' => PhoneNumber::normalize($request->phone)],
            ['name' => $request->name ?: $request->phone, 'source' => 'whatsapp', 'user_id' => $request->user()->id],
        );

        $conversation = $this->conversations->resolveForContact($contact);

        // A sandboxed test account can only ever see conversations assigned to it (see
        // ConversationPolicy::scopeVisibleTo) — without this, the conversation it just started
        // would immediately vanish from its own inbox for being unassigned.
        if ($request->user()->isSandboxed() && ! $conversation->assigned_user_id) {
            $conversation->update(['assigned_user_id' => $request->user()->id]);
        }

        $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();

        if (! $number) {
            return response()->json(['message' => 'لا يوجد رقم واتساب متصل حالياً لإرسال الرسالة.'], 422);
        }

        $template = $request->template_name
            ? WhatsappTemplate::where('name', $request->template_name)->where('whatsapp_number_id', $number->id)->first()
            : null;
        $headerImageUrl = ($template && $template->header_type === 'image') ? $template->header_content : null;

        if ($template) {
            try {
                TemplateSendValidator::assertSendable($template, $headerImageUrl, $request->variables ?? []);
            } catch (\RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
        }

        try {
            $sender = WhatsAppSenderFactory::make($number);
            $result = $request->template_name
                ? $sender->sendTemplate($contact->phone, $request->template_name, $request->template_language ?? 'ar', $this->buildComponents($template, $headerImageUrl, $sender, $request->variables ?? []))
                : $sender->sendMessage($contact->phone, $request->message);
            $waMessageId = $result['messages'][0]['id'] ?? null;
            $number->incrementSent();
        } catch (\Exception $e) {
            Log::error('[ConversationController] send failed', ['error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->conversations->recordOutboundMessage($conversation, $request->message, $waMessageId, $request->user()->name, $headerImageUrl, $number->id);

        $message = $conversation->messages()->latest()->first();
        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json([
            'conversation' => new ConversationResource($conversation->fresh()->load(['contact', 'assignedUser'])),
            'message' => new MessageResource($message),
        ], 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $conversation->load(['contact', 'assignedUser'])->loadCount('messages');

        if ($conversation->unread_count !== 0) {
            $conversation->update(['unread_count' => 0]);
            event(new ConversationUpdatedEvent($conversation->fresh()));
        }

        return response()->json(['conversation' => new ConversationResource($conversation)]);
    }

    public function updateStatus(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('update', $conversation);

        $request->validate(['status' => 'required|in:open,resolved,pending']);

        if ($conversation->chatwoot_conv_id) {
            $this->chatwoot->toggleStatus($conversation->chatwoot_conv_id, $request->status);
        }

        $wasResolved = $conversation->status === 'resolved';
        $conversation->update(['status' => $request->status]);
        event(new ConversationUpdatedEvent($conversation->fresh()));

        // Give the customer a couple of hours after the conversation actually ends before
        // asking how it went — sending this instantly would feel like it interrupted them.
        if ($request->status === 'resolved' && ! $wasResolved) {
            SendSatisfactionSurveyJob::dispatch($conversation->id)->delay(now()->addHours(2));
        }

        return response()->json([
            'conversation' => new ConversationResource($conversation->fresh()->load(['contact', 'assignedUser'])),
            'message' => 'تم تحديث حالة المحادثة.',
        ]);
    }

    public function assign(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('assign', Conversation::class);

        $request->validate(['user_id' => 'nullable|exists:users,id']);

        if ($conversation->chatwoot_conv_id && $request->user_id) {
            $this->chatwoot->assignConversation($conversation->chatwoot_conv_id, $request->user_id);
        }

        $conversation->update(['assigned_user_id' => $request->user_id]);
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json([
            'conversation' => new ConversationResource($conversation->fresh()->load(['contact', 'assignedUser'])),
            'message' => 'تم تعيين المحادثة.',
        ]);
    }

    /** Fire-and-forget — no persistence, just lets other agents viewing this conversation see a live "typing" nudge. */
    public function typing(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        event(new UserTypingEvent($conversation->id, $request->user()->id, $request->user()->name));

        return response()->json(['message' => 'ok']);
    }

    /**
     * This is the "start new conversation" send path — used specifically to reach numbers
     * that haven't messaged in first, per the UI's own "لرقم جديد" hint — so an image-header
     * template here needs the same header component MessageController::sendTemplate already
     * builds. This used to only handle body variables, silently dropping the header image for
     * any image-header template sent through this endpoint.
     */
    private function buildComponents(?WhatsappTemplate $template, ?string $headerImageUrl, WhatsAppSenderInterface $sender, array $variables): array
    {
        $components = [];

        if ($template && $template->header_type === 'image' && $headerImageUrl) {
            $image = $sender instanceof CloudApiWhatsAppSender
                ? (new HeaderMediaResolver())->resolve(
                    $template->header_media_id,
                    $headerImageUrl,
                    $sender,
                    fn ($mediaId) => $template->update(['header_media_id' => $mediaId]),
                )
                : ['link' => $headerImageUrl];

            $components[] = [
                'type' => 'header',
                'parameters' => [['type' => 'image', 'image' => $image]],
            ];
        }

        if (! empty($variables)) {
            $components[] = [
                'type' => 'body',
                'parameters' => array_map(fn ($v) => ['type' => 'text', 'text' => (string) $v], array_values($variables)),
            ];
        }

        return $components;
    }
}
