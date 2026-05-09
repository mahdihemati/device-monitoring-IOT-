<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\AuthorizesAdminRequests;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminUserController extends Controller
{
    use AuthorizesAdminRequests;

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $users = User::query()
            ->with('customer')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user): array => $this->userPayload($user));

        return response()->json([
            'users' => $users,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $user = User::query()->create($this->validatedUserData($request, true));

        return response()->json([
            'user' => $this->userPayload($user->load('customer')),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $user->update($this->validatedUserData($request, false, $user));

        return response()->json([
            'user' => $this->userPayload($user->refresh()->load('customer')),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($request->user()->is($user)) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete your own admin account.'],
            ]);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted.',
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user->forceFill([
            'password' => $validated['password'],
        ])->save();

        return response()->json([
            'message' => 'Password reset.',
        ]);
    }

    private function validatedUserData(Request $request, bool $creating, ?User $user = null): array
    {
        $usernameRule = Rule::unique('users', 'username');

        if ($user) {
            $usernameRule->ignore($user);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                'required',
                'string',
                'max:255',
                $usernameRule,
            ],
            'password' => [$creating ? 'required' : 'sometimes', 'string', 'min:8'],
            'role' => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_CLIENT])],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
        ]);

        if ($validated['role'] === User::ROLE_CLIENT && empty($validated['customer_id'])) {
            throw ValidationException::withMessages([
                'customer_id' => ['Client users must be assigned to a client.'],
            ]);
        }

        if ($validated['role'] === User::ROLE_ADMIN) {
            $validated['customer_id'] = null;
        }

        return $validated;
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'role' => $user->role,
            'customer' => $user->customer ? [
                'id' => $user->customer->id,
                'name' => $user->customer->name,
                'contact_name' => $user->customer->contact_name,
                'phone' => $user->customer->phone,
                'email' => $user->customer->email,
                'notes' => $user->customer->notes,
            ] : null,
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];
    }
}
