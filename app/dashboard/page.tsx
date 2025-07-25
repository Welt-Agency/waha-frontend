'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRootRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/sessions');
  }, [router]);
  return null;
}
