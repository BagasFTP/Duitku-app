<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactorAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->hasTwoFactorEnabled() && ! $request->session()->get('two_factor_verified', false)) {
            return redirect()->route('two-factor.challenge');
        }

        return $next($request);
    }
}
