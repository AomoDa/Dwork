import { useEffect, useState } from 'react';
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
  const [selectedDayMember, setSelectedDayMember] = useState<{ memberId: string, date: string, schedules: Schedule[] } | null>(null);

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

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

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
            const daySchedules = schedules.filter(s => s.date === dateStr && (!selectedMemberId || s.memberId === selectedMemberId));
            const isCurrentMonth = isSameMonth(day, monthStart);

            // Group by memberId
            const groupedByMember = daySchedules.reduce((acc, schedule) => {
              if (!acc[schedule.memberId]) acc[schedule.memberId] = [];
              acc[schedule.memberId].push(schedule);
              return acc;
            }, {} as Record<string, Schedule[]>);

            return (
              <div key={day.toString()} className={`p-2 border-r border-b border-outline-variant/5 ${!isCurrentMonth ? 'bg-surface-container-low/30 text-outline/40' : 'hover:bg-surface-container-low transition-colors'}`}>
                <div className={`text-sm font-semibold mb-2 ${isToday(day) ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-24 no-scrollbar">
                  {Object.entries(groupedByMember).map(([memberId, schedulesArray]) => {
                    const memberSchedules = schedulesArray as Schedule[];
                    const member = members.find(m => m.id === memberId);
                    const hasImage = memberSchedules.some(s => s.image);
                    const contents = memberSchedules.map(s => `${s.timeOfDay === 'AM' ? '上午' : '下午'}: ${s.content}`).join('\n');
                    
                    return (
                      <div 
                        key={memberId} 
                        onClick={() => setSelectedDayMember({ memberId, date: dateStr, schedules: memberSchedules })}
                        className="text-[11px] px-2 py-1 bg-primary-fixed text-on-primary-fixed-variant rounded-sm truncate flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity" 
                        title={`${member?.name}:\n${contents}`}
                      >
                        <span className="truncate font-bold">{member?.name}</span>
                        {hasImage && <ImageIcon className="w-3 h-3 ml-1 shrink-0 opacity-70" />}
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
      {selectedDayMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDayMember(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-surface z-10 pb-2 border-b border-outline-variant/10">
              <h3 className="text-xl font-bold text-on-surface">
                {members.find(m => m.id === selectedDayMember.memberId)?.name} 的行程
              </h3>
              <button onClick={() => setSelectedDayMember(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="text-sm font-bold text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-md inline-block">
                {selectedDayMember.date}
              </div>

              {selectedDayMember.schedules.map(schedule => (
                <div key={schedule.id} className="space-y-4 pb-6 border-b border-outline-variant/10 last:border-0 last:pb-0">
                  <div>
                    <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                      {schedule.timeOfDay === 'AM' ? '上午' : '下午'}
                    </div>
                    <div className="text-on-surface whitespace-pre-wrap bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
                      {schedule.content}
                    </div>
                  </div>

                  {schedule.image && (
                    <div>
                      <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">附件图片</div>
                      <div className="rounded-lg overflow-hidden border border-outline-variant/20">
                        <img src={schedule.image} alt="行程附件" className="w-full h-auto max-h-64 object-contain bg-surface-container-lowest" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
