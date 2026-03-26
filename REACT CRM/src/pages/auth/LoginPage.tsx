import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../api/axios';
import { Lock, Mail, Loader2, Heart, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.user, data.token);
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'فشل تسجيل الدخول. تحقق من البيانات.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-cairo">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-50/50 blur-3xl opacity-70" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-50/50 blur-3xl opacity-70" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(30,41,59,0.1)] border border-slate-100 overflow-hidden">
          <div className="p-8 pb-4 text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center text-white mb-6">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">تسجيل الدخول</h1>
            <p className="text-slate-400 font-medium">مركز مطمئنة للاستشارات اللغوية</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 pt-6 space-y-6">
            <div className="space-y-4">
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2 mr-1">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 pr-12 pl-4 bg-slate-50 border border-slate-200 rounded-[1rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-800"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2 mr-1">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 pr-12 pl-4 bg-slate-50 border border-slate-200 rounded-[1rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                <span className="text-slate-500 group-hover:text-indigo-600 transition-colors">تذكرني</span>
              </label>
              <a href="#" className="text-indigo-600 font-bold hover:underline">نسيت كلمة المرور؟</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-[1rem] shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span>جاري الدخول...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          <div className="p-8 pt-0 text-center">
            <p className="text-slate-400 text-sm flex items-center justify-center gap-1.5">
              صُنع بكل حب <Heart className="text-rose-500 fill-rose-500" size={14} /> لمركز مطمئنة
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
