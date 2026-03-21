import { AlertButton } from 'react-native';
import Toast from 'react-native-toast-message';

import { AlertService } from './alert';
import { ErrorMessage, getUserFriendlyError } from './errorHandling';

export interface ErrorReporter {
  captureException(error: Error, options?: Record<string, any>): void;
}

let registeredReporter: ErrorReporter | null = null;

/**
 * Register a reporter to be used by presentAppError.
 * This decouples the utility from the specific service implementation.
 */
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

const normalizeError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

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

  // Use Toast for non-blocking UI feedback
  const type = presentation.severity === 'error' ? 'error' : 'info';

  Toast.show({
    type,
    text1: title,
    text2: presentation.message,
    position: 'bottom',
    visibilityTime: 4000,
  });
};

export const presentSuccessMessage = (message: string, title = 'Berhasil') => {
  Toast.show({ type: 'success', text1: title, text2: message, position: 'bottom' });
};

export const presentInfoMessage = (message: string, title = 'Info') => {
  Toast.show({ type: 'info', text1: title, text2: message, position: 'bottom' });
};

export const presentErrorMessage = (message: string, title = 'Gagal') => {
  Toast.show({ type: 'error', text1: title, text2: message, position: 'bottom', visibilityTime: 5000 });
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
