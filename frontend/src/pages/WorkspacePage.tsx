import React, { Suspense, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { roleGuard } from '@/utils/routes';
import type { OperatingSystemType } from '@/utils/routes';

// ---------------------------------------------------------------------------
// One scrollable workspace, presented as alternating white/dark contrast
// bands (reference: sectioned product landing pages). Each band opens with an
// editorial intro — number, title, what-this-section-shows on the left and
// what-you-can-do points on the right — followed by the live feature content.
// The nav routes /:tenant/:sector/<os>; every route mounts THIS page and the
// path segment only decides which band we scroll to.
// ---------------------------------------------------------------------------

const DashboardPage = React.lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ReasoningPage = React.lazy(() =>
  import('@/features/reasoning/pages/ReasoningPage').then((m) => ({ default: m.ReasoningPage })),
);
const SimulationPage = React.lazy(() =>
  import('@/features/simulation/pages/SimulationPage').then((m) => ({ default: m.SimulationPage })),
);
const RecommendationPage = React.lazy(() =>
  import('@/features/recommendation/pages/RecommendationPage').then((m) => ({ default: m.RecommendationPage })),
);
const ChatPage = React.lazy(() =>
  import('@/features/chat/pages/ChatPage').then((m) => ({ default: m.ChatPage })),
);
const GovernancePage = React.lazy(() =>
  import('@/features/governance/pages/GovernancePage').then((m) => ({ default: m.GovernancePage })),
);

interface SectionDef {
  id: OperatingSystemType;
  pathSegment: string;
  Component: React.LazyExoticComponent<React.FC>;
  number: string;
  kicker: string;
  title: string;
  description: string;
  points: string[];
}

// WHAT → WHY → WILL → SHOULD → ASK → GOVERN: the numbers are the journey.
const SECTIONS: SectionDef[] = [
  {
    id: 'dashboard',
    pathSegment: 'dashboard',
    Component: DashboardPage,
    number: '01',
    kicker: 'WHAT is happening',
    title: 'Sector Dashboard',
    description:
      'Your live operational picture. Upload business data and it becomes KPIs with period deltas, trend & AI-projection charts, category mix, and a per-column Data Observatory that charts and explains every field of your dataset.',
    points: [
      'Import CSV / Excel data in one click',
      'Live KPIs with vs-previous-period deltas',
      'Trend & forecast with AI projection',
      'Auto-generated chart + description per column',
    ],
  },
  {
    id: 'reasoning',
    pathSegment: 'reasoning',
    Component: ReasoningPage,
    number: '02',
    kicker: 'WHY it is happening',
    title: 'AI Reasoning OS',
    description:
      'Causal intelligence over your ingested records. The reasoning engine surfaces the executive conclusion, ranks the root-cause factors behind current anomalies, and backs every claim with an evidence knowledge graph.',
    points: [
      'Executive overview with confidence score',
      'Root-cause factors ranked by severity',
      'Evidence knowledge graph of reliable sources',
      'Grounded in your workspace records only',
    ],
  },
  {
    id: 'simulations',
    pathSegment: 'simulations',
    Component: SimulationPage,
    number: '03',
    kicker: 'WILL it work',
    title: 'Scenario Simulation OS',
    description:
      'What-if projection before you commit. Adjust any metric — revenue, units, spend — by a percentage and the engine projects the downstream outcome with confidence bounds, chart and table side by side.',
    points: [
      'Tweak metrics by value or % change',
      'Forecast with confidence band',
      'Compare projected vs current trajectory',
      'Run unlimited scenarios, nothing written back',
    ],
  },
  {
    id: 'recommendation',
    pathSegment: 'recommendation',
    Component: RecommendationPage,
    number: '04',
    kicker: 'SHOULD you act',
    title: 'Executive Recommendations',
    description:
      'AI-synthesized strategic actions for your sector, ranked by impact and priority — each with expected ROI, risk share and the reasoning summary that produced it.',
    points: [
      'Actions ranked by impact & priority',
      'Impact / risk percentages per action',
      'Projected ROI with time horizon',
      'Traceable back to the reasoning analysis',
    ],
  },
  {
    id: 'chat',
    pathSegment: 'chat',
    Component: ChatPage,
    number: '05',
    kicker: 'ASK anything',
    title: 'AI Assistant Command Center',
    description:
      'Data-grounded chat over your ingested datasets. Ask in plain language — totals, averages, summaries, anomalies — and get answers computed from your workspace with tenant isolation and prompt-injection safety built in.',
    points: [
      'Natural-language questions over your data',
      'Real-time grounding on workspace embeddings',
      'Strict read-only: the model cannot modify data',
      'Suggested queries to get you started',
    ],
  },
  {
    id: 'governance',
    pathSegment: 'admin',
    Component: GovernancePage,
    number: '06',
    kicker: 'GOVERN with control',
    title: 'Governance & Administration',
    description:
      'The control plane. Manage the user directory and roles, set KPI warning / critical thresholds, and keep every tenant boundary enforced — the same rules the rest of the platform obeys.',
    points: [
      'User directory with role management',
      'KPI thresholds: warning & critical levels',
      'Role-gated: visible to authorized users only',
      'Tenant isolation on every operation',
    ],
  },
];

const SectionFallback: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-center py-24 animate-pulse text-muted-foreground">
    Loading {label}…
  </div>
);

export const WorkspacePage: React.FC = () => {
  const location = useLocation();
  const { role } = useAuthStore();
  useParams(); // keep tenant/sector params subscribed for re-renders

  const currentSegment = location.pathname.split('/').pop() || 'dashboard';

  useEffect(() => {
    // Eased scroll that re-reads the target position every frame, so it stays
    // accurate even while lazy sections mount and shift the layout underneath.
    const main = document.getElementById('main-content');
    if (!main) return;

    const targetTop = (): number => {
      if (currentSegment === 'dashboard' || currentSegment === '') return 0;
      const el = document.getElementById(`os-${currentSegment}`);
      if (!el) return main.scrollTop; // not mounted yet — hold position
      return (
        el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop
      );
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = window.setTimeout(() => { main.scrollTop = targetTop(); }, 80);
      return () => window.clearTimeout(t);
    }

    let raf = 0;
    const DURATION = 800;
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
    const start = window.setTimeout(() => {
      const from = main.scrollTop;
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / DURATION);
        main.scrollTop = from + (targetTop() - from) * easeOutQuart(p);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 80);
    return () => {
      window.clearTimeout(start);
      cancelAnimationFrame(raf);
    };
  }, [currentSegment]);

  const visible = SECTIONS.filter((s) => roleGuard(role, s.id));

  return (
    <div className="workspace-sections">
      {visible.map((section, index) => {
        const dark = index % 2 === 1; // white ↔ dark alternating contrast bands
        return (
          <section
            key={section.id}
            id={`os-${section.pathSegment}`}
            style={{ scrollMarginTop: '64px' }}
            aria-label={section.id}
            className={`ws-band ${dark ? 'ws-band-dark' : 'ws-band-light'}`}
          >
            {/* Editorial intro: number + title + narrative left, capability points right */}
            <div className="ws-band-head">
              <div className="ws-band-intro">
                <p className="ws-band-kicker">
                  <span className="ws-band-num">{section.number}</span>
                  {section.kicker}
                </p>
                <h2 className="ws-band-title">{section.title}</h2>
                <p className="ws-band-desc">{section.description}</p>
              </div>
              <ul className="ws-band-points">
                {section.points.map((point) => (
                  <li key={point}>
                    <span className="ws-band-tick" aria-hidden>—</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Live feature content */}
            <div className="ws-band-body">
              <Suspense fallback={<SectionFallback label={section.title} />}>
                <section.Component />
              </Suspense>
            </div>
          </section>
        );
      })}
    </div>
  );
};
