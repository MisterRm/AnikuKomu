import { useState, useEffect, TransitionEvent, useTransition, useMemo, startTransition } from 'react';
import { supabase } from './lib/supabase/client';
import { Profile, Story } from './types/database';
import { useAuth } from './hooks/useAuth';
import { ToastContainer, ToastMessage, ToastType } from './components/ui/Toast';

// Layout and UI primitives
import Sidebar from './components/layout/Sidebar';
import RightSidebar from './components/layout/RightSidebar';
import BottomNav from './components/layout/BottomNav';
import { Skeleton } from './components/ui/Skeleton';
import { Flame } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// Specialized pages
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import FeedPage from './components/pages/FeedPage';
import ExplorePage from './components/pages/ExplorePage';
import CreatePostPage from './components/pages/CreatePostPage';
import ProfilePage from './components/pages/ProfilePage';
import EditProfilePage from './components/pages/EditProfilePage';

// Fullscreen Overlays
import StoryViewer from './components/story/StoryViewer';
import CommentSheet from './components/post/CommentSheet';

export default function App() {
  const { user, profile, loading: authLoading, signOut, refreshProfile, setProfile } = useAuth();
  
  // Custom router state tracking
  const [currentRoute, setCurrentRoute] = useState<string>('feed');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [token, setToken] = useState<string | null>(null);

  // Active overlay managers
  const [activeStoryDeck, setActiveStoryDeck] = useState<Story[] | null>(null);
  const [storyStartIndex, setStoryStartIndex] = useState<number>(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  const [, startRouteTransition] = useTransition();

  // Toast notifier helper function
  const showToast = (text: string, type: ToastType) => {
    const fresh: ToastMessage = {
      id: Date.now().toString(),
      text,
      type
    };
    startTransition(() => {
      setToasts(prev => [...prev, fresh]);
    });
  };

  const removeToast = (id: string) => {
    startTransition(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    });
  };

  // Sync token on user update
  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setToken(session.access_token);
      });
    } else {
      setToken(null);
    }
  }, [user]);

  // Client side hash navigation listener coordination fallback
  useEffect(() => {
    const isSupabaseAuthHash = (hash: string) =>
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('type=signup') ||
      hash.includes('type=recovery') ||
      hash.includes('type=magiclink') ||
      hash.includes('error=') ||
      hash.includes('error_description=');

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && isSupabaseAuthHash(hash)) {
        // Supabase already parsed/consumed this for the session.
        // Clean the URL and send the user to the feed instead of 404.
        window.history.replaceState(null, '', window.location.pathname);
        startRouteTransition(() => {
          setCurrentRoute('feed');
        });
        return;
      }
      if (hash) {
        startRouteTransition(() => {
          setCurrentRoute(hash);
        });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run on mount
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (route: string) => {
    window.location.hash = route;
    startRouteTransition(() => {
      setCurrentRoute(route);
    });
  };

  // Logout handler
  const handleLogout = async () => {
    await signOut();
    showToast('Berhasil keluar dari AnikuKomu. Sampai jumpa lagi, Sasis!', 'info');
    handleNavigate('login');
  };

  const handleSelectSelectTag = (tag: string) => {
    showToast(`Mencari postingan tren: #${tag}`, 'info');
    handleNavigate('explore');
  };

  // Router view page picker implementation
  const renderPage = () => {
    if (!user) {
      if (currentRoute === 'register') {
        return (
          <RegisterPage
            onNavigateToLogin={() => handleNavigate('login')}
            onSuccess={() => handleNavigate('feed')}
            onToast={showToast}
          />
        );
      }
      return (
        <LoginPage
          onNavigateToRegister={() => handleNavigate('register')}
          onSuccess={() => handleNavigate('feed')}
          onToast={showToast}
        />
      );
    }

    // Is logged in
    if (currentRoute === 'feed' || currentRoute === 'login' || currentRoute === 'register') {
      return (
        <FeedPage
          currentUser={user}
          currentProfile={profile}
          token={token}
          onOpenStoryViewer={(deck, idx) => {
            setActiveStoryDeck(deck);
            setStoryStartIndex(idx);
          }}
          onOpenComments={setActiveCommentPostId}
          onToast={showToast}
          onNavigateToUser={(u) => handleNavigate(`profile/${u}`)}
          onSelectTag={handleSelectSelectTag}
        />
      );
    }

    if (currentRoute === 'explore') {
      return (
        <ExplorePage
          currentUser={user}
          token={token}
          onOpenComments={setActiveCommentPostId}
          onToast={showToast}
          onNavigateToUser={(u) => handleNavigate(`profile/${u}`)}
        />
      );
    }

    if (currentRoute === 'post/create') {
      return (
        <CreatePostPage
          currentUser={user}
          token={token}
          onSuccess={() => handleNavigate('feed')}
          onToast={showToast}
        />
      );
    }

    if (currentRoute === 'profile/edit') {
      return (
        <EditProfilePage
          currentProfile={profile}
          token={token}
          onSuccess={() => handleNavigate(`profile/${profile?.username || 'me'}`)}
          onBack={() => window.history.back()}
          onToast={showToast}
          onRefreshProfile={refreshProfile}
        />
      );
    }

    if (currentRoute.startsWith('profile/')) {
      const usernameParam = currentRoute.split('/')[1] || '';
      return (
        <ProfilePage
          key={usernameParam} // Force re-render on user-to-user routing
          usernameParam={usernameParam}
          currentUser={user}
          currentProfile={profile}
          token={token}
          onNavigateToEdit={() => handleNavigate('profile/edit')}
          onOpenComments={setActiveCommentPostId}
          onToast={showToast}
          onNavigateToUser={(u) => handleNavigate(`profile/${u}`)}
        />
      );
    }

    // Default Fallback
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50dvh]">
        <h3 className="text-zinc-400 font-bold">Halaman Tidak Ditemukan</h3>
        <button
          onClick={() => handleNavigate('feed')}
          className="mt-4 px-4 py-2 bg-purple-500 rounded-xl font-bold text-xs"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  };

  const isAuthPage = !user;

  const currentRouteUsername = useMemo(() => profile?.username || 'me', [profile]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center animate-bounce shadow-2xl shadow-purple-500/20">
          <Flame className="w-8 h-8 text-white stroke-[2.5]" />
        </div>
        <p className="text-zinc-500 font-mono text-[11px] uppercase tracking-widest font-bold mt-4 animate-pulse">
          MEMUAT ANIKUKOMU...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased overflow-wrap-anywhere">
      <div className="max-w-7xl mx-auto flex justify-center">
        {/* Left Side Sidebar on Desktop */}
        {!isAuthPage && (
          <Sidebar
            currentRoute={currentRoute}
            onChangeRoute={handleNavigate}
            username={currentRouteUsername}
            onLogout={handleLogout}
            currentProfile={profile}
          />
        )}

        {/* Center Container block layouts */}
        <main className={`flex-1 ${
          isAuthPage 
            ? 'w-full flex items-center justify-center min-h-screen p-4' 
            : 'max-w-[640px] border-x border-zinc-900/60 min-h-screen pb-20 md:pb-6 md:pl-0 md:ml-[240px] xl:mr-[340px] xl:ml-[240px]'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRoute + (user ? '_auth' : '_anon')}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="w-full h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right Side Panel Widgets (Who to follow & trends) on Desktop (only if resolved loggedIn) */}
        {!isAuthPage && (
          <RightSidebar
            currentUserId={user?.id}
            token={token}
            onSelectTag={handleSelectSelectTag}
            onNavigateToUser={(u) => handleNavigate(`profile/${u}`)}
          />
        )}

        {/* Mobile Bottom Navigation bar (rendered on mobile only) */}
        {!isAuthPage && (
          <BottomNav
            currentRoute={currentRoute}
            onChangeRoute={handleNavigate}
            username={currentRouteUsername}
          />
        )}
      </div>

      {/* Fullscreen Stories Immersive Viewer overlays */}
      <AnimatePresence>
        {activeStoryDeck && (
          <StoryViewer
            stories={activeStoryDeck}
            initialIndex={storyStartIndex}
            onClose={() => {
              setActiveStoryDeck(null);
              setStoryStartIndex(0);
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Comment side drawer or bottom sheet panels */}
      <AnimatePresence>
        {activeCommentPostId && (
          <CommentSheet
            postId={activeCommentPostId}
            token={token}
            currentUser={user}
            onCommentsCountChange={(newTotal) => {
              // Direct state sync matching active indices
            }}
            onClose={() => setActiveCommentPostId(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating Portals for Toast alerts alerts */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
