export function PostCard({post, onOpen}) {
  return <article className="post-card">
    <div className={`post-mark ${post.accent}`} aria-hidden="true">{post.community.slice(0, 1).toUpperCase()}</div>
    <div className="post-content">
      <div className="eyebrow"><span>r/{post.community}</span><span className="author">u/{post.author}</span></div>
      <h3><button onClick={() => onOpen(post)}>{post.title}</button></h3>
      {post.body && <p className="excerpt">{post.body.replace(/[*#`]/g, '').slice(0, 150)}</p>}
      <div className="post-footer"><span>↑ {new Intl.NumberFormat('en', {notation:'compact'}).format(post.score)} points</span><button onClick={() => onOpen(post)} aria-label={`Read comments on ${post.title}`}>◯ {post.count} comments <span aria-hidden="true">↗</span></button></div>
    </div>
  </article>;
}
