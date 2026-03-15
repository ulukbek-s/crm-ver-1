'use client';

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <p className="text-gray-500 mt-1">Users, roles, departments, permissions</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
        Employees module — list users and manage RBAC
      </div>
    </div>
  );
}
