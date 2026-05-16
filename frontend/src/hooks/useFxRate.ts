import { useEffect } from 'react';
import { useSettings } from '../store/AppContext';
import { fetchFxRate } from '../services/api/frankfurter';

export function useFxRate() {
  const { state, dispatch } = useSettings();

  useEffect(() => {
    fetchFxRate(state.fxFetchedAt).then(result => {
      if (result && state.fxSource !== 'manual') {
        dispatch({
          type: 'SET_FX',
          payload: { fxRate: result.fxRate, fxFetchedAt: result.fxFetchedAt, fxSource: 'live' },
        });
      }
    });
  // Re-run when fxFetchedAt resets (e.g. after logout/login) or source switches from manual
  }, [state.fxFetchedAt, state.fxSource]); // eslint-disable-line react-hooks/exhaustive-deps
}
