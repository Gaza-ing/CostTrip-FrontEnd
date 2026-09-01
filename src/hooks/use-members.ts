import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMembers,
  addVirtualMember,
  updateMemberRole,
  removeMember,
  createInvite,
  acceptInvite,
} from '@/lib/api/members';

/** 여행 멤버 목록 조회 */
export function useMembers(tripId: string) {
  return useQuery({
    queryKey: ['members', tripId],
    queryFn: () => fetchMembers(tripId),
    enabled: !!tripId,
  });
}

/** 가상 멤버 추가 */
export function useAddVirtualMember(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { displayName: string; role?: 'editor' | 'viewer' }) =>
      addVirtualMember(tripId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', tripId] });
    },
  });
}

/** 멤버 역할 변경 */
export function useUpdateMemberRole(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: 'owner' | 'editor' | 'viewer';
    }) => updateMemberRole(tripId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', tripId] });
    },
  });
}

/** 멤버 제거 */
export function useRemoveMember(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(tripId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', tripId] });
    },
  });
}

/** 초대 링크/코드 생성 */
export function useCreateInvite(tripId: string) {
  return useMutation({
    mutationFn: (input?: {
      defaultRole?: 'editor' | 'viewer';
      maxUses?: number | null;
    }) => createInvite(tripId, input),
  });
}

/** 초대 수락 */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { token?: string; code?: string }) =>
      acceptInvite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
