<?php

namespace App\Http\Requests;

use App\Models\Item;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $itemId = $this->route('item')?->id;

        return [
            // SKU boleh kosong: dibuat otomatis dari nama barang
            'sku' => ['nullable', 'string', 'max:50', Rule::unique('items', 'sku')->ignore($itemId)],
            'name' => ['required', 'string', 'max:150'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'unit' => ['required', 'string', 'max:20'],
            'kind' => ['nullable', Rule::in(array_keys(Item::KIND_LABELS))],
            // jumlah standar dibawa ke event (khusus peralatan)
            'kit_qty' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'price' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
            'stocks' => ['array'],
            'stocks.*.venue_id' => ['required', 'exists:venues,id'],
            'stocks.*.quantity' => ['nullable', 'integer', 'min:0'],
            'stocks.*.min_stock' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'sku.unique' => 'SKU sudah dipakai barang lain.',
            'name.required' => 'Nama barang wajib diisi.',
            'unit.required' => 'Satuan wajib diisi.',
            'category_id.exists' => 'Kategori tidak ditemukan.',
            'stocks.*.quantity.min' => 'Stok tidak boleh minus.',
            'stocks.*.min_stock.min' => 'Minimum stok tidak boleh minus.',
            'kind.in' => 'Jenis barang tidak valid.',
            'kit_qty.min' => 'Jumlah standar dibawa tidak boleh minus.',
        ];
    }

    public function attributes(): array
    {
        return ['sku' => 'SKU', 'name' => 'nama barang', 'category_id' => 'kategori', 'unit' => 'satuan'];
    }
}
