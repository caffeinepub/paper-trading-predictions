
import Array "mo:core/Array";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Iter "mo:core/Iter";


actor {
  type Direction = {
    #long;
    #short;
  };

  type Trade = {
    id : Nat;
    direction : Direction;
    entryPrice : Float;
    exitPrice : ?Float;
    size : Float;
    timestamp : Int;
    pnl : ?Float;
    isWin : ?Bool;
  };

  type TradeResult = {
    id : Nat;
    direction : Direction;
    entryPrice : Float;
    exitPrice : ?Float;
    size : Float;
    timestamp : Int;
    pnl : ?Float;
    isWin : ?Bool;
  };

  type PerformanceStats = {
    totalTrades : Nat;
    wins : Nat;
    losses : Nat;
    winRate : Float;
    totalPnl : Float;
  };

  let trades = Map.empty<Nat, Trade>();
  var nextId = 0;

  public shared ({ caller }) func enterTrade(direction : Direction, entryPrice : Float, size : Float) : async Nat {
    let trade : Trade = {
      id = nextId;
      direction;
      entryPrice;
      exitPrice = null;
      size;
      timestamp = Time.now();
      pnl = null;
      isWin = null;
    };
    trades.add(nextId, trade);
    nextId += 1;
    nextId - 1;
  };

  public shared ({ caller }) func closeTrade(id : Nat, exitPrice : Float) : async TradeResult {
    switch (trades.get(id)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?trade) {
        if (trade.exitPrice != null) {
          Runtime.trap("Trade already closed");
        };
        let pnl = calculatePnl(trade.direction, trade.entryPrice, exitPrice, trade.size);
        let isWin = pnl >= 0.0;
        let updatedTrade : Trade = {
          id = trade.id;
          direction = trade.direction;
          entryPrice = trade.entryPrice;
          exitPrice = ?exitPrice;
          size = trade.size;
          timestamp = trade.timestamp;
          pnl = ?pnl;
          isWin = ?isWin;
        };
        trades.add(id, updatedTrade);
        updatedTrade : TradeResult;
      };
    };
  };

  public query ({ caller }) func getTrade(id : Nat) : async TradeResult {
    switch (trades.get(id)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?trade) { trade };
    };
  };

  public query ({ caller }) func getAllTrades() : async [TradeResult] {
    trades.values().toArray();
  };

  public query ({ caller }) func getPerformanceStats() : async PerformanceStats {
    let tradeArray = trades.values().toArray();
    let totalTrades = tradeArray.size();
    var wins = 0;
    var losses = 0;
    var totalPnl = 0.0;

    for (trade in tradeArray.values()) {
      switch (trade.isWin) {
        case (null) {};
        case (?true) { wins += 1 };
        case (?false) { losses += 1 };
      };
      switch (trade.pnl) {
        case (null) {};
        case (?pnl) { totalPnl += pnl };
      };
    };

    let winRate = if (totalTrades > 0) {
      wins.toFloat() / totalTrades.toFloat();
    } else {
      0.0;
    };

    {
      totalTrades;
      wins;
      losses;
      winRate;
      totalPnl;
    };
  };

  func calculatePnl(direction : Direction, entryPrice : Float, exitPrice : Float, size : Float) : Float {
    let leverage : Float = 10.0;
    let priceDiff = switch (direction) {
      case (#long) { exitPrice - entryPrice };
      case (#short) { entryPrice - exitPrice };
    };
    priceDiff * size * leverage / entryPrice;
  };

  public shared ({ caller }) func cancelTrade(id : Nat) : async () {
    switch (trades.get(id)) {
      case (null) { Runtime.trap("Trade not found") };
      case (?trade) {
        if (trade.exitPrice != null) {
          Runtime.trap("Trade already closed");
        };
        trades.remove(id);
      };
    };
  };

  public shared ({ caller }) func deleteTrade(id : Nat) : async () {
    switch (trades.get(id)) {
      case (null) { Runtime.trap("Trade not found") };
      case (_) { trades.remove(id) };
    };
  };

  public query ({ caller }) func getOpenTrades() : async [TradeResult] {
    trades.values().toArray().filter(func(trade) { trade.exitPrice == null });
  };

  public query ({ caller }) func getClosedTrades() : async [TradeResult] {
    trades.values().toArray().filter(func(trade) { trade.exitPrice != null });
  };

  public query ({ caller }) func getWinRate() : async Float {
    let tradeArray = trades.values().toArray();
    let totalTrades = tradeArray.size();
    var wins = 0;

    for (trade in tradeArray.values()) {
      switch (trade.isWin) {
        case (null) {};
        case (?true) { wins += 1 };
        case (_ : ?Bool) {};
      };
    };
    if (totalTrades > 0) {
      wins.toFloat() / totalTrades.toFloat();
    } else {
      0.0;
    };
  };

  public query ({ caller }) func getTotalPnl() : async Float {
    var totalPnl = 0.0;
    for (trade in trades.values().toArray().values()) {
      switch (trade.pnl) {
        case (null) {};
        case (?pnl) { totalPnl += pnl };
      };
    };
    totalPnl;
  };
};

