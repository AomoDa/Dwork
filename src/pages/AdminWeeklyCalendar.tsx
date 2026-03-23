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
  const [selectedCell, setSelectedCell] = useState<{ memberId: string, date: string } | null>(null);

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
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-on-surface tracking-tight">
          {year}年第{weekNum}周 <span className="text-base font-medium text-on-surface-variant ml-2">({format(weekStart, 'MM/dd')} ~ {format(weekEnd, 'MM/dd')})</span>
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-surface-container-high text-on-surface-variant hover:text-primary px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            导出表格
          </button>
          <div className="flex gap-1">
            <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10 flex flex-col">
        {/* Header Row */}
        <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] bg-surface-container-low text-on-surface-variant border-b border-outline-variant/5">
          <div className="py-2 px-2 text-[11px] font-bold tracking-widest uppercase text-center border-r border-outline-variant/5 flex items-center justify-center">
            队员
          </div>
          {days.map(day => (
            <div key={day.toString()} className="py-2 px-1 text-[11px] font-bold tracking-widest uppercase text-center border-r border-outline-variant/5 last:border-0">
              {format(day, 'E')} <span className="font-medium opacity-70 ml-0.5">{format(day, 'MM/dd')}</span>
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto">
          {members.map(member => (
            <div key={member.id} className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b-[4px] border-surface-container-low last:border-0 hover:bg-surface-container-lowest/50 transition-colors">
              {/* Member Name Column */}
              <div className="py-4 px-2 border-r border-outline-variant/5 flex items-center justify-center font-bold text-[15px] text-on-surface">
                {member.name}
              </div>
              
              {/* Days Columns */}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const amSchedules = schedules.filter(s => s.memberId === member.id && s.date === dateStr && s.timeOfDay === 'AM');
                const pmSchedules = schedules.filter(s => s.memberId === member.id && s.date === dateStr && s.timeOfDay === 'PM');

                const hasSchedules = amSchedules.length > 0 || pmSchedules.length > 0;

                return (
                  <div 
                    key={day.toString()} 
                    onClick={() => {
                      if (hasSchedules) {
                        setSelectedCell({ memberId: member.id, date: dateStr });
                      }
                    }}
                    className={`p-2 border-r border-outline-variant/5 last:border-0 flex flex-row gap-1.5 justify-center items-center transition-colors ${hasSchedules ? 'bg-primary/5 hover:bg-primary/10 cursor-pointer' : ''}`}
                  >
                    {/* AM Block */}
                    {amSchedules.length > 0 ? (
                      <div className="flex-1 h-[32px] bg-primary text-white text-[11px] rounded-md text-center font-medium shadow-sm flex items-center justify-center gap-1">
                        上午
                        {amSchedules.some(s => s.image) && <ImageIcon className="w-3 h-3 opacity-80" />}
                      </div>
                    ) : (
                      <div className="flex-1 h-[32px] flex items-center justify-center bg-surface-container-low/30 text-outline-variant/40 text-[11px] rounded-md border border-dashed border-outline-variant/20">上午</div>
                    )}
                    
                    {/* PM Block */}
                    {pmSchedules.length > 0 ? (
                      <div className="flex-1 h-[32px] bg-primary text-white text-[11px] rounded-md text-center font-medium shadow-sm flex items-center justify-center gap-1">
                        下午
                        {pmSchedules.some(s => s.image) && <ImageIcon className="w-3 h-3 opacity-80" />}
                      </div>
                    ) : (
                      <div className="flex-1 h-[32px] flex items-center justify-center bg-surface-container-low/30 text-outline-variant/40 text-[11px] rounded-md border border-dashed border-outline-variant/20">下午</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Detail Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCell(null)}>
          <div className="bg-surface rounded-2xl w-full max-w-3xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/10">
              <h3 className="text-xl font-bold text-on-surface">
                {members.find(m => m.id === selectedCell.memberId)?.name} 的本周行程
              </h3>
              <button onClick={() => setSelectedCell(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden min-h-[400px]">
              {/* Sidebar Tabs for Days */}
              <div className="w-1/3 border-r border-outline-variant/10 bg-surface-container-lowest overflow-y-auto p-4 space-y-2">
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const daySchedules = schedules.filter(s => s.memberId === selectedCell.memberId && s.date === dateStr);
                  const hasData = daySchedules.length > 0;
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedCell({ ...selectedCell, date: dateStr })}
                      className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-between ${
                        selectedCell.date === dateStr 
                          ? 'bg-primary text-white shadow-md' 
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span>{format(day, 'MM/dd')} ({format(day, 'E')})</span>
                      {hasData && (
                        <div className={`w-2 h-2 rounded-full ${selectedCell.date === dateStr ? 'bg-white' : 'bg-primary'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Content Area */}
              <div className="w-2/3 p-6 overflow-y-auto bg-surface">
                <div className="space-y-8">
                  {['AM', 'PM'].map(timeOfDay => {
                    const timeSchedules = schedules.filter(s => s.date === selectedCell.date && s.memberId === selectedCell.memberId && s.timeOfDay === timeOfDay);
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
              </div>
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
