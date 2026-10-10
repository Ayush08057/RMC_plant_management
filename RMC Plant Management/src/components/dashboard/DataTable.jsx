import React, { useState, useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import { ChevronLeft, ChevronRight, Search, Inbox, Maximize2, Minimize2, X } from 'lucide-react';

export default function DataTable({
  title,
  subtitle,
  icon: Icon,
  columns = [],
  data = [],
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchKeys = [],
  itemsPerPage = 10,
  renderMobileCard = null,
  emptyMessage = 'No records located',
  actions = null,
  onRowClick = null,
  allowFullscreen = true,
  initialFullscreen = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [pageSize, setPageSize] = useState(itemsPerPage);
  const containerRef = useRef(null);

  // Sync pageSize when itemsPerPage changes
  useEffect(() => {
    setPageSize(itemsPerPage);
  }, [itemsPerPage]);

  const toggleFullscreen = () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);

    if (nextState) {
      if (containerRef.current?.requestFullscreen && !document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Sync with native fullscreen changes and ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Filter data based on query
  const filteredData = data.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    
    if (searchKeys && searchKeys.length > 0) {
      return searchKeys.some((k) => String(item[k] || '').toLowerCase().includes(query));
    }
    
    return Object.values(item).some((val) => 
      String(val).toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md p-2 sm:p-4 md:p-6 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200'
          : 'w-full max-w-full min-w-0 relative'
      }
    >
      <div
        className={`w-full max-w-full bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl overflow-hidden shadow-md transition-all duration-300 min-w-0 relative flex flex-col ${
          isFullscreen ? 'h-full flex-1 max-h-full shadow-2xl ring-1 ring-black/10' : 'hover:shadow-lg'
        }`}
      >
        {/* Top Gradient Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 shrink-0" />

        {/* Table Header & Search Controls */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200/90 flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 w-full min-w-0 bg-gradient-to-r from-slate-50/90 via-white to-cyan-50/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 text-white shrink-0 shadow-md shadow-blue-500/20">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                <span className="whitespace-nowrap">{title}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200/90 font-mono font-bold shrink-0 shadow-2xs">
                  {filteredData.length} records
                </span>
                {isFullscreen && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 font-mono">
                    Full Screen Mode
                  </span>
                )}
              </h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start xl:justify-end min-w-0">
            {searchable && (
              <div className="relative w-full sm:w-56 lg:w-64 max-w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white border border-slate-300 rounded-xl sm:rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 transition-all font-medium shadow-2xs"
                />
              </div>
            )}
            {actions}

            {allowFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-2.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95 text-xs font-bold"
                title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Expand Table to Full Screen'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-cyan-700" />
                    <span className="hidden sm:inline">Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-slate-600" />
                    <span className="hidden sm:inline">Full Screen</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* DESKTOP TABLE VIEW - 100% FULL FIT WITH SMOOTH HORIZONTAL SCROLL IF NEEDED */}
        <div className={`hidden md:block w-full overflow-x-auto custom-scrollbar ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}>
          <table className="w-full min-w-[1050px] text-left text-xs text-slate-700 border-collapse">
            <thead
              className={`bg-slate-900 text-slate-100 font-mono font-bold uppercase text-[11px] tracking-wider border-b-2 border-slate-800 ${
                isFullscreen ? 'sticky top-0 z-10 backdrop-blur-xs shadow-md' : ''
              }`}
            >
              <tr>
                {columns.map((col, idx) => {
                  const colStyle = {
                    ...(col.width ? { width: col.width } : {}),
                    ...(col.maxWidth ? { maxWidth: col.maxWidth } : {}),
                  };
                  return (
                    <th
                      key={idx}
                      style={Object.keys(colStyle).length > 0 ? colStyle : undefined}
                      className={`py-3 px-3 text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-100 bg-slate-900 border-b-2 border-slate-800 ${
                        idx === 0 ? 'pl-4 sm:pl-5' : ''
                      } ${
                        idx === columns.length - 1 ? 'pr-4 sm:pr-5 text-right' : col.align === 'right' ? 'text-right' : ''
                      } ${col.headerClassName || ''}`}
                    >
                      <span className="whitespace-nowrap font-mono font-black text-slate-100 block truncate" title={typeof col.header === 'string' ? col.header : undefined}>
                        {col.header}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rIdx) => (
                  <tr 
                    key={row.id || rIdx} 
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`group transition-all duration-200 even:bg-slate-50/50 odd:bg-white hover:bg-cyan-50/50 hover:shadow-xs ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col, cIdx) => {
                      const colStyle = {
                        ...(col.width ? { width: col.width } : {}),
                        ...(col.maxWidth ? { maxWidth: col.maxWidth } : {}),
                      };
                      return (
                        <td
                          key={cIdx}
                          style={Object.keys(colStyle).length > 0 ? colStyle : undefined}
                          className={`py-3 px-3 align-middle min-w-0 ${
                            cIdx === 0 ? 'pl-4 sm:pl-5' : ''
                          } ${
                            cIdx === columns.length - 1 ? 'pr-4 sm:pr-5 text-right' : col.align === 'right' ? 'text-right' : ''
                          } ${col.className || ''}`}
                        >
                          <div className={`min-w-0 overflow-hidden ${col.align === 'right' ? 'flex justify-end' : ''}`}>
                            {col.render ? (
                              col.render(row)
                            ) : col.type === 'status' ? (
                              <StatusBadge status={row[col.accessor]} />
                            ) : (
                              <span className="font-semibold text-slate-800 block truncate">
                                {row[col.accessor]}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center text-slate-500 bg-slate-50/40">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <Inbox className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div className="text-sm font-black text-slate-800 tracking-tight">{emptyMessage}</div>
                    {searchQuery && (
                      <p className="text-xs text-slate-500 mt-1 font-medium">Try refining search query parameters</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className={`block md:hidden p-3.5 space-y-3 w-full max-w-full bg-slate-50/30 ${isFullscreen ? 'flex-1 overflow-y-auto' : 'overflow-hidden'}`}>
          {paginatedData.length > 0 ? (
            paginatedData.map((row, rIdx) => (
              <div 
                key={row.id || rIdx} 
                className="p-4.5 rounded-2xl bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/90 space-y-3 shadow-xs hover:shadow-md hover:border-cyan-300 transition-all w-full max-w-full min-w-0 overflow-hidden"
                onClick={() => onRowClick && onRowClick(row)}
              >
                {renderMobileCard ? (
                  renderMobileCard(row)
                ) : (
                  <div className="w-full max-w-full overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 font-mono truncate">
                          {row[columns[0]?.accessor] || 'Record'}
                        </div>
                        {columns[1] && (
                          <div className="text-sm font-black text-slate-900 mt-0.5 truncate">
                            {row[columns[1]?.accessor]}
                          </div>
                        )}
                      </div>
                      {columns.find(c => c.type === 'status') && (
                        <div className="shrink-0">
                          <StatusBadge status={row[columns.find(c => c.type === 'status').accessor]} />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-200/80 text-[11px] text-slate-600">
                      {columns.slice(2, 6).map((col, cIdx) => (
                        col.type !== 'status' && (
                          <div key={cIdx} className="min-w-0">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block truncate">{col.header}:</span>
                            <span className="font-bold text-slate-900 truncate block">
                              {col.render ? col.render(row) : row[col.accessor]}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Inbox className="w-8 h-8 mx-auto mb-2 text-cyan-600" />
              <div className="text-sm font-bold text-slate-700">{emptyMessage}</div>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 w-full overflow-hidden bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div>
              Showing <span className="font-mono font-black text-slate-900">{filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-mono font-black text-slate-900">{Math.min(currentPage * pageSize, filteredData.length)}</span> of{' '}
              <span className="font-mono font-black text-slate-900">{filteredData.length}</span> records
            </div>

            {/* Page Size Selector */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-600 cursor-pointer shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs font-semibold">
              Page <span className="font-mono font-black text-slate-900">{currentPage}</span> of{' '}
              <span className="font-mono font-black text-slate-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs font-bold text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs font-bold text-xs flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
