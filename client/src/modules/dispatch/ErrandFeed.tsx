import React from 'react';
import { Navigation, MapPin, DollarSign, Package, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { RunnerStatusBadge } from './RunnerStatusBadge';
import type { ErrandTask } from './types';

export interface ErrandFeedProps {
  tasks: ErrandTask[];
  isLockedBySchedule: boolean;
  userRole?: string;
  onAcceptTask?: (taskId: string) => void;
  onUpdateStatus?: (taskId: string, newStatus: ErrandTask['status']) => void;
}

export const ErrandFeed: React.FC<ErrandFeedProps> = ({
  tasks,
  isLockedBySchedule,
  userRole = 'STUDENT',
  onAcceptTask,
  onUpdateStatus,
}) => {
  const isCourier = userRole === 'COURIER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-msu-maroon" />
            Campus Errand Dispatch Feed
          </h2>
          <p className="text-xs text-slate-500">
            Real-time peer deliveries across MSU Marawi campus hubs
          </p>
        </div>

        {isCourier && isLockedBySchedule && (
          <div className="bg-amber-100 text-amber-900 text-xs px-3 py-1.5 rounded-lg border border-amber-300 font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>🔒 Academic Time-Lock Active (In Class)</span>
          </div>
        )}
      </div>

      {!isCourier && (
        <div className="bg-blue-50 text-blue-900 text-xs px-3.5 py-2.5 rounded-lg border border-blue-200 flex items-center gap-2">
          <span className="font-semibold">Role View ({userRole}):</span>
          <span>
            You are browsing the dispatch tracker. Errand claiming and delivery milestone actions are restricted to peer <strong className="font-semibold">Couriers</strong>.
          </span>
        </div>
      )}

      {tasks.length === 0 ? (
        <Card className="text-center py-12 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-500" />
          <p className="font-medium">No active errand tasks right now.</p>
          <p className="text-xs text-slate-400 mt-1">Orders placed from storefronts will appear here for dispatch.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} hoverEffect className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono text-slate-400">#{task.id}</span>
                  <h3 className="font-bold text-slate-800 text-base">{task.storeName}</h3>
                </div>
                <RunnerStatusBadge status={task.status} />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span><strong>Pick up:</strong> {task.vendorOrigin}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Navigation className="w-3.5 h-3.5 text-msu-maroon shrink-0" />
                  <span><strong>Drop Zone:</strong> {task.dropZone}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                  <DollarSign className="w-3.5 h-3.5 shrink-0" />
                  <span>Courier Earning: ₱{task.convenienceFee.toFixed(2)} (Order total: ₱{task.totalAmount.toFixed(2)})</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  Buyer: {task.buyerName}
                </span>

                {isCourier ? (
                  <>
                    {task.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={isLockedBySchedule}
                        onClick={() => onAcceptTask?.(task.id)}
                      >
                        {isLockedBySchedule ? 'Locked (Class Schedule)' : 'Accept Errand'}
                      </Button>
                    )}

                    {task.status === 'ACCEPTED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onUpdateStatus?.(task.id, 'PURCHASED')}
                      >
                        Mark Purchased
                      </Button>
                    )}

                    {task.status === 'PURCHASED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onUpdateStatus?.(task.id, 'DELIVERING')}
                      >
                        Start Delivery
                      </Button>
                    )}

                    {task.status === 'DELIVERING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-600 text-emerald-700 hover:bg-emerald-600"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => onUpdateStatus?.(task.id, 'COMPLETED')}
                      >
                        Verify OTP & Complete
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    {task.status === 'PENDING'
                      ? 'Awaiting courier'
                      : task.status === 'COMPLETED'
                      ? 'Delivered'
                      : 'In progress'}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ErrandFeed;
