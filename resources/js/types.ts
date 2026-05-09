export type StatusValue = string | null;
export type OverallStatus = 'normal' | 'warning' | 'critical' | 'offline';
export type AlarmSeverity = 'warning' | 'critical';
export type UserRole = 'admin' | 'client';
export type AlarmType =
    | 'HIGH_TEMPERATURE'
    | 'LOW_TEMPERATURE'
    | 'DOOR_OPEN'
    | 'PF_FAULT'
    | 'DEVICE_OFFLINE'
    | 'INVALID_SENSOR_READING';

export interface Customer {
    id: number;
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    users_count?: number;
    devices_count?: number;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface User {
    id: number;
    name: string;
    username: string;
    role: UserRole;
    customer: Customer | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface Telemetry {
    id: number;
    device_id: number;
    temperature_1: number | null;
    temperature_2: number | null;
    temperature_3: number | null;
    temperature_4: number | null;
    door_status: StatusValue;
    pf_status: StatusValue;
    overall_status?: OverallStatus;
    alarm_indicator?: boolean;
    recorded_at: string | null;
    created_at: string | null;
}

export interface Device {
    id: number;
    customer_id?: number;
    device_code: string;
    name: string;
    serial_number: string | null;
    location?: string | null;
    notes?: string | null;
    last_seen_at: string | null;
    latest_telemetry: Telemetry | null;
    customer?: Customer | null;
    overall_status?: OverallStatus;
    active_alarm_count?: number;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface AlarmDevice {
    id: number;
    device_code: string;
    name: string;
}

export interface Alarm {
    id: number;
    device_id: number;
    type: AlarmType;
    severity: AlarmSeverity;
    message: string;
    value: number | null;
    threshold: number | null;
    is_resolved: boolean;
    resolved_at: string | null;
    triggered_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    device: AlarmDevice;
}

export interface ApiErrorBody {
    message?: string;
    errors?: Record<string, string[]>;
}
