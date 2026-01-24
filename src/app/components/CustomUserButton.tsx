"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Settings } from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from "@heroui/react";

export default function CustomUserButton() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user) {
    return null;
  }

  const handleSignOut = () => {
    void signOut({ callbackUrl: "/" });
  };

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <Avatar
          src={session.user.image ?? undefined}
          name={session.user.name ?? undefined}
          size="sm"
          className="cursor-pointer"
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="User menu">
        <DropdownItem
          key="profile"
          startContent={<User className="h-4 w-4" />}
          textValue="Profile"
        >
          <div className="flex flex-col">
            <span className="font-medium">{session.user.name}</span>
            {session.user.email && (
              <span className="text-sm text-gray-500">{session.user.email}</span>
            )}
          </div>
        </DropdownItem>
        <DropdownItem
          key="settings"
          startContent={<Settings className="h-4 w-4" />}
          textValue="Settings"
        >
          Settings
        </DropdownItem>
        <DropdownItem
          key="signout"
          startContent={<LogOut className="h-4 w-4" />}
          textValue="Sign out"
          onPress={handleSignOut}
          className="text-danger"
          color="danger"
        >
          Sign out
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
