<?php

use App\Http\Controllers\Api\V1\ActivityLogController;
use App\Http\Controllers\Api\V1\AppointmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CampaignController;
use App\Http\Controllers\Api\V1\CannedResponseController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\ContactListController;
use App\Http\Controllers\Api\V1\ConversationController;
use App\Http\Controllers\Api\V1\DripSequenceController;
use App\Http\Controllers\Api\V1\FileController;
use App\Http\Controllers\Api\V1\GlobalSearchController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\PublicBookingController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\StatsController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\TemplateController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\WebhookController;
use App\Http\Controllers\Api\V1\WhatsappNumberController;
use Illuminate\Support\Facades\Route;

// Rate limit: max 10 login attempts per minute per IP
//
// Every throttle: below carries an explicit prefix (the 3rd param). Laravel's
// built-in throttle middleware keys its counter purely by the authenticated
// user ID (or IP+domain for guests) — WITHOUT the route at all — so without a
// distinct prefix, every throttled route for the same user shares one counter.
// That silently made each "stricter" per-action limit fire early (or never
// independently) depending on unrelated traffic the same user generated
// elsewhere in the exact same minute. The prefix gives each limit its own bucket.
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1,login');

// Public webhooks — rate limited since they're unauthenticated
Route::get('/webhooks/whatsapp', [WebhookController::class, 'whatsappVerify'])->middleware('throttle:20,1,webhook-verify');
Route::post('/webhooks/whatsapp', [WebhookController::class, 'whatsapp'])->middleware('throttle:120,1,webhook-whatsapp');
Route::post('/webhooks/chatwoot', [WebhookController::class, 'chatwoot'])->middleware('throttle:60,1,webhook-chatwoot');

// Public self-service booking — unauthenticated by design, so it gets its own strict throttle.
Route::get('/public/booking/slots', [PublicBookingController::class, 'slots'])->middleware('throttle:30,1,booking-slots');
Route::post('/public/booking', [PublicBookingController::class, 'store'])->middleware('throttle:10,1,booking-store');

// Default cap for every authenticated route below — most sensitive/costly
// endpoints (password changes, WhatsApp sends) additionally get a stricter
// explicit throttle on top of this.
Route::middleware(['auth:sanctum', 'update.last.seen', 'throttle:60,1'])->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'updatePassword'])->middleware('throttle:10,1,password-update');
    });

    Route::get('/contacts/pipeline', [ContactController::class, 'pipeline']);
    Route::get('/contacts/pipeline/{stage}', [ContactController::class, 'pipelineStage']);
    Route::get('/contacts/export/csv', [ContactController::class, 'exportCsv']);
    Route::post('/contacts/import/csv', [ContactController::class, 'importCsv']);
    Route::delete('/contacts/destroy-all', [ContactController::class, 'destroyAll']);
    Route::post('/contacts/bulk-destroy', [ContactController::class, 'bulkDestroy']);
    Route::post('/contacts/bulk-blacklist', [ContactController::class, 'bulkBlacklist']);
    Route::post('/contacts/segment-count', [ContactController::class, 'segmentCount']);
    Route::get('/contacts/{contact}/timeline', [ContactController::class, 'timeline']);
    Route::post('/contacts/{contact}/opt-out', [ContactController::class, 'optOut']);
    Route::post('/contacts/{contact}/blacklist', [ContactController::class, 'blacklist']);
    Route::post('/contacts/{contact}/unblacklist', [ContactController::class, 'unblacklist']);
    Route::apiResource('contacts', ContactController::class);

    Route::post('/contact-lists/{contactList}/contacts', [ContactListController::class, 'addContacts']);
    Route::apiResource('contact-lists', ContactListController::class);

    Route::post('/tasks/{task}/complete', [TaskController::class, 'complete']);
    Route::apiResource('tasks', TaskController::class);

    Route::post('/appointments/{appointment}/confirm', [AppointmentController::class, 'confirm']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/complete', [AppointmentController::class, 'complete']);
    Route::apiResource('appointments', AppointmentController::class)->except(['show']);

    Route::get('/whatsapp-numbers', [WhatsappNumberController::class, 'index']);
    Route::post('/whatsapp-numbers', [WhatsappNumberController::class, 'store']);
    Route::put('/whatsapp-numbers/{whatsappNumber}', [WhatsappNumberController::class, 'update']);
    Route::delete('/whatsapp-numbers/{whatsappNumber}', [WhatsappNumberController::class, 'destroy']);
    Route::get('/whatsapp-numbers/{whatsappNumber}/qr', [WhatsappNumberController::class, 'qr']);
    Route::get('/whatsapp-numbers/{whatsappNumber}/status', [WhatsappNumberController::class, 'status']);
    Route::post('/whatsapp-numbers/{whatsappNumber}/sync-templates', [WhatsappNumberController::class, 'syncTemplates']);

    Route::get('/templates/preview/{name}', [TemplateController::class, 'preview']);
    Route::post('/templates/sync', [TemplateController::class, 'sync']);
    Route::get('/templates/{template}/analytics', [TemplateController::class, 'analytics']);
    Route::apiResource('templates', TemplateController::class);

    Route::post('/campaigns/upload-image', [CampaignController::class, 'uploadImage']);
    Route::post('/campaigns/{campaign}/start', [CampaignController::class, 'start'])->middleware('throttle:20,1,campaign-start');
    Route::post('/campaigns/{campaign}/pause', [CampaignController::class, 'pause']);
    Route::post('/campaigns/{campaign}/resume', [CampaignController::class, 'resume']);
    Route::post('/campaigns/{campaign}/blacklist-failed', [CampaignController::class, 'blacklistFailed']);
    Route::get('/campaigns/{campaign}/recipients', [CampaignController::class, 'recipients']);
    Route::get('/campaigns/{campaign}/analytics', [CampaignController::class, 'analytics']);
    Route::get('/campaigns/{campaign}/report', [CampaignController::class, 'report']);
    Route::apiResource('campaigns', CampaignController::class)->except(['show'])->parameters(['campaigns' => 'campaign']);
    Route::get('/campaigns/{campaign}', [CampaignController::class, 'show']);

    Route::put('/drip-sequences/{sequence}/steps', [DripSequenceController::class, 'replaceSteps']);
    Route::post('/drip-sequences/{sequence}/enroll', [DripSequenceController::class, 'enroll']);
    Route::post('/drip-enrollments/{enrollment}/stop', [DripSequenceController::class, 'stopEnrollment']);
    Route::apiResource('drip-sequences', DripSequenceController::class)->parameters(['drip-sequences' => 'sequence']);

    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    Route::put('/conversations/{conversation}/status', [ConversationController::class, 'updateStatus']);
    Route::put('/conversations/{conversation}/assign', [ConversationController::class, 'assign']);
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store'])->middleware('throttle:20,1,message-send');
    Route::post('/messages/upload-attachment', [MessageController::class, 'uploadAttachment'])->middleware('throttle:20,1,message-upload');
    Route::post('/conversations/{conversation}/send-template', [MessageController::class, 'sendTemplate'])->middleware('throttle:20,1,send-template');
    Route::post('/conversations/{conversation}/notes', [MessageController::class, 'addNote']);
    Route::post('/conversations/{conversation}/messages/{message}/react', [MessageController::class, 'react'])->middleware('throttle:20,1,message-react');
    Route::post('/conversations/{conversation}/typing', [ConversationController::class, 'typing'])->middleware('throttle:30,1,typing');

    Route::get('/stats/dashboard', [StatsController::class, 'dashboard']);
    Route::get('/stats/campaigns', [StatsController::class, 'campaigns']);
    Route::get('/stats/campaigns/export/csv', [StatsController::class, 'exportCampaignsCsv']);
    Route::get('/stats/agents', [StatsController::class, 'agents']);
    Route::get('/stats/whatsapp', [StatsController::class, 'whatsapp']);
    Route::get('/stats/sources', [StatsController::class, 'sources']);
    Route::get('/stats/satisfaction', [StatsController::class, 'satisfaction']);

    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/search', GlobalSearchController::class);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    Route::apiResource('canned-responses', CannedResponseController::class)->except(['show']);

    Route::get('/drive', [FileController::class, 'index']);
    Route::post('/drive/upload', [FileController::class, 'store']);
    Route::get('/drive/{file}/download', [FileController::class, 'download']);
    Route::delete('/drive/{file}', [FileController::class, 'destroy']);

    Route::get('/users/online', [UserController::class, 'online']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    // The `can:` middleware only treats a bare argument as a literal string when quoted —
    // otherwise it tries to resolve it as a route parameter and silently passes null.
    Route::middleware("can:permission,'settings.manage'")->prefix('settings')->group(function () {
        Route::get('/business-hours', [SettingsController::class, 'getBusinessHours']);
        Route::put('/business-hours', [SettingsController::class, 'updateBusinessHours']);
        Route::get('/auto-replies', [SettingsController::class, 'getAutoReplies']);
        Route::put('/auto-replies', [SettingsController::class, 'updateAutoReplies']);
    });

    // Index is reachable by anyone with users.manage too — creating a user requires
    // picking a role, so the picker can't sit fully behind roles.manage (see RoleController::index).
    Route::get('/roles', [RoleController::class, 'index']);

    Route::middleware("can:permission,'roles.manage'")->group(function () {
        Route::apiResource('roles', RoleController::class)->except(['show', 'index']);
        Route::get('/permissions', [PermissionController::class, 'index']);
    });
});
