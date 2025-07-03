import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { Onboarding } from './components/Onboarding';
import './index.css';
import { electron } from '@/services/electron';
import { getPlatform } from './utils/platform';
import { GlobalServicesContextProvider } from './services/GlobalServicesContextProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element. Make sure your index.html has a div with id='root'.");
}

const root = ReactDOM.createRoot(rootElement);

/**
 * The main asynchronous function to start the application.
 * It fetches the initial onboarding state and then renders the appropriate component.
 */
async function startApp(): Promise<void> {
    try {
        await getPlatform();
        
        const { hasOnboarded }: { hasOnboarded: boolean } = await electron.requestHasOnboarded();
        root.render(
            <React.StrictMode>
                <GlobalServicesContextProvider>
                    {/* Conditionally render the Onboarding flow or the main App. */}
                    {hasOnboarded ? <App /> : <Onboarding />}
                </GlobalServicesContextProvider>
            </React.StrictMode>
        );
    } catch (error) {
        console.error('Failed to start the application:', error);
    }
}

// Execute the startup function.
startApp(); 