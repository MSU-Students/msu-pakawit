import { Bike, BriefcaseBusiness, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const USER_ROLES = ['STUDENT', 'EMPLOYEE', 'COURIER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface RoleOption {
  role: UserRole;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface RoleFeatures {
  homeTitle: string;
  homeDescription: string;
  highlights: string[];
  homeTab: 'storefront' | 'dispatch';
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'STUDENT',
    label: 'Student',
    description: 'Find campus shops, errands, and student services.',
    icon: GraduationCap,
  },
  {
    role: 'EMPLOYEE',
    label: 'Employee',
    description: 'Discover convenient services for your workday.',
    icon: BriefcaseBusiness,
  },
  {
    role: 'COURIER',
    label: 'Courier',
    description: 'Pick up and deliver campus orders.',
    icon: Bike,
  },
];

export const ROLE_FEATURES: Record<UserRole, RoleFeatures> = {
  STUDENT: {
    homeTitle: 'Student home',
    homeDescription: 'Find campus shops, student services, and tools for your class day.',
    highlights: ['Campus storefront', 'Student errands', 'Schedule-aware tools'],
    homeTab: 'storefront',
  },
  EMPLOYEE: {
    homeTitle: 'Employee home',
    homeDescription: 'Explore convenient campus services for your workday.',
    highlights: ['Campus services', 'Workday errands', 'Offline access'],
    homeTab: 'storefront',
  },
  COURIER: {
    homeTitle: 'Courier home',
    homeDescription: 'Review campus delivery tasks and keep orders moving.',
    highlights: ['Available deliveries', 'Pickup and drop-off details', 'Delivery completion'],
    homeTab: 'dispatch',
  },
};

export const getRoleFeatures = (role: UserRole | null): RoleFeatures | null =>
  role ? ROLE_FEATURES[role] : null;

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && USER_ROLES.includes(value as UserRole);
