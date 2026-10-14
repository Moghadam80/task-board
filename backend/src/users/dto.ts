import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from './user.entity.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateUserDto {
  @Transform(trim)
  @IsString({ message: 'نام باید متن باشد.' })
  @MinLength(2, { message: 'نام باید حداقل ۲ کاراکتر باشد.' })
  @MaxLength(120, { message: 'نام بیش از حد طولانی است.' })
  name!: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'ایمیل معتبر نیست.' })
  @MaxLength(254)
  email!: string;

  @IsString({ message: 'رمز عبور باید متن باشد.' })
  @MinLength(10, { message: 'رمز عبور باید حداقل ۱۰ کاراکتر باشد.' })
  @MaxLength(128, { message: 'رمز عبور بیش از حد طولانی است.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'رمز عبور باید شامل حرف و عدد باشد.',
  })
  password!: string;

  @IsIn([UserRole.MANAGER, UserRole.MEMBER], {
    message: 'از طریق API فقط می‌توان مدیر یا عضو ساخت.',
  })
  role!: UserRole.MANAGER | UserRole.MEMBER;
}

/** Validate unless the property is omitted (so an explicit `null` is rejected). */
const notUndefined = (_dto: unknown, value: unknown) => value !== undefined;

export class UpdateUserDto {
  @ValidateIf(notUndefined)
  @Transform(trim)
  @IsString({ message: 'نام باید متن باشد.' })
  @MinLength(2, { message: 'نام باید حداقل ۲ کاراکتر باشد.' })
  @MaxLength(120, { message: 'نام بیش از حد طولانی است.' })
  name?: string;

  @ValidateIf(notUndefined)
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'ایمیل معتبر نیست.' })
  @MaxLength(254)
  email?: string;

  @ValidateIf(notUndefined)
  @IsEnum(UserRole, { message: 'نقش انتخاب‌شده معتبر نیست.' })
  role?: UserRole;

  @ValidateIf(notUndefined)
  @IsBoolean({ message: 'وضعیت فعال بودن باید بولین باشد.' })
  isActive?: boolean;
}
