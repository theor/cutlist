const store = createGlobalState(() =>
  useLocalStorage<Record<string, number[]>>('@cutlist/disabled-parts', {}),
);

/**
 * Per-project set of part numbers the user has disabled. Disabled parts are
 * excluded from the generated layout but still listed in the BOM so they can be
 * re-enabled. Persisted in local storage.
 */
export default function () {
  const map = store();
  const project = useProject();
  const key = computed(() => project.value?.id ?? '');

  const disabled = computed(() => new Set(map.value[key.value] ?? []));

  const isDisabled = (partNumber: number) => disabled.value.has(partNumber);

  const setDisabled = (partNumber: number, value: boolean) => {
    if (!key.value) return;
    const set = new Set(map.value[key.value] ?? []);
    if (value) set.add(partNumber);
    else set.delete(partNumber);
    map.value = { ...map.value, [key.value]: [...set] };
  };

  const toggle = (partNumber: number) =>
    setDisabled(partNumber, !isDisabled(partNumber));

  return { disabled, isDisabled, setDisabled, toggle };
}
