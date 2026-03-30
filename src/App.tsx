import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { Play, Pause, Upload, Edit2, Check, X, Presentation, Timer, ChevronLeft, ChevronRight, Sparkles, Cloud, BookHeart, ZoomIn, ZoomOut, Layers, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

interface ThemeLesson {
  id?: string;
  serial: number;
  theme: string;
  subtheme: string;
  verse: string;
}

export default function App() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [themeLessons, setThemeLessons] = useState<ThemeLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'chapters' | 'themes'>('chapters');
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedSubtheme, setSelectedSubtheme] = useState<string | null>(null);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  // Flashcard state
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlashcardPlaying, setIsFlashcardPlaying] = useState(false);
  const [flashcardSpeed, setFlashcardSpeed] = useState(3000);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1);
  
  // Editing state
  const [editingVerseKey, setEditingVerseKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchLessons();
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      let allData: ThemeLesson[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data, error } = await supabase
          .from('baby_quran_themes')
          .select('*')
          .order('serial', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          if (error.code === '42P01') {
            console.warn('Table "baby_quran_themes" does not exist yet.');
            hasMore = false;
            break;
          }
          throw error;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      setThemeLessons(allData);
      
      if (allData.length > 0 && selectedTheme === null) {
        const firstTheme = allData[0].theme;
        const firstSubtheme = allData.find(t => t.theme === firstTheme)?.subtheme || null;
        setSelectedTheme(firstTheme);
        setSelectedSubtheme(firstSubtheme);
        setExpandedTheme(firstTheme);
      }
    } catch (err: any) {
      console.error('Error fetching themes:', err);
    }
  };

  const fetchLessons = async () => {
    setLoading(true);
    setError(null);
    try {
      let allData: Lesson[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data, error } = await supabase
          .from('baby_quran_lessons')
          .select('*')
          .order('chapter_no', { ascending: true })
          .order('verse_no', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          if (error.code === '42P01') {
            throw new Error('Table "baby_quran_lessons" does not exist.');
          }
          throw error;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      setLessons(allData);
      
      if (allData.length > 0 && selectedChapter === null) {
        const firstChapter = Math.min(...allData.map(d => d.chapter_no));
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
          const headers = results.meta.fields || [];
          const isThemeCSV = headers.some(h => h.toLowerCase().trim() === 'theme');

          if (isThemeCSV) {
            const parsedThemes: ThemeLesson[] = results.data.map((row: any) => ({
              serial: parseInt(row['serial'] || row['Serial']),
              theme: row['theme'] || row['Theme'],
              subtheme: row['subtheme'] || row['Subtheme'],
              verse: row['verse'] || row['Verse']
            })).filter(t => !isNaN(t.serial) && t.theme && t.subtheme && t.verse);

            if (parsedThemes.length === 0) {
              throw new Error("No valid theme data found. Please check CSV format.");
            }

            const uniqueThemesMap = new Map<number, ThemeLesson>();
            parsedThemes.forEach(theme => {
              uniqueThemesMap.set(theme.serial, theme);
            });
            const uniqueThemes = Array.from(uniqueThemesMap.values());

            const BATCH_SIZE = 500;
            for (let i = 0; i < uniqueThemes.length; i += BATCH_SIZE) {
              const batch = uniqueThemes.slice(i, i + BATCH_SIZE);
              const { error: upsertError } = await supabase
                .from('baby_quran_themes')
                .upsert(batch, { 
                  onConflict: 'serial',
                  ignoreDuplicates: false
                });

              if (upsertError) {
                if (upsertError.code === '42P01') {
                  throw new Error('Table "baby_quran_themes" does not exist. Please create it in Supabase with columns: serial (int8, primary key), theme (text), subtheme (text), verse (text).');
                }
                throw upsertError;
              }
            }

            await fetchThemes();
            setViewMode('themes');
          } else {
            const parsedLessons: Lesson[] = results.data.map((row: any) => ({
              chapter_no: parseInt(row['Quran Chapter No'] || row['chapter_no'] || row['chapter']),
              verse_no: parseInt(row['Verse No'] || row['verse_no']),
              lesson: row['Baby Quran Lesson /Lessons from it'] || row['lesson'] || row['Lesson'] || row['simplified_verse_start']
            })).filter(l => !isNaN(l.chapter_no) && !isNaN(l.verse_no) && l.lesson);

            if (parsedLessons.length === 0) {
              throw new Error("No valid data found. Please check CSV format.");
            }

            const uniqueLessonsMap = new Map<string, Lesson>();
            parsedLessons.forEach(lesson => {
              const key = `${lesson.chapter_no}-${lesson.verse_no}`;
              uniqueLessonsMap.set(key, lesson);
            });
            const uniqueLessons = Array.from(uniqueLessonsMap.values());

            const BATCH_SIZE = 500;
            for (let i = 0; i < uniqueLessons.length; i += BATCH_SIZE) {
              const batch = uniqueLessons.slice(i, i + BATCH_SIZE);
              const { error: upsertError } = await supabase
                .from('baby_quran_lessons')
                .upsert(batch, { 
                  onConflict: 'chapter_no,verse_no',
                  ignoreDuplicates: false
                });

              if (upsertError) throw upsertError;
            }

            await fetchLessons();
            setViewMode('chapters');
          }
        } catch (err: any) {
          console.error('Upload error:', err);
          setError(err.message || 'Failed to upload data.');
        } finally {
          setUploading(false);
          if (e.target) e.target.value = '';
        }
      },
      error: (err) => {
        setError(`CSV Parse Error: ${err.message}`);
        setUploading(false);
      }
    });
  };

  const handleSaveEdit = async (chapter_no: number, verse_no: number) => {
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
      console.error("Error saving edit:", err);
      alert("Failed to save edit: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveThemeEdit = async (serial: number) => {
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('baby_quran_themes')
        .update({ verse: editValue })
        .eq('serial', serial);

      if (error) throw error;

      setThemeLessons(themeLessons.map(t => 
        t.serial === serial 
          ? { ...t, verse: editValue } 
          : t
      ));
      setEditingVerseKey(null);
    } catch (err: any) {
      console.error("Error saving edit:", err);
      alert("Failed to save edit: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isFlashcardMode && isFlashcardPlaying) {
      const currentListLength = viewMode === 'chapters' 
        ? lessons.filter(l => l.chapter_no === selectedChapter).length
        : themeLessons.filter(t => t.theme === selectedTheme && t.subtheme === selectedSubtheme).length;

      if (currentListLength > 0) {
        timer = setInterval(() => {
          setFlashcardIndex(prev => {
            if (prev < currentListLength - 1) {
              return prev + 1;
            } else {
              setIsFlashcardPlaying(false);
              return prev;
            }
          });
        }, flashcardSpeed);
      }
    }
    return () => clearInterval(timer);
  }, [isFlashcardMode, isFlashcardPlaying, flashcardSpeed, selectedChapter, selectedTheme, selectedSubtheme, lessons, themeLessons, viewMode]);

  useEffect(() => {
    setFlashcardIndex(0);
    setIsFlashcardPlaying(false);
  }, [selectedChapter, selectedTheme, selectedSubtheme, viewMode]);

  const chapters = (Array.from(new Set(lessons.map(l => l.chapter_no))) as number[]).sort((a, b) => a - b);

  const currentDisplayItems = viewMode === 'chapters' 
    ? (selectedChapter ? lessons.filter(l => l.chapter_no === selectedChapter).sort((a,b) => a.verse_no - b.verse_no).map(l => ({
        key: `${l.chapter_no}-${l.verse_no}`,
        badge: `Verse ${l.verse_no}`,
        text: l.lesson,
        onSave: () => handleSaveEdit(l.chapter_no, l.verse_no),
        original: l
      })) : [])
    : (selectedTheme && selectedSubtheme ? themeLessons.filter(t => t.theme === selectedTheme && t.subtheme === selectedSubtheme).sort((a,b) => a.serial - b.serial).map(t => ({
        key: `theme-${t.serial}`,
        badge: `Verse ${t.serial}`,
        text: t.verse,
        onSave: () => handleSaveThemeEdit(t.serial),
        original: t
      })) : []);

  const title = viewMode === 'chapters' 
    ? (selectedChapter ? (SURAH_NAMES[selectedChapter - 1] || `Chapter ${selectedChapter}`) : '')
    : (selectedSubtheme || '');

  const subtitle = viewMode === 'chapters'
    ? (selectedChapter ? `Chapter ${selectedChapter}` : '')
    : (selectedTheme || '');

  return (
    <div className="min-h-screen flex flex-col md:flex-row p-4 md:p-8 gap-8 max-w-[1600px] mx-auto">
      {/* Floating Upload Button */}
      <label className="fixed top-4 right-4 md:top-8 md:right-8 z-50 cursor-pointer bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-600 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(14,165,233,0.2)] border border-slate-100 transition-all duration-300 rounded-full py-3 px-5 flex items-center justify-center gap-2 font-semibold group">
        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={uploading} />
        {uploading ? (
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Upload size={20} className="group-hover:-translate-y-0.5 transition-transform" />
        )}
        <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload CSV'}</span>
      </label>

      {/* Sidebar */}
      <motion.aside 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-[340px] flex-shrink-0 flex flex-col gap-6"
      >
        {/* Logo Area */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F0EBE1] flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400"></div>
          <div className="bg-sky-50 p-4 rounded-full mb-4 text-sky-500 shadow-inner">
            <BookHeart size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Baby Quran</h1>
          <p className="text-slate-500 font-medium mt-2">Gentle lessons for little hearts</p>
          {error && <p className="text-red-500 text-sm mt-4 bg-red-50 p-3 rounded-xl w-full">{error}</p>}
        </div>

        {/* Sidebar Navigation */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F0EBE1] flex-1 overflow-hidden flex flex-col max-h-[60vh] md:max-h-none">
          <div className="p-4 border-b border-slate-100 bg-white z-10">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setViewMode('chapters')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${viewMode === 'chapters' ? 'bg-white text-sky-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Sparkles size={16} />
                Chapters
              </button>
              <button
                onClick={() => setViewMode('themes')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${viewMode === 'themes' ? 'bg-white text-sky-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Layers size={16} />
                Themes
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2 custom-scrollbar">
            {loading ? (
              <div className="text-center p-4 text-slate-400 font-medium animate-pulse">Loading...</div>
            ) : viewMode === 'chapters' ? (
              chapters.length === 0 ? (
                <div className="text-center p-4 text-slate-400 font-medium">No chapters yet. Upload a CSV!</div>
              ) : (
                chapters.map(chapter => (
                  <button
                    key={chapter}
                    onClick={() => setSelectedChapter(chapter)}
                    className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-between group ${
                      selectedChapter === chapter 
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-200 scale-[1.02]' 
                        : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:scale-[1.01]'
                    }`}
                  >
                    <span className="truncate pr-2">{SURAH_NAMES[chapter - 1] || `Chapter ${chapter}`}</span>
                    <span className={`text-sm px-3 py-1 rounded-full transition-colors ${
                      selectedChapter === chapter ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    }`}>
                      {chapter}
                    </span>
                  </button>
                ))
              )
            ) : (
              (Array.from(new Set(themeLessons.map(t => t.theme))) as string[]).map(theme => {
                const isExpanded = expandedTheme === theme;
                const subthemes = Array.from(new Set(themeLessons.filter(t => t.theme === theme).map(t => t.subtheme))) as string[];

                return (
                  <div key={theme} className="mb-1">
                    <button 
                      onClick={() => setExpandedTheme(isExpanded ? null : theme)} 
                      className={`w-full flex justify-between items-center p-4 rounded-2xl font-bold transition-colors ${isExpanded ? 'bg-sky-50 text-sky-700' : 'bg-transparent text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="truncate pr-2 text-left">{theme}</span>
                      <ChevronDown className={`transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} size={18} />
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-3 pr-1 py-2 flex flex-col gap-1 border-l-2 border-sky-100 ml-6 mt-1 mb-2">
                            {subthemes.map(subtheme => {
                              const isSelected = selectedTheme === theme && selectedSubtheme === subtheme;
                              return (
                                <button
                                  key={subtheme}
                                  onClick={() => { setSelectedTheme(theme); setSelectedSubtheme(subtheme); }}
                                  className={`text-left p-3 rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-sky-500 text-white shadow-md shadow-sky-200 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                                >
                                  {subtheme}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
            {viewMode === 'themes' && themeLessons.length === 0 && !loading && (
              <div className="text-center p-4 text-slate-400 font-medium">No themes yet. Upload a CSV!</div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {currentDisplayItems.length > 0 || (viewMode === 'chapters' ? selectedChapter : (selectedTheme && selectedSubtheme)) ? (
          <motion.div 
            key={viewMode === 'chapters' ? `chapter-${selectedChapter}` : `theme-${selectedTheme}-${selectedSubtheme}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F0EBE1]">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                  {title}
                </h2>
                <p className="text-sky-500 font-semibold text-lg mt-2 flex items-center gap-2">
                  <Cloud size={20} /> {subtitle}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 bg-slate-50 p-2 rounded-full border border-slate-100">
                <div className="flex items-center gap-1 bg-white rounded-full px-2 shadow-sm border border-slate-100">
                  <button 
                    onClick={() => setTextSizeMultiplier(prev => Math.max(0.5, prev - 0.1))}
                    className="p-2 text-slate-400 hover:text-sky-500 transition-colors"
                    title="Decrease text size"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <span className="text-xs font-bold text-slate-400 w-8 text-center">{Math.round(textSizeMultiplier * 100)}%</span>
                  <button 
                    onClick={() => setTextSizeMultiplier(prev => Math.min(2.5, prev + 0.1))}
                    className="p-2 text-slate-400 hover:text-sky-500 transition-colors"
                    title="Increase text size"
                  >
                    <ZoomIn size={18} />
                  </button>
                </div>
                <button
                  onClick={() => setIsFlashcardMode(!isFlashcardMode)}
                  className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
                    isFlashcardMode 
                      ? 'bg-indigo-100 text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <Presentation size={20} strokeWidth={2.5} />
                  <span>Flashcards</span>
                </button>
              </div>
            </div>

            {/* Content */}
            {isFlashcardMode && currentDisplayItems.length > 0 ? (
              <div className="flex-1 flex flex-col items-center justify-start pt-4 md:pt-8 max-w-5xl mx-auto w-full">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={flashcardIndex}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05, y: -20 }}
                    transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                    className="w-full min-h-[300px] md:min-h-[400px] h-auto bg-white rounded-[3rem] shadow-[0_20px_60px_rgb(0,0,0,0.06)] border border-[#F0EBE1] flex flex-col items-center justify-center p-8 md:p-16 text-center relative overflow-hidden group"
                  >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 transition-opacity group-hover:opacity-60">
                      <div className="absolute -top-20 -left-20 w-64 h-64 bg-sky-100 rounded-full blur-3xl"></div>
                      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-100 rounded-full blur-3xl"></div>
                    </div>

                    <span className="relative z-10 font-bold text-sky-500 mb-8 bg-sky-50 px-6 py-2 rounded-full border border-sky-100 shadow-sm" style={{ fontSize: `${1.25 * textSizeMultiplier}rem` }}>
                      {currentDisplayItems[flashcardIndex]?.badge}
                    </span>
                    <p className="relative z-10 leading-tight font-bold text-slate-800 tracking-tight max-w-4xl" style={{ fontSize: `${3.5 * textSizeMultiplier}rem` }}>
                      {currentDisplayItems[flashcardIndex]?.text}
                    </p>
                  </motion.div>
                </AnimatePresence>
                
                {/* Flashcard Controls */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex flex-wrap items-center justify-center gap-4 p-3 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#F0EBE1]"
                >
                  <button 
                    onClick={() => setFlashcardIndex(Math.max(0, flashcardIndex - 1))}
                    disabled={flashcardIndex === 0}
                    className={`p-4 rounded-full transition-colors ${flashcardIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-500'}`}
                  >
                    <ChevronLeft size={28} strokeWidth={2.5} />
                  </button>
                  
                  <button 
                    onClick={() => setIsFlashcardPlaying(!isFlashcardPlaying)}
                    className="p-5 rounded-full transition-all hover:scale-110 bg-indigo-500 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600"
                  >
                    {isFlashcardPlaying ? <Pause size={28} strokeWidth={2.5} /> : <Play size={28} strokeWidth={2.5} />}
                  </button>
                  
                  <button 
                    onClick={() => setFlashcardIndex(Math.min(currentDisplayItems.length - 1, flashcardIndex + 1))}
                    disabled={flashcardIndex === currentDisplayItems.length - 1}
                    className={`p-4 rounded-full transition-colors ${flashcardIndex === currentDisplayItems.length - 1 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-500'}`}
                  >
                    <ChevronRight size={28} strokeWidth={2.5} />
                  </button>
                  
                  <div className="w-px h-10 mx-2 bg-slate-100"></div>
                  
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full">
                    <Timer size={20} className="text-sky-500" strokeWidth={2.5} />
                    <select 
                      value={flashcardSpeed}
                      onChange={(e) => setFlashcardSpeed(Number(e.target.value))}
                      className="font-bold outline-none cursor-pointer bg-transparent text-slate-600"
                    >
                      <option value={1000}>1s</option>
                      <option value={2000}>2s</option>
                      <option value={3000}>3s</option>
                      <option value={5000}>5s</option>
                      <option value={10000}>10s</option>
                    </select>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 pb-12">
                {currentDisplayItems.map((item, idx) => {
                  const isEditing = editingVerseKey === item.key;

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                      key={item.key} 
                      className="bg-white rounded-[2rem] p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#F0EBE1] hover:border-sky-200 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-6 gap-4">
                        <div className="px-5 py-2 rounded-full text-sm font-bold shadow-sm bg-sky-50 text-sky-600">
                          {item.badge}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isEditing && (
                            <button 
                              onClick={() => {
                                setEditingVerseKey(item.key);
                                setEditValue(item.text);
                              }}
                              className="p-3 rounded-full text-slate-400 hover:bg-slate-50 hover:text-sky-500 transition-colors"
                              title="Edit Lesson"
                            >
                              <Edit2 size={20} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {isEditing ? (
                        <div className="flex flex-col gap-4">
                          <textarea 
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full p-6 text-2xl md:text-3xl font-bold resize-none outline-none bg-slate-50 rounded-2xl border-2 border-slate-200 focus:border-sky-300 focus:bg-white transition-colors"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-3 justify-end">
                            <button 
                              onClick={() => setEditingVerseKey(null)}
                              className="px-6 py-3 font-bold flex items-center gap-2 bg-white text-slate-600 rounded-full hover:bg-slate-50 border border-slate-200"
                              disabled={savingEdit}
                            >
                              <X size={20} /> Cancel
                            </button>
                            <button 
                              onClick={() => item.onSave()}
                              className="px-6 py-3 font-bold flex items-center gap-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 shadow-md shadow-indigo-200"
                              disabled={savingEdit}
                            >
                              {savingEdit ? 'Saving...' : <><Check size={20} /> Save</>}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="font-semibold leading-relaxed text-slate-700" style={{ fontSize: `${1.75 * textSizeMultiplier}rem` }}>
                          {item.text}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Sparkles size={48} className="text-sky-300" />
            </div>
            <h2 className="text-3xl font-bold text-slate-400 mb-2">Select a {viewMode === 'chapters' ? 'Chapter' : 'Theme'}</h2>
            <p className="text-slate-400 font-medium">Choose a {viewMode === 'chapters' ? 'chapter' : 'theme'} from the sidebar to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
