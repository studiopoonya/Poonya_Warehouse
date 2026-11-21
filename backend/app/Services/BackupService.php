<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;

/**
 * Backup database ke storage/app/backups.
 * SQLite: snapshot konsisten lewat "VACUUM INTO" (aman walau aplikasi sedang dipakai).
 */
class BackupService
{
    public const KEEP = 14; // simpan 14 backup terakhir

    public function dir(): string
    {
        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);

        return $dir;
    }

    public function create(string $reason = 'manual'): array
    {
        if (DB::getDriverName() !== 'sqlite') {
            throw new RuntimeException('Backup dari aplikasi hanya untuk SQLite. Untuk MySQL gunakan mysqldump / backup bawaan hosting.');
        }

        $name = 'poonya-'.now()->format('Ymd-His').($reason === 'auto' ? '-auto' : '').'.sqlite';
        $path = $this->dir().DIRECTORY_SEPARATOR.$name;
        DB::statement('VACUUM INTO ?', [$path]);

        $this->prune();

        return $this->describe($path);
    }

    /** @return array<int, array{name:string,size:int,created_at:string,auto:bool}> */
    public function list(): array
    {
        return collect(File::files($this->dir()))
            ->filter(fn ($f) => preg_match('/^poonya-\d{8}-\d{6}(-auto)?\.sqlite$/', $f->getFilename()))
            ->sortByDesc(fn ($f) => $f->getFilename())
            ->map(fn ($f) => $this->describe($f->getPathname()))
            ->values()->all();
    }

    /** Path aman untuk nama file backup (mencegah ../ dsb.) */
    public function path(string $name): ?string
    {
        if (! preg_match('/^poonya-\d{8}-\d{6}(-auto)?\.sqlite$/', $name)) {
            return null;
        }
        $path = $this->dir().DIRECTORY_SEPARATOR.$name;

        return is_file($path) ? $path : null;
    }

    private function prune(): void
    {
        foreach (array_slice($this->list(), self::KEEP) as $old) {
            File::delete($this->dir().DIRECTORY_SEPARATOR.$old['name']);
        }
    }

    private function describe(string $path): array
    {
        $name = basename($path);
        preg_match('/^poonya-(\d{8})-(\d{6})/', $name, $m);

        return [
            'name' => $name,
            'size' => filesize($path),
            'created_at' => \Carbon\Carbon::createFromFormat('Ymd His', "{$m[1]} {$m[2]}")->toIso8601String(),
            'auto' => str_contains($name, '-auto'),
        ];
    }
}
