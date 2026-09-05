import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEVICE_LABELS } from "@/utils/formatting";
import type { DeviceType } from "@/types";

const GROUPS: Array<{
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  devices: DeviceType[];
}> = [
  {
    label: "Phone",
    icon: Smartphone,
    devices: ["iphone_15_pro", "iphone_15", "iphone_14", "android_phone"],
  },
  { label: "Tablet", icon: Tablet, devices: ["ipad_pro"] },
  { label: "Laptop", icon: Laptop, devices: ["macbook_14", "macbook_16"] },
  {
    label: "Desktop",
    icon: Monitor,
    devices: ["desktop_27", "desktop_monitor"],
  },
];

export const DeviceSelector: React.FC<{
  value: DeviceType;
  onChange: (value: DeviceType) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <fieldset disabled={disabled} className="space-y-3">
    <legend className="text-sm font-semibold text-white">Device mockup</legend>
    <p className="text-xs text-mist-400">
      Phones use the mobile captures; laptops and monitors use the desktop ones.
    </p>
    <div className="space-y-3">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-wrap items-center gap-2">
          <span className="flex w-20 shrink-0 items-center gap-1.5 text-xs text-mist-400">
            <group.icon className="size-3.5" />
            {group.label}
          </span>
          {group.devices.map((device) => (
            <button
              key={device}
              type="button"
              onClick={() => onChange(device)}
              aria-pressed={value === device}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                value === device
                  ? "border-brand-400/60 bg-brand-500/12 text-white"
                  : "border-white/8 text-mist-300 hover:border-white/20 hover:text-white",
              )}
            >
              {DEVICE_LABELS[device]}
            </button>
          ))}
        </div>
      ))}
    </div>
  </fieldset>
);
