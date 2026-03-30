import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isAfter, startOfDay, getISOWeek } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar as CalendarIcon, LogOut, Image as ImageIcon, Trash2, X, Info, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface Member {
  id: string;
  name: string;
  path: string;
}

interface Schedule {
  id: string;
  memberId: string;
  date: string;
  timeOfDay: 'AM' | 'PM';
  content: string;
  type: string;
  image?: string;
}

export default function Member() {
  const { path } = useParams();
  const [member, setMember] = useState<Member | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [image, setImage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Get current date in Shanghai timezone
  const getShanghaiToday = () => {
    const now = new Date();
    const shanghaiDateStr = formatInTimeZone(now, 'Asia/Shanghai', 'yyyy-MM-dd');
    return new Date(shanghaiDateStr);
  };

  const isDateEditable = (date: Date) => {
    const shanghaiToday = getShanghaiToday();
    const targetWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    const currentWeekStart = startOfWeek(shanghaiToday, { weekStartsOn: 1 });
    // Editable if target week is before or equal to current week
    return !isAfter(targetWeekStart, currentWeekStart);
  };

  useEffect(() => {
    fetch(`/api/member/${path}`)
      .then(res => {
        if (!res.ok) throw new Error('Member not found');
        return res.json();
      })
      .then(data => {
        setMember(data);
        return fetch(`/api/member/${path}/schedules`);
      })
      .then(res => res.json())
      .then(data => {
        setSchedules(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [path]);

  const formatWeek = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(start, 'yy')}年第${getISOWeek(start)}周（${format(start, 'MM.dd')}-${format(end, 'MM.dd')}）`;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = {
          maxSizeMB: 0.2, // Compress to ~200KB
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => setImage(reader.result as string);
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error compressing image:', error);
        showToast('图片压缩失败，请重试');
      }
    }
  };

  const handleSave = async () => {
    if (!isDateEditable(selectedWeekStart)) {
      setFormError('未到的周不可编辑');
      return;
    }
    if (!image) {
      setFormError('请上传行程图片');
      return;
    }
    setFormError('');
    
    try {
      const res = await fetch(`/api/member/${path}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(selectedWeekStart, 'yyyy-MM-dd'),
          timeOfDay: 'AM', // Keep AM to satisfy DB constraint without changing schema
          content: '周度打卡',
          image
        })
      });
      if (!res.ok) throw new Error('Failed to save');
      const newSchedule = await res.json();
      setSchedules([...schedules, newSchedule]);
      setImage(null);
      showToast('上报成功');
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = (id: string, scheduleDateStr: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Check if the schedule's date is editable
    const scheduleDate = new Date(scheduleDateStr);
    if (!isDateEditable(scheduleDate)) {
      return;
    }
    
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/member/${path}/schedules/${deleteConfirmId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      setSchedules(schedules.filter(s => s.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error(err);
      setDeleteConfirmId(null);
    }
  };

  const schedulesByWeek = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach(s => {
      const weekStartStr = format(startOfWeek(new Date(s.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!map.has(weekStartStr)) map.set(weekStartStr, []);
      map.get(weekStartStr)!.push(s);
    });
    return map;
  }, [schedules]);

  const weekSchedules = useMemo(() => {
    const dateStr = format(selectedWeekStart, 'yyyy-MM-dd');
    return schedulesByWeek.get(dateStr) || [];
  }, [schedulesByWeek, selectedWeekStart]);
  
  const isSelectedDateEditable = isDateEditable(selectedWeekStart);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error || !member) return <div className="p-8 text-center text-error font-bold">{error || 'Not found'}</div>;

  return (
    <div className="bg-surface min-h-screen flex flex-col font-sans text-on-surface">
      {/* Header (Shared) */}
      <header className="w-full sticky top-0 z-40 bg-white border-b border-surface-container-high flex justify-between items-center px-4 md:px-8 py-4">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h1 className="text-base md:text-lg font-bold text-slate-900 hidden md:block">我的行程上报</h1>
          </div>
          <div className="hidden md:block h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatWeek(selectedWeekStart)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-slate-200 bg-surface-container-high flex items-center justify-center text-primary font-bold">
              {member.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 leading-none">{member.name}</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">团队成员</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container/20 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">退出</span>
          </button>
        </div>
      </header>

      {/* ================= MAIN VIEW ================= */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-8 space-y-10">
        {/* Input Section */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">{member.name}行事历</h2>
            <p className="text-on-surface-variant text-sm">记录您的周度行程与任务详情</p>
          </div>
          
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10 space-y-5">
            {/* Date & Time Picker */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">选择周度</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={format(selectedWeekStart, 'yyyy-MM-dd')}
                  onChange={e => {
                    if (e.target.value) {
                      setSelectedWeekStart(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }));
                    }
                  }}
                  onClick={(e) => {
                    try {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker();
                      }
                    } catch (err) {}
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all flex items-center justify-between">
                  <span>{formatWeek(selectedWeekStart)}</span>
                  <CalendarIcon className="w-4 h-4 text-on-surface-variant" />
                </div>
              </div>
            </div>

            {/* Attachment Upload */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">附件图片 <span className="text-error">*</span></label>
              <div className="flex gap-3">
                <label className={`w-20 h-20 rounded-lg bg-surface-container-highest border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center transition-colors ${isSelectedDateEditable ? 'cursor-pointer hover:bg-surface-container-high' : 'opacity-50 cursor-not-allowed'}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={!isSelectedDateEditable} />
                  <ImageIcon className="w-6 h-6 text-on-surface-variant mb-1" />
                  <span className="text-[10px] text-on-surface-variant">添加图片</span>
                </label>
                {image && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden group">
                    <img src={image} className="w-full h-full object-cover" />
                    {isSelectedDateEditable && (
                      <button onClick={(e) => { e.preventDefault(); setImage(null); }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Save Action */}
            <div className="space-y-3">
              {formError && (
                <div className="p-3 bg-error-container text-on-error-container text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}
              <button 
                onClick={handleSave}
                disabled={!isSelectedDateEditable}
                className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all ${isSelectedDateEditable ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary active:scale-95 duration-200' : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed flex items-center justify-center gap-2'}`}
              >
                {!isSelectedDateEditable && <Lock className="w-4 h-4" />}
                {isSelectedDateEditable ? '保存周度行程' : '未到的周不可编辑'}
              </button>
            </div>
          </div>
        </section>

        {/* List Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="text-lg font-bold tracking-tight text-on-surface">本周事项</h3>
            <span className="text-xs text-on-surface-variant font-medium">{weekSchedules.length} 个记录</span>
          </div>
          
          <div className="space-y-4">
            {weekSchedules.map(schedule => (
              <div key={schedule.id} className="bg-surface-container-lowest p-4 rounded-xl flex items-start gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] group">
                <div className="flex-1 space-y-2">
                  <h4 className="text-sm font-semibold text-on-surface whitespace-pre-wrap">{schedule.content}</h4>
                  {schedule.image && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-outline-variant/20">
                      <img src={schedule.image} className="w-full h-auto object-cover max-h-48" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={(e) => handleDelete(schedule.id, schedule.date, e)} className="text-on-surface-variant hover:text-error transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {weekSchedules.length === 0 && (
              <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.03)] opacity-60">
                <CalendarIcon className="w-8 h-8 text-outline-variant" />
                <p className="text-sm text-on-surface-variant">该周暂无事项</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-on-surface mb-2">确认删除</h3>
            <p className="text-on-surface-variant text-sm mb-6">您确定要删除此行程事项吗？删除后将无法恢复。</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className="px-4 py-2 text-sm font-bold text-on-surface bg-surface-container-high hover:bg-surface-container-highest rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 text-sm font-bold text-white bg-error hover:bg-red-700 rounded-lg shadow-md shadow-error/20 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <Info className="w-5 h-5 text-primary-container" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
