import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isAfter, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar as CalendarIcon, LogOut, Image as ImageIcon, Trash2, X, Info, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

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
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeOfDay, setTimeOfDay] = useState<'AM' | 'PM'>('AM');
  const [content, setContent] = useState('');
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
    const targetDate = startOfDay(date);
    // Editable if targetDate is before or equal to today
    return !isAfter(targetDate, shanghaiToday);
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
        setSchedules(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [path]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const openModal = (date: Date) => {
    if (!isDateEditable(date)) {
      showToast('时间未到，不可提报');
      return; // Do nothing if date is not editable
    }
    setSelectedDate(date);
    setContent('');
    setTimeOfDay('AM');
    setImage(null);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!isDateEditable(selectedDate)) {
      setFormError('未到的日期不可编辑');
      return;
    }
    if (!content.trim()) {
      setFormError('请输入事项详情');
      return;
    }
    setFormError('');
    
    try {
      const res = await fetch(`/api/member/${path}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          timeOfDay,
          content,
          image
        })
      });
      if (!res.ok) throw new Error('Failed to save');
      const newSchedule = await res.json();
      setSchedules([...schedules, newSchedule]);
      setShowModal(false);
      setContent('');
      setImage(null);
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

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error || !member) return <div className="p-8 text-center text-error font-bold">{error || 'Not found'}</div>;

  const currentMonthSchedules = schedules.filter(s => s.date.startsWith(format(currentMonth, 'yyyy-MM')));
  const amCount = currentMonthSchedules.filter(s => s.timeOfDay === 'AM').length;
  const pmCount = currentMonthSchedules.filter(s => s.timeOfDay === 'PM').length;
  const uniqueDays = new Set(currentMonthSchedules.map(s => s.date)).size;

  const todaysSchedules = schedules.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd')).sort((a, b) => a.timeOfDay === 'AM' ? -1 : 1);
  const isSelectedDateEditable = isDateEditable(selectedDate);

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
            <span className="md:hidden">{format(selectedDate, 'yyyy年MM月')}</span>
            <span className="hidden md:inline">{format(currentMonth, 'yyyy年MM月')}</span>
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

      {/* ================= MOBILE VIEW (Image 7) ================= */}
      <main className="md:hidden flex-1 w-full max-w-md mx-auto px-5 py-8 space-y-10">
        {/* Input Section */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">{member.name}行事历</h2>
            <p className="text-on-surface-variant text-sm">记录您的日程与任务详情</p>
          </div>
          
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10 space-y-5">
            {/* Date & Time Picker */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">选择日期</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={e => setSelectedDate(new Date(e.target.value))}
                    onClick={(e) => {
                      try {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          e.currentTarget.showPicker();
                        }
                      } catch (err) {}
                    }}
                    className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">时段</label>
                <div className="flex bg-surface-container-highest p-1 rounded-lg">
                  <button 
                    onClick={() => setTimeOfDay('AM')}
                    disabled={!isSelectedDateEditable}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${timeOfDay === 'AM' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'} ${!isSelectedDateEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    上午
                  </button>
                  <button 
                    onClick={() => setTimeOfDay('PM')}
                    disabled={!isSelectedDateEditable}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${timeOfDay === 'PM' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'} ${!isSelectedDateEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    下午
                  </button>
                </div>
              </div>
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">事项详情</label>
              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={!isSelectedDateEditable}
                className={`w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all placeholder:text-outline outline-none resize-none ${!isSelectedDateEditable ? 'opacity-50 cursor-not-allowed' : ''}`} 
                placeholder={isSelectedDateEditable ? "请输入具体的工作内容或会议安排..." : "未到的日期不可编辑"} 
                rows={4}
              />
            </div>

            {/* Attachment Upload */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">附件图片</label>
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
                {isSelectedDateEditable ? '保存事项' : '未到的日期不可编辑'}
              </button>
            </div>
          </div>
        </section>

        {/* List Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="text-lg font-bold tracking-tight text-on-surface">今日事项</h3>
            <span className="text-xs text-on-surface-variant font-medium">{todaysSchedules.length} 个待办</span>
          </div>
          
          <div className="space-y-4">
            {todaysSchedules.map(schedule => (
              <div key={schedule.id} className="bg-surface-container-lowest p-4 rounded-xl flex items-start gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] group">
                <div className="flex flex-col items-center min-w-[48px] py-1 bg-surface-container-low rounded-lg">
                  <span className="text-[10px] font-bold text-primary tracking-tighter">{schedule.timeOfDay === 'AM' ? '上午' : '下午'}</span>
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-semibold text-on-surface whitespace-pre-wrap">{schedule.content}</h4>
                  {schedule.image && (
                    <div className="flex items-center gap-1 mt-2">
                      <ImageIcon className="w-3 h-3 text-outline" />
                      <span className="text-xs text-on-surface-variant">1个附件</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleDelete(schedule.id)} className="text-on-surface-variant hover:text-error transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {todaysSchedules.length === 0 && (
              <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.03)] opacity-60">
                <CalendarIcon className="w-8 h-8 text-outline-variant" />
                <p className="text-sm text-on-surface-variant">该日期暂无事项</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ================= DESKTOP VIEW (Current Calendar Grid) ================= */}
      <main className="hidden md:flex flex-1 w-full max-w-7xl mx-auto p-8 flex-col gap-6">
        <div className="flex justify-between items-center">
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

        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-surface-container-high">
          <div className="grid grid-cols-7 bg-surface-container-low border-b border-surface-container-high">
            {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => (
              <div key={day} className={`p-4 text-center text-xs font-bold tracking-widest uppercase ${i >= 5 ? 'text-tertiary' : 'text-on-surface-variant'}`}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-surface-container-high">
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const daySchedules = schedules.filter(s => s.date === dateStr);
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div 
                  key={day.toString()} 
                  onClick={() => openModal(day)}
                  className={`bg-surface-container-lowest h-32 md:h-40 p-3 group hover:bg-surface-container-low transition-colors cursor-pointer ${!isCurrentMonth ? 'opacity-50' : ''}`}
                >
                  <span className={`text-sm font-bold ${isToday(day) ? 'text-primary' : ''}`}>{format(day, 'd')}</span>
                  <div className="mt-2 space-y-1 overflow-y-auto max-h-24 no-scrollbar">
                    {daySchedules.map(schedule => (
                      <div key={schedule.id} className="relative px-2 py-0.5 bg-primary-fixed text-[10px] font-bold text-on-primary-fixed rounded truncate group/item">
                        {schedule.timeOfDay === 'AM' ? '上午' : '下午'} - {schedule.content}
                        <button 
                          onClick={(e) => handleDelete(schedule.id, e)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 text-error hover:bg-error-container rounded p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-surface-container-high shadow-sm">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">本月填报进度</p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-black text-primary">{uniqueDays} / {new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()}</p>
              <p className="text-sm text-slate-500 mb-1">天</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-surface-container-high shadow-sm">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">行程分布 (上午/下午)</p>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">上午</p>
                <p className="text-2xl font-black text-on-surface">{amCount}</p>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">下午</p>
                <p className="text-2xl font-black text-on-surface">{pmCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-primary-container text-on-primary-container p-6 rounded-xl flex items-center gap-4">
            <Info className="w-8 h-8" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">待办提醒</p>
              <p className="text-sm font-medium leading-tight">请及时补报缺失的行程</p>
            </div>
          </div>
        </div>
      </main>

      {/* Desktop Modal */}
      {showModal && (
        <div className="hidden md:flex fixed inset-0 z-[60] items-center justify-center p-4 bg-on-surface/30 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-white/40">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-on-surface">编辑行程</h3>
                  <p className="text-sm text-on-surface-variant mt-1">{format(selectedDate, 'yyyy年MM月dd日')}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">时段选择</label>
                  <div className="flex p-1.5 bg-surface-container-highest rounded-xl">
                    <button 
                      onClick={() => setTimeOfDay('AM')}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${timeOfDay === 'AM' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >上午</button>
                    <button 
                      onClick={() => setTimeOfDay('PM')}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${timeOfDay === 'PM' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >下午</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">行程内容</label>
                  <textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-xl text-sm p-4 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant resize-none outline-none" 
                    placeholder="请输入具体的工作内容或行程安排..." 
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">图片附件 (可选)</label>
                  <div className="flex gap-3">
                    <label className="border-2 border-dashed border-outline-variant rounded-2xl p-6 flex flex-col items-center justify-center group hover:border-primary hover:bg-primary-fixed/5 transition-all cursor-pointer w-full">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      {!image ? (
                        <>
                          <div className="w-12 h-12 bg-surface-container-highest group-hover:bg-primary-fixed/20 rounded-full flex items-center justify-center transition-colors mb-3">
                            <ImageIcon className="w-6 h-6 text-outline-variant group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-[11px] font-bold text-on-surface-variant group-hover:text-primary uppercase tracking-wider">上传行程截图或现场照片</p>
                        </>
                      ) : (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden">
                          <img src={image} className="w-full h-full object-contain" />
                          <button onClick={(e) => { e.preventDefault(); setImage(null); }} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              {formError && (
                <div className="mt-4 p-3 bg-error-container text-on-error-container text-sm rounded-lg font-medium">
                  {formError}
                </div>
              )}
              <div className="mt-10 flex gap-4">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3.5 text-sm font-bold text-on-surface bg-surface-container-high hover:bg-surface-container-highest rounded-xl transition-all active:scale-[0.98]">取消</button>
                <button onClick={handleSave} className="flex-[2] py-3.5 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">提交上报</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
