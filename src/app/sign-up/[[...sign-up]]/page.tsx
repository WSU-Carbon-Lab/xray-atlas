import { SignUp } from "@clerk/nextjs";
import { MolecularBackground } from "~/app/_components/molecular-background";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";

export default function SignUpPage() {
  return (
    <MolecularBackground>
      <div className="grid w-full">
        {/* Right side - Sign up form */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile header */}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Join X-ray Atlas
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Create your account to start exploring and contributing to
                cutting-edge research.
              </CardDescription>
            </CardHeader>

            {/* Clerk SignUp component with glassmorphism wrapper */}
            <SignUp
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-transparent shadow-none border-0",
                },
              }}
            />
            {/* Additional info */}
          </div>
        </div>
      </div>
    </MolecularBackground>
  );
}
