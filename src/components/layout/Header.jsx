import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Header({ isAdmin }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass glass-thin border-b border-border/20" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <div className="mt-8 px-4 flex items-center justify-center h-14 max-w-lg relative">
        <div className="flex items-center gap-2">
          



          
          <img
            src="https://media.base44.com/images/public/69bbc4b13118d84816c867de/5ccc028bc_IMG_9731.png"
            alt="Concierge" className="mt-2 h-5 w-auto object-contain" />
          
          
        </div>
        {isAdmin &&
        <button
          onClick={() => navigate('/AdminDashboard')} className="text-muted-foreground mt-2 mr-20 p-2 text-lg rounded-s absolute right-4 hover:text-foreground transition-colors">
          
          
            <Shield className="w-4 h-4" />
          </button>
        }
      </div>
    </header>);

}