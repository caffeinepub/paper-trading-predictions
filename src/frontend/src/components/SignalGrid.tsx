import { Activity, Brain, Radio, Zap } from "lucide-react";
import type { SignalsData } from "../hooks/useSignals";

interface Props {
  signals: SignalsData;
}

function StatusDot({ status }: { status: "ok" | "error" | "loading" }) {
  if (status === "ok")
    return <span className="w-2 h-2 rounded-full bg-positive inline-block" />;
  if (status === "loading")
    return (
      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block pulse-yellow" />
    );
  return <span className="w-2 h-2 rounded-full bg-negative inline-block" />;
}

function formatTime(d: Date | null) {
  if (!d) return "never";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncate(s: string, max = 80) {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

interface CardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
  status: "ok" | "error" | "loading";
  lastUpdated: Date | null;
  ocid: string;
}

function SignalCard({
  icon,
  title,
  subtitle,
  value,
  status,
  lastUpdated,
  ocid,
}: CardProps) {
  return (
    <div
      className={`card-glass p-4 flex flex-col gap-3 transition-all duration-300 ${
        status === "ok" ? "shadow-[0_0_16px_oklch(0.6_0.18_200/0.08)]" : ""
      }`}
      data-ocid={ocid as any}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{title}</p>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <StatusDot status={status} />
      </div>

      <div className="flex-1">
        {status === "loading" ? (
          <div className="space-y-1">
            <div className="h-3 bg-muted/40 rounded animate-pulse" />
            <div className="h-3 bg-muted/40 rounded animate-pulse w-3/4" />
          </div>
        ) : status === "error" ? (
          <p className="text-xs text-negative">Canister offline</p>
        ) : (
          <p className="text-xs text-foreground leading-relaxed font-mono">
            {truncate(value)}
          </p>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground border-t border-border/50 pt-2">
        Updated: {formatTime(lastUpdated)}
      </p>
    </div>
  );
}

export default function SignalGrid({ signals }: Props) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      data-ocid="signals.panel"
    >
      <SignalCard
        icon={<Brain className="w-4 h-4" />}
        title="Prophet AI"
        subtitle="vnpsy-...xnq-cai"
        value={signals.prophet.value}
        status={signals.prophet.status}
        lastUpdated={signals.prophet.lastUpdated}
        ocid="signals.prophet.card"
      />
      <SignalCard
        icon={<Activity className="w-4 h-4" />}
        title="Sentiment Engine"
        subtitle="ro43k-...xwq-cai"
        value={signals.sentiment.value}
        status={signals.sentiment.status}
        lastUpdated={signals.sentiment.lastUpdated}
        ocid="signals.sentiment.card"
      />
      <SignalCard
        icon={<Radio className="w-4 h-4" />}
        title="Whale Sonar"
        subtitle="rj556-...xwa-cai"
        value={signals.whaleSonar.value}
        status={signals.whaleSonar.status}
        lastUpdated={signals.whaleSonar.lastUpdated}
        ocid="signals.whale.card"
      />
      <SignalCard
        icon={<Zap className="w-4 h-4" />}
        title="Self Optimizer"
        subtitle="rh7qw-...xxa-cai"
        value={signals.selfOptimizer.value}
        status={signals.selfOptimizer.status}
        lastUpdated={signals.selfOptimizer.lastUpdated}
        ocid="signals.optimizer.card"
      />
    </div>
  );
}
