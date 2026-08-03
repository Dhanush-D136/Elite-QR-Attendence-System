import api from './api';

export interface BackupItem {
  backup_id: string;
  backup_name: string;
  created_at: string;
  total_records: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  added: number;
  updated: number;
  skipped: number;
}

export const attendanceBackupService = {
  // Download Attendance Export File (.xlsx, .csv, .json)
  exportAttendance: async (format: 'xlsx' | 'csv' | 'json') => {
    const response = await api.get(`/admin/attendance-management/export?format=${format}`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], {
      type: format === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : format === 'csv' 
        ? 'text/csv' 
        : 'application/json'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_backup.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Upload and Import Attendance Backup File
  importAttendance: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/admin/attendance-management/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Create Manual Full Backup Snapshot
  createFullBackup: async () => {
    const response = await api.post('/admin/attendance-management/backup');
    return response.data;
  },

  // Fetch Backups History
  getBackupsList: async (): Promise<BackupItem[]> => {
    const response = await api.get('/admin/attendance-management/backups');
    return response.data.backups || [];
  },

  // Download Historical Backup JSON File
  downloadBackup: async (backupId: string, backupName: string) => {
    const response = await api.get(`/admin/attendance-management/backups/${backupId}/download`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${backupName || 'attendance_backup'}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Restore Attendance Backup by ID
  restoreBackup: async (backupId: string) => {
    const response = await api.post(`/admin/attendance-management/backups/${backupId}/restore`);
    return response.data;
  },

  // Delete Backup by ID
  deleteBackup: async (backupId: string) => {
    const response = await api.delete(`/admin/attendance-management/backups/${backupId}`);
    return response.data;
  },

  // Reset Today's Attendance
  resetTodayAttendance: async () => {
    const response = await api.post('/admin/attendance-management/reset-today');
    return response.data;
  },

  // Reset All Attendance (Double Confirmation)
  resetAllAttendance: async (step1: string, step2: string) => {
    const response = await api.post('/admin/attendance-management/reset-all', {
      confirmation_step1: step1,
      confirmation_step2: step2
    });
    return response.data;
  },

  // Undo Last Reset
  undoLastReset: async () => {
    const response = await api.post('/admin/attendance-management/undo-reset');
    return response.data;
  }
};
