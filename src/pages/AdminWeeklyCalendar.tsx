import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, getISOWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [exportEndDate, setExportEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

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

  const handleExport = () => {
    const start = startOfWeek(new Date(exportStartDate), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(exportEndDate), { weekStartsOn: 1 });
    
    if (start > end) {
      alert('开始时间不能晚于结束时间');
      return;
    }

    const wb = XLSX.utils.book_new();
    let currentWeekStart = start;

    while (currentWeekStart <= end) {
      const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
      
      const sheetData: any[][] = [];
      const header = ['队员', ...weekDays.map(d => `${format(d, 'MM/dd')} (${format(d, 'E')})`)];
      sheetData.push(header);
      
      members.forEach(member => {
        const row = [member.name];
        weekDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const amSchedules = schedules.filter(s => s.memberId === member.id && s.date === dateStr && s.timeOfDay === 'AM');
          const pmSchedules = schedules.filter(s => s.memberId === member.id && s.date === dateStr && s.timeOfDay === 'PM');
          
          let cellText = '';
          if (amSchedules.length > 0) {
            cellText += `[上午]\n${amSchedules.map(s => s.content).join('\n')}\n`;
          }
          if (pmSchedules.length > 0) {
            cellText += `[下午]\n${pmSchedules.map(s => s.content).join('\n')}`;
          }
          row.push(cellText.trim());
        });
        sheetData.push(row);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [{ wch: 15 }, ...weekDays.map(() => ({ wch: 25 }))];
      
      const sheetName = `第${getISOWeek(currentWeekStart)}周(${format(currentWeekStart, 'MM.dd')}-${format(currentWeekEnd, 'MM.dd')})`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
      
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }
    
    XLSX.writeFile(wb, `日程导出_${format(start, 'yyyyMMdd')}-${format(end, 'yyyyMMdd')}.xlsx`);
    setShowExportModal(false);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-on-surface tracking-tight">
          {year}年第{weekNum}周 <span className="text-lg font-medium text-on-surface-variant ml-2">({format(weekStart, 'MM/dd')} ~ {format(weekEnd, 'MM/dd')})</span>
        </h2>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-surface-container-high text-on-surface-variant hover:text-primary px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            导出表格
          </button>
          <div className="flex gap-2">
            <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-surface-container-high transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowExportModal(false)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-on-surface">导出日程表格</h3>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">开始周 (选择该周任意一天)</label>
                <input 
                  type="date" 
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">结束周 (选择该周任意一天)</label>
                <input 
                  type="date" 
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all outline-none"
                />
              </div>
              <p className="text-xs text-on-surface-variant">
                导出将包含所选日期所在的整个自然周。每个自然周将生成一个独立的 Excel Sheet。
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowExportModal(false)} 
                className="px-4 py-2 text-sm font-bold text-on-surface bg-surface-container-high hover:bg-surface-container-highest rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleExport} 
                className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-lg shadow-md shadow-primary/20 transition-colors"
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
