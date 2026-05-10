import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types';

const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

export const api = axios.create({
    baseURL: '/api',
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
    },
    withCredentials: true,
});

export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
        const axiosError = error as AxiosError<ApiErrorBody>;
        const fieldErrors = axiosError.response?.data?.errors;

        if (fieldErrors) {
            const firstFieldError = Object.values(fieldErrors).flat()[0];

            if (firstFieldError) {
                return translateApiMessage(firstFieldError);
            }
        }

        if (axiosError.response?.data?.message) {
            return translateApiMessage(axiosError.response.data.message);
        }

        if (! axiosError.response) {
            return 'ارتباط با سرور برقرار نشد.';
        }

        return 'خطای سرور رخ داد.';
    }

    return 'خطایی رخ داد.';
}

function translateApiMessage(message: string): string {
    const normalized = message.trim();

    const exactMessages: Record<string, string> = {
        'The provided credentials are invalid.': 'نام کاربری یا رمز عبور نادرست است.',
        'Unauthenticated.': 'نشست کاربری شما منقضی شده است. دوباره وارد شوید.',
        'This action is unauthorized.': 'برای انجام این عملیات دسترسی لازم را ندارید.',
        'Client users must be assigned to a client.': 'کاربر مشتری باید به یک مشتری تخصیص داده شود.',
        'You cannot delete your own admin account.': 'امکان حذف حساب مدیر فعلی وجود ندارد.',
        'No device exists for this device_code.': 'برای این کد دستگاه، یخچالی در سامانه تعریف نشده است.',
    };

    if (exactMessages[normalized]) {
        return exactMessages[normalized];
    }

    if (/^The .+ field is required\.$/.test(normalized)) {
        return 'پر کردن فیلدهای الزامی لازم است.';
    }

    if (/^The .+ has already been taken\.$/.test(normalized)) {
        return 'این مقدار قبلا ثبت شده است.';
    }

    if (/^The .+ must be at least \d+ characters\.$/.test(normalized)) {
        return 'مقدار واردشده کوتاه‌تر از حد مجاز است.';
    }

    if (/^The .+ must be a valid email address\.$/.test(normalized)) {
        return 'نشانی ایمیل معتبر نیست.';
    }

    return normalized;
}
