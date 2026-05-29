import { AccessControlForm } from './_components/access-control-form';
import { loadAccessControl } from './_lib/server/access-control.loader';

interface AccessControlPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Access Control',
  };
};

export default async function AccessControlPage({
  params,
}: AccessControlPageProps) {
  const account = (await params).account;
  const data = await loadAccessControl(account);

  return <AccessControlForm data={data} />;
}
