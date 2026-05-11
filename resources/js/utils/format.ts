import { alarmTypeLabels } from './localization';

export function formatDateTime(value: string | null): string {
    if (! value) {
        return 'بدون داده';
    }

    return new Intl.DateTimeFormat('fa-IR', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function formatTime(value: string | null): string {
    if (! value) {
        return 'بدون داده';
    }

    return new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(new Date(value));
}

export function formatLongDateTime(value: string | null): string {
    if (! value) {
        return 'بدون داده';
    }

    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(new Date(value));
}

export function formatTemperatureDelta(value: number | null): string {
    if (value === null) {
        return 'بدون داده';
    }

    const formatted = new Intl.NumberFormat('fa-IR', {
        signDisplay: 'always',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value);

    return `${formatted} °C`;
}

export function formatTemperature(value: number | null): string {
    return value === null ? '--' : `${new Intl.NumberFormat('fa-IR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value)} °C`;
}

export function chartTime(value: string | null): string {
    if (! value) {
        return '';
    }

    return new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function formatAlarmType(value: string): string {
    if (value in alarmTypeLabels) {
        return alarmTypeLabels[value as keyof typeof alarmTypeLabels];
    }

    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
