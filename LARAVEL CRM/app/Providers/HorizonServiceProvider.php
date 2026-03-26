<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        parent::boot();

        // يمكن تخصيص الـ night mode أو الـ theme هنا
        // Horizon::night();
    }

    /**
     * تحديد من يُسمح له برؤية لوحة Horizon (المدير فقط)
     */
    protected function gate(): void
    {
        Gate::define('viewHorizon', function ($user) {
            // فقط المستخدمون ذوو دور admin يمكنهم الوصول للوحة Horizon
            return $user->role === 'admin';
        });
    }
}
