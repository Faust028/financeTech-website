import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { FeedbackProvider } from './components/ui/Feedback';
import { SettingsProvider } from './hooks/useSettings';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <FeedbackProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </FeedbackProvider>
    </BrowserRouter>
  </StrictMode>,
);
