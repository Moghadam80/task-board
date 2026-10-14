import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
};

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$pmXPYpvQRC72CGaUezIPsA$PQH9oSGEBlnB0+egs2azv3+yMG0MVY3DdYfQR82LGzs';

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

export async function verifyPasswordOrDummy(
  hash: string | null | undefined,
  plain: string,
): Promise<boolean> {
  const matched = await argon2.verify(hash ?? DUMMY_PASSWORD_HASH, plain);
  return Boolean(hash) && matched;
}
