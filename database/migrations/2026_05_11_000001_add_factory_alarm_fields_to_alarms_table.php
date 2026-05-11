<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alarms', function (Blueprint $table): void {
            if (! Schema::hasColumn('alarms', 'code')) {
                $table->string('code', 20)->nullable()->after('type');
            }

            if (! Schema::hasColumn('alarms', 'sensor_number')) {
                $table->unsignedTinyInteger('sensor_number')->nullable()->after('code');
            }
        });

        Schema::table('alarms', function (Blueprint $table): void {
            $table->index(['device_id', 'code', 'is_resolved'], 'alarms_device_code_resolved_index');
            $table->index(['device_id', 'type', 'sensor_number', 'is_resolved'], 'alarms_device_type_sensor_resolved_index');
        });
    }

    public function down(): void
    {
        Schema::table('alarms', function (Blueprint $table): void {
            $table->dropIndex('alarms_device_code_resolved_index');
            $table->dropIndex('alarms_device_type_sensor_resolved_index');
        });

        Schema::table('alarms', function (Blueprint $table): void {
            if (Schema::hasColumn('alarms', 'sensor_number')) {
                $table->dropColumn('sensor_number');
            }

            if (Schema::hasColumn('alarms', 'code')) {
                $table->dropColumn('code');
            }
        });
    }
};
