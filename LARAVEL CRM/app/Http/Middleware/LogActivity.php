<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogActivity
{
    // الإجراءات التي تستحق التسجيل
    private array $trackedActions = [
        'POST'   => 'create',
        'PUT'    => 'update',
        'PATCH'  => 'update',
        'DELETE' => 'delete',
    ];

    // المسارات التي لا نريد تسجيلها
    private array $excludedPaths = [
        'api/auth/me',
        'api/auth/login',
        'api/auth/logout',
        'api/stats',
        'api/webhooks',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // تسجيل فقط العمليات التعديلية الناجحة
        if (
            $request->user() &&
            isset($this->trackedActions[$request->method()]) &&
            $response->getStatusCode() < 400 &&
            !$this->isExcluded($request)
        ) {
            $this->log($request, $response);
        }

        return $response;
    }

    private function isExcluded(Request $request): bool
    {
        foreach ($this->excludedPaths as $path) {
            if (str_contains($request->path(), $path)) {
                return true;
            }
        }
        return false;
    }

    private function log(Request $request, Response $response): void
    {
        try {
            $action  = $this->trackedActions[$request->method()];
            $segment = $request->segment(2); // e.g. "clients", "campaigns"

            $modelTypeMap = [
                'clients'        => 'CrmClient',
                'tasks'          => 'CrmTask',
                'campaigns'      => 'Campaign',
                'contacts'       => 'Contact',
                'contact-lists'  => 'ContactList',
                'canned-responses' => 'CannedResponse',
                'users'          => 'User',
                'whatsapp-numbers' => 'WhatsappNumber',
                'templates'      => 'WhatsappTemplate',
            ];

            $modelType = $modelTypeMap[$segment] ?? $segment;
            $modelId   = $request->segment(3) ?? null;

            $descriptionMap = [
                'create' => "إنشاء {$modelType}",
                'update' => "تعديل {$modelType} #{$modelId}",
                'delete' => "حذف {$modelType} #{$modelId}",
            ];

            ActivityLog::log(
                action: $action,
                description: $descriptionMap[$action] ?? $action,
                userId: $request->user()->id,
                modelType: $modelType,
                modelId: $modelId ? (int) $modelId : null,
                metadata: [
                    'method' => $request->method(),
                    'path'   => $request->path(),
                    'ip'     => $request->ip(),
                ]
            );
        } catch (\Exception $e) {
            // لا نريد أن يكسر تسجيل النشاط التطبيق
        }
    }
}
