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
  itemsPerPage = 6,
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
        containerRef.current.requestFullscreen().catch(() => { });
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
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
          document.exitFullscreen().catch(() => { });
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
          ? 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md p-2 sm:p-4 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200'
          : 'w-full max-w-full min-w-0 relative flex flex-col'
      }
    >
      <div
        className={`w-full max-w-full bg-white border border-[#D4E4F7] rounded-xl md:rounded-2xl overflow-hidden shadow-xs transition-all duration-300 min-w-0 relative flex flex-col ${isFullscreen ? 'h-full max-h-full shadow-2xl ring-1 ring-[#123B6D]/20 flex-1 min-h-0' : ''
          }`}
      >
        {/* Top Gradient Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-[#123B6D] via-[#1D5FA7] to-[#246BCE] shrink-0" />

        {/* Table Header & Search Controls */}
        <div className="p-2 sm:p-2.5 border-b border-[#D4E4F7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full min-w-0 bg-[#F5F9FF] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div className="p-1.5 sm:p-2 rounded-xl bg-[#1D5FA7] text-white shrink-0 shadow-xs">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#123B6D] tracking-tight flex items-center gap-1.5 flex-wrap">
                <span className="whitespace-nowrap">{title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF3FF] text-[#123B6D] border border-[#D4E4F7] font-mono font-bold shrink-0 shadow-2xs">
                  {filteredData.length} records
                </span>
                {isFullscreen && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#EAF3FF] text-[#1D5FA7] border border-[#D4E4F7] shrink-0 font-mono">
                    Full Screen Mode
                  </span>
                )}
              </h3>
              {subtitle && <p className="text-[11px] text-[#1D5FA7] font-medium line-clamp-1">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-start sm:justify-end min-w-0">
            {searchable && (
              <div className="relative w-full sm:w-56 lg:w-64 max-w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D5FA7]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white border border-[#D4E4F7] rounded-xl sm:rounded-2xl text-xs text-[#123B6D] placeholder-[#1D5FA7]/50 focus:bg-white focus:outline-none focus:border-[#246BCE] focus:ring-2 focus:ring-[#246BCE]/20 transition-all font-medium shadow-2xs"
                />
              </div>
            )}
            {actions}
          </div>
        </div>

        {/* DESKTOP TABLE VIEW - STRICT 100% CONTAINER FIT WITH PROPER ALIGNMENT */}
        <div className="hidden md:block w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs text-[#123B6D] border-collapse table-fixed">
            <thead className="bg-[#123B6D] text-white font-mono font-bold uppercase text-[10px] tracking-wider border-b border-[#123B6D] select-none">
              <tr>
                {columns.map((col, idx) => {
                  const colStyle = {
                    ...(col.width ? { width: col.width } : {}),
                    ...(col.maxWidth ? { maxWidth: col.maxWidth } : {}),
                  };
                  const isFirst = idx === 0;
                  const isLast = idx === columns.length - 1;
                  const alignClass = col.align === 'right' || isLast ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';

                  return (
                    <th
                      key={idx}
                      style={Object.keys(colStyle).length > 0 ? colStyle : undefined}
                      className={`py-2 px-3 text-[10px] font-mono font-extrabold uppercase tracking-wider text-white bg-[#123B6D] border-b border-[#123B6D] ${isFirst ? 'pl-3.5 sm:pl-4' : ''
                        } ${isLast ? 'pr-3.5 sm:pr-4' : ''
                        } ${alignClass} ${col.headerClassName || ''}`}
                    >
                      <span className="font-mono font-bold text-white block truncate" title={typeof col.header === 'string' ? col.header : undefined}>
                        {col.header}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4E4F7]">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rIdx) => (
                  <tr
                    key={row.id || rIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`group transition-all duration-150 even:bg-[#F5F9FF]/50 odd:bg-white hover:bg-[#EAF3FF] ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col, cIdx) => {
                      const colStyle = {
                        ...(col.width ? { width: col.width } : {}),
                        ...(col.maxWidth ? { maxWidth: col.maxWidth } : {}),
                      };
                      const isFirst = cIdx === 0;
                      const isLast = cIdx === columns.length - 1;
                      const alignClass = col.align === 'right' || isLast ? 'text-right justify-end' : col.align === 'center' ? 'text-center justify-center' : 'text-left justify-start';

                      return (
                        <td
                          key={cIdx}
                          style={Object.keys(colStyle).length > 0 ? colStyle : undefined}
                          className={`py-1.5 px-3 align-middle min-w-0 ${isFirst ? 'pl-3.5 sm:pl-4' : ''
                            } ${isLast ? 'pr-3.5 sm:pr-4' : ''
                            } ${col.className || ''}`}
                        >
                          <div className={`min-w-0 flex items-center ${alignClass}`}>
                            {col.render ? (
                              col.render(row)
                            ) : col.type === 'status' ? (
                              <StatusBadge status={row[col.accessor]} />
                            ) : (
                              <span className="font-semibold text-[#123B6D] block truncate" title={String(row[col.accessor] ?? '')}>
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
                  <td colSpan={columns.length} className="py-14 text-center text-[#1D5FA7] bg-[#F5F9FF]">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] border border-[#D4E4F7] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <Inbox className="w-6 h-6 text-[#1D5FA7]" />
                    </div>
                    <div className="text-sm font-bold text-[#123B6D] tracking-tight">{emptyMessage}</div>
                    {searchQuery && (
                      <p className="text-xs text-[#1D5FA7] mt-1 font-medium">Try refining search query parameters</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className={`block md:hidden p-3 space-y-3 w-full max-w-full bg-[#F5F9FF]/50 ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}>
          {paginatedData.length > 0 ? (
            paginatedData.map((row, rIdx) => (
              <div
                key={row.id || rIdx}
                className="p-4 rounded-xl bg-white border border-[#D4E4F7] space-y-3 shadow-2xs hover:border-[#1D5FA7] transition-all w-full max-w-full min-w-0 overflow-hidden"
                onClick={() => onRowClick && onRowClick(row)}
              >
                {renderMobileCard ? (
                  renderMobileCard(row)
                ) : (
                  (() => {
                    const statusCol = columns.find((c) => c.type === 'status' || c.accessor === 'status');
                    const actionCol = columns.find(
                      (c) => c.accessor === 'actions' || c.header?.toLowerCase()?.includes('action')
                    );
                    const titleCol = columns[0];
                    const subtitleCol = columns[1];
                    const detailCols = columns.filter(
                      (c) => c !== titleCol && c !== subtitleCol && c !== statusCol && c !== actionCol
                    );

                    return (
                      <div className="w-full max-w-full overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#1D5FA7] font-mono truncate">
                              {titleCol?.render ? titleCol.render(row) : (row[titleCol?.accessor] || 'Record')}
                            </div>
                            {subtitleCol && (
                              <div className="text-sm font-bold text-[#123B6D] mt-0.5 truncate">
                                {subtitleCol.render ? subtitleCol.render(row) : row[subtitleCol.accessor]}
                              </div>
                            )}
                          </div>
                          {statusCol && (
                            <div className="shrink-0">
                              {statusCol.render ? (
                                statusCol.render(row)
                              ) : (
                                <StatusBadge status={row[statusCol.accessor]} />
                              )}
                            </div>
                          )}
                        </div>

                        {detailCols.length > 0 && (
                          <div className="grid grid-cols-2 gap-2.5 pt-3 mt-3 border-t border-[#D4E4F7] text-[11px] text-[#123B6D]">
                            {detailCols.map((col, cIdx) => (
                              <div key={cIdx} className="min-w-0">
                                <span className="text-[10px] text-[#1D5FA7] font-bold uppercase tracking-wider block truncate">
                                  {col.header}:
                                </span>
                                <div className="font-semibold text-[#123B6D] truncate mt-0.5">
                                  {col.render ? col.render(row) : row[col.accessor]}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {actionCol && (
                          <div className="pt-2.5 mt-2.5 border-t border-[#D4E4F7] flex items-center justify-end gap-2 flex-wrap">
                            {actionCol.render ? actionCol.render(row) : row[actionCol.accessor]}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-[#1D5FA7] bg-white rounded-xl border border-[#D4E4F7]">
              <Inbox className="w-8 h-8 mx-auto mb-2 text-[#1D5FA7]" />
              <div className="text-sm font-bold text-[#123B6D]">{emptyMessage}</div>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-2 sm:p-2.5 border-t border-[#D4E4F7] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#1D5FA7] w-full overflow-hidden bg-[#F5F9FF] shrink-0">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div>
              Showing <span className="font-mono font-bold text-[#123B6D]">{filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-mono font-bold text-[#123B6D]">{Math.min(currentPage * pageSize, filteredData.length)}</span> of{' '}
              <span className="font-mono font-bold text-[#123B6D]">{filteredData.length}</span> records
            </div>

            {/* Page Size Selector */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#1D5FA7] font-medium">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#D4E4F7] rounded-lg px-2 py-0.5 text-xs font-bold text-[#123B6D] focus:outline-none focus:border-[#246BCE] cursor-pointer shadow-2xs"
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs font-semibold">
              Page <span className="font-mono font-bold text-[#123B6D]">{currentPage}</span> of{' '}
              <span className="font-mono font-bold text-[#123B6D]">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#D4E4F7] hover:bg-[#EAF3FF] text-[#123B6D] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs font-semibold text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#D4E4F7] hover:bg-[#EAF3FF] text-[#123B6D] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs font-semibold text-xs flex items-center gap-1"
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
