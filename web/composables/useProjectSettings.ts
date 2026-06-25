export default function () {
  const store = useProjectSettingsStore();
  const projectId = useProjectId();

  const defineSettingValue = <T extends keyof AccountSettings>(key: T) =>
    computed({
      get() {
        return store.value[String(toValue(projectId))]?.[key];
      },
      set(value) {
        store.value[String(toValue(projectId))] ??= {};
        store.value[String(toValue(projectId))][key] = value;
      },
    });

  const bladeWidth = defineSettingValue('bladeWidth');
  const distanceUnit = defineSettingValue('distanceUnit');
  const extraSpace = defineSettingValue('extraSpace');
  const maxCutLength = defineSettingValue('maxCutLength');
  const allowRotations = defineSettingValue('allowRotations');
  const rotateAll = defineSettingValue('rotateAll');
  const optimize = defineSettingValue('optimize');
  const showPartNumbers = defineSettingValue('showPartNumbers');
  const showPartNames = defineSettingValue('showPartNames');
  const showCabinetNames = defineSettingValue('showCabinetNames');
  const stock = defineSettingValue('stock');

  const { data: settings, isLoading } = useSettingsQuery(projectId);
  watch(settings, () => {
    resetSettings();
    resetStock();
  });

  const changes = computed(() => {
    const changes: Partial<AccountSettings> = {};
    if (settings.value?.bladeWidth !== bladeWidth.value)
      changes.bladeWidth = bladeWidth.value;
    if (settings.value?.distanceUnit !== distanceUnit.value)
      changes.distanceUnit = distanceUnit.value;
    if (settings.value?.extraSpace !== extraSpace.value)
      changes.extraSpace = extraSpace.value;
    if (settings.value?.maxCutLength !== maxCutLength.value)
      changes.maxCutLength = maxCutLength.value;
    if (settings.value?.allowRotations !== allowRotations.value)
      changes.allowRotations = allowRotations.value;
    if (settings.value?.rotateAll !== rotateAll.value)
      changes.rotateAll = rotateAll.value;
    if (settings.value?.optimize !== optimize.value)
      changes.optimize = optimize.value;
    if (settings.value?.showPartNumbers !== showPartNumbers.value)
      changes.showPartNumbers = showPartNumbers.value;
    if (settings.value?.showPartNames !== showPartNames.value)
      changes.showPartNames = showPartNames.value;
    if (settings.value?.showCabinetNames !== showCabinetNames.value)
      changes.showCabinetNames = showCabinetNames.value;
    if (settings.value?.stock !== stock.value) changes.stock = stock.value;
    return changes;
  });

  const resetSettings = () => {
    bladeWidth.value = settings.value?.bladeWidth;
    distanceUnit.value = settings.value?.distanceUnit;
    extraSpace.value = settings.value?.extraSpace;
    maxCutLength.value = settings.value?.maxCutLength;
    allowRotations.value = settings.value?.allowRotations;
    rotateAll.value = settings.value?.rotateAll;
    optimize.value = settings.value?.optimize;
    showPartNumbers.value = settings.value?.showPartNumbers;
    showPartNames.value = settings.value?.showPartNames;
    showCabinetNames.value = settings.value?.showCabinetNames;
  };
  const resetStock = () => {
    stock.value = settings.value?.stock;
  };

  return {
    bladeWidth,
    distanceUnit,
    extraSpace,
    maxCutLength,
    allowRotations,
    rotateAll,
    optimize,
    showPartNumbers,
    showPartNames,
    showCabinetNames,
    stock,
    resetSettings,
    resetStock,
    isLoading,
    changes,
  };
}
