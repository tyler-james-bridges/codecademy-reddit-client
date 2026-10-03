let api;
beforeEach(() => {jest.resetModules(); api=require('../src/api'); global.fetch=jest.fn();});
test('encodes search input and maps safe non-adult posts',async()=>{
  fetch.mockResolvedValue({ok:true,json:async()=>({data:{children:[{kind:'t3',data:{id:'abc',title:'A',subreddit:'books',url:'javascript:alert(1)'}},{kind:'t3',data:{id:'adult',over_18:true}}]}})});
  const posts=await api.fetchPosts({community:'books',query:'a & b'});
  expect(fetch.mock.calls[0][0]).toContain('q=a%20%26%20b&restrict_sr=true');
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
  fetch.mockResolvedValueOnce({ok:true,json:async()=>({wrong:true})});
  const filters={community:'science',query:''};
  await expect(api.fetchPosts(filters)).rejects.toThrow('unexpected listing');
  fetch.mockResolvedValueOnce({ok:true,json:async()=>({data:{children:[]}})});
  await expect(api.fetchPosts(filters)).resolves.toEqual([]);
  await expect(api.fetchPosts(filters)).resolves.toEqual([]);
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('retrying invalid comments fetches and caches a valid discussion',async()=>{
  const post={permalink:'/r/science/comments/abc/a_discussion/'};
  fetch.mockResolvedValueOnce({ok:true,json:async()=>[{data:{children:[]}}]});
  await expect(api.fetchComments(post)).rejects.toThrow('Comments are unavailable');
  const comment={id:'reply',author:'reader',body:'A useful reply',score:3};
  fetch.mockResolvedValueOnce({ok:true,json:async()=>[{}, {data:{children:[{kind:'t1',data:comment},{kind:'more',data:{}}]}}]});
  await expect(api.fetchComments(post)).resolves.toEqual([comment]);
  await expect(api.fetchComments(post)).resolves.toEqual([comment]);
  expect(fetch).toHaveBeenCalledTimes(2);
});
