import { ReactNode } from 'react';

// --- UI Components ---
import { Portal } from './Portal';
import { WindowTitle, WindowMessage, Button } from './ui';
import { MouseEventsCapture } from './Portal'; // Assuming MouseEventsCapture is part of Portal export

// --- Type Definitions ---

interface Action {
  label: string;
  onClick: () => void;
}

interface MovableNotificationProps {
  /**
   * Controls the visibility of the notification.
   */
  show?: boolean;
  /**
   * The title displayed at the top of the notification.
   */
  title: string;
  /**
   * The main content or message of the notification.
   */
  message: ReactNode;
  /**
   * A single action or an array of actions to be displayed as buttons at the bottom.
   */
  actions?: Action | Action[];
}

/**
 * A component that displays a notification in a movable, floating window.
 * It provides a consistent structure for a title, message, and action buttons.
 */
export const MovableNotification = ({
  show = true,
  title,
  message,
  actions = [],
}: MovableNotificationProps) => {
  // Ensure actions is always an array for consistent mapping.
  const actionArray = Array.isArray(actions) ? actions : [actions];

  return (
    <Portal.Movable show={show} width={350}>
      <WindowTitle>{title}</WindowTitle>
      <WindowMessage>{message}</WindowMessage>

      {/* Render action buttons if any are provided */}
      {actionArray.length > 0 && (
        <MouseEventsCapture>
          <div className="mt-3 mb-1 flex justify-center gap-2">
            {actionArray.map((action, index) => (
              <Button key={index} onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          </div>
        </MouseEventsCapture>
      )}

      {/* A small footer for consistent spacing */}
      <div className="h-3" />
    </Portal.Movable>
  );
};