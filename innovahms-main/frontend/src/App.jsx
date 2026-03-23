import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


// Layouts
import CustomerLayout from "./layouts/CustomerLayout";
import OwnerLayout from "./layouts/OwnerLayout"; 

// Owner Pages 
import OwnerDashboard from "./pages/owner/Dashboard";
import OwnerRooms from "./pages/owner/Rooms";
import OwnerReservations from "./pages/owner/Reservations";
import OwnerCustomers from "./pages/owner/Customers";
import OwnerHousekeeping from "./pages/owner/Housekeeping";
import OwnerInventory from "./pages/owner/Inventory";
import OwnerStaff from "./pages/owner/Staff";
import OwnerReports from "./pages/owner/Reports";
import OwnerReviews from "./pages/owner/Reviews";
import OwnerLogin from "./pages/owner/OwnerLogin"; 
import OwnerSignUp from "./pages/owner/OwnerSignUp";

import GuestsOffer from "./components/GuestsOffer";
import ViewRecommendations from "./components/ViewRecommendations";




// Customer Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Booking from "./pages/Booking";
import Profile from "./pages/Profile";
import Features from "./pages/Features";
import AboutUs from "./pages/AboutUs";
import VisionSuites from './pages/customer/VisionSuites';
import Rewards from "./pages/customer/Rewards";

import CustomerDashboard from "./customer/CustomerDashboard";
import InnovaSuites from "./customer/InnovaSuites";

function App() {

  const userData = JSON.parse(localStorage.getItem('user')); 
  const isLoggedIn = !!userData; 
  const userRole = userData?.role || (isLoggedIn ? 'customer' : 'guest');
  console.log("Status:", isLoggedIn, userRole);
  return (
    <Router>
      <Routes>
        {/* --- CUSTOMER ROUTES --- */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/innova-suites" element={<InnovaSuites />} />
          <Route path="/rewards" element={<Rewards />} />
          
          
          <Route path="/offers" element={<GuestsOffer isLoggedIn={isLoggedIn} />} />
          <Route 
            path="/recommendations" 
            element={<ViewRecommendations isLoggedIn={isLoggedIn} userType={userRole} />} 
          />
          
          {/* Placeholders */}
           <Route path="/features" element={<Features />} />
          <Route path="/vision-suites" element={<VisionSuites />} />
           <Route path="/about" element={<AboutUs />} />
        </Route>

        {/* --- OWNER AUTH (No Sidebar) --- */}
        <Route path="/owner/login" element={<OwnerLogin />} />
        {/* Add this line here */}
        <Route path="/signup/owner" element={<OwnerSignUp />} />

        {/* --- OWNER PROTECTED ROUTES (With Sidebar) --- */}
        <Route path="/owner" element={<OwnerLayout />}>
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
        
      </Routes>
    </Router>
  );
}

export default App;
