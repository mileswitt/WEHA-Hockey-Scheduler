function DivOutputFilter({ players, loading }) {
  if (loading) return <p>Loading...</p>;
  if (!players.length) return <p>No results. Select a filter above.</p>;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-gray-200">
          <th className="border p-2 text-left">First</th>
          <th className="border p-2 text-left">Last</th>
          <th className="border p-2 text-left">Team</th>
          <th className="border p-2 text-left">Division</th>
          <th className="border p-2 text-left">League</th>
          <th className="border p-2 text-left">Age Group</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => (
          <tr key={i} className="odd:bg-white even:bg-gray-50">
            <td className="border p-2">{p.First}</td>
            <td className="border p-2">{p.Last}</td>
            <td className="border p-2">{p.Team}</td>
            <td className="border p-2">{p.Division}</td>
            <td className="border p-2">{p.League}</td>
            <td className="border p-2">{p["Age Group"]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DivOutputFilter;
