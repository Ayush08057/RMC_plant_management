import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Download, 
  ShieldCheck, 
  FileUp,
  FileCheck,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';
import { 
  validateDocumentFile, 
  uploadEmployeeDocument, 
  downloadEmployeeDocument, 
  formatBytes 
} from '../../services/storageService.js';

export default function EmployeeDocumentsView({ employeeFilter = null }) {
  const { user } = useAuth();
  const { documents, employees, addDocument, deleteDocument } = useWorkforce();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // File upload state
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [form, setForm] = useState({
    employeeId: employeeFilter || user?.employeeId || employees[0]?.id || '',
    documentType: 'Aadhaar Card',
    documentNumber: '',
    expiryDate: '',
  });

  const filteredDocs = documents.filter((d) => {
    if (employeeFilter) return d.employeeId === employeeFilter;
    return true;
  });

  const handleFileChange = (e) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError(null);

    if (!form.documentNumber.trim()) {
      setUploadError('Please provide the document reference/ID number.');
      return;
    }

    if (!selectedFile) {
      setUploadError('Please select a PDF or image file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const activeCompanyId = user?.companyId || localStorage.getItem('rmc_active_company_v1') || 'CMP-SM-001';
      const targetEmpId = form.employeeId || user?.employeeId || user?.id;

      // 1. Upload binary file to Firebase Cloud Storage with real progress
      const uploadResult = await uploadEmployeeDocument(
        selectedFile,
        {
          companyId: activeCompanyId,
          employeeId: targetEmpId,
          documentType: form.documentType,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // 2. Persist metadata in Firestore only AFTER successful storage upload
      await addDocument({
        employeeId: targetEmpId,
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim(),
        expiryDate: form.expiryDate || null,
        status: 'Available',
        storagePath: uploadResult.storagePath,
        originalFileName: uploadResult.fileName,
        fileSize: uploadResult.fileSizeFormatted,
      });

      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setForm((prev) => ({ ...prev, documentNumber: '', expiryDate: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      setToastMessage(`✓ ${form.documentType} securely uploaded to employee vault.`);
    } catch (err) {
      console.error('Document upload error:', err);
      setUploadError(err.message || 'Upload failed. Please check network connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const canDelete = Boolean(
    user?.role === 'Admin' ||
    user?.role === 'Owner / Director' ||
    user?.role === 'HR Manager' ||
    user?.role === 'HR Executive' ||
    user?.email === 'smconcretech@gmail.com'
  );

  const handleDownload = async (row) => {
    try {
      setToastMessage(`Authenticating download for ${row.documentType}...`);
      await downloadEmployeeDocument(
        row.storagePath, 
        row.downloadUrl, 
        row.originalFileName || `${row.documentType.replace(/\s+/g, '_')}.pdf`
      );
      setToastMessage(`✓ ${row.documentType} downloaded securely.`);
    } catch (err) {
      setToastMessage(`Download failed: ${err.message}`);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${row.documentType}" for ${row.employeeName}? This action cannot be undone.`)) {
      return;
    }
    try {
      setToastMessage(`Deleting ${row.documentType}...`);
      await deleteDocument(row.id);
      setToastMessage(`✓ Document "${row.documentType}" permanently deleted.`);
    } catch (err) {
      console.error('Document deletion failed:', err);
      setToastMessage(`Deletion failed: ${err.message}`);
    }
  };

  const columns = [
    {
      header: 'Staff Member',
      accessor: 'employeeName',
      render: (row) => (
        <div>
          <span className="font-bold text-white text-xs block">{row.employeeName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.employeeId}</span>
        </div>
      ),
    },
    {
      header: 'Document Classification',
      accessor: 'documentType',
      render: (row) => (
        <span className="font-semibold text-white text-xs flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{row.documentType}</span>
        </span>
      ),
    },
    { header: 'Reference / ID Number', accessor: 'documentNumber', className: 'font-mono text-slate-300 text-xs' },
    { header: 'Upload Date', accessor: 'uploadDate', className: 'font-mono text-slate-400 text-xs' },
    {
      header: 'Expiry Date',
      accessor: 'expiryDate',
      render: (row) => (
        <span className="font-mono text-xs">
          {row.expiryDate ? (
            <span className={row.status === 'Expiring Soon' ? 'text-amber-400 font-bold' : 'text-slate-300'}>
              {row.expiryDate}
            </span>
          ) : (
            <span className="text-slate-500">Perpetual</span>
          )}
        </span>
      ),
    },
    { header: 'File Size', accessor: 'fileSize', className: 'font-mono text-slate-400 text-[11px]' },
    { header: 'Status', accessor: 'status', type: 'status' },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleDownload(row)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:text-white cursor-pointer transition-colors shadow-2xs"
            title="Download Encrypted Document"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => handleDelete(row)}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors shadow-2xs"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="px-3 py-1.5 rounded-lg bg-white border border-[#D4E4F7] shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#EAF3FF] border border-[#D4E4F7] text-[#1D5FA7] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-bold text-black uppercase tracking-wider truncate">
            Digital Workforce Document Locker (Firebase Cloud Storage Vault)
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            setUploadError(null);
            setSelectedFile(null);
            setUploadProgress(0);
            setShowUploadModal(true);
          }}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1D5FA7] hover:bg-[#123B6D] text-white flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 transition-colors"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Documents Table */}
      <DataTable
        title="Encrypted Personnel Document Vault"
        icon={FileCheck}
        columns={columns}
        data={filteredDocs}
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-black truncate">{row.employeeName}</div>
                <div className="text-xs text-[#1D5FA7] font-bold">{row.documentType}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-[#D4E4F7]">
              <div>
                <span className="text-[10px] text-slate-700 font-bold uppercase block">Ref No:</span>
                <span className="text-black font-bold truncate block">{row.documentNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-700 font-bold uppercase block">Expiry:</span>
                <span className={row.status === 'Expiring Soon' ? 'text-black font-bold' : 'text-slate-800'}>
                  {row.expiryDate || 'N/A'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#D4E4F7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleDownload(row)}
                className="flex-1 py-1.5 rounded-lg bg-[#EAF3FF] text-black hover:bg-[#D4E4F7]/60 border border-[#D4E4F7] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#1D5FA7]" />
                <span>Download</span>
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        )}
      />

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          if (!isUploading) {
            setShowUploadModal(false);
            setSelectedFile(null);
            setUploadError(null);
          }
        }}
        title="Upload Personnel Document"
        subtitle="Upload statutory ID or compliance certification to Firebase Cloud Storage."
        icon={FileUp}
      >
        <form onSubmit={handleUpload} className="space-y-3.5 p-3 sm:p-4 bg-white rounded-xl border border-[#D4E4F7] text-xs">
          
          {uploadError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          <div>
            <label className="text-black font-bold block mb-1">Employee</label>
            {employeeFilter || user?.role !== 'Admin' ? (
              <div className="w-full px-3 py-2 rounded-lg bg-[#F5F9FF] border border-[#D4E4F7] text-black font-mono font-bold text-xs">
                {user?.name || 'Staff'} ({employeeFilter || user?.employeeId || user?.id})
              </div>
            ) : (
              <select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4E4F7] text-black font-medium focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20 outline-none cursor-pointer"
                disabled={isUploading}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.id} • {e.role})</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-black font-bold block mb-1">Document Type</label>
              <select
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4E4F7] text-black font-medium focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20 outline-none cursor-pointer"
                disabled={isUploading}
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Heavy Commercial Driving License">Heavy Commercial Driving License</option>
                <option value="Bank Passbook / Cheque">Bank Passbook / Cheque</option>
                <option value="Joining Appointment Letter">Joining Appointment Letter</option>
                <option value="Technical Qualification Certificate">Technical Qualification Certificate</option>
              </select>
            </div>
            <div>
              <label className="text-black font-bold block mb-1">Document Reference No *</label>
              <input
                type="text"
                required
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                placeholder="e.g. MH-03-2015-0048192"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4E4F7] text-black font-mono font-medium focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20 outline-none"
                disabled={isUploading}
              />
            </div>
          </div>

          <div>
            <label className="text-black font-bold block mb-1">Expiry Date (If applicable)</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#D4E4F7] text-black font-mono font-medium focus:border-[#246BCE] focus:ring-1 focus:ring-[#246BCE]/20 outline-none"
              disabled={isUploading}
            />
          </div>

          {/* Actual File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={isUploading}
          />

          {/* Drag & drop / file selection trigger */}
          <div 
            onClick={() => {
              if (!isUploading) fileInputRef.current?.click();
            }}
            className={`p-4 rounded-xl border border-dashed transition-all cursor-pointer text-center space-y-1.5 ${
              selectedFile 
                ? 'bg-emerald-50 border-emerald-300' 
                : 'border-[#D4E4F7] bg-[#F5F9FF] hover:bg-[#EAF3FF]'
            }`}
          >
            {selectedFile ? (
              <div className="flex items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2 text-left min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{formatBytes(selectedFile.size)}</div>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <FileUp className="w-5 h-5 text-[#1D5FA7] mx-auto" />
                <div className="text-black font-bold">Click to Select Document File</div>
                <div className="text-[10px] text-slate-700 font-mono">Accepted: PDF, JPEG, PNG • Max: 5 MB</div>
              </>
            )}
          </div>

          {/* Real Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-[#1D5FA7] animate-spin" />
                  <span>Uploading to Cloud Storage...</span>
                </span>
                <span className="font-mono text-[#1D5FA7]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D4E4F7]">
            <button
              type="button"
              onClick={() => {
                setShowUploadModal(false);
                setSelectedFile(null);
                setUploadError(null);
              }}
              disabled={isUploading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-black border border-[#D4E4F7] hover:bg-[#F5F9FF] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                isUploading || !selectedFile
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-[#1D5FA7] hover:bg-[#123B6D]'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading ({uploadProgress}%)</span>
                </>
              ) : (
                <span>Upload to Cloud Vault</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
