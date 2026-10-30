import { NavLink } from 'react-router-dom';
import { Scale, FileSignature, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const navItems: NavItem[] = [
  {
    name: 'Contract Auditor',
    path: '/auditor',
    icon: Scale,
    badge: 'Core',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    name: 'Contract Builder',
    path: '/builder',
    icon: FileSignature,
    badge: 'New',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    name: 'Lexi-Counsel',
    path: '/counsel',
    icon: BookOpen,
    badge: 'AI v2',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
];

export interface SidebarProps {
  isSidebarCollapsed?: boolean;
  toggleSidebar?: () => void;
}

export function Sidebar({ isSidebarCollapsed = false, toggleSidebar }: SidebarProps) {
  return (
    <aside
      className={`${
        isSidebarCollapsed ? 'w-16' : 'w-64'
      } bg-[#0c1322] border-r border-slate-800 flex flex-col shrink-0 h-screen transition-all duration-300 ease-in-out select-none`}
    >
      {/* Header / Logo Area */}
      <div
        className={`border-b border-slate-800 bg-[#090e1a] flex items-center ${
          isSidebarCollapsed
            ? 'flex-col justify-center gap-2 p-2.5'
            : 'justify-between p-4 space-x-2'
        }`}
      >
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2.5 min-w-0'}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center text-slate-950 shadow-md ring-1 ring-amber-400/40 shrink-0">
            <Scale className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div className={`flex items-center space-x-1.5 min-w-0 truncate ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            <span className="font-bold tracking-tight text-sm text-white truncate">LexiFlow AI</span>
            <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 shrink-0">
              SECURE
            </span>
          </div>
        </div>

        {toggleSidebar && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition text-slate-400 hover:text-white shrink-0"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        className={`flex-1 overflow-y-auto ${
          isSidebarCollapsed ? 'p-2 space-y-1.5' : 'p-3 space-y-1'
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? `bg-[#141f36] text-white border-l-4 border-amber-400 shadow-md ring-1 ring-inset ring-slate-700/50 rounded-r-md ${
                      isSidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2 justify-between'
                    } text-xs font-semibold flex items-center relative group`
                  : `border-l-4 border-transparent hover:bg-[#0f172a] text-slate-300 hover:text-white ${
                      isSidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2 justify-between'
                    } text-xs font-semibold flex items-center transition-all relative group`
              }
            >
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2 min-w-0'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className={isSidebarCollapsed ? 'hidden' : 'truncate'}>{item.name}</span>
              </div>

              {/* Tag Badge (expanded only) */}
              {!isSidebarCollapsed && item.badge && (
                <span
                  className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ml-2 shrink-0 ${
                    item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Hover Tooltip (collapsed mode) */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex items-center gap-1.5">
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1 py-0.5 rounded border bg-slate-800 text-amber-300 border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / System Status */}
      <div className={`border-t border-slate-800 bg-[#090e1a] ${isSidebarCollapsed ? 'p-3 flex justify-center items-center' : 'p-3 text-xs text-slate-400'}`}>
        {isSidebarCollapsed ? (
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="SOC-2 Enclave Online" />
        ) : (
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">SOC-2 ENCLAVE</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
