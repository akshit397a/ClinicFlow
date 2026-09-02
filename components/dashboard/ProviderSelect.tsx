'use client';

import { useRouter } from 'next/navigation';

interface Provider {
  id: string;
  full_name: string;
}

interface Props {
  providers: Provider[];
  selectedProviderId?: string;
}

export function ProviderSelect({ providers, selectedProviderId }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    router.push(`/?view=provider&provider_id=${encodeURIComponent(val)}`);
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <label htmlFor="provider_select" className="sr-only">
        Select Doctor
      </label>
      <select
        id="provider_select"
        value={selectedProviderId}
        onChange={handleChange}
        className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1 text-xs text-[#111111] font-medium outline-none cursor-pointer hover:border-[#111111] transition-colors shadow-2xs"
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            Dr. {p.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
