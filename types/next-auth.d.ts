import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: "super_admin" | "admin" | "employee" | "maintenance_worker" | "accountant" | "hr_manager";
        };
    }

    interface User {
        id: string;
        email: string;
        name: string;
        role: "super_admin" | "admin" | "employee" | "maintenance_worker" | "accountant" | "hr_manager";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: "super_admin" | "admin" | "employee" | "maintenance_worker" | "accountant" | "hr_manager";
    }
}
