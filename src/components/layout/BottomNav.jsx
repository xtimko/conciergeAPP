// @ts-nocheck
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, User, Settings, Users } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import { useVisualKeyboardOpen } from '@/lib/useVisualKeyboardOpen';
import { cn } from '@/lib/utils';

/**
 * Floating Liquid Glass bottom nav.
 * - Капсула оторвана от низа экрана (margin-bottom = safe-area)
 * - Закруглена со всех сторон (rounded-full)
 * - Сильное стекло с спекулярными бликами
 * - Активный таб — стеклянная плашка внутри капсулы
 */
export default function BottomNav({ isAdmin }) {
  const location = useLocation();
  const { lang } = useTheme();
  const keyboardOpen = useVisualKeyboardOpen();

  const clientTabs = [
    { path: '/Home', icon: ClipboardList, label: t('orders', lang) },
    { path: '/Profile', icon: User, label: t('account', lang) },
    { path: '/Settings', icon: Settings, label: t('settings', lang) },
    { path: '/Referral', icon: Users, label: t('referral', lang) },
  ];

  const tabs = clientTabs;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 pointer-events-none',
        'transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        keyboardOpen && 'translate-y-full opacity-0',
      )}
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--tma-content-bottom, 0px) + 12px)',
        paddingLeft: '12px',
        paddingRight: '12px',
      }}
      aria-hidden={keyboardOpen}
    >
      <nav
        className={cn(
          'relative pointer-events-auto mx-auto max-w-md',
          'glass glass-chrome-floating',
          'rounded-full',
          'flex items-stretch justify-around',
          'px-2 py-2',
          'shadow-[0_18px_44px_-12px_rgba(0,0,0,0.55),0_8px_20px_-6px_rgba(0,0,0,0.4)]',
        )}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5',
                'rounded-full py-1.5 px-2 max-w-[5.5rem]',
                'transition-all duration-300 active:scale-[0.94]',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span
                  className={cn(
                    'absolute inset-0 rounded-full',
                    'lg-tab-active',
                    'pointer-events-none',
                  )}
                  aria-hidden
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <tab.icon
                  className="w-[1.25rem] h-[1.25rem]"
                  strokeWidth={isActive ? 1.9 : 1.3}
                />
                <span className="text-[8.5px] font-medium tracking-[0.16em] uppercase leading-tight text-center">
                  {tab.label}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
