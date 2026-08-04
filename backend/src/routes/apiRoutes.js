const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const sessionController = require('../controllers/sessionController');
const attendanceController = require('../controllers/attendanceController');
const studentController = require('../controllers/studentController');
const analyticsController = require('../controllers/analyticsController');
const violationController = require('../controllers/violationController');
const erpController = require('../controllers/erpController');
const facultyController = require('../controllers/facultyController');

// --- Auth Routes ---
router.post('/auth/admin/login', authController.adminLogin);
router.post('/auth/student/login', authController.studentLogin);
router.post('/auth/faculty/login', facultyController.facultyLogin);
router.post('/auth/faculty/change-password', facultyController.facultyChangePassword);
router.post('/auth/student/first-login-change-password', verifyToken, authController.firstTimePasswordChange);
router.post('/auth/change-password', verifyToken, authController.changePassword);
router.get('/auth/me', verifyToken, authController.getMe);
router.put('/auth/admin/profile', verifyToken, requireRole('admin'), authController.updateAdminProfile);
router.get('/student/profile', verifyToken, requireRole('student'), studentController.getStudentSelfProfile);
router.put('/student/profile', verifyToken, requireRole('student'), studentController.updateStudentSelfProfile);
router.put('/auth/student/profile', verifyToken, requireRole('student'), studentController.updateStudentSelfProfile);
router.post('/auth/student/register-device', verifyToken, requireRole('student'), authController.registerStudentDevice);

// --- Faculty Ecosystem Routes ---
router.get('/faculty/dashboard', facultyController.getFacultyDashboard);
router.get('/faculty/attendance-analytics', verifyToken, facultyController.getFacultyAttendanceAnalytics);
router.get('/faculty/session-students/:sessionId', verifyToken, facultyController.getSessionStudentRoster);
router.put('/faculty/attendance-records/:id', verifyToken, facultyController.updateFacultyAttendanceRecord);
router.delete('/faculty/attendance-records/:id', verifyToken, facultyController.deleteFacultyAttendanceRecord);
router.get('/faculty/students', facultyController.getFacultyStudents);
router.get('/faculty/risk-detection', facultyController.getStudentRiskDetection);
router.post('/faculty/remarks', facultyController.addFacultyRemark);
router.get('/faculty/remarks/:student_id', facultyController.getFacultyRemarks);
router.post('/faculty/documents', facultyController.uploadFacultyDocument);
router.get('/faculty/documents', facultyController.getFacultyDocuments);
router.post('/faculty/leave-requests', facultyController.submitLeaveRequest);
router.get('/faculty/leave-requests', facultyController.getFacultyLeaveRequests);
router.put('/faculty/profile/:id', facultyController.updateFacultyProfile);

// --- Admin Faculty Management Routes ---
router.get('/admin/faculty-management/stats', facultyController.adminGetFacultyManagementStats);
router.get('/admin/faculty-management/faculties', facultyController.adminGetFaculties);
router.get('/admin/faculty-management/faculties/:id', facultyController.adminGetFacultyDetails);
router.post('/admin/faculty-management/faculties', facultyController.adminCreateFaculty);
router.put('/admin/faculty-management/faculties/:id', facultyController.adminUpdateFaculty);
router.post('/admin/faculty-management/faculties/:id/reset-password', facultyController.adminResetFacultyPassword);
router.delete('/admin/faculty-management/faculties/:id', facultyController.adminDeleteFaculty);
router.get('/admin/faculty-management/activity-logs', facultyController.adminGetFacultyLoginActivity);
router.get('/admin/faculties-list', facultyController.adminGetFaculties);
router.post('/admin/faculties-create', facultyController.adminCreateFaculty);
router.delete('/admin/faculties-delete/:id', facultyController.adminDeleteFaculty);

// --- Class Details & Faculty Routes (AI&DS III-A) ---
router.get('/class-details', verifyToken, erpController.getClassDetails);
router.put('/class-details', verifyToken, requireRole('admin'), erpController.updateClassDetails);

router.get('/faculties', verifyToken, erpController.getFaculties);
router.post('/faculties', verifyToken, requireRole('admin'), erpController.createFaculty);
router.put('/faculties/:id', verifyToken, requireRole('admin'), erpController.updateFaculty);
router.delete('/faculties/:id', verifyToken, requireRole('admin'), erpController.deleteFaculty);

// --- Department ERP Routes ---
router.get('/departments', verifyToken, erpController.getDepartments);
router.post('/departments', verifyToken, requireRole('admin'), erpController.createDepartment);
router.put('/departments/:id', verifyToken, requireRole('admin'), erpController.updateDepartment);
router.delete('/departments/:id', verifyToken, requireRole('admin'), erpController.deleteDepartment);

// --- Class ERP Routes ---
router.get('/classes', verifyToken, erpController.getClasses);
router.post('/classes', verifyToken, requireRole('admin'), erpController.createClass);
router.put('/classes/:id', verifyToken, requireRole('admin'), erpController.updateClass);
router.delete('/classes/:id', verifyToken, requireRole('admin'), erpController.deleteClass);

// --- Section ERP Routes ---
router.get('/sections', verifyToken, erpController.getSections);
router.post('/sections', verifyToken, requireRole('admin'), erpController.createSection);
router.put('/sections/:id', verifyToken, requireRole('admin'), erpController.updateSection);
router.delete('/sections/:id', verifyToken, requireRole('admin'), erpController.deleteSection);

// --- Subject ERP Routes ---
router.get('/subjects', verifyToken, erpController.getSubjects);
router.post('/subjects', verifyToken, requireRole('admin'), erpController.createSubject);
router.put('/subjects/:id', verifyToken, requireRole('admin'), erpController.updateSubject);
router.put('/subjects/:id/archive', verifyToken, requireRole('admin'), erpController.toggleArchiveSubject);
router.delete('/subjects/:id', verifyToken, requireRole('admin'), erpController.deleteSubject);

// --- Timetable ERP Routes ---
router.get('/timetable/student', verifyToken, erpController.getStudentTimetable);
router.get('/timetable/faculty', verifyToken, erpController.getFacultyTimetable);
router.get('/timetable', verifyToken, erpController.getTimetables);
router.post('/timetable', verifyToken, requireRole('admin'), erpController.createTimetable);
router.put('/timetable/:id', verifyToken, requireRole('admin'), erpController.updateTimetable);
router.delete('/timetable/:id', verifyToken, requireRole('admin'), erpController.deleteTimetable);

// Plural Aliases for Timetable Routes
router.get('/timetables', verifyToken, erpController.getTimetables);
router.post('/timetables', verifyToken, requireRole('admin'), erpController.createTimetable);
router.put('/timetables/:id', verifyToken, requireRole('admin'), erpController.updateTimetable);
router.delete('/timetables/:id', verifyToken, requireRole('admin'), erpController.deleteTimetable);

// --- Session Routes (Timetable-Driven Auto-Attendance) ---
router.get('/sessions/current-slot', verifyToken, sessionController.getCurrentTimetableSlot);
router.get('/timetable/current-slot', verifyToken, sessionController.getCurrentTimetableSlot);
router.post('/sessions/auto-launch', verifyToken, requireRole('admin', 'faculty'), sessionController.autoLaunchSession);
router.post('/sessions', verifyToken, requireRole('admin', 'faculty'), sessionController.createSession);
router.get('/sessions', verifyToken, sessionController.getSessions);
router.get('/sessions/:id', verifyToken, sessionController.getSessionById);
router.get('/sessions/:id/qr', verifyToken, sessionController.getSessionQR);
router.put('/sessions/:id/end', verifyToken, requireRole('admin', 'faculty'), sessionController.endSession);
router.post('/sessions/:id/end', verifyToken, requireRole('admin', 'faculty'), sessionController.endSession);

// --- Attendance Routes ---
router.post('/attendance/mark', verifyToken, requireRole('student'), attendanceController.markAttendance);
router.get('/attendance/debug-log', verifyToken, requireRole('admin'), attendanceController.getDebugLog);
router.get('/attendance/my-history', verifyToken, requireRole('student'), attendanceController.getStudentHistory);
router.get('/attendance/records', verifyToken, requireRole('admin'), attendanceController.getAllAttendanceRecords);
router.post('/attendance/admin-mark', verifyToken, requireRole('admin'), attendanceController.adminMarkAttendance);
router.put('/attendance/records/:id', verifyToken, requireRole('admin'), attendanceController.updateAttendanceRecord);
router.delete('/attendance/records/:id', verifyToken, requireRole('admin'), attendanceController.deleteAttendanceRecord);

// --- Student Management Routes (Admin Only) ---
router.get('/students', verifyToken, requireRole('admin'), studentController.getStudents);
router.post('/students', verifyToken, requireRole('admin'), studentController.createStudent);
router.post('/students/bulk-delete', verifyToken, requireRole('admin'), studentController.bulkDeleteStudents);
router.post('/students/bulk-import', verifyToken, requireRole('admin'), studentController.bulkImportStudents);
router.post('/students/bulk-reset-passwords', verifyToken, requireRole('admin'), studentController.bulkResetStudentPasswords);
router.get('/students/login-activity', verifyToken, requireRole('admin'), studentController.getLoginActivity);
router.get('/students/password-audit-logs', verifyToken, requireRole('admin'), studentController.getPasswordAuditLogs);
router.get('/students/:id/profile-details', verifyToken, requireRole('admin'), studentController.getStudentProfileDetails);
router.put('/students/:id', verifyToken, requireRole('admin'), studentController.updateStudent);
router.delete('/students/:id', verifyToken, requireRole('admin'), studentController.deleteStudent);
router.post('/students/:id/reset-device', verifyToken, requireRole('admin'), studentController.resetStudentDevice);
router.post('/students/:id/reset-password', verifyToken, requireRole('admin'), studentController.resetStudentPassword);
router.post('/students/:id/force-password-change', verifyToken, requireRole('admin'), studentController.forceStudentPasswordChange);
router.put('/students/:id/status', verifyToken, requireRole('admin'), studentController.updateStudentAccountStatus);

// --- Analytics & Dashboard Routes ---
router.get('/analytics/dashboard', verifyToken, requireRole('admin'), analyticsController.getDashboardMetrics);
router.get('/analytics/reports', verifyToken, requireRole('admin'), analyticsController.getReportsData);
router.get('/analytics/period-intelligence', analyticsController.getPeriodAttendanceIntelligence);
router.get('/analytics/audit-integrity', verifyToken, requireRole('admin'), analyticsController.auditDataIntegrity);
router.post('/analytics/repair-integrity', verifyToken, requireRole('admin'), analyticsController.repairDataIntegrity);

// --- Violations & Security Logs ---
router.get('/violations', verifyToken, requireRole('admin'), violationController.getViolationLogs);
router.delete('/violations', verifyToken, requireRole('admin'), violationController.clearViolationLogs);

// --- Attendance Data Management & Backup System (Admin Only) ---
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const attendanceBackupController = require('../controllers/attendanceBackupController');

router.get('/admin/attendance-management/export', verifyToken, requireRole('admin'), attendanceBackupController.exportAttendance);
router.post('/admin/attendance-management/import', verifyToken, requireRole('admin'), uploadMemory.single('file'), attendanceBackupController.importAttendance);
router.post('/admin/attendance-management/backup', verifyToken, requireRole('admin'), attendanceBackupController.createFullBackup);
router.get('/admin/attendance-management/backups', verifyToken, requireRole('admin'), attendanceBackupController.getBackupsList);
router.get('/admin/attendance-management/backups/:id/download', verifyToken, requireRole('admin'), attendanceBackupController.downloadBackup);
router.post('/admin/attendance-management/backups/:id/restore', verifyToken, requireRole('admin'), attendanceBackupController.restoreBackup);
router.delete('/admin/attendance-management/backups/:id', verifyToken, requireRole('admin'), attendanceBackupController.deleteBackup);
router.post('/admin/attendance-management/reset-today', verifyToken, requireRole('admin'), attendanceBackupController.resetTodayAttendance);
router.post('/admin/attendance-management/reset-all', verifyToken, requireRole('admin'), attendanceBackupController.resetAllAttendance);
router.post('/admin/attendance-management/undo-reset', verifyToken, requireRole('admin'), attendanceBackupController.undoLastReset);

// --- Spell Attendance System Routes (Date-Wise Percentage & Management) ---
const spellAttendanceController = require('../controllers/spellAttendanceController');
const spellManagementController = require('../controllers/spellManagementController');

router.get('/analytics/spell-attendance', verifyToken, requireRole('admin', 'faculty'), spellAttendanceController.getSpellAttendanceReport);
router.get('/attendance/my-spell-attendance', verifyToken, requireRole('student'), spellAttendanceController.getStudentSpellAttendance);
router.get('/faculty/spell-attendance', verifyToken, requireRole('faculty', 'admin'), spellAttendanceController.getFacultySpellAttendance);

// Centralized Spell Date Management CRUD Routes
router.get('/admin/spells', verifyToken, spellManagementController.getSpells);
router.get('/admin/spells/active', verifyToken, spellManagementController.getActiveSpell);
router.post('/admin/spells', verifyToken, requireRole('admin'), spellManagementController.createSpell);
router.put('/admin/spells/:id', verifyToken, requireRole('admin'), spellManagementController.updateSpell);
router.post('/admin/spells/:id/activate', verifyToken, requireRole('admin'), spellManagementController.setActiveSpell);
router.post('/admin/spells/:id/duplicate', verifyToken, requireRole('admin'), spellManagementController.duplicateSpell);
router.delete('/admin/spells/:id', verifyToken, requireRole('admin'), spellManagementController.deleteSpell);

module.exports = router;



