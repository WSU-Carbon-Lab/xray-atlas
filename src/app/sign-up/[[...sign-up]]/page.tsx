import { SignUp } from '@clerk/nextjs'
import { ChartLine, Clock, ShieldCheck, Sparkles } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="bg-muted grid flex-1 lg:grid-cols-2">
      <div className="hidden flex-1 items-center justify-end p-6 md:p-10 lg:flex">
        <ul className="max-w-sm space-y-8">
          <li>
            <div className="flex items-center gap-2">
              <Clock className="size-4" />
              <p className="font-semibold">Save on development time</p>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Add authentication and user management to your app with just a few lines of code.
            </p>
          </li>
          <li>
            <div className="flex items-center gap-2">
              <ChartLine className="size-4" />
              <p className="font-semibold">Increase engagement</p>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Add intuitive UIs designed to decrease friction for your users.
            </p>
          </li>
          <li>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <p className="font-semibold">Protect your users</p>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Enable features like two-step verification and enjoy automatic security updates.
            </p>
          </li>
          <li>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />
              <p className="font-semibold">Match your brand</p>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Theme our pre-built components, or integrate with our easy-to-use APIs.
            </p>
          </li>
        </ul>
      </div>
      <div className="flex flex-1 items-center justify-center p-6 md:p-10 lg:justify-start">
        <SignUp />
      </div>
    </div>
  )
}
