import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'ایمیل معتبر نیست.' })
  @MaxLength(254)
  email!: string;

  @IsString({ message: 'رمز عبور باید متن باشد.' })
  @MinLength(1, { message: 'رمز عبور را وارد کنید.' })
  @MaxLength(128)
  password!: string;
}
