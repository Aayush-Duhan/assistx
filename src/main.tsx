import { createRoot } from 'react-dom/client';
import { App } from './components/app/App';
import { Onboarding } from './components/app/Onboarding';
import './index.css';
import 'katex/dist/katex.min.css';
import { invoke } from '@/services/electron';
import { GlobalServicesContextProvider } from './services/GlobalServicesContextProvider';
import { StrictMode } from 'react';
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element. Make sure your index.html has a div with id='root'.");
}

const root = createRoot(rootElement);

async function startApp(): Promise<void> {
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