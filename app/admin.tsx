import AdminDashboardScreen from '../src/admin/AdminDashboardScreen';
import { AuthGuard } from '../src/auth';

export default function AdminRoute() {
  return <AuthGuard requireEnrollment><AdminDashboardScreen /></AuthGuard>;
}
