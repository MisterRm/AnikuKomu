import React, { useEffect, useState, startTransition } from 'react';
import { Story } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import { ChevronLeft, ChevronRight, X, Play, Pause, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { motion, AnimatePresence, useDragControls } from 'motion/react';

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  currentUserId?: string;
  onStoryDeleted?: (storyId: string) => void;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose, currentUserId, onStoryDeleted }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [storyList, setStoryList] = useState(stories);

  const activeStory = storyList[currentIndex] || stories[currentIndex];
  const author = activeStory?.profiles || { username: 'wibu_member', display_name: 'Wibu Member', avatar_url: null };

  // Timer intervals for progress mapping
  useEffect(() => {
    if (paused) return;

    setProgress(0);
    const duration = 5000; // 5 seconds per slide
    const intervalMs = 50;
    const increment = (intervalMs / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 100;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentIndex, paused, stories]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      startTransition(() => {
        setCurrentIndex(currentIndex - 1);
        setProgress(0);
      });
    } else {
      onClose();
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      startTransition(() => {
        setCurrentIndex(currentIndex + 1);
        setProgress(0);
      });
    } else {
      onClose();
    }
  };

  const handleTapScreen = (e: React.MouseEvent<HTMLDivElement>) => {
    const screenWidth = e.currentTarget.offsetWidth;
    const tapX = e.nativeEvent.offsetX;

    // Left 30% goes back, right 70% goes forward
    if (tapX < screenWidth * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting || !activeStory) return;
    if (!window.confirm('Hapus story ini?')) return;
    setDeleting(true);
    try {
      await supabase.from('stories').delete().eq('id', activeStory.id);
      const newList = storyList.filter(s => s.id !== activeStory.id);
      if (newList.length === 0) {
        onClose();
      } else {
        setStoryList(newList);
        setCurrentIndex(Math.min(currentIndex, newList.length - 1));
      }
      if (onStoryDeleted) onStoryDeleted(activeStory.id);
    } catch (err) {
      console.error('Gagal hapus story:', err);
    } finally {
      setDeleting(false);
    }
  };

  const isMyStory = currentUserId && activeStory?.user_id === currentUserId;

  if (!activeStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center select-none"
    >
      <div className="relative w-full max-w-[440px] h-[100dvh] bg-zinc-950 flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* Dynamic sliding story canvas */}
        <div 
          onClick={handleTapScreen}
          className="absolute inset-0 z-0 cursor-pointer flex items-center justify-center bg-zinc-950"
        >
          <AnimatePresence mode="popLayout">
            <motion.img
              key={activeStory.id}
              src={activeStory.image_url}
              alt=""
              initial={{ x: '100%', opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0.8 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover pointer-events-none select-none"
            />
          </AnimatePresence>
        </div>

        {/* Ambient top controls HUD overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 flex flex-col gap-3">
          
          {/* Multiple stories progress bars indicator */}
          <div className="flex gap-1">
            {stories.map((story, idx) => {
              let fillWidth = '0%';
              if (idx < currentIndex) fillWidth = '100%';
              if (idx === currentIndex) fillWidth = `${progress}%`;

              return (
                <div key={story.id} className="flex-1 h-1 bg-zinc-700/60 rounded-full overflow-hidden">
                  <div
                    style={{ width: fillWidth }}
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-75"
                  />
                </div>
              );
            })}
          </div>

          {/* User profile details header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar src={author.avatar_url} name={author.username} size="sm" className="border-2 border-purple-500/30" />
              <div>
                <p className="text-xs font-bold text-white font-sans">
                  {author.display_name || author.username}
                </p>
                <p className="text-[9px] text-zinc-400 font-mono">
                  Otaku Storyteller
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Play / pause controller */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPaused(!paused);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer"
              >
                {paused ? <Play className="w-4 h-4 text-white fill-white" /> : <Pause className="w-4 h-4 text-white fill-white" />}
              </button>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1 rounded-full hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5 text-white stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Side slide navigation arrows (desktop helpers) */}
        <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between z-10 pointer-events-none hidden md:flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={currentIndex === 0}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-zinc-800 pointer-events-auto flex items-center justify-center text-white disabled:opacity-0 transition-opacity cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-zinc-800 pointer-events-auto flex items-center justify-center text-white cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Swipe instructions bottom detail helper */}
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none z-10">
          <span className="text-[9px] uppercase tracking-wider text-white/50 bg-black/30 backdrop-blur-xs px-2.5 py-1 rounded-full font-bold font-mono">
            {currentIndex + 1} dari {stories.length} story
          </span>
        </div>

      </div>
    </motion.div>
  );
}
