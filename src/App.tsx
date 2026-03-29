import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { Play, Pause, Upload, BookOpen, Volume2, DatabaseZap, Edit2, Check, X, Palette } from 'lucide-react';

const supabaseUrl = 'https://woylhshulcoidlacxqcc.supabase.co';
const supabaseKey = 'sb_publishable_ZLYKhSjkWtArPZ4Ek59HWA_-MG29OgY';
const supabase = createClient(supabaseUrl, supabaseKey);

const SURAH_NAMES = [
  "Al-Fatihah", "Al-Baqarah", "Aal-E-Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Ad-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Lail", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraish", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

interface Lesson {
  id?: string;
  chapter_no: number;
  verse_no: number;
  lesson: string;
}

export default function App() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlayfulTheme, setIsPlayfulTheme] = useState(true);
  
  // Editing state
  const [editingVerseKey, setEditingVerseKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('baby_quran_lessons')
        .select('*')
        .order('chapter_no', { ascending: true })
        .order('verse_no', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Table "baby_quran_lessons" does not exist.');
        }
        throw error;
      }
      setLessons(data || []);
      
      if (data && data.length > 0 && selectedChapter === null) {
        const firstChapter = Math.min(...data.map(d => d.chapter_no));
        setSelectedChapter(firstChapter);
      }
    } catch (err: any) {
      console.error('Error fetching lessons:', err);
      setError(err.message || 'Could not fetch from Supabase. Make sure table "baby_quran_lessons" exists.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedLessons: Lesson[] = results.data.map((row: any) => {
            const keys = Object.keys(row);
            const chapterKey = keys.find(k => k.toLowerCase().includes('chapter')) || keys[0];
            const verseKey = keys.find(k => k.toLowerCase().includes('verse')) || keys[1];
            const lessonKey = keys.find(k => k.toLowerCase().includes('lesson')) || keys[2];

            return {
              chapter_no: parseInt(row[chapterKey], 10),
              verse_no: parseInt(row[verseKey], 10),
              lesson: row[lessonKey],
            };
          }).filter(l => !isNaN(l.chapter_no) && !isNaN(l.verse_no) && l.lesson);

          if (parsedLessons.length === 0) {
            throw new Error('No valid lessons found in CSV. Check column headers.');
          }

          const uniqueLessonsMap = new Map<string, Lesson>();
          parsedLessons.forEach(l => {
            uniqueLessonsMap.set(`${l.chapter_no}-${l.verse_no}`, l);
          });
          const uniqueLessons = Array.from(uniqueLessonsMap.values());

          const { error: insertError } = await supabase
            .from('baby_quran_lessons')
            .upsert(uniqueLessons, { onConflict: 'baby_quran_lessons_chapter_no_verse_no_key' });

          if (insertError) {
             const { error: fallbackError } = await supabase
                .from('baby_quran_lessons')
                .upsert(uniqueLessons, { onConflict: 'chapter_no,verse_no' });
             if (fallbackError) throw fallbackError;
          }

          await fetchLessons();
        } catch (err: any) {
          console.error('Upload error:', err);
          setError(err.message || 'Failed to upload lessons. Check table schema.');
        } finally {
          setUploading(false);
          e.target.value = '';
        }
      },
      error: (err) => {
        setError(err.message);
        setUploading(false);
        e.target.value = '';
      }
    });
  };

  const handleSaveEdit = async (chapter_no: number, verse_no: number) => {
    if (!editValue.trim()) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('baby_quran_lessons')
        .update({ lesson: editValue })
        .eq('chapter_no', chapter_no)
        .eq('verse_no', verse_no);

      if (error) throw error;

      setLessons(lessons.map(l => 
        (l.chapter_no === chapter_no && l.verse_no === verse_no) 
          ? { ...l, lesson: editValue } 
          : l
      ));
      setEditingVerseKey(null);
    } catch (err: any) {
      console.error('Error updating lesson:', err);
      alert('Failed to save lesson: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const playAudio = (chapter: number, verse: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const chapterStr = String(chapter).padStart(3, '0');
    const verseStr = String(verse).padStart(3, '0');
    const url = `https://everyayah.com/data/Alafasy_128kbps/${chapterStr}${verseStr}.mp3`;
    
    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.onplay = () => setPlayingVerse(verse);
    audio.onended = () => {
      setPlayingVerse(null);
      const chapterLessons = lessons.filter(l => l.chapter_no === chapter).sort((a,b) => a.verse_no - b.verse_no);
      const currentIndex = chapterLessons.findIndex(l => l.verse_no === verse);
      if (currentIndex !== -1 && currentIndex < chapterLessons.length - 1) {
        const nextVerse = chapterLessons[currentIndex + 1].verse_no;
        playAudio(chapter, nextVerse);
      }
    };
    audio.onerror = () => {
      setPlayingVerse(null);
      console.error("Audio failed to load");
    }
    
    audio.play();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingVerse(null);
    }
  };

  const chapters = Array.from(new Set(lessons.map(l => l.chapter_no))).sort((a: number, b: number) => a - b);

  // Theme Classes
  const theme = {
    bg: isPlayfulTheme ? 'bg-sky-50 text-slate-800' : 'bg-white text-black selection:bg-black selection:text-white',
    header: isPlayfulTheme ? 'bg-white shadow-sm rounded-b-[3rem] border-b-0 p-6 md:p-8 mb-8' : 'p-6 md:p-12 border-b-8 border-black mb-8',
    title: isPlayfulTheme ? 'text-4xl md:text-5xl font-extrabold text-indigo-600 tracking-tight' : 'text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none',
    subtitle: isPlayfulTheme ? 'text-lg font-medium text-sky-500 mt-1' : 'text-xl font-bold uppercase tracking-widest text-gray-400 mt-2',
    btnPrimary: isPlayfulTheme 
      ? 'bg-indigo-500 text-white rounded-full px-6 py-3 font-bold shadow-md hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2' 
      : 'border-4 border-black px-8 py-4 text-xl font-black uppercase transition-all flex items-center gap-3 bg-black text-white hover:bg-white hover:text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none',
    btnSecondary: isPlayfulTheme
      ? 'bg-white text-indigo-600 border-2 border-indigo-100 rounded-full px-6 py-3 font-bold shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2'
      : 'border-4 border-black px-8 py-4 text-xl font-black uppercase transition-all flex items-center gap-3 bg-white text-black hover:bg-black hover:text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none',
    sidebarCard: isPlayfulTheme
      ? 'bg-white rounded-3xl shadow-sm border border-sky-100 p-6 flex flex-col gap-4'
      : 'flex flex-col gap-4',
    chapterBtn: (isActive: boolean) => isPlayfulTheme
      ? `text-left px-6 py-4 text-lg font-bold rounded-2xl transition-all flex flex-col ${isActive ? 'bg-indigo-500 text-white shadow-md' : 'bg-sky-50 text-slate-600 hover:bg-sky-100'}`
      : `text-left px-8 py-6 text-2xl font-black uppercase transition-all border-4 border-black flex flex-col ${isActive ? 'bg-black text-white shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]' : 'bg-white text-black hover:bg-gray-100 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]'}`,
    lessonCard: (verse: number, isPlaying: boolean) => {
      if (!isPlayfulTheme) {
        return `p-8 md:p-12 border-8 transition-all duration-300 ${isPlaying ? 'border-black bg-black text-white scale-[1.02] shadow-2xl' : 'border-black bg-white text-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[8px_8px_0_0_rgba(0,0,0,1)]'}`;
      }
      const colors = ['bg-pink-100', 'bg-yellow-100', 'bg-green-100', 'bg-purple-100'];
      const color = colors[verse % 4];
      return `p-8 md:p-10 rounded-[2.5rem] transition-all duration-300 ${color} ${isPlaying ? 'scale-[1.02] shadow-xl ring-4 ring-white' : 'shadow-sm hover:shadow-md hover:-translate-y-1'}`;
    },
    playBtn: (isPlaying: boolean) => isPlayfulTheme
      ? `p-4 rounded-full shadow-sm transition-transform hover:scale-110 ${isPlaying ? 'bg-white text-indigo-500' : 'bg-white text-slate-700'}`
      : `p-4 rounded-full border-4 border-black transition-colors ${isPlaying ? 'bg-white text-black' : 'bg-black text-white hover:bg-white hover:text-black'}`,
    verseText: isPlayfulTheme ? 'text-3xl md:text-4xl font-extrabold text-slate-800 leading-snug' : 'text-4xl md:text-5xl font-black leading-tight tracking-tight'
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${theme.bg}`}>
      <header className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${theme.header}`}>
        <div>
          <h1 className={theme.title}>Baby Quran</h1>
          <p className={theme.subtitle}>Simple Lessons</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setIsPlayfulTheme(!isPlayfulTheme)}
            className={theme.btnSecondary}
          >
            <Palette size={24} strokeWidth={isPlayfulTheme ? 2.5 : 3} />
            <span>{isPlayfulTheme ? 'Brutalist Theme' : 'Playful Theme'}</span>
          </button>

          <label className={`cursor-pointer ${theme.btnPrimary} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={24} strokeWidth={isPlayfulTheme ? 2.5 : 3} />
            <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </header>

      <main className="p-6 md:px-12 md:pb-12 max-w-7xl mx-auto">
        {error && (
          <div className={`p-8 mb-12 ${isPlayfulTheme ? 'bg-red-50 rounded-3xl border-2 border-red-200' : 'bg-white border-8 border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)]'}`}>
            <div className={`flex items-center gap-4 mb-4 ${isPlayfulTheme ? 'text-red-500' : 'text-red-600'}`}>
              <DatabaseZap size={40} strokeWidth={isPlayfulTheme ? 2.5 : 3} />
              <h3 className={`text-3xl ${isPlayfulTheme ? 'font-bold' : 'font-black uppercase tracking-tight'}`}>Database Error</h3>
            </div>
            <p className="text-xl font-bold mb-6">{error}</p>
            <div className={`p-6 font-mono text-sm md:text-base overflow-x-auto ${isPlayfulTheme ? 'bg-white rounded-2xl border border-red-100' : 'bg-gray-100 border-4 border-black'}`}>
              <p className={`font-bold mb-4 ${isPlayfulTheme ? 'text-red-400' : 'uppercase tracking-widest text-gray-500'}`}>Run this in Supabase SQL Editor:</p>
              <pre className="whitespace-pre-wrap">
{`CREATE TABLE baby_quran_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_no INT NOT NULL,
  verse_no INT NOT NULL,
  lesson TEXT NOT NULL,
  UNIQUE(chapter_no, verse_no)
);
-- Optional: Allow public read/write if using anon key
ALTER TABLE baby_quran_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON baby_quran_lessons FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON baby_quran_lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON baby_quran_lessons FOR UPDATE USING (true);
`}
              </pre>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className={`animate-spin rounded-full h-24 w-24 ${isPlayfulTheme ? 'border-4 border-indigo-200 border-t-indigo-600' : 'border-t-8 border-b-8 border-black'}`}></div>
          </div>
        ) : lessons.length === 0 && !error ? (
          <div className={`text-center py-32 ${isPlayfulTheme ? 'bg-white rounded-[3rem] shadow-sm border border-sky-100' : 'border-8 border-dashed border-gray-200 rounded-3xl'}`}>
            <BookOpen size={120} strokeWidth={isPlayfulTheme ? 1.5 : 1} className={`mx-auto mb-8 ${isPlayfulTheme ? 'text-indigo-200' : 'text-gray-300'}`} />
            <h2 className={`text-4xl md:text-5xl mb-6 ${isPlayfulTheme ? 'font-extrabold text-slate-700' : 'font-black uppercase tracking-tighter'}`}>No Lessons Yet</h2>
            <p className={`text-xl md:text-2xl font-medium ${isPlayfulTheme ? 'text-slate-500' : 'text-gray-500 font-bold'}`}>Upload a CSV file with Chapter, Verse, and Lesson columns.</p>
          </div>
        ) : chapters.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-12">
            <div className="lg:col-span-1">
              <div className={theme.sidebarCard}>
                <h3 className={`text-lg mb-2 ${isPlayfulTheme ? 'font-bold text-sky-400 px-2' : 'font-black uppercase tracking-widest text-gray-400'}`}>Surah Index</h3>
                <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0">
                  {chapters.map(chap => {
                    const surahName = SURAH_NAMES[chap - 1] || `Surah ${chap}`;
                    return (
                      <button
                        key={chap}
                        onClick={() => {
                          setSelectedChapter(chap);
                          stopAudio();
                        }}
                        className={theme.chapterBtn(selectedChapter === chap)}
                      >
                        <span className={isPlayfulTheme ? 'text-sm opacity-70 mb-1' : 'text-sm text-gray-500 tracking-widest'}>Chapter {chap}</span>
                        <span>{surahName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-3">
              {selectedChapter ? (
                <div>
                  <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-6 gap-6 ${isPlayfulTheme ? 'border-b-2 border-sky-100' : 'border-b-8 border-black'}`}>
                    <div>
                      <h2 className={`text-4xl md:text-6xl ${isPlayfulTheme ? 'font-extrabold text-slate-800' : 'font-black uppercase tracking-tighter leading-none'}`}>
                        {SURAH_NAMES[selectedChapter - 1] || `Chapter ${selectedChapter}`}
                      </h2>
                      <p className={`mt-2 ${isPlayfulTheme ? 'text-xl font-medium text-sky-500' : 'text-xl font-bold uppercase tracking-widest text-gray-400'}`}>
                        Chapter {selectedChapter}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        const firstVerse = lessons.filter(l => l.chapter_no === selectedChapter).sort((a,b) => a.verse_no - b.verse_no)[0]?.verse_no;
                        if (firstVerse) playAudio(selectedChapter, firstVerse);
                      }}
                      className={theme.btnPrimary}
                    >
                      <Play size={24} strokeWidth={isPlayfulTheme ? 2.5 : 3} /> 
                      <span>Autoplay All</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-6 md:gap-8">
                    {lessons.filter(l => l.chapter_no === selectedChapter).sort((a,b) => a.verse_no - b.verse_no).map(lesson => {
                      const isPlaying = playingVerse === lesson.verse_no;
                      const isEditing = editingVerseKey === `${lesson.chapter_no}-${lesson.verse_no}`;

                      return (
                        <div key={lesson.verse_no} className={theme.lessonCard(lesson.verse_no, isPlaying)}>
                          <div className="flex justify-between items-start mb-6 gap-4">
                            <span className={`text-xl md:text-2xl ${isPlayfulTheme ? 'font-bold text-slate-500' : 'font-black uppercase tracking-widest ' + (isPlaying ? 'text-gray-400' : 'text-gray-500')}`}>
                              Verse {lesson.verse_no}
                            </span>
                            <div className="flex items-center gap-3">
                              {!isEditing && (
                                <button 
                                  onClick={() => {
                                    setEditingVerseKey(`${lesson.chapter_no}-${lesson.verse_no}`);
                                    setEditValue(lesson.lesson);
                                  }}
                                  className={`p-3 rounded-full transition-colors ${isPlayfulTheme ? 'bg-white/50 text-slate-500 hover:bg-white' : 'border-4 border-black bg-white text-black hover:bg-black hover:text-white'}`}
                                  title="Edit Lesson"
                                >
                                  <Edit2 size={20} strokeWidth={isPlayfulTheme ? 2.5 : 3} />
                                </button>
                              )}
                              <button 
                                onClick={() => isPlaying ? stopAudio() : playAudio(lesson.chapter_no, lesson.verse_no)}
                                className={theme.playBtn(isPlaying)}
                              >
                                {isPlaying ? <Pause size={24} strokeWidth={isPlayfulTheme ? 2.5 : 3} /> : <Volume2 size={24} strokeWidth={isPlayfulTheme ? 2.5 : 3} />}
                              </button>
                            </div>
                          </div>
                          
                          {isEditing ? (
                            <div className="flex flex-col gap-4">
                              <textarea 
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className={`w-full p-4 md:p-6 text-2xl md:text-3xl font-bold resize-none outline-none ${isPlayfulTheme ? 'bg-white/80 rounded-2xl border-2 border-white focus:border-indigo-300' : 'bg-gray-100 border-4 border-black'}`}
                                rows={3}
                                autoFocus
                              />
                              <div className="flex gap-3 justify-end">
                                <button 
                                  onClick={() => setEditingVerseKey(null)}
                                  className={`px-6 py-3 font-bold flex items-center gap-2 ${isPlayfulTheme ? 'bg-white text-slate-600 rounded-full hover:bg-slate-50' : 'border-4 border-black bg-white text-black hover:bg-gray-200'}`}
                                  disabled={savingEdit}
                                >
                                  <X size={20} /> Cancel
                                </button>
                                <button 
                                  onClick={() => handleSaveEdit(lesson.chapter_no, lesson.verse_no)}
                                  className={`px-6 py-3 font-bold flex items-center gap-2 ${isPlayfulTheme ? 'bg-indigo-500 text-white rounded-full hover:bg-indigo-600' : 'border-4 border-black bg-black text-white hover:bg-gray-800'}`}
                                  disabled={savingEdit}
                                >
                                  {savingEdit ? 'Saving...' : <><Check size={20} /> Save</>}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className={theme.verseText}>{lesson.lesson}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={`h-full min-h-[400px] flex items-center justify-center ${isPlayfulTheme ? 'text-sky-300 font-extrabold text-3xl' : 'text-gray-300 font-black uppercase text-4xl tracking-tighter'}`}>
                  Select a Surah
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
