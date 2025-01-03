import express from "express";
import { adminRegister, adminLogin, adminLogout, verifyEmail, forgotPassword, resetPassword, checkAuth, viewTenants, findTenants, addTenant, addTenantView, checkTenantAuth, tenantLogin, tenantLogout, deleteTenant, viewAdmins, viewUnits, addUnitView, addUnit, deleteUnit, getOccupiedUnits, editTenant, updateTenant, addEvent, viewEvents, editEvent, deleteEvent, getEvents, updateEvent, viewNotices, pinnedNotices, permanentNotices, addNotice, togglePinned, togglePermanent, deleteNotice, getAvailableRooms, getNotices, searchTenants, searchRooms, deleteAdmin, updateAdminPassword, updateTenantPassword, addFeedback, addUtility, viewUtilities, deleteUtility, editUtility, updateUtility, utilityHistories, viewActivities, addRequest, cancelRequest, updateRequestStatus } from "../controllers/auth.controllers.js";
import { verifyTenantToken, verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// admins
router.get("/check-auth", verifyToken, checkAuth);
router.post("/adminRegister", adminRegister);
router.post("/adminLogin", adminLogin);
router.post("/adminLogout", verifyToken, adminLogout);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/view-units", viewUnits);
router.get("/addUnitView", addUnitView);
router.post("/addUnit", addUnit);
router.delete("/deleteUnit/:room_id", verifyToken, deleteUnit);
router.delete("/delete/utility/:utility_id", verifyToken, deleteUtility);
router.get("/occupied-units", getOccupiedUnits);
router.post("/add/event", addEvent);
router.post("/add/request", verifyTenantToken, addRequest);
router.patch('/requests/:requestId/cancel', verifyTenantToken, cancelRequest);
router.post('/requests/:requestId/decision', verifyToken, updateRequestStatus);
router.get("/view/events", viewEvents);
router.get("/view/utilities", verifyToken, viewUtilities);
router.post("/edit/event", editEvent);
router.delete("/delete/event/:eventId", verifyToken, deleteEvent);
router.get("/get/events", getEvents);
router.get("/get/notices", getNotices);
router.post("/update/event/:eventId", verifyToken, updateEvent);
router.get("/view/notices", viewNotices);
router.get("/view/notices/pinned", pinnedNotices);
router.get("/view/notices/permanent", permanentNotices);
router.post("/view/notices/add", addNotice);
router.patch("/view/notices/:noticeId/toggle_pinned", togglePinned);
router.patch("/view/notices/:noticeId/toggle_permanent", togglePermanent);
router.delete("/view/notices/:noticeId/delete", verifyToken, deleteNotice);
router.get("/getAvailableRooms", getAvailableRooms);
router.get("/search", searchTenants);
router.get("/searchRooms", searchRooms);
router.get("/searchTenants", findTenants);
router.delete("/deleteAdmin/:admin_id", deleteAdmin);
router.post("/update-password", verifyToken, updateAdminPassword);
router.post("/submit-feedback", verifyToken, addFeedback);
router.post("/add/utility", verifyToken, addUtility);
router.get("/editUtility/:utility_id", editUtility);
router.post("/editUtility/:utility_id", verifyToken, updateUtility);
router.get("/utilityHistory", utilityHistories);
router.get("/activity-log/:adminId", verifyToken, viewActivities);

// tenants
router.get("/view-tenants", viewTenants);
router.post("/addTenant", addTenant);
router.get("/addTenantView", addTenantView);
router.get('/tenant/checkAuth', verifyTenantToken, checkTenantAuth);
router.post("/tenantLogin", tenantLogin);
router.post("/tenantLogout", verifyTenantToken, tenantLogout);
router.get("/editTenant/:tenant_id", editTenant);
router.post("/editTenant/:tenant_id", verifyToken, updateTenant);
router.delete("/deleteTenant/:tenant_id", verifyToken, deleteTenant);
router.get("/view-admins", viewAdmins);
router.post("/update-tenant-password", verifyTenantToken, updateTenantPassword);

export default router;