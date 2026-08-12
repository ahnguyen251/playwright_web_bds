import type { ProductionRegistrationConfig } from '../../types/otp.types';
import type { RegistrationData } from '../../types/user.types';
import { RandomDataGenerator } from '../../utils/RandomDataGenerator';

export class RegistrationDataFactory {
  public static create(
    config: ProductionRegistrationConfig,
    uniqueValue = RandomDataGenerator.string('registration'),
  ): RegistrationData {
    if ((config.emailTemplate.match(/\{unique\}/g)?.length ?? 0) !== 1) {
      throw new Error('Registration email template must contain exactly one {unique} token.');
    }

    return Object.freeze({
      fullName: config.fullName,
      email: config.emailTemplate.replace('{unique}', uniqueValue),
      password: config.password,
      passwordConfirmation: config.password,
    });
  }
}
