import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeadlessButton } from './ui/HeadlessButton';

export function TrafficLights({ className, onClose }: { className?: string; onClose?: () => void }) {
  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      <HeadlessButton
        className="size-3 rounded-full bg-[#FE5F58] active:bg-[#BF4741] border-[0.5px] border-[#E24138] flex items-center justify-center"
        onClick={onClose}
      >
        <X size={9.5} className="hidden group-hover:block text-[#990001] stroke-3" />
      </HeadlessButton>
      <div className="size-3 rounded-full bg-[#FFBD2E] border-[0.5px] border-[#BDBDC0]" />
      <div className="size-3 rounded-full bg-[#27C93F] border-[0.5px] border-[#BDBDC0]" />
    </div>
  );
}