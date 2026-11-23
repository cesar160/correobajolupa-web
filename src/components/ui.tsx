import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Inbox,
  LoaderCircle,
  Minus,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { AuthResult, Priority, ReportStatus, Role } from '../api/types';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="error-box" role="alert">
      <span className="error-icon">
        <Icon as={CircleAlert} size={14} />
      </span>
      <span>{message}</span>
    </div>
  );
}

export function Notice({ message }: { message: string }) {
  return (
    <p className="notice" role="status">
      <Icon as={CircleCheck} size={16} /> {message}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="empty-state">
      <Icon as={Inbox} size={28} />
      {children}
    </div>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="center-state">
      <p>{label}</p>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  titleTransitionName,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleTransitionName?: string;
}) {
  return (
    <div className="page-header">
      <div>
        <h1
          tabIndex={-1}
          style={titleTransitionName ? { viewTransitionName: titleTransitionName } : undefined}
        >
          {title}
        </h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  queued: 'En cola',
  processing: 'Analizando',
  completed: 'Completado',
  limited: 'Limitado',
  failed: 'Fallido',
};

const STATUS_ICON: Record<ReportStatus, LucideIcon> = {
  queued: Clock,
  processing: LoaderCircle,
  completed: CircleCheck,
  limited: TriangleAlert,
  failed: CircleX,
};

export function StatusBadge({
  status,
  findingsCount,
}: {
  status: ReportStatus;
  findingsCount?: number;
}) {
  const label =
    status === 'completed' && findingsCount !== undefined
      ? findingsCount > 0
        ? 'Con hallazgos'
        : 'Análisis completo'
      : status === 'queued' || status === 'processing'
        ? 'En análisis'
        : STATUS_LABEL[status];

  return (
    <span className={`badge badge-status badge-${status}`}>
      <span className="badge-mark">
        <Icon as={STATUS_ICON[status]} size={13} />
      </span>
      {label}
    </span>
  );
}

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

const PRIORITY_ICON: Record<Priority, LucideIcon> = {
  high: ArrowUp,
  medium: Minus,
  low: ArrowDown,
};

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return <span className="muted">—</span>;
  return (
    <span className={`badge badge-priority badge-${priority}`}>
      <span className="badge-mark">
        <Icon as={PRIORITY_ICON[priority]} size={13} />
      </span>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  reporter: 'Reportante',
  analyst: 'Analista',
  admin: 'Administrador',
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className="badge badge-role">{ROLE_LABEL[role]}</span>;
}

const AUTH_LABEL: Record<AuthResult, string> = {
  pass: 'pass',
  fail: 'fail',
  none: 'none',
  unknown: 'unknown',
};

const AUTH_ICON: Record<AuthResult, LucideIcon> = {
  pass: Check,
  fail: X,
  none: Minus,
  unknown: Minus,
};

export function AuthBadge({ label, value }: { label: string; value: AuthResult }) {
  return (
    <span className={`badge badge-auth badge-auth-${value}`}>
      <span className="badge-mark">
        <Icon as={AUTH_ICON[value]} size={13} />
      </span>
      {label}: {AUTH_LABEL[value]}
    </span>
  );
}

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Pestañas con `focusgroup` (mejora progresiva con polyfill), paneles
 * `hidden="until-found"` y selección que sigue al foco.
 */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const base = useId().replace(/:/g, '');
  const [selected, setSelected] = useState(items[0]?.id ?? '');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    let cancelled = false;
    if (!Object.hasOwn(HTMLElement.prototype, 'focusGroup')) {
      void import('@microsoft/focusgroup-polyfill').then(({ polyfill }) => {
        if (!cancelled) polyfill();
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    const handler = (event: Event) => {
      const id = (event.currentTarget as HTMLElement).dataset.panelId;
      if (id) setSelected(id);
    };
    panels.forEach((panel) => panel.addEventListener('beforematch', handler));
    return () => panels.forEach((panel) => panel.removeEventListener('beforematch', handler));
  }, [items.length]);

  // React serializa hidden="until-found" como hidden booleano. Lo reescribimos
  // desde el DOM para conservar la búsqueda en página donde sea compatible.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((panel) => {
      if (panel.dataset.panelId === selected) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', 'until-found');
    });
  }, [selected, items]);

  useEffect(() => {
    buttons.current.get(selected)?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      container: 'nearest',
    } as ScrollIntoViewOptions);
  }, [selected]);

  return (
    <div className="tabs" ref={rootRef}>
      <div
        className="tablist"
        aria-label={label}
        {...({ focusgroup: 'tablist nomemory' } as Record<string, string>)}
      >
        {items.map((item) => {
          const active = item.id === selected;
          return (
            <button
              key={item.id}
              type="button"
              className="tab"
              id={`${base}-tab-${item.id}`}
              aria-selected={active}
              ref={(node) => {
                if (node) buttons.current.set(item.id, node);
                else buttons.current.delete(item.id);
              }}
              {...({ focusgroupstart: active ? '' : undefined } as Record<string, string | undefined>)}
              onClick={() => setSelected(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className="tabpanel"
          role="tabpanel"
          aria-labelledby={`${base}-tab-${item.id}`}
          data-panel-id={item.id}
          tabIndex={item.id === selected ? 0 : undefined}
          {...({ hidden: item.id === selected ? undefined : 'until-found' } as Record<string, string | undefined>)}
        >
          <div className="tabpanel-inner">{item.content}</div>
        </div>
      ))}
    </div>
  );
}
