import { NavLink } from 'react-router-dom';
import { Scale, FileSignature, BookOpen } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    name: 'Contract Auditor',
    path: '/auditor',
    icon: Scale,
  },
  {
    name: 'Contract Builder',
    path: '/builder',
    icon: FileSignature,
  },
  {
    name: 'Lexi-Counsel',
    path: '/counsel',
    icon: BookOpen,
  },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#0c1322] border-r border-slate-800 flex flex-col shrink-0 h-screen">
      {/* Header / Logo Area */}
      <div className="p-4 border-b border-slate-800 bg-[#090e1a] flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center text-slate-950 shadow-md ring-1 ring-amber-400/40 shrink-0">
          <Scale className="w-4 h-4 stroke-[2.4]" />
        </div>
        <span className="font-bold tracking-tight text-sm text-white">LexiFlow AI</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? 'bg-[#141f36] text-white border-l-4 border-amber-400 shadow-md ring-1 ring-inset ring-slate-700/50 rounded-r-md px-3 py-2 text-xs font-semibold flex items-center space-x-2'
                  : 'border-l-4 border-transparent hover:bg-[#0f172a] text-slate-300 hover:text-white px-3 py-2 text-xs font-semibold flex items-center space-x-2 transition-all'
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-slate-800 bg-[#090e1a] text-xs text-slate-400">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">SOC-2 ENCLAVE</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
