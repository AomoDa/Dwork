import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Users } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  path: string;
}

export default function MemberDirectory() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('无权限访问：缺少 Token');
      setLoading(false);
      return;
    }

    fetch(`/api/admin/members?token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error('无权限访问：Token 无效');
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

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">加载中...</div>;
  if (error) return <div className="p-8 text-center text-error font-bold text-lg">{error}</div>;

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
      {/* Header */}
      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* Member Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {members.map(member => (
            <Link 
              key={member.id} 
              to={`/m/${member.path}`}
              className="bg-white p-4 rounded-2xl border border-surface-container-high shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/30 transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-black text-2xl group-hover:bg-blue-700 transition-colors shadow-inner">
                {member.name.charAt(0)}
              </div>
              <h3 className="font-bold text-slate-900 text-lg text-center truncate w-full px-2">{member.name}</h3>
            </Link>
          ))}
          {members.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium">暂无成员</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
