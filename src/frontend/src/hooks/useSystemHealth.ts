import { useCallback, useEffect, useState } from "react";
import { actors } from "../lib/canisters";

export interface SystemHealthData {
  sealVerified: boolean | null;
  meshHealth: string | null;
  droneStatus: string | null;
  cycles: bigint | null;
  sovereignMetrics: string | null;
  srosHealth: string | null;
  isLoading: boolean;
}

export function useSystemHealth(): SystemHealthData {
  const [sealVerified, setSealVerified] = useState<boolean | null>(null);
  const [meshHealth, setMeshHealth] = useState<string | null>(null);
  const [droneStatus, setDroneStatus] = useState<string | null>(null);
  const [cycles, setCycles] = useState<bigint | null>(null);
  const [sovereignMetrics, setSovereignMetrics] = useState<string | null>(null);
  const [srosHealth, setSrosHealth] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const poll = useCallback(async () => {
    setIsLoading(true);
    const [seal, mesh, drone, cyc, sov, sros] = await Promise.allSettled([
      (actors.sealCanister as any).verify_seal() as Promise<boolean>,
      (actors.nagaExecution as any).check_mesh_health() as Promise<string>,
      (actors.droneControl as any).status() as Promise<string>,
      (actors.cycleAirdropper as any).check_cycles() as Promise<bigint>,
      (actors.sovereignCore as any).get_core_metrics() as Promise<string>,
      (actors.srosDashboard as any).check_mesh_health() as Promise<string>,
    ]);

    if (seal.status === "fulfilled") setSealVerified(seal.value as boolean);
    if (mesh.status === "fulfilled") setMeshHealth(String(mesh.value));
    if (drone.status === "fulfilled") setDroneStatus(String(drone.value));
    if (cyc.status === "fulfilled") setCycles(cyc.value as bigint);
    if (sov.status === "fulfilled") setSovereignMetrics(String(sov.value));
    if (sros.status === "fulfilled") setSrosHealth(String(sros.value));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, [poll]);

  return {
    sealVerified,
    meshHealth,
    droneStatus,
    cycles,
    sovereignMetrics,
    srosHealth,
    isLoading,
  };
}
