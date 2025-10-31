"use client";

import {
  Dropdown,
  DropdownMenu,
  DropdownTrigger,
  DropdownItem,
  Avatar,
} from "@heroui/react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";

function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("rgb(156, 163, 175)"); // default gray
        return;
      }

      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      const imageData = ctx.getImageData(0, 0, 50, 50);
      const data = imageData.data;

      const colorCount: Record<string, number> = {};
      let maxCount = 0;
      let dominantColor = "rgb(156, 163, 175)";

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r === undefined || g === undefined || b === undefined) continue;

        // Skip very light/white pixels
        if (r > 240 && g > 240 && b > 240) continue;
        // Skip very dark/black pixels
        if (r < 15 && g < 15 && b < 15) continue;

        const color = `rgb(${r},${g},${b})`;
        const currentCount = (colorCount[color] || 0) + 1;
        colorCount[color] = currentCount;

        if (currentCount > maxCount) {
          maxCount = currentCount;
          dominantColor = color;
        }
      }

      resolve(dominantColor);
    };

    img.onerror = () => {
      resolve("rgb(156, 163, 175)"); // default gray on error
    };

    img.src = imageUrl;
  });
}

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [borderColor, setBorderColor] = useState<string>("rgb(209, 213, 219)");
  const imageUrlRef = useRef<string | null>(null);

  const name =
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "User";
  const imageUrl = user?.imageUrl;

  useEffect(() => {
    if (imageUrl && imageUrl !== imageUrlRef.current) {
      imageUrlRef.current = imageUrl;

      // Verify it's a valid image URL
      if (
        typeof imageUrl === "string" &&
        (imageUrl.startsWith("http") || imageUrl.startsWith("/"))
      ) {
        extractDominantColor(imageUrl)
          .then((color) => {
            setBorderColor(color);
          })
          .catch(() => {
            setBorderColor("rgb(209, 213, 219)");
          });
      } else {
        console.warn("Invalid image URL:", imageUrl);
        setBorderColor("rgb(209, 213, 219)");
      }
    } else if (!imageUrl) {
      imageUrlRef.current = null;
      setBorderColor("rgb(209, 213, 219)");
    }
  }, [imageUrl]);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("UserMenu Debug:", {
        imageUrl,
        imageUrlType: typeof imageUrl,
        hasUser: !!user,
        userName: name,
        borderColor,
        isValidUrl:
          typeof imageUrl === "string" &&
          (imageUrl.startsWith("http") || imageUrl.startsWith("/")),
      });
    }
  }, [imageUrl, user, name, borderColor]);

  return (
    <div className="relative z-900 flex items-center">
      <Dropdown placement="bottom-end" offset={16} shouldBlockScroll={false}>
        <DropdownTrigger>
          <button
            type="button"
            className={`focus:ring-default-300 relative flex h-10 w-10 items-center justify-center rounded-full transition-all outline-none hover:ring-[2.5px] hover:ring-offset-2 focus:ring-2 focus:ring-offset-2 ${borderColor ? "" : "hover:ring-default-300"} `}
            style={
              borderColor
                ? ({ "--tw-ring-color": borderColor } as React.CSSProperties)
                : undefined
            }
          >
            <Avatar
              isBordered
              as="span"
              className="cursor-pointer"
              color="secondary"
              radius="full"
              name={name}
              size="md"
              src={imageUrl || undefined}
              onError={() => {
                console.warn("Avatar image failed to load:", imageUrl);
              }}
              onLoad={() => {
                if (process.env.NODE_ENV === "development") {
                  console.log("Avatar image loaded successfully:", imageUrl);
                }
              }}
              fallback={
                <div className="from-default-200 to-default-300 text-default-700 flex h-full w-full items-center justify-center bg-linear-to-br">
                  <span className="text-sm font-semibold">
                    {name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
              }
              style={{
                borderColor: borderColor,
              }}
              classNames={{
                base: `h-10 w-10 border-2 shadow-md transition-all hover:shadow-lg relative`,
                img: "h-full w-full object-cover opacity-100 z-10 relative",
                icon: "text-lg",
                name: "text-sm font-semibold",
              }}
              imgProps={{
                loading: "eager",
                decoding: "async",
                crossOrigin: "anonymous",
              }}
            />
            <span className="sr-only">User menu</span>
          </button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Profile Actions"
          variant="flat"
          classNames={{
            base: "bg-background border border-default-200 rounded-lg shadow-xl min-w-[200px] z-[9999]",
          }}
        >
          <DropdownItem key="profile" className="h-14 gap-2">
            <p className="font-semibold">Signed in as</p>
            <p className="font-semibold">{name}</p>
          </DropdownItem>
          <DropdownItem key="account" as={Link} href="/user">
            Manage account
          </DropdownItem>
          <DropdownItem key="logout" color="danger" onPress={() => signOut()}>
            Sign out
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}

export default UserMenu;
