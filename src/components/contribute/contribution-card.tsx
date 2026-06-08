"use client";

import Link from "next/link";
import type { ComponentType, HTMLAttributes } from "react";

type ContributionCardIcon = ComponentType<
  HTMLAttributes<SVGSVGElement> & { className?: string }
>;

type ContributionCardBase = {
  label: string;
  description?: string;
  subDescription?: string;
  icon?: ContributionCardIcon;
  className?: string;
  fullWidth?: boolean;
  variant?: "default" | "compact" | "header";
};

type ContributionCardWithHref = ContributionCardBase & {
  href: string;
  onClick?: never;
};

type ContributionCardWithOnClick = ContributionCardBase & {
  href?: never;
  onClick: () => void;
};

export type ContributionCardProps =
  | ContributionCardWithHref
  | ContributionCardWithOnClick;

const layoutFullWidth = "md:col-span-2";

const shellDefault =
  "group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-surface px-6 py-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

const shellCompact =
  "group inline-flex w-full max-w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const shellHeader =
  "group flex w-full max-w-full items-center gap-3 rounded-lg border border-dashed border-border bg-default/20 px-3.5 py-3 text-left transition-colors hover:border-accent/35 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function CardBody({
  label,
  description,
  subDescription,
  icon: Icon,
  variant,
}: Pick<
  ContributionCardProps,
  "label" | "description" | "subDescription" | "icon"
> & { variant: "default" | "compact" | "header" }) {
  const isCompact = variant === "compact";
  const isHeader = variant === "header";

  if (isHeader) {
    return (
      <>
        {Icon ? (
          <span
            className="text-accent bg-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors group-hover:bg-accent/15"
            aria-hidden
          >
            <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <span className="text-foreground block text-sm font-semibold">{label}</span>
          {description ? (
            <span className="text-muted mt-0.5 block text-sm leading-snug">
              {description}
            </span>
          ) : null}
          {subDescription !== undefined && subDescription !== "" ? (
            <span className="text-muted mt-0.5 block text-xs leading-snug">
              {subDescription}
            </span>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-w-0 flex flex-col gap-2">
        <span className="text-accent text-sm font-semibold tracking-wide uppercase">
          {label}
        </span>
        {description ? (
          <span className="text-foreground text-base transition-colors duration-200 group-hover:opacity-90">
            {description}
          </span>
        ) : null}
        {subDescription !== undefined && subDescription !== "" ? (
          <span className="text-muted text-sm">{subDescription}</span>
        ) : null}
      </div>
      {Icon && isCompact ? (
        <div className="text-muted group-hover:text-accent shrink-0 transition-colors duration-200">
          <Icon className="h-6 w-6 shrink-0 stroke-[1.5]" aria-hidden />
        </div>
      ) : null}
      {Icon && !isCompact ? (
        <div className="text-muted group-hover:text-accent hidden shrink-0 transition-colors duration-200 md:block">
          <Icon className="h-16 w-16 shrink-0 stroke-[1.5]" aria-hidden />
        </div>
      ) : null}
    </>
  );
}

export function ContributionCard(props: ContributionCardProps) {
  const {
    label,
    description = "",
    subDescription,
    icon,
    className = "",
    fullWidth = false,
    variant = "default",
  } = props;
  const layoutClass = fullWidth ? layoutFullWidth : "";
  const shell =
    variant === "header"
      ? shellHeader
      : variant === "compact"
        ? shellCompact
        : shellDefault;
  const widthClass =
    variant === "compact" || variant === "header" || fullWidth ? "" : "md:w-auto";

  const body = (
    <CardBody
      label={label}
      description={description}
      subDescription={subDescription}
      icon={icon}
      variant={variant}
    />
  );

  const mergedClass = `${shell} ${layoutClass} ${widthClass} ${className}`.trim();

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={mergedClass}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onClick} className={mergedClass}>
      {body}
    </button>
  );
}
