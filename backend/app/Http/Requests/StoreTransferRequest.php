<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_venue_id' => ['required', 'exists:venues,id'],
            'to_venue_id' => ['required', 'exists:venues,id', 'different:from_venue_id'],
            'note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'distinct', 'exists:items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'to_venue_id.different' => 'Venue tujuan harus berbeda dengan venue asal.',
            'items.required' => 'Pilih minimal satu barang.',
            'items.*.item_id.distinct' => 'Barang yang sama dipilih lebih dari sekali.',
            'items.*.quantity.min' => 'Jumlah minimal 1.',
        ];
    }
}
