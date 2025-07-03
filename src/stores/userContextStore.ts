import { makeObservable, observable, action } from 'mobx';

/**
 * Store to manage user context that will be included in AI conversations
 * to provide more personalized responses.
 */
export class UserContextStore {
    userContext: string = '';

    constructor() {
        makeObservable(this, {
            userContext: observable,
            setUserContext: action,
        });
        
        // Load from localStorage on initialization
        this.loadFromStorage();
    }

    /**
     * Sets the user context and saves it to localStorage
     */
    setUserContext = (context: string): void => {
        this.userContext = context;
        this.saveToStorage();
    };

    /**
     * Gets the current user context
     */
    getUserContext(): string {
        return this.userContext;
    }

    /**
     * Saves the user context to localStorage
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem('userContext', this.userContext);
        } catch (error) {
            console.warn('Failed to save user context to localStorage:', error);
        }
    }

    /**
     * Loads the user context from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem('userContext');
            if (stored !== null) {
                this.userContext = stored;
            }
        } catch (error) {
            console.warn('Failed to load user context from localStorage:', error);
        }
    }
}

// Create a singleton instance
export const userContextStore = new UserContextStore(); 