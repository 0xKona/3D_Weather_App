'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LocationInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams?.get('location') ?? '';
  const [value, setValue] = useState(initial);

  // Keep input synced when the URL changes (back/forward)
  useEffect(() => {
    const location = searchParams?.get('location') ?? '';
    if (location !== value) setValue(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  const updateUrl = (val: string) => {
    const url = new URL(window.location.href);
    if (val) url.searchParams.set('location', val);
    else url.searchParams.delete('location');
    // replace => soft update (no new history entry); scroll:false keeps viewport stable
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // only update URL on Enter
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateUrl(value.trim());
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const onFocus = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.select();
  }

  return (
    <div className="input input-bordered flex items-center gap-2 w-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-4 w-4 opacity-70">
        <path
          fillRule="evenodd"
          d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
          clipRule="evenodd" />
      </svg>
      <input
        type="text"
        placeholder="Enter a location here!"
        className="grow"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
      />
    </div>
    
  );
}