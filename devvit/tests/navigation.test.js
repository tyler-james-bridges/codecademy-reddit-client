import {redditUrl} from '../src/client/navigation';
test('Reddit navigation accepts canonical paths and blocks external or deceptive URLs',()=>{
  expect(redditUrl('/r/science/comments/abc/example/')).toBe('https://www.reddit.com/r/science/comments/abc/example/');
  expect(redditUrl('https://www.reddit.com/r/books/')).toBe('https://www.reddit.com/r/books/');
  for (const url of ['https://example.com','https://reddit.com.evil.test','https://user@reddit.com','javascript:alert(1)','//evil.test/path']) expect(redditUrl(url)).toBeNull();
});
