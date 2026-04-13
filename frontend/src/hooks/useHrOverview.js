import { useCallback, useEffect, useState } from 'react';
import useStaffSession from './useStaffSession';

export default function useHrOverview() {
  const { qs } = useStaffSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/hr/overview${qs}`);
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error || 'Failed to load HR records.');
        }
        setData(body);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load HR records.');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [qs],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (!active) {
        return;
      }
      await load();
    };

    bootstrap();

    const interval = setInterval(() => {
      if (active) {
        load({ silent: true });
      }
    }, 45000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh: load,
  };
}
