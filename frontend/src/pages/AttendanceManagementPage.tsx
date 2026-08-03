import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  HardDrive,
  ShieldCheck,
  Zap,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { attendanceBackupService, BackupItem, ImportResult } from '../services/attendanceBackupService';
import { getSocket } from '../services/socket';

export const AttendanceManagementPage: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [showResetAllModal, setShowResetAllModal] = useState<boolean>(false);
  const [resetStep1Input, setResetStep1Input] = useState<string>('');
  const [resetStep2Input, setResetStep2Input] = useState<string>('');

  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Backups History
  const fetchBackups = async () => {
    try {
      setIsLoading(true);
      const list = await attendanceBackupService.getBackupsList();
      setBackups(list);
    } catch (err: any) {
      console.error('Failed to load backup history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();

    // Listen to real-time socket updates for automatic synchronization
    const socket = getSocket();
    const handleRealtimeUpdate = () => {
      fetchBackups();
    };

    socket.on('attendance_updated', handleRealtimeUpdate);
    socket.on('attendance_reset', handleRealtimeUpdate);

    return () => {
      socket.off('attendance_updated', handleRealtimeUpdate);
      socket.off('attendance_reset', handleRealtimeUpdate);
    };
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Export handlers
  const handleExport = async (format: 'xlsx' | 'csv' | 'json') => {
    try {
      setActionLoading(`export_${format}`);
      await attendanceBackupService.exportAttendance(format);
      showToast('success', `Attendance exported successfully as ${format.toUpperCase()}`);
    } catch (err: any) {
      showToast('error', `Export failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Create Manual Backup
  const handleCreateBackup = async () => {
    try {
      setActionLoading('create_backup');
      const res = await attendanceBackupService.createFullBackup();
      showToast('success', res.message || 'Attendance backup created successfully');
      fetchBackups();
    } catch (err: any) {
      showToast('error', `Backup creation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Import Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      setActionLoading('import');
      setImportResult(null);
      const result = await attendanceBackupService.importAttendance(importFile);
      setImportResult(result);
      showToast('success', `Import complete! Added: ${result.added}, Updated: ${result.updated}, Skipped: ${result.skipped}`);
      fetchBackups();
    } catch (err: any) {
      showToast('error', `Import failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Reset Today's Attendance
  const handleResetToday = async () => {
    if (!window.confirm("Are you sure you want to reset ONLY Today's attendance records? An automatic backup will be created before resetting.")) {
      return;
    }

    try {
      setActionLoading('reset_today');
      const res = await attendanceBackupService.resetTodayAttendance();
      showToast('success', res.message || "Today's attendance reset successfully");
      fetchBackups();
    } catch (err: any) {
      showToast('error', `Reset Today failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Reset All Attendance (Double Confirmation Submit)
  const handleResetAllSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetStep1Input !== 'RESET ATTENDANCE' || resetStep2Input !== 'DELETE ALL ATTENDANCE') {
      showToast('error', 'Please type the exact confirmation phrases required for Step 1 and Step 2.');
      return;
    }

    try {
      setActionLoading('reset_all');
      const res = await attendanceBackupService.resetAllAttendance(resetStep1Input, resetStep2Input);
      showToast('success', res.message || 'Entire attendance database reset successfully');
      setShowResetAllModal(false);
      setResetStep1Input('');
      setResetStep2Input('');
      fetchBackups();
    } catch (err: any) {
      showToast('error', `Reset All failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Undo Last Reset
  const handleUndoReset = async () => {
    if (!window.confirm("Are you sure you want to undo the last reset? This will restore attendance from the auto-saved pre-reset snapshot.")) {
      return;
    }

    try {
      setActionLoading('undo_reset');
      const res = await attendanceBackupService.undoLastReset();
      showToast('success', res.message || 'Last reset undone successfully');
      fetchBackups();
    } catch (err: any) {
      showToast('error', `Undo Reset failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Restore specific backup
  const handleRestoreBackup = async (backup: BackupItem) => {
    try {
      setActionLoading(`restore_${backup.backup_id}`);
      const res = await attendanceBackupService.restoreBackup(backup.backup_id);
      showToast('success', res.message || `Restored successfully from ${backup.backup_name}`);
      setShowRestoreModal(false);
      setSelectedBackupForRestore(null);
      fetchBackups();
    } catch (err: any) {
      showToast('error', `Restore failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Download backup
  const handleDownloadBackup = async (backup: BackupItem) => {
    try {
      setActionLoading(`download_${backup.backup_id}`);
      await attendanceBackupService.downloadBackup(backup.backup_id, backup.backup_name);
      showToast('success', `Downloaded backup file: ${backup.backup_name}.json`);
    } catch (err: any) {
      showToast('error', `Download failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete backup
  const handleDeleteBackup = async (backupId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this backup snapshot from Supabase history?")) {
      return;
    }

    try {
      setActionLoading(`delete_${backupId}`);
      await attendanceBackupService.deleteBackup(backupId);
      showToast('success', 'Backup removed from history');
      fetchBackups();
    } catch (err: any) {
      showToast('error', `Delete failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const totalBackupsCount = backups.length;
  const latestBackupDate = backups.length > 0 ? new Date(backups[0].created_at).toLocaleString() : 'No backups created yet';

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification Banner */}
      {statusMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-enterprise backdrop-blur-md transition-all duration-300 ${
            statusMessage.type === 'success'
              ? 'bg-[#ECFDF5] border-[#10B981]/30 text-[#065F46]'
              : 'bg-[#FEF2F2] border-[#EF4444]/30 text-[#991B1B]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
          )}
          <p className="text-xs font-semibold">{statusMessage.text}</p>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-extrabold text-[#111827]">Attendance Data Management Center</h1>
              <p className="text-xs text-[#6B7280]">
                Export, Import, Backup, Restore, and Reset attendance database with real-time portal synchronization.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBackups}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#374151] hover:bg-[#F3F4F6] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          <button
            onClick={handleCreateBackup}
            disabled={actionLoading === 'create_backup'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D5DFC] text-white text-xs font-bold shadow-md hover:bg-[#5C4CE3] transition-all disabled:opacity-50"
          >
            {actionLoading === 'create_backup' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
            Take Full Backup
          </button>
        </div>
      </div>

      {/* Analytics Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[20px] border border-[#E7E7E7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Backups</span>
            <h3 className="text-2xl font-extrabold text-[#111827] mt-1">{totalBackupsCount} Snapshots</h3>
            <p className="text-[11px] text-[#10B981] font-semibold mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Persisted in Supabase
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] text-[#166534] flex items-center justify-between p-3 border border-[#DCFCE7]">
            <HardDrive className="w-6 h-6 text-[#15803D]" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[20px] border border-[#E7E7E7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Last Snapshot Date</span>
            <h3 className="text-sm font-extrabold text-[#111827] mt-1">{latestBackupDate}</h3>
            <p className="text-[11px] text-[#6366F1] font-semibold mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Automated Pre-Reset Sync Active
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#4338CA] flex items-center justify-between p-3 border border-[#E0E7FF]">
            <Clock className="w-6 h-6 text-[#4F46E5]" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[20px] border border-[#E7E7E7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Data Protection Status</span>
            <h3 className="text-lg font-extrabold text-[#111827] mt-1">Undo Reset Ready</h3>
            <p className="text-[11px] text-[#D97706] font-semibold mt-0.5 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Users & Timetables Protected
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] text-[#B45309] flex items-center justify-between p-3 border border-[#FEF3C7]">
            <ShieldCheck className="w-6 h-6 text-[#D97706]" />
          </div>
        </div>
      </div>

      {/* Main Action Control Panel */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#6D5DFC]" />
            Attendance Management Control Actions
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Select an operation below. Exports provide full data tables. Resets automatically take a Supabase backup first.
          </p>
        </div>

        {/* Action Button Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Export Excel */}
          <button
            onClick={() => handleExport('xlsx')}
            disabled={actionLoading === 'export_xlsx'}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#E7E7E7] bg-[#FAFAFA] hover:bg-[#F3F0FF] hover:border-[#6D5DFC]/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0 border border-[#10B981]/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#111827] group-hover:text-[#6D5DFC] flex items-center justify-between">
                <span>Export (Excel)</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#6D5DFC]" />
              </div>
              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">Download attendance_backup.xlsx</p>
            </div>
          </button>

          {/* Export CSV */}
          <button
            onClick={() => handleExport('csv')}
            disabled={actionLoading === 'export_csv'}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#E7E7E7] bg-[#FAFAFA] hover:bg-[#F3F0FF] hover:border-[#6D5DFC]/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0 border border-[#3B82F6]/20">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#111827] group-hover:text-[#6D5DFC] flex items-center justify-between">
                <span>Export (CSV)</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#6D5DFC]" />
              </div>
              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">Download attendance_backup.csv</p>
            </div>
          </button>

          {/* Export JSON */}
          <button
            onClick={() => handleExport('json')}
            disabled={actionLoading === 'export_json'}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#E7E7E7] bg-[#FAFAFA] hover:bg-[#F3F0FF] hover:border-[#6D5DFC]/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center shrink-0 border border-[#8B5CF6]/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#111827] group-hover:text-[#6D5DFC] flex items-center justify-between">
                <span>Export Backup (JSON)</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#6D5DFC]" />
              </div>
              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">Download attendance_backup.json</p>
            </div>
          </button>

          {/* Import Backup */}
          <button
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#6D5DFC]/30 bg-[#F3F0FF]/50 hover:bg-[#F3F0FF] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6D5DFC] text-white flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#6D5DFC] flex items-center justify-between">
                <span>Import Backup</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#6D5DFC]" />
              </div>
              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">Upload .xlsx, .csv, .json</p>
            </div>
          </button>

          {/* Restore Backup */}
          <button
            onClick={() => {
              if (backups.length === 0) {
                showToast('error', 'No backup snapshots available in history to restore.');
                return;
              }
              setSelectedBackupForRestore(backups[0]);
              setShowRestoreModal(true);
            }}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#E7E7E7] bg-[#FAFAFA] hover:bg-[#F0FDF4] hover:border-[#10B981]/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0 border border-[#10B981]/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#111827] group-hover:text-[#15803D] flex items-center justify-between">
                <span>Restore Backup</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#15803D]" />
              </div>
              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">Restore records & sessions</p>
            </div>
          </button>

          {/* Reset Today's Attendance */}
          <button
            onClick={handleResetToday}
            disabled={actionLoading === 'reset_today'}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#FEF3C7] bg-[#FFFBEB] hover:bg-[#FEF3C7] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0">
              <RefreshCw className={`w-5 h-5 ${actionLoading === 'reset_today' ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#B45309] flex items-center justify-between">
                <span>Reset Today's Attendance</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#D97706]" />
              </div>
              <p className="text-[11px] text-[#B45309]/80 truncate mt-0.5">Delete only today's records</p>
            </div>
          </button>

          {/* Undo Last Reset */}
          <button
            onClick={handleUndoReset}
            disabled={actionLoading === 'undo_reset'}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#E0E7FF] bg-[#EEF2FF] hover:bg-[#E0E7FF] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shrink-0">
              <RotateCcw className={`w-5 h-5 ${actionLoading === 'undo_reset' ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#3730A3] flex items-center justify-between">
                <span>Undo Last Reset</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#4338CA]" />
              </div>
              <p className="text-[11px] text-[#3730A3]/80 truncate mt-0.5">Revert to auto-saved snapshot</p>
            </div>
          </button>

          {/* Reset All Attendance */}
          <button
            onClick={() => {
              setResetStep1Input('');
              setResetStep2Input('');
              setShowResetAllModal(true);
            }}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#FEE2E2] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EF4444] text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#991B1B] flex items-center justify-between">
                <span>Reset All Attendance</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#DC2626]" />
              </div>
              <p className="text-[11px] text-[#991B1B]/80 truncate mt-0.5">Double Confirmation Required</p>
            </div>
          </button>
        </div>
      </div>

      {/* Attendance Backup History Table */}
      <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E7E7E7] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#111827]">Attendance Backup History</h2>
            <p className="text-xs text-[#6B7280]">
              All backups are permanently stored in Supabase. Admin can download, restore, or delete backups.
            </p>
          </div>
          <span className="text-xs font-extrabold text-[#6D5DFC] px-3 py-1.5 rounded-xl bg-[#F3F0FF] border border-[#6D5DFC]/20 self-start md:self-auto">
            {backups.length} Backups Recorded
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#6B7280] space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6D5DFC]" />
            <p className="text-xs font-semibold">Loading backup history from Supabase...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-[#6B7280] space-y-3">
            <Database className="w-12 h-12 mx-auto text-[#D1D5DB]" />
            <h3 className="text-sm font-bold text-[#374151]">No Attendance Backups Found</h3>
            <p className="text-xs max-w-sm mx-auto text-[#9CA3AF]">
              Click "Take Full Backup" above to generate your first complete attendance database snapshot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#374151]">
              <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] uppercase font-bold text-[10px] text-[#6B7280] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Backup Name</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Records Count</th>
                  <th className="px-6 py-4 text-center">Download</th>
                  <th className="px-6 py-4 text-center">Restore</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {backups.map((item) => (
                  <tr key={item.backup_id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#111827]">
                      <div className="flex items-center gap-2.5">
                        <HardDrive className="w-4 h-4 text-[#6D5DFC]" />
                        <span>{item.backup_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#6B7280]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#111827]">
                      <span className="px-2.5 py-1 rounded-lg bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                        {item.total_records} Records
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDownloadBackup(item)}
                        disabled={actionLoading === `download_${item.backup_id}`}
                        className="p-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] font-medium transition-all"
                        title="Download JSON Backup File"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedBackupForRestore(item);
                          setShowRestoreModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] font-bold text-[11px] border border-[#10B981]/30 transition-all flex items-center gap-1.5 mx-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteBackup(item.backup_id)}
                        disabled={actionLoading === `delete_${item.backup_id}`}
                        className="p-2 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-medium transition-all"
                        title="Delete Backup Snapshot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white max-w-lg w-full rounded-[24px] border border-[#E7E7E7] shadow-2xl p-6 space-y-5 relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-5 right-5 text-[#9CA3AF] hover:text-[#111827]"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#111827]">Import Attendance Backup</h3>
                <p className="text-xs text-[#6B7280]">Supports .xlsx, .csv, and .json backup files</p>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-[#D1D5DB] hover:border-[#6D5DFC] rounded-2xl p-6 text-center space-y-2 bg-[#FAFAFA] transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,.json,.xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0]);
                      setImportResult(null);
                    }
                  }}
                  className="hidden"
                />

                <Upload className="w-8 h-8 mx-auto text-[#9CA3AF]" />
                <p className="text-xs font-bold text-[#374151]">
                  {importFile ? importFile.name : 'Click to select or drag & drop attendance backup file'}
                </p>
                <p className="text-[10px] text-[#9CA3AF]">Validates student existence, subject, and session before import</p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] text-xs font-bold hover:bg-[#EBE5FF] transition-all"
                >
                  {importFile ? 'Change File' : 'Browse Files'}
                </button>
              </div>

              {importResult && (
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#166534]">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                    <span>Imported Successfully</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-xl bg-white border border-[#DCFCE7]">
                      <span className="text-[10px] text-[#6B7280] block uppercase font-bold">Records Added</span>
                      <span className="text-base font-extrabold text-[#16A34A]">{importResult.added}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-[#DCFCE7]">
                      <span className="text-[10px] text-[#6B7280] block uppercase font-bold">Records Updated</span>
                      <span className="text-base font-extrabold text-[#2563EB]">{importResult.updated}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-[#DCFCE7]">
                      <span className="text-[10px] text-[#6B7280] block uppercase font-bold">Skipped</span>
                      <span className="text-base font-extrabold text-[#D97706]">{importResult.skipped}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E7E7E7] text-xs font-bold text-[#374151] hover:bg-[#FAFAFA]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!importFile || actionLoading === 'import'}
                  className="px-5 py-2.5 rounded-xl bg-[#6D5DFC] text-white text-xs font-bold hover:bg-[#5C4CE3] disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {actionLoading === 'import' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Execute Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTORE MODAL */}
      {showRestoreModal && selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white max-w-md w-full rounded-[24px] border border-[#E7E7E7] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#ECFDF5] text-[#059669]">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#111827]">Restore Attendance Backup</h3>
                <p className="text-xs text-[#6B7280]">Revert database state to selected snapshot</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1.5 text-xs text-[#374151]">
              <p><strong>Backup Name:</strong> {selectedBackupForRestore.backup_name}</p>
              <p><strong>Created Date:</strong> {new Date(selectedBackupForRestore.created_at).toLocaleString()}</p>
              <p><strong>Total Records:</strong> {selectedBackupForRestore.total_records}</p>
            </div>

            <p className="text-xs text-[#6B7280]">
              Restoring will insert and update attendance records and session linkages exactly as recorded in this snapshot.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E7E7E7] text-xs font-bold text-[#374151] hover:bg-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestoreBackup(selectedBackupForRestore)}
                disabled={actionLoading?.startsWith('restore_')}
                className="px-5 py-2.5 rounded-xl bg-[#059669] text-white text-xs font-bold hover:bg-[#047857] flex items-center gap-2 shadow-md"
              >
                {actionLoading?.startsWith('restore_') ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION RESET ALL MODAL */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white max-w-lg w-full rounded-[24px] border border-[#FEE2E2] shadow-2xl p-6 space-y-5 relative">
            <button
              onClick={() => setShowResetAllModal(false)}
              className="absolute top-5 right-5 text-[#9CA3AF] hover:text-[#111827]"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#FEF2F2] text-[#EF4444]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#991B1B]">⚠ WARNING: RESET ALL ATTENDANCE</h3>
                <p className="text-xs text-[#DC2626]">Permanent database deletion safety lock</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs text-[#991B1B] space-y-1">
              <p className="font-bold">This operation will remove ALL attendance records.</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Student accounts will remain intact</li>
                <li>Faculty accounts will remain intact</li>
                <li>Subjects will remain intact</li>
                <li>Timetables will remain intact</li>
                <li>An automated Supabase backup snapshot will be saved prior to deletion</li>
              </ul>
            </div>

            <form onSubmit={handleResetAllSubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-1">
                    Step 1: Type <span className="text-[#DC2626] select-all font-mono">RESET ATTENDANCE</span>
                  </label>
                  <input
                    type="text"
                    value={resetStep1Input}
                    onChange={(e) => setResetStep1Input(e.target.value)}
                    placeholder="Type RESET ATTENDANCE"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#E7E7E7] focus:outline-none focus:border-[#EF4444] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#374151] mb-1">
                    Step 2: Type <span className="text-[#DC2626] select-all font-mono">DELETE ALL ATTENDANCE</span>
                  </label>
                  <input
                    type="text"
                    value={resetStep2Input}
                    onChange={(e) => setResetStep2Input(e.target.value)}
                    placeholder="Type DELETE ALL ATTENDANCE"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#E7E7E7] focus:outline-none focus:border-[#EF4444] font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetAllModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E7E7E7] text-xs font-bold text-[#374151] hover:bg-[#FAFAFA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    resetStep1Input !== 'RESET ATTENDANCE' ||
                    resetStep2Input !== 'DELETE ALL ATTENDANCE' ||
                    actionLoading === 'reset_all'
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#EF4444] text-white text-xs font-bold hover:bg-[#DC2626] disabled:opacity-40 flex items-center gap-2 shadow-md"
                >
                  {actionLoading === 'reset_all' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Execute Full Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagementPage;
