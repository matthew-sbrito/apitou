import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  imageClassName = "h-8",
  withWordmark = true,
}: {
  className?: string;
  imageClassName?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/apitou-logo.webp"
        alt="Apitou"
        width={527}
        height={473}
        priority
        className={cn("w-auto", imageClassName)}
      />
      {withWordmark && (
        <span className="text-lg font-black tracking-tight text-apito-yellow">
          Apitou<span className="text-foreground">.</span>
        </span>
      )}
    </span>
  );
}
