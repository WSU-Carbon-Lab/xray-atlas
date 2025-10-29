import { auth, signIn, signOut } from "~/server/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          X-Ray <span className="text-[hsl(280,100%,70%)]">Atlas</span>
        </h1>

        <div className="flex flex-col items-center gap-4">
          {session?.user ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg bg-white/10 p-6 text-center">
                <p className="text-lg">
                  Signed in as{" "}
                  <span className="font-semibold">{session.user.name}</span>
                </p>
                {session.user.email && (
                  <p className="text-sm text-white/70">{session.user.email}</p>
                )}
                <p className="mt-2 text-xs text-white/50">
                  ORCID iD: {session.user.id}
                </p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("orcid");
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-[#a6ce39] px-10 py-3 font-semibold text-black no-underline transition hover:bg-[#8fb82e]"
              >
                Sign in with ORCID
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-white/70">
            Authenticate with your ORCID iD to access X-Ray Atlas
          </p>
        </div>
      </div>
    </main>
  );
}
