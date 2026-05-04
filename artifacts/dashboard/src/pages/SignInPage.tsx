import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 12L6 4L10 10L12 7L14 12H2Z" fill="white" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">QuoteFlow</span>
        </div>
        <p className="text-slate-400 text-sm">Professional IT services quotation management</p>
      </div>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}
