<?php

namespace Database\Seeders;

use App\Models\AutoReply;
use App\Models\BusinessHour;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create Admin User
        User::create([
            'name' => 'مدير النظام',
            'email' => 'admin@mutmaenna.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Create Manager User
        User::create([
            'name' => 'مدير العمليات',
            'email' => 'manager@mutmaenna.com',
            'password' => Hash::make('password'),
            'role' => 'manager',
            'is_active' => true,
        ]);

        // Create Agent User
        User::create([
            'name' => 'موظف استقبال',
            'email' => 'agent@mutmaenna.com',
            'password' => Hash::make('password'),
            'role' => 'agent',
            'is_active' => true,
        ]);

        // Business Hours (Sunday to Thursday, 9 AM - 5 PM)
        $days = [
            0 => ['name' => 'الأحد', 'active' => true],
            1 => ['name' => 'الاثنين', 'active' => true],
            2 => ['name' => 'الثلاثاء', 'active' => true],
            3 => ['name' => 'الأربعاء', 'active' => true],
            4 => ['name' => 'الخميس', 'active' => true],
            5 => ['name' => 'الجمعة', 'active' => false],
            6 => ['name' => 'السبت', 'active' => false],
        ];

        foreach ($days as $dayNum => $day) {
            BusinessHour::create([
                'day_of_week' => $dayNum,
                'start_time' => '09:00',
                'end_time' => '17:00',
                'is_active' => $day['active'],
            ]);
        }

        // Auto Replies
        AutoReply::create([
            'trigger' => 'outside_hours',
            'message' => 'شكراً لتواصلكم مع مركز مطمئنة للاستشارات اللغوية 🌟
ساعات العمل لدينا من الأحد إلى الخميس من 9 صباحاً حتى 5 مساءً.
سنرد عليكم في أقرب وقت ممكن خلال ساعات العمل. شكراً لصبركم 🙏',
            'is_active' => true,
        ]);

        AutoReply::create([
            'trigger' => 'first_message',
            'message' => 'أهلاً وسهلاً بك في مركز مطمئنة للاستشارات اللغوية! 🌟
كيف يمكننا مساعدتك اليوم؟
سيقوم أحد مستشارينا بالرد عليك قريباً.',
            'is_active' => true,
        ]);
    }
}
