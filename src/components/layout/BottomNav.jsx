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
  { path: '/Referral', icon: Users, label: t('referral', lang) }];


  const tabs = clientTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass glass-thin border-t border-border/30" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)', marginBottom: '8px' }}>
      <div className="my-1 px-3 opacity-100 rounded flex justify-around items-center h-14 max-w-lg">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300 ${
              isActive ?
              'text-foreground' :
              'text-muted-foreground hover:text-foreground/70'}`
              }>
              
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
              isActive ? 'glass' : ''}`
              }>
                <tab.icon className="lucide lucide-user w-7 h-7" strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className="text-[10px] font-medium tracking-wide uppercase">
                {tab.label}
              </span>
            </Link>);

        })}
      </div>
    </nav>);

}