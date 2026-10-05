import { Hono } from 'hono';
import { communities, type Community, type RedditPost } from '../../shared/api.ts';

type PostId = `t3_${string}`;
type Listing<T> = { all(): Promise<T[]> };
type ListingOptions = { limit: number; pageSize: number };

export type SourcePost = {
  id: string;
  title: string;
  subredditName: string;
  authorName: string;
  score: number;
  numberOfComments: number;
  body: string | undefined;
  permalink: string;
  url: string;
  nsfw: boolean;
  removed: boolean;
};

export type SourceComment = {
  id: string;
  authorName: string;
  body: string;
  score: number;
  removed: boolean;
};

export type RedditReader = {
  getHotPosts(options: ListingOptions & { subredditName: string }): Listing<SourcePost>;
  searchPosts(options: ListingOptions & { query: string; subredditName?: string }): Listing<SourcePost>;
  getPostById(postId: PostId): Promise<SourcePost>;
  getComments(options: ListingOptions & { postId: PostId; depth: number }): Listing<SourceComment>;
};

const limit = 30;
const isCommunity = (value: string): value is Community => communities.some((name) => name === value);
const isPostId = (value: string): value is PostId => /^t3_[a-z0-9]{1,16}$/.test(value);
const isVisible = (post: SourcePost) => !post.nsfw && !post.removed;

const summarize = (post: SourcePost): RedditPost => ({
  id: post.id,
  title: post.title,
  community: post.subredditName,
  author: post.authorName,
  score: post.score,
  count: post.numberOfComments,
  body: post.body ?? '',
  permalink: post.permalink,
  url: post.url,
  accent: 'sage',
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function retryAfter(headers: unknown): string | undefined {
  const value = headers instanceof Headers
    ? headers.get('Retry-After')
    : isRecord(headers) ? headers['retry-after'] ?? headers['Retry-After'] : undefined;
  if (typeof value !== 'string') return undefined;
  if (/^\d+$/.test(value)) return value;
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)
    && Number.isFinite(Date.parse(value))) return value;
  return undefined;
}

type UpstreamFailure = { status: 403 | 404 | 429 | 502; message: string; retryAfter?: string };

function upstreamFailure(error: unknown): UpstreamFailure {
  const response = isRecord(error) && isRecord(error.response) ? error.response : undefined;
  const status = isRecord(error) ? error.status ?? error.statusCode ?? response?.status : undefined;
  const code = isRecord(error) ? error.code : undefined;
  const headers = isRecord(error) ? error.headers ?? response?.headers ?? error.meta : undefined;
  if (status === 429 || code === 'resource_exhausted') {
    return { status: 429, message: 'Reddit is receiving too many requests. Please try again shortly.', retryAfter: retryAfter(headers) };
  }
  if (status === 401 || status === 403 || code === 'permission_denied' || code === 'unauthenticated') {
    return { status: 403, message: 'Reddit has restricted access to this content.' };
  }
  if (status === 404 || code === 'not_found') {
    return { status: 404, message: 'This Reddit content is no longer available.' };
  }
  return { status: 502, message: 'Reddit could not be reached. Please try again.' };
}

export function createRedditApi(reader: RedditReader) {
  const api = new Hono();

  api.onError((error, c) => {
    const failure = upstreamFailure(error);
    if (failure.status === 429 && failure.retryAfter !== undefined) {
      c.header('Retry-After', failure.retryAfter);
    }
    return c.json({ error: failure.message }, failure.status);
  });

  api.get('/feed', async (c) => {
    const community = c.req.query('community') ?? 'popular';
    const query = c.req.query('q')?.trim() ?? '';
    if (!isCommunity(community) || query.length > 200) {
      return c.json({ error: 'Choose a listed community and keep searches to 200 characters or fewer.' }, 400);
    }
    const options = { limit, pageSize: limit };
    const posts = query
      ? await reader.searchPosts({
        ...options, query, ...(community === 'popular' ? {} : { subredditName: community }),
      }).all()
      : await reader.getHotPosts({ ...options, subredditName: community }).all();
    return c.json({ posts: posts.filter(isVisible).slice(0, limit).map(summarize) });
  });

  api.get('/comments', async (c) => {
    const postId = c.req.query('postId') ?? '';
    if (!isPostId(postId)) return c.json({ error: 'Select a valid Reddit post.' }, 400);
    const post = await reader.getPostById(postId);
    if (!isVisible(post)) return c.json({ error: 'This Reddit post is unavailable.' }, 404);
    const comments = await reader.getComments({ postId, limit, pageSize: limit, depth: 1 }).all();
    return c.json({
      comments: comments.filter((comment) => !comment.removed).slice(0, limit).map((comment) => ({
        id: comment.id, author: comment.authorName, body: comment.body, score: comment.score,
      })),
    });
  });

  return api;
}
