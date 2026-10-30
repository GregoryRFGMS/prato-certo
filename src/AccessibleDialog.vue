<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

defineProps<{ label: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
let opener: HTMLElement | null = null;
let previousOverflow = '';

function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value) return;
  const controls = Array.from(
    dialog.value.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex]',
    ),
  ).filter(
    (el) => el.tabIndex >= 0 && !el.matches(':disabled, [inert]') && el.getClientRects().length,
  );
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) {
    event.preventDefault();
    dialog.value.focus();
  } else if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === dialog.value)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.value?.showModal();
  dialog.value?.querySelector<HTMLElement>('input, select, button')?.focus();
});
onBeforeUnmount(() => {
  dialog.value?.close();
  document.body.style.overflow = previousOverflow;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
});
</script>

<template>
  <dialog
    ref="dialog"
    class="modal-backdrop"
    :aria-label="label"
    aria-modal="true"
    @cancel.prevent="emit('close')"
    @click.self="emit('close')"
    @keydown="trapFocus"
  >
    <slot />
  </dialog>
</template>
