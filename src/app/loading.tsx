export default function Loading() {
  return (
    <div className="animate-fade">
      <div className="border-b border-line pb-6">
        <div className="skeleton h-2.5 w-32 rounded" />
        <div className="skeleton mt-4 h-12 w-2/3 rounded" />
        <div className="skeleton mt-4 h-4 w-1/2 rounded" />
      </div>
      <div className="mt-8 grid gap-12 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-10 w-5/6 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-64 w-full rounded-xl" />
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
