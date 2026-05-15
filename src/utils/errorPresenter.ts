import { AlertButton } from 'react-native';
import Toast from 'react-native-toast-message';

import { AlertService } from './alert';
import { ErrorMessage, getUserFriendlyError } from './errorHandling';

export interface ErrorReporter {
  captureException(error: Error, options?: Record<string, any>): void;
}

let registeredReporter: ErrorReporter | null = null;

export const registerErrorReporter = (reporter: ErrorReporter) => {
  registeredReporter = reporter;
};

interface PresenterOptions {
  screen?: string;
  route?: string;
  report?: boolean;
  source?: string;
  buttons?: AlertButton[];
  fallbackTitle?: string;
}

interface MessageOptions {
  title?: string;
  buttons?: AlertButton[];
}

type PresentableMessage = Pick<ErrorMessage, 'title' | 'message' | 'severity'>;

type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Single entry point untuk semua toast notification. Position di-set global di _layout.tsx. */
export const showToast = (type: ToastType, title: string, message?: string, visibilityTime = 4000) => {
  Toast.show({ type, text1: title, text2: message, visibilityTime });
};

const normalizeError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error(fallbackMessage);
};

export const presentMessage = (
  presentation: PresentableMessage,
  options: MessageOptions = {},
) => {
  const title = options.title ?? presentation.title;

  if (options.buttons?.length) {
    AlertService.custom(title, presentation.message, options.buttons);
    return;
  }

  const type = presentation.severity === 'error' ? 'error' : 'info';
  showToast(type, title, presentation.message);
};

export const presentSuccessMessage = (message: string, title = 'Berhasil') => {
  showToast('success', title, message);
};

export const presentInfoMessage = (message: string, title = 'Info') => {
  showToast('info', title, message);
};

export const presentErrorMessage = (message: string, title = 'Gagal') => {
  showToast('error', title, message, 5000);
};

export const presentAppError = (error: unknown, options: PresenterOptions = {}): ErrorMessage => {
  const presentation = getUserFriendlyError(error);

  presentMessage(
    {
      ...presentation,
      title: options.fallbackTitle ?? presentation.title,
    },
    { buttons: options.buttons },
  );

  const shouldReport = options.report ?? presentation.reportable;
  if (shouldReport && registeredReporter) {
    registeredReporter.captureException(normalizeError(error, presentation.message), {
      source: options.source ?? 'ui',
      screen: options.screen,
      route: options.route,
      errorKind: presentation.kind,
      severity: presentation.severity,
      audience: presentation.audience,
    });
  }

  return presentation;
};
