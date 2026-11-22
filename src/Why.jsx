/* «Почему день выглядит так» — объяснимая логика системы. */
export default function Why({ s, compact = false }) {
  const list = compact ? s.explain.filter((e) => e.k !== "Основа" && e.k !== "Голос") : s.explain;
  return (
    <dl className={`why ${compact ? "compact" : ""}`}>
      {list.map((e) => (
        <div key={e.k}>
          <dt>{e.k}</dt>
          <dd>
            {e.swatches && <span className="sw">{e.swatches.map((c, i) => <i key={i} style={{ background: c }} />)}</span>}
            {e.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
