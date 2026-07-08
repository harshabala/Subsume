import { render } from 'preact';
import { App } from './App';
import { NoticeProvider } from './components/NoticeProvider';
import '../shared/tokens.css';
import '../styles/sanctuary.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/library.css';
import './styles/emotional-components.css';
import './styles/sanctuary-media-card.css';
import './styles/sanctuary-shared.css';

const root = document.getElementById('app');
if (root) {
  render(
    <NoticeProvider>
      <App />
    </NoticeProvider>,
    root
  );
}
