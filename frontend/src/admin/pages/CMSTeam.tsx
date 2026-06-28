import { MdGroups } from 'react-icons/md';
import CrudPage from '../components/CrudPage';

export default function CMSTeam() {
  return (
    <CrudPage
      title="Team Members"
      icon={<MdGroups size={24} />}
      endpoint="team"
      columns={[
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
        { field: 'role', headerName: 'Role', width: 180 },
        { field: 'order', headerName: 'Order', width: 90 },
      ]}
      formFields={[
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'bio', label: 'Bio', type: 'textarea' },
        { key: 'order', label: 'Display Order', type: 'number' },
      ]}
      defaultValues={{ order: 0 }}
    />
  );
}
