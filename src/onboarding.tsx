import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { Onboarding } from './apps/onboardingApp/Onboarding';
import './apps/onboardingApp/onboarding.css';
import { SharedStateProvider } from '@/shared/shared';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Failed to find the root element. Make sure your onboarding.html has a div with id='root'.");
}

const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <SharedStateProvider>
            <Onboarding />
        </SharedStateProvider>
    </StrictMode>
);
