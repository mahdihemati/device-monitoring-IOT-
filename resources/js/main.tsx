import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './RootApp';
import { AuthProvider } from './contexts/AuthContext';
import { registerServiceWorker } from './registerServiceWorker';
import '../css/app.css';

createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
);

registerServiceWorker();
