import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url"; 
import { dirname } from "path";
import { connectDB } from "./db/connectDB.js";
import authRoutes from "./routes/auth.js";
import exphbs from "express-handlebars";
import path from "path";
import session from "express-session"; 
import fileUpload from "express-fileupload";
import fs from 'fs';
import moment from 'moment';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import './nodecron/cronjobs.js'
import Admin from "./models/admin.models.js";
import Room from "./models/room.models.js";
import Tenant from "./models/tenant.models.js";
import Notice from "./models/notice.models.js";
import Feedback from "./models/feedback.models.js";
import Utility from "./models/utility.models.js";
import { verifyTenantToken, verifyToken } from "./middleware/verifyToken.js";
import { addTenant, addTenantView, addUnitView, editTenant, getAvailableRooms, getEvents, getNotices, getOccupiedUnits, getTotalUnits, logActivity, updateAdminPassword, updateEvent, updateTenant, updateUtility, utilityHistories, viewActivities, viewAdmins, viewApprovedRequests, viewEvents, viewFixes, viewFixesAdmin, viewNotices, viewOvernightRequests, viewPendingFixes, viewRegularRequests, viewRequests, viewRequestsAdmin, viewTenants, viewUnits, viewUtilities } from './controllers/auth.controllers.js';
import { createPool } from "mysql2";

// Sets up `__filename` and `__dirname` in an ES module environment using Node.js.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Loads environment variables from a .env file into process.env.
dotenv.config();

// Initializes an Express app and sets the server port to an environment variable or default (5000).
const app = express();
const PORT = process.env.PORT || 5000;

// Configures middleware for parsing JSON, URL-encoded data, cookies, and handling Cross-Origin Resource Sharing (CORS).
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5000",
    credentials: true
}));

// Sets up session management with a secret, disabling resave, and configuring cookies based on the environment.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' } 
}));

// Configures Handlebars as the view engine with custom helpers for logic, arrays, and conditionals.
app.engine("hbs", exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main", 
    layoutsDir: path.join(__dirname, "../client/views/layouts"), 
    helpers: {
        set: function(variable, value) {
            this[variable] = value;
            return '';
        },
        array: function(...args) {
            return args;
        },
        eq: (a, b) => a === b, 
        ifCond: function(v1, operator, v2, options) {
            switch (operator) {
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!==':
                    return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        },
        json: function(context) {
            return JSON.stringify(context);
        },
        isArrayEmpty: function(arr) {
            return arr && arr.length === 0;
        },
        formatDate: function (date) {
            if (date) {
                return moment(date).format('MM/DD/YYYY'); 
            }
            return '---';
        }
    }
}));

// Sets up Handlebars as the view engine, defines the views directory, serves static files
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "../client/views")); 
console.log("Views Directory: ", path.join(__dirname, "../client/views"));
app.use(express.static(path.join(__dirname, "../client/public"))); 

// configures authentication routes, and enables file uploads.
app.use("/api/auth", authRoutes);
app.use(fileUpload());

// HOME ROUTE ---------------------------------------------------------------------------------------
app.get("/", (req, res) => {
    res.render("introduction", { title: "Hive", styles: ["introduction"] });
});

app.get("/home", (req, res) => {
    res.render("home", { title: "Hive", styles: ["home"] });
});

// ADMIN AUTHENTICATION ROUTES -----------------------------------------------------------------------
app.get("/admin/login", (req, res) => {
    res.render("adminLogin", { title: "Hive", styles: ["adminLogin"] });
});

app.get("/admin/register", (req, res) => {
    res.render("adminRegister", { title: "Hive", styles: ["adminRegister"] });
});

app.get("/admin/register/verifyEmail", (req, res) => {
    res.render("verifyEmail", { title: "Hive", styles: ["verifyEmail"] })
});

// TENANT AUTHENTICATION ROUTES -----------------------------------------------------------------------
app.get("/tenant/login", (req, res) => {
    res.render("tenantLogin", { title: "Hive", styles: ["tenantLogin"] });
});

// ADMIN FORGOT PASSWORD ------------------------------------------------------------------------------
app.get("/forgot-password", async (req, res) => {
    res.render("forgotPassword", { title: "Hive", styles: ["forgotPassword"] });
})

app.get("/reset-password", async (req, res) => {

    const { adminEmail } = req.query;  
    res.render("resetPassword", {
        title: "Hive",
        styles: ["resetPassword"],
        adminEmail,  
    });
});

app.get("/reset-password/:resetToken", async(req, res) => {

    const { resetToken } = req.params;

    res.render("changePassword", {
        title: "Hive",
        styles: ["changePassword"],
        token: resetToken,
    })
})

// TENANT FORGOT PASSWORD ------------------------------------------------------------------------------
app.get("/tenant/forgot-password", async (req, res) => {
    res.render("forgotTenantPassword", { title: "Hive", styles: ["forgotTenantPassword"] });
})

app.get("/tenant/reset-password", async (req, res) => {

    const { tenantEmail } = req.query;  
    res.render("resetTenantPassword", {
        title: "Hive",
        styles: ["resetTenantPassword"],
        tenantEmail,  
    });
});

app.get("/tenant/reset-password/:resetToken", async(req, res) => {

    const { resetToken } = req.params;

    res.render("changeTenantPassword", {
        title: "Hive",
        styles: ["changeTenantPassword"],
        token: resetToken,
    })
})

// ADMIN PAGES (DASHBOARD) ----------------------------------------------------------------------------
app.get("/admin/dashboard", verifyToken, async (req, res) => {
    try {
        const admin = await viewAdmins(req, res);
        const establishmentId = req.establishmentId;
        const tenantsData = await viewTenants(req);
        const totalTenants = tenantsData.tenants.length;  

        const events = await getEvents(req, res);
        const notices = await getNotices(req, res); 
        const unitsData = await viewUnits(req, res);
        const occupiedUnits = unitsData.success ? await getOccupiedUnits(req, res) : [];

        const totalUnits = await getTotalUnits(req, res);

        const utilities = await viewUtilities(req);

        const paidCount = utilities.filter(utility => utility.status === 'paid').length;
        const pendingCount = utilities.filter(utility => utility.status !== 'paid').length;

        const totalCount = paidCount + pendingCount;

        const fixes = await viewPendingFixes(req); 
        const totalFixes = fixes.length; 

        const adminId = admin ? admin.admin_id : null;

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const currentMonthUtilities = utilities.filter(utility => {
            const statementDate = new Date(utility.statementDate);
            const dueDate = new Date(utility.dueDate);

            return (
                (statementDate.getMonth() === currentMonth && statementDate.getFullYear() === currentYear) ||
                (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear)
            );
        });

        const displayUtilities = currentMonthUtilities.length > 0 ? currentMonthUtilities : utilities;

        const formattedUtilities = displayUtilities.map(utility => ({
            roomNumber: utility.roomNumber || "N/A",
            roomType: utility.roomType || "N/A",
            sharedBalance: utility.sharedBalance ? parseFloat(utility.sharedBalance).toFixed(2) : "0.00",
            totalBalance: utility.totalBalance ? parseFloat(utility.totalBalance).toFixed(2) : "0.00",
            room_id: utility.room_id,
            utility_id: utility.utility_id,
        }));

        console.log("Dashboard Utilities:", formattedUtilities);

        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                tenants: tenantsData.tenants || [],
                establishmentId: establishmentId,
                utilities: utilities,
                noUtilities: utilities.length === 0,
                totalFixes: totalFixes,  
            });
        }

        res.render("adminDashboard", {
            title: "Hive",
            styles: ["adminDashboard"],
            admin: admin || {},
            tenants: tenantsData.tenants || [],
            events: events || [],
            notices: notices || [], 
            establishmentId: establishmentId,
            occupiedUnits: occupiedUnits,
            utilities: formattedUtilities || [],
            paidCount: paidCount,
            pendingCount: pendingCount,
            totalCount: totalCount,
            noUtilities: utilities.length === 0,
            totalUnits: totalUnits,
            totalTenants: totalTenants,  
            totalFixes: totalFixes,  
        });
    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        res.status(500).json({ success: false, message: "Error fetching admin dashboard data" });
    }
});

// ADMIN PAGES (MANAGE UNIT) ---------------------------------------------------------------------------
app.get("/admin/manage/unit", verifyToken, async (req, res) => {
    try {
      const admin = await viewAdmins(req);
      console.log("Fetched admin data for unit management:", admin);
  
      const unitsData = await viewUnits(req, res);
      console.log("Units Data:", unitsData);
  
      const occupiedUnits = unitsData.success ? await getOccupiedUnits(req, res) : [];
  
      res.render("manageUnits", {
        title: "Hive",
        styles: ["manageUnits"],
        admin: admin,
        units: unitsData.units || [],
        occupiedUnits: occupiedUnits
      });
    } catch (error) {
      console.error("Error fetching admin or unit data:", error);
      res.status(500).json({ success: false, message: "Error fetching data" });
    }
});
  
const getTenantsByRoomId = async (roomId) => {
    try {
        const tenants = await Tenant.findAll({
            where: {
                room_id: roomId
            }
        });
        return tenants;
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return [];
    }
};

const getUtilitiesByRoomId = async (room_id) => {
    try {
        const utilities = await Utility.findAll({
            where: {
                room_id: room_id
            }
        });
        return utilities;
    } catch (error) {
        console.error('Error fetching utilities:', error);
        return [];
    }
}

const getRoomDetails = async (roomId) => {
    try {
        const room = await Room.findOne({
            where: {
                room_id: roomId
            }
        });
        
        if (room) {
            const roomTotalSlot = parseInt(room.roomTotalSlot, 10) || 0; 
            const roomRemainingSlot = parseInt(room.roomRemainingSlot, 10) || 0; 
            return { roomTotalSlot, roomRemainingSlot };
        }
        return {};  
    } catch (error) {
        console.error('Error fetching room details:', error);
        return {};
    }
};

app.get('/admin/manage/unit/tenants/:room_id', async (req, res) => {
    const { room_id } = req.params;
    try {
        const tenants = await getTenantsByRoomId(room_id);
        console.log('Tenants:', tenants); 
        res.json({ tenants });
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/admin/utilities/:room_id', async (req, res) => {
    const { room_id } = req.params;
    try {
        const utilities = await getUtilitiesByRoomId(room_id);
        console.log('Utilities:', utilities);  
        res.json({ utilities });
    } catch (error) {
        console.error('Error fetching utilities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/admin/manage/unit/tenants', async (req, res) => {
    const roomId = req.query.room_id;
    try {
        const tenants = await getTenantsByRoomId(roomId);
        const roomDetails = await getRoomDetails(roomId);

        if (roomDetails && roomDetails.roomTotalSlot != null && roomDetails.roomRemainingSlot != null) {
            const rented = roomDetails.roomTotalSlot - roomDetails.roomRemainingSlot;

            res.json({
                tenants,
                roomTotalSlot: roomDetails.roomTotalSlot,  
                roomRemainingSlot: roomDetails.roomRemainingSlot,  
                rented: rented
            });
        } else {
            res.status(404).json({ error: "Room not found or invalid data" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error fetching room details" });
    }
});

app.get('/api/auth/admin/totalUnits', async (req, res) => {
    try {
        const { establishmentId } = req.admin; 
        
        const totalUnits = await Room.sum('roomTotalSlot', {
            where: { establishmentId }
        });

        res.status(200).json({ totalUnits });
    } catch (error) {
        console.error('Error calculating total units:', error);
        res.status(500).json({ message: 'Failed to calculate total units' });
    }
});

app.get("/admin/manage/unit/add", verifyToken, addUnitView);
  
// ADMIN PAGES (USER MANAGEMENT) ---------------------------------------------------------------------
app.get("/admin/dashboard/userManagement", verifyToken, async (req, res) => {
    try {
        const { tenants, success } = await viewTenants(req);  
        const admins = await viewAdmins(req, res);  

        console.log('Fetched tenant data:', tenants);
        console.log('Fetched admin data:', admins);

        if (!success) {
            return res.status(500).json({ success: false, message: 'Error fetching tenant data' });
        }

        const tenantId = req.query.tenantId;  
        let tenantToEdit = null;
        
        if (tenantId) {
            tenantToEdit = tenants.find(tenant => tenant.tenant_id === tenantId);
            if (!tenantToEdit) {
                return res.status(404).json({ success: false, message: 'Tenant not found' });
            }
        }

        res.render("userManagement", {
            title: "Hive",
            styles: ["userManagement"],
            rows: tenants || [], 
            admin: admins,
            tenantToEdit  
        });

    } catch (error) {
        console.error('Error fetching tenant or admin data:', error);
        res.status(500).json({ success: false, message: 'Error fetching data' });
    }
});

app.get("/admin/dashboard/userManagement/add", verifyToken, addTenantView);

app.get("/admin/dashboard/userManagement/editTenant/:tenant_id", verifyToken, async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ where: { tenant_id: req.params.tenant_id } });
        const admins = await viewAdmins(req, res);

        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        const plainTenant = tenant.get({ plain: true });

        res.render("editTenant", {
            title: "Hive",
            styles: ["editTenant"],
            rows: [plainTenant], 
            admin: admins
        });
    } catch (error) {
        console.error('Error fetching tenant or admin data:', error);
        res.status(500).json({ success: false, message: 'Error fetching data' });
    }
});

app.get("/admin/utilities/edit/:utility_id", verifyToken, async (req, res) => {
    try {
        const utility = await Utility.findOne({ where: { utility_id: req.params.utility_id } });
        const admins = await viewAdmins(req, res);

        if (!utility) {
            return res.status(404).json({ success: false, message: 'Utility not found' });
        }

        const plainUtility = utility.get({ plain: true });

        res.render("editUtility", {
            title: "Hive",
            styles: ["editUtility"],
            rows: [plainUtility], 
            admin: admins
        })
    } catch (error) {
        
    }
})

app.put('/api/auth/updateUtility/:utilityId', updateUtility);
app.put('/api/auth/updateTenant/:tenantId', updateTenant);
app.get('/api/auth/getAvailableRooms', verifyToken, getAvailableRooms);
app.post("/api/auth/addTenant", verifyToken, addTenant); 

// ADMIN PAGES (VIEW AND EDIT ACCOUNT) ----------------------------------------------------------------
app.get("/admin/dashboard/view/account", verifyToken, async (req, res) => {
    try {
        const admin = await viewAdmins(req);  

        res.render("viewAdminAccount", {
            title: "Hive",
            styles: ["viewAdminAccount"],
            admin: admin 
        });
    } catch (error) {
        console.error('Error fetching admin data:', error);
        res.status(500).json({ success: false, message: 'Error fetching admin data' });
    }
});

app.get("/admin/dashboard/edit/account", verifyToken, async (req, res) => {
    try {
        const admin = await viewAdmins(req);  

        res.render("editAdminAccount", {
            title: "Hive",
            styles: ["editAdminAccount"],
            admin: admin  
        });
    } catch (error) {
        console.error('Error fetching admin data:', error);
        res.status(500).json({ success: false, message: 'Error fetching admin data' });
    }
});

app.post("/admin/dashboard/edit/account", verifyToken, async (req, res) => {
    try {
        let adminProfile = req.body.adminProfile;

        if (req.files && Object.keys(req.files).length > 0) {
            const sampleFile = req.files.sampleFile;
            const uploadDir = path.join(__dirname, '..', 'client', 'public', 'images', 'upload');
            const uploadPath = path.join(uploadDir, sampleFile.name);

            fs.mkdir(uploadDir, { recursive: true }, async (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Failed to create upload directory.' });
                }

                sampleFile.mv(uploadPath, async (err) => {
                    if (err) return res.status(500).json({ success: false, message: err });

                    adminProfile = sampleFile.name;  

                    await updateAdminDetails(req.body, adminProfile);  
                    logActivity(req.adminId, 'update', `Admin updated their profile.`);
                    return res.json({ success: true, message: 'Admin details updated successfully.' });
                });
            });
        } else {
            await updateAdminDetails(req.body, adminProfile);  
            logActivity(req.adminId, 'update', `Admin updated their profile.`);
            return res.json({ success: true, message: 'Admin details updated successfully.' });
        }
    } catch (error) {
        console.error('Error updating admin account:', error);
        return res.status(500).json({ success: false, message: 'Failed to update admin account.' });
    }
});

const updateAdminDetails = async (body, adminProfile) => {
    const adminDetails = {
        adminProfile: adminProfile,  
        adminEmail: body.adminEmail,
        adminFirstName: body.adminFirstName,
        adminLastName: body.adminLastName,
        eName: body.eName,
    };
    const adminId = body.admin_id;
    await Admin.update(adminDetails, { where: { admin_id: adminId } });
};

// ADMMIN PAGES (TRACKER) ----------------------------------------------------------------------------
app.get("/admin/tracker", verifyToken, async (req, res) => {
    try {
        const events = await viewEvents(req);  
        const admin = await viewAdmins(req); 
        const tenants = await viewTenants(req);

        const eventsData = events.success ? events.events : [];

        res.render("adminTracker", {
            title: "Hive",
            styles: ["adminTracker"],
            events: eventsData,  
            admin: admin || [],  
            tenants: tenants || []  
        });
    } catch (error) {
        console.error('Error fetching data for admin tracker:', error);
        res.status(500).json({ success: false, message: 'Error fetching data' });
    }
});

app.put('/api/auth/updateEvent/:eventId', async (req, res) => {
    const eventId = req.params.eventId;
    const { event_name, event_description, start, end, status } = req.body;
  
    try {
      const updatedEvent = await Event.update(
        {
          event_name,
          event_description,
          start,
          end,
          status,
        },
        {
          where: {
            id: eventId,
          },
        }
      );
  
      if (updatedEvent[0] === 0) {
        return res.status(404).json({ success: false, message: "Event not found" });
      }
  
      return res.status(200).json({ success: true, message: 'Event updated successfully' });
    } catch (error) {
      console.error('Error updating event:', error);
      return res.status(500).json({ success: false, message: 'Error updating event' });
    }
  });

// ADMIN PAGES (ANNOUNCEMENT) -----------------------------------------------------------------------
app.get("/admin/announcements", verifyToken, async (req, res) => {
    try {
        const { filter } = req.query; 
        const admin = await viewAdmins(req);

        let notices = [];

        switch (filter) {
            case "pinned":
                notices = await Notice.findAll({
                    where: {
                        establishment_id: req.establishmentId,
                        pinned: true,
                    },
                    order: [['updated_at', 'DESC']],
                });
                break;

            case "permanent":
                notices = await Notice.findAll({
                    where: {
                        establishment_id: req.establishmentId,
                        permanent: true,
                    },
                    order: [['updated_at', 'DESC']],
                });
                break;

            default:
                const response = await viewNotices(req, res);
                notices = response.notices || []; 
                break;
        }

        if (notices.length === 0) {
            const message = filter === 'pinned'
                ? "There are no pinned notices at the moment. Please check back later."
                : "There are no permanent notices at the moment. Please check back later.";

            notices = [{
                title: filter === 'pinned' ? "No pinned notices yet" : "No permanent notices yet",
                content: message,
                pinned: false,
                permanent: false,
                updated_at: new Date().toLocaleString(), 
            }];
        }

        const plainNotices = notices.map(notice => notice.get ? notice.get({ plain: true }) : notice);

        if (req.headers['accept'] === 'application/json') {
            return res.json({ success: true, notices: plainNotices });
        }

        res.render("announcements", {
            title: "Hive",
            styles: ["announcements"],
            admin: admin || [],  
            notices: plainNotices || [], 
        });

    } catch (error) {
        console.error('Error fetching data for admin tracker:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error fetching data' });
        }
    }
});

// ADMIN PAGES (SETTINGS) ---------------------------------------------------------------------------
app.get("/admin/settings", verifyToken, async (req, res) => {
    try {
        const admin = await viewAdmins(req, res);

        const adminId = admin ? admin.admin_id : null;

        res.render("adminSettings", {
            title: "Hive",
            styles: ["adminSettings"],
            admin: admin || {},
            admin_id: adminId 
        });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send("An error occurred while retrieving admin data.");
    }
});

app.get("/admin/settings/activity-log/:adminID", verifyToken, async (req, res) => {
    try {
        const { adminID } = req.params;
        const admin = await viewAdmins(req, res, adminID); 

        if (!admin) {
            return res.status(404).send("Admin not found.");
        }

        const adminId = admin ? admin.admin_id : null;

        res.render("activityLog", {
            title: "Hive",
            styles: ["activityLog"],
            admin: admin || {},  
            admin_id: adminId    
        });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send("An error occurred while retrieving admin data.");
    }
});

app.get("/admin/settings/feedback-support", verifyToken, async (req, res) => {
    try {
        const { adminID } = req.params;
        const admin = await viewAdmins(req, res, adminID); 

        if (!admin) {
            return res.status(404).send("Admin not found.");
        }

        const adminId = admin ? admin.admin_id : null;

        res.render("feedback", {
            title: "Hive",
            styles: ["feedback"],
            admin: admin || {},  
            admin_id: adminId    
        });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send("An error occurred while retrieving admin data.");
    }
})

app.get("/admin/settings/password-reset", verifyToken, async (req, res) => {
    try {
        const adminId = req.adminId;
        const admins = await viewAdmins(req, res, adminId);

        const admin = await Admin.findOne({ where: { admin_id: adminId } });
        if (!admin) {
            console.error("Admin not found for ID:", adminId);
            return res.status(404).send("Admin not found.");
        }

        res.render("passwordReset", {
            title: "Hive",
            styles: ["passwordReset"],
            admin,
            admin_id: adminId,
            admins: admins,
        });
    } catch (error) {
        console.error("Error fetching admin:", error);
        res.status(500).send("An error occurred while retrieving admin data.");
    }
});
app.get("/admin/settings/delete-account/:admin_id", verifyToken, async (req, res) => {
    try {
        const { adminID } = req.params;
        const admin = await viewAdmins(req, res, adminID); 

        if (!admin) {
            return res.status(404).send("Admin not found.");
        }

        const adminId = admin ? admin.admin_id : null;

        res.render("deleteAdmin", {
            title: "Hive",
            styles: ["deleteAdmin"],
            admin: admin || {},  
            admin_id: adminId    
        });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send("An error occurred while retrieving admin data.");
    }
});

// ADMIN PAGES (VISITORS LOG) ---------------------------------------------------------------------------
app.get("/admin/visitors/log", verifyToken, async (req, res) => {
    try {
        const admin = await viewAdmins(req, res);

        const requestData = await viewApprovedRequests(req);
        console.log("Request Data (Visitors):", requestData);

        const adminId = admin ? admin.admin_id : null;

        res.render("adminVisitors", {
            title: "Hive",
            styles: ["adminVisitors"],
            admin: admin || {},
            admin_id: adminId,
            requests: requestData.length > 0 ? requestData : [],
        });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send("An error occurred while retrieving admin data.");
    }
});

// ADMIN PAGES (VISITORS PENDING) ---------------------------------------------------------------------------
app.get("/admin/visitors/pending", verifyToken, async (req, res) => {
    try {
        const admin = await viewAdmins(req, res);

        const requestsData = await viewRequestsAdmin(req);
        console.log("Real Requests Data from Database:", requestsData);

        const adminId = admin ? admin.admin_id : null;

        res.render("adminPendings", {
            title: "Hive",
            styles: ["adminPendings"],
            admin: admin || {},
            admin_id: adminId,
            requests: requestsData.length > 0 ? requestsData : [],
        });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).send("An error occurred while retrieving admin data.");
    }
});


// ADMIN PAGES (MAINTENANCE) ---------------------------------------------------------------------------
app.get("/admin/maintenance", verifyToken, async (req, res) => {
    try {
        const admin = await viewAdmins(req, res);
        const fixesData = await viewFixesAdmin(req); 
        console.log("Real Fixes Data from Database:", fixesData); 
        
        if (!admin) {
            return res.status(404).json({ error: "Admin not found." });
        }

        return res.render("adminMaintenance", {
            title: "Hive",
            styles: ["adminMaintenance"],
            admin: admin || {},
            fixes: fixesData || [],  
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).send("An error occurred while retrieving data.");
    }
});

// ADMIN PAGES (UTILITIES) ---------------------------------------------------------------------------
app.get("/admin/utilities", verifyToken, async (req, res) => {
    try {
        const admin = await viewAdmins(req);
        const adminId = admin ? admin.admin_id : null;

        const utilities = await viewUtilities(req);

        if (!utilities || utilities.length === 0) {
            return res.render("adminUtils", {
                title: "Hive",
                styles: ["adminUtils"],
                admin: admin || {},
                admin_id: adminId,
                utilities: [],
                noUtilities: true 
            });
        }

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const currentMonthUtilities = utilities.filter(utility => {
            const statementDate = new Date(utility.statementDate);
            const dueDate = new Date(utility.dueDate);

            return (
                (statementDate.getMonth() === currentMonth && statementDate.getFullYear() === currentYear) ||
                (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear)
            );
        });

        let displayUtilities;

        if (currentMonthUtilities.length > 0) {
            displayUtilities = currentMonthUtilities;
        } else {
            displayUtilities = utilities;
        }

        const formattedUtilities = displayUtilities.map(utility => ({
            roomNumber: utility.roomNumber || "N/A",
            roomType: utility.roomType || "N/A",
            sharedBalance: utility.sharedBalance ? parseFloat(utility.sharedBalance).toFixed(2) : "0.00",
            totalBalance: utility.totalBalance ? parseFloat(utility.totalBalance).toFixed(2) : "0.00",
            room_id: utility.room_id,
            utility_id: utility.utility_id
        }));

        res.render("adminUtils", {
            title: "Hive",
            styles: ["adminUtils"],
            admin: admin || {},
            admin_id: adminId,
            utilities: formattedUtilities,
            noUtilities: false 
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send("An error occurred while retrieving data.");
    }
});

  
// TENANT PAGES (DASHBOARD) -------------------------------------------------------------------------
const getTenantsDashboard = async (roomId) => {
    try {
        const tenants = await Tenant.findAll({
            where: { room_id: roomId }
        });
        return tenants; 
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return []; 
    }
};

const setEstablishmentId = async (req, res, next) => {
    try {
        const { tenantId } = req;

        if (!tenantId) {
            return res.status(400).json({ error: "Tenant ID is missing." });
        }

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId } });

        if (!tenant) {
            return res.status(404).json({ error: "Tenant not found." });
        }

        req.establishmentId = tenant.establishment_id;

        if (!req.establishmentId) {
            return res.status(400).json({ error: "Establishment ID is missing." });
        }

        req.roomId = tenant.get("room_id"); 
        next(); 
    } catch (error) {
        console.error("Error setting establishment ID:", error.message);
        return res.status(500).json({ error: "Internal server error." });
    }
};

app.get("/tenant/dashboard", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const { establishmentId, roomId } = req;

    try {
        const allUtilityTypes = [
            'electricity consumption',
            'water usage',
            'internet connection',
            'unit rental',
            'maintenance fees',
            'dorm amenities'
        ];

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const utilities = await viewUtilities(req, res);

        const filteredUtilities = utilities.filter(utility => {
            const statementDate = new Date(utility.statementDate);
            const dueDate = new Date(utility.dueDate);

            return (
                (statementDate.getMonth() === currentMonth && statementDate.getFullYear() === currentYear) ||
                (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear)
            );
        });

        const formattedUtilities = allUtilityTypes.map(utilityType => {
            const utility = filteredUtilities.find(u => u.utilityType === utilityType);

            return {
                utilityType: getFormattedName(utilityType), 
                charge: utility ? parseFloat(utility.charge).toFixed(2) : "0.00",   
                status: utility ? utility.status : 'N/A',   
                iconClass: getIconClass(utilityType),         
                sizeClass: getSizeClass(utilityType)          
            };
        });

        const room = await Room.findOne({ where: { room_id: roomId } });

        if (!room) {
            return res.status(404).json({ error: "Room not found." });
        }

        const roomNumber = room.get("roomNumber");
        const roomTotalSlot = parseInt(room.get("roomTotalSlot"), 10) || 0;
        const roomRemainingSlot = parseInt(room.get("roomRemainingSlot"), 10) || 0;

        if (isNaN(roomTotalSlot) || isNaN(roomRemainingSlot)) {
            return res.status(400).json({ error: "Invalid room slot values." });
        }

        const tenantsInRoom = await Tenant.findAll({ where: { room_id: roomId } });
        const rentedSlot = tenantsInRoom.length;  

        const tenants = await getTenantsDashboard(roomId);
        const plainTenants = tenants.map((tenant) => tenant.get({ plain: true }));

        const noticesCount = await Notice.count({ where: { establishment_id: establishmentId } }) || 0;

        res.render("tenantDashboard", {
            title: "Hive",
            styles: ["ten-dashboard"],
            tenants: plainTenants,
            roomNumber,
            rentedSlot,  
            utilities: formattedUtilities,
            notices: noticesCount  
        });
    } catch (error) {
        console.error("Error fetching tenant dashboard data:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});



function getFormattedName(utilityType) {
    switch (utilityType) {
        case 'electricity consumption':
            return 'Electricity';
        case 'water usage':
            return 'Water';
        case 'internet connection':
            return 'WiFi/Internet';
        case 'unit rental':
            return 'Unit Rent';
        case 'maintenance fees':
            return 'Maintenance Fees';
        case 'dorm amenities':
            return 'Dorm Amenities';
        default:
            return utilityType; 
    }
}

function getIconClass(utilityType) {
    switch (utilityType) {
        case 'electricity consumption': 
            return 'fa-bolt';
        case 'water usage':
            return 'fa-tint';
        case 'internet connection':
            return 'fa-wifi';
        case 'unit rental':
            return 'fa-home';
        case 'maintenance fees':
            return 'fa-tools';
        case 'dorm amenities':
            return 'fa-bed';
        default:
            return '';
    }
}

function getSizeClass(utilityType) {
    switch (utilityType) {
        case 'Electricity':
        case 'Unit Rent':
            return 'card-large';
        case 'Water':
        case 'Maintenance Fees':
            return 'card-medium';
        default:
            return 'card-small';
    }
}

// TENANT PAGES (ANNOUNCEMENT) ----------------------------------------------------------------------
app.get("/tenant/announcement", verifyTenantToken, async (req, res) => {
    try {
        const { filter } = req.query;

        const tenant = await Tenant.findOne({ where: { tenant_id: req.tenantId } });
        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        const roomId = tenant.room_id;
        const room = await Room.findOne({ where: { room_id: roomId } });
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        req.establishmentId = room.establishment_id;

        const whereClause = { establishment_id: req.establishmentId };
        if (filter === "pinned") whereClause.pinned = true;
        if (filter === "permanent") whereClause.permanent = true;

        let notices = await Notice.findAll({
            where: whereClause,
            order: [["updated_at", "DESC"]],
        });

        if (notices.length === 0) {
            notices = [{
                title: filter === "pinned" ? "No pinned notices yet" : "No permanent notices yet",
                content: "No notices available at the moment.",
                pinned: false,
                permanent: false,
                updated_at: new Date().toLocaleString(),
            }];
        }

        if (req.xhr) {
            return res.json({
                notices: notices.map(notice => notice.dataValues) 
            });
        }

        res.render("ten-announcement", {
            title: "Hive",
            styles: ["ten-announce"],
            notices: notices.map(notice => notice.dataValues),  
        });
    } catch (error) {
        console.error("Error fetching notices:", error);
        
        res.status(500).json({ message: "Internal server error" });
    }
});

// TENANT PAGES (UTILITIES) -------------------------------------------------------------------------
app.get("/tenant/utilities", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const tenantId = req.tenantId;
    const { establishmentId } = req;

    if (!tenantId) {
        return res.status(400).send("Tenant ID not found in the token.");
    }

    try {
        const allUtilityTypes = [
            'electricity consumption',
            'water usage',
            'internet connection',
            'unit rental',
            'maintenance fees',
            'dorm amenities'
        ];

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const utilities = await viewUtilities(req);
        console.log("Utilities fetched from viewUtilities:", utilities);

        if (!utilities || utilities.length === 0) {
            const formattedUtilities = allUtilityTypes.map(utilityType => ({
                utilityType: getFormattedName(utilityType),
                charge: "0.00",
                perTenant: "0.00",
                status: 'N/A',
                iconClass: getIconClass(utilityType),
                sizeClass: getSizeClass(utilityType),
                statementDate: 'N/A',
                dueDate: 'N/A'
            }));

            const tenant = await Tenant.findOne({ where: { tenant_id: tenantId } });
            if (!tenant) {
                return res.status(404).send("Tenant not found");
            }

            const roomId = tenant.get('room_id');
            const room = await Room.findOne({ where: { room_id: roomId } });

            if (!room) {
                return res.status(404).send("Room not found");
            }

            const roomNumber = room.get('roomNumber');
            const tenants = await getTenantsDashboard(roomId);

            const plainTenants = tenants.map(tenant => tenant.get({ plain: true }));

            const utilitiesHistory = await utilityHistories(req, res);

            res.render("ten-utilities", {
                title: "Hive",
                styles: ["ten-utilities"],
                tenants: plainTenants,
                roomNumber: roomNumber,
                utilities: formattedUtilities,
                totalBalance: "0.00",
                sharedBalance: "0.00",
                utilitiesHistory: utilitiesHistory || []
            });
            return;
        }

        const filteredUtilities = utilities.filter(utility => {
            const statementDate = new Date(utility.statementDate);
            const dueDate = new Date(utility.dueDate);

            return (
                (statementDate.getMonth() === currentMonth && statementDate.getFullYear() === currentYear) ||
                (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear)
            );
        });

        if (filteredUtilities.length === 0) {
            const formattedUtilities = allUtilityTypes.map(utilityType => ({
                utilityType: getFormattedName(utilityType),
                charge: "0.00",
                perTenant: "0.00",
                status: 'N/A',
                iconClass: getIconClass(utilityType),
                sizeClass: getSizeClass(utilityType),
                statementDate: 'N/A',
                dueDate: 'N/A'
            }));

            const tenant = await Tenant.findOne({ where: { tenant_id: tenantId } });
            if (!tenant) {
                return res.status(404).send("Tenant not found");
            }

            const roomId = tenant.get('room_id');
            const room = await Room.findOne({ where: { room_id: roomId } });

            if (!room) {
                return res.status(404).send("Room not found");
            }

            const roomNumber = room.get('roomNumber');
            const tenants = await getTenantsDashboard(roomId);

            const plainTenants = tenants.map(tenant => tenant.get({ plain: true }));

            const utilitiesHistory = await utilityHistories(req, res);

            res.render("ten-utilities", {
                title: "Hive",
                styles: ["ten-utilities"],
                tenants: plainTenants,
                roomNumber: roomNumber,
                utilities: formattedUtilities,
                totalBalance: "0.00",
                sharedBalance: "0.00",
                utilitiesHistory: utilitiesHistory || []
            });
            return;
        }

        const totalBalance = parseFloat(filteredUtilities[0].totalBalance || 0).toFixed(2);
        const sharedBalance = parseFloat(filteredUtilities[0].sharedBalance || 0).toFixed(2);

        console.log("Calculated Total Balance for current month:", totalBalance);
        console.log("Calculated Shared Balance for current month:", sharedBalance);

        const formattedUtilities = allUtilityTypes.map(utilityType => {
            const utility = filteredUtilities.find(u => u.utilityType === utilityType);

            const charge = utility ? parseFloat(utility.charge) : 0.00;

            let perTenant = utility ? utility.perTenant : 0.00;

            if (perTenant === null || perTenant === undefined || isNaN(perTenant)) {
                perTenant = 0.00;
            } else {
                perTenant = parseFloat(perTenant).toFixed(2);
            }

            return {
                utilityType: getFormattedName(utilityType),
                charge: charge.toFixed(2),
                perTenant: perTenant,
                status: utility ? utility.status : 'N/A',
                iconClass: getIconClass(utilityType),
                sizeClass: getSizeClass(utilityType),
                statementDate: utility ? utility.statementDate : 'N/A',
                dueDate: utility ? utility.dueDate : 'N/A'
            };
        });

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId } });

        if (!tenant) {
            return res.status(404).send("Tenant not found");
        }

        const roomId = tenant.get('room_id');
        const room = await Room.findOne({ where: { room_id: roomId } });

        if (!room) {
            return res.status(404).send("Room not found");
        }

        const roomNumber = room.get('roomNumber');
        const tenants = await getTenantsDashboard(roomId);

        const plainTenants = tenants.map(tenant => tenant.get({ plain: true }));

        const utilitiesHistory = await utilityHistories(req, res);

        console.log('Utilities History:', utilitiesHistory);

        res.render("ten-utilities", {
            title: "Hive",
            styles: ["ten-utilities"],
            tenants: plainTenants,
            roomNumber: roomNumber,
            utilities: formattedUtilities,
            totalBalance: totalBalance,
            sharedBalance: sharedBalance,
            utilitiesHistory: utilitiesHistory || []
        });
    } catch (error) {
        console.error('Error fetching tenant utilities:', error);
        res.status(500).send("Error fetching tenant utilities.");
    }
});

// TENANT PAGES (ROOM DEETS) ------------------------------------------------------------------------
app.get("/tenant/room-details", verifyTenantToken, async (req, res) => {
    const tenantId = req.tenantId;
    if (!tenantId) {
        return res.status(400).send("Tenant ID not found in the token.");
    }

    try {
        const tenant = await Tenant.findOne({
            where: { tenant_id: tenantId }
        });

        if (!tenant) {
            return res.status(404).send("Tenant not found");
        }

        const roomId = tenant.get('room_id');

        const tenants = await getTenantsDashboard(roomId);

        const room = await Room.findOne({
            where: { room_id: roomId }
        });

        if (!room) {
            return res.status(404).send("Room not found");
        }

        const roomNumber = room.get('roomNumber');
        const roomType = room.get('roomType');
        const floorNumber = room.get('floorNumber');
        const roomTotalSlot = room.get('roomTotalSlot');
        const plainTenants = tenants.map(tenant => tenant.get({ plain: true }));

        res.render("ten-RoomDeets", {
            title: "Hive",
            styles: ["ten-deets"],
            tenants: plainTenants,
            roomNumber: roomNumber,
            roomType: roomType,
            floorNumber: floorNumber,
            roomTotalSlot: roomTotalSlot
        });
    } catch (error) {
        console.error('Error fetching tenant data:', error);
        res.status(500).send("Error fetching tenant data.");
    }
});

// TENANT PAGES (VIEW AND EDIT ACCOUNT) -------------------------------------------------------------
app.get("/tenant/room-details/view/account", verifyTenantToken, async (req, res) => {
    const tenantId = req.tenantId;

    if (!tenantId) {
        return res.status(400).send("Tenant ID not found in the token.");
    }

    try {
        // Find the logged-in tenant
        const tenant = await Tenant.findOne({
            where: { tenant_id: tenantId },
        });

        if (!tenant) {
            return res.status(404).send("Tenant not found");
        }

        const plainTenant = tenant.get({ plain: true });

        res.render("viewTenantAccount", {
            title: "Hive",
            styles: ["viewTenantAccount"],
            tenant: plainTenant, 
        });
    } catch (error) {
        console.error("Error fetching tenant data:", error);
        res.status(500).json({ success: false, message: "Error fetching tenant data" });
    }
});

app.get("/tenant/room-details/edit/account", verifyTenantToken, async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ where: { tenant_id: req.tenantId } });
        if (!tenant) {
            return res.status(404).send("Tenant not found");
        }

        res.render("editTenantAccount", {
            title: "Hive",
            styles: ["editTenantAccount"],
            tenant: tenant.get({ plain: true }),
        });
    } catch (error) {
        console.error("Error fetching tenant data:", error);
        res.status(500).json({ success: false, message: "Error fetching tenant data" });
    }
});

app.post("/tenant/room-details/edit/account", verifyTenantToken, async (req, res) => {
    try {
        let tenantProfile = req.body.tenantProfile;

        if (req.files && req.files.sampleFile) {
            const sampleFile = req.files.sampleFile;
            const uploadDir = path.join(__dirname, "..", "client", "public", "images", "upload");
            const uploadPath = path.join(uploadDir, sampleFile.name);

            fs.mkdirSync(uploadDir, { recursive: true });

            sampleFile.mv(uploadPath, async (err) => {
                if (err) {
                    console.error("Error moving file:", err);
                    return res.status(500).json({ success: false, message: "File upload failed." });
                }

                tenantProfile = sampleFile.name; 
                await updateTenantDetails(req.body, tenantProfile);
                return res.json({ success: true, message: "Tenant details updated successfully." });
            });
        } else {
            await updateTenantDetails(req.body, tenantProfile);
            return res.json({ success: true, message: "Tenant details updated successfully." });
        }
    } catch (error) {
        console.error("Error updating tenant account:", error);
        res.status(500).json({ success: false, message: "Failed to update tenant account." });
    }
});

const updateTenantDetails = async (body, tenantProfile) => {
    const tenantDetails = {
        tenantProfile: tenantProfile,
        tenantEmail: body.tenantEmail,
        tenantFirstName: body.tenantFirstName,
        tenantLastName: body.tenantLastName,
        gender: body.gender,
        mobileNum: body.mobileNum,
        tenantGuardianName: body.tenantGuardianName,
        tenantGuardianNum: body.tenantGuardianNum,
    };

    const tenantId = body.tenant_id;
    await Tenant.update(tenantDetails, { where: { tenant_id: tenantId } });
};

// TENANT PAGES (SETTINGS) -------------------------------------------------------------------------
app.get("/tenant/settings", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const { tenantId, establishmentId } = req;

    try {
        if (!tenantId || !establishmentId) {
            return res.status(400).json({ error: "Tenant or establishment ID is missing." });
        }

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId, establishmentId } });

        if (!tenant) {
            return res.status(404).json({ error: "Tenant not found." });
        }

        const plainTenant = tenant.get({ plain: true });

        res.render("tenantSettings", {
            title: "Hive",
            styles: ["tenantSettings"],
            tenant: plainTenant,
        });
    } catch (error) {
        console.error("Error fetching tenant settings data:", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// TENANT PAGES (VISITORS LOG) -------------------------------------------------------------------------
app.get("/tenant/visitors", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const { tenantId, establishmentId } = req;

    try {
        const { data: requestData, counts } = await viewRequests(req); 
        console.log("Requests:", requestData);
        
        const regularData = await viewRegularRequests(req);
        console.log("Regular Requests:", regularData);

        const overnightData = await viewOvernightRequests(req);
        console.log("Overnight Requests:", overnightData);

        if (!tenantId || !establishmentId) {
            return res.status(400).json({ error: "Tenant or establishment ID is missing." });
        }

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId, establishmentId } });

        if (!tenant) {
            return res.status(404).json({ error: "Tenant not found." });
        }

        const plainTenant = tenant.get({ plain: true });

        res.render("tenantVisitors", {
            title: "Hive",
            styles: ["tenantVisitors"],
            tenant: plainTenant || [],
            regular: regularData || [],
            overnight: overnightData || [],   
            counts,  
        });
    } catch (error) {
        console.error("Error fetching tenant visitors data:", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// TENANT PAGES (MAINTENANCE) -------------------------------------------------------------------------
app.get("/tenant/maintenance", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const { tenantId, establishmentId } = req;

    try {
        const fixesData = await viewFixes(req); 
        console.log("Fixes (Tenant):", fixesData); 
        
        if (!tenantId || !establishmentId) {
            return res.status(400).json({ error: "Tenant or establishment ID is missing." });
        }

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId, establishmentId } });

        if (!tenant) {
            return res.status(404).json({ error: "Tenant not found." });
        }

        const plainTenant = tenant.get({ plain: true });

        const computeCounts = (fixes) => {
            let pendingCount = 0;
            let inProgressCount = 0;
            let completedCount = 0;
            let scheduledCount = 0;
            let urgentCount = 0;

            fixes.forEach(fix => {
                if (fix.status === 'pending') pendingCount++;
                if (fix.status === 'in progress') inProgressCount++;
                if (fix.status === 'completed') completedCount++;
                if (fix.urgency === 'scheduled') scheduledCount++;
                if (fix.urgency === 'urgent') urgentCount++;
            });

            return {
                pending: pendingCount,
                inProgress: inProgressCount,
                completed: completedCount,
                scheduled: scheduledCount,
                urgent: urgentCount,
            };
        };

        const counts = computeCounts(fixesData);

        res.render("tenantMaintenance", {
            title: "Hive",
            styles: ["tenantMaintenance"],
            tenant: plainTenant || [],
            fixes: fixesData || [], 
            counts: counts,
        });
    } catch (error) {
        console.error("Error fetching tenant maintenance data:", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

app.get("/tenant/maintenance/view", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const { tenantId, establishmentId } = req;

    try {
        const fixesData = await viewFixes(req); 
        console.log("Fixes (Tenant):", fixesData);

        if (!fixesData || fixesData.length === 0) {
            console.error("No fixes data found.");
            return res.status(500).json({ error: "No fixes data found." });
        }

        if (!tenantId || !establishmentId) {
            return res.status(400).json({ error: "Tenant or establishment ID is missing." });
        }

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId, establishment_id: establishmentId } });

        if (!tenant) {
            return res.status(404).json({ error: "Tenant not found." });
        }

        const plainTenant = tenant.get({ plain: true });

        // Return the JSON data here
        return res.json({
            tenant: plainTenant,
            fixes: fixesData
        });

    } catch (error) {
        console.error("Error fetching tenant visitors data:", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// TENANT PAGES (CUSTOMIZE - SETTINGS) -------------------------------------------------------------------------
app.get("/tenant/customize", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const { tenantId, establishmentId } = req;

    try {
        if (!tenantId || !establishmentId) {
            return res.status(400).json({ error: "Tenant or establishment ID is missing." });
        }

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId, establishmentId } });

        if (!tenant) {
            return res.status(404).json({ error: "Tenant not found." });
        }

        const plainTenant = tenant.get({ plain: true });

        res.render("ten-customize", {
            title: "Hive",
            styles: ["ten-customize"],
            tenant: plainTenant,
        });
    } catch (error) {
        console.error("Error fetching tenant visitors data:", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// TENANT PAGES (FEEDBACK - SETTINGS) -------------------------------------------------------------------------
app.get("/tenant/feedback", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const { tenantId, establishmentId } = req;

    try {
        if (!tenantId || !establishmentId) {
            return res.status(400).json({ error: "Tenant or establishment ID is missing." });
        }

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId, establishmentId } });

        if (!tenant) {
            return res.status(404).json({ error: "Tenant not found." });
        }

        const plainTenant = tenant.get({ plain: true });

        res.render("ten-feedback", {
            title: "Hive",
            styles: ["ten-feedback"],
            tenant: plainTenant,
        });
    } catch (error) {
        console.error("Error fetching tenant visitors data:", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// TENANT PAGES (ACTIVITY LOG - SETTINGS) -------------------------------------------------------------------------
app.get("/tenant/settings/activity-log", verifyTenantToken, setEstablishmentId, async (req, res) => {
    try {
        const { tenantId } = req; 

        if (!tenantId) {
            return res.status(400).send("Tenant ID is missing.");
        }

        const tenant = await viewTenants(req, res, tenantId); 

        if (!tenant) {
            return res.status(404).send("Tenant not found.");
        }

        res.render("ten-activity", {
            title: "Hive",
            styles: ["ten-activity"],
            tenant: tenant || {}, 
            tenant_id: tenantId    
        });
    } catch (error) {
        console.error("Error fetching tenant activity log:", error.message);
        res.status(500).send("An error occurred while retrieving tenant data.");
    }
});

// TENANT PAGES (RESET PASSWORD - SETTINGS) -------------------------------------------------------------------------
app.get("/tenant/resetPassword", verifyTenantToken, setEstablishmentId, async (req, res) => {
    const { tenantId, establishmentId } = req;

    try {
        if (!tenantId || !establishmentId) {
            return res.status(400).json({ error: "Tenant or establishment ID is missing." });
        }

        const tenant = await Tenant.findOne({ where: { tenant_id: tenantId, establishmentId } });

        if (!tenant) {
            return res.status(404).json({ error: "Tenant not found." });
        }

        const plainTenant = tenant.get({ plain: true });

        res.render("ten-reset-password", {
            title: "Hive",
            styles: ["ten-reset-password"],
            tenant: plainTenant,
        });
    } catch (error) {
        console.error("Error fetching tenant visitors data:", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Starts the server on the specified port, connects to the database, and logs a message when the server is running.
app.listen(PORT, () => {
    connectDB();
    console.log("Server is running on port: ", PORT);
})
