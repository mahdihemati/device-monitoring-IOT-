<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telemetry', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->decimal('temperature_1', 8, 2)->nullable();
            $table->decimal('temperature_2', 8, 2)->nullable();
            $table->decimal('temperature_3', 8, 2)->nullable();
            $table->decimal('temperature_4', 8, 2)->nullable();
            $table->string('door_status', 50)->nullable();
            $table->string('pf_status', 50)->nullable();
            $table->json('raw_payload');
            $table->timestamp('recorded_at')->nullable()->index();
            $table->timestamps();

            $table->index(['device_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telemetry');
    }
};
