import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserPlus, Link as LinkIcon, Copy, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Member {
  id: string;
  name: string;
  path: string;
}

export default function AdminMembers() {
  const { token } = useOutletContext<{ token: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '' });
  const [toastMessage, setToastMessage] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    fetch(`/api/admin/members?token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized or server error');
        return res.json();
      })
      .then(data => {
        setMembers(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/members?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      if (!res.ok) throw new Error('Failed to add member');
      const added = await res.json();
      setMembers([...members, added]);
      setShowAddModal(false);
      setNewMember({ name: '' });
      showToast('添加成功');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const copyUrl = (path: string) => {
    const url = `${window.location.origin}/m/${path}`;
    navigator.clipboard.writeText(url);
    showToast('链接已复制到剪贴板！');
  };

  const showQrCode = (path: string) => {
    const url = `${window.location.origin}/m/${path}`;
    setQrCodeUrl(url);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-error font-bold">{error}</div>;

  return (
    <div className="p-8 overflow-y-auto flex-1">
      <div className="flex justify-between items-end mb-8">
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2 rounded-lg font-semibold shadow-lg shadow-primary/10 active:scale-95 transition-transform"
          >
            <UserPlus className="w-4 h-4" />
            添加新成员
          </button>
          <button 
            onClick={() => {
              const url = `${window.location.origin}/directory?token=${token}`;
              navigator.clipboard.writeText(url);
              showToast('集合页链接已复制到剪贴板！');
            }}
            className="flex items-center gap-2 bg-surface-container-high text-on-surface-variant hover:text-primary px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            复制集合页链接
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-surface-container-high">
        <div className="grid grid-cols-12 bg-surface-container-low px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
          <div className="col-span-8">成员信息</div>
          <div className="col-span-4 text-right">专属 URL 操作</div>
        </div>
        <div className="divide-y divide-surface-container-high">
          {members.map(member => (
            <div key={member.id} className="grid grid-cols-12 px-6 py-5 items-center hover:bg-surface-container-low transition-colors group">
              <div className="col-span-8 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-bold text-lg">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{member.name}</h3>
                </div>
              </div>
              <div className="col-span-4 flex justify-end gap-2">
                <button 
                  onClick={() => showQrCode(member.path)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-fixed/30 hover:bg-primary-fixed/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <QrCode className="w-4 h-4" /> 二维码
                </button>
                <button 
                  onClick={() => copyUrl(member.path)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-fixed/30 hover:bg-primary-fixed/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <LinkIcon className="w-4 h-4" /> 复制 URL
                </button>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="p-8 text-center text-on-surface-variant text-sm">暂无成员</div>
          )}
        </div>
        <div className="px-6 py-4 bg-surface-container-low/50 text-center border-t border-surface-container-high">
          <p className="text-xs font-bold text-on-surface-variant tracking-[0.2em] uppercase">已加载全部 {members.length} 名成员</p>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-surface-container-high p-6">
            <h3 className="text-xl font-bold mb-4">添加新成员</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">姓名</label>
                <input 
                  type="text" 
                  required
                  value={newMember.name}
                  onChange={e => setNewMember({ name: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-sm font-bold bg-surface-container-high rounded-xl"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-xl"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-sm" onClick={() => setQrCodeUrl(null)}>
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-surface-container-high p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-on-surface">成员专属二维码</h3>
              <button onClick={() => setQrCodeUrl(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="flex justify-center bg-white p-4 rounded-xl mb-4">
              <QRCodeSVG value={qrCodeUrl} size={200} />
            </div>
            <p className="text-xs text-on-surface-variant break-all">{qrCodeUrl}</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
