import { Link } from "@heroui/react";

export function SocialLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="sr-only">{children}</span>
      <Icon className="h-5 w-5 fill-gray-700 dark:fill-gray-300 transition group-hover:fill-gray-900 dark:group-hover:fill-gray-100" />
    </Link>
  );
}
