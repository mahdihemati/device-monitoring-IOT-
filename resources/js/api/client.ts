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
                return firstFieldError;
            }
        }

        return axiosError.response?.data?.message ?? axiosError.message;
    }

    return 'Something went wrong.';
}
