import os

components = [
    "page-title",
    "table-card",
    "status-pill",
    "stat-card",
    "timeline-list",
    "progress-stepper"
]

lib_files = {
    "utils.ts": "import { type ClassValue, clsx } from 'clsx';\nimport { twMerge } from 'tailwind-merge';\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n",
    "auth-context.tsx": "import React from 'react';\nexport const AuthContext = React.createContext<any>(null);\nexport const AuthProvider = ({children}: any) => <>{children}</>;",
    "lovable-error-reporting.ts": "export const reportError = (error: any) => console.error(error);",
    "mock-data.ts": "export const mockData = {};",
    "ui-mappers.ts": "export const mapDataToUi = (data: any) => data;",
    "auth-storage.ts": "export const clearAuth = () => {};\nexport const getAuth = () => null;\nexport const setAuth = (data: any) => {};"
}

os.makedirs("src/components/app", exist_ok=True)
for comp in components:
    with open(f"src/components/app/{comp}.tsx", "w") as f:
        name = "".join([word.capitalize() for word in comp.split("-")])
        f.write(f"export function {name}(props: any) {{ return <div>{name}</div>; }}\n")

os.makedirs("src/lib", exist_ok=True)
for filename, content in lib_files.items():
    with open(f"src/lib/{filename}", "w") as f:
        f.write(content)
