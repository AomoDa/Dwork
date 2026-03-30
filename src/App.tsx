/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './pages/AdminLayout';
import AdminMembers from './pages/AdminMembers';
import AdminWeeklyCalendar from './pages/AdminWeeklyCalendar';
import Member from './pages/Member';
import MemberDirectory from './pages/MemberDirectory';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/weekly" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="weekly" replace />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="calendar" element={<AdminWeeklyCalendar />} />
          <Route path="weekly" element={<AdminWeeklyCalendar />} />
        </Route>
        <Route path="/m/:path" element={<Member />} />
        <Route path="/directory" element={<MemberDirectory />} />
      </Routes>
    </BrowserRouter>
  );
}
