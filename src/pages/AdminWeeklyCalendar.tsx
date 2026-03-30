import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getISOWeek, getISOWeekYear } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Download, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

const CUTOFF_DATE = new Date('2026-03-23T00:00:00');

export default function AdminWeeklyCalendar() {
  const { token } = useOutletContext<{ token: string }>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return now.getTime() < CUTOFF_DATE.getTime() ? CUTOFF_DATE : now;
  });
  const [loading, setLoading] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState<{ memberId: string, dateStr: string } | null>(null);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  // Generate available weeks for export dropdown (from cutoff date to next week)
  const availableExportWeeks = useMemo(() => {
    const weeksList = [];
    const today = new Date();
    const endLimit = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
    let current = startOfWeek(CUTOFF_DATE, { weekStartsOn: 1 });
    
    while (current.getTime() <= endLimit.getTime()) {
      const end = endOfWeek(current, { weekStartsOn: 1 });
      const year = getISOWeekYear(current).toString();
      const isoWeek = getISOWeek(current).toString().padStart(2, '0');
      weeksList.push({
        value: `${year}-W${isoWeek}`,
        label: `${format(current, 'yy')}年第${getISOWeek(current)}周 ${format(current, 'MM.dd')}-${format(end, 'MM.dd')}`,
        start: current
      });
      current = addWeeks(current, 1);
    }
    return weeksList.reverse(); // Newest first
  }, []);

  const [exportWeek, setExportWeek] = useState(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const targetDate = currentWeekStart.getTime() < CUTOFF_DATE.getTime() ? CUTOFF_DATE : now;
    return `${getISOWeekYear(targetDate)}-W${getISOWeek(targetDate).toString().padStart(2, '0')}`;
  });

  const weeks = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const start = subWeeks(startOfWeek(currentDate, { weekStartsOn: 1 }), 4 - i);
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return {
        start,
        end,
        dateStr: format(start, 'yyyy-MM-dd'),
        label: `${format(start, 'yy')}年第${getISOWeek(start)}周`,
        subLabel: `${format(start, 'MM.dd')}-${format(end, 'MM.dd')}`
      };
    }).filter(w => w.start.getTime() >= CUTOFF_DATE.getTime());
  }, [currentDate]);

  const canGoPrev = weeks.length > 0 && weeks[0].start.getTime() > CUTOFF_DATE.getTime();
  const maxAllowedDate = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
  const canGoNext = weeks.length > 0 && weeks[weeks.length - 1].start.getTime() < maxAllowedDate.getTime();

  const nextWeek = () => {
    if (canGoNext) {
      const nextDate = addWeeks(currentDate, 5);
      setCurrentDate(nextDate.getTime() > maxAllowedDate.getTime() ? maxAllowedDate : nextDate);
    }
  };
  const prevWeek = () => {
    if (canGoPrev) {
      setCurrentDate(subWeeks(currentDate, 5));
    }
  };

  const scheduleMap = useMemo(() => {
    const map = new Map<string, Schedule>();
    schedules.forEach(s => {
      const weekStartStr = format(startOfWeek(new Date(s.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const key = `${s.memberId}-${weekStartStr}`;
      if (s.image || !map.has(key)) {
        map.set(key, s);
      }
    });
    return map;
  }, [schedules]);

  const handleExport = async () => {
    if (!exportWeek) {
      alert('请选择要导出的周');
      return;
    }
    
    const [year, week] = exportWeek.split('-W');
    const jan4 = new Date(parseInt(year), 0, 4);
    const start = addWeeks(startOfWeek(jan4, { weekStartsOn: 1 }), parseInt(week) - 1);
    const end = endOfWeek(start, { weekStartsOn: 1 });
    const weekStr = format(start, 'yyyy-MM-dd');
    
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folderName = `${format(start, 'yy')}年第${getISOWeek(start)}周${format(start, 'MM.dd')}-${format(end, 'MM.dd')}`;
      const folder = zip.folder(folderName);
      let hasImages = false;

      members.forEach(member => {
        const schedule = scheduleMap.get(`${member.id}-${weekStr}`);
        if (schedule && schedule.image) {
          const base64Data = schedule.image.split(',')[1];
          if (base64Data && folder) {
            folder.file(`${member.name}.jpg`, base64Data, { base64: true });
            hasImages = true;
          }
        }
      });

      if (!hasImages) {
        alert('该周没有可导出的行程图片');
        setIsExporting(false);
        return;
      }

      const zipName = `${folderName}.zip`;
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, zipName);
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline gap-2">
            行程概览
            {weeks.length > 0 && (
              <span className="text-sm font-medium text-slate-500 tracking-wide">({weeks[0].label} ~ {weeks[weeks.length - 1].label})</span>
            )}
          </h2>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-surface-container-high text-on-surface-variant hover:text-primary px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            导出表格
          </button>
          <div className="flex gap-1">
            <button 
              onClick={prevWeek} 
              disabled={!canGoPrev}
              className={`p-1.5 rounded-lg transition-colors ${canGoPrev ? 'hover:bg-surface-container-high' : 'opacity-30 cursor-not-allowed'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextWeek} 
              disabled={!canGoNext}
              className={`p-1.5 rounded-lg transition-colors ${canGoNext ? 'hover:bg-surface-container-high' : 'opacity-30 cursor-not-allowed'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200/60 flex flex-col">
        {/* Header Row */}
        <div 
          className="grid bg-slate-50/80 text-slate-500 border-b border-slate-200/60"
          style={{ gridTemplateColumns: `90px repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          <div className="py-3 px-2 text-[12px] font-bold tracking-widest uppercase text-center border-r border-slate-200/60 flex items-center justify-center">
            队员
          </div>
          {weeks.map(week => (
            <div key={week.dateStr} className="py-3 px-1 text-[12px] font-bold tracking-widest uppercase text-center border-r border-slate-200/60 last:border-0 flex flex-col items-center justify-center">
              <span>{week.label}</span>
              <span className="font-medium opacity-70 mt-0.5">{week.subLabel}</span>
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto">
          {members.map(member => (
            <div 
              key={member.id} 
              className="grid border-b-[4px] border-slate-50/80 last:border-0 hover:bg-slate-50/50 transition-colors group"
              style={{ gridTemplateColumns: `90px repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
              {/* Member Name Column */}
              <div className="py-4 px-2 border-r border-slate-200/60 flex items-center justify-center font-bold text-[15px] text-slate-800 bg-white group-hover:bg-slate-50/50 transition-colors">
                {member.name}
              </div>
              
              {/* Weeks Columns */}
              {weeks.map(week => {
                const schedule = scheduleMap.get(`${member.id}-${week.dateStr}`);

                return (
                  <div 
                    key={week.dateStr} 
                    className="p-2 border-r border-slate-200/60 last:border-0 flex justify-center items-center transition-colors"
                  >
                    {schedule?.image ? (
                      <div 
                        className="w-16 h-16 rounded-lg overflow-hidden cursor-pointer border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                        onClick={() => setEnlargedImage({ memberId: member.id, dateStr: week.dateStr })}
                      >
                        <img src={schedule.image} className="w-full h-full object-cover" alt="行程打卡" loading="lazy" />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {members.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium">暂无队员数据</div>
          )}
        </div>
      </div>

      {/* Enlarged Image Modal */}
      {enlargedImage && (() => {
        const schedule = scheduleMap.get(`${enlargedImage.memberId}-${enlargedImage.dateStr}`);

        const member = members.find(m => m.id === enlargedImage.memberId);
        const d = new Date(enlargedImage.dateStr);
        const end = endOfWeek(d, { weekStartsOn: 1 });
        const periodText = `${format(d, 'yy')}年第${getISOWeek(d)}周 (${format(d, 'MM.dd')}-${format(end, 'MM.dd')})`;

        const currentMemberIdx = members.findIndex(m => m.id === enlargedImage.memberId);

        const canNavUp = currentMemberIdx > 0;
        const canNavDown = currentMemberIdx < members.length - 1;

        const tempDLeft = subWeeks(d, 1);
        const canNavLeft = tempDLeft.getTime() >= CUTOFF_DATE.getTime();

        const tempDRight = addWeeks(d, 1);
        const maxAllowed = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
        const canNavRight = tempDRight.getTime() <= maxAllowed.getTime();

        const navigate = (direction: 'up' | 'down' | 'left' | 'right', e: React.MouseEvent) => {
          e.stopPropagation();
          if (direction === 'up' && canNavUp) {
            setEnlargedImage({ memberId: members[currentMemberIdx - 1].id, dateStr: enlargedImage.dateStr });
          } else if (direction === 'down' && canNavDown) {
            setEnlargedImage({ memberId: members[currentMemberIdx + 1].id, dateStr: enlargedImage.dateStr });
          } else if (direction === 'left' && canNavLeft) {
            setEnlargedImage({ memberId: enlargedImage.memberId, dateStr: format(tempDLeft, 'yyyy-MM-dd') });
          } else if (direction === 'right' && canNavRight) {
            setEnlargedImage({ memberId: enlargedImage.memberId, dateStr: format(tempDRight, 'yyyy-MM-dd') });
          }
        };

        return (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setEnlargedImage(null)}>
            {/* Header Info */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-white z-10" onClick={e => e.stopPropagation()}>
              <div className="text-xl font-bold tracking-wider mb-1">{member?.name}</div>
              <div className="text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">{periodText}</div>
            </div>

            {/* Close Button */}
            <button className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-10" onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }}>
              <X className="w-6 h-6" />
            </button>

            {/* Navigation Arrows */}
            {canNavUp && (
              <button onClick={(e) => navigate('up', e)} className="absolute top-24 left-1/2 -translate-x-1/2 text-white bg-white/20 hover:bg-white/40 p-4 rounded-full transition-all z-10 group border border-white/30 shadow-xl backdrop-blur-md">
                <ChevronUp className="w-8 h-8" />
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[12px] font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/80 px-3 py-1.5 rounded-md text-white">上一队员</span>
              </button>
            )}
            {canNavDown && (
              <button onClick={(e) => navigate('down', e)} className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white bg-white/20 hover:bg-white/40 p-4 rounded-full transition-all z-10 group border border-white/30 shadow-xl backdrop-blur-md">
                <ChevronDown className="w-8 h-8" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-[12px] font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/80 px-3 py-1.5 rounded-md text-white">下一队员</span>
              </button>
            )}
            {canNavLeft && (
              <button onClick={(e) => navigate('left', e)} className="absolute left-8 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 p-4 rounded-full transition-all z-10 group border border-white/30 shadow-xl backdrop-blur-md">
                <ChevronLeft className="w-8 h-8" />
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[12px] font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/80 px-3 py-1.5 rounded-md text-white">上一周</span>
              </button>
            )}
            {canNavRight && (
              <button onClick={(e) => navigate('right', e)} className="absolute right-8 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 p-4 rounded-full transition-all z-10 group border border-white/30 shadow-xl backdrop-blur-md">
                <ChevronRight className="w-8 h-8" />
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[12px] font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black/80 px-3 py-1.5 rounded-md text-white">下一周</span>
              </button>
            )}

            <div className="relative max-w-[85vw] max-h-[75vh] w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {schedule?.image ? (
                <img src={schedule.image} className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" alt="放大图片" />
              ) : (
                <div className="flex flex-col items-center justify-center text-white/50 bg-white/5 rounded-2xl w-full max-w-md aspect-video border border-white/10 shadow-2xl">
                  <span className="text-2xl font-medium tracking-widest">无图片</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !isExporting && setShowExportModal(false)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-on-surface">导出行程图片</h3>
              <button onClick={() => !isExporting && setShowExportModal(false)} disabled={isExporting} className="p-2 hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">选择导出周</label>
                <select 
                  value={exportWeek}
                  onChange={(e) => setExportWeek(e.target.value)}
                  disabled={isExporting}
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all outline-none disabled:opacity-50 appearance-none cursor-pointer"
                >
                  {availableExportWeeks.map(week => (
                    <option key={week.value} value={week.value}>
                      {week.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-on-surface-variant">
                将导出所选周的所有队员行程图片，打包为 ZIP 文件。图片将以队员姓名命名。
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowExportModal(false)} 
                disabled={isExporting}
                className="px-4 py-2 text-sm font-bold text-on-surface bg-surface-container-high hover:bg-surface-container-highest rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button 
                onClick={handleExport} 
                disabled={isExporting}
                className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-lg shadow-md shadow-primary/20 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isExporting ? '打包中...' : '确认导出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
