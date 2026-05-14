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
  }, []); // only on mount
}
