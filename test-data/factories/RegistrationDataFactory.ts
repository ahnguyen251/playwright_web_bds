import type { ProductionRegistrationConfig } from '../../types/otp.types';
import type { RegistrationData } from '../../types/user.types';
import { RandomDataGenerator } from '../../utils/RandomDataGenerator';

export class RegistrationDataFactory {
  public static create(
    config: ProductionRegistrationConfig,
    uniqueValue = RandomDataGenerator.string('registration'),
  ): RegistrationData {
    if ((config.emailTemplate.match(/\{unique\}/g)?.length ?? 0) !== 1) {
      throw new Error('Mẫu email đăng ký phải chứa đúng một token {unique}.');
    }

    return Object.freeze({
      fullName: config.fullName,
      email: config.emailTemplate.replace('{unique}', uniqueValue),
      password: config.password,
      passwordConfirmation: config.password,
    });
  }
}
