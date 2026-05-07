export type StatusValue = string | null;

export interface Customer {
    id: number;
    name: string;
}

export interface User {
    id: number;
    name: string;
    username: string;
    customer: Customer;
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
    recorded_at: string | null;
    created_at: string | null;
}

export interface Device {
    id: number;
    device_code: string;
    name: string;
    serial_number: string | null;
    last_seen_at: string | null;
    latest_telemetry: Telemetry | null;
}

export interface ApiErrorBody {
    message?: string;
    errors?: Record<string, string[]>;
}
