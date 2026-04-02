import { CheckCircle, Circle, Cpu, Server, XCircle, Zap } from "lucide-react";
import type { SystemHealthData } from "../hooks/useSystemHealth";

interface Props {
  health: SystemHealthData;
}

function Badge({
  label,
  value,
  ok,
  icon,
}: {
  label: string;
  value: string;
  ok: boolean | null;
  icon: React.ReactNode;
}) {
  const colorClass =
    ok === null
      ? "text-muted-foreground border-border"
      : ok
        ? "text-positive border-positive/30 bg-positive/5"
        : "text-negative border-negative/30 bg-negative/5";

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${colorClass}`}
    >
      <span className="text-current opacity-70">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono font-medium truncate max-w-[120px]">
        {value}
      </span>
    </div>
  );
}

function isOk(s: string | null): boolean | null {
  if (s === null) return null;
  const l = s.toLowerCase();
  return (
    !l.includes("error") &&
    !l.includes("fail") &&
    !l.includes("offline") &&
    !l.includes("down")
  );
}

export default function SystemHealthBar({ health }: Props) {
  return (
    <div
      className="card-glass px-4 py-2.5 flex flex-wrap items-center gap-2"
      data-ocid="health.panel"
    >
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
        System
      </span>

      <Badge
        label="Seal"
        value={
          health.sealVerified === null
            ? "checking…"
            : health.sealVerified
              ? "Verified"
              : "Invalid"
        }
        ok={health.sealVerified}
        icon={
          health.sealVerified ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )
        }
      />

      <Badge
        label="Mesh"
        value={health.meshHealth ?? "checking…"}
        ok={isOk(health.meshHealth)}
        icon={<Server className="w-3 h-3" />}
      />

      <Badge
        label="Drone"
        value={health.droneStatus ?? "checking…"}
        ok={isOk(health.droneStatus)}
        icon={<Circle className="w-3 h-3" />}
      />

      <Badge
        label="Cycles"
        value={
          health.cycles !== null
            ? `${(Number(health.cycles) / 1e12).toFixed(2)}T`
            : "checking…"
        }
        ok={health.cycles !== null ? Number(health.cycles) > 1e12 : null}
        icon={<Zap className="w-3 h-3" />}
      />

      <Badge
        label="Core"
        value={
          health.sovereignMetrics
            ? health.sovereignMetrics.slice(0, 24)
            : "checking…"
        }
        ok={isOk(health.sovereignMetrics)}
        icon={<Cpu className="w-3 h-3" />}
      />

      <Badge
        label="SROS"
        value={health.srosHealth ?? "checking…"}
        ok={isOk(health.srosHealth)}
        icon={<Server className="w-3 h-3" />}
      />

      {health.isLoading && (
        <span
          className="text-[10px] text-muted-foreground animate-pulse ml-auto"
          data-ocid="health.loading_state"
        >
          Polling canisters…
        </span>
      )}
    </div>
  );
}
