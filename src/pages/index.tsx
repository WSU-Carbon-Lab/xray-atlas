import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import Head from "next/head";
import Image from "next/image";
import SearchBar from "~/components/search";


import { RouterOutputs, api } from "~/utils/api";

const UserInfo = () => {
  const { user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <div className="flex gap-3 w-full">
      <div className="flex gap-3">
        <Image
          src={user.imageUrl}
          alt="Profile image"
          className="h-10 w-10 rounded-lg flex"
          width={56}
          height={56}
        />
        <div className="flex flex-col justify-center items-center">
          <div className="  text-slate-400 gap-1 text-xs italic">
            <p>
              <span>{`@${user.username}`}</span>
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>)
}

const SynchrotronMap = () => {

}

type MolecleWithAuthor = RouterOutputs["molecule"]["getAll"][number]

export default function Home() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  // Start fetching asap
  api.molecule.getAll.useQuery();

  return (
    <>
      <Head>
        <title>X-ray Atlas</title>
        <meta name="description" content="Steamlined X-ray database interface" />
        <link rel="icon" href="https://repo.wsu.edu/favicon/icon.svg" />
      </Head>

      <div className="auto flex justify-between top-auto w-full p-2 gap-0">
        <div className="text-2xl font-semibold justify-center">
          X-ray Atlas
        </div>
        <div className="flex justify-center top-auto">
          <SearchBar />
        </div>
        <div className="flex justify-right gap-3 top-auto">
          {!isSignedIn && (
            <div className="flex justify-center">
              <SignInButton />
            </div>
          )}
          {isSignedIn && <UserInfo />}
        </div>
      </div>
      <main >

      </main>

      <footer className="absolute bottom-0 left-5 h-16 w-16 flex">
        <a href="https://github.com/WSU-Carbon-Lab/xray-atlas">
          <div className="flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <div>Github</div>
          </div>
        </a>
      </footer>
    </>
  );
}
