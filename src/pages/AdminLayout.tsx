import { Outlet, useSearchParams, Link, useLocation } from 'react-router-dom';
import { Users, Calendar, CalendarDays, LogOut } from 'lucide-react';

export default function AdminLayout() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const location = useLocation();

  if (!token) return <div className="p-8 text-center text-error font-bold">ERROR:无权限</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-surface text-on-surface">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-inverse-surface flex-col py-8 shadow-xl z-50">
        <div className="px-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
              <Users className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">行事历</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">管理控制台</p>
            </div>
          </div>
        </div>
        <nav className="flex-1">
          <div className="mb-4 px-6 text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em]">主要功能</div>
          <Link to={`/admin/weekly?token=${token}`} className={`py-4 px-6 flex items-center gap-3 transition-all ${location.pathname.includes('weekly') ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : 'text-slate-400 hover:bg-white/5'}`}>
            <CalendarDays className="w-5 h-5" />
            <span className="text-sm tracking-wide uppercase font-medium">周历日程</span>
          </Link>
          <Link to={`/admin/members?token=${token}`} className={`py-4 px-6 flex items-center gap-3 transition-all ${location.pathname.includes('members') ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : 'text-slate-400 hover:bg-white/5'}`}>
            <Users className="w-5 h-5" />
            <span className="text-sm tracking-wide uppercase font-medium">成员管理</span>
          </Link>
        </nav>
        <div className="mt-auto px-6 border-t border-white/10 pt-6">
          <button className="text-slate-400 py-4 flex items-center gap-3 hover:bg-white/5 transition-all cursor-pointer w-full text-left">
            <LogOut className="w-5 h-5" />
            <span className="text-sm tracking-wide uppercase font-medium">退出登录</span>
          </button>
        </div>
      </aside>

      {/* Top Header (Mobile) */}
      <header className="md:hidden bg-inverse-surface text-white p-4 flex items-center justify-between shadow-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center">
            <Users className="text-white w-5 h-5" />
          </div>
          <h2 className="font-black text-lg tracking-tight">管理控制台</h2>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative pb-16 md:pb-0">
        <Outlet context={{ token }} />
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-inverse-surface flex shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 pb-[env(safe-area-inset-bottom)]">
        <Link to={`/admin/weekly?token=${token}`} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${location.pathname.includes('weekly') ? 'text-blue-400' : 'text-slate-400'}`}>
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-medium">周历日程</span>
        </Link>
        <Link to={`/admin/members?token=${token}`} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${location.pathname.includes('members') ? 'text-blue-400' : 'text-slate-400'}`}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">成员管理</span>
        </Link>
      </nav>
    </div>
  );
}
