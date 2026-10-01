export type CompletionItem = { label: string; done: boolean; href: string };

export default function ProfileCompletion({ items }: { items: CompletionItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  const missing = items.filter((i) => !i.done);

  return (
    <section className="mt-6 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold text-charcoal">Profile completeness</h2>
        <span className="text-sm font-bold text-charcoal">{percent}%</span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-charcoal/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-amil transition-all" style={{ width: `${percent}%` }} />
      </div>

      {missing.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-stock">Your account details are complete.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-charcoal/60">
            {doneCount} of {items.length} done. Finish these to get the most out of your account:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missing.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="inline-block rounded-full border border-charcoal/20 bg-surface px-3 py-1 text-xs font-bold text-charcoal hover:bg-amil-soft"
                >
                  + {item.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
