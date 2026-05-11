import type { AlarmSeverity, AlarmType, OverallStatus } from '../types';

export const productNameFa = 'داشبورد پایش یخچال‌های خون';

export const persianNumberFormatter = new Intl.NumberFormat('fa-IR');

export function toPersianNumber(value: number | string): string {
    return String(value).replace(/\d/g, (digit) => persianNumberFormatter.format(Number(digit)));
}

export function formatCount(value: number): string {
    return persianNumberFormatter.format(value);
}

export function alarmCountText(value: number): string {
    return `${formatCount(value)} هشدار فعال`;
}

export const statusLabels: Record<OverallStatus, string> = {
    normal: 'عادی',
    warning: 'هشدار',
    critical: 'بحرانی',
    offline: 'آفلاین',
};

export const severityLabels: Record<AlarmSeverity, string> = {
    warning: 'هشدار',
    critical: 'بحرانی',
};

export const alarmTypeLabels: Record<AlarmType, string> = {
    HIGH_TEMPERATURE: 'دمای بالا',
    LOW_TEMPERATURE: 'دمای پایین',
    DOOR_OPEN: 'باز بودن درب',
    PF_FAULT: 'خطای PF',
    DEVICE_OFFLINE: 'آفلاین بودن یخچال',
    INVALID_SENSOR_READING: 'داده نامعتبر سنسور',
};

const alarmCodeLabels: Record<string, string> = {
    ot1: 'دمای بالای سنسور ۱',
    ot2: 'دمای بالای سنسور ۲',
    ot3: 'دمای بالای سنسور ۳',
    ot4: 'دمای بالای سنسور ۴',
    ut1: 'دمای پایین سنسور ۱',
    ut2: 'دمای پایین سنسور ۲',
    ut3: 'دمای پایین سنسور ۳',
    ut4: 'دمای پایین سنسور ۴',
    pf: 'خطای PF',
    DOOR: 'هشدار درب',
    OFFLINE: 'آفلاین بودن یخچال',
    INVALID_SENSOR: 'داده نامعتبر سنسور',
};

export function alarmCodeLabel(value: string | null): string | null {
    return value ? alarmCodeLabels[value] ?? value : null;
}

export function statusValueLabel(value: string | null, type: 'door' | 'pf'): string {
    const normalized = value?.trim().toLowerCase() ?? '';

    if (normalized === '' || normalized === 'unknown') {
        return 'نامشخص';
    }

    if (type === 'door') {
        if (['open', 'opened', 'true', '1', 'yes', 'on'].includes(normalized)) {
            return 'باز';
        }

        if (['closed', 'close', 'false', '0', 'no', 'off'].includes(normalized)) {
            return 'بسته';
        }
    }

    if (type === 'pf') {
        if (['normal', 'ok', 'okay', 'good', 'healthy'].includes(normalized)) {
            return 'عادی';
        }

        if (['warning', 'warn'].includes(normalized)) {
            return 'هشدار';
        }

        if (['fault', 'failed', 'failure', 'fail', 'error', 'alarm', 'trip', 'tripped', 'offline'].includes(normalized)) {
            return 'خطا';
        }
    }

    return normalized.replace(/[_-]/g, ' ');
}

export function roleLabel(value: string): string {
    return value === 'admin' ? 'مدیر' : 'مشتری';
}
