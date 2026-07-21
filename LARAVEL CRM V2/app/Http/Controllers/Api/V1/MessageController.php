<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ConversationUpdatedEvent;
use App\Events\MessageStatusUpdatedEvent;
use App\Events\NewMessageEvent;
use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Policies\ConversationPolicy;
use App\Services\ChatwootService;
use App\Services\Whatsapp\CloudApiWhatsAppSender;
use App\Services\Whatsapp\HeaderMediaResolver;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    public function __construct(private readonly ChatwootService $chatwoot)
    {
    }

    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        // Failed messages used to be filtered out here entirely — the intent was to
        // avoid misleading the agent into thinking a failed send was delivered, but the
        // actual effect was worse: the message just vanished with zero explanation the
        // moment its delivery-status webhook came back "failed" (e.g. outside WhatsApp's
        // 24h customer-service window). The frontend already renders a "فشل الإرسال"
        // badge for this status — it just never got a chance to show.
        $perPage = $request->per_page ?? 50;

        // No `page` defaults to the LAST page (most recent messages) — the frontend never
        // sent one and always got page 1 = the OLDEST messages once a conversation passed
        // $perPage total, permanently hiding all newer activity. Older pages are still
        // reachable by passing an explicit `page` (used by the "load older" control).
        $page = $request->integer('page') ?: (int) ceil($conversation->messages()->count() / $perPage);
        $page = max(1, $page);

        $messages = $conversation->messages()
            ->orderBy('sent_at', 'asc')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'messages' => MessageResource::collection($messages),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ],
        ]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $request->validate([
            'content' => 'required|string',
            'type' => 'sometimes|in:text,image,video,audio,file',
            'filename' => 'nullable|string|max:255',
            'is_private' => 'sometimes|boolean',
        ]);

        $conversation->load('contact');
        $waMessageId = null;
        $isPrivate = $request->boolean('is_private', false);

        // A private/internal note must never actually reach the customer — only real
        // outbound messages get sent via Chatwoot/WhatsApp below.
        if (! $isPrivate && $conversation->chatwoot_conv_id) {
            $this->chatwoot->sendMessage($conversation->chatwoot_conv_id, $request->content);
        }

        if (! $isPrivate && ! $conversation->chatwoot_conv_id && $conversation->source === 'whatsapp') {
            $contactPhone = $conversation->contact?->phone;

            if (! $contactPhone) {
                return response()->json(['message' => 'لا يوجد رقم هاتف مرتبط بهذه المحادثة.'], 422);
            }

            if ($contactPhone) {
                $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();

                if (! $number) {
                    return response()->json(['message' => 'لا يوجد رقم واتساب متصل حالياً لإرسال الرسالة.'], 422);
                }

                try {
                    $sender = WhatsAppSenderFactory::make($number);
                    $result = match ($request->type) {
                        'image' => $sender->sendImage($contactPhone, $request->content),
                        'video' => $sender->sendVideo($contactPhone, $request->content),
                        'audio' => $sender->sendAudio($contactPhone, $request->content),
                        'file' => $sender->sendDocument($contactPhone, $request->content, $request->filename),
                        default => $sender->sendMessage($contactPhone, $request->content),
                    };
                    $waMessageId = $result['messages'][0]['id'] ?? null;
                    $number->incrementSent();
                } catch (\Exception $e) {
                    // Previously this was swallowed (logged only) and a "sent" message was
                    // created locally regardless — misleading the agent into thinking a
                    // failed send actually went out. Now it fails the request instead, same
                    // as sendTemplate() below already does.
                    Log::error('[MessageController] send failed', ['conversation_id' => $conversation->id, 'error' => $e->getMessage()]);

                    return response()->json(['message' => 'فشل الإرسال: '.$e->getMessage()], 422);
                }
            }
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'whatsapp_message_id' => $waMessageId,
            'content' => $request->content,
            'type' => $request->type ?? 'text',
            'direction' => 'out',
            'is_private' => $isPrivate,
            'sender_name' => $request->user()->name,
            'status' => $waMessageId ? 'sent' : null,
            'sent_at' => now(),
        ]);

        $conversation->update(['last_message' => $request->content, 'last_message_at' => now(), 'unread_count' => 0]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json(['message' => new MessageResource($message)], 201);
    }

    /**
     * Agent reacting to a message the customer sent (the reverse of InboundMessageService::
     * handleReaction, which handles the customer reacting to one of ours). Reuses the same
     * `reaction_emoji` column — a message only ever carries one reaction slot regardless of
     * which side set it. Meta doesn't webhook back a confirmation for our own outbound
     * reaction, so this updates the local record immediately rather than waiting on one.
     */
    public function react(Request $request, Conversation $conversation, Message $message): JsonResponse
    {
        $this->authorize('view', $conversation);

        if ($message->conversation_id !== $conversation->id) {
            abort(404);
        }

        $request->validate(['emoji' => 'nullable|string|max:8']);

        if (! $message->whatsapp_message_id) {
            return response()->json(['message' => 'ما فيك تتفاعل مع رسالة ما وصلت فعلياً عبر واتساب.'], 422);
        }

        $conversation->load('contact');
        $contactPhone = $conversation->contact?->phone;
        if (! $contactPhone) {
            return response()->json(['message' => 'لا يوجد رقم هاتف للعميل.'], 422);
        }

        $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();
        if (! $number) {
            return response()->json(['message' => 'لا يوجد رقم واتساب متصل حالياً.'], 422);
        }

        $emoji = $request->input('emoji', '') ?? '';

        try {
            $sender = WhatsAppSenderFactory::make($number);
            $sender->sendReaction($contactPhone, $message->whatsapp_message_id, $emoji);
        } catch (\Exception $e) {
            return response()->json(['message' => 'فشل إرسال التفاعل: '.$e->getMessage()], 422);
        }

        $message->update(['reaction_emoji' => $emoji !== '' ? $emoji : null]);
        event(new MessageStatusUpdatedEvent($message));

        return response()->json(['message' => new MessageResource($message->fresh())]);
    }

    public function sendTemplate(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $request->validate([
            'template_id' => 'required|exists:whatsapp_templates,id',
            'variables' => 'nullable|array',
        ]);

        $conversation->load('contact');
        $template = WhatsappTemplate::findOrFail($request->template_id);

        if ($template->status !== 'approved') {
            return response()->json(['message' => 'القالب غير معتمد من Meta.'], 422);
        }

        $contactPhone = $conversation->contact?->phone;
        if (! $contactPhone) {
            return response()->json(['message' => 'لا يوجد رقم هاتف للعميل.'], 422);
        }

        $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();
        if (! $number) {
            return response()->json(['message' => 'لا يوجد رقم واتساب متصل.'], 422);
        }

        $variables = $request->variables ?? [];
        $sentBody = $template->body_text;
        foreach ($variables as $i => $val) {
            $sentBody = str_replace('{{'.($i + 1).'}}', $val, $sentBody);
        }

        $waMessageId = null;
        try {
            $sender = WhatsAppSenderFactory::make($number);

            // Must go through Meta's real template mechanism (name + approved components), not a
            // plain text send of the locally-rendered body — Meta enforces the 24h re-engagement
            // window on plain text exactly like any other message, template or not. A plain send
            // only works inside that window, defeating the entire point of using a template.
            $components = [];
            if ($template->header_type === 'image' && $template->header_content) {
                $image = $sender instanceof CloudApiWhatsAppSender
                    ? (new HeaderMediaResolver())->resolve(
                        $template->header_media_id,
                        $template->header_content,
                        $sender,
                        fn ($mediaId) => $template->update(['header_media_id' => $mediaId]),
                    )
                    : ['link' => $template->header_content];

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

            $result = $sender->sendTemplate($contactPhone, $template->name, $template->language ?? 'ar', $components);
            $waMessageId = $result['messages'][0]['id'] ?? null;
            $number->incrementSent();
        } catch (\Exception $e) {
            return response()->json(['message' => 'فشل إرسال القالب: '.$e->getMessage()], 500);
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'whatsapp_template_id' => $template->id,
            'whatsapp_message_id' => $waMessageId,
            'content' => $sentBody,
            'type' => 'text',
            'direction' => 'out',
            'is_private' => false,
            'sender_name' => $request->user()->name,
            'status' => $waMessageId ? 'sent' : null,
            'sent_at' => now(),
        ]);

        $conversation->update(['last_message' => $sentBody, 'last_message_at' => now(), 'unread_count' => 0]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json(['message' => new MessageResource($message)], 201);
    }

    /**
     * Generic outbound-attachment upload — separate from the campaign-scoped
     * /campaigns/upload-image (which is image-only and semantically tied to campaigns).
     * WhatsApp media sends need a publicly-fetchable URL, hence the `public` disk.
     */
    public function uploadAttachment(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:16384',
        ]);

        $file = $request->file('file');
        $mime = $file->getMimeType();
        $type = match (true) {
            str_starts_with($mime, 'image/') => 'image',
            str_starts_with($mime, 'video/') => 'video',
            str_starts_with($mime, 'audio/') => 'audio',
            default => 'file',
        };

        $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('message-attachments', $filename, 'public');

        return response()->json([
            'url' => Storage::disk('public')->url($path),
            'type' => $type,
            'original_filename' => $file->getClientOriginalName(),
        ]);
    }

    public function addNote(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $request->validate(['content' => 'required|string']);

        if ($conversation->chatwoot_conv_id) {
            $this->chatwoot->sendMessage($conversation->chatwoot_conv_id, $request->content, true);
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'content' => $request->content,
            'type' => 'text',
            'direction' => 'out',
            'is_private' => true,
            'sender_name' => $request->user()->name,
            'sent_at' => now(),
        ]);

        return response()->json(['message' => new MessageResource($message)], 201);
    }
}
