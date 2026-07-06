<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController extends Controller
{
    public function index(Request $request)
    {
        $query = File::where('user_id', $request->user()->id)->orderByDesc('created_at');

        if ($request->category && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->search) {
            $query->where('original_name', 'like', '%'.$request->search.'%');
        }

        $files = $query->paginate(20);

        return response()->json([
            'files' => $files->items(),
            'meta' => [
                'total' => $files->total(),
                'last_page' => $files->lastPage(),
                'current_page' => $files->currentPage(),
            ],
            'storage_used' => File::where('user_id', $request->user()->id)->sum('size'),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate(['file' => 'required|file|max:51200']);

        $uploadedFile = $request->file('file');
        $mimeType = $uploadedFile->getMimeType();
        $storedName = Str::uuid().'.'.$uploadedFile->getClientOriginalExtension();
        $path = $uploadedFile->storeAs("drive/{$request->user()->id}", $storedName, 'local');

        $file = File::create([
            'user_id' => $request->user()->id,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'stored_name' => $storedName,
            'path' => $path,
            'mime_type' => $mimeType,
            'size' => $uploadedFile->getSize(),
            'category' => File::detectCategory($mimeType ?? ''),
        ]);

        return response()->json($file, 201);
    }

    public function download(Request $request, File $file)
    {
        if ($file->user_id !== $request->user()->id) {
            abort(403);
        }

        if (! Storage::disk('local')->exists($file->path)) {
            abort(404, 'الملف غير موجود على السيرفر');
        }

        return Storage::disk('local')->download($file->path, $file->original_name);
    }

    public function destroy(Request $request, File $file)
    {
        if ($file->user_id !== $request->user()->id) {
            abort(403);
        }

        Storage::disk('local')->delete($file->path);
        $file->delete();

        return response()->json(['message' => 'تم الحذف']);
    }
}
