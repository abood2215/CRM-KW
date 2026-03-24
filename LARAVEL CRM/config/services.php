<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Chatwoot
    'chatwoot' => [
        'base_url' => env('CHATWOOT_BASE_URL', 'http://localhost:3000'),
        'api_token' => env('CHATWOOT_API_TOKEN'),
        'account_id' => env('CHATWOOT_ACCOUNT_ID', 1),
    ],

    // Baileys WhatsApp
    'baileys' => [
        'base_url' => env('BAILEYS_BASE_URL', 'http://localhost:3001'),
    ],

    // Soketi WebSocket
    'soketi' => [
        'host' => env('SOKETI_HOST', '127.0.0.1'),
        'port' => env('SOKETI_PORT', 6001),
        'app_id' => env('SOKETI_APP_ID', 'app-id'),
        'app_key' => env('SOKETI_APP_KEY', 'app-key'),
        'app_secret' => env('SOKETI_APP_SECRET', 'app-secret'),
    ],

];
