import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { Play, Pause, Upload, BookOpen, Volume2, DatabaseZap } from 'lucide-react';

const supabaseUrl = 'https://woylhshulcoidlacxqcc.supabase.co';
const supabaseKey = 'sb_publishable_ZLYKhSjkWtArPZ4Ek59HWA_-MG29OgY';
const supabase = createClient(supabaseUrl, supabaseKey);

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
          // Table does not exist
          throw new Error('Table "baby_quran_lessons" does not exist.');
        }
        throw error;
      }
      setLessons(data || []);
      
      if (data && data.length > 0) {
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

          // Upsert to Supabase
          const { error: insertError } = await supabase
            .from('baby_quran_lessons')
            .upsert(parsedLessons, { onConflict: 'chapter_no,verse_no' });

          if (insertError) {
             const { error: fallbackError } = await supabase
                .from('baby_quran_lessons')
                .insert(parsedLessons);
             if (fallbackError) throw fallbackError;
          }

          await fetchLessons();
        } catch (err: any) {
          console.error('Upload error:', err);
          setError(err.message || 'Failed to upload lessons. Check table schema.');
        } finally {
          setUploading(false);
          // Reset file input
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
      // Autoplay next
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

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      <header className="p-6 md:p-12 border-b-8 border-black flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Baby Quran</h1>
          <p className="text-xl font-bold uppercase tracking-widest text-gray-400 mt-2">Simple Lessons</p>
        </div>
        <label className={`cursor-pointer border-4 border-black px-8 py-4 text-xl font-black uppercase transition-all flex items-center gap-3 ${uploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-white hover:text-black'}`}>
          <Upload size={28} strokeWidth={3} />
          <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
          <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </header>

      <main className="p-6 md:p-12 max-w-7xl mx-auto">
        {error && (
          <div className="bg-white border-8 border-black p-8 mb-12 shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <DatabaseZap size={40} strokeWidth={3} />
              <h3 className="text-3xl font-black uppercase tracking-tight">Database Error</h3>
            </div>
            <p className="text-2xl font-bold mb-6">{error}</p>
            <div className="bg-gray-100 p-6 border-4 border-black font-mono text-sm md:text-base overflow-x-auto">
              <p className="font-bold mb-4 uppercase tracking-widest text-gray-500">Run this in Supabase SQL Editor:</p>
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
            <div className="animate-spin rounded-full h-24 w-24 border-t-8 border-b-8 border-black"></div>
          </div>
        ) : lessons.length === 0 && !error ? (
          <div className="text-center py-32 border-8 border-dashed border-gray-200 rounded-3xl">
            <BookOpen size={120} strokeWidth={1} className="mx-auto mb-8 text-gray-300" />
            <h2 className="text-5xl font-black uppercase tracking-tighter mb-6">No Lessons Yet</h2>
            <p className="text-2xl text-gray-500 font-bold">Upload a CSV file with Chapter, Verse, and Lesson columns.</p>
          </div>
        ) : chapters.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-1 flex flex-col gap-4">
              <h3 className="text-lg font-black uppercase tracking-widest text-gray-400 mb-2">Chapters</h3>
              <div className="flex flex-row lg:flex-col gap-4 overflow-x-auto pb-4 lg:pb-0">
                {chapters.map(chap => (
                  <button
                    key={chap}
                    onClick={() => {
                      setSelectedChapter(chap);
                      stopAudio();
                    }}
                    className={`text-left px-8 py-6 text-3xl font-black uppercase transition-all border-4 border-black whitespace-nowrap ${selectedChapter === chap ? 'bg-black text-white shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]' : 'bg-white text-black hover:bg-gray-100 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]'}`}
                  >
                    Ch {chap}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-3">
              {selectedChapter ? (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 border-b-8 border-black pb-6 gap-6">
                    <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">Chapter {selectedChapter}</h2>
                    <button 
                      onClick={() => {
                        const firstVerse = lessons.filter(l => l.chapter_no === selectedChapter).sort((a,b) => a.verse_no - b.verse_no)[0]?.verse_no;
                        if (firstVerse) playAudio(selectedChapter, firstVerse);
                      }}
                      className="border-4 border-black bg-white text-black px-8 py-4 text-xl font-black uppercase flex items-center gap-3 hover:bg-black hover:text-white transition-all shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                    >
                      <Play size={28} strokeWidth={3} /> Autoplay All
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-8">
                    {lessons.filter(l => l.chapter_no === selectedChapter).sort((a,b) => a.verse_no - b.verse_no).map(lesson => {
                      const isPlaying = playingVerse === lesson.verse_no;
                      return (
                        <div 
                          key={lesson.verse_no} 
                          className={`p-8 md:p-12 border-8 transition-all duration-300 ${isPlaying ? 'border-black bg-black text-white scale-[1.02] shadow-2xl' : 'border-black bg-white text-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[8px_8px_0_0_rgba(0,0,0,1)]'}`}
                        >
                          <div className="flex justify-between items-start mb-8">
                            <span className={`text-2xl font-black uppercase tracking-widest ${isPlaying ? 'text-gray-400' : 'text-gray-500'}`}>Verse {lesson.verse_no}</span>
                            <button 
                              onClick={() => isPlaying ? stopAudio() : playAudio(lesson.chapter_no, lesson.verse_no)}
                              className={`p-4 rounded-full border-4 border-black transition-colors ${isPlaying ? 'bg-white text-black' : 'bg-black text-white hover:bg-white hover:text-black'}`}
                            >
                              {isPlaying ? <Pause size={32} strokeWidth={3} /> : <Volume2 size={32} strokeWidth={3} />}
                            </button>
                          </div>
                          <p className="text-4xl md:text-6xl font-black leading-tight tracking-tight">{lesson.lesson}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-300 font-black uppercase text-4xl tracking-tighter">
                  Select a chapter
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
