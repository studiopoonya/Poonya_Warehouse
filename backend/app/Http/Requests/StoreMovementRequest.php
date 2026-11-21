<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:in,out,adjust'],
            'venue_id' => ['required', 'exists:venues,id'],
            'item_id' => ['required', 'exists:items,id'],
            // penyesuaian boleh 0 (stok habis), masuk/keluar minimal 1
            'quantity' => ['required', 'integer', $this->input('type') === 'adjust' ? 'min:0' : 'min:1'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'item_id.required' => 'Pilih barang terlebih dahulu.',
            'venue_id.required' => 'Pilih venue terlebih dahulu.',
            'quantity.required' => 'Jumlah wajib diisi.',
            'quantity.min' => 'Jumlah minimal :min.',
        ];
    }

    public function attributes(): array
    {
        return ['item_id' => 'barang', 'venue_id' => 'venue', 'quantity' => 'jumlah'];
    }
}
