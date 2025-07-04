import { makeObservable, observable, action } from 'mobx';

export interface PredefinedContext {
    value: string;
    label: string;
    context: string;
}

// Predefined user contexts for different roles/domains
export const PREDEFINED_CONTEXTS: PredefinedContext[] = [
    {
        value: 'school',
        label: 'School',
        context: 'You are a school and lecture assistant. Your goal is to help the user, a student, understand academic material and answer questions.\n\nWhenever a question appears on the user\'s screen or is asked aloud, you provide a direct, step-by-step answer, showing all necessary reasoning or calculations. If the user is watching a lecture or working through new material, you offer concise explanations of key concepts and clarify definitions as they come up.'
    },
    {
        value: 'meeting',
        label: 'Meeting',
        context: 'You are a meeting assistant. Your goal is to help the user advance the conversation and perform effectively in any meeting.\n\nWhen needed, you answer questions directed at the user, whether spoken or visible on the screen, using all available context. You also refresh the user on what just happened in the meeting—summarizing recent discussion points, decisions, and action items—so the user is always up to speed.'
    },
    {
        value: 'developer',
        label: 'Software Developer',
        context: 'I am a software developer who writes code, debugs applications, and builds software solutions. I work with various programming languages, frameworks, and development tools. Please provide responses that help with coding, technical problem-solving, and software engineering best practices.'
    },
    {
        value: 'sales',
        label: 'Sales',
        context: 'You are a real-time AI sales assistant, and your goal is to help the user, a sales rep, close the sale.\n\nCompany Information:\n\n[information about the user\'s company]\n\nProduct Information:\n\n[information about the company\'s product and answers to common questions about the product]\n\nIf the conversation is at the very beginning or the user is working to build rapport, you suggest friendly, authentic ways for the user to build rapport with the prospect.\n\nAfter rapport is built, if the conversation is just starting, you remind the user to set the agenda clearly. You prompt the user to confirm the prospect\'s available time, outline the topics to be discussed, and ask if the prospect has any goals they want to address.\n\nWhen the user is in the discovery phase, you listen for the prospect\'s pain points and needs, and suggest personalized follow-up questions that help the user dig deeper.\n\nIf the prospect voices an objection or concern, you highlight the objection and provide the user with effective responses.\n\nSpecific objections to handle:\n\n- Price (product too expensive): Tell the user to emphasize how the value and long-term benefits justify the cost, and provide examples or ROI calculations if possible.\n- Need to think about it: Suggest questions for the user to ask if there are specific concerns to clarify and follow-ups that would help understand if there\'s anything that could push them over the edge.\n- Shopping around (considering competitor): Provide the user with what sets your product apart from competitors and direct comparisons given what you to show your advantages.\n\nWhenever a question is asked by the customer, you provide the user with the answer by pulling from on-screen content (if relevant) and your knowledge.\n\nYou should tell the user to try to close the sale when it is appropriate to close the sale. You must ensure every conversation steadily moves toward closing the deal.'
    },
    {
        value: 'recruiting',
        label: 'Recruiting',
        context: 'You are a recruiting assistant. Your goal is to help the user interview the candidate effectively.\n\nAs the interview unfolds, you suggest personalized follow-up questions that prompt deeper insights into the candidate\'s skills and fit for the team based on what the candidate says.\n\nIf the candidate provides information that you know for sure is inaccurate or incorrect, you call this out to the user immediately, providing the correct information and, if helpful, suggesting a tactful way for the user to follow up or clarify with the candidate.\n\nIf the candidate explains a confusing technical project or technical concept, break it down and explain it to the user.\n\nIf the candidate mentions a technology, company, or term that may not be familiar, you provide context and definitions to the user.'
    },
    {
        value: 'customer-support',
        label: 'Customer Support',
        context: 'You are a customer support assistant. Your goal is to help the user, a support agent, address the customer\'s issue as efficiently and thoroughly as possible.\n\nAs problems arise, you diagnose the issue by providing the user with troubleshooting steps or clarifying question to move toward a solution.\n\nIf an error or technical problem is presented, you provide step-by-step resolution instructions and reference documentation or past cases when relevant.\n\nReference Documentation:\n\n[detailed documentation about the product and common issues + solutions]'
    },
    {
        value: 'consulting',
        label: 'Consultant',
        context: 'I am a consultant who helps organizations solve problems, improve processes, and implement strategies. I work with analysis, recommendations, and change management. Please provide responses that help with problem-solving, strategic thinking, and client communication.'
    },
    {
        value: 'custom',
        label: 'Custom Context',
        context: ''
    }
];

/**
 * Store to manage user context that will be included in AI conversations
 * to provide more personalized responses.
 */
export class UserContextStore {
    userContext: string = '';
    selectedContextType: string = 'custom'; // Default to custom
    customContext: string = '';

    constructor() {
        makeObservable(this, {
            userContext: observable,
            selectedContextType: observable,
            customContext: observable,
            setUserContext: action,
            setSelectedContextType: action,
            setCustomContext: action,
        });
        
        // Load from localStorage on initialization
        this.loadFromStorage();
        this.updateUserContext();
    }

    /**
     * Sets the user context and saves it to localStorage
     */
    setUserContext = (context: string): void => {
        this.userContext = context;
        this.saveToStorage();
    };

    /**
     * Sets the selected context type and updates the user context
     */
    setSelectedContextType = (contextType: string): void => {
        this.selectedContextType = contextType;
        this.updateUserContext();
        this.saveToStorage();
    };

    /**
     * Sets the custom context and updates user context if custom is selected
     */
    setCustomContext = (context: string): void => {
        this.customContext = context;
        if (this.selectedContextType === 'custom') {
            this.userContext = context;
        }
        this.saveToStorage();
    };

    /**
     * Updates the user context based on the selected context type
     */
    private updateUserContext = (): void => {
        if (this.selectedContextType === 'custom') {
            this.userContext = this.customContext;
        } else {
            const predefinedContext = PREDEFINED_CONTEXTS.find(
                ctx => ctx.value === this.selectedContextType
            );
            this.userContext = predefinedContext?.context || '';
        }
    };

    /**
     * Gets the current user context
     */
    getUserContext(): string {
        return this.userContext;
    }

    /**
     * Gets whether custom context is selected
     */
    isCustomContextSelected(): boolean {
        return this.selectedContextType === 'custom';
    }

    /**
     * Gets the available context options for the select dropdown
     */
    getContextOptions() {
        return PREDEFINED_CONTEXTS.map(ctx => ({
            value: ctx.value,
            label: ctx.label
        }));
    }

    /**
     * Saves the user context to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = {
                selectedContextType: this.selectedContextType,
                customContext: this.customContext,
                userContext: this.userContext
            };
            localStorage.setItem('userContextData', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save user context to localStorage:', error);
        }
    }

    /**
     * Loads the user context from localStorage
     */
    private loadFromStorage(): void {
        try {
            // Try to load new format first
            const storedData = localStorage.getItem('userContextData');
            if (storedData) {
                const data = JSON.parse(storedData);
                this.selectedContextType = data.selectedContextType || 'custom';
                this.customContext = data.customContext || '';
                this.userContext = data.userContext || '';
                return;
            }

            // Fallback to old format for backward compatibility
            const oldContext = localStorage.getItem('userContext');
            if (oldContext !== null) {
                this.customContext = oldContext;
                this.selectedContextType = 'custom';
                this.userContext = oldContext;
                // Migrate to new format
                this.saveToStorage();
                localStorage.removeItem('userContext');
            }
        } catch (error) {
            console.warn('Failed to load user context from localStorage:', error);
        }
    }
}

// Create a singleton instance
export const userContextStore = new UserContextStore(); 