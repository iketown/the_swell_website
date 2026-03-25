import { SidebarInset, SidebarProvider } from '@kit/ui/sidebar';

import { DevToolSidebar } from '@/components/app-sidebar';

export function DevToolLayout(props: React.PropsWithChildren) {
  return (
    <SidebarProvider>
      <DevToolSidebar />

      <SidebarInset>{props.children}</SidebarInset>
    </SidebarProvider>
  );
}
