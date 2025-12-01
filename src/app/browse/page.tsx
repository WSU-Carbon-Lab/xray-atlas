"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BrowsePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to molecules browse page by default
    router.replace("/browse/molecules");
  }, [router]);

  return null;
}
