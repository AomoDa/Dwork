import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, getISOWeek } from 'date-fns';
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

export default function AdminWeeklyCalendar() {
  const { token } = useOutletContext<{ token: string }>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekNum = getISOWeek(currentDate);
  const year = format(weekStart, 'yyyy');

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-on-surface tracking-tight">
          {year}年第{weekNum}周 <span className="text-lg font-medium text-on-surface-variant ml-2">({format(weekStart, 'MM/dd')} ~ {format(weekEnd, 'MM/dd')})</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10 flex flex-col">
        {/* Header Row */}
        <div className="grid grid-cols-[100px_repeat(7,minmax(0,1fr))] bg-surface-container-low text-on-surface-variant border-b border-outline-variant/5">
          <div className="py-3 px-4 text-xs font-bold tracking-widest uppercase text-center border-r border-outline-variant/5 flex items-center justify-center">
            队员
          </div>
          {days.map(day => (
            <div key={day.toString()} className="py-3 px-2 text-xs font-bold tracking-widest uppercase text-center border-r border-outline-variant/5 last:border-0">
              {format(day, 'E')} <span className="font-medium opacity-70 ml-1">{format(day, 'MM/dd')}</span>
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto">
          {members.map(member => (
            <div key={member.id} className="grid grid-cols-[100px_repeat(7,minmax(0,1fr))] border-b border-outline-variant/5 last:border-0 hover:bg-surface-container-lowest/50 transition-colors">
              {/* Member Name Column */}
              <div className="py-4 px-2 border-r border-outline-variant/5 flex items-center justify-center font-bold text-sm text-on-surface">
                {member.name}
              </div>
              
              {/* Days Columns */}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const amSchedules = schedules.filter(s => s.memberId === member.id && s.date === dateStr && s.timeOfDay === 'AM');
                const pmSchedules = schedules.filter(s => s.memberId === member.id && s.date === dateStr && s.timeOfDay === 'PM');

                return (
                  <div key={day.toString()} className="p-2 border-r border-outline-variant/5 last:border-0 flex flex-col gap-2">
                    {/* AM Block */}
                    <div className={`flex-1 rounded-md p-2 text-xs transition-all flex flex-col gap-1 ${amSchedules.length > 0 ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-surface-container-low/30 text-outline-variant/50 border border-dashed border-outline-variant/20'}`}>
                      <div className="font-bold mb-1 opacity-70 text-[10px] uppercase">上午</div>
                      {amSchedules.length > 0 ? (
                        amSchedules.map(schedule => (
                          <div 
                            key={schedule.id}
                            onClick={() => setSelectedSchedule(schedule)}
                            className="flex flex-col gap-1 cursor-pointer hover:opacity-80 bg-black/5 p-1.5 rounded"
                          >
                            <span className="line-clamp-2 leading-tight">{schedule.content}</span>
                            {schedule.image && <ImageIcon className="w-3 h-3 opacity-70 mt-0.5" />}
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px]">-</span>
                      )}
                    </div>
                    
                    {/* PM Block */}
                    <div className={`flex-1 rounded-md p-2 text-xs transition-all flex flex-col gap-1 ${pmSchedules.length > 0 ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-surface-container-low/30 text-outline-variant/50 border border-dashed border-outline-variant/20'}`}>
                      <div className="font-bold mb-1 opacity-70 text-[10px] uppercase">下午</div>
                      {pmSchedules.length > 0 ? (
                        pmSchedules.map(schedule => (
                          <div 
                            key={schedule.id}
                            onClick={() => setSelectedSchedule(schedule)}
                            className="flex flex-col gap-1 cursor-pointer hover:opacity-80 bg-black/5 p-1.5 rounded"
                          >
                            <span className="line-clamp-2 leading-tight">{schedule.content}</span>
                            {schedule.image && <ImageIcon className="w-3 h-3 opacity-70 mt-0.5" />}
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px]">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Detail Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSchedule(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-on-surface">
                {members.find(m => m.id === selectedSchedule.memberId)?.name} 的行程
              </h3>
              <button onClick={() => setSelectedSchedule(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">时间</div>
                <div className="text-on-surface font-medium">
                  {selectedSchedule.date} {selectedSchedule.timeOfDay === 'AM' ? '上午' : '下午'}
                </div>
              </div>
              
              <div>
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">提报内容</div>
                <div className="text-on-surface whitespace-pre-wrap bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
                  {selectedSchedule.content}
                </div>
              </div>

              {selectedSchedule.image && (
                <div>
                  <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">附件图片</div>
                  <div className="rounded-lg overflow-hidden border border-outline-variant/20">
                    <img src={selectedSchedule.image} alt="行程附件" className="w-full h-auto max-h-64 object-contain bg-surface-container-lowest" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
