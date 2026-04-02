import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";

export interface CanisterInfo {
  name: string;
  id: string;
  label: string;
}

export const CANISTERS: CanisterInfo[] = [
  {
    name: "adaptive_ai_core",
    id: "ra6wc-liaaa-aaaaa-qgxxq-cai",
    label: "Adaptive AI",
  },
  {
    name: "alien_analytics",
    id: "4hhfs-gaaaa-aaaaa-qgw4a-cai",
    label: "Alien Analytics",
  },
  {
    name: "cycle_airdropper",
    id: "xpb7d-eyaaa-aaaaa-qgq5a-cai",
    label: "Cycle Airdropper",
  },
  {
    name: "drone_control",
    id: "ttbvc-dqaaa-aaaaa-qgxza-cai",
    label: "Drone Control",
  },
  {
    name: "ghost_liquidity",
    id: "uod36-mqaaa-aaaaa-qgxla-cai",
    label: "Ghost Liquidity",
  },
  {
    name: "ghost_sniper",
    id: "4jfi2-5qaaa-aaaaa-qgw5a-cai",
    label: "Ghost Sniper",
  },
  {
    name: "naga_execution",
    id: "ha3fs-xqaaa-aaaaa-qgyaa-cai",
    label: "Naga Execution",
  },
  { name: "prophet", id: "vnpsy-yiaaa-aaaaa-qgxnq-cai", label: "Prophet" },
  {
    name: "seal_canister",
    id: "tuatw-oiaaa-aaaaa-qgxzq-cai",
    label: "Seal Canister",
  },
  {
    name: "self_optimizer",
    id: "rh7qw-gqaaa-aaaaa-qgxxa-cai",
    label: "Self Optimizer",
  },
  {
    name: "sentience_relay",
    id: "uabww-xaaaa-aaaaa-qgxka-cai",
    label: "Sentience Relay",
  },
  {
    name: "sentiment_engine",
    id: "ro43k-qyaaa-aaaaa-qgxwq-cai",
    label: "Sentiment Engine",
  },
  {
    name: "simulation_night",
    id: "tggep-cyaaa-aaaaa-qgx2q-cai",
    label: "Simulation Night",
  },
  {
    name: "sovereign_core",
    id: "tbhc3-paaaa-aaaaa-qgx2a-cai",
    label: "Sovereign Core",
  },
  {
    name: "sros_dashboard",
    id: "hh2dg-2iaaa-aaaaa-qgyaq-cai",
    label: "SROS Dashboard",
  },
  {
    name: "temporal_shadow",
    id: "uhaqc-2yaaa-aaaaa-qgxkq-cai",
    label: "Temporal Shadow",
  },
  {
    name: "whale_sonar",
    id: "rj556-5aaaa-aaaaa-qgxwa-cai",
    label: "Whale Sonar",
  },
];

let _agent: HttpAgent | null = null;

export function getAgent(): HttpAgent {
  if (!_agent) {
    _agent = new HttpAgent({ host: "https://icp-api.io" });
  }
  return _agent;
}

export function truncateId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 5)}...${id.slice(-4)}` : id;
}

function mkActor(canisterId: string, svc: any): any {
  return Actor.createActor(() => svc, { agent: getAgent(), canisterId });
}

// IDL types for real canister methods
const ProphetPredictionIDL = IDL.Record({
  direction: IDL.Variant({ Bullish: IDL.Null, Bearish: IDL.Null }),
  trend_strength: IDL.Float32,
  timestamp: IDL.Int64,
  confidence_score: IDL.Float32,
});

const MarketMoodIDL = IDL.Record({
  is_volatile: IDL.Bool,
  overall_sentiment: IDL.Float32,
  liquidity_delta: IDL.Float64,
  whale_activity_alert: IDL.Opt(IDL.Text),
});

export const actors = {
  prophet: mkActor(
    "vnpsy-yiaaa-aaaaa-qgxnq-cai",
    IDL.Service({
      check: IDL.Func([], [IDL.Text], ["query"]),
      predict_24h_close: IDL.Func([], [IDL.Text], ["query"]),
      get_latest_prediction: IDL.Func([], [ProphetPredictionIDL], ["query"]),
    }),
  ),
  sentimentEngine: mkActor(
    "ro43k-qyaaa-aaaaa-qgxwq-cai",
    IDL.Service({
      check: IDL.Func([], [IDL.Text], ["query"]),
      get_current_market_mood: IDL.Func([], [MarketMoodIDL], ["query"]),
    }),
  ),
  whaleSonar: mkActor(
    "rj556-5aaaa-aaaaa-qgxwa-cai",
    IDL.Service({
      check: IDL.Func([], [IDL.Text], ["query"]),
    }),
  ),
  selfOptimizer: mkActor(
    "rh7qw-gqaaa-aaaaa-qgxxa-cai",
    IDL.Service({
      check: IDL.Func([], [IDL.Text], ["query"]),
    }),
  ),
  sovereignCore: mkActor(
    "tbhc3-paaaa-aaaaa-qgx2a-cai",
    IDL.Service({
      get_core_metrics: IDL.Func([], [IDL.Text], ["query"]),
    }),
  ),
  nagaExecution: mkActor(
    "ha3fs-xqaaa-aaaaa-qgyaa-cai",
    IDL.Service({
      system_autonomous_strike: IDL.Func([], [IDL.Text], []),
      check_mesh_health: IDL.Func([], [IDL.Text], ["query"]),
    }),
  ),
  droneControl: mkActor(
    "ttbvc-dqaaa-aaaaa-qgxza-cai",
    IDL.Service({
      status: IDL.Func([], [IDL.Text], ["query"]),
    }),
  ),
  cycleAirdropper: mkActor(
    "xpb7d-eyaaa-aaaaa-qgq5a-cai",
    IDL.Service({
      check_cycles: IDL.Func([], [IDL.Nat64], ["query"]),
    }),
  ),
  sealCanister: mkActor(
    "tuatw-oiaaa-aaaaa-qgxzq-cai",
    IDL.Service({
      verify_seal: IDL.Func([], [IDL.Bool], ["query"]),
    }),
  ),
  srosDashboard: mkActor(
    "hh2dg-2iaaa-aaaaa-qgyaq-cai",
    IDL.Service({
      get_full_system_snapshot: IDL.Func([], [IDL.Text], []),
      check_mesh_health: IDL.Func([], [IDL.Text], ["query"]),
    }),
  ),
  ghostSniper: mkActor(
    "4jfi2-5qaaa-aaaaa-qgw5a-cai",
    IDL.Service({
      trigger_trade: IDL.Func([IDL.Text, IDL.Nat64], [IDL.Text], []),
    }),
  ),
  adaptiveAI: mkActor(
    "ra6wc-liaaa-aaaaa-qgxxq-cai",
    IDL.Service({
      sync_market_signals: IDL.Func([], [IDL.Text], []),
    }),
  ),
  ghostLiquidity: mkActor(
    "uod36-mqaaa-aaaaa-qgxla-cai",
    IDL.Service({
      fragment_trade: IDL.Func([IDL.Nat64], [IDL.Vec(IDL.Nat64)], []),
    }),
  ),
  temporalShadow: mkActor(
    "uhaqc-2yaaa-aaaaa-qgxkq-cai",
    IDL.Service({
      store_void_data: IDL.Func([IDL.Vec(IDL.Nat8)], [], []),
      recall_void: IDL.Func([], [IDL.Vec(IDL.Nat8)], ["query"]),
    }),
  ),
  sentienceRelay: mkActor(
    "uabww-xaaaa-aaaaa-qgxka-cai",
    IDL.Service({
      ingest_market_heartbeat: IDL.Func([], [IDL.Text], []),
    }),
  ),
  simulationNight: mkActor(
    "tggep-cyaaa-aaaaa-qgx2q-cai",
    IDL.Service({
      get_night_status: IDL.Func([], [IDL.Text], ["query"]),
      simulate_15m_close: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    }),
  ),
  alienAnalytics: mkActor(
    "4hhfs-gaaaa-aaaaa-qgw4a-cai",
    IDL.Service({
      analyze_pattern: IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    }),
  ),
};
