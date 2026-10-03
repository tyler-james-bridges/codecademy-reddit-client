import {shallow} from 'enzyme';
import {PostCard} from '../src/PostCard';
import {samplePosts} from '../src/samples';
test('the heading and comments open the selected conversation', () => {
  const open = jest.fn();
  const card = shallow(<PostCard post={samplePosts[0]} onOpen={open}/>);
  expect(card.find('h3').text()).toBe(samplePosts[0].title);
  card.find('h3 button').simulate('click');
  card.find('.post-footer button').simulate('click');
  expect(open.mock.calls).toEqual([[samplePosts[0]], [samplePosts[0]]]);
});
test('long previews are bounded and text posts without bodies remain readable', () => {
  expect(shallow(<PostCard post={{...samplePosts[0],body:'a'.repeat(300)}} onOpen={()=>{}}/>).find('.excerpt').text()).toHaveLength(150);
  expect(shallow(<PostCard post={{...samplePosts[0],body:''}} onOpen={()=>{}}/>).find('.excerpt').exists()).toBe(false);
});
