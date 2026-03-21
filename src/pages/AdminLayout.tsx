import { Outlet, useSearchParams, Link, useLocation } from 'react-router-dom';
import { Users, Calendar, CalendarDays, LogOut, Search, Bell, Settings } from 'lucide-react';

export default function AdminLayout() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const location = useLocation();

  if (!token) return <div className="p-8 text-center text-error font-bold">Missing admin token in URL (?token=yourtoken)</div>;

  return (
    <div className="flex h-screen bg-surface text-on-surface">
      {/* Sidebar */}
      <aside className="w-64 bg-inverse-surface flex flex-col py-8 shadow-xl z-50">
        <div className="px-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
              <Users className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">领航者团队</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">专业管理控制台</p>
            </div>
          </div>
        </div>
        <nav className="flex-1">
          <div className="mb-4 px-6 text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em]">主要功能</div>
          <Link to={`/admin/members?token=${token}`} className={`py-4 px-6 flex items-center gap-3 transition-all ${location.pathname.includes('members') ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : 'text-slate-400 hover:bg-white/5'}`}>
            <Users className="w-5 h-5" />
            <span className="text-sm tracking-wide uppercase font-medium">成员管理</span>
          </Link>
          <Link to={`/admin/calendar?token=${token}`} className={`py-4 px-6 flex items-center gap-3 transition-all ${location.pathname.includes('calendar') ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : 'text-slate-400 hover:bg-white/5'}`}>
            <Calendar className="w-5 h-5" />
            <span className="text-sm tracking-wide uppercase font-medium">月历日程</span>
          </Link>
          <Link to={`/admin/weekly?token=${token}`} className={`py-4 px-6 flex items-center gap-3 transition-all ${location.pathname.includes('weekly') ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : 'text-slate-400 hover:bg-white/5'}`}>
            <CalendarDays className="w-5 h-5" />
            <span className="text-sm tracking-wide uppercase font-medium">周历日程</span>
          </Link>
        </nav>
        <div className="mt-auto px-6 border-t border-white/10 pt-6">
          <button className="text-slate-400 py-4 flex items-center gap-3 hover:bg-white/5 transition-all cursor-pointer w-full text-left">
            <LogOut className="w-5 h-5" />
            <span className="text-sm tracking-wide uppercase font-medium">退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="w-full bg-surface flex justify-between items-center h-16 px-8 border-b border-surface-container-high">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-bold tracking-tight text-on-surface">团队管理系统</h1>
            <div className="relative w-96 ml-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input 
                type="text" 
                placeholder="搜索团队成员、职位或ID..." 
                className="w-full bg-surface-container-highest border-none rounded-md py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-full relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-full">
                <Settings className="w-5 h-5" />
              </button>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant/30"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface leading-none">系统管理员</p>
                <p className="text-[10px] text-on-surface-variant mt-1">超级权限</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                A
              </div>
            </div>
          </div>
        </header>
        
        <Outlet context={{ token }} />
      </main>
    </div>
  );
}
