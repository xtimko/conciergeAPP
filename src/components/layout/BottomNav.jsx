import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, User, Settings, Users } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { t } from '@/lib/i18n';

export default function BottomNav({ isAdmin }) {
  const location = useLocation();
  const { lang } = useTheme();

  const clientTabs = [
    { path: '/Home', icon: ClipboardList, label: t('orders', lang) },
    { path: '/Profile', icon: User, label: t('account', lang) },
    { path: '/Settings', icon: Settings, label: t('settings', lang) },
    { path: '/Referral', icon: Users, label: t('referral', lang) },
  ];

  const tabs = clientTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-chrome-bottom miniapp-tabbar-pb pt-3">
      <div className="px-2 max-w-lg mx-auto flex justify-around items-stretch min-h-[56px]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 rounded-2xl transition-all duration-300 max-w-[5.5rem] ${
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/75'
              }`}
            >
              <div
                className={`p-2 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-foreground/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(128,128,128,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                    : 'bg-transparent'
                }`}
              >
                <tab.icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.35} />
              </div>
              <span className="text-[9px] font-medium tracking-[0.12em] uppercase leading-tight text-center">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
