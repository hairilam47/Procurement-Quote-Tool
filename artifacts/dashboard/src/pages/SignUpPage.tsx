import { SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
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
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}
