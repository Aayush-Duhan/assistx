import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { Onboarding } from './components/Onboarding';
import './index.css';
import { invoke } from '@/services/electron';
import { getPlatform } from './utils/platform';
import { GlobalServicesContextProvider } from './services/GlobalServicesContextProvider';
import { StrictMode } from 'react';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element. Make sure your index.html has a div with id='root'.");
}

const root = createRoot(rootElement);

async function startApp(): Promise<void> {
    await getPlatform();

    const { hasOnboarded }: { hasOnboarded: boolean } = await invoke('request-has-onboarded', null);
    root.render(
        <StrictMode>
            <GlobalServicesContextProvider>
                {hasOnboarded ? <App /> : <Onboarding />}
            </GlobalServicesContextProvider>
        </StrictMode>
    );
}

startApp(); 