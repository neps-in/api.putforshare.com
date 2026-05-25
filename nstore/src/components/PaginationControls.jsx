"use client";

export default function PaginationControls({ pageData, currentPage, onPageChange }) {
  const hasPrevious = pageData?.previous !== null && pageData?.previous !== undefined;
  const hasNext = pageData?.next !== null && pageData?.next !== undefined;

  return (
    <div className="mt-4 flex w-full items-center justify-between gap-3 text-sm text-slate-600 sm:w-auto">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevious}
      >
        Previous
      </button>
      <span>Page {currentPage}</span>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
      >
        Next
      </button>
    </div>
  );
}
