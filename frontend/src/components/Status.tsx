export function Status({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  if (error)
    return (
      <div className="notice error" role="alert">
        <p>{error}</p>
        {retry && (
          <button className="button secondary" onClick={retry}>
            Tekrar dene
          </button>
        )}
      </div>
    );
  if (loading)
    return (
      <div className="loading" role="status">
        <span className="spinner" /> Bilgiler yükleniyor…
      </div>
    );
  return null;
}
