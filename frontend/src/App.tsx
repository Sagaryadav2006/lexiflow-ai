import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ReviewWorkspace } from './components/ReviewWorkspace';
import { Sidebar } from './components/Sidebar';
import { ContractBuilder } from './pages/ContractBuilder';
import { LexiCounsel } from './pages/LexiCounsel';

export function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lexiflow_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('lexiflow_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen flex">
      <Sidebar isSidebarCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <main className="flex-1 min-h-screen overflow-x-hidden bg-[#f8f7f4] flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/auditor" replace />} />
          <Route path="/auditor" element={<ReviewWorkspace />} />
          <Route path="/builder" element={<ContractBuilder />} />
          <Route path="/counsel" element={<LexiCounsel />} />
          <Route path="*" element={<Navigate to="/auditor" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
