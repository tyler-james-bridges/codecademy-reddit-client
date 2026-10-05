export const communities = [
  {id:'popular', name:'All communities', mark:'✳'},
  {id:'technology', name:'Technology', mark:'⌘'},
  {id:'science', name:'Science', mark:'◌'},
  {id:'Design', name:'Design', mark:'▧'},
  {id:'space', name:'Space', mark:'↗'},
  {id:'books', name:'Books', mark:'▤'},
];
export const samplePosts = [
  {id:'sample-1', community:'Design', title:'What makes a digital space feel calm?', author:'sample_studio', score:248, count:3, body:'A little space, a clear hierarchy, and fewer decisions.\n\nWe have been thinking about the small design choices that make a big difference. **What would you add to the list?**', accent:'peach'},
  {id:'sample-2', community:'technology', title:'The joy of building something small, just for yourself', author:'sample_builder', score:182, count:2, body:'A weekend project does not have to become a startup. Sometimes a tiny tool that solves your own problem is enough.\n\nWhat have you built lately?', accent:'sage'},
  {id:'sample-3', community:'space', title:'A reminder to look up tonight', author:'sample_observer', score:396, count:2, body:'You do not need a telescope to enjoy the night sky. Find a quiet place, let your eyes adjust, and take your time.\n\nWhat was the first constellation you learned?', accent:'lilac'},
  {id:'sample-4', community:'science', title:'The everyday experiments that made you curious', author:'sample_lab', score:127, count:2, body:'From growing a seed on a windowsill to making a paper airplane: science often starts with a small question.\n\nTell us about an experiment that stayed with you.', accent:'sand'},
  {id:'sample-5', community:'books', title:'Which book made you see a familiar place differently?', author:'sample_reader', score:84, count:2, body:'Some books change the way we notice the world around us.\n\nShare a favorite and what you noticed afterward.', accent:'peach'},
  {id:'sample-6', community:'technology', title:'Learning in public, one small project at a time', author:'sample_coder', score:213, count:2, body:'Keep a project journal. Write down one thing that worked, one thing that failed, and one thing to try next.\n\nA small habit can make progress easier to see.', accent:'sage'},
];
export function sampleComments(post) {
  return [
    {id:`${post.id}-a`, author:'sample_neighbor', body:'I like this question. The small details are often the ones we remember.', score:24},
    {id:`${post.id}-b`, author:'sample_maker', body:'My favorite approach is to **start small**, notice what works, and build from there.', score:12},
  ];
}
