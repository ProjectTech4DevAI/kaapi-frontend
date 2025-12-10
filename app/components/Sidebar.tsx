/**
 * Sidebar - Navigation sidebar with collapse/expand functionality
 * Provides navigation to Evaluations, Datasets, and Keystore pages
 */

"use client"
import { useRouter } from 'next/navigation';
import { colors } from '@/app/lib/colors';

interface SidebarProps {
  collapsed: boolean;
  activeRoute?: string;
}

export default function Sidebar({ collapsed, activeRoute = '/evaluations' }: SidebarProps) {
  const router = useRouter();

  const navItems = [
    {
      name: 'Evaluations',
      route: '/evaluations',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      name: 'Datasets',
      route: '/datasets',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    {
      name: 'Keystore',
      route: '/keystore',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    }
  ];

  return (
    <aside
      className="border-r transition-all duration-300 ease-in-out h-full flex-shrink-0"
      style={{
        width: collapsed ? '0px' : '220px',
        backgroundColor: colors.bg.secondary,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <div className="px-5 py-6" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <h2 className="text-sm font-semibold" style={{ color: colors.text.primary, letterSpacing: '-0.01em' }}>Kaapi Konsole</h2>
        <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>Tech4Dev</p>
      </div>
      <nav className="p-3 space-y-0.5" style={{ width: '220px' }}>
        {navItems.map((item) => {
          const isActive = activeRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => router.push(item.route)}
              className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2.5"
              style={{
                backgroundColor: isActive ? colors.bg.primary : 'transparent',
                color: isActive ? colors.text.primary : colors.text.secondary,
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s ease',
                border: isActive ? `1px solid ${colors.border}` : '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = colors.bg.primary;
                  e.currentTarget.style.color = colors.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors.text.secondary;
                }
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {item.name}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
