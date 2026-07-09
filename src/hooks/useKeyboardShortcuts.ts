import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { Action } from '../state';
import type { Selection } from '../types';

const ARROW_MOVES: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Global shortcuts: arrows nudge the selection, Escape deselects / cancels
 * marker placement, Delete removes the selected data point. Ignored while
 * typing in a form control.
 */
export function useKeyboardShortcuts(
  selection: Selection,
  scale: number,
  dispatch: Dispatch<Action>,
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = document.activeElement?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (event.key === 'Escape') {
        dispatch({ type: 'deselect' });
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selection?.kind === 'point') {
        event.preventDefault();
        dispatch({ type: 'deletePoint', index: selection.index });
        return;
      }

      const move = ARROW_MOVES[event.key];
      if (!move || !selection) return;
      event.preventDefault();

      // Move 1 screen pixel (10 with Shift), so zooming in gives finer control
      const step = (event.shiftKey ? 10 : 1) / scale;
      dispatch({ type: 'nudgeSelection', dx: move[0] * step, dy: move[1] * step });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selection, scale, dispatch]);
}
