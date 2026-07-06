import React, { useEffect, useMemo, useState } from 'react';
import { IntelligencePanel } from '@/components/ai/IntelligencePanel';
import { Outlet, NavLink, useParams, useLocation } from 'react-router-dom';
import { LayoutDashboard, Brain, Activity, Lightbulb, ShieldCheck, Bot, LogOut } from 'lucide-react';
import { buildOperatingSystemRoute, roleGuard } from '@/utils/routes';
import type { OperatingSystemType } from '@/utils/routes';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth/authService';
import { useQueryClient } from '@tanstack/react-query';

// Landing-page style shell: brand left, floating pill nav center, logout right.
// Every nav item routes to /:tenant/:sector/<os>; all of those mount the same
// single scrollable WorkspacePage, which scrolls to the matching section.
const OS_DEFINITIONS: { id: OperatingSystemType; label: string; icon: React.FC<any> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reasoning', label: 'Reasoning', icon: Brain },
  { id: 'simulations', label: 'Simulation', icon: Activity },
  { id: 'recommendation', label: 'Recommendation', icon: Lightbulb },
  { id: 'chat', label: 'AI Assistant', icon: Bot },
  { id: 'governance', label: 'Governance', icon: ShieldCheck },
];

export const ApplicationShell: React.FC = () => {
  const { tenant_id, sector_id } = useParams<{ tenant_id: string; sector_id: string }>();
  const { role } = useAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();

  const activeTenant = tenant_id || 't1';
  const activeSector = sector_id || 'sector1';

  const visibleOperatingSystems = useMemo(() => {
    return OS_DEFINITIONS.filter((os) => roleGuard(role, os.id));
  }, [role]);

  const currentPathSegment = location.pathname.split('/').pop() || '';

  // Scrollspy: as the user scrolls the workspace, highlight the band that is
  // currently under the navbar. Falls back to the route segment when the
  // workspace sections aren't mounted (datasets/reports pages).
  const [spySegment, setSpySegment] = useState<string | null>(null);
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sections = Array.from(
          main.querySelectorAll<HTMLElement>('section[id^="os-"]'),
        );
        if (sections.length === 0) {
          setSpySegment(null);
          return;
        }
        const mainTop = main.getBoundingClientRect().top;
        let current = sections[0].id;
        for (const sec of sections) {
          // A band "owns" the viewport once its top passes 40% of the screen.
          if (sec.getBoundingClientRect().top - mainTop <= main.clientHeight * 0.4) {
            current = sec.id;
          }
        }
        setSpySegment(current.replace(/^os-/, ''));
      });
    };
    onScroll();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [location.pathname]);

  const activeSegment = spySegment ?? currentPathSegment;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Top bar — landing-style: wordmark · pill nav · logout */}
      <header className="shrink-0 border-b bg-card">
        <div className="flex items-center justify-between gap-4 px-4 md:px-8 h-[64px]">
          <span className="font-display font-normal tracking-[-0.02em] text-lg text-foreground whitespace-nowrap">
            InsightForge<span className="text-ember"> ●</span>
          </span>

          {/* Pill nav container (Ventriloc 200px radius) */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-1 bg-secondary rounded-full px-2 py-1.5 overflow-x-auto"
          >
            {visibleOperatingSystems.map((os) => {
              const to = buildOperatingSystemRoute(activeTenant, activeSector, os.id);
              const segment = to.split('/').pop();
              const isActive = activeSegment === segment;
              return (
                <NavLink
                  key={os.id}
                  to={to}
                  className={`px-4 py-1.5 rounded-full font-display font-normal tracking-[-0.02em] text-sm whitespace-nowrap transition-colors outline-none focus:outline-none focus-visible:outline-none ${
                    isActive
                      ? 'bg-card text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={`Go to ${os.label} section`}
                >
                  {os.label}
                  {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-ember ml-2 align-middle" aria-hidden />}
                </NavLink>
              );
            })}
          </nav>

          <button
            onClick={() => authService.logout(queryClient)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-display font-normal tracking-[-0.02em] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus-visible:outline-none whitespace-nowrap"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Mobile nav — same pills, horizontal scroll */}
        <div className="md:hidden border-t bg-card w-full overflow-x-auto">
          <nav className="flex px-2 py-2 gap-1" aria-label="Mobile Navigation">
            {visibleOperatingSystems.map((os) => {
              const Icon = os.icon;
              const to = buildOperatingSystemRoute(activeTenant, activeSector, os.id);
              const segment = to.split('/').pop();
              const isActive = activeSegment === segment;
              return (
                <NavLink
                  key={os.id}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0 font-display font-normal tracking-[-0.02em] text-xs transition-colors outline-none focus:outline-none focus-visible:outline-none ${
                    isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={`Go to ${os.label} section`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {os.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Single scrollable workspace */}
      <div className="flex flex-1 min-h-0">
        <main
          className="flex-1 overflow-y-auto relative outline-none focus:outline-none focus-visible:outline-none"
          id="main-content"
          tabIndex={-1}
        >
          <Outlet />
        </main>

        {/* Intelligence Panel */}
        <div className="hidden lg:block shrink-0">
          <IntelligencePanel />
        </div>
      </div>
    </div>
  );
};
