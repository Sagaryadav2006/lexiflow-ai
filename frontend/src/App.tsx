import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ReviewWorkspace } from './components/ReviewWorkspace';
import { Sidebar } from './components/Sidebar';
import { ContractBuilder } from './pages/ContractBuilder';
import { LexiCounsel } from './pages/LexiCounsel';

export function AppLayout() {
  return (
    <div className="bg-slate-950 text-white min-h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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
