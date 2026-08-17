import { Logo } from "@/components/brand/logo";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Flag, ListOrdered, Timer, Trophy, WifiOff } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    title: "1. Chama a galera",
    description:
      "Cria o evento, cadastra quem vai jogar e coloca a nota de quem quiser (opcional — ninguém precisa saber quem deu a nota).",
  },
  {
    title: "2. Tira o time",
    description:
      "Sorteio equilibrado na hora, respeitando goleiro e reserva. Não gostou? Ajusta na mão em segundos.",
  },
  {
    title: "3. Apita o início",
    description:
      "Cronômetro, placar e fila de quem-ganha-fica cuidados pelo app. Você só marca o que rolou em campo.",
  },
];

const features = [
  {
    icon: Timer,
    title: "Cronômetro que não erra",
    description:
      "Fecha o app, o celular trava, tanto faz — o tempo tá certo quando você voltar.",
  },
  {
    icon: ListOrdered,
    title: 'Fila "quem ganha fica"',
    description:
      "Sugestão automática do próximo confronto, mas a palavra final é sempre sua.",
  },
  {
    icon: Trophy,
    title: "Súmula pronta pro grupo",
    description:
      "Classificação, artilharia e os destaques da pelada, prontos pra mandar no zap.",
  },
  {
    icon: WifiOff,
    title: "Funciona sem sinal",
    description:
      "Sinal ruim na quadra não é desculpa. O app sincroniza sozinho quando a internet voltar.",
  },
];

export default function MarketingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo
          imageClassName="h-10 sm:h-14"
          wordClassName="text-base sm:text-lg"
        />
        <nav className="flex items-center gap-3">
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="ghost"
          >
            Entrar
          </Button>
          <Button render={<Link href="/signup" />} nativeButton={false}>
            Criar conta
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6 py-16 md:flex-row md:py-24">
          <FadeIn className="flex flex-1 flex-col items-start gap-6 text-left">
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Apitou.
              <br />O resto é com a gente.
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Chega de anotar placar no grupo do zap e brigar pra lembrar quem
              venceu pra ficar. O Apitou cuida do cronômetro, do placar e da
              fila — você só toca o apito.
            </p>
            <div className="flex gap-3">
              <Button
                render={<Link href="/signup" />}
                nativeButton={false}
                size="lg"
              >
                Criar minha pelada
              </Button>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                size="lg"
                variant="secondary"
              >
                Já jogo aqui
              </Button>
            </div>
          </FadeIn>

          <FadeIn
            delay={0.15}
            y={24}
            className="flex w-full sm:flex-1 justify-end"
          >
            <MatchScreenMockup />
          </FadeIn>
        </section>

        {/* Como funciona */}
        <section className="border-t border-white/10 bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              Como funciona
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-white/10 bg-background/60 p-6"
                >
                  <h3 className="font-semibold text-apito-yellow">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recursos */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Feito pra beira de quadra
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 p-6"
              >
                <feature.icon
                  className="h-8 w-8 text-apito-yellow"
                  strokeWidth={1.75}
                />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-16 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Bora apitar a próxima?
            </h2>
            <p className="max-w-md text-muted-foreground">
              Cadastro grátis, sem enrolação. Em dois minutos você já tá
              sorteando os times.
            </p>
            <Button
              render={<Link href="/signup" />}
              nativeButton={false}
              size="lg"
            >
              Criar minha pelada
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-muted-foreground">
        Apitou — organize sua pelada sem estresse.
      </footer>
    </div>
  );
}

function MatchScreenMockup() {
  return (
    <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-apito-charcoal p-5 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-apito-green" />
          Sincronizado
        </span>
        <span>Rodada 3</span>
      </div>

      <div className="mt-6 text-center">
        <p className="text-6xl font-black tabular-nums tracking-tight text-apito-yellow">
          12:47
        </p>
        <p className="mt-1 text-xs text-muted-foreground">bola rolando</p>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-background/60 px-4 py-3">
        <span className="text-sm font-semibold">Amarelo</span>
        <span className="text-2xl font-black">2 x 1</span>
        <span className="text-sm font-semibold">Preto</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-apito-yellow py-4 text-sm font-bold text-apito-black">
          <span className="text-lg leading-none">⚽</span>
          Gol
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-4 text-sm font-bold">
          <Flag className="h-5 w-5" />
          Falta
        </div>
      </div>
    </div>
  );
}
