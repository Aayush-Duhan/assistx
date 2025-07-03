import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useContext,
  forwardRef,
  ReactNode,
  Ref,
} from 'react';
import {createPortal} from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { electron } from '@/services/electron';
// --- Global State for Mouse Event Handling ---
// This is a common pattern in transparent Electron apps to allow "clicking through"
// the window unless the mouse is over an interactive element.
const mouseEventCaptureRegions = new Set<symbol>();

function updateWindowIgnoreMouseEvents() {
  const shouldIgnore = mouseEventCaptureRegions.size === 0;
  electron.setIgnoreMouseEvents({ ignore: shouldIgnore });   
}

function addMouseCaptureRegion(id: symbol) {
  mouseEventCaptureRegions.add(id);
  updateWindowIgnoreMouseEvents();
}

function removeMouseCaptureRegion(id: symbol) {
  mouseEventCaptureRegions.delete(id);
  updateWindowIgnoreMouseEvents();
}

// --- MouseEventsCapture Component ---
// This component wraps its children and tells the main process to capture mouse
// events when the mouse is hovering over it.

interface MouseEventsCaptureProps {
  enabled?: boolean;
    children: React.ReactNode;
}

/**
 * A wrapper component that enables mouse event capturing for its children.
 * Essential for making parts of a transparent Electron window interactive.
 */
export const MouseEventsCapture = ({ enabled = true, children }: MouseEventsCaptureProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const regionId = useRef(Symbol('mouse-capture-region'));

  useEffect(() => {
    if (!enabled) return;

    const currentElement = elementRef.current;
    if (!currentElement) return;

    const onMouseEnter = () => addMouseCaptureRegion(regionId.current);
    const onMouseLeave = () => removeMouseCaptureRegion(regionId.current);

    currentElement.addEventListener('mouseenter', onMouseEnter);
    currentElement.addEventListener('mouseleave', onMouseLeave);

    // Cleanup on unmount
    return () => {
      currentElement.removeEventListener('mouseenter', onMouseEnter);
      currentElement.removeEventListener('mouseleave', onMouseLeave);
      removeMouseCaptureRegion(regionId.current);
    };
  }, [enabled]);

  // Final cleanup when the component instance is destroyed
  useEffect(() => () => removeMouseCaptureRegion(regionId.current), []);

  return (
    <div ref={elementRef} className={cn(enabled && 'pointer-events-auto')}>
      {children}
    </div>
  );
};

// --- Portal Context and Provider ---

interface PortalContextValue {
  commandBar: HTMLDivElement | null;
  movableWindows: HTMLDivElement | null;
  notifications: HTMLDivElement | null;
  fullscreen: HTMLDivElement | null;
}

interface PortalSetterProps {
  commandBar: Ref<HTMLDivElement>;
  movableWindows: Ref<HTMLDivElement>;
  notifications: Ref<HTMLDivElement>;
  fullscreen: Ref<HTMLDivElement>;
}

const PortalContext = React.createContext<PortalContextValue | null>(null);

interface PortalProviderProps {
  children: (setters: PortalSetterProps) => ReactNode;
}

/**
 * Provides the DOM nodes that act as targets for the different portals.
 * This component should wrap the application's root. It uses a render-prop
 * pattern to allow the consumer to place the portal target divs in the DOM.
 */
function PortalProvider({ children }: PortalProviderProps) {
  const [commandBar, setCommandBar] = useState<HTMLDivElement | null>(null);
  const [movableWindows, setMovableWindows] = useState<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState<HTMLDivElement | null>(null);

  const contextValue = useMemo(
    () => ({ commandBar, movableWindows, notifications, fullscreen }),
    [commandBar, movableWindows, notifications, fullscreen]
  );

  const setters = {
    commandBar: setCommandBar,
    movableWindows: setMovableWindows,
    notifications: setNotifications,
    fullscreen: setFullscreen,
  };

  return (
    <PortalContext.Provider value={contextValue}>
      {children(setters)}
    </PortalContext.Provider>
  );
}

function GenericPortal({ children, targetKey }: { children: ReactNode; targetKey: keyof PortalContextValue  }) {
  const portalContext = useContext(PortalContext);

  if (!portalContext) {
    console.error("Portal components must be used within a PortalProvider.");
    return null;
  }

  const targetNode = portalContext[targetKey];

  // Only render the portal if the target DOM node has been created and attached.
  return targetNode ? createPortal(children, targetNode) : null;
}


/**
 * Renders children into the 'commandBar' portal target.
 */
function CommandBarPortal({ children }: { children: ReactNode }) {
  return <GenericPortal targetKey="commandBar">{children}</GenericPortal>;
}

/**
 * Renders children into the 'movableWindows' portal target.
 */
function MovableWindowsPortal({ children }: { children: ReactNode }) {
  return <GenericPortal targetKey="movableWindows">{children}</GenericPortal>;
}

/**
 * Renders children into the 'notifications' portal target.
 */
function NotificationPortal({ children }: { children: ReactNode }) {
  return <GenericPortal targetKey="notifications">{children}</GenericPortal>;
}

/**
 * Renders children into the 'fullscreen' portal target.
 */
function FullscreenPortal({ children }: { children: ReactNode }) {
  return <GenericPortal targetKey="fullscreen">{children}</GenericPortal>;
}

// --- Inline Portal Component (Styled Wrapper) ---

interface InlinePortalProps {
  ref?: Ref<HTMLDivElement>;
  positionClassName?: string;
  backgroundClassname?: string;
  contentClassName?: string;
  width?: string | number;
  opaque?: boolean;
  transparent?: boolean;
  captureMouseEvents?: boolean;
  fastAnimations?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}

/**
 * A styled and animated wrapper component. Despite its name, it does not use
 * ReactDOM.createPortal but is part of the same UI system for creating floating
 * or layered elements. It provides a consistent look and feel with animations.
 */
const InlinePortal = forwardRef<HTMLDivElement, InlinePortalProps>(
  (
    {
      positionClassName,
      backgroundClassname,
      contentClassName,
      width = 'fit-content',
      opaque = false,
      transparent = false,
      captureMouseEvents = false,
      fastAnimations = false,
      onMouseEnter,
      onMouseLeave,
      children,
    },
    ref
  ) => {
    const duration = fastAnimations ? 0.02 : 0.15;
    const ease = fastAnimations ? 'linear' : 'easeOut';

    return (
      <div
        className={cn('relative', positionClassName)}
        style={{ width }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <MouseEventsCapture enabled={captureMouseEvents}>
          {/* Background and border layer - only render if not transparent */}
          {!transparent && (
            <motion.div
              className={cn(
                'absolute inset-0 shadow-md inset-ring-1 inset-ring-zinc-400/33 border-[0.5px] border-black/80 rounded-3xl',
                opaque ? 'bg-zinc-950/95' : 'bg-black/60',
                backgroundClassname
              )}
              transition={{ duration, ease }}
              layout
            />
          )}
          {/* Content layer */}
          <motion.div
            ref={ref}
            className={cn('relative', contentClassName)}
            transition={{ duration, ease }}
            layout="position"
          >
            {children}
          </motion.div>
        </MouseEventsCapture>
      </div>
    );
  }
);

// --- Resizable and Movable Portal Components (High-level wrappers) ---

interface ResizablePortalProps extends Omit<InlinePortalProps, 'ref'> {
  show?: boolean;
  bounceDirection?: 'up' | 'down';
  initialWidth?: number;
  minWidth?: number;
}

const ResizablePortal = ({
  show = true,
  bounceDirection,
  initialWidth = 700,
  minWidth = 400,
  ...rest
}: ResizablePortalProps) => {
  // ... Implementation for resizing logic would go here ...
  // For now, it's a simplified wrapper around InlinePortal.
  const y = bounceDirection === 'up' ? [0, -10, 0] : bounceDirection === 'down' ? [0, 10, 0] : 0;
  const duration = rest.fastAnimations ? 0.02 : 0.15;
  const ease = rest.fastAnimations ? 'linear' : 'easeOut';

  return (
    <MovableWindowsPortal>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            layout={!rest.fastAnimations}
            transition={{ duration, ease }}
          >
            <motion.div
              animate={{ y }}
              transition={{ ease: rest.fastAnimations ? 'linear' : 'easeInOut', duration: rest.fastAnimations ? duration : 25 / 1000 }}
              layout={!rest.fastAnimations}
            >
              <MouseEventsCapture>
                <div className="relative rounded-lg" style={{ width: initialWidth }}>
                  {/* Resizing handles would be implemented here */}
                  <InlinePortal width={initialWidth} captureMouseEvents {...rest} />
                </div>
              </MouseEventsCapture>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MovableWindowsPortal>
  );
};

interface MovablePortalProps extends Omit<InlinePortalProps, 'ref'> {
  show?: boolean;
  bounceDirection?: 'up' | 'down';
}

const MovablePortal = ({ show = true, bounceDirection, ...rest }: MovablePortalProps) => {
  const y = bounceDirection === 'up' ? [0, -10, 0] : bounceDirection === 'down' ? [0, 10, 0] : 0;
  return (
    <MovableWindowsPortal>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
          >
            <motion.div
              animate={{ y }}
              transition={{ ease: 'easeInOut', duration: 25 / 1000 }}
            >
              <InlinePortal {...rest} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MovableWindowsPortal>
  );
};

interface NotificationPortalProps extends Omit<InlinePortalProps, 'ref'> {
  show?: boolean;
}

const Notification = ({ show = true, ...rest }: NotificationPortalProps) => {
  return (
    <NotificationPortal>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
          >
            <InlinePortal {...rest} />
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationPortal>
  );
};

// --- Final Export ---

export const Portal = {
  Provider: PortalProvider,
  Inline: InlinePortal,
  Movable: MovablePortal,
  Resizable: ResizablePortal,
  Notification: Notification,
  CommandBar: CommandBarPortal,
  Fullscreen: FullscreenPortal,
};