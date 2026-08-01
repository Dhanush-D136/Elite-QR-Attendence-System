import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ShieldCheck, ShieldAlert, Wrench, RefreshCw, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

export const DataIntegrityAuditPanel: React.FC = () => {
  const [auditData, setAuditData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<any>(null);

  const runAudit = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/analytics/audit-integrity');
      setAuditData(res.data);
    } catch (err) {
      console.error('Failed to run data integrity audit', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  const handleRepair = async () => {
    if (!confirm('Are you sure you want to run automated database integrity repair? This will safely remove orphan records and deduplicate scans.')) {
      return;
    }

    try {
      setIsRepairing(true);
      setRepairResult(null);
      const res = await api.post('/analytics/repair-integrity');
      setRepairResult(res.data);
      runAudit();
    } catch (err: any) {
      alert(`❌ Repair Error: ${err.response?.data?.error || 'Failed to complete database repair'}`);
    } finally {
      setIsRepairing(false);
    }
  };

  if (isLoading || !auditData) {
    return (
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#6D5DFC]" />
          <span>Scanning database integrity & running diagnostics...</span>
        </div>
      </div>
    );
  }

  const { healthScore, totalIssues, totalRecords, metrics } = auditData;
  const isHealthy = totalIssues === 0;

  return (
    <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E7E7E7]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
            isHealthy ? 'bg-[#ECFDF5] text-[#12B76A]' : 'bg-rose-50 text-rose-600'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-extrabold text-base text-[#111827]">
                Data Integrity Audit Engine
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                isHealthy
                  ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}>
                {isHealthy ? '✓ HEALTHY (100%)' : `⚠️ ${totalIssues} ISSUES DETECTED`}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] font-medium mt-0.5">
              Automated database diagnostic scanner for orphan records, duplicate scans, & QR mismatches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runAudit}
            disabled={isLoading || isRepairing}
            className="p-2.5 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-[#6B7280] hover:text-[#111827] hover:bg-white transition-all shadow-sm"
            title="Re-run Diagnostics Scan"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleRepair}
            disabled={isRepairing || isHealthy}
            className={`px-4 py-2.5 rounded-full text-xs font-bold shadow-floating transition-all flex items-center gap-2 ${
              isHealthy
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-[#6D5DFC] text-white hover:bg-[#5b4be0] active:scale-98'
            }`}
          >
            <Wrench className={`w-4 h-4 ${isRepairing ? 'animate-spin' : ''}`} />
            <span>{isRepairing ? 'Repairing Database...' : 'One-Click Auto-Repair'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
          <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Orphan Student Records</span>
          <strong className={`font-mono text-base font-extrabold ${metrics.orphanStudents > 0 ? 'text-rose-600' : 'text-[#12B76A]'}`}>
            {metrics.orphanStudents}
          </strong>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
          <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Orphan Session Records</span>
          <strong className={`font-mono text-base font-extrabold ${metrics.orphanSessions > 0 ? 'text-rose-600' : 'text-[#12B76A]'}`}>
            {metrics.orphanSessions}
          </strong>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
          <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Duplicate Scan Entries</span>
          <strong className={`font-mono text-base font-extrabold ${metrics.duplicateScans > 0 ? 'text-amber-600' : 'text-[#12B76A]'}`}>
            {metrics.duplicateScans}
          </strong>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
          <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Corrupted QR Sessions</span>
          <strong className={`font-mono text-base font-extrabold ${metrics.invalidSessions > 0 ? 'text-rose-600' : 'text-[#12B76A]'}`}>
            {metrics.invalidSessions}
          </strong>
        </div>
      </div>

      {/* Repair Confirmation Message */}
      {repairResult && (
        <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/30 text-[#12B76A] text-xs flex items-center justify-between font-medium animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#12B76A]" />
            <span>{repairResult.message}</span>
          </div>
          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#12B76A]/20 font-bold">
            Cleaned {repairResult.totalRepaired} item(s)
          </span>
        </div>
      )}
    </div>
  );
};
