import React from 'react';
import { Badge } from '../shared/Badge';
import type { ErrandStatus } from './types';

export interface RunnerStatusBadgeProps {
  status: ErrandStatus;
}

export const RunnerStatusBadge: React.FC<RunnerStatusBadgeProps> = ({ status }) => {
  const statusMap: Record<
    ErrandStatus,
    { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' }
  > = {
    PENDING: { label: 'Awaiting Runner', variant: 'warning' },
    ACCEPTED: { label: 'Runner Assigned', variant: 'info' },
    PURCHASED: { label: 'Purchased at Vendor', variant: 'primary' },
    DELIVERING: { label: 'In Transit to Hub', variant: 'info' },
    COMPLETED: { label: 'Delivered (OTP Verified)', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'danger' },
  };

  const config = statusMap[status] || { label: status, variant: 'neutral' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
