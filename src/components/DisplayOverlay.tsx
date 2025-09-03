import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface Display {
	id: number;
	label: string;
	bounds: { width: number; height: number };
}

interface DisplayOverlayProps {
	display: Display;
	ipcChannel: string;
}

function DisplayOverlay({ display, ipcChannel }: DisplayOverlayProps): React.ReactElement {
	const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
	const [isHovered, setIsHovered] = useState<boolean>(false);


	useEffect(() => {
		const handleHighlight = () => setIsHighlighted(true);
		const handleUnhighlight = () => setIsHighlighted(false);

		window.addEventListener('highlight', handleHighlight);
		window.addEventListener('unhighlight', handleUnhighlight);

		return () => {
			window.removeEventListener('highlight', handleHighlight);
			window.removeEventListener('unhighlight', handleUnhighlight);
		};
	}, []);

	const handleClick = () => {
		if (window.electron?.ipcRenderer) {
			console.log(`[DisplayOverlay] Sending click event for display ${display.id} on channel ${ipcChannel}`);
			window.electron.ipcRenderer.send(ipcChannel);
		} else {
			console.error('[DisplayOverlay] IPC renderer not available');
		}
	};

	return (
		<button
			type="button"
			className={cn(
				'w-full h-full flex flex-col justify-center items-center',
				'font-sans text-white cursor-pointer transition-all duration-200 ease-in-out',
				'bg-black/30 border-none outline-none focus:outline-none',
				isHovered && 'bg-sky-500/40',
				isHighlighted && 'bg-sky-500/60'
			)}
			onClick={handleClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className="text-center pointer-events-none">
				<div className="text-2xl font-semibold mb-2 drop-shadow-lg">
					Click to move {APP_NAME}
				</div>
				<div className="text-base opacity-80 drop-shadow-md mb-0">
					{display.label}
				</div>
				<div className="text-base opacity-80 drop-shadow-md">
					{display.bounds.width} × {display.bounds.height}
				</div>
			</div>
		</button>
	);
}

export function DisplayOverlayApp(): React.ReactElement | null {
	const [props, setProps] = useState<DisplayOverlayProps | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		try {
		  const urlParams = new URLSearchParams(window.location.search);
		  const displayDataParam = urlParams.get('displayData');
	
		  if (!displayDataParam) {
			throw new Error('No display data provided in URL parameters');
		  }
	
		  const parsedData = JSON.parse(decodeURIComponent(displayDataParam)) as {
			display: Display;
			ipcChannel: string;
		  };
	
		  if (!parsedData.display || !parsedData.ipcChannel) {
			throw new Error('Invalid display data structure');
		  }
	
		  console.log('[DisplayOverlayApp] Loaded display data:', parsedData);
		  setProps({
			display: parsedData.display,
			ipcChannel: parsedData.ipcChannel,
		  });
		} catch (err) {
		  console.error('Failed to parse display data:', err);
		  setError(err instanceof Error ? err.message : 'An unknown error occurred');
		}
	  }, []);

	if (error) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-red-500/30 text-white">
				<div className="text-center">
					<div className="text-xl font-semibold mb-2">Error</div>
					<div className="text-sm opacity-70">{error}</div>
				</div>
			</div>
		);
	}
	if (props) {
		return <DisplayOverlay display={props.display} ipcChannel={props.ipcChannel} />;
	}

	return null;
}