"use client";

import Link from "next/link";
import type { ComponentType, HTMLAttributes } from "react";

type ContributionCardIcon = ComponentType<
  HTMLAttributes<SVGSVGElement> & { className?: string }
>;

type ContributionCardBase = {
  label: string;
  description: string;
  subDescription?: string;
  icon: ContributionCardIcon;
  className?: string;
  fullWidth?: boolean;
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

const cardClasses =
  "group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-6 text-left transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

function CardContent({
  label,
  description,
  subDescription,
  icon: Icon,
}: Pick<
  ContributionCardProps,
  "label" | "description" | "subDescription" | "icon"
>) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-accent dark:text-accent-light text-sm font-semibold tracking-wide uppercase">
          {label}
        </span>
        <span className="text-base text-gray-700 transition-colors duration-200 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
          {description}
        </span>
        {subDescription !== undefined && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {subDescription}
          </span>
        )}
      </div>
      <div className="group-hover:text-accent dark:text-accent-light hidden shrink-0 text-gray-300 transition-colors duration-200 md:block">
        <Icon className="h-16 w-16" aria-hidden />
      </div>
    </>
  );
}

export function ContributionCard(props: ContributionCardProps) {
  const {
    label,
    description,
    subDescription,
    icon,
    className = "",
    fullWidth = false,
  } = props;
  const layoutClass = fullWidth ? "md:col-span-2" : "";

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        className={`${cardClasses} ${layoutClass} ${className}`}
      >
        <CardContent
          label={label}
          description={description}
          subDescription={subDescription}
          icon={icon}
        />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`${cardClasses} ${layoutClass} ${className}`}
    >
      <CardContent
        label={label}
        description={description}
        subDescription={subDescription}
        icon={icon}
      />
    </button>
  );
}
