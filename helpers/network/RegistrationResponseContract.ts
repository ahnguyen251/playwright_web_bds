import type { AuthResponseSnapshot } from './AuthRequestObserver';

interface RegistrationSubmitObservation {
  readonly disabledObserved: boolean;
  readonly loadingTextObserved: boolean;
}

export interface AcceptedRegistrationTransport {
  readonly status: number;
  readonly submitTransitionObserved: true;
}

export const requireAcceptedRegistrationTransport = (
  response: AuthResponseSnapshot,
  submitState: RegistrationSubmitObservation,
): AcceptedRegistrationTransport => {
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Registration request was not accepted.');
  }
  if (!submitState.disabledObserved || !submitState.loadingTextObserved) {
    throw new Error('Registration submit transition was not observed.');
  }

  return Object.freeze({
    status: response.status,
    submitTransitionObserved: true,
  });
};
