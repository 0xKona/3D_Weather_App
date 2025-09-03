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

  return (
    <input
      type="text"
      placeholder="Enter a location here!"
      className="input"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}