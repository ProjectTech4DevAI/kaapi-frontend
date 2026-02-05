/**
 * Sidebar - Navigation sidebar with collapse/expand functionality
 * Provides hierarchical navigation with expandable submenus
 */

"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/app/lib/colors';

interface SubMenuItem {
  name: string;
  route?: string;
  comingSoon?: boolean;
  submenu?: SubMenuItem[]; // Support nested submenus
}

interface MenuItem {
  name: string;
  route?: string;
  icon: React.ReactNode;
  submenu?: SubMenuItem[];
}

interface SidebarProps {
  collapsed: boolean;
  activeRoute?: string;
}

export default function Sidebar({ collapsed, activeRoute = '/evaluations' }: SidebarProps) {
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Capabilities': true,
    'Evaluations': true,
    'Documents': true,
    'Configurations': false,
  });

  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded-menus');
    if (saved) {
      try {
        setExpandedMenus(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load sidebar state:', e);
      }
    }
  }, []);

  // Save expanded state to localStorage
  const toggleMenu = (menuName: string) => {
    const newState = { ...expandedMenus, [menuName]: !expandedMenus[menuName] };
    setExpandedMenus(newState);
    localStorage.setItem('sidebar-expanded-menus', JSON.stringify(newState));
  };

  const navItems: MenuItem[] = [
    {
      name: 'Capabilities',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6" />
        </svg>
      ),
      submenu: [
        {
          name: 'Evaluations',
          submenu: [
            { name: 'Text Generation', route: '/evaluations' },
            { name: 'Speech-to-Text', route: '/speech-to-text' },
            { name: 'Text-to-Speech', route: '/text-to-speech', comingSoon: true },
          ]
        },
        { name: 'Documents', route: '/document' },
        { name: 'Knowledge Base', route: '/knowledge-base' },
        // { name: 'Model Testing', route: '/model-testing', comingSoon: true },
        // { name: 'Guardrails', route: '/guardrails', comingSoon: true },
        // { name: 'Redteaming', route: '/redteaming', comingSoon: true },
      ]
    },
    {
      name: 'Configurations',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      submenu: [
        { name: 'Library', route: '/configurations' },
        { name: 'Prompt Editor', route: '/configurations/prompt-editor' },
      ]
    },
    {
      name: 'Datasets',
      route: '/datasets',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    }
  ];

  const bottomItem: MenuItem = {
    name: 'Keystore',
    route: '/keystore',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )
  };

  return (
    <aside
      className="border-r transition-all duration-300 ease-in-out h-full flex-shrink-0 flex flex-col"
      style={{
        width: collapsed ? '0px' : '240px',
        backgroundColor: colors.bg.secondary,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="px-5 py-6" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <h2 className="text-sm font-semibold" style={{ color: colors.text.primary, letterSpacing: '-0.01em' }}>Kaapi Konsole</h2>
        <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>Tech4Dev</p>
      </div>

      {/* Main Navigation */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto" style={{ width: '240px' }}>
        {navItems.map((item) => {
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isExpanded = expandedMenus[item.name];
          const isActive = activeRoute === item.route;

          // Check if any child or nested child is active
          const hasActiveChild = hasSubmenu && item.submenu?.some(sub =>
            activeRoute === sub.route ||
            (sub.submenu && sub.submenu.some(nested => activeRoute === nested.route))
          );

          return (
            <div key={item.name}>
              {/* Top-level menu item */}
              <button
                onClick={() => {
                  if (hasSubmenu) {
                    toggleMenu(item.name);
                  } else if (item.route) {
                    router.push(item.route);
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2.5"
                style={{
                  backgroundColor: isActive ? colors.bg.primary : 'transparent',
                  color: (isActive || hasActiveChild) ? colors.text.primary : colors.text.secondary,
                  fontWeight: (isActive || hasActiveChild) ? 600 : 500,
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
                    e.currentTarget.style.color = (hasActiveChild) ? colors.text.primary : colors.text.secondary;
                  }
                }}
              >
                <span style={{ opacity: (isActive || hasActiveChild) ? 1 : 0.7 }}>{item.icon}</span>
                <span className="flex-1">{item.name}</span>
                {hasSubmenu && (
                  <svg
                    className="w-4 h-4"
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease'
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {/* Submenu items */}
              {hasSubmenu && isExpanded && (
                <div
                  className="ml-3 mt-1 space-y-0.5 overflow-hidden"
                  style={{
                    borderLeft: `2px solid ${colors.border}`,
                    paddingLeft: '12px',
                    animation: 'slideDown 0.15s ease-out'
                  }}
                >
                  {item.submenu?.map((subItem) => {
                    const hasNestedSubmenu = subItem.submenu && subItem.submenu.length > 0;
                    const isNestedExpanded = expandedMenus[subItem.name];
                    const isSubActive = activeRoute === subItem.route;
                    const hasActiveNestedChild = hasNestedSubmenu && subItem.submenu?.some(nested => activeRoute === nested.route);

                    return (
                      <div key={subItem.name}>
                        <button
                          onClick={() => {
                            if (hasNestedSubmenu) {
                              toggleMenu(subItem.name);
                            } else if (subItem.route) {
                              router.push(subItem.route);
                            }
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center justify-between gap-2"
                          style={{
                            backgroundColor: isSubActive ? colors.bg.primary : 'transparent',
                            color: (isSubActive || hasActiveNestedChild) ? colors.text.primary : colors.text.secondary,
                            fontWeight: (isSubActive || hasActiveNestedChild) ? 500 : 400,
                            transition: 'all 0.15s ease',
                            border: isSubActive ? `1px solid ${colors.border}` : '1px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.backgroundColor = colors.bg.primary;
                              e.currentTarget.style.color = colors.text.primary;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = (hasActiveNestedChild) ? colors.text.primary : colors.text.secondary;
                            }
                          }}
                        >
                          <span className="flex-1">{subItem.name}</span>
                          {subItem.comingSoon && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                fontWeight: 600
                              }}
                            >
                              ☕
                            </span>
                          )}
                          {hasNestedSubmenu && (
                            <svg
                              className="w-3 h-3"
                              style={{
                                transform: isNestedExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.15s ease'
                              }}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>

                        {/* Nested submenu items */}
                        {hasNestedSubmenu && isNestedExpanded && (
                          <div
                            className="ml-2 mt-0.5 space-y-0.5 overflow-hidden"
                            style={{
                              borderLeft: `1px solid ${colors.border}`,
                              paddingLeft: '10px',
                              animation: 'slideDown 0.15s ease-out'
                            }}
                          >
                            {subItem.submenu?.map((nestedItem) => {
                              const isNestedActive = activeRoute === nestedItem.route;
                              return (
                                <button
                                  key={nestedItem.route}
                                  onClick={() => nestedItem.route && router.push(nestedItem.route)}
                                  className="w-full text-left px-2.5 py-1 rounded-md text-xs flex items-center justify-between gap-2"
                                  style={{
                                    backgroundColor: isNestedActive ? colors.bg.primary : 'transparent',
                                    color: isNestedActive ? colors.text.primary : colors.text.secondary,
                                    fontWeight: isNestedActive ? 500 : 400,
                                    transition: 'all 0.15s ease',
                                    border: isNestedActive ? `1px solid ${colors.border}` : '1px solid transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isNestedActive) {
                                      e.currentTarget.style.backgroundColor = colors.bg.primary;
                                      e.currentTarget.style.color = colors.text.primary;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isNestedActive) {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = colors.text.secondary;
                                    }
                                  }}
                                >
                                  <span>{nestedItem.name}</span>
                                  {nestedItem.comingSoon && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: '#fef3c7',
                                        color: '#92400e',
                                        fontWeight: 600
                                      }}
                                    >
                                      ☕
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section - Keystore */}
      <div className="p-3 border-t" style={{ borderColor: colors.border, width: '240px' }}>
        <button
          onClick={() => router.push(bottomItem.route!)}
          className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2.5"
          style={{
            backgroundColor: activeRoute === bottomItem.route ? colors.bg.primary : 'transparent',
            color: activeRoute === bottomItem.route ? colors.text.primary : colors.text.secondary,
            fontWeight: activeRoute === bottomItem.route ? 500 : 400,
            transition: 'all 0.15s ease',
            border: activeRoute === bottomItem.route ? `1px solid ${colors.border}` : '1px solid transparent'
          }}
          onMouseEnter={(e) => {
            if (activeRoute !== bottomItem.route) {
              e.currentTarget.style.backgroundColor = colors.bg.primary;
              e.currentTarget.style.color = colors.text.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (activeRoute !== bottomItem.route) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.text.secondary;
            }
          }}
        >
          <span style={{ opacity: activeRoute === bottomItem.route ? 1 : 0.7 }}>{bottomItem.icon}</span>
          {bottomItem.name}
        </button>
      </div>
    </aside>
  );
}
