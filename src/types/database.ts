export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
}

export interface Anime {
  id: string; // or number depending on DB, uuid / custom ID
  mal_id: number | null;
  title: string;
  cover_url: string | null;
  genre: string[];
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string;
  image_public_id: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: Profile; // nested profile details when queried with relation
  animes?: Anime[]; // nested tagged animes
}

export interface PostAnimeTag {
  post_id: string;
  anime_id: string;
}

export interface Story {
  id: string;
  user_id: string;
  image_url: string;
  image_public_id: string | null;
  expires_at: string;
  created_at: string;
  profiles?: Profile; // nested profile details
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Like {
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  profiles?: Profile; // nested profile details
  replies?: Comment[]; // nested comment replies
}

export interface CommentLike {
  user_id: string;
  comment_id: string;
}
