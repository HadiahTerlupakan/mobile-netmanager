import { AlertButton } from 'react-native';

import { errorReportingService } from '@/services/ErrorReportingService';

import { AlertService } from './alert';
import { ErrorMessage, getUserFriendlyError } from './errorHandling';

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

  if (presentation.severity === 'error') {
    AlertService.error(title, presentation.message);
    return;
  }

  AlertService.info(title, presentation.message);
};

export const presentSuccessMessage = (message: string, title = 'Berhasil') => {
  AlertService.success(title, message);
};

export const presentInfoMessage = (message: string, title = 'Info') => {
  AlertService.info(title, message);
};

export const presentErrorMessage = (message: string, title = 'Gagal') => {
  AlertService.error(title, message);
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
  if (shouldReport) {
    errorReportingService.captureException(normalizeError(error, presentation.message), {
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
