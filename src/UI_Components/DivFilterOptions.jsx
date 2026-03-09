function DivFilterOptions({ options, onFilter }) {
  return (
    <div className="flex gap-6 mb-6">
      <div>
        <label className="block font-bold mb-1">League</label>
        <select
          defaultValue=""
          onChange={e => e.target.value && onFilter('League', e.target.value)}
        >
          <option value="" disabled>Select a league</option>
          {options.leagues.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="block font-bold mb-1">Division</label>
        <select
          defaultValue=""
          onChange={e => e.target.value && onFilter('Division', e.target.value)}
        >
          <option value="" disabled>Select a division</option>
          {options.divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>
  );
}

export default DivFilterOptions;
