import React, { useState, useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import { ChevronLeft, ChevronRight, Search, Inbox, Maximize2, Minimize2, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

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
  emptySubtext = null,
  noMatchesMessage = 'No matching records found.',
  isLoading = false,
  error = null,
  onRetry = null,
  actions = null,
  toolbar = null,
  onRowClick = null,
  allowFullscreen = true,
  initialFullscreen = false,
  compact = false,
  tableMinWidth = null,
  tableFixed = false,
  noScroll = true,
}) {
  const { language, t } = useLanguage();
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
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    };
  }, [isFullscreen]);

  // Filter data based on query
  const filteredData = data.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();

    if (searchKeys && searchKeys.length > 0) {
      return searchKeys.some((k) => {
        const val = item[k];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
      });
    }

    return Object.values(item).some((val) => {
      if (typeof val === 'string' || typeof val === 'number') {
        return String(val).toLowerCase().includes(query);
      }
      return false;
    });
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] app-modal-backdrop p-2 sm:p-4 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200'
          : 'w-full max-w-full min-w-0 relative flex flex-col'
      }
      style={
        isFullscreen
          ? {
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }
          : undefined
      }
    >
      <div
        className={`w-full max-w-full bg-white border border-[#D4E4F7] rounded-xl md:rounded-2xl overflow-hidden shadow-xs transition-all duration-300 min-w-0 relative flex flex-col ${isFullscreen ? 'h-full max-h-full shadow-2xl ring-1 ring-[#123B6D]/20 flex-1 min-h-0' : ''
          }`}
      >
        {/* Top Gradient Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-[#123B6D] via-[#1D5FA7] to-[#246BCE] shrink-0" />

        {/* Table Header & Search Controls */}
        <div className={`border-b border-[#D4E4F7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full min-w-0 bg-[#F5F9FF] shrink-0 ${compact ? 'p-1.5 sm:px-2.5 sm:py-2' : 'p-2 sm:p-2.5'}`}>
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div className={`rounded-xl bg-[#1D5FA7] text-white shrink-0 shadow-xs ${compact ? 'p-1.5' : 'p-1.5 sm:p-2'}`}>
                <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className={`font-bold text-black tracking-tight flex items-center gap-1.5 flex-wrap ${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
                <span className="whitespace-nowrap">{typeof title === 'string' ? t(title) : title}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EAF3FF] text-black border border-[#D4E4F7] font-mono font-bold shrink-0 shadow-2xs">
                  {filteredData.length} {language === 'mr' ? 'नोंदी' : 'records'}
                </span>
                {isFullscreen && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EAF3FF] text-[#1D5FA7] border border-[#D4E4F7] shrink-0 font-mono">
                    {language === 'mr' ? 'फुल स्क्रीन मोड' : 'Full Screen Mode'}
                  </span>
                )}
              </h3>
              {subtitle && <p className="text-xs text-slate-700 font-medium line-clamp-1 mt-0.5">{typeof subtitle === 'string' ? t(subtitle) : subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-start sm:justify-end min-w-0">
            {searchable && (
              <div className="relative w-full sm:w-56 lg:w-64 max-w-full">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D5FA7] ${compact ? 'w-3.5 h-3.5 left-2.5' : 'w-4 h-4 left-3.5'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={typeof searchPlaceholder === 'string' ? t(searchPlaceholder) : searchPlaceholder}
                  className={`w-full bg-white border border-[#D4E4F7] rounded-xl sm:rounded-2xl text-xs sm:text-sm text-black placeholder:text-slate-500 focus:bg-white focus:outline-none focus:border-[#246BCE] focus:ring-2 focus:ring-[#246BCE]/20 transition-all font-medium shadow-2xs ${compact ? 'pl-8 pr-7 py-1 sm:py-1.5' : 'pl-9 pr-7 py-1.5 sm:py-2'}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {actions}
          </div>
        </div>

        {/* Optional Secondary Filter / Toolbar Strip */}
        {toolbar && (
          <div className="px-3 py-1.5 bg-[#FAFCFF] border-b border-[#D4E4F7] flex items-center justify-between gap-2 flex-wrap shrink-0 text-xs">
            {toolbar}
          </div>
        )}

        {/* DESKTOP TABLE VIEW - STRICT 100% CONTAINER FIT WITH PROPER ALIGNMENT */}
        <div className={`hidden md:block w-full max-w-full ${noScroll ? 'overflow-x-hidden' : 'overflow-x-auto'}`}>
          <table className={`w-full ${tableMinWidth ? tableMinWidth : 'w-full'} text-left text-xs sm:text-sm text-black border-collapse ${tableFixed || noScroll ? 'table-fixed' : 'table-auto'}`}>
            <thead className="table-header-main bg-gradient-to-r from-[#123B6D] via-[#164785] to-[#1D5FA7] text-white font-mono font-bold uppercase text-[11px] sm:text-xs tracking-wider border-b-2 border-[#0B2546] select-none shadow-xs">
              <tr>
                {columns.map((col, idx) => {
                  const colStyle = {
                    ...(col.width ? { width: col.width } : {}),
                    ...(col.minWidth ? { minWidth: col.minWidth } : {}),
                    ...(col.maxWidth ? { maxWidth: col.maxWidth } : {}),
                  };
                  const isFirst = idx === 0;
                  const isLast = idx === columns.length - 1;
                  const alignClass = col.align === 'right' || isLast ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                  const isDense = compact || columns.length >= 8;

                  return (
                    <th
                      key={idx}
                      style={{
                        ...(Object.keys(colStyle).length > 0 ? colStyle : {}),
                        color: '#FFFFFF',
                      }}
                      className={`${isDense ? 'py-2 px-1.5 sm:px-2 text-[10px] sm:text-[11px]' : 'py-3 px-3.5 text-[11px] sm:text-xs'} font-bold uppercase text-white border-r border-white/20 last:border-r-0 overflow-hidden ${isFirst ? (isDense ? 'pl-2 sm:pl-2.5' : 'pl-4 sm:pl-4.5') : ''
                        } ${isLast ? (isDense ? 'pr-2 sm:pr-2.5' : 'pr-4 sm:pr-4.5') : ''
                        } ${alignClass} ${col.headerClassName || ''}`}
                    >
                      <span
                        style={{ color: '#FFFFFF' }}
                        className={`${isDense ? 'font-sans font-bold tracking-tight text-[10.5px] sm:text-[11px]' : 'font-mono font-bold tracking-wider text-[11px] sm:text-xs'} text-white block truncate drop-shadow-xs`}
                        title={typeof col.header === 'string' ? t(col.header) : undefined}
                      >
                        {typeof col.header === 'string' ? t(col.header) : col.header}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4E4F7]">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center text-slate-700 bg-[#F5F9FF]">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] border border-[#D4E4F7] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <Loader2 className="w-6 h-6 text-[#1D5FA7] animate-spin" />
                    </div>
                    <div className="text-sm font-bold text-black tracking-tight">Loading records...</div>
                    <p className="text-xs text-slate-500 mt-1">Connecting to plant telemetry and database</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center text-slate-700 bg-[#F5F9FF]">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <AlertCircle className="w-6 h-6 text-rose-600" />
                    </div>
                    <div className="text-sm font-bold text-black tracking-tight">{typeof error === 'string' ? error : 'Failed to retrieve records'}</div>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Database request encountered an error or access restriction.</p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D5FA7] hover:bg-[#123B6D] text-white text-xs font-semibold shadow-2xs cursor-pointer transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row, rIdx) => (
                  <tr
                    key={row.id || rIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`group transition-all duration-150 even:bg-[#F5F9FF]/50 odd:bg-white hover:bg-[#EAF3FF] ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col, cIdx) => {
                      const colStyle = {
                        ...(col.width ? { width: col.width } : {}),
                        ...(col.minWidth ? { minWidth: col.minWidth } : {}),
                        ...(col.maxWidth ? { maxWidth: col.maxWidth } : {}),
                      };
                      const isFirst = cIdx === 0;
                      const isLast = cIdx === columns.length - 1;
                      const alignClass = col.align === 'right' || isLast ? 'text-right justify-end' : col.align === 'center' ? 'text-center justify-center' : 'text-left justify-start';
                      const isDense = compact || columns.length >= 8;

                      return (
                        <td
                          key={cIdx}
                          style={Object.keys(colStyle).length > 0 ? colStyle : undefined}
                          className={`${isDense ? 'py-1 px-1.5 sm:px-2 text-xs' : 'py-1.5 px-3'} align-middle min-w-0 ${isFirst ? (isDense ? 'pl-2 sm:pl-2.5' : 'pl-3.5 sm:pl-4') : ''
                            } ${isLast ? (isDense ? 'pr-2 sm:pr-2.5' : 'pr-3.5 sm:pr-4') : ''
                            } ${col.className || ''}`}
                        >
                          <div className={`w-full min-w-0 flex items-center ${alignClass}`}>
                            {col.render ? (
                              col.render(row)
                            ) : col.type === 'status' ? (
                              <StatusBadge status={row[col.accessor]} />
                            ) : (
                              <span className="font-semibold text-black block truncate" title={String(row[col.accessor] ?? '')}>
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
                  <td colSpan={columns.length} className="py-14 text-center text-slate-700 bg-[#F5F9FF]">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] border border-[#D4E4F7] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <Inbox className="w-6 h-6 text-[#1D5FA7]" />
                    </div>
                    <div className="text-sm font-bold text-black tracking-tight">
                      {searchQuery.trim() ? noMatchesMessage : emptyMessage}
                    </div>
                    {searchQuery.trim() ? (
                      <p className="text-xs text-slate-600 mt-1 font-medium">Try refining search terms or clearing the search box</p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1 font-medium">{emptySubtext || 'Click "+ Add" to create your first record'}</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className={`block md:hidden p-3 space-y-3 w-full max-w-full bg-[#F5F9FF]/50 ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}>
          {isLoading ? (
            <div className="py-10 text-center text-slate-700 bg-white rounded-xl border border-[#D4E4F7]">
              <Loader2 className="w-7 h-7 mx-auto mb-2 text-[#1D5FA7] animate-spin" />
              <div className="text-sm font-bold text-black">Loading records...</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">Fetching real-time plant telemetry</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-slate-700 bg-white rounded-xl border border-rose-200">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
              <div className="text-sm font-bold text-black">{typeof error === 'string' ? error : 'Failed to retrieve records'}</div>
              <p className="text-xs text-slate-500 mt-1">Database request encountered an error</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D5FA7] text-white text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          ) : paginatedData.length > 0 ? (
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
                            <div className="text-xs sm:text-sm font-bold text-[#1D5FA7] font-mono truncate">
                              {titleCol?.render ? titleCol.render(row) : (row[titleCol?.accessor] || 'Record')}
                            </div>
                            {subtitleCol && (
                              <div className="text-sm sm:text-base font-bold text-black mt-0.5 truncate">
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
                          <div className="grid grid-cols-2 gap-2.5 pt-3 mt-3 border-t border-[#D4E4F7] text-xs text-slate-800">
                            {detailCols.map((col, cIdx) => (
                              <div key={cIdx} className="min-w-0">
                                <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block truncate">
                                  {typeof col.header === 'string' ? t(col.header) : col.header}:
                                </span>
                                <div className="font-bold text-black text-xs sm:text-sm truncate mt-0.5">
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
            <div className="py-10 text-center text-slate-700 bg-white rounded-xl border border-[#D4E4F7]">
              <Inbox className="w-8 h-8 mx-auto mb-2 text-[#1D5FA7]" />
              <div className="text-sm sm:text-base font-bold text-black">
                {searchQuery.trim() ? (typeof noMatchesMessage === 'string' ? t(noMatchesMessage) : noMatchesMessage) : (typeof emptyMessage === 'string' ? t(emptyMessage) : emptyMessage)}
              </div>
              {searchQuery.trim() && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">{language === 'mr' ? 'शोध शब्द तपासा किंवा बदला' : 'Try clearing or refining search terms'}</p>
              )}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className={`border-t border-[#D4E4F7] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-700 w-full overflow-hidden bg-[#F5F9FF] shrink-0 ${compact ? 'py-1 px-2.5 sm:px-3 text-xs' : 'p-2.5 sm:p-3 sm:text-sm'}`}>
          <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold">
            <div>
              {language === 'mr' ? 'दाखवत आहे ' : 'Showing '}
              <span className="font-mono font-bold text-black">{filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span>{' '}
              {language === 'mr' ? 'ते ' : 'to '}
              <span className="font-mono font-bold text-black">{Math.min(currentPage * pageSize, filteredData.length)}</span>{' '}
              {language === 'mr' ? 'पैकी ' : 'of '}
              <span className="font-mono font-bold text-black">{filteredData.length}</span>{' '}
              {language === 'mr' ? 'नोंदी' : 'records'}
            </div>

            {/* Page Size Selector */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm text-slate-700 font-medium">
              <span>{language === 'mr' ? 'प्रति पान:' : 'Per page:'}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#D4E4F7] rounded-lg px-2 py-0.5 text-xs sm:text-sm font-bold text-black focus:outline-none focus:border-[#246BCE] cursor-pointer shadow-2xs"
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs sm:text-sm font-semibold">
              {language === 'mr' ? 'पान ' : 'Page '}
              <span className="font-mono font-bold text-black">{currentPage}</span>{' '}
              {language === 'mr' ? 'पैकी ' : 'of '}
              <span className="font-mono font-bold text-black">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#D4E4F7] hover:bg-[#EAF3FF] text-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs font-semibold text-xs sm:text-sm flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'mr' ? 'मागे' : 'Previous'}</span>
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#D4E4F7] hover:bg-[#EAF3FF] text-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs font-semibold text-xs sm:text-sm flex items-center gap-1"
              >
                <span className="hidden sm:inline">{language === 'mr' ? 'पुढे' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
