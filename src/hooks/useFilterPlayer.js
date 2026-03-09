import { useState, useEffect } from 'react';

function useFilterPlayer() {
  const [options, setOptions] = useState({ leagues: [], divisions: [] });
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/options')
      .then(r => r.json())
      .then(setOptions);
  }, []);

  function filterBy(type, value) {
    setLoading(true);
    const param = type === 'League'
      ? `league=${encodeURIComponent(value)}`
      : `division=${encodeURIComponent(value)}`;
    fetch(`/api/players?${param}`)
      .then(r => r.json())
      .then(data => { setPlayers(data); setLoading(false); });
  }

  return { options, players, loading, filterBy };
}

export default useFilterPlayer;
