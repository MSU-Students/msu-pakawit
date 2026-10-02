import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './modules/offline/db';
import { syncEngine } from './modules/offline/syncEngine';
import { Navbar } from './modules/shared/Navbar';
import { OfflineBanner } from './modules/shared/OfflineBanner';
import { StoreCatalog } from './modules/storefront/StoreCatalog';
import { ErrandFeed } from './modules/dispatch/ErrandFeed';
import { AcademicScheduleGuard } from './modules/guardrails/AcademicScheduleGuard';
import { OTPVerificationModal } from './modules/guardrails/OTPVerificationModal';
import { Card } from './modules/shared/Card';
import { Badge } from './modules/shared/Badge';
import { Button } from './modules/shared/Button';
import { isCourierLockedBySchedule } from './modules/guardrails/scheduleValidator';
import type { VirtualStore, ProductItem } from './modules/storefront/types';
import type { ErrandTask } from './modules/dispatch/types';
import type { ScheduleBlock } from './modules/guardrails/types';

// Mock seed data for Sprint 0 inception showcase
const mockStore: VirtualStore = {
  id: 'store-commercial-center-01',
  name: 'Amina\'s Campus Supplies & Snacks',
  hostName: 'Amina Radiamoda',
  hostStudentId: '2023-01429',
  vendorOrigin: 'Commercial Center (Off-Campus)',
  defaultConvenienceFee: 35.0,
  markupPercentage: 10,
  rating: 4.9,
  isOpen: true,
};

const mockProducts: ProductItem[] = [
  {
    id: 'prod-yellow-pad',
    storeId: 'store-commercial-center-01',
    name: 'Yellow Pad Paper (80 leaves)',
    category: 'School Supplies',
    basePrice: 45.0,
    markupPrice: 49.5,
    isAvailable: true,
  },
  {
    id: 'prod-pilot-g2',
    storeId: 'store-commercial-center-01',
    name: 'Pilot G2 Gel Pen 0.5 Black',
    category: 'School Supplies',
    basePrice: 65.0,
    markupPrice: 71.5,
    isAvailable: true,
  },
  {
    id: 'prod-pater-chicken',
    storeId: 'store-commercial-center-01',
    name: 'Traditional Chicken Pater (Spicy Palapa)',
    category: 'Campus Food',
    basePrice: 50.0,
    markupPrice: 55.0,
    isAvailable: true,
  },
  {
    id: 'prod-usb-otg',
    storeId: 'store-commercial-center-01',
    name: 'USB Type-C OTG Flash Drive 32GB',
    category: 'Electronics',
    basePrice: 220.0,
    markupPrice: 242.0,
    isAvailable: true,
  },
];

const mockSchedules: ScheduleBlock[] = [
  {
    id: 'sched-1',
    courseCode: 'CS121',
    courseTitle: 'Data Structures and Algorithms',
    dayOfWeek: 1, // Monday
    startTime: '08:30',
    endTime: '10:00',
    room: 'CS Lab 2 (Science Complex)',
  },
  {
    id: 'sched-2',
    courseCode: 'MATH54',
    courseTitle: 'Discrete Mathematics',
    dayOfWeek: 1, // Monday
    startTime: '13:00',
    endTime: '14:30',
    room: 'Kasadpan Hall Rm 302',
  },
  {
    id: 'sched-3',
    courseCode: 'PHYS11',
    courseTitle: 'General Physics I',
    dayOfWeek: 3, // Wednesday
    startTime: '10:00',
    endTime: '12:00',
    room: 'Science Complex Rm 104',
  },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('storefront');
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeOtpModalErrandId, setActiveOtpModalErrandId] = useState<string | null>(null);

  // Live Query Dexie IndexedDB sync queue
  const pendingSyncQueue = useLiveQuery(() => db.getPendingSyncItems()) || [];

  // Simulated live tasks state
  const [tasks, setTasks] = useState<ErrandTask[]>([
    {
      id: 'ERR-1001',
      storeName: 'Amina\'s Campus Supplies',
      vendorOrigin: 'Commercial Center',
      dropZone: 'Science Complex Drop Hub',
      itemCount: 2,
      totalAmount: 156.0,
      convenienceFee: 35.0,
      status: 'PENDING',
      buyerName: 'Jamal M. (CS Student)',
      createdAt: Date.now() - 1000 * 60 * 15,
    },
    {
      id: 'ERR-1002',
      storeName: 'Amina\'s Campus Supplies',
      vendorOrigin: 'Commercial Center',
      dropZone: 'Kasadpan Hall Runner Point',
      itemCount: 1,
      totalAmount: 90.0,
      convenienceFee: 35.0,
      status: 'DELIVERING',
      buyerName: 'Fatima S. (Bio Student)',
      createdAt: Date.now() - 1000 * 60 * 30,
    },
  ]);

  // Check schedule lock
  const isLocked = isCourierLockedBySchedule(mockSchedules).isLocked;

  useEffect(() => {
    syncEngine.initAutoSync();
    return () => syncEngine.cleanup();
  }, []);

  const handlePlaceOrder = async (orderData: any) => {
    const newTaskId = `ERR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTask: ErrandTask = {
      id: newTaskId,
      storeName: mockStore.name,
      vendorOrigin: mockStore.vendorOrigin,
      dropZone: orderData.dropZone,
      itemCount: orderData.items.length,
      totalAmount: orderData.totalAmount,
      convenienceFee: orderData.convenienceFee,
      status: 'PENDING',
      buyerName: 'Current Student User',
      createdAt: Date.now(),
    };

    // Save to Dexie IndexedDB
    await db.orders.put({
      id: newTaskId,
      buyerStudentId: '2023-99999',
      storeId: mockStore.id,
      items: orderData.items,
      totalProductCost: orderData.totalProductCost,
      convenienceFee: orderData.convenienceFee,
      totalAmount: orderData.totalAmount,
      dropZone: orderData.dropZone,
      status: 'PENDING',
      otpCode: '7429',
      isSynced: !isSimulatedOffline,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Queue in Dexie outbox
    await db.queueSync({
      entityType: 'ERRAND_ORDER',
      entityId: newTaskId,
      action: 'CREATE',
      payload: newTask,
    });

    setTasks((prev) => [newTask, ...prev]);
    setActiveTab('dispatch');
  };

  const handleAcceptTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'ACCEPTED', runnerName: 'Me (Courier)' } : t))
    );
  };

  const handleUpdateStatus = (taskId: string, newStatus: ErrandTask['status']) => {
    if (newStatus === 'COMPLETED') {
      setActiveOtpModalErrandId(taskId);
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  const handleVerifyOtp = (otp: string) => {
    if (otp === '7429') {
      if (activeOtpModalErrandId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === activeOtpModalErrandId ? { ...t, status: 'COMPLETED' } : t))
        );
      }
      return true;
    }
    return false;
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncEngine.triggerSync();
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      <Navbar
        isOnline={!isSimulatedOffline}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingSyncCount={pendingSyncQueue.length}
      />

      <OfflineBanner
        isOnline={!isSimulatedOffline}
        isSyncing={isSyncing}
        pendingCount={pendingSyncQueue.length}
        onSyncNow={handleSyncNow}
        onToggleSimulatedOffline={() => setIsSimulatedOffline(!isSimulatedOffline)}
        isSimulatedOffline={isSimulatedOffline}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Domain Tab Switcher for Sprint 0 Showcase */}
        <div className="flex sm:hidden overflow-x-auto gap-2 pb-3 mb-4">
          <Button
            size="sm"
            variant={activeTab === 'storefront' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('storefront')}
          >
            Storefront
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'dispatch' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('dispatch')}
          >
            Dispatch
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'guardrails' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('guardrails')}
          >
            Guardrails
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'offline' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('offline')}
          >
            Sync Outbox
          </Button>
        </div>

        {activeTab === 'storefront' && (
          <StoreCatalog
            store={mockStore}
            products={mockProducts}
            onPlaceOrder={handlePlaceOrder}
          />
        )}

        {activeTab === 'dispatch' && (
          <ErrandFeed
            tasks={tasks}
            isLockedBySchedule={isLocked}
            onAcceptTask={handleAcceptTask}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'guardrails' && (
          <AcademicScheduleGuard
            studentName="Amina Radiamoda"
            studentId="2023-01429"
            schedules={mockSchedules}
          />
        )}

        {activeTab === 'offline' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Dexie.js IndexedDB Outbox & Sync Status
                </h2>
                <p className="text-xs text-slate-500">
                  Transactional client-side mutation journal awaiting NestJS API reconciliation
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSyncing}
                onClick={handleSyncNow}
                disabled={isSimulatedOffline || pendingSyncQueue.length === 0}
              >
                Trigger Sync ({pendingSyncQueue.length})
              </Button>
            </div>

            <Card>
              {pendingSyncQueue.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  ✓ All client mutations are currently synchronized with the backend!
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {pendingSyncQueue.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {item.action} {item.entityType}
                          </span>
                          <span className="text-slate-500">#{item.entityId}</span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5 font-mono">
                          Queued: {new Date(item.createdAt).toLocaleTimeString()} | Retries: {item.retryCount}
                        </div>
                      </div>
                      <Badge variant={item.status === 'PENDING' ? 'warning' : 'info'} size="sm">
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* OTP Modal */}
      {activeOtpModalErrandId && (
        <OTPVerificationModal
          errandId={activeOtpModalErrandId}
          expectedOTP="7429"
          onVerify={handleVerifyOtp}
          onClose={() => setActiveOtpModalErrandId(null)}
        />
      )}

      {/* Sprint 0 Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MSU Pakawit © 2026 • Mindanao State University Marawi Campus</span>
          <span className="text-slate-500">Sprint 0: Architecture, Setup & Design Standards (5 Scrum Teams)</span>
        </div>
      </footer>
    </div>
  );
};
export default App;
