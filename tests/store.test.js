import {makeStore, feedReducer, loadFeed} from '../src/store';
test('sample search applies both text and community filters', async () => {
  const store=makeStore();
  await store.dispatch(loadFeed({community:'technology',query:'small',mode:'sample'}));
  expect(store.getState().feed.posts).toHaveLength(2);
  expect(store.getState().feed.posts.every(p => p.community === 'technology')).toBe(true);
  await store.dispatch(loadFeed({community:'books',query:'no-such-term',mode:'sample'}));
  expect(store.getState().feed.posts).toEqual([]);
});
test('older successful or failed responses never overwrite a newer search', () => {
  let state=feedReducer(undefined,loadFeed.pending('old',{query:'first'}));
  state=feedReducer(state,loadFeed.pending('new',{query:'second'}));
  state=feedReducer(state,loadFeed.fulfilled([{id:'stale'}],'old'));
  state=feedReducer(state,loadFeed.rejected(new Error('stale error'),'old'));
  expect(state.query).toBe('second');
  expect(state.status).toBe('loading');
  state=feedReducer(state,loadFeed.fulfilled([{id:'fresh'}],'new'));
  expect(state.posts).toEqual([{id:'fresh'}]);
});
