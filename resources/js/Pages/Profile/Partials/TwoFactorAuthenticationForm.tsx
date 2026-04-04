import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { PageProps } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import QRCode from 'qrcode';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

interface Props {
    twoFactorEnabled: boolean;
    twoFactorPending: boolean; // secret set but not confirmed yet
    className?: string;
}

export default function TwoFactorAuthenticationForm({
    twoFactorEnabled,
    twoFactorPending,
    className = '',
}: Props) {
    const { flash } = usePage<PageProps<{ flash: Record<string, string | null> }>>().props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrLoaded, setQrLoaded] = useState(false);
    const [secret, setSecret] = useState('');

    // Enable form
    const enableForm = useForm({});
    const startSetup: FormEventHandler = (e) => {
        e.preventDefault();
        enableForm.post(route('two-factor.store'));
    };

    // Confirm form
    const confirmForm = useForm({ code: '' });
    const submitConfirm: FormEventHandler = (e) => {
        e.preventDefault();
        confirmForm.post(route('two-factor.confirm'), {
            onFinish: () => confirmForm.reset('code'),
        });
    };

    // Disable form
    const disableForm = useForm({ password: '' });
    const submitDisable: FormEventHandler = (e) => {
        e.preventDefault();
        disableForm.delete(route('two-factor.destroy'), {
            onFinish: () => disableForm.reset('password'),
        });
    };

    // Load QR code from backend when pending setup
    useEffect(() => {
        if (!twoFactorPending) return;

        fetch(route('two-factor.show'))
            .then((res) => res.json())
            .then(({ qr_code_url, secret: s }) => {
                setSecret(s);
                if (canvasRef.current) {
                    QRCode.toCanvas(canvasRef.current, qr_code_url, {
                        width: 200,
                    });
                    setQrLoaded(true);
                }
            });
    }, [twoFactorPending]);

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">
                    Two-Factor Authentication
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                    Add an extra layer of security to your account using a TOTP
                    authenticator app (Google Authenticator, Authy, etc.).
                </p>
            </header>

            {flash?.status === '2fa-enabled' && (
                <div className="mt-4 text-sm font-medium text-green-600">
                    Two-factor authentication has been enabled.
                </div>
            )}
            {flash?.status === '2fa-disabled' && (
                <div className="mt-4 text-sm font-medium text-green-600">
                    Two-factor authentication has been disabled.
                </div>
            )}

            {/* Enabled state */}
            {twoFactorEnabled && (
                <div className="mt-5 space-y-4">
                    <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
                        Two-factor authentication is currently{' '}
                        <strong>enabled</strong>.
                    </div>

                    <form onSubmit={submitDisable} className="space-y-4">
                        <div>
                            <InputLabel
                                htmlFor="disable_password"
                                value="Confirm Password to Disable"
                            />
                            <TextInput
                                id="disable_password"
                                type="password"
                                name="password"
                                value={disableForm.data.password}
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                onChange={(e) =>
                                    disableForm.setData(
                                        'password',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={disableForm.errors.password}
                                className="mt-2"
                            />
                        </div>

                        <DangerButton disabled={disableForm.processing}>
                            Disable 2FA
                        </DangerButton>
                    </form>
                </div>
            )}

            {/* Pending confirmation state */}
            {!twoFactorEnabled && twoFactorPending && (
                <div className="mt-5 space-y-4">
                    <p className="text-sm text-gray-700">
                        Scan this QR code with your authenticator app, then
                        enter the 6-digit code below to confirm.
                    </p>

                    <canvas ref={canvasRef} className="rounded border" />

                    {qrLoaded && secret && (
                        <div>
                            <p className="text-xs text-gray-500">
                                Or enter the key manually:
                            </p>
                            <code className="mt-1 block rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-800">
                                {secret}
                            </code>
                        </div>
                    )}

                    <form onSubmit={submitConfirm} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="code" value="Authentication Code" />
                            <TextInput
                                id="code"
                                type="text"
                                inputMode="numeric"
                                name="code"
                                value={confirmForm.data.code}
                                className="mt-1 block w-full tracking-widest"
                                autoComplete="one-time-code"
                                maxLength={6}
                                onChange={(e) =>
                                    confirmForm.setData('code', e.target.value)
                                }
                            />
                            <InputError
                                message={confirmForm.errors.code}
                                className="mt-2"
                            />
                        </div>

                        <div className="flex gap-3">
                            <PrimaryButton disabled={confirmForm.processing}>
                                Confirm & Enable
                            </PrimaryButton>
                            <SecondaryButton
                                type="button"
                                onClick={() =>
                                    disableForm.delete(
                                        route('two-factor.destroy'),
                                    )
                                }
                            >
                                Cancel
                            </SecondaryButton>
                        </div>
                    </form>
                </div>
            )}

            {/* Not enabled state */}
            {!twoFactorEnabled && !twoFactorPending && (
                <div className="mt-5 space-y-4">
                    <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
                        Two-factor authentication is currently{' '}
                        <strong>disabled</strong>.
                    </div>

                    <form onSubmit={startSetup}>
                        <PrimaryButton disabled={enableForm.processing}>
                            Enable 2FA
                        </PrimaryButton>
                    </form>
                </div>
            )}
        </section>
    );
}
