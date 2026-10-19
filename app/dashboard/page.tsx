import { UserButton } from "@clerk/nextjs";
import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  return (
    <main className="page">
      <header className="header">
        <h1>Resume Revisor</h1>
        <UserButton />
      </header>
      <Dashboard />
    </main>
  );
}
