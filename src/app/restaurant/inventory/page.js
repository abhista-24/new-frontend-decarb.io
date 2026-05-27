"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to the merged Operations Hub
export default function InventoryRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/restaurant/orders'); }, [router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#9AA0A6', fontSize: '0.9rem' }}>
      Redirecting to Operations Hub…
    </div>
  );
}
