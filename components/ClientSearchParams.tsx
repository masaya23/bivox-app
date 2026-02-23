'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, ReactNode } from 'react';

interface ClientSearchParamsProps {
  children: (params: { [key: string]: string | null }) => ReactNode;
  paramNames: string[];
}

function ClientSearchParamsInner({ children, paramNames }: ClientSearchParamsProps) {
  const searchParams = useSearchParams();
  const params: { [key: string]: string | null } = {};

  for (const name of paramNames) {
    params[name] = searchParams.get(name);
  }

  return <>{children(params)}</>;
}

export default function ClientSearchParams({ children, paramNames }: ClientSearchParamsProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
      <ClientSearchParamsInner paramNames={paramNames}>{children}</ClientSearchParamsInner>
    </Suspense>
  );
}
