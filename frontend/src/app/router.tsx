import React, { Suspense, useState } from 'react';
import { createBrowserRouter, RouterProvider, isRouteErrorResponse, useRouteError, useNavigate, Link } from 'react-router-dom';
import { ApplicationShell } from '@/layouts/ApplicationShell';
import { AuthGuard } from '@/app/guards/AuthGuard';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { authClient } from '@/services/authClient';
import { healthClient } from '@/services/healthClient';
import { LandingPage } from '@/pages/LandingPage';
import { AuthShell } from '@/pages/auth/authTheme';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import type { UserRole } from '@/types/auth';
import type { ApiErrorResponse } from '@/types/api';

// Lazy load feature pages
const DatasetPage = React.lazy(() => import('@/features/dataset/pages/DatasetPage').then(m => ({ default: m.DatasetPage })));
const ReportingPage = React.lazy(() => import('@/features/reports/pages/ReportingPage').then(m => ({ default: m.ReportingPage })));
const WorkspacePage = React.lazy(() => import('@/pages/WorkspacePage').then(m => ({ default: m.WorkspacePage })));

// INF-13: Hierarchical Error Boundaries
function RouteErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <div className="p-8 text-center"><h1 className="text-h1 font-bold">404</h1><p>Sector or Resource Not Found</p></div>;
    return <div className="p-8 text-center"><h1 className="text-h1 font-bold">{error.status}</h1><p>{error.statusText}</p></div>;
  }
  return <div className="p-8 text-center text-brand-error"><h1 className="text-h2 font-bold">Application Error</h1><p>An unexpected structural error occurred.</p></div>;
}

const SuspenseBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div className="flex h-full w-full items-center justify-center animate-pulse text-muted-foreground">Loading Sector...</div>}>
    {children}
  </Suspense>
);

// Decode a JWT payload (no verification — the backend enforces the token).
// Used only to derive org/sector/role for URL routing and RBAC display.
function decodeJwtClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== 'string') return null;
  const r = role.toLowerCase();
  return r === 'admin' || r === 'manager' || r === 'user' ? r : null;
}

function LoginGateway() {
  const login = useAuthStore(state => state.login);
  const setTenant = useTenantStore(state => state.setTenant);
  const setSector = useTenantStore(state => state.setSector);
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [sectorChoice, setSectorChoice] = useState<'retail' | 'service' | 'education' | 'agriculture'>('retail');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  // After a successful signup the user is created UNVERIFIED (backend sends a
  // verification email), so we do NOT auto-login — we show a "check your email"
  // screen instead. `notVerified` flags a 403 on login for a clearer message.
  const [signupSubmittedEmail, setSignupSubmittedEmail] = useState<string | null>(null);
  const [notVerified, setNotVerified] = useState(false);

  // Probe backend liveness (GET /health) on mount.
  React.useEffect(() => {
    let active = true;
    healthClient
      .check()
      .then(() => active && setBackendOnline(true))
      .catch(() => active && setBackendOnline(false));
    return () => { active = false; };
  }, []);

  // Establishes the session + routing context from a TokenResponse.
  const establishSession = (accessToken: string, refreshToken: string) => {
    const claims = decodeJwtClaims(accessToken);
    // Backend keys the tenant as organization_id; fall back defensively.
    const organizationId =
      (claims.organization_id as string) ||
      (claims.org_id as string) ||
      (claims.tenant_id as string) ||
      'org';
    const sector = (claims.sector as string) || sectorChoice;
    const role = normalizeRole(claims.role);

    login(accessToken, refreshToken, role);
    setTenant(organizationId);
    setSector(sector);
    navigate(`/${organizationId}/${sector}/dashboard`);
  };

  // A 403 on login means the email hasn't been verified yet. Detect it from the
  // HTTP status, falling back to the error code/message wording defensively.
  const isNotVerifiedError = (err: ApiErrorResponse): boolean => {
    if (err?.status === 403) return true;
    const code = (err?.code || '').toLowerCase();
    const message = (err?.message || '').toLowerCase();
    return code.includes('verif') || message.includes('verif');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotVerified(false);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        // Backend creates the user unverified and emails a verification link.
        // Do NOT establish a session — surface the "check your email" screen.
        await authClient.signup({
          organization_name: organizationName,
          email,
          password,
          sector: sectorChoice,
        });
        setSignupSubmittedEmail(email);
      } else {
        const tokens = await authClient.login({ email, password });
        establishSession(tokens.access_token, tokens.refresh_token);
      }
    } catch (err) {
      const apiError = err as ApiErrorResponse;
      if (mode === 'login' && isNotVerifiedError(apiError)) {
        setNotVerified(true);
        setError('Please verify your email first. Check your inbox for the verification link.');
      } else {
        setError(
          apiError?.message ||
            (mode === 'signup' ? 'Sign up failed.' : 'Login failed. Please check your credentials.'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // After signup: user is unverified. Show the "check your email" screen instead
  // of logging in. From here they open the emailed link -> /verify-email.
  if (signupSubmittedEmail) {
    return (
      <AuthShell>
        <div className="auth-card">
          <div className="auth-head">
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-sub">
              We sent a verification link to <strong>{signupSubmittedEmail}</strong>. Click it to
              verify your account, then log in.
            </p>
          </div>
          <p className="auth-notice">
            Check your email to verify your account before signing in.
          </p>
          <button
            type="button"
            className="auth-submit"
            onClick={() => {
              setSignupSubmittedEmail(null);
              setMode('login');
              setError(null);
            }}
          >
            Go to login
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="auth-card">
        <div className="auth-head">
          <h1 className="auth-title">
            {mode === 'signup' ? 'Create your organization' : 'Welcome back'}
          </h1>
          <p className="auth-sub">
            {mode === 'signup'
              ? 'Register your organization and first admin.'
              : 'Sign in to turn raw data into smarter decisions.'}
          </p>
          {backendOnline !== null && (
            <p className={`auth-status ${backendOnline ? 'is-online' : 'is-offline'}`}>
              {backendOnline ? '● Backend online' : '● Backend unreachable'}
            </p>
          )}
        </div>

        {mode === 'signup' && (
          <>
            <label className="auth-field">
              <span>Organization name</span>
              <input
                type="text"
                required
                value={organizationName}
                onChange={e => setOrganizationName(e.target.value)}
                className="auth-input"
              />
            </label>
            <label className="auth-field">
              <span>Sector</span>
              <select
                value={sectorChoice}
                onChange={e => setSectorChoice(e.target.value as typeof sectorChoice)}
                className="auth-input"
              >
                <option value="retail">Retail</option>
                <option value="service">Service</option>
                <option value="education">Education</option>
                <option value="agriculture">Agriculture</option>
              </select>
            </label>
          </>
        )}

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="auth-input"
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="auth-input"
          />
        </label>

        {error && (
          <p role="alert" className="auth-error">{error}</p>
        )}

        {notVerified && (
          <p className="auth-sub" style={{ fontSize: 13 }}>
            Didn't get the email? Open the verification link we sent, or contact your admin to
            resend it.
          </p>
        )}

        <button type="submit" disabled={submitting} className="auth-submit">
          {submitting
            ? mode === 'signup' ? 'Creating…' : 'Signing in…'
            : mode === 'signup' ? 'Create organization' : 'Sign in'}
        </button>

        <div className="auth-links">
          <button
            type="button"
            onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); setNotVerified(false); }}
            className="auth-toggle"
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
          {mode === 'login' && (
            <Link to="/forgot-password" className="auth-toggle">
              Forgot password?
            </Link>
          )}
        </div>
      </form>
    </AuthShell>
  );
}


const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/login',
    element: <LoginGateway />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/401',
    element: <div className="p-8 text-center text-brand-warning"><h1 className="text-h2 font-bold">401 Unauthorized</h1><p>Authentication Required</p></div>,
  },
  {
    path: '/403',
    element: <div className="p-8 text-center text-brand-error"><h1 className="text-h2 font-bold">403 Forbidden</h1><p>RBAC Role Boundary Exceeded</p></div>,
  },
  {
    path: '/:tenant_id',
    element: (
      <AuthGuard>
        <ApplicationShell />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '',
        element: <div>Select Sector: <a href="retail/dashboard">Retail</a></div>,
      },
      {
        path: ':sector_id',
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: 'datasets', element: <SuspenseBoundary><DatasetPage /></SuspenseBoundary> },
          { path: 'reports', element: <SuspenseBoundary><ReportingPage /></SuspenseBoundary> },
          // Every operating system (dashboard/reasoning/simulations/
          // recommendation/chat/admin) renders the SAME single scrollable
          // workspace page; the :os segment only picks the section to scroll
          // to. One route object => no remount between sections.
          { path: ':os', element: <SuspenseBoundary><WorkspacePage /></SuspenseBoundary> },
        ]
      }
    ],
  },
  {
    path: '*',
    element: <div className="p-8 text-center"><h1 className="text-h1 font-bold">404</h1><p>Route Not Found</p></div>,
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
