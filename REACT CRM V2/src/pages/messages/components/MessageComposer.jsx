import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Smile, Paperclip, Lock, Loader2, FileText, Zap, Plus, Mic, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';
import { cannedResponses as cannedResponsesApi, conversations as conversationsApi } from '../../../api';

const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '❤️', '😢', '🎉', '🔥', '✅'];
const ATTACHMENT_ACCEPT = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

const MessageComposer = ({ onSend, isSending, onOpenTemplatePicker, onTyping }) => {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [openPopover, setOpenPopover] = useState(null); // null | 'emoji' | 'canned'
  const [addingCanned, setAddingCanned] = useState(false);
  const [newCanned, setNewCanned] = useState({ title: '', content: '' });
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const toolbarRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Releases the microphone if the agent navigates away mid-recording instead of stopping it.
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Closes any open popover when clicking outside the toolbar — a full-screen backdrop
  // would also intercept clicks meant for the OTHER trigger buttons in this same row.
  useEffect(() => {
    if (!openPopover) return undefined;

    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setOpenPopover(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPopover]);

  const { data: cannedResponses = [] } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: cannedResponsesApi.getCannedResponses,
    enabled: openPopover === 'canned',
  });

  const createCannedMutation = useMutation({
    mutationFn: () => cannedResponsesApi.createCannedResponse(newCanned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      setNewCanned({ title: '', content: '' });
      setAddingCanned(false);
      toast.success('تم إضافة الرد الجاهز');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'فشل إضافة الرد'),
  });

  const handleSend = () => {
    if (!text.trim()) return;
    onSend({ content: text.trim(), isPrivate, type: 'text' });
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url, type, original_filename: filename } = await conversationsApi.uploadMessageAttachment(file);
      onSend({ content: url, isPrivate: false, type, filename });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const extension = (recorder.mimeType || 'audio/webm').includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice-note.${extension}`, { type: blob.type });

        setUploading(true);
        try {
          const { url } = await conversationsApi.uploadMessageAttachment(file);
          onSend({ content: url, isPrivate: false, type: 'audio' });
        } catch (err) {
          toast.error(err?.response?.data?.message || 'فشل رفع التسجيل الصوتي');
        } finally {
          setUploading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error('تعذّر الوصول للميكروفون — تأكد من صلاحيات المتصفح.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="border-t border-slate-100 bg-white p-4 flex-shrink-0">
      {isPrivate && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mb-2">
          <Lock size={12} />
          ملاحظة داخلية (لن تُرسل للعميل)
        </div>
      )}
      <div
        className={cn(
          'max-w-3xl mx-auto flex items-end gap-1.5 rounded-[1.5rem] border p-2 transition-all',
          isPrivate
            ? 'border-amber-200 bg-amber-50/50'
            : 'border-slate-200 bg-slate-50 focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10'
        )}
      >
        <div ref={toolbarRef} className="flex gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsPrivate((p) => !p)}
            className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors', isPrivate ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-600')}
            title="ملاحظة داخلية"
          >
            <Lock size={16} />
          </button>
          <button type="button" onClick={onOpenTemplatePicker} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors" title="إرسال قالب">
            <FileText size={16} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenPopover((p) => (p === 'canned' ? null : 'canned'))}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors', openPopover === 'canned' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-600')}
              title="ردود جاهزة"
            >
              <Zap size={16} />
            </button>
            {openPopover === 'canned' && (
              <div className="absolute bottom-11 right-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-64 max-h-80 overflow-y-auto z-20">
                {addingCanned ? (
                  <div className="p-1.5 space-y-2">
                    <input
                      autoFocus
                      placeholder="عنوان الرد"
                      value={newCanned.title}
                      onChange={(e) => setNewCanned((f) => ({ ...f, title: e.target.value }))}
                      className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <textarea
                      rows={3}
                      placeholder="نص الرد"
                      value={newCanned.content}
                      onChange={(e) => setNewCanned((f) => ({ ...f, content: e.target.value }))}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs resize-none"
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => setAddingCanned(false)} className="flex-1 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">إلغاء</button>
                      <button
                        onClick={() => createCannedMutation.mutate()}
                        disabled={!newCanned.title.trim() || !newCanned.content.trim() || createCannedMutation.isPending}
                        className="flex-1 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {createCannedMutation.isPending && <Loader2 size={11} className="animate-spin" />}
                        حفظ
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {cannedResponses.length === 0 ? (
                      <div className="text-center py-4 px-2">
                        <p className="text-xs font-bold text-slate-500">لا توجد ردود جاهزة بعد</p>
                        <p className="text-[11px] text-slate-400 mt-1">أضف ردوداً جاهزة لتوفير وقتك بالمحادثات المتكررة</p>
                      </div>
                    ) : (
                      cannedResponses.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { setText(r.content); setOpenPopover(null); }}
                          className="w-full text-right p-2.5 rounded-lg hover:bg-indigo-50/50 transition-colors"
                        >
                          <p className="text-xs font-bold text-slate-800 truncate">{r.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{r.content}</p>
                        </button>
                      ))
                    )}
                    <button
                      onClick={() => setAddingCanned(true)}
                      className="w-full flex items-center justify-center gap-1.5 p-2 mt-1 rounded-lg border-t border-slate-100 text-xs font-bold text-indigo-600 hover:bg-indigo-50/50"
                    >
                      <Plus size={13} />
                      إضافة رد جديد
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenPopover((p) => (p === 'emoji' ? null : 'emoji'))}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors', openPopover === 'emoji' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-600')}
              title="إيموجي"
            >
              <Smile size={16} />
            </button>
            {openPopover === 'emoji' && (
              <div className="absolute bottom-11 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 z-20">
                {COMMON_EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => { setText((t) => t + emoji); setOpenPopover(null); }} className="text-lg hover:bg-slate-100 rounded-lg p-1.5 transition-colors">
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || isRecording} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors disabled:opacity-40" title="إرفاق صورة أو فيديو أو ملف">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
          <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={uploading}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40',
              isRecording ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-600'
            )}
            title={isRecording ? 'إيقاف التسجيل وإرسال' : 'تسجيل رسالة صوتية'}
          >
            {isRecording ? <Square size={14} /> : <Mic size={16} />}
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping?.(); }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={isPrivate ? 'اكتب ملاحظة داخلية...' : 'اكتب رسالة...'}
          className="flex-1 resize-none max-h-32 bg-transparent border-none px-1.5 py-2.5 text-sm focus:outline-none focus:ring-0"
        />

        <button
          onClick={handleSend}
          disabled={isSending || !text.trim()}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all flex-shrink-0"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

export default MessageComposer;
