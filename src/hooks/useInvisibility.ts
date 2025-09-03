import { useState, useEffect } from 'react';
import { send, on, off } from '@/services/electron';

export function useInvisibility(): {
    isInvisible: boolean;
    toggleInvisibility: () => void;
} {
    const [isInvisible, setIsInvisible] = useState<boolean>(false);

    useEffect(() => {
        send('get-invisible', null);
        
        const handleInvisibleChanged = ({ invisible }: { invisible: boolean }) => {
            setIsInvisible(invisible);
        };
        
        on('invisible-changed', handleInvisibleChanged);
        
        return () => off('invisible-changed', handleInvisibleChanged);
    }, []);

    const toggleInvisibility = () => {
        send('toggle-invisible', null);
    };

    return {
        isInvisible,
        toggleInvisibility,
    };
}
