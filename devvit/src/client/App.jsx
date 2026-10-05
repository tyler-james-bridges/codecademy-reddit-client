import {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import ReactMarkdown from 'react-markdown';
import {loadFeed, loadComments} from './store';
import {communities} from './samples';
import {PostCard} from './PostCard';
import {navigateTo} from '@devvit/web/client';
import {redditUrl} from './navigation';

function RedditLink({href, children, ...props}) {
  const target = redditUrl(href);
  return target ? <a {...props} href={target} onClick={event => {event.preventDefault(); navigateTo(target);}}>{children}</a> : <span>{children}</span>;
}
function Markdown({children}) {
  return <ReactMarkdown components={{img:({alt}) => <span>[{alt || 'image'}]</span>, a:({href, children}) => <RedditLink href={href}>{children}</RedditLink>}}>{children}</ReactMarkdown>;
}
function Detail({post, onClose}) {
  const dialog = useRef(null);
  const dispatch = useDispatch();
  const comments = useSelector(state => state.comments);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    const request = dispatch(loadComments(post));
    return () => {request.abort(); element.close(); if (previous instanceof HTMLElement) previous.focus();};
  }, [post, dispatch]);
  return <dialog ref={dialog} className="detail" aria-labelledby="detail-title" onCancel={onClose}>
    <div className="detail-top"><span>THE CONVERSATION</span><button onClick={onClose} aria-label="Close discussion">✕</button></div>
    <div className="detail-body"><div className="eyebrow">r/{post.community} · u/{post.author}</div><h2 id="detail-title">{post.title}</h2>
      <div className="markdown"><Markdown>{post.body || 'Open the original post to view the shared link or media.'}</Markdown></div>
      {post.permalink && <RedditLink className="original" href={post.permalink}>View on Reddit ↗</RedditLink>}
      {post.id.startsWith('sample-') && <p className="sample-note">Original fictional sample conversation.</p>}
      <h3 className="comments-title">The replies</h3>
      {comments.status === 'loading' && <p role="status">Loading replies…</p>}
      {comments.error && <div role="alert"><p>{comments.error}</p><button className="secondary" onClick={() => dispatch(loadComments(post))}>Retry comments</button></div>}
      {comments.status === 'ready' && !comments.items.length && <p>No comments yet.</p>}
      {comments.items.map(comment => <article className="comment" key={comment.id}><div className="eyebrow">u/{comment.author} <span>↑ {comment.score}</span></div><div className="markdown"><Markdown>{comment.body}</Markdown></div></article>)}
    </div>
  </dialog>;
}
export function App() {
  const dispatch = useDispatch();
  const feed = useSelector(state => state.feed);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  useEffect(() => {const request = dispatch(loadFeed({community:'popular', query:'', mode:'live'})); return () => request.abort();}, [dispatch]);
  const load = (changes = {}) => dispatch(loadFeed({community:feed.community, query:feed.query, mode:feed.mode, ...changes}));
  const community = communities.find(item => item.id === feed.community);
  return <>
    <a href="#feed" className="skip">Skip to conversations</a>
    <header className="site-header"><a className="brand" href="#feed" aria-label="Threadlight home" onClick={event => {event.preventDefault(); setSearch(''); setSelected(null); load({community:'popular', query:''});}}><span className="brand-icon">t.</span><span>threadlight<small>FOR REDDIT</small></span></a><div className="source-control"><span className={`source-dot ${feed.mode}`} />{feed.mode === 'sample' ? 'Sample mode' : 'Live Reddit'}<button onClick={() => load({mode:feed.mode === 'sample' ? 'live' : 'sample'})}>{feed.mode === 'sample' ? 'Try live data' : 'Explore samples'}</button></div></header>
    <main className="shell">
      <section className="intro"><p className="kicker">GOOD CONVERSATIONS START WITH CURIOSITY</p><h1>A little curiosity<br />goes a long way<span>.</span></h1><p>A quieter corner for discovering ideas, exploring communities,<br className="desktop-break" /> and finding your next rabbit hole.</p><div className="intro-art" aria-hidden="true"><span className="orbit one"/><span className="orbit two"/><span className="orbit three"/><i>✳</i></div></section>
      <form className="search" role="search" onSubmit={event => {event.preventDefault(); load({query:search.trim()});}}><span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="search">Search conversations</label><input id="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="What are you curious about?" maxLength={200}/><button type="submit">Search <span aria-hidden="true">↗</span></button></form>
      <div className="layout"><aside><h2 className="rail-title">YOUR NEXT RABBIT HOLE</h2><nav className="communities" aria-label="Communities">{communities.map(item => <button key={item.id} aria-pressed={feed.community === item.id} onClick={() => load({community:item.id})}><span aria-hidden="true">{item.mark}</span>{item.name}<span className="arrow" aria-hidden="true">↗</span></button>)}</nav><div className="rail-note"><span aria-hidden="true">✺</span><p>A world of perspectives.<br/>A moment to explore.</p><small>Made for the curious.</small></div></aside>
      <section className="feed" id="feed" aria-labelledby="feed-title"><div className="feed-heading"><div><p className="kicker">THE FEED</p><h2 id="feed-title">{feed.query ? `Results for “${feed.query}”` : feed.community === 'popular' ? 'Worth a little scroll' : community.name}</h2></div><span className="feed-count">{feed.status === 'ready' ? `${feed.posts.length} conversations` : ''}</span></div>
        {feed.mode === 'sample' && <p className="sample-banner">You’re exploring original sample conversations. <button onClick={() => load({mode:'live'})}>Switch to live Reddit ↗</button></p>}
        {feed.status === 'loading' && <div className="loading" role="status"><span className="spinner"/>Finding conversations…</div>}
        {feed.error && <div className="empty" role="alert"><span className="empty-symbol" aria-hidden="true">☁</span><h3>A little pause in the conversation.</h3><p>{feed.error}</p><div className="recovery"><button onClick={() => load()}>Try again</button><button className="secondary" onClick={() => load({mode:'sample'})}>Explore sample conversations</button></div></div>}
        {feed.status === 'ready' && !feed.posts.length && <div className="empty"><span className="empty-symbol" aria-hidden="true">⌕</span><h3>No conversations found.</h3><p>Try another search or explore all communities.</p><button onClick={() => {setSearch(''); load({query:'', community:'popular'});}}>Reset search and filters</button></div>}
        {feed.posts.map(post => <PostCard key={post.id} post={post} onOpen={setSelected}/>)}
      </section></div>
      <footer className="site-footer"><span>threadlight <span aria-hidden="true">✳</span></span><p>An independent learning project. Not affiliated with Reddit.</p><a href="https://www.reddit.com" onClick={event => {event.preventDefault(); navigateTo('https://www.reddit.com');}}>Visit Reddit ↗</a></footer>
    </main>{selected && <Detail post={selected} onClose={() => setSelected(null)}/>}
  </>;
}
