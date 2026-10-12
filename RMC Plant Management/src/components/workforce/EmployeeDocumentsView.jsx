import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  FileUp,
  FileCheck
} from 'lucide-react';
import { useWorkforce } from '../../context/WorkforceContext';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../dashboard/DataTable';
import StatusBadge from '../dashboard/StatusBadge';
import Modal from '../dashboard/Modal';
import Toast from '../dashboard/Toast';

export default function EmployeeDocumentsView({ employeeFilter = null }) {
  const { user } = useAuth();
  const { documents, employees, addDocument } = useWorkforce();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  const handleUpload = (e) => {
    e.preventDefault();
    if (!form.documentNumber.trim()) {
      alert('Please provide document reference number.');
      return;
    }

    addDocument({
      employeeId: form.employeeId,
      documentType: form.documentType,
      documentNumber: form.documentNumber,
      expiryDate: form.expiryDate || null,
      status: 'Available',
    });

    setShowUploadModal(false);
    setToastMessage(`Document ${form.documentType} uploaded to digital employee locker.`);
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
        <button
          type="button"
          onClick={() => setToastMessage(`Secure download of ${row.documentType} initiated.`)}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:text-white border border-slate-800 cursor-pointer"
          title="Download Document"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-[#12151e] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Digital Workforce Document Locker</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Aadhaar, PAN, Heavy Commercial Vehicle driving licenses, and banking proof documents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/20"
        >
          <FileUp className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Documents Table */}
      <DataTable
        title="Encrypted Personnel Document Vault"
        subtitle="Role-protected records with license renewal alerts and compliance certificates"
        icon={FileCheck}
        columns={columns}
        data={filteredDocs}
        renderMobileCard={(row) => (
          <div className="w-full max-w-full overflow-hidden min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">{row.employeeName}</div>
                <div className="text-xs text-amber-700 font-bold">{row.documentType}</div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Ref No:</span>
                <span className="text-slate-900 font-bold truncate block">{row.documentNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Expiry:</span>
                <span className={row.status === 'Expiring Soon' ? 'text-amber-700 font-bold' : 'text-slate-600'}>
                  {row.expiryDate || 'N/A'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setToastMessage(`Secure download of ${row.documentType} initiated.`)}
                className="w-full py-1.5 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Encrypted PDF</span>
              </button>
            </div>
          </div>
        )}
      />

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Personnel Document"
        subtitle="Attach statutory ID or compliance certification to employee file."
        icon={FileUp}
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Employee</label>
            {employeeFilter || user?.role !== 'Admin' ? (
              <div className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xs">
                {user?.name || 'Staff'} ({employeeFilter || user?.employeeId || user?.id})
              </div>
            ) : (
              <select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-cyan-500"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.id} • {e.role})</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Document Type</label>
              <select
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white focus:border-cyan-500"
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
              <label className="text-slate-400 font-semibold block mb-1">Document Reference No *</label>
              <input
                type="text"
                required
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                placeholder="e.g. MH-03-2015-0048192"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Expiry Date (If applicable)</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-white font-mono focus:border-cyan-500"
            />
          </div>

          {/* Drag & drop simulation */}
          <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-50 border border-slate-200 text-center space-y-1">
            <FileUp className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-slate-300 font-semibold">Select PDF or Scanned JPEG</div>
            <div className="text-[10px] text-slate-500">Max file size 5MB • AES-256 encrypted storage</div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 text-white"
            >
              Upload to Vault
            </button>
          </div>
        </form>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
