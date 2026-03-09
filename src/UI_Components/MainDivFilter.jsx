import useFilterPlayer from '../hooks/useFilterPlayer';
import DivFilterOptions from './DivFilterOptions';
import DivOutputFilter from './DivOutputFilter';

function MainDivFilter() {
  const { options, players, loading, filterBy } = useFilterPlayer();

  return (
    <div className="p-4">
      <DivFilterOptions options={options} onFilter={filterBy} />
      <DivOutputFilter players={players} loading={loading} />
    </div>
  );
}

export default MainDivFilter;
