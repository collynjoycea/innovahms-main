import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import OwnerSidebar from '../components/OwnerSidebar'; 
import OwnerHeader from '../components/OwnerHeader'; 

const OwnerLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem('ownerSession'); 
    
    if (!session) {
      navigate('/owner/login', { replace: true });
      return;
    }
    
    try {
      const parsed = JSON.parse(session);
      if (!parsed?.email) {
        localStorage.removeItem('ownerSession');
        navigate('/owner/login', { replace: true });
      }
    } catch {
      localStorage.removeItem('ownerSession');
      navigate('/owner/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex h-screen bg-gray-50">
      <OwnerSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <OwnerHeader />

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;