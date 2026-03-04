import { redirect } from 'next/navigation';
import { getSession } from '../../actions/auth';
import AdminLayoutClient from './AdminLayoutClient';

export default async function AdminLayout(props: {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}) {
    const session = await getSession();
    const { lang } = await props.params;

    if (!session || session.role !== 'ADMIN') {
        redirect(`/${lang}/login?from=admin`);
    }

    return (
        <AdminLayoutClient params={props.params}>
            {props.children}
        </AdminLayoutClient>
    );
}
