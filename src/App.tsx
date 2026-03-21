/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './pages/AdminLayout';
import AdminMembers from './pages/AdminMembers';
import AdminCalendar from './pages/AdminCalendar';
import AdminWeeklyCalendar from './pages/AdminWeeklyCalendar';
import Member from './pages/Member';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/members" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="members" replace />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="weekly" element={<AdminWeeklyCalendar />} />
        </Route>
        <Route path="/m/:path" element={<Member />} />
      </Routes>
    </BrowserRouter>
  );
}
