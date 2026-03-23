import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export function usePagination(items) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [items.length]);

  return { paged, page: safePage, totalPages, setPage };
}

export default function Pagination({ page, totalPages, setPage, total, isDarkMode }) {
  if (totalPages <= 1) return null;

  const border = isDarkMode ? 'border-white/10' : 'border-gray-200';
  const text = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const btnBase = `flex items-center justify-center w-8 h-8 rounded-lg border text-[10px] font-black transition-all`;
  const active = 'bg-[#c9a84c] border-[#c9a84c] text-black';
  const inactive = `${border} ${text} hover:border-[#c9a84c] hover:text-[#c9a84c]`;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className={`flex items-center justify-between px-6 py-4 border-t ${border}`}>
      <p className={`text-[10px] font-bold ${text} uppercase tracking-widest`}>
        {total} total · Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className={`${btnBase} ${page === 1 ? `${border} ${text} opacity-30 cursor-not-allowed` : inactive}`}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={i} className={`w-8 text-center text-[10px] ${text}`}>…</span>
          ) : (
            <button key={i} onClick={() => setPage(p)} className={`${btnBase} ${p === page ? active : inactive}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? `${border} ${text} opacity-30 cursor-not-allowed` : inactive}`}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
