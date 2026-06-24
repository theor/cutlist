<script lang="ts" setup>
import { nanoid } from 'nanoid/non-secure';

const isOpen = useModalModel('add-project');

const { state, closeDialog: _closeDialog } = useDialogState();
const props = computed(() => state.value['add-project']);

const SOURCE_TYPES = ['onshape', 'scad'] as const;
const SOURCE_LABELS: Record<(typeof SOURCE_TYPES)[number], string> = {
  onshape: 'Onshape',
  scad: 'OpenSCAD folder',
};

const id = ref<string>();
const name = ref('');
const sourceType = ref<(typeof SOURCE_TYPES)[number]>('onshape');
const url = ref('');
const path = ref('');

whenever(props, (props) => {
  id.value = props.defaults?.id;
  name.value = props.defaults?.name ?? '';
  const source = props.defaults?.source;
  sourceType.value = source?.type ?? 'onshape';
  url.value = source?.type === 'onshape' ? source.url : '';
  path.value = source?.type === 'scad' ? source.path : '';
});

const closeDialog = () => _closeDialog('add-project');

const submit = () => {
  if (props.value == null) return;

  const source: ProjectSource =
    sourceType.value === 'scad'
      ? { type: 'scad', path: path.value }
      : { type: 'onshape', url: url.value };

  props.value.onAdd({
    id: id.value || nanoid(),
    name: name.value,
    source,
  });
  closeDialog();
};

const dismiss = () => {
  if (props.value == null) return;

  props.value.onCancel();
  closeDialog();
};
</script>

<template>
  <UModal v-model="isOpen">
    <form v-if="props" @submit.prevent.stop="submit">
      <UCard>
        <template #header>{{ props.title }}</template>

        <div class="flex flex-col gap-4">
          <UFormGroup label="Name" required>
            <UInput
              type="text"
              placeholder="Enter a name..."
              v-model="name"
              autocomplete="off"
            />
          </UFormGroup>

          <UFormGroup label="Source" required>
            <USelect
              v-model="sourceType"
              :options="
                SOURCE_TYPES.map((value) => ({
                  value,
                  label: SOURCE_LABELS[value],
                }))
              "
            />
          </UFormGroup>

          <UFormGroup
            v-if="sourceType === 'onshape'"
            label="Onshape Assembly URL"
            required
          >
            <UInput
              type="text"
              placeholder="Enter a url..."
              v-model="url"
              icon="i-heroicons-globe-alt"
            />
          </UFormGroup>

          <UFormGroup
            v-else
            label="OpenSCAD project folder"
            required
            help="Folder containing export-cutlist.sh. It's run with OpenSCAD to produce cutlist.csv."
          >
            <UInput
              type="text"
              placeholder="C:\path\to\project"
              v-model="path"
              icon="i-heroicons-folder"
            />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex flex-row-reverse gap-4">
            <UButton type="submit">Save</UButton>
            <UButton color="gray" @click="dismiss">Cancel</UButton>
          </div>
        </template>
      </UCard>
    </form>
  </UModal>
</template>
