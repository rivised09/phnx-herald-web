import Swal from 'sweetalert2';

const base = {
  background: '#1c1c1c',
  color: '#fafafa',
  width: 430,
  buttonsStyling: false,
  customClass: {
    popup: 'rounded-lg border border-gray-800 shadow-2xl',
    title: 'text-base font-semibold',
    htmlContainer: 'text-sm leading-relaxed text-gray-400 px-2',
    confirmButton: 'rounded-md px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950',
    cancelButton:
      'rounded-md border border-gray-800 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400 hover:text-neutral-100',
    icon: 'border-0',
    actions: 'gap-2 px-4 pb-4',
    overlay: 'backdrop-blur-[2px] bg-black/60',
  },
};

function fire(options) {
  return Swal.fire({ ...base, ...options });
}

export async function askConfirmation({ title, text, confirmText, danger = false }) {
  const result = await fire({
    title,
    html: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'No, keep it',
    reverseButtons: true,
    focusConfirm: false,
    customClass: {
      ...base.customClass,
      confirmButton: `rounded-md px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] transition ${
        danger
          ? 'bg-red-500 text-white hover:bg-red-400'
          : 'bg-gray-100 text-neutral-950 hover:bg-white'
      }`,
    },
  });
  return result.isConfirmed;
}

export function toastSuccess(message) {
  fire({
    icon: 'success',
    title: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    width: 'auto',
    customClass: {
      ...base.customClass,
      popup: `${base.customClass.popup} !w-auto`,
    },
  });
}

export function toastError(message) {
  fire({
    icon: 'error',
    title: message || 'Something went wrong.',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    width: 'auto',
    customClass: {
      ...base.customClass,
      popup: `${base.customClass.popup} !w-auto`,
    },
  });
}