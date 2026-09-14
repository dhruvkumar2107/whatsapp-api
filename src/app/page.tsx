import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Users,
  BarChart3,
  Bot,
  Shield,
  Send,
  CheckCircle2,
  Workflow,
  Globe,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Send,
    title: "Bulk Messaging",
    description:
      "Send thousands of personalized WhatsApp messages with smart scheduling, templating, and delivery tracking.",
  },
  {
    icon: Bot,
    title: "AI Chatbots",
    description:
      "Build intelligent chatbots that handle support, qualify leads, and convert prospects 24/7 on autopilot.",
  },
  {
    icon: Users,
    title: "Contact CRM",
    description:
      "Centralized contact management with tags, segments, custom fields, and full conversation history.",
  },
  {
    icon: Workflow,
    title: "Automations",
    description:
      "Visual workflow builder to automate follow-ups, drip campaigns, and multi-step message sequences.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Real-time dashboards with delivery rates, read receipts, response times, and campaign performance.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "SOC2-ready infrastructure with end-to-end encryption, role-based access, and complete audit logs.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect Your Number",
    description:
      "Link your WhatsApp Business number in under 2 minutes. No coding required.",
  },
  {
    number: "02",
    title: "Build Workflows",
    description:
      "Use our drag-and-drop builder to create automations, chatbots, and campaign sequences.",
  },
  {
    number: "03",
    title: "Scale & Grow",
    description:
      "Send campaigns, manage conversations, and watch your business grow with data-driven insights.",
  },
];

const stats = [
  { value: "10M+", label: "Messages Sent" },
  { value: "99.9%", label: "Uptime" },
  { value: "500+", label: "Businesses" },
  { value: "24/7", label: "Support" },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Growth Lead, NovaTech",
    text: "WHAATOPRO transformed our customer outreach. We tripled our response rates in the first month.",
  },
  {
    name: "Rahul Mehta",
    role: "Founder, ShopEasy",
    text: "The automation workflows saved us 20+ hours a week. Our chatbot handles 80% of support queries now.",
  },
  {
    name: "Anita Desai",
    role: "Marketing Director, HealthPlus",
    text: "Campaign management is seamless. The analytics dashboard gives us insights we never had before.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-teal-500/[0.05] blur-[120px]" />
        <div className="absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-cyan-400/[0.03] blur-[100px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-20 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              <Image
                src="/logo.png"
                alt="WHAATOPRO"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>
            <span className="text-lg font-bold tracking-tight">WHAATOPRO</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </a>
            <a
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Testimonials
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex h-9 items-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/30"
            >
              Get Started Free
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-4 pt-20 pb-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            WhatsApp Business API Platform
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
            <span className="bg-gradient-to-b from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
              Automate WhatsApp.
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Scale Your Business.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            The all-in-one platform for teams to send messages, run campaigns,
            build chatbots, and manage contacts — all through the WhatsApp Business API.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/register"
              className="group inline-flex h-12 items-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-7 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/35"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center rounded-full border border-border bg-background/50 px-7 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5"
            >
              View Demo
            </Link>
          </div>

          {/* Hero Visual */}
          <div className="relative mx-auto mt-16 max-w-4xl">
            <div className="relative rounded-2xl border border-border/50 bg-card/80 p-1 shadow-2xl shadow-black/10 backdrop-blur-sm">
              <div className="rounded-xl bg-gradient-to-br from-emerald-950/50 via-teal-950/30 to-cyan-950/20 p-6 sm:p-8">
                {/* Mock Dashboard */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                  <div className="ml-4 h-4 flex-1 rounded-md bg-white/10" />
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { label: "Messages Sent", value: "12,847", change: "+23%", positive: true },
                    { label: "Delivery Rate", value: "98.6%", change: "+1.2%", positive: true },
                    { label: "Active Chats", value: "342", change: "+89", positive: true },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4"
                    >
                      <p className="text-[10px] font-medium text-emerald-300/70 sm:text-xs">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-lg font-bold text-white sm:text-2xl">
                        {stat.value}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-emerald-400 sm:text-xs">
                        {stat.change} this week
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
                  {[
                    { label: "Sent", value: "8.2k" },
                    { label: "Delivered", value: "8.1k" },
                    { label: "Read", value: "6.9k" },
                    { label: "Replied", value: "2.4k" },
                    { label: "Converted", value: "892" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-md bg-white/5 px-2 py-2 text-center"
                    >
                      <p className="text-[9px] text-emerald-300/60 sm:text-[10px]">
                        {item.label}
                      </p>
                      <p className="text-xs font-bold text-white sm:text-sm">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow */}
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-transparent blur-2xl" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-border/50 bg-muted/30 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  {stat.value}
                </span>
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Zap className="h-3 w-3" />
              Powerful Features
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                dominate WhatsApp
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              From bulk messaging to AI chatbots, WHAATOPRO gives you every tool
              to turn WhatsApp into your most powerful channel.
            </p>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 ring-1 ring-emerald-500/20 transition-colors group-hover:from-emerald-500/20 group-hover:to-teal-500/20">
                  <feature.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="relative z-10 border-y border-border/50 bg-muted/20 px-4 py-24 backdrop-blur-sm sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Globe className="h-3 w-3" />
              Simple Setup
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Up and running in
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                three simple steps
              </span>
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.number} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+60px)] top-8 hidden h-px w-[calc(100%-120px)] bg-gradient-to-r from-emerald-500/30 to-transparent md:block" />
                )}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white shadow-lg shadow-emerald-500/30">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="relative z-10 px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Trusted by Teams
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Loved by businesses
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                across the globe
              </span>
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-emerald-500/20"
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-4 w-4 fill-emerald-500"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950 p-12 text-center sm:p-16">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to transform your
                <br />
                WhatsApp communication?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-emerald-100/60">
                Join hundreds of businesses already using WHAATOPRO to automate
                their messaging and grow faster.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/auth/register"
                  className="group inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-emerald-900 shadow-xl shadow-black/20 transition-all hover:bg-emerald-50 hover:shadow-emerald-500/20"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/5"
                >
                  Sign In
                </Link>
              </div>
              <p className="mt-6 text-xs text-emerald-100/40">
                No credit card required. Free 14-day trial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-muted/20 backdrop-blur-sm">
        <div className="mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
              <Image
                src="/logo.png"
                alt="WHAATOPRO"
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
              />
            </div>
            <span className="text-sm font-bold tracking-tight">WHAATOPRO</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} WHAATOPRO. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
