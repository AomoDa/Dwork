import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';

interface Schedule {
  id: string;
  memberId: string;
  date: string;
  timeOfDay: 'AM' | 'PM';
  content: string;
  type: string;
  image?: string;
}

interface Member {
  id: string;
  name: string;
}

export default function AdminCalendar() {
  const { token } = useOutletContext<{ token: string }>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  
  // Modal state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedTabMemberId, setSelectedTabMemberId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/schedules?token=${token}`).then(res => res.json()),
      fetch(`/api/admin/members?token=${token}`).then(res => res.json())
    ]).then(([schedulesData, membersData]) => {
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);
  const startDate = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const endDate = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const activeMemberIds = useMemo(() => new Set(members.map(m => m.id)), [members]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach(s => {
      if (!activeMemberIds.has(s.memberId)) return;
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    });
    return map;
  }, [schedules, activeMemberIds]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-on-surface tracking-tight">
          {format(currentMonth, 'yyyy年MM月')}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Member Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedMemberId(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedMemberId === null 
              ? 'bg-primary text-white shadow-sm' 
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          全部队员
        </button>
        {members.map(member => (
          <button
            key={member.id}
            onClick={() => setSelectedMemberId(member.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedMemberId === member.id 
                ? 'bg-primary text-white shadow-sm' 
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {member.name}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10 flex flex-col">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-surface-container-low text-on-surface-variant border-b border-outline-variant/5">
          {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(day => (
            <div key={day} className="py-3 px-4 text-xs font-bold tracking-widest uppercase text-center">{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
          {days.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const daySchedules = (schedulesByDate.get(dateStr) || []).filter(s => !selectedMemberId || s.memberId === selectedMemberId);
            const isCurrentMonth = isSameMonth(day, monthStart);

            // Group by memberId
            const groupedByMember = daySchedules.reduce((acc, schedule) => {
              if (!acc[schedule.memberId]) acc[schedule.memberId] = [];
              acc[schedule.memberId].push(schedule);
              return acc;
            }, {} as Record<string, Schedule[]>);

            const hasSchedules = Object.keys(groupedByMember).length > 0;

            return (
              <div 
                key={day.toString()} 
                onClick={() => {
                  if (hasSchedules) {
                    setSelectedDateStr(dateStr);
                    setSelectedTabMemberId(Object.keys(groupedByMember)[0]);
                  }
                }}
                className={`p-2 border-r border-b border-outline-variant/5 flex flex-col ${hasSchedules ? 'cursor-pointer' : ''} ${!isCurrentMonth ? 'bg-surface-container-low/30 text-outline/40' : 'hover:bg-surface-container-low transition-colors'}`}
              >
                <div className={`text-sm font-semibold mb-auto ${isToday(day) ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="flex flex-wrap gap-1 mt-2 justify-start">
                  {Object.keys(groupedByMember).map(memberId => {
                    const member = members.find(m => m.id === memberId);
                    if (!member) return null;
                    return (
                      <div 
                        key={memberId} 
                        className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold shadow-sm"
                        title={member.name}
                      >
                        {member.name.charAt(0)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Detail Modal */}
      {selectedDateStr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDateStr(null)}>
          <div className="bg-surface rounded-2xl w-full max-w-3xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/10">
              <h3 className="text-xl font-bold text-on-surface">
                {selectedDateStr} 日程详情
              </h3>
              <button onClick={() => setSelectedDateStr(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden min-h-[400px]">
              {/* Sidebar Tabs */}
              <div className="w-1/3 border-r border-outline-variant/10 bg-surface-container-lowest overflow-y-auto p-4 space-y-2">
                {members.filter(m => (schedulesByDate.get(selectedDateStr) || []).some(s => s.memberId === m.id)).map(member => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedTabMemberId(member.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-3 ${
                      selectedTabMemberId === member.id 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${selectedTabMemberId === member.id ? 'bg-white/20' : 'bg-surface-container-high text-primary'}`}>
                      {member.name.charAt(0)}
                    </div>
                    {member.name}
                  </button>
                ))}
              </div>
              
              {/* Content Area */}
              <div className="w-2/3 p-6 overflow-y-auto bg-surface">
                {selectedTabMemberId && (
                  <div className="space-y-8">
                    {['AM', 'PM'].map(timeOfDay => {
                      const timeSchedules = (schedulesByDate.get(selectedDateStr) || []).filter(s => s.memberId === selectedTabMemberId && s.timeOfDay === timeOfDay);
                      return (
                        <div key={timeOfDay} className="space-y-4">
                          <div className="text-sm font-bold text-primary uppercase tracking-wider border-b border-outline-variant/10 pb-2">
                            {timeOfDay === 'AM' ? '上午' : '下午'}
                          </div>
                          {timeSchedules.length > 0 ? (
                            timeSchedules.map(schedule => (
                              <div key={schedule.id} className="space-y-3">
                                <div className="text-on-surface whitespace-pre-wrap bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 text-sm">
                                  {schedule.content}
                                </div>
                                {schedule.image && (
                                  <div className="rounded-xl overflow-hidden border border-outline-variant/20">
                                    <img src={schedule.image} alt="行程附件" className="w-full h-auto max-h-64 object-contain bg-surface-container-lowest" />
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-on-surface-variant/50 italic py-2">无行程安排</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
