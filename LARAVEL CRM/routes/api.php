<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\CannedResponseController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ContactListController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\WhatsappNumberController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - مركز مطمئنة للاستشارات اللغوية
|--------------------------------------------------------------------------
*/

// ============================
// 🔓 Public Routes
// ============================

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Webhooks (بدون مصادقة)
Route::post('/webhooks/chatwoot', [WebhookController::class, 'chatwoot']);
Route::get('/webhooks/whatsapp', [WebhookController::class, 'whatsappVerify']);
Route::post('/webhooks/whatsapp', [WebhookController::class, 'whatsapp']);

// ============================
// 🔐 🔐 Protected Routes
// ============================

Route::middleware(['auth:sanctum', 'update.last.seen', 'log.activity'])->group(function () {

    // --- Auth ---
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'updatePassword']);
    });

    // --- Users ---
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/online', [UserController::class, 'online']);
    Route::middleware('role:admin')->group(function () {
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
    });

    // --- CRM Clients ---
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/export/csv', [ClientController::class, 'exportCsv']);
    Route::get('/clients/pipeline', [ClientController::class, 'pipeline']);
    Route::get('/clients/{id}', [ClientController::class, 'show']);
    Route::put('/clients/{id}', [ClientController::class, 'update']);
    Route::delete('/clients/{id}', [ClientController::class, 'destroy']);

    // --- Tasks ---
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{id}', [TaskController::class, 'update']);
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);
    Route::put('/tasks/{id}/complete', [TaskController::class, 'complete']);

    // --- Conversations ---
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::get('/conversations/{id}', [ConversationController::class, 'show']);
    Route::get('/conversations/{id}/messages', [ConversationController::class, 'messages']);
    Route::post('/conversations/{id}/messages', [ConversationController::class, 'sendMessage']);
    Route::put('/conversations/{id}/status', [ConversationController::class, 'updateStatus']);
    Route::put('/conversations/{id}/assign', [ConversationController::class, 'assign']);
    Route::post('/conversations/{id}/notes', [ConversationController::class, 'addNote']);

    // --- Contacts ---
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::post('/contacts', [ContactController::class, 'store']);
    Route::post('/contacts/import/csv', [ContactController::class, 'importCsv']);
    Route::get('/contacts/export/csv', [ContactController::class, 'exportCsv']);
    Route::put('/contacts/{id}', [ContactController::class, 'update']);
    Route::delete('/contacts/{id}', [ContactController::class, 'destroy']);
    Route::put('/contacts/{id}/opt-out', [ContactController::class, 'optOut']);

    // --- Contact Lists ---
    Route::get('/contact-lists', [ContactListController::class, 'index']);
    Route::post('/contact-lists', [ContactListController::class, 'store']);
    Route::get('/contact-lists/{id}', [ContactListController::class, 'show']);
    Route::put('/contact-lists/{id}', [ContactListController::class, 'update']);
    Route::delete('/contact-lists/{id}', [ContactListController::class, 'destroy']);
    Route::post('/contact-lists/{id}/contacts', [ContactListController::class, 'addContacts']);

    // --- Canned Responses ---
    Route::get('/canned-responses', [CannedResponseController::class, 'index']);
    Route::post('/canned-responses', [CannedResponseController::class, 'store']);
    Route::put('/canned-responses/{id}', [CannedResponseController::class, 'update']);
    Route::delete('/canned-responses/{id}', [CannedResponseController::class, 'destroy']);

    // --- Campaigns ---
    Route::get('/campaigns', [CampaignController::class, 'index']);
    Route::post('/campaigns', [CampaignController::class, 'store']);
    Route::get('/campaigns/{id}', [CampaignController::class, 'show']);
    Route::put('/campaigns/{id}', [CampaignController::class, 'update']);
    Route::post('/campaigns/{id}/start', [CampaignController::class, 'start']);
    Route::put('/campaigns/{id}/pause', [CampaignController::class, 'pause']);
    Route::put('/campaigns/{id}/resume', [CampaignController::class, 'resume']);
    Route::get('/campaigns/{id}/recipients', [CampaignController::class, 'recipients']);
    Route::get('/campaigns/{id}/analytics', [CampaignController::class, 'analytics']);
    Route::delete('/campaigns/{id}', [CampaignController::class, 'destroy']);

    // --- WhatsApp Templates ---
    Route::get('/templates', [TemplateController::class, 'index']);
    Route::post('/templates/sync', [TemplateController::class, 'sync']);
    Route::get('/templates/{id}', [TemplateController::class, 'show']);
    Route::get('/templates/{name}/preview', [TemplateController::class, 'preview']);

    // --- WhatsApp Numbers ---
    Route::get('/whatsapp-numbers', [WhatsappNumberController::class, 'index']);
    Route::middleware('role:admin')->group(function () {
        Route::post('/whatsapp-numbers', [WhatsappNumberController::class, 'store']);
        Route::delete('/whatsapp-numbers/{id}', [WhatsappNumberController::class, 'destroy']);
    });
    Route::get('/whatsapp-numbers/{id}/qr', [WhatsappNumberController::class, 'qr']);
    Route::get('/whatsapp-numbers/{id}/status', [WhatsappNumberController::class, 'status']);
    Route::post('/whatsapp-numbers/{id}/sync-templates', [WhatsappNumberController::class, 'syncTemplates']);

    // --- Statistics ---
    Route::prefix('stats')->group(function () {
        Route::get('/dashboard', [StatsController::class, 'dashboard']);
        Route::get('/campaigns', [StatsController::class, 'campaigns']);
        Route::get('/agents', [StatsController::class, 'agents']);
        Route::get('/whatsapp', [StatsController::class, 'whatsapp']);
    });

    // --- Settings (admin/manager) ---
    Route::middleware('role:admin,manager')->prefix('settings')->group(function () {
        Route::get('/business-hours', [SettingsController::class, 'getBusinessHours']);
        Route::put('/business-hours', [SettingsController::class, 'updateBusinessHours']);
        Route::get('/auto-replies', [SettingsController::class, 'getAutoReplies']);
        Route::put('/auto-replies', [SettingsController::class, 'updateAutoReplies']);
    });
});
