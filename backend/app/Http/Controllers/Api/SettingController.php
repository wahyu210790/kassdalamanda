<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Http\Requests\Setting\UpdateSettingRequest;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::pluck('value', 'key');
        
        return response()->json([
            'data' => [
                'monthly_cash_amount' => (int) ($settings['monthly_cash_amount'] ?? 10000),
                'monthly_saving_amount' => (int) ($settings['monthly_saving_amount'] ?? 5000),
            ]
        ]);
    }

    public function update(UpdateSettingRequest $request)
    {
        $data = $request->validated();
        
        foreach ($data as $key => $value) {
            if ($value !== null) {
                Setting::set($key, (string) $value);
            }
        }

        return response()->json(['message' => 'Pengaturan berhasil disimpan']);
    }
}
