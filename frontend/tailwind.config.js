export default {
    darkMode: ['class'],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#202020', // graphite — Ventriloc primary action/ink
                    success: '#3d6b45', // muted, semantic-only
                    warning: '#816729', // brass
                    error: '#b3402a', // muted ember-adjacent red
                    info: '#4d4d4d', // steel
                },
                ai: {
                    prediction: '#202020',
                    anomaly: '#b3402a',
                    confidence: '#816729',
                    recommendation: '#ff682c',
                    decision: '#202020',
                },
                // Ventriloc raw palette
                graphite: '#202020',
                ash: '#efefef',
                fog: '#f5f5f5',
                ivory: '#ebe6dd',
                steel: '#4d4d4d',
                slate: '#828282',
                mist: '#e8e8e8',
                ember: '#ff682c',
                brass: '#816729',
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            fontSize: {
                display: ['40px', { lineHeight: '1.2', letterSpacing: '-0.8px' }],
                h1: ['32px', { lineHeight: '1.19', letterSpacing: '-0.64px' }],
                h2: ['24px', { lineHeight: '1.3' }],
                h3: ['20px', { lineHeight: '1.4' }],
                h4: ['16px', { lineHeight: '1.4' }],
                body: ['14px', { lineHeight: '1.43' }],
                caption: ['12px', { lineHeight: '1.5' }],
                metadata: ['11px', { lineHeight: '1.5' }],
            },
            spacing: {
                4: '4px',
                8: '8px',
                12: '12px',
                16: '16px',
                24: '24px',
                32: '32px',
                48: '48px',
                64: '64px',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                // PolySans substitute per DESIGN.md — weight 400 only
                display: ['"DM Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
