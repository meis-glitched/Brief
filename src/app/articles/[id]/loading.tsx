export default function ArticleLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="h-3 w-36 rounded-full bg-paper-deep" />
      <div className="mt-7 h-3 w-64 rounded-full bg-paper-deep" />
      <div className="mt-4 h-12 w-full rounded-lg bg-paper-deep" />
      <div className="mt-3 h-12 w-4/5 rounded-lg bg-paper-deep" />
      <div className="mt-6 aspect-[16/9] w-full rounded-lg bg-paper-deep" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-4 rounded-full bg-paper-deep"
            style={{ width: `${88 - (index % 4) * 7}%` }}
          />
        ))}
      </div>
    </div>
  );
}
