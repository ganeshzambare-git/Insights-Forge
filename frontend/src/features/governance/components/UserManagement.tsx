import React from 'react';
import { useUsers } from '../hooks/useUsers';
import { ExecutiveTable } from '@/components/tables/ExecutiveTable';
import type { GovernanceUser } from '@/types/governance';
import { createColumnHelper } from '@tanstack/react-table';

interface UserManagementProps {
  tenantId: string;
  role: string;
  sessionId: string;
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  status: React.ReactNode;
  lastLogin: string;
  actions: React.ReactNode;
}

const columnHelper = createColumnHelper<UserRow>();
const columns = [
  columnHelper.accessor('email', { header: 'Email' }),
  columnHelper.accessor('role', { header: 'Role' }),
  columnHelper.accessor('status', { header: 'Status' }),
  columnHelper.accessor('lastLogin', { header: 'Last Login' }),
  columnHelper.accessor('actions', { header: 'Actions' }),
];

export const UserManagement: React.FC<UserManagementProps> = ({ tenantId, role, sessionId }) => {
  const { data: users, isLoading, isError } = useUsers(tenantId, role, sessionId);

  if (isLoading) return <div className="p-4 animate-pulse">Loading users...</div>;
  if (isError) return <div className="p-4 text-destructive">Failed to load user directory.</div>;

  const mapUserToRow = (user: GovernanceUser): UserRow => ({
    id: user.id,
    email: user.email,
    role: user.role.name,
    status: (
      <span className={user.status === 'active' ? 'text-brand-success' : 'text-brand-error'}>
        {user.status}
      </span>
    ),
    lastLogin: new Date(user.lastLogin).toLocaleDateString(),
    actions: (
      <div className="flex gap-2">
        <button className="px-2 py-1 text-xs border rounded hover:bg-muted" aria-label={`Inspect ${user.email}`}>Inspect</button>
        {user.status === 'active' && (
          <button className="px-2 py-1 text-xs border rounded border-destructive text-destructive hover:bg-destructive/10" aria-label={`Suspend ${user.email}`}>Suspend</button>
        )}
      </div>
    )
  });

  const rowData = (users || []).map(mapUserToRow);

  return (
    <div className="w-full h-[400px] overflow-auto">
      <ExecutiveTable 
        columns={columns}
        data={rowData}
      />
    </div>
  );
};
