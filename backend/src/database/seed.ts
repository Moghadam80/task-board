import 'dotenv/config';
import { hashPassword } from '../common/crypto/password.js';
import { EMPTY_TIPTAP_DOCUMENT } from '../common/validation/tiptap.js';
import { Todo, TodoPriority, TodoStatus } from '../todos/todo.entity.js';
import { User, UserRole } from '../users/user.entity.js';
import { AppDataSource } from './data-source.js';

const seeds = [
  {
    name: 'مالک سامانه',
    email: process.env.SEED_OWNER_EMAIL ?? 'owner@taskboard.local',
    password: process.env.SEED_OWNER_PASSWORD ?? 'OwnerPass123!',
    role: UserRole.OWNER,
  },
  {
    name: 'مدیر پروژه',
    email: process.env.SEED_MANAGER_EMAIL ?? 'manager@taskboard.local',
    password: process.env.SEED_MANAGER_PASSWORD ?? 'ManagerPass123!',
    role: UserRole.MANAGER,
  },
  {
    name: 'عضو تیم',
    email: process.env.SEED_MEMBER_EMAIL ?? 'member@taskboard.local',
    password: process.env.SEED_MEMBER_PASSWORD ?? 'MemberPass123!',
    role: UserRole.MEMBER,
  },
];

try {
  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);
  const todos = AppDataSource.getRepository(Todo);

  const createdByEmail = new Map<string, User>();
  for (const item of seeds) {
    const email = item.email.toLowerCase();
    let user = await users.findOne({ where: { email } });
    if (user) {
      console.log(`Skipped existing user: ${email}`);
    } else {
      user = await users.save(
        users.create({
          name: item.name,
          email,
          passwordHash: await hashPassword(item.password),
          role: item.role,
          isActive: true,
          refreshTokenHash: null,
        }),
      );
      console.log(`Created ${item.role}: ${email}`);
    }
    createdByEmail.set(email, user);
  }

  const owner = createdByEmail.get(seeds[0].email.toLowerCase());
  const manager = createdByEmail.get(seeds[1].email.toLowerCase());
  const member = createdByEmail.get(seeds[2].email.toLowerCase());
  const existingTodos = await todos.count();

  if (existingTodos === 0 && owner && manager && member) {
    await todos.save([
      todos.create({
        title: 'بازبینی دسترسی نقش‌ها',
        status: TodoStatus.IN_PROGRESS,
        priority: TodoPriority.HIGH,
        description: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'کنترل دسترسی سمت سرور' }],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'مجوزها باید در NestJS اعمال شوند، نه فقط با مخفی‌کردن دکمه‌ها در UI.',
                },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'عضو فقط وظایف ساخته‌شده یا واگذارشده به خودش را می‌بیند.',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        dueDate: null,
        creatorId: owner.id,
        assigneeId: manager.id,
      }),
      todos.create({
        title: 'نوشتن توضیحات وظیفه با TipTap',
        status: TodoStatus.TODO,
        priority: TodoPriority.MEDIUM,
        description: EMPTY_TIPTAP_DOCUMENT,
        dueDate: null,
        creatorId: member.id,
        assigneeId: member.id,
      }),
      todos.create({
        title: 'گزارش محرمانه مالک',
        status: TodoStatus.TODO,
        priority: TodoPriority.LOW,
        description: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'این وظیفه به عضو واگذار نشده است و نباید برای او قابل مشاهده باشد.',
                },
              ],
            },
          ],
        },
        dueDate: null,
        creatorId: owner.id,
        assigneeId: owner.id,
      }),
    ]);
    console.log('Created sample tasks.');
  } else {
    console.log('Skipped sample tasks because records already exist.');
  }

  console.log(
    'Seed completed. Change sample passwords before exposing the app beyond your local machine.',
  );
} catch (error) {
  console.error('Seed failed:', error);
  process.exitCode = 1;
} finally {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}
