<?php

namespace App\Http\Controllers\Api\Admin\Concerns;

use App\Models\User;
use Illuminate\Http\Request;

trait AuthorizesAdminRequests
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === User::ROLE_ADMIN, 403);
    }
}
