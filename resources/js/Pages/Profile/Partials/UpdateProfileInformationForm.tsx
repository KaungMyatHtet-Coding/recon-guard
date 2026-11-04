import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            nrc_number: user.nrc_number || '',
            address: user.address || '',
            emergency_contact: user.emergency_contact || '',
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Mandatory Financial Actor Information
                </h2>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Maintain official identity KYC information required for corporate audit, compliance records, and banking verification.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="name" value="Full Name *" className="text-slate-700 dark:text-slate-300" />
                        <TextInput
                            id="name"
                            className="mt-1 block w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            isFocused
                            autoComplete="name"
                        />
                        <InputError className="mt-2" message={errors.name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="Email Address *" className="text-slate-700 dark:text-slate-300" />
                        <TextInput
                            id="email"
                            type="email"
                            className="mt-1 block w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="username"
                        />
                        <InputError className="mt-2" message={errors.email} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="phone" value="Phone Number *" className="text-slate-700 dark:text-slate-300" />
                        <TextInput
                            id="phone"
                            type="tel"
                            placeholder="+959..."
                            className="mt-1 block w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            required
                            autoComplete="tel"
                        />
                        <InputError className="mt-2" message={errors.phone} />
                    </div>

                    <div>
                        <InputLabel htmlFor="nrc_number" value="National Registration Card (NRC) *" className="text-slate-700 dark:text-slate-300" />
                        <TextInput
                            id="nrc_number"
                            placeholder="e.g. 12/MAGANA(N)123456"
                            className="mt-1 block w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                            value={data.nrc_number}
                            onChange={(e) => setData('nrc_number', e.target.value)}
                            required
                        />
                        <InputError className="mt-2" message={errors.nrc_number} />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="address" value="Physical / Corporate Address *" className="text-slate-700 dark:text-slate-300" />
                    <textarea
                        id="address"
                        rows={2}
                        className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        required
                        placeholder="Enter full street address, township, city"
                    />
                    <InputError className="mt-2" message={errors.address} />
                </div>

                <div>
                    <InputLabel htmlFor="emergency_contact" value="Emergency Contact / Secondary Authorized Phone *" className="text-slate-700 dark:text-slate-300" />
                    <TextInput
                        id="emergency_contact"
                        type="tel"
                        placeholder="+959..."
                        className="mt-1 block w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={data.emergency_contact}
                        onChange={(e) => setData('emergency_contact', e.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.emergency_contact} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-gray-600 dark:text-gray-400 underline hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton disabled={processing} className="bg-indigo-600 hover:bg-indigo-500">
                        Update Financial Profile
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Profile Saved Successfully.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
