let api;
const post={id:'t3_abc',title:'A',community:'books',author:'reader',score:1,count:2,body:'',url:'javascript:alert(1)',permalink:'/r/books/comments/abc/a/'};
beforeEach(() => {jest.resetModules(); api=require('../src/client/api'); global.fetch=jest.fn();});
test('encodes scoped search input and rejects unsafe shared links',async()=>{
  fetch.mockResolvedValue({ok:true,json:async()=>({posts:[post]})});
  const posts=await api.fetchPosts({community:'books',query:'a & b'});
  expect(fetch.mock.calls[0][0]).toBe('/api/feed?community=books&q=a%20%26%20b');
  expect(posts).toHaveLength(1);
  expect(posts[0].url).toBeNull();
});
test('successful responses are cached to reduce API requests',async()=>{
  fetch.mockResolvedValue({ok:true,json:async()=>({hello:'world'})});
  await api.requestJson('/cache'); await api.requestJson('/cache');
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('rate limit provides recovery guidance and prevents immediate retry',async()=>{
  fetch.mockResolvedValue({status:429,headers:{get:()=> '60'}});
  await expect(api.requestJson('/limited')).rejects.toThrow('limiting requests');
  await expect(api.requestJson('/limited')).rejects.toThrow('short pause');
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('access errors and malformed responses do not silently succeed',async()=>{
  fetch.mockResolvedValueOnce({ok:false,status:403});
  await expect(api.fetchPosts({community:'popular',query:''})).rejects.toThrow('access is unavailable');
  fetch.mockResolvedValueOnce({ok:true,json:async()=>({wrong:true})});
  await expect(api.fetchPosts({community:'science',query:''})).rejects.toThrow('unexpected listing');
});
test('retrying an invalid listing fetches fresh data instead of caching the failure',async()=>{
  fetch.mockResolvedValueOnce({ok:true,json:async()=>({posts:[{id:'broken'}]})});
  const filters={community:'science',query:''};
  await expect(api.fetchPosts(filters)).rejects.toThrow('unexpected listing');
  fetch.mockResolvedValueOnce({ok:true,json:async()=>({posts:[]})});
  await expect(api.fetchPosts(filters)).resolves.toEqual([]);
  await expect(api.fetchPosts(filters)).resolves.toEqual([]);
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('retrying invalid comments fetches and caches a valid discussion',async()=>{
  fetch.mockResolvedValueOnce({ok:true,json:async()=>({wrong:true})});
  await expect(api.fetchComments(post)).rejects.toThrow('Comments are unavailable');
  const comment={id:'t1_reply',author:'reader',body:'A useful reply',score:3};
  fetch.mockResolvedValueOnce({ok:true,json:async()=>({comments:[comment]})});
  await expect(api.fetchComments(post)).resolves.toEqual([comment]);
  await expect(api.fetchComments(post)).resolves.toEqual([comment]);
  expect(fetch.mock.calls[0][0]).toBe('/api/comments?postId=t3_abc');
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('bad post IDs never reach the API and aborted requests stay aborted',async()=>{
  await expect(api.fetchComments({id:'../elsewhere'})).rejects.toThrow('valid Reddit post ID');
  expect(fetch).not.toHaveBeenCalled();
  const controller=new AbortController();
  const aborted=new Error('Aborted'); aborted.name='AbortError';
  fetch.mockRejectedValueOnce(aborted);
  await expect(api.fetchPosts({community:'science',query:''},controller.signal)).rejects.toBe(aborted);
  expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
});
