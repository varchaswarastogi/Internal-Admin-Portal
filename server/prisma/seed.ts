import { PrismaClient, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addHours, subDays, subHours } from "date-fns";

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
  "Dev Malhotra",
  "Grace Morgan",
  "Aditya Kulkarni",
  "Sofia Rossi",
  "Nikhil Bansal",
  "Ella Anderson",
  "Tanvi Joshi",
  "Henry Walker",
  "Meera Das",
  "Leo Thompson",
  "Sara Ahmed",
  "Kian Murphy",
  "Ira Verma",
  "Owen Scott",
  "Saanvi Reddy",
  "Chloe Martin",
  "Yusuf Ali",
  "Riya Chatterjee",
  "Jack Turner",
  "Diya Shah",
  "Mateo Hernandez",
  "Aisha Thomas",
  "Finn Cooper",
  "Neha Menon",
  "Caleb Young"
];

const countries = ["India", "United States", "Canada", "United Kingdom", "Germany", "Singapore"];
const plans = ["Free", "Starter", "Pro", "Enterprise"];
const recurringEvents = ["button_clicked", "report_viewed", "invite_sent", "dashboard_opened", "export_created"];

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

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
    const createdAt = subDays(new Date(), 7 + ((index * 5) % 130));
    const status = index % 17 === 0 ? UserStatus.BANNED : index % 13 === 0 ? UserStatus.DEACTIVATED : UserStatus.ACTIVE;
    users.push(
      await prisma.user.create({
        data: {
          name: names[index],
          email: names[index].toLowerCase().replaceAll(" ", ".") + "@example.com",
          plan: pick(plans, index + Math.floor(index / 3)),
          country: pick(countries, index),
          status,
          createdAt,
          lastSeenAt: status === UserStatus.ACTIVE ? subHours(new Date(), 3 + ((index * 7) % 260)) : subDays(new Date(), 35 + (index % 45))
        }
      })
    );
  }

  const events = [];
  const purchaseAmounts = [19, 29, 49, 79, 99, 149, 249];

  for (const [index, user] of users.entries()) {
    const userAgeDays = Math.max(1, Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000));
    const signedUpAt = addHours(user.createdAt, 1 + (index % 10));
    events.push({
      userId: user.id,
      eventName: "user_signed_up",
      createdAt: signedUpAt,
      properties: { source: pick(["organic", "referral", "paid_search", "linkedin"], index) }
    });

    if (index % 10 !== 0) {
      events.push({
        userId: user.id,
        eventName: "workspace_created",
        createdAt: addHours(signedUpAt, 2 + (index % 18)),
        properties: { template: pick(["analytics", "support", "billing", "growth"], index) }
      });
    }

    if (index % 3 !== 0) {
      events.push({
        userId: user.id,
        eventName: "button_clicked",
        createdAt: addHours(signedUpAt, 8 + (index % 40)),
        properties: { button: pick(["invite_teammate", "create_report", "upgrade_plan", "export_csv"], index) }
      });
    }

    if (index % 5 === 1 || index % 7 === 2) {
      events.push({
        userId: user.id,
        eventName: "purchase_made",
        createdAt: addHours(signedUpAt, 24 + (index % 90)),
        properties: { amount: pick(purchaseAmounts, index), plan: user.plan }
      });
    }

    const activeWindow = user.status === UserStatus.ACTIVE ? Math.min(45, userAgeDays) : Math.min(20, userAgeDays);
    for (let day = activeWindow; day >= 0; day -= 1) {
      const engagement = pseudoRandom(index * 19 + day * 11);
      const isRecentlyActive = day <= 30 && user.status === UserStatus.ACTIVE && engagement > 0.34;
      const isOlderNoise = day > 30 && engagement > 0.78;
      if (!isRecentlyActive && !isOlderNoise) continue;

      const eventCount = engagement > 0.82 ? 3 : engagement > 0.58 ? 2 : 1;
      for (let count = 0; count < eventCount; count += 1) {
        const eventName = pick(recurringEvents, index + day + count);
        events.push({
          userId: user.id,
          eventName,
          createdAt: subHours(subDays(new Date(), day), (index + count * 5) % 24),
          properties: {
            surface: pick(["dashboard", "users", "billing", "reports"], index + count),
            source: pick(["web", "mobile", "email"], day + count)
          }
        });
      }
    }
  }

  for (let day = 0; day < 60; day += 1) {
    for (const [index, user] of users.entries()) {
      if (user.status !== UserStatus.ACTIVE || pseudoRandom(day * 41 + index * 13) < 0.9) continue;
      const eventCount = pseudoRandom(day + index) > 0.72 ? 2 : 1;
      for (let i = 0; i < eventCount; i += 1) {
        events.push({
          userId: user.id,
          eventName: pick(["report_viewed", "button_clicked", "invite_sent"], day + index + i),
          createdAt: subHours(subDays(new Date(), day), (day + index + i) % 24),
          properties: { source: pick(["web", "mobile", "email"], index + i), campaign: pick(["spring_launch", "activation", "retention"], day) }
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
