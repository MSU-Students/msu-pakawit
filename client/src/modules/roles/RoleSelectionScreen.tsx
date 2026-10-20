import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { ROLE_OPTIONS, type UserRole } from './role';

export interface RoleSelectionScreenProps {
  selectedRole: UserRole | null;
  onRoleSelect: (role: UserRole) => void;
  onContinue: () => void;
  isSaving?: boolean;
  error?: string;
}

export function RoleSelectionScreen({
  selectedRole,
  onRoleSelect,
  onContinue,
  isSaving = false,
  error,
}: RoleSelectionScreenProps) {
  const selectedLabel = ROLE_OPTIONS.find((option) => option.role === selectedRole)?.label;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <section aria-labelledby="role-selection-title" className="w-full max-w-3xl">
        <p className="text-center text-sm font-bold tracking-[0.18em] text-msu-maroon">MSU PAKAWIT</p>
        <h1 id="role-selection-title" className="mt-3 text-center text-3xl font-bold">
          Choose your role
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
          Select how you’ll use the platform. You can continue once you’ve made a choice.
        </p>

        <div role="group" aria-label="Choose your role" className="mt-8 grid gap-4 sm:grid-cols-3">
          {ROLE_OPTIONS.map(({ role, label, description, icon: Icon }) => {
            const selected = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                aria-pressed={selected}
                onClick={() => onRoleSelect(role)}
                disabled={isSaving}
                className={`min-h-44 w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-msu-gold/70 disabled:cursor-wait ${
                  selected
                    ? 'ring-2 ring-msu-maroon ring-offset-2'
                    : 'hover:-translate-y-0.5'
                }`}
              >
                <Card className="h-full min-h-44 transition-colors hover:border-msu-maroon">
                  <Icon aria-hidden="true" className="h-8 w-8 text-msu-maroon" />
                  <span className="mt-4 block text-lg font-semibold">{label}</span>
                  <span className="mt-2 block text-sm leading-5 text-slate-600">{description}</span>
                  <span className="sr-only">{selected ? 'Selected' : 'Not selected'}</span>
                </Card>
              </button>
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {selectedLabel ? `${selectedLabel} selected.` : 'No role selected.'}
        </p>
        {error && (
          <p role="alert" className="mt-5 text-center text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            size="lg"
            onClick={onContinue}
            disabled={!selectedRole || isSaving}
            isLoading={isSaving}
          >
            Continue
          </Button>
        </div>
      </section>
    </main>
  );
}
