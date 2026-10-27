import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface EmptyStateProps {
  emoji?: string;
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  emoji,
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      {icon ? (
        <div className="w-14 h-14 rounded-full bg-forest/10 dark:bg-forest/20 flex items-center justify-center mb-5 text-forest">
          {icon}
        </div>
      ) : emoji ? (
        <span className="text-5xl mb-5" role="img" aria-label={title}>
          {emoji}
        </span>
      ) : (
        <span className="text-5xl mb-5" role="img" aria-label={title}>
          🗺️
        </span>
      )}
      <h3 className="font-serif text-2xl text-text mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-xs leading-relaxed mb-6">{description}</p>
      {actionLabel && (
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 bg-forest text-white px-5 py-2.5 rounded-[12px] text-sm font-medium hover:bg-forest-dark transition-colors"
          >
            {actionLabel}
          </Link>
        ) : (
          <Button onClick={onAction}>{actionLabel}</Button>
        )
      )}
    </div>
  );
}
