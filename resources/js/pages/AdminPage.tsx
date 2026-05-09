import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Building2, Code2, KeyRound, Pencil, Plus, RefreshCw, Save, Thermometer, Trash2, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { EmptyState, ErrorBanner, LoadingState } from '../components/StateBlocks';
import { SummaryStatCard } from '../components/SummaryStatCard';
import type { Customer, Device, User, UserRole } from '../types';
import { formatDateTime } from '../utils/format';

export type AdminSection = 'dashboard' | 'customers' | 'users' | 'devices';

type ManagedDevice = Omit<Device, 'latest_telemetry'> & {
    customer_id: number;
    latest_telemetry?: Device['latest_telemetry'];
    customer: Customer | null;
};

interface CustomerFormState {
    name: string;
    contact_name: string;
    phone: string;
    email: string;
    notes: string;
}

interface UserFormState {
    name: string;
    username: string;
    password: string;
    role: UserRole;
    customer_id: string;
}

interface DeviceFormState {
    customer_id: string;
    name: string;
    device_code: string;
    serial_number: string;
    location: string;
    notes: string;
}

interface RawTelemetryRecord {
    id: number;
    recorded_at: string | null;
    created_at: string | null;
    raw_payload: unknown;
}

const emptyCustomerForm: CustomerFormState = {
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    notes: '',
};

const emptyUserForm: UserFormState = {
    name: '',
    username: '',
    password: '',
    role: 'client',
    customer_id: '',
};

const emptyDeviceForm: DeviceFormState = {
    customer_id: '',
    name: '',
    device_code: '',
    serial_number: '',
    location: '',
    notes: '',
};

const sectionLinks: Array<{ section: AdminSection; to: string; label: string }> = [
    { section: 'dashboard', to: '/admin', label: 'Admin Dashboard' },
    { section: 'customers', to: '/admin/customers', label: 'Clients' },
    { section: 'users', to: '/admin/users', label: 'Users' },
    { section: 'devices', to: '/admin/devices', label: 'Refrigerators' },
];

function nullableString(value: string): string | null {
    const trimmed = value.trim();

    return trimmed === '' ? null : trimmed;
}

function customerToForm(customer: Customer): CustomerFormState {
    return {
        name: customer.name,
        contact_name: customer.contact_name ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        notes: customer.notes ?? '',
    };
}

function userToForm(user: User): UserFormState {
    return {
        name: user.name,
        username: user.username,
        password: '',
        role: user.role,
        customer_id: user.customer?.id ? String(user.customer.id) : '',
    };
}

function deviceToForm(device: ManagedDevice): DeviceFormState {
    return {
        customer_id: String(device.customer_id),
        name: device.name,
        device_code: device.device_code,
        serial_number: device.serial_number ?? '',
        location: device.location ?? '',
        notes: device.notes ?? '',
    };
}

function fieldClassName(): string {
    return 'mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100';
}

function textareaClassName(): string {
    return 'mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100';
}

function labelClassName(): string {
    return 'text-xs font-semibold uppercase text-slate-500';
}

function SectionHeader({
    id,
    title,
    description,
    action,
}: {
    id?: string;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h2 id={id} className="text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>
            {action}
        </div>
    );
}

function SuccessBanner({ message }: { message: string }) {
    return (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {message}
        </div>
    );
}

export function AdminPage({ section }: { section: AdminSection }) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [devices, setDevices] = useState<ManagedDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [customerFormMode, setCustomerFormMode] = useState<'create' | 'edit' | null>(null);
    const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
    const [customerForm, setCustomerForm] = useState<CustomerFormState>(emptyCustomerForm);

    const [userFormMode, setUserFormMode] = useState<'create' | 'edit' | null>(null);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
    const [resetUserId, setResetUserId] = useState<number | null>(null);
    const [resetPassword, setResetPassword] = useState('');

    const [deviceFormMode, setDeviceFormMode] = useState<'create' | 'edit' | null>(null);
    const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);
    const [deviceForm, setDeviceForm] = useState<DeviceFormState>(emptyDeviceForm);
    const [rawTelemetryDevice, setRawTelemetryDevice] = useState<ManagedDevice | null>(null);
    const [rawTelemetry, setRawTelemetry] = useState<RawTelemetryRecord[]>([]);
    const [rawTelemetryLoading, setRawTelemetryLoading] = useState(false);

    const fetchAdminData = useCallback(async (showRefresh = false) => {
        if (showRefresh) {
            setRefreshing(true);
        }

        try {
            const [customersResponse, usersResponse, devicesResponse] = await Promise.all([
                api.get<{ customers: Customer[] }>('/admin/customers'),
                api.get<{ users: User[] }>('/admin/users'),
                api.get<{ devices: ManagedDevice[] }>('/admin/devices'),
            ]);

            setCustomers(customersResponse.data.customers);
            setUsers(usersResponse.data.users);
            setDevices(devicesResponse.data.devices);
            setError(null);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchAdminData();
    }, [fetchAdminData]);

    const summary = useMemo(() => ({
        clients: customers.length,
        users: users.length,
        admins: users.filter((user) => user.role === 'admin').length,
        refrigerators: devices.length,
        activeAlarms: devices.reduce((total, device) => total + (device.active_alarm_count ?? 0), 0),
    }), [customers.length, devices, users]);

    const defaultCustomerId = customers[0]?.id ? String(customers[0].id) : '';

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    const startCreateCustomer = () => {
        clearMessages();
        setCustomerFormMode('create');
        setEditingCustomerId(null);
        setCustomerForm(emptyCustomerForm);
    };

    const startEditCustomer = (customer: Customer) => {
        clearMessages();
        setCustomerFormMode('edit');
        setEditingCustomerId(customer.id);
        setCustomerForm(customerToForm(customer));
    };

    const saveCustomer = async (event: FormEvent) => {
        event.preventDefault();

        const payload = {
            name: customerForm.name.trim(),
            contact_name: nullableString(customerForm.contact_name),
            phone: nullableString(customerForm.phone),
            email: nullableString(customerForm.email),
            notes: nullableString(customerForm.notes),
        };

        setBusyKey('customer-save');
        clearMessages();

        try {
            if (customerFormMode === 'edit' && editingCustomerId) {
                await api.put(`/admin/customers/${editingCustomerId}`, payload);
                setSuccess('Client updated.');
            } else {
                await api.post('/admin/customers', payload);
                setSuccess('Client created.');
            }

            setCustomerFormMode(null);
            await fetchAdminData(true);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setBusyKey(null);
        }
    };

    const deleteCustomer = async (customer: Customer) => {
        if (! window.confirm(`Delete ${customer.name}? This will also remove assigned users, refrigerators, telemetry, and alarms.`)) {
            return;
        }

        setBusyKey(`customer-delete-${customer.id}`);
        clearMessages();

        try {
            await api.delete(`/admin/customers/${customer.id}`);
            setSuccess('Client deleted.');
            await fetchAdminData(true);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setBusyKey(null);
        }
    };

    const startCreateUser = () => {
        clearMessages();
        setUserFormMode('create');
        setEditingUserId(null);
        setUserForm({ ...emptyUserForm, customer_id: defaultCustomerId });
    };

    const startEditUser = (user: User) => {
        clearMessages();
        setUserFormMode('edit');
        setEditingUserId(user.id);
        setUserForm(userToForm(user));
    };

    const saveUser = async (event: FormEvent) => {
        event.preventDefault();

        const payload = {
            name: userForm.name.trim(),
            username: userForm.username.trim(),
            ...(userFormMode === 'create' ? { password: userForm.password } : {}),
            role: userForm.role,
            customer_id: userForm.role === 'client' && userForm.customer_id ? Number(userForm.customer_id) : null,
        };

        setBusyKey('user-save');
        clearMessages();

        try {
            if (userFormMode === 'edit' && editingUserId) {
                await api.put(`/admin/users/${editingUserId}`, payload);
                setSuccess('User updated.');
            } else {
                await api.post('/admin/users', payload);
                setSuccess('User created.');
            }

            setUserFormMode(null);
            await fetchAdminData(true);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setBusyKey(null);
        }
    };

    const deleteUser = async (user: User) => {
        if (! window.confirm(`Delete user ${user.username}?`)) {
            return;
        }

        setBusyKey(`user-delete-${user.id}`);
        clearMessages();

        try {
            await api.delete(`/admin/users/${user.id}`);
            setSuccess('User deleted.');
            await fetchAdminData(true);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setBusyKey(null);
        }
    };

    const savePasswordReset = async (event: FormEvent) => {
        event.preventDefault();

        if (! resetUserId) {
            return;
        }

        setBusyKey(`user-reset-${resetUserId}`);
        clearMessages();

        try {
            await api.post(`/admin/users/${resetUserId}/reset-password`, { password: resetPassword });
            setResetUserId(null);
            setResetPassword('');
            setSuccess('Password reset.');
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setBusyKey(null);
        }
    };

    const startCreateDevice = () => {
        clearMessages();
        setDeviceFormMode('create');
        setEditingDeviceId(null);
        setDeviceForm({ ...emptyDeviceForm, customer_id: defaultCustomerId });
    };

    const startEditDevice = (device: ManagedDevice) => {
        clearMessages();
        setDeviceFormMode('edit');
        setEditingDeviceId(device.id);
        setDeviceForm(deviceToForm(device));
    };

    const saveDevice = async (event: FormEvent) => {
        event.preventDefault();

        const payload = {
            customer_id: Number(deviceForm.customer_id),
            name: deviceForm.name.trim(),
            device_code: deviceForm.device_code.trim(),
            serial_number: nullableString(deviceForm.serial_number),
            location: nullableString(deviceForm.location),
            notes: nullableString(deviceForm.notes),
        };

        setBusyKey('device-save');
        clearMessages();

        try {
            if (deviceFormMode === 'edit' && editingDeviceId) {
                await api.put(`/admin/devices/${editingDeviceId}`, payload);
                setSuccess('Refrigerator updated.');
            } else {
                await api.post('/admin/devices', payload);
                setSuccess('Refrigerator created.');
            }

            setDeviceFormMode(null);
            await fetchAdminData(true);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setBusyKey(null);
        }
    };

    const deleteDevice = async (device: ManagedDevice) => {
        if (! window.confirm(`Delete refrigerator ${device.name}? This will also remove its telemetry and alarms.`)) {
            return;
        }

        setBusyKey(`device-delete-${device.id}`);
        clearMessages();

        try {
            await api.delete(`/admin/devices/${device.id}`);
            setSuccess('Refrigerator deleted.');
            await fetchAdminData(true);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setBusyKey(null);
        }
    };

    const loadRawTelemetry = async (device: ManagedDevice) => {
        setRawTelemetryDevice(device);
        setRawTelemetryLoading(true);
        clearMessages();

        try {
            const response = await api.get<{ telemetry: RawTelemetryRecord[] }>(`/admin/devices/${device.id}/raw-telemetry`, {
                params: { limit: 10 },
            });

            setRawTelemetry(response.data.telemetry);
        } catch (caughtError) {
            setError(getErrorMessage(caughtError));
        } finally {
            setRawTelemetryLoading(false);
        }
    };

    if (loading) {
        return <LoadingState label="Loading admin tools" />;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">Admin Management</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Manage clients, login users, and blood refrigerator assignments for the monitoring system.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void fetchAdminData(true)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 sm:w-auto"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Refresh
                </button>
            </div>

            <nav className="flex gap-2 overflow-x-auto" aria-label="Admin navigation">
                {sectionLinks.map((item) => (
                    <Link
                        key={item.section}
                        to={item.to}
                        className={`inline-flex h-10 shrink-0 items-center rounded-lg border px-3 text-sm font-semibold transition ${
                            section === item.section
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                        }`}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            {error ? <ErrorBanner message={error} /> : null}
            {success ? <SuccessBanner message={success} /> : null}

            {section === 'dashboard' ? (
                <section className="space-y-5" aria-labelledby="admin-overview-heading">
                    <SectionHeader
                        id="admin-overview-heading"
                        title="Admin Dashboard"
                        description="A simple operational overview of configured clients, users, and refrigerators."
                    />
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                        <SummaryStatCard label="Clients" value={summary.clients} tone="neutral" description="Managed organizations" icon={<Building2 className="h-5 w-5" aria-hidden="true" />} />
                        <SummaryStatCard label="Users" value={summary.users} tone="normal" description="Login accounts" icon={<Users className="h-5 w-5" aria-hidden="true" />} />
                        <SummaryStatCard label="Admins" value={summary.admins} tone="neutral" description="Company users" icon={<KeyRound className="h-5 w-5" aria-hidden="true" />} />
                        <SummaryStatCard label="Refrigerators" value={summary.refrigerators} tone="normal" description="Assigned units" icon={<Thermometer className="h-5 w-5" aria-hidden="true" />} />
                        <SummaryStatCard label="Active Alarms" value={summary.activeAlarms} tone={summary.activeAlarms > 0 ? 'warning' : 'normal'} description="Open conditions" icon={<Thermometer className="h-5 w-5" aria-hidden="true" />} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <OverviewPanel title="Clients" link="/admin/customers" actionLabel="Manage clients">
                            {customers.slice(0, 5).map((customer) => (
                                <OverviewRow key={customer.id} title={customer.name} meta={`${customer.devices_count ?? 0} refrigerators`} />
                            ))}
                            {customers.length === 0 ? <p className="text-sm text-slate-500">No clients configured.</p> : null}
                        </OverviewPanel>
                        <OverviewPanel title="Users" link="/admin/users" actionLabel="Manage users">
                            {users.slice(0, 5).map((user) => (
                                <OverviewRow key={user.id} title={user.name} meta={`${user.role} - ${user.customer?.name ?? 'Company'}`} />
                            ))}
                            {users.length === 0 ? <p className="text-sm text-slate-500">No users configured.</p> : null}
                        </OverviewPanel>
                        <OverviewPanel title="Refrigerators" link="/admin/devices" actionLabel="Manage refrigerators">
                            {devices.slice(0, 5).map((device) => (
                                <OverviewRow key={device.id} title={device.name} meta={`${device.device_code} - ${device.customer?.name ?? 'Unassigned'}`} />
                            ))}
                            {devices.length === 0 ? <p className="text-sm text-slate-500">No refrigerators configured.</p> : null}
                        </OverviewPanel>
                    </div>
                </section>
            ) : null}

            {section === 'customers' ? (
                <section className="space-y-5" aria-labelledby="clients-heading">
                    <SectionHeader
                        id="clients-heading"
                        title="Clients"
                        description="Create and maintain client organizations that own refrigerator assignments."
                        action={(
                            <button type="button" onClick={startCreateCustomer} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                New Client
                            </button>
                        )}
                    />
                    {customerFormMode ? (
                        <CustomerForm
                            mode={customerFormMode}
                            form={customerForm}
                            busy={busyKey === 'customer-save'}
                            onCancel={() => setCustomerFormMode(null)}
                            onChange={setCustomerForm}
                            onSubmit={(event) => void saveCustomer(event)}
                        />
                    ) : null}
                    <CustomerTable customers={customers} busyKey={busyKey} onEdit={startEditCustomer} onDelete={(customer) => void deleteCustomer(customer)} />
                </section>
            ) : null}

            {section === 'users' ? (
                <section className="space-y-5" aria-labelledby="users-heading">
                    <SectionHeader
                        id="users-heading"
                        title="Users"
                        description="Create company admin accounts and client accounts assigned to a client organization."
                        action={(
                            <button type="button" onClick={startCreateUser} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                New User
                            </button>
                        )}
                    />
                    {userFormMode ? (
                        <UserForm
                            mode={userFormMode}
                            form={userForm}
                            customers={customers}
                            busy={busyKey === 'user-save'}
                            onCancel={() => setUserFormMode(null)}
                            onChange={setUserForm}
                            onSubmit={(event) => void saveUser(event)}
                        />
                    ) : null}
                    {resetUserId ? (
                        <form onSubmit={(event) => void savePasswordReset(event)} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <label className="block flex-1">
                                    <span className={labelClassName()}>New password</span>
                                    <input
                                        type="password"
                                        value={resetPassword}
                                        minLength={8}
                                        onChange={(event) => setResetPassword(event.target.value)}
                                        className={fieldClassName()}
                                    />
                                </label>
                                <button type="submit" disabled={busyKey === `user-reset-${resetUserId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                                    Reset Password
                                </button>
                                <button type="button" onClick={() => setResetUserId(null)} className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : null}
                    <UserTable
                        users={users}
                        busyKey={busyKey}
                        onEdit={startEditUser}
                        onDelete={(user) => void deleteUser(user)}
                        onReset={(user) => {
                            setResetUserId(user.id);
                            setResetPassword('');
                        }}
                    />
                </section>
            ) : null}

            {section === 'devices' ? (
                <section className="space-y-5" aria-labelledby="refrigerators-heading">
                    <SectionHeader
                        id="refrigerators-heading"
                        title="Refrigerators"
                        description="Assign physical blood refrigerators to clients and maintain the telemetry device code."
                        action={(
                            <button type="button" onClick={startCreateDevice} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                New Refrigerator
                            </button>
                        )}
                    />
                    {deviceFormMode ? (
                        <DeviceForm
                            mode={deviceFormMode}
                            form={deviceForm}
                            customers={customers}
                            busy={busyKey === 'device-save'}
                            onCancel={() => setDeviceFormMode(null)}
                            onChange={setDeviceForm}
                            onSubmit={(event) => void saveDevice(event)}
                        />
                    ) : null}
                    <DeviceTable
                        devices={devices}
                        busyKey={busyKey}
                        onEdit={startEditDevice}
                        onDelete={(device) => void deleteDevice(device)}
                        onRawTelemetry={(device) => void loadRawTelemetry(device)}
                    />
                    {rawTelemetryDevice ? (
                        <RawTelemetryPanel
                            device={rawTelemetryDevice}
                            records={rawTelemetry}
                            loading={rawTelemetryLoading}
                            onClose={() => {
                                setRawTelemetryDevice(null);
                                setRawTelemetry([]);
                            }}
                        />
                    ) : null}
                </section>
            ) : null}
        </div>
    );
}

function OverviewPanel({ title, link, actionLabel, children }: { title: string; link: string; actionLabel: string; children: ReactNode }) {
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-950">{title}</h3>
                <Link to={link} className="text-sm font-semibold text-sky-700 hover:text-sky-900">{actionLabel}</Link>
            </div>
            <div className="mt-4 space-y-3">{children}</div>
        </section>
    );
}

function OverviewRow({ title, meta }: { title: string; meta: string }) {
    return (
        <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>
        </div>
    );
}

function CustomerForm({
    mode,
    form,
    busy,
    onCancel,
    onChange,
    onSubmit,
}: {
    mode: 'create' | 'edit';
    form: CustomerFormState;
    busy: boolean;
    onCancel: () => void;
    onChange: (form: CustomerFormState) => void;
    onSubmit: (event: FormEvent) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                    <span className={labelClassName()}>Client name</span>
                    <input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} className={fieldClassName()} required />
                </label>
                <label className="block">
                    <span className={labelClassName()}>Contact name</span>
                    <input value={form.contact_name} onChange={(event) => onChange({ ...form, contact_name: event.target.value })} className={fieldClassName()} />
                </label>
                <label className="block">
                    <span className={labelClassName()}>Phone</span>
                    <input value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} className={fieldClassName()} />
                </label>
                <label className="block">
                    <span className={labelClassName()}>Email</span>
                    <input type="email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} className={fieldClassName()} />
                </label>
                <label className="block sm:col-span-2">
                    <span className={labelClassName()}>Notes</span>
                    <textarea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} className={textareaClassName()} />
                </label>
            </div>
            <FormActions busy={busy} submitLabel={mode === 'edit' ? 'Save Client' : 'Create Client'} onCancel={onCancel} />
        </form>
    );
}

function UserForm({
    mode,
    form,
    customers,
    busy,
    onCancel,
    onChange,
    onSubmit,
}: {
    mode: 'create' | 'edit';
    form: UserFormState;
    customers: Customer[];
    busy: boolean;
    onCancel: () => void;
    onChange: (form: UserFormState) => void;
    onSubmit: (event: FormEvent) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                    <span className={labelClassName()}>Name</span>
                    <input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} className={fieldClassName()} required />
                </label>
                <label className="block">
                    <span className={labelClassName()}>Username</span>
                    <input value={form.username} onChange={(event) => onChange({ ...form, username: event.target.value })} className={fieldClassName()} required />
                </label>
                {mode === 'create' ? (
                    <label className="block">
                        <span className={labelClassName()}>Password</span>
                        <input type="password" minLength={8} value={form.password} onChange={(event) => onChange({ ...form, password: event.target.value })} className={fieldClassName()} required />
                    </label>
                ) : null}
                <label className="block">
                    <span className={labelClassName()}>Role</span>
                    <select value={form.role} onChange={(event) => onChange({ ...form, role: event.target.value as UserRole })} className={fieldClassName()}>
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                    </select>
                </label>
                <label className="block sm:col-span-2">
                    <span className={labelClassName()}>Client assignment</span>
                    <select
                        value={form.customer_id}
                        onChange={(event) => onChange({ ...form, customer_id: event.target.value })}
                        disabled={form.role === 'admin'}
                        className={fieldClassName()}
                        required={form.role === 'client'}
                    >
                        <option value="">Select client</option>
                        {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>{customer.name}</option>
                        ))}
                    </select>
                </label>
            </div>
            <FormActions busy={busy} submitLabel={mode === 'edit' ? 'Save User' : 'Create User'} onCancel={onCancel} />
        </form>
    );
}

function DeviceForm({
    mode,
    form,
    customers,
    busy,
    onCancel,
    onChange,
    onSubmit,
}: {
    mode: 'create' | 'edit';
    form: DeviceFormState;
    customers: Customer[];
    busy: boolean;
    onCancel: () => void;
    onChange: (form: DeviceFormState) => void;
    onSubmit: (event: FormEvent) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                    <span className={labelClassName()}>Client</span>
                    <select value={form.customer_id} onChange={(event) => onChange({ ...form, customer_id: event.target.value })} className={fieldClassName()} required>
                        <option value="">Select client</option>
                        {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>{customer.name}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className={labelClassName()}>Refrigerator name</span>
                    <input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} className={fieldClassName()} required />
                </label>
                <label className="block">
                    <span className={labelClassName()}>Device code</span>
                    <input value={form.device_code} onChange={(event) => onChange({ ...form, device_code: event.target.value })} className={fieldClassName()} required />
                </label>
                <label className="block">
                    <span className={labelClassName()}>Serial number</span>
                    <input value={form.serial_number} onChange={(event) => onChange({ ...form, serial_number: event.target.value })} className={fieldClassName()} />
                </label>
                <label className="block sm:col-span-2">
                    <span className={labelClassName()}>Location</span>
                    <input value={form.location} onChange={(event) => onChange({ ...form, location: event.target.value })} className={fieldClassName()} />
                </label>
                <label className="block sm:col-span-2">
                    <span className={labelClassName()}>Notes</span>
                    <textarea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} className={textareaClassName()} />
                </label>
            </div>
            <FormActions busy={busy} submitLabel={mode === 'edit' ? 'Save Refrigerator' : 'Create Refrigerator'} onCancel={onCancel} />
        </form>
    );
}

function FormActions({ busy, submitLabel, onCancel }: { busy: boolean; submitLabel: string; onCancel: () => void }) {
    return (
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel
            </button>
            <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="h-4 w-4" aria-hidden="true" />
                {submitLabel}
            </button>
        </div>
    );
}

function CustomerTable({ customers, busyKey, onEdit, onDelete }: { customers: Customer[]; busyKey: string | null; onEdit: (customer: Customer) => void; onDelete: (customer: Customer) => void }) {
    if (customers.length === 0) {
        return <EmptyState title="No clients" message="Create a client before assigning users or refrigerators." />;
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-[900px] divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Client</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Contact</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Users</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Refrigerators</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {customers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-950">{customer.name}</td>
                                <td className="px-4 py-3 text-slate-600">{customer.contact_name ?? customer.phone ?? '--'}</td>
                                <td className="px-4 py-3 text-slate-600">{customer.email ?? '--'}</td>
                                <td className="px-4 py-3 text-slate-600">{customer.users_count ?? 0}</td>
                                <td className="px-4 py-3 text-slate-600">{customer.devices_count ?? 0}</td>
                                <td className="px-4 py-3">
                                    <RowActions
                                        deleteBusy={busyKey === `customer-delete-${customer.id}`}
                                        onEdit={() => onEdit(customer)}
                                        onDelete={() => onDelete(customer)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function UserTable({ users, busyKey, onEdit, onDelete, onReset }: { users: User[]; busyKey: string | null; onEdit: (user: User) => void; onDelete: (user: User) => void; onReset: (user: User) => void }) {
    if (users.length === 0) {
        return <EmptyState title="No users" message="Create an admin or client user to allow system access." />;
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-[900px] divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Username</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Client</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Created</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <Fragment key={user.id}>
                                <tr className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-semibold text-slate-950">{user.name}</td>
                                    <td className="px-4 py-3 font-mono text-slate-600">{user.username}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{user.customer?.name ?? 'Company'}</td>
                                    <td className="px-4 py-3 text-slate-600">{formatDateTime(user.created_at ?? null)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => onReset(user)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300">
                                                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                                                Reset
                                            </button>
                                            <RowActions
                                                deleteBusy={busyKey === `user-delete-${user.id}`}
                                                onEdit={() => onEdit(user)}
                                                onDelete={() => onDelete(user)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DeviceTable({
    devices,
    busyKey,
    onEdit,
    onDelete,
    onRawTelemetry,
}: {
    devices: ManagedDevice[];
    busyKey: string | null;
    onEdit: (device: ManagedDevice) => void;
    onDelete: (device: ManagedDevice) => void;
    onRawTelemetry: (device: ManagedDevice) => void;
}) {
    if (devices.length === 0) {
        return <EmptyState title="No refrigerators" message="Create a refrigerator and assign it to a client before telemetry arrives." />;
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-[1020px] divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Refrigerator</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Device Code</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Client</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Serial</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Last Seen</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {devices.map((device) => (
                            <tr key={device.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-950">{device.name}</td>
                                <td className="px-4 py-3 font-mono text-slate-600">{device.device_code}</td>
                                <td className="px-4 py-3 text-slate-600">{device.customer?.name ?? '--'}</td>
                                <td className="px-4 py-3 text-slate-600">{device.serial_number ?? '--'}</td>
                                <td className="px-4 py-3 text-slate-600">{device.location ?? '--'}</td>
                                <td className="px-4 py-3 text-slate-600">{formatDateTime(device.last_seen_at)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => onRawTelemetry(device)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300">
                                            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                                            Raw
                                        </button>
                                        <RowActions
                                            deleteBusy={busyKey === `device-delete-${device.id}`}
                                            onEdit={() => onEdit(device)}
                                            onDelete={() => onDelete(device)}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RawTelemetryPanel({
    device,
    records,
    loading,
    onClose,
}: {
    device: ManagedDevice;
    records: RawTelemetryRecord[];
    loading: boolean;
    onClose: () => void;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="raw-telemetry-heading">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 id="raw-telemetry-heading" className="text-base font-semibold text-slate-950">Raw Telemetry Payloads</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Latest MQTT/JSON payloads for {device.name} ({device.device_code}). Admin-only debug view.
                    </p>
                </div>
                <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
                    <X className="h-4 w-4" aria-hidden="true" />
                    Close
                </button>
            </div>
            {loading ? (
                <div className="p-4">
                    <LoadingState label="Loading raw telemetry" />
                </div>
            ) : records.length === 0 ? (
                <div className="p-4">
                    <EmptyState title="No raw payloads" message="Raw telemetry will appear after this refrigerator reports data." />
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {records.map((record) => (
                        <article key={record.id} className="p-4">
                            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-semibold text-slate-950">Telemetry #{record.id}</p>
                                <p className="text-xs font-medium text-slate-500">Recorded {formatDateTime(record.recorded_at)}</p>
                            </div>
                            <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                                {JSON.stringify(record.raw_payload, null, 2)}
                            </pre>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function RowActions({ deleteBusy, onEdit, onDelete }: { deleteBusy: boolean; onEdit: () => void; onDelete: () => void }) {
    return (
        <div className="flex justify-end gap-2">
            <button type="button" onClick={onEdit} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
            </button>
            <button type="button" disabled={deleteBusy} onClick={onDelete} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
            </button>
        </div>
    );
}
