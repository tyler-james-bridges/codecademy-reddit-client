// Run inside the Computer Use session with a bound sample-mode tab.
// This uses only the documented CUA browser interface.
export async function run(tab) {
  const check = (value, message) => {if (!value) throw new Error(message);};
  const role = (name, kind='button') => tab.playwright.getByRole(kind,{name,exact:true});
  await tab.getAXState();
  await role('Technology').click();
  await role('Search conversations','textbox').fill('small');
  await role('Search').click();
  await tab.getAXState();
  check(await tab.playwright.getByRole('article').count() === 2, 'Combined search must return two technology posts');
  const title='The joy of building something small, just for yourself';
  await role(title).click();
  await tab.getAXState();
  check(await role('The replies','heading').isVisible(), 'Discussion must expose replies');
  check(await tab.playwright.getByRole('dialog').getByRole('article').count() === 2, 'Two sample replies must be rendered');
  await role('Close discussion').press('Escape');
  await tab.getAXState();
  check(await tab.playwright.getByRole('dialog').count() === 0, 'Escape must dismiss the modal');
  check(await tab.playwright.evaluate(() => document.activeElement.textContent) === title, 'Focus must return to originating post');
  await role('Search conversations','textbox').fill('no-such-term');
  await role('Search').click();
  await tab.getAXState();
  check(await role('No conversations found.','heading').isVisible(), 'Empty state must be displayed');
  await role('Reset search and filters').click();
  await tab.getAXState();
  check(await tab.playwright.getByRole('article').count() === 6, 'Reset must recover all conversations');
  return {passed:6, scenarios:['combined filters','post details','comments','Escape close','focus restoration','empty-state recovery']};
}
