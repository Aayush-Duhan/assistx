import React, { forwardRef, SVGProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// --- Type Definitions ---

type IconNode = [elementName: keyof React.ReactSVG, attributes: Record<string, any>][];

interface IconProps extends SVGProps<SVGSVGElement> {
  color?: string;
  size?: string | number;
  strokeWidth?: string | number;
  absoluteStrokeWidth?: boolean;
  className?: string;
  children?: ReactNode;
  iconNode: IconNode;
}

// --- Icon Creation Utilities ---

/**
 * Converts a camelCase string to kebab-case.
 * e.g., 'arrowUpRight' -> 'arrow-up-right'
 * @param name - The camelCase string.
 */
const toKebabCase = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * A base SVG component that all icons are built upon.
 * It sets default SVG attributes and handles dynamic stroke width.
 */
const Icon = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      color = 'currentColor',
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = '',
      children,
      iconNode,
      ...rest
    },
    ref
  ) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide', className)}
      {...rest}
    >
      {/* Render the SVG paths and shapes from the iconNode definition */}
      {iconNode.map(([elementName, attributes]) =>
        React.createElement(elementName, attributes)
      )}
      {/* Render any additional children passed to the component */}
      {...React.Children.toArray(children)}
    </svg>
  )
);

/**
 * A factory function to create a new icon component.
 * @param iconName - The name of the icon (e.g., 'Airplay').
 * @param iconNode - An array defining the SVG paths and shapes for the icon.
 * @param viewBox - Optional custom viewBox for the SVG.
 */
const createIcon = (iconName: string, iconNode: IconNode, viewBox = '0 0 24 24') => {
  const Component = forwardRef<SVGSVGElement, Omit<IconProps, 'iconNode' | 'viewBox'>>(
    ({ className, ...props }, ref) => (
      <Icon
        ref={ref}
        iconNode={iconNode}
        viewBox={viewBox}
        className={cn(`lucide-${toKebabCase(iconName)}`, className)}
        {...props}
      />
    )
  );
  Component.displayName = iconName;
  return Component;
};

// --- Icon Definitions ---

export const AirplayIcon = createIcon('Airplay', [
  ['path', { d: 'M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1', key: 'ns4c3b' }],
  ['path', { d: 'm12 15 5 6H7Z', key: '14qnn2' }],
]);

export const ArrowUpRightIcon = createIcon('ArrowUpRight', [
  ['path', { d: 'M7 7h10v10', key: '1tivn9' }],
  ['path', { d: 'M7 17 17 7', key: '1vkiza' }],
]);

export const CheckIcon = createIcon('Check', [
  ['path', { d: 'M20 6 9 17l-5-5', key: '1gmf2c' }],
]);

export const CircleCheckIcon = createIcon('CircleCheck', [
  ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
  ['path', { d: 'm9 12 2 2 4-4', key: 'dzmm74' }],
]);

export const CircleXIcon = createIcon('CircleX', [
  ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
  ['path', { d: 'm15 9-6 6', key: '1uzhvr' }],
  ['path', { d: 'm9 9 6 6', key: 'z0biqf' }],
]);

export const CopyIcon = createIcon('Copy', [
  ['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2', key: '17jyea' }],
  ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2', key: 'zix9uf' }],
]);

export const MicIcon = createIcon('Mic', [
  ['path', { d: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', key: '131961' }],
  ['path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2', key: '1vc78b' }],
  ['line', { x1: '12', x2: '12', y1: '19', y2: '22', key: 'x3vr5v' }],
]);

export const MicMutedIcon = createIcon('MicMuted', [
    ['path', { d: 'M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L472.1 344.7c15.2-26 23.9-56.3 23.9-88.7l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 21.2-5.1 41.1-14.2 58.7L416 300.8 416 96c0-53-43-96-96-96s-96 43-96 96l0 54.3L38.8 5.1zM344 430.4c20.4-2.8 39.7-9.1 57.3-18.2l-43.1-33.9C346.1 382 333.3 384 320 384c-70.7 0-128-57.3-128-128l0-8.7L144.7 210c-.5 1.9-.7 3.9-.7 6l0 40c0 89.1 66.2 162.7 152 174.4l0 33.6-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l72 0 72 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-33.6z', key: 'qf7gf0' }],
], '0 0 640 512');

export const StopIcon = createIcon('Stop', [
  ['path', { d: 'M0 128C0 92.7 28.7 64 64 64H320c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z', key: 'qf7gf0' }],
], '0 0 384 512');

export const XIcon = createIcon('X', [
  ['path', { d: 'M18 6 6 18', key: '1bl5f8' }],
  ['path', { d: 'm6 6 12 12', key: 'd8bk6v' }],
]);

export const VerticalEllipsisIcon = createIcon('VerticalEllipsis', [
  ['path', { d: 'M64 360a56 56 0 1 0 0 112 56 56 0 1 0 0-112zm0-160a56 56 0 1 0 0 112 56 56 0 1 0 0-112zM120 96A56 56 0 1 0 8 96a56 56 0 1 0 112 0z', key: 'qf7gf0' }],
], '0 0 128 512');

export const ChevronDownIcon = createIcon('ChevronDown', [
  ['path', { d: 'M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z', key: 'qf7gf0' }],
], '0 0 512 512');

export const UploadCircleIcon = createIcon('UploadCircle', [
  ['path', { d: 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm11.3-395.3l112 112c4.6 4.6 5.9 11.5 3.5 17.4s-8.3 9.9-14.8 9.9l-64 0 0 96c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-96-64 0c-6.5 0-12.3-3.9-14.8-9.9s-1.1-12.9 3.5-17.4l112-112c6.2-6.2 16.4-6.2 22.6 0z', key: 'qf7gf0' }],
], '0 0 512 512');

export const LeftArrowIcon = createIcon('LeftArrow', [
  ['path', { d: 'M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z', key: 'qf7gf0' }],
], '0 0 448 512');

export const RightArrowIcon = createIcon('RightArrow', [
  ['path', { d: 'M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z', key: 'qf7gf0' }],
], '0 0 448 512');

export const DownArrowIcon = createIcon('DownArrow', [
  ['path', { d: 'M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z', key: 'qf7gf0' }],
], '0 0 384 512');

export const UpArrowIcon = createIcon('UpArrow', [
  ['path', { d: 'M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2 160 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z', key: 'qf7gf0' }],
], '0 0 384 512');

// A special icon for the Cluely logo with a custom viewBox
export const CluelyLogoIcon = createIcon(
  'CluelyLogo',
  [
    [
      'path',
      {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M67.4307 11.5693C52.005 -3.85643 26.995 -3.85643 11.5693 11.5693C-3.85643 26.995 -3.85643 52.005 11.5693 67.4307C26.995 82.8564 52.005 82.8564 67.4307 67.4307C82.8564 52.005 82.8564 26.995 67.4307 11.5693ZM17.9332 17.9332C29.8442 6.02225 49.1558 6.02225 61.0668 17.9332C72.9777 29.8442 72.9777 49.1558 61.0668 61.0668C59.7316 62.4019 58.3035 63.5874 56.8032 64.6232L56.8241 64.6023C46.8657 54.6439 46.8657 38.4982 56.8241 28.5398L58.2383 27.1256L51.8744 20.7617L50.4602 22.1759C40.5018 32.1343 24.3561 32.1343 14.3977 22.1759L14.3768 22.1968C15.4126 20.6965 16.5981 19.2684 17.9332 17.9332ZM34.0282 38.6078C25.6372 38.9948 17.1318 36.3344 10.3131 30.6265C7.56889 39.6809 9.12599 49.76 14.9844 57.6517L34.0282 38.6078ZM21.3483 64.0156C29.24 69.874 39.3191 71.4311 48.3735 68.6869C42.6656 61.8682 40.0052 53.3628 40.3922 44.9718L21.3483 64.0156Z',
        key: 'qf7gf0',
        stroke: 'none'
      },
    ],
  ],
  '0 0 79 79'
);