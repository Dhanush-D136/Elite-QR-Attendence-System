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

// --- Auth Routes ---
router.post('/auth/admin/login', authController.adminLogin);
router.post('/auth/student/login', authController.studentLogin);
router.post('/auth/student/first-login-change-password', verifyToken, authController.firstTimePasswordChange);
router.post('/auth/change-password', verifyToken, authController.changePassword);
router.get('/auth/me', verifyToken, authController.getMe);
router.put('/auth/admin/profile', verifyToken, requireRole('admin'), authController.updateAdminProfile);
router.put('/auth/student/profile', verifyToken, requireRole('student'), authController.updateStudentProfile);
router.post('/auth/student/register-device', verifyToken, requireRole('student'), authController.registerStudentDevice);

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
router.get('/timetables', verifyToken, erpController.getTimetables);
router.post('/timetables', verifyToken, requireRole('admin'), erpController.createTimetable);
router.put('/timetables/:id', verifyToken, requireRole('admin'), erpController.updateTimetable);
router.delete('/timetables/:id', verifyToken, requireRole('admin'), erpController.deleteTimetable);

// --- Session Routes (Timetable-Driven Auto-Attendance) ---
router.get('/sessions/current-slot', verifyToken, sessionController.getCurrentTimetableSlot);
router.post('/sessions/auto-launch', verifyToken, requireRole('admin'), sessionController.autoLaunchSession);
router.post('/sessions', verifyToken, requireRole('admin'), sessionController.createSession);
router.get('/sessions', verifyToken, sessionController.getSessions);
router.get('/sessions/:id', verifyToken, sessionController.getSessionById);
router.get('/sessions/:id/qr', verifyToken, sessionController.getSessionQR);
router.put('/sessions/:id/end', verifyToken, requireRole('admin'), sessionController.endSession);
router.post('/sessions/:id/end', verifyToken, requireRole('admin'), sessionController.endSession);

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
router.get('/students/login-activity', verifyToken, requireRole('admin'), studentController.getLoginActivity);
router.get('/students/password-audit-logs', verifyToken, requireRole('admin'), studentController.getPasswordAuditLogs);
router.get('/students/:id/profile-details', verifyToken, requireRole('admin'), studentController.getStudentProfileDetails);
router.put('/students/:id', verifyToken, requireRole('admin'), studentController.updateStudent);
router.delete('/students/:id', verifyToken, requireRole('admin'), studentController.deleteStudent);
router.post('/students/:id/reset-device', verifyToken, requireRole('admin'), studentController.resetStudentDevice);
router.post('/students/:id/reset-password', verifyToken, requireRole('admin'), studentController.resetStudentPassword);

// --- Analytics & Dashboard Routes ---
router.get('/analytics/dashboard', verifyToken, requireRole('admin'), analyticsController.getDashboardMetrics);
router.get('/analytics/reports', verifyToken, requireRole('admin'), analyticsController.getReportsData);
router.get('/analytics/audit-integrity', verifyToken, requireRole('admin'), analyticsController.auditDataIntegrity);
router.post('/analytics/repair-integrity', verifyToken, requireRole('admin'), analyticsController.repairDataIntegrity);

// --- Violations & Security Logs ---
router.get('/violations', verifyToken, requireRole('admin'), violationController.getViolationLogs);
router.delete('/violations', verifyToken, requireRole('admin'), violationController.clearViolationLogs);

module.exports = router;
