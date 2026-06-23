import React, { useEffect, useState, useRef, useTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Story, Profile } from '../../types/database';
import StoryCircle from './StoryCircle';
import { StorySkeleton } from '../ui/Skeleton';
import { UploadCloud, CheckCircle } from 'lucide-react';

interface StoryBarProps {
  currentUser: any;
  currentProfile: Profile | null;
  token: string | null;
  onOpenStoryViewer: (stories: Story[], startIndex: number) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function StoryBar({
  currentUser,
  currentProfile,
  token,
  onOpenStoryViewer,
  onToast,
}: StoryBarProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [groupedStories, setGroupedStories] = useState<Record<string, Story[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const loadStories = async () => {
    try {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles:profiles!user_id(*)')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const rawStories = data as Story[];
        setStories(rawStories);

        // Group stories by user_id
        const grouped: Record<string, Story[]> = {};
        rawStories.forEach((story) => {
          if (!grouped[story.user_id]) {
            grouped[story.user_id] = [];
          }
          grouped[story.user_id].push(story);
        });
        setGroupedStories(grouped);
      }
    } catch (err) {
      console.error('Error loading stories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleAddStoryClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !currentUser) return;

    // Check size < 10MB
    if (file.size > 10 * 1024 * 1024) {
      onToast('Ukuran gambar maksimal adalah 10MB.', 'error');
      return;
    }

    setUploading(true);
    onToast('Mengunggah story Anda...', 'info');

    try {
      const formData = new FormData();
      formData.append('image', file);

      // 1. Upload to Cloudinary via server API
      const uploadRes = await fetch('/api/upload?folder=posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json();
        throw new Error(errJson.error || 'Gagal mengunggah file.');
      }

      const uploadData = await uploadRes.json();

      // 2. Insert record into Supabase
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      const { data: newStory, error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: currentUser.id,
          image_url: uploadData.url,
          image_public_id: uploadData.public_id,
          expires_at: expiresAt,
        })
        .select('*, profiles:profiles!user_id(*)')
        .single();

      if (dbError) throw dbError;

      onToast('Story berhasil diposting!', 'success');
      
      // Update local state directly
      startTransition(() => {
        setStories(prev => [...prev, newStory]);
        setGroupedStories(prev => {
          const uId = currentUser.id;
          const currentList = prev[uId] || [];
          return {
            ...prev,
            [uId]: [...currentList, newStory]
          };
        });
      });
    } catch (err: any) {
      console.error('Failed to create story:', err);
      onToast(err.message || 'Gagal memposting story.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCircleClick = (userId: string) => {
    const userStories = groupedStories[userId];
    if (userStories && userStories.length > 0) {
      onOpenStoryViewer(userStories, 0);
    }
  };

  // Get list of group authors
  const uniqueStoryAuthors = Object.keys(groupedStories).filter(uid => uid !== currentUser?.id);
  const userHasActiveStory = currentUser ? !!groupedStories[currentUser.id] : false;

  return (
    <div className="w-full bg-zinc-950 border-b border-zinc-900 py-4 px-4 select-none relative">
      <div className="flex gap-4 items-center overflow-x-auto scrollbar-none scroll-smooth">
        {/* Hidden File Input for Story Uploading */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* First Item: "Kisahmu" (Logged in user story circle) */}
        {currentUser && (
          <StoryCircle
            username={currentProfile?.username || currentUser.email?.split('@')[0] || 'saya'}
            avatarUrl={currentProfile?.avatar_url}
            isCurrentUser={true}
            hasStory={userHasActiveStory}
            onClick={() => userHasActiveStory && handleCircleClick(currentUser.id)}
            onAddStory={handleAddStoryClick}
          />
        )}

        {/* Divider separator */}
        <div className="w-[1px] h-12 bg-zinc-900 shrink-0 self-center" />

        {/* Loading state placeholders */}
        {loading && (
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <StorySkeleton key={i} />
            ))}
          </div>
        )}

        {/* List other user stories circles */}
        {!loading && uniqueStoryAuthors.map((uid) => {
          const userStories = groupedStories[uid];
          const firstStory = userStories[0];
          const authorProf = firstStory.profiles || { username: 'wibu_member', avatar_url: null };

          return (
            <StoryCircle
              key={uid}
              username={authorProf.username}
              avatarUrl={authorProf.avatar_url}
              hasStory={true}
              onClick={() => handleCircleClick(uid)}
            />
          );
        })}

        {/* Empty placeholder details */}
        {!loading && uniqueStoryAuthors.length === 0 && !userHasActiveStory && (
          <p className="text-[10px] text-zinc-600 font-mono italic shrink-0 self-center pl-2 select-none">
            Belum ada story tayang hari ini. Mulailah berbagi keseruan!
          </p>
        )}
      </div>

      {uploading && (
        <div className="absolute top-1 right-4 animate-bounce text-[9px] font-bold text-purple-400 font-mono flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full select-none">
          <UploadCloud className="w-2.5 h-2.5 animate-pulse" />
          <span>SINKRONISASI CLOUDINARY...</span>
        </div>
      )}
    </div>
  );
}
