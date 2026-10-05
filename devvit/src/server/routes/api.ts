import { reddit } from '@devvit/web/server';
import { createRedditApi } from '../core/reddit.ts';

export const api = createRedditApi(reddit);
