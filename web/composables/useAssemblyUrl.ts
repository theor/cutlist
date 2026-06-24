export default function () {
  const project = useProject();

  return computed<string | undefined>({
    get() {
      const source = project.value?.source;
      return source?.type === 'onshape' ? source.url : undefined;
    },
    set(value) {
      const source = project.value?.source;
      if (source?.type === 'onshape') source.url = value ?? '';
    },
  });
}
