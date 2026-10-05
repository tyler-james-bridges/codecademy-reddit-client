import {configureStore, createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {fetchPosts, fetchComments} from './api';
import {samplePosts, sampleComments} from './samples';
export const loadFeed = createAsyncThunk('feed/load', async (filters, {signal}) => filters.mode === 'sample' ? samplePosts.filter(p => (filters.community === 'popular' || p.community === filters.community) && `${p.title} ${p.body}`.toLowerCase().includes(filters.query.toLowerCase())) : fetchPosts(filters, signal));
export const loadComments = createAsyncThunk('comments/load', async (post, {signal}) => post.id.startsWith('sample-') ? sampleComments(post) : fetchComments(post, signal));
const initialState = {community:'popular', query:'', mode:'live', posts:[], status:'idle', error:null, requestId:null};
const feed = createSlice({name:'feed', initialState, reducers:{}, extraReducers:builder => {
  builder.addCase(loadFeed.pending, (state, action) => {Object.assign(state, action.meta.arg, {status:'loading', error:null, requestId:action.meta.requestId, posts:[]});});
  builder.addCase(loadFeed.fulfilled, (state, action) => {if (state.requestId === action.meta.requestId) {state.posts = action.payload; state.status = 'ready';}});
  builder.addCase(loadFeed.rejected, (state, action) => {if (state.requestId === action.meta.requestId && !action.meta.aborted) {state.status = 'error'; state.error = action.error.message;}});
}});
const comments = createSlice({name:'comments', initialState:{items:[], status:'idle', error:null, requestId:null}, reducers:{}, extraReducers:builder => {
  builder.addCase(loadComments.pending, (state, action) => {state.items=[]; state.status='loading'; state.error=null; state.requestId=action.meta.requestId;});
  builder.addCase(loadComments.fulfilled, (state, action) => {if (state.requestId === action.meta.requestId) {state.items=action.payload; state.status='ready';}});
  builder.addCase(loadComments.rejected, (state, action) => {if (state.requestId === action.meta.requestId && !action.meta.aborted) {state.error=action.error.message; state.status='error';}});
}});
export const feedReducer = feed.reducer;
export const makeStore = () => configureStore({reducer:{feed:feed.reducer, comments:comments.reducer}});
