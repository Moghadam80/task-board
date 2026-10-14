# API کاربان

NestJS + TypeORM + PostgreSQL. کنترل دسترسی در همین لایه اعمال می‌شود.

## راه‌اندازی

```powershell
Copy-Item .env.example .env
npm install
npm run migration:run
npm run seed
npm run start:dev
```

سرویس روی پورت `3001` و با پیشوند `/api/v1` گوش می‌دهد. `synchronize` خاموش است.

## دستورات

- `npm run migration:run`
- `npm run migration:revert`
- `npm run seed`
- `npm run test` (unit، بدون دیتابیس)
- `npm run test:e2e` (HTTP روی PostgreSQL؛ نیاز به `TEST_DATABASE_URL` با نام دیتابیس `*_test`)
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## امنیت

- توکن‌ها در JSON برنمی‌گردند و از هدر Bearer هم خوانده نمی‌شوند.
- Refresh token فقط به‌صورت هش argon2id ذخیره می‌شود و در هر نوسازی می‌چرخد.
- Logout با افزایش `session_version` تمام access tokenهای قبلی را فوراً باطل می‌کند؛ guard نسخهٔ توکن را در هر درخواست بررسی می‌کند.
- شناسهٔ تصادفی (`jti`) در هر توکن، تا چرخش refresh حتی در همان ثانیه توکن متفاوتی بسازد.
- کاربر غیرفعال در هر درخواست JWT رد می‌شود و هش refresh او پاک می‌گردد.
- DTOها فیلد ناشناخته را رد می‌کنند.
- ساخت نقش مالک از API مجاز نیست.
- سند TipTap قبل از ذخیره اعتبارسنجی می‌شود.
