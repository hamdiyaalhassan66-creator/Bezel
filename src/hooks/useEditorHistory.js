import { useRef, useState, useEffect } from "react";

// History only sees what belongs to the active tab, so undo in one tab never touches another tab's state.
const HISTORY_DEVICE_KEYS = [
  "deviceCategory", "deviceType", "finish", "bodyHex", "bodyOpacity", "deviceOrientation",
  "brightness", "reflectionMode", "reflectionShiny", "reflectionMatte", "lighting", "lightingIntensity",
  "showStatusBar", "showHomeIndicator", "showMenuBar", "showBrowser", "browserType", "browserTheme",
  "browserUrl", "safariTabs", "shotId", "mockupEffects",
];

export function useEditorHistory({
  snapshot, keyCacheRef, assetId, animPool,
  tabKey, videoOn, toolbarMode, vidExporting,
  textItems, tplParams, vidTplId,
  projCtxRef, applySnapshot, restoreUntilRef,
}) {
  const historyKey = vidExporting && keyCacheRef.current.hist ? keyCacheRef.current.hist : (() => {
    const s = { ...snapshot };
    if (tabKey === "mockup") delete s.frames; // Mockup doesn't own frames
    else HISTORY_DEVICE_KEYS.forEach((k) => delete s[k]); // Frame / Animation don't own the device
    if (tabKey === "animation") {
      // frames, shots and the playhead are rebuilt from the template, so only its inputs are tracked
      delete s.frames;
      delete s.vidShots;
      delete s.vidHead;
    }
    s.textItems = textItems.filter((t) => (t.mode ?? "mockup") === tabKey);
    if (tabKey === "animation") {
      // Animation keeps its assets in a ref and its controls in tplParams, so they have to be part of the history too
      s.animPool = animPool().map((a) => (a && a.cropUrl ? { ...a, cropUrl: assetId(a.cropUrl) } : a));
      s.tplParams = tplParams;
      s.vidTplId = vidTplId;
    }
    return JSON.stringify(s);
  })();
  keyCacheRef.current.hist = historyKey;
  const historyKeyRef = useRef(historyKey);
  historyKeyRef.current = historyKey;

  const historiesRef = useRef({}); // tab -> its own { past, future, committed }
  const historyRef = useRef({ past: [], future: [], committed: null }); // the active tab's stack
  const [, setHistoryTick] = useState(0);

  // toggling Video mode (or switching mode) changes which fields the snapshot has, so it isn't an undoable step
  useEffect(() => {
    restoreUntilRef.current = Date.now() + 300;
  }, [videoOn, toolbarMode, tabKey]);

  useEffect(() => {
    const h = historyRef.current;
    if (h.committed === null) {
      h.committed = historyKey;
      return;
    }
    if (Date.now() < restoreUntilRef.current) {
      h.committed = historyKey;
      return;
    }
    if (historyKey === h.committed) return;
    const t = setTimeout(() => {
      h.past.push(h.committed);
      if (h.past.length > 100) h.past.shift();
      h.future = [];
      h.committed = historyKey;
      projCtxRef.current = false; // the editor made the latest change, so Cmd/Ctrl+Z belongs to it again
      setHistoryTick((n) => n + 1);
    }, 400);
    return () => clearTimeout(t);
  }, [historyKey]);

  const flushPendingHistory = () => {
    const h = historyRef.current;
    if (h.committed !== null && historyKeyRef.current !== h.committed) {
      h.past.push(h.committed);
      h.future = [];
      h.committed = historyKeyRef.current;
    }
    return h;
  };

  const undo = () => {
    const h = flushPendingHistory();
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(h.committed);
    h.committed = prev;
    applySnapshot(JSON.parse(prev), { scoped: true });
    setHistoryTick((n) => n + 1);
  };

  const redo = () => {
    const h = flushPendingHistory();
    const next = h.future.pop();
    if (!next) return;
    h.past.push(h.committed);
    h.committed = next;
    applySnapshot(JSON.parse(next), { scoped: true });
    setHistoryTick((n) => n + 1);
  };

  const historyPending =
    historyRef.current.committed !== null && historyKey !== historyRef.current.committed;
  const canUndo = historyRef.current.past.length > 0 || historyPending;
  const canRedo = historyRef.current.future.length > 0 && !historyPending;

  return {
    historyKey, historyKeyRef, historiesRef, historyRef, setHistoryTick,
    flushPendingHistory, undo, redo, canUndo, canRedo,
  };
}