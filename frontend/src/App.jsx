import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// --- LAYOUTS ---
import CustomerLayout from "./layouts/CustomerLayout";
import OwnerLayout from "./layouts/OwnerLayout"; 
import AdminLayout from "./layouts/AdminLayout"; 
import StaffLayout from "./layouts/FrontdesktopLayout";
import ManagerLayout from "./layouts/HotelManagerLayout"; 
import HousekeepingLayout from "./layouts/HousekeepingMainteLayout.jsx";
import InventoryLayout from "./layouts/InventoryLayout";
import HrPayrollStaffLayout from "./layouts/HrPayrollStaffLayout"; 

// --- STAFF PAGES (FRONT DESK) ---
import StaffLogin from "./pages/Staff/StaffLogIn"; 
import StaffSignUp from "./pages/Staff/StaffSignUp";
import StaffDashboard from "./pages/Staff/frontdesktop/StaffDashboard";
import AllReservation from "./pages/Staff/frontdesktop/AllReservation";
import CheckIn from "./pages/Staff/frontdesktop/CheckIn";
import CheckOut from "./pages/Staff/frontdesktop/CheckOut";
import Extend from "./pages/Staff/frontdesktop/Extend"; 
import GuestProfile from "./pages/Staff/frontdesktop/GuestProfile";
import LoyaltyPoints from "./pages/Staff/frontdesktop/LoyaltyPoints";
import MyShiftProfile from "./pages/Staff/frontdesktop/MyShiftProfile";
import NewReservation from "./pages/Staff/frontdesktop/NewReservation";
import RoomMaspAssign from "./pages/Staff/frontdesktop/RoomMaspAssign";

// --- HR & PAYROLL PAGES ---
import HrPayrollDashboard from "./pages/Staff/HrPayrollStaff/HrPayrollStaffDashboard"; 
import EmployeeDirectory from "./pages/Staff/HrPayrollStaff/EmployeeDirectory";
import AttendanceTracking from "./pages/Staff/HrPayrollStaff/AttendanceTracking";
import PayrollProcessing from "./pages/Staff/HrPayrollStaff/PayrollProcessing";
import PerformanceReviews from "./pages/Staff/HrPayrollStaff/PerformanceReviews";
import EmploymentContracts from "./pages/Staff/HrPayrollStaff/EmploymentContracts";
import HrSettings from "./pages/Staff/HrPayrollStaff/HrSettings";
import WorkloadTracking from "./pages/Staff/HrPayrollStaff/WorkloadTracking";
import StaffingEstimator from "./pages/Staff/HrPayrollStaff/StaffingEstimator";
import TaskCompletionLogs from "./pages/Staff/HrPayrollStaff/TaskCompletionLogs";



// --- HOUSEKEEPING AND MAINTENANCE MODULES ---
// Binago natin ang 'HousekeepingDashboard' tungo sa 'HKDashboard' para mag-match sa Route
import HKDashboard from "./pages/Staff/housekeepingmainte/StaffDashboard"; 
import HKTasks from "./pages/Staff/housekeepingmainte/HKTasks";
import HKSchedule from "./pages/Staff/housekeepingmainte/HKSchedule";
import RoomStatusMap from "./pages/Staff/housekeepingmainte/RoomStatusMap";
import LinenInventory from "./pages/Staff/housekeepingmainte/LinenInventory";
import MaintenanceReport from "./pages/Staff/housekeepingmainte/MaintenanceReport";
import HKHistory from "./pages/Staff/housekeepingmainte/HKHistory";
import HKSettings from "./pages/Staff/housekeepingmainte/HKSettings";

import HotelManagerDashboard from "./pages/Staff/hotelmanager/StaffDashboard";


// --- INVENTORY MODULES ---
import InventoryDashboard from './pages/Staff/inventorysupply/InventoryDashboard';
import StockManagement from './pages/Staff/inventorysupply/StockManagement';
import StockInOut from './pages/Staff/inventorysupply/StockInOut'; // Inayos ang path dito
import LowStockAlerts from './pages/Staff/inventorysupply/LowStockAlerts';
import ConsumptionReports from './pages/Staff/inventorysupply/ConsumptionReports';
import InventorySimulation from './pages/Staff/inventorysupply/InventorySimulation';
import HistoryLogs from './pages/Staff/inventorysupply/HistoryLogs';
import InventorySettings from './pages/Staff/inventorysupply/InventorySettings';


// --- ADMIN PAGES ---
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCustomers from "./pages/admin/Customers";
import AdminStaff from "./pages/admin/Staff";
import AdminReports from "./pages/admin/Reports";
import AdminReviews from "./pages/admin/Reviews";
import AdminHotelOwner from "./pages/admin/HotelOwner";
import AdminMemPackage from "./pages/admin/MemPackage"; 
import AdminSystemLogs from "./pages/admin/SystemLogs";
import AdminSettings from "./pages/admin/Settings";
import AdminAiConfig from "./pages/admin/AiConfig";
import AdminMapServices from "./pages/admin/MapServices";

// --- OWNER PAGES ---
import OwnerLogin from "./pages/owner/OwnerLogin"; 
import OwnerSignUp from "./pages/owner/OwnerSignUp";
import OwnerDashboard from "./pages/owner/Dashboard";
import OwnerRooms from "./pages/owner/Rooms";
import OwnerReservations from "./pages/owner/Reservations";
import OwnerCustomers from "./pages/owner/Customers";
import OwnerHousekeeping from "./pages/owner/Housekeeping";
import OwnerInventory from "./pages/owner/Inventory"; 
import OwnerStaff from "./pages/owner/Staff";
import OwnerReports from "./pages/owner/Reports";
import OwnerReviews from "./pages/owner/Reviews";

// --- CUSTOMER PAGES ---
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import Facilities from "./pages/Facilities";
import Features from "./pages/Features";
import HotelDetail from "./pages/HotelDetail";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Booking from "./pages/Booking";
import BookingSuccess from "./pages/BookingSuccess";
import Profile from "./pages/Profile";
import ViewRecommendations from "./components/ViewRecommendations";
import VirtualTour from "./components/VirtualTour";
import GuestsOffer from "./components/GuestsOffer";
import CustomerDashboard from "./customer/CustomerDashboard";
import InnovaSuites from "./customer/InnovaSuites";
import Rewards from "./pages/customer/Rewards";
import VisionSuites from "./pages/customer/VisionSuites";

// --- PROTECTED ROUTE COMPONENTS ---
const ProtectedAdmin = ({ children }) => {
  const admin = localStorage.getItem("adminSession");
  return admin === "true" ? children : <Navigate to="/admin/login" replace />;
};

const ProtectedStaff = ({ children }) => {
  const staff = localStorage.getItem("staffSession");
  return staff === "true" ? children : <Navigate to="/staff/login" replace />;
};

const ProtectedRole = ({ children }) => {
  const isAuth = 
    localStorage.getItem("staffSession") === "true" || 
    localStorage.getItem("managerSession") === "true" ||
    localStorage.getItem("hrSession") === "true" ||
    localStorage.getItem("staffUser"); // Fallback check
  return isAuth ? children : <Navigate to="/staff/login" replace />;
};

const ProtectedCustomer = ({ children }) => {
  const hasCustomerSession = Boolean(localStorage.getItem("user") || localStorage.getItem("customerSession"));
  return hasCustomerSession ? children : <Navigate to="/login" replace />;
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const isCustomerLoggedIn = Boolean(localStorage.getItem("user") || localStorage.getItem("customerSession"));
  const customerUserType = isCustomerLoggedIn ? "member" : "guest";

  return (
    <Router>
      <Routes>
        
        {/* GROUP 1: PUBLIC & CUSTOMER ROUTES */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/about-us" element={<Navigate to="/about" replace />} />
          <Route path="/features" element={<Features />} />
          <Route path="/terms-of-service" element={<Navigate to="/features" replace />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/hoteldetail/:id" element={<HotelDetail />} />

          <Route path="/recommendations" element={<ViewRecommendations isLoggedIn={isCustomerLoggedIn} userType={customerUserType} />} />
          <Route path="/virtual-tour/:roomId" element={<VirtualTour />} />
          <Route path="/offers" element={<GuestsOffer isLoggedIn={isCustomerLoggedIn} />} />

          <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedCustomer>
                <CustomerDashboard />
              </ProtectedCustomer>
            }
          />
          <Route path="/innova-suites" element={<InnovaSuites />} />
          <Route path="/vision-suites" element={<VisionSuites />} />
          <Route
            path="/rewards"
            element={
              <ProtectedCustomer>
                <Rewards />
              </ProtectedCustomer>
            }
          />

          <Route path="/booking" element={<Booking />} />
          <Route path="/booking/success" element={<BookingSuccess />} />
          <Route path="/booking/failed" element={<BookingSuccess />} />
          <Route
            path="/profile"
            element={
              <ProtectedCustomer>
                <Profile />
              </ProtectedCustomer>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/signup" element={<StaffSignUp />} />
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner/signup" element={<OwnerSignUp />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Route>

        {/* GROUP 2: OWNER DASHBOARD */}
        <Route path="/owner" element={<OwnerLayout context={{ isDarkMode, setIsDarkMode }} />}>
          <Route index element={<OwnerDashboard />} />
          <Route path="rooms" element={<OwnerRooms />} />
          <Route path="reservations" element={<OwnerReservations />} />
          <Route path="customers" element={<OwnerCustomers />} />
          <Route path="housekeeping" element={<OwnerHousekeeping />} />
          <Route path="inventory" element={<OwnerInventory />} />
          <Route path="staff" element={<OwnerStaff />} />
          <Route path="reports" element={<OwnerReports />} />
          <Route path="reviews" element={<OwnerReviews />} />
        </Route>

        {/* GROUP 3: FRONT DESK STAFF */}
        <Route 
          path="/staff" 
          element={<ProtectedStaff><StaffLayout /></ProtectedStaff>}
        >
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="reservations" element={<AllReservation />} />
          <Route path="check-in" element={<CheckIn />} />
          <Route path="check-out" element={<CheckOut />} />
          <Route path="extend-stay" element={<Extend />} />
          <Route path="guest-profiles" element={<GuestProfile />} />
          <Route path="loyalty" element={<LoyaltyPoints />} />
          <Route path="room-map" element={<RoomMaspAssign />} />
          <Route path="my-shift" element={<MyShiftProfile />} />
          <Route path="new-reservation" element={<NewReservation />} />
        </Route>

      {/* GROUP 4: HR & PAYROLL MODULE */}
        <Route path="/hr" element={<ProtectedRole><HrPayrollStaffLayout /></ProtectedRole>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HrPayrollDashboard isDarkMode={isDarkMode} />} />
          <Route path="employees" element={<EmployeeDirectory isDarkMode={isDarkMode} />} />
          <Route path="attendance" element={<AttendanceTracking isDarkMode={isDarkMode} />} />
          <Route path="performance" element={<PerformanceReviews isDarkMode={isDarkMode} />} />
          <Route path="payroll" element={<PayrollProcessing isDarkMode={isDarkMode} />} />
          <Route path="contracts" element={<EmploymentContracts isDarkMode={isDarkMode} />} />
          <Route path="workload" element={<WorkloadTracking isDarkMode={isDarkMode} />} />
          <Route path="task-logs" element={<TaskCompletionLogs isDarkMode={isDarkMode} />} />
          <Route path="staffing-estimator" element={<StaffingEstimator isDarkMode={isDarkMode} />} />
          <Route path="settings" element={<HrSettings isDarkMode={isDarkMode} />} />
        </Route>
          

          {/* GROUP 5: SPECIALIZED STAFF */}
          <Route 
            path="/housekeeping" 
            element={<ProtectedRole><HousekeepingLayout /></ProtectedRole>}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<HKDashboard />} />
            <Route path="tasks" element={<HKTasks />} />
            <Route path="schedule" element={<HKSchedule />} />
            <Route path="rooms" element={<RoomStatusMap />} />
            <Route path="inventory" element={<LinenInventory />} />
            <Route path="maintenance" element={<MaintenanceReport />} />
            <Route path="history" element={<HKHistory />} />
            <Route path="settings" element={<HKSettings />} />
          </Route>

        <Route path="/manager" element={<ProtectedRole><ManagerLayout /></ProtectedRole>}>
          <Route path="dashboard" element={<HotelManagerDashboard />} />
        </Route>

        {/* GROUP 7: INVENTORY MODULE */}
        <Route path="/inventory" element={<ProtectedRole><InventoryLayout /></ProtectedRole>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<InventoryDashboard />} />
          <Route path="stock" element={<StockManagement />} />
          <Route path="movements" element={<StockInOut />} />
          <Route path="alerts" element={<LowStockAlerts isDarkMode={isDarkMode} />} />
          <Route path="reports" element={<ConsumptionReports />} />
          <Route path="simulation" element={<InventorySimulation />} />
          <Route path="history" element={<HistoryLogs />} />
          <Route path="settings" element={<InventorySettings />} />
        </Route>

        {/* GROUP 6: SUPER ADMIN DASHBOARD */}
        <Route 
          path="/admin" 
          element={<ProtectedAdmin><AdminLayout context={{ isDarkMode, setIsDarkMode }} /></ProtectedAdmin>}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="owners" element={<AdminHotelOwner />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="packages" element={<AdminMemPackage />} /> 
          <Route path="logs" element={<AdminSystemLogs />} />
          <Route path="api" element={<AdminAiConfig />} />
          <Route path="maps" element={<AdminMapServices />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* DEFAULT REDIRECT */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}

export default App;
