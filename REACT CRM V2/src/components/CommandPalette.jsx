import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Users, MessageSquare, Megaphone, CornerDownLeft } from 'lucide-react';
import { search as searchApi } from '../api';

const GROUPS = [
  { key: 'contacts', label: 'جهات الاتصال', icon: Users, to: (id) => `/contacts/${id}` },
  { key: 'conversations', label: 'المحادثات', icon: MessageSquare, to: (id) => `/messages?conversation=${id}` },
  { key: 'campaigns', label: 'الحملات', icon: Megaphone, to: () => '/campaigns' },
];

const CommandPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [term, setTerm] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', term],
    queryFn: () => searchApi.globalSearch(term),
    enabled: open && term.trim().length >= 2,
  });

  useEffect(() => {
    if (open) {
      setTerm('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleSelect = (to) => {
    navigate(to);
    onClose();
  };

  const hasResults = data && (data.contacts?.length || data.conversations?.length || data.campaigns?.length);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/50 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-24 right-1/2 translate-x-1/2 w-full max-w-lg z-[61] px-4"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-3 px-4 border-b border-slate-100">
                <Search size={18} className="text-slate-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="بحث عن جهة اتصال، محادثة، أو حملة..."
                  className="flex-1 h-14 text-sm focus:outline-none placeholder:text-slate-400"
                />
                <kbd className="hidden sm:inline text-[10px] font-bold text-slate-400 border border-slate-200 rounded-lg px-1.5 py-1">Esc</kbd>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {term.trim().length < 2 ? (
                  <p className="text-center text-slate-400 text-sm py-10">اكتب حرفين على الأقل للبحث</p>
                ) : isFetching ? (
                  <p className="text-center text-slate-400 text-sm py-10">جاري البحث...</p>
                ) : !hasResults ? (
                  <p className="text-center text-slate-400 text-sm py-10">لا توجد نتائج</p>
                ) : (
                  GROUPS.map((group) => {
                    const items = data?.[group.key] ?? [];
                    if (items.length === 0) return null;
                    const Icon = group.icon;

                    return (
                      <div key={group.key} className="py-2">
                        <p className="px-4 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400">{group.label}</p>
                        {items.map((item) => (
                          <button
                            key={`${group.key}-${item.id}`}
                            onClick={() => handleSelect(group.to(item.id))}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-right"
                          >
                            <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center flex-shrink-0">
                              <Icon size={14} />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-bold text-slate-800 truncate">{item.title}</span>
                              {item.subtitle && <span className="block text-xs text-slate-400 truncate">{item.subtitle}</span>}
                            </span>
                            <CornerDownLeft size={13} className="text-slate-300 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
