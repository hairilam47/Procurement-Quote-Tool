import { SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 56" className="h-12 w-auto">
            <text x="4" y="48" fontFamily="Inter,system-ui,sans-serif" fontSize="48" fontWeight="800" letterSpacing="-2.5">
              <tspan fill="#ffffff">Kuot</tspan><tspan fill="#3b82f6">Flow</tspan>
            </text>
          </svg>
        </div>
        <p className="text-slate-400 text-sm">Quote That Close</p>
      </div>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}
