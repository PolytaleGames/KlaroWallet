import { useState, useCallback } from 'react';

const useHistory = (initialState) => {
    const [state, setState] = useState({
        past: [],
        present: initialState,
        future: []
    });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    const undo = useCallback(() => {
        setState((currentState) => {
            const { past, present, future } = currentState;
            if (past.length === 0) return currentState;

            const previous = past[past.length - 1];
            const newPast = past.slice(0, past.length - 1);

            return {
                past: newPast,
                present: previous,
                future: [present, ...future]
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState((currentState) => {
            const { past, present, future } = currentState;
            if (future.length === 0) return currentState;

            const next = future[0];
            const newFuture = future.slice(1);

            return {
                past: [...past, present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    const set = useCallback((newPresent) => {
        setState((currentState) => {
            const { present, past } = currentState;

            if (newPresent === present) return currentState;

            // Optional: Limit history size (e.g., 50 steps)
            const MAX_HISTORY = 50;
            const newPast = [...past, present];
            if (newPast.length > MAX_HISTORY) {
                newPast.shift(); // Remove oldest
            }

            return {
                past: newPast,
                present: newPresent,
                future: []
            };
        });
    }, []);

    // Helper to reset history (e.g. on new file load)
    const reset = useCallback((newPresent) => {
        setState({
            past: [],
            present: newPresent,
            future: []
        });
    }, []);

    return {
        state: state.present,
        set,
        undo,
        redo,
        canUndo,
        canRedo,
        reset,
        historyState: state // For debugging if needed
    };
};

export default useHistory;
