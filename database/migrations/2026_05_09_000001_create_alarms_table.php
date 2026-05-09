<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alarms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('type', 50);
            $table->string('severity', 20);
            $table->string('message');
            $table->decimal('value', 8, 2)->nullable();
            $table->decimal('threshold', 8, 2)->nullable();
            $table->boolean('is_resolved')->default(false);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('triggered_at')->index();
            $table->timestamps();

            $table->index(['device_id', 'type', 'is_resolved']);
            $table->index(['is_resolved', 'severity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alarms');
    }
};
