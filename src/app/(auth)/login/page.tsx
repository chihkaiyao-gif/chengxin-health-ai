import Link from "next/link";
import { Activity, LogIn } from "lucide-react";
import { signInAction } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">登入</h1>
            <p className="text-sm text-slate-500">Chengxin Health AI</p>
          </div>
        </div>

        {searchParams?.message ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {searchParams.message}
          </p>
        ) : null}

        <form action={signInAction} className="space-y-4">
          <div className="field-stack">
            <label htmlFor="email">電子郵件</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className="field-stack">
            <label htmlFor="password">密碼</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button type="submit" className="btn-primary w-full">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            登入
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          還沒有帳號？{" "}
          <Link href="/register" className="font-semibold text-teal-700">
            註冊病人帳號
          </Link>
        </p>
      </section>
    </main>
  );
}
