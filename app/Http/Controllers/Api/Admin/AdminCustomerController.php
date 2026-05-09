<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\AuthorizesAdminRequests;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    use AuthorizesAdminRequests;

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $customers = Customer::query()
            ->withCount(['users', 'devices'])
            ->orderBy('name')
            ->get()
            ->map(fn (Customer $customer): array => $this->customerPayload($customer));

        return response()->json([
            'customers' => $customers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $customer = Customer::query()->create($this->validatedCustomerData($request));

        return response()->json([
            'customer' => $this->customerPayload($customer->loadCount(['users', 'devices'])),
        ], 201);
    }

    public function show(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'customer' => $this->customerPayload($customer->loadCount(['users', 'devices'])),
        ]);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeAdmin($request);

        $customer->update($this->validatedCustomerData($request));

        return response()->json([
            'customer' => $this->customerPayload($customer->refresh()->loadCount(['users', 'devices'])),
        ]);
    }

    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        $this->authorizeAdmin($request);

        $customer->delete();

        return response()->json([
            'message' => 'Client deleted.',
        ]);
    }

    private function validatedCustomerData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    private function customerPayload(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'contact_name' => $customer->contact_name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'notes' => $customer->notes,
            'users_count' => $customer->getAttribute('users_count'),
            'devices_count' => $customer->getAttribute('devices_count'),
            'created_at' => $customer->created_at?->toISOString(),
            'updated_at' => $customer->updated_at?->toISOString(),
        ];
    }
}
