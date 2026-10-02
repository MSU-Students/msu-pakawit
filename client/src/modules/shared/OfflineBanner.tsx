import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

export interface OfflineBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onSyncNow: () => void;
  onToggleSimulatedOffline: () => void;
  isSimulatedOffline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  onSyncNow,
  onToggleSimulatedOffline,
  isSimulatedOffline,
}) => {
  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Offline-First Active:</strong> Browsing local Dexie.js cache. Mutations are saved to local IndexedDB.
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Connected:</strong> Changes will sync directly with the MSU Pakawit NestJS API.
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 py-1"
            onClick={onToggleSimulatedOffline}
          >
            {isSimulatedOffline ? '📶 Reconnect Network' : '🔌 Simulate Campus Offline'}
          </Button>

          {pendingCount > 0 && isOnline && (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs py-1"
              isLoading={isSyncing}
              leftIcon={<RefreshCw className="w-3 h-3" />}
              onClick={onSyncNow}
            >
              Sync {pendingCount} Pending Item{pendingCount > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
