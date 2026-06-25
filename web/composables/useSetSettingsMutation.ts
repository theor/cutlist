import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { AccountSettings } from '~/utils';

export default function () {
  const accountService = useAccountService();
  const client = useQueryClient();

  return useMutation({
    mutationFn({
      projectId,
      changes,
    }: {
      projectId: string | undefined;
      changes: Partial<AccountSettings>;
    }) {
      return accountService.value.setSettings(projectId, changes);
    },
    onError(error) {
      // Don't let a failed save (e.g. Firestore rejecting the write) be silent.
      console.error('Failed to save settings:', error);
    },
    onSettled() {
      client.invalidateQueries({
        queryKey: ['settings'],
      });
    },
  });
}
