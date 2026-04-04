import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('two-factor.verify'));
    };

    return (
        <GuestLayout>
            <Head title="Two-Factor Authentication" />

            <div className="mb-4 text-sm text-gray-600">
                Please enter the 6-digit code from your authenticator app to
                continue.
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="code" value="Authentication Code" />

                    <TextInput
                        id="code"
                        type="text"
                        inputMode="numeric"
                        name="code"
                        value={data.code}
                        className="mt-1 block w-full tracking-widest"
                        autoComplete="one-time-code"
                        isFocused={true}
                        maxLength={6}
                        onChange={(e) => setData('code', e.target.value)}
                    />

                    <InputError message={errors.code} className="mt-2" />
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton disabled={processing}>Verify</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
