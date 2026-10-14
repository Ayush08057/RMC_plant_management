import React, { useState } from 'react';
import AppLayout from '../../components/dashboard/AppLayout';
import KPICard from '../../components/dashboard/KPICard';
import DataTable from '../../components/dashboard/DataTable';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAction from '../../components/dashboard/QuickAction';
import AlertCard from '../../components/dashboard/AlertCard';
import Modal from '../../components/dashboard/Modal';
import Toast from '../../components/dashboard/Toast';
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Plus,
  Sliders,
  Layers,
  Thermometer,
  Download
} from 'lucide-react';
import { MOCK_QC_DATA } from '../../data/mockDashboardData';
import { useAuth } from '../../context/AuthContext';
import AttendanceManagementView from '../../components/workforce/AttendanceManagementView';
import DailyWorkView from '../../components/workforce/DailyWorkView';
import LeaveManagementView from '../../components/workforce/LeaveManagementView';
import EmployeeDocumentsView from '../../components/workforce/EmployeeDocumentsView';

export default function QcDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);

  const [qcTests, setQcTests] = useState(MOCK_QC_DATA.tests);
  const { kpis, cubeSchedule, failedBatches } = MOCK_QC_DATA;

  // New QC Test Form
  const [testForm, setTestForm] = useState({
    batchId: '',
    mixGrade: '',
    site: '',
    qty: '',
    testType: 'Slump Cone & Temperature',
    slumpResult: '',
    status: 'Passed',
  });

  const handleCreateTest = (e) => {
    e.preventDefault();
    const newTest = {
      batchId: testForm.batchId,
      mixGrade: testForm.mixGrade,
      site: testForm.site,
      qty: testForm.qty,
      testType: testForm.testType,
      result: `${testForm.slumpResult} (Spec: 120-150 mm)`,
      qcEngineer: user?.name || 'QC Engineer',
      status: testForm.status,
      timestamp: 'Just Now',
    };
    setQcTests([newTest, ...qcTests]);
    setShowTestModal(false);
    setToastMessage(`QC Test logged for Batch ${newTest.batchId} (${newTest.status})`);
  };

  const columns = [
    {
      header: 'Batch ID',
      accessor: 'batchId',
      render: (row) => <span className="font-mono text-cyan-400 font-bold">{row.batchId}</span>
    },
    {
      header: 'Mix Grade / Formula',
      accessor: 'mixGrade',
      render: (row) => (
        <div>
          <span className="font-semibold text-white block">{row.mixGrade}</span>
          <span className="text-[10px] text-slate-400 font-mono">IS 10262 Mix Code</span>
        </div>
      )
    },
    { header: 'Pouring Site', accessor: 'site' },
    { header: 'Volume', accessor: 'qty', className: 'font-mono text-white font-bold' },
    {
      header: 'Test Type & Param',
      accessor: 'testType',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-200">{row.testType}</div>
          <div className="text-[11px] font-mono text-slate-400">{row.result}</div>
        </div>
      )
    },
    { header: 'Engineer', accessor: 'qcEngineer', className: 'text-slate-300' },
    {
      header: 'QC Result',
      accessor: 'status',
      render: (row) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${row.status === 'Passed'
            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50'
            : row.status === 'Pending'
              ? 'bg-amber-950/70 text-amber-300 border-amber-600/50'
              : 'bg-rose-950/70 text-rose-300 border-rose-600/50'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'Passed' ? 'bg-emerald-400' : row.status === 'Pending' ? 'bg-amber-400' : 'bg-rose-400'
            }`} />
          <span>{row.status}</span>
        </span>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => setToastMessage(`Certificate for ${row.batchId} generated`)}
          className="px-2.5 py-1 rounded text-[11px] bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs font-semibold"
        >
          QC Cert
        </button>
      ),
    },
  ];

  return (
    <AppLayout
      title="Quality Control & Materials Testing Hub"
      subtitle="IS 456 / IS 10262 compliance testing, real-time slump retention verification, and 7/28-day compressive strength tracking."
      badge="QC LAB NODE #01"
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add QC Test</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCertModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Mix Compliance</span>
          </button>
        </div>
      }
    >
      {activeTab === 'attendance' && <AttendanceManagementView />}
      {activeTab === 'daily-work' && <DailyWorkView />}
      {activeTab === 'leaves' && <LeaveManagementView />}
      {activeTab === 'documents' && <EmployeeDocumentsView />}

      {activeTab === 'dashboard' && (
        <div className="w-full flex-1 flex flex-col space-y-5 pb-6 min-w-0">
          {/* 4 Primary KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            <KPICard
              title="Tests Completed Today"
              value={kpis.testsToday}
              subtext={`${kpis.passedTests} Passed • ${kpis.pendingTests} Pending • ${kpis.failedTests} Failed`}
              trend={kpis.testsToday > 0 ? `${Math.round((kpis.passedTests / kpis.testsToday) * 100)}% Pass Rate` : "Standby"}
              trendType="up"
              color="cyan"
              icon={FlaskConical}
            />
            <KPICard
              title="Active Batch Lots"
              value={kpis.activeBatches}
              subtext="Tested prior to gate release"
              trend={kpis.activeBatches > 0 ? "100% Inspected" : "Standby"}
              trendType="up"
              color="emerald"
              icon={CheckCircle2}
            />
            <KPICard
              title="Rejected Batches"
              value={kpis.rejectedBatches}
              subtext={kpis.rejectedBatches > 0 ? "Stopped at yard gate" : "Zero rejected batches"}
              trend={kpis.rejectedBatches > 0 ? "Action Documented" : "Normal"}
              trendType={kpis.rejectedBatches > 0 ? "down" : "up"}
              color="rose"
              icon={AlertTriangle}
            />
            <KPICard
              title="IS 456 Standards Audit"
              value="Certified"
              subtext="Lab calibrated load cell"
              trend="Compliant"
              trendType="neutral"
              color="purple"
              icon={ShieldCheck}
            />
          </section>

          {/* Primary Operations Table: Today's QC Tests Table */}
          <section>
            <DataTable
              title="Today's Concrete Quality Control Tests"
              subtitle="Real-time slump, temperature, flow and sampling logs before mixer release"
              icon={FlaskConical}
              columns={columns}
              data={qcTests}
              searchPlaceholder="Search batch ID, mix grade, pour site..."
              renderMobileCard={(t) => (
                <div className="w-full max-w-full overflow-hidden min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-cyan-700 truncate block">{t.batchId}</span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{t.mixGrade}</div>
                      <div className="text-xs text-slate-500 truncate">{t.site}</div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge
                        status={t.status === 'Passed' ? 'success' : t.status === 'Pending' ? 'warning' : 'danger'}
                        text={t.status}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Test Type:</span>
                      <span className="font-semibold text-slate-800">{t.testType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Result:</span>
                      <span className="font-mono font-bold text-amber-700">{t.result}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Volume:</span>
                      <span className="font-mono font-bold text-slate-900">{t.qty}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Timestamp:</span>
                      <span className="font-mono text-slate-600">{t.timestamp}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setToastMessage(`Certificate for ${t.batchId} downloaded`)}
                      className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 rounded"
                    >
                      Download Cert
                    </button>
                  </div>
                </div>
              )}
            />
          </section>

          {/* Operational Actions */}
          <section>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Quality Control Quick Commands
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <QuickAction
                icon={FlaskConical}
                title="Log QC Sample"
                desc="Enter slump & flow result"
                color="cyan"
                onClick={() => setShowTestModal(true)}
              />
              <QuickAction
                icon={CheckCircle2}
                title="Cube Crushing"
                desc="Record 7d / 28d compressive"
                color="emerald"
                onClick={() => setToastMessage('Opened digital compressive testing machine input.')}
              />
              <QuickAction
                icon={Sliders}
                title="Mix Designs"
                desc="Inspect M20 to M50 recipes"
                color="purple"
                onClick={() => setToastMessage('Mix design library (14 certified grades loaded).')}
              />
              <QuickAction
                icon={Download}
                title="Generate QC Cert"
                desc="Export customer test sheet"
                color="blue"
                onClick={() => setToastMessage('Customer quality conformance certificate compiled.')}
              />
            </div>
          </section>

          {/* Cube Crushing Schedule & Failed Batches Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
            {/* Cube Crushing Schedule */}
            <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compressive Cube Crushing Schedule (IS 516)</span>
                </h3>
                <span className="text-[9px] font-mono text-emerald-700 font-semibold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">
                  100% PASS
                </span>
              </div>

              <div className="space-y-1.5">
                {cubeSchedule.length > 0 ? (
                  cubeSchedule.map((cube, idx) => (
                    <div key={idx} className="p-2 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 font-mono text-xs">{cube.lot} • {cube.mix}</div>
                        <div className="text-[9.5px] text-slate-500 mt-0.5">
                          Cast: {cube.castingDate} ({cube.ageDays}-Day Target: {cube.targetMpa} MPa)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 font-mono text-xs">{cube.achievedMpa} MPa</div>
                        <span className="text-[8.5px] font-semibold text-emerald-700">{cube.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-center text-xs text-slate-400 font-medium">
                    No compressive cube test schedules logged for today.
                  </div>
                )}
              </div>
            </div>

            {/* Failed Batch Logs & Root Cause Analysis */}
            <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Failed Batch Quarantine & Root Cause</span>
                </h3>
                <span className="text-[9px] font-mono text-rose-700 font-semibold px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200">
                  ZERO RELEASED
                </span>
              </div>

              <div className="space-y-3">
                {failedBatches.length > 0 ? (
                  failedBatches.map((fb, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-700 text-xs">{fb.batchId} • Grade: {fb.grade}</span>
                        <span className="text-[10px] font-mono text-slate-500">{fb.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        <strong>Defect:</strong> {fb.reason}
                      </p>
                      <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-[11px] text-emerald-800 font-medium shadow-2xs">
                        <strong>Corrective Action:</strong> {fb.actionTaken}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium">
                    No failed or quarantined batches logged. All batches meet specifications.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Record New Concrete QC Test"
        subtitle="Log on-site slump cone and laboratory specimen data."
        icon={FlaskConical}
      >
        <form onSubmit={handleCreateTest} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Batch ID *
              </label>
              <input
                type="text"
                required
                value={testForm.batchId}
                onChange={(e) => setTestForm({ ...testForm, batchId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Concrete Mix Grade
              </label>
              <input
                type="text"
                value={testForm.mixGrade}
                onChange={(e) => setTestForm({ ...testForm, mixGrade: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Pouring Project Site
            </label>
            <input
              type="text"
              value={testForm.site}
              onChange={(e) => setTestForm({ ...testForm, site: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Measured Slump (mm)
              </label>
              <input
                type="text"
                value={testForm.slumpResult}
                onChange={(e) => setTestForm({ ...testForm, slumpResult: e.target.value })}
                placeholder="e.g. 135 mm"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                QC Decision
              </label>
              <select
                value={testForm.status}
                onChange={(e) => setTestForm({ ...testForm, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-cyan-500"
              >
                <option value="Passed">Passed (Approved)</option>
                <option value="Pending">Pending Lab Test</option>
                <option value="Failed">Failed (Reject Batch)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowTestModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950"
            >
              Save QC Record
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        title="IS 456 / IS 10262 Compliance Standards"
        subtitle="Standard technical parameters and tolerances for plant mix formulations."
        icon={ShieldCheck}
      >
        <div className="space-y-3 text-xs text-slate-300">
          <p className="text-slate-400">
            Water-cement ratio (w/c) is maintained between 0.38 and 0.45. Minimum cementitious content for RCC works meets 360 kg/m³ with flyash substitution capped at 25%.
          </p>
          <div className="p-3 rounded-xl bg-cyan-50/80 border border-cyan-200/90 font-mono text-cyan-800">
            IS 10262 Target Mean Strength Formula: f'ck = fck + 1.65 × s
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowCertModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-900 border border-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </AppLayout>
  );
}
