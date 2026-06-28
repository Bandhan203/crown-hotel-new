import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Hook to navigate a form using the Enter key.
 * Pressing Enter will move focus to the next input/select/textarea.
 */
export function useEnterNav(formRef: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      // Allow default behavior for textareas (newline)
      if (e.target instanceof HTMLTextAreaElement) return;

      if (!formRef.current) return;

      const form = formRef.current;
      const focusableElements = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])[type="submit"]'
        )
      );

      const currentIndex = focusableElements.indexOf(e.target as HTMLElement);

      if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
        e.preventDefault();
        const nextElement = focusableElements[currentIndex + 1];
        nextElement.focus();
      }
    };

    const formElement = formRef.current;
    if (formElement) {
      formElement.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (formElement) {
        formElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [formRef]);
}
