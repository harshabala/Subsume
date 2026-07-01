import { render } from 'preact';
import { App } from './App';
import '../shared/tokens.css';
import '../styles/sanctuary.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/library.css';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
