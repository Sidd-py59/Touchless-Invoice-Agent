import os
import shutil

base_dir = r"d:\TIA\frontend\src"

directories = [
    "assets/icons",
    "assets/images",
    "assets/illustrations",
    "components/common/Button",
    "components/common/Card",
    "components/common/Badge",
    "components/common/Avatar",
    "components/common/Input",
    "components/common/Textarea",
    "components/common/Select",
    "components/common/Table",
    "components/common/SearchBar",
    "components/common/Modal",
    "components/common/Drawer",
    "components/common/Dialog",
    "components/common/Tooltip",
    "components/common/Tabs",
    "components/common/Pagination",
    "components/common/Breadcrumb",
    "components/common/EmptyState",
    "components/common/Loader",
    "components/common/StatusBadge",
    "components/common/StatCard",
    "components/common/PageHeader",
    "components/common/SectionHeader",
    "components/common/DataTable",
    "components/common/Timeline",
    "components/common/ProgressPipeline",
    "components/common/FileUpload",
    "components/dashboard",
    "components/documents",
    "components/processing",
    "components/validation",
    "components/invoices",
    "components/clients",
    "components/employees",
    "components/dispatch",
    "components/analytics",
    "components/assistant",
    "components/settings",
    "layouts/MainLayout",
    "layouts/AuthLayout",
    "pages/Dashboard",
    "pages/Documents",
    "pages/AIProcessing",
    "pages/ValidationCenter",
    "pages/InvoiceCenter",
    "pages/Clients",
    "pages/Employees",
    "pages/DispatchCenter",
    "pages/Analytics",
    "pages/AIAssistant",
    "pages/AuditLogs",
    "pages/Settings",
    "routes",
    "hooks",
    "services/api",
    "services/documents",
    "services/invoices",
    "services/analytics",
    "services/clients",
    "services/validation",
    "services/processing",
    "store",
    "context",
    "types",
    "utils",
    "constants",
    "config",
    "styles",
    "lib",
]

for d in directories:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

pages = [
    "Dashboard",
    "Documents",
    "AIProcessing",
    "ValidationCenter",
    "InvoiceCenter",
    "Clients",
    "Employees",
    "DispatchCenter",
    "Analytics",
    "AIAssistant",
    "AuditLogs",
    "Settings",
]

for page in pages:
    page_dir = os.path.join(base_dir, "pages", page)
    os.makedirs(os.path.join(page_dir, "components"), exist_ok=True)
    os.makedirs(os.path.join(page_dir, "hooks"), exist_ok=True)
    
    with open(os.path.join(page_dir, "index.tsx"), "w") as f:
        f.write(f"const {page} = () => {{\n  return <div>{page}</div>;\n}};\n\nexport default {page};\n")
    
    with open(os.path.join(page_dir, "types.ts"), "w") as f:
        f.write(f"// types for {page}\n")
        
    with open(os.path.join(page_dir, "constants.ts"), "w") as f:
        f.write(f"// constants for {page}\n")
        
    with open(os.path.join(page_dir, "mock.ts"), "w") as f:
        f.write(f"// mock data for {page}\n")

# Layouts placeholders
with open(os.path.join(base_dir, "layouts", "MainLayout", "index.tsx"), "w") as f:
    f.write(f"import React from 'react';\n\nconst MainLayout = ({{ children }}: {{ children: React.ReactNode }}) => {{\n  return <div>{{children}}</div>;\n}};\n\nexport default MainLayout;\n")

with open(os.path.join(base_dir, "layouts", "AuthLayout", "index.tsx"), "w") as f:
    f.write(f"import React from 'react';\n\nconst AuthLayout = ({{ children }}: {{ children: React.ReactNode }}) => {{\n  return <div>{{children}}</div>;\n}};\n\nexport default AuthLayout;\n")

# Routes placeholders
routes_dir = os.path.join(base_dir, "routes")
with open(os.path.join(routes_dir, "AppRoutes.tsx"), "w") as f:
    f.write("// AppRoutes placeholder\n")
with open(os.path.join(routes_dir, "ProtectedRoute.tsx"), "w") as f:
    f.write("// ProtectedRoute placeholder\n")
with open(os.path.join(routes_dir, "PublicRoute.tsx"), "w") as f:
    f.write("// PublicRoute placeholder\n")
with open(os.path.join(routes_dir, "index.ts"), "w") as f:
    f.write("export * from './AppRoutes';\n")

print("Scaffolding complete.")
