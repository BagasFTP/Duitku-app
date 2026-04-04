<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    protected Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Generate a new 2FA secret and store it (unconfirmed) on the user.
     * Returns the QR code URL so the frontend can render the QR.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $secret = $this->google2fa->generateSecretKey();

        $user->forceFill([
            'two_factor_secret'       => $secret,
            'two_factor_confirmed_at' => null,
        ])->save();

        return redirect()->route('profile.edit')->with('status', '2fa-setup');
    }

    /**
     * Return the QR code URL and secret for the currently logged-in user.
     * Used by the profile page to show the QR code.
     */
    public function show(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();

        if (is_null($user->two_factor_secret)) {
            return response()->json(['error' => 'No secret generated.'], 422);
        }

        return response()->json([
            'qr_code_url' => $user->twoFactorQrCodeUrl(),
            'secret'      => $user->two_factor_secret,
        ]);
    }

    /**
     * Confirm and enable 2FA after user scans QR and enters OTP.
     */
    public function confirm(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'digits:6'],
        ]);

        $user = $request->user();

        if (is_null($user->two_factor_secret)) {
            return back()->withErrors(['code' => 'Please set up 2FA first.']);
        }

        $valid = $this->google2fa->verifyKey(
            $user->two_factor_secret,
            $request->code
        );

        if (! $valid) {
            return back()->withErrors(['code' => 'The code is invalid. Please try again.']);
        }

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
        ])->save();

        return redirect()->route('profile.edit')->with('status', '2fa-enabled');
    }

    /**
     * Disable 2FA for the user.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $request->user()->forceFill([
            'two_factor_secret'       => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return redirect()->route('profile.edit')->with('status', '2fa-disabled');
    }

    /**
     * Show the 2FA challenge page (shown after password login when 2FA is enabled).
     */
    public function challenge(): Response
    {
        return Inertia::render('Auth/TwoFactorChallenge');
    }

    /**
     * Verify the OTP entered during the login challenge.
     */
    public function verify(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'digits:6'],
        ]);

        $user = Auth::user();

        if (! $user || ! $user->hasTwoFactorEnabled()) {
            return redirect()->route('dashboard');
        }

        $valid = $this->google2fa->verifyKey(
            $user->two_factor_secret,
            $request->code
        );

        if (! $valid) {
            return back()->withErrors(['code' => 'Invalid authentication code. Please try again.']);
        }

        $request->session()->put('two_factor_verified', true);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
