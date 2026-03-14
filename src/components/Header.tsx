import Image from "next/image";
import { auth, signOut } from "@/lib/auth";
import { PERSONA_NAME } from "@/lib/ai/persona";

export default async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-base">
          🌸
        </div>
        <span className="font-bold text-gray-800">{PERSONA_NAME}</span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          {user.image && (
            <Image
              src={user.image}
              alt={user.name ?? "ユーザー"}
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          <span className="hidden text-sm text-gray-600 sm:block">
            {user.name}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-50"
            >
              ログアウト
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
