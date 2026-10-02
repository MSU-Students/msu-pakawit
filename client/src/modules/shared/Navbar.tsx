import React from 'react';
import { ShoppingBag, Navigation, Clock, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { Badge } from './Badge';

export interface NavbarProps {
  isOnline: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingSyncCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isOnline,
  activeTab,
  onTabChange,
  pendingSyncCount = 0,
}) => {
  const navItems = [
    { id: 'storefront', label: 'Storefront', icon: ShoppingBag },
    { id: 'dispatch', label: 'Errand Dispatch', icon: Navigation },
    { id: 'guardrails', label: 'Time-Lock & OTP', icon: ShieldCheck },
    { id: 'offline', label: 'Offline Sync', icon: Clock },
  ];

  return (
    <header className="bg-msu-maroon text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-msu-gold flex items-center justify-center font-bold text-slate-900 text-lg shadow">
              MP
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight flex items-center gap-2">
                <span>MSU PAKAWIT</span>

              </div>
              <p className="text-xs text-red-100/80 hidden sm:block">
                Offline-First Campus Micro-Storefront & Errand Network
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-msu-maroon-dark text-msu-gold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Online/Offline Status Indicator */}
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Badge variant="success" size="sm" className="flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border-emerald-500/40">
                <Wifi className="w-3 h-3" />
                <span className="hidden sm:inline">Online</span>
              </Badge>
            ) : (
              <Badge variant="danger" size="sm" className="flex items-center gap-1 bg-rose-950/90 text-rose-300 border-rose-500/50">
                <WifiOff className="w-3 h-3" />
                <span>Offline Mode</span>
              </Badge>
            )}

            {pendingSyncCount > 0 && (
              <span className="bg-msu-gold text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full" title="Pending Sync Outbox">
                {pendingSyncCount} queued
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
