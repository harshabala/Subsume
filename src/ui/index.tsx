import { render } from 'preact';
import { App } from './App';
import { applyThemePreference } from '../shared/theme';
import '../shared/tokens.css';
import '../styles/sanctuary.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/library.css';

applyThemePreference('dark');

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
