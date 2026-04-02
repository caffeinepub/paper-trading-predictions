import { RefreshCw } from "lucide-react";
import type { CanisterState } from "../hooks/useCanisters";
import { truncateId } from "../lib/canisters";

interface Props {
  canisters: CanisterState[];
  onRefreshAll: () => void;
  onRefreshOne: (id: string) => void;
}

function StatusDot({ status }: { status: CanisterState["status"] }) {
  if (status === "online")
    return <span className="w-2 h-2 rounded-full bg-positive inline-block" />;
  if (status === "checking")
    return (
      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block pulse-yellow" />
    );
  return <span className="w-2 h-2 rounded-full bg-negative inline-block" />;
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function CanisterStatus({
  canisters,
  onRefreshAll,
  onRefreshOne,
}: Props) {
  const online = canisters.filter((c) => c.status === "online").length;
  const total = canisters.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header stats */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <StatusDot
            status={
              online === total
                ? "online"
                : online === 0
                  ? "offline"
                  : "checking"
            }
          />
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{online}</span>/
            {total} online
          </span>
        </div>
        <button
          type="button"
          onClick={onRefreshAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="canister.button"
        >
          <RefreshCw className="w-3 h-3" /> Refresh All
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {canisters.map((c, idx) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
              data-ocid={`canister.item.${idx + 1}` as any}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <StatusDot status={c.status} />
                  <span className="text-xs font-medium text-foreground truncate">
                    {c.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                  {truncateId(c.id)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {c.lastChecked
                    ? `Updated: ${relativeTime(c.lastChecked)}`
                    : "Checking..."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRefreshOne(c.id)}
                className="ml-2 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                data-ocid={`canister.secondary_button.${idx + 1}` as any}
                title="Refresh"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
