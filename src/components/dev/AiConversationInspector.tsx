import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { ScrollableContent } from '../ui/ScrollableContent';

// Type definitions
interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    experimental_attachments?: any[];
}

interface AiResponse {
    messages: Message[];
    provider: string;
    model: string;
    state: {
        state: 'streaming' | 'finished' | 'error';
        text: string;
    };
}

interface AiConversation {
    latestResponse: AiResponse;
}

/**
 * Displays the raw message history of the current AI conversation for debugging.
 */
export const AiConversationInspector = observer((): React.ReactElement => {
    const { aiResponsesService } = useGlobalServices();
    const currentConversation = aiResponsesService?.currentConversation as AiConversation | null;

    if (!currentConversation) {
        return React.createElement(
            'div',
            { className: "p-4 text-white/60 text-sm" },
            "No conversation active"
        );
    }

    // Combine previous and latest messages for a full view.
    const allMessages: Message[] = [...currentConversation.latestResponse.messages];
    const { provider, model } = currentConversation.latestResponse;

    if (currentConversation.latestResponse.state.state === 'finished') {
        allMessages.push({
            role: 'assistant',
            content: currentConversation.latestResponse.state.text,
        });
    }

    return React.createElement(
        ScrollableContent,
        {
            maxHeight: 800,
            scrollUpAccelerator: "CommandOrControl+[",
            scrollDownAccelerator: "CommandOrControl+]",
            enableSnapToBottom: true,
            children: React.createElement(
                'div',
                { className: "space-y-2" },
                React.createElement(
                    'div',
                    { className: "font-semibold px-0 text-white/90 text-sm" },
                    "Metadata"
                ),
                React.createElement(
                    'div',
                    { className: "px-0" },
                    React.createElement(
                        'pre',
                        { className: "text-[10px] leading-tight text-wrap text-white/70" },
                        React.createElement('b', null, 'MODEL'),
                        `: ${provider}/${model}`
                    )
                ),
                ...allMessages.map((message, index) =>
                    React.createElement(
                        React.Fragment,
                        { key: index },
                        React.createElement(
                            'div',
                            { className: "font-semibold px-0 text-white/90 text-sm" },
                            `Role: ${message.role}`
                        ),
                        message.experimental_attachments?.length ? React.createElement(
                            'div',
                            { className: "px-0" },
                            React.createElement(
                                'pre',
                                { className: "text-[10px] leading-tight text-wrap text-white/70" },
                                React.createElement('b', null, 'ATTACHMENTS'),
                                `: ${message.experimental_attachments.length}`
                            )
                        ) : null,
                        React.createElement(
                            'div',
                            { className: "px-0" },
                            React.createElement(
                                'pre',
                                { className: "text-[10px] leading-tight text-wrap text-white/70" },
                                message.content
                            )
                        )
                    )
                )
            )
        }
    );
}); 