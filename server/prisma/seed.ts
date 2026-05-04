import { PrismaClient, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays, subHours } from "date-fns";

const prisma = new PrismaClient();

const names = [
  "Aarav Sharma",
  "Maya Patel",
  "Noah Williams",
  "Olivia Chen",
  "Ishaan Rao",
  "Sophia Miller",
  "Ethan Johnson",
  "Ananya Singh",
  "Liam Brown",
  "Zara Khan",
  "Ava Wilson",
  "Kabir Mehta",
  "Mia Garcia",
  "Lucas Davis",
  "Nina Kapoor",
  "Elijah Martinez",
  "Amelia Thomas",
  "Rohan Iyer",
  "Emma Taylor",
  "Vihaan Gupta",
  "Harper Lee",
  "Arjun Nair",
  "Isabella Clark",
  "Dev Malhotra"
];

const countries = ["India", "United States", "Canada", "United Kingdom", "Germany", "Singapore"];
const plans = ["Free", "Starter", "Pro", "Enterprise"];
const eventNames = ["user_signed_up", "workspace_created", "button_clicked", "report_viewed", "purchase_made", "invite_sent"];

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.event.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.user.deleteMany();
  await prisma.admin.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const admins = await prisma.admin.createMany({
    data: [
      { name: "Priya Superadmin", email: "super@admin.local", passwordHash, role: "SUPER_ADMIN" },
      { name: "Sam Support", email: "support@admin.local", passwordHash, role: "SUPPORT" },
      { name: "Anika Analyst", email: "analyst@admin.local", passwordHash, role: "ANALYST" }
    ]
  });

  const users = [];
  for (let index = 0; index < names.length; index += 1) {
    const createdAt = subDays(new Date(), Math.floor(Math.random() * 80));
    const status = index % 13 === 0 ? UserStatus.BANNED : index % 11 === 0 ? UserStatus.DEACTIVATED : UserStatus.ACTIVE;
    users.push(
      await prisma.user.create({
        data: {
          name: names[index],
          email: names[index].toLowerCase().replaceAll(" ", ".") + "@example.com",
          plan: plans[index % plans.length],
          country: countries[index % countries.length],
          status,
          createdAt,
          lastSeenAt: subHours(new Date(), Math.floor(Math.random() * 240))
        }
      })
    );
  }

  const events = [];
  for (let day = 0; day < 60; day += 1) {
    const activeCount = 5 + Math.floor(Math.random() * users.length * 0.6);
    const shuffled = [...users].sort(() => Math.random() - 0.5).slice(0, activeCount);
    for (const user of shuffled) {
      const eventCount = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < eventCount; i += 1) {
        const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
        events.push({
          userId: user.id,
          eventName,
          createdAt: subHours(subDays(new Date(), day), Math.floor(Math.random() * 24)),
          properties:
            eventName === "purchase_made"
              ? { amount: [19, 49, 99, 249][Math.floor(Math.random() * 4)], plan: user.plan }
              : { source: ["web", "mobile", "email"][Math.floor(Math.random() * 3)] }
        });
      }
    }
  }

  await prisma.event.createMany({ data: events });

  await prisma.featureFlag.createMany({
    data: [
      { key: "new_billing_flow", description: "Roll out the redesigned billing checkout.", enabled: true, rollout: 35 },
      { key: "ai_activity_summary", description: "Generate AI summaries for user activity history.", enabled: false, rollout: 0 },
      { key: "realtime_alerts", description: "Send support alerts when high-value accounts churn.", enabled: true, rollout: 80 }
    ]
  });

  const superAdmin = await prisma.admin.findUniqueOrThrow({ where: { email: "super@admin.local" } });
  await prisma.auditLog.createMany({
    data: [
      {
        adminId: superAdmin.id,
        action: "SEED_DATA_CREATED",
        targetType: "System",
        metadata: { admins: admins.count, users: users.length, events: events.length }
      },
      {
        adminId: superAdmin.id,
        action: "FEATURE_FLAG_UPDATED",
        targetType: "FeatureFlag",
        metadata: { key: "new_billing_flow", enabled: true, rollout: 35 }
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Database seeded.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
