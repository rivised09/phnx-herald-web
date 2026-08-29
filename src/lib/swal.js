import Swal from 'sweetalert2';

const base = {
  background: '#2b2d31',
  color: '#f2f3f5',
  width: 430,
  buttonsStyling: false,
  customClass: {
    popup: 'rounded-xl border border-black/50 shadow-2xl',
    title: 'text-base font-bold',
    htmlContainer: 'text-sm leading-relaxed text-discord-muted px-2',
    confirmButton: 'rounded-md px-4 py-2 text-sm font-semibold text-white',
    cancelButton:
      'rounded-md bg-discord-raised px-4 py-2 text-sm font-semibold text-discord-muted hover:text-discord-text',
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
      confirmButton: `rounded-md px-4 py-2 text-sm font-semibold text-white transition ${
        danger ? 'bg-red-500 hover:bg-red-400' : 'bg-amber-500 hover:bg-amber-400'
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