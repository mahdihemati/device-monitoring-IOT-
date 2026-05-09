<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->string('contact_name')->nullable()->after('name');
            $table->string('phone')->nullable()->after('contact_name');
            $table->string('email')->nullable()->after('phone');
            $table->text('notes')->nullable()->after('email');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('customer_id')->nullable()->change();
            $table->string('role', 20)->default('client')->after('password');
        });

        Schema::table('devices', function (Blueprint $table): void {
            $table->string('location')->nullable()->after('serial_number');
            $table->text('notes')->nullable()->after('location');
        });
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table): void {
            $table->dropColumn(['location', 'notes']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('role');
            $table->foreignId('customer_id')->nullable(false)->change();
        });

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropColumn(['contact_name', 'phone', 'email', 'notes']);
        });
    }
};
