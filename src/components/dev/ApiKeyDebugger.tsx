import React from 'react';
import { observer } from 'mobx-react-lite';
import { aiApiService } from '../../services/AiApiService';
import { getEnvVar } from '../../utils/env';

/**
 * Debug component to check API key configuration
 */
export const ApiKeyDebugger = observer(() => {
    const apiKey = getEnvVar('GOOGLE_GENERATIVE_AI_API_KEY');
    const isConfigured = aiApiService.isConfigured();
    
    return (
        <div className="p-4 bg-gray-900 text-white rounded-lg space-y-3">
            <h3 className="text-lg font-bold">🔧 API Configuration Debug</h3>
            
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className={apiKey ? '✅' : '❌'}></span>
                    <span>API Key Found:</span>
                    <code className="bg-gray-800 px-2 py-1 rounded">
                        {apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT FOUND'}
                    </code>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className={isConfigured ? '✅' : '❌'}></span>
                    <span>Service Configured:</span>
                    <span>{isConfigured ? 'YES' : 'NO'}</span>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded">
                    <h4 className="font-bold text-yellow-300 mb-2">📋 Setup Instructions:</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside text-yellow-100">
                        <li>Create a <code>.env.local</code> file in the project root</li>
                        <li>Add: <code>GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here</code></li>
                        <li>Get your API key from: <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a></li>
                        <li>Restart the app after adding the API key</li>
                    </ol>
                </div>
                
                {!apiKey && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-600 rounded">
                        <h4 className="font-bold text-red-300 mb-2">⚠️ Missing API Key</h4>
                        <p className="text-sm text-red-100">
                            The Google AI API key is not found. Please follow the setup instructions above.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}); 