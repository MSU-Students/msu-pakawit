import React, { useState } from 'react';
import { GraduationCap, Briefcase, Bike, Info, X, Check } from 'lucide-react';
import { Button } from './Button';

export type SelectableRole = 'STUDENT' | 'EMPLOYEE' | 'COURIER';

export interface RoleOption {
  role: SelectableRole;
  label: string;
  badge: string;
  description: string;
  capabilities: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'STUDENT',
    label: 'Student',
    badge: 'Campus Buyer & Student Services',
    description: 'Browse campus micro-stores, place delivery requests to campus drop zones, and track academic schedule guardrails.',
    capabilities: [
      'Order school supplies, snacks, and meals',
      'Select campus drop hubs (Science Complex, Library, etc.)',
      'View registered academic class schedule',
    ],
    icon: GraduationCap,
  },
  {
    role: 'EMPLOYEE',
    label: 'Employee / Faculty',
    badge: 'Faculty & Staff Services',
    description: 'Order workday meals and supplies delivered directly to university departments and offices without student class schedule locks.',
    capabilities: [
      'Convenient workplace and office deliveries',
      'Access university-wide vendor listings',
      'Exempt from academic time-lock constraints',
    ],
    icon: Briefcase,
  },
  {
    role: 'COURIER',
    label: 'Courier Runner',
    badge: 'Peer Delivery Partner',
    description: 'Accept open campus errand tasks, pick up orders from vendors, and verify 4-digit OTP handoffs at campus hubs.',
    capabilities: [
      'Claim pending errands and earn convenience fees',
      'Fulfill delivery milestones (Purchased, Delivering)',
      'Subject to automated Academic Time-Lock during classes',
    ],
    icon: Bike,
  },
];

export interface RoleSelectorProps {
  activeRole: SelectableRole;
  accountRole?: string;
  onSelectRole: (role: SelectableRole) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  activeRole,
  accountRole,
  onSelectRole,
  onClose,
  isModal = false,
}) => {
  const [selected, setSelected] = useState<SelectableRole>(activeRole);

  const handleApply = () => {
    onSelectRole(selected);
    onClose?.();
  };

  return (
    <div
      role="region"
      aria-label="Interface Role Selector"
      className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-msu-maroon to-msu-maroon-dark text-white p-6 relative">
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 text-msu-gold font-bold text-xs tracking-wider uppercase">
          <span>MSU Pakawit</span>
          <span>•</span>
          <span>Workspace Perspective</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
          Choose Interface Role
        </h2>
        <p className="text-xs sm:text-sm text-red-100/90 mt-1.5">
          Select your active workspace role to adjust interface views and permissions.
        </p>

        {accountRole && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-white border border-white/20">
            <span className="text-msu-gold font-semibold">Account Role:</span>
            <span className="font-mono">{accountRole}</span>
          </div>
        )}
      </div>

      {/* Security & Scope Notice */}
      <div className="p-4 bg-amber-50/70 border-b border-amber-200/60 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-950">Interface View vs. Account Permissions</p>
          <p className="text-amber-800/90 mt-0.5 leading-relaxed">
            Switching your active view tailors the user interface and workflow actions to that role.
            It does not alter your registered account credentials or grant backend administrative privileges.
            The <span className="font-semibold">ADMIN</span> role is restricted and managed exclusively by authorized administrators.
          </p>
        </div>
      </div>

      {/* Role Options */}
      <div
        role="radiogroup"
        aria-label="Select an active role"
        className="p-6 space-y-4"
      >
        {ROLE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isChosen = selected === option.role;
          const isCurrentActive = activeRole === option.role;

          return (
            <div
              key={option.role}
              role="radio"
              aria-checked={isChosen}
              tabIndex={0}
              onClick={() => setSelected(option.role)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  setSelected(option.role);
                }
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-msu-maroon ${
                isChosen
                  ? 'border-msu-maroon bg-red-50/30 shadow-sm ring-1 ring-msu-maroon/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-lg shrink-0 ${
                    isChosen
                      ? 'bg-msu-maroon text-msu-gold'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">
                        {option.label}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {option.badge}
                      </span>
                    </div>

                    {isCurrentActive && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Active View
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {option.description}
                  </p>

                  <ul className="mt-2.5 space-y-1 text-[11px] text-slate-500">
                    {option.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-msu-maroon shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Controls */}
      <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-slate-500 text-center sm:text-left">
          Currently configured for: <strong className="text-slate-800">{activeRole}</strong>
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApply}
            className="w-full sm:w-auto"
          >
            Apply Active View
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
