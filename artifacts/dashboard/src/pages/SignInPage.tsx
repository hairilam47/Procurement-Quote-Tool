import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-3">
          <img
            src={`${import.meta.env.BASE_URL}kuotflow-logo-dark.svg`}
            alt="KuotFlow"
            className="h-12 w-auto"
          />
        </div>
      </div>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}
