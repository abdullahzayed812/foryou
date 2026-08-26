import { useEffect, useState, type ReactNode } from "react";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "@fontsource/tajawal/900.css";

const TELEGRAM_CHANNEL = "https://t.me/ForYOU_platform";
const WHATSAPP_LINK = "https://wa.me/201104198388";
const SOCIALS = [
  { label: "Telegram", href: TELEGRAM_CHANNEL, icon: "telegram" },
  { label: "WhatsApp", href: WHATSAPP_LINK, icon: "whatsapp" },
  { label: "Facebook", href: "https://www.facebook.com/share/185ijDfRxz/", icon: "facebook" },
  {
    label: "Instagram",
    href: "https://www.instagram.com/for_you2_online?igsi=MWN1bXE1bWp1cm1qcA==",
    icon: "instagram",
  },
];
const LOGO_URL = "/logo.svg";

export function LandingPage() {
  useEffect(() => {
    const prevDir = document.documentElement.dir;
    const prevLang = document.documentElement.lang;
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    return () => {
      document.documentElement.dir = prevDir;
      document.documentElement.lang = prevLang;
    };
  }, []);

  return (
    <div className="lp-root min-h-screen bg-background text-foreground antialiased">
      <Nav />
      <main>
        <Hero />
        <Audience />
        <HowItWorks />
        <Problem />
        <Trust />
        <Wanted />
        <Express />
        <Vision />
        <EarlyAccess />
        <FinalCta />
      </main>
      <Footer />
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="واتساب"
        className="whatsapp-pulse fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lp-soft transition-all hover:-translate-y-0.5 hover:scale-105"
      >
        <SocialIcon name="whatsapp" className="h-7 w-7" />
      </a>
    </div>
  );
}

/* ---------------- NAV ---------------- */
const navLinks = [
  { label: "الرئيسية", href: "#hero" },
  { label: "كيف تعمل؟", href: "#how" },
  { label: "FOR YOU WANTED", href: "#wanted" },
  { label: "FOR YOU EXPRESS", href: "#express" },
  { label: "عن المنصة", href: "#vision" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-border/70 bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 lg:px-8">
        <a href="#hero" className="flex shrink-0 items-center gap-2">
          <img src={LOGO_URL} alt="شعار FOR YOU" className="h-11 w-11 rounded-full" />
          <span className="hidden text-sm font-extrabold tracking-[0.22em] text-primary sm:block">
            FOR YOU
          </span>
        </a>

        <ul className="hidden min-w-0 items-center justify-center gap-7 lg:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative text-[0.9rem] font-semibold text-muted-foreground transition-colors after:absolute after:-bottom-1.5 after:right-0 after:h-px after:w-0 after:bg-accent after:transition-all after:duration-300 hover:text-primary hover:after:w-full"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 justify-self-end">
          <a
            href={TELEGRAM_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lp-soft transition-all hover:-translate-y-0.5 hover:bg-teal-soft sm:inline-flex"
          >
            انضم قبل الإطلاق
          </a>
          <button
            aria-label="القائمة"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card lg:hidden"
          >
            <span className="relative block h-3 w-4">
              <span
                className={`absolute inset-x-0 top-0 h-0.5 rounded bg-primary transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`}
              />
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 rounded bg-primary transition-transform ${open ? "-translate-y-1 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-background/95 px-5 py-4 backdrop-blur-xl lg:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={TELEGRAM_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-3 block rounded-full bg-primary px-5 py-3.5 text-center text-base font-bold text-primary-foreground"
          >
            انضم قبل الإطلاق
          </a>
        </div>
      )}
    </header>
  );
}

/* ---------------- HERO ART (SVG) ---------------- */
function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="شبكة اتصال عالمية بين العملاء والسيلرز والتجار">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--mint)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--cream)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="190" fill="url(#glow)" />
        {[70, 115, 160].map((r, i) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r}
            fill="none"
            stroke="var(--teal)"
            strokeOpacity={0.16 - i * 0.03}
            strokeDasharray={i === 1 ? "4 7" : undefined}
          />
        ))}
        <path
          d="M40 250 C 140 120, 260 300, 360 140"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="520"
          className="[animation:dash_3s_ease-out_forwards]"
          style={{ strokeDashoffset: 0 }}
        />
        <path
          d="M60 130 C 170 210, 230 190, 350 265"
          fill="none"
          stroke="var(--teal)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="5 8"
        />
        {[
          [200, 40],
          [340, 200],
          [200, 360],
          [60, 200],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill="var(--teal)" />
        ))}
        <circle cx="200" cy="200" r="46" fill="var(--teal)" />
        <text x="200" y="196" textAnchor="middle" fill="var(--cream)" fontSize="15" fontWeight="800" letterSpacing="2">
          FOR
        </text>
        <text x="200" y="216" textAnchor="middle" fill="var(--gold)" fontSize="15" fontWeight="800" letterSpacing="2">
          YOU
        </text>
      </svg>

      <FloatChip className="right-0 top-8" delay="0s" icon="🛍️" title="طلب منتج" sub="من العميل" />
      <FloatChip className="left-0 top-1/3" delay="1.4s" icon="✈️" title="عرض سيلر" sub="سعر ووقت وصول" />
      <FloatChip className="bottom-6 right-6" delay="2.6s" icon="🏪" title="منتج جاهز" sub="داخل مصر" />
    </div>
  );
}

function FloatChip({
  className,
  delay,
  icon,
  title,
  sub,
}: {
  className: string;
  delay: string;
  icon: string;
  title: string;
  sub: string;
}) {
  return (
    <div
      className={`drift absolute flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-3.5 py-2.5 shadow-lp-soft backdrop-blur ${className}`}
      style={{ animationDelay: delay }}
    >
      <span className="text-lg">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[0.8rem] font-bold leading-tight text-foreground">{title}</span>
        <span className="block text-[0.7rem] text-muted-foreground">{sub}</span>
      </span>
    </div>
  );
}

/* ---------------- SHARED LABELS ---------------- */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold tracking-wide text-teal-soft">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </span>
  );
}

function SectionLabelDark({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 px-4 py-1.5 text-xs font-bold tracking-[0.18em] text-gold">
      {children}
    </span>
  );
}

/* ---------------- 1. HERO ---------------- */
function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden pb-16 pt-28 sm:pb-24 lg:pb-32 lg:pt-36">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8">
        <div className="rise">
          <SectionLabel>المنصة قيد التطوير · الإطلاق قريبًا</SectionLabel>
          <h1 className="mt-6 text-[2rem] font-extrabold leading-[1.35] text-primary sm:text-5xl lg:text-[3.4rem]">
            كل اللي بتدور عليه للاستيراد…{" "}
            <span className="relative whitespace-nowrap text-ink">
              هتلاقيه في مكان واحد.
              <span className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-accent/70" />
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-[2] text-muted-foreground sm:text-lg">
            سواء بتدور على منتج تستورده، سيلر يوفّرهولك، أو فرصة تعرض منتجاتك… FOR YOU بتجمعك
            بالطرف المناسب بسهولة وفي مكان واحد.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={TELEGRAM_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5 hover:bg-teal-soft"
            >
              انضم قبل الإطلاق 🚀
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-8 py-4 text-base font-bold text-primary transition-all hover:border-primary/40"
            >
              اعرف إزاي بتشتغل
            </a>
          </div>
          <p className="mt-5 text-sm font-semibold text-teal-soft">
            المنصة قيد التطوير والإطلاق قريبًا 💚
          </p>
        </div>

        <div className="rise [animation-delay:150ms]">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}

/* ---------------- 2. AUDIENCE ---------------- */
const audience = [
  { icon: "🛍️", kicker: "Customer", title: "بدور على منتج", body: "قولنا إنت عايز إيه، واستقبل عروض من سيلرز." },
  { icon: "✈️", kicker: "Seller", title: "سيلر", body: "استقبل طلبات حقيقية من العملاء، وقدّم عروضك مباشرة." },
  { icon: "🏪", kicker: "Trader", title: "تاجر", body: "اعرض منتجاتك المستوردة الجاهزة داخل مصر ووصل لعملاء." },
];

function Audience() {
  return (
    <section className="border-y border-border bg-card/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <SectionLabel>مين المستفيد</SectionLabel>
          <h2 className="mt-5 text-3xl font-extrabold text-primary sm:text-4xl">FOR YOU معمولة لمين؟</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {audience.map((a) => (
            <article key={a.kicker} className="surface-card group relative overflow-hidden rounded-3xl p-7">
              <span className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-mint/70 transition-transform duration-500 group-hover:scale-125" />
              <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-2xl">{a.icon}</span>
              <p className="relative mt-6 text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">{a.kicker}</p>
              <h3 className="relative mt-2 text-2xl font-extrabold text-primary">{a.title}</h3>
              <p className="relative mt-3 text-[0.98rem] leading-[2] text-muted-foreground">{a.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 3. HOW IT WORKS ---------------- */
const steps = [
  { n: "1️⃣", title: "اطلب", body: "حدد المنتج اللي بتدور عليه." },
  { n: "2️⃣", title: "استقبل", body: "استقبل عروض من سيلرز مهتمين." },
  { n: "3️⃣", title: "قارن", body: "قارن الأسعار والتفاصيل ومواعيد الوصول." },
  { n: "4️⃣", title: "اختار", body: "اختار العرض الأنسب ليك." },
];

function HowItWorks() {
  return (
    <section id="how" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <SectionLabel>رحلة الطلب</SectionLabel>
          <h2 className="mt-5 text-3xl font-extrabold leading-[1.5] text-primary sm:text-4xl">
            بدل ما تدور بين عشرات السيلرز… خلي العروض هي اللي توصلك.
          </h2>
        </div>

        <div className="relative mt-14">
          <div className="absolute right-0 top-9 hidden h-px w-full bg-[repeating-linear-gradient(to_left,var(--border)_0_10px,transparent_10px_20px)] lg:block" />
          <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="surface-card rounded-3xl bg-card p-7">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-border bg-background text-xl">{s.n}</span>
                  <span className="text-xs font-bold text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-extrabold text-primary">{s.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-[1.9] text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-center text-sm font-bold tracking-wide text-teal-soft">
          اطلب <span className="text-gold-deep">←</span> عروض{" "}
          <span className="text-gold-deep">←</span> مقارنة{" "}
          <span className="text-gold-deep">←</span> اختيار
        </p>
      </div>
    </section>
  );
}

/* ---------------- 4. PROBLEM ---------------- */
function Problem() {
  const old = ["جروبات عشوائية", "البحث بين سيلرز كتير", "معلومات وأسعار غير واضحة", "وقت ضايع في المقارنة"];
  const now = ["طلبك في مكان واحد", "عروض من سيلرز مهتمين", "مقارنة أوضح", "اختيار أسهل"];

  return (
    <section className="bg-secondary/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <h2 className="max-w-3xl text-3xl font-extrabold leading-[1.5] text-primary sm:text-4xl">
          ليه تفضل تدور… لو تقدر تخلي العروض هي اللي توصلك؟
        </h2>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-dashed border-coral/50 bg-background/70 p-7">
            <p className="text-sm font-bold text-coral">الطريقة التقليدية</p>
            <ul className="mt-5 space-y-4">
              {old.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[1rem] text-muted-foreground">
                  <span className="mt-0.5 text-coral">❌</span>
                  <span className="min-w-0 leading-[1.9]">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-primary/15 bg-primary p-7 text-primary-foreground shadow-lift">
            <p className="text-sm font-bold text-gold">مع FOR YOU</p>
            <ul className="mt-5 space-y-4">
              {now.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[1rem]">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/20 text-sm text-gold">✓</span>
                  <span className="min-w-0 leading-[1.9]">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 5. TRUST ---------------- */
function Trust() {
  const items = [
    { icon: "🪪", title: "توثيق الهوية", body: "سيلرز وتجار متحقق منهم قبل تقديم أي عرض." },
    { icon: "📋", title: "معلومات واضحة", body: "تفاصيل المنتج والسعر ووقت الوصول قدامك." },
    { icon: "⚖️", title: "قارن قبل ما تختار", body: "كل العروض جنب بعض في مكان منظم." },
    { icon: "🤝", title: "حرية الاختيار", body: "إنت اللي بتقرر العرض الأنسب ليك." },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionLabel>الثقة</SectionLabel>
            <h2 className="mt-5 text-3xl font-extrabold leading-[1.5] text-primary sm:text-4xl">
              مش مجرد عروض… عروض من أشخاص موثقين. 🔐
            </h2>
            <p className="mt-6 max-w-lg text-base leading-[2] text-muted-foreground">
              بيئة منظمة بتخليك تشوف مين اللي بيتعامل معاك، وتقارن بمعلومات واضحة، بدل العشوائية اللي في الجروبات.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-lp-soft">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success">✓</span>
              <span className="text-sm font-bold text-primary">حساب موثق · معلومات مكتملة</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((it) => (
              <div key={it.title} className="surface-card rounded-3xl p-6">
                <span className="text-2xl">{it.icon}</span>
                <h3 className="mt-4 text-lg font-extrabold text-primary">{it.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-[1.9] text-muted-foreground">{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 6. WANTED ---------------- */
function Wanted() {
  const demand = [
    { name: "أجهزة منزلية صغيرة", pct: 86, tag: "طلب مرتفع" },
    { name: "إكسسوارات موبايل", pct: 72, tag: "متزايد" },
    { name: "معدات رياضية", pct: 58, tag: "فرصة" },
  ];
  return (
    <section id="wanted" className="border-y border-border bg-card/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>FOR YOU WANTED</SectionLabel>
            <h2 className="mt-5 text-3xl font-extrabold leading-[1.5] text-primary sm:text-4xl">
              اعرف المنتج اللي الناس بتدور عليه… قبل ما تستورد. 🔎
            </h2>
            <p className="mt-6 max-w-lg text-base leading-[2] text-muted-foreground">
              اكتشف طلب العملاء على المنتجات، وخد فكرة أوضح عن احتياجات السوق قبل الاستيراد.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-background p-6 shadow-lift sm:p-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="truncate text-sm font-extrabold text-primary">الأكثر طلبًا هذا الأسبوع</p>
              <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-teal-soft">مصر</span>
            </div>
            <ul className="mt-6 space-y-6">
              {demand.map((d) => (
                <li key={d.name}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <span className="truncate text-[0.95rem] font-bold text-foreground">{d.name}</span>
                    <span className="shrink-0 text-xs font-bold text-gold-deep">{d.tag}</span>
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${d.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-7 border-t border-border pt-5 text-xs leading-[1.9] text-muted-foreground">
              بيانات توضيحية لشكل المؤشرات داخل المنصة بعد الإطلاق.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 7. EXPRESS ---------------- */
function Express() {
  const flow = ["منتجات جاهزة", "متوفرة داخل مصر", "عملاء بيوصلوا لها"];
  return (
    <section id="express" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="rounded-[2rem] border border-border bg-primary p-8 text-primary-foreground shadow-lift sm:p-12">
          <SectionLabelDark>FOR YOU EXPRESS</SectionLabelDark>
          <h2 className="mt-5 max-w-2xl text-3xl font-extrabold leading-[1.5] sm:text-4xl">
            منتجاتك جاهزة في مصر؟ خلّي العملاء يوصلوا لها.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-[2] text-primary-foreground/80">
            اعرض منتجاتك المستوردة الجاهزة داخل مصر ووصل لعملاء مهتمين بالشراء.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {flow.map((f, i) => (
              <div key={f} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-6">
                <span className="text-xs font-bold text-gold">0{i + 1}</span>
                <p className="mt-3 text-lg font-extrabold">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 8. VISION ---------------- */
function Vision() {
  const nodes = [
    { icon: "🛍️", label: "عملاء" },
    { icon: "✈️", label: "سيلرز" },
    { icon: "🏪", label: "تجار" },
    { icon: "🌍", label: "منتجات ومصادر عالمية" },
  ];
  return (
    <section id="vision" className="bg-secondary/50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
        <h2 className="text-3xl font-extrabold leading-[1.5] text-primary sm:text-4xl">
          FOR YOU بتغيّر طريقة الوصول للمنتجات.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-[2.1] text-muted-foreground">
          العميل مش محتاج يفضل يدور.
          <br />
          السيلر مش محتاج يفضل يدور على عميل.
          <br />
          والتاجر مش محتاج يحتار إزاي يوصل منتجاته للناس.
        </p>

        <div className="relative mt-14">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {nodes.map((n) => (
              <div key={n.label} className="surface-card rounded-2xl bg-card px-4 py-6 text-center">
                <span className="text-2xl">{n.icon}</span>
                <p className="mt-3 text-sm font-bold text-primary">{n.label}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-6 h-10 w-px bg-[repeating-linear-gradient(to_bottom,var(--gold)_0_6px,transparent_6px_12px)]" />
          <div className="mx-auto inline-flex items-center gap-3 rounded-full bg-primary px-7 py-4 text-primary-foreground shadow-lift">
            <img src={LOGO_URL} alt="FOR YOU" className="h-8 w-8 rounded-full" />
            <span className="text-sm font-extrabold tracking-[0.2em]">FOR YOU</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 9. EARLY ACCESS ---------------- */
function EarlyAccess() {
  return (
    <section id="early" className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 text-center shadow-lift sm:p-14">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="relative">
            <SectionLabel>Early Access</SectionLabel>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold leading-[1.5] text-primary sm:text-4xl">
              FOR YOU لسه بتبدأ… وإنت ممكن تكون من أوائل الناس فيها. 💚
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-[2] text-muted-foreground">
              المنصة حاليًا قيد التطوير والإطلاق قريبًا.
              <br />
              انضم دلوقتي وكن من أوائل المستخدمين.
            </p>
            <a
              href={TELEGRAM_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5 hover:bg-teal-soft"
            >
              <SocialIcon name="telegram" className="h-5 w-5" />
              انضم قبل الإطلاق 🚀
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 10. FINAL CTA ---------------- */
function FinalCta() {
  const roles = [
    { icon: "🛍️", title: "عميل", body: "ابعت طلبك." },
    { icon: "✈️", title: "سيلر", body: "قدّم عروضك." },
    { icon: "🏪", title: "تاجر", body: "اعرض منتجاتك." },
  ];
  return (
    <section className="border-t border-border bg-primary py-20 text-primary-foreground sm:py-28">
      <div className="mx-auto max-w-6xl px-5 text-center lg:px-8">
        <h2 className="mx-auto max-w-3xl text-3xl font-extrabold leading-[1.5] sm:text-[2.6rem]">
          بدل ما تدور في كل مكان… خليك في المكان اللي كل الأطراف بتقابلك فيه.
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {roles.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-7 transition-colors hover:border-gold/50"
            >
              <span className="text-2xl">{r.icon}</span>
              <p className="mt-4 text-xl font-extrabold">{r.title}</p>
              <p className="mt-1.5 text-sm text-primary-foreground/75">{r.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-lg font-extrabold sm:text-xl">
          FOR YOU — أسهل طريقة توصل للي بتدور عليه. 💚
        </p>
        <a
          href={TELEGRAM_CHANNEL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex rounded-full bg-gold px-8 py-4 text-base font-extrabold text-accent-foreground transition-all hover:-translate-y-0.5 hover:bg-gold-deep"
        >
          كن من أوائل مستخدمي FOR YOU 🚀
        </a>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer() {
  return (
    <footer className="bg-primary py-8 text-primary-foreground/60">
      <div className="mx-auto max-w-6xl px-5 pt-8 lg:px-8">
        <div className="grid justify-items-center gap-6 border-t border-primary-foreground/10 pt-8 text-center md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:justify-items-stretch md:text-right">
          <img src={LOGO_URL} alt="شعار FOR YOU" className="h-10 w-10 shrink-0 rounded-full" />
          <p className="min-w-0 text-xs leading-[1.9]">
            FOR YOU — المنصة الذكية لربط أفضل المستوردين والبائعين. المنصة قيد التطوير.
          </p>
          <div className="flex items-center justify-center gap-2.5 md:justify-start">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid h-10 w-10 place-items-center rounded-full border border-primary-foreground/15 bg-primary-foreground/5 text-primary-foreground/80 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:text-gold"
              >
                <SocialIcon name={s.icon} className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- SOCIAL ICONS ---------------- */
function SocialIcon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    whatsapp: (
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m5.8 14.16c-.25.69-1.45 1.32-2 1.4-.51.08-1.16.11-1.0 0 0-.55-.03-1.17-.03-1.17 0 0-2.27.49-2.75-.49-.31-.63-.61-1.01-.61-1.01s-.49-.27-.49-.43.34-.4.34-.4c.31-.27.34-.4.34-.4s.18-.34.05-.59c-.13-.25-.61-1.5-.61-1.5s-.15-.39-.39-.25c-.24.13-.61.34-.61.34s-.31.49-.05 1.16c.27.67.31.96.31.96s-.1.13.39.7c.49.57.61.7.61.7s.49.96 1.16 1.36c.67.4 1.16.4 1.16.4s.34.05.67-.05c.33-.1.49-.31.49-.31s.21-.3.39-.55c.18-.25.31-.36.49-.36s.67.27.67.27"
      />
    ),
    telegram: (
      <path
        fill="currentColor"
        d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42"
      />
    ),
    facebook: (
      <path
        fill="currentColor"
        d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.52 9-4.83 9-9.95"
      />
    ),
    instagram: (
      <path
        fill="currentColor"
        d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 7.84A4.16 4.16 0 1 0 12 16.16 4.16 4.16 0 0 0 12 7.84m0 6.86A2.7 2.7 0 1 1 12 9.3a2.7 2.7 0 0 1 0 5.4m5.29-7.03a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0"
      />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  );
}
