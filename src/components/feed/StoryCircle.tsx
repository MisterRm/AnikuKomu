import React from 'react';
import { Avatar } from '../ui/Avatar';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StoryCircleProps {
  key?: any;
  username: string;
  avatarUrl: string | null;
  isCurrentUser?: boolean;
  hasStory?: boolean;
  className?: string;
  onClick?: () => void;
  onAddStory?: () => void;
}

export default function StoryCircle({
  username,
  avatarUrl,
  isCurrentUser = false,
  hasStory = false,
  className,
  onClick,
  onAddStory
}: StoryCircleProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5 shrink-0 select-none pb-1.5', className)}>
      <div className="relative">
        {/* Glow circle ring based on has-story attribute */}
        {hasStory ? (
          <div 
            onClick={onClick}
            className="w-[72px] h-[72px] rounded-full p-[3px] bg-gradient-to-tr from-purple-500 via-purple-600 to-pink-500 hover:rotate-12 transition-transform duration-300 cursor-pointer flex items-center justify-center shadow-lg shadow-purple-500/10"
          >
            <div className="w-full h-full rounded-full bg-zinc-950 p-[2px] flex items-center justify-center">
              <Avatar src={avatarUrl} name={username} size="lg" className="border-0 w-full h-full" />
            </div>
          </div>
        ) : (
          <div 
            onClick={onClick || onAddStory}
            className="w-[72px] h-[72px] rounded-full p-[1px] bg-zinc-800 flex items-center justify-center hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <Avatar src={avatarUrl} name={username} size="lg" className="w-[66px] h-[66px]" />
          </div>
        )}

        {/* Plus badge on "Kisahmu" */}
        {isCurrentUser && onAddStory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddStory();
            }}
            className="absolute bottom-0.5 right-0.5 w-[22px] h-[22px] bg-gradient-to-r from-purple-500 to-pink-500 border-[2px] border-zinc-950 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white stroke-[3.5]" />
          </button>
        )}
      </div>

      <span className="text-[10px] font-medium font-sans text-center truncate max-w-[70px] text-zinc-400 font-mono">
        {isCurrentUser ? 'Kisahmu' : `@${username}`}
      </span>
    </div>
  );
}
