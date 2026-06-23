import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { Profile } from '../types/database';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  // Fallback: if a user is authenticated but has no row in `profiles` yet
  // (e.g. signup happened before email confirmation, so the original insert
  // was blocked by RLS), create it now from the metadata we stashed at signup.
  const ensureProfile = useCallback(async (authUser: any) => {
    const existing = await fetchProfile(authUser.id);
    if (existing) return existing;

    const meta = authUser.user_metadata || {};
    const fallbackUsername =
      meta.username || (authUser.email ? authUser.email.split('@')[0] : `user${authUser.id.slice(0, 8)}`);

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        username: fallbackUsername,
        display_name: meta.display_name || fallbackUsername,
        avatar_url: null,
        bio: 'Penggemar Anime Nusantara 🇮🇩',
        followers_count: 0,
        following_count: 0,
        posts_count: 0
      })
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error auto-creating profile:', error.message);
      return null;
    }
    return data as Profile;
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) {
      setProfile(p);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Check active session on load
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          if (mounted) setUser(session.user);
          const userProfile = await ensureProfile(session.user);
          if (mounted && userProfile) setProfile(userProfile);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) setLoading(true);
      if (session && session.user) {
        if (mounted) setUser(session.user);
        const userProfile = await ensureProfile(session.user);
        if (mounted && userProfile) setProfile(userProfile);
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfile]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
    setProfile,
  };
}
