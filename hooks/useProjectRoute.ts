"use client";

import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { ADMIN_EMAIL } from '@/utils/notifications';

export function useProjectRoute() {
  const { user, loading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const isAdmin = user?.email === ADMIN_EMAIL;
  return {
    loading: loading || !user,
    isAdmin,
    projectId: params.projectId,
    // A client's URL cannot change whose project is read or edited.
    userId: isAdmin ? searchParams.get('userId') : user?.uid,
  };
}
