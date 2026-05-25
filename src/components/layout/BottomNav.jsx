// @ts-nocheck
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, User, Settings, Users } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';
import { useVisualKeyboardOpen } from '@/lib/useVisualKeyboardOpen';
import { cn } from '@/lib/utils';

/**
 * Premium bottom navigation.
 * - glass-chrome-bottom с усиленным размытием
 * - Активная иконка — стеклянная плашка с тонкими внутренними бликами
 * - Микроанимация на тап
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
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 glass-chrome-bottom miniapp-tabbar-pb pt-3',
        'transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        keyboardOpen && 'translate-y-full opacity-0 pointer-events-none',
      )}
      aria-hidden={keyboardOpen}
    >
      <div className="px-2 max-w-lg mx-auto flex justify-around items-stretch min-h-[56px]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-1 rounded-2xl max-w-[5.5rem]',
                'transition-all duration-300 active:scale-[0.94]',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={cn(
                  'p-2 rounded-2xl transition-all duration-300',
                  isActive
                    ? cn(
                        'lg-subtle',
                        // Усиленный inset highlight для активной плашки
                        'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_0_1px_rgba(255,255,255,0.08)]',
                      )
                    : 'bg-transparent',
                )}
              >
                <tab.icon
                  className="w-[1.35rem] h-[1.35rem]"
                  strokeWidth={isActive ? 1.85 : 1.3}
                />
              </div>
              <span className="text-[9px] font-medium tracking-[0.16em] uppercase leading-tight text-center lg-eyebrow">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
