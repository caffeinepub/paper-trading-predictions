import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TradeResult {
    id: bigint;
    pnl?: number;
    direction: Direction;
    size: number;
    timestamp: bigint;
    entryPrice: number;
    isWin?: boolean;
    exitPrice?: number;
}
export interface PerformanceStats {
    totalTrades: bigint;
    wins: bigint;
    losses: bigint;
    totalPnl: number;
    winRate: number;
}
export enum Direction {
    long_ = "long",
    short_ = "short"
}
export interface backendInterface {
    cancelTrade(id: bigint): Promise<void>;
    closeTrade(id: bigint, exitPrice: number): Promise<TradeResult>;
    deleteTrade(id: bigint): Promise<void>;
    enterTrade(direction: Direction, entryPrice: number, size: number): Promise<bigint>;
    getAllTrades(): Promise<Array<TradeResult>>;
    getClosedTrades(): Promise<Array<TradeResult>>;
    getOpenTrades(): Promise<Array<TradeResult>>;
    getPerformanceStats(): Promise<PerformanceStats>;
    getTotalPnl(): Promise<number>;
    getTrade(id: bigint): Promise<TradeResult>;
    getWinRate(): Promise<number>;
}
