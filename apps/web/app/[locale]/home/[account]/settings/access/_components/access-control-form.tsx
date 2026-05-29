import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import {
  swellAccessRoles,
  swellPermissionGroups,
} from '../_lib/access-control.config';
import { updateAccessControlAction } from '../_lib/server/access-control.actions';
import { AccessControlData } from '../_lib/server/access-control.loader';

export function AccessControlForm({ data }: { data: AccessControlData }) {
  const accountSlug = data.workspace.account.slug;

  return (
    <form action={updateAccessControlAction} className="w-full max-w-6xl pb-32">
      <input type="hidden" name="accountSlug" value={accountSlug} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Access control</CardTitle>
              <CardDescription>
                Role defaults for The Swell workspace. Owners always keep full
                access through MakerKit.
              </CardDescription>
            </div>

            <Badge variant={data.canManageAccess ? 'default' : 'secondary'}>
              {data.canManageAccess ? 'Editable' : 'Read only'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {!data.canManageAccess && (
            <Alert>
              <AlertTitle>Read-only view</AlertTitle>
              <AlertDescription>
                You can review the access matrix, but you need access
                management permission to change role defaults.
              </AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto rounded-md border">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[50%]" />
                {swellAccessRoles.map((role) => (
                  <col key={role.key} className="w-[10%]" />
                ))}
              </colgroup>

              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Permission</TableHead>

                  {swellAccessRoles.map((role) => (
                    <TableHead
                      key={role.key}
                      title={role.description}
                      className="px-2 text-center text-xs font-semibold uppercase"
                    >
                      {formatRoleHeader(role.key)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {swellPermissionGroups.map((group) => (
                  <PermissionGroupRows
                    key={group.label}
                    group={group}
                    data={data}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={!data.canManageAccess}>
            Save access
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function PermissionGroupRows({
  group,
  data,
}: {
  group: (typeof swellPermissionGroups)[number];
  data: AccessControlData;
}) {
  return (
    <>
      <TableRow>
        <TableCell
          colSpan={swellAccessRoles.length + 1}
          className="bg-muted/50 text-muted-foreground px-4 text-xs font-medium uppercase"
        >
          {group.label}
        </TableCell>
      </TableRow>

      {group.permissions.map((permission) => (
        <TableRow key={permission.key}>
          <TableCell className="whitespace-normal px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="font-medium">{permission.label}</span>
              <span className="text-muted-foreground text-sm">
                {permission.description}
              </span>
            </div>
          </TableCell>

          {swellAccessRoles.map((role) => {
            const checked = data.selectedPermissions
              .get(role.key)
              ?.has(permission.key);

            return (
              <TableCell key={role.key} className="px-2 text-center">
                <input
                  type="checkbox"
                  name={`permission:${role.key}:${permission.key}`}
                  defaultChecked={checked}
                  disabled={!data.canManageAccess}
                  aria-label={`${role.label}: ${permission.label}`}
                  className="border-input text-primary focus-visible:ring-ring size-4 rounded border"
                />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}

function formatRoleHeader(role: (typeof swellAccessRoles)[number]['key']) {
  if (role === 'management') {
    return 'Mgmt';
  }

  return role;
}
