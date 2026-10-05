// Run in the Computer Use session with the expanded Devvit frame locator.
// This selects fictional samples explicitly; live API verification is separate.
export async function run(frame) {
  const check = (value, message) => {if (!value) throw new Error(message);};
  const role = (name, kind='button') => frame.getByRole(kind,{name,exact:true});
  const main = frame.getByRole('main');
  const dialog = frame.getByRole('dialog');
  const title = 'The joy of building something small, just for yourself';

  if (await role('Close discussion').count()) await role('Close discussion').click();
  if (await role('Explore samples').count()) await role('Explore samples').click({force:true});
  await role('Try live data').waitFor({state:'visible'});

  await role('Technology').click();
  await role('Search conversations','textbox').fill('small');
  await role('Search').click();
  await role(title).waitFor({state:'visible'});
  check(await frame.getByRole('article').count() === 2, 'Combined search must return two technology posts');

  await role(title).click();
  await role('The replies','heading').waitFor({state:'visible'});
  await dialog.getByRole('article').nth(1).waitFor({state:'visible'});
  check(await dialog.getByRole('article').count() === 2, 'Two sample replies must be rendered');

  await role('Close discussion').press('Escape');
  await dialog.waitFor({state:'hidden'});
  check(await dialog.count() === 0, 'Escape must dismiss the modal');
  check(await main.evaluate(() => document.activeElement?.textContent) === title, 'Focus must return to originating post');

  await role('Search conversations','textbox').fill('no-such-term');
  await role('Search').click();
  await role('No conversations found.','heading').waitFor({state:'visible'});
  await role('Reset search and filters').click();
  await role('Learning in public, one small project at a time').waitFor({state:'visible'});
  check(await frame.getByRole('article').count() === 6, 'Reset must recover all conversations');

  return {passed:6, scenarios:['combined filters','post details','comments','Escape close','focus restoration','empty-state recovery']};
}
