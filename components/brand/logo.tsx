import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props {
  className?: string;
  imageClassName: string;
  wordClassName: string;
}

export function Logo({ className, imageClassName, wordClassName }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Image
        src="/apitou-logo.png"
        alt="Apitou"
        width={527}
        height={473}
        priority
        className={cn("w-auto", imageClassName)}
      />

      <span
        className={cn(
          "font-black tracking-tight text-apito-yellow",
          wordClassName,
        )}
      >
        Apitou<span className="text-foreground">.</span>
      </span>
    </span>
  );
}
