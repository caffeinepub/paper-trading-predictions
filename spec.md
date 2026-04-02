# Paper Trading Predictions

## Current State
The `Prediction24h` component calls both `predict_24h_close()` (price string) and `get_latest_prediction()` (direction/confidence/trend). The price call often fails/returns unparseable text, showing no price target. No prediction accountability exists -- predictions are never scored.

## Requested Changes (Diff)

### Add
- Synthesized price target: when `predict_24h_close` fails, derive a price from `get_latest_prediction` data using current BTC price + directional offset based on trend_strength x confidence. Flag as `synthesized`.
- `PredictionTracker` component + `usePredictionTracker` hook: records each prediction, scores HIT/MISS after 24h using direction vs actual price delta, shows running scorecard (hit rate, streak, avg confidence), persists in localStorage.
- Track record panel in Signals tab below 24h banner.

### Modify
- `usePrediction24h`: synthesize price when parse fails, accept `currentPrice` param.
- `Prediction24h`: handle `synthesized` source flag with `EST` badge instead of `LIVE`.
- App.tsx: pass `currentPrice` to `usePrediction24h`, add `PredictionTracker` in Signals tab.

### Remove
- Nothing

## Implementation Plan
1. Update `usePrediction24h` hook to synthesize price from direction + trend_strength + confidence when raw parse fails.
2. Create `usePredictionTracker` hook with localStorage persistence and HIT/MISS scoring.
3. Create `PredictionTracker` component with scorecard + history table.
4. Update `Prediction24h` component for `synthesized` source badge.
5. Wire everything into App.tsx.
