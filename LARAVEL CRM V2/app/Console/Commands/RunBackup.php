<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * Daily backup: a mysqldump of the app database plus a tar archive of
 * storage/app (uploaded files, campaign images), written to
 * storage/app/backups. Keeps the last {retention} runs and deletes older
 * ones. This is local-disk-only — see DEPLOYMENT.md for wiring an
 * additional off-site copy (rsync/S3) on top of this.
 */
class RunBackup extends Command
{
    protected $signature = 'backup:run {--retention=7 : Number of most recent backups to keep}';

    protected $description = 'Dump the database and archive storage/app, pruning old backups';

    public function handle(): int
    {
        $backupDir = storage_path('app/backups');
        File::ensureDirectoryExists($backupDir);

        $timestamp = now()->format('Y-m-d_His');
        $dbDumpPath = "{$backupDir}/db_{$timestamp}.sql";
        $filesArchivePath = "{$backupDir}/files_{$timestamp}.tar.gz";

        if (! $this->dumpDatabase($dbDumpPath)) {
            return self::FAILURE;
        }

        $this->archiveFiles($filesArchivePath);

        $this->prune($backupDir, (int) $this->option('retention'));

        $this->info("Backup complete: {$dbDumpPath}");
        Log::info('[backup:run] اكتمل النسخ الاحتياطي', ['db' => $dbDumpPath, 'files' => $filesArchivePath]);

        return self::SUCCESS;
    }

    private function dumpDatabase(string $path): bool
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        $process = new Process([
            'mysqldump',
            '--host='.$config['host'],
            '--port='.$config['port'],
            '--user='.$config['username'],
            '--password='.$config['password'],
            '--single-transaction',
            '--quick',
            $config['database'],
        ]);

        $process->setTimeout(300);

        try {
            $process->mustRun();
            File::put($path, $process->getOutput());

            return true;
        } catch (\Exception $e) {
            $this->error("فشل نسخ قاعدة البيانات: {$e->getMessage()}");
            Log::error('[backup:run] فشل mysqldump', ['error' => $e->getMessage()]);

            return false;
        }
    }

    private function archiveFiles(string $path): void
    {
        $storageAppPath = storage_path('app');
        if (! File::isDirectory($storageAppPath)) {
            return;
        }

        $process = new Process([
            'tar',
            '-czf',
            $path,
            '--exclude=backups',
            '-C',
            $storageAppPath,
            '.',
        ]);
        $process->setTimeout(300);

        try {
            $process->mustRun();
        } catch (\Exception $e) {
            $this->warn("فشل أرشفة الملفات (تجاهل، النسخة الاحتياطية للـ DB نجحت): {$e->getMessage()}");
            Log::warning('[backup:run] فشل أرشفة storage/app', ['error' => $e->getMessage()]);
        }
    }

    private function prune(string $backupDir, int $retention): void
    {
        foreach (['db_*.sql', 'files_*.tar.gz'] as $pattern) {
            $files = collect(File::glob("{$backupDir}/{$pattern}"))
                ->sortByDesc(fn ($f) => filemtime($f))
                ->values();

            $files->slice($retention)->each(fn ($f) => File::delete($f));
        }
    }
}
