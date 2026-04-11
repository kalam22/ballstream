import { SearchIcon } from '../Icons'

export default function MatchSearch({ searchRaw, setSearchRaw }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div className="search-wrap">
        <SearchIcon />
        <input
          type="search"
          className="search-input"
          placeholder="Cari tim atau liga..."
          value={searchRaw}
          onChange={e => setSearchRaw(e.target.value)}
          aria-label="Cari pertandingan"
          autoComplete="off"
        />
      </div>
    </div>
  )
}
