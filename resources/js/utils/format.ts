export function formatDateTime(value: string | null): string {
    if (! value) {
        return 'No data';
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function formatLongDateTime(value: string | null): string {
    if (! value) {
        return 'No data';
    }

    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(new Date(value));
}

export function formatTemperature(value: number | null): string {
    return value === null ? '--' : `${value.toFixed(1)} C`;
}

export function chartTime(value: string | null): string {
    if (! value) {
        return '';
    }

    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function formatAlarmType(value: string): string {
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
