import React from 'react';
import { useNavigate } from 'react-router-dom';

// Scoped landing-page theme shared by every auth screen (login, signup notice,
// verify-email, forgot-password, reset-password). Kept local (and only mounted
// on these routes) so it never affects the app's global Tailwind theme.
export const AUTH_THEME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Inter:wght@400;500;600&display=swap');

.auth-page {
  --signal-orange: #ff682c;
  --carbon: #202020;
  --graphite: #4d4d4d;
  --slate: #828282;
  --fog: #f5f5f5;
  --mist: #efefef;
  --chalk: #e8e8e8;
  --paper: #ffffff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 40px 20px;
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(255,104,44,0.10), transparent 60%),
    var(--mist);
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  color: var(--carbon);
}
.auth-logo {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: -0.4px;
  color: var(--carbon);
  cursor: pointer;
  text-decoration: none;
}
.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--paper);
  border: 1px solid var(--chalk);
  border-radius: 20px;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 4px 24px rgba(32,32,32,0.06), 0 1px 3px rgba(32,32,32,0.04);
}
.auth-head { text-align: left; margin-bottom: 4px; }
.auth-title {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 30px;
  line-height: 1.13;
  letter-spacing: -0.6px;
  font-weight: 600;
  color: var(--carbon);
  margin-bottom: 6px;
}
.auth-sub { font-size: 15px; color: var(--slate); }
.auth-status { font-size: 12px; margin-top: 8px; font-weight: 500; }
.auth-status.is-online { color: #059669; }
.auth-status.is-offline { color: var(--signal-orange); }
.auth-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.auth-field > span { color: var(--graphite); font-weight: 500; }
.auth-input {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  color: var(--carbon);
  background: var(--fog);
  border: 1px solid var(--chalk);
  border-radius: 12px;
  padding: 11px 14px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  outline: none;
}
.auth-input:focus {
  border-color: var(--signal-orange);
  background: var(--paper);
  box-shadow: 0 0 0 3px rgba(255,104,44,0.15);
}
.auth-error {
  font-size: 13px;
  color: var(--signal-orange);
  background: rgba(255,104,44,0.08);
  border: 1px solid rgba(255,104,44,0.2);
  border-radius: 10px;
  padding: 8px 12px;
}
.auth-notice {
  font-size: 13px;
  color: #059669;
  background: rgba(5,150,105,0.08);
  border: 1px solid rgba(5,150,105,0.2);
  border-radius: 10px;
  padding: 8px 12px;
}
.auth-submit {
  margin-top: 4px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--paper);
  background: var(--signal-orange);
  border: none;
  border-radius: 20px;
  padding: 13px 20px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(255,104,44,0.3);
}
.auth-submit:disabled { opacity: 0.55; cursor: default; }
.auth-toggle {
  background: none;
  border: none;
  font-size: 13px;
  color: var(--slate);
  cursor: pointer;
  transition: color 0.15s ease;
  text-decoration: none;
}
.auth-toggle:hover { color: var(--carbon); }
.auth-links {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
`;

// Shared shell: injects the scoped theme, renders the clickable logo (-> landing),
// and centers a single auth card. Children are the card's contents.
export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <style dangerouslySetInnerHTML={{ __html: AUTH_THEME_CSS }} />
      <a className="auth-logo" onClick={() => navigate('/')}>InsightForge</a>
      {children}
    </div>
  );
};
