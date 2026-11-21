<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Kategori barang — khusus owner */
class CategoryController extends Controller
{
    public function index()
    {
        return ['data' => Category::withCount(['items' => fn ($q) => $q->where('is_active', true)])->orderBy('name')->get(['id', 'name', 'slug'])];
    }

    public function store(Request $request)
    {
        $name = $this->validName($request);

        return response()->json(['data' => Category::createNamed($name)->loadCount('items')], 201);
    }

    public function update(Request $request, Category $category)
    {
        $name = $this->validName($request, $category);
        $category->update(['name' => $name, 'slug' => Category::uniqueSlug($name, $category->id)]);

        return ['data' => $category->loadCount('items')];
    }

    /** Barang di kategori ini tidak ikut terhapus — jadi "tanpa kategori" */
    public function destroy(Category $category)
    {
        $category->delete();

        return response()->noContent();
    }

    private function validName(Request $request, ?Category $category = null): string
    {
        $request->merge(['name' => trim(preg_replace('/\s+/', ' ', (string) $request->input('name')))]);

        $name = $request->validate([
            'name' => ['required', 'string', 'max:60'],
        ], ['name.required' => 'Nama kategori wajib diisi.'])['name'];

        // nama kembar dicek tanpa membedakan huruf besar/kecil
        $dup = Category::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->when($category, fn ($q) => $q->where('id', '!=', $category->id))->exists();
        if ($dup) {
            throw ValidationException::withMessages(['name' => 'Kategori dengan nama ini sudah ada.']);
        }

        return $name;
    }
}
