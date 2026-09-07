import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Edit3, Check } from 'lucide-react';

interface Slide {
  slide: number;
  title: string;
  subtitle?: string;
  bullets: string[];
}

interface SlideViewerProps {
  content: string;
  onChange: (updatedContent: string) => void;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ content, onChange }) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (content.trim().startsWith('[')) {
        const parsed = JSON.parse(content);
        setSlides(parsed);
      } else {
        setSlides([
          { slide: 1, title: "Presentation Title", subtitle: "Overview", bullets: [content.substring(0, 150)] }
        ]);
      }
    } catch {
      setSlides([
        { slide: 1, title: "Presentation Slide Deck", subtitle: "Summary", bullets: [content.substring(0, 150)] }
      ]);
    }
  }, [content]);

  const updateAndEmit = (newSlides: Slide[]) => {
    const reindexed = newSlides.map((s, idx) => ({ ...s, slide: idx + 1 }));
    setSlides(reindexed);
    onChange(JSON.stringify(reindexed, null, 2));
  };

  const handleTitleChange = (idx: number, newTitle: string) => {
    const updated = [...slides];
    updated[idx].title = newTitle;
    updateAndEmit(updated);
  };

  const handleBulletChange = (sIdx: number, bIdx: number, val: string) => {
    const updated = [...slides];
    updated[sIdx].bullets[bIdx] = val;
    updateAndEmit(updated);
  };

  const handleAddBullet = (sIdx: number) => {
    const updated = [...slides];
    updated[sIdx].bullets.push("New bullet point detail.");
    updateAndEmit(updated);
  };

  const handleDeleteBullet = (sIdx: number, bIdx: number) => {
    const updated = [...slides];
    updated[sIdx].bullets.splice(bIdx, 1);
    updateAndEmit(updated);
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      slide: slides.length + 1,
      title: `Slide ${slides.length + 1}: Strategic Topic`,
      subtitle: "Executive Details",
      bullets: ["Enter key bullet insight."]
    };
    const updated = [...slides, newSlide];
    updateAndEmit(updated);
    setActiveSlideIndex(updated.length - 1);
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== idx);
    updateAndEmit(updated);
    setActiveSlideIndex(Math.max(0, idx - 1));
  };

  const handleMoveSlide = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const updated = [...slides];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    updateAndEmit(updated);
    setActiveSlideIndex(targetIdx);
  };

  if (!slides.length) return null;
  const currentSlide = slides[activeSlideIndex] || slides[0];

  return (
    <div className="space-y-6">
      {/* Slide Thumbnails Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Presentation Deck ({slides.length} Slides)
        </h4>
        <button
          onClick={handleAddSlide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold hover:bg-sky-500/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Slide</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {slides.map((s, idx) => (
          <div
            key={idx}
            onClick={() => setActiveSlideIndex(idx)}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              activeSlideIndex === idx
                ? 'bg-sky-500/15 border-sky-500 shadow-md shadow-sky-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
              <span>SLIDE 0{s.slide}</span>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 'up'); }} title="Move Up"><ArrowUp className="w-3 h-3 text-slate-400 hover:text-white" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 'down'); }} title="Move Down"><ArrowDown className="w-3 h-3 text-slate-400 hover:text-white" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }} title="Delete Slide"><Trash2 className="w-3 h-3 text-rose-400 hover:text-rose-300" /></button>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-200 truncate">{s.title}</p>
          </div>
        ))}
      </div>

      {/* Slide Canvas Editor */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl relative">
        <div className="mb-6 border-b border-slate-800/80 pb-4 flex items-center justify-between">
          <input
            type="text"
            value={currentSlide.title}
            onChange={(e) => handleTitleChange(activeSlideIndex, e.target.value)}
            className="bg-transparent text-xl font-extrabold text-white border-b border-transparent hover:border-slate-700 focus:border-sky-500 focus:outline-none w-full mr-4"
          />
          <span className="px-2.5 py-1 rounded-md bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 flex-shrink-0">
            Slide {currentSlide.slide} of {slides.length}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          {currentSlide.bullets.map((bullet, bIdx) => (
            <div key={bIdx} className="flex items-center gap-3 group">
              <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0"></span>
              <input
                type="text"
                value={bullet}
                onChange={(e) => handleBulletChange(activeSlideIndex, bIdx, e.target.value)}
                className="bg-slate-950/40 text-sm text-slate-200 px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:outline-none w-full transition-all"
              />
              <button
                onClick={() => handleDeleteBullet(activeSlideIndex, bIdx)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:bg-rose-500/10 rounded transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => handleAddBullet(activeSlideIndex)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Bullet Point</span>
        </button>
      </div>
    </div>
  );
};
