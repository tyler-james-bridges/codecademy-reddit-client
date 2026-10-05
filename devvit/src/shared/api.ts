export type Community = 'popular' | 'technology' | 'science' | 'design' | 'space' | 'books';
export const communities: readonly Community[] = [
  'popular', 'technology', 'science', 'design', 'space', 'books',
];

export type RedditPost = {
  id: string;
  title: string;
  community: string;
  author: string;
  score: number;
  count: number;
  body: string;
  permalink: string;
  url: string;
  accent: 'sage';
};
export type RedditComment = { id: string; author: string; body: string; score: number };
export type FeedResponse = { posts: RedditPost[] };
export type CommentsResponse = { comments: RedditComment[] };
export type ApiError = { error: string };
