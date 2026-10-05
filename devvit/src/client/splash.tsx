import './styles.css';
import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => <main className="splash">
  <span className="brand-icon" aria-hidden="true">t.</span>
  <p className="kicker">THREADLIGHT</p>
  <h1>A little curiosity<br />goes a long way.</h1>
  <p>Discover live conversations, search communities, and read the replies.</p>
  <button onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}>Explore conversations</button>
  <p className="splash-note">An independent learning project.</p>
</main>;
createRoot(document.getElementById('root')!).render(<StrictMode><Splash /></StrictMode>);
