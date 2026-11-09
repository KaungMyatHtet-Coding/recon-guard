import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import PrivacyPolicyModal from '@/Components/PrivacyPolicyModal';
import TextInput from '@/Components/TextInput';
import { useLanguage } from '@/Contexts/LanguageContext';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export default function Register() {
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const { language } = useLanguage();
    const isMm = language === 'mm';

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        privacy_policy_accepted: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="name" value="Name" />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />

                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                    />

                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        required
                    />

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                {/* Mandatory Privacy Policy Consent */}
                <div className="mt-4 flex items-start gap-2">
                    <Checkbox
                        id="privacy_policy_accepted"
                        name="privacy_policy_accepted"
                        checked={data.privacy_policy_accepted}
                        onChange={(e) =>
                            setData('privacy_policy_accepted', e.target.checked)
                        }
                        required
                        className="mt-0.5"
                    />
                    <label
                        htmlFor="privacy_policy_accepted"
                        className="text-xs text-slate-600 dark:text-slate-400 leading-normal"
                    >
                        {isMm
                            ? 'ကျွန်ုပ်သည် ReconGuard ၏ '
                            : 'I have read and agree to the '}
                        <button
                            type="button"
                            onClick={() => setShowPrivacyModal(true)}
                            className="font-bold text-indigo-600 dark:text-indigo-400 underline hover:opacity-80"
                        >
                            {isMm
                                ? 'လုံခြုံရေးနှင့် ကိုယ်ရေးအချက်အလက် မူဝါဒ'
                                : 'Privacy Policy & Data Compliance'}
                        </button>
                        {isMm ? ' ကို ဖတ်ရှုသဘောတူပါသည်။' : ' of ReconGuard.'}
                    </label>
                </div>
                <InputError
                    message={errors.privacy_policy_accepted}
                    className="mt-1"
                />

                <div className="mt-6 flex items-center justify-between">
                    <Link
                        href={route('login')}
                        className="rounded-md text-xs text-slate-600 dark:text-slate-400 underline hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        {isMm ? 'အကောင့်ရှိပြီးသားလား?' : 'Already registered?'}
                    </Link>

                    <PrimaryButton
                        className="ms-4"
                        disabled={processing || !data.privacy_policy_accepted}
                    >
                        {isMm ? 'အကောင့်ဖွင့်မည်' : 'Register'}
                    </PrimaryButton>
                </div>
            </form>

            <PrivacyPolicyModal
                show={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
            />
        </GuestLayout>
    );
}
