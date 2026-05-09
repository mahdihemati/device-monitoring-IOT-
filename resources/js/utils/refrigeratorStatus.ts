import type { Device, OverallStatus, Telemetry } from '../types';

export type RefrigeratorStatusLevel = OverallStatus;

interface RefrigeratorStatus {
    level: RefrigeratorStatusLevel;
    label: string;
    detail: string;
}

const OFFLINE_AFTER_MINUTES = 10;
const OFFLINE_AFTER_MS = OFFLINE_AFTER_MINUTES * 60 * 1000;

function normalize(value: string | null): string {
    return value?.trim().toLowerCase() ?? '';
}

function isRecent(value: string | null): boolean {
    if (! value) {
        return false;
    }

    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
        return false;
    }

    return Date.now() - timestamp <= OFFLINE_AFTER_MS;
}

function hasAllSensorReadings(latest: Telemetry | null): boolean {
    if (! latest) {
        return false;
    }

    return latest?.temperature_1 !== null
        && latest?.temperature_2 !== null
        && latest?.temperature_3 !== null
        && latest?.temperature_4 !== null;
}

function isDoorNormal(value: string | null): boolean {
    return normalize(value) === 'closed';
}

function isPowerNormal(value: string | null): boolean {
    return normalize(value) === 'normal';
}

export function getRefrigeratorStatus(device: Device): RefrigeratorStatus {
    if (device.overall_status) {
        return statusFromOverallStatus(device.overall_status, device.active_alarm_count ?? 0);
    }

    const latest = device.latest_telemetry;
    const doorStatus = normalize(latest?.door_status ?? null);
    const powerStatus = normalize(latest?.pf_status ?? null);

    if (! isRecent(device.last_seen_at)) {
        return {
            level: 'offline',
            label: 'Offline',
            detail: `No recent telemetry in ${OFFLINE_AFTER_MINUTES}+ minutes`,
        };
    }

    if (powerStatus !== '' && ! isPowerNormal(powerStatus)) {
        return {
            level: 'critical',
            label: 'Critical',
            detail: 'PF status requires attention',
        };
    }

    if (doorStatus !== '' && ! isDoorNormal(doorStatus)) {
        return {
            level: 'warning',
            label: 'Warning',
            detail: 'Door is not closed',
        };
    }

    if (doorStatus === '' || powerStatus === '' || ! hasAllSensorReadings(latest)) {
        return {
            level: 'warning',
            label: 'Warning',
            detail: 'One or more sensor readings are missing',
        };
    }

    return {
        level: 'normal',
        label: 'Normal',
        detail: 'Reporting normally',
    };
}

function statusFromOverallStatus(level: OverallStatus, activeAlarmCount: number): RefrigeratorStatus {
    const alarmDetail = activeAlarmCount === 1 ? '1 active alarm' : `${activeAlarmCount} active alarms`;

    return matchStatus(level, alarmDetail);
}

function matchStatus(level: OverallStatus, alarmDetail: string): RefrigeratorStatus {
    switch (level) {
        case 'normal':
            return {
                level,
                label: 'Normal',
                detail: 'No active alarms',
            };
        case 'warning':
            return {
                level,
                label: 'Warning',
                detail: alarmDetail,
            };
        case 'critical':
            return {
                level,
                label: 'Critical',
                detail: alarmDetail,
            };
        case 'offline':
            return {
                level,
                label: 'Offline',
                detail: alarmDetail === '0 active alarms' ? `No recent telemetry in ${OFFLINE_AFTER_MINUTES}+ minutes` : alarmDetail,
            };
    }
}

export function countRefrigeratorStatuses(devices: Device[]): Record<RefrigeratorStatusLevel, number> {
    return devices.reduce<Record<RefrigeratorStatusLevel, number>>((counts, device) => {
        const status = getRefrigeratorStatus(device);
        counts[status.level] += 1;

        return counts;
    }, {
        normal: 0,
        warning: 0,
        critical: 0,
        offline: 0,
    });
}
