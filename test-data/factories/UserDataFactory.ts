import users from '../static/users.json';
import type { UserAlias, UserCredentials, UserRecord } from '../../types/user.types';

const isUserAlias = (value: string): value is UserAlias => value in users;

export class UserDataFactory {
  public static getRecord(alias: string): UserRecord {
    if (!isUserAlias(alias)) {
      throw new Error(`Unknown user alias: ${alias}`);
    }

    const record = users[alias];
    return Object.freeze({ alias, ...record });
  }

  public static getCredentials(
    alias: string,
    source: NodeJS.ProcessEnv = process.env,
  ): UserCredentials {
    const record = UserDataFactory.getRecord(alias);
    const email = source[record.emailEnvironmentKey];
    const password = source[record.passwordEnvironmentKey];

    if (!email) {
      throw new Error(`Missing credential environment variable: ${record.emailEnvironmentKey}`);
    }
    if (!password) {
      throw new Error(`Missing credential environment variable: ${record.passwordEnvironmentKey}`);
    }

    return Object.freeze({ alias: record.alias, email, password });
  }
}
