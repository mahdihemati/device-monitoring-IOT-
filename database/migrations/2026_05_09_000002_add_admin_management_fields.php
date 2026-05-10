<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            if (! Schema::hasColumn('customers', 'contact_name')) {
                $table->string('contact_name')->nullable()->after('name');
            }

            if (! Schema::hasColumn('customers', 'phone')) {
                $table->string('phone')->nullable()->after('contact_name');
            }

            if (! Schema::hasColumn('customers', 'email')) {
                $table->string('email')->nullable()->after('phone');
            }

            if (! Schema::hasColumn('customers', 'notes')) {
                $table->text('notes')->nullable()->after('email');
            }
        });

        if (! Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->foreignId('customer_id')->nullable()->change();
                $table->string('role', 20)->default('client')->after('password');
            });
        }

        Schema::table('devices', function (Blueprint $table): void {
            if (! Schema::hasColumn('devices', 'location')) {
                $table->string('location')->nullable()->after('serial_number');
            }

            if (! Schema::hasColumn('devices', 'notes')) {
                $table->text('notes')->nullable()->after('location');
            }
        });
    }

    public function down(): void
    {
        //
    }
};
