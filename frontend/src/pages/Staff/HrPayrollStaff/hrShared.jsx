import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export const getHrTheme = (isDarkMode) => ({
  container: isDarkMode ? 'bg-[#050505]' : 'bg-zinc-50',
  card: isDarkMode ? 'bg-[#0a0a0a] border-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.35)]' : 'bg-white border-zinc-200 shadow-sm',
  textMain: isDarkMode ? 'text-zinc-100' : 'text-zinc-900',
  textSub: isDarkMode ? 'text-zinc-500' : 'text-zinc-500',
  tableHeader: isDarkMode ? 'bg-white/5 text-zinc-500' : 'bg-zinc-50 text-zinc-600',
  input: isDarkMode ? 'bg-[#050505] border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900',
  accent: '#b3903c',
});

export const formatCurrency = (value) =>
  `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatCompactCurrency = (value) =>
  `PHP ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const formatDate = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getInitials = (name) =>
  String(name || 'HR')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export function HrLoadingState({ theme, label = 'Syncing HR records...' }) {
  return (
    <div className={`flex min-h-[50vh] flex-col items-center justify-center gap-4 ${theme.container}`}>
      <Loader2 className="animate-spin text-[#b3903c]" size={40} />
      <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.textSub}`}>{label}</p>
    </div>
  );
}

export function HrErrorState({ message }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] font-bold text-rose-500">
      <AlertCircle size={16} />
      <span>{message}</span>
    </div>
  );
}

export function HrPageHeader({ theme, eyebrow, title, accent, actions }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[#b3903c] animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b3903c]">{eyebrow}</p>
        </div>
        <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
          {title} {accent ? <span className="text-[#b3903c]">{accent}</span> : null}
        </h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function HrSection({ theme, className = '', children }) {
  return <div className={`rounded-[2rem] border p-6 ${theme.card} ${className}`}>{children}</div>;
}

export function HrStatGrid({ theme, stats }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <div key={item.label} className={`rounded-3xl border p-6 ${theme.card}`}>
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-2xl border border-[#b3903c]/20 bg-[#b3903c]/10 p-3 text-[#b3903c]">{item.icon}</div>
            {item.meta ? <span className="text-[9px] font-black uppercase tracking-wider text-[#b3903c]">{item.meta}</span> : null}
          </div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>{item.label}</p>
          <h3 className={`mt-1 text-3xl font-black tracking-tighter ${theme.textMain}`}>{item.value}</h3>
          {item.sub ? <p className={`mt-3 text-[10px] font-bold ${item.subClassName || theme.textSub}`}>{item.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}
