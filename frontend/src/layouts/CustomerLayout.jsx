import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header"; // Siguraduhin na tama ang path ng Header mo
import Footer from "../components/Footer";
import GlobalAIAssistant from "../components/GlobalAIAssistant";

const CustomerLayout = () => {
  const location = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = (savedTheme || (prefersDark ? "dark" : "light")) === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    };

    applyTheme();
    window.addEventListener("themeChanged", applyTheme);
    window.addEventListener("storage", applyTheme);
    return () => {
      window.removeEventListener("themeChanged", applyTheme);
      window.removeEventListener("storage", applyTheme);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300">
      {/* Lalabas ang Header sa lahat ng pages sa ilalim ng layout na ito */}
      <Header /> 
      
      <main className="min-h-screen pt-20">
        {/* Dito mag-rerender ang mga pages gaya ng Home, Login, at StaffLogin */}
        <Outlet /> 
      </main>

      <Footer />
      <GlobalAIAssistant />
    </div>
  );
};

export default CustomerLayout;
