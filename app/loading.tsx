export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <div className="skeleton" style={{ height: 250, borderRadius: 18, marginBottom: 22 }} />
      <div className="skeleton" style={{ height: 22, width: 220, marginBottom: 18 }} />
      <div className="grid-posters">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton" style={{ aspectRatio: '2 / 3', borderRadius: 12, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 10, width: '45%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
